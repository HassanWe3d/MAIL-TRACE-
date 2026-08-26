"""PDF report API route."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Investigation, EmailMetadata, AuthenticationResult, IOC, IPEnrichment, ThreatIntelResult, AIAnalysis, RiskScoreDetail
from app.services.report_generator import generate_report

router = APIRouter(prefix="/api/investigations", tags=["reports"])


@router.get("/{inv_id}/report")
async def get_report(inv_id: str, db: AsyncSession = Depends(get_db)):
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
    auth_r = await db.execute(select(AuthenticationResult).where(AuthenticationResult.investigation_id == uid))
    auth = auth_r.scalar_one_or_none()
    iocs_r = await db.execute(select(IOC).where(IOC.investigation_id == uid))
    iocs = iocs_r.scalars().all()
    ai_r = await db.execute(select(AIAnalysis).where(AIAnalysis.investigation_id == uid))
    ai = ai_r.scalar_one_or_none()
    risk_r = await db.execute(select(RiskScoreDetail).where(RiskScoreDetail.investigation_id == uid))
    risk = risk_r.scalar_one_or_none()

    data = {
        "filename": inv.filename, "risk_score": inv.risk_score, "risk_level": inv.risk_level, "classification": inv.classification,
        "email_metadata": {"from_address": meta.from_address, "to_addresses": meta.to_addresses, "subject": meta.subject, "date": meta.date, "reply_to": meta.reply_to, "return_path": meta.return_path} if meta else {},
        "authentication_results": {"spf_result": auth.spf_result, "dkim_result": auth.dkim_result, "dmarc_result": auth.dmarc_result, "domain_mismatch": auth.domain_mismatch} if auth else {},
        "iocs": [{"ioc_type": i.ioc_type, "value": i.value, "source": i.source, "risk": i.risk} for i in iocs],
        "ai_analysis": {"classification": ai.classification, "confidence": ai.confidence, "severity": ai.severity, "summary": ai.summary, "reasoning": ai.reasoning, "recommended_actions": ai.recommended_actions} if ai else {},
        "risk_score_detail": {"final_score": risk.final_score, "risk_level": risk.risk_level, "deterministic_score": risk.deterministic_score, "ai_social_engineering_score": risk.ai_social_engineering_score, "signals": risk.signals} if risk else {},
    }

    pdf_buffer = generate_report(data)
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=report_{inv_id}.pdf"})
