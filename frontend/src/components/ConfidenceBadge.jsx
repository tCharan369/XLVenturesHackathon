export default function ConfidenceBadge({ confidence }) {
  if (!confidence) return null

  const score = confidence.score ?? 0.8
  const scorePct = Math.round(score * 100)
  const strokeDash = (scorePct / 100) * 220

  return (
    <div className="confidence-gauge-container">
      <div className="confidence-circle">
        <svg className="confidence-circle-svg">
          <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
          <circle
            cx="40" cy="40" r="35"
            stroke={scorePct >= 80 ? 'var(--accent-emerald)' : scorePct >= 60 ? 'var(--accent-amber)' : 'var(--accent-rose)'}
            strokeWidth="6" fill="transparent"
            strokeDasharray="220" strokeDashoffset={220 - strokeDash} strokeLinecap="round"
          />
        </svg>
        <div className="confidence-val-text">{scorePct}%</div>
      </div>
      <div className="confidence-metrics">
        <div className="confidence-metric-row">
          <span>Evidence Count:</span>
          <strong>{confidence.evidence_count ?? 0}</strong>
        </div>
        <div className="confidence-metric-row">
          <span>Source Agreement:</span>
          <strong>{Math.round((confidence.source_agreement ?? 1.0) * 100)}%</strong>
        </div>
        <div className="confidence-metric-row">
          <span>Historical Acceptance:</span>
          <strong>{Math.round((confidence.historical_acceptance_rate ?? 0.5) * 100)}%</strong>
        </div>
      </div>
    </div>
  )
}
