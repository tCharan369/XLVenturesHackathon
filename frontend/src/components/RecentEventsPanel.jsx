import { useEffect, useState } from 'react'
import { fetchRecentInteractions } from '../services/api'
import { useAppStore } from '../store/appStore'

const SIGNAL_DECORATIONS = {
  champion_change: { color: '#f87171', label: 'Champion Resigned' },
  renewal_risk: { color: '#fb923c', label: 'Renewal Approaching' },
  usage_decline: { color: '#f87171', label: 'Usage Dropped' },
  budget_freeze: { color: '#f87171', label: 'Budget Freeze' },
  escalation: { color: '#f87171', label: 'Critical Incident' },
  expansion_opportunity: { color: '#4ade80', label: 'Expansion Request' },
  positive_sentiment: { color: '#4ade80', label: 'Positive NPS' },
  negative_sentiment: { color: '#f87171', label: 'Negative NPS' },
  competitive_threat: { color: '#f87171', label: 'Competitive Threat' },
  pricing_objection: { color: '#fbbf24', label: 'Pricing Objection' },
  procurement_delay: { color: '#fb923c', label: 'Procurement Delay' },
  product_adoption_growth: { color: '#4ade80', label: 'Product Adoption Growth' },
  churn_signal: { color: '#f87171', label: 'Churn Signal' },
  feature_request: { color: '#60a5fa', label: 'Feature Request' },
  
  // Recruitment signals
  candidate_dropoff: { color: '#f87171', label: 'Candidate Dropoff' },
  competing_offer: { color: '#fb923c', label: 'Competing Offer' },
  salary_concern: { color: '#fbbf24', label: 'Salary Negotiation' },
  strong_fit: { color: '#4ade80', label: 'Strong Interview Feedback' },
  interview_delay: { color: '#fbbf24', label: 'Interview Delay' },
  positive_feedback: { color: '#4ade80', label: 'Positive Feedback' },
  negative_feedback: { color: '#f87171', label: 'Negative Feedback' },
  urgent_hiring_need: { color: '#fb923c', label: 'Urgent Hiring Need' },
  offer_acceptance_signal: { color: '#4ade80', label: 'Offer Acceptance Signal' },
}

export default function RecentEventsPanel() {
  const activeDomain = useAppStore((state) => state.activeDomain)
  const interactionResult = useAppStore((state) => state.interactionResult)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const loadRecentEvents = () => {
    setLoading(true)
    fetchRecentInteractions(activeDomain, 10)
      .then((data) => {
        // Flatten interactions into individual signal events
        const signalEvents = []
        data.forEach(item => {
          const signals = item.signals || []
          if (signals.length === 0) {
            // Fallback: use title as event if no signals extracted
            signalEvents.push({
              id: `${item.interaction_id}-fallback`,
              text: item.title,
              color: '#a3a3a3',
              time: new Date(item.created_at),
              source: item.source,
              entity_id: item.entity_id,
            })
          } else {
            signals.forEach((sig, index) => {
              const deco = SIGNAL_DECORATIONS[sig] || { color: '#fbbf24', label: sig.replace(/_/g, ' ') }
              signalEvents.push({
                id: `${item.interaction_id}-${index}`,
                text: deco.label,
                color: deco.color,
                time: new Date(item.created_at),
                source: item.source,
                entity_id: item.entity_id,
                raw_signal: sig,
              })
            });
          }
        });
        // Sort newest first
        signalEvents.sort((a, b) => b.time - a.time)
        setEvents(signalEvents)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRecentEvents()
    // Poll every 10 seconds for real-time vibe
    const interval = setInterval(loadRecentEvents, 10000)
    return () => clearInterval(interval)
  }, [activeDomain, interactionResult])

  return (
    <div className="recent-events-panel glass" style={{ padding: '20px', marginTop: '20px' }}>
      <div className="recent-events-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Recent Signals
        </div>
        {loading && <div className="spinner" style={{ width: 12, height: 12, borderWidth: '2px' }} />}
      </div>

      {events.length === 0 && !loading && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No recent signals detected.
        </div>
      )}

      <div className="events-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.slice(0, 5).map((evt) => (
          <div key={evt.id} className="event-item" style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '10px', fontSize: '0.82rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span className="event-indicator" style={{ width: '8px', height: '8px', borderRadius: '50%', background: evt.color, boxShadow: `0 0 6px ${evt.color}`, flexShrink: 0 }} />
              <span className="event-text" style={{ color: '#fff', fontWeight: '500' }}>
                {evt.text}
              </span>
              <span className="event-entity-id" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--mono-font)' }}>
                ({evt.entity_id})
              </span>
            </div>
            <div className="event-time" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--mono-font)', whiteSpace: 'nowrap' }}>
              {evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
