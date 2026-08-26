"""Normalization utilities for cache keys and IOC values."""
from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    """Normalize a URL for consistent cache keys."""
    try:
        parsed = urlparse(url.lower().strip())
        scheme = parsed.scheme or "http"
        netloc = parsed.netloc.rstrip(".")
        path = parsed.path.rstrip("/") or "/"
        return urlunparse((scheme, netloc, path, "", "", ""))
    except Exception:
        return url.strip().lower()


def normalize_domain(domain: str) -> str:
    """Normalize a domain for consistent cache keys."""
    return domain.lower().strip().rstrip(".")


def normalize_hash(hash_val: str) -> str:
    """Normalize a hash for consistent cache keys."""
    return hash_val.lower().strip()


def normalize_ip(ip: str) -> str:
    """Normalize an IP address."""
    return ip.strip()


def make_cache_key(source: str, ioc_type: str, value: str) -> str:
    """Generate a cache key for enrichment results."""
    if ioc_type == "url":
        value = normalize_url(value)
    elif ioc_type == "domain":
        value = normalize_domain(value)
    elif ioc_type.startswith("hash"):
        value = normalize_hash(value)
    elif ioc_type == "ip":
        value = normalize_ip(value)
    return f"{source}:{ioc_type}:{value}"
