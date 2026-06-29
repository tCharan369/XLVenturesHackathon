"""
Interaction Analyzer — lightweight signal extraction agent.

Extracts business signals from free-text customer/candidate interactions
using keyword heuristics. Optional LLM enrichment when API key is available.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Signal definitions
# ---------------------------------------------------------------------------

CS_SIGNALS = {
    "champion_change": {
        "keywords": ["champion left", "champion resigned", "champion departed", "sponsor left",
                      "sponsor resigned", "primary contact left", "key contact departed",
                      "champion change", "left the company", "departed"],
        "severity": "high",
        "decision_points": ["renewal", "retention"],
    },
    "renewal_risk": {
        "keywords": ["renewal risk", "renewal due", "renewal approaching", "contract expiring",
                      "renewal delayed", "may not renew", "renewal concern"],
        "severity": "high",
        "decision_points": ["renewal"],
    },
    "usage_decline": {
        "keywords": ["usage dropped", "usage declined", "usage decreased", "adoption down",
                      "usage falling", "lower adoption", "usage drop", "usage down"],
        "severity": "high",
        "decision_points": ["retention", "expansion"],
    },
    "budget_freeze": {
        "keywords": ["budget freeze", "budget cut", "spending freeze", "cost cutting",
                      "budget reduction", "no budget", "budget constrained"],
        "severity": "high",
        "decision_points": ["expansion", "renewal"],
    },
    "escalation": {
        "keywords": ["escalation", "escalated", "sla breach", "critical incident", "p1 incident",
                      "p1 bug", "outage", "data loss", "angry", "furious", "terminate",
                      "contract termination", "leadership call"],
        "severity": "critical",
        "decision_points": ["retention", "renewal"],
    },
    "expansion_opportunity": {
        "keywords": ["expansion", "upsell", "new team", "additional seats", "more users",
                      "new division", "scale up", "grow footprint", "add-on", "upgrade"],
        "severity": "low",
        "decision_points": ["expansion"],
    },
    "positive_sentiment": {
        "keywords": ["happy", "satisfied", "love the product", "great experience",
                      "excellent", "pleased", "impressed", "smooth", "running well"],
        "severity": "low",
        "decision_points": ["expansion", "retention"],
    },
    "negative_sentiment": {
        "keywords": ["unhappy", "frustrated", "disappointed", "dissatisfied",
                      "poor experience", "not working", "broken", "terrible"],
        "severity": "high",
        "decision_points": ["retention"],
    },
    "executive_engagement": {
        "keywords": ["executive sponsor", "c-level", "cto", "cfo", "ceo", "vp",
                      "executive requested", "leadership meeting", "board level"],
        "severity": "medium",
        "decision_points": ["renewal", "expansion"],
    },
    "competitive_threat": {
        "keywords": ["competitor", "competitive", "alternative", "evaluating other",
                      "looking at", "switch to", "replace with", "competitive threat"],
        "severity": "high",
        "decision_points": ["retention", "renewal"],
    },
    "pricing_objection": {
        "keywords": ["pricing", "too expensive", "cost concern", "price reduction",
                      "discount", "pricing objection", "pricing concession",
                      "lower price", "cheaper"],
        "severity": "medium",
        "decision_points": ["renewal", "expansion"],
    },
    "procurement_delay": {
        "keywords": ["procurement", "procurement delay", "legal review", "contract review",
                      "pending approval", "internal approval", "buying committee"],
        "severity": "medium",
        "decision_points": ["renewal"],
    },
    "product_adoption_growth": {
        "keywords": ["adoption increased", "feature adoption", "usage increased",
                      "onboarded new team", "completed training", "usage up",
                      "adoption growth", "usage grew"],
        "severity": "low",
        "decision_points": ["expansion"],
    },
    "churn_signal": {
        "keywords": ["churn", "cancel", "cancellation", "terminate account",
                      "end contract", "not renewing", "will leave"],
        "severity": "critical",
        "decision_points": ["retention", "renewal"],
    },
    "feature_request": {
        "keywords": ["feature request", "need feature", "missing feature",
                      "want capability", "roadmap request", "enhancement"],
        "severity": "low",
        "decision_points": ["retention", "expansion"],
    },
}

RECRUITMENT_SIGNALS = {
    "candidate_dropoff": {
        "keywords": ["dropout", "dropped out", "no response", "ghosted", "disengaged",
                      "withdrew", "not interested", "pulled out"],
        "severity": "high",
        "decision_points": ["pipeline"],
    },
    "competing_offer": {
        "keywords": ["competing offer", "counter offer", "other offer", "another company",
                      "received offer", "rival offer"],
        "severity": "high",
        "decision_points": ["offer", "pipeline"],
    },
    "salary_concern": {
        "keywords": ["salary concern", "compensation", "pay range", "salary negotiation",
                      "salary expectation", "higher salary", "salary too low"],
        "severity": "medium",
        "decision_points": ["offer"],
    },
    "strong_fit": {
        "keywords": ["strong fit", "excellent candidate", "top candidate", "highly qualified",
                      "perfect match", "great interview", "strong performance"],
        "severity": "low",
        "decision_points": ["offer"],
    },
    "interview_delay": {
        "keywords": ["interview delay", "rescheduled", "postponed", "scheduling conflict",
                      "delayed interview", "interview pushed"],
        "severity": "medium",
        "decision_points": ["pipeline"],
    },
    "positive_feedback": {
        "keywords": ["positive feedback", "great feedback", "passed interview",
                      "strong recommendation", "team liked"],
        "severity": "low",
        "decision_points": ["offer", "pipeline"],
    },
    "negative_feedback": {
        "keywords": ["negative feedback", "poor performance", "failed interview",
                      "concerns raised", "not recommended", "weak performance"],
        "severity": "high",
        "decision_points": ["pipeline"],
    },
    "urgent_hiring_need": {
        "keywords": ["urgent hire", "immediate need", "critical role", "backfill needed",
                      "priority hire", "asap", "urgent requirement"],
        "severity": "high",
        "decision_points": ["pipeline", "offer"],
    },
    "offer_acceptance_signal": {
        "keywords": ["ready to accept", "verbal acceptance", "will sign", "excited to join",
                      "accepted offer", "confirmed start"],
        "severity": "low",
        "decision_points": ["offer"],
    },
}


# Severity weights for impact calculation
SEVERITY_WEIGHTS = {
    "critical": 30,
    "high": 20,
    "medium": 10,
    "low": 5,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_interaction(
    content: str,
    domain_pack_id: str,
    entity: dict = None,
) -> Dict[str, Any]:
    """
    Analyze interaction text and extract business signals.

    Returns dict with: signals, severity, impacted_decision_points,
    impact_score, recommendation.
    """
    content_lower = content.lower()

    signal_defs = CS_SIGNALS if domain_pack_id == "customer_success" else RECRUITMENT_SIGNALS

    detected_signals: List[str] = []
    max_severity = "low"
    all_decision_points: set = set()
    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}

    for signal_name, signal_def in signal_defs.items():
        for keyword in signal_def["keywords"]:
            if keyword in content_lower:
                detected_signals.append(signal_name)
                # Track highest severity
                if severity_order.get(signal_def["severity"], 0) > severity_order.get(max_severity, 0):
                    max_severity = signal_def["severity"]
                all_decision_points.update(signal_def["decision_points"])
                break  # one match per signal is enough

    # Calculate impact score (0-100)
    impact_score = 0
    for signal in detected_signals:
        sev = signal_defs[signal]["severity"]
        impact_score += SEVERITY_WEIGHTS.get(sev, 5)
    impact_score = min(impact_score, 100)

    # Generate brief recommendation summary
    recommendation = _generate_recommendation(detected_signals, max_severity, domain_pack_id)

    logger.info(
        f"InteractionAnalyzer: Extracted {len(detected_signals)} signal(s) "
        f"from interaction. Severity: {max_severity}, Impact: {impact_score}."
    )

    return {
        "signals": detected_signals,
        "severity": max_severity,
        "impacted_decision_points": sorted(all_decision_points),
        "impact_score": impact_score,
        "recommendation": recommendation,
    }


def _generate_recommendation(signals: List[str], severity: str, domain: str) -> str:
    """Generate a brief action recommendation based on detected signals."""
    if not signals:
        return "No significant signals detected. Continue monitoring."

    if severity == "critical":
        return "Immediate executive intervention required. Critical risk indicators detected."
    if severity == "high":
        if "champion_change" in signals:
            return "Initiate stakeholder mapping and schedule executive alignment call."
        if "usage_decline" in signals:
            return "Deploy adoption recovery playbook and schedule usage review."
        if "budget_freeze" in signals:
            return "Prepare value justification materials and schedule ROI review."
        if "competitive_threat" in signals:
            return "Activate competitive displacement defense and schedule strategic review."
        if "candidate_dropoff" in signals:
            return "Re-engage candidate immediately with personalized outreach."
        if "competing_offer" in signals:
            return "Expedite offer process and prepare competitive counter-proposal."
        return "Elevated risk detected. Schedule urgent review meeting."
    if severity == "medium":
        return "Monitor situation closely. Consider proactive outreach within 48 hours."
    return "Positive signals detected. Leverage for expansion or strengthening relationship."
