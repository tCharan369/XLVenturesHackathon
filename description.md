# description.md — project context for coding agents

This file is the single source of truth for what this project is and how it's built. Read this before writing code. If something here conflicts with code you find, the code is probably stale — flag it, don't silently follow it.

---

## 1. What this is

A **Decision Intelligence Platform** — not an autonomous AI employee, not a chatbot, not a RAG demo. The pipeline is intentionally simple:

```
Input data → Understand context → Reason about the business situation →
Generate options → Recommend next action → Explain why → Human approval → Learn
```

It's a platform because the pipeline, agents, and recommendation logic are config-driven and domain-agnostic — proven by running the same five agents against two different domain packs with no code change.

Built for a hackathon evaluated 70% on platform/architecture quality, 30% on business use case quality.

**Primary domain pack:** B2B SaaS Customer Success — Renewal Risk & Expansion Intelligence (fully implemented)
**Decision points:** renewal-at-risk, expansion/upsell opportunity, escalation needing CSM follow-up, champion/stakeholder change risk
**Success metrics:** recommendation acceptance rate, risk-catch lead time, simulated NRR impact
**Second domain pack:** Staffing / Recruitment (lightweight — config + sample data + one workflow only, see §3a). Implemented purely to prove the platform is domain-agnostic, not to be a second fully-featured use case.

---

## 2. Non-negotiable design principles

1. **Agent count is not the goal — dynamic routing is.** The brief asks for a planner that *dynamically orchestrates specialized agents*, not a large agent roster. We use exactly five agents (§3). Do not add more agents to "look more agentic" — add depth to the planner's routing logic and to the domain packs instead.
2. **The planner must actually be dynamic.** It classifies the interaction and decides at runtime which of the five agents to invoke and in what order/combination. Two different inputs should visibly take two different paths.
3. **Extensibility is proven via config, not code.** New domains are added as a Domain Pack in the Configuration Hub. New agents/tools are added via the Agent/Tool Registry. Neither requires editing orchestration code. The two-domain-pack demo (CS + a second pack) is the single most important extensibility proof — prioritize getting it working over adding any other feature.
4. **Confidence is computed, never asserted by the LLM.** Confidence scores come from evidence count, source agreement/conflict, and historical acceptance rate from episodic memory — not "the model said 85%."
5. **Every recommendation must be explainable.** Structured evidence + confidence + reasoning trace (Explanation Agent), not a paragraph of prose justification.
6. **Human-in-the-loop is a real gate.** No recommendation is "executed" without passing through approve/edit/request-info/reject.
7. **Everything writes back to memory.** Human decisions feed the Learning Agent, which updates episodic memory and influences future scoring. If a feature doesn't close this loop, it's incomplete.

---

## 3. Architecture

```
                       Frontend
                          │
                          ▼
                 Configuration Hub
   (Domain Packs · Business Rules · Workflow Templates ·
    Personas · Policies · KPIs)
                          │
                          ▼
                   Planner Agent
                          │
                          ▼
                  Execution Engine
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  Agent Registry     Tool Registry      Memory Layer
        │
        ▼
┌───────────┬────────────┬────────────────┬─────────────┬────────────┐
│  Context  │ Reasoning  │ Recommendation │ Explanation │  Learning  │
│   Agent   │   Agent    │     Agent      │    Agent    │   Agent    │
└───────────┴────────────┴────────────────┴─────────────┴────────────┘
                          │
                          ▼
                  Human Approval
                          │
                          ▼
                  Memory Writeback
```

Observability and an audit trail wrap every stage (not separate features — every planner decision, agent call, tool call, and human action gets traced/logged through them).

### The five agents — exact scope, don't expand without reason

| Agent | Responsibilities | Out of scope (resist scope creep here) |
|---|---|---|
| **Context** | Ingest interactions (notes/email/CRM/transcripts); retrieve enterprise knowledge (semantic memory RAG); pull historical context (episodic memory) | Don't have this agent reason about risk or rank anything — pure retrieval/ingestion |
| **Reasoning** | Identify risks, opportunities, missing information; prioritize signals; detect conflicts across sources | Don't have this agent generate the final action list — that's Recommendation |
| **Recommendation** | Generate candidate next actions; rank them (business value, feasibility); justify why non-chosen candidates lost | Don't have this agent compute confidence — that's Explanation |
| **Explanation** | Build the evidence summary, compute confidence score, produce the reasoning trace | Don't have this agent re-rank or alter recommendations — explain only |
| **Learning** | Write human decisions + outcomes to episodic memory; periodically mine patterns back into semantic memory (reflective step) | Don't have this agent make recommendations — feedback incorporation only |

### Configuration Hub

