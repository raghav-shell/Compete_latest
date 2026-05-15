"""Supabase database client — replaces all SQLite calls across the codebase."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from supabase import create_client, Client

from competeiq.config import get_settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase() -> Client:
    """Return a cached Supabase client singleton."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set in .env"
            )
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


# ---------------------------------------------------------------------------
# Run history
# ---------------------------------------------------------------------------


def insert_run(
    run_id: str,
    competitors: list[str],
    status: str,
    error_message: str | None = None,
    *,
    signals_found: int = 0,
    notion_url: str | None = None,
    slack_message: str | None = None,
) -> None:
    """Insert a completed pipeline run into Supabase."""
    sb = get_supabase()
    sb.table("run_history").insert(
        {
            "run_id": run_id,
            "competitors": ",".join(competitors),
            "status": status,
            "error_message": error_message,
            "signals_found": signals_found,
            "notion_url": notion_url,
            "slack_message": slack_message,
        }
    ).execute()
    logger.info("Recorded run %s to Supabase", run_id)


def get_runs(limit: int = 10) -> list[dict[str, Any]]:
    """Fetch recent runs, newest first."""
    sb = get_supabase()
    response = (
        sb.table("run_history")
        .select("*")
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def get_runs_spec(limit: int = 10) -> list[dict[str, Any]]:
    """Fetch runs formatted for the frontend /runs endpoint."""
    rows = get_runs(limit)
    runs: list[dict[str, Any]] = []
    for row in rows:
        competitors_raw = row.get("competitors") or ""
        competitors = [
            name.strip() for name in competitors_raw.split(",") if name.strip()
        ]
        runs.append(
            {
                "id": row["run_id"],
                "date": row.get("started_at"),
                "competitors_count": len(competitors),
                "signals_found": row.get("signals_found") or 0,
                "status": row["status"],
                "notion_url": row.get("notion_url"),
                "slack_message": row.get("slack_message"),
            }
        )
    return runs


def get_runs_legacy(limit: int = 20) -> list[dict[str, Any]]:
    """Fetch runs formatted for the legacy /api/runs endpoint."""
    rows = get_runs(limit)
    runs: list[dict[str, Any]] = []
    for row in rows:
        competitors_raw = row.get("competitors") or ""
        competitors = [
            name.strip() for name in competitors_raw.split(",") if name.strip()
        ]
        runs.append(
            {
                "run_id": row["run_id"],
                "competitors": competitors,
                "status": row["status"],
                "error_message": row.get("error_message"),
                "started_at": row.get("started_at"),
                "completed_at": row.get("completed_at"),
            }
        )
    return runs


# ---------------------------------------------------------------------------
# Tracked competitors
# ---------------------------------------------------------------------------


def insert_competitor(domain: str, display_name: str) -> dict[str, Any]:
    """Add a tracked competitor (upsert on domain)."""
    sb = get_supabase()
    response = (
        sb.table("tracked_competitors")
        .upsert(
            {"domain": domain, "display_name": display_name},
            on_conflict="domain",
        )
        .execute()
    )
    data = response.data
    if data:
        return data[0]
    return {"domain": domain, "display_name": display_name, "added_at": None}


def delete_competitor(domain: str) -> bool:
    """Remove a tracked competitor. Returns True if a row was deleted."""
    sb = get_supabase()
    response = (
        sb.table("tracked_competitors")
        .delete()
        .eq("domain", domain)
        .execute()
    )
    return bool(response.data)


def get_competitors() -> list[dict[str, Any]]:
    """List all tracked competitors, oldest first."""
    sb = get_supabase()
    response = (
        sb.table("tracked_competitors")
        .select("domain, display_name, added_at")
        .order("added_at", desc=False)
        .execute()
    )
    return response.data or []


def get_competitor_domains() -> list[str]:
    """Return just the domain strings."""
    return [c["domain"] for c in get_competitors()]


# ---------------------------------------------------------------------------
# Competitor snapshots (used by Signal agent)
# ---------------------------------------------------------------------------


def get_latest_snapshot(competitor: str) -> str | None:
    """Get the most recent snapshot JSON string for a competitor."""
    sb = get_supabase()
    response = (
        sb.table("competitor_snapshots")
        .select("snapshot")
        .eq("competitor", competitor)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return response.data[0]["snapshot"]
    return None


def save_snapshot(competitor: str, snapshot_json: str) -> None:
    """Insert a new snapshot for a competitor."""
    sb = get_supabase()
    sb.table("competitor_snapshots").insert(
        {
            "competitor": competitor,
            "snapshot": snapshot_json,
        }
    ).execute()
    logger.info("Saved snapshot for %s to Supabase", competitor)


# ---------------------------------------------------------------------------
# User settings (dynamic integrations)
# ---------------------------------------------------------------------------


def get_user_setting(key: str) -> str | None:
    """Fetch a single user setting by key. Returns None if not found."""
    try:
        sb = get_supabase()
        response = (
            sb.table("user_settings")
            .select("value")
            .eq("key", key)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]["value"]
    except Exception as exc:
        logger.warning("Failed to read user setting '%s': %s", key, exc)
    return None


def get_all_user_settings() -> dict[str, str]:
    """Fetch all user settings as a dict."""
    try:
        sb = get_supabase()
        response = sb.table("user_settings").select("key, value").execute()
        return {row["key"]: row["value"] for row in (response.data or [])}
    except Exception as exc:
        logger.warning("Failed to read user settings: %s", exc)
        return {}


def set_user_setting(key: str, value: str) -> None:
    """Upsert a user setting."""
    sb = get_supabase()
    sb.table("user_settings").upsert(
        {"key": key, "value": value},
        on_conflict="key",
    ).execute()
    logger.info("Saved user setting '%s'", key)
