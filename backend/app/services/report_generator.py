"""PDF forensic report generator using ReportLab."""
import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.core.logging_config import logger


def generate_report(data):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    ts = ParagraphStyle("T2", parent=styles["Title"], fontSize=16, spaceAfter=12)
    hs = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceAfter=8, textColor=HexColor("#1a1a2e"))
    bs = ParagraphStyle("B2", parent=styles["Normal"], fontSize=10, spaceAfter=6)
    ss = ParagraphStyle("S2", parent=styles["Normal"], fontSize=8, textColor=HexColor("#666666"))
    hc = HexColor("#1a1a2e")
    wc = HexColor("#ffffff")
    gc = HexColor("#cccccc")

    story.append(Paragraph("Email Threat Intelligence Report", ts))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", ss))
    story.append(Spacer(1, 12))

    story.append(Paragraph("1. Executive Summary", hs))
    story.append(Paragraph(f"Investigation: {data.get('filename', 'Unknown')}", bs))
    story.append(Paragraph(f"Risk Level: {data.get('risk_level', 'unknown')} (Score: {data.get('risk_score', 0)}/100)", bs))
    story.append(Paragraph(f"Classification: {data.get('classification', 'unknown')}", bs))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2. Email Metadata", hs))
    meta = data.get("email_metadata", {})
    if meta:
        md = [["Field", "Value"], ["From", meta.get("from_address", "N/A")], ["To", ", ".join(meta.get("to_addresses", []) or ["N/A"])], ["Subject", meta.get("subject", "N/A")], ["Date", str(meta.get("date", "N/A"))], ["Reply-To", meta.get("reply_to", "N/A")], ["Return-Path", meta.get("return_path", "N/A")]]
        t = Table(md, colWidths=[1.5*inch, 4.5*inch])
        t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), hc), ("TEXTCOLOR", (0,0), (-1,0), wc), ("FONTSIZE", (0,0), (-1,-1), 9), ("GRID", (0,0), (-1,-1), 0.5, gc)]))
        story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("3. Authentication Analysis", hs))
    auth = data.get("authentication_results", {})
    if auth:
        story.append(Paragraph(f"SPF: {auth.get('spf_result', 'unknown')} | DKIM: {auth.get('dkim_result', 'unknown')} | DMARC: {auth.get('dmarc_result', 'unknown')}", bs))
        story.append(Paragraph(f"Domain Mismatch: {'Yes' if auth.get('domain_mismatch') else 'No'}", bs))

    story.append(Paragraph("4. Indicators of Compromise", hs))
    iocs = data.get("iocs", [])
    if iocs:
        id = [["Type", "Value", "Source", "Risk"]]
        for i in iocs[:50]:
            id.append([i.get("ioc_type", ""), str(i.get("value", ""))[:60], i.get("source", ""), i.get("risk", "")])
        t = Table(id, colWidths=[1*inch, 3*inch, 1.2*inch, 1*inch])
        t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), hc), ("TEXTCOLOR", (0,0), (-1,0), wc), ("FONTSIZE", (0,0), (-1,-1), 8), ("GRID", (0,0), (-1,-1), 0.5, gc)]))
        story.append(t)

    story.append(Paragraph("5. Risk Score", hs))
    risk = data.get("risk_score_detail", {})
    if risk:
        story.append(Paragraph(f"Final: {risk.get('final_score', 0)} ({risk.get('risk_level', '')}) | Deterministic: {risk.get('deterministic_score', 0)} | AI SE: +{risk.get('ai_social_engineering_score', 0)}", bs))
        for sig in (risk.get("signals") or []):
            story.append(Paragraph(f"  - {sig.get('name', '')}: +{sig.get('weight', 0)}", ss))

    story.append(Paragraph("6. AI Assessment", hs))
    ai = data.get("ai_analysis", {})
    if ai:
        story.append(Paragraph(f"Classification: {ai.get('classification', 'unknown')} (confidence: {ai.get('confidence', 0)})", bs))
        story.append(Paragraph(f"Severity: {ai.get('severity', 'unknown')}", bs))
        if ai.get("summary"):
            story.append(Paragraph(f"Summary: {ai['summary']}", bs))
        for r in (ai.get("reasoning") or []):
            story.append(Paragraph(f"  - {r.get('evidence', '')}: {r.get('impact', '')}", ss))
        for rec in (ai.get("recommended_actions") or []):
            story.append(Paragraph(f"  - {rec}", ss))

    story.append(Paragraph("7. Limitations", hs))
    story.append(Paragraph("IP geolocation is approximate. Attachments were not executed. URLs were not visited.", bs))

    doc.build(story)
    buf.seek(0)
    return buf
