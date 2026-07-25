"""Pet access helpers: owner vs shared read/edit."""

from enum import Enum
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import Pet, PetShare, SharePermission, User


class PetRole(str, Enum):
    OWNER = "owner"
    EDIT = "edit"
    READ = "read"


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

    result.sort(key=lambda item: item[0].name.lower())
    return result
