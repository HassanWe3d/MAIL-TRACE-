"""Authentication analysis schemas."""
from typing import Optional
from pydantic import BaseModel


class SPFResult(BaseModel):
    result: str = "unknown"
    domain: Optional[str] = None
    reason: Optional[str] = None


class DKIMResult(BaseModel):
    result: str = "unknown"
    domain: Optional[str] = None
    selector: Optional[str] = None
    reason: Optional[str] = None


class DMARCResult(BaseModel):
    result: str = "unknown"
    policy: Optional[str] = None
    reason: Optional[str] = None


class AuthenticationResultSchema(BaseModel):
    from_address: Optional[str] = None
    from_domain: Optional[str] = None
    return_path: Optional[str] = None
    return_path_domain: Optional[str] = None
    domain_mismatch: bool = False
    reply_to: Optional[str] = None
    reply_to_mismatch: bool = False
    spf: SPFResult = SPFResult()
    dkim: DKIMResult = DKIMResult()
    dmarc: DMARCResult = DMARCResult()
