"""Deterministic risk scoring engine with exact specified weights."""
from app.core.logging_config import logger

SIGNAL_WEIGHTS = {
    "spf_fail": 15,
    "dkim_fail": 15,
    "dmarc_fail": 15,
    "from_return_path_mismatch": 10,
    "url_malicious_vt": 20,
    "domain_malicious_vt": 15,
    "attachment_hash_malicious": 25,
    "suspicious_ip": 10,
    "lookalike_domain": 10,
}

def calculate_signals(auth, iocs, enrichments, url_analyses, domain_analyses):
    """Calculate deterministic risk signals from evidence."""
    signals = []

    # SPF fail
    if auth.get("spf_result") in ("fail", "softfail"):
        signals.append({"name": "SPF failure", "weight": SIGNAL_WEIGHTS["spf_fail"], "evidence": f"SPF result: {auth.get('spf_result', 'unknown')}"})
    # DKIM fail
    if auth.get("dkim_result") in ("fail", "none"):
        signals.append({"name": "DKIM failure", "weight": SIGNAL_WEIGHTS["dkim_fail"], "evidence": f"DKIM result: {auth.get('dkim_result', 'unknown')}"})
    # DMARC fail
    if auth.get("dmarc_result") in ("fail", "none"):
        signals.append({"name": "DMARC failure", "weight": SIGNAL_WEIGHTS["dmarc_fail"], "evidence": f"DMARC result: {auth.get('dmarc_result', 'unknown')}"})
    # From vs Return-Path mismatch
    if auth.get("domain_mismatch"):
        signals.append({"name": "From/Return-Path domain mismatch", "weight": SIGNAL_WEIGHTS["from_return_path_mismatch"], "evidence": f"From domain: {auth.get('from_domain')}, Return-Path domain: {auth.get('return_path_domain')}"})

    # VirusTotal results
    for ti in enrichments.get("threat_intel", []):
        if ti.get("status") == "malicious":
            if ti.get("ioc_type") == "url":
                signals.append({"name": "Malicious URL (VirusTotal)", "weight": SIGNAL_WEIGHTS["url_malicious_vt"], "evidence": f"URL: {ti.get('ioc_value')}, detections: {ti.get('detection_count', 0)}"})
            elif ti.get("ioc_type") == "domain":
                signals.append({"name": "Malicious domain (VirusTotal)", "weight": SIGNAL_WEIGHTS["domain_malicious_vt"], "evidence": f"Domain: {ti.get('ioc_value')}, detections: {ti.get('detection_count', 0)}"})
            elif ti.get("ioc_type", "").startswith("hash"):
                signals.append({"name": "Malicious attachment hash (VirusTotal)", "weight": SIGNAL_WEIGHTS["attachment_hash_malicious"], "evidence": f"Hash: {ti.get('ioc_value')}, detections: {ti.get('detection_count', 0)}"})

    # Suspicious IP (hosting/datacenter)
    for ip_enrich in enrichments.get("ip_geolocations", []):
        if ip_enrich.get("is_hosting") or ip_enrich.get("is_datacenter"):
            signals.append({"name": "Suspicious IP (hosting/datacenter)", "weight": SIGNAL_WEIGHTS["suspicious_ip"], "evidence": f"IP: {ip_enrich.get('ip_address')}, ISP: {ip_enrich.get('isp')}"})

    # Lookalike domain
    for da in domain_analyses:
        if da.get("is_lookalike"):
            signals.append({"name": "Lookalike/typosquatting domain", "weight": SIGNAL_WEIGHTS["lookalike_domain"], "evidence": f"Domain: {da.get('domain')}, brand: {da.get('impersonated_brand')}"})

    return signals


def calculate_score(signals):
    """Calculate deterministic risk score from signals."""
    score = sum(s["weight"] for s in signals)
    score = min(score, 100)
    if score >= 80:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"
    return score, level


def apply_ai_social_engineering(deterministic_score, ai_analysis):
    """Apply AI social engineering signal to deterministic score."""
    ai_se_score = 0
    if ai_analysis and ai_analysis.get("social_engineering_detected"):
        confidence = ai_analysis.get("social_engineering_confidence", 0.0)
        ai_se_score = round(confidence * 15)
    final_score = min(deterministic_score + ai_se_score, 100)
    if final_score >= 80:
        level = "CRITICAL"
    elif final_score >= 60:
        level = "HIGH"
    elif final_score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"
    return final_score, level, ai_se_score
