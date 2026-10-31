"""
Database Session Management
Supports SQLAlchemy / Supabase PostgreSQL with connection pooling and session management.
Gracefully handles offline or in-memory fallback when DATABASE_URL is not configured.
"""

import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("vyom.backend.database")

DATABASE_URL = settings.DATABASE_URL
engine = None
SessionLocal = None

if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    try:
        # Configure SQLAlchemy engine with pooling
        engine = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("SQLAlchemy database engine and sessionmaker initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to initialize SQLAlchemy engine: {exc}")
        engine = None
        SessionLocal = None

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI Dependency injection for database sessions.
    """
    if SessionLocal is not None:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        yield None
