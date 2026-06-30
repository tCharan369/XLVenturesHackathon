# PROGRESS.md — Implementation Log

Detailed changelog of all work completed on the Agentic Decision Intelligence Platform.

Last updated: **2026-06-27**

---

## Shift 1 — Project Scaffolding & Data Contracts ✅

**Date:** 2026-06-27 | **Duration:** ~1.5 hours

### What was built

#### Core Data Contracts (`backend/core/schemas.py`)
All Pydantic v2 models from the architecture spec:
- `DomainPack`, `DecisionPoint`, `AgentSpec` — configuration contracts
- `Recommendation`, `CandidateAction`, `ComputedConfidence` — output contracts  
- `EvidenceNode`, `MemoryWrite` — memory contracts
- All include `metadata: dict = {}` for future extensibility

#### Platform State (`backend/core/state.py`)
- `PlatformState` TypedDict ready for LangGraph integration
- Fields: `domain_pack`, `account`, `retrieved_context`, `reasoning_output`, `recommendation_output`, `explanation_output`, `evidence`, `confidence`, `human_feedback`, `metadata`

#### Settings (`backend/core/settings.py`)
- `DATABASE_URL = "sqlite:///./data/platform.db"`
- `CHROMA_PATH = "./data/chroma"`
- `MEMORY_COLLECTION_PREFIX = "domain_"`

#### Configuration Loader (`backend/core/config_loader.py`)
- `load_domain_pack(domain_name)` — loads JSON domain config
- `load_accounts(domain_name)` — loads account/candidate data
- `load_data(domain_name)` — general data loader
- Domain-agnostic: works for any domain under `backend/config/domain_packs/`

#### Domain Configurations
- **Customer Success** (`customer_success.json`): 4 decision points — renewal risk, expansion/upsell, escalation, champion change
- **Recruitment** (`recruitment.json`): 2 workflows — screening → offer, with recruitment-specific entities and decision points

#### Synthetic Data
- **Customer Success**: 5 accounts with `account_id`, `health_score`, `usage_trend`, `renewal_date`, `interaction_notes`, `updated_at`
  - `acc_cs_001` ApexAnalytics (health=42, -25% usage, renewal risk)
  - `acc_cs_002` CloudSphere (health=95, +40% usage, upsell opportunity)
  - `acc_cs_003` BioHealth (health=68, champion change risk)
  - `acc_cs_004` UrbanLogistics (health=38, escalation needed)
  - `acc_cs_005` EduPlatform (health=90, stable/growing)
- **Recruitment**: 3 candidates with `candidate_id`, `fit_score`, `current_stage`, `interview_sentiment`

#### FastAPI Backend (`backend/api/main.py`)
- Domain listing endpoint
- Account/candidate data endpoints
- Domain pack configuration endpoint
- CORS enabled for frontend development

#### React Frontend (`frontend/`)
- Vite + React setup
- Domain selector (Customer Success / Recruitment)
- Account cards with health score badges
- Domain-specific data display
- Responsive design with premium aesthetics

### Verification
- Backend: `uvicorn backend.api.main:app --port 8000` ✅
- Frontend: `npm run dev` ✅
- Domain switching works in browser ✅

---

## Shift 2 — Memory Layer & Tool Registry ✅

**Date:** 2026-06-27 | **Duration:** ~1.5 hours

### What was built

#### Episodic Memory (`backend/memory/episodic.py`)
- SQLAlchemy ORM with SQLite backend at `backend/data/platform.db`
- **Tables**: `recommendations` (recommendation_id, entity_id, domain_pack_id, recommendation_json, created_at) + `feedback` (feedback_id, recommendation_id, entity_id, domain_pack_id, human_feedback, outcome, created_at)
- **Functions**: `write_recommendation()`, `write_feedback()`, `get_similar_past_cases()` (RapidFuzz `partial_ratio` for fuzzy matching)
- **Utilities**: `delete_recommendation()` (cascade deletes feedback), `clear_domain_memory()` (wipes all data for a domain)
- `connect_args={"check_same_thread": False}` for cross-module access

