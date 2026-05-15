"""Dashboard API — spec-aligned endpoints for the React frontend."""

from __future__ import annotations

import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from competeiq.config import get_settings
from competeiq.pipeline.runner import PipelineRunner
from competeiq.state import (
    add_tracked_competitor,
    get_competitors_response,
    get_spec_run_history,
    get_spec_status_response,
    get_tracked_domains,
    list_tracked_competitors,
    remove_tracked_competitor,
    seed_default_competitors,
    start_run,
    subscribe_events,
    update_state,
)
from competeiq.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["dashboard"])


class RunRequest(BaseModel):
    """Optional competitor list for POST /run."""

    competitors: Optional[List[str]] = Field(
        default=None,
        description="Competitor domains or names; uses tracked competitors if omitted",
        examples=[["linear.app", "notion.so", "vercel.com"]],
    )


class RunResponse(BaseModel):
    status: str
    run_id: str


class AddCompetitorRequest(BaseModel):
    """Body for POST /competitors."""
    domain: str = Field(
        ...,
        description="Competitor domain to track (e.g. 'linear.app')",
        examples=["linear.app"],
    )


async def _execute_pipeline(run_id: str, competitors: list[str]) -> None:
    """Background task: run pipeline and update global state."""
    try:
        runner = PipelineRunner()
        result = await runner.run(run_id=run_id, competitors=competitors)

        update_state("status", "completed")
        update_state("progress", 100)
        update_state("current_step", "Complete")
        update_state("current_agent", "done")
        update_state("last_run_result", result)
        update_state("error_message", None)
        logger.info("Pipeline completed", extra={"run_id": run_id})

    except Exception as exc:
        logger.error("Pipeline failed: %s", exc, extra={"run_id": run_id})
        update_state("status", "failed")
        update_state("current_step", "Failed")
        update_state("current_agent", "done")
        update_state("error_message", str(exc))


@router.post("/run", response_model=RunResponse, summary="Trigger pipeline run")
async def run_pipeline(
    request: RunRequest,
    background_tasks: BackgroundTasks,
) -> RunResponse:
    """
    Start the full competitive intelligence pipeline (non-blocking).

    Uses tracked competitors from DB when body is empty.
    """
    from competeiq.state import get_state
    
    current_state = get_state()
    if current_state.get("status") == "running":
        raise HTTPException(
            status_code=409, 
            detail="Pipeline is already running"
        )

    seed_default_competitors()
    competitors = request.competitors or get_tracked_domains()
    if not competitors:
        settings = get_settings()
        competitors = settings.default_competitors

    run_id = str(uuid.uuid4())
    start_run(run_id, competitors)
    background_tasks.add_task(_execute_pipeline, run_id, competitors)

    return RunResponse(status="started", run_id=run_id)


@router.get("/status", summary="Pipeline status for dashboard polling")
async def get_status() -> dict[str, Any]:
    """Spec-aligned status for AgentStatusBar."""
    return get_spec_status_response()


@router.get("/competitors", summary="Latest intelligence per competitor")
async def list_competitors_intel() -> list[dict[str, Any]]:
    """Spec-aligned competitor cards data."""
    seed_default_competitors()
    return get_competitors_response()


@router.get("/runs", summary="Last 10 pipeline runs")
async def list_runs() -> list[dict[str, Any]]:
    """Spec-aligned run history."""
    return get_spec_run_history(limit=10)


# ---------------------------------------------------------------------------
# Competitor management CRUD
# ---------------------------------------------------------------------------


@router.get("/tracked-competitors", summary="List tracked competitor domains")
async def get_tracked_competitors() -> list[dict[str, Any]]:
    """Return all competitor domains being tracked."""
    seed_default_competitors()
    return list_tracked_competitors()


@router.post("/tracked-competitors", summary="Add a competitor to track")
async def add_competitor(body: AddCompetitorRequest) -> dict[str, Any]:
    """Add a new competitor domain to the tracking list."""
    result = add_tracked_competitor(body.domain)
    logger.info("Competitor added: %s", body.domain)
    return result


@router.delete(
    "/tracked-competitors/{domain:path}",
    summary="Remove a tracked competitor",
)
async def delete_competitor(domain: str) -> dict[str, str]:
    """Remove a competitor from the tracking list."""
    removed = remove_tracked_competitor(domain)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Competitor '{domain}' not found")
    logger.info("Competitor removed: %s", domain)
    return {"status": "deleted", "domain": domain}


# ---------------------------------------------------------------------------
# Competitor detail (deep dive)
# ---------------------------------------------------------------------------


@router.get(
    "/competitors/{domain:path}/details",
    summary="Full analysis details for one competitor",
)
async def competitor_details(domain: str) -> dict[str, Any]:
    """Return raw_data, signals, and analysis JSON for a specific competitor."""
    from competeiq.state import get_state

    state = get_state()
    result = state.get("last_run_result") or {}

    raw_data = (result.get("raw_data") or {}).get(domain, {})
    signals = (result.get("signals") or {}).get(domain, [])
    analysis = (result.get("analysis") or {}).get(domain, {})
    report_urls = (result.get("report_urls") or {}).get(domain)

    return {
        "domain": domain,
        "raw_data": raw_data,
        "signals": signals,
        "analysis": analysis,
        "notion_url": report_urls,
    }


# ---------------------------------------------------------------------------
# Server-Sent Events
# ---------------------------------------------------------------------------


@router.get("/events", summary="SSE stream of pipeline events")
async def sse_events():
    """
    Server-Sent Events endpoint for real-time pipeline updates.

    Streams JSON events as the pipeline progresses through each agent.
    Sends keepalive comments every 30s to prevent timeouts.
    """
    return StreamingResponse(
        subscribe_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
