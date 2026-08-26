"""Enrichment result schemas."""
from typing import Any, Optional
from pydantic import BaseModel


class IPGeolocation(BaseModel):
    ip_address: str
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None
    org: Optional[str] = None
    is_hosting: bool = False
    is_datacenter: bool = False
    status: str = "success"
    error: Optional[str] = None


class ThreatIntelResultSchema(BaseModel):
    ioc_type: str
    ioc_value: str
    source: str = "virustotal"
    status: str = "clean"
    detection_count: int = 0
    total_engines: int = 0
    permalink: Optional[str] = None
    error: Optional[str] = None
