"""Google Gemini API integration for AI classification."""
import json
from google import genai
from google.genai import types
from app.core.logging_config import logger
from app.core.config import get_settings

settings = get_settings()

INSTRUCTIONS = (
    "You are an email threat analyst specializing in phishing detection, "
    "business email compromise, and email forensics.\n\n"
    "Analyze the following email evidence and return ONLY valid JSON "
    "with exactly these fields:\n\n"
    '{\n'
    '  "classification": "phishing" | "spear-phishing" | "business-email-compromise" | "spam" | "legitimate" | "unknown",\n'
    '  "confidence": 0.0-1.0,\n'
    '  "severity": "critical" | "high" | "medium" | "low" | "none",\n'
    '  "summary": "one paragraph executive summary",\n'
    '  "reasoning": ["list of reasoning steps"],\n'
    '  "threat_categories": ["phishing", "credential-theft", etc.],\n'
    '  "social_engineering_detected": true/false,\n'
    '  "social_engineering_confidence": 0.0-1.0,\n'
    '  "recommended_actions": ["action1", "action2"],\n'
    '  "limitations": ["limitation1", "limitation2"]\n'
    '}\n\n'
    "Classification guidelines:\n"
    "- phishing: mass unsolicited email trying to steal credentials\n"
    "- spear-phishing: targeted phishing against specific individual/org\n"
    "- business-email-compromise: impersonation of executive/vendor for fraud\n"
    "- spam: unsolicited commercial email (not necessarily malicious)\n"
    "- legitimate: genuine authorized email\n"
    "- unknown: insufficient evidence to classify\n\n"
    "Severity guidelines:\n"
    "- critical: active BEC or spear-phishing with stolen credentials\n"
    "- high: convincing phishing with malware or credential harvesting\n"
    "- medium: suspicious indicators but inconclusive\n"
    "- low: minor anomalies, likely legitimate\n"
    "- none: confirmed legitimate\n\n"
    "Return ONLY the JSON object. No markdown, no code fences, no explanation."
)

FAIL_RESP = {
    "error": "unavailable",
    "classification": "unknown",
    "confidence": 0,
    "severity": "unknown",
    "summary": "AI unavailable",
    "reasoning": [],
    "threat_categories": [],
    "social_engineering_detected": False,
    "social_engineering_confidence": 0,
    "recommended_actions": [],
    "limitations": [],
}


def _normalize_response(result: dict) -> dict:
    """Ensure all required fields exist with correct types."""
    out = dict(FAIL_RESP)
    for key in FAIL_RESP:
        if key in result and result[key] is not None:
            out[key] = result[key]
    # Clear error on successful response — only keep error if Gemini explicitly returned one
    if "error" not in result:
        out["error"] = None
    # Ensure numeric fields are correct type
    try:
        out["confidence"] = float(out["confidence"])
    except (TypeError, ValueError):
        out["confidence"] = 0.0
    try:
        out["social_engineering_confidence"] = float(out["social_engineering_confidence"])
    except (TypeError, ValueError):
        out["social_engineering_confidence"] = 0.0
    # Ensure list fields are lists
    for field in ("reasoning", "threat_categories", "recommended_actions", "limitations"):
        if not isinstance(out[field], list):
            out[field] = []
    # Ensure boolean field
    out["social_engineering_detected"] = bool(out["social_engineering_detected"])
    # Validate classification
    valid_classifications = {"phishing", "spear-phishing", "business-email-compromise", "spam", "legitimate", "unknown"}
    if out["classification"] not in valid_classifications:
        out["classification"] = "unknown"
    # Validate severity
    valid_severities = {"critical", "high", "medium", "low", "none"}
    if out["severity"] not in valid_severities:
        out["severity"] = "unknown"
    return out


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from AI response if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines if they are fences
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        elif lines[0].strip().startswith("```"):
            lines = lines[1:]
        text = "\n".join(lines)
    return text.strip()


async def classify_with_claude(evidence: dict) -> dict:
    """Classify email evidence using Google Gemini (provider-agnostic name).

    Uses GEMINI_API_KEY for authentication.
    Falls back to FAIL_RESP on any error.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("No GEMINI_API_KEY configured — AI classification unavailable")
        return {**FAIL_RESP, "limitations": ["No Gemini API key configured"]}

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        ev_text = json.dumps(evidence, indent=2, default=str)[:8000]
        user_content = f"{INSTRUCTIONS}\n\nEvidence:\n{ev_text}"

        response = await client.aio.models.generate_content(
            model=settings.AI_MODEL,
            contents=user_content,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2000,
                response_mime_type="application/json",
            ),
        )

        raw_text = response.text
        logger.info("Gemini raw response length: %d", len(raw_text) if raw_text else 0)

        if not raw_text:
            logger.error("Gemini returned empty response")
            return {**FAIL_RESP, "limitations": ["Empty response from Gemini"]}

        cleaned = _strip_markdown_fences(raw_text)
        result = json.loads(cleaned)

        result = _normalize_response(result)
        result["raw_ai_response"] = result.copy()

        logger.info("Gemini: classification=%s confidence=%.2f", result.get("classification"), result.get("confidence"))
        return result

    except json.JSONDecodeError as e:
        logger.error("Gemini invalid JSON: %s — raw: %s", e, raw_text[:200] if raw_text else "empty")
        return {**FAIL_RESP, "error": str(e), "summary": "Malformed AI response", "limitations": ["Invalid JSON from Gemini"]}
    except Exception as e:
        error_str = str(e)
        logger.error("Gemini error: %s", error_str)
        # Surface rate limits and auth errors as limitations
        limitations = [error_str]
        if "429" in error_str or "rate" in error_str.lower():
            limitations = ["Gemini rate limit exceeded — try again later"]
        elif "401" in error_str or "403" in error_str or "api_key" in error_str.lower():
            limitations = ["Invalid or missing Gemini API key"]
        return {**FAIL_RESP, "error": error_str, "summary": "AI classification failed", "limitations": limitations}
