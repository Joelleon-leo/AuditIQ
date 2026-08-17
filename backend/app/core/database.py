from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings


def _build_engine():
    db_url = settings.DATABASE_URL

    if not db_url:
        raise RuntimeError(
            "DATABASE_URL is missing. PostgreSQL connection required."
        )

    return create_engine(
        db_url,
        pool_pre_ping=True,
        connect_args={
            "connect_timeout": 10
        },
    )


engine = _build_engine()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models.models  # noqa: F401

    Base.metadata.create_all(bind=engine)