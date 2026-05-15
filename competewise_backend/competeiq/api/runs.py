"""Run history API endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from competeiq.state import get_run_history

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("", summary="List recent pipeline runs")
async def list_runs() -> list[dict[str, Any]]:
    """
    Return the last 20 pipeline runs from history.

    Each run includes run_id, competitors (list), status, error_message,
    started_at, and completed_at. Newest runs first.
    """
    return get_run_history(limit=20)
