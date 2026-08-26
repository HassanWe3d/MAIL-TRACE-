"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.logging_config import logger
from app.db.database import init_db, close_db
from app.api.routes.investigations import router as investigations_router
from app.api.routes.graph import router as graph_router
from app.api.routes.reports import router as reports_router
from app.api.routes.health import router as health_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Threat Intelligence Platform")
    await init_db()
    logger.info("Database initialized")
    yield
    await close_db()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Email Threat Intelligence Platform",
    description="AI-powered email threat detection and forensic intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(investigations_router)
app.include_router(graph_router)
app.include_router(reports_router)
app.include_router(health_router)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "threat-intel-platform"}
