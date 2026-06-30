export default function PlannerEvolutionCard({ before, after, reasons }) {
  if (!before && !after) return null

  const changed = before !== after

  return (
    <div className="planner-evolution-card">
      <div className="planner-evo-label">Planner Reclassification</div>
      <div className="planner-evo-flow">
        <div className={`planner-evo-state ${!changed ? 'planner-evo-same' : ''}`}>
          <span className="planner-evo-badge planner-evo-before">{(before || 'unknown').replace(/_/g, ' ')}</span>
        </div>
        <div className="planner-evo-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={changed ? '#fbbf24' : 'var(--text-muted)'} strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        <div className={`planner-evo-state ${changed ? 'planner-evo-changed' : 'planner-evo-same'}`}>
          <span className={`planner-evo-badge ${changed ? 'planner-evo-after' : 'planner-evo-before'}`}>
            {(after || 'unknown').replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      {changed && reasons && reasons.length > 0 && (
        <div className="planner-evo-reasons">
          {reasons.slice(0, 4).map((r, i) => (
            <div key={i} className="planner-evo-reason-item">
              <span className="planner-evo-check">&#10003;</span> {r}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