#### Semantic Memory (`backend/memory/semantic.py`)
- ChromaDB `PersistentClient` at `backend/data/chroma/`
- `all-MiniLM-L6-v2` sentence transformer for embeddings (~80MB first-run download)
- `get_or_create_collection()` used in **both** `add_documents()` and `query()` — no manual collection creation needed
- **Functions**: `add_documents()` (upsert-based, idempotent), `query()` (handles empty collections gracefully)
- **Utilities**: `clear_collection()` (deletes entire ChromaDB collection)
- Guards against empty metadata dicts (ChromaDB rejects them)

#### Memory Manager (`backend/memory/manager.py`)
- `MemoryManager` class with `retrieve_context(domain_pack_id, query)` 
- Returns: `{ playbooks: [...], past_cases: [...], metadata: { playbook_count, past_case_count, latency_ms } }`
- Global `memory_manager` singleton for import by agents and API routes

#### Playbooks (8 total across 2 domains)

**Customer Success** (`backend/data/customer_success/playbooks/`):
1. `renewal_risk.md` — health score < 50, declining usage, upcoming renewal
2. `upsell_qualification.md` — usage trending up, approaching quota limits
3. `champion_change.md` — key stakeholder departed or replaced
4. `escalation.md` — unresolved negative support interactions
5. `healthy_account.md` — health > 80, stable/growing usage

**Recruitment** (`backend/data/recruitment/playbooks/`):
1. `candidate_dropout.md` — candidate disengagement signals
2. `fast_track_candidate.md` — accelerating process for top candidates
3. `offer_negotiation.md` — handling counter-offers and compensation discussions

#### Seed Script (`backend/scripts/seed_memory.py`)
- **Domain-agnostic**: auto-discovers all domains under `backend/data/` with a `playbooks/` directory
- Ingests all `.md` files with proper metadata tags
- Idempotent (uses upsert — safe to run multiple times)
- Output: `8 playbook(s) across 2 domain(s)`

#### Tool Registry (`backend/registry/tool_registry.py`)
- `register_tool(name, fn, description, input_schema)` + `get_tool(name)` + `list_tools()`
- `bootstrap_tools()` pre-registers: `search_accounts`, `query_playbooks`, `get_similar_cases`

#### Test Suite (`backend/scripts/test_memory.py`)
9 tests, all passing:
1. ✅ Write recommendation to episodic memory
2. ✅ Write feedback for recommendation
3. ✅ Retrieve similar past cases (RapidFuzz)
4. ✅ Query playbooks from semantic memory (ChromaDB)
5. ✅ Memory manager combined context retrieval
6. ✅ Retrieval metadata exists (playbook_count, past_case_count, latency_ms)
7. ✅ Collection auto-creation (querying nonexistent domain returns [] without error)
8. ✅ Clear/delete functions work (delete_recommendation, clear_domain_memory, clear_collection)
9. ✅ Recruitment playbooks are retrievable

### Verification
- `seed_memory.py`: ✅ 8 playbooks across 2 domains
- `test_memory.py`: ✅ 9/9 tests pass

---

## Shift 3 — Context Agent ✅

**Date:** 2026-06-27 | **Duration:** ~1 hour

### What was built

#### Query Builder (`backend/agents/query_builder.py`)
Pure Python module — no LLM calls. Transforms entity data + interaction text into retrieval-friendly queries.

**Strategy:**
1. **Signal detection** with 5 domain categories: risk, growth, renewal, champion, recruitment
2. **Growth-negator logic**: "lower adoption" triggers risk signals, NOT growth signals (prevents false positives)
3. **Entity cue extraction**: health_score, usage_trend, fit_score, current_stage
4. **Keyword extraction**: stop word removal, top-6 keyword cap for tighter semantic matching

**Example queries:**
| Account | Query |
|---|---|
| ApexAnalytics (health=42, -25%) | `risk declining usage churn low health score churn risk usage declining` |
| CloudSphere (health=95, +40%) | `growth opportunity upsell expansion healthy account stable account usage increasing` |

#### Context Agent (`backend/agents/context_agent.py`)
First real agent in the platform. Class-based with `.run(input_data)` method.

**Pipeline:**
1. Build query via `build_context_query()`
2. Retrieve from `memory_manager.retrieve_context()`
3. **Rerank playbooks** based on entity metadata:
   - Boost `renewal_risk`/`escalation`/`champion_change` when health < 60 + declining usage
   - Boost `healthy_account`/`upsell_qualification` when health > 85 + increasing usage
   - Additive distance reduction of 0.15
