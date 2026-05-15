"""Notifier agent — posts the competitive brief summary to Slack."""

from __future__ import annotations

import logging

from competeiq.config import get_settings
from competeiq.pipeline.state import GraphState
from competeiq.services.slack_service import SlackService

logger = logging.getLogger(__name__)


async def notifier_agent(state: GraphState) -> GraphState:
    """
    Post the competitive brief summary to Slack.

    Args:
        state: Complete graph state with all agent outputs.

    Returns:
        Updated state with ``slack_sent`` set.
    """
    settings = get_settings()

    if not settings.slack_webhook_url:
        logger.warning("Notifier: SLACK_WEBHOOK_URL not set, skipping notification")
        return state

    try:
        slack_service = SlackService(settings.slack_webhook_url)

        success = await slack_service.send_competitive_brief(
            competitors=state["competitors"],
            signals=state["signals"],
            analysis=state["analysis"],
            report_urls=state["report_urls"],
            errors=state["errors"],
        )

        state["slack_sent"] = success
        logger.info(
            "Notifier agent: Slack notification %s",
            "sent" if success else "failed",
        )

    except Exception as exc:
        error_msg = f"Notifier failed: {exc}"
        logger.error(error_msg)
        state["errors"].append(error_msg)
        state["slack_sent"] = False

    return state
