import { useState } from 'react'

export default function ApprovalButtons({ onApprove, onEditClick, onReject, loading, missingInfo }) {
  const [feedbackText, setFeedbackText] = useState('')
  const [showMissing, setShowMissing] = useState(false)

  const handleReject = () => {
    if (!feedbackText.trim()) {
      alert('Feedback text is required to reject a recommendation.')
      return
    }
    onReject(feedbackText)
  }

  const handleApprove = () => {
    onApprove(feedbackText)
  }

  return (
    <div className="feedback-box-ui">
      <h3 className="domain-detail-label" style={{ marginBottom: '8px' }}>Human-in-the-Loop Gate</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
        Review the recommendation, evidence, and reasoning trace. Provide feedback and choose an outcome.
      </p>

      <textarea
        className="feedback-textarea"
        placeholder="Enter your feedback reasoning (required for rejection)..."
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
      />

      <div className="feedback-actions">
        <button className="btn-ui btn-success-ui" onClick={handleApprove} disabled={loading}>
          Approve
        </button>
        <button className="btn-ui btn-primary-ui" onClick={() => onEditClick(feedbackText)} disabled={loading}>
          Edit & Approve
        </button>
        <button className="btn-ui btn-warning-ui" onClick={() => setShowMissing(!showMissing)} disabled={loading}>
          Request More Info
        </button>
        <button className="btn-ui btn-danger-ui" onClick={handleReject} disabled={loading}>
          Reject
        </button>
      </div>

      {showMissing && (
        <div className="missing-info-box">
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--accent-amber)' }}>
            Missing Information
          </h4>
          {missingInfo && missingInfo.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {missingInfo.map((info, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{info}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              No missing information detected by the context agent.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
