"""
Tool Registry — global registry of callable tools available to agents.

Pre-registers platform tools via ``bootstrap_tools()`` so the planner
can discover tool descriptions and schemas at runtime.
"""

from typing import Dict, Any, List, Callable, Optional

# Global registry storage for tools
_tools: Dict[str, Dict[str, Any]] = {}


def register_tool(
    name: str,
    fn: Callable,
    description: str,
    input_schema: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Register a tool function with its description and optional input schema.
    """
    _tools[name] = {
        "name": name,
        "func": fn,
        "description": description,
        "input_schema": input_schema,
    }


def get_tool(name: str) -> Dict[str, Any]:
    """
    Retrieve a registered tool by name.

    Raises KeyError if the tool is not registered.
    """
    if name not in _tools:
        raise KeyError(f"Tool '{name}' is not registered in the Tool Registry.")
    return _tools[name]


def list_tools() -> List[Dict[str, Any]]:
    """
    List all registered tools with their metadata.
    """
    return list(_tools.values())


# ---------------------------------------------------------------------------
# Pre-registered platform tools
# ---------------------------------------------------------------------------


def _search_accounts(domain_pack_id: str) -> list:
    """Load account/candidate records for a domain."""
    from backend.core.config_loader import load_accounts
    return load_accounts(domain_pack_id)


def _query_playbooks(domain_pack_id: str, query: str, k: int = 3) -> list:
    """Semantic search over playbook documents."""
    from backend.memory.semantic import query
    return query(domain_pack_id, query, k=k)


def _get_similar_cases(domain_pack_id: str, query: str, limit: int = 5) -> list:
    """Fuzzy-match past recommendations from episodic memory."""
    from backend.memory.episodic import get_similar_past_cases
    return get_similar_past_cases(domain_pack_id, query, limit=limit)


def bootstrap_tools() -> None:
    """
    Register all built-in platform tools.

    Call once at application startup (e.g. in FastAPI lifespan).
    """
    register_tool(
        name="search_accounts",
        fn=_search_accounts,
        description="Search and retrieve account or candidate records for a given domain pack.",
        input_schema={
            "type": "object",
            "properties": {
                "domain_pack_id": {"type": "string", "description": "ID of the domain pack to search"},
            },
            "required": ["domain_pack_id"],
        },
    )

    register_tool(
        name="query_playbooks",
        fn=_query_playbooks,
        description="Semantically search domain playbooks for guidance relevant to a query.",
        input_schema={
            "type": "object",
            "properties": {
                "domain_pack_id": {"type": "string", "description": "ID of the domain pack"},
                "query": {"type": "string", "description": "Natural language query to search playbooks"},
                "k": {"type": "integer", "description": "Number of results to return", "default": 3},
            },
            "required": ["domain_pack_id", "query"],
        },
    )

    register_tool(
        name="get_similar_cases",
        fn=_get_similar_cases,
        description="Retrieve historically similar recommendations from episodic memory using fuzzy text matching.",
        input_schema={
            "type": "object",
            "properties": {
                "domain_pack_id": {"type": "string", "description": "ID of the domain pack"},
                "query": {"type": "string", "description": "Text to match against past recommendations"},
                "limit": {"type": "integer", "description": "Max results to return", "default": 5},
            },
            "required": ["domain_pack_id", "query"],
        },
    )
