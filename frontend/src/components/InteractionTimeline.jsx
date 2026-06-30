const TYPE_COLORS = {
  meeting_note: { bg: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', label: 'Meeting' },
  email: { bg: 'rgba(96, 165, 250, 0.12)', color: '#60a5fa', label: 'Email' },
  crm_update: { bg: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa', label: 'CRM' },
  call_transcript: { bg: 'rgba(52, 211, 153, 0.12)', color: '#34d399', label: 'Call' },
  support_ticket: { bg: 'rgba(248, 113, 113, 0.12)', color: '#f87171', label: 'Support' },
  product_usage: { bg: 'rgba(45, 212, 191, 0.12)', color: '#2dd4bf', label: 'Usage' },
  survey: { bg: 'rgba(129, 140, 248, 0.12)', color: '#818cf8', label: 'Survey' },
  internal_note: { bg: 'rgba(163, 163, 163, 0.12)', color: '#a3a3a3', label: 'Internal' },
  contract_event: { bg: 'rgba(244, 114, 182, 0.12)', color: '#f472b6', label: 'Contract' },
}

const SEVERITY_COLORS = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#4ade80',
}

function formatTime(isoString) {
  if (!isoString) return '--:--'
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function InteractionTimeline({ interactions }) {
  if (!interactions || interactions.length === 0) {
    return null
  }

  return (
    <div className="interaction-timeline">
      <div className="timeline-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Interaction Timeline</span>
        <span className="timeline-count">{interactions.length}</span>
      </div>
      <div className="timeline-track">
        {interactions.map((item, i) => {
          const typeInfo = TYPE_COLORS[item.interaction_type] || TYPE_COLORS.internal_note
          const signals = item.signals || []

          return (
            <div key={item.interaction_id || i} className="timeline-item">
              <div className="timeline-connector">
                <div className="timeline-dot" style={{ background: typeInfo.color }} />
                {i < interactions.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-meta">
                  <span className="timeline-type-badge" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                    {typeInfo.label}
                  </span>
                  <span className="timeline-time">{formatTime(item.created_at)}</span>
                  <span className="timeline-date">{formatDate(item.created_at)}</span>
                </div>
                <div className="timeline-title">{item.title}</div>
                <div className="timeline-source">via {item.source}</div>
                {signals.length > 0 && (
                  <div className="timeline-signals">
                    {signals.map((sig, si) => (
                      <span key={si} className="signal-tag">{sig.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
                {item.impact_score > 0 && (
                  <div className="timeline-impact">
                    Impact: <span style={{ color: item.impact_score > 50 ? '#f87171' : item.impact_score > 25 ? '#fbbf24' : '#4ade80' }}>
                      {item.impact_score}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
