"""
Episodic Memory — SQLite-backed storage for recommendations and feedback.

Uses SQLAlchemy ORM for table definitions and RapidFuzz for fuzzy
string-based similarity retrieval (no embeddings).
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from sqlalchemy import create_engine, Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from backend.core.settings import settings

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DB_PATH = _PROJECT_ROOT / "backend" / "data" / "platform.db"
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(_DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ---------------------------------------------------------------------------
# ORM models
# ---------------------------------------------------------------------------


class RecommendationRecord(Base):
    """Stores a full recommendation JSON blob keyed by entity + domain."""
    __tablename__ = "recommendations"

    recommendation_id = Column(String, primary_key=True, default=lambda: f"rec_{uuid.uuid4().hex[:12]}")
    entity_id = Column(String, nullable=False, index=True)
    domain_pack_id = Column(String, nullable=False, index=True)
    recommendation_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fallback_used = Column(Boolean, default=False, nullable=True)
    model_name = Column(String, nullable=True)
    prompt_version = Column(String, nullable=True)
    domain_pack_version = Column(String, nullable=True)
    planner_version = Column(String, nullable=True)
    recommendation_sources = Column(Text, nullable=True)


class FeedbackRecord(Base):
    """Stores human feedback tied to a specific recommendation."""
    __tablename__ = "feedback"

    feedback_id = Column(String, primary_key=True, default=lambda: f"fb_{uuid.uuid4().hex[:12]}")
    recommendation_id = Column(String, ForeignKey("recommendations.recommendation_id"), nullable=False, index=True)
    entity_id = Column(String, nullable=False, index=True)
    domain_pack_id = Column(String, nullable=False, index=True)
    human_feedback = Column(Text, nullable=True)
    outcome = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    approved_at = Column(DateTime, nullable=True)


# Create tables on import (idempotent — uses IF NOT EXISTS internally)
Base.metadata.create_all(engine)

def _run_db_migration():
    """Run lightweight migrations to add audit columns if missing."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            # Check recommendations columns
            try:
                conn.execute(text("ALTER TABLE recommendations ADD COLUMN fallback_used BOOLEAN DEFAULT 0"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE recommendations ADD COLUMN model_name VARCHAR"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE recommendations ADD COLUMN prompt_version VARCHAR"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE recommendations ADD COLUMN domain_pack_version VARCHAR"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE recommendations ADD COLUMN planner_version VARCHAR"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE recommendations ADD COLUMN recommendation_sources TEXT"))
            except Exception:
                pass
            # Check feedback columns
            try:
                conn.execute(text("ALTER TABLE feedback ADD COLUMN approved_at DATETIME"))
            except Exception:
                pass
    except Exception as e:
        import logging
        logging.getLogger("episodic").warning(f"Lightweight DB migration warning: {e}")

_run_db_migration()

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def write_recommendation(
    entity_id: str,
    domain_pack_id: str,
    recommendation_dict: Dict[str, Any],
    fallback_used: Optional[bool] = False,
    model_name: Optional[str] = None,
    prompt_version: Optional[str] = None,
    domain_pack_version: Optional[str] = None,
    planner_version: Optional[str] = None,
    recommendation_sources: Optional[List[str]] = None,
) -> str:
    """
    Persist a recommendation to SQLite.

    Returns the generated recommendation_id.
    """
    rec_id = f"rec_{uuid.uuid4().hex[:12]}"
    record = RecommendationRecord(
        recommendation_id=rec_id,
        entity_id=entity_id,
        domain_pack_id=domain_pack_id,
        recommendation_json=json.dumps(recommendation_dict, default=str),
        fallback_used=fallback_used,
        model_name=model_name,
        prompt_version=prompt_version,
        domain_pack_version=domain_pack_version,
        planner_version=planner_version,
        recommendation_sources=json.dumps(recommendation_sources or []),
    )
    with SessionLocal() as session:
        session.add(record)
        session.commit()
    return rec_id


def write_feedback(
    recommendation_id: str,
    entity_id: str,
    domain_pack_id: str,
    human_feedback: Optional[str],
    outcome: str,
    approved_at: Optional[datetime] = None,
) -> str:
    """
    Persist human feedback for a recommendation.

    Returns the generated feedback_id.
    """
    fb_id = f"fb_{uuid.uuid4().hex[:12]}"
    record = FeedbackRecord(
        feedback_id=fb_id,
        recommendation_id=recommendation_id,
        entity_id=entity_id,
        domain_pack_id=domain_pack_id,
        human_feedback=human_feedback,
        outcome=outcome,
        approved_at=approved_at,
    )
    with SessionLocal() as session:
        session.add(record)
        session.commit()
    return fb_id


def get_similar_past_cases(
    domain_pack_id: str,
    query: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Retrieve past recommendations that are textually similar to *query*.

    Uses RapidFuzz partial_ratio for ranking — no embeddings required.
    Returns up to *limit* results sorted by descending similarity score.
    """
    from rapidfuzz import fuzz  # lazy import to keep startup fast

    with SessionLocal() as session:
        rows = (
            session.query(RecommendationRecord)
            .filter(RecommendationRecord.domain_pack_id == domain_pack_id)
            .all()
        )

    scored: List[tuple] = []
    for row in rows:
        score = fuzz.partial_ratio(query.lower(), row.recommendation_json.lower())
        scored.append((score, row))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for score, row in scored[:limit]:
        results.append({
            "recommendation_id": row.recommendation_id,
            "entity_id": row.entity_id,
            "domain_pack_id": row.domain_pack_id,
            "recommendation": json.loads(row.recommendation_json),
            "similarity_score": score,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        })
    return results


# ---------------------------------------------------------------------------
# Utility methods (for tests and demo resets)
# ---------------------------------------------------------------------------


def delete_recommendation(recommendation_id: str) -> bool:
    """
    Delete a single recommendation by ID.

    Also deletes any associated feedback records (cascade).
    Returns True if the recommendation existed and was deleted.
    """
    with SessionLocal() as session:
        # Delete associated feedback first
        session.query(FeedbackRecord).filter(
            FeedbackRecord.recommendation_id == recommendation_id
        ).delete()

        count = session.query(RecommendationRecord).filter(
            RecommendationRecord.recommendation_id == recommendation_id
        ).delete()

        session.commit()
        return count > 0


def clear_domain_memory(domain_pack_id: str) -> int:
    """
    Delete all recommendations and feedback for a domain.

    Returns the total number of rows deleted.
    """
    with SessionLocal() as session:
        fb_count = session.query(FeedbackRecord).filter(
            FeedbackRecord.domain_pack_id == domain_pack_id
        ).delete()

        rec_count = session.query(RecommendationRecord).filter(
            RecommendationRecord.domain_pack_id == domain_pack_id
        ).delete()

        session.commit()
        return fb_count + rec_count
