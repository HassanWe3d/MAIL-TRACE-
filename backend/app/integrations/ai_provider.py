"""Multi-provider AI fallback system for email threat classification.

Providers (in order): Gemini → OpenAI → DeepSeek → Groq
Falls through on transient errors (429, 5xx, timeout, connection).
Returns FAIL_RESP only when ALL providers are exhausted.
"""
import asyncio
import json
from typing import Any

import httpx

from app.core.logging_config import logger
from app.core.config import get_settings
from app.integrations.gemini import (
    INSTRUCTIONS,
    FAIL_RESP,
    _normalize_response,
    _strip_markdown_fences,
)

settings = get_settings()

# ── Transient error classification ──────────────────────────────────────

_TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}


class TransientAIError(Exception):
    """Raised when a provider fails with a transient/retryable error."""

    def __init__(self, provider: str, message: str, status_code: int | None = None):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"{provider}: {message}")


def _is_transient(exc: Exception) -> bool:
    """Return True if the exception represents a transient provider failure."""
    if isinstance(exc, TransientAIError):
        return True
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError, httpx.ConnectTimeout)):
        return True
    if isinstance(exc, (TimeoutError, ConnectionError, OSError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _TRANSIENT_STATUS_CODES
    msg = str(exc).lower()
    if any(term in msg for term in ("timeout", "connection", "429", "500", "502", "503", "504")):
        return True
    # 404 model-not-found on deprecated/removed models — treat as transient so fallback continues
    if "404" in msg and "model" in msg:
        return True
    return False


# ── Shared prompt ───────────────────────────────────────────────────────

_EVIDENCE_LIMIT = 8000  # max chars for evidence payload


def _build_user_content(evidence: dict) -> str:
    ev_text = json.dumps(evidence, indent=2, default=str)[:_EVIDENCE_LIMIT]
    return f"{INSTRUCTIONS}\n\nEvidence:\n{ev_text}"


# ── Provider: Gemini ────────────────────────────────────────────────────

async def _call_gemini(evidence: dict) -> dict:
    """Call Gemini via the google-genai SDK. Raises TransientAIError on transient failures."""
    if not settings.GEMINI_API_KEY:
        raise TransientAIError("gemini", "No API key configured")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    user_content = _build_user_content(evidence)

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.AI_MODEL,
                contents=user_content,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=2000,
                    response_mime_type="application/json",
                ),
            ),
            timeout=30.0,
        )
    except asyncio.TimeoutError:
        raise TransientAIError("gemini", "Request timed out")
    except Exception as e:
        msg = str(e)
        # Classify as transient or permanent
        if any(code in msg for code in ("429", "500", "502", "503", "504")) or "rate" in msg.lower():
            raise TransientAIError("gemini", msg) from e
        if "timeout" in msg.lower() or "connection" in msg.lower():
            raise TransientAIError("gemini", msg) from e
        if "401" in msg or "403" in msg or "api_key" in msg.lower():
            raise  # permanent — do not fallback for auth errors
        raise TransientAIError("gemini", msg) from e

    raw_text = response.text
    if not raw_text:
        raise TransientAIError("gemini", "Empty response")

    cleaned = _strip_markdown_fences(raw_text)
    result = json.loads(cleaned)
    result = _normalize_response(result)
    result["raw_ai_response"] = result.copy()
    logger.info("Gemini OK: classification=%s confidence=%.2f", result["classification"], result["confidence"])
    return result


# ── Provider: OpenAI ────────────────────────────────────────────────────

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"


async def _call_openai(evidence: dict) -> dict:
    """Call OpenAI chat completions. Raises TransientAIError on transient failures."""
    if not settings.OPENAI_API_KEY:
        raise TransientAIError("openai", "No API key configured")

    model = settings.OPENAI_MODEL
    user_content = _build_user_content(evidence)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                _OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are an email threat analyst. Return ONLY valid JSON."},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                    "response_format": {"type": "json_object"},
                },
            )
        except httpx.TimeoutException:
            raise TransientAIError("openai", "Request timed out")
        except httpx.ConnectError:
            raise TransientAIError("openai", "Connection failed")

    if resp.status_code in _TRANSIENT_STATUS_CODES:
        raise TransientAIError("openai", f"HTTP {resp.status_code}", resp.status_code)
    if resp.status_code in (401, 403):
        raise  # permanent — auth error, do not fallback
    if resp.status_code != 200:
        raise TransientAIError("openai", f"HTTP {resp.status_code}", resp.status_code)

    body = resp.json()
    raw_text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not raw_text:
        raise TransientAIError("openai", "Empty response")

    cleaned = _strip_markdown_fences(raw_text)
    result = json.loads(cleaned)
    result = _normalize_response(result)
    result["raw_ai_response"] = result.copy()
    logger.info("OpenAI OK: classification=%s confidence=%.2f", result["classification"], result["confidence"])
    return result


# ── Provider: DeepSeek ──────────────────────────────────────────────────

_DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"


