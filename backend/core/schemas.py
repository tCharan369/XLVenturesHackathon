from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Union
from datetime import datetime, timezone

class DecisionPoint(BaseModel):
    """
    Represents a specific business event or risk threshold that can trigger actions.
    """
    id: str = Field(..., description="Unique identifier for the decision point")
    name: str = Field(..., description="Name of the decision point")
    description: str = Field(..., description="Detailed description of what this decision point represents")
    trigger_conditions: List[str] = Field(default_factory=list, description="Conditions that trigger this decision point")
    priority: int = Field(default=1, description="Priority level of the decision point (1-5)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "renewal_risk",
                "name": "Renewal Risk",
                "description": "High probability of customer account churn.",
                "trigger_conditions": ["usage_drop_30d > 20%", "health_score < 50"],
                "priority": 3
            }
        }
    }


class DomainPack(BaseModel):
    """
    A domain-specific configuration pack defining entities, workflows, business rules,
    success metrics, tools, prompt overrides, and decision points.
    """
    id: str = Field(..., description="Unique identifier for the domain pack")
    name: str = Field(..., description="Name of the domain pack")
    description: str = Field(..., description="Description of the domain pack's scope and purpose")
    entities: List[str] = Field(default_factory=list, description="List of domain-specific entity names")
    workflows: List[str] = Field(default_factory=list, description="Workflows supported within this domain")
    business_rules: List[Dict[str, Any]] = Field(default_factory=list, description="JSON configuration of business rules")
    success_metrics: List[str] = Field(default_factory=list, description="KPIs and success metrics measured in this domain")
    tools: List[str] = Field(default_factory=list, description="Names of tools this pack utilizes")
    prompt_overrides: Dict[str, str] = Field(default_factory=dict, description="Overrides for system prompt templates per agent")
    decision_points: List[Union[str, DecisionPoint]] = Field(default_factory=list, description="Decision points within this domain")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional domain metadata")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "customer_success",
                "name": "Customer Success",
                "description": "Domain pack for B2B SaaS account management.",
                "entities": ["Customer", "Account", "Product"],
                "workflows": ["Renewal", "Upsell", "Escalation"],
                "decision_points": [
                    {
                        "id": "renewal_risk",
                        "name": "Renewal Risk",
                        "description": "High probability of customer account churn.",
                        "trigger_conditions": ["low_usage"],
                        "priority": 3
                    }
                ],
                "business_rules": [],
                "success_metrics": ["net_revenue_retention", "renewal_rate"],
                "tools": [],
                "prompt_overrides": {}
            }
        }
    }


class AgentSpec(BaseModel):
    """
    Metadata spec specifying agent metadata and functional boundaries.
    """
    id: str = Field(..., description="Unique identifier for the agent")
    name: str = Field(..., description="Name of the agent")
    description: str = Field(..., description="Description of the agent's capabilities")
    capabilities: List[str] = Field(default_factory=list, description="List of tasks this agent can execute")
    input_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON schema for valid input to this agent")
    output_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON schema for agent output")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "context_agent",
                "name": "Context Agent",
                "description": "Retrieves and structures customer context from multiple data stores.",
                "capabilities": ["semantic_retrieval", "interaction_ingestion"],
                "input_schema": {"type": "object", "properties": {"account_id": {"type": "string"}}},
                "output_schema": {"type": "object", "properties": {"evidence": {"type": "array"}}}
            }
        }
    }


class ComputedConfidence(BaseModel):
    """
    Traceable confidence metrics computed mathematically from pipeline inputs.
    """
    score: float = Field(..., description="Overall confidence score (0.0 to 1.0)")
    evidence_count: int = Field(..., description="Number of supporting evidence nodes")
    source_agreement: float = Field(..., description="Ratio of consensus across evidence sources (0.0 to 1.0)")
    historical_acceptance_rate: float = Field(..., description="Historical human acceptance rate of this recommendation type")
    confidence_band: Optional[str] = Field("Medium Confidence", description="Calibrated confidence band (High, Medium, Low)")
    confidence_reason: Optional[Dict[str, float]] = Field(None, description="Granular components of the confidence score calculation")

    model_config = {
        "json_schema_extra": {
            "example": {
                "score": 0.88,
                "evidence_count": 5,
                "source_agreement": 0.90,
                "historical_acceptance_rate": 0.85,
                "confidence_band": "High Confidence",
                "confidence_reason": {"evidence": 0.95, "agreement": 0.90, "history": 0.85}
            }
        }
    }


