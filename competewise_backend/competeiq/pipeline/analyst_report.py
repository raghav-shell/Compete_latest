"""Analyst and Report agents for the CompeteIQ LangGraph pipeline."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

import google.generativeai as genai
from notion_client import Client as NotionClient

from competeiq.config import Settings, get_settings
from competeiq.pipeline.state import GraphState
from competeiq.utils.llm import generate_with_retry

# ---------------------------------------------------------------------------
# SECTION 1: Imports
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)

NOTION_RICH_TEXT_LIMIT = 2_000


# ---------------------------------------------------------------------------
# SECTION 2: Analyst Agent Function
# ---------------------------------------------------------------------------


import json

def _truncate(text: str, limit: int) -> str:
    """Truncate text to a maximum length with an ellipsis suffix."""
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


async def analyst_agent(state: GraphState) -> GraphState:
    """
    Use Google Gemini to reason about competitor signals and output structured JSON.
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        msg = "Analyst agent: GEMINI_API_KEY is not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    logger.info("Analyst agent: Reasoning about %d competitors", len(state["competitors"]))

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-flash-latest")

    # Fan out!
    async def _analyze_one(c: str) -> tuple[str, dict, str | None]:
        try:
            raw_data = state["raw_data"].get(c, {})
            signals = state["signals"].get(c, [])

            prompt = f"""You are a senior competitive analyst. Analyze the following competitor intelligence and provide strategic insights.

Competitor: {c}

RECENT SIGNALS (Changes detected):
{json.dumps(signals, indent=2)}

RAW DATA COLLECTED:
{json.dumps(raw_data)[:15000]}

TASK:
Provide strategic insights based on the raw data and signals.
Return ONLY a valid JSON object (no markdown, no backticks) with exactly these keys:
- "signals_analyzed" (integer, number of signals)
- "top_insight" (string, the most important takeaway)
- "strategic_implications" (list of strings, what this means for their strategy)
- "recommended_actions" (list of strings, what we should do)
- "watch_next" (string, what to monitor in the future)
"""
            logger.info("Analyst: Thinking about %s...", c)

            def call_gemini() -> str:
                response = generate_with_retry(
                    model,
                    prompt,
                    generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
                )
                return response.text if response.text else "{}"

            analysis_text = await asyncio.to_thread(call_gemini)
            
            try:
                analysis_json = json.loads(analysis_text)
                return c, analysis_json, None
            except Exception as e:
                logger.error("Analyst: Failed to parse JSON for %s: %s", c, e)
                return c, {
                    "signals_analyzed": 0,
                    "top_insight": "Failed to parse analysis.",
                    "strategic_implications": [],
                    "recommended_actions": [],
                    "watch_next": "N/A"
                }, None

        except Exception as exc:
            error_msg = f"Analyst failed for {c}: {exc}"
            logger.error(error_msg)
            return c, {
                "signals_analyzed": 0,
                "top_insight": f"Analysis failed: {exc}",
                "strategic_implications": [],
                "recommended_actions": [],
                "watch_next": ""
            }, error_msg

    results = await asyncio.gather(*[_analyze_one(c) for c in state["competitors"]])
    for c, analysis, error_msg in results:
        state["analysis"][c] = analysis
        if error_msg:
            state["errors"].append(error_msg)

    logger.info("Analyst agent: Reasoning complete")
    return state


# ---------------------------------------------------------------------------
# SECTION 3: Evaluator Agent Function
# ---------------------------------------------------------------------------

