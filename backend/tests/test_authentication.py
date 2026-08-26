"""Tests for authentication analysis."""
from app.services.authentication_analyzer import analyze_authentication, _extract_domain, _parse_auth_results

from app.services.email_parser import parse_email
import os

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _load_fixture(name):
    with open(os.path.join(FIXTURE_DIR, name), "rb") as f:
        return f.read()


def test_extract_domain():
    assert _extract_domain("user@example.com") == "example.com"
    assert _extract_domain("<user@example.com>") == "example.com"
    assert _extract_domain("") == ""


def test_auth_results_parsing():
    results = _parse_auth_results("mx.example.com; spf=fail dkim=pass dmarc=fail")
    assert results["spf"] == "fail"
    assert results["dkim"] == "pass"
    assert results["dmarc"] == "fail"


def test_phishing_auth():
    parsed = parse_email(_load_fixture("phishing.eml"))
    auth = analyze_authentication(parsed)
    assert auth["spf_result"] == "fail"
    assert auth["domain_mismatch"] is True


def test_legitimate_auth():
    parsed = parse_email(_load_fixture("legitimate.eml"))
    auth = analyze_authentication(parsed)
    assert auth["spf_result"] == "pass"
    assert auth["dkim_result"] == "pass"
    assert auth["dmarc_result"] == "pass"
    assert auth["domain_mismatch"] is False


def test_spoofed_auth():
    parsed = parse_email(_load_fixture("spoofed.eml"))
    auth = analyze_authentication(parsed)
    assert auth["domain_mismatch"] is True
    assert auth["reply_to_mismatch"] is True
