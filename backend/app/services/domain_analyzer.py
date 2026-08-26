"""Domain analysis for lookalike and typosquatting detection."""
import re
from app.core.logging_config import logger

KNOWN_BRANDS = {"microsoft", "google", "apple", "amazon", "facebook", "meta", "paypal", "netflix", "linkedin", "twitter", "instagram", "dropbox", "adobe", "salesforce", "zoom", "slack", "dhl", "fedex", "ups", "usps"}

def analyze_domain(domain):
    result = {"domain": domain, "normalized": domain.lower().strip(), "is_lookalike": False, "is_typosquat": False, "impersonated_brand": None, "suspicious_patterns": []}
    domain_lower = domain.lower().strip()
    base_domain = domain_lower.split(".")[0] if "." in domain_lower else domain_lower
    for brand in KNOWN_BRANDS:
        if brand in domain_lower and not domain_lower.endswith(brand + ".com"):
            result["is_lookalike"] = True
            result["impersonated_brand"] = brand
            result["suspicious_patterns"].append("Possible " + brand + " impersonation")
    parts = domain_lower.split(".")
    if len(parts) > 4:
        result["suspicious_patterns"].append("Unusually many subdomains")
    if len(domain_lower) > 40:
        result["suspicious_patterns"].append("Unusually long domain name")
    return result
