import { useState, useEffect } from 'react'
import { fetchHistory, fetchHeuristics } from '../services/api'

import { useAppStore } from '../store/appStore'

export default function MemoryPage() {
  const activeDomain = useAppStore((state) => state.activeDomain)

  const [activeTab, setActiveTab] = useState('recommendations')
  const [history, setHistory] = useState([])
  const [heuristics, setHeuristics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [activeDomain])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [historyData, heuristicsData] = await Promise.all([
        fetchHistory(activeDomain),
        fetchHeuristics(activeDomain),
      ])
      setHistory(historyData || [])
      setHeuristics(heuristicsData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'recommendations', label: 'Recommendations', count: history.length },
    { id: 'feedback', label: 'Feedback', count: history.reduce((sum, h) => sum + (h.feedback?.length || 0), 0) },
    { id: 'heuristics', label: 'Learned Heuristics', count: heuristics.length },
  ]

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" />
        <p>Loading memory for {activeDomain.replace(/_/g, ' ')}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-banner">
        <h3>Memory Load Error</h3>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Episodic Memory</h1>
        <p className="page-subtitle">Historical recommendations, feedback, and learned heuristics for {activeDomain.replace(/_/g, ' ')}</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
        <button className="btn-ui btn-secondary-ui" onClick={loadData} style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '6px 12px' }}>
          Refresh
        </button>
      </div>

      {/* Recommendations tab */}
      {activeTab === 'recommendations' && (
        <div className="memory-grid">
          {history.length === 0 ? (
            <div className="empty-state">
              <h3>No recommendations yet</h3>
              <p>Run the decision pipeline on an entity to generate recommendations.</p>
            </div>
          ) : (
            history.map(rec => {
              const selected = rec.recommendation?.selected_action
              const feedback = rec.feedback?.[0]
              return (
                <div key={rec.recommendation_id} className="memory-card glass">
                  <div className="memory-card-header">
                    <div>
                      <h3 className="memory-card-title">{selected?.title || 'Recommendation'}</h3>
                      <span className="memory-card-meta">
                        {rec.entity_id} · {rec.recommendation_id}
                      </span>
                    </div>
                    {feedback && (
                      <span className={`memory-outcome memory-outcome-${feedback.outcome}`}>
                        {feedback.outcome}
                      </span>
                    )}
                  </div>

                  {selected?.description && (
                    <p className="memory-card-desc">{selected.description}</p>
                  )}

                  <div className="memory-card-footer">
                    <span>{rec.created_at ? new Date(rec.created_at).toLocaleString() : '—'}</span>
                    {rec.recommendation?.computed_confidence?.score && (
                      <span className="memory-confidence">
                        Confidence: {Math.round(rec.recommendation.computed_confidence.score * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Feedback tab */}
      {activeTab === 'feedback' && (
        <div className="memory-grid">
          {history.flatMap(rec =>
            (rec.feedback || []).map(fb => (
              <div key={fb.feedback_id} className="memory-card glass">
                <div className="memory-card-header">
                  <div>
                    <h3 className="memory-card-title">{rec.recommendation?.selected_action?.title || rec.recommendation_id}</h3>
                    <span className="memory-card-meta">{rec.entity_id}</span>
                  </div>
                  <span className={`memory-outcome memory-outcome-${fb.outcome}`}>
                    {fb.outcome}
                  </span>
                </div>
                {fb.human_feedback && (
                  <p className="memory-card-desc">"{fb.human_feedback}"</p>
                )}
                <div className="memory-card-footer">
                  <span>{fb.created_at ? new Date(fb.created_at).toLocaleString() : '—'}</span>
                </div>
              </div>
            ))
          )}
          {history.every(rec => !rec.feedback?.length) && (
            <div className="empty-state">
              <h3>No feedback recorded</h3>
              <p>Approve, edit, or reject a recommendation to generate feedback.</p>
            </div>
          )}
        </div>
      )}

      {/* Heuristics tab */}
      {activeTab === 'heuristics' && (
        <div className="memory-grid">
          {heuristics.length === 0 ? (
            <div className="empty-state">
              <h3>No learned heuristics yet</h3>
              <p>Run the reflection job from the Recommend page to generate heuristics.</p>
            </div>
          ) : (
            heuristics.map(h => (
              <div key={h.id} className="memory-card glass">
                <div className="memory-card-header">
                  <h3 className="memory-card-title">{h.id}</h3>
                </div>
                <div className="reflection-md" style={{ maxHeight: '150px' }}>
                  {h.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