4. Convert to `EvidenceNode` objects with calibrated confidence:
   - Playbooks: `confidence = 1.0 - (distance × 0.5)`
   - Past cases: `confidence = similarity_score / 100`
5. **Sort evidence** by confidence descending
6. **Detect missing information** (rule-based field checking per domain)
7. Generate retrieval summary (default text + optional LLM synthesis)

**Output shape:**
```python
{
    "raw_interaction": str,
    "query": str,
    "playbooks": [...],
    "past_cases": [...],
    "evidence": [EvidenceNode, ...],   # sorted by confidence desc
    "retrieval_summary": str,
    "missing_information": [str, ...],
    "metadata": {
        "query": str,
        "playbook_count": int,
        "past_case_count": int,
        "top_evidence": str,
        "latency_ms": float,
    },
}
```

**Every EvidenceNode includes** `metadata.retrieval_type` = `"semantic"` or `"episodic"`.

**Optional LLM synthesis:** via OpenRouter `google/gemma-3-27b-it:free`, gated behind `ENABLE_CONTEXT_SYNTHESIS=true` env flag. Graceful degradation if not set.

#### Agent Registry (`backend/registry/agent_registry.py`)
- Simplified API: `register_agent(name, agent, description, capabilities)`
- `bootstrap_agents()` registers `ContextAgent` with capabilities: `retrieve_context`, `retrieve_playbooks`, `retrieve_past_cases`

#### Test Results (`backend/scripts/test_context_agent.py`)

**Scenario 1: Renewal-Risk Account (ApexAnalytics, health=42)**
| Rank | Playbook | Distance | Confidence |
|---|---|---|---|
| 1 | **renewal_risk** | 0.4019 (boosted) | 0.80 |
| 2 | healthy_account | 0.5553 | 0.72 |
| 3 | champion_change | 0.5561 | 0.72 |

**Scenario 2: Healthy Account (CloudSphere, health=95)**
| Rank | Playbook | Distance | Confidence |
|---|---|---|---|
| 1 | **healthy_account** | 0.2209 (boosted) | 0.89 |
| 2 | champion_change | 0.5682 | 0.72 |
| 3 | renewal_risk | 0.5883 | 0.71 |

**8/8 Dynamic Retrieval Checks Passed:**
1. ✅ Ranking order differs between scenarios
2. ✅ Top-ranked playbook differs (renewal_risk vs healthy_account)
3. ✅ Generated queries are different
4. ✅ Confidence scores differ
5. ✅ Evidence is sorted by confidence descending
6. ✅ All evidence nodes have retrieval_type metadata
7. ✅ Risk metadata has all required fields
8. ✅ Healthy metadata has all required fields

### Verification
- `test_context_agent.py`: ✅ 8/8 checks pass
- Dynamic retrieval proven: different inputs → different rankings, queries, and confidence scores

---

## Shift 4 — Reasoning Agent + Recommendation Agent ✅

**Date:** 2026-06-27 | **Duration:** ~1.5 hours

### What was built

#### Reasoning Agent (`backend/agents/reasoning_agent.py`)
- Standardized class conforming to `AgentSpec`.
- LLM execution via OpenRouter (`google/gemma-3-27b-it:free`).
- Heuristic fallback logic for Customer Success & Recruitment domains, extracting risks, opportunities, conflicts, and missing information.

#### Recommendation Agent (`backend/agents/recommendation_agent.py`)
- Standardized class conforming to `AgentSpec`.
- Generates exactly 3 ranked `CandidateAction` options with confidence/value/feasibility.
- Custom fallback action plans mapped to context playbooks (Renewal, Escalation, Champion Change, Upsell, Screening, Dropout).

#### Pipeline Verification Script (`backend/scripts/test_pipeline_partial.py`)
- Executed sequential Context ➔ Reasoning ➔ Recommendation routing.
- Printed complete metadata, summaries, candidate actions, and rejection justifications.

### Verification
- `test_pipeline_partial.py`: ✅ Runs successfully across both domains, logging correct rejections.

---

## Shift 5 — Explanation Agent + Learning Agent + computed confidence ✅

**Date:** 2026-06-27 | **Duration:** ~1.5 hours

### What was built

#### Explanation Agent (`backend/agents/explanation_agent.py`)
- Computes logical confidence scores mathematically (baseline from evidence count, source agreement score, and historical human feedback approval rates).
- Compiles the chronological `reasoning_trace`.

