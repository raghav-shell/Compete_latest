"""LLM utility functions with robust exponential backoff for rate limiting."""

from __future__ import annotations

import logging
from typing import Any

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, InternalServerError, ServiceUnavailable
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger(__name__)


def _log_retry(retry_state: Any) -> None:
    """Log when a retry happens."""
    logger.warning(
        "Rate limit or API error hit. Retrying Gemini API call... (Attempt %s/5)",
        retry_state.attempt_number,
    )


# Only retry on specific transient Google API exceptions.
_retryable_exceptions = (
    ResourceExhausted,
    InternalServerError,
    ServiceUnavailable,
    ConnectionError,
    TimeoutError,
)

@retry(
    wait=wait_exponential(multiplier=2, min=4, max=20),
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type(_retryable_exceptions),
    before_sleep=_log_retry,
    reraise=True,
)
def generate_with_retry(
    model: genai.GenerativeModel,
    prompt: str,
    generation_config: genai.types.GenerationConfig | None = None,
) -> Any:
    """
    Generate content using Gemini with exponential backoff.
    
    If Google APIs return 429 Too Many Requests (ResourceExhausted) or 503,
    this function will pause and retry up to 5 times.
    """
    if generation_config:
        return model.generate_content(prompt, generation_config=generation_config)
    return model.generate_content(prompt)
