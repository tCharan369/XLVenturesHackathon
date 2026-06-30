"""
Interaction Store — SQLite-backed storage for customer interactions
and recommendation evolution tracking.

Uses the same SQLAlchemy engine/Base from episodic.py.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from sqlalchemy import Column, String, Text, DateTime, Float, Integer, text
from sqlalchemy.orm import Session

from backend.memory.episodic import Base, engine, SessionLocal


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class InteractionRecord(Base):
    """Stores a customer/candidate interaction event."""
    __tablename__ = "interactions"

    interaction_id = Column(String, primary_key=True, default=lambda: f"int_{uuid.uuid4().hex[:12]}")
    entity_id = Column(String, nullable=False, index=True)
    domain_pack_id = Column(String, nullable=False, index=True)
    interaction_type = Column(String, nullable=False)
    source = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(Text, default="[]")  # JSON array
    signals = Column(Text, default="[]")  # JSON array of extracted signals
    impact_score = Column(Float, default=0.0)
    planner_classification_before = Column(String, nullable=True)
    planner_classification_after = Column(String, nullable=True)
    recommendation_before = Column(Text, nullable=True)  # JSON
    recommendation_after = Column(Text, nullable=True)  # JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RecommendationEvolution(Base):
    """Tracks how recommendations evolve over time for an entity."""
    __tablename__ = "recommendation_evolution"

    evolution_id = Column(String, primary_key=True, default=lambda: f"evo_{uuid.uuid4().hex[:12]}")
    entity_id = Column(String, nullable=False, index=True)
    domain_pack_id = Column(String, nullable=False, index=True)
    interaction_id = Column(String, nullable=True)
    previous_recommendation = Column(Text, nullable=True)  # JSON
    new_recommendation = Column(Text, nullable=True)  # JSON
    change_reasons = Column(Text, default="[]")  # JSON array
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Create tables (idempotent)
Base.metadata.create_all(engine)

def seed_database_interactions():
    """Seed the interactions table from interactions.json files if empty."""
    from pathlib import Path
    import json
    
    with SessionLocal() as session:
        # Check if table is empty
        if session.query(InteractionRecord).count() > 0:
            return
            
        logger = logging.getLogger(__name__)
        logger.info("Seeding database interactions...")
        
        project_root = Path(__file__).resolve().parent.parent.parent
        domains = ["customer_success", "recruitment"]
        
        for domain in domains:
            json_path = project_root / "backend" / "data" / domain / "interactions.json"
            if not json_path.exists():
                continue
                
            try:
                with open(json_path, "r") as f:
                    items = json.load(f)
                    
                for item in items:
                    # Run keyword analysis for signals/impact
                    from backend.agents.interaction_analyzer import analyze_interaction
                    from backend.core.impact_engine import assess_impact
                    
                    content = item.get("content", "")
                    analysis = analyze_interaction(content, domain)
                    signals = analysis["signals"]
                    impact = assess_impact(signals)
                    
                    # Convert timestamp string to datetime
                    ts_str = item.get("timestamp")
                    try:
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    except Exception:
                        ts = datetime.now(timezone.utc)
                        
                    record = InteractionRecord(
                        interaction_id=item.get("interaction_id") or f"int_{uuid.uuid4().hex[:12]}",
                        entity_id=item.get("account_id"),
                        domain_pack_id=domain,
                        interaction_type=item.get("interaction_type", "meeting_note"),
                        source=item.get("source", "System"),
                        title=item.get("title", "Interaction"),
                        content=content,
                        tags=json.dumps(item.get("tags") or []),
                        signals=json.dumps(signals),
                        impact_score=float(impact["impact_score"]),
                        planner_classification_before="unknown",
                        planner_classification_after="standard" if impact["impact_score"] < 40 else "escalation",
                        recommendation_before=None,
                        recommendation_after=None,
                        created_at=ts,
                    )
                    session.add(record)
                session.commit()
                logger.info(f"Seeded {len(items)} interactions for domain '{domain}'.")
            except Exception as e:
                logger.error(f"Error seeding interactions for domain '{domain}': {e}", exc_info=True)

# Run seeding
import logging
seed_database_interactions()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_interaction(
    entity_id: str,
    domain_pack_id: str,
    interaction_type: str,
    source: str,
    title: str,
    content: str,
    tags: Optional[List[str]] = None,
    signals: Optional[List[str]] = None,
    impact_score: float = 0.0,
    planner_before: Optional[str] = None,
    planner_after: Optional[str] = None,
    rec_before: Optional[dict] = None,
    rec_after: Optional[dict] = None,
) -> Dict[str, Any]:
    """Create and persist a new interaction record. Returns the record as dict."""
    int_id = f"int_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    record = InteractionRecord(
        interaction_id=int_id,
        entity_id=entity_id,
        domain_pack_id=domain_pack_id,
        interaction_type=interaction_type,
        source=source,
        title=title,
        content=content,
        tags=json.dumps(tags or []),
        signals=json.dumps(signals or []),
        impact_score=impact_score,
        planner_classification_before=planner_before,
        planner_classification_after=planner_after,
        recommendation_before=json.dumps(rec_before) if rec_before else None,
        recommendation_after=json.dumps(rec_after) if rec_after else None,
        created_at=now,
    )
    with SessionLocal() as session:
        session.add(record)
        session.commit()
        # Read all values inside the session while still bound
        result = {
            "interaction_id": record.interaction_id,
            "entity_id": record.entity_id,
            "domain_pack_id": record.domain_pack_id,
            "interaction_type": record.interaction_type,
            "source": record.source,
            "title": record.title,
            "content": record.content,
            "tags": json.loads(record.tags or "[]"),
            "signals": json.loads(record.signals or "[]"),
            "impact_score": record.impact_score,
            "planner_classification_before": record.planner_classification_before,
            "planner_classification_after": record.planner_classification_after,
            "recommendation_before": json.loads(record.recommendation_before) if record.recommendation_before else None,
            "recommendation_after": json.loads(record.recommendation_after) if record.recommendation_after else None,
            "created_at": record.created_at.isoformat() if record.created_at else now.isoformat(),
        }
    return result


def get_interactions(entity_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all interactions for an entity, newest first."""
    with SessionLocal() as session:
        rows = (
            session.query(InteractionRecord)
            .filter(InteractionRecord.entity_id == entity_id)
            .order_by(InteractionRecord.created_at.desc())
            .limit(limit)
            .all()
        )
        return [_row_to_dict(r) for r in rows]


