"""
LLM Client — central HTTP wrapper with timeout, exponential backoff retries, and circuit breaker.
"""

import time
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Circuit Breaker state
_circuit_state = {
    "llm_available": True,
    "failure_count": 0,
    "last_failure_time": 0.0,
    "cooldown_period_seconds": 60.0,
}

def is_llm_available() -> bool:
    """Check if the LLM circuit breaker is active or in cooldown."""
    if not _circuit_state["llm_available"]:
        elapsed = time.time() - _circuit_state["last_failure_time"]
        if elapsed > _circuit_state["cooldown_period_seconds"]:
            # Cooldown elapsed, attempt half-open state recovery
            logger.info("Circuit Breaker: Cooldown period elapsed. Attempting LLM connection recovery.")
            _circuit_state["llm_available"] = True
            _circuit_state["failure_count"] = 0
            return True
        return False
    return True

def record_success() -> None:
    """Reset circuit breaker failure count on success."""
    _circuit_state["llm_available"] = True
    _circuit_state["failure_count"] = 0

def record_failure() -> None:
    """Increment failure count and trip the circuit breaker if consecutive failures >= 3."""
    _circuit_state["failure_count"] += 1
    logger.warning(f"Circuit Breaker: Recorded consecutive failure #{_circuit_state['failure_count']}")
    if _circuit_state["failure_count"] >= 3:
        _circuit_state["llm_available"] = False
        _circuit_state["last_failure_time"] = time.time()
        logger.error(f"Circuit Breaker: Tripped! LLM calls disabled for {_circuit_state['cooldown_period_seconds']} seconds.")

from contextvars import ContextVar
llm_call_counter: ContextVar[int] = ContextVar("llm_call_counter", default=0)

def call_llm(
    url: str,
    headers: dict,
    json_payload: dict,
    timeout: int = 20,
    max_retries: int = 2,
) -> dict:
    """
    Central wrapper to post LLM chat request with timeout, retries, and circuit breaker protection.
    Raises Exception if LLM is unavailable or fails after all retries.
    """
    if not is_llm_available():
        raise RuntimeError("LLM Circuit Breaker is active. LLM service temporarily unavailable.")

    # Cost protection limit check
    from backend.core.settings import settings
    current_calls = llm_call_counter.get() + 1
    llm_call_counter.set(current_calls)
    
    if current_calls > settings.MAX_LLM_CALLS_PER_REQUEST:
        msg = f"Cost Protection: Exceeded maximum allowed LLM calls ({settings.MAX_LLM_CALLS_PER_REQUEST}) per request."
        logger.error(msg)
        raise RuntimeError(msg)

    attempt = 0
    backoff_sec = 1.0

    while attempt <= max_retries:
        try:
            logger.info(f"LLM Client: Attempting API post to {url} (attempt {attempt + 1}/{max_retries + 1})...")
            resp = requests.post(
                url,
                headers=headers,
                json=json_payload,
                timeout=timeout,
            )
            resp.raise_for_status()
            
            # Reset on success
            record_success()
            return resp.json()

        except Exception as e:
            attempt += 1
            logger.warning(f"LLM Client attempt {attempt} failed: {e}")
            if attempt <= max_retries:
                sleep_time = backoff_sec * (2 ** (attempt - 1))
                logger.info(f"LLM Client: Sleeping {sleep_time}s before retrying...")
                time.sleep(sleep_time)
            else:
                # Record overall final failure to circuit breaker
                record_failure()
                raise e
                
    raise RuntimeError("LLM call failed after maximum retries.")
