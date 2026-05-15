"""CompeteIQ FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from competeiq.api import dashboard_router, runs_router, schedule_router, webhook_router
from competeiq.scheduler import shutdown_scheduler, start_scheduler
from competeiq.config import get_settings
from competeiq.state import get_status_response
from competeiq.utils.logger import configure_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configure logging and validate settings on startup."""
    configure_logging()
    settings = get_settings()
    logger.info(
        "CompeteIQ API starting",
        extra={
            "debug": settings.debug,
            "cors_origins": settings.cors_origins_list,
        },
    )
    start_scheduler()
    yield
    shutdown_scheduler()
    logger.info("CompeteIQ API shutting down")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="CompeteIQ API",
        description="Autonomous multi-agent competitive intelligence backend",
        version="0.1.0",
        lifespan=lifespan,
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        """Return consistent JSON error bodies for HTTP exceptions."""
        logger.warning(
            "HTTP exception",
            extra={
                "path": request.url.path,
                "status_code": exc.status_code,
                "detail": exc.detail,
            },
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "status_code": exc.status_code,
                "detail": exc.detail,
            },
        )

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        """Liveness probe for load balancers and orchestrators."""
        return {"status": "ok"}

    @app.get("/api/status", tags=["status"])
    async def get_status() -> dict[str, Any]:
        """
        Get current pipeline status.

        Returns status, run_id, competitors, current_step, progress (0–100),
        last_run timestamp, and any error_message.
        """
        return get_status_response()

    app.include_router(dashboard_router)
    app.include_router(webhook_router)
    app.include_router(schedule_router)
    app.include_router(runs_router)

    return app


app = create_app()
