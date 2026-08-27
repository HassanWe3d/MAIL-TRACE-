"""Investigation API routes."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db, async_session_factory
from app.db.models import Investigation, EmailMetadata, EmailHeader, ReceivedHop, AuthenticationResult, IOC, IPEnrichment, ThreatIntelResult, Attachment, AIAnalysis, RiskScoreDetail
from app.services.investigation_service import run_investigation
from app.core.logging_config import logger
from app.core.config import get_settings
from app.core.exceptions import FileTooLargeError, InvalidFileTypeError

settings = get_settings()
router = APIRouter(prefix="/api/investigations", tags=["investigations"])


async def _run_background(inv_id: uuid.UUID, eml_bytes: bytes, filename: str):
    """Run investigation in background with its own DB session."""
    async with async_session_factory() as db:
        try:
            await run_investigation(db, eml_bytes, filename, inv_id)
            await db.commit()
        except Exception as e:
            logger.error("Background investigation %s failed: %s", inv_id, e)
            await db.rollback()
            # Mark investigation as failed with error message
            try:
                async with async_session_factory() as fail_db:
                    result = await fail_db.execute(select(Investigation).where(Investigation.id == inv_id))
                    inv = result.scalar_one_or_none()
                    if inv:
                        inv.status = "failed"
                        inv.error_message = str(e)[:500]
                        await fail_db.commit()
            except Exception:
                logger.error("Could not mark investigation %s as failed", inv_id)


@router.post("/upload")
async def upload_eml(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".eml"):
        raise InvalidFileTypeError(file.filename or "unknown")

    # Read into memory with size check
    eml_bytes = await file.read()
    size_mb = len(eml_bytes) / (1024 * 1024)
    if len(eml_bytes) > settings.max_upload_bytes:
        raise FileTooLargeError(size_mb, settings.MAX_UPLOAD_SIZE_MB)

    if len(eml_bytes) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Create investigation in 'uploading' state and return immediately
    inv_id = uuid.uuid4()
    inv = Investigation(
        id=inv_id,
        filename=file.filename,
        status="processing",
        file_size=len(eml_bytes),
        created_at=datetime.utcnow(),
    )
    db.add(inv)
    await db.flush()
    await db.commit()

    # Schedule background processing
    background_tasks.add_task(_run_background, inv_id, eml_bytes, file.filename)

    return {
        "success": True,
        "data": {
            "id": str(inv_id),
            "status": "processing",
            "filename": file.filename,
            "file_size": len(eml_bytes),
        },
    }


@router.get("")
async def list_investigations(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    count_q = select(func.count()).select_from(Investigation)
    total = (await db.execute(count_q)).scalar() or 0
    q = select(Investigation).order_by(Investigation.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(q)
    invs = result.scalars().all()
    items = [{"id": str(i.id), "created_at": i.created_at.isoformat() if i.created_at else None, "filename": i.filename, "status": i.status, "sender": i.sender, "subject": i.subject, "risk_score": i.risk_score, "risk_level": i.risk_level, "classification": i.classification, "ai_confidence": i.ai_confidence} for i in invs]
    # Auto-mark stale investigations stuck in 'processing' for > 5 minutes
    from datetime import datetime, timedelta, timezone
    stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    stale_q = select(Investigation).where(
        Investigation.status == 'processing',
        Investigation.created_at < stale_cutoff,
    )
    stale_result = await db.execute(stale_q)
    stale_invs = stale_result.scalars().all()
    for stale_inv in stale_invs:
        stale_inv.status = 'failed'
        stale_inv.error_message = 'Investigation timed out. The server may have restarted during processing.'
    if stale_invs:
        await db.flush()

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

    # Auto-mark stale investigation stuck in 'processing' for > 5 minutes
    from datetime import datetime, timedelta, timezone
    if inv.status == 'processing' and inv.created_at:
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        if inv.created_at.replace(tzinfo=timezone.utc) < stale_cutoff if inv.created_at.tzinfo is None else inv.created_at < stale_cutoff:
            inv.status = 'failed'
            inv.error_message = 'Investigation timed out. The server may have restarted during processing.'
            await db.flush()

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
        "id": str(inv.id), "created_at": inv.created_at.isoformat() if inv.created_at else None, "filename": inv.filename, "status": inv.status, "sender": inv.sender, "subject": inv.subject, "date": inv.date.isoformat() if inv.date else None, "risk_score": inv.risk_score, "risk_level": inv.risk_level, "classification": inv.classification, "ai_confidence": inv.ai_confidence, "error_message": getattr(inv, 'error_message', None),
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
