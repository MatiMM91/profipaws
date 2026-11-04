from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Profipaws API"
    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api"

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/profipaws"

    # JWT
    jwt_secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12  # 12 hours

    # Google OAuth
    # Local stub `dev:email` is rejected unless this is true and APP_ENV is development.
    allow_dev_google_login: bool = False
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    # Optional one-time Price for full access (20 EUR). If empty, checkout uses inline price_data.
    stripe_price_id_lifetime: str = ""
    # Legacy recurring price IDs (unused for new checkouts; kept for old env compatibility)
    stripe_price_id_pro: str = ""
    stripe_price_id_pro_yearly: str = ""
    frontend_url: str = "http://localhost:5173"

    # When true: public site locked; only emails in maintenance_allowlist can log in
    maintenance_mode: bool = False
    # Comma-separated emails allowed during maintenance (e.g. you@gmail.com)
    maintenance_allowlist: str = ""

    # Shared web demo account (portfolio / try before signup)
    demo_login_enabled: bool = True
    demo_user_email: str = "demo@profipaws.com"
    demo_jwt_expire_minutes: int = 60

    # Email alerts — prefer Resend; SMTP is fallback
    resend_api_key: str = ""
    resend_from: str = "Profipaws <onboarding@resend.dev>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
    alerts_cron_secret: str = ""

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


DEFAULT_JWT_SECRET = "change-me-in-production-use-openssl-rand-hex-32"


def _is_local_host(value: str) -> bool:
    text = (value or "").lower()
    return "localhost" in text or "127.0.0.1" in text


def is_deployed_environment() -> bool:
    """True on the public site, even if APP_ENV was left at its development default."""
    settings = get_settings()
    if settings.app_env.strip().lower() == "production":
        return True
    front = (settings.frontend_url or "").lower()
    public_front = front.startswith("https://") and not _is_local_host(front)
    public_db = not _is_local_host(settings.database_url or "")
    return public_front and public_db


def assert_safe_runtime() -> None:
    """Stop a public deploy that is still signing sessions with the sample secret."""
    if not is_deployed_environment():
        return
    settings = get_settings()
    problems: list[str] = []
    secret = (settings.jwt_secret_key or "").strip()
    if secret in ("", DEFAULT_JWT_SECRET):
        problems.append("JWT_SECRET_KEY is still the development placeholder")
    if settings.allow_dev_google_login:
        problems.append("ALLOW_DEV_GOOGLE_LOGIN must be false")
    if problems:
        raise RuntimeError("Refusing to start in production: " + "; ".join(problems))
    if settings.debug:
        settings.debug = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
