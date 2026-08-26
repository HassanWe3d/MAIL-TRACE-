"""Investigation schemas."""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel
import uuid


class InvestigationBrief(BaseModel):
    id: uuid.UUID
    created_at: datetime
    filename: str
    status: str
    sender: Optional[str] = None
    subject: Optional[str] = None
    risk_score: int = 0
    risk_level: str = "unknown"
    classification: Optional[str] = None
    ai_confidence: Optional[float] = None


class EmailMetadataResponse(BaseModel):
    from_address: Optional[str] = None
    to_addresses: Optional[list[str]] = None
    cc_addresses: Optional[list[str]] = None
    subject: Optional[str] = None
    date: Optional[datetime] = None
    reply_to: Optional[str] = None
    return_path: Optional[str] = None
    message_id: Optional[str] = None
    mime_version: Optional[str] = None
    content_type: Optional[str] = None


class HeaderResponse(BaseModel):
    name: str
    value: str


class ReceivedHopResponse(BaseModel):
    hop_order: int
    raw_header: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_hostname: Optional[str] = None
    destination_hostname: Optional[str] = None
    timestamp: Optional[datetime] = None


class AttachmentResponse(BaseModel):
    filename: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None
    md5: Optional[str] = None
    sha1: Optional[str] = None
    sha256: Optional[str] = None


class InvestigationDetail(BaseModel):
    id: uuid.UUID
    created_at: datetime
    filename: str
    status: str
    sender: Optional[str] = None
    subject: Optional[str] = None
    date: Optional[datetime] = None
    risk_score: int = 0
    risk_level: str = "unknown"
    classification: Optional[str] = None
    ai_confidence: Optional[float] = None
    email_metadata: Optional[EmailMetadataResponse] = None
    headers: list[HeaderResponse] = []
    received_hops: list[ReceivedHopResponse] = []
    authentication_results: Optional[Any] = None
    iocs: list[Any] = []
    ip_enrichments: list[Any] = []
    threat_intel_results: list[Any] = []
    attachments: list[AttachmentResponse] = []
    ai_analysis: Optional[Any] = None
    risk_score_detail: Optional[Any] = None
