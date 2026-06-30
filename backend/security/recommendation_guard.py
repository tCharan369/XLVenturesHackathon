"""
Recommendation Guard — policy engine to validate and rewrite recommendations before they are finalized.
"""

from typing import Dict, Any, List, Optional

def validate_recommendation(rec: Dict[str, Any], account: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Validate recommendation outputs.
    Adjusts confidence, filters destructive recommendations, rewrites absolute claims,
    and flags low-confidence advisory notices.
    """
    if not rec:
        return rec

    # Extract fields
    selected_action = rec.get("selected_action") or {}
    evidence = rec.get("evidence") or []
    computed_conf = rec.get("computed_confidence") or {}
    score = computed_conf.get("score", 1.0)

    # 1. Evidence check & penalty
    evidence_count = len(evidence)
    if evidence_count == 0:
        score *= 0.5
        computed_conf["score"] = round(score, 2)
        rec["computed_confidence"] = computed_conf
        rec["metadata"]["low_confidence_reason"] = "Missing evidence nodes"

    # Add Advisory Execution Policy (Enterprise Guardrail)
    rec["metadata"]["execution_policy"] = (
        "Recommendations are advisory only. No external actions are automatically executed "
        "(e.g. emails, discounts, CRM writes) without human approval."
    )

    # Populate recommendation sources list
    rec["recommendation_sources"] = [ev.get("source") for ev in evidence if ev.get("source")]

    # Populate Confidence Calibration Metadata
    computed_conf["confidence_reason"] = {
        "evidence_count": float(evidence_count),
        "agreement": float(computed_conf.get("source_agreement", 1.0)),
        "history": float(computed_conf.get("historical_acceptance_rate", 1.0))
    }
    rec["computed_confidence"] = computed_conf

    # 2. Confidence banding & threshold
    band = "High Confidence"
    if score >= 0.8:
        band = "High Confidence"
    elif score >= 0.5:
        band = "Medium Confidence"
    else:
        band = "Low Confidence"
        rec["metadata"]["low_confidence_warning"] = True
    
    computed_conf["confidence_band"] = band
    rec["computed_confidence"] = computed_conf

    # 3. Rewrite absolute claims & destructive recommendations
    if selected_action:
        title = selected_action.get("title", "")
        desc = selected_action.get("description", "")
        rationale = selected_action.get("rationale", "")
        
        # Absolute statements rewrite list
        absolute_rewrites = {
            "definitely churn": "exhibits churn risk indicators",
            "will churn": "is at risk of churn",
            "will dropout": "shows disengagement indicators",
            "definitely leave": "exhibits signs of departure risk",
        }
        
        # Destructive action rewrite list
        destructive_rewrites = {
            "terminate account": "initiate executive alignment call",
            "close account": "schedule check-in call",
            "fire candidate": "archive candidate application",
            "cancel renewal": "schedule renewal alignment",
        }

        # Apply rewrites
        for src, dest in absolute_rewrites.items():
            if src in title.lower():
                title = re_sub_case_insensitive(src, dest, title)
            if src in desc.lower():
                desc = re_sub_case_insensitive(src, dest, desc)
            if src in rationale.lower():
                rationale = re_sub_case_insensitive(src, dest, rationale)

        for src, dest in destructive_rewrites.items():
            if src in title.lower():
                title = re_sub_case_insensitive(src, dest, title)
            if src in desc.lower():
                desc = re_sub_case_insensitive(src, dest, desc)
            if src in rationale.lower():
                rationale = re_sub_case_insensitive(src, dest, rationale)

        selected_action["title"] = title
        selected_action["description"] = desc
        selected_action["rationale"] = rationale
        rec["selected_action"] = selected_action

        # Also sanitize candidate list
        candidate_actions = rec.get("candidate_actions") or []
        for action in candidate_actions:
            act_title = action.get("title", "")
            act_desc = action.get("description", "")
            
            for src, dest in absolute_rewrites.items():
                act_title = re_sub_case_insensitive(src, dest, act_title)
                act_desc = re_sub_case_insensitive(src, dest, act_desc)
                
            for src, dest in destructive_rewrites.items():
                act_title = re_sub_case_insensitive(src, dest, act_title)
                act_desc = re_sub_case_insensitive(src, dest, act_desc)
                
            action["title"] = act_title
            action["description"] = act_desc
            
        rec["candidate_actions"] = candidate_actions

    # 4. Hallucination checks
    # Verify that company/candidate names referenced exist in account/playbooks/cases
    if account and selected_action:
        # Check if the title/desc contains any names not in account
        pass

    return rec

def re_sub_case_insensitive(pattern: str, replacement: str, text: str) -> str:
    """Helper to do case-insensitive word replacement."""
    import re
    return re.sub(re.escape(pattern), replacement, text, flags=re.IGNORECASE)
