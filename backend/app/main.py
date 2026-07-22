from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.models import (  # noqa: F401 — ensure models are registered
    User,
    Subscription,
    Pet,
    Vaccine,
    MedicalRecord,
    CalendarEvent,
    DailyLog,
    ClinicApiKey,
)
from app.routers import auth, pets, subscriptions, external

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create tables on startup (use Alembic migrations in production)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Profipaws — Pasaporte de Salud e Historial Médico Digital para Mascotas. "
        "API B2B para clínicas veterinarias vía X-API-Key."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(pets.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(external.router)
app.include_router(external.external)


@app.get("/health")
def health():
    return {"status": "ok", "service": "profipaws-api"}
