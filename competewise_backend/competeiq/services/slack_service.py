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
        competitors: list[str],
        signals: dict[str, list[str]],
        analysis: dict[str, str],
        report_urls: dict[str, str],
        errors: list[str],
    ) -> bool:
        """
        Post a competitive intelligence brief to Slack.

        Args:
            competitors: List of competitor names.
            signals: Signals per competitor.
            analysis: Strategic analysis per competitor.
            report_urls: Notion page URLs per competitor.
            errors: Pipeline errors encountered.

        Returns:
            True if posted successfully, False otherwise.
        """
        try:
            timestamp = int(time.time())
            blocks: list[dict[str, Any]] = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🔍 CompeteIQ Competitive Brief",
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": (
                                f"Tracked: {', '.join(competitors)} | "
                                f"Timestamp: <!date^{timestamp}^{{date_num}} "
                                f"{{time_secs}}|now>"
                            ),
                        }
                    ],
                },
            ]

            for competitor in competitors:
                competitor_signals = signals.get(competitor, [])
                competitor_analysis = analysis.get(competitor, "")
                competitor_url = report_urls.get(competitor, "")

                signals_text = "\n".join(
                    f"• {signal}" for signal in competitor_signals[:3]
                ) or "• No signals recorded"

                if len(competitor_analysis) > 300:
                    analysis_preview = competitor_analysis[:300] + "..."
                else:
                    analysis_preview = competitor_analysis or "No analysis available."

                blocks.append({"type": "divider"})
                blocks.append(
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": (
                                f"*{competitor}*\n\n"
                                f"*Recent Changes:*\n{signals_text}\n\n"
                                f"*Analysis:*\n{analysis_preview}"
                            ),
                        },
                    }
                )

                if competitor_url:
                    blocks.append(
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "📄 View Full Brief",
                                    },
                                    "url": competitor_url,
                                }
                            ],
                        }
                    )

            if errors:
                blocks.append({"type": "divider"})
                blocks.append(
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": (
                                    f"⚠️ {len(errors)} error(s) occurred. "
                                    "Check logs for details."
                                ),
                            }
                        ],
                    }
                )

            payload = {
                "blocks": blocks,
                "text": "CompeteIQ Competitive Brief",
            }

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
