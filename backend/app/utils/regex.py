"""Regex patterns for IOC extraction."""
import re

# IPv4 pattern
IPV4_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}"
    r"(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)

# URL pattern
URL_PATTERN = re.compile(
    r"https?://[^\s<>\"'\)\]\>]+",
    re.IGNORECASE,
)

# Email pattern
EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
)

# Domain pattern
DOMAIN_PATTERN = re.compile(
    r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)"
    r"+[a-zA-Z]{2,}\b"
)

# Hash patterns
MD5_PATTERN = re.compile(r"\b[0-9a-fA-F]{32}\b")
SHA1_PATTERN = re.compile(r"\b[0-9a-fA-F]{40}\b")
SHA256_PATTERN = re.compile(r"\b[0-9a-fA-F]{64}\b")
