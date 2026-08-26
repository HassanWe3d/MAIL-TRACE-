"""Email header and Received chain analysis."""
import re
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

from app.core.logging_config import logger
from app.services.email_parser import ParsedEmail


@dataclass
class ReceivedHop:
    hop_order: int = 0
    raw_header: str = ""
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_hostname: Optional[str] = None
    destination_hostname: Optional[str] = None
    timestamp: Optional[datetime] = None
    server: Optional[str] = None


@dataclass
class HeaderAnalysis:
    from_address: str = ""
    return_path: str = ""
    reply_to: str = ""
    received_hops: list[ReceivedHop] = field(default_factory=list)
    all_headers: dict = field(default_factory=dict)


def analyze_headers(parsed: ParsedEmail) -> HeaderAnalysis:
    """Analyze email headers and construct delivery path."""
    logger.info("Analyzing email headers")

    analysis = HeaderAnalysis(
        from_address=parsed.from_address,
        return_path=parsed.return_path,
        reply_to=parsed.reply_to,
        all_headers=parsed.headers,
    )

    # Parse Received headers in reverse order (last received = most recent)
    received = list(reversed(parsed.received_headers))
    for i, raw_header in enumerate(received):
        hop = _parse_received_header(raw_header, i)
        analysis.received_hops.append(hop)

    logger.info("Parsed %d received hops", len(analysis.received_hops))
    return analysis


def _parse_received_header(raw: str, order: int) -> ReceivedHop:
    """Parse a single Received header."""
    hop = ReceivedHop(hop_order=order, raw_header=raw)

    # Extract IPs in brackets
    ips = re.findall(r"\[(\d+\.\d+\.\d+\.\d+)\]", raw)
    if len(ips) >= 1:
        hop.source_ip = ips[0]
    if len(ips) >= 2:
        hop.destination_ip = ips[1]

    # Extract source hostname (from "from" keyword)
    from_match = re.search(r"from\s+(\S+)", raw)
    if from_match:
        hop.source_hostname = from_match.group(1).strip(";")

    # Extract destination hostname (from "by" keyword)
    by_match = re.search(r"by\s+(\S+)", raw)
    if by_match:
        hop.destination_hostname = by_match.group(1).strip(";")

    # Extract timestamp — normalize to UTC for TIMESTAMPTZ columns
    date_match = re.search(r";\s*(.+)$", raw)
    if date_match:
        try:
            dt = datetime.strptime(
                date_match.group(1).strip(), "%a, %d %b %Y %H:%M:%S %z"
            )
            hop.timestamp = dt.astimezone(timezone.utc)
        except Exception:
            pass

    return hop
