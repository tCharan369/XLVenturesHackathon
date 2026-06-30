import { useState } from 'react'

export default function EvidenceAccordion({ evidence }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (!evidence || evidence.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No evidence nodes recorded.</p>
  }

  return (
    <div className="evidence-container-ui">
      <h3 className="domain-detail-label" style={{ marginBottom: '12px' }}>Retrieved Evidence</h3>
      {evidence.map((node, idx) => {
        const id = node.evidence_id || node.source || `ev_${idx}`
        const isExpanded = !!expanded[id]
        const icon = ''
        const confidence = node.confidence ? Math.round(node.confidence * 100) : 80
        const retrievalType = node.retrieval_type || node.metadata?.retrieval_type || '—'

        return (
          <div key={id} className="evidence-accordion-item">
            <button className="evidence-accordion-header" onClick={() => toggle(id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong>{node.source || id}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({node.source_type || '—'} → {retrievalType})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  {confidence}%
                </span>
                <span>{isExpanded ? '▼' : '►'}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="evidence-accordion-content">
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{node.content || 'No content available.'}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
