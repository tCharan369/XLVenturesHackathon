import { useAppStore } from '../../store/appStore'

export default function WhyThisPanel() {
  const executionData = useAppStore((state) => state.executionData)

  const analysis = executionData?.recommendation_analysis
  const recommendation = executionData?.recommendation
  const selectedAction = recommendation?.selected_action

  if (!executionData) {
    return (
      <div className="why-panel">
        <div className="sidebar-panel-title">Why This Recommendation?</div>
        <p className="sidebar-panel-subtitle">
          Run the pipeline on an entity to see the AI Explainability Canvas.
        </p>
        <div className="why-empty-state">
          <p>The explainability canvas will show why a specific recommendation was chosen and why alternatives were rejected.</p>
        </div>
      </div>
    )
  }

  const whyThis = analysis?.why_this || []
  const whyNot = analysis?.why_not_others || []
  const confidence = analysis?.confidence_breakdown || {}
  const confPercent = Math.round((confidence.score || 0) * 100)

  return (
    <div className="why-panel">
      <div className="sidebar-panel-title">AI Explainability Canvas</div>

      {/* Selected action header */}
      {selectedAction && (
        <div className="why-action-header">
          <div className="why-action-title">{selectedAction.title}</div>
          <div className="why-action-desc">{selectedAction.description}</div>
        </div>
      )}

      {/* Why this recommendation */}
      <div className="why-section">
        <div className="why-section-title">Why this recommendation?</div>
        <div className="why-reasons">
          {whyThis.map((reason, i) => (
            <div key={i} className="why-reason-item">
              <span className="why-reason-check">✓</span>
              <span>{reason}</span>
            </div>
          ))}
          {whyThis.length === 0 && (
            <div className="why-reason-item" style={{ color: 'var(--text-muted)' }}>
              No specific signals extracted.
            </div>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="why-confidence-section">
        <div className="why-confidence-header">
          <span className="why-section-title">Confidence</span>
          <span className="why-confidence-value">{confPercent}%</span>
        </div>
        <div className="why-confidence-bar">
          <div
            className="why-confidence-fill"
            style={{ width: `${confPercent}%` }}
          />
        </div>
        <div className="why-confidence-breakdown">
          <div className="why-conf-stat">
            <span className="why-conf-stat-val">{confidence.evidence_count || 0}</span>
            <span className="why-conf-stat-label">Evidence</span>
          </div>
          <div className="why-conf-stat">
            <span className="why-conf-stat-val">{Math.round((confidence.source_agreement || 0) * 100)}%</span>
            <span className="why-conf-stat-label">Agreement</span>
          </div>
          <div className="why-conf-stat">
            <span className="why-conf-stat-val">{Math.round((confidence.historical_acceptance_rate || 0) * 100)}%</span>
            <span className="why-conf-stat-label">Hist. Rate</span>
          </div>
        </div>
      </div>

      {/* Why not these */}
      {whyNot.length > 0 && (
        <div className="why-section">
          <div className="why-section-title">Why not these?</div>
          <div className="why-rejections">
            {whyNot.map((item, i) => (
              <div key={i} className="why-rejection-item">
                <div className="why-rejection-action">
                  <span className="why-rejection-x">✗</span>
                  <span>{item.action}</span>
                </div>
                <div className="why-rejection-reason">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
