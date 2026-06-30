"""
Impact Assessment Engine — computes delta impact scores from extracted signals.

Takes signals from the InteractionAnalyzer and produces quantified risk/opportunity
deltas across renewal, churn, and expansion dimensions.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Signal → Impact Lookup
# ---------------------------------------------------------------------------

SIGNAL_IMPACT_MAP = {
    # Customer Success signals
    "champion_change":          {"renewal_risk_delta": 25, "churn_probability_delta": 20, "expansion_probability_delta": -15},
    "renewal_risk":             {"renewal_risk_delta": 30, "churn_probability_delta": 15, "expansion_probability_delta": -10},
    "usage_decline":            {"renewal_risk_delta": 20, "churn_probability_delta": 25, "expansion_probability_delta": -20},
    "budget_freeze":            {"renewal_risk_delta": 15, "churn_probability_delta": 10, "expansion_probability_delta": -30},
    "escalation":               {"renewal_risk_delta": 30, "churn_probability_delta": 35, "expansion_probability_delta": -25},
    "expansion_opportunity":    {"renewal_risk_delta": -10, "churn_probability_delta": -5, "expansion_probability_delta": 25},
    "positive_sentiment":       {"renewal_risk_delta": -10, "churn_probability_delta": -10, "expansion_probability_delta": 10},
    "negative_sentiment":       {"renewal_risk_delta": 15, "churn_probability_delta": 20, "expansion_probability_delta": -15},
    "executive_engagement":     {"renewal_risk_delta": -5, "churn_probability_delta": -5, "expansion_probability_delta": 10},
    "competitive_threat":       {"renewal_risk_delta": 25, "churn_probability_delta": 30, "expansion_probability_delta": -20},
    "pricing_objection":        {"renewal_risk_delta": 15, "churn_probability_delta": 10, "expansion_probability_delta": -15},
    "procurement_delay":        {"renewal_risk_delta": 10, "churn_probability_delta": 5, "expansion_probability_delta": -5},
    "product_adoption_growth":  {"renewal_risk_delta": -15, "churn_probability_delta": -10, "expansion_probability_delta": 20},
    "churn_signal":             {"renewal_risk_delta": 35, "churn_probability_delta": 40, "expansion_probability_delta": -30},
    "feature_request":          {"renewal_risk_delta": 5, "churn_probability_delta": 0, "expansion_probability_delta": 5},

    # Recruitment signals
    "candidate_dropoff":        {"renewal_risk_delta": 0, "churn_probability_delta": 30, "expansion_probability_delta": -20},
    "competing_offer":          {"renewal_risk_delta": 0, "churn_probability_delta": 25, "expansion_probability_delta": -15},
    "salary_concern":           {"renewal_risk_delta": 0, "churn_probability_delta": 15, "expansion_probability_delta": -10},
    "strong_fit":               {"renewal_risk_delta": 0, "churn_probability_delta": -15, "expansion_probability_delta": 20},
    "interview_delay":          {"renewal_risk_delta": 0, "churn_probability_delta": 10, "expansion_probability_delta": -5},
    "positive_feedback":        {"renewal_risk_delta": 0, "churn_probability_delta": -10, "expansion_probability_delta": 15},
    "negative_feedback":        {"renewal_risk_delta": 0, "churn_probability_delta": 20, "expansion_probability_delta": -15},
    "urgent_hiring_need":       {"renewal_risk_delta": 0, "churn_probability_delta": 5, "expansion_probability_delta": 10},
    "offer_acceptance_signal":  {"renewal_risk_delta": 0, "churn_probability_delta": -20, "expansion_probability_delta": 25},
}

SEVERITY_THRESHOLDS = {
    "critical": 60,
    "high": 40,
    "medium": 20,
    "low": 0,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def assess_impact(
    signals: List[str],
    entity: Optional[dict] = None,
) -> Dict[str, Any]:
    """
    Compute aggregate impact deltas from a list of extracted signals.

    Returns:
        {
            "renewal_risk_delta": int,
            "churn_probability_delta": int,
            "expansion_probability_delta": int,
            "severity": str,
            "impact_score": int (0-100),
            "signal_impacts": {signal: {deltas}}
        }
    """
    renewal_delta = 0
    churn_delta = 0
    expansion_delta = 0
    signal_impacts = {}

    for signal in signals:
        impact = SIGNAL_IMPACT_MAP.get(signal)
        if impact:
            renewal_delta += impact["renewal_risk_delta"]
            churn_delta += impact["churn_probability_delta"]
            expansion_delta += impact["expansion_probability_delta"]
            signal_impacts[signal] = impact

    # Clamp deltas to -100..100
    renewal_delta = max(-100, min(100, renewal_delta))
    churn_delta = max(-100, min(100, churn_delta))
    expansion_delta = max(-100, min(100, expansion_delta))

    # Compute overall impact score (0-100)
    # Weighted combination of absolute deltas
    raw_score = (abs(renewal_delta) * 0.35 + abs(churn_delta) * 0.40 + abs(expansion_delta) * 0.25)
    impact_score = int(min(100, max(0, raw_score)))

    # Determine severity
    severity = "low"
    for sev, threshold in sorted(SEVERITY_THRESHOLDS.items(), key=lambda x: x[1], reverse=True):
        if impact_score >= threshold:
            severity = sev
            break

    logger.info(
        f"ImpactEngine: Computed impact_score={impact_score}, severity={severity}. "
        f"Deltas: renewal={renewal_delta:+d}, churn={churn_delta:+d}, expansion={expansion_delta:+d}."
    )

    return {
        "renewal_risk_delta": renewal_delta,
        "churn_probability_delta": churn_delta,
        "expansion_probability_delta": expansion_delta,
        "severity": severity,
        "impact_score": impact_score,
        "signal_impacts": signal_impacts,
    }
