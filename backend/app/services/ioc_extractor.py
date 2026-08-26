"""IOC extraction engine."""
import re
from typing import Optional

from app.core.logging_config import logger
from app.services.email_parser import ParsedEmail
from app.utils.regex import (
    IPV4_PATTERN, URL_PATTERN, EMAIL_PATTERN,
    DOMAIN_PATTERN, MD5_PATTERN, SHA1_PATTERN, SHA256_PATTERN,
)


class IOC:
    def __init__(self, ioc_type, value, source, risk="unknown", confidence=1.0):
        self.ioc_type = ioc_type
        self.value = value
        self.source = source
        self.risk = risk
        self.confidence = confidence

    def to_dict(self):
        return {
            "ioc_type": self.ioc_type,
            "value": self.value,
            "source": self.source,
            "risk": self.risk,
            "confidence": self.confidence,
        }


STOP_WORDS = {"example.com", "localhost", "127.0.0.1", "0.0.0.0", "255.255.255.255"}


def extract_iocs(parsed):
    logger.info("Extracting IOCs from email")
    iocs = []
    seen = set()

    if parsed.from_address:
        _add_ioc(iocs, seen, IOC("email", parsed.from_address, "sender"))
    if parsed.reply_to and parsed.reply_to != parsed.from_address:
        _add_ioc(iocs, seen, IOC("email", parsed.reply_to, "sender"))
    if parsed.return_path and parsed.return_path != parsed.from_address:
        _add_ioc(iocs, seen, IOC("email", parsed.return_path, "sender"))

    for body, source in [(parsed.plain_text_body, "body_plain"), (parsed.html_body, "body_html")]:
        if not body:
            continue
        for url in URL_PATTERN.findall(body):
            _add_ioc(iocs, seen, IOC("url", url.strip(), source))
        for ip in IPV4_PATTERN.findall(body):
            if not _is_private_ip(ip):
                _add_ioc(iocs, seen, IOC("ip", ip, source))
        for domain in DOMAIN_PATTERN.findall(body):
            domain = domain.lower().rstrip(".")
            if domain not in STOP_WORDS and len(domain) > 4:
                _add_ioc(iocs, seen, IOC("domain", domain, source))

    for att in parsed.attachments:
        if att.get("sha256"):
            _add_ioc(iocs, seen, IOC("hash_sha256", att["sha256"], "attachment"))
        if att.get("sha1"):
            _add_ioc(iocs, seen, IOC("hash_sha1", att["sha1"], "attachment"))
        if att.get("md5"):
            _add_ioc(iocs, seen, IOC("hash_md5", att["md5"], "attachment"))

    logger.info("Extracted %d unique IOCs", len(iocs))
    return iocs


def _add_ioc(iocs, seen, ioc):
    key = f"{ioc.ioc_type}:{ioc.value.lower()}"
    if key not in seen:
        seen.add(key)
        iocs.append(ioc)


def _is_private_ip(ip):
    parts = ip.split(".")
    if len(parts) != 4:
        return False
    first = int(parts[0])
    if first == 10:
        return True
    if first == 172 and 16 <= int(parts[1]) <= 31:
        return True
    if first == 192 and int(parts[1]) == 168:
        return True
    if first in (127, 0):
        return True
    return False
