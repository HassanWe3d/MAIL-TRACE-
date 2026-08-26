"""AI analysis schemas."""
from typing import Optional
from pydantic import BaseModel, Field


class AIReasoningItem(BaseModel):
    evidence: str
    impact: str
    confidence: float = 0.0


class AIAnalysisSchema(BaseModel):
    classification: str = "unknown"
    confidence: float = 0.0
    severity: str = "unknown"
    summary: str = ""
    reasoning: list[AIReasoningItem] = []
    threat_categories: list[str] = []
    social_engineering_detected: bool = False
    social_engineering_confidence: float = 0.0
    recommended_actions: list[str] = []
    limitations: list[str] = []


class RiskSignal(BaseModel):
    name: str
    weight: int
    evidence: str = ""


class RiskScoreSchema(BaseModel):
    final_score: int
    risk_level: str
    deterministic_score: int
    ai_social_engineering_score: int = 0
    signals: list[RiskSignal] = []
