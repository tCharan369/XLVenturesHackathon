"""
Test Context Agent — runs the ContextAgent on two contrasting accounts
and prints the retrieval results side-by-side.

Usage:
    PYTHONPATH=. python backend/scripts/test_context_agent.py

Expected behaviour:
    - Renewal-risk account → retrieves renewal_risk first, with reranking boost
    - Healthy account      → retrieves healthy_account first, with reranking boost
    - Evidence sorted by confidence descending
    - Retrieval metadata, missing information, and latency printed
    - Outputs are visibly different, proving dynamic retrieval
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.agents.context_agent import ContextAgent
from backend.core.config_loader import load_accounts

SEPARATOR = "=" * 70
SUB_SEP = "-" * 60


def print_result(label: str, result: dict) -> None:
    """Pretty-print a context agent result."""
    print(f"\n{SEPARATOR}")
    print(f"  {label}")
    print(SEPARATOR)

    print(f"\n📝 Interaction:")
    print(f"   {result['raw_interaction'][:200]}")

    print(f"\n🔍 Generated Query:")
    print(f"   {result['query']}")

    print(f"\n📚 Retrieved Playbooks ({len(result['playbooks'])}):")
    for i, pb in enumerate(result["playbooks"], 1):
        dist = pb.get("distance", "?")
        print(f"   {i}. {pb['id']}  (distance={dist:.4f})" if isinstance(dist, float) else f"   {i}. {pb['id']}")

    print(f"\n🗂️  Retrieved Past Cases ({len(result['past_cases'])}):")
    if result["past_cases"]:
        for i, case in enumerate(result["past_cases"], 1):
            print(f"   {i}. rec_id={case['recommendation_id']}  similarity={case['similarity_score']:.1f}")
    else:
        print("   (none)")

    print(f"\n🧩 Evidence Nodes ({len(result['evidence'])}) — sorted by confidence desc:")
    for i, ev in enumerate(result["evidence"], 1):
        snippet = ev["content"][:100].replace("\n", " ")
        rt = ev["metadata"].get("retrieval_type", "?")
        print(f"   {i}. [{ev['source_type']}|{rt}] {ev['source']}  confidence={ev['confidence']:.2f}")
        print(f"      \"{snippet}...\"")

    print(f"\n⭐ Top Evidence: {result['metadata']['top_evidence']}")

    print(f"\n⚠️  Missing Information ({len(result['missing_information'])}):")
    if result["missing_information"]:
        for m in result["missing_information"]:
            print(f"   • {m}")
    else:
        print("   (none)")

    print(f"\n📋 Retrieval Summary:")
    print(f"   {result['retrieval_summary']}")

    print(f"\n📊 Metadata:")
    meta = result["metadata"]
    print(f"   playbook_count={meta['playbook_count']}  "
          f"past_case_count={meta['past_case_count']}  "
          f"latency_ms={meta['latency_ms']}")


def main():
    agent = ContextAgent()
    accounts = load_accounts("customer_success")

    # --- Scenario 1: Renewal-risk account (acc_cs_001, health_score=42) ---
    risk_account = next(a for a in accounts if a["account_id"] == "acc_cs_001")
    risk_result = agent.run({
        "domain_pack_id": "customer_success",
        "entity": risk_account,
        "interaction": risk_account["interaction_notes"],
    })
    print_result("SCENARIO 1: Renewal-Risk Account (ApexAnalytics, health=42)", risk_result)

    # --- Scenario 2: Healthy account (acc_cs_002, health_score=95) ---
    healthy_account = next(a for a in accounts if a["account_id"] == "acc_cs_002")
    healthy_result = agent.run({
        "domain_pack_id": "customer_success",
        "entity": healthy_account,
        "interaction": healthy_account["interaction_notes"],
    })
    print_result("SCENARIO 2: Healthy Account (CloudSphere, health=95)", healthy_result)

    # --- Compare ---
    print(f"\n{SEPARATOR}")
    print("  COMPARISON — Dynamic Retrieval Proof")
    print(SEPARATOR)

    risk_ranked = [pb["id"] for pb in risk_result["playbooks"]]
    healthy_ranked = [pb["id"] for pb in healthy_result["playbooks"]]

    risk_top = risk_ranked[0] if risk_ranked else None
    healthy_top = healthy_ranked[0] if healthy_ranked else None

    print(f"\n  Risk account ranking:    {risk_ranked}")
    print(f"  Healthy account ranking: {healthy_ranked}")
    print(f"  Risk top playbook:       {risk_top}")
    print(f"  Healthy top playbook:    {healthy_top}")

    print(f"\n  Risk query:    {risk_result['query'][:80]}")
    print(f"  Healthy query: {healthy_result['query'][:80]}")

    # Validate dynamism
    checks_passed = 0

    if risk_ranked != healthy_ranked:
        print(f"\n  ✅ Ranking order differs between scenarios.")
        checks_passed += 1
    else:
        print(f"\n  ⚠️  Ranking order is identical.")

    if risk_top != healthy_top:
        print(f"  ✅ Top-ranked playbook differs (risk={risk_top}, healthy={healthy_top}).")
        checks_passed += 1
    else:
        print(f"  ⚠️  Top-ranked playbook is the same.")

    if risk_result["query"] != healthy_result["query"]:
        print(f"  ✅ Generated queries are different.")
        checks_passed += 1
    else:
        print(f"  ⚠️  Generated queries are identical.")

    risk_conf = [e["confidence"] for e in risk_result["evidence"] if e["source_type"] == "playbook"]
    healthy_conf = [e["confidence"] for e in healthy_result["evidence"] if e["source_type"] == "playbook"]
    if risk_conf != healthy_conf:
        print(f"  ✅ Confidence scores differ.")
        checks_passed += 1

    # Verify evidence is sorted by confidence descending
    risk_all_conf = [e["confidence"] for e in risk_result["evidence"]]
    healthy_all_conf = [e["confidence"] for e in healthy_result["evidence"]]
    if risk_all_conf == sorted(risk_all_conf, reverse=True) and healthy_all_conf == sorted(healthy_all_conf, reverse=True):
        print(f"  ✅ Evidence is sorted by confidence descending.")
        checks_passed += 1

    # Verify retrieval_type metadata exists
    all_evidence = risk_result["evidence"] + healthy_result["evidence"]
    if all(e["metadata"].get("retrieval_type") in ("semantic", "episodic") for e in all_evidence):
        print(f"  ✅ All evidence nodes have retrieval_type metadata.")
        checks_passed += 1

    # Verify retrieval metadata exists
    for label, result in [("risk", risk_result), ("healthy", healthy_result)]:
        meta = result.get("metadata", {})
        if all(k in meta for k in ("query", "playbook_count", "past_case_count", "top_evidence", "latency_ms")):
            print(f"  ✅ {label.capitalize()} metadata has all required fields.")
            checks_passed += 1

    print(f"\n  Dynamic retrieval checks passed: {checks_passed}/8")

    print(f"\n{SEPARATOR}")
    print("  Context Agent test complete.")
    print(SEPARATOR)


if __name__ == "__main__":
    main()
