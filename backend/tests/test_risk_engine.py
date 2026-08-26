"""Tests for the deterministic risk engine."""
from app.services.risk_engine import calculate_signals, calculate_score, apply_ai_social_engineering, SIGNAL_WEIGHTS


def test_spf_fail_weight():
    signals = calculate_signals({"spf_result": "fail", "dkim_result": "pass", "dmarc_result": "pass", "domain_mismatch": False}, [], {"ip_geolocations": [], "threat_intel": []}, [], [])
    score, level = calculate_score(signals)
    assert score == 15
    assert level == "LOW"


def test_spf_dkim_dmarc_fail():
    signals = calculate_signals({"spf_result": "fail", "dkim_result": "fail", "dmarc_result": "fail", "domain_mismatch": False}, [], {"ip_geolocations": [], "threat_intel": []}, [], [])
    score, level = calculate_score(signals)
    assert score == 45
    assert level == "MEDIUM"


def test_full_critical():
    signals = calculate_signals(
        {"spf_result": "fail", "dkim_result": "fail", "dmarc_result": "fail", "domain_mismatch": False},
        [],
        {"ip_geolocations": [], "threat_intel": [{"ioc_type": "url", "ioc_value": "http://evil.com", "status": "malicious"}, {"ioc_type": "domain", "ioc_value": "evil.com", "status": "malicious"}, {"ioc_type": "hash_sha256", "ioc_value": "abc123", "status": "malicious"}]},
        [],
        [{"domain": "paypa1.com", "is_lookalike": True, "impersonated_brand": "paypal"}],
    )
    score, level = calculate_score(signals)
    assert score == 100
    assert level == "CRITICAL"


def test_score_capping():
    signals = [{"name": "test", "weight": 150, "evidence": "test"}]
    score, level = calculate_score(signals)
    assert score == 100


def test_ai_social_engineering():
    score, level, ai_se = apply_ai_social_engineering(50, {"social_engineering_detected": True, "social_engineering_confidence": 0.9})
    assert ai_se == 14  # round(0.9 * 15) = 13.5 -> 14
    assert score == 64
    assert level == "HIGH"


def test_no_social_engineering():
    score, level, ai_se = apply_ai_social_engineering(50, {"social_engineering_detected": False})
    assert ai_se == 0
    assert score == 50
    assert level == "MEDIUM"


def test_signal_weights():
    assert SIGNAL_WEIGHTS["spf_fail"] == 15
    assert SIGNAL_WEIGHTS["dkim_fail"] == 15
    assert SIGNAL_WEIGHTS["dmarc_fail"] == 15
    assert SIGNAL_WEIGHTS["from_return_path_mismatch"] == 10
    assert SIGNAL_WEIGHTS["url_malicious_vt"] == 20
    assert SIGNAL_WEIGHTS["domain_malicious_vt"] == 15
    assert SIGNAL_WEIGHTS["attachment_hash_malicious"] == 25
    assert SIGNAL_WEIGHTS["suspicious_ip"] == 10
    assert SIGNAL_WEIGHTS["lookalike_domain"] == 10
