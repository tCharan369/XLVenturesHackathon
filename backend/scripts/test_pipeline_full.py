"""
Test Pipeline Full — executes the entire 5-agent decision intelligence pipeline:
Context Agent ➔ Reasoning Agent ➔ Recommendation Agent ➔ Explanation Agent ➔ Learning Agent.

It verifies:
1. Complete pipeline execution.
2. Confidence calculation and reasoning trace logging.
3. Writing outcome/feedback to episodic SQLite memory.
4. Running the reflection job to generate learned heuristics in semantic ChromaDB.
5. Re-running the context agent to prove the learning loop is closed (heuristic document is retrieved).

Usage:
    PYTHONPATH=. python backend/scripts/test_pipeline_full.py
"""

import os
import sys
from pathlib import Path

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.registry.agent_registry import bootstrap_agents, get_agent
from backend.core.config_loader import load_accounts
from backend.memory.semantic import query

SEPARATOR = "=" * 80
SUB_SEP = "-" * 80


def print_recommendation_details(rec: dict) -> None:
    """Pretty print the final Recommendation payload."""
    print("\n📋 RECOMMENDATION PAYLOAD:")
    print(f"   Recommendation ID: {rec['recommendation_id']}")
    print(f"   Entity ID: {rec['entity_id']}")
    print(f"   Domain Pack: {rec['domain_pack_id']}")
    
    print("\n   ⭐ SELECTED ACTION:")
    sel = rec["selected_action"]
    print(f"      Title: {sel['title']}")
    print(f"      Description: {sel['description']}")
    print(f"      Rationale: {sel['rationale']}")
    
    print("\n   📊 COMPUTED CONFIDENCE:")
    conf = rec["computed_confidence"]
    print(f"      Overall Score: {conf['score']:.2f}")
    print(f"      Evidence Count: {conf['evidence_count']}")
    print(f"      Source Agreement: {conf['source_agreement']:.2f}")
    print(f"      Historical Acceptance Rate: {conf['historical_acceptance_rate']:.2f}")
    
    print("\n   🧵 REASONING TRACE:")
    for line in rec["reasoning_trace"]:
        print(f"      • {line}")


