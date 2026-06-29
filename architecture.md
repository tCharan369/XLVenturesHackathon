# Intelligent Next Best Action Platform

> **Configuration-driven Agentic Decision Intelligence Platform** built using **FastAPI**, **LangGraph**, **React**, **ChromaDB**, and **SQLite** to generate explainable, confidence-scored Next Best Actions with mandatory Human-in-the-Loop (HITL) approval.

---

# Table of Contents

* Overview
* High-Level Architecture
* Layered Architecture
* Execution Engine
* Agent Responsibilities
* Dynamic Routing
* Human-in-the-Loop Workflow
* Memory Architecture
* Reflection & Continuous Learning
* Supported Domain Packs
* Technology Stack
* Key Design Decisions

---

# Overview

The **Intelligent Next Best Action Platform** is a reusable Decision Intelligence Platform that converts customer interactions and enterprise knowledge into actionable business recommendations.

Unlike traditional AI assistants, this platform focuses on:

* Explainability
* Human supervision
* Configuration-driven workflows
* Continuous learning
* Enterprise-grade auditability

Every recommendation is accompanied by supporting evidence, computed confidence, reasoning traces, and mandatory human approval before execution.

---

# High-Level Architecture

```text
                           ┌──────────────────────┐
                           │   React Dashboard    │
                           │ Recommendation UI    │
                           │ Trace Viewer         │
                           │ Configuration Hub    │
                           └──────────┬───────────┘
                                      │
                                REST / JSON
                                      │
                           ┌──────────▼───────────┐
                           │   FastAPI Backend    │
                           └──────────┬───────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
          Configuration Hub                   Memory Layer
                     │                                 │
                     └────────────────┬────────────────┘
                                      │
                           Planner Agent (LangGraph)
                                      │
                           Dynamic Runtime Routing
                       ┌──────────────┴──────────────┐
                       │                             │
                 Escalation Path               Standard Path
                       │                             │
             Context → Reasoning →           Context → Standard
             Recommendation →                Recommendation
             Explanation                     Explanation
                       └──────────────┬──────────────┘
                                      │
                          Human Approval Gate
                                      │
                               Learning Agent
                                      │
                    SQLite + ChromaDB Memory Update
```

---

# Layered Architecture

## Layer 1 — Frontend

**Technology**

* React 19
* Vite
* Zustand

### Responsibilities

* Recommendation Workspace
* Human Approval Controls
* Configuration Hub
* Execution Trace Viewer
* Memory History
* Live Confidence Display

Communication:

```
React
      ↓
 REST / JSON
      ↓
FastAPI
```

---

## Layer 2 — Backend API

**Technology**

* FastAPI
* Python 3.11+

Responsibilities:

* Receive recommendation requests
* Load domain configuration
* Initialize platform state
* Execute LangGraph pipeline
* Resume paused workflows
* Expose trace & history APIs

---

## Layer 3 — Configuration Hub

The platform is **configuration-driven**.

No domain-specific logic exists inside agent code.

Each Domain Pack contains:

* Business Rules
* Decision Points
* KPI Definitions
* Workflow Templates
* Prompt Overrides
* Success Metrics

Supported packs:

```
customer_success.json

recruitment.json
```

Adding a new domain only requires a new JSON configuration.

---

# Planner Layer (LangGraph)

The Planner Agent is responsible for runtime orchestration.

It receives:

* Entity
* Interaction
* Domain Pack
* Business Rules

Then dynamically determines which execution path to follow.

Planner capabilities:

* Runtime classification
* Escalation detection
* State management
* Human interrupt
* Graph orchestration

---

# Dynamic Routing

## Escalation Path

Triggered when:

* Health Score < 50
* Critical keywords detected
* Negative business signals
* High-risk customer

```
Planner

↓

Context

↓

Reasoning

↓

Recommendation

↓

Explanation

↓

Human Approval

↓

Learning
```

---

## Standard Path

Triggered when no urgent signals are detected.

```
Planner

↓

Context

↓

Standard Recommendation

↓

Explanation

↓

Human Approval

↓

Learning
```

Same Planner.

Same architecture.

Different execution depth.

---

# Execution Engine

The Execution Engine consists of **five specialized agents**.

Each agent follows the **Single Responsibility Principle** and never invokes another agent directly.

```
Context
     ↓
Reasoning
     ↓
Recommendation
     ↓
Explanation
     ↓
Learning
```

All communication happens through the LangGraph state.

---

# Agent Responsibilities

## 1. Context Agent

Purpose:

Retrieve enterprise context.

Responsibilities:

* Query ChromaDB
* Query SQLite
* Build EvidenceNodes
* Detect missing information
* Optional LLM synthesis

Output:

* Playbooks
* Past Cases
* Evidence
* Missing Information

---

## 2. Reasoning Agent

Purpose:

Business analysis.

Responsibilities:

* Detect risks
* Detect opportunities
* Detect conflicts
* Prioritize business signals

Output:

