import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from competeiq.pipeline.runner import PipelineRunner
from competeiq.state import get_state
import logging

logging.basicConfig(level=logging.INFO)

async def main():
    runner = PipelineRunner()
    print("Running pipeline...")
    result = await runner.run("test-run-123", ["linear.app"])
    print("Final State:", get_state())

if __name__ == "__main__":
    asyncio.run(main())
