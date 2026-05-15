"""Thread-safe global pipeline status for API consumers."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, AsyncGenerator

RUN_HISTORY_DB = str(Path(__file__).resolve().parent / "db" / "snapshots.db")

_state_lock = Lock()
_state: dict[str, Any] = {
    "status": "idle",
    "run_id": None,
    "competitors": [],
    "current_step": "",
    "current_agent": "done",
    "progress": 0,
    "started_at": None,
    "last_run": None,
    "last_run_result": None,
    "error_message": None,
}

_AGENT_FROM_STEP = (
    ("scout", "scout"),
    ("signal", "signal"),
    ("analyst", "analyst"),
    ("report", "report"),
    ("notifier", "notifier"),
    ("slack", "notifier"),
    ("notion", "report"),
    ("complete", "done"),
    ("fail", "done"),
    ("initial", "scout"),
)


def _normalize_status(raw: str) -> str:
    """Map internal status to spec values: idle|running|completed|failed."""
    if raw == "error":
        return "failed"
    if raw in ("idle", "running", "completed", "failed"):
        return raw
    return "idle"


def _step_to_agent(current_step: str) -> str:
    step = (current_step or "").lower()
    for needle, agent in _AGENT_FROM_STEP:
        if needle in step:
            return agent
    return "scout"


def _display_name(competitor: str) -> str:
    """linear.app -> Linear"""
    base = competitor.split(".")[0].split("/")[-1]
    return base.capitalize() if base else competitor


def _severity_from_signals(count: int) -> str:
    if count >= 3:
        return "high"
    if count >= 1:
        return "medium"
    return "low"


def get_state() -> dict[str, Any]:
    """Return a copy of the current global pipeline state."""
    with _state_lock:
        return _state.copy()


def update_state(key: str, value: Any) -> None:
    """Update a single state field (thread-safe) and broadcast via SSE."""
    with _state_lock:
        _state[key] = value
        if key == "current_step":
            _state["current_agent"] = _step_to_agent(str(value))
        if key == "status" and value in ("completed", "idle"):
            _state["last_run"] = datetime.now(timezone.utc).isoformat()

    # Broadcast to SSE subscribers (skip large blobs like last_run_result)
    if key != "last_run_result":
        _broadcast_event("state_update", {"key": key, "value": value})


# ---------------------------------------------------------------------------
# SSE Event Bus
# ---------------------------------------------------------------------------

_subscribers: list[asyncio.Queue] = []
_sub_lock = Lock()


def _broadcast_event(event_type: str, data: dict[str, Any]) -> None:
    """Push an event to all active SSE subscribers."""
    payload = {"type": event_type, "data": data}
    with _sub_lock:
        dead: list[asyncio.Queue] = []
        for q in _subscribers:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            _subscribers.remove(q)


async def subscribe_events() -> AsyncGenerator[str, None]:
    """Yield SSE-formatted strings as pipeline events arrive."""
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    with _sub_lock:
        _subscribers.append(q)
    try:
        # Send initial state snapshot
        with _state_lock:
            snapshot = {
                "status": _state["status"],
                "current_agent": _state.get("current_agent", "done"),
                "progress": _state["progress"],
                "current_step": _state["current_step"],
                "run_id": _state["run_id"],
            }
        yield f"data: {json.dumps({'type': 'snapshot', 'data': snapshot})}\n\n"

        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=30.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Send keepalive
                yield ": keepalive\n\n"
    finally:
        with _sub_lock:
            if q in _subscribers:
                _subscribers.remove(q)


def start_run(run_id: str, competitors: list[str]) -> None:
    """Initialize state when a new pipeline run starts."""
    now = datetime.now(timezone.utc).isoformat()
    with _state_lock:
        _state.update(
            {
                "status": "running",
                "run_id": run_id,
                "competitors": competitors,
                "current_step": "Initializing...",
                "current_agent": "scout",
                "progress": 0,
                "started_at": now,
                "error_message": None,
            }
        )
    # Broadcast the run start via SSE
    _broadcast_event("run_started", {
        "run_id": run_id,
        "competitors": competitors,
        "status": "running",
    })


def get_status_response() -> dict[str, Any]:
    """Legacy payload for ``GET /api/status``."""
    with _state_lock:
        return {
            "status": _state["status"],
            "run_id": _state["run_id"],
            "competitors": _state["competitors"],
            "current_step": _state["current_step"],
            "progress": _state["progress"],
            "last_run": _state["last_run"],
            "last_run_result": _state["last_run_result"],
            "error_message": _state["error_message"],
        }


def get_spec_status_response() -> dict[str, Any]:
    """Spec-aligned payload for ``GET /status``."""
    with _state_lock:
        raw_status = _state["status"]
        return {
            "status": _normalize_status(raw_status),
            "current_agent": _state.get("current_agent") or _step_to_agent(_state["current_step"]),
            "run_id": _state["run_id"],
            "started_at": _state["started_at"],
            "competitors": list(_state["competitors"]),
            "progress": _state["progress"],
            "error_message": _state["error_message"],
        }


def get_competitors_response() -> list[dict[str, Any]]:
    """Build competitor card data from tracked competitors + last run result."""
    # Primary source: tracked competitors from DB
    tracked = get_tracked_domains()

    with _state_lock:
        result = _state.get("last_run_result") or {}
        # Fall back to running state or config defaults
        if not tracked:
            from competeiq.config import get_settings
            settings = get_settings()
            tracked = _state["competitors"] or result.get("competitors") or settings.default_competitors
        last_run = _state.get("last_run")

    signals: dict[str, list] = result.get("signals") or {}
    analysis: dict[str, Any] = result.get("analysis") or {}
    report_urls: dict[str, str] = result.get("report_urls") or {}

    cards: list[dict[str, Any]] = []
    for comp in tracked:
        signal_list = signals.get(comp, [])
        signal_count = len(signal_list) if isinstance(signal_list, list) else 0

        # Extract top_insight from analysis (can be dict or string)
        comp_analysis = analysis.get(comp)
        if isinstance(comp_analysis, dict):
            top_insight = (comp_analysis.get("top_insight") or comp_analysis.get("summary") or "").strip()
        elif isinstance(comp_analysis, str):
            top_insight = comp_analysis.strip()
        else:
            top_insight = ""

        if not top_insight and signal_count:
            top_insight = f"{signal_count} change{'s' if signal_count != 1 else ''} detected"
        if not top_insight:
            top_insight = "Run analysis to gather intelligence"

        cards.append(
            {
                "name": _display_name(comp),
                "url": comp if "." in comp else f"{comp.lower()}.com",
                "signals_count": signal_count,
                "top_insight": top_insight[:500],
                "severity": _severity_from_signals(signal_count),
                "notion_url": report_urls.get(comp),
                "last_run": last_run,
            }
        )
    return cards


_db_lock = Lock()
_run_history_initialized = False


def _init_run_history_table() -> None:
    """Create the run_history and tracked_competitors tables if they do not exist."""
    global _run_history_initialized
    if _run_history_initialized:
        return

    db_path = Path(RUN_HISTORY_DB)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with _db_lock:
        if _run_history_initialized:
            return
        conn = sqlite3.connect(RUN_HISTORY_DB)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS run_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    competitors TEXT NOT NULL,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    signals_found INTEGER DEFAULT 0,
                    notion_url TEXT,
                    slack_message TEXT,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tracked_competitors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain TEXT NOT NULL UNIQUE,
                    display_name TEXT NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            for col, typedef in (
                ("signals_found", "INTEGER DEFAULT 0"),
                ("notion_url", "TEXT"),
                ("slack_message", "TEXT"),
            ):
                try:
                    conn.execute(
                        f"ALTER TABLE run_history ADD COLUMN {col} {typedef}"
                    )
                except sqlite3.OperationalError:
                    pass
            conn.commit()
            _run_history_initialized = True
        finally:
            conn.close()


def record_run(
    run_id: str,
    competitors: list[str],
    status: str,
    error_message: str | None = None,
    *,
    signals_found: int = 0,
    notion_url: str | None = None,
    slack_message: str | None = None,
) -> None:
    """Persist a completed pipeline run to SQLite run history."""
    _init_run_history_table()
    competitors_csv = ",".join(competitors)

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        try:
            conn.execute(
                """
                INSERT INTO run_history (
                    run_id, competitors, status, error_message,
                    signals_found, notion_url, slack_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    competitors_csv,
                    status,
                    error_message,
                    signals_found,
                    notion_url,
                    slack_message,
                ),
            )
            conn.commit()
        finally:
            conn.close()


