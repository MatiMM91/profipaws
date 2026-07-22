from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    Pet,
    Vaccine,
    MedicalRecord,
    ClinicApiKey,
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
)
from app.models import CalendarEvent, DailyLog
from app.services.auth import get_current_user, get_clinic_from_api_key, generate_api_key

router = APIRouter(tags=["External / B2B"])


# --- Clinic API key management (authenticated owners) ---
@router.post("/api/clinic-keys", response_model=ClinicApiKeyOut, status_code=201)
def create_clinic_api_key(
    payload: ClinicApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw, prefix, key_hash = generate_api_key()
    key = ClinicApiKey(
        owner_id=current_user.id,
        clinic_name=payload.clinic_name,
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
        .all()
    )


# --- External veterinary API (API Key auth) ---
external = APIRouter(prefix="/api/v1/external", tags=["External / B2B"])


@external.get("/pets/{chip_id}/records", response_model=PetExportOut)
def get_pet_records_by_chip(
    chip_id: str,
    clinic: ClinicApiKey = Depends(get_clinic_from_api_key),
    db: Session = Depends(get_db),
):
    """Retrieve full medical dossier by microchip ID for integrated clinic systems."""
    _ = clinic  # auth side-effect
    pet = db.query(Pet).filter(Pet.chip_id == chip_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found for chip_id")
    return PetExportOut(
        pet=PetOut.model_validate(pet),
        vaccines=db.query(Vaccine).filter(Vaccine.pet_id == pet.id).all(),
        medical_records=db.query(MedicalRecord).filter(MedicalRecord.pet_id == pet.id).all(),
        calendar_events=db.query(CalendarEvent).filter(CalendarEvent.pet_id == pet.id).all(),
        daily_logs=db.query(DailyLog).filter(DailyLog.pet_id == pet.id).all(),
    )


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
    pet = db.query(Pet).filter(Pet.chip_id == chip_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found for chip_id")
    data = payload.model_dump()
    if not data.get("clinic_name"):
        data["clinic_name"] = clinic.clinic_name
    vaccine = Vaccine(pet_id=pet.id, **data)
    db.add(vaccine)
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
    pet = db.query(Pet).filter(Pet.chip_id == chip_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found for chip_id")
    data = payload.model_dump()
    if not data.get("clinic_name"):
        data["clinic_name"] = clinic.clinic_name
    record = MedicalRecord(pet_id=pet.id, **data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@external.get("/pets/{chip_id}/export")
def export_pet_json(
    chip_id: str,
    clinic: ClinicApiKey = Depends(get_clinic_from_api_key),
    db: Session = Depends(get_db),
):
    """Standardized JSON export of a pet's medical passport."""
    _ = clinic
    pet = db.query(Pet).filter(Pet.chip_id == chip_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found for chip_id")
    return {
        "format": "profipaws.passport.v1",
        "exported_by": clinic.clinic_name,
        "dossier": PetExportOut(
            pet=PetOut.model_validate(pet),
            vaccines=db.query(Vaccine).filter(Vaccine.pet_id == pet.id).all(),
            medical_records=db.query(MedicalRecord)
            .filter(MedicalRecord.pet_id == pet.id)
            .all(),
            calendar_events=db.query(CalendarEvent)
            .filter(CalendarEvent.pet_id == pet.id)
            .all(),
            daily_logs=db.query(DailyLog).filter(DailyLog.pet_id == pet.id).all(),
        ).model_dump(mode="json"),
    }
