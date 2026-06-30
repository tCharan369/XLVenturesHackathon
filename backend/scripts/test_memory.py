"""
Test Memory — executable script that validates all memory subsystems.

Usage:
    PYTHONPATH=. python backend/scripts/test_memory.py

Runs 9 sequential tests (no pytest required):
    1. Write a recommendation to episodic memory
    2. Write feedback for that recommendation
    3. Retrieve similar cases
    4. Query playbooks from semantic memory
    5. Call memory manager for combined context
    6. Verify retrieval metadata exists
    7. Verify collection auto-creation works
    8. Verify clear functions work
    9. Verify recruitment playbooks are retrievable
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.memory.episodic import (
    write_recommendation, write_feedback, get_similar_past_cases,
    delete_recommendation, clear_domain_memory,
)
from backend.memory.semantic import query as semantic_query, add_documents, clear_collection
from backend.memory.manager import memory_manager

DOMAIN = "customer_success"
SEPARATOR = "-" * 60
_passed = 0
_failed = 0


def _report(test_num: int, name: str, ok: bool, detail: str = ""):
    global _passed, _failed
    icon = "✅" if ok else "❌"
    print(f"{icon} TEST {test_num}: {name}")
    if detail:
        print(f"   {detail}")
    if ok:
        _passed += 1
    else:
        _failed += 1


# ───────────────────────── Tests ─────────────────────────


def test_1_write_recommendation() -> str:
    print(f"\n{SEPARATOR}")
    rec_dict = {
        "entity_id": "acc_cs_001",
        "domain_pack_id": DOMAIN,
        "selected_action": {
            "title": "Schedule Executive Alignment Call",
            "description": "Urgent call with VP of Engineering to address declining usage.",
            "rationale": "Usage dropped 25% and health score is 42 — renewal risk is critical.",
        },
        "evidence": [
            {"source": "usage_metrics", "content": "-25% usage over 30 days"},
            {"source": "support_ticket_4412", "content": "Open for 5 days regarding API performance"},
        ],
    }
    rec_id = write_recommendation("acc_cs_001", DOMAIN, rec_dict)
    _report(1, "Write Recommendation", bool(rec_id), f"rec_id={rec_id}")
    return rec_id


def test_2_write_feedback(rec_id: str) -> str:
    print(f"\n{SEPARATOR}")
    fb_id = write_feedback(
        recommendation_id=rec_id,
        entity_id="acc_cs_001",
        domain_pack_id=DOMAIN,
        human_feedback="Good recommendation. Scheduling the call for tomorrow morning.",
        outcome="approved",
    )
    _report(2, "Write Feedback", bool(fb_id), f"fb_id={fb_id}")
    return fb_id


def test_3_similar_cases():
    print(f"\n{SEPARATOR}")
    cases = get_similar_past_cases(DOMAIN, "customer usage declining and renewal approaching", limit=3)
    _report(3, "Retrieve Similar Cases", len(cases) > 0, f"found {len(cases)} case(s)")
    for i, c in enumerate(cases, 1):
        print(f"   {i}. rec_id={c['recommendation_id']}  similarity={c['similarity_score']:.1f}")


def test_4_query_playbooks():
    print(f"\n{SEPARATOR}")
    results = semantic_query(DOMAIN, "customer at risk of churning, renewal coming up soon", k=3)
    _report(4, "Query Playbooks (Semantic)", len(results) > 0, f"retrieved {len(results)} playbook(s)")
    for i, r in enumerate(results, 1):
        snippet = r["content"][:100].replace("\n", " ")
        print(f"   {i}. id={r['id']}  distance={r['distance']:.4f}  \"{snippet}...\"")


def test_5_memory_manager():
    print(f"\n{SEPARATOR}")
    context = memory_manager.retrieve_context(DOMAIN, "declining usage and renewal risk")
    ok = len(context["playbooks"]) > 0 and "metadata" in context
    _report(5, "Memory Manager — Combined Context", ok,
            f"playbooks={len(context['playbooks'])}  past_cases={len(context['past_cases'])}")


def test_6_retrieval_metadata():
    print(f"\n{SEPARATOR}")
    context = memory_manager.retrieve_context(DOMAIN, "churn risk")
    meta = context.get("metadata", {})
    has_all = all(k in meta for k in ("playbook_count", "past_case_count", "latency_ms"))
    _report(6, "Retrieval Metadata Exists", has_all,
            f"metadata={meta}")


def test_7_auto_creation():
    print(f"\n{SEPARATOR}")
    # Query a brand-new domain that has never been seeded — should return empty, not crash
    results = semantic_query("nonexistent_test_domain", "anything", k=1)
    _report(7, "Collection Auto-Creation", isinstance(results, list),
            f"returned {len(results)} result(s) from auto-created empty collection")


def test_8_clear_functions(rec_id: str):
    print(f"\n{SEPARATOR}")
    # Delete single recommendation
    deleted = delete_recommendation(rec_id)
    # Clear a test domain's episodic memory
    test_rec_id = write_recommendation("test_entity", "test_clear_domain", {"test": True})
    cleared = clear_domain_memory("test_clear_domain")
    # Clear a semantic collection
    add_documents("test_clear_domain", [{"id": "doc1", "content": "test", "metadata": {"type": "test"}}])
    col_deleted = clear_collection("test_clear_domain")
    ok = deleted and cleared > 0 and col_deleted
    _report(8, "Clear / Delete Functions", ok,
            f"delete_rec={deleted}  clear_domain={cleared} rows  clear_collection={col_deleted}")


def test_9_recruitment_playbooks():
    print(f"\n{SEPARATOR}")
    results = semantic_query("recruitment", "candidate not responding to offer", k=3)
    _report(9, "Recruitment Playbooks Retrievable", len(results) > 0,
            f"retrieved {len(results)} playbook(s)")
    for i, r in enumerate(results, 1):
        snippet = r["content"][:100].replace("\n", " ")
        print(f"   {i}. id={r['id']}  distance={r['distance']:.4f}  \"{snippet}...\"")


# ───────────────────────── Main ─────────────────────────


def main():
    print("=" * 60)
    print("  Memory Subsystem Integration Tests")
    print("=" * 60)

    rec_id = test_1_write_recommendation()
    test_2_write_feedback(rec_id)
    test_3_similar_cases()
    test_4_query_playbooks()
    test_5_memory_manager()
    test_6_retrieval_metadata()
    test_7_auto_creation()
    test_8_clear_functions(rec_id)
    test_9_recruitment_playbooks()

    print(f"\n{'=' * 60}")
    print(f"  Results: {_passed} passed, {_failed} failed out of {_passed + _failed}")
    print(f"{'=' * 60}")

    if _failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
