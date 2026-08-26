"""VirusTotal Public API integration — optimized with shared session."""
import asyncio
import base64
import aiohttp
from app.core.logging_config import logger
from app.core.config import get_settings

settings = get_settings()
VT_BASE = "https://www.virustotal.com/api/v3"
_semaphore = asyncio.Semaphore(settings.VT_CONCURRENT_REQUESTS)
_connector: aiohttp.TCPConnector | None = None
_session: aiohttp.ClientSession | None = None


async def _get_session() -> aiohttp.ClientSession:
    """Get or create a shared aiohttp session for all VT requests."""
    global _connector, _session
    if _session is None or _session.closed:
        _connector = aiohttp.TCPConnector(limit=4, limit_per_host=2, force_close=False)
        _session = aiohttp.ClientSession(connector=_connector)
    return _session


async def _vt_request(endpoint, api_key):
    async with _semaphore:
        headers = {"x-apikey": api_key}
        try:
            session = await _get_session()
            async with session.get(f"{VT_BASE}{endpoint}", headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    return await resp.json()
                elif resp.status == 404:
                    return None
                logger.warning("VT API %s returned %d", endpoint, resp.status)
                return None
        except Exception as e:
            logger.error("VT API error: %s", e)
            return None


def _parse_vt_result(data):
    if not data:
        return {"status": "clean", "detection_count": 0, "total_engines": 0}
    attrs = data.get("data", {}).get("attributes", {})
    stats = attrs.get("last_analysis_stats", {})
    malicious = stats.get("malicious", 0) + stats.get("suspicious", 0)
    total = sum(stats.values())
    return {"status": "malicious" if malicious > 0 else "clean", "detection_count": malicious, "total_engines": total, "permalink": data.get("data", {}).get("links", {}).get("self")}


async def check_url(url):
    if not settings.VIRUSTOTAL_API_KEY:
        return {"status": "unavailable", "error": "No VirusTotal API key configured"}
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    data = await _vt_request(f"/urls/{url_id}", settings.VIRUSTOTAL_API_KEY)
    return _parse_vt_result(data)


async def check_domain(domain):
    if not settings.VIRUSTOTAL_API_KEY:
        return {"status": "unavailable", "error": "No VirusTotal API key configured"}
    data = await _vt_request(f"/domains/{domain}", settings.VIRUSTOTAL_API_KEY)
    return _parse_vt_result(data)


async def check_hash(hash_val):
    if not settings.VIRUSTOTAL_API_KEY:
        return {"status": "unavailable", "error": "No VirusTotal API key configured"}
    data = await _vt_request(f"/files/{hash_val}", settings.VIRUSTOTAL_API_KEY)
    return _parse_vt_result(data)
