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

            record_run(run_id, competitors, "success")

            return {
                "run_id": run_id,
                "status": "completed",
                **final_state,
            }

        except Exception as exc:
            record_run(run_id, competitors, "error", str(exc))
            raise