def get_recent_interactions(domain_pack_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent interactions across all entities for a domain."""
    with SessionLocal() as session:
        rows = (
            session.query(InteractionRecord)
            .filter(InteractionRecord.domain_pack_id == domain_pack_id)
            .order_by(InteractionRecord.created_at.desc())
            .limit(limit)
            .all()
        )
        return [_row_to_dict(r) for r in rows]


def get_interaction_stats(domain_pack_id: str) -> Dict[str, Any]:
    """Get interaction statistics for a domain."""
    with SessionLocal() as session:
        rows = (
            session.query(InteractionRecord)
            .filter(InteractionRecord.domain_pack_id == domain_pack_id)
            .all()
        )

        total = len(rows)
        type_counts: Dict[str, int] = {}
        signal_counts: Dict[str, int] = {}
        reclassifications = 0
        recommendation_changes = 0

        for r in rows:
            # Type breakdown
            type_counts[r.interaction_type] = type_counts.get(r.interaction_type, 0) + 1

            # Signal breakdown
            try:
                signals = json.loads(r.signals or "[]")
                for s in signals:
                    signal_counts[s] = signal_counts.get(s, 0) + 1
            except Exception:
                pass

            # Reclassifications
            if r.planner_classification_before and r.planner_classification_after:
                if r.planner_classification_before != r.planner_classification_after:
                    reclassifications += 1

            # Recommendation changes
            if r.recommendation_before and r.recommendation_after:
                if r.recommendation_before != r.recommendation_after:
                    recommendation_changes += 1

        return {
            "total_interactions": total,
            "type_breakdown": type_counts,
            "signal_distribution": signal_counts,
            "planner_reclassifications": reclassifications,
            "recommendation_changes": recommendation_changes,
        }


def create_evolution(
    entity_id: str,
    domain_pack_id: str,
    interaction_id: Optional[str],
    previous_rec: Optional[dict],
    new_rec: Optional[dict],
    change_reasons: Optional[List[str]] = None,
) -> str:
    """Create a recommendation evolution record. Returns evolution_id."""
    evo_id = f"evo_{uuid.uuid4().hex[:12]}"
    record = RecommendationEvolution(
        evolution_id=evo_id,
        entity_id=entity_id,
        domain_pack_id=domain_pack_id,
        interaction_id=interaction_id,
        previous_recommendation=json.dumps(previous_rec) if previous_rec else None,
        new_recommendation=json.dumps(new_rec) if new_rec else None,
        change_reasons=json.dumps(change_reasons or []),
    )
    with SessionLocal() as session:
        session.add(record)
        session.commit()
    return evo_id


def get_evolutions(entity_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get recommendation evolution history for an entity."""
    with SessionLocal() as session:
        rows = (
            session.query(RecommendationEvolution)
            .filter(RecommendationEvolution.entity_id == entity_id)
            .order_by(RecommendationEvolution.created_at.desc())
            .limit(limit)
            .all()
        )
        results = []
        for r in rows:
            results.append({
                "evolution_id": r.evolution_id,
                "entity_id": r.entity_id,
                "domain_pack_id": r.domain_pack_id,
                "interaction_id": r.interaction_id,
                "previous_recommendation": json.loads(r.previous_recommendation) if r.previous_recommendation else None,
                "new_recommendation": json.loads(r.new_recommendation) if r.new_recommendation else None,
                "change_reasons": json.loads(r.change_reasons or "[]"),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        return results


def get_latest_evolution(entity_id: str, domain_pack_id: str) -> Optional[Dict[str, Any]]:
    """Get the most recent evolution for an entity."""
    evolutions = get_evolutions(entity_id, limit=1)
    return evolutions[0] if evolutions else None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _record_to_dict(r: InteractionRecord, created_at=None) -> Dict[str, Any]:
    """Convert an InteractionRecord ORM object to a plain dict (must be inside session)."""
    return {
        "interaction_id": r.interaction_id,
        "entity_id": r.entity_id,
        "domain_pack_id": r.domain_pack_id,
        "interaction_type": r.interaction_type,
        "source": r.source,
        "title": r.title,
        "content": r.content,
        "tags": json.loads(r.tags or "[]"),
        "signals": json.loads(r.signals or "[]"),
        "impact_score": r.impact_score,
        "planner_classification_before": r.planner_classification_before,
        "planner_classification_after": r.planner_classification_after,
        "recommendation_before": json.loads(r.recommendation_before) if r.recommendation_before else None,
        "recommendation_after": json.loads(r.recommendation_after) if r.recommendation_after else None,
        "created_at": (created_at or r.created_at).isoformat() if (created_at or r.created_at) else None,
    }

# Alias used inside active session context
_row_to_dict = _record_to_dict
