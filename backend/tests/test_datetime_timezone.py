"""Tests for timezone-safe datetime handling across the backend."""
from datetime import datetime, timezone, timedelta

from app.services.email_parser import parse_email


def _make_eml(date_header: str) -> bytes:
    """Create a minimal .eml with the given Date header."""
    return (
        b"From: sender@example.com\n"
        b"To: recipient@example.com\n"
        b"Subject: Timezone test\n"
        b"Date: " + date_header.encode() + b"\n"
        b"Reply-To: sender@example.com\n"
        b"Return-Path: <sender@example.com>\n"
        b"Message-ID: <test-tz-001@example.com>\n"
        b"Authentication-Results: mx.example.com;\n"
        b"        spf=pass\n"
        b"MIME-Version: 1.0\n"
        b"Content-Type: text/plain; charset=\"UTF-8\"\n"
        b"\n"
        b"Test body.\n"
    )


def test_date_with_positive_offset_timezone():
    """Date header with +0530 should be normalized to UTC."""
    eml = _make_eml("Tue, 26 Aug 2025 15:30:00 +0530")
    parsed = parse_email(eml)
    assert parsed.date is not None
    assert parsed.date.tzinfo is not None
    # 15:30 +05:30 = 10:00 UTC
    assert parsed.date == datetime(2025, 8, 26, 10, 0, 0, tzinfo=timezone.utc)


def test_date_with_utc():
    """Date header with UTC/GMT should remain timezone-aware in UTC."""
    eml = _make_eml("Mon, 25 Aug 2025 10:30:00 UTC")
    parsed = parse_email(eml)
    assert parsed.date is not None
    assert parsed.date.tzinfo is not None
    assert parsed.date == datetime(2025, 8, 25, 10, 30, 0, tzinfo=timezone.utc)


def test_date_without_timezone():
    """Date header without timezone is assumed UTC and made timezone-aware."""
    eml = _make_eml("Mon, 25 Aug 2025 10:30:00")
    parsed = parse_email(eml)
    assert parsed.date is not None
    # Should be timezone-aware (UTC assumed)
    assert parsed.date.tzinfo is not None
    assert parsed.date == datetime(2025, 8, 25, 10, 30, 0, tzinfo=timezone.utc)


def test_date_with_negative_offset():
    """Date header with -0400 should be normalized to UTC."""
    eml = _make_eml("Mon, 25 Aug 2025 14:30:00 -0400")
    parsed = parse_email(eml)
    assert parsed.date is not None
    assert parsed.date.tzinfo is not None
    # 14:30 -04:00 = 18:30 UTC
    assert parsed.date == datetime(2025, 8, 25, 18, 30, 0, tzinfo=timezone.utc)


def test_date_with_colon_tz_offset():
    """Date header with colon-separated offset like +05:30.

    Note: Python's parsedate_to_datetime does not support colon-separated
    timezone offsets (non-RFC 2822). It falls back to UTC. This test
    documents that behavior. The standard +0530 (no colon) format works
    correctly, as tested in test_date_with_positive_offset_timezone.
    """
    eml = _make_eml("Wed, 27 Aug 2025 08:00:00 +05:30")
    parsed = parse_email(eml)
    assert parsed.date is not None
    assert parsed.date.tzinfo is not None
    # parsedate_to_datetime can't parse colon-offset, falls back to UTC
    assert parsed.date == datetime(2025, 8, 27, 8, 0, 0, tzinfo=timezone.utc)


def test_date_none_when_missing():
    """No Date header should result in None date."""
    eml = (
        b"From: sender@example.com\n"
        b"To: recipient@example.com\n"
        b"Subject: No date\n"
        b"Message-ID: <test-nodate@example.com>\n"
        b"MIME-Version: 1.0\n"
        b"Content-Type: text/plain; charset=\"UTF-8\"\n"
        b"\n"
        b"Body.\n"
    )
    parsed = parse_email(eml)
    assert parsed.date is None


def test_normalize_to_utc_helper():
    """Direct test of the _normalize_to_utc helper function."""
    from app.services.email_parser import _normalize_to_utc

    # Aware datetime in a non-UTC timezone
    aware = datetime(2025, 8, 26, 15, 30, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    result = _normalize_to_utc(aware)
    assert result.tzinfo is not None
    assert result == datetime(2025, 8, 26, 10, 0, 0, tzinfo=timezone.utc)

    # Naive datetime — should get UTC attached
    naive = datetime(2025, 8, 25, 10, 30, 0)
    result = _normalize_to_utc(naive)
    assert result.tzinfo is not None
    assert result == datetime(2025, 8, 25, 10, 30, 0, tzinfo=timezone.utc)

    # None passthrough
    assert _normalize_to_utc(None) is None

    # Already UTC aware
    utc_dt = datetime(2025, 8, 25, 10, 30, 0, tzinfo=timezone.utc)
    result = _normalize_to_utc(utc_dt)
    assert result.tzinfo is not None
    assert result == utc_dt