* Risks
* Opportunities
* Conflicts
* Reasoning Summary

---

## 3. Recommendation Agent

Purpose:

Generate business actions.

Responsibilities:

* Generate exactly 3 Candidate Actions
* Rank by business value
* Rank by feasibility
* Select top recommendation
* Explain rejected options

Output:

* Candidate Actions
* Selected Action

---

## 4. Explanation Agent

Purpose:

Explain recommendations.

Responsibilities:

* Build evidence summary
* Produce reasoning trace
* Compute confidence mathematically

Confidence Formula

```
Confidence

=

0.40 × Evidence Count

+

0.35 × Source Agreement

+

0.25 × Historical Acceptance Rate
```

Confidence is **never produced by the LLM**.

---

## 5. Learning Agent

Purpose:

Continuous improvement.

Responsibilities:

* Record human feedback
* Store recommendations
* Trigger reflection
* Generate reusable heuristics

Writes to:

* SQLite
* ChromaDB

---

# Human-in-the-Loop (HITL)

Every recommendation must pass through an approval checkpoint.

```
LangGraph

interrupt_before()

↓

Frontend displays

Approve

Edit

Reject

Request Information

↓

Resume Graph

↓

Learning Agent
```

No recommendation is automatically executed.

---

# Memory Architecture

The platform uses two independent memory systems.

---

## Semantic Memory

Technology

* ChromaDB

Stores:

* Playbooks
* Organizational Knowledge
* Learned Heuristics

Read by:

* Context Agent

Written by:

* Learning Agent

---

## Episodic Memory

Technology

* SQLite
* SQLAlchemy

Stores:

* Recommendation Records
* Feedback Records
* Human Decisions
* Historical Acceptance Rates

Read by:

* Context Agent
* Explanation Agent

Written by:

* Learning Agent

---

# Reflection Loop

Continuous learning is implemented through a reflection pipeline.

```
Human Decision

↓

SQLite

↓

Pattern Mining

↓

Generate Heuristics

↓

Store in ChromaDB

↓

Future Context Retrieval Improves
```

This creates a closed learning loop while preserving auditability.

---

# Supported Domain Packs

## Customer Success

Entities

* Customer
* Account
* Product

Decision Points

* Renewal at Risk
* Expansion Opportunity
* Escalation
* Champion Change

Synthetic Data

* 5 Accounts
* 5 Playbooks

---

## Recruitment

Entities

* Candidate
* Job
* Interview

Decision Points

* Candidate Fit
* Offer Risk

Synthetic Data

* 3 Candidates
* 3 Playbooks

The exact same Planner and five-agent pipeline execute both domains without any code changes.

---

# Technology Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| Frontend       | React 19 + Vite + Zustand       |
| Backend        | FastAPI                         |
| Planner        | LangGraph                       |
| LLM            | Google Gemma 3 27B (OpenRouter) |
| Vector Store   | ChromaDB                        |
| Episodic Store | SQLite + SQLAlchemy             |
| Embeddings     | all-MiniLM-L6-v2                |
| Observability  | LangSmith (Optional)            |

---

# Key Design Decisions

## Configuration-Driven Platform

Business rules live inside Domain Packs rather than application code.

This enables adding entirely new business domains with zero code modifications.

---

## Dynamic Planner Routing

Execution paths are determined at runtime by the Planner using business signals instead of hardcoded workflows.

---

## Single Responsibility Agents

Each agent performs one well-defined task:

* Context Retrieval
* Business Reasoning
* Recommendation Generation
* Explainability
* Learning

This improves maintainability, explainability, and testing.

---

## Human-in-the-Loop First

Every recommendation pauses at a mandatory approval checkpoint before any downstream action.

No autonomous execution is permitted.

---

## Computed Confidence

Confidence is mathematically derived from evidence quality and historical outcomes.

The LLM never self-reports confidence.

---

## Dual Memory Architecture

Semantic Memory stores reusable organizational knowledge.

Episodic Memory stores historical business decisions.

Both evolve independently while supporting each other through reflection.

---

## Reflection-Based Learning

Human decisions continuously improve future recommendations by transforming trusted historical outcomes into reusable semantic heuristics.

---

## Explainability by Design

Every recommendation includes:

* Evidence Summary
* Reasoning Trace
* Candidate Ranking
* Confidence Breakdown
* Historical Support
* Human Decision Record

---

## Graceful Failure Recovery

If the LLM becomes unavailable:

* Rule-based heuristics take over.
* Output contracts remain unchanged.
* Audit logs capture fallback events.
* Platform functionality is preserved.

---

# Conclusion

The **Intelligent Next Best Action Platform** demonstrates a production-oriented architecture that combines **LangGraph orchestration**, **specialized AI agents**, **dual-memory systems**, **dynamic routing**, and **mandatory human oversight** to deliver transparent, explainable, and continuously improving business recommendations.

Its configuration-driven design enables the same architecture to support multiple enterprise domains with **zero application code changes**, making it reusable, extensible, and enterprise-ready.
