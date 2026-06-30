# Intelligent Next Best Action Platform
### XLVentures.AI Hackathon Submission

> A **reusable, configuration-driven Decision Intelligence Platform** that transforms customer interactions and enterprise knowledge into explainable, confidence-scored next best action recommendations — with a human-in-the-loop approval gate and continuous learning from feedback.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture](#2-architecture)
3. [The Five Agents](#3-the-five-agents)
4. [Domain Packs — Extensibility Proof](#4-domain-packs--extensibility-proof)
5. [Memory Layer](#5-memory-layer)
6. [Data Contracts](#6-data-contracts)
7. [API Reference](#7-api-reference)
8. [Tech Stack](#8-tech-stack)
9. [Repository Structure](#9-repository-structure)
10. [Setup & Installation](#10-setup--installation)
11. [Running the Demo](#11-running-the-demo)
12. [Evaluation Criteria Alignment](#12-evaluation-criteria-alignment)

---

## 1. Platform Overview

This is a **Decision Intelligence Platform** — not an autonomous AI agent, not a chatbot, not a RAG demo. The pipeline is intentionally clear:

```
Input Data → Understand Context → Reason About Business Situation →
Generate Options → Recommend Next Action → Explain Why →
Human Approval → Learn from Decision
```

### What makes this a *platform*, not a demo

- **Config-driven, domain-agnostic.** The same five agents and the same planner run against two structurally different domain packs — no code changes between domains. Switching domains is a configuration swap, not a redeploy.
- **Computed confidence, never LLM-asserted.** Confidence scores come from evidence count, source agreement, and historical acceptance rates — not a model claiming "I am 85% confident."
- **Every decision is explainable.** Structured evidence nodes, a decomposed confidence breakdown, and a step-by-step reasoning trace are produced for every recommendation.
- **Human-in-the-loop is a hard gate.** No recommendation is executed without passing through approve / edit / request-info / reject.
- **Closed feedback loop.** Every human decision writes to episodic memory and influences future confidence scoring — the platform actually learns.

### Primary Business Domain

**B2B SaaS Customer Success — Renewal Risk & Expansion Intelligence**

| Decision Point | Trigger Signals |
|---|---|
| Renewal at Risk | Usage drop >20%, health score <50, negative sentiment |
| Expansion Opportunity | Usage near plan limits, positive sentiment, budget signals |
| Escalation Needed | Unresolved critical support tickets, SLA breach language |
| Champion/Stakeholder Change | Key contact gone silent, org restructure notes |

### Second Domain (Extensibility Proof)

**Staffing / Recruitment — Screening → Offer Workflow**
Lightweight implementation (3 candidate records, 1 workflow) that proves the platform runs correctly across completely different entities and terminologies — using identical agent code, zero code branches.

---

## 2. Architecture

```
                       React Frontend (Vite)
                              |
                              v
                   Configuration Hub
     (Domain Packs · Business Rules · Workflows ·
      Personas · Policies · KPIs)
                              |
                              v
              +------- Planner Agent (LangGraph) -------+
              |   LLM Classification + Heuristic         |
              |   Fallback -> Dynamic Route Decision      |
              +-----------------------+-------------------+
                                      |
                            Execution Engine
                                      |
          +---------------------------+---------------------------+
          v                           v                           v
    Agent Registry             Tool Registry               Memory Layer
    (5 agents)                 (pluggable)                 (2-tier + reflect)
          |
          v
+-----------+-----------+------------------+-----------+----------+
|  Context  |  Reasoning| Recommendation   |Explanation| Learning |
|  Agent    |  Agent    |  Agent           |  Agent    |  Agent   |
| (retrieval)| (analysis)| (generation)    |(explainab.)|(feedback)|
+-----------+-----------+------------------+-----------+----------+
                              |
                              v
                    +-- Human Approval --+
                    | Approve / Edit /   |
                    | Reject / Info Req. |
                    +--------+-----------+
                             |
                             v
                   Memory Writeback
                   (Episodic + Semantic)
```

### Dynamic Routing — Two Distinct Paths

The Planner Agent classifies every interaction and routes to one of two paths:

| Path | Trigger | Agent Flow |
|---|---|---|
| **Escalation** | Health score < 50, critical keywords (outage, churn, breach, champion left), fit score < 60 | Planner → Context → Reasoning → Recommendation → Explanation → Human Approval → Learning |
| **Standard** | No urgent signals detected | Planner → Context → Standard Recommendation → Explanation → Human Approval → Learning |

Two different inputs **visibly** traverse two different execution paths — observable in both the Execution Sidebar and full LangGraph trace.

---

## 3. The Five Agents

Each agent has a single, tightly-scoped responsibility. No agent calls another agent directly — all inter-agent flow passes through the LangGraph execution engine.

### Context Agent (`context_agent.py`)
**Purpose:** Retrieval and ingestion only. No reasoning.

- Builds a semantic search query from entity data and interaction notes
- Retrieves relevant playbooks from ChromaDB (semantic memory)
- Retrieves similar past cases from SQLite (episodic memory)
- Assembles structured `EvidenceNode` objects with source, type, content, and confidence
- Flags missing information fields for downstream agents
- Supports LLM synthesis via OpenRouter (optional, env-gated)

**Input:** `{domain_pack_id, entity, interaction}`  
**Output:** `{playbooks, past_cases, evidence, missing_information, metadata}`

---

### Reasoning Agent (`reasoning_agent.py`)
**Purpose:** Risk and opportunity analysis only. No action generation.

- Identifies risks from entity signals, interaction content, and retrieved context
- Detects conflicts and contradictions across evidence sources
- Flags missing information that would improve decision quality
- Produces a `reasoning_summary` and prioritized risk/opportunity lists
- LLM-powered analysis (OpenRouter) with heuristic fallback

**Input:** `{domain_pack_id, entity, interaction, retrieved_context}`  
**Output:** `{risks, opportunities, missing_information, conflicts, reasoning_summary}`

---

### Recommendation Agent (`recommendation_agent.py`)
**Purpose:** Action generation and ranking only. No confidence computation.

- Generates exactly 3 candidate actions per recommendation
- Ranks actions by `business_value_score` and `feasibility_score`
- Selects the top action as the recommended next best action
- Requires a `rejected_reason` for every non-selected candidate
- LLM-powered generation (OpenRouter) with deterministic heuristic fallback

**Input:** `{domain_pack_id, entity, interaction, retrieved_context, reasoning_output}`  
**Output:** `{candidate_actions, selected_action_id}`

---

### Explanation Agent (`explanation_agent.py`)
**Purpose:** Explainability and confidence computation only. No re-ranking.

- Builds a structured evidence summary from all upstream outputs
- Computes `ComputedConfidence` mathematically:
  - `evidence_count` — number of supporting evidence nodes
  - `source_agreement` — ratio of consensus across evidence source types
  - `historical_acceptance_rate` — pulled from episodic memory
  - `score` — weighted combination of the above three factors
- Produces a step-by-step `reasoning_trace`
- Assembles the complete `Recommendation` output payload

**Input:** `{domain_pack_id, entity, interaction, retrieved_context, reasoning_output, recommendation_output}`  
**Output:** `{selected_action, candidate_actions, evidence, computed_confidence, reasoning_trace}`

---

### Learning Agent (`learning_agent.py`)
**Purpose:** Memory writeback and reflection only. No recommendations.

- Writes human decisions and feedback to episodic SQLite memory (`FeedbackRecord`)
- Tags every record with `domain_pack_id` for domain-isolated retrieval
- Runs the **reflective step** on demand: mines patterns from episodic memory and writes summarized heuristics back to ChromaDB semantic memory
- Historical acceptance rates surface back to the Explanation Agent on future runs

**Input:** Triggered by human approval events  
**Output:** Feedback ID, reflection status, updated memory

---

## 4. Domain Packs — Extensibility Proof

Domain packs are configuration bundles, not code. Adding a new domain means creating a JSON config file — no agent code changes.

### Structural Mapping

| Customer Success | Recruitment |
|---|---|
| Customer / Account | Candidate |
| Meeting Transcript | Interview Transcript |
| CRM | ATS (Applicant Tracking System) |
| Churn Risk | Candidate Drop-off Risk |
| Upsell Opportunity | Fast-track Opportunity |
| Executive Meeting | Hiring Manager Call |
| Renewal | Hiring Decision |

### Customer Success Pack (Full Depth)
- **Entities:** Customer, Account, Product
- **Workflows:** Renewal, Escalation, Upsell
- **Decision Points:** 4 (renewal at risk, expansion opportunity, escalation, champion change)
- **Business Rules:** e.g., `renewal_risk_score > 80% → escalate`
- **Synthetic Data:** 5 accounts with interaction notes, usage trends, health scores, ACV
- **Playbooks:** 5 markdown playbooks seeded into ChromaDB
- **Success Metrics:** Recommendation acceptance rate, risk-catch lead time, simulated NRR impact

### Recruitment Pack (Lightweight Extensibility Proof)
- **Entities:** Candidate, Job, Interview
- **Workflows:** Screening → Offer
- **Decision Points:** 2 (candidate fit, offer risk)
- **Business Rules:** e.g., `candidate_fit_score > 85% → fast-track`
- **Synthetic Data:** 3 candidates with interview notes, fit scores, stage info
- **Playbooks:** 3 playbooks seeded into ChromaDB
- **Success Metrics:** Time-to-hire

---

## 5. Memory Layer

Two independent memory tiers plus a reflective step. These serve different purposes and are not interchangeable.

| Tier | Storage | Contains | Used By |
|---|---|---|---|
| **Semantic Memory** | ChromaDB (local, embedded) | Playbooks, org knowledge, per-domain content, learned heuristics | Context Agent (RAG retrieval) |
| **Episodic Memory** | SQLite (SQLAlchemy ORM) | Past interactions, recommendations, human decisions — tagged by domain | Context Agent (past cases), Explanation Agent (acceptance rates), Learning Agent |
| **Reflective Step** | Writes to Semantic Memory | Mined patterns from episodic memory condensed into heuristics | Learning Agent (on-demand trigger) |

### Episodic Memory Schema

```
RecommendationRecord
├── recommendation_id  (UUID primary key)
├── entity_id
├── domain_pack_id
├── recommendation_json  (full Recommendation payload as JSON)
└── created_at

FeedbackRecord
├── feedback_id  (UUID primary key)
├── recommendation_id  (foreign key)
├── domain_pack_id
├── outcome  (approved | edited | rejected | needs_info)
├── human_feedback  (free text)
└── created_at
```

---

## 6. Data Contracts

These Pydantic schemas are the shared data contracts across all agents. Defined in `backend/core/schemas.py`.

```python
DomainPack:
  id: str
  name: str
  description: str
  entities: List[str]
  workflows: List[str]
  business_rules: List[Dict]
  success_metrics: List[str]
  tools: List[str]
  prompt_overrides: Dict[str, str]
  decision_points: List[DecisionPoint]

ComputedConfidence:
  score: float                    # 0.0-1.0, mathematically derived
  evidence_count: int
  source_agreement: float         # 0.0-1.0
  historical_acceptance_rate: float

EvidenceNode:
  source: str
  source_type: str                # playbook | past_case | crm_note | transcript
  content: str
  confidence: float
  metadata: Dict

CandidateAction:
  id: str
  title: str
  description: str
  rationale: str
  expected_impact: str
  confidence: float
  rejected_reason: Optional[str]  # required for non-selected actions

Recommendation:
  recommendation_id: str
  entity_id: str
  domain_pack_id: str
  candidate_actions: List[CandidateAction]
  selected_action: CandidateAction
  evidence: List[EvidenceNode]
  reasoning_trace: List[str]
  computed_confidence: ComputedConfidence
  created_at: datetime

MemoryWrite:
  entity_id: str
  domain_pack_id: str
  recommendation: Recommendation
  human_feedback: Optional[str]
  outcome: str                    # approved | edited | rejected | needs_info
  timestamp: datetime
```

---

## 7. API Reference

**Base URL:** `http://localhost:8000/api/v1`

All endpoints return JSON. Interactive Swagger docs: `http://localhost:8000/docs`

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |

### Domain & Entities

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/domain` | `domain=customer_success` | Load domain pack configuration |
| `GET` | `/accounts` | `domain=customer_success` | List synthetic entities for a domain |
| `GET` | `/domain-config` | `domain=customer_success` | Full domain config + dynamic metrics |

### Pipeline

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/recommend` | `{domain_pack_id, entity_id, interaction?}` | Run LangGraph pipeline; pauses at HITL gate |
| `POST` | `/approve` | `{thread_id, outcome, feedback_text?, edited_action?}` | Resume pipeline with human decision |
| `POST` | `/reflect` | `{domain_pack_id}` | Manually trigger reflective learning step |

### Observability & History

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/trace` | `thread_id?` | Get planner execution trace(s) |
| `GET` | `/traces` | — | Get all execution traces |
| `GET` | `/history` | `domain=customer_success` | All past recommendations + feedback |
| `GET` | `/heuristics` | `domain=customer_success` | Learned heuristics from reflection |
| `GET` | `/previous-recommendation` | `domain, entity_id` | Most recent recommendation for a given entity |

### Example: Run Pipeline

```bash
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"domain_pack_id": "customer_success", "entity_id": "acc_001"}'
```

**Response:**
```json
{
  "thread_id": "3a8f1c2d-...",
  "status": "paused_for_approval",
  "routing_path": "escalation",
  "execution_time_ms": 1240,
  "recommendation": {
    "selected_action": { "title": "Schedule Executive Alignment Call", "..." },
    "candidate_actions": [ { "..." }, { "..." }, { "..." } ],
    "computed_confidence": { "score": 0.91, "evidence_count": 5, "..." },
    "evidence": [ { "..." } ],
    "reasoning_trace": [ "..." ]
  },
  "agent_steps": [ { "agent": "planner", "duration_ms": 45, "..." } ],
  "execution_summary": {
    "total_agents": 5,
    "confidence_score": 0.91,
    "path_taken": "escalation"
  },
  "recommendation_analysis": {
    "why_this": ["Health score: 38", "Renewal in 22 days"],
    "why_not_others": [{"action": "Send Email", "reason": "..."}],
    "confidence_breakdown": { "score": 0.91, "evidence_count": 5, "..." }
  }
}
```

### Example: Approve Decision

```bash
curl -X POST http://localhost:8000/api/v1/approve \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "3a8f1c2d-...",
    "outcome": "approved",
    "feedback_text": "Scheduling the executive call for next Monday."
  }'
```

---

## 8. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Orchestration** | LangGraph (Python) | `interrupt_before` for HITL pause; `MemorySaver` checkpointer for state persistence across the approval gate |
| **Planner Routing** | LLM classification (OpenRouter) + heuristic fallback | Routes dynamically; different inputs produce visibly different execution paths |
| **LLMs** | Google Gemma 3 27B via OpenRouter (free tier) | Used for classification, reasoning, recommendation generation, and synthesis |
| **Vector Store** | ChromaDB (local, embedded, `all-MiniLM-L6-v2`) | Zero server setup; no risk of hosted dependency failure during demo |
| **Episodic Memory** | SQLite + SQLAlchemy ORM | Zero setup; every row tagged with `domain_pack_id` |
| **Backend** | FastAPI (Python 3.11+) | Serves domain config, entities, and runs the agentic pipeline |
| **Frontend** | React 19 + Vite 8 + Zustand | Modern SPA; Outfit/Inter typography; glassmorphic dark UI |
| **State Management** | Zustand | Lightweight global store for domain, execution, and outcome state |
| **Observability** | LangSmith (optional, env-gated) | Activated via env vars; no code changes required |
| **Deployment** | Local only | A flawless local run beats a flaky hosted deployment |

---

## 9. Repository Structure

```
XLVenturesHackathon/
├── backend/
│   ├── agents/
│   │   ├── context_agent.py           # Retrieval + ingestion agent
│   │   ├── reasoning_agent.py         # Risk/opportunity analysis agent
│   │   ├── recommendation_agent.py    # Action generation + ranking agent
│   │   ├── explanation_agent.py       # Explainability + confidence agent
│   │   ├── learning_agent.py          # Memory writeback + reflection agent
│   │   └── query_builder.py           # Shared query construction module
│   │
│   ├── api/
│   │   └── main.py                    # FastAPI entrypoint + all route handlers
│   │
│   ├── config/
│   │   └── domain_packs/
│   │       ├── customer_success.json  # Customer Success domain configuration
│   │       └── recruitment.json       # Recruitment domain configuration
│   │
│   ├── core/
│   │   ├── planner.py                 # LangGraph StateGraph + nodes + routing
│   │   ├── schemas.py                 # All Pydantic data contracts
│   │   ├── settings.py                # Platform settings (DB path, CORS, API prefix)
│   │   ├── state.py                   # PlatformState TypedDict
│   │   └── config_loader.py           # Domain-agnostic data loader
│   │
│   ├── data/
│   │   ├── customer_success/
│   │   │   ├── accounts.json          # 5 synthetic CS accounts
│   │   │   └── playbooks/             # 5 markdown playbooks (seeded to ChromaDB)
│   │   ├── recruitment/
│   │   │   ├── candidates.json        # 3 synthetic candidates
│   │   │   └── playbooks/             # 3 markdown playbooks (seeded to ChromaDB)
│   │   ├── chroma/                    # ChromaDB persistent store (auto-generated)
│   │   └── platform.db                # SQLite episodic memory (auto-generated)
│   │
│   ├── memory/
│   │   ├── episodic.py                # SQLite-backed recommendation + feedback store
│   │   ├── semantic.py                # ChromaDB vector store interface
│   │   └── manager.py                 # Unified MemoryManager interface
│   │
│   ├── registry/
│   │   ├── agent_registry.py          # Agent registration + bootstrap
│   │   └── tool_registry.py           # Tool registration + bootstrap
│   │
│   └── scripts/
│       ├── seed_memory.py             # Seeds playbooks from /data into ChromaDB
│       ├── test_memory.py             # 9 memory integration tests
│       ├── test_context_agent.py      # Context agent end-to-end test
│       ├── test_graph.py              # LangGraph pipeline test
│       ├── test_pipeline_full.py      # Full pipeline test (LLM path)
│       └── test_pipeline_partial.py   # Partial pipeline verification
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccountSelector.jsx    # Entity selection with health indicators
│   │   │   ├── ApprovalButtons.jsx    # Approve / Edit / Reject / Request Info
│   │   │   ├── CandidateCards.jsx     # Ranked action cards + rejection reasons
│   │   │   ├── ConfidenceBadge.jsx    # Computed confidence breakdown display
│   │   │   ├── EvidenceAccordion.jsx  # Expandable evidence source list
│   │   │   ├── ExecutionSidebar.jsx   # Agent execution trace sidebar
│   │   │   ├── Navbar.jsx             # Domain switcher + navigation
│   │   │   ├── PipelineStatus.jsx     # Routing path + timing indicator
│   │   │   └── TraceTimeline.jsx      # Reasoning trace timeline
│   │   │
│   │   ├── pages/
│   │   │   ├── RecommendPage.jsx      # Main recommendation + HITL workflow page
│   │   │   ├── ConfigurationPage.jsx  # Configuration Hub + metrics dashboard
│   │   │   ├── MemoryPage.jsx         # Memory inspector (episodic + semantic)
│   │   │   └── TracePage.jsx          # Full planner trace viewer
│   │   │
│   │   ├── services/
│   │   │   └── api.js                 # All API call functions (fetch wrappers)
│   │   │
│   │   ├── store/
│   │   │   └── appStore.js            # Zustand global state store
│   │   │
│   │   ├── App.jsx                    # Router + layout shell
│   │   ├── index.css                  # Global design system (glassmorphic dark)
│   │   └── main.jsx                   # React entry point
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .env.example                       # Environment variable template
├── .gitignore
├── requirements.txt                   # Python dependencies
├── description.md                     # Internal project architecture document
├── PROGRESS.md                        # Shift-by-shift implementation log
└── README.md                          # This file
```

---

## 10. Setup & Installation

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Python | 3.11 | 3.12 works; 3.10 is untested |
| Node.js | 18 | Node 20+ recommended |
| npm | 9 | Bundled with Node.js |
| Git | Any | For cloning |

> **Windows users:** All commands work in PowerShell or Command Prompt. Use separate lines instead of `&&` in older PowerShell (pre-7).

---

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd XLVenturesHackathon
```

---

### Step 2 — Configure Environment Variables

```bash
# Copy the template
cp .env.example .env     # macOS/Linux
copy .env.example .env   # Windows
```

Edit `.env` with your values:

```env
# LLM via OpenRouter — get a free key at https://openrouter.ai
# The platform runs without this key; LLM paths activate when set.
OPENROUTER_API_KEY=sk-or-v1-...

# Set to true to enable LLM-powered context synthesis
ENABLE_CONTEXT_SYNTHESIS=false

# LangSmith tracing — optional, get key at https://smith.langchain.com
LANGSMITH_API_KEY=lsv2_pt_...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=agentic-decision-platform
```

> **The platform runs fully without any API keys.** LLM-powered reasoning, recommendations, and classification activate when `OPENROUTER_API_KEY` is set. Without it, the platform uses deterministic heuristic-based recommendations that exercise the same pipeline architecture.

---

### Step 3 — Backend Setup

#### 3a. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python -m venv .venv
source .venv/bin/activate
```

You should see `(.venv)` at the start of your prompt.

#### 3b. Install Python dependencies

```bash
pip install -r requirements.txt
```

> The first install takes 2–5 minutes. `sentence-transformers` and `chromadb` are the largest packages. The embedding model (`all-MiniLM-L6-v2`, ~80 MB) is downloaded automatically on first seed run.

#### 3c. Seed the memory layer

This loads the playbook markdown files from `backend/data/` into ChromaDB and validates the SQLite schema.

**Windows (PowerShell):**
```powershell
$env:PYTHONPATH = "."
python backend/scripts/seed_memory.py
```

**macOS / Linux:**
```bash
PYTHONPATH=. python backend/scripts/seed_memory.py
```

Expected output:
```
Seeding customer_success playbooks...
  Seeded: renewal_risk_playbook
  Seeded: escalation_playbook
  Seeded: expansion_opportunity_playbook
  ...
Seeding recruitment playbooks...
  Seeded: candidate_screening_playbook
  ...
Seeding complete.
```

#### 3d. (Optional) Run verification tests

```powershell
# Windows
$env:PYTHONPATH = "."

# 9 memory layer integration tests
python backend/scripts/test_memory.py

# Context agent retrieval test
python backend/scripts/test_context_agent.py

# Full pipeline test (LLM path — requires OPENROUTER_API_KEY)
python backend/scripts/test_pipeline_full.py
```

```bash
# macOS / Linux
PYTHONPATH=. python backend/scripts/test_memory.py
PYTHONPATH=. python backend/scripts/test_context_agent.py
PYTHONPATH=. python backend/scripts/test_pipeline_full.py
```

#### 3e. Start the backend server

**Windows (PowerShell):**
```powershell
$env:PYTHONPATH = "."
uvicorn backend.api.main:app --reload --port 8000
```

**macOS / Linux:**
```bash
PYTHONPATH=. uvicorn backend.api.main:app --reload --port 8000
```

Expected startup output:
```
INFO:api: Initializing and validating domain packs...
INFO:api: Validated domain pack: 'customer_success'.
INFO:api: Validated domain pack: 'recruitment'.
INFO:api: Bootstrapping agents in registry...
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Interactive API docs: **http://localhost:8000/docs**

---

### Step 4 — Frontend Setup

Open a **new terminal** (keep the backend running in the first one).

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in ~300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **http://localhost:5173** in your browser.

---

### Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'backend'` | PYTHONPATH not set | Prefix with `PYTHONPATH=.` or set `$env:PYTHONPATH="."` in PowerShell |
| `FileNotFoundError: customer_success.json` | Wrong working directory | Run all backend commands from the project root (`XLVenturesHackathon/`) |
| `ChromaDB error on seed` | Stale chroma data | Delete `backend/data/chroma/` and re-run `seed_memory.py` |
| CORS error in browser | Backend not running | Confirm uvicorn is running on port 8000 |
| `npm install` fails | Node version too old | Upgrade to Node.js 18 or higher |
| Port 8000 already in use | Another process | Use `--port 8001` and update `BASE_URL` in `frontend/src/services/api.js` |
| Embedding model download hangs | Network issue | The model (~80 MB) downloads once to `~/.cache/huggingface/`. Retry on a stable connection |
| PowerShell execution policy error | Windows security policy | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` then retry |

---

## 11. Running the Demo

### Recommended Walkthrough Sequence

The following sequence exercises all key platform capabilities and covers the full evaluation rubric.

#### Step 1 — Select a Domain Pack
Use the **domain switcher** in the top navigation bar:
- `Customer Success` — 5 accounts, full pipeline depth
- `Recruitment` — 3 candidates, proves domain-agnosticism

#### Step 2 — Run an Escalation Recommendation
Select an account with a **low health score** (e.g., `acc_001` or `acc_003` in Customer Success — health scores below 50 or with critical interaction notes).

Click **"Run Decision Pipeline"** and observe:
- `routing_path: escalation` in the Pipeline Status banner
- All 5 agents firing in sequence: Planner → Context → Reasoning → Recommendation → Explanation
- Execution Sidebar showing per-agent duration and output summaries

#### Step 3 — Run a Standard Recommendation
Select a **healthy account** (e.g., an account with health score above 70). Observe:
- `routing_path: standard` in the Pipeline Status banner
- Abbreviated agent path: Planner → Context → Standard Recommendation → Explanation
- **Same pipeline framework, different route** — this is the dynamic routing proof

#### Step 4 — Inspect the Recommendation
After the pipeline completes, review:
- **Computed Confidence** card — evidence count, source agreement, historical rate, final score
- **3 Candidate Actions** — ranked cards with `business_value_score`, `feasibility_score`, and `rejected_reason` for non-selected options
- **Evidence Accordion** — expandable source list (playbooks, past cases, interaction notes)
- **Reasoning Trace** — step-by-step agent chain of thought

#### Step 5 — Complete the HITL Cycle
Demonstrate all three approval outcomes to show the full human-in-the-loop gate:
- **Approve** — logs decision, triggers learning, displays feedback ID and reflection status
- **Edit & Approve** — opens edit modal, modify action title/description, submit with feedback note; shows `outcome: edited`
- **Reject** — logs rejection with reason text; episodic memory records `outcome: rejected`

#### Step 6 — Run Reflection
Click **"💡 Run Reflection"** in the Learning Hub panel. This:
1. Mines episodic memory for patterns across past recommendations
2. Synthesizes heuristics (e.g., "Accounts with health < 40 accepting escalation calls improved 3-month health by avg 18 points")
3. Writes the heuristics back to ChromaDB semantic memory
4. The next pipeline run retrieves these heuristics as additional context — the platform has learned

#### Step 7 — Switch Domain Live
Change the domain switcher to **Recruitment** while the app is running. The platform:
- Loads the Recruitment domain pack via config (no code change, no restart)
- Displays candidate records, Recruitment-specific workflows, and time-to-hire KPIs
- Runs the same five agents with domain-appropriate recommendations

#### Step 8 — View Observability Panels
Navigate to **Trace** and **Memory** pages:
- **Trace page:** Full planner execution trace per thread — agent, status, timing, input/output summaries, routing path
- **Memory page:** All past recommendations with feedback outcomes, learned heuristics from reflection
- **Configuration Hub:** Domain pack details, dynamic metrics (acceptance rate, risk-catch lead time, NRR impact)

---

## 12. Evaluation Criteria Alignment

| Evaluation Criterion | Weight | Implementation Evidence |
|---|---|---|
| **Agentic AI Architecture Quality** | 70% | Dynamic LangGraph planner with conditional routing, 5 specialized agents with distinct scopes, `interrupt_before` HITL pause/resume with `MemorySaver` checkpointer, full execution trace per thread |
| **Reusability & Extensibility** | (incl. in 70%) | Two domain packs proven live — identical agent code, zero code changes, config-only domain switch; Tool Registry and Agent Registry are additive by design (new tools/agents register without modifying existing code) |
| **Memory & Orchestration Design** | (incl. in 70%) | Two-tier memory (ChromaDB semantic + SQLite episodic), reflective step that mines episodic → updates semantic, confidence scores computed from historical acceptance rates retrieved from episodic memory |
| **Observability** | (incl. in 70%) | Per-agent execution trace with timing, input/output summaries, routing path decisions; LangSmith integration activated via env vars |
| **User Experience** | (incl. in 70%) | Glassmorphic dark UI, approve/edit/reject/info HITL controls, evidence accordion, ranked candidate cards with rejection reasons, live domain switcher, reflection panel |
| **Business Use Case** | 30% | CS domain: 4 decision points, 5 synthetic accounts with realistic signals, measurable KPIs (acceptance rate, risk-catch lead time, simulated NRR impact) computed dynamically |

### Key Design Decisions

**Five agents, not more.** The evaluation brief grades architecture quality — dynamic routing through fewer, deeper agents outperforms a flat roster of many shallow ones.

**Confidence is computed.** The formula is:
```
score = 0.40 × (evidence_count / max_evidence)
      + 0.35 × source_agreement
      + 0.25 × historical_acceptance_rate
```
Every number is traceable to its inputs. The Explanation Agent does not ask the LLM for a confidence score.

**Domain differences live entirely in config.** If any agent code contains `if domain == "customer_success"`, it is a bug. All domain-specific logic lives in the domain pack's `prompt_overrides` and `business_rules`.

**The HITL gate is real.** LangGraph's `interrupt_before=["human_approval_node"]` pauses execution. The frontend calls `POST /approve` to explicitly resume. State is persisted across the pause in `MemorySaver`.

**LLM routing with a heuristic safety net.** The Planner calls OpenRouter for LLM-based classification. If the API is unavailable, the heuristic fallback produces an identical routing decision format transparently — no degraded output, no error surfaces to the UI.

---

*Built for the XLVentures.AI Hackathon — June 2026*