class EvidenceNode(BaseModel):
    """
    A structured node containing factual evidence supporting a next best action.
    """
    source: str = Field(..., description="The source ID, name, or filename of the evidence")
    source_type: str = Field(..., description="Type of the source (e.g. email, CRM note, ticket, playbook)")
    content: str = Field(..., description="Snippet, content, or summary of the evidence details")
    confidence: float = Field(default=1.0, description="Factual reliability or confidence score of this source (0.0 to 1.0)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary metadata (e.g., recency, author)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "source": "meeting_transcript_2026-06-25",
                "source_type": "transcript",
                "content": "Champion mentioned they are restructuring their team and might cut SaaS seats.",
                "confidence": 0.95,
                "metadata": {"date": "2026-06-25", "speaker": "Jane Doe"}
            }
        }
    }


class CandidateAction(BaseModel):
    """
    A potential action recommended by the pipeline, with ranking metadata.
    """
    id: str = Field(..., description="Unique identifier for the action")
    title: str = Field(..., description="Title of the action")
    description: str = Field(..., description="Description of the action steps")
    rationale: str = Field(..., description="The logical reasoning for suggesting this action")
    expected_impact: str = Field(..., description="Expected business outcomes of executing this action")
    confidence: float = Field(..., description="Confidence score associated with this option (0.0 to 1.0)")
    rejected_reason: Optional[str] = Field(None, description="Detailed reason for rejection if this action was not selected as primary")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "schedule_exec_alignment",
                "title": "Executive Alignment Call",
                "description": "Schedule a call with the new department lead to establish rapport.",
                "rationale": "High churn risk because the champion left; need to secure buy-in with the replacement.",
                "expected_impact": "Establish trust, secure renewal potential, address seats shrinkage risk.",
                "confidence": 0.91,
                "rejected_reason": None
            }
        }
    }


class Recommendation(BaseModel):
    """
    Complete output recommendation containing actions, evidence, and reasoning.
    """
    recommendation_id: str = Field(..., description="Unique identifier for this recommendation")
    entity_id: str = Field(..., description="Identifier for the target entity (e.g., account ID or candidate ID)")
    domain_pack_id: str = Field(..., description="Identifier of the domain pack used")
    candidate_actions: List[CandidateAction] = Field(default_factory=list, description="Considered candidate action options")
    selected_action: Optional[CandidateAction] = Field(None, description="The selected action chosen as next best action")
    evidence: List[EvidenceNode] = Field(default_factory=list, description="Evidence nodes collected during evaluation")
    recommendation_sources: List[str] = Field(default_factory=list, description="Explicit record of sources (playbooks/past cases) that drove this action")
    reasoning_trace: List[str] = Field(default_factory=list, description="Internal agent chain of thought trace")
    computed_confidence: ComputedConfidence = Field(..., description="Calculated confidence score details")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp when this recommendation was generated")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional recommendation metadata")

    model_config = {
        "json_schema_extra": {
            "example": {
                "recommendation_id": "rec_12345",
                "entity_id": "acc_001",
                "domain_pack_id": "customer_success",
                "candidate_actions": [],
                "selected_action": None,
                "evidence": [],
                "reasoning_trace": ["Context Agent: retrieved 2 playbooks", "Reasoning Agent: renewal risk high"],
                "computed_confidence": {
                    "score": 0.88,
                    "evidence_count": 5,
                    "source_agreement": 0.9,
                    "historical_acceptance_rate": 0.85
                },
                "created_at": "2026-06-27T18:00:00Z"
            }
        }
    }


class MemoryWrite(BaseModel):
    """
    Data payload written to episodic memory containing human feedback and outcomes.
    """
    entity_id: str = Field(..., description="Target entity ID")
    domain_pack_id: str = Field(..., description="Domain pack ID")
    interaction: str = Field(..., description="Details of the interaction that triggered the run")
    recommendation: Recommendation = Field(..., description="The recommendation that was shown to the human")
    human_feedback: Optional[str] = Field(None, description="Feedback text left by the human operator")
    outcome: str = Field(..., description="Outcome of human approval (e.g. approved, edited, rejected)")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp when this interaction was completed")

    model_config = {
        "json_schema_extra": {
            "example": {
                "entity_id": "acc_001",
                "domain_pack_id": "customer_success",
                "interaction": "Weekly sync call notes show champion jane has left the team.",
                "recommendation": {
                    "recommendation_id": "rec_12345",
                    "entity_id": "acc_001",
                    "domain_pack_id": "customer_success",
                    "candidate_actions": [],
                    "selected_action": None,
                    "evidence": [],
                    "reasoning_trace": [],
                    "computed_confidence": {
                        "score": 0.88,
                        "evidence_count": 5,
                        "source_agreement": 0.9,
                        "historical_acceptance_rate": 0.85
                    },
                    "created_at": "2026-06-27T18:00:00Z"
                },
                "human_feedback": "Approved. Scheduling call now.",
                "outcome": "approved",
                "timestamp": "2026-06-27T18:05:00Z"
            }
        }
    }
