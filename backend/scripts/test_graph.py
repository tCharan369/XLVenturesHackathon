"""
Test Graph — verifies the LangGraph compilation, routing paths, and
human-in-the-loop pause/resume flow.

Usage:
    PYTHONPATH=. python backend/scripts/test_graph.py
"""

import os
import sys
import uuid
from pathlib import Path

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.registry.agent_registry import bootstrap_agents
from backend.core.config_loader import load_domain_pack, load_accounts
from backend.core.planner import graph

SEPARATOR = "=" * 80
SUB_SEP = "-" * 80


def run_graph_test_case(label: str, account_id: str, expected_path: str) -> dict:
    """Run a full graph execution for an account and return final metadata."""
    print(f"\n{SUB_SEP}")
    print(f"🎬 TEST CASE: {label} (Account: {account_id})")
    print(SUB_SEP)

    # 1. Load domain and account
    domain_pack = load_domain_pack("customer_success")
    accounts = load_accounts("customer_success")
    account = next(a for a in accounts if a["account_id"] == account_id)
    
    # 2. Build state
    state = {
        "domain_pack": domain_pack,
        "account": account,
        "retrieved_context": {},
        "reasoning_output": {},
        "recommendation_output": {},
        "explanation_output": {},
        "evidence": [],
        "confidence": {},
        "human_feedback": None,
        "metadata": {},
    }

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    # 3. Stream up to interrupt
    print(f"   Step 1: Ingesting interaction and running graph (Thread: {thread_id})...")
    for event in graph.stream(state, config):
        pass

    # 4. Get checkpoint state values
    checkpoint = graph.get_state(config)
    values = checkpoint.values
    routing_path = values.get("metadata", {}).get("routing_path")
    
    print(f"   ✅ Pause Hit at Interrupt. Routed Path: '{routing_path}' (Expected: '{expected_path}')")
    assert routing_path == expected_path, f"Expected routing path '{expected_path}', got '{routing_path}'."

    # Validate node executions based on route
    if expected_path == "escalation":
        assert values.get("reasoning_output"), "Escalation path should execute ReasoningAgent."
        assert values.get("recommendation_output"), "Escalation path should execute RecommendationAgent."
    else:
        assert values.get("reasoning_output"), "Standard path should populate stub reasoning."
        assert values.get("recommendation_output"), "Standard path should generate routine actions."

    assert values.get("explanation_output"), "Explanation node should execute on both paths."

    # Print action details
    rec = values["explanation_output"]
    selected = rec["selected_action"]
    print(f"   💡 Recommendation generated: '{selected['title']}' (Confidence: {rec['computed_confidence']['score']:.2f})")

    # 5. Submit human feedback & resume
    print(f"   Step 2: Submitting Human Approval...")
    human_feedback = {
        "human_feedback": {
            "outcome": "approved",
            "feedback_text": f"Approved by test script for {account_id}."
        }
    }
    graph.update_state(config, human_feedback, as_node="human_approval_node")
    
    # Resume graph execution
    for event in graph.stream(None, config):
        pass

    # 6. Fetch final state values
    final_checkpoint = graph.get_state(config)
    final_values = final_checkpoint.values
    
    outcome_id = final_values.get("metadata", {}).get("outcome_feedback_id")
    reflection_status = final_values.get("metadata", {}).get("reflection_status")
    
    print(f"   ✅ Resumption complete. Outcome logged to SQLite (Feedback ID: {outcome_id})")
    print(f"   ✅ Reflection triggered. Writeback status: '{reflection_status}'")
    
    assert outcome_id, "Should have saved feedback record to episodic SQLite."
    assert reflection_status == "success", "Should have run semantic reflection job."
    
    return final_values


def main():
    # Bootstrap agent registry
    bootstrap_agents()

    print(SEPARATOR)
    print("  LANGGRAPH PLATFORM ORCHESTRATION & ROUTING INTEGRATION TESTS")
    print(SEPARATOR)

    # 1. Escalation path (ApexAnalytics, health=42, renewal risk)
    run_graph_test_case(
        label="Escalation Path (Renewal Risk)",
        account_id="acc_cs_001",
        expected_path="escalation"
    )

    # 2. Standard path (Vertex Retail, health=88, stable check-in)
    run_graph_test_case(
        label="Standard Path (Routine check-in)",
        account_id="acc_cs_005",
        expected_path="standard"
    )

    print(f"\n{SEPARATOR}")
    print("🎉 ALL LANGGRAPH ROUTING AND RESUMPTION TESTS PASSED!")
    print(SEPARATOR)


if __name__ == "__main__":
    main()
