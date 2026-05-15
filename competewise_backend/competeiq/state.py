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
    "progress": 0,
    "last_run": None,
    "last_run_result": None,
    "error_message": None,
}


def get_state() -> dict[str, Any]:
    """Return a copy of the current global pipeline state."""
    with _state_lock:
        return _state.copy()


def update_state(key: str, value: Any) -> None:
    """Update a single state field (thread-safe)."""
    with _state_lock:
        _state[key] = value
        if key == "status" and value == "idle":
            _state["last_run"] = datetime.now(timezone.utc).isoformat()


def get_status_response() -> dict[str, Any]:
    """Return status payload for ``GET /api/status``."""
    with _state_lock:
        return {
            "status": _state["status"],
            "run_id": _state["run_id"],
            "competitors": _state["competitors"],
            "current_step": _state["current_step"],
            "progress": _state["progress"],
            "last_run": _state["last_run"],
            "error_message": _state["error_message"],
        }


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
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
            _run_history_initialized = True
        finally:
            conn.close()


def record_run(
    run_id: str,
    competitors: list[str],
    status: str,
    error_message: str | None = None,
) -> None:
    """
    Persist a completed pipeline run to SQLite run history.

    Args:
        run_id: Unique run identifier.
        competitors: Competitor names analyzed in this run.
        status: Final status (e.g. ``success`` or ``error``).
        error_message: Optional error detail when status is ``error``.
    """
    _init_run_history_table()
    competitors_csv = ",".join(competitors)

    with _db_lock:
        conn = sqlite3.connect(RUN_HISTORY_DB)
        try:
            conn.execute(
                """
                INSERT INTO run_history (
                    run_id, competitors, status, error_message
                ) VALUES (?, ?, ?, ?)
                """,
                (run_id, competitors_csv, status, error_message),
            )
            conn.commit()
        finally:
            conn.close()


def get_run_history(limit: int = 20) -> list[dict[str, Any]]:
    """
    Return the most recent pipeline runs from run history.

    Args:
        limit: Maximum number of rows to return (default 20).

    Returns:
        List of run dicts ordered by ``started_at`` descending.
    """
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
