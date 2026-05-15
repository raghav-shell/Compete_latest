"""LLM utility functions with robust exponential backoff for rate limiting.

Uses the OpenAI-compatible G0i.ai gateway to call DeepSeek V3.2.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI, RateLimitError, APIConnectionError, InternalServerError, APITimeoutError
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger(__name__)

# Default model served by G0i.ai
DEFAULT_MODEL = "deepseek-v3.2"

# G0i.ai base URL
G0I_BASE_URL = "https://api.g0i.ai/v1"


def _clean_response(text: str) -> str:
    """Strip markdown code fences (```json ... ```) that models sometimes wrap around JSON."""
    text = text.strip()
    # Remove ```json or ``` prefix
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    # Remove trailing ```
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def get_llm_client(api_key: str) -> OpenAI:
    """Create an OpenAI-compatible client pointing at G0i.ai."""
    return OpenAI(api_key=api_key, base_url=G0I_BASE_URL)


def _log_retry(retry_state: Any) -> None:
    """Log when a retry happens."""
    logger.warning(
        "Rate limit or API error hit. Retrying LLM call... (Attempt %s/5)",
        retry_state.attempt_number,
    )


# Only retry on specific transient API exceptions.
_retryable_exceptions = (
    RateLimitError,
    APIConnectionError,
    InternalServerError,
    APITimeoutError,
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
    client: OpenAI,
    prompt: str,
    *,
    model: str = DEFAULT_MODEL,
    json_mode: bool = False,
    temperature: float = 0.7,
) -> str:
    """
    Generate content using DeepSeek V3.2 via G0i.ai with exponential backoff.

    Args:
        client: An OpenAI-compatible client configured for G0i.ai.
        prompt: The user prompt to send.
        model: Model identifier (default: deepseek-v3.2).
        json_mode: If True, instruct the model to return strict JSON.
        temperature: Sampling temperature.

    Returns:
        The text content of the assistant's response.
    """
    system_msg = "You are a helpful AI assistant."
    if json_mode:
        system_msg = (
            "You are a helpful AI assistant. You MUST respond with ONLY valid JSON. "
            "No markdown, no backticks, no explanatory text — just raw JSON."
        )

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": prompt},
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )

    raw = response.choices[0].message.content or ""
    return _clean_response(raw)