async def _call_deepseek(evidence: dict) -> dict:
    """Call DeepSeek chat completions (OpenAI-compatible API). Raises TransientAIError on transient failures."""
    if not settings.DEEPSEEK_API_KEY:
        raise TransientAIError("deepseek", "No API key configured")

    model = settings.DEEPSEEK_MODEL
    user_content = _build_user_content(evidence)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                _DEEPSEEK_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are an email threat analyst. Return ONLY valid JSON."},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                },
            )
        except httpx.TimeoutException:
            raise TransientAIError("deepseek", "Request timed out")
        except httpx.ConnectError:
            raise TransientAIError("deepseek", "Connection failed")

    if resp.status_code in _TRANSIENT_STATUS_CODES:
        raise TransientAIError("deepseek", f"HTTP {resp.status_code}", resp.status_code)
    if resp.status_code in (401, 403):
        raise  # permanent — auth error
    if resp.status_code != 200:
        raise TransientAIError("deepseek", f"HTTP {resp.status_code}", resp.status_code)

    body = resp.json()
    raw_text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not raw_text:
        raise TransientAIError("deepseek", "Empty response")

    cleaned = _strip_markdown_fences(raw_text)
    result = json.loads(cleaned)
    result = _normalize_response(result)
    result["raw_ai_response"] = result.copy()
    logger.info("DeepSeek OK: classification=%s confidence=%.2f", result["classification"], result["confidence"])
    return result


# ── Provider: Groq ─────────────────────────────────────────────────────

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def _call_groq(evidence: dict) -> dict:
    """Call Groq chat completions (OpenAI-compatible API). Raises TransientAIError on transient failures."""
    if not settings.GROQ_API_KEY:
        raise TransientAIError("groq", "No API key configured")

    model = settings.GROQ_MODEL
    user_content = _build_user_content(evidence)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                _GROQ_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are an email threat analyst. Return ONLY valid JSON."},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                    "response_format": {"type": "json_object"},
                },
            )
        except httpx.TimeoutException:
            raise TransientAIError("groq", "Request timed out")
        except httpx.ConnectError:
            raise TransientAIError("groq", "Connection failed")

    if resp.status_code in _TRANSIENT_STATUS_CODES:
        raise TransientAIError("groq", f"HTTP {resp.status_code}", resp.status_code)
    if resp.status_code in (401, 403):
        raise  # permanent — auth error
    if resp.status_code != 200:
        raise TransientAIError("groq", f"HTTP {resp.status_code}", resp.status_code)

    body = resp.json()
    raw_text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not raw_text:
        raise TransientAIError("groq", "Empty response")

    cleaned = _strip_markdown_fences(raw_text)
    result = json.loads(cleaned)
    result = _normalize_response(result)
    result["raw_ai_response"] = result.copy()
    logger.info("Groq OK: classification=%s confidence=%.2f", result["classification"], result["confidence"])
    return result


# ── Fallback coordinator ────────────────────────────────────────────────

# Provider chain: (name, callable)
_PROVIDER_CHAIN: list[tuple[str, Any]] = [
    ("gemini", _call_gemini),
    ("openai", _call_openai),
    ("deepseek", _call_deepseek),
    ("groq", _call_groq),
]


async def classify_with_claude(evidence: dict) -> dict:
    """Classify email evidence with automatic multi-provider fallback.

    Tries providers in order: Gemini → OpenAI → DeepSeek → Groq.
    Falls through on transient errors (429, 5xx, timeout, connection).
    Returns FAIL_RESP when all providers are exhausted.
    The function name is preserved for backward compatibility with investigation_service.py.
    """
    last_error: Exception | None = None

    for provider_name, provider_fn in _PROVIDER_CHAIN:
        try:
            logger.info("AI provider attempt: %s", provider_name)
            result = await provider_fn(evidence)
            return result
        except TransientAIError as e:
            if not _is_transient(e):
                # Permanent error (auth) — do not try next provider
                logger.error("AI provider %s permanent failure: %s", provider_name, e)
                return {
                    **FAIL_RESP,
                    "error": str(e),
                    "summary": "AI classification failed",
                    "limitations": [f"{provider_name}: {e}"],
                }
            logger.warning("AI provider %s transient failure, trying next: %s", provider_name, e)
            last_error = e
        except Exception as e:
            if _is_transient(e):
                logger.warning("AI provider %s transient failure, trying next: %s", provider_name, e)
                last_error = e
            else:
                logger.error("AI provider %s permanent failure: %s", provider_name, e)
                return {
                    **FAIL_RESP,
                    "error": str(e),
                    "summary": "AI classification failed",
                    "limitations": [f"{provider_name}: {e}"],
                }

    # All providers exhausted
    logger.error("All AI providers failed. Last error: %s", last_error)
    return {
        **FAIL_RESP,
        "error": str(last_error) if last_error else "All providers unavailable",
        "summary": "AI classification unavailable — all providers failed",
        "limitations": [
            "All AI providers (Gemini, OpenAI, DeepSeek, Groq) are currently unavailable",
            f"Last error: {last_error}" if last_error else "No providers responded",
        ],
    }
