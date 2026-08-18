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


from sqlalchemy import text


def init_db() -> None:
    import app.models.models  # noqa: F401

    with engine.begin() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        except Exception as e:
            # If user does not have superuser or DB already has it
            print(f"[DB INIT] Notice while creating vector extension: {e}")

        # Check / add embedding column to controls if not present
        try:
            conn.execute(text("ALTER TABLE controls ADD COLUMN IF NOT EXISTS embedding vector(1536);"))
        except Exception as e:
            print(f"[DB INIT] Notice adding embedding column to controls: {e}")

        # Check / add similarity_score and confidence columns to scan_results if not present
        try:
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS similarity_score DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS operator VARCHAR(50);"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS evidence_field VARCHAR(100);"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS match_method VARCHAR(50) DEFAULT 'SEMANTIC_VECTOR';"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
        except Exception as e:
            print(f"[DB INIT] Notice adding columns to scan_results: {e}")

    Base.metadata.create_all(bind=engine)