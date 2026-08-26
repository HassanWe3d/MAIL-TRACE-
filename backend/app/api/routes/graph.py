"""Graph API route."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Investigation, AuthenticationResult, IOC, IPEnrichment, ThreatIntelResult

router = APIRouter(prefix="/api/investigations", tags=["graph"])


@router.get("/{inv_id}/graph")
async def get_graph(inv_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = uuid.UUID(inv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid investigation ID")
    result = await db.execute(select(Investigation).where(Investigation.id == uid))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    auth_r = await db.execute(select(AuthenticationResult).where(AuthenticationResult.investigation_id == uid))
    auth = auth_r.scalar_one_or_none()
    iocs_r = await db.execute(select(IOC).where(IOC.investigation_id == uid))
    iocs = iocs_r.scalars().all()
    ip_r = await db.execute(select(IPEnrichment).where(IPEnrichment.investigation_id == uid))
    ips = ip_r.scalars().all()
    ti_r = await db.execute(select(ThreatIntelResult).where(ThreatIntelResult.investigation_id == uid))
    ti = ti_r.scalars().all()

    nodes, edges, seen = [], [], set()

    def add_node(nid, ntype, label, risk="unknown", data=None):
        if nid not in seen:
            seen.add(nid)
            nodes.append({"id": nid, "type": ntype, "label": label, "risk": risk, "data": data or {}})

    def add_edge(src, tgt, rel):
        edges.append({"id": f"{src}-{tgt}-{rel}", "source": src, "target": tgt, "relationship": rel})

    if auth:
        sender = auth.from_address or ""
        if sender:
            add_node(f"sender:{sender}", "sender", sender, "high" if auth.domain_mismatch else "unknown", {"email": sender})
            fd = auth.from_domain or ""
            if fd:
                add_node(f"domain:{fd}", "domain", fd, "unknown", {"domain": fd})
                add_edge(f"sender:{sender}", f"domain:{fd}", "uses")
        rp = auth.return_path or ""
        rpd = auth.return_path_domain or ""
        if rp and rp != sender and rpd:
            add_node(f"domain:{rpd}", "domain", rpd, "suspicious" if auth.domain_mismatch else "unknown", {"domain": rpd})
            add_edge(f"sender:{sender}", f"domain:{rpd}", "return_path_mismatch" if auth.domain_mismatch else "uses")

    for ioc in iocs:
        if ioc.ioc_type == "ip":
            add_node(f"ip:{ioc.value}", "ip", ioc.value, "unknown", {"ip": ioc.value})
        elif ioc.ioc_type == "domain":
            add_node(f"domain:{ioc.value}", "domain", ioc.value, "unknown", {"domain": ioc.value})
        elif ioc.ioc_type == "url":
            add_node(f"url:{ioc.value}", "url", ioc.value[:60], "unknown", {"url": ioc.value})

    for e in ips:
        ip_id = f"ip:{e.ip_address}"
        if e.asn:
            add_node(f"asn:{e.asn}", "asn", e.asn, "unknown", {"asn": e.asn, "org": e.org})
            add_edge(ip_id, f"asn:{e.asn}", "belongs_to")
        if e.country:
            add_node(f"country:{e.country}", "country", e.country, "unknown", {"country": e.country})
            add_edge(ip_id, f"country:{e.country}", "located_in")

    for t in ti:
        if t.status == "malicious":
            tid = f"{t.ioc_type}:{t.ioc_value}"
            for n in nodes:
                if n["id"] == tid:
                    n["risk"] = "malicious"

    return {"success": True, "data": {"nodes": nodes, "edges": edges}}
