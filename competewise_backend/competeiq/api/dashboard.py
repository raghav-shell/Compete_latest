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


# ---------------------------------------------------------------------------
# User Integration Settings
# ---------------------------------------------------------------------------

# Keys that users are allowed to configure
_ALLOWED_SETTINGS = {"slack_webhook_url", "omium_api_key"}


def _mask_value(value: str) -> str:
    """Mask a secret value for display: show first 10 + last 4 chars."""
    if len(value) <= 16:
        return value[:4] + "•" * (len(value) - 4)
    return value[:10] + "•" * 6 + value[-4:]


class UpdateSettingsRequest(BaseModel):
    """Body for PUT /settings."""
    slack_webhook_url: Optional[str] = None
    omium_api_key: Optional[str] = None


@router.get("/settings", summary="Get current integration settings")
async def get_settings_endpoint() -> dict[str, Any]:
    """Return the current integration settings with masked values."""
    from competeiq.db import get_all_user_settings

    settings = get_settings()
    user_settings = get_all_user_settings()

    def _resolve(key: str, env_fallback: str) -> dict[str, Any]:
        user_val = user_settings.get(key)
        if user_val:
            return {"value": _mask_value(user_val), "source": "user", "configured": True}
        if env_fallback:
            return {"value": _mask_value(env_fallback), "source": "default", "configured": True}
        return {"value": "", "source": "none", "configured": False}

    return {
        "slack_webhook_url": _resolve("slack_webhook_url", settings.slack_webhook_url),
        "omium_api_key": _resolve("omium_api_key", settings.omium_api_key),
    }


@router.put("/settings", summary="Update integration settings")
async def update_settings_endpoint(body: UpdateSettingsRequest) -> dict[str, str]:
    """Upsert one or more user integration settings."""
    from competeiq.db import set_user_setting

    updated = []

    if body.slack_webhook_url is not None:
        val = body.slack_webhook_url.strip()
        if val:
            set_user_setting("slack_webhook_url", val)
            updated.append("slack_webhook_url")
        else:
            # Empty string = delete / revert to default
            try:
                from competeiq.db import get_supabase
                get_supabase().table("user_settings").delete().eq("key", "slack_webhook_url").execute()
                updated.append("slack_webhook_url (reset to default)")
            except Exception:
                pass

    if body.omium_api_key is not None:
        val = body.omium_api_key.strip()
        if val:
            set_user_setting("omium_api_key", val)
            updated.append("omium_api_key")
        else:
            try:
                from competeiq.db import get_supabase
                get_supabase().table("user_settings").delete().eq("key", "omium_api_key").execute()
                updated.append("omium_api_key (reset to default)")
            except Exception:
                pass

    return {"status": "updated", "fields": ", ".join(updated) if updated else "none"}


@router.post("/settings/test-slack", summary="Send a test Slack message")
async def test_slack_connection() -> dict[str, Any]:
    """Send a test message to the configured Slack webhook."""
    from competeiq.db import get_user_setting
    from competeiq.services.slack_service import SlackService

    settings = get_settings()
    webhook_url = get_user_setting("slack_webhook_url") or settings.slack_webhook_url

    if not webhook_url:
        raise HTTPException(status_code=400, detail="No Slack webhook URL configured")

    slack = SlackService(webhook_url)
    payload = {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "✅ *CompeteIQ Test* — Your Slack integration is working!"
                }
            }
        ]
    }
    success = await slack.send_competitive_brief(payload)

    if success:
        return {"status": "success", "message": "Test message sent to Slack!"}
    raise HTTPException(status_code=502, detail="Failed to send test message to Slack")

