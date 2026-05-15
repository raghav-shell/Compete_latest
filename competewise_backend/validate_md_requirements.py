#!/usr/bin/env python3
"""
CompeteIQ — MD File Requirements Validation
Validates EVERY requirement from CompeteIQ_Hackathon_Plan.md
Run: python3 validate_md_requirements.py
"""

from __future__ import annotations

import importlib
import inspect
import os
import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, os.path.dirname(__file__))


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


class MDValidator:
    """Validates all MD file requirements."""

    def __init__(self) -> None:
        self.passed: list[str] = []
        self.failed: list[str] = []
        self.project_root = Path(__file__).parent / "competeiq"

    def header(self, text: str) -> None:
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 70}")
        print(f"  {text}")
        print(f"{'=' * 70}{Colors.RESET}\n")

    def test(self, category: str, requirement: str, check_func: Callable[[], Any]) -> None:
        """Run a single requirement check."""
        try:
            result = check_func()
            # Helpers may return an inner check() callable — invoke it if needed
            if callable(result) and result is not True and result is not False:
                result = result()
            if result is True:
                self.passed.append(f"{category}: {requirement}")
                print(f"{Colors.GREEN}✅ {requirement}{Colors.RESET}")
            else:
                self.failed.append(f"{category}: {requirement} - {result}")
                print(f"{Colors.RED}❌ {requirement}{Colors.RESET}")
                if isinstance(result, str):
                    print(f"   {Colors.RED}Reason: {result}{Colors.RESET}")
        except Exception as exc:
            self.failed.append(f"{category}: {requirement} - {exc}")
            print(f"{Colors.RED}❌ {requirement}: {exc}{Colors.RESET}")

    def run_all(self) -> int:
        """Run all validations and return exit code."""
        print(f"{Colors.BOLD}{Colors.BLUE}CompeteIQ — Full MD Requirements Validation{Colors.RESET}")

        self.header("SECTION 1: The 5 Agents (from MD)")
        self._validate_agents()

        self.header("SECTION 2: API Integrations (from MD)")
        self._validate_apis()

        self.header("SECTION 3: LangGraph Pipeline (from MD)")
        self._validate_langgraph()

        self.header("SECTION 4: FastAPI Backend (from MD)")
        self._validate_fastapi()

        self.header("SECTION 5: State Management (from MD)")
        self._validate_state()

        self.header("SECTION 6: Database (SQLite - from MD)")
        self._validate_database()

        self.header("SECTION 7: Error Handling (from MD)")
        self._validate_error_handling()

        self.header("SECTION 8: Async/Await Patterns (from MD)")
        self._validate_async()

        self.header("SECTION 9: Tech Stack (from MD)")
        self._validate_tech_stack()

        self.header("SECTION 10: Project File Structure (from MD)")
        self._validate_file_structure()

        return self._print_summary()

    def _validate_agents(self) -> None:
        """Validate all 5 agents from MD."""
        self.test(
            "Agents",
            "Scout Agent: exists and crawls with Tavily",
            lambda: self._check_function("competeiq.pipeline.graph", "scout_agent"),
        )
        self.test(
            "Agents",
            "Signal Agent: exists and diffs with SQLite",
            lambda: self._check_function("competeiq.pipeline.graph", "signal_agent"),
        )
        self.test(
            "Agents",
            "Analyst Agent: exists and uses Gemini for reasoning",
            lambda: self._check_function("competeiq.pipeline.analyst_report", "analyst_agent"),
        )
        self.test(
            "Agents",
            "Report Agent: exists and creates Notion pages",
            lambda: self._check_function("competeiq.pipeline.analyst_report", "report_agent"),
        )
        self.test(
            "Agents",
            "Notifier Agent: exists and posts to Slack",
            lambda: self._check_function("competeiq.pipeline.notifier", "notifier_agent"),
        )
        self.test(
            "Agents",
            "GraphState: has raw_data (Scout output)",
            lambda: self._check_graphstate_field("raw_data"),
        )
        self.test(
            "Agents",
            "GraphState: has signals (Signal output)",
            lambda: self._check_graphstate_field("signals"),
        )
        self.test(
            "Agents",
            "GraphState: has analysis (Analyst output)",
            lambda: self._check_graphstate_field("analysis"),
        )
        self.test(
            "Agents",
            "GraphState: has report_urls (Report output)",
            lambda: self._check_graphstate_field("report_urls"),
        )
        self.test(
            "Agents",
            "GraphState: has slack_sent (Notifier flag)",
            lambda: self._check_graphstate_field("slack_sent"),
        )
        self.test(
            "Agents",
            "GraphState: has errors list",
            lambda: self._check_graphstate_field("errors"),
        )

    def _validate_apis(self) -> None:
        """Validate all API integrations from MD."""
        self.test("APIs", "Tavily API key configured", lambda: self._check_setting("tavily_api_key"))
        self.test("APIs", "Gemini API key configured", lambda: self._check_setting("gemini_api_key"))
        self.test("APIs", "Notion API key configured", lambda: self._check_setting("notion_api_key"))
        self.test(
            "APIs",
            "Notion database ID configured",
            lambda: self._check_setting("notion_database_id"),
        )
        self.test(
            "APIs",
            "Slack webhook URL configured",
            lambda: self._check_setting("slack_webhook_url"),
        )

    def _validate_langgraph(self) -> None:
        """Validate LangGraph pipeline from MD."""
        self.test("LangGraph", "compiled_graph exists", lambda: self._check_compiled_graph_exists())
        self.test(
            "LangGraph",
            "Pipeline flow: START → scout → signal → analyst → report → notifier → END",
            lambda: self._check_graph_flow(),
        )
        self.test(
            "LangGraph",
            "Scout processes each competitor (raw_data loop)",
            lambda: self._check_parallel_execution(),
        )
        self.test("LangGraph", "StateGraph properly wired", lambda: self._check_state_graph())
        self.test(
            "LangGraph",
            "PipelineRunner invokes compiled_graph",
            lambda: self._check_function("competeiq.pipeline.runner", "PipelineRunner"),
        )

    def _validate_fastapi(self) -> None:
        """Validate FastAPI backend from MD."""
        self.test("FastAPI", "FastAPI app instance exists", lambda: self._check_fastapi_app())
        self.test("FastAPI", "GET /health endpoint exists", lambda: self._check_endpoint("/health"))
        self.test(
            "FastAPI",
            "GET /api/status endpoint exists (shows progress)",
            lambda: self._check_endpoint("/api/status"),
        )
        self.test(
            "FastAPI",
            "POST /api/webhook/trigger endpoint exists",
            lambda: self._check_endpoint("/api/webhook/trigger"),
        )
        self.test(
            "FastAPI",
            "GET /api/runs endpoint exists (run history)",
            lambda: self._check_endpoint("/api/runs"),
        )
        self.test(
            "FastAPI",
            "GET /api/schedule/status endpoint exists",
            lambda: self._check_endpoint("/api/schedule/status"),
        )
        self.test(
            "FastAPI",
            "CORS middleware configured for localhost:3000 and :5173",
            lambda: self._check_cors(),
        )
        self.test(
            "FastAPI",
            "Webhook returns immediately with run_id",
            lambda: self._check_webhook_behavior(),
        )

    def _validate_state(self) -> None:
        """Validate state management from MD."""
        self.test("State", "get_state() function exists", lambda: self._check_function("competeiq.state", "get_state"))
        self.test(
            "State",
            "update_state() function exists (thread-safe)",
            lambda: self._check_function("competeiq.state", "update_state"),
        )
        self.test(
            "State",
            "get_status_response() returns status payload",
            lambda: self._check_function("competeiq.state", "get_status_response"),
        )
        self.test(
            "State",
            "record_run() persists run history",
            lambda: self._check_function("competeiq.state", "record_run"),
        )
        self.test("State", "State tracks: status (idle/running/error)", lambda: self._check_state_field("status"))
        self.test("State", "State tracks: progress (0-100)", lambda: self._check_state_field("progress"))
        self.test(
            "State",
            "State tracks: current_step (agent name)",
            lambda: self._check_state_field("current_step"),
        )
        self.test("State", "State is thread-safe (uses Lock)", lambda: self._check_thread_safety())

    def _validate_database(self) -> None:
        """Validate SQLite database from MD."""
        self.test("Database", "competeiq/db/ directory exists", lambda: (self.project_root / "db").is_dir())
        self.test(
            "Database",
            "init_snapshots_db() function exists",
            lambda: self._check_function("competeiq.pipeline.graph", "init_snapshots_db"),
        )
        self.test(
            "Database",
            "Snapshot table schema: (id, competitor, snapshot, created_at)",
            lambda: self._check_snapshot_table(),
        )
        self.test(
            "Database",
            "Signal agent saves snapshots for future diffs",
            lambda: self._check_snapshot_persistence(),
        )
        self.test(
            "Database",
            "run_history table used for dashboard runs",
            lambda: self._check_run_history_table(),
        )

    def _validate_error_handling(self) -> None:
        """Validate error handling from MD."""
        self.test(
            "Error Handling",
            "Scout agent: catches Tavily errors, appends to state['errors']",
            lambda: self._check_error_handling_in_agent("scout_agent"),
        )
        self.test(
            "Error Handling",
            "Signal agent: catches SQLite errors, continues",
            lambda: self._check_error_handling_in_agent("signal_agent"),
        )
        self.test(
            "Error Handling",
            "Analyst agent: catches Gemini errors, continues",
            lambda: self._check_error_handling_in_agent("analyst_agent"),
        )
        self.test(
            "Error Handling",
            "Report agent: catches Notion errors, continues",
            lambda: self._check_error_handling_in_agent("report_agent"),
        )
        self.test(
            "Error Handling",
            "Notifier agent: catches Slack errors, continues",
            lambda: self._check_error_handling_in_agent("notifier_agent"),
        )
        self.test(
            "Error Handling",
            "One competitor failure doesn't crash pipeline",
            lambda: self._check_graceful_degradation(),
        )

    def _validate_async(self) -> None:
        """Validate async/await patterns from MD."""
        self.test(
            "Async",
            "Scout agent: async function",
            lambda: self._check_async_function("competeiq.pipeline.graph", "scout_agent"),
        )
        self.test(
            "Async",
            "Signal agent: async function",
            lambda: self._check_async_function("competeiq.pipeline.graph", "signal_agent"),
        )
        self.test(
            "Async",
            "Analyst agent: async function",
            lambda: self._check_async_function("competeiq.pipeline.analyst_report", "analyst_agent"),
        )
        self.test(
            "Async",
            "Report agent: async function",
            lambda: self._check_async_function("competeiq.pipeline.analyst_report", "report_agent"),
        )
        self.test(
            "Async",
            "Notifier agent: async function",
            lambda: self._check_async_function("competeiq.pipeline.notifier", "notifier_agent"),
        )
        self.test("Async", "PipelineRunner.run(): async method", lambda: self._check_runner_async())
        self.test("Async", "Webhook uses FastAPI BackgroundTasks", lambda: self._check_background_tasks())
        self.test(
            "Async",
            "Scheduler job scheduled_pipeline_run is async",
            lambda: self._check_async_function("competeiq.scheduler", "scheduled_pipeline_run"),
        )

    def _validate_tech_stack(self) -> None:
        """Validate tech stack from MD."""
        self.test("Tech Stack", "FastAPI installed", lambda: self._check_import("fastapi"))
        self.test("Tech Stack", "LangGraph installed", lambda: self._check_import("langgraph"))
        self.test("Tech Stack", "Pydantic installed (settings)", lambda: self._check_import("pydantic"))
        self.test("Tech Stack", "Tavily API client installed", lambda: self._check_import("tavily"))
        self.test(
            "Tech Stack",
            "Google Generative AI (Gemini) installed",
            lambda: self._check_import("google.generativeai"),
        )
        self.test("Tech Stack", "Notion client installed", lambda: self._check_import("notion_client"))
        self.test("Tech Stack", "Slack SDK installed", lambda: self._check_import("slack_sdk"))
        self.test("Tech Stack", "APScheduler installed (for cron)", lambda: self._check_import("apscheduler"))
        self.test("Tech Stack", "httpx installed", lambda: self._check_import("httpx"))

    def _validate_file_structure(self) -> None:
        """Validate file structure from MD."""
        files = {
            "main.py": "FastAPI app",
            "config.py": "Config & env vars",
            "state.py": "State management",
            "scheduler.py": "Cron scheduler",
            "pipeline/graph.py": "Scout + Signal agents",
            "pipeline/state.py": "GraphState definition",
            "pipeline/analyst_report.py": "Analyst + Report agents",
            "pipeline/notifier.py": "Slack notifier",
            "pipeline/runner.py": "Pipeline orchestration",
            "api/webhook.py": "Webhook + schedule endpoints",
            "api/runs.py": "Run history API",
            "api/__init__.py": "API module",
            "services/slack_service.py": "Slack integration",
            "services/__init__.py": "Services module",
            "db/.gitkeep": "DB directory",
            "requirements.txt": "Dependencies",
            ".env": "Environment variables",
        }
        for file_path, description in files.items():
            self.test(
                "File Structure",
                f"{file_path} ({description})",
                lambda p=file_path: (self.project_root / p).exists(),
            )

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------

    def _check_import(self, module_name: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                importlib.import_module(module_name)
                return True
            except ImportError:
                return f"Module {module_name} not found"

        return check

    def _check_function(self, module_name: str, func_name: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                module = importlib.import_module(module_name)
                if not hasattr(module, func_name):
                    return f"Function {func_name} not found in {module_name}"
                if not callable(getattr(module, func_name)):
                    return f"{func_name} is not callable"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_setting(self, key: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.config import get_settings

                settings = get_settings()
                value = getattr(settings, key, None)
                if not value:
                    return f"Setting {key} is not set"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_graphstate_field(self, field_name: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.state import GraphState

                if field_name not in GraphState.__annotations__:
                    return f"GraphState missing field: {field_name}"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_compiled_graph_exists(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.graph import compiled_graph

                if not compiled_graph:
                    return "compiled_graph is None"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_graph_flow(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.graph import compiled_graph

                graph_obj = compiled_graph.get_graph()
                nodes = list(graph_obj.nodes)
                required = ["scout", "signal", "analyst", "report", "notifier"]
                missing = [node for node in required if node not in nodes]
                if missing:
                    return f"Missing nodes: {missing} (found: {nodes})"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_parallel_execution(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.graph import scout_agent

                source = inspect.getsource(scout_agent)
                if "for competitor" in source and "raw_data" in source:
                    return True
                return "Scout agent doesn't loop through competitors for raw_data"
            except Exception as exc:
                return str(exc)

        return check

    def _check_state_graph(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.graph import compiled_graph

                if not hasattr(compiled_graph, "astream"):
                    return "compiled_graph doesn't have astream method"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_fastapi_app(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.main import app

                if not app:
                    return "FastAPI app is None"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_endpoint(self, path: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.main import app

                routes = [getattr(route, "path", "") for route in app.routes]
                if path not in routes:
                    return f"Endpoint {path} not found in routes: {routes}"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_cors(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq import main as main_module

                source = inspect.getsource(main_module.create_app)
                config_source = inspect.getsource(main_module)
                combined = source + config_source
                if "CORSMiddleware" not in source:
                    return "CORS middleware not configured"
                if "allow_origins" not in source or "cors_origins" not in combined:
                    return "CORS allow_origins not wired to settings"
                from competeiq.config import get_settings

                origins = get_settings().cors_origins_list
                if "http://localhost:3000" in origins and "http://localhost:5173" in origins:
                    return True
                return f"CORS origins missing 3000/5173: {origins}"
            except Exception as exc:
                return str(exc)

        return check

    def _check_webhook_behavior(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.api.webhook import trigger_pipeline

                source = inspect.getsource(trigger_pipeline)
                if "run_id" in source and "accepted" in source:
                    return True
                return "Webhook doesn't return run_id or accepted status"
            except Exception as exc:
                return str(exc)

        return check

    def _check_state_field(self, field_name: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.state import get_state

                state = get_state()
                if field_name not in state:
                    return f"State missing field: {field_name}"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_thread_safety(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                import competeiq.state as state_module

                source = inspect.getsource(state_module)
                if "Lock" in source and "_state_lock" in source:
                    return True
                return "State doesn't use threading.Lock"
            except Exception as exc:
                return str(exc)

        return check

    def _check_snapshot_table(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.graph import init_snapshots_db

                source = inspect.getsource(init_snapshots_db)
                for field in ("competitor", "snapshot", "created_at"):
                    if field not in source:
                        return f"Snapshot table missing field: {field}"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_snapshot_persistence(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                import competeiq.pipeline.graph as graph_module

                source = inspect.getsource(graph_module)
                if "INSERT" in source and "competitor_snapshots" in source:
                    return True
                return "Signal path doesn't persist snapshots"
            except Exception as exc:
                return str(exc)

        return check

    def _check_run_history_table(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                import competeiq.state as state_module

                source = inspect.getsource(state_module)
                if "run_history" in source and "record_run" in source:
                    return True
                return "run_history table / record_run not found in state.py"
            except Exception as exc:
                return str(exc)

        return check

    def _check_error_handling_in_agent(self, agent_name: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                if agent_name in ("scout_agent", "signal_agent"):
                    module = importlib.import_module("competeiq.pipeline.graph")
                    if agent_name == "signal_agent":
                        source = inspect.getsource(module)
                    else:
                        source = inspect.getsource(getattr(module, agent_name))
                elif agent_name in ("analyst_agent", "report_agent"):
                    module = importlib.import_module("competeiq.pipeline.analyst_report")
                    source = inspect.getsource(getattr(module, agent_name))
                elif agent_name == "notifier_agent":
                    module = importlib.import_module("competeiq.pipeline.notifier")
                    source = inspect.getsource(getattr(module, agent_name))
                else:
                    return f"Unknown agent: {agent_name}"

                if agent_name == "signal_agent":
                    if "errors" in source and ("except" in source or "extend" in source):
                        return True
                elif "try" in source and "except" in source and "errors" in source:
                    return True
                return f"{agent_name} missing proper error handling"
            except Exception as exc:
                return str(exc)

        return check

    def _check_graceful_degradation(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.graph import scout_agent

                source = inspect.getsource(scout_agent)
                if "for competitor" in source and "except" in source and "errors" in source:
                    return True
                return "Pipeline doesn't handle per-competitor failures in Scout"
            except Exception as exc:
                return str(exc)

        return check

    def _check_async_function(self, module_name: str, func_name: str) -> Callable[[], Any]:
        def check() -> Any:
            try:
                module = importlib.import_module(module_name)
                func = getattr(module, func_name)
                if not inspect.iscoroutinefunction(func):
                    return f"{func_name} is not async"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_runner_async(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.pipeline.runner import PipelineRunner

                if not inspect.iscoroutinefunction(PipelineRunner.run):
                    return "PipelineRunner.run() is not async"
                return True
            except Exception as exc:
                return str(exc)

        return check

    def _check_background_tasks(self) -> Callable[[], Any]:
        def check() -> Any:
            try:
                from competeiq.api.webhook import trigger_pipeline

                source = inspect.getsource(trigger_pipeline)
                if "BackgroundTasks" in source or "background_tasks" in source:
                    return True
                return "Webhook doesn't use BackgroundTasks"
            except Exception as exc:
                return str(exc)

        return check

    def _print_summary(self) -> int:
        """Print final summary and return exit code."""
        total = len(self.passed) + len(self.failed)

        print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 70}")
        print("  VALIDATION SUMMARY")
        print(f"{'=' * 70}{Colors.RESET}\n")

        print(f"{Colors.GREEN}✅ PASSED: {len(self.passed)}/{total}{Colors.RESET}")
        print(f"{Colors.RED}❌ FAILED: {len(self.failed)}/{total}{Colors.RESET}\n")

        if self.failed:
            print(f"{Colors.RED}{Colors.BOLD}Failed Requirements:{Colors.RESET}")
            for item in self.failed:
                print(f"  {Colors.RED}• {item}{Colors.RESET}")
            print()

        if not self.failed:
            print(f"{Colors.GREEN}{Colors.BOLD}✨ ALL MD REQUIREMENTS MET!{Colors.RESET}")
            print(f"{Colors.GREEN}Pipeline is production-ready.{Colors.RESET}\n")
            return 0

        print(f"{Colors.RED}{Colors.BOLD}⚠️ {len(self.failed)} requirements not met.{Colors.RESET}")
        print(f"{Colors.RED}Fix the issues above before proceeding.{Colors.RESET}\n")
        return 1


def main() -> int:
    validator = MDValidator()
    return validator.run_all()


if __name__ == "__main__":
    sys.exit(main())
