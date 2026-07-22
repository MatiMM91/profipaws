# Profipaws

Pasaporte de Salud e Historial Médico Digital para Mascotas, con integración B2B para clínicas veterinarias.

## Arquitectura

| Capa | Tecnología | Despliegue |
|------|------------|------------|
| Frontend | React (Vite) + Tailwind CSS + Lucide + React Router | Vercel |
| Backend | FastAPI + SQLAlchemy / SQLModel | Railway |
| Base de datos | PostgreSQL (+ funciones/triggers PL/pgSQL) | Railway |
| Auth | Google OAuth 2.0 → JWT | — |
| Pagos | Stripe Subscriptions (prep) | — |

```
profipaws/
├── backend/          # FastAPI API
│   ├── app/
│   │   ├── models/   # ORM: users, subscriptions, pets, …
│   │   ├── routers/  # Auth, Pets, Subscriptions, External B2B
│   │   ├── schemas/  # Pydantic DTOs
│   │   └── services/ # JWT, API keys, PIN
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React SPA
│   ├── src/components/
│   └── .env.example
└── README.md
```

## Esquema de base de datos

| Tabla | Descripción |
|-------|-------------|
| `users` | Dueños autenticados (Google ID, email, avatar) |
| `subscriptions` | `tier` (free/pro), `status`, `stripe_customer_id`, `stripe_subscription_id` |
| `pets` | Perfil: nombre, especie, raza, chip, peso, alergias, PIN temporal |
| `vaccines` | Vacunas aplicadas y próximas dosis |
| `medical_records` | Enfermedades, cirugías, exámenes (PDF/URL) |
| `calendar_events` | Recordatorios (vacuna, medicina, cita) |
| `daily_logs` | Diario del dueño para la consulta |
| `clinic_api_keys` | API Keys hasheadas para clínicas B2B |

Límite del plan **Gratuito**: 1 mascota. Plan **Pro** (€5–10/mes): mascotas ilimitadas, alertas y exportación.

## Arranque local

### Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edita DATABASE_URL y secretos

uvicorn app.main:app --reload --port 8000
```

Docs interactivas: [http://localhost:8000/docs](http://localhost:8000/docs)

Login de desarrollo (sin Google OAuth configurado):

```http
POST /api/auth/google
{ "id_token": "dev:tu@email.com" }
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## API B2B para clínicas veterinarias

1. Un usuario autenticado crea una API Key:

```http
POST /api/clinic-keys
Authorization: Bearer <jwt>
{ "clinic_name": "Clínica Vet Norte" }
```

La respuesta incluye `api_key` **una sola vez** (formato `ppk_…`).

2. La clínica consulta o escribe el expediente por **número de chip**:

```http
GET /api/v1/external/pets/{chip_id}/records
X-API-Key: ppk_xxxxxxxx
```

```http
POST /api/v1/external/pets/{chip_id}/vaccines
X-API-Key: ppk_xxxxxxxx
Content-Type: application/json

{
  "name": "Rabia",
  "administered_at": "2026-07-01",
  "next_due_at": "2027-07-01",
  "veterinarian": "Dra. López"
}
```

```http
POST /api/v1/external/pets/{chip_id}/records
X-API-Key: ppk_xxxxxxxx
```

```http
GET /api/v1/external/pets/{chip_id}/export
X-API-Key: ppk_xxxxxxxx
```

Exportación estandarizada: formato `profipaws.passport.v1` (JSON).

### Acceso en consulta (sin cuenta)

El dueño genera un PIN de 6 dígitos / QR:

```http
POST /api/pets/{id}/access-pin
Authorization: Bearer <jwt>
```

El veterinario lee el expediente:

```http
GET /api/pets/access/{pin}
```

El PIN caduca en 2 horas.

## Endpoints principales (dueños)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/google` | Login Google → JWT |
| GET | `/api/auth/me` | Usuario actual |
| CRUD | `/api/pets` | Gestión de mascotas |
| GET/POST | `/api/pets/{id}/vaccines` | Vacunas |
| GET/POST | `/api/pets/{id}/records` | Historial médico |
| GET/POST | `/api/pets/{id}/events` | Calendario |
| GET/POST | `/api/pets/{id}/logs` | Diario |
| GET | `/api/pets/{id}/export` | Export JSON |
| GET | `/api/subscriptions/me` | Estado de suscripción |
| POST | `/api/subscriptions/checkout` | Stripe Checkout (Pro) |
| POST | `/api/subscriptions/webhook` | Webhook Stripe |

## Despliegue

- **Frontend (Vercel):** conectar el directorio `frontend`, variables `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`.
- **Backend + Postgres (Railway):** servicio a partir de `backend/`, comando `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, variables del `.env.example`.

## Paleta UI

Interfaz clínica en tonos **cian / teal** (`cyan-500` … `cyan-900`) vía Tailwind (`brand` + utilidades cyan).
