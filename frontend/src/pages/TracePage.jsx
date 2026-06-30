import { useState, useEffect } from 'react'
import { fetchTraces } from '../services/api'

export default function TracePage() {
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTrace, setSelectedTrace] = useState(null)

  useEffect(() => {
    loadTraces()
  }, [])

  const loadTraces = async () => {
    setLoading(true)
    try {
      const data = await fetchTraces()
      setTraces(data || [])
    } catch {
      setTraces([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" />
        <p>Loading execution traces...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Planner Execution Traces</h1>
        <p className="page-subtitle">Inspect LangGraph planner classification, routing paths, and execution timelines</p>
        <button className="btn-ui btn-secondary-ui" onClick={loadTraces} style={{ marginTop: '12px', fontSize: '0.8rem', padding: '6px 12px' }}>
          Refresh
        </button>
      </div>

      {traces.length === 0 ? (
        <div className="empty-state">
          <h3>No traces yet</h3>
          <p>Run the decision pipeline on an entity to generate execution traces.</p>
        </div>
      ) : (
        <div className="trace-layout">
          {/* Trace list */}
          <div className="trace-list">
            {traces.map(trace => (
              <div
                key={trace.thread_id}
                className={`trace-card glass ${selectedTrace?.thread_id === trace.thread_id ? 'trace-card-active' : ''}`}
                onClick={() => setSelectedTrace(trace)}
              >
                <div className="trace-card-header">
                  <span className={`pipeline-badge ${trace.classification === 'escalation' ? 'pipeline-badge-escalation' : 'pipeline-badge-standard'}`}>
                    {trace.classification === 'escalation' ? 'Escalation' : 'Standard'}
                  </span>
                  <span className="trace-card-time">{trace.execution_time_ms}ms</span>
                </div>
                <div className="trace-card-entity">
                  {trace.entity_id} · {trace.domain_pack_id?.replace(/_/g, ' ')}
                </div>
                <div className="trace-card-meta">
                  {trace.timestamps?.started_at ? new Date(trace.timestamps.started_at).toLocaleString() : '—'}
                  {trace.paused ? ' · Paused' : trace.outcome ? ` · ${trace.outcome}` : ' · Complete'}
                </div>
              </div>
            ))}
          </div>

          {/* Trace detail */}
          <div className="trace-detail">
            {selectedTrace ? (
              <div className="trace-detail-panel glass">
                <h2 style={{ margin: '0 0 24px 0', fontFamily: 'var(--heading-font)', fontSize: '1.6rem' }}>
                  Execution Detail
                </h2>

                {/* Classification */}
                <div className="trace-section">
                  <h3 className="domain-detail-label">Classification</h3>
                  <div className={`pipeline-badge-lg ${selectedTrace.classification === 'escalation' ? 'pipeline-badge-escalation' : 'pipeline-badge-standard'}`}>
                    {selectedTrace.classification === 'escalation' ? 'Escalation Path Triggered' : 'Standard Cadence Route'}
                  </div>
                </div>

                {/* Executed Path */}
                <div className="trace-section">
                  <h3 className="domain-detail-label">Executed Path</h3>
                  <div className="trace-path">
                    {selectedTrace.executed_path?.map((node, i) => (
                      <div key={i} className="trace-path-node">
                        <div className="trace-path-dot" />
                        <span className="trace-path-label">{node}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="trace-section">
                  <h3 className="domain-detail-label">Execution Timeline</h3>
                  <div className="trace-times">
                    <div className="trace-time-row">
                      <span>Started:</span>
                      <strong>{selectedTrace.timestamps?.started_at ? new Date(selectedTrace.timestamps.started_at).toLocaleString() : '—'}</strong>
                    </div>
                    {selectedTrace.timestamps?.paused_at && (
                      <div className="trace-time-row">
                        <span>Paused (HITL):</span>
                        <strong>{new Date(selectedTrace.timestamps.paused_at).toLocaleString()}</strong>
                      </div>
                    )}
                    {selectedTrace.timestamps?.completed_at && (
                      <div className="trace-time-row">
                        <span>Completed:</span>
                        <strong>{new Date(selectedTrace.timestamps.completed_at).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="trace-section">
                  <h3 className="domain-detail-label">Status</h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="trace-stat">
                      <span className="trace-stat-label">State</span>
                      <span className={`trace-stat-value ${selectedTrace.paused ? 'text-amber' : 'text-emerald'}`}>
                        {selectedTrace.paused ? 'Awaiting Approval' : 'Complete'}
                      </span>
                    </div>
                    <div className="trace-stat">
                      <span className="trace-stat-label">Duration</span>
                      <span className="trace-stat-value">{selectedTrace.execution_time_ms}ms</span>
                    </div>
                    {selectedTrace.outcome && (
                      <div className="trace-stat">
                        <span className="trace-stat-label">Outcome</span>
                        <span className="trace-stat-value text-cyan">{selectedTrace.outcome}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: '40px' }}>
                <p>Select a trace from the list to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
