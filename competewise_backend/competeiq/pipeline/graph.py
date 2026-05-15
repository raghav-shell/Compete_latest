"""LangGraph multi-agent pipeline: Scout and Signal agents."""

from __future__ import annotations

import asyncio
import logging
import json
from pathlib import Path
from langgraph.graph import END, START, StateGraph
from tavily import TavilyClient
import google.generativeai as genai

from competeiq.config import get_settings
from competeiq.pipeline.state import GraphState, create_initial_state
from competeiq.utils.llm import generate_with_retry

# ---------------------------------------------------------------------------
# SECTION 1: Imports (stdlib + third-party; config via competeiq.config)
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)


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

    async def _crawl_one(competitor: str) -> tuple[str, dict, str | None]:
        try:
            is_reflection = state.get("reflection_count", 0) > 0
            if is_reflection:
                queries = [
                    f"{competitor} recent news deep dive",
                    f"{competitor} unexpected changes or leaks",
                    f"{competitor} detailed product reviews",
                ]
                logger.info("Scout: Running deeper reflection queries for %s", competitor)
            else:
                queries = [
                    f"{competitor} website features",
                    f"{competitor} changelog recent updates",
                    f"{competitor} pricing plans",
                    f"{competitor} jobs hiring",
                ]
            combined_content = ""
            # Tavily searches concurrently
            async def _search(q: str) -> str:
                try:
                    logger.info("Scout: Searching '%s'", q)
                    res = await asyncio.to_thread(client.search, q, max_results=3)
                    content = ""
                    for item in res.get("results", []):
                        content += f"\\n{item.get('title', '')}\\n{item.get('content', '')}\\n"
                    return content
                except Exception as exc:
                    logger.warning("Scout: Search failed for '%s': %s", q, exc)
                    return ""

            search_results = await asyncio.gather(*[_search(q) for q in queries])
            combined_content = "".join(search_results)

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
                generate_with_retry,
                model,
                prompt,
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            )
            
            try:
                parsed = json.loads(response.text)
                return competitor, parsed, None
            except Exception as parse_exc:
                logger.error("Scout: Failed to parse JSON for %s: %s", competitor, parse_exc)
                return competitor, {"features": [], "pricing": [], "jobs": [], "press": [], "sentiment": []}, None
                
        except Exception as exc:
            error_msg = f"Scout failed for {competitor}: {exc}"
            logger.error(error_msg)
            return competitor, {"features": [], "pricing": [], "jobs": [], "press": [], "sentiment": []}, error_msg

    # Fan out!
    results = await asyncio.gather(*[_crawl_one(c) for c in state["competitors"]])
    for competitor, raw_data, error_msg in results:
        state["raw_data"][competitor] = raw_data
        if error_msg:
            state["errors"].append(error_msg)

    logger.info("Scout agent: Crawl complete")
    return state

# ---------------------------------------------------------------------------
# SECTION 5: Signal Agent Function
# ---------------------------------------------------------------------------


def _process_signal_for_competitor(
    competitor: str,
    current_content: dict,
) -> tuple[list[dict], list[str]]:
    """
    Diff current JSON against the latest snapshot using Gemini.
    Uses Supabase for snapshot storage.
    """
    from competeiq.db import get_latest_snapshot, save_snapshot

    errors: list[str] = []
    signals: list[dict] = []

    try:
        previous_content_str = get_latest_snapshot(competitor)
        current_content_str = json.dumps(current_content)

        if previous_content_str is None:
            logger.info("Signal: %s - first run, establishing baseline", competitor)
            signals = [{"change_type": "baseline", "description": "Establishing baseline (first scan)", "significance": "low", "reasoning": "First run"}]
        else:
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
            
            response = generate_with_retry(
                model,
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

        # Save current snapshot to Supabase
        save_snapshot(competitor, current_content_str)

    except Exception as exc:
        errors.append(f"Signal failed for {competitor}: {exc}")
        logger.error("Signal failed for %s: %s", competitor, exc)

    return signals, errors


async def signal_agent(state: GraphState) -> GraphState:
    """
    Diff current competitor data against the latest Supabase snapshot.
    """
    logger.info(
        "Signal agent: Processing %d competitors",
        len(state["competitors"]),
    )

    # Fan out!
    async def _diff_one(c: str) -> tuple[str, list[dict], list[str]]:
        current_content = state["raw_data"].get(c, {})
        signals, errors = await asyncio.to_thread(
            _process_signal_for_competitor,
            c,
            current_content,
        )
        return c, signals, errors

    results = await asyncio.gather(*[_diff_one(c) for c in state["competitors"]])
    for c, signals, errors in results:
        state["signals"][c] = signals
        state["errors"].extend(errors)

    logger.info("Signal agent: Diff complete")
    return state


# ---------------------------------------------------------------------------
# SECTION 6: Compiled LangGraph
# ---------------------------------------------------------------------------

from competeiq.pipeline.analyst_report import analyst_agent, evaluator_agent, report_agent
from competeiq.pipeline.notifier import notifier_agent

graph = StateGraph(GraphState)

graph.add_node("scout", scout_agent)
graph.add_node("signal", signal_agent)
graph.add_node("analyst", analyst_agent)
graph.add_node("evaluator", evaluator_agent)
graph.add_node("report", report_agent)
graph.add_node("notifier", notifier_agent)

graph.add_edge(START, "scout")
graph.add_edge("scout", "signal")
graph.add_edge("signal", "analyst")
graph.add_edge("analyst", "evaluator")

def route_evaluation(state: GraphState) -> str:
    # If reflection_count changed to > 0, it means we need to loop back
    # Wait, the evaluator increments reflection_count when it decides to loop.
    # So if reflection_count > 0 AND it was just incremented...
    # Actually, a simpler way is to check the last error log or rely on the evaluator
    # to set a explicit flag. But we can just use reflection_count logic:
    # If reflection_count == 1 and we just hit evaluator, loop back.
    # Actually, let's just add a small flag `needs_reflection: bool` to GraphState? No,
    # let's just check if "Evaluator: Insights lacked depth. Initiating reflection loop." is the very last error.
    if state["errors"] and state["errors"][-1].startswith("Evaluator: Insights lacked depth"):
        return "scout"
    return "report"

graph.add_conditional_edges(
    "evaluator",
    route_evaluation,
    {
        "scout": "scout",
        "report": "report",
    }
)

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
    "create_initial_state",
]

