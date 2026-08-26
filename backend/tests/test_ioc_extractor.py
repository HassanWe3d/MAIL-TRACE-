"""Tests for IOC extraction."""
from app.services.email_parser import parse_email
from app.services.ioc_extractor import extract_iocs, _is_private_ip
import os

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _load_fixture(name):
    with open(os.path.join(FIXTURE_DIR, name), "rb") as f:
        return f.read()


def test_extract_from_phishing():
    parsed = parse_email(_load_fixture("phishing.eml"))
    iocs = extract_iocs(parsed)
    ioc_types = {i.ioc_type for i in iocs}
    assert "email" in ioc_types
    assert any(i.ioc_type == "url" and "paypa1-verify.com" in i.value for i in iocs)
    assert any(i.ioc_type == "domain" and "paypa1-verify.com" in i.value for i in iocs)


def test_private_ip_filtering():
    assert _is_private_ip("192.168.1.1") is True
    assert _is_private_ip("10.0.0.1") is True
    assert _is_private_ip("8.8.8.8") is False
    assert _is_private_ip("172.16.0.1") is True


def test_deduplication():
    parsed = parse_email(_load_fixture("phishing.eml"))
    iocs = extract_iocs(parsed)
    values = [(i.ioc_type, i.value.lower()) for i in iocs]
    assert len(values) == len(set(values))
