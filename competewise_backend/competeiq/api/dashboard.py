"""Dashboard API — spec-aligned endpoints for the React frontend."""

from __future__ import annotations

import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field

from competeiq.config import get_settings
from competeiq.pipeline.runner import PipelineRunner
from competeiq.state import (
    get_competitors_response,
    get_spec_run_history,
    get_spec_status_response,
    start_run,
    update_state,
)
from competeiq.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["dashboard"])


class RunRequest(BaseModel):
    """Optional competitor list for POST /run."""

    competitors: Optional[List[str]] = Field(
        default=None,
        description="Competitor domains or names; uses COMPETITORS env default if omitted",
        examples=[["linear.app", "notion.so", "vercel.com"]],
    )


class RunResponse(BaseModel):
    status: str
    run_id: str


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


def _build_slack_preview(analysis: dict[str, str], competitors: list[str]) -> str:
    lines = [f"Weekly Competitive Intel — {len(competitors)} competitors monitored"]
    for name in competitors:
        text = analysis.get(name, "")
        if text:
            lines.append(f"• {name}: {text[:120]}{'…' if len(text) > 120 else ''}")
    return "\n".join(lines) if len(lines) > 1 else lines[0]


@router.post("/run", response_model=RunResponse, summary="Trigger pipeline run")
async def run_pipeline(
    request: RunRequest,
    background_tasks: BackgroundTasks,
) -> RunResponse:
    """
    Start the full competitive intelligence pipeline (non-blocking).

    Uses ``COMPETITORS`` from env when body is empty.
    """
    settings = get_settings()
    competitors = request.competitors or settings.default_competitors
    run_id = str(uuid.uuid4())

    start_run(run_id, competitors)
    background_tasks.add_task(_execute_pipeline, run_id, competitors)

    return RunResponse(status="started", run_id=run_id)


@router.get("/status", summary="Pipeline status for dashboard polling")
async def get_status() -> dict[str, Any]:
    """Spec-aligned status for AgentStatusBar."""
    return get_spec_status_response()


@router.get("/competitors", summary="Latest intelligence per competitor")
async def list_competitors() -> list[dict[str, Any]]:
    """Spec-aligned competitor cards data."""
    return get_competitors_response()


@router.get("/runs", summary="Last 10 pipeline runs")
async def list_runs() -> list[dict[str, Any]]:
    """Spec-aligned run history."""
    return get_spec_run_history(limit=10)
