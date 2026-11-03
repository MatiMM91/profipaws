"""Clinic API authorization: a key reaches a pet only with owner consent."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import ClinicAccessEvent, ClinicApiKey, ClinicPetGrant, Pet, User
from app.services.demo import is_demo_email

CHIP_NOT_FOUND = "Pet not found for chip_id"


def assert_can_manage_clinic_keys(user: User) -> None:
    if is_demo_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo accounts cannot create clinic keys.",
        )


def pet_for_clinic(db: Session, clinic: ClinicApiKey, chip_id: str) -> Pet:
    """Return the pet behind chip_id when this key was granted that pet.

    Missing chips and chips without a grant share one 404 so the key cannot
    be used to discover which microchips exist.
    """
    chip = (chip_id or "").strip()
    pet = db.query(Pet).filter(Pet.chip_id == chip).first() if chip else None
    if pet is None or not _grant_allows(db, clinic, pet):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=CHIP_NOT_FOUND)
    return pet


def _grant_allows(db: Session, clinic: ClinicApiKey, pet: Pet) -> bool:
    if not clinic.is_active or pet.owner_id != clinic.owner_id:
        return False
    owner = db.get(User, pet.owner_id)
    if owner is None or is_demo_email(owner.email):
        return False
    grant = (
        db.query(ClinicPetGrant.id)
        .filter(
            ClinicPetGrant.pet_id == pet.id,
            ClinicPetGrant.clinic_api_key_id == clinic.id,
        )
        .first()
    )
    return grant is not None


def log_clinic_access(db: Session, clinic: ClinicApiKey, pet: Pet, action: str) -> None:
    db.add(
        ClinicAccessEvent(
            clinic_api_key_id=clinic.id,
            pet_id=pet.id,
            action=action,
        )
    )