async def evaluator_agent(state: GraphState) -> GraphState:
    """
    Evaluate the depth of the analyst's insights. If insights are poor and
    we haven't reflected yet, loop back to scout.
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        return state

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-flash-latest")

    needs_reflection = False
    
    # Simple evaluation: if any insight is very short or generic
    for competitor in state["competitors"]:
        analysis = state["analysis"].get(competitor, {})
        insight = analysis.get("top_insight", "")
        
        # Check if the insight is meaningful
        if len(insight) < 30 or "nothing significant" in insight.lower() or "failed to parse" in insight.lower():
            needs_reflection = True
            break
            
    if needs_reflection and state.get("reflection_count", 0) < 1:
        logger.warning("Evaluator: Insights are weak. Reflecting and looping back to Scout.")
        state["reflection_count"] = state.get("reflection_count", 0) + 1
        state["errors"].append("Evaluator: Insights lacked depth. Initiating reflection loop.")
        # Optional: You could inject a hint into GraphState here for Scout to look harder
    else:
        logger.info("Evaluator: Insights approved or max reflections reached.")

    return state


# ---------------------------------------------------------------------------
# SECTION 3: Report Agent Function
# ---------------------------------------------------------------------------


def markdown_to_notion_blocks(md_text: str) -> list[dict[str, Any]]:
    """Convert simple markdown text to Notion API block objects."""
    blocks = []
    for line in md_text.splitlines():
        line = line.strip()
        if not line:
            continue
        
        # Remove markdown bold/italic formatting so it doesn't leak into Notion plain text
        line = line.replace("**", "").replace("*", "")
        
        if line.startswith("### "):
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": [{"text": {"content": _truncate(line[4:].strip(), NOTION_RICH_TEXT_LIMIT)}}]},
            })
        elif line.startswith("## "):
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"text": {"content": _truncate(line[3:].strip(), NOTION_RICH_TEXT_LIMIT)}}]},
            })
        elif line.startswith("# "):
            blocks.append({
                "object": "block",
                "type": "heading_1",
                "heading_1": {"rich_text": [{"text": {"content": _truncate(line[2:].strip(), NOTION_RICH_TEXT_LIMIT)}}]},
            })
        elif line.startswith("- "):
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"text": {"content": _truncate(line[2:].strip(), NOTION_RICH_TEXT_LIMIT)}}]},
            })
        else:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [{"text": {"content": _truncate(line, NOTION_RICH_TEXT_LIMIT)}}]},
            })
            
    # Add a fallback if empty
    if not blocks:
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"text": {"content": "Empty report generated."}}]},
        })
    return blocks


def _create_notion_page(
    notion_client: NotionClient,
    database_id: str,
    competitor: str,
    blocks: list[dict[str, Any]],
) -> str:
    """Create a Notion database page for one competitor brief."""
    page_title = f"{competitor} — Competitive Brief {datetime.now().strftime('%Y-%m-%d')}"

    response = notion_client.pages.create(
        parent={"database_id": database_id},
        properties={
            "Name": {
                "title": [{"text": {"content": _truncate(page_title, NOTION_RICH_TEXT_LIMIT)}}],
            },
        },
        children=blocks,
    )

    return str(response.get("url", ""))


def _get_notion_client(settings: Settings) -> NotionClient:
    """Instantiate an authenticated Notion client from settings."""
    if not settings.notion_api_key:
        raise ValueError("NOTION_API_KEY is not configured")
    if not settings.notion_database_id:
        raise ValueError("NOTION_DATABASE_ID is not configured")
    return NotionClient(auth=settings.notion_api_key)


async def report_agent(state: GraphState) -> GraphState:
    """
    Generate Markdown using Gemini and create a Notion page with the competitive brief.
    """
    settings = get_settings()

    try:
        notion_client = _get_notion_client(settings)
        database_id = settings.notion_database_id
    except Exception as exc:
        error_msg = f"Notion auth failed: {exc}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        return state

    if not settings.gemini_api_key:
        msg = "Report agent: GEMINI_API_KEY is not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-flash-latest")

    logger.info("Report agent: Creating Notion pages for %d competitors", len(state["competitors"]))

    logger.info("Report agent: Creating Notion pages for %d competitors", len(state["competitors"]))

    async def _report_one(c: str) -> tuple[str, str | None, str | None]:
        try:
            signals = state["signals"].get(c, [])
            analysis = state["analysis"].get(c, {})

            prompt = f"""You are a Report agent. Write a professional, executive-style competitive intelligence brief in Markdown format.
Competitor: {c}

ANALYSIS:
{json.dumps(analysis, indent=2)}

SIGNALS:
{json.dumps(signals, indent=2)}

Write the full Markdown brief. Use # for the main title, ## for major sections and ### for subsections. Use "- " for bullet lists.
Do NOT use bold or italics markers (no ** or *), just plain text structure.
Keep it concise and strategic."""

            def call_gemini() -> str:
                response = generate_with_retry(model, prompt)
                return response.text if response.text else "No report generated."

            markdown_text = await asyncio.to_thread(call_gemini)
            blocks = markdown_to_notion_blocks(markdown_text)

            notion_url = await asyncio.to_thread(
                _create_notion_page,
                notion_client,
                database_id,
                c,
                blocks,
            )

            logger.info("Report: Created Notion page for %s at %s", c, notion_url)
            return c, notion_url, None

        except Exception as exc:
            error_msg = f"Report failed for {c}: {exc}"
            logger.error(error_msg)
            return c, None, error_msg

    results = await asyncio.gather(*[_report_one(c) for c in state["competitors"]])
    for c, url, error_msg in results:
        if url:
            state["report_urls"][c] = url
        if error_msg:
            state["errors"].append(error_msg)

    logger.info("Report agent: Notion pages created")
    return state


# ---------------------------------------------------------------------------
# SECTION 4: Export
# ---------------------------------------------------------------------------

__all__ = [
    "analyst_agent",
    "evaluator_agent",
    "report_agent",
]
