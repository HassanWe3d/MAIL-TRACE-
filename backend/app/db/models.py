"""SQLAlchemy ORM models for the threat intelligence platform."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    ForeignKey, JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base


def generate_uuid():
    return uuid.uuid4()


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    filename = Column(String(500), nullable=False)
    status = Column(String(20), default="processing", nullable=False)
    sender = Column(String(500))
    subject = Column(Text)
    date = Column(DateTime(timezone=True))
    risk_score = Column(Integer, default=0)
    risk_level = Column(String(20), default="unknown")
    classification = Column(String(50))
    ai_confidence = Column(Float)
    file_size = Column(Integer)

    email_metadata = relationship("EmailMetadata", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    headers = relationship("EmailHeader", back_populates="investigation", cascade="all, delete-orphan")
    received_hops = relationship("ReceivedHop", back_populates="investigation", cascade="all, delete-orphan")
    authentication_results = relationship("AuthenticationResult", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    iocs = relationship("IOC", back_populates="investigation", cascade="all, delete-orphan")
    ip_enrichments = relationship("IPEnrichment", back_populates="investigation", cascade="all, delete-orphan")
    threat_intel_results = relationship("ThreatIntelResult", back_populates="investigation", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="investigation", cascade="all, delete-orphan")
    ai_analysis = relationship("AIAnalysis", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    risk_score_detail = relationship("RiskScoreDetail", back_populates="investigation", uselist=False, cascade="all, delete-orphan")


class EmailMetadata(Base):
    __tablename__ = "email_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False, unique=True)
    from_address = Column(String(500))
    to_addresses = Column(JSON)
    cc_addresses = Column(JSON)
    bcc_addresses = Column(JSON)
    subject = Column(Text)
    date = Column(DateTime(timezone=True))
    reply_to = Column(String(500))
    return_path = Column(String(500))
    message_id = Column(Text)
    mime_version = Column(String(20))
    content_type = Column(String(200))
    plain_text_body = Column(Text)
    html_body = Column(Text)

    investigation = relationship("Investigation", back_populates="email_metadata")


class EmailHeader(Base):
    __tablename__ = "email_headers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    value = Column(Text, nullable=False)

    investigation = relationship("Investigation", back_populates="headers")


class ReceivedHop(Base):
    __tablename__ = "received_hops"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)
    hop_order = Column(Integer, nullable=False)
    raw_header = Column(Text)
    source_ip = Column(String(50))
    destination_ip = Column(String(50))
    source_hostname = Column(String(500))
    destination_hostname = Column(String(500))
    timestamp = Column(DateTime(timezone=True))
    server = Column(String(500))

    investigation = relationship("Investigation", back_populates="received_hops")



class AuthenticationResult(Base):
    __tablename__ = "authentication_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False, unique=True)
    from_address = Column(String(500))
    from_domain = Column(String(500))
    return_path = Column(String(500))
    return_path_domain = Column(String(500))
    domain_mismatch = Column(Boolean, default=False)
    reply_to = Column(String(500))
    reply_to_mismatch = Column(Boolean, default=False)
    spf_result = Column(String(20), default="unknown")
    spf_domain = Column(String(500))
    spf_reason = Column(Text)
    dkim_result = Column(String(20), default="unknown")
    dkim_domain = Column(String(500))
    dkim_selector = Column(String(100))
    dkim_reason = Column(Text)
    dmarc_result = Column(String(20), default="unknown")
    dmarc_policy = Column(String(50))
    dmarc_reason = Column(Text)
    raw_auth_results = Column(Text)

    investigation = relationship("Investigation", back_populates="authentication_results")


class IOC(Base):
    __tablename__ = "iocs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)
    ioc_type = Column(String(50), nullable=False)
    value = Column(Text, nullable=False)
    source = Column(String(100))
    risk = Column(String(20), default="unknown")
    confidence = Column(Float, default=1.0)
    extra = Column(JSONB)

    investigation = relationship("Investigation", back_populates="iocs")


class IPEnrichment(Base):
    __tablename__ = "ip_enrichments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)
    ip_address = Column(String(50), nullable=False)
    country = Column(String(100))
    region = Column(String(100))
    city = Column(String(100))
    isp = Column(String(200))
    asn = Column(String(50))
    org = Column(String(200))
    is_hosting = Column(Boolean, default=False)
    is_datacenter = Column(Boolean, default=False)
    raw_response = Column(JSONB)

    investigation = relationship("Investigation", back_populates="ip_enrichments")

class ThreatIntelResult(Base):
    __tablename__ = "threat_intel_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)
    ioc_type = Column(String(50), nullable=False)
    ioc_value = Column(Text, nullable=False)
    source = Column(String(50), default="virustotal")
    status = Column(String(20), default="clean")
    detection_count = Column(Integer, default=0)
    total_engines = Column(Integer, default=0)
    permalink = Column(Text)
    raw_response = Column(JSONB)

    investigation = relationship("Investigation", back_populates="threat_intel_results")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)
    filename = Column(String(500))
    mime_type = Column(String(200))
    size = Column(Integer)
    md5 = Column(String(32))
    sha1 = Column(String(40))
    sha256 = Column(String(64))

    investigation = relationship("Investigation", back_populates="attachments")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False, unique=True)
    classification = Column(String(50))
    confidence = Column(Float)
    severity = Column(String(20))
    summary = Column(Text)
    reasoning = Column(JSON)
    threat_categories = Column(JSON)
    social_engineering_detected = Column(Boolean, default=False)
    social_engineering_confidence = Column(Float, default=0.0)
    recommended_actions = Column(JSON)
    limitations = Column(JSON)
    raw_ai_response = Column(JSONB)
    error = Column(Text)

    investigation = relationship("Investigation", back_populates="ai_analysis")


class RiskScoreDetail(Base):
    __tablename__ = "risk_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False, unique=True)
    final_score = Column(Integer, nullable=False)
    risk_level = Column(String(20), nullable=False)
    signals = Column(JSON)
    deterministic_score = Column(Integer, nullable=False)
    ai_social_engineering_score = Column(Integer, default=0)

    investigation = relationship("Investigation", back_populates="risk_score_detail")


class EnrichmentCache(Base):
    __tablename__ = "enrichment_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    cache_key = Column(String(500), nullable=False, unique=True)
    source = Column(String(50), nullable=False)
    ioc_type = Column(String(50), nullable=False)
    ioc_value = Column(Text, nullable=False)
    response_json = Column(JSONB)
    status = Column(String(20), default="valid")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True))
