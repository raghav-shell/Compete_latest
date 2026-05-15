"""Thread-safe global pipeline status for API consumers."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

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
    """Update a single state field (thread-safe)."""
    with _state_lock:
        _state[key] = value
        if key == "current_step":
            _state["current_agent"] = _step_to_agent(str(value))
        if key == "status" and value in ("completed", "idle"):
            _state["last_run"] = datetime.now(timezone.utc).isoformat()


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
    """Build competitor card data from last run result or defaults."""
    from competeiq.config import get_settings

    settings = get_settings()
    with _state_lock:
        result = _state.get("last_run_result") or {}
        competitors = _state["competitors"] or result.get("competitors") or settings.default_competitors
        last_run = _state.get("last_run")

    signals: dict[str, list] = result.get("signals") or {}
    analysis: dict[str, str] = result.get("analysis") or {}
    report_urls: dict[str, str] = result.get("report_urls") or {}

    cards: list[dict[str, Any]] = []
    for comp in competitors:
        signal_list = signals.get(comp, [])
        signal_count = len(signal_list) if isinstance(signal_list, list) else 0
        top_insight = (analysis.get(comp) or "").strip()
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
    """Create the run_history table if it does not exist."""
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
