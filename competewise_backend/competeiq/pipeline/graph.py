"""LangGraph multi-agent pipeline: Scout and Signal agents."""

from __future__ import annotations

import asyncio
import logging
import sqlite3
import json
from pathlib import Path
from langgraph.graph import END, START, StateGraph
from tavily import TavilyClient
import google.generativeai as genai

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
    Crawl competitor websites using the Tavily API and extract structured JSON with Gemini.
    """
    settings = get_settings()

    if not settings.tavily_api_key or not settings.gemini_api_key:
        msg = "Scout agent: TAVILY_API_KEY or GEMINI_API_KEY not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    client = TavilyClient(api_key=settings.tavily_api_key)
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-flash-latest")

    logger.info("Scout agent: Starting crawl for %d competitors", len(state["competitors"]))

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
                    result = await asyncio.to_thread(client.search, query, max_results=3)
                    for item in result.get("results", []):
                        combined_content += f"\\n{item.get('title', '')}\\n{item.get('content', '')}\\n"
                except Exception as exc:
                    logger.warning("Scout: Search failed for '%s': %s", query, exc)

            prompt = f"""You are a Scout agent. Your job is to gather raw intelligence about a competitor.
Given competitor: {competitor}
RAW SEARCH RESULTS:
{combined_content[:15000]}

Extract findings from the search results.
Return ONLY a valid JSON object (no markdown, no backticks) with exactly these keys: "features", "pricing", "jobs", "press", "sentiment".
Each key must map to an array of objects with exactly these string keys: "text", "source_url", "date_found".
If nothing is found for a category, return an empty list. Be factual. Do not invent findings."""

            logger.info("Scout: Generating structured JSON for %s", competitor)
            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            )
            
            try:
                parsed = json.loads(response.text)
                state["raw_data"][competitor] = parsed
            except Exception as parse_exc:
                logger.error("Scout: Failed to parse JSON for %s: %s", competitor, parse_exc)
                state["raw_data"][competitor] = {
                    "features": [], "pricing": [], "jobs": [], "press": [], "sentiment": []
                }
                
        except Exception as exc:
            error_msg = f"Scout failed for {competitor}: {exc}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            state["raw_data"][competitor] = {
                "features": [], "pricing": [], "jobs": [], "press": [], "sentiment": []
            }

    logger.info("Scout agent: Crawl complete")
    return state


# ---------------------------------------------------------------------------
# SECTION 5: Signal Agent Function
# ---------------------------------------------------------------------------


def _process_signal_for_competitor(
    db_path: str,
    competitor: str,
    current_content: dict,
) -> tuple[list[dict], list[str]]:
    """
    Diff current JSON against the latest snapshot using Gemini.
    """
    errors: list[str] = []
    signals: list[dict] = []

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT snapshot FROM competitor_snapshots WHERE competitor = ? ORDER BY created_at DESC LIMIT 1",
            (competitor,),
        )
        row = cursor.fetchone()
        
        current_content_str = json.dumps(current_content)

        if row is None:
            logger.info("Signal: %s - first run, establishing baseline", competitor)
            signals = [{"change_type": "baseline", "description": "Establishing baseline (first scan)", "significance": "low", "reasoning": "First run"}]
        else:
            previous_content_str = row[0]
            
            settings = get_settings()
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-flash-latest")
            
            prompt = f"""You are a Signal agent. Compare two versions of a competitor's web presence.
PREVIOUS: {previous_content_str[:15000]}
CURRENT: {current_content_str[:15000]}

Identify what is genuinely new or changed. Ignore cosmetic changes.
Focus on: new features, pricing changes, messaging shifts, new integrations, deprecations.

Return ONLY a JSON array of objects (no markdown, no backticks).
Each object must have these exact keys: "change_type", "description", "significance" (high, medium, or low), "reasoning".
If nothing meaningful changed, return an empty array []."""
            
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            )
            
            try:
                signals = json.loads(response.text)
                if not isinstance(signals, list):
                    signals = []
            except Exception as e:
                logger.error("Signal: JSON parse error: %s", e)
                signals = []

        cursor.execute(
            "INSERT INTO competitor_snapshots (competitor, snapshot) VALUES (?, ?)",
            (competitor, current_content_str),
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
    """
    db_path = DEFAULT_SNAPSHOTS_DB

    logger.info(
        "Signal agent: Processing %d competitors",
        len(state["competitors"]),
    )

    for competitor in state["competitors"]:
        current_content = state["raw_data"].get(competitor, {})
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
