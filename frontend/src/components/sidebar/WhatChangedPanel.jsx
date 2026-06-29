import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { fetchRecommendationDiff, fetchPreviousRecommendation } from '../../services/api'

export default function WhatChangedPanel() {
  const executionData = useAppStore((state) => state.executionData)
  const interactionResult = useAppStore((state) => state.interactionResult)
  const activeDomain = useAppStore((state) => state.activeDomain)

  const [diffData, setDiffData] = useState(null)
  const [loading, setLoading] = useState(false)

  const currentAction = executionData?.recommendation?.selected_action
  const currentConf = executionData?.recommendation?.computed_confidence?.score || 0

  useEffect(() => {
    if (!executionData && !interactionResult) {
      setDiffData(null)
      return
    }

    // Prefer interactionResult diff (it's richer) over episodic diff
    if (interactionResult?.recommendation_before || interactionResult?.recommendation_after) {
      setDiffData({
        from_interaction: true,
        previous: interactionResult.recommendation_before,
        current: interactionResult.recommendation_after,
        change_reasons: interactionResult.change_reasons || [],
        planner_before: interactionResult.planner_before,
        planner_after: interactionResult.planner_after,
        signals: interactionResult.signals?.signals || [],
      })
      return
    }

    // Fall back to fetching from episodic memory
    const entityId = executionData?.recommendation?.entity_id
    const plannerStep = executionData?.agent_steps?.find(s => s.agent === 'planner')
    const inputSummary = plannerStep?.input_summary || ''
    const match = inputSummary.match(/\((acc_\w+|cand_\w+)\)/)
    const resolvedEntityId = match ? match[1] : entityId

    if (!resolvedEntityId) return

    setLoading(true)
    // Try new diff endpoint first
    fetchRecommendationDiff(activeDomain, resolvedEntityId)
      .then((data) => {
        if (data?.has_diff) {
          setDiffData({
            from_interaction: false,
            previous: data.previous?.title || null,
            current: data.current?.title || null,
            change_reasons: data.change_reasons || [],
          })
        } else {
          // Fall back to previous recommendation lookup
          return fetchPreviousRecommendation(activeDomain, resolvedEntityId).then((prev) => {
            if (prev?.has_previous) {
              setDiffData({
                from_interaction: false,
                previous: prev.previous?.action_title || null,
                current: currentAction?.title || null,
                change_reasons: [],
                prevOutcome: prev.previous?.outcome,
                prevConf: prev.previous?.confidence,
              })
            } else {
              setDiffData(null)
            }
          })
        }
      })
      .catch(() => setDiffData(null))
      .finally(() => setLoading(false))
  }, [executionData, interactionResult, activeDomain])

  if (!executionData && !interactionResult) {
    return (
      <div className="changed-panel">
        <div className="sidebar-panel-title">Recommendation Evolution</div>
        <p className="sidebar-panel-subtitle">Run the pipeline or add an interaction to see recommendation evolution.</p>
        <div className="why-empty-state">
          <p>After adding an interaction, this panel shows how the recommendation changed and why.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="changed-panel">
        <div className="sidebar-panel-title">Recommendation Evolution</div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="changed-panel">
      <div className="sidebar-panel-title">Recommendation Evolution</div>

      {/* Planner path change */}
      {diffData?.planner_before && diffData?.planner_after && diffData.planner_before !== diffData.planner_after && (
        <div className="changed-planner-reclassify">
          <div className="changed-card-label" style={{ color: '#fbbf24' }}>Planner Reclassified</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span className="domain-tag">{diffData.planner_before.replace(/_/g, ' ')}</span>
            <span style={{ color: '#fbbf24' }}>&#8594;</span>
            <span className="domain-tag" style={{ borderColor: '#fbbf24', color: '#fbbf24' }}>{diffData.planner_after.replace(/_/g, ' ')}</span>
          </div>
        </div>
      )}

      {/* Signals that triggered change */}
      {diffData?.signals?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div className="changed-card-label">Triggering Signals</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {diffData.signals.map((s, i) => (
              <span key={i} className="signal-tag">{s.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}

      {!diffData && (
        <div className="changed-first-time">
          <div className="changed-first-label">First recommendation for this entity</div>
          <p className="sidebar-panel-subtitle" style={{ marginTop: 8 }}>
            No previous recommendation to compare. Add an interaction to evolve it.
          </p>
        </div>
      )}

      {diffData && (
        <>
          {/* Previous */}
          {diffData.previous && (
            <div className="changed-prev-card">
              <div className="changed-card-label">Previous Recommendation</div>
              <div className="changed-card-title">{diffData.previous}</div>
              {diffData.prevOutcome && (
                <div className="changed-card-meta">
                  <span className={`memory-outcome memory-outcome-${diffData.prevOutcome}`}>{diffData.prevOutcome}</span>
                  {diffData.prevConf !== undefined && (
                    <span className="changed-card-confidence">Confidence: {Math.round((diffData.prevConf || 0) * 100)}%</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Arrow */}
          {diffData.previous && (
            <div className="changed-arrow">
              <div className="changed-arrow-line" />
              <div className="changed-arrow-icon">&#8595;</div>
            </div>
          )}

          {/* Current */}
          {(diffData.current || currentAction) && (
            <div className="changed-current-card">
              <div className="changed-card-label">Current Recommendation</div>
              <div className="changed-card-title">{diffData.current || currentAction?.title}</div>
              {currentConf > 0 && (
                <div className="changed-card-confidence">Confidence: {Math.round(currentConf * 100)}%</div>
              )}
            </div>
          )}

          {/* Change Reasons */}
          {diffData.change_reasons?.length > 0 && (
            <div className="changed-reasons">
              <div className="changed-reasons-title">Why it changed</div>
              {diffData.change_reasons.slice(0, 5).map((reason, i) => (
                <div key={i} className="changed-reason-item">
                  <span className="changed-reason-bullet">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
