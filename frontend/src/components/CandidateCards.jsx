import { useState } from 'react'

export default function CandidateCards({ candidates, selectedActionId, selectedAction }) {
  const [editingAction, setEditingAction] = useState(false)
  const [editedTitle, setEditedTitle] = useState(selectedAction?.title || '')
  const [editedDesc, setEditedDesc] = useState(selectedAction?.description || '')

  return (
    <div className="candidates-list-container">
      <h3 className="domain-detail-label" style={{ marginBottom: '12px' }}>Ranked Next-Best Actions</h3>
      <div className="candidate-actions-grid">
        {(candidates || []).map((act) => {
          const isSelected = act.id === (selectedActionId || selectedAction?.id)
          return (
            <div key={act.id} className={`candidate-card-ui ${isSelected ? 'selected' : 'rejected'}`}>
              <div className="candidate-card-header">
                <h4 className="candidate-card-title">{act.title}</h4>
                <span className={`candidate-badge ${isSelected ? 'candidate-badge-selected' : 'candidate-badge-rejected'}`}>
                  {isSelected ? 'Selected Primary' : 'Ranked Option'}
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: '140%' }}>
                {act.description}
              </p>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Rationale:</strong> {act.rationale}
              </div>

              {act.expected_impact && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '6px' }}>
                  <strong>Impact:</strong> {act.expected_impact}
                </div>
              )}

              {act.confidence != null && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
                  <strong>Confidence:</strong> {Math.round(act.confidence * 100)}%
                </div>
              )}

              {!isSelected && act.rejected_reason && (
                <div className="rejected-reason-box">
                  <strong>Why not chosen:</strong> {act.rejected_reason}
                </div>
              )}

              {isSelected && (
                <div style={{ marginTop: '12px' }}>
                  <button className="btn-ui btn-secondary-ui" onClick={() => setEditingAction(!editingAction)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                    {editingAction ? 'Cancel Edit' : 'Edit Action'}
                  </button>

                  {editingAction && (
                    <div className="edit-action-form">
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Title:</label>
                        <input type="text" className="edit-input" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description:</label>
                        <textarea className="edit-input" style={{ height: '50px', resize: 'none' }}
                          value={editedDesc} onChange={(e) => setEditedDesc(e.target.value)} />
                      </div>
                      <button className="btn-ui btn-success-ui"
                        onClick={() => {
                          if (selectedAction) {
                            selectedAction.title = editedTitle
                            selectedAction.description = editedDesc
                          }
                          setEditingAction(false)
                        }}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', alignSelf: 'flex-start' }}>
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
