"""Shared demo sandbox for the public web app (portfolio / try before signup)."""

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    CalendarEvent,
    EventType,
    Pet,
    RecordType,
    MedicalRecord,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    User,
    Vaccine,
    WeightEntry,
)

settings = get_settings()

DEMO_GOOGLE_ID = "profipaws-demo-shared"


def is_demo_email(email: str | None) -> bool:
    if not email:
        return False
    return email.strip().lower() == settings.demo_user_email.strip().lower()


def get_or_create_demo_user(db: Session) -> User:
    email = settings.demo_user_email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.google_id == DEMO_GOOGLE_ID).first()

    if not user:
        user = User(
            email=email,
            full_name="Demo Profipaws",
            google_id=DEMO_GOOGLE_ID,
            avatar_url=None,
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add(
            Subscription(
                user_id=user.id,
                tier=SubscriptionTier.FREE,
                status=SubscriptionStatus.ACTIVE,
            )
        )
    else:
        user.full_name = user.full_name or "Demo Profipaws"
        user.google_id = DEMO_GOOGLE_ID
        user.is_active = True
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if not sub:
            db.add(
                Subscription(
                    user_id=user.id,
                    tier=SubscriptionTier.FREE,
                    status=SubscriptionStatus.ACTIVE,
                )
            )
        else:
            # Keep Free forever — demo must not look like a paid account
            sub.tier = SubscriptionTier.FREE
            sub.status = SubscriptionStatus.ACTIVE
            sub.stripe_subscription_id = None
            sub.billing_interval = None

    db.flush()
    return user


def reset_demo_pets(db: Session, user: User) -> None:
    """Wipe demo pets and reseed so every visitor sees a clean Free sandbox."""
    pets = db.query(Pet).filter(Pet.owner_id == user.id).all()
    for pet in pets:
        db.delete(pet)
    db.flush()

    today = date.today()
    now = datetime.utcnow()

    def years_ago(years: int) -> date:
        try:
            return today.replace(year=today.year - years)
        except ValueError:
            return today.replace(year=today.year - years, day=28)

    luna = Pet(
        owner_id=user.id,
        name="Luna",
        species="dog",
        breed="Border Collie",
        color="Negro y blanco",
        birth_date=years_ago(3),
        chip_id="DEMO-CHIP-LUNA",
        weight_kg=18.5,
        allergies="Pollo",
    )
    michi = Pet(
        owner_id=user.id,
        name="Michi",
        species="cat",
        breed="Europeo",
        color="Atigrado",
        birth_date=years_ago(2),
        chip_id="DEMO-CHIP-MICHI",
        weight_kg=4.2,
        allergies=None,
    )
    db.add_all([luna, michi])
    db.flush()

    db.add_all(
        [
            Vaccine(
                pet_id=luna.id,
                name="Rabia",
                administered_at=today - timedelta(days=200),
                next_due_at=today + timedelta(days=12),
                veterinarian="Dra. López",
                clinic_name="Clínica Vet Demo",
            ),
            Vaccine(
                pet_id=luna.id,
                name="Polivalente",
                administered_at=today - timedelta(days=90),
                next_due_at=today + timedelta(days=275),
                veterinarian="Dra. López",
                clinic_name="Clínica Vet Demo",
            ),
            Vaccine(
                pet_id=michi.id,
                name="Trivalente felina",
                administered_at=today - timedelta(days=60),
                next_due_at=today + timedelta(days=30),
                veterinarian="Dr. Ruiz",
                clinic_name="Clínica Vet Demo",
            ),
            WeightEntry(
                pet_id=luna.id,
                weight_kg=18.2,
                recorded_at=today - timedelta(days=60),
            ),
            WeightEntry(
                pet_id=luna.id,
                weight_kg=18.5,
                recorded_at=today - timedelta(days=7),
            ),
            WeightEntry(
                pet_id=michi.id,
                weight_kg=4.0,
                recorded_at=today - timedelta(days=45),
            ),
            WeightEntry(
                pet_id=michi.id,
                weight_kg=4.2,
                recorded_at=today - timedelta(days=5),
            ),
            MedicalRecord(
                pet_id=luna.id,
                record_type=RecordType.EXAM,
                title="Revisión anual",
                description="Todo correcto. Recomienda control de peso.",
                occurred_at=today - timedelta(days=40),
                veterinarian="Dra. López",
                clinic_name="Clínica Vet Demo",
            ),
            CalendarEvent(
                pet_id=luna.id,
                event_type=EventType.APPOINTMENT,
                title="Control veterinario",
                description="Revisión general (dato de ejemplo)",
                scheduled_at=now + timedelta(days=5),
                completed=False,
            ),
            CalendarEvent(
                pet_id=michi.id,
                event_type=EventType.MEDICINE,
                title="Desparasitación",
                description="Recordatorio de ejemplo",
                scheduled_at=now + timedelta(days=9),
                completed=False,
            ),
        ]
    )
    db.flush()
