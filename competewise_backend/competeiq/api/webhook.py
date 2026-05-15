"""Webhook endpoints for triggering competitive intelligence runs."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field

from competeiq.pipeline.runner import PipelineRunner
from competeiq.state import start_run, update_state
from competeiq.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


class TriggerRequest(BaseModel):
    """Payload for manually triggering a pipeline run."""

    competitors: list[str] = Field(
        ...,
        min_length=1,
        description="Competitor names to analyze",
        examples=[["Linear", "Notion"]],
    )
    force: bool = Field(
        default=False,
        description="Force a new run even if one is already in progress",
    )


class TriggerResponse(BaseModel):
    """Immediate acknowledgement after accepting a run request."""

    status: str
    run_id: str
    message: str


async def run_pipeline(run_id: str, competitors: list[str]) -> None:
    """
    Background task: execute the full LangGraph pipeline.

    Updates global state as execution progresses and on completion.
    """
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


@router.post(
    "/trigger",
    response_model=TriggerResponse,
    summary="Trigger a competitive intelligence run",
)
async def trigger_pipeline(
    request: TriggerRequest,
    background_tasks: BackgroundTasks,
) -> TriggerResponse:
    """
    Trigger the CompeteIQ pipeline.

    Accepts ``{"competitors": ["Linear", "Notion"], "force": false}`` and
    returns immediately with a ``run_id``. The pipeline runs in the background.
    """
    run_id = str(uuid.uuid4())
    start_run(run_id, request.competitors)

    logger.info(
        "Webhook triggered",
        extra={"run_id": run_id, "competitors": request.competitors},
    )

    background_tasks.add_task(run_pipeline, run_id, request.competitors)

    return TriggerResponse(
        status="accepted",
        run_id=run_id,
        message="Pipeline triggered. Check /api/status for progress.",
    )


# ---------------------------------------------------------------------------
# Schedule endpoints (/api/schedule)
# ---------------------------------------------------------------------------

schedule_router = APIRouter(prefix="/api/schedule", tags=["schedule"])


class ScheduleSetRequest(BaseModel):
    """Payload for updating the cron schedule."""

    hour: int = Field(default=9, ge=0, le=23, description="Hour of day (0–23)")
    minute: int = Field(default=0, ge=0, le=59, description="Minute of hour (0–59)")
    competitors: list[str] = Field(
        default=["Linear", "Notion"],
        min_length=1,
        description="Competitors to analyze on each scheduled run",
    )


@schedule_router.post("/set", summary="Set or update the pipeline cron schedule")
async def set_schedule_endpoint(request: ScheduleSetRequest) -> dict[str, Any]:
    """
    Reschedule the automated pipeline job.

    Accepts ``{"hour": 9, "minute": 0, "competitors": ["Linear", "Notion"]}``.
    """
    from competeiq.scheduler import set_schedule

    return set_schedule(
        hour=request.hour,
        minute=request.minute,
        competitors=request.competitors,
    )


@schedule_router.get("/status", summary="Get current cron schedule status")
async def get_schedule_status_endpoint() -> dict[str, Any]:
    """Return schedule config and next scheduled run time."""
    from competeiq.scheduler import get_schedule_status

    return get_schedule_status()