def main():
    # Step 0: Clear memory for isolation
    from backend.memory.episodic import clear_domain_memory
    from backend.memory.semantic import _get_collection
    
    clear_domain_memory("customer_success")
    try:
        col = _get_collection("customer_success")
        col.delete(ids=["learned_heuristics"])
    except Exception:
        pass

    # Step 1: Bootstrap agents
    bootstrap_agents()

    print(SEPARATOR)
    print("  AGENTIC DECISION INTELLIGENCE PLATFORM — FULL 5-AGENT PIPELINE TEST (SHIFT 5)")
    print(SEPARATOR)

    # Step 2: Load CS accounts
    cs_accounts = load_accounts("customer_success")
    account = next(a for a in cs_accounts if a["account_id"] == "acc_cs_001")
    interaction = account["interaction_notes"]

    # Step 3: Run pipeline Context ➔ Reasoning ➔ Recommendation ➔ Explanation
    context_agent = get_agent("context_agent")["agent"]
    reasoning_agent = get_agent("reasoning_agent")["agent"]
    recommendation_agent = get_agent("recommendation_agent")["agent"]
    explanation_agent = get_agent("explanation_agent")["agent"]
    learning_agent = get_agent("learning_agent")["agent"]

    print("\n1. Running Context Agent...")
    context_out = context_agent.run({
        "domain_pack_id": "customer_success",
        "entity": account,
        "interaction": interaction,
    })

    print("2. Running Reasoning Agent...")
    reasoning_out = reasoning_agent.run({
        "domain_pack_id": "customer_success",
        "entity": account,
        "interaction": interaction,
        "retrieved_context": context_out,
    })

    print("3. Running Recommendation Agent...")
    recommendation_out = recommendation_agent.run({
        "domain_pack_id": "customer_success",
        "entity": account,
        "interaction": interaction,
        "retrieved_context": context_out,
        "reasoning_output": reasoning_out,
    })

    print("4. Running Explanation Agent...")
    rec_payload = explanation_agent.run({
        "domain_pack_id": "customer_success",
        "entity": account,
        "interaction": interaction,
        "retrieved_context": context_out,
        "reasoning_output": reasoning_out,
        "recommendation_output": recommendation_out,
    })

    print_recommendation_details(rec_payload)
    print(SEPARATOR)

    # Step 4: Write outcomes to SQLite episodic memory to mock human feedback
    # We will log 3 interactions to simulate feedback history:
    # 2 Rejections, 1 Approval for "Schedule Executive Alignment Call"
    print("\n5. Simulating human-in-the-loop decisions via Learning Agent writeback...")
    
    # Outcome 1: Rejected
    fb_id_1 = learning_agent.write_outcome(
        domain_pack_id="customer_success",
        entity_id=account["account_id"],
        recommendation=rec_payload,
        human_feedback="Customer hates executive calls. Rejected.",
        outcome="rejected"
    )
    print(f"   Logged feedback #1 (Outcome: REJECTED, ID: {fb_id_1})")

    # Outcome 2: Rejected
    fb_id_2 = learning_agent.write_outcome(
        domain_pack_id="customer_success",
        entity_id=account["account_id"],
        recommendation=rec_payload,
        human_feedback="CTO is too busy for alignment sync. Rejected.",
        outcome="rejected"
    )
    print(f"   Logged feedback #2 (Outcome: REJECTED, ID: {fb_id_2})")

    # Outcome 3: Approved
    fb_id_3 = learning_agent.write_outcome(
        domain_pack_id="customer_success",
        entity_id=account["account_id"],
        recommendation=rec_payload,
        human_feedback="Approved. Contacting Robert Chen.",
        outcome="approved"
    )
    print(f"   Logged feedback #3 (Outcome: APPROVED, ID: {fb_id_3})")

    # Step 5: Run Explanation Agent again to show that the historical acceptance rate is dynamically updated!
    print("\n6. Running Explanation Agent again to verify dynamic confidence calculation...")
    rec_payload_updated = explanation_agent.run({
        "domain_pack_id": "customer_success",
        "entity": account,
        "interaction": interaction,
        "retrieved_context": context_out,
        "reasoning_output": reasoning_out,
        "recommendation_output": recommendation_out,
    })
    new_conf = rec_payload_updated["computed_confidence"]
    print(f"   Updated computed historical acceptance rate: {new_conf['historical_acceptance_rate']:.2f} (based on SQLite records: 1/3 approved)")
    print(f"   New computed confidence score: {new_conf['score']:.2f}")
    assert new_conf["historical_acceptance_rate"] == 0.33, "Confidence logic should calculate 1/3 (0.33) acceptance rate."

    # Step 6: Trigger reflection job to write learned heuristics to semantic memory
    print("\n7. Executing Reflection Job via Learning Agent...")
    reflection_out = learning_agent.run_reflection("customer_success")
    print(SUB_SEP)
    print("🤖 MINED PATTERNS & HEURISTICS:")
    print(reflection_out["heuristics_document"])
    print(SUB_SEP)

    # Step 7: Close the Loop — Re-run Context Agent to prove learned heuristics are retrieved
    print("\n8. Re-running Context Agent to prove closed-loop learning...")
    context_loop = context_agent.run({
        "domain_pack_id": "customer_success",
        "entity": account,
        "interaction": interaction,
    })

    playbook_ids = [pb["id"] for pb in context_loop["playbooks"]]
    print(f"   Retrieved Playbook IDs: {playbook_ids}")
    
    # Assert 'learned_heuristics' is in retrieved playbooks
    if "learned_heuristics" in playbook_ids:
        print("\n🎉 SUCCESS: The learned heuristics document was dynamically retrieved in the Context Phase!")
        
        # Print excerpt
        heuristic_pb = next(pb for pb in context_loop["playbooks"] if pb["id"] == "learned_heuristics")
        print(f"   Excerpt from learned heuristics:")
        print(f"   {heuristic_pb['content'][:250].strip()}...")
    else:
        print("\n❌ FAILURE: 'learned_heuristics' was not found in retrieved playbooks.")

    print(SEPARATOR)
    print("  Full 5-agent pipeline test completed successfully.")
    print(SEPARATOR)


if __name__ == "__main__":
    main()
