from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings, is_deployed_environment

settings = get_settings()
if is_deployed_environment() and settings.debug:
    settings.debug = False


def _database_url() -> str:
    url = settings.database_url
    # Railway sometimes provides postgres://; SQLAlchemy expects postgresql://
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


engine = create_engine(
    _database_url(),
    pool_pre_ping=True,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
