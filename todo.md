# TODO.md — shift-based build plan (2 people, alternating, 1-2hr shifts)

Deadline: Mon June 29 EOD. Today: Sat June 27. Budget: 9 shifts, alternating Person A / Person B.
**Rule: never start a shift until the previous one ends in a working, committed state.** Each shift below ends with a "Definition of done" — if you can't check every box, do not hand off; finish or explicitly descope before committing.

**Git rule for vibe-coded handoffs:** commit + push at the end of every shift, no exceptions, even if incomplete-but-working. Next person always starts by pulling and running the app once before touching anything, to confirm the handoff state actually works on their machine.

---

## Shift 1 (Person A) — Scaffolding, contracts, synthetic data skeleton ✅ COMPLETE

**Goal:** repo exists, runs, has the shape everything else slots into.

- [x] Init repo structure per `README.md` (`backend/` and `frontend/` directories)
- [x] `requirements.txt`: fastapi, uvicorn, langgraph, langchain, langchain-openai, langchain-community, chromadb, langsmith, python-dotenv, pydantic, sqlalchemy, openai, rapidfuzz, sentence-transformers, pydantic-settings
- [x] `.env.example` with `OPENROUTER_API_KEY`, `ENABLE_CONTEXT_SYNTHESIS`, `LANGSMITH_API_KEY`, `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_PROJECT=agentic-decision-platform`
- [x] Create `backend/core/schemas.py` implementing every data contract from `description.md` §4 (`DomainPack`, `DecisionPoint`, `AgentSpec`, `Recommendation`, `CandidateAction`, `ComputedConfidence`, `EvidenceNode`, `MemoryWrite`) as Pydantic models
- [x] Create `backend/core/state.py` with `PlatformState` TypedDict for future LangGraph integration
- [x] Create `backend/core/settings.py` with DATABASE_URL, CHROMA_PATH, MEMORY_COLLECTION_PREFIX
- [x] Create `backend/core/config_loader.py` with `load_domain_pack()`, `load_accounts()`, `load_data()`
- [x] Create `backend/config/domain_packs/customer_success.json` — 4 decision points
- [x] Create `backend/config/domain_packs/recruitment.json` — 2 workflows, recruitment-specific entities
- [x] Write 5 synthetic CS accounts in `backend/data/customer_success/accounts.json` with IDs, timestamps, and interaction notes
- [x] Write 3 synthetic recruitment candidates in `backend/data/recruitment/candidates.json` with IDs and metadata
- [x] Trivial FastAPI backend API (`backend/api/main.py`) + React (Vite) frontend with domain pack selector

**Definition of done:** ✅ Backend serves domain data, frontend displays both domains with domain switching. Committed.

---

## Shift 2 (Person B) — Memory layer + Tool registry skeleton ✅ COMPLETE

**Goal:** the data plumbing every agent will call into.

- [x] `memory/episodic.py`: SQLite setup (SQLAlchemy), `recommendations` + `feedback` tables. Functions: `write_recommendation()`, `write_feedback()`, `get_similar_past_cases()` (RapidFuzz similarity)
- [x] `memory/episodic.py`: Utility methods `delete_recommendation()`, `clear_domain_memory()`
- [x] `memory/semantic.py`: ChromaDB local client with `all-MiniLM-L6-v2` embeddings, `get_or_create_collection()` auto-creation. Functions: `add_documents()`, `query()`, `clear_collection()`
- [x] `memory/manager.py`: Unified `MemoryManager` with `retrieve_context()` returning playbooks + past_cases + metadata (playbook_count, past_case_count, latency_ms)
- [x] 5 CS playbooks in `data/customer_success/playbooks/` (renewal_risk, upsell_qualification, champion_change, escalation, healthy_account)
- [x] 3 Recruitment playbooks in `data/recruitment/playbooks/` (candidate_dropout, fast_track_candidate, offer_negotiation)
- [x] Domain-agnostic `scripts/seed_memory.py` that auto-discovers all domains and seeds playbooks
- [x] `registry/tool_registry.py`: dict-based registry with `bootstrap_tools()` registering `search_accounts`, `query_playbooks`, `get_similar_cases`
- [x] `scripts/test_memory.py`: 9 integration tests — all pass

**Definition of done:** ✅ `seed_memory.py` ingests 8 playbooks across 2 domains. 9/9 tests pass. Committed.

