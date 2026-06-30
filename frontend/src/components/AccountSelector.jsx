export default function AccountSelector({ accounts, activeDomain, onSelect }) {
  const getHealthColor = (score) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#f43f5e'
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0)

  const getBadge = (item) => {
    if (activeDomain === 'recruitment') {
      const stage = (item.current_stage ?? '').toLowerCase()
      if (stage.includes('offer')) return <span className="badge badge-upsell">Offer Stage</span>
      if (stage.includes('technical')) return <span className="badge badge-champion">Technical Panel</span>
      return <span className="badge badge-healthy">Screening</span>
    }
    const id = item.account_id || ''
    if (id === 'acc_cs_001') return <span className="badge badge-risk">Renewal Risk</span>
    if (id === 'acc_cs_002') return <span className="badge badge-upsell">Upsell Opp</span>
    if (id === 'acc_cs_003') return <span className="badge badge-champion">Champion Change</span>
    if (id === 'acc_cs_004') return <span className="badge badge-risk">Escalation Risk</span>
    if (id === 'acc_cs_005') return <span className="badge badge-healthy">Healthy Account</span>
    return <span className="badge badge-upsell">Account</span>
  }

  return (
    <div>
      <h2 className="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {activeDomain === 'recruitment' ? 'Select Candidate' : 'Select Customer Account'}
      </h2>

      <div className="accounts-grid">
        {accounts.map((item) => {
          const itemId = item.account_id || item.candidate_id
          const name = item.company_name || item.candidate_name
          const subtitle = item.industry || item.role_applied || ''
          const value = item.annual_contract_value || item.expected_salary || 0
          const score = item.health_score ?? item.fit_score ?? 50
          const scoreLabel = activeDomain === 'recruitment' ? 'Fit Score' : 'Health Score'
          const trendLabel = activeDomain === 'recruitment' ? 'Sentiment' : 'Trend'
          const trend = item.usage_trend || item.interview_sentiment || '—'

          return (
            <div key={itemId} className="account-card glass" onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
              <div>
                <div className="account-header">
                  <div>
                    <h3 className="account-name">{name}</h3>
                    <span className="account-industry">{subtitle}</span>
                  </div>
                  {getBadge(item)}
                </div>

                <div className="acv-tier">
                  <span className="acv-val">{formatCurrency(value)}</span>
                  <span className="tier-tag">{item.plan_tier || item.current_stage || '—'}</span>
                </div>

                <div className="usage-trend-box">
                  <div className="usage-label">{trendLabel}</div>
                  <div className="usage-value">{trend}</div>
                </div>

                <div className="health-row">
                  <span className="health-label">{scoreLabel}: <strong>{score}</strong></span>
                  <div className="health-progress-bg">
                    <div className="health-progress-bar" style={{ width: `${score}%`, backgroundColor: getHealthColor(score) }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button className="btn-ui btn-primary-ui" style={{ width: '100%', justifyContent: 'center' }}>
                  Open Decision Workspace →
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
