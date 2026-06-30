import { useState } from 'react'

const PIPELINE_AGENTS = [
  {
    id: 'planner',
    icon: '',
    name: 'Planner',
    purpose: 'Classify the entity situation as escalation or standard processing path.',
    input: 'Entity record + interaction notes',
    output: 'Routing classification (escalation / standard)',
    tools: 'Heuristic rules, LLM classification (OpenRouter)',
    memory: 'None — uses entity signals directly',
  },
  {
    id: 'context',
    icon: '',
    name: 'Context Agent',
    purpose: 'Retrieve relevant playbooks, past cases, and learned heuristics from memory.',
    input: 'Entity + interaction → semantic query',
    output: 'EvidenceNodes (playbooks + past cases)',
    tools: 'ChromaDB (semantic search), SQLite (episodic lookup)',
    memory: 'Semantic Memory + Episodic Memory',
  },
  {
    id: 'reasoning',
    icon: '',
    name: 'Reasoning Agent',
    purpose: 'Analyze risks, opportunities, conflicts, and missing information.',
    input: 'Entity + retrieved context + evidence',
    output: 'Risk analysis, opportunities, missing fields',
    tools: 'Heuristic engine, LLM analysis (OpenRouter)',
    memory: 'Reads evidence from Context Agent',
  },
  {
    id: 'recommendation',
    icon: '',
    name: 'Recommendation Agent',
    purpose: 'Generate ranked candidate actions with rejection reasoning.',
    input: 'Reasoning output + evidence + entity context',
    output: 'Ranked actions with confidence scores',
    tools: 'Action scoring engine, LLM generation',
    memory: 'Uses reasoning risks to weight actions',
  },
  {
    id: 'explanation',
    icon: '',
    name: 'Explanation Agent',
    purpose: 'Compute confidence scores and compile reasoning traces.',
    input: 'Recommendation + evidence + historical data',
    output: 'Confidence breakdown, reasoning trace, final payload',
    tools: 'Mathematical confidence calculator',
    memory: 'SQLite (historical acceptance rates)',
  },
  {
    id: 'human_approval',
    icon: '',
    name: 'Human Approval',
    purpose: 'Pause pipeline for human-in-the-loop decision.',
    input: 'Complete recommendation payload',
    output: 'Approve / Edit / Reject decision',
    tools: 'LangGraph interrupt checkpoint',
    memory: 'None — human decision gate',
  },
  {
    id: 'learning',
    icon: '',
    name: 'Learning Agent',
    purpose: 'Store outcomes and mine patterns for continuous learning.',
    input: 'Human decision + recommendation + feedback',
    output: 'Episodic record + reflection heuristics',
    tools: 'SQLite (write outcome), ChromaDB (write heuristic)',
    memory: 'Writes to both Episodic + Semantic Memory',
  },
]

export default function OverviewPanel() {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className="overview-panel">
      <div className="sidebar-panel-title">Platform Architecture</div>
      <p className="sidebar-panel-subtitle">
        7-agent LangGraph pipeline with human-in-the-loop
      </p>

      <div className="overview-pipeline">
        {PIPELINE_AGENTS.map((agent, i) => (
          <div key={agent.id}>
            <button
              className={`overview-agent-card ${expandedId === agent.id ? 'overview-agent-card--expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
            >
              <div className="overview-agent-header">
                <span className="overview-agent-icon">{agent.icon}</span>
                <span className="overview-agent-name">{agent.name}</span>
                <span className="overview-agent-chevron">{expandedId === agent.id ? '▾' : '▸'}</span>
              </div>

              {expandedId === agent.id && (
                <div className="overview-agent-details">
                  <div className="overview-detail-row">
                    <span className="overview-detail-label">Purpose</span>
                    <span className="overview-detail-value">{agent.purpose}</span>
                  </div>
                  <div className="overview-detail-row">
                    <span className="overview-detail-label">Input</span>
                    <span className="overview-detail-value">{agent.input}</span>
                  </div>
                  <div className="overview-detail-row">
                    <span className="overview-detail-label">Output</span>
                    <span className="overview-detail-value">{agent.output}</span>
                  </div>
                  <div className="overview-detail-row">
                    <span className="overview-detail-label">Tools</span>
                    <span className="overview-detail-value">{agent.tools}</span>
                  </div>
                  <div className="overview-detail-row">
                    <span className="overview-detail-label">Memory</span>
                    <span className="overview-detail-value">{agent.memory}</span>
                  </div>
                </div>
              )}
            </button>

            {/* Connector arrow */}
            {i < PIPELINE_AGENTS.length - 1 && (
              <div className="overview-connector">
                <div className="overview-connector-line" />
                <div className="overview-connector-arrow">▼</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
