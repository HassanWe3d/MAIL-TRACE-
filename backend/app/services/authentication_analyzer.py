"""SPF / DKIM / DMARC authentication analysis."""
import re
from typing import Optional

from app.core.logging_config import logger
from app.services.email_parser import ParsedEmail


def _extract_domain(email_addr: str) -> str:
    """Extract domain from email address."""
    if "@" in email_addr:
        return email_addr.split("@")[-1].strip().strip("<>")
    return ""


def _parse_dkim_selector(dkim_header: str) -> tuple[str, str]:
    """Extract domain and selector from DKIM-Signature header."""
    domain = ""
    selector = ""
    d_match = re.search(r"\bd=([^;\s]+)", dkim_header)
    if d_match:
        domain = d_match.group(1).strip()
    s_match = re.search(r"\bs=([^;\s]+)", dkim_header)
    if s_match:
        selector = s_match.group(1).strip()
    return domain, selector


def _parse_auth_results(auth_results: str) -> dict:
    """Parse Authentication-Results header for SPF, DKIM, DMARC."""
    results = {"spf": None, "dkim": None, "dmarc": None}
    if not auth_results:
        return results

    spf_match = re.search(r"\bspf=([\w]+)", auth_results, re.IGNORECASE)
    if spf_match:
        results["spf"] = spf_match.group(1).lower()

    dkim_match = re.search(r"\bdkim=([\w]+)", auth_results, re.IGNORECASE)
    if dkim_match:
        results["dkim"] = dkim_match.group(1).lower()

    dmarc_match = re.search(r"\bdmarc=([\w]+)", auth_results, re.IGNORECASE)
    if dmarc_match:
        results["dmarc"] = dmarc_match.group(1).lower()

    return results


def _parse_received_spf(received_spf: str) -> dict:
    """Parse Received-SPF header."""
    result = {"result": "unknown", "domain": "", "reason": ""}
    if not received_spf:
        return result

    parts = received_spf.split()
    if parts:
        result["result"] = parts[0].lower()

    domain_match = re.search(r"domain of (\S+)", received_spf)
    if domain_match:
        result["domain"] = domain_match.group(1)

    reason_match = re.search(r"\((.+)\)", received_spf)
    if reason_match:
        result["reason"] = reason_match.group(1)[:200]

    return result


def analyze_authentication(parsed: ParsedEmail) -> dict:
    """Analyze email authentication: From/Return-Path, SPF, DKIM, DMARC."""
    logger.info("Analyzing email authentication")

    from_domain = _extract_domain(parsed.from_address)
    return_path_domain = _extract_domain(parsed.return_path)
    reply_to_domain = _extract_domain(parsed.reply_to)

    domain_mismatch = bool(
        from_domain and return_path_domain and from_domain != return_path_domain
    )
    reply_to_mismatch = bool(
        from_domain and reply_to_domain and from_domain != reply_to_domain
    )

    auth = _parse_auth_results(parsed.auth_results)
    received_spf = _parse_received_spf(parsed.received_spf)
    dkim_domain, dkim_selector = _parse_dkim_selector(parsed.dkim_signature)

    result = {
        "from_address": parsed.from_address,
        "from_domain": from_domain,
        "return_path": parsed.return_path,
        "return_path_domain": return_path_domain,
        "domain_mismatch": domain_mismatch,
        "reply_to": parsed.reply_to,
        "reply_to_mismatch": reply_to_mismatch,
        "spf_result": auth["spf"] or received_spf["result"],
        "spf_domain": received_spf["domain"] or from_domain,
        "spf_reason": received_spf["reason"],
        "dkim_result": auth["dkim"] or "unknown",
        "dkim_domain": dkim_domain or from_domain,
        "dkim_selector": dkim_selector,
        "dkim_reason": "",
        "dmarc_result": auth["dmarc"] or "unknown",
        "dmarc_policy": "",
        "dmarc_reason": "",
        "raw_auth_results": parsed.auth_results,
    }

    logger.info(
        "Auth analysis: SPF=%s, DKIM=%s, DMARC=%s, domain_mismatch=%s",
        result["spf_result"], result["dkim_result"],
        result["dmarc_result"], result["domain_mismatch"]
    )
    return result
