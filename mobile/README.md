# Profipaws Mobile

App nativa (Expo / React Native) del pasaporte digital de salud para mascotas. Comparte backend, paleta, tipografía e i18n con el frontend web.

## Decisión de ubicación

La app vive en este mismo repositorio (`mobile/`), junto a `frontend/` y `backend/`. Es el patrón habitual cuando:

- hay un único equipo y un solo API
- la marca, traducciones y flujos deben mantenerse alineados
- aún no hace falta un ciclo de release de App Store aislado

No se comparten componentes React DOM con React Native; sí se reutilizan tokens de color, copy i18n y el mismo FastAPI.

## Requisitos

- Node 20+
- Backend Profipaws en marcha (`http://localhost:8000` por defecto)
- Expo Go (dispositivo o emulador)

## Arranque

```bash
cd mobile
cp .env.example .env
npm install --legacy-peer-deps
npx expo start
```

Luego abre en iOS Simulator, Android Emulator o escanea el QR con Expo Go.

### Variables

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL del API. En dispositivo físico usa la IP Wi‑Fi del PC (`http://192.168.x.x:8000`). Si dejas `localhost`, la app intenta detectar la IP del Metro de Expo automáticamente. |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Client ID de Google (opcional; sin él hay login de desarrollo) |
| `EXPO_PUBLIC_MAINTENANCE_MODE` | `true` bloquea login público |

### Expo Go en el móvil

Por defecto la app usa el **API de Railway** (mismo que el frontend web), así el móvil no depende de Postgres local.

1. En `mobile/.env` deja `EXPO_PUBLIC_API_URL` apuntando a Railway (ya configurado).
2. Copia el Client ID de Google del frontend:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<mismo valor que VITE_GOOGLE_CLIENT_ID en frontend/.env>
```

3. Reinicia Expo con caché limpia:

```bash
cd mobile
npx expo start -c
```

4. En el móvil verás **Iniciar sesión con Google**.

#### Backend local (opcional)

Si prefieres API en el PC: PostgreSQL en marcha + `uvicorn --host 0.0.0.0 --port 8000`, y en `.env` `EXPO_PUBLIC_API_URL=http://TU_IP_WIFI:8000`. Sin `GOOGLE_CLIENT_ID` en el backend local, funciona el login `dev:email`.

## Pantallas

- Landing + login Google / dev
- Dashboard (mascotas, alertas 14 días, alta)
- Perfil de mascota (Perfil, Historial, Seguimiento, Calendario, Herramientas)
- Acceso veterinario PIN / QR
- Planes Free / Pro (checkout Stripe en navegador)
- Ajustes (idioma ES/EN/PT, tema claro/oscuro, logout)

## Stack

Expo SDK **54** (compatible con Expo Go de App Store / Play Store) · Expo Router · React Native · i18next · SecureStore · Lucide · DM Sans / Source Sans 3

> Si ves *“Project is incompatible with this version of Expo Go”*, actualiza Expo Go o asegúrate de que el proyecto use SDK 54 (`npx expo --version` / `expo` en `package.json`).

