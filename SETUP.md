# Reviewer Setup Guide

> Quick-start instructions for external reviewers. Estimated time to running demo: **10–15 minutes**.

---

## Prerequisites

| Tool | Minimum | Check |
|---|---|---|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Any | `git --version` |

---

## 1. Clone & Enter the Project

```bash
git clone <repository-url>
cd XLVenturesHackathon
```

---

## 2. Set Up Environment Variables

```bash
# Copy the template
cp .env.example .env          # macOS/Linux
copy .env.example .env        # Windows
```

Edit `.env`:

```env
# Optional — enables LLM-powered reasoning, recommendations, and classification
# Get a free key at https://openrouter.ai (uses google/gemma-3-27b-it:free)
OPENROUTER_API_KEY=

# Optional — enables LLM context synthesis on top of RAG retrieval
ENABLE_CONTEXT_SYNTHESIS=false

# Optional — enables LangSmith execution trace viewer
# Get a free key at https://smith.langchain.com
LANGSMITH_API_KEY=
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=agentic-decision-platform
```

> **You can leave all values blank.** The platform runs fully without API keys using deterministic heuristic-based recommendations. The same five-agent LangGraph pipeline executes; only the LLM calls are skipped.

---

## 3. Backend Setup

### 3a. Create a virtual environment

**macOS / Linux:**
```bash
python -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3b. Install dependencies

```bash
pip install -r requirements.txt
```

> First run downloads `sentence-transformers` and `chromadb`. The embedding model (`all-MiniLM-L6-v2`, ~80 MB) is downloaded automatically on first seed. Total install time: 2–5 minutes.

### 3c. Seed the memory layer

**macOS / Linux:**
```bash
PYTHONPATH=. python backend/scripts/seed_memory.py
```

**Windows (PowerShell):**
```powershell
$env:PYTHONPATH = "."
python backend/scripts/seed_memory.py
```

Expected output:
```
Seeding customer_success playbooks...
  Seeded: renewal_risk_playbook
  Seeded: escalation_playbook
  ...
Seeding recruitment playbooks...
  Seeded: candidate_screening_playbook
  ...
Seeding complete.
```

### 3d. Start the backend

**macOS / Linux:**
```bash
PYTHONPATH=. uvicorn backend.api.main:app --reload --port 8000
```

**Windows (PowerShell):**
```powershell
$env:PYTHONPATH = "."
uvicorn backend.api.main:app --reload --port 8000
```

Confirm it's running:
```
INFO:api: Validated domain pack: 'customer_success'.
INFO:api: Validated domain pack: 'recruitment'.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Interactive API docs → **http://localhost:8000/docs**

---

## 4. Frontend Setup

Open a **new terminal window** (keep the backend running).

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 5. Reviewer Demo Checklist

Once both servers are running, walk through these steps to evaluate the platform:

### Architecture Quality (70% of rubric)

- [ ] **Dynamic routing (Escalation path)** — Select an account with health score < 50 (e.g., `acc_001`). Run the pipeline. Verify `routing_path: escalation` and 5 agent steps in the Execution Sidebar.

- [ ] **Dynamic routing (Standard path)** — Select a healthy account. Run the pipeline. Verify `routing_path: standard` and the abbreviated agent path.

- [ ] **Confidence is computed** — Open the Computed Confidence card. Verify the score shows `evidence_count`, `source_agreement`, and `historical_acceptance_rate` — not a single LLM-asserted number.

- [ ] **3 ranked candidates** — Inspect the Candidate Actions panel. Verify 3 options with `business_value_score`, `feasibility_score`, and a `rejected_reason` on non-selected options.

- [ ] **Evidence accordion** — Expand each evidence source. Verify sources are typed (playbook, past case) and include excerpt and confidence.

- [ ] **HITL — Approve** — Click Approve. Verify a Feedback ID is returned and `reflection_status` is shown.

- [ ] **HITL — Edit & Approve** — Click Edit, modify the action title/description, add a feedback note, submit. Verify `outcome: edited` in the response.

- [ ] **HITL — Reject** — Run the pipeline on a different account, click Reject with a reason. Verify `outcome: rejected`.

- [ ] **Reflection step** — Click "💡 Run Reflection" in the Learning Hub panel. Verify heuristics output is returned.

- [ ] **Execution trace** — Navigate to the Trace page. Verify per-agent timing, input/output summaries, and routing path for each completed run.

### Extensibility Proof

- [ ] **Domain switch** — Use the domain switcher in the navbar to toggle to `Recruitment`. Verify candidate records load, workflows are Recruitment-specific (Screening, Offer), and a recommendation runs cleanly.

- [ ] **No code change** — The same agent files power both domains. Verify by checking that `backend/agents/*.py` contains no `if domain == "customer_success"` branches.

### Business Use Case (30% of rubric)

- [ ] **Configuration Hub** — Navigate to the Configuration page. Verify domain metrics: acceptance rate, risk-catch lead time, simulated NRR impact (Customer Success) or time-to-hire (Recruitment).

- [ ] **Decision point coverage** — Inspect the domain pack details. Verify 4 decision points for Customer Success (renewal risk, expansion opportunity, escalation, champion change).

---

## 6. Common Issues

| Issue | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'backend'` | Set `PYTHONPATH=.` before running any backend script |
| `FileNotFoundError` on domain pack | Run all backend commands from the project root, not from inside `/backend` |
| ChromaDB error after re-clone | Delete `backend/data/chroma/` and re-run `seed_memory.py` |
| CORS error in browser | Confirm backend is running on port 8000 |
| PowerShell `Activate.ps1` blocked | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then retry |
| Embedding model download fails | The model downloads to `~/.cache/huggingface/hub/`. Retry on a stable connection. |

---

## 7. Verifying Without the UI

You can verify the pipeline end-to-end using only the API:

```bash
# 1. Check health
curl http://localhost:8000/api/v1/health

# 2. List Customer Success accounts
curl "http://localhost:8000/api/v1/accounts?domain=customer_success"

# 3. Run pipeline on acc_001 (escalation path)
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"domain_pack_id": "customer_success", "entity_id": "acc_001"}'

# 4. Approve the recommendation (replace <thread_id> from step 3 response)
curl -X POST http://localhost:8000/api/v1/approve \
  -H "Content-Type: application/json" \
  -d '{"thread_id": "<thread_id>", "outcome": "approved", "feedback_text": "Reviewer approved."}'

# 5. Run reflection
curl -X POST http://localhost:8000/api/v1/reflect \
  -H "Content-Type: application/json" \
  -d '{"domain_pack_id": "customer_success"}'

# 6. View history
curl "http://localhost:8000/api/v1/history?domain=customer_success"

# 7. Switch to Recruitment domain
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"domain_pack_id": "recruitment", "entity_id": "cand_001"}'
```

---

*For detailed architecture documentation, see [README.md](README.md).*