Holds everything that varies by business domain: domain packs, business rules, workflow templates, personas, policies, KPIs. A domain pack is a config bundle (prompts/templates, decision-point definitions, KPI formulas, sample data pointers) — switching domains means loading a different pack, not touching agent code.

### 3a. Domain pack mapping — Customer Success ↔ Staffing/Recruitment

The two packs are structurally identical; only the config differs. This mapping is what makes the live domain-switch demo coherent rather than arbitrary:

| Customer Success | Recruitment |
|---|---|
| Customer | Candidate |
| Meeting transcript | Interview transcript |
| CRM | ATS (applicant tracking system) |
| Churn risk | Candidate drop-off risk |
| Upsell opportunity | Fast-track opportunity |
| Executive meeting | Hiring manager call |
| Renewal | Hiring decision |

**Customer Success pack (full depth):**
- Entities: Customer, Account, Product
- Workflows: Renewal, Escalation
- Tools: CRM, Email, Knowledge Base
- Business rule example: renewal risk score > 80% → escalate
- Success metrics: recommendation acceptance rate, risk-catch lead time, simulated NRR/churn reduction impact

**Recruitment pack (lightweight — see §3b for exactly how lightweight):**
- Entities: Candidate, Job, Interview
- Workflows: Screening, Offer
- Tools: ATS, Resume Parser, Email
- Business rule example: candidate fit score > 85% → fast-track
- Success metrics: time-to-hire

**Sample input/output per pack** (for demo narration):

```
Customer Success:
  Input: meeting transcript + CRM updates + support tickets + usage metrics
  Output: Risk — renewal probability low. Next action — schedule executive call. Confidence — 91%.

Recruitment:
  Input: resume + interview transcript + recruiter notes + job requirements
  Output: Risk — candidate may decline offer. Next action — fast-track offer + schedule hiring manager call. Confidence — 88%.
```

### 3b. How lightweight is "lightweight" for the second pack — exact scope

Do **not** fully implement Recruitment. It exists solely to prove extensibility. Implement only:
1. The domain pack config file (entities, workflows, tools, business_rules, success_metrics — see §4 schema)
2. 2-3 synthetic candidate/job records with interview notes (not 5-6 like the CS pack)
3. One workflow only (Screening → Offer decision; skip building out Escalation-equivalent logic)
4. One sample recommendation that runs cleanly through all five agents

If you find yourself writing a second playbook library, a second confidence-calibration tweak, or any agent-code branch for Recruitment, stop — that effort belongs in the CS pack instead, since CS is what's actually scored on business-use-case depth (30% of the rubric).

---

## 4. Core data contracts

Keep these shapes stable — most agents read/write them. Update this section if you change them.

```ts
DomainPack {
  id: string
  name: string                    // e.g. "customer_success", "recruitment"
  entities: string[]               // e.g. ["Customer", "Account", "Product"]
  workflows: string[]               // e.g. ["Renewal", "Escalation"]
  tools: string[]                    // tool names from Tool Registry this pack uses
  decision_points: DecisionPoint[]
  business_rules: BusinessRule[]
  kpi_formulas: object
  success_metrics: string[]
  prompt_overrides: object          // per-agent prompt templates for this domain
  sample_data_path: string
}

BusinessRule {
  id: string
  description: string               // e.g. "renewal risk score > 80% -> escalate"
  condition: string
  action: string
}

DecisionPoint {
  id: string
  name: string                    // e.g. "renewal_at_risk"
  trigger_signals: string[]
}

AgentSpec {
  name: string
  description: string             // used by planner for routing decisions
  trigger_condition: string        // when planner should consider this agent
  tools: string[]
  prompt_template: string
  input_schema: object
  output_schema: object
}

Recommendation {
  id: string
  domain_pack_id: string
  candidate_actions: CandidateAction[]
  chosen_action_id: string
  confidence: ComputedConfidence
  evidence: EvidenceNode[]
  reasoning_trace: string[]
  status: "pending" | "approved" | "edited" | "rejected" | "needs_info"
}

CandidateAction {
  id: string
  description: string
  business_value_score: number
  feasibility_score: number
  rejected_reason?: string         // required if not chosen
}

ComputedConfidence {
  score: number                     // 0-1, computed not LLM-asserted
  evidence_count: number
  source_agreement: number
  historical_acceptance_rate: number
}

EvidenceNode {
  source: string
  excerpt: string
  recency: string
  reliability_score: number
}

MemoryWrite {
  interaction_id: string
  recommendation_id: string
  human_decision: "approved" | "edited" | "rejected" | "needs_info"
  feedback_text?: string
  timestamp: string
}
```

---

## 5. Memory layer (two tiers + a reflective step — don't collapse into one store)

