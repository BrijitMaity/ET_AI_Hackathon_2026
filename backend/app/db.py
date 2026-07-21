from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "example")
DB_HOST = os.getenv("POSTGRES_HOST", "timescaledb")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "timeseries")
USE_SQLITE = os.getenv("USE_SQLITE", "0") == "1"

if not USE_SQLITE:
    import socket
    try:
        socket.gethostbyname(DB_HOST)
    except socket.error:
        logger.warning("asyncpg host unresolvable, falling back to SQLite for local execution")
        USE_SQLITE = True

if USE_SQLITE:
    DATABASE_URL = "sqlite+aiosqlite:///./local.db"
    engine = create_async_engine(DATABASE_URL, echo=False, future=True, connect_args={'timeout': 15.0})
else:
    DATABASE_URL = (
        f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    # Ensure SQLite tables exist on-demand for tests/local runs
    if USE_SQLITE:
        try:
            from .models import Base

            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            # non-fatal; proceed to yield session
            pass

    async with AsyncSessionLocal() as session:
        yield session
