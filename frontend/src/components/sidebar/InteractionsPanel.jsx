import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { fetchInteractions, fetchInteractionStats, fetchRecommendationDiff } from '../../services/api'
import PlannerEvolutionCard from '../PlannerEvolutionCard'
import RecommendationEvolution from '../RecommendationEvolution'

const TYPE_COLORS = {
  meeting_note: '#fbbf24',
  email: '#60a5fa',
  crm_update: '#a78bfa',
  call_transcript: '#34d399',
  support_ticket: '#f87171',
  product_usage: '#2dd4bf',
  survey: '#818cf8',
  internal_note: '#a3a3a3',
  contract_event: '#f472b6',
}

const SEVERITY_COLOR = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#4ade80',
}

function SignalBadge({ signal }) {
  return (
    <span className="signal-tag" style={{ fontSize: '0.7rem' }}>
      {signal.replace(/_/g, ' ')}
    </span>
  )
}

function DeltaBar({ label, value }) {
  const isPositive = value > 0
  const absVal = Math.abs(value)
  const barWidth = Math.min(absVal, 100)
  const color = label.includes('expansion') ? (isPositive ? '#4ade80' : '#f87171') : (isPositive ? '#f87171' : '#4ade80')

  return (
    <div className="delta-bar-row">
      <div className="delta-bar-label">{label.replace(/_/g, ' ').replace(' delta', '')}</div>
      <div className="delta-bar-track">
        <div
          className="delta-bar-fill"
          style={{ width: `${barWidth}%`, background: color }}
        />
      </div>
      <div className="delta-bar-value" style={{ color }}>
        {isPositive ? '+' : ''}{value}
      </div>
    </div>
  )
}

