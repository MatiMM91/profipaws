from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    Pet,
    Vaccine,
    MedicalRecord,
    ClinicApiKey,
    ClinicPetGrant,
    ClinicAccessEvent,
    CalendarEvent,
    DailyLog,
    ChronicCondition,
)
from app.schemas import (
    VaccineOut,
    MedicalRecordOut,
    ExternalVaccineCreate,
    ExternalMedicalRecordCreate,
    PetExportOut,
    PetOut,
    ClinicApiKeyCreate,
    ClinicApiKeyOut,
    ClinicPetGrantCreate,
    ClinicPetGrantOut,
    ClinicAccessEventOut,
)
from app.services.auth import get_current_user, get_clinic_from_api_key, generate_api_key
from app.services.clinic_access import (
    assert_can_manage_clinic_keys,
    log_clinic_access,
    pet_for_clinic,
)
from app.services.pet_access import require_owner

router = APIRouter(tags=["External / B2B"])


def _grant_out(grant: ClinicPetGrant, key: ClinicApiKey) -> ClinicPetGrantOut:
    return ClinicPetGrantOut(
        id=grant.id,
        pet_id=grant.pet_id,
        clinic_key_id=key.id,
        clinic_name=key.clinic_name,
        key_prefix=key.key_prefix,
        key_active=key.is_active,
        created_at=grant.created_at,
    )


def _owned_clinic_key(db: Session, user: User, key_id: int) -> ClinicApiKey:
    key = (
        db.query(ClinicApiKey)
        .filter(ClinicApiKey.id == key_id, ClinicApiKey.owner_id == user.id)
        .first()
    )
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic key not found")
    return key


def _record_out(record: MedicalRecord) -> MedicalRecordOut:
    return MedicalRecordOut.model_validate(record).model_copy(
        update={"has_document": bool(record.document_data)}
    )


def _dossier(db: Session, pet: Pet) -> PetExportOut:
    return PetExportOut(
        pet=PetOut.model_validate(pet),
        vaccines=db.query(Vaccine).filter(Vaccine.pet_id == pet.id).all(),
        medical_records=[
            _record_out(row)
            for row in db.query(MedicalRecord).filter(MedicalRecord.pet_id == pet.id).all()
        ],
        calendar_events=db.query(CalendarEvent).filter(CalendarEvent.pet_id == pet.id).all(),
        daily_logs=db.query(DailyLog).filter(DailyLog.pet_id == pet.id).all(),
        chronic_conditions=db.query(ChronicCondition)
        .filter(ChronicCondition.pet_id == pet.id)
        .all(),
    )


# --- Clinic API key management (authenticated owners) ---
@router.post("/api/clinic-keys", response_model=ClinicApiKeyOut, status_code=201)
def create_clinic_api_key(
    payload: ClinicApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_can_manage_clinic_keys(current_user)
    clinic_name = payload.clinic_name.strip()
    if not clinic_name:
        raise HTTPException(status_code=400, detail="Clinic name is required")
    raw, prefix, key_hash = generate_api_key()
    key = ClinicApiKey(
        owner_id=current_user.id,
        clinic_name=clinic_name,
        key_prefix=prefix,
        key_hash=key_hash,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    out = ClinicApiKeyOut.model_validate(key)
    out.api_key = raw  # shown only once
    return out


@router.get("/api/clinic-keys", response_model=list[ClinicApiKeyOut])
def list_clinic_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ClinicApiKey)
        .filter(ClinicApiKey.owner_id == current_user.id)
        .order_by(ClinicApiKey.created_at.desc())
        .all()
    )


