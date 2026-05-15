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

# ---------------------------------------------------------------------------
# SECTION 1: Imports
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)

NOTION_RICH_TEXT_LIMIT = 2_000


# ---------------------------------------------------------------------------
# SECTION 2: Analyst Agent Function
# ---------------------------------------------------------------------------


def _truncate(text: str, limit: int) -> str:
    """Truncate text to a maximum length with an ellipsis suffix."""
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


async def analyst_agent(state: GraphState) -> GraphState:
    """
    Use Google Gemini to reason about competitor signals.

    For each competitor:
    - Takes raw_data (Scout output) and signals (Signal output)
    - Prompts Gemini to think deeply about what changes mean strategically
    - Stores reasoning in state.analysis

    Args:
        state: Current GraphState with raw_data and signals populated

    Returns:
        Updated state with analysis populated
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        msg = "Analyst agent: GEMINI_API_KEY is not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    logger.info(
        "Analyst agent: Reasoning about %d competitors",
        len(state["competitors"]),
    )

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-flash-latest")

    for competitor in state["competitors"]:
        try:
            raw_data = state["raw_data"].get(competitor, "No data collected")
            signals = state["signals"].get(competitor, [])

            signals_text = "\n".join(f"- {signal}" for signal in signals)

            prompt = f"""You are a senior competitive analyst. Analyze the following competitor intelligence and provide strategic insights.

Competitor: {competitor}

RECENT SIGNALS (Changes detected):
{signals_text}

RAW DATA COLLECTED:
{raw_data[:2000]}

TASK:
1. What do these changes suggest about the competitor's strategy?
2. What product or market moves are they likely preparing?
3. What timeline should we expect (weeks/months)?
4. What is the threat level to us (low/medium/high)?
5. What should we do in response?

Provide a concise, actionable brief (2-3 paragraphs max).
"""

            logger.info("Analyst: Thinking about %s...", competitor)

            def call_gemini() -> str:
                response = model.generate_content(prompt)
                return response.text if response.text else "No analysis returned"

            analysis_text = await asyncio.to_thread(call_gemini)
            state["analysis"][competitor] = analysis_text
            logger.info("Analyst: Completed analysis for %s", competitor)

        except Exception as exc:
            error_msg = f"Analyst failed for {competitor}: {exc}"
            logger.error(error_msg)
            state["errors"].append(error_msg)
            state["analysis"][competitor] = f"Analysis failed: {exc}"

    logger.info("Analyst agent: Reasoning complete")
    return state


# ---------------------------------------------------------------------------
# SECTION 3: Report Agent Function
# ---------------------------------------------------------------------------


def _rich_text_block(content: str) -> dict[str, Any]:
    """Build a Notion rich_text payload, respecting content length limits."""
    return {"text": {"content": _truncate(content, NOTION_RICH_TEXT_LIMIT)}}


def _build_notion_children(signals: list[str], analysis: str) -> list[dict[str, Any]]:
    """Build Notion page block children for signals and analysis sections."""
    children: list[dict[str, Any]] = [
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"text": {"content": "Recent Signals"}}],
            },
        },
    ]

    if signals:
        children.extend(
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [_rich_text_block(signal)],
                },
            }
            for signal in signals
        )
    else:
        children.append(
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"text": {"content": "No signals recorded."}}],
                },
            }
        )

    children.extend(
        [
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"text": {"content": "Strategic Analysis"}}],
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [_rich_text_block(analysis or "No analysis available.")],
                },
            },
        ]
    )

    return children


def _create_notion_page(
    notion_client: NotionClient,
    database_id: str,
    competitor: str,
    signals: list[str],
    analysis: str,
) -> str:
    """
    Create a Notion database page for one competitor brief.

    Returns:
        URL of the created Notion page.
    """
    page_title = (
        f"{competitor} — Competitive Brief {datetime.now().strftime('%Y-%m-%d')}"
    )

    response = notion_client.pages.create(
        parent={"database_id": database_id},
        properties={
            "Name": {
                "title": [{"text": {"content": _truncate(page_title, NOTION_RICH_TEXT_LIMIT)}}],
            },
        },
        children=_build_notion_children(signals, analysis),
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
    Create Notion pages with the competitive brief for each competitor.

    Each page includes signals and strategic analysis. URLs are stored in
    ``state.report_urls``.

    Args:
        state: Current graph state with ``analysis`` populated.

    Returns:
        Updated state with ``report_urls`` populated.
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

    logger.info(
        "Report agent: Creating Notion pages for %d competitors",
        len(state["competitors"]),
    )

    for competitor in state["competitors"]:
        try:
            signals = state["signals"].get(competitor, [])
            analysis = state["analysis"].get(competitor, "")

            notion_url = await asyncio.to_thread(
                _create_notion_page,
                notion_client,
                database_id,
                competitor,
                signals,
                analysis,
            )

            state["report_urls"][competitor] = notion_url
            logger.info(
                "Report: Created Notion page for %s at %s",
                competitor,
                notion_url,
            )

        except Exception as exc:
            error_msg = f"Report failed for {competitor}: {exc}"
            logger.error(error_msg)
            state["errors"].append(error_msg)

    logger.info("Report agent: Notion pages created")
    return state


# ---------------------------------------------------------------------------
# SECTION 4: Export
# ---------------------------------------------------------------------------

__all__ = [
    "analyst_agent",
    "report_agent",
]
