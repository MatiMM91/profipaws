from datetime import date, datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_serializer, field_validator
from app.models import (
    SubscriptionTier,
    SubscriptionStatus,
    EventType,
    RecordType,
    SharePermission,
)


def _as_utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def _to_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


# --- Auth ---
class GoogleAuthRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool


# --- Subscription ---
class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tier: SubscriptionTier
    status: SubscriptionStatus
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    billing_interval: Optional[str] = None  # monthly | yearly
    current_period_end: Optional[datetime] = None


class CheckoutSessionRequest(BaseModel):
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    # monthly → 6.99 €/mo · yearly → 59 €/yr
    interval: Optional[str] = Field(default="yearly", pattern="^(monthly|yearly)$")


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class ChangeIntervalRequest(BaseModel):
    interval: str = Field(..., pattern="^(monthly|yearly)$")


class ChangeIntervalResponse(BaseModel):
    ok: bool = True
    billing_interval: str
    message: Optional[str] = None


# --- Pets ---
class PetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    species: str = Field(..., min_length=1, max_length=80)
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    chip_id: Optional[str] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    chip_id: Optional[str] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None


class PetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    species: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    chip_id: Optional[str] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None
    created_at: datetime
    my_role: str = "owner"  # owner | edit | read


class AccessPinResponse(BaseModel):
    pin: str
    expires_at: datetime
    qr_payload: str


class PetShareCreate(BaseModel):
    email: EmailStr
    permission: SharePermission = SharePermission.READ


class PetShareUpdate(BaseModel):
    permission: SharePermission


class PetShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    shared_with_user_id: int
    permission: SharePermission
    invited_by: int
    created_at: datetime
    email: str
    full_name: Optional[str] = None


# --- Vaccines / Records / Logs ---
class VaccineCreate(BaseModel):
    name: str
    administered_at: date
    next_due_at: Optional[date] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None
    notes: Optional[str] = None


class VaccineUpdate(BaseModel):
    name: Optional[str] = None
    administered_at: Optional[date] = None
    next_due_at: Optional[date] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None
    notes: Optional[str] = None


class VaccineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    name: str
    administered_at: date
    next_due_at: Optional[date] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None
    notes: Optional[str] = None


class MedicalRecordCreate(BaseModel):
    record_type: RecordType
    title: str
    description: Optional[str] = None
    occurred_at: date
    document_url: Optional[str] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None


class MedicalRecordUpdate(BaseModel):
    record_type: Optional[RecordType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    occurred_at: Optional[date] = None
    document_url: Optional[str] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None


class MedicalRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    record_type: RecordType
    title: str
    description: Optional[str] = None
    occurred_at: date
    document_url: Optional[str] = None
    document_filename: Optional[str] = None
    has_document: bool = False
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None


class ConsultationCreate(BaseModel):
    treating_doctor: str = Field(..., min_length=1, max_length=255)
    specialty: Optional[str] = None
    reason: Optional[str] = None
    treatment: Optional[str] = None
    treatment_changes: Optional[str] = None
    consulted_at: date


class ConsultationUpdate(BaseModel):
    treating_doctor: Optional[str] = None
    specialty: Optional[str] = None
    reason: Optional[str] = None
    treatment: Optional[str] = None
    treatment_changes: Optional[str] = None
    consulted_at: Optional[date] = None


class ConsultationNoteCreate(BaseModel):
    note: str = Field(..., min_length=1)
    noted_at: date


class ConsultationNoteUpdate(BaseModel):
    note: Optional[str] = None
    noted_at: Optional[date] = None


class ConsultationNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    consultation_id: int
    note: str
    noted_at: date
    created_at: datetime


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    treating_doctor: str
    specialty: Optional[str] = None
    reason: Optional[str] = None
    treatment: Optional[str] = None
    treatment_changes: Optional[str] = None
    consulted_at: date
    created_at: datetime
    notes: list[ConsultationNoteOut] = []


class CalendarEventCreate(BaseModel):
    event_type: EventType
    title: str
    description: Optional[str] = None
    scheduled_at: datetime

    @field_validator("scheduled_at")
    @classmethod
    def utc_naive_scheduled_at(cls, value: datetime) -> datetime:
        return _to_utc_naive(value)


class CalendarEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed: Optional[bool] = None

    @field_validator("scheduled_at")
    @classmethod
    def utc_naive_scheduled_at(cls, value: Optional[datetime]) -> Optional[datetime]:
        return _to_utc_naive(value) if value is not None else None


class CalendarEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    event_type: EventType
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    completed: bool

    @field_serializer("scheduled_at")
    def serialize_scheduled_at(self, value: datetime) -> str:
        return _as_utc_iso(value)


class DailyLogCreate(BaseModel):
    note: str
    mood: Optional[str] = None
    appetite: Optional[str] = None
    logged_at: Optional[datetime] = None


class DailyLogUpdate(BaseModel):
    note: Optional[str] = None
    mood: Optional[str] = None
    appetite: Optional[str] = None
    logged_at: Optional[datetime] = None


class DailyLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    note: str
    mood: Optional[str] = None
    appetite: Optional[str] = None
    logged_at: datetime


class ChronicConditionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    notes: Optional[str] = None
    diagnosed_at: Optional[date] = None


class ChronicConditionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    notes: Optional[str] = None
    diagnosed_at: Optional[date] = None


class ChronicConditionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    name: str
    notes: Optional[str] = None
    diagnosed_at: Optional[date] = None


# --- External API ---
class ExternalVaccineCreate(BaseModel):
    name: str
    administered_at: date
    next_due_at: Optional[date] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None
    notes: Optional[str] = None


class ExternalMedicalRecordCreate(BaseModel):
    record_type: RecordType
    title: str
    description: Optional[str] = None
    occurred_at: date
    document_url: Optional[str] = None
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None


class PetExportOut(BaseModel):
    pet: PetOut
    vaccines: list[VaccineOut]
    medical_records: list[MedicalRecordOut]
    calendar_events: list[CalendarEventOut]
    daily_logs: list[DailyLogOut]
    chronic_conditions: list[ChronicConditionOut] = []
    consultations: list[ConsultationOut] = []


class ClinicApiKeyCreate(BaseModel):
    clinic_name: str = Field(..., min_length=1, max_length=255)


class ClinicApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    api_key: Optional[str] = None  # only returned once on creation
