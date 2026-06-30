"""
Test Pipeline Partial — runs the Context Agent ➔ Reasoning Agent ➔ Recommendation Agent
pipeline on representative accounts and candidates.

Prints:
- reasoning summary
- detected risks
- detected opportunities
- 3 ranked CandidateActions
- chosen action
- rejected reasons

Usage:
    PYTHONPATH=. python backend/scripts/test_pipeline_partial.py
"""

import os
import sys
from pathlib import Path

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.registry.agent_registry import bootstrap_agents, get_agent
from backend.core.config_loader import load_accounts

SEPARATOR = "=" * 80
SUB_SEP = "-" * 80


def run_pipeline_for_entity(domain_pack_id: str, entity: dict, interaction: str) -> None:
    """Run the 3-agent pipeline for a single entity and print results."""
    # 1. Get agents from registry
    context_agent = get_agent("context_agent")["agent"]
    reasoning_agent = get_agent("reasoning_agent")["agent"]
    recommendation_agent = get_agent("recommendation_agent")["agent"]

    print(f"\nRunning pipeline for: {entity.get('company_name') or entity.get('candidate_name')} (ID: {entity.get('account_id') or entity.get('candidate_id')})")
    print(f"Interaction: \"{interaction[:120]}...\"")

    # Step 1: Context Agent
    context_out = context_agent.run({
        "domain_pack_id": domain_pack_id,
        "entity": entity,
        "interaction": interaction,
    })

    # Step 2: Reasoning Agent
    reasoning_out = reasoning_agent.run({
        "domain_pack_id": domain_pack_id,
        "entity": entity,
        "interaction": interaction,
        "retrieved_context": context_out,
    })

    # Step 3: Recommendation Agent
    recommendation_out = recommendation_agent.run({
        "domain_pack_id": domain_pack_id,
        "entity": entity,
        "interaction": interaction,
        "retrieved_context": context_out,
        "reasoning_output": reasoning_out,
    })

    # Print requested outputs
    print(SUB_SEP)
    print("🧠 REASONING SUMMARY:")
    print(f"   {reasoning_out['reasoning_summary']}")

    print("\n⚠️  DETECTED RISKS:")
    if reasoning_out.get("risks"):
        for risk in reasoning_out["risks"]:
            print(f"   • {risk}")
    else:
        print("   (none)")

    print("\n⭐ DETECTED OPPORTUNITIES:")
    if reasoning_out.get("opportunities"):
        for opp in reasoning_out["opportunities"]:
            print(f"   • {opp}")
    else:
        print("   (none)")

    print("\n📋 3 RANKED CANDIDATE ACTIONS:")
    actions = recommendation_out.get("candidate_actions", [])
    selected_id = recommendation_out.get("selected_action_id")
    selected_action = None

    for idx, act in enumerate(actions, 1):
        is_selected = act["id"] == selected_id
        sel_marker = "[SELECTED]" if is_selected else "[REJECTED]"
        if is_selected:
            selected_action = act
        print(f"   {idx}. {sel_marker} {act['title']} (Confidence: {act.get('confidence'):.2f}, Val: {act.get('business_value_score')}, Feas: {act.get('feasibility_score')})")
        print(f"      Description: {act['description']}")
        print(f"      Rationale: {act['rationale']}")

    print("\n👉 CHOSEN ACTION:")
    if selected_action:
        print(f"   • {selected_action['title']}")
        print(f"     Description: {selected_action['description']}")
        print(f"     Expected Impact: {selected_action.get('expected_impact')}")
    else:
        print("   (none)")

    print("\n❌ REJECTED REASONS:")
    has_rejected = False
    for act in actions:
        if act["id"] != selected_id:
            has_rejected = True
            print(f"   • Action: \"{act['title']}\"")
            print(f"     Reason: {act.get('rejected_reason') or 'No reason provided.'}")
    if not has_rejected:
        print("   (none)")
    print(SEPARATOR)


def main():
    # Bootstrap registry
    bootstrap_agents()

    print(SEPARATOR)
    print("  AGENTIC DECISION INTELLIGENCE PLATFORM — PIPELINE TEST (SHIFT 4)")
    print(SEPARATOR)

    # 1. Customer Success Domain Test Cases
    cs_accounts = load_accounts("customer_success")

    # Case A: Renewal Risk (ApexAnalytics)
    acc_risk = next(a for a in cs_accounts if a["account_id"] == "acc_cs_001")
    run_pipeline_for_entity("customer_success", acc_risk, acc_risk["interaction_notes"])

    # Case B: Upsell Opportunity (CloudSphere Solutions)
    acc_upsell = next(a for a in cs_accounts if a["account_id"] == "acc_cs_002")
    run_pipeline_for_entity("customer_success", acc_upsell, acc_upsell["interaction_notes"])

    # Case C: Champion Change Risk (BioHealth Systems)
    acc_champion = next(a for a in cs_accounts if a["account_id"] == "acc_cs_003")
    run_pipeline_for_entity("customer_success", acc_champion, acc_champion["interaction_notes"])

    # Case D: Escalation Risk (ZettaBytes Data)
    acc_escalation = next(a for a in cs_accounts if a["account_id"] == "acc_cs_004")
    run_pipeline_for_entity("customer_success", acc_escalation, acc_escalation["interaction_notes"])

    # 2. Recruitment Domain Test Cases
    rec_candidates = load_accounts("recruitment")

    # Case E: Fast-Track Candidate (Alice Vance)
    cand_fast = next(c for c in rec_candidates if c["candidate_id"] == "cand_rec_001")
    run_pipeline_for_entity("recruitment", cand_fast, cand_fast["recruiter_notes"])

    # Case F: Candidate Dropout Risk (Marcus Aurelius)
    cand_drop = next(c for c in rec_candidates if c["candidate_id"] == "cand_rec_002")
    run_pipeline_for_entity("recruitment", cand_drop, cand_drop["recruiter_notes"])


if __name__ == "__main__":
    main()
