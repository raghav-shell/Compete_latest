"""Notifier agent — posts the competitive brief summary to Slack."""

from __future__ import annotations

import json
import asyncio
import logging

from competeiq.config import get_settings
from competeiq.pipeline.state import GraphState
from competeiq.services.slack_service import SlackService
from competeiq.utils.llm import generate_with_retry, get_llm_client

logger = logging.getLogger(__name__)


async def notifier_agent(state: GraphState) -> GraphState:
    """
    Post the competitive brief summary to Slack using a Claude Haiku-generated Block Kit payload.
    """
    settings = get_settings()

    if not settings.slack_webhook_url:
        logger.warning("Notifier: SLACK_WEBHOOK_URL not set, skipping notification")
        return state

    if not settings.g0i_api_key:
        msg = "Notifier agent: G0I_API_KEY not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    llm_client = get_llm_client(settings.g0i_api_key)

    try:
        prompt = f"""You are a Notifier Agent. Format this competitive brief as a Slack Block Kit message.
Header: "🕵️ Weekly Competitive Intel"
Per competitor: name as header, top 3 signals as bullets, one "So what?" implication in italics. Add dividers between competitors.
Final line: Include the "Full report" links for each competitor.

COMPETITORS: {state['competitors']}
ANALYSIS: {json.dumps(state['analysis'])}
SIGNALS: {json.dumps(state['signals'])}
REPORT URLS: {json.dumps(state['report_urls'])}
ERRORS: {json.dumps(state['errors'])}

Return ONLY valid Slack Block Kit JSON. The root object must have a "blocks" array.
"""
        response_text = await asyncio.to_thread(
            generate_with_retry,
            llm_client,
            prompt,
            json_mode=True,
        )
        
        payload = json.loads(response_text)
        
        slack_service = SlackService(settings.slack_webhook_url)
        success = await slack_service.send_competitive_brief(payload)

        state["slack_sent"] = success
        logger.info("Notifier agent: Slack notification %s", "sent" if success else "failed")

    except Exception as exc:
        error_msg = f"Notifier failed: {exc}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["slack_sent"] = False

    return state
