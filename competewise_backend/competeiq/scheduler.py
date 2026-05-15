"""APScheduler cron jobs for automated pipeline runs."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from competeiq.pipeline.runner import PipelineRunner
from competeiq.state import update_state
from competeiq.utils.logger import get_logger

logger = get_logger(__name__)

DEFAULT_COMPETITORS: list[str] = ["Linear", "Notion"]
SCHEDULED_JOB_ID = "scheduled_pipeline_run"

scheduler = AsyncIOScheduler()

_schedule_config: dict[str, Any] = {
    "hour": 9,
    "minute": 0,
    "competitors": DEFAULT_COMPETITORS.copy(),
}


async def scheduled_pipeline_run() -> None:
    """
    Cron job: run the full CompeteIQ pipeline on a schedule.

    Updates global state before/after execution; logs errors without raising.
    """
    from competeiq.state import get_state, get_tracked_domains, seed_default_competitors

    current_state = get_state()
    if current_state.get("status") == "running":
        logger.warning("Scheduled run skipped: Pipeline is already running")
        return

    run_id = str(uuid.uuid4())
    seed_default_competitors()
    tracked = get_tracked_domains()
    competitors: list[str] = tracked if tracked else list(_schedule_config["competitors"])

    update_state("status", "running")
    update_state("run_id", run_id)
    update_state("competitors", competitors)
    update_state("current_step", "Initializing (scheduled)...")
    update_state("progress", 0)
    update_state("error_message", None)

    logger.info(
        "Scheduled pipeline run started",
        extra={"run_id": run_id, "competitors": competitors},
    )

    try:
        runner = PipelineRunner()
        result = await runner.run(run_id=run_id, competitors=competitors)

        update_state("status", "idle")
        update_state("progress", 100)
        update_state("current_step", "Complete")
        update_state("last_run_result", result)
        update_state("error_message", None)

        logger.info("Scheduled pipeline run completed", extra={"run_id": run_id})

    except Exception as exc:
        logger.error(
            "Scheduled pipeline run failed: %s",
            exc,
            extra={"run_id": run_id},
        )
        update_state("status", "error")
        update_state("current_step", "Failed")
        update_state("error_message", str(exc))


def _next_run_iso() -> str | None:
    """Return the next scheduled run time as an ISO-8601 string, if known."""
    job = scheduler.get_job(SCHEDULED_JOB_ID)
    if job is None or job.next_run_time is None:
        return None
    next_run = job.next_run_time
    if next_run.tzinfo is None:
        next_run = next_run.replace(tzinfo=timezone.utc)
    return next_run.isoformat()


def add_default_job() -> None:
    """Register the default daily 9:00 AM pipeline job (does not start scheduler)."""
    scheduler.add_job(
        scheduled_pipeline_run,
        CronTrigger(hour=_schedule_config["hour"], minute=_schedule_config["minute"]),
        id=SCHEDULED_JOB_ID,
        replace_existing=True,
    )


def start_scheduler() -> None:
    """Add the default job and start the AsyncIO scheduler."""
    if scheduler.get_job(SCHEDULED_JOB_ID) is None:
        add_default_job()
    if not scheduler.running:
        scheduler.start()
    logger.info(
        "Scheduler started",
        extra={
            "next_run": _next_run_iso(),
            "hour": _schedule_config["hour"],
            "minute": _schedule_config["minute"],
        },
    )


def shutdown_scheduler() -> None:
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")


def set_schedule(hour: int, minute: int, competitors: list[str]) -> dict[str, Any]:
    """
    Reschedule the pipeline cron job.

    Args:
        hour: Hour of day (0–23).
        minute: Minute of hour (0–59).
        competitors: Competitor names to analyze on each run.

    Returns:
        Dict with status and next_run ISO timestamp.
    """
    _schedule_config["hour"] = hour
    _schedule_config["minute"] = minute
    _schedule_config["competitors"] = competitors

    trigger = CronTrigger(hour=hour, minute=minute)

    if scheduler.get_job(SCHEDULED_JOB_ID) is None:
        scheduler.add_job(
            scheduled_pipeline_run,
            trigger,
            id=SCHEDULED_JOB_ID,
            replace_existing=True,
        )
    else:
        scheduler.reschedule_job(SCHEDULED_JOB_ID, trigger=trigger)

    next_run = _next_run_iso()
    logger.info(
        "Pipeline schedule updated",
        extra={"hour": hour, "minute": minute, "competitors": competitors, "next_run": next_run},
    )

    return {"status": "scheduled", "next_run": next_run}


def get_schedule_status() -> dict[str, Any]:
    """Return current schedule configuration and next run time."""
    job = scheduler.get_job(SCHEDULED_JOB_ID)
    scheduled = job is not None and scheduler.running

    return {
        "scheduled": scheduled,
        "next_run": _next_run_iso(),
        "competitors": list(_schedule_config["competitors"]),
        "hour": _schedule_config["hour"],
        "minute": _schedule_config["minute"],
    }
