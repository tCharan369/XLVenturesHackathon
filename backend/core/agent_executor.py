"""
Agent Executor — safety wrapper to catch agent failures, log traces, and recover gracefully using fallback heuristic routines.
"""

import logging
from typing import Callable, Any, Dict

logger = logging.getLogger(__name__)

def execute_agent(agent_fn: Callable[..., Any], *args, **kwargs) -> Dict[str, Any]:
    """
    Wrap agent function execution.
    Gracefully catches exceptions and marks trace flags for system audit logs.
    """
    try:
        logger.info(f"AgentExecutor: Executing agent node {agent_fn.__name__}...")
        result = agent_fn(*args, **kwargs)
        return {
            "success": True,
            "result": result,
            "error": None,
            "fallback_used": False,
        }
    except Exception as e:
        logger.error(f"AgentExecutor: Exception raised during agent node execution: {e}", exc_info=True)
        return {
            "success": False,
            "result": {},
            "error": {"type": type(e).__name__, "message": str(e)},
            "fallback_used": True,
        }
    return {}
