"""Tests for email parsing."""
import os
from app.services.email_parser import parse_email

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _load_fixture(name):
    with open(os.path.join(FIXTURE_DIR, name), "rb") as f:
        return f.read()


def test_parse_phishing():
    parsed = parse_email(_load_fixture("phishing.eml"))
    assert "paypa1-verify.com" in parsed.from_address
    assert "Urgent" in parsed.subject
    assert len(parsed.received_headers) >= 1
    assert "Authentication-Results" in parsed.headers or "authentication-results" in [k.lower() for k in parsed.headers.keys()]


def test_parse_legitimate():
    parsed = parse_email(_load_fixture("legitimate.eml"))
    assert "techcompany.com" in parsed.from_address
    assert "newsletter" in parsed.subject.lower()
    assert parsed.plain_text_body or parsed.html_body


def test_parse_spoofed():
    parsed = parse_email(_load_fixture("spoofed.eml"))
    assert "ceo@legitimate-bank.com" in parsed.from_address
    assert "Wire Transfer" in parsed.subject
    assert "Reply-To" in str(parsed.headers) or parsed.reply_to


def test_attachment_extraction():
    parsed = parse_email(_load_fixture("phishing.eml"))
    assert isinstance(parsed.attachments, list)
