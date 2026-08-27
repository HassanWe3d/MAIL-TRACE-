"""Tests for multi-provider AI fallback system.

Tests cover:
1. Gemini succeeds → OpenAI/DeepSeek not called
2. Gemini 429 → OpenAI called
3. Gemini fails, OpenAI succeeds → DeepSeek not called
4. Gemini + OpenAI fail → DeepSeek called
5. All three fail → graceful FAIL_RESP
6. Permanent errors (401/403) do NOT trigger fallback
7. _is_transient classification
8. classify_with_claude uses ai_provider (not gemini directly)
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.integrations.ai_provider import (
    classify_with_claude,
    _is_transient,
    TransientAIError,
    _call_gemini,
    _call_openai,
    _call_deepseek,
    _PROVIDER_CHAIN,
)
from app.integrations.gemini import FAIL_RESP


# ── Sample evidence ─────────────────────────────────────────────────────

SAMPLE_EVIDENCE = {
    "email_metadata": {"from": "test@evil.com", "to": ["victim@co.com"], "subject": "Phish"},
    "authentication": {"spf_result": "fail", "dkim_result": "none", "dmarc_result": "fail"},
    "iocs": [{"type": "url", "value": "https://evil.com/phish", "source": "eml"}],
    "attachments": [],
    "enrichments": {"ip_count": 1, "vt_count": 2},
    "risk_signals": [],
    "deterministic_score": 30,
}

GOOD_RESULT = {
    "classification": "phishing",
    "confidence": 0.9,
    "severity": "high",
    "summary": "This is a phishing email.",
    "reasoning": ["SPF failed", "Suspicious URL"],
    "threat_categories": ["phishing"],
    "social_engineering_detected": True,
    "social_engineering_confidence": 0.85,
    "recommended_actions": ["Block sender"],
    "limitations": [],
}


def _make_good_result():
    """Return a fresh copy of a successful AI result."""
    return dict(GOOD_RESULT)


# ── _is_transient tests ────────────────────────────────────────────────

class TestIsTransient:
    def test_transient_ai_error(self):
        assert _is_transient(TransientAIError("gemini", "rate limited", 429))

    def test_timeout(self):
        assert _is_transient(TimeoutError("timed out"))

    def test_string_with_429(self):
        assert _is_transient(Exception("Error 429 rate limit"))

    def test_string_with_500(self):
        assert _is_transient(Exception("HTTP 500 Internal Server Error"))

    def test_string_with_timeout(self):
        assert _is_transient(Exception("Request timeout after 30s"))

    def test_string_with_connection(self):
        assert _is_transient(Exception("Connection refused"))

    def test_permanent_error_not_transient(self):
        assert not _is_transient(Exception("Invalid API key"))


# ── Fallback flow tests (all providers mocked) ─────────────────────────

@pytest.mark.anyio
async def test_gemini_succeeds_openai_not_called():
    """Gemini succeeds → OpenAI and DeepSeek are NOT called."""
    gemini_ok = AsyncMock(return_value=_make_good_result())
    openai_fn = AsyncMock()
    deepseek_fn = AsyncMock()

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_ok),
        ("openai", openai_fn),
        ("deepseek", deepseek_fn),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "phishing"
    assert result["confidence"] == 0.9
    gemini_ok.assert_awaited_once()
    openai_fn.assert_not_awaited()
    deepseek_fn.assert_not_awaited()


@pytest.mark.anyio
async def test_gemini_429_falls_to_openai():
    """Gemini returns 429 → OpenAI is called and succeeds."""
    gemini_429 = AsyncMock(side_effect=TransientAIError("gemini", "429 rate limit", 429))
    openai_ok = AsyncMock(return_value=_make_good_result())
    deepseek_fn = AsyncMock()

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_429),
        ("openai", openai_ok),
        ("deepseek", deepseek_fn),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "phishing"
    gemini_429.assert_awaited_once()
    openai_ok.assert_awaited_once()
    deepseek_fn.assert_not_awaited()


@pytest.mark.anyio
async def test_gemini_fails_openai_succeeds():
    """Gemini transient failure → OpenAI succeeds → DeepSeek NOT called."""
    gemini_fail = AsyncMock(side_effect=TransientAIError("gemini", "503 server error", 503))
    openai_ok = AsyncMock(return_value=_make_good_result())
    deepseek_fn = AsyncMock()

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_fail),
        ("openai", openai_ok),
        ("deepseek", deepseek_fn),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "phishing"
    gemini_fail.assert_awaited_once()
    openai_ok.assert_awaited_once()
    deepseek_fn.assert_not_awaited()


@pytest.mark.anyio
async def test_gemini_openai_fail_deepseek_succeeds():
    """Gemini + OpenAI fail → DeepSeek succeeds."""
    gemini_fail = AsyncMock(side_effect=TransientAIError("gemini", "503", 503))
    openai_fail = AsyncMock(side_effect=TransientAIError("openai", "502", 502))
    deepseek_ok = AsyncMock(return_value=_make_good_result())

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_fail),
        ("openai", openai_fail),
        ("deepseek", deepseek_ok),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "phishing"
    gemini_fail.assert_awaited_once()
    openai_fail.assert_awaited_once()
    deepseek_ok.assert_awaited_once()


@pytest.mark.anyio
async def test_all_providers_fail_returns_graceful_response():
    """All three providers fail → graceful FAIL_RESP."""
    gemini_fail = AsyncMock(side_effect=TransientAIError("gemini", "429", 429))
    openai_fail = AsyncMock(side_effect=TransientAIError("openai", "503", 503))
    deepseek_fail = AsyncMock(side_effect=TransientAIError("deepseek", "502", 502))

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_fail),
        ("openai", openai_fail),
        ("deepseek", deepseek_fail),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "unknown"
    assert result["error"] is not None
    assert "unavailable" in result["summary"].lower() or "failed" in result["summary"].lower()
    assert len(result["limitations"]) >= 1


@pytest.mark.anyio
async def test_permanent_error_does_not_fallback():
    """Gemini auth error (401/403) → does NOT try OpenAI."""
    gemini_auth = AsyncMock(side_effect=TransientAIError("gemini", "401 unauthorized"))
    openai_fn = AsyncMock()

    # Make _is_transient return False for auth errors
    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_auth),
        ("openai", openai_fn),
    ]), patch("app.integrations.ai_provider._is_transient", return_value=False):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "unknown"
    gemini_auth.assert_awaited_once()
    openai_fn.assert_not_awaited()


@pytest.mark.anyio
async def test_no_keys_returns_fail_resp():
    """With no API keys configured → returns FAIL_RESP immediately."""
    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", AsyncMock(side_effect=TransientAIError("gemini", "No API key configured"))),
        ("openai", AsyncMock(side_effect=TransientAIError("openai", "No API key configured"))),
        ("deepseek", AsyncMock(side_effect=TransientAIError("deepseek", "No API key configured"))),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "unknown"
    assert result["error"] is not None


@pytest.mark.anyio
async def test_gemini_timeout_falls_to_openai():
    """Gemini timeout → OpenAI called."""
    gemini_timeout = AsyncMock(side_effect=TransientAIError("gemini", "Request timed out"))
    openai_ok = AsyncMock(return_value=_make_good_result())

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_timeout),
        ("openai", openai_ok),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "phishing"
    gemini_timeout.assert_awaited_once()
    openai_ok.assert_awaited_once()


@pytest.mark.anyio
async def test_gemini_connection_error_falls_to_openai():
    """Gemini connection error → OpenAI called."""
    gemini_conn = AsyncMock(side_effect=TransientAIError("gemini", "Connection refused"))
    openai_ok = AsyncMock(return_value=_make_good_result())

    with patch("app.integrations.ai_provider._PROVIDER_CHAIN", [
        ("gemini", gemini_conn),
        ("openai", openai_ok),
    ]):
        result = await classify_with_claude(SAMPLE_EVIDENCE)

    assert result["classification"] == "phishing"


@pytest.mark.anyio
async def test_provider_chain_order():
    """Verify the provider chain is Gemini → OpenAI → DeepSeek."""
    names = [name for name, _ in _PROVIDER_CHAIN]
    assert names == ["gemini", "openai", "deepseek"]


@pytest.mark.anyio
async def test_normalize_response_preserved():
    """The shared _normalize_response is used by all providers."""
    from app.integrations.gemini import _normalize_response

    # Valid response
    result = _normalize_response({
        "classification": "phishing",
        "confidence": 0.85,
        "severity": "high",
        "summary": "Test",
        "reasoning": ["step1"],
        "threat_categories": ["phishing"],
        "social_engineering_detected": True,
        "social_engineering_confidence": 0.7,
        "recommended_actions": ["block"],
        "limitations": [],
    })
    assert result["classification"] == "phishing"
    assert result["confidence"] == 0.85
    assert result["error"] is None

    # Invalid classification → normalized to "unknown"
    result2 = _normalize_response({"classification": "bad-value"})
    assert result2["classification"] == "unknown"


@pytest.mark.anyio
async def test_investigation_service_uses_ai_provider():
    """Verify investigation_service imports from ai_provider, not gemini."""
    import app.services.investigation_service as inv_mod
    import app.integrations.ai_provider as ai_mod
    # The module-level reference should point to ai_provider.classify_with_claude
    assert inv_mod.classify_with_claude is ai_mod.classify_with_claude
