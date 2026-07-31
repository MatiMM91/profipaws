"""Pet access helpers: owner vs shared read/edit."""

from datetime import datetime
from enum import Enum

from fastapi import HTTPException, status
from sqlalchemy import event, inspect as sa_inspect
from sqlalchemy.orm import Session

from app.models import (
    CalendarEvent,
    ChronicCondition,
    Consultation,
    ConsultationNote,
    DailyLog,
    MedicalRecord,
    Pet,
    PetShare,
    SharePermission,
    User,
    Vaccine,
    WeightEntry,
)


class PetRole(str, Enum):
    OWNER = "owner"
    EDIT = "edit"
    READ = "read"


_RELATED_MODELS = (
    Vaccine,
    MedicalRecord,
    WeightEntry,
    CalendarEvent,
    DailyLog,
    ChronicCondition,
    Consultation,
    ConsultationNote,
)


def touch_pet(pet: Pet) -> None:
    """Bump pets.updated_at so recently changed pets float to the top of lists."""
    pet.updated_at = datetime.utcnow()


def _pet_id_from_related(obj, session: Session) -> int | None:
    pet_id = getattr(obj, "pet_id", None)
    if pet_id is not None:
        return int(pet_id)
    if isinstance(obj, ConsultationNote):
        consultation_id = getattr(obj, "consultation_id", None)
        if consultation_id is None:
            return None
        consultation = session.get(Consultation, consultation_id)
        if consultation is not None and consultation.pet_id is not None:
            return int(consultation.pet_id)
    return None


@event.listens_for(Session, "before_flush")
def _touch_pets_on_related_changes(session, flush_context, instances):  # noqa: ARG001
    pet_ids: set[int] = set()
    for obj in session.new.union(session.dirty).union(session.deleted):
        if not isinstance(obj, _RELATED_MODELS):
            continue
        # Skip unchanged dirty rows (e.g. only unloaded attrs).
        if obj in session.dirty and obj not in session.new and obj not in session.deleted:
            state = sa_inspect(obj)
            if not state.modified:
                continue
        pet_id = _pet_id_from_related(obj, session)
        if pet_id is not None:
            pet_ids.add(pet_id)

    if not pet_ids:
        return

    for pet_id in pet_ids:
        pet = session.get(Pet, pet_id)
        if pet is not None:
            touch_pet(pet)


def get_share(db: Session, pet_id: int, user_id: int) -> PetShare | None:
    return (
        db.query(PetShare)
        .filter(PetShare.pet_id == pet_id, PetShare.shared_with_user_id == user_id)
        .first()
    )


def resolve_role(db: Session, pet: Pet, user: User) -> PetRole | None:
    if pet.owner_id == user.id:
        return PetRole.OWNER
    share = get_share(db, pet.id, user.id)
    if not share:
        return None
    if share.permission == SharePermission.EDIT:
        return PetRole.EDIT
    return PetRole.READ


def get_pet_or_404(db: Session, pet_id: int) -> Pet:
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


def require_owner(db: Session, pet_id: int, user: User) -> Pet:
    pet = get_pet_or_404(db, pet_id)
    if pet.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


def require_read(db: Session, pet_id: int, user: User) -> tuple[Pet, PetRole]:
    pet = get_pet_or_404(db, pet_id)
    role = resolve_role(db, pet, user)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet, role


def require_edit(db: Session, pet_id: int, user: User) -> tuple[Pet, PetRole]:
    pet, role = require_read(db, pet_id, user)
    if role == PetRole.READ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You only have read access to this pet",
        )
    return pet, role


def list_accessible_pets(db: Session, user: User) -> list[tuple[Pet, PetRole]]:
    owned = db.query(Pet).filter(Pet.owner_id == user.id).all()
    result: list[tuple[Pet, PetRole]] = [(p, PetRole.OWNER) for p in owned]

    shares = (
        db.query(PetShare, Pet)
        .join(Pet, Pet.id == PetShare.pet_id)
        .filter(PetShare.shared_with_user_id == user.id)
        .all()
    )
    owned_ids = {p.id for p, _ in result}
    for share, pet in shares:
        if pet.id in owned_ids:
            continue
        role = PetRole.EDIT if share.permission == SharePermission.EDIT else PetRole.READ
        result.append((pet, role))

    result.sort(
        key=lambda item: item[0].updated_at or item[0].created_at or datetime.min,
        reverse=True,
    )
    return result
