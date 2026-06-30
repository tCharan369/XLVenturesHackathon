"""
Query Builder — converts raw entity data and interaction text into
retrieval-friendly search queries for the memory layer.

Pure Python. No LLM calls. Uses keyword extraction and domain signal
detection to produce compact, high-recall queries.
"""

import re
from typing import Dict, Any, List

# ---------------------------------------------------------------------------
# Domain signal vocabularies
#
# Each signal has a "positive" word set and a "negative" context set.
# If a negative-context word co-occurs with the positive word, the signal
# is suppressed (e.g. "lower adoption" should NOT trigger a growth signal).
# ---------------------------------------------------------------------------

_RISK_WORDS = {
    "churn", "risk", "decline", "declining", "dropped", "drop", "downsize",
    "cancel", "cancellation", "unhappy", "frustrated", "angry", "escalate",
    "escalation", "breach", "sla", "outage", "critical", "terminate",
    "termination", "leaving", "left", "departed", "unresponsive",
    "lower", "low", "flagged",
}

_GROWTH_WORDS = {
    "upsell", "expand", "expansion", "upgrade", "growth", "growing",
    "increase", "increased", "happy", "satisfied", "opportunity",
    "quota", "limit", "additional", "seats", "scale", "scaling",
    "roll out", "reliable", "reliability",
}
_GROWTH_NEGATORS = {
    "lower", "decline", "declining", "dropped", "drop", "risk", "churn",
    "unhappy", "frustrated", "angry", "terminate", "downsize",
}

_RENEWAL_WORDS = {
    "renewal", "renew", "renewing", "contract", "expiry", "expiring",
    "upcoming", "due", "deadline",
}

_CHAMPION_WORDS = {
    "champion", "sponsor", "contact", "replaced",
    "restructuring", "unreachable",
}
# "left" / "departed" only trigger champion if combined with person-context
_CHAMPION_CONTEXT = {"champion", "sponsor", "contact", "stakeholder", "vp", "director"}

_RECRUITMENT_WORDS = {
    "candidate", "interview", "offer", "screening", "hire", "hiring",
    "dropout", "counter-offer", "negotiation", "salary", "compensation",
    "fast-track", "panel", "coding",
}

# Stop words to strip from extracted keywords
_STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "into", "about",
    "that", "this", "it", "its", "they", "them", "their", "we", "our",
    "you", "your", "and", "or", "but", "if", "not", "no", "so", "up",
    "out", "than", "too", "very", "just", "also", "now", "here", "there",
    "when", "where", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "only", "own", "same", "then",
    "yet", "still", "already", "since", "while", "during", "until",
    "csm", "sync", "qbr", "http", "https", "www",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_context_query(entity: Dict[str, Any], interaction: str) -> str:
    """
    Build a retrieval-friendly query string from entity data and interaction text.

    Strategy:
        1. Detect domain signal categories from the interaction + entity.
        2. Pull salient cues from known entity fields.
        3. Extract a handful of distinctive keywords from the interaction.
        4. Combine into a compact, focused query.
    """
    tokens = _tokenise(interaction)
    token_set = set(tokens)
    signals = _detect_signals(token_set)
    entity_cues = _entity_cues(entity)
    keywords = _extract_keywords(tokens)

    # Assemble: signals first (highest semantic weight), entity cues, then keywords
    parts: List[str] = []
    parts.extend(signals)
    parts.extend(entity_cues)
    parts.extend(keywords[:6])  # tight cap — shorter queries match better

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for p in parts:
        low = p.lower()
        if low not in seen:
            seen.add(low)
            unique.append(p)

    return " ".join(unique) if unique else interaction[:200]


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


def _tokenise(text: str) -> List[str]:
    """Lowercase, strip punctuation, split into word tokens."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\-]", " ", text)
    return text.split()


def _extract_keywords(tokens: List[str]) -> List[str]:
    """Return non-stop-word tokens longer than 2 characters."""
    return [t for t in tokens if t not in _STOP_WORDS and len(t) > 2]


def _detect_signals(token_set: set) -> List[str]:
    """Detect which domain signal categories are present, with negator logic."""
    signals = []
    has_risk = bool(token_set & _RISK_WORDS)
    has_growth = bool(token_set & _GROWTH_WORDS) and not bool(token_set & _GROWTH_NEGATORS)
    has_renewal = bool(token_set & _RENEWAL_WORDS)
    has_champion = bool(token_set & _CHAMPION_WORDS)
    has_recruitment = bool(token_set & _RECRUITMENT_WORDS)

    if has_risk:
        signals.extend(["risk", "declining usage", "churn"])
    if has_growth:
        signals.extend(["growth opportunity", "upsell", "expansion"])
    if has_renewal:
        signals.extend(["renewal risk", "upcoming renewal"])
    if has_champion:
        signals.extend(["champion change", "stakeholder departure"])
    if has_recruitment:
        signals.extend(["candidate pipeline", "hiring decision"])

    return signals


def _entity_cues(entity: Dict[str, Any]) -> List[str]:
    """Extract retrieval cues from known entity fields."""
    cues = []

    # Health score
    health = entity.get("health_score")
    if health is not None:
        if health < 50:
            cues.extend(["low health score", "churn risk"])
        elif health >= 80:
            cues.extend(["healthy account", "stable account"])

    # Usage trend
    trend = str(entity.get("usage_trend", ""))
    if "+" in trend:
        cues.append("usage increasing")
    elif "-" in trend:
        cues.append("usage declining")

    # Fit score (recruitment)
    fit = entity.get("fit_score")
    if fit is not None:
        if fit >= 85:
            cues.append("strong candidate fit")
        elif fit < 60:
            cues.append("weak candidate fit")

    # Current stage (recruitment)
    stage = entity.get("current_stage", "")
    if stage:
        cues.append(stage.lower())

    return cues