| Tier | Contains | Used by |
|---|---|---|
| **Semantic memory** | Org docs, playbooks, product knowledge, per-domain-pack content (vector store) | Context Agent |
| **Episodic memory** | Past interactions + recommendations + human decisions, tagged by domain pack | Context Agent (historical context), Explanation Agent (confidence computation), Learning Agent |
| **Reflective step** | Periodic job (manual trigger for the demo — see §6) that mines episodic memory for patterns and writes summarized heuristics back into semantic memory | Run by the Learning Agent, decoupled from the main synchronous pipeline |

---

## 6. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Orchestration | LangGraph (Python) | Use `interrupt()` for HITL pause/resume; `checkpointer` for persistence across the approval gate |
| Planner routing | Conditional edges driven by an LLM classification node, not if/else keyword matching | Routing must visibly differ across domain packs and across interaction types |
| LLMs | Claude — Sonnet for reasoning/recommendation/explanation, Haiku for classification/routing | Cost-aware routing is a scored differentiator — log which model handled which call |
| Vector store | ChromaDB, local, embedded (no server) | Zero infra setup, no risk of a hosted dependency failing mid-demo |
| Episodic memory | SQLite | Zero setup, vibe-codes reliably via SQLAlchemy; tag every row with `domain_pack_id` |
| Backend | FastAPI | Serves domain configuration, accounts, and runs the agentic pipeline |
| Frontend | **React (Vite)** | Modern SPA with Outfit/Inter typography, responsive layouts, and glassmorphic aesthetics |
| Observability | **LangSmith** | Near-zero setup with LangGraph (env vars only) — gives a real execution trace viewer for free |
| Deployment | Local only, run live during the demo | A flawless local run beats a flaky hosted one |

### React-specific design guidelines

- **State synchronization with backend.** Use React hooks (`useState`, `useEffect`) to fetch state from the FastAPI backend. Ensure components re-render only when state changes.
- **Evidence display**: render as clean expandable lists/accordions (source → excerpt → recency → reliability score) to keep the layout legible.
- **Ranked candidates panel**: use a structured grid layout, rendering non-chosen candidates with their `rejected_reason` clearly visible in muted typography.
- **Demo-critical manual actions**: include a manual trigger button for the "Run reflection" memory step. The domain-pack switch dropdown should dynamically update active states and load configuration from the backend.

---

## 7. Conventions

- **Naming**: agent files `agents/<name>_agent.py`, one agent per file, exports an `AgentSpec`-conforming object. Exactly five agent files: `context_agent.py`, `reasoning_agent.py`, `recommendation_agent.py`, `explanation_agent.py`, `learning_agent.py`. Don't add a sixth without updating this file first and confirming it's not better modeled as a tool.
- **No agent calls another agent directly.** All inter-agent flow goes through the planner/execution engine so the execution graph stays traceable.
- **All LLM calls go through a single wrapped client** that handles model routing (cheap/powerful) and cost logging.
- **Domain differences live in Domain Packs, never in agent code.** If you're tempted to write `if domain == "customer_success"` inside an agent, stop — that branch belongs in the domain pack's config/prompt overrides.
- **Every new tool must be registrable via the Tool Registry**, not hardcoded into an agent.
- **Synthetic data lives in `/data`, one subfolder per domain pack**, written by hand or generated once and committed — don't regenerate randomly per run, the demo must be reproducible.

---

## 8. What "done" looks like for the demo

- [ ] Two different sample interactions (within the same domain pack) visibly take two different planner paths
- [ ] At least one recommendation shows multiple ranked candidates with rejection reasons
- [ ] Confidence score is traceably computed (can point to the inputs that produced the number)
- [ ] At least one conflict/contradiction catch shown live (Reasoning Agent)
- [ ] One full HITL cycle: approve, one edit, one reject — all three write back to memory visibly
- [ ] Reflective step runs at least once (manual trigger) and visibly updates semantic memory or a heuristic
- [ ] **Domain pack switch demoed live**: load the second domain pack via config, no code change, planner routes correctly and produces a structurally different recommendation
- [ ] Outcome dashboard shows aggregate metrics (acceptance rate, risk-catch lead time, simulated NRR impact) over replayed synthetic interactions

---

## 9. Open decisions (fill in as resolved — don't let these drift silently)

- ~~Business domain, ICP, personas (primary)~~ — **locked**: B2B SaaS Customer Success, see §1
- ~~Final tech stack choices~~ — **locked**: see §6
- ~~Agent roster~~ — **locked**: exactly five (Context, Reasoning, Recommendation, Explanation, Learning), see §3
- ~~Second domain pack choice~~ — **locked**: Staffing/Recruitment, lightweight only, see §3a/§3b
- Number of candidate actions generated per recommendation (default assumption: 3): `<TODO>`
- Personas/ICP specifics for synthetic CS accounts (company size, vertical): `<TODO>`
- Team role split across the 2 members: see `TODO.md` shift plan (alternating shifts, not fixed roles)