"""
Memory Manager — unified retrieval interface for agents.

Orchestrates queries across both episodic (SQLite) and semantic (ChromaDB)
memory layers so downstream agents never interact with storage directly.
"""

import time
from typing import Dict, Any

from backend.memory import episodic, semantic


# Guardrail limits for memory retrieval
MIN_SIMILARITY_SCORE = 0.35
MAX_PLAYBOOKS = 5
MAX_PAST_CASES = 3
MAX_CONTEXT_CHARS = 4000
MAX_EVIDENCE_ITEMS = 10

class MemoryManager:
    """
    Unified memory manager abstraction layer.
    Agents call ``retrieve_context`` and receive a combined payload of
    playbook snippets, historical case data, and retrieval metadata.
    """

    def retrieve_context(self, domain_pack_id: str, query: str) -> Dict[str, Any]:
        t0 = time.perf_counter()

        # Limit query text size
        safe_query = query[:MAX_CONTEXT_CHARS]

        # Query playbooks with limits
        playbooks = semantic.query(domain_pack_id, safe_query, k=MAX_PLAYBOOKS)
        
        # Dynamically retrieve and append learned heuristics if they exist
        learned = semantic.get_document_by_id(domain_pack_id, "learned_heuristics")
        if learned and not any(pb["id"] == "learned_heuristics" for pb in playbooks):
            playbooks.append(learned)

        # Truncate to max playbooks
        playbooks = playbooks[:MAX_PLAYBOOKS]

        # Query past cases with similarity score threshold & limits
        raw_past_cases = episodic.get_similar_past_cases(domain_pack_id, safe_query, limit=5)
        
        # Filter by minimum similarity score (0.35 -> 35.0%)
        past_cases = [
            case for case in raw_past_cases
            if (case.get("similarity_score", 0) / 100.0) >= MIN_SIMILARITY_SCORE
        ]
        past_cases = past_cases[:MAX_PAST_CASES]

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "playbooks": playbooks,
            "past_cases": past_cases,
            "metadata": {
                "playbook_count": len(playbooks),
                "past_case_count": len(past_cases),
                "latency_ms": latency_ms,
            },
        }


# Global singleton — importable by agents and API routes.
memory_manager = MemoryManager()
