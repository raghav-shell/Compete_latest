"""LangGraph pipeline runner with real-time status updates."""

from __future__ import annotations

from typing import Any

from competeiq.pipeline.graph import compiled_graph
from competeiq.pipeline.state import GraphState, create_initial_state
from competeiq.state import record_run, update_state
from competeiq.utils.logger import get_logger

logger = get_logger(__name__)

# Node order and human-readable progress for /api/status
PIPELINE_STEPS: list[tuple[str, str, int]] = [
    ("scout", "Scout: Crawling competitor sites...", 15),
    ("signal", "Signal: Detecting changes...", 35),
    ("analyst", "Analyst: Strategic reasoning...", 55),
    ("evaluator", "Evaluator: Assessing insights...", 65),
    ("report", "Report: Creating Notion briefs...", 75),
    ("notifier", "Notifier: Posting to Slack...", 90),
]

_STEP_LOOKUP = {name: (label, progress) for name, label, progress in PIPELINE_STEPS}


class PipelineRunner:
    """Orchestrates the competitive intelligence LangGraph pipeline."""

    async def run(self, run_id: str, competitors: list[str]) -> dict[str, Any]:
        """
        Execute the intelligence pipeline and stream progress to global state.

        Args:
            run_id: Unique identifier for this pipeline run.
            competitors: List of competitor names to analyze.

        Returns:
            Final graph state as a plain dictionary.
        """
        logger.info(
            "Starting pipeline run",
            extra={"run_id": run_id, "competitors": competitors},
        )

        try:
            initial_state: GraphState = create_initial_state(competitors)
            final_state: dict[str, Any] = dict(initial_state)

            async for event in compiled_graph.astream(initial_state):
                for node_name, node_output in event.items():
                    label, progress = _STEP_LOOKUP.get(
                        node_name,
                        (f"Running {node_name}...", 50),
                    )
                    update_state("current_step", label)
                    update_state("current_agent", node_name)
                    update_state("progress", progress)
                    final_state = dict(node_output)
                    logger.info(
                        "Pipeline step complete",
                        extra={
                            "run_id": run_id,
                            "step": node_name,
                            "progress": progress,
                        },
                    )

            logger.info(
                "Pipeline run complete",
                extra={
                    "run_id": run_id,
                    "signal_count": len(final_state.get("signals", {})),
                    "error_count": len(final_state.get("errors", [])),
                    "slack_sent": final_state.get("slack_sent", False),
                },
            )

            signals = final_state.get("signals") or {}
            signals_found = sum(
                len(v) for v in signals.values() if isinstance(v, list)
            )
            report_urls = final_state.get("report_urls") or {}
            notion_url = next(iter(report_urls.values()), None)
            analysis = final_state.get("analysis") or {}
            slack_lines = [
                f"Competitive Intel — {len(competitors)} competitors",
            ]
            for name in competitors:
                comp_analysis = analysis.get(name) or {}
                if isinstance(comp_analysis, dict):
                    text = comp_analysis.get("top_insight", "")[:120]
                else:
                    text = str(comp_analysis)[:120]
                if text:
                    slack_lines.append(f"• {name}: {text}")
            slack_message = "\n".join(slack_lines)

            record_run(
                run_id,
                competitors,
                "completed",
                signals_found=signals_found,
                notion_url=notion_url,
                slack_message=slack_message,
            )

            return {
                "run_id": run_id,
                "status": "completed",
                **final_state,
            }

        except Exception as exc:
            record_run(run_id, competitors, "failed", error_message=str(exc))
            raise
