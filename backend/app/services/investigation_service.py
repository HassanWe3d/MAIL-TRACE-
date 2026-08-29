"""Central investigation pipeline orchestrator — optimized."""
import uuid, asyncio, time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging_config import logger
from app.db.models import Investigation, EmailMetadata, EmailHeader, ReceivedHop, AuthenticationResult, IOC as IOCModel, IPEnrichment, ThreatIntelResult, Attachment, AIAnalysis, RiskScoreDetail
from app.services.email_parser import parse_email
from app.services.header_analyzer import analyze_headers
from app.services.authentication_analyzer import analyze_authentication
from app.services.ioc_extractor import extract_iocs
from app.services.url_analyzer import analyze_url
from app.services.domain_analyzer import analyze_domain
from app.services.risk_engine import calculate_signals, calculate_score, apply_ai_social_engineering
from app.integrations.ip_api import geolocate_ip
from app.integrations.virustotal import check_url, check_domain, check_hash
from app.integrations.ai_provider import classify_with_claude
from app.services.enrichment_cache import get_cached, set_cached

# Private/reserved IP ranges — skip geolocation for these
_PRIVATE_PREFIXES = ('10.', '127.', '169.254.', '192.168.')
_PRIVATE_RANGES = [(172, 16, 172, 31)]


def _is_private_ip(ip: str) -> bool:
    """Check if an IP is in a private/reserved range."""
    if ip.startswith(_PRIVATE_PREFIXES):
        return True
    parts = ip.split('.')
    if len(parts) == 4:
        try:
            a, b = int(parts[0]), int(parts[1])
            return a == 172 and 16 <= b <= 31
        except ValueError:
            pass
    return False