@router.delete("/api/clinic-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_clinic_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate a key. Existing grants stay, but the secret stops working."""
    key = _owned_clinic_key(db, current_user, key_id)
    key.is_active = False
    db.commit()


@router.post(
    "/api/pets/{pet_id}/clinic-grants",
    response_model=ClinicPetGrantOut,
    status_code=status.HTTP_201_CREATED,
)
def grant_clinic_pet_access(
    pet_id: int,
    payload: ClinicPetGrantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Let one of the owner's clinic keys read and update this pet by chip."""
    assert_can_manage_clinic_keys(current_user)
    pet = require_owner(db, pet_id, current_user)
    key = _owned_clinic_key(db, current_user, payload.clinic_key_id)
    if not key.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinic key is revoked")

    grant = (
        db.query(ClinicPetGrant)
        .filter(
            ClinicPetGrant.pet_id == pet.id,
            ClinicPetGrant.clinic_api_key_id == key.id,
        )
        .first()
    )
    if grant is None:
        grant = ClinicPetGrant(
            pet_id=pet.id,
            clinic_api_key_id=key.id,
            granted_by_user_id=current_user.id,
        )
        db.add(grant)
        db.commit()
        db.refresh(grant)
    return _grant_out(grant, key)


@router.get("/api/pets/{pet_id}/clinic-grants", response_model=list[ClinicPetGrantOut])
def list_clinic_pet_grants(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = require_owner(db, pet_id, current_user)
    rows = (
        db.query(ClinicPetGrant, ClinicApiKey)
        .join(ClinicApiKey, ClinicApiKey.id == ClinicPetGrant.clinic_api_key_id)
        .filter(ClinicPetGrant.pet_id == pet.id, ClinicApiKey.owner_id == current_user.id)
        .order_by(ClinicPetGrant.created_at.desc())
        .all()
    )
    return [_grant_out(grant, key) for grant, key in rows]


@router.delete(
    "/api/pets/{pet_id}/clinic-grants/{grant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_clinic_pet_grant(
    pet_id: int,
    grant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = require_owner(db, pet_id, current_user)
    grant = (
        db.query(ClinicPetGrant)
        .filter(ClinicPetGrant.id == grant_id, ClinicPetGrant.pet_id == pet.id)
        .first()
    )
    if not grant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grant not found")
    _owned_clinic_key(db, current_user, grant.clinic_api_key_id)
    db.delete(grant)
    db.commit()


@router.get("/api/pets/{pet_id}/clinic-access", response_model=list[ClinicAccessEventOut])
def list_clinic_access(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Recent reads and writes made with a clinic key on this pet."""
    pet = require_owner(db, pet_id, current_user)
    rows = (
        db.query(ClinicAccessEvent, ClinicApiKey)
        .outerjoin(ClinicApiKey, ClinicApiKey.id == ClinicAccessEvent.clinic_api_key_id)
        .filter(ClinicAccessEvent.pet_id == pet.id)
        .order_by(ClinicAccessEvent.created_at.desc(), ClinicAccessEvent.id.desc())
        .limit(100)
        .all()
    )
    return [
        ClinicAccessEventOut(
            id=event.id,
            action=event.action,
            clinic_key_id=key.id if key else event.clinic_api_key_id,
            clinic_name=key.clinic_name if key else None,
            key_prefix=key.key_prefix if key else None,
            created_at=event.created_at,
        )
        for event, key in rows
    ]


# --- External veterinary API (API Key auth) ---
external = APIRouter(prefix="/api/v1/external", tags=["External / B2B"])


@external.get("/pets/{chip_id}/records", response_model=PetExportOut)
def get_pet_records_by_chip(
    chip_id: str,
    clinic: ClinicApiKey = Depends(get_clinic_from_api_key),
    db: Session = Depends(get_db),
):
    """Dossier for a pet this clinic key was explicitly granted."""
    pet = pet_for_clinic(db, clinic, chip_id)
    log_clinic_access(db, clinic, pet, "records")
    dossier = _dossier(db, pet)
    db.commit()
    return dossier


@external.post(
    "/pets/{chip_id}/vaccines",
    response_model=VaccineOut,
    status_code=status.HTTP_201_CREATED,
)
def inject_vaccine(
    chip_id: str,
    payload: ExternalVaccineCreate,
    clinic: ClinicApiKey = Depends(get_clinic_from_api_key),
    db: Session = Depends(get_db),
):
    pet = pet_for_clinic(db, clinic, chip_id)
    data = payload.model_dump()
    data.pop("clinic_name", None)
    vaccine = Vaccine(
        pet_id=pet.id,
        clinic_name=clinic.clinic_name,
        clinic_api_key_id=clinic.id,
        **data,
    )
    db.add(vaccine)
    log_clinic_access(db, clinic, pet, "create_vaccine")
    db.commit()
    db.refresh(vaccine)
    return vaccine


@external.post(
    "/pets/{chip_id}/records",
    response_model=MedicalRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def inject_medical_record(
    chip_id: str,
    payload: ExternalMedicalRecordCreate,
    clinic: ClinicApiKey = Depends(get_clinic_from_api_key),
    db: Session = Depends(get_db),
):
    pet = pet_for_clinic(db, clinic, chip_id)
    data = payload.model_dump()
    data.pop("clinic_name", None)
    record = MedicalRecord(
        pet_id=pet.id,
        clinic_name=clinic.clinic_name,
        clinic_api_key_id=clinic.id,
        **data,
    )
    db.add(record)
    log_clinic_access(db, clinic, pet, "create_record")
    db.commit()
    db.refresh(record)
    return record


@external.get("/pets/{chip_id}/export")
def export_pet_json(
    chip_id: str,
    clinic: ClinicApiKey = Depends(get_clinic_from_api_key),
    db: Session = Depends(get_db),
):
    """Standardized JSON export of a granted pet's medical passport."""
    pet = pet_for_clinic(db, clinic, chip_id)
    log_clinic_access(db, clinic, pet, "export")
    body = {
        "format": "profipaws.passport.v1",
        "exported_by": clinic.clinic_name,
        "dossier": _dossier(db, pet).model_dump(mode="json"),
    }
    db.commit()
    return body
