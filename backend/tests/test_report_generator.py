"""Tests for PDF report generation with mixed data types."""

import pytest
from app.services.report_generator import generate_report


def _base_data(**overrides):
    """Return a minimal valid report data dict, with optional overrides."""
    d = {
        "filename": "test.eml",
        "risk_score": 42,
        "risk_level": "medium",
        "classification": "phishing",
        "email_metadata": {
            "from_address": "attacker@evil.com",
            "to_addresses": ["victim@company.com"],
            "subject": "Urgent: Update your credentials",
            "date": "2025-01-15T10:30:00Z",
            "reply_to": "different@evil.com",
            "return_path": "bounce@evil.com",
        },
        "authentication_results": {
            "spf_result": "fail",
            "dkim_result": "none",
            "dmarc_result": "fail",
            "domain_mismatch": True,
        },
        "iocs": [
            {"ioc_type": "url", "value": "https://evil.com/phish", "source": "eml", "risk": "high"},
            {"ioc_type": "domain", "value": "evil.com", "source": "eml", "risk": "high"},
        ],
        "ai_analysis": {
            "classification": "phishing",
            "confidence": 0.92,
            "severity": "high",
            "summary": "This email is a phishing attempt targeting corporate credentials.",
            "reasoning": [],
            "recommended_actions": [],
            "limitations": [],
        },
        "risk_score_detail": {
            "final_score": 42,
            "risk_level": "medium",
            "deterministic_score": 38,
            "ai_social_engineering_score": 4,
            "signals": [],
        },
    }
    d.update(overrides)
    return d


class TestReportGenerator:
    """Test PDF generation with various data shapes."""

    def test_report_generates_with_dict_reasoning(self):
        """Reasoning items are dicts with evidence/impact keys (original format)."""
        data = _base_data()
        data["ai_analysis"]["reasoning"] = [
            {"evidence": "SPF check failed", "impact": "Sender may be spoofed"},
            {"evidence": "URL points to known phishing domain", "impact": "High confidence of credential theft"},
        ]
        buf = generate_report(data)
        content = buf.read()
        assert len(content) > 0
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_string_reasoning(self):
        """Reasoning items are plain strings (Gemini output format)."""
        data = _base_data()
        data["ai_analysis"]["reasoning"] = [
            "SPF check failed — sender may be spoofed",
            "URL points to known phishing domain",
            "DMARC policy not enforced",
        ]
        buf = generate_report(data)
        content = buf.read()
        assert len(content) > 0
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_mixed_reasoning(self):
        """Reasoning items are a mix of dicts and strings."""
        data = _base_data()
        data["ai_analysis"]["reasoning"] = [
            "Plain string reasoning step",
            {"evidence": "DKIM signature missing", "impact": "Email integrity cannot be verified"},
            42,  # unexpected type — should not crash
            None,  # should be skipped
            "Another string reasoning step",
        ]
        buf = generate_report(data)
        content = buf.read()
        assert len(content) > 0
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_empty_reasoning(self):
        """Empty or None reasoning lists should not crash."""
        data = _base_data()
        data["ai_analysis"]["reasoning"] = []
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

        data2 = _base_data()
        data2["ai_analysis"]["reasoning"] = None
        buf2 = generate_report(data2)
        content2 = buf2.read()
        assert content2[:5] == b"%PDF-"

    def test_report_generates_with_string_recommended_actions(self):
        """Recommended actions as plain strings (Gemini format)."""
        data = _base_data()
        data["ai_analysis"]["recommended_actions"] = [
            "Block sender domain",
            "Quarantine the email",
            "Report to SOC team",
        ]
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_dict_recommended_actions(self):
        """Recommended actions as dicts with action/description keys."""
        data = _base_data()
        data["ai_analysis"]["recommended_actions"] = [
            {"action": "block", "description": "Block sender domain at mail gateway"},
            {"action": "report", "description": "Escalate to SOC for incident response"},
        ]
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_string_signals(self):
        """Risk signals as plain strings."""
        data = _base_data()
        data["risk_score_detail"]["signals"] = [
            "SPF alignment failure",
            "Known phishing domain detected",
        ]
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_dict_signals(self):
        """Risk signals as dicts with name/weight keys (original format)."""
        data = _base_data()
        data["risk_score_detail"]["signals"] = [
            {"name": "SPF failure", "weight": 15},
            {"name": "Known phishing URL", "weight": 25},
        ]
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_string_iocs(self):
        """IOCs as plain strings should not crash."""
        data = _base_data()
        data["iocs"] = ["https://evil.com/phish", "evil.com"]
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_mixed_iocs(self):
        """IOCs as a mix of dicts and strings."""
        data = _base_data()
        data["iocs"] = [
            {"ioc_type": "url", "value": "https://evil.com/phish", "source": "eml", "risk": "high"},
            "just-a-string-ioc",
            {"ioc_type": "domain", "value": "evil.com", "source": "eml", "risk": "medium"},
        ]
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_empty_metadata(self):
        """Empty or missing metadata should not crash."""
        data = _base_data(email_metadata={})
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_no_auth(self):
        """Missing authentication results should not crash."""
        data = _base_data(authentication_results={})
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_no_risk_detail(self):
        """Missing risk score detail should not crash."""
        data = _base_data(risk_score_detail={})
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_no_ai(self):
        """Missing AI analysis should not crash."""
        data = _base_data(ai_analysis={})
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_report_generates_with_all_none_fields(self):
        """Report with None values in various fields should not crash."""
        data = {
            "filename": None,
            "risk_score": None,
            "risk_level": None,
            "classification": None,
            "email_metadata": {},
            "authentication_results": {},
            "iocs": [],
            "ai_analysis": {
                "classification": None,
                "confidence": None,
                "severity": None,
                "summary": None,
                "reasoning": [None, "", "valid string", {"evidence": "ok", "impact": "ok"}],
                "recommended_actions": [None, "valid action"],
            },
            "risk_score_detail": {},
        }
        buf = generate_report(data)
        content = buf.read()
        assert content[:5] == b"%PDF-"

    def test_full_report_with_typical_gemini_output(self):
        """Simulate typical Gemini response format — all strings."""
        data = _base_data()
        data["ai_analysis"] = {
            "classification": "phishing",
            "confidence": 0.92,
            "severity": "high",
            "summary": "This is a phishing email impersonating IT support to harvest credentials.",
            "reasoning": [
                "The sender domain does not match the organization's domain",
                "SPF authentication failed — message is not authorized from the claimed IP",
                "The email contains a suspicious link to a credential harvesting page",
                "DMARC policy does not enforce rejection, allowing spoofed emails through",
                "The urgency language and credential request are classic phishing indicators",
            ],
            "threat_categories": ["phishing", "credential-theft"],
            "social_engineering_detected": True,
            "social_engineering_confidence": 0.88,
            "recommended_actions": [
                "Block the sender domain at the email gateway",
                "Report the URL to Safe Browsing and internal blocklists",
                "Alert the targeted employees about this phishing campaign",
                "Review DMARC policy to enforce quarantine or reject",
            ],
            "limitations": [
                "Link detonation was not performed",
                "Attachment analysis was limited to hash computation",
            ],
        }
        data["risk_score_detail"] = {
            "final_score": 78,
            "risk_level": "high",
            "deterministic_score": 65,
            "ai_social_engineering_score": 13,
            "signals": [
                "SPF alignment failure",
                {"name": "Known phishing domain", "weight": 20},
                "Urgent credential request detected",
            ],
        }
        buf = generate_report(data)
        content = buf.read()
        assert len(content) > 500  # Meaningful PDF content
        assert content[:5] == b"%PDF-"
