from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models import (
    SubscriptionTier,
    SubscriptionStatus,
    EventType,
    RecordType,
)


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
    current_period_end: Optional[datetime] = None


class CheckoutSessionRequest(BaseModel):
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


# --- Pets ---
class PetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    species: str = Field(..., min_length=1, max_length=80)
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    chip_id: Optional[str] = None
    photo_url: Optional[str] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    chip_id: Optional[str] = None
    photo_url: Optional[str] = None
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
    photo_url: Optional[str] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None
    created_at: datetime


class AccessPinResponse(BaseModel):
    pin: str
    expires_at: datetime
    qr_payload: str


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
    veterinarian: Optional[str] = None
    clinic_name: Optional[str] = None


class CalendarEventCreate(BaseModel):
    event_type: EventType
    title: str
    description: Optional[str] = None
    scheduled_at: datetime


class CalendarEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed: Optional[bool] = None


class CalendarEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    event_type: EventType
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    completed: bool


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
