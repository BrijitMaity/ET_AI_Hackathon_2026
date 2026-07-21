import asyncio
import logging
import os

from sqlalchemy import text

from .db import engine
from .models import Base
from .neo4j_client import ensure_schema

logger = logging.getLogger(__name__)


async def init_postgres():
    """Initialize Postgres / TimescaleDB: create tables, extension, hypertable."""
    async with engine.begin() as conn:
        # create SQLAlchemy tables
        await conn.run_sync(Base.metadata.create_all)
        # create timescaledb extension and hypertable if available
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb;"))
            await conn.execute(text("SELECT create_hypertable('sensor_readings', 'timestamp', if_not_exists => TRUE);"))
            logger.info("Ensured TimescaleDB hypertable for sensor_readings")
        except Exception:
            logger.warning("TimescaleDB not available or CREATE EXTENSION failed; continuing")


async def init_all():
    await init_postgres()
    # Neo4j schema is best-effort
    try:
        ensure_schema()
        logger.info("Neo4j schema ensured (if available)")
    except Exception:
        logger.exception("Neo4j schema init failed (continuing)")


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(init_all())
    except Exception:
        logger.exception("Database initialization failed")


if __name__ == "__main__":
    main()
