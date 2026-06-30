import { useState } from 'react'
import { useAppStore } from '../../store/appStore'

const AGENT_ORDER = [
  { id: 'planner', name: 'Planner', icon: '' },
  { id: 'context', name: 'Context Agent', icon: '' },
  { id: 'reasoning', name: 'Reasoning Agent', icon: '' },
  { id: 'recommendation', name: 'Recommendation Agent', icon: '' },
  { id: 'explanation', name: 'Explanation Agent', icon: '' },
  { id: 'human_approval', name: 'Human Approval', icon: '' },
  { id: 'learning', name: 'Learning Agent', icon: '' },
]

function StatusDot({ status }) {
  if (status === 'completed') return <span className="status-dot status-dot--completed" title="Completed">✓</span>
  if (status === 'paused') return <span className="status-dot status-dot--paused" title="Paused">⏸</span>
  return <span className="status-dot status-dot--waiting" title="Waiting">○</span>
}

function AgentDetailExpanded({ step }) {
  if (!step) return null
  const meta = step.metadata || {}

  return (
    <div className="agent-detail-expanded">
      <div className="agent-detail-section">
        <div className="agent-detail-label">Input</div>
        <div className="agent-detail-value">{step.input_summary}</div>
      </div>
      <div className="agent-detail-section">
        <div className="agent-detail-label">Output</div>
        <div className="agent-detail-value">{step.output_summary}</div>
      </div>

      {/* Context Agent specifics */}
      {step.agent === 'context' && meta.retrieved_items && (
        <div className="agent-detail-section">
          <div className="agent-detail-label">Retrieved</div>
          {meta.retrieved_items.map((item, i) => (
            <div key={i} className="agent-retrieved-item">{item}</div>
          ))}
          {meta.latency_ms != null && (
            <div className="agent-latency">Latency: {Math.round(meta.latency_ms)}ms</div>
          )}
        </div>
      )}

      {/* Reasoning Agent specifics */}
      {step.agent === 'reasoning' && (
        <>
          {meta.risks && meta.risks.length > 0 && (
            <div className="agent-detail-section">
              <div className="agent-detail-label">Risks</div>
              {meta.risks.map((r, i) => (
                <div key={i} className="agent-risk-item">⚠ {typeof r === 'string' ? r : r.description || r.risk || JSON.stringify(r)}</div>
              ))}
            </div>
          )}
          {meta.opportunities && meta.opportunities.length > 0 && (
            <div className="agent-detail-section">
              <div className="agent-detail-label">Opportunities</div>
              {meta.opportunities.map((o, i) => (
                <div key={i} className="agent-opp-item">✦ {typeof o === 'string' ? o : o.description || JSON.stringify(o)}</div>
              ))}
            </div>
          )}
          {meta.missing_information && meta.missing_information.length > 0 && (
            <div className="agent-detail-section">
              <div className="agent-detail-label">Missing Information</div>
              {meta.missing_information.map((m, i) => (
                <div key={i} className="agent-missing-item">? {m}</div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Recommendation Agent specifics */}
      {step.agent === 'recommendation' && meta.candidates && (
        <div className="agent-detail-section">
          <div className="agent-detail-label">Candidates</div>
          {meta.candidates.map((c, i) => (
            <div key={i} className={`agent-candidate-item ${!c.rejected_reason ? 'agent-candidate-item--selected' : ''}`}>
              <span>{!c.rejected_reason ? '✓' : '✗'} {c.title}</span>
              {c.rejected_reason && <div className="agent-candidate-reason">{c.rejected_reason}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Explanation Agent specifics */}
      {step.agent === 'explanation' && (
        <div className="agent-detail-section">
          <div className="agent-detail-label">Confidence Breakdown</div>
          <div className="agent-confidence-grid">
            <div className="agent-conf-item">
              <span className="agent-conf-value">{Math.round((meta.confidence_score || 0) * 100)}%</span>
              <span className="agent-conf-label">Score</span>
            </div>
            <div className="agent-conf-item">
              <span className="agent-conf-value">{meta.evidence_count || 0}</span>
              <span className="agent-conf-label">Evidence</span>
            </div>
            <div className="agent-conf-item">
              <span className="agent-conf-value">{Math.round((meta.source_agreement || 0) * 100)}%</span>
              <span className="agent-conf-label">Agreement</span>
            </div>
            <div className="agent-conf-item">
              <span className="agent-conf-value">{Math.round((meta.historical_acceptance_rate || 0) * 100)}%</span>
              <span className="agent-conf-label">Hist. Rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Learning Agent specifics */}
      {step.agent === 'learning' && (
        <div className="agent-detail-section">
          <div className="agent-detail-label">Memory Updates</div>
          {meta.recommendation_saved && <div className="agent-retrieved-item">✓ Recommendation saved</div>}
          {meta.feedback_saved && <div className="agent-retrieved-item">✓ Feedback saved</div>}
          {meta.reflection_status && <div className="agent-retrieved-item">✓ Reflection: {meta.reflection_status}</div>}
        </div>
      )}

      {/* Planner specifics */}
      {step.agent === 'planner' && meta.routing_path && (
        <div className="agent-detail-section">
          <div className="agent-detail-label">Classification</div>
          <span className={`pipeline-badge ${meta.routing_path === 'escalation' ? 'pipeline-badge-escalation' : 'pipeline-badge-standard'}`}>
            {meta.routing_path}
          </span>
          {meta.reason && meta.reason.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {meta.reason.map((r, i) => (
                <div key={i} className="agent-risk-item" style={{ color: 'var(--text-secondary)' }}>• {r}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentsPanel() {
  const executionData = useAppStore((state) => state.executionData)
  const outcomeData = useAppStore((state) => state.outcomeData)
  const [expandedId, setExpandedId] = useState(null)

  const steps = executionData?.agent_steps || []
  const hasExecution = steps.length > 0

  // Map steps by agent id
  const stepMap = {}
  for (const s of steps) {
    stepMap[s.agent] = s
  }

  // After approval, learning agent is also completed
  if (outcomeData && outcomeData.status === 'success') {
    if (!stepMap.learning) {
      stepMap.learning = {
        agent: 'learning',
        status: 'completed',
        duration_ms: 0,
        input_summary: `Outcome: ${outcomeData.outcome}`,
        output_summary: 'Episodic memory updated.',
        metadata: { outcome: outcomeData.outcome, recommendation_saved: true, feedback_saved: true, reflection_status: 'completed' },
      }
    }
    // Update human_approval status
    if (stepMap.human_approval) {
      stepMap.human_approval = { ...stepMap.human_approval, status: 'completed', output_summary: `Decision: ${outcomeData.outcome}` }
    }
  }

  return (
    <div className="agents-panel">
      <div className="sidebar-panel-title">Agent Execution</div>
      {!hasExecution && (
        <p className="sidebar-panel-subtitle">Select an entity and run the pipeline to see live agent statuses.</p>
      )}
      {hasExecution && executionData?.execution_summary && (
        <div className="agents-summary-bar">
          <span>{executionData.execution_summary.completed} completed</span>
          <span className="agents-summary-sep">·</span>
          <span>{executionData.execution_summary.paused} paused</span>
          <span className="agents-summary-sep">·</span>
          <span>{executionData.execution_time_ms}ms total</span>
        </div>
      )}

      <div className="agents-pipeline">
        {AGENT_ORDER.map((agent, i) => {
          const step = stepMap[agent.id]
          const status = step?.status || 'waiting'

          return (
            <div key={agent.id}>
              <button
                className={`agents-card ${expandedId === agent.id ? 'agents-card--expanded' : ''} agents-card--${status}`}
                onClick={() => step && setExpandedId(expandedId === agent.id ? null : agent.id)}
                disabled={!step}
              >
                <div className="agents-card-header">
                  <StatusDot status={status} />
                  <span className="agents-card-name">{agent.name}</span>
                  {step?.duration_ms != null && step.duration_ms > 0 && (
                    <span className="agents-card-duration">{Math.round(step.duration_ms)}ms</span>
                  )}
                  {status === 'paused' && <span className="agents-card-duration" style={{ color: 'var(--accent-amber)' }}>Waiting</span>}
                  {status === 'waiting' && <span className="agents-card-duration">—</span>}
                </div>

                {expandedId === agent.id && step && (
                  <AgentDetailExpanded step={step} />
                )}
              </button>

              {/* Connector */}
              {i < AGENT_ORDER.length - 1 && (
                <div className={`agents-connector ${status === 'completed' ? 'agents-connector--done' : ''}`}>
                  <div className="agents-connector-line" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