export default function InteractionsPanel() {
  const { activeDomain, executionData, interactionResult, interactions, setInteractions, interactionStats, setInteractionStats } = useAppStore()
  const [evolutions, setEvolutions] = useState([])
  const [loading, setLoading] = useState(false)

  const entityId = executionData?.recommendation?.entity_id || null

  useEffect(() => {
    if (!activeDomain) return
    fetchInteractionStats(activeDomain)
      .then((data) => setInteractionStats(data))
      .catch(() => {})
  }, [activeDomain, interactionResult])

  useEffect(() => {
    if (!entityId) return
    setLoading(true)
    Promise.all([
      fetchInteractions(entityId),
      fetchRecommendationDiff(activeDomain, entityId),
    ]).then(([ints, diff]) => {
      setInteractions(ints || [])
      if (diff?.has_diff) setEvolutions([diff])
      else setEvolutions([])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [entityId, interactionResult])

  const impact = interactionResult?.impact
  const signals = interactionResult?.signals

  return (
    <div className="interactions-panel">
      <div className="sidebar-panel-title">Interaction Intelligence</div>

      {/* Stats Row */}
      {interactionStats && (
        <div className="interaction-stats-grid">
          <div className="interaction-stat-cell">
            <div className="interaction-stat-val">{interactionStats.total_interactions || 0}</div>
            <div className="interaction-stat-lbl">Interactions</div>
          </div>
          <div className="interaction-stat-cell">
            <div className="interaction-stat-val">
              {Object.values(interactionStats.signal_distribution || {}).reduce((a, b) => a + b, 0)}
            </div>
            <div className="interaction-stat-lbl">Signals</div>
          </div>
          <div className="interaction-stat-cell">
            <div className="interaction-stat-val">{interactionStats.recommendation_changes || 0}</div>
            <div className="interaction-stat-lbl">Rec. Changed</div>
          </div>
          <div className="interaction-stat-cell">
            <div className="interaction-stat-val">{interactionStats.planner_reclassifications || 0}</div>
            <div className="interaction-stat-lbl">Reclassified</div>
          </div>
        </div>
      )}

      {!entityId && !interactionResult && (
        <p className="sidebar-panel-subtitle" style={{ marginTop: '12px' }}>
          Select an account and add an interaction to see the intelligence layer in action.
        </p>
      )}

      {/* Latest Interaction Analysis */}
      {interactionResult && (
        <>
          {/* Extracted Signals */}
          {signals?.signals?.length > 0 && (
            <div className="interactions-section">
              <div className="interactions-section-title">Extracted Signals</div>
              <div className="signals-list">
                {signals.signals.map((sig, i) => (
                  <SignalBadge key={i} signal={sig} />
                ))}
              </div>
              <div className="severity-row">
                Severity:&nbsp;
                <strong style={{ color: SEVERITY_COLOR[signals.severity] || '#fff' }}>
                  {signals.severity?.toUpperCase()}
                </strong>
                &nbsp;·&nbsp;Impact Score:&nbsp;
                <strong style={{ color: impact?.impact_score > 50 ? '#f87171' : '#fbbf24' }}>
                  {impact?.impact_score}
                </strong>
              </div>
              {signals.recommendation && (
                <div className="signal-recommendation">{signals.recommendation}</div>
              )}
            </div>
          )}

          {/* Impact Assessment */}
          {impact && (impact.renewal_risk_delta !== 0 || impact.churn_probability_delta !== 0 || impact.expansion_probability_delta !== 0) && (
            <div className="interactions-section">
              <div className="interactions-section-title">Impact Assessment</div>
              <DeltaBar label="renewal_risk_delta" value={impact.renewal_risk_delta} />
              <DeltaBar label="churn_probability_delta" value={impact.churn_probability_delta} />
              <DeltaBar label="expansion_probability_delta" value={impact.expansion_probability_delta} />
            </div>
          )}

          {/* Planner Reclassification */}
          {(interactionResult.planner_before || interactionResult.planner_after) && (
            <div className="interactions-section">
              <PlannerEvolutionCard
                before={interactionResult.planner_before}
                after={interactionResult.planner_after}
                reasons={interactionResult.change_reasons}
              />
            </div>
          )}

          {/* Recommendation Evolution */}
          {interactionResult.recommendation_before && interactionResult.recommendation_after && (
            <div className="interactions-section">
              <div className="interactions-section-title">Recommendation Evolution</div>
              <div className="rec-diff-row">
                <div className="rec-diff-card rec-diff-prev">
                  <div className="rec-diff-label">Before</div>
                  <div className="rec-diff-title">{interactionResult.recommendation_before || 'None'}</div>
                </div>
                <div className="rec-diff-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div className="rec-diff-card rec-diff-new">
                  <div className="rec-diff-label">After</div>
                  <div className="rec-diff-title">{interactionResult.recommendation_after}</div>
                </div>
              </div>
              {interactionResult.change_reasons?.length > 0 && (
                <div className="rec-evo-reasons" style={{ marginTop: '10px' }}>
                  {interactionResult.change_reasons.map((r, i) => (
                    <div key={i} className="rec-evo-reason">
                      <span className="planner-evo-check">&#10003;</span> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Recent Interactions for entity */}
      {loading && <div style={{ textAlign: 'center', padding: '16px' }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>}
      {interactions.length > 0 && !loading && (
        <div className="interactions-section">
          <div className="interactions-section-title">Interaction History ({interactions.length})</div>
          {interactions.slice(0, 8).map((int, i) => (
            <div key={int.interaction_id || i} className="interaction-history-item">
              <div
                className="interaction-history-dot"
                style={{ background: TYPE_COLORS[int.interaction_type] || '#888' }}
              />
              <div className="interaction-history-info">
                <div className="interaction-history-title">{int.title}</div>
                <div className="interaction-history-meta">
                  {int.interaction_type?.replace(/_/g, ' ')} · {new Date(int.created_at).toLocaleDateString()}
                  {int.impact_score > 0 && (
                    <span style={{ color: int.impact_score > 50 ? '#f87171' : '#fbbf24', marginLeft: 6 }}>
                      Impact: {int.impact_score}
                    </span>
                  )}
                </div>
                {int.signals?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                    {int.signals.slice(0, 3).map((s, si) => (
                      <span key={si} className="signal-tag" style={{ fontSize: '0.65rem' }}>{s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
