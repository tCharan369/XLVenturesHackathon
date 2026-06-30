"""
Agent Registry — global registry of agent implementations.

Supports registration by name with description, capabilities, and
an optional callable agent instance.
"""

from typing import Dict, Any, List, Optional


# Global registry storage for agents
_agents: Dict[str, Dict[str, Any]] = {}


def register_agent(
    name: str,
    agent: Any,
    description: str,
    capabilities: Optional[List[str]] = None,
) -> None:
    """
    Register an agent with its metadata in the global registry.
    """
    _agents[name] = {
        "name": name,
        "agent": agent,
        "description": description,
        "capabilities": capabilities or [],
    }


def get_agent(name: str) -> Dict[str, Any]:
    """
    Retrieve a registered agent by name.

    Raises KeyError if the agent is not registered.
    """
    if name not in _agents:
        raise KeyError(f"Agent '{name}' is not registered in the Agent Registry.")
    return _agents[name]


def list_agents() -> List[Dict[str, Any]]:
    """
    List metadata for all registered agents.
    """
    return list(_agents.values())


# ---------------------------------------------------------------------------
# Bootstrap — register all built-in agents
# ---------------------------------------------------------------------------


def bootstrap_agents() -> None:
    """
    Register all built-in platform agents.

    Call once at application startup.
    """
    from backend.agents.context_agent import ContextAgent
    from backend.agents.reasoning_agent import ReasoningAgent
    from backend.agents.recommendation_agent import RecommendationAgent
    from backend.agents.explanation_agent import ExplanationAgent
    from backend.agents.learning_agent import LearningAgent

    ctx = ContextAgent()
    register_agent(
        name=ctx.name,
        agent=ctx,
        description=ctx.description,
        capabilities=ctx.capabilities,
    )

    reasoning = ReasoningAgent()
    register_agent(
        name=reasoning.name,
        agent=reasoning,
        description=reasoning.description,
        capabilities=reasoning.capabilities,
    )

    recommendation = RecommendationAgent()
    register_agent(
        name=recommendation.name,
        agent=recommendation,
        description=recommendation.description,
        capabilities=recommendation.capabilities,
    )

    explanation = ExplanationAgent()
    register_agent(
        name=explanation.name,
        agent=explanation,
        description=explanation.description,
        capabilities=explanation.capabilities,
    )

    learning = LearningAgent()
    register_agent(
        name=learning.name,
        agent=learning,
        description=learning.description,
        capabilities=learning.capabilities,
    )


