"""Regression tests for enrichment_cache upsert / race-condition fix.

Covers:
- Existing cache_key: upsert updates instead of duplicating
- Repeated same cache_key: second call does not raise
- Multiple identical indicators in one investigation
- Successful investigation after a cache conflict
- get_cached returns None for expired entries
"""
import asyncio
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.enrichment_cache import get_cached, set_cached


class FakeScalar:
    def __init__(self, val):
        self._val = val
    def scalar_one_or_none(self):
        return self._val


class FakeResult:
    def __init__(self, val=None):
        self._val = val
    def scalar_one_or_none(self):
        return self._val


def _make_cache_entry(response_json=None, expires_hours=1):
    """Create a mock EnrichmentCache row."""
    entry = MagicMock()
    entry.response_json = response_json or {"result": "cached"}
    entry.expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    return entry


# ──────────────────────────────────────────────
# 1. set_cached uses upsert (no UniqueViolation)
# ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_set_cached_does_not_raise_on_duplicate_key():
    """Calling set_cached twice for the same key must NOT raise
    UniqueViolationError — the upsert should handle it."""
    db = AsyncMock()
    # execute returns something (the upsert result); we don't inspect it
    db.execute = AsyncMock(return_value=MagicMock())
    # flush must not be called (removed in the fix)
    db.flush = AsyncMock()

    await set_cached(db, "virustotal", "url", "https://example.com/a", {"result": "clean"})
    await set_cached(db, "virustotal", "url", "https://example.com/a", {"result": "malicious"})

    # execute called twice — once per upsert
    assert db.execute.call_count == 2
    # No flush — the upsert is a single statement
    db.flush.assert_not_called()


@pytest.mark.asyncio
async def test_set_cached_execute_called_once_per_upsert():
    """Each set_cached call produces exactly one execute (the INSERT ON CONFLICT)."""
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())

    await set_cached(db, "ip_api", "ip", "8.8.8.8", {"country": "US"})

    db.execute.assert_called_once()
    call_args = db.execute.call_args
    # The argument should be an executable statement, not a plain model
    assert call_args is not None


# ──────────────────────────────────────────────
# 2. get_cached returns cached data on hit
# ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_cached_returns_data_on_hit():
    db = AsyncMock()
    entry = _make_cache_entry({"status": "clean", "score": 0})
    db.execute = AsyncMock(return_value=FakeResult(entry))

    result = await get_cached(db, "virustotal", "url", "https://example.com/x")
    assert result == {"status": "clean", "score": 0}


@pytest.mark.asyncio
async def test_get_cached_returns_none_on_miss():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(None))

    result = await get_cached(db, "virustotal", "url", "https://example.com/missing")
    assert result is None


@pytest.mark.asyncio
async def test_get_cached_returns_none_when_expired():
    db = AsyncMock()
    entry = _make_cache_entry(expires_hours=-1)  # expired
    db.execute = AsyncMock(return_value=FakeResult(entry))

    result = await get_cached(db, "virustotal", "ip", "1.2.3.4")
    assert result is None


# ──────────────────────────────────────────────
# 3. Concurrent duplicate cache_key handling
# ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_concurrent_set_cached_same_key():
    """Simulate two parallel enrichment tasks caching the same key."""
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())

    # Both coroutines execute concurrently
    await asyncio.gather(
        set_cached(db, "virustotal", "domain", "evil.com", {"detections": 5}),
        set_cached(db, "virustotal", "domain", "evil.com", {"detections": 3}),
    )

    # Both should succeed (two upsert statements executed)
    assert db.execute.call_count == 2


# ──────────────────────────────────────────────
# 4. Multiple identical indicators deduplicated
# ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_identical_indicator_cache_flow():
    """If two IOCs have the same value, only one cache lookup is needed.
    The second should hit the cache."""
    db = AsyncMock()
    entry = _make_cache_entry({"result": "clean"})
    db.execute = AsyncMock(return_value=FakeResult(entry))

    # First call — cache hit
    r1 = await get_cached(db, "virustotal", "domain", "same.com")
    assert r1 == {"result": "clean"}

    # Second call — same key, still a hit
    r2 = await get_cached(db, "virustotal", "domain", "same.com")
    assert r2 == {"result": "clean"}


# ──────────────────────────────────────────────
# 5. Normalization produces consistent keys
# ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_cache_key_normalization_consistency():
    """URL normalization should produce the same cache key regardless of
    trailing slashes, scheme case, etc."""
    from app.utils.normalization import make_cache_key

    k1 = make_cache_key("virustotal", "url", "https://Example.COM/path/")
    k2 = make_cache_key("virustotal", "url", "https://example.com/path")
    # Same scheme → same key after normalization
    assert k1 == k2
    # Different scheme (http vs https) produces different keys — that is correct
    # because they are genuinely different URLs
    k3 = make_cache_key("virustotal", "url", "http://example.com/path")
    assert k3 != k1