---

## Shift 3 (Person A) — Context Agent ✅ COMPLETE

**Goal:** first real agent, working end to end against memory from Shift 2.

- [x] `agents/query_builder.py`: Pure Python keyword extraction + domain signal detection with growth-negator logic. Produces differentiated queries per entity type
- [x] `agents/context_agent.py`: Receives `{domain_pack_id, entity, interaction}`, builds query, retrieves from memory, converts to `EvidenceNode` objects, returns full context payload
- [x] Metadata reranking: boosts `renewal_risk`/`escalation`/`champion_change` when health < 60 + declining; boosts `healthy_account`/`upsell_qualification` when health > 85 + increasing
- [x] Evidence sorted by confidence descending
- [x] Retrieval metadata: `{query, playbook_count, past_case_count, top_evidence, latency_ms}`
- [x] Retrieval source metadata: every `EvidenceNode` has `metadata.retrieval_type` = "semantic" | "episodic"
- [x] Missing information detection: rule-based field checking per domain
- [x] `ENABLE_CONTEXT_SYNTHESIS` environment flag guards LLM synthesis
- [x] Optional OpenRouter synthesis via `google/gemma-3-27b-it:free` (graceful degradation)
- [x] `registry/agent_registry.py`: Simplified `register_agent(name, agent, description, capabilities)` + `bootstrap_agents()`
- [x] `scripts/test_context_agent.py`: 8/8 dynamic retrieval checks pass

**Definition of done:** ✅ 8/8 checks pass — ranking differs, top playbook differs, queries differ, confidence differs, evidence sorted, retrieval_type metadata present, metadata complete. Committed.

---

## Shift 4 (Person B) — Reasoning Agent + Recommendation Agent ✅ COMPLETE

**Goal:** the two middle agents, working standalone against Context Agent's output.

- [x] `agents/reasoning_agent.py`: takes Context Agent output, calls LLM to identify risks/opportunities/missing info/conflicts
- [x] `agents/recommendation_agent.py`: takes Reasoning Agent output, generates 3 `CandidateAction`s, ranks them
- [x] Register both in `agent_registry.py`
- [x] Test script `scripts/test_pipeline_partial.py` chaining Context → Reasoning → Recommendation

**Definition of done:** test script prints 3 ranked candidates with rejection reasons for at least one account. Commit + push.

---

## Shift 5 (Person A) — Explanation Agent + Learning Agent + computed confidence ✅ COMPLETE

- [x] `agents/explanation_agent.py`: builds `EvidenceNode[]`, reasoning trace, `ComputedConfidence`
- [x] `agents/learning_agent.py`: `write_outcome()` + `run_reflection()` for memory writeback
- [x] Register both agents
- [x] Extend test pipeline to run all 5 agents in sequence

---

## Shift 6 (Person B) — Planner Agent + LangGraph wiring ✅ COMPLETE

- [x] `core/planner.py`: LangGraph `StateGraph` with `PlatformState`
- [x] Planner node: Claude (Haiku) classification of decision points
- [x] Conditional edges based on classification
- [x] `interrupt()` for human approval
- [x] LangSmith tracing


---

## Shift 7 (Person A) — React UI: recommendation view + HITL approval ✅ COMPLETE
- [x] Recommendation view with ranked candidates
- [x] Approve / Edit / Request more info / Reject buttons
- [x] Wire to paused graph + memory writeback

---

## Shift 8 (Person B) — Configuration Hub UI + second domain pack ✅ COMPLETE
- [x] DomainSelector component for live domain switching
- [x] Run recruitment candidate through full pipeline
- [x] Observability/metrics panel

---

## Shift 9 (Person A) — Buffer: polish, reflection button, README/demo prep ✅ COMPLETE
- [x] Wire reflection button
- [x] Demo script + runbook
- [x] Record demo videos
- [x] Final commit + push


---

## If you're running behind (cut in this order)

1. Drop the conditional-branch nuance in Shift 6 (keep planner classification visible, but the agent sequence can stay fixed)
2. Drop the metrics dashboard panel in Shift 8
3. Drop the reflection button wiring in Shift 9
4. Never cut: the domain-pack switch (Shift 8 core) and the HITL approve/edit/reject memory writeback (Shift 7)