#### Learning Agent (`backend/agents/learning_agent.py`)
- Persists final recommendations and human outcome feedback into episodic SQLite memory.
- Reflection job (`run_reflection()`) aggregates statistics, identifies rejection trends, and writes learned heuristics back into ChromaDB (semantic memory).

#### Loop Ingestion & Full Pipeline Script (`backend/scripts/test_pipeline_full.py`)
- Configured memory manager to check for and append `learned_heuristics` playbooks.
- Script validates entire pipeline, mock outcome writeback, reflection generation, and closed-loop retrieval.

### Verification
- `test_pipeline_full.py`: ✅ Closed-loop learning verified. Dynamically aggregates rejections and retrieves `learned_heuristics` on subsequent runs.
- `test_memory.py`: ✅ 9/9 tests pass.
- `test_context_agent.py`: ✅ 8/8 tests pass.

---

## Shift 6 — Planner Agent + LangGraph wiring ✅

**Date:** 2026-06-27 | **Duration:** ~1.5 hours

### What was built

#### LangGraph StateGraph (`backend/core/planner.py`)
- Implemented LangGraph `StateGraph` using `PlatformState`.
- Implements `planner_node` (routing path classifier) and agent execution nodes.
- Configured checkpointer `MemorySaver` and paused the graph before the Human Approval Gate using `interrupt_before=["human_approval_node"]`.

#### Conditional Orchestration Edges
- Escalation path (Urgent signals): runs `context` ➔ `reasoning` ➔ `recommendation` ➔ `explanation` ➔ `human_approval`.
- Standard path (Routine signals): runs `context` ➔ `generate_standard_recommendation` (bypassing reasoning/recommendation) ➔ `explanation` ➔ `human_approval`.

#### FastAPI API Updates (`backend/api/main.py`)
- Added `POST /api/v1/recommend` to start thread and run up to the interrupt point.
- Added `POST /api/v1/approve` to update thread state with human feedback and resume execution.

#### Graph Verification Script (`backend/scripts/test_graph.py`)
- Validates escalation and standard path conditional splits and resumption behavior.

### Verification
- `test_graph.py`: ✅ All LangGraph routing and checkpointer resumption tests pass.

---

## Shift 7 — React UI + Human-in-the-Loop ✅

**Date:** 2026-06-27 | **Duration:** ~2 hours

### What was built

#### Backend API Extensions (`backend/api/main.py`)
- **`GET /api/v1/history`**: Queries past recommendations & human feedback outcomes from SQLite.
- **`GET /api/v1/heuristics`**: Fetches generated continuous learning heuristics from ChromaDB.
- **`GET /api/v1/trace`**: Exposes the path classification, timestamps, and state per thread in-memory (`planner_traces`).

#### UI Pages and Components (`frontend/src/`)
- **App Shell Refactoring**: Componentized the monolith into standalone components and pages utilizing `react-router-dom`.
- **Pages**:
  - `RecommendPage.jsx`: Selection of accounts/candidates, running the decision pipeline, inspecting SVG circular confidence badge, checking candidate next-best actions with rejection rationale, browsing expandable evidence accordions, and managing HITL approval decisions.
  - `MemoryPage.jsx`: Explores historical recommendation cards, human comments, and mined reflection heuristics.
  - `TracePage.jsx`: Visually displays classification routes, timelines, durations, and state transitions.
- **Components**:
  - `Navbar`: Global navigation.
  - `AccountSelector`: Renders client profiles safely (fixed the recruitment domain stage null-safety crash).
  - `PipelineStatus`: Visualizes the LangGraph node execution trail.
  - `CandidateCards`: Displays selected action card, custom modal overlay for edits/feedback, and reject comments.
  - `EvidenceAccordion`: Shows raw context content.
  - `ConfidenceBadge`: SVG circular dial.
  - `ApprovalButtons`: Core decision gate controls.
  - `TraceTimeline`: Chronological agent trace.

### Verification
- **E2E Playthrough**: Verified domain switches (Customer Success ➔ Recruitment), full pipeline execution, feedback/reject requirement validation, and custom modal edits.
- **Memory/Trace Updates**: Confirmed that decisions immediately persist in SQLite and traces are visible in the Trace dashboard.
- **Build Cleanliness**: Production Vite bundle (`npm run build`) compiles successfully.