async def run_investigation(db, eml_bytes, filename, inv_id=None):
    inv_id = inv_id or uuid.uuid4()
    t_start = time.perf_counter()
    logger.info("[PERF] Starting investigation %s for %s", inv_id, filename)

    # If inv_id was provided, the investigation was already created by the upload endpoint.
    # Fetch it; otherwise create a new one.
    if inv_id is not None:
        result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
        inv = result.scalar_one_or_none()
        if inv is None:
            inv = Investigation(id=inv_id, filename=filename, status="processing", file_size=len(eml_bytes))
            db.add(inv)
            await db.flush()
    else:
        inv = Investigation(id=inv_id, filename=filename, status="processing", file_size=len(eml_bytes))
        db.add(inv)
        await db.flush()
    try:
        # ── Phase 1: Local analysis (fast, synchronous) ──
        t0 = time.perf_counter()
        parsed = parse_email(eml_bytes)
        db.add(EmailMetadata(investigation_id=inv_id, from_address=parsed.from_address, to_addresses=parsed.to_addresses, cc_addresses=parsed.cc_addresses, subject=parsed.subject, date=parsed.date, reply_to=parsed.reply_to, return_path=parsed.return_path, message_id=parsed.message_id, mime_version=parsed.mime_version, content_type=parsed.content_type, plain_text_body=(parsed.plain_text_body[:10000] if parsed.plain_text_body else None), html_body=None))
        for name, value in parsed.all_headers[:200]:
            db.add(EmailHeader(investigation_id=inv_id, name=name, value=str(value)[:2000]))
        header_analysis = analyze_headers(parsed)
        for hop in header_analysis.received_hops:
            db.add(ReceivedHop(investigation_id=inv_id, hop_order=hop.hop_order, raw_header=(hop.raw_header[:2000] if hop.raw_header else None), source_ip=hop.source_ip, destination_ip=hop.destination_ip, source_hostname=hop.source_hostname, destination_hostname=hop.destination_hostname, timestamp=hop.timestamp))
        auth = analyze_authentication(parsed)
        db.add(AuthenticationResult(investigation_id=inv_id, from_address=auth["from_address"], from_domain=auth["from_domain"], return_path=auth["return_path"], return_path_domain=auth["return_path_domain"], domain_mismatch=auth["domain_mismatch"], reply_to=auth["reply_to"], reply_to_mismatch=auth["reply_to_mismatch"], spf_result=auth["spf_result"], spf_domain=auth["spf_domain"], spf_reason=auth["spf_reason"], dkim_result=auth["dkim_result"], dkim_domain=auth["dkim_domain"], dkim_selector=auth["dkim_selector"], dkim_reason=auth["dkim_reason"], dmarc_result=auth["dmarc_result"], dmarc_policy=auth["dmarc_policy"], dmarc_reason=auth["dmarc_reason"], raw_auth_results=(auth["raw_auth_results"][:2000] if auth["raw_auth_results"] else None)))
        iocs = extract_iocs(parsed)
        for ioc in iocs:
            db.add(IOCModel(investigation_id=inv_id, ioc_type=ioc.ioc_type, value=ioc.value[:2000], source=ioc.source, risk=ioc.risk, confidence=ioc.confidence))
        for att in parsed.attachments:
            db.add(Attachment(investigation_id=inv_id, filename=att.get("filename"), mime_type=att.get("mime_type"), size=att.get("size"), md5=att.get("md5"), sha1=att.get("sha1"), sha256=att.get("sha256")))
        logger.info("[PERF] Local analysis: %.0fms", (time.perf_counter() - t0) * 1000)

        # ── Phase 2: Classify IOCs for enrichment ──
        t0 = time.perf_counter()
        enrichments = {"ip_geolocations": [], "threat_intel": []}
        url_analyses, domain_analyses = [], []
        ips, urls_list, domains, hashes = set(), [], set(), []
        for ioc in iocs:
            if ioc.ioc_type == "ip":
                if not _is_private_ip(ioc.value):
                    ips.add(ioc.value)
            elif ioc.ioc_type == "url":
                urls_list.append(ioc.value)
                ua = analyze_url(ioc.value)
                url_analyses.append(ua)
                if ua.get("domain"):
                    domains.add(ua["domain"])
            elif ioc.ioc_type == "domain":
                domains.add(ioc.value)
                domain_analyses.append(analyze_domain(ioc.value))
            elif ioc.ioc_type.startswith("hash"):
                hashes.append((ioc.ioc_type, ioc.value))

        # Deduplicate URLs and domains
        urls_dedup = list(dict.fromkeys(urls_list))[:10]
        domains_dedup = list(domains)[:10]
        # Deduplicate hashes by (type, value) to avoid redundant VT lookups
        seen_hashes = set()
        hashes_dedup = []
        for ht, hv in hashes:
            if (ht, hv) not in seen_hashes:
                seen_hashes.add((ht, hv))
                hashes_dedup.append((ht, hv))
        hashes_dedup = hashes_dedup[:5]

        async def eip(ip):
            c = await get_cached(db, "ip_api", "ip", ip)
            if c: return c
            r = await geolocate_ip(ip)
            if r.get("status") == "success": await set_cached(db, "ip_api", "ip", ip, r)
            return r
        async def eurl(url):
            c = await get_cached(db, "virustotal", "url", url)
            if c: return {"ioc_type": "url", "ioc_value": url, **c}
            r = await check_url(url)
            await set_cached(db, "virustotal", "url", url, r)
            return {"ioc_type": "url", "ioc_value": url, **r}
        async def edom(d):
            c = await get_cached(db, "virustotal", "domain", d)
            if c: return {"ioc_type": "domain", "ioc_value": d, **c}
            r = await check_domain(d)
            await set_cached(db, "virustotal", "domain", d, r)
            return {"ioc_type": "domain", "ioc_value": d, **r}
        async def ehash(h):
            ht, hv = h
            c = await get_cached(db, "virustotal", ht, hv)
            if c: return {"ioc_type": ht, "ioc_value": hv, **c}
            r = await check_hash(hv)
            await set_cached(db, "virustotal", ht, hv, r)
            return {"ioc_type": ht, "ioc_value": hv, **r}

        enrichment_tasks = (
            [eip(ip) for ip in ips]
            + [eurl(u) for u in urls_dedup]
            + [edom(d) for d in domains_dedup]
            + [ehash(h) for h in hashes_dedup]
        )
        logger.info("[PERF] Enrichment tasks: %d (IPs=%d, URLs=%d, domains=%d, hashes=%d)",
                     len(enrichment_tasks), len(ips), len(urls_dedup), len(domains_dedup), len(hashes_dedup))

        # ── Phase 3: Run enrichment + Gemini AI in PARALLEL ──
        # Gemini evidence uses enrichment *counts*, not results, so they're independent
        evidence = {
            "email_metadata": {"from": parsed.from_address, "to": parsed.to_addresses, "subject": parsed.subject},
            "authentication": auth,
            "iocs": [{"type": i.ioc_type, "value": i.value[:100], "source": i.source} for i in iocs[:50]],
            "attachments": parsed.attachments,
            "enrichments": {"ip_count": len(ips), "vt_count": len(enrichment_tasks)},
            "risk_signals": [],
            "deterministic_score": 0,
        }

        t0 = time.perf_counter()
        enrichment_results, ai_result = await asyncio.gather(
            asyncio.gather(*enrichment_tasks, return_exceptions=True),
            classify_with_claude(evidence),
        )
        t_parallel = (time.perf_counter() - t0) * 1000
        logger.info("[PERF] Parallel enrichment + Gemini: %.0fms", t_parallel)

        # ── Phase 4: Process enrichment results ──
        for r in enrichment_results:
            if isinstance(r, Exception) or not isinstance(r, dict): continue
            if "ip_address" in r and r.get("status") == "success":
                enrichments["ip_geolocations"].append(r)
                db.add(IPEnrichment(investigation_id=inv_id, ip_address=r["ip_address"], country=r.get("country"), region=r.get("region"), city=r.get("city"), isp=r.get("isp"), asn=r.get("asn"), org=r.get("org"), is_hosting=r.get("is_hosting", False), is_datacenter=r.get("is_datacenter", False), raw_response=r))
            elif "ioc_type" in r:
                enrichments["threat_intel"].append(r)
                db.add(ThreatIntelResult(investigation_id=inv_id, ioc_type=r.get("ioc_type", "unknown"), ioc_value=r.get("ioc_value", ""), source="virustotal", status=r.get("status", "clean"), detection_count=r.get("detection_count", 0), total_engines=r.get("total_engines", 0), permalink=r.get("permalink"), raw_response=r))

        # ── Phase 5: Risk scoring + DB persistence ──
        t0 = time.perf_counter()
        signals = calculate_signals(auth, [i.to_dict() for i in iocs], enrichments, url_analyses, domain_analyses)
        det_score, det_level = calculate_score(signals)

        db.add(AIAnalysis(investigation_id=inv_id, classification=ai_result.get("classification"), confidence=ai_result.get("confidence"), severity=ai_result.get("severity"), summary=ai_result.get("summary"), reasoning=ai_result.get("reasoning"), threat_categories=ai_result.get("threat_categories"), social_engineering_detected=ai_result.get("social_engineering_detected", False), social_engineering_confidence=ai_result.get("social_engineering_confidence", 0), recommended_actions=ai_result.get("recommended_actions"), limitations=ai_result.get("limitations"), raw_ai_response=ai_result, error=ai_result.get("error")))
        final_score, final_level, ai_se = apply_ai_social_engineering(det_score, ai_result)
        db.add(RiskScoreDetail(investigation_id=inv_id, final_score=final_score, risk_level=final_level, signals=signals, deterministic_score=det_score, ai_social_engineering_score=ai_se))
        inv.risk_score = final_score
        inv.risk_level = final_level
        inv.classification = ai_result.get("classification")
        inv.ai_confidence = ai_result.get("confidence")
        inv.sender = parsed.from_address
        inv.subject = parsed.subject
        inv.date = parsed.date
        inv.status = "completed"
        await db.flush()
        logger.info("[PERF] Risk scoring + DB persist: %.0fms", (time.perf_counter() - t0) * 1000)
        logger.info("[PERF] TOTAL investigation: %.0fms", (time.perf_counter() - t_start) * 1000)

        return {"id": str(inv_id), "status": "completed", "risk_score": final_score, "risk_level": final_level}
    except Exception as e:
        logger.error("Investigation %s failed: %s", inv_id, e)
        inv.status = "failed"
        await db.flush()
        return {"id": str(inv_id), "status": "failed", "error": str(e)}
