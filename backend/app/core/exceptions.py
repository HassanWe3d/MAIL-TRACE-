"""Custom exceptions and global error handlers for the MAIL TRACE backend."""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class InvestigationError(Exception):
    """Base for investigation pipeline errors."""

    def __init__(self, message: str, code: str = "INVESTIGATION_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class EmailParsingError(InvestigationError):
    """Raised when EML parsing fails."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="EMAIL_PARSE_ERROR",
            status_code=400,
        )


class FileTooLargeError(InvestigationError):
    """Raised when uploaded file exceeds MAX_UPLOAD_SIZE_MB."""

    def __init__(self, size_mb: float, limit_mb: float):
        super().__init__(
            message=f"File is too large ({size_mb:.1f} MB). Maximum supported size is {limit_mb:.0f} MB.",
            code="FILE_TOO_LARGE",
            status_code=413,
        )


class InvalidFileTypeError(InvestigationError):
    """Raised when uploaded file is not .eml."""

    def __init__(self, filename: str):
        super().__init__(
            message=f"Invalid file type. Only .eml files are accepted. Got: {filename}",
            code="INVALID_FILE_TYPE",
            status_code=400,
        )


class InvestigationNotFoundError(InvestigationError):
    """Raised when investigation ID does not exist."""

    def __init__(self, inv_id: str):
        super().__init__(
            message=f"Investigation not found: {inv_id}",
            code="INVESTIGATION_NOT_FOUND",
            status_code=404,
        )


class ExternalServiceError(InvestigationError):
    """Raised when an external service (VT, IP API) fails non-fatally."""

    def __init__(self, service: str, detail: str = ""):
        super().__init__(
            message=f"{service} temporarily unavailable{': ' + detail if detail else ''}",
            code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
        )


# ── Global exception handlers ────────────────────────────────────────


async def investigation_error_handler(request: Request, exc: InvestigationError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled validation errors."""
    from pydantic import ValidationError

    if isinstance(exc, ValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Request data is invalid.", "details": str(exc)},
            },
        )
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Convert FastAPI/Starlette HTTPExceptions to structured JSON."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all: never expose stack traces."""
    import logging

    logging.getLogger("threat_intel").error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected server error occurred."}},
    )
