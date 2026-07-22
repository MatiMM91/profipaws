from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    Pet,
    Vaccine,
    MedicalRecord,
    CalendarEvent,
    DailyLog,
    ChronicCondition,
    Subscription,
    SubscriptionTier,
)
from app.schemas import (
    PetCreate,
    PetUpdate,
    PetOut,
    AccessPinResponse,
    VaccineCreate,
    VaccineUpdate,
    VaccineOut,
    MedicalRecordCreate,
    MedicalRecordUpdate,
    MedicalRecordOut,
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventOut,
    DailyLogCreate,
    DailyLogUpdate,
    DailyLogOut,
    ChronicConditionCreate,
    ChronicConditionUpdate,
    ChronicConditionOut,
    PetExportOut,
)
from app.services.auth import get_current_user, generate_access_pin

router = APIRouter(prefix="/pets", tags=["Pets"])

FREE_PET_LIMIT = 1


def _get_owned_pet(db: Session, pet_id: int, user: User) -> Pet:
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_id == user.id).first()
    if not pet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


def _get_owned_vaccine(db: Session, pet_id: int, vaccine_id: int, user: User) -> Vaccine:
    _get_owned_pet(db, pet_id, user)
    vaccine = (
        db.query(Vaccine).filter(Vaccine.id == vaccine_id, Vaccine.pet_id == pet_id).first()
    )
    if not vaccine:
        raise HTTPException(status_code=404, detail="Vaccine not found")
    return vaccine


def _get_owned_record(db: Session, pet_id: int, record_id: int, user: User) -> MedicalRecord:
    _get_owned_pet(db, pet_id, user)
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id, MedicalRecord.pet_id == pet_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return record


def _get_owned_event(db: Session, pet_id: int, event_id: int, user: User) -> CalendarEvent:
    _get_owned_pet(db, pet_id, user)
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.pet_id == pet_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return event


def _get_owned_log(db: Session, pet_id: int, log_id: int, user: User) -> DailyLog:
    _get_owned_pet(db, pet_id, user)
    log = db.query(DailyLog).filter(DailyLog.id == log_id, DailyLog.pet_id == pet_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Daily log not found")
    return log


def _get_owned_condition(
    db: Session, pet_id: int, condition_id: int, user: User
) -> ChronicCondition:
    _get_owned_pet(db, pet_id, user)
    condition = (
        db.query(ChronicCondition)
        .filter(ChronicCondition.id == condition_id, ChronicCondition.pet_id == pet_id)
        .first()
    )
    if not condition:
        raise HTTPException(status_code=404, detail="Chronic condition not found")
    return condition


@router.get("/access/{pin}", response_model=PetExportOut)
def access_by_pin(pin: str, db: Session = Depends(get_db)):
    """Public vet access via temporary PIN (no account required)."""
    pet = db.query(Pet).filter(Pet.access_pin == pin).first()
    if (
        not pet
        or not pet.access_pin_expires_at
        or pet.access_pin_expires_at < datetime.utcnow()
    ):
        raise HTTPException(status_code=404, detail="Invalid or expired PIN")
    return _export_pet(db, pet)


@router.get("", response_model=list[PetOut])
def list_pets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Pet).filter(Pet.owner_id == current_user.id).all()


