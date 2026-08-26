"""EML email parser using Python standard email library."""
import email
from email import policy
from email.parser import BytesParser
from email.utils import parsedate_to_datetime
from typing import Any, Optional
import hashlib
from datetime import datetime, timezone

from app.core.logging_config import logger
from app.core.exceptions import EmailParsingError


class ParsedEmail:
    """Structured representation of a parsed email."""
    def __init__(self):
        self.headers: dict[str, Any] = {}
        self.from_address: str = ""
        self.to_addresses: list[str] = []
        self.cc_addresses: list[str] = []
        self.bcc_addresses: list[str] = []
        self.subject: str = ""
        self.date: Optional[datetime] = None
        self.reply_to: str = ""
        self.return_path: str = ""
        self.message_id: str = ""
        self.mime_version: str = ""
        self.content_type: str = ""
        self.received_headers: list[str] = []
        self.auth_results: str = ""
        self.dkim_signature: str = ""
        self.received_spf: str = ""
        self.plain_text_body: str = ""
        self.html_body: str = ""
        self.attachments: list[dict] = []
        self.all_headers: list[tuple[str, str]] = []


def parse_email(eml_bytes: bytes) -> ParsedEmail:
    """Parse raw .eml bytes into a structured ParsedEmail object."""
    logger.info("Parsing email (%d bytes)", len(eml_bytes))
    try:
        msg = BytesParser(policy=policy.default).parsebytes(eml_bytes)
    except Exception as e:
        raise EmailParsingError(f"Failed to parse EML: {e}")

    parsed = ParsedEmail()

    # Extract all headers preserving order
    parsed.all_headers = [(k, v) for k, v in msg.items()]

    # Extract specific headers
    parsed.from_address = str(msg.get("From", ""))
    parsed.to_addresses = _parse_address_list(msg.get("To", ""))
    parsed.cc_addresses = _parse_address_list(msg.get("Cc", ""))
    parsed.bcc_addresses = _parse_address_list(msg.get("Bcc", ""))
    parsed.subject = str(msg.get("Subject", ""))
    parsed.reply_to = str(msg.get("Reply-To", ""))
    parsed.return_path = str(msg.get("Return-Path", ""))
    parsed.message_id = str(msg.get("Message-ID", ""))
    parsed.mime_version = str(msg.get("MIME-Version", ""))
    parsed.content_type = str(msg.get("Content-Type", ""))
    parsed.auth_results = str(msg.get("Authentication-Results", ""))
    parsed.dkim_signature = str(msg.get("DKIM-Signature", ""))
    parsed.received_spf = str(msg.get("Received-SPF", ""))

    # Parse date — normalize all dates to UTC for safe DB persistence
    date_str = msg.get("Date", "")
    if date_str:
        try:
            parsed.date = _normalize_to_utc(parsedate_to_datetime(date_str))
        except Exception:
            pass

    # Extract Received headers (may be multiple)
    parsed.received_headers = _get_all_header_values(msg, "Received")

    # Store all headers as dict
    for key, value in msg.items():
        key_lower = key.lower()
        if key_lower not in parsed.headers:
            parsed.headers[key] = value
        else:
            # Handle multiple values
            existing = parsed.headers[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                parsed.headers[key] = [existing, value]

    # Extract body (plain text and HTML) - data only, no rendering
    parsed.plain_text_body, parsed.html_body = _extract_body(msg)

    # Extract attachment metadata only - NEVER execute attachments
    parsed.attachments = _extract_attachments(msg)

    logger.info(
        "Email parsed: from=%s, subject=%s, attachments=%d, received_hops=%d",
        parsed.from_address, parsed.subject[:50],
        len(parsed.attachments), len(parsed.received_headers)
    )
    return parsed


def _parse_address_list(value: str) -> list[str]:
    """Parse a comma-separated address list."""
    if not value:
        return []
    return [addr.strip() for addr in value.split(",") if addr.strip()]


def _get_all_header_values(msg: email.message.Message, header_name: str) -> list[str]:
    """Get all values for a given header name."""
    return [v for k, v in msg.items() if k.lower() == header_name.lower()]


def _extract_body(msg: email.message.Message) -> tuple[str, str]:
    """Extract plain text and HTML body from email. HTML is treated as data only."""
    plain_text = ""
    html = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        plain_text += payload.decode(charset, errors="replace")
                    except Exception:
                        plain_text += payload.decode("utf-8", errors="replace")
            elif content_type == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        html += payload.decode(charset, errors="replace")
                    except Exception:
                        html += payload.decode("utf-8", errors="replace")
    else:
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            try:
                decoded = payload.decode(charset, errors="replace")
            except Exception:
                decoded = payload.decode("utf-8", errors="replace")
            if content_type == "text/plain":
                plain_text = decoded
            elif content_type == "text/html":
                html = decoded
            else:
                plain_text = decoded

    return plain_text, html


def _extract_attachments(msg: email.message.Message) -> list[dict]:
    """Extract attachment metadata. NEVER execute or open attachment contents."""
    attachments = []
    if not msg.is_multipart():
        return attachments

    for part in msg.walk():
        content_disposition = str(part.get("Content-Disposition", ""))
        if "attachment" in content_disposition or (
            part.get_content_maintype() != "text"
            and part.get_content_maintype() != "multipart"
            and part.get_filename()
        ):
            filename = part.get_filename() or "unknown"
            mime_type = part.get_content_type()
            payload = part.get_payload(decode=True) or b""

            # Calculate hashes only - never execute
            hashes = _safe_hash(payload)

            attachments.append({
                "filename": filename,
                "mime_type": mime_type,
                "size": len(payload),
                **hashes,
            })

    return attachments


def _safe_hash(data: bytes) -> dict:
    """Calculate hashes for data. Safe: only computes hashes, never executes."""
    return {
        "md5": hashlib.md5(data).hexdigest() if data else "",
        "sha1": hashlib.sha1(data).hexdigest() if data else "",
        "sha256": hashlib.sha256(data).hexdigest() if data else "",
    }


def _normalize_to_utc(dt: datetime) -> datetime:
    """Normalize a datetime to a timezone-aware UTC datetime.

    - If already timezone-aware, convert to UTC.
    - If naive, assume UTC (standard assumption for email Date headers
      missing timezone info) and attach UTC tzinfo.

    With DateTime(timezone=True) columns, asyncpg requires timezone-aware
    datetime objects for TIMESTAMPTZ columns.
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc)
    # Naive datetime — assume UTC and attach tzinfo
    return dt.replace(tzinfo=timezone.utc)
