"""Slack integration for competitive intelligence briefs."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class SlackService:
    """Posts structured messages to a Slack incoming webhook."""

    def __init__(self, webhook_url: str) -> None:
        """
        Initialize SlackService.

        Args:
            webhook_url: Slack incoming webhook URL.
        """
        self.webhook_url = webhook_url
        self.logger = logger

    async def send_competitive_brief(
        self,
        payload: dict[str, Any],
    ) -> bool:
        """
        Post a competitive intelligence brief to Slack.

        Args:
            payload: Slack Block Kit JSON payload.

        Returns:
            True if posted successfully, False otherwise.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                    timeout=10.0,
                )
                response.raise_for_status()

            self.logger.info("Slack message posted successfully")
            return True

        except Exception as exc:
            self.logger.error("Failed to post to Slack: %s", exc)
            return False
