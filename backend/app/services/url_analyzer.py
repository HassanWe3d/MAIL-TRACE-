"""URL analysis and suspicious pattern detection."""
from urllib.parse import urlparse
import re
from app.core.logging_config import logger

SUSPICIOUS_PATHS = {"/login", "/signin", "/verify", "/account", "/password", "/security", "/update", "/confirm", "/authenticate", "/banking", "/secure", "/portal", "/credential", "/wallet", "/paypal"}
SHORTENER_DOMAINS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "buff.ly", "ow.ly", "rb.gy", "cutt.ly", "shorturl.at"}


def analyze_url(url):
    result = {"url": url, "normalized": url, "domain": "", "protocol": "", "hostname": "", "path": "", "is_shortened": False, "suspicious_paths": [], "suspicious_patterns": []}
    try:
        parsed = urlparse(url)
        result["protocol"] = parsed.scheme
        result["hostname"] = parsed.hostname or ""
        result["domain"] = result["hostname"]
        result["path"] = parsed.path
        result["normalized"] = url.lower().strip()
        if result["hostname"] in SHORTENER_DOMAINS:
            result["is_shortened"] = True
            result["suspicious_patterns"].append("URL shortener detected")
        path_lower = parsed.path.lower()
        for sp in SUSPICIOUS_PATHS:
            if sp in path_lower:
                result["suspicious_paths"].append(sp)
        if result["hostname"] and result["hostname"].replace(".", "").isdigit():
            result["suspicious_patterns"].append("IP address in URL hostname")
        if "@" in url:
            result["suspicious_patterns"].append("Email address in URL")
        if url.count("//") > 1:
            result["suspicious_patterns"].append("Multiple protocol separators")
        if len(result["hostname"]) > 50:
            result["suspicious_patterns"].append("Unusually long hostname")
        if result["hostname"].count("-") > 3:
            result["suspicious_patterns"].append("Many hyphens in hostname")
    except Exception as e:
        result["suspicious_patterns"].append("URL parsing error: " + str(e))
    return result
