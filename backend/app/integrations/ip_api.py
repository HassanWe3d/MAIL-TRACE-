"""ip-api.com geolocation integration — optimized with shared session."""
import aiohttp
from app.core.logging_config import logger
from app.core.config import get_settings

settings = get_settings()
IP_API_URL = "http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,isp,as,org,hosting,query"
_connector: aiohttp.TCPConnector | None = None
_session: aiohttp.ClientSession | None = None


async def _get_session() -> aiohttp.ClientSession:
    global _connector, _session
    if _session is None or _session.closed:
        _connector = aiohttp.TCPConnector(limit=5, limit_per_host=5, force_close=False)
        _session = aiohttp.ClientSession(connector=_connector)
    return _session


async def geolocate_ip(ip):
    url = IP_API_URL.format(ip=ip)
    try:
        session = await _get_session()
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data.get("status") == "success":
                    return {"ip_address": ip, "country": data.get("country"), "region": data.get("regionName"), "city": data.get("city"), "isp": data.get("isp"), "asn": data.get("as", "").split(" ")[0] if data.get("as") else None, "org": data.get("org"), "is_hosting": data.get("hosting", False), "is_datacenter": data.get("hosting", False), "status": "success"}
                return {"ip_address": ip, "status": "error", "error": data.get("message", "Unknown error")}
            return {"ip_address": ip, "status": "error", "error": f"HTTP {resp.status}"}
    except Exception as e:
        logger.error("ip-api lookup failed for %s: %s", ip, e)
        return {"ip_address": ip, "status": "error", "error": str(e)}
