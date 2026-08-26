"""Investigation API routes."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Investigation, EmailMetadata, EmailHeader, ReceivedHop, AuthenticationResult, IOC, IPEnrichment, ThreatIntelResult, Attachment, AIAnalysis, RiskScoreDetail
from app.services.investigation_service import run_investigation
from app.core.logging_config import logger

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


@router.post("/upload")
async def upload_eml(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".eml"):
        raise HTTPException(status_code=400, detail="Only .eml files are accepted")
    eml_bytes = await file.read()
    if len(eml_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    result = await run_investigation(db, eml_bytes, file.filename)
    return {"success": True, "data": result}


@router.get("")
async def list_investigations(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    count_q = select(func.count()).select_from(Investigation)
    total = (await db.execute(count_q)).scalar() or 0
    q = select(Investigation).order_by(Investigation.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(q)
    invs = result.scalars().all()
    items = [{"id": str(i.id), "created_at": i.created_at.isoformat() if i.created_at else None, "filename": i.filename, "status": i.status, "sender": i.sender, "subject": i.subject, "risk_score": i.risk_score, "risk_level": i.risk_level, "classification": i.classification, "ai_confidence": i.ai_confidence} for i in invs]
    return {"success": True, "data": {"items": items, "total": total, "page": page, "page_size": page_size, "pages": (total + page_size - 1) // page_size}}


@router.get("/{inv_id}")
async def get_investigation(inv_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = uuid.UUID(inv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid investigation ID")
    result = await db.execute(select(Investigation).where(Investigation.id == uid))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    meta_r = await db.execute(select(EmailMetadata).where(EmailMetadata.investigation_id == uid))
    meta = meta_r.scalar_one_or_none()
    headers_r = await db.execute(select(EmailHeader).where(EmailHeader.investigation_id == uid))
    headers = headers_r.scalars().all()
    hops_r = await db.execute(select(ReceivedHop).where(ReceivedHop.investigation_id == uid).order_by(ReceivedHop.hop_order))
    hops = hops_r.scalars().all()
    auth_r = await db.execute(select(AuthenticationResult).where(AuthenticationResult.investigation_id == uid))
    auth = auth_r.scalar_one_or_none()
    iocs_r = await db.execute(select(IOC).where(IOC.investigation_id == uid))
    iocs = iocs_r.scalars().all()
    ip_r = await db.execute(select(IPEnrichment).where(IPEnrichment.investigation_id == uid))
    ips = ip_r.scalars().all()
    ti_r = await db.execute(select(ThreatIntelResult).where(ThreatIntelResult.investigation_id == uid))
    ti = ti_r.scalars().all()
    att_r = await db.execute(select(Attachment).where(Attachment.investigation_id == uid))
    atts = att_r.scalars().all()
    ai_r = await db.execute(select(AIAnalysis).where(AIAnalysis.investigation_id == uid))
    ai = ai_r.scalar_one_or_none()
    risk_r = await db.execute(select(RiskScoreDetail).where(RiskScoreDetail.investigation_id == uid))
    risk = risk_r.scalar_one_or_none()

    return {"success": True, "data": {
        "id": str(inv.id), "created_at": inv.created_at.isoformat() if inv.created_at else None, "filename": inv.filename, "status": inv.status, "sender": inv.sender, "subject": inv.subject, "date": inv.date.isoformat() if inv.date else None, "risk_score": inv.risk_score, "risk_level": inv.risk_level, "classification": inv.classification, "ai_confidence": inv.ai_confidence,
        "email_metadata": {"from_address": meta.from_address if meta else None, "to_addresses": meta.to_addresses if meta else None, "cc_addresses": meta.cc_addresses if meta else None, "subject": meta.subject if meta else None, "date": meta.date.isoformat() if meta and meta.date else None, "reply_to": meta.reply_to if meta else None, "return_path": meta.return_path if meta else None, "message_id": meta.message_id if meta else None} if meta else None,
        "headers": [{"name": h.name, "value": h.value} for h in headers],
        "received_hops": [{"hop_order": h.hop_order, "raw_header": h.raw_header, "source_ip": h.source_ip, "destination_ip": h.destination_ip, "source_hostname": h.source_hostname, "destination_hostname": h.destination_hostname, "timestamp": h.timestamp.isoformat() if h.timestamp else None} for h in hops],
        "authentication_results": {"from_address": auth.from_address, "from_domain": auth.from_domain, "return_path": auth.return_path, "return_path_domain": auth.return_path_domain, "domain_mismatch": auth.domain_mismatch, "reply_to": auth.reply_to, "reply_to_mismatch": auth.reply_to_mismatch, "spf_result": auth.spf_result, "spf_domain": auth.spf_domain, "spf_reason": auth.spf_reason, "dkim_result": auth.dkim_result, "dkim_domain": auth.dkim_domain, "dkim_selector": auth.dkim_selector, "dmarc_result": auth.dmarc_result, "dmarc_policy": auth.dmarc_policy, "dmarc_reason": auth.dmarc_reason} if auth else None,
        "iocs": [{"ioc_type": i.ioc_type, "value": i.value, "source": i.source, "risk": i.risk, "confidence": i.confidence} for i in iocs],
        "ip_enrichments": [{"ip_address": e.ip_address, "country": e.country, "region": e.region, "city": e.city, "isp": e.isp, "asn": e.asn, "org": e.org, "is_hosting": e.is_hosting, "is_datacenter": e.is_datacenter} for e in ips],
        "threat_intel_results": [{"ioc_type": t.ioc_type, "ioc_value": t.ioc_value, "source": t.source, "status": t.status, "detection_count": t.detection_count, "total_engines": t.total_engines, "permalink": t.permalink} for t in ti],
        "attachments": [{"filename": a.filename, "mime_type": a.mime_type, "size": a.size, "md5": a.md5, "sha1": a.sha1, "sha256": a.sha256} for a in atts],
        "ai_analysis": {"classification": ai.classification, "confidence": ai.confidence, "severity": ai.severity, "summary": ai.summary, "reasoning": ai.reasoning, "threat_categories": ai.threat_categories, "social_engineering_detected": ai.social_engineering_detected, "social_engineering_confidence": ai.social_engineering_confidence, "recommended_actions": ai.recommended_actions, "limitations": ai.limitations, "error": ai.error} if ai else None,
        "risk_score_detail": {"final_score": risk.final_score, "risk_level": risk.risk_level, "signals": risk.signals, "deterministic_score": risk.deterministic_score, "ai_social_engineering_score": risk.ai_social_engineering_score} if risk else None,
    }}
