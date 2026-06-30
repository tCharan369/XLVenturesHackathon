"""
Explanation Agent — builds evidence summaries, computes logical confidence scores,
and compiles reasoning traces for final recommendation payloads.

Confidence score is computed mathematically (not asserted by LLM) based on:
1. Evidence node counts.
2. Source agreement (penalized by reasoning conflicts).
3. Historical human acceptance rate from episodic memory (SQLite).
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from backend.core.schemas import EvidenceNode, ComputedConfidence, CandidateAction, Recommendation
from backend.memory.episodic import SessionLocal, RecommendationRecord, FeedbackRecord

logger = logging.getLogger(__name__)


def _get_historical_acceptance(domain_pack_id: str, action_title: str) -> float:
    """
    Query episodic memory to find the historical acceptance rate of a recommendation action.
    Returns 0.85 as a default fallback if no history exists.
    """
    try:
        with SessionLocal() as session:
            rows = (
                session.query(FeedbackRecord, RecommendationRecord)
                .join(RecommendationRecord, RecommendationRecord.recommendation_id == FeedbackRecord.recommendation_id)
                .filter(RecommendationRecord.domain_pack_id == domain_pack_id)
                .all()
            )

            total = 0
            approved = 0

            for fb, rec in rows:
                try:
                    rec_data = json.loads(rec.recommendation_json)
                    selected = rec_data.get("selected_action") or {}
                    # Check if the title matches
                    if selected.get("title") == action_title:
                        total += 1
                        if fb.outcome == "approved":
                            approved += 1
                except Exception:
                    continue

            if total == 0:
                logger.info(f"ExplanationAgent: No history found for action '{action_title}'. Using default 0.85.")
                return 0.85

            rate = approved / total
            logger.info(f"ExplanationAgent: Found history for action '{action_title}': {approved}/{total} ({rate:.2f}).")
            return rate
    except Exception as e:
        logger.warning(f"ExplanationAgent: Failed to query history: {e}. Using default 0.85.")
        return 0.85


class ExplanationAgent:
    """
    Builds the final recommendation explanation payload.

    Input:
        {
            "domain_pack_id": str,
            "entity": dict,
            "interaction": str,
            "retrieved_context": dict,
            "reasoning_output": dict,
            "recommendation_output": dict,
        }

    Output:
        {
            "recommendation_id": str,
            "entity_id": str,
            "domain_pack_id": str,
            "candidate_actions": List[dict],
            "selected_action": dict,
            "evidence": List[dict],
            "reasoning_trace": List[str],
            "computed_confidence": dict,
            "created_at": datetime,
            "metadata": dict,
        }
    """

    name = "explanation_agent"
    description = "Computes confidence score and compile reasoning trace explanation."
    capabilities = ["compute_confidence", "generate_explanation"]

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute confidence score and compile reasoning trace."""
        domain_pack_id = input_data["domain_pack_id"]
        entity = input_data["entity"]
        retrieved_context = input_data["retrieved_context"]
        reasoning_output = input_data["reasoning_output"]
        recommendation_output = input_data["recommendation_output"]

        entity_id = entity.get("account_id") or entity.get("candidate_id") or "unknown_entity"

        evidence = retrieved_context.get("evidence", [])
        conflicts = reasoning_output.get("conflicts", [])

        # 1. Gather Selected Action details
        candidate_actions = recommendation_output.get("candidate_actions", [])
        selected_action_id = recommendation_output.get("selected_action_id")

        selected_action_dict = None
        for act in candidate_actions:
            if act["id"] == selected_action_id:
                selected_action_dict = act
                break

        action_title = selected_action_dict.get("title") if selected_action_dict else "Unknown Action"

        # 2. Compute Confidence Score
        # A. Evidence node count baseline
        evidence_count = len(evidence)
        if evidence_count == 0:
            baseline = 0.50
        elif evidence_count == 1:
            baseline = 0.70
        elif evidence_count == 2:
            baseline = 0.85
        else:
            baseline = 0.95

        # B. Source agreement (penalized by reasoning conflicts)
        # Each conflict reduces agreement by 0.25
        source_agreement = max(1.0 - (0.25 * len(conflicts)), 0.0)

        # C. Historical acceptance rate from SQLite
        historical_acceptance_rate = _get_historical_acceptance(domain_pack_id, action_title)

        # D. Final Weighted Confidence Score
        score = baseline * (0.6 * source_agreement + 0.4 * historical_acceptance_rate)
        score = max(min(score, 1.0), 0.0)

        computed_confidence = ComputedConfidence(
            score=round(score, 2),
            evidence_count=evidence_count,
            source_agreement=round(source_agreement, 2),
            historical_acceptance_rate=round(historical_acceptance_rate, 2),
        )

        # 3. Compile Reasoning Trace
        reasoning_trace = [
            f"Context Agent: retrieved {retrieved_context.get('metadata', {}).get('playbook_count', 0)} playbook(s) and {retrieved_context.get('metadata', {}).get('past_case_count', 0)} past case(s). Query used: '{retrieved_context.get('query')}'",
            f"Reasoning Agent: identified {len(reasoning_output.get('risks', []))} risk(s) and {len(reasoning_output.get('opportunities', []))} opportunity(s). Conflicts detected: {len(conflicts)}",
            f"Recommendation Agent: generated {len(candidate_actions)} candidate action(s). Selected primary action: '{action_title}'",
            f"Explanation Agent: computed logical confidence score of {score:.2f} based on {evidence_count} evidence node(s), {source_agreement:.2f} source agreement, and {historical_acceptance_rate:.2f} historical acceptance",
        ]

        rec_id = f"rec_{uuid.uuid4().hex[:12]}"

        # Construct payload adhering to schemas.py Recommendation model
        return {
            "recommendation_id": rec_id,
            "entity_id": entity_id,
            "domain_pack_id": domain_pack_id,
            "candidate_actions": candidate_actions,
            "selected_action": selected_action_dict,
            "evidence": evidence,
            "reasoning_trace": reasoning_trace,
            "computed_confidence": computed_confidence.model_dump(),
            "created_at": datetime.utcnow(),
            "metadata": {
                "evidence_count": evidence_count,
                "conflicts_count": len(conflicts),
                "historical_acceptance_rate": historical_acceptance_rate,
            },
        }
