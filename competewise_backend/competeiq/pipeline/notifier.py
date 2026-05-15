"""Notifier agent — posts the competitive brief summary to Slack."""

from __future__ import annotations

import logging

from competeiq.config import get_settings
from competeiq.pipeline.state import GraphState
from competeiq.services.slack_service import SlackService

logger = logging.getLogger(__name__)


import json
import asyncio
import google.generativeai as genai

async def notifier_agent(state: GraphState) -> GraphState:
    """
    Post the competitive brief summary to Slack using a Gemini-generated Block Kit payload.
    """
    settings = get_settings()

    if not settings.slack_webhook_url:
        logger.warning("Notifier: SLACK_WEBHOOK_URL not set, skipping notification")
        return state

    if not settings.gemini_api_key:
        msg = "Notifier agent: GEMINI_API_KEY not configured"
        logger.error(msg)
        state["errors"].append(msg)
        return state

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-flash-latest")

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
        response = await asyncio.to_thread(
            model.generate_content,
            prompt,
            generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
        )
        
        payload = json.loads(response.text)
        
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
