"""PostgreSQL-backed enrichment cache."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import EnrichmentCache
from app.utils.normalization import make_cache_key
from app.core.logging_config import logger

settings = get_settings()


async def get_cached(db: AsyncSession, source: str, ioc_type: str, value: str) -> dict | None:
    """Check cache for existing enrichment result."""
    key = make_cache_key(source, ioc_type, value)
    result = await db.execute(select(EnrichmentCache).where(EnrichmentCache.cache_key == key))
    cache_entry = result.scalar_one_or_none()
    if cache_entry and cache_entry.expires_at and cache_entry.expires_at > datetime.now(timezone.utc):
        logger.info("Cache hit: %s", key)
        return cache_entry.response_json
    logger.info("Cache miss: %s", key)
    return None


async def set_cached(db: AsyncSession, source: str, ioc_type: str, value: str, response: dict):
    """Store enrichment result in cache."""
    key = make_cache_key(source, ioc_type, value)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.CACHE_TTL_HOURS)
    entry = EnrichmentCache(
        cache_key=key, source=source, ioc_type=ioc_type,
        ioc_value=value, response_json=response,
        status="valid", expires_at=expires,
    )
    db.add(entry)
    await db.flush()
    logger.info("Cached: %s", key)
