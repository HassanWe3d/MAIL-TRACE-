"""PostgreSQL-backed enrichment cache with upsert support."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
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
    """Store enrichment result in cache using PostgreSQL upsert.

    If a row with the same cache_key already exists, update it instead of
    inserting a duplicate. This prevents UniqueViolationError when multiple
    parallel enrichment tasks resolve to the same cache key.
    """
    key = make_cache_key(source, ioc_type, value)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.CACHE_TTL_HOURS)

    stmt = (
        insert(EnrichmentCache)
        .values(
            cache_key=key,
            source=source,
            ioc_type=ioc_type,
            ioc_value=value,
            response_json=response,
            status="valid",
            expires_at=expires,
        )
        .on_conflict_do_update(
            index_elements=["cache_key"],
            set_={
                "response_json": response,
                "status": "valid",
                "expires_at": expires,
            },
        )
    )
    await db.execute(stmt)
    # Use merge/flush-safe pattern: the upsert is executed as a single
    # INSERT ... ON CONFLICT statement, so it never leaves the session in
    # a broken state.  We do NOT call flush() here — the caller will
    # flush/commit at the end of the investigation pipeline.
    logger.info("Cached (upsert): %s", key)
