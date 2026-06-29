function formatTime(isoString) {
  if (!isoString) return '--:--'
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function RecommendationEvolution({ evolutions }) {
  if (!evolutions || evolutions.length === 0) return null

  return (
    <div className="rec-evolution">
      <div className="rec-evo-header">Recommendation Evolution</div>
      <div className="rec-evo-track">
        {evolutions.map((evo, i) => (
          <div key={evo.evolution_id || i} className="rec-evo-entry">
            <div className="rec-evo-connector">
              <div className="rec-evo-dot" />
              {i < evolutions.length - 1 && <div className="rec-evo-line" />}
            </div>
            <div className="rec-evo-content">
              <div className="rec-evo-time">{formatTime(evo.created_at)}</div>

              {evo.previous_recommendation && (
                <div className="rec-evo-prev">
                  <span className="rec-evo-label-sm">Previous</span>
                  <span className="rec-evo-title-sm">{evo.previous_recommendation.title || 'N/A'}</span>
                </div>
              )}

              <div className="rec-evo-new">
                <span className="rec-evo-label-sm" style={{ color: '#4ade80' }}>New</span>
                <span className="rec-evo-title-sm" style={{ color: '#fff' }}>
                  {evo.new_recommendation?.title || 'N/A'}
                </span>
              </div>

              {evo.change_reasons && evo.change_reasons.length > 0 && (
                <div className="rec-evo-reasons">
                  {evo.change_reasons.slice(0, 3).map((r, ri) => (
                    <div key={ri} className="rec-evo-reason">
                      <span className="planner-evo-check">&#10003;</span> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
