"""IOC schemas."""
from typing import Any, Optional
from pydantic import BaseModel


class IOCResponse(BaseModel):
    ioc_type: str
    value: str
    source: Optional[str] = None
    risk: str = "unknown"
    confidence: float = 1.0
    extra: Optional[dict] = None
