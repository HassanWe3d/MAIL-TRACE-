"""Claude API integration for AI classification."""
import json
import anthropic
from app.core.logging_config import logger
from app.core.config import get_settings

settings = get_settings()

INSTRUCTIONS = ("You are an email threat analyst. Return ONLY valid JSON "
                "with these fields: classification, confidence, severity, "
                "summary, reasoning, threat_categories, social_engineering_detected, "
                "social_engineering_confidence, recommended_actions, limitations")

FAIL_RESP = {"error": "unavailable", "classification": "unknown", "confidence": 0,
             "severity": "unknown", "summary": "AI unavailable", "reasoning": [],
             "threat_categories": [], "social_engineering_detected": False,
             "social_engineering_confidence": 0, "recommended_actions": [], "limitations": []}


async def classify_with_claude(evidence):
    if not settings.ANTHROPIC_API_KEY:
        return {**FAIL_RESP, "limitations": ["No API key"]}
    try:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        ev_text = json.dumps(evidence, indent=2, default=str)[:8000]
        prompt = INSTRUCTIONS + chr(10) + chr(10) + "Evidence:" + chr(10) + ev_text
        msg = await client.messages.create(
            model=settings.AI_MODEL, max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        resp = msg.content[0].text.strip()
        if resp.startswith("```"):
            lines = resp.split(chr(10))
            resp = chr(10).join(lines[1:-1])
        result = json.loads(resp)
        logger.info("Claude: classification=%s", result.get("classification"))
        return result
    except json.JSONDecodeError as e:
        logger.error("Claude invalid JSON: %s", e)
        return {**FAIL_RESP, "error": str(e), "summary": "Malformed AI response", "limitations": ["Invalid JSON"]}
    except Exception as e:
        logger.error("Claude error: %s", e)
        return {**FAIL_RESP, "error": str(e), "summary": "AI failed", "limitations": [str(e)]}
