import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("fintrack.db")

db_url = settings.DATABASE_URL or "sqlite:///./finance.db"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

def create_app_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

try:
    engine = create_app_engine(db_url)
    # Quick probe test if not SQLite
    if not db_url.startswith("sqlite"):
        with engine.connect():
            pass
except Exception as e:
    logger.warning("Primary database connection failed (%s). Falling back to local SQLite finance.db", e)
    db_url = "sqlite:///./finance.db"
    engine = create_app_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

