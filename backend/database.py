import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

log = logging.getLogger("catdog.database")

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://neuralpaw:neuralpaw@localhost:5432/neuralpaw"
)

# Global flag to track if database is functional
db_enabled = True
engine = None
SessionLocal = None

try:
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    SessionLocal = async_sessionmaker(
        bind=engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
except Exception as e:
    log.error("Failed to initialize async engine: %s", str(e))
    db_enabled = False

Base = declarative_base()

# In-memory store fallback when DB is down
IN_MEMORY_PREDICTIONS = []
IN_MEMORY_FEEDBACK = {}

async def get_db():
    global db_enabled
    if not db_enabled or SessionLocal is None:
        # Yield None to notify routers to use in-memory fallback
        yield None
        return
        
    async with SessionLocal() as session:
        try:
            yield session
        except Exception as e:
            log.error("Database session error: %s", str(e))
            yield None
        finally:
            await session.close()
