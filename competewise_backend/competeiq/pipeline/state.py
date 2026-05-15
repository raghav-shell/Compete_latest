"""Shared LangGraph state definitions."""

from __future__ import annotations

from typing import TypedDict


class GraphState(TypedDict):
    """Shared state passed between all agents."""

    competitors: list[str]
    raw_data: dict[str, str]
    signals: dict[str, list[str]]
    analysis: dict[str, str]
    report_urls: dict[str, str]
    slack_sent: bool
    errors: list[str]


def create_initial_state(competitors: list[str]) -> GraphState:
    """Build a fresh GraphState for graph invocation."""
    return GraphState(
        competitors=competitors,
        raw_data={},
        signals={},
        analysis={},
        report_urls={},
        slack_sent=False,
        errors=[],
    )
