"""Health check endpoint for uptime monitoring."""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Minimal health check — no DB, no external calls."""
    return {"status": "ok"}