@router.post("", response_model=PetOut, status_code=status.HTTP_201_CREATED)
def create_pet(
    payload: PetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = (
        db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    )
    pet_count = db.query(Pet).filter(Pet.owner_id == current_user.id).count()
    if (
        (not subscription or subscription.tier == SubscriptionTier.FREE)
        and pet_count >= FREE_PET_LIMIT
    ):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Free plan allows 1 pet. Upgrade to Pro for unlimited pets.",
        )

    if payload.chip_id:
        existing = db.query(Pet).filter(Pet.chip_id == payload.chip_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Chip ID already registered")

    pet = Pet(owner_id=current_user.id, **payload.model_dump())
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetOut)
def get_pet(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_pet(db, pet_id, current_user)


@router.patch("/{pet_id}", response_model=PetOut)
def update_pet(
    pet_id: int,
    payload: PetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    data = payload.model_dump(exclude_unset=True)

    if "chip_id" in data:
        chip = (data["chip_id"] or "").strip() or None
        data["chip_id"] = chip
        if chip:
            existing = (
                db.query(Pet)
                .filter(Pet.chip_id == chip, Pet.id != pet_id)
                .first()
            )
            if existing:
                raise HTTPException(status_code=400, detail="Chip ID already registered")

    if "breed" in data and data["breed"] is not None:
        data["breed"] = data["breed"].strip() or None
    if "allergies" in data and data["allergies"] is not None:
        data["allergies"] = data["allergies"].strip() or None

    for key, value in data.items():
        setattr(pet, key, value)
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pet(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    db.delete(pet)
    db.commit()


@router.post("/{pet_id}/access-pin", response_model=AccessPinResponse)
def create_access_pin(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a temporary 6-digit PIN / QR payload for veterinary consultation access."""
    pet = _get_owned_pet(db, pet_id, current_user)
    pin = generate_access_pin()
    expires = datetime.utcnow() + timedelta(hours=2)
    pet.access_pin = pin
    pet.access_pin_expires_at = expires
    db.commit()
    return AccessPinResponse(
        pin=pin,
        expires_at=expires,
        qr_payload=f"profipaws://vet-access?pin={pin}&pet_id={pet.id}",
    )


# --- Nested resources ---
@router.post("/{pet_id}/vaccines", response_model=VaccineOut, status_code=201)
def add_vaccine(
    pet_id: int,
    payload: VaccineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    vaccine = Vaccine(pet_id=pet.id, **payload.model_dump())
    db.add(vaccine)
    db.commit()
    db.refresh(vaccine)
    return vaccine


@router.get("/{pet_id}/vaccines", response_model=list[VaccineOut])
def list_vaccines(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_pet(db, pet_id, current_user)
    return db.query(Vaccine).filter(Vaccine.pet_id == pet_id).all()


@router.patch("/{pet_id}/vaccines/{vaccine_id}", response_model=VaccineOut)
def update_vaccine(
    pet_id: int,
    vaccine_id: int,
    payload: VaccineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vaccine = _get_owned_vaccine(db, pet_id, vaccine_id, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(vaccine, key, value)
    db.commit()
    db.refresh(vaccine)
    return vaccine


@router.delete("/{pet_id}/vaccines/{vaccine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vaccine(
    pet_id: int,
    vaccine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vaccine = _get_owned_vaccine(db, pet_id, vaccine_id, current_user)
    db.delete(vaccine)
    db.commit()


@router.post("/{pet_id}/records", response_model=MedicalRecordOut, status_code=201)
def add_record(
    pet_id: int,
    payload: MedicalRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    record = MedicalRecord(pet_id=pet.id, **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{pet_id}/records", response_model=list[MedicalRecordOut])
def list_records(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_pet(db, pet_id, current_user)
    return db.query(MedicalRecord).filter(MedicalRecord.pet_id == pet_id).all()


@router.patch("/{pet_id}/records/{record_id}", response_model=MedicalRecordOut)
def update_record(
    pet_id: int,
    record_id: int,
    payload: MedicalRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _get_owned_record(db, pet_id, record_id, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{pet_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    pet_id: int,
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _get_owned_record(db, pet_id, record_id, current_user)
    db.delete(record)
    db.commit()


@router.post("/{pet_id}/events", response_model=CalendarEventOut, status_code=201)
def add_event(
    pet_id: int,
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    event = CalendarEvent(pet_id=pet.id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{pet_id}/events", response_model=list[CalendarEventOut])
def list_events(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_pet(db, pet_id, current_user)
    return db.query(CalendarEvent).filter(CalendarEvent.pet_id == pet_id).all()


@router.patch("/{pet_id}/events/{event_id}", response_model=CalendarEventOut)
def update_event(
    pet_id: int,
    event_id: int,
    payload: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_owned_event(db, pet_id, event_id, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{pet_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    pet_id: int,
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_owned_event(db, pet_id, event_id, current_user)
    db.delete(event)
    db.commit()


@router.post("/{pet_id}/logs", response_model=DailyLogOut, status_code=201)
def add_log(
    pet_id: int,
    payload: DailyLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    data = payload.model_dump()
    if not data.get("logged_at"):
        data["logged_at"] = datetime.utcnow()
    log = DailyLog(pet_id=pet.id, **data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{pet_id}/logs", response_model=list[DailyLogOut])
def list_logs(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_pet(db, pet_id, current_user)
    return (
        db.query(DailyLog)
        .filter(DailyLog.pet_id == pet_id)
        .order_by(DailyLog.logged_at.desc())
        .all()
    )


@router.patch("/{pet_id}/logs/{log_id}", response_model=DailyLogOut)
def update_log(
    pet_id: int,
    log_id: int,
    payload: DailyLogUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = _get_owned_log(db, pet_id, log_id, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{pet_id}/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    pet_id: int,
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = _get_owned_log(db, pet_id, log_id, current_user)
    db.delete(log)
    db.commit()


@router.get("/{pet_id}/conditions", response_model=list[ChronicConditionOut])
def list_conditions(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_pet(db, pet_id, current_user)
    return (
        db.query(ChronicCondition)
        .filter(ChronicCondition.pet_id == pet_id)
        .order_by(ChronicCondition.name.asc())
        .all()
    )


@router.post(
    "/{pet_id}/conditions",
    response_model=ChronicConditionOut,
    status_code=status.HTTP_201_CREATED,
)
def add_condition(
    pet_id: int,
    payload: ChronicConditionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    condition = ChronicCondition(pet_id=pet.id, **payload.model_dump())
    db.add(condition)
    db.commit()
    db.refresh(condition)
    return condition


@router.patch("/{pet_id}/conditions/{condition_id}", response_model=ChronicConditionOut)
def update_condition(
    pet_id: int,
    condition_id: int,
    payload: ChronicConditionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    condition = _get_owned_condition(db, pet_id, condition_id, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(condition, key, value)
    db.commit()
    db.refresh(condition)
    return condition


@router.delete("/{pet_id}/conditions/{condition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_condition(
    pet_id: int,
    condition_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    condition = _get_owned_condition(db, pet_id, condition_id, current_user)
    db.delete(condition)
    db.commit()


@router.get("/{pet_id}/export", response_model=PetExportOut)
def export_pet(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = _get_owned_pet(db, pet_id, current_user)
    return _export_pet(db, pet)


def _export_pet(db: Session, pet: Pet) -> PetExportOut:
    return PetExportOut(
        pet=PetOut.model_validate(pet),
        vaccines=db.query(Vaccine).filter(Vaccine.pet_id == pet.id).all(),
        medical_records=db.query(MedicalRecord).filter(MedicalRecord.pet_id == pet.id).all(),
        calendar_events=db.query(CalendarEvent).filter(CalendarEvent.pet_id == pet.id).all(),
        daily_logs=db.query(DailyLog).filter(DailyLog.pet_id == pet.id).all(),
        chronic_conditions=db.query(ChronicCondition)
        .filter(ChronicCondition.pet_id == pet.id)
        .all(),
    )
