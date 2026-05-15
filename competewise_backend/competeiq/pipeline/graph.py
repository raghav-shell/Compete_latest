"""LangGraph multi-agent pipeline: Scout and Signal agents."""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from difflib import unified_diff
from pathlib import Path
from langgraph.graph import END, START, StateGraph
from tavily import TavilyClient

from competeiq.config import get_settings
from competeiq.pipeline.state import GraphState, create_initial_state

# ---------------------------------------------------------------------------
# SECTION 1: Imports (stdlib + third-party; config via competeiq.config)
# ---------------------------------------------------------------------------

DEFAULT_SNAPSHOTS_DB = "competeiq/db/snapshots.db"

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SECTION 2: GraphState (see competeiq.pipeline.state)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# SECTION 3: SQLite Setup Function
# ---------------------------------------------------------------------------


def init_snapshots_db(db_path: str = DEFAULT_SNAPSHOTS_DB) -> None:
    """
    Initialize SQLite database for competitor snapshots.

    Creates the parent directory and table if they do not exist.

    Args:
        db_path: Path to SQLite database file.
    """
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS competitor_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            competitor TEXT NOT NULL,
            snapshot TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()
    logger.info("Snapshots database initialized at %s", db_path)


# ---------------------------------------------------------------------------
# SECTION 4: Scout Agent Function
# ---------------------------------------------------------------------------


async def scout_agent(state: GraphState) -> GraphState:
    """
    Crawl competitor websites using the Tavily API.

    For each competitor, run search queries (website, changelog, pricing, jobs),
    aggregate result text into ``state.raw_data``, and record failures in
    ``state.errors``.

    Args:
        state: Current graph state.

    Returns:
        Updated state with ``raw_data`` populated.
    """
    settings = get_settings()

    if not settings.tavily_api_key:
        msg = "Scout agent: TAVILY_API_KEY is not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    client = TavilyClient(api_key=settings.tavily_api_key)

    logger.info(
        "Scout agent: Starting crawl for %d competitors",
        len(state["competitors"]),
    )

    for competitor in state["competitors"]:
        try:
            queries = [
                f"{competitor} website features",
                f"{competitor} changelog recent updates",
                f"{competitor} pricing plans",
                f"{competitor} jobs hiring",
            ]

            combined_content = ""

            for query in queries:
                logger.info("Scout: Searching '%s'", query)
                try:
                    result = await asyncio.to_thread(
                        client.search,
                        query,
                        max_results=3,
                    )

                    for item in result.get("results", []):
                        title = item.get("title", "")
                        content = item.get("content", "")
                        combined_content += f"\n{title}\n{content}\n"

                except Exception as exc:
                    logger.warning(
                        "Scout: Search failed for '%s': %s",
                        query,
                        exc,
                    )
                    state["errors"].append(
                        f"Scout search failed for {competitor} - {query}: {exc}"
                    )

            state["raw_data"][competitor] = combined_content[:10000]
            logger.info(
                "Scout: Collected %d chars for %s",
                len(combined_content),
                competitor,
            )

        except Exception as exc:
            error_msg = f"Scout failed for {competitor}: {exc}"
            logger.error(error_msg)
            state["errors"].append(error_msg)

    logger.info("Scout agent: Crawl complete")
    return state


# ---------------------------------------------------------------------------
# SECTION 5: Signal Agent Function
# ---------------------------------------------------------------------------


def _process_signal_for_competitor(
    db_path: str,
    competitor: str,
    current_content: str,
) -> tuple[list[str], list[str]]:
    """
    Diff current content against the latest snapshot and persist a new row.

    Returns:
        Tuple of (signal lines, errors).
    """
    errors: list[str] = []
    signals: list[str] = []

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT snapshot FROM competitor_snapshots
            WHERE competitor = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (competitor,),
        )
        row = cursor.fetchone()

        if row is None:
            logger.info("Signal: %s - first run, establishing baseline", competitor)
            signals = ["Establishing baseline (first scan)"]
        else:
            previous_content = row[0]
            diff_lines = list(
                unified_diff(
                    previous_content.splitlines(keepends=True),
                    current_content.splitlines(keepends=True),
                    lineterm="",
                )
            )

            if diff_lines:
                changes: list[str] = []
                for line in diff_lines:
                    if line.startswith("+") and not line.startswith("+++"):
                        change = line[1:].strip()
                        if change and len(change) > 5:
                            changes.append(f"New: {change[:80]}")
                    elif line.startswith("-") and not line.startswith("---"):
                        change = line[1:].strip()
                        if change and len(change) > 5:
                            changes.append(f"Removed: {change[:80]}")

                signals = changes if changes else ["Changes detected but unclear"]
                logger.info(
                    "Signal: %s - found %d changes",
                    competitor,
                    len(changes),
                )
            else:
                signals = ["No changes detected"]
                logger.info("Signal: %s - no changes", competitor)

        cursor.execute(
            """
            INSERT INTO competitor_snapshots (competitor, snapshot)
            VALUES (?, ?)
            """,
            (competitor, current_content),
        )
        conn.commit()
        logger.info("Signal: Saved snapshot for %s", competitor)

    except Exception as exc:
        errors.append(f"Signal failed for {competitor}: {exc}")
        logger.error("Signal failed for %s: %s", competitor, exc)
    finally:
        conn.close()

    return signals, errors


async def signal_agent(state: GraphState) -> GraphState:
    """
    Diff current competitor data against the latest SQLite snapshot.

    For each competitor, load the previous snapshot, compare with ``raw_data``,
    store human-readable diffs in ``state.signals``, and save the new snapshot.

    Args:
        state: Graph state with ``raw_data`` populated.

    Returns:
        Updated state with ``signals`` populated.
    """
    db_path = DEFAULT_SNAPSHOTS_DB

    logger.info(
        "Signal agent: Processing %d competitors",
        len(state["competitors"]),
    )

    for competitor in state["competitors"]:
        current_content = state["raw_data"].get(competitor, "")
        signals, errors = await asyncio.to_thread(
            _process_signal_for_competitor,
            db_path,
            competitor,
            current_content,
        )
        state["signals"][competitor] = signals
        state["errors"].extend(errors)

    logger.info("Signal agent: Diff complete")
    return state


# ---------------------------------------------------------------------------
# SECTION 6: Compiled LangGraph
# ---------------------------------------------------------------------------

from competeiq.pipeline.analyst_report import analyst_agent, report_agent
from competeiq.pipeline.notifier import notifier_agent

try:
    init_snapshots_db()
except Exception as exc:
    logger.error("Failed to initialize snapshots DB: %s", exc)

graph = StateGraph(GraphState)

graph.add_node("scout", scout_agent)
graph.add_node("signal", signal_agent)
graph.add_node("analyst", analyst_agent)
graph.add_node("report", report_agent)
graph.add_node("notifier", notifier_agent)

graph.add_edge(START, "scout")
graph.add_edge("scout", "signal")
graph.add_edge("signal", "analyst")
graph.add_edge("analyst", "report")
graph.add_edge("report", "notifier")
graph.add_edge("notifier", END)

compiled_graph = graph.compile()

logger.info("LangGraph compiled successfully")


# ---------------------------------------------------------------------------
# SECTION 7: Export
# ---------------------------------------------------------------------------

__all__ = [
    "GraphState",
    "scout_agent",
    "signal_agent",
    "compiled_graph",
    "init_snapshots_db",
    "create_initial_state",
]