def get_run_history(limit: int = 20) -> list[dict[str, Any]]:
    """Legacy run history for ``GET /api/runs``."""
    _init_run_history_table()

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute(
                """
                SELECT run_id, competitors, status, error_message,
                       started_at, completed_at
                FROM run_history
                ORDER BY started_at DESC, id DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = cursor.fetchall()
        finally:
            conn.close()

    runs: list[dict[str, Any]] = []
    for row in rows:
        competitors_raw = row["competitors"] or ""
        competitors = [
            name.strip() for name in competitors_raw.split(",") if name.strip()
        ]
        runs.append(
            {
                "run_id": row["run_id"],
                "competitors": competitors,
                "status": row["status"],
                "error_message": row["error_message"],
                "started_at": row["started_at"],
                "completed_at": row["completed_at"],
            }
        )
    return runs


def get_spec_run_history(limit: int = 10) -> list[dict[str, Any]]:
    """Spec-aligned run history for ``GET /runs``."""
    _init_run_history_table()

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute(
                """
                SELECT run_id, competitors, status, signals_found,
                       notion_url, slack_message, started_at
                FROM run_history
                ORDER BY started_at DESC, id DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = cursor.fetchall()
        except sqlite3.OperationalError:
            return []
        finally:
            conn.close()

    runs: list[dict[str, Any]] = []
    for row in rows:
        competitors_raw = row["competitors"] or ""
        competitors = [
            name.strip() for name in competitors_raw.split(",") if name.strip()
        ]
        runs.append(
            {
                "id": row["run_id"],
                "date": row["started_at"],
                "competitors_count": len(competitors),
                "signals_found": row["signals_found"] or 0,
                "status": row["status"],
                "notion_url": row["notion_url"],
                "slack_message": row["slack_message"],
            }
        )
    return runs


# ---------------------------------------------------------------------------
# Tracked competitors CRUD
# ---------------------------------------------------------------------------

def add_tracked_competitor(domain: str) -> dict[str, Any]:
    """Add a competitor domain to the tracking list. Returns the new record."""
    _init_run_history_table()
    domain = domain.strip().lower()
    display_name = _display_name(domain)

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute(
                "INSERT OR IGNORE INTO tracked_competitors (domain, display_name) VALUES (?, ?)",
                (domain, display_name),
            )
            conn.commit()
            row = conn.execute(
                "SELECT domain, display_name, added_at FROM tracked_competitors WHERE domain = ?",
                (domain,),
            ).fetchone()
        finally:
            conn.close()

    if row is None:
        return {"domain": domain, "display_name": display_name, "added_at": None}
    return dict(row)


def remove_tracked_competitor(domain: str) -> bool:
    """Remove a competitor from the tracking list. Returns True if deleted."""
    _init_run_history_table()
    domain = domain.strip().lower()

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        try:
            cursor = conn.execute(
                "DELETE FROM tracked_competitors WHERE domain = ?",
                (domain,),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def list_tracked_competitors() -> list[dict[str, Any]]:
    """Return all tracked competitor domains."""
    _init_run_history_table()

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                "SELECT domain, display_name, added_at FROM tracked_competitors ORDER BY added_at ASC"
            ).fetchall()
        finally:
            conn.close()

    return [dict(r) for r in rows]


def get_tracked_domains() -> list[str]:
    """Return just the domain strings for tracked competitors."""
    return [c["domain"] for c in list_tracked_competitors()]


def seed_default_competitors() -> None:
    """Seed the tracked_competitors table with defaults from config if empty."""
    from competeiq.config import get_settings

    existing = list_tracked_competitors()
    if existing:
        return

    settings = get_settings()
    for domain in settings.default_competitors:
        add_tracked_competitor(domain)
