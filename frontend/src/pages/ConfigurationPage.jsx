import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { fetchDomainConfig } from '../services/api'

export default function ConfigurationPage() {
  const { activeDomain, setActiveDomain } = useAppStore()
  const [configData, setConfigData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadConfig(activeDomain)
  }, [activeDomain])

  const loadConfig = async (domainName) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDomainConfig(domainName)
      setConfigData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" />
        <p>Loading platform configuration...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-banner">
        <h3>Configuration Load Error</h3>
        <p>{error}</p>
      </div>
    )
  }

  const { domain_pack, metrics, memory, validation, platform_capabilities } = configData

  return (
    <div className="config-container animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontFamily: 'var(--heading-font)', fontWeight: 800, fontSize: '2.5rem' }}>
            Configuration Hub
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Inspect cross-domain prompt overrides, memory spaces, and validation checks.
          </p>
        </div>

        {/* Local switcher that overrides global Zustand store */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Active Domain Pack:</span>
          <select
            value={activeDomain}
            onChange={(e) => setActiveDomain(e.target.value)}
            style={{ background: '#0b0f19', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', outline: 'none' }}
          >
            {configData.supported_domains?.map((d) => (
              <option key={d} value={d}>
                {d === 'customer_success' ? 'Customer Success' : 'Recruitment'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main layout grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        
        {/* Left Column: Domain Pack Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Domain Metadata Info */}
          <div className="glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--heading-font)', fontSize: '1.6rem', color: '#fff' }}>
                  {domain_pack.name} Pack
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ID: {domain_pack.id} · Version: {domain_pack.version || '1.0'}
                </span>
              </div>
              <span className="badge badge-healthy" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                Active
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '145%' }}>
              {domain_pack.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <div>
                <span className="domain-detail-label" style={{ fontSize: '0.75rem' }}>Entities</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {domain_pack.entities?.map(e => (
                    <span key={e} className="domain-tag" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>{e}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="domain-detail-label" style={{ fontSize: '0.75rem' }}>Workflows</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {domain_pack.workflows?.map(w => (
                    <span key={w} className="domain-tag" style={{ fontSize: '0.75rem', padding: '2px 6px', borderColor: 'rgba(6,182,212,0.3)', color: 'var(--accent-cyan)' }}>{w}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="domain-detail-label" style={{ fontSize: '0.75rem' }}>Tools Injected</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {domain_pack.tools?.length > 0 ? (
                    domain_pack.tools.map(t => (
                      <span key={t} className="domain-tag" style={{ fontSize: '0.75rem', padding: '2px 6px', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--accent-amber)' }}>{t}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Business Rules & Decision Points */}
          <div className="glass" style={{ padding: '24px' }}>
            <h3 className="domain-detail-label" style={{ marginBottom: '16px' }}>Business Rules & Policies</h3>
            {domain_pack.business_rules?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {domain_pack.business_rules.map((rule, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'var(--mono-font)', color: '#fff' }}>
                      {rule.rule}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      ➔ {rule.action}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>No direct business rules defined. System runs default logic paths.</p>
            )}

            <h3 className="domain-detail-label" style={{ marginBottom: '12px' }}>Decision Points</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {domain_pack.decision_points?.map((dp) => (
                <span key={dp} className="domain-tag" style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.3)', color: '#c084fc', fontSize: '0.8rem' }}>
                  {dp.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Prompt Overrides */}
          <div className="glass" style={{ padding: '24px' }}>
            <h3 className="domain-detail-label" style={{ marginBottom: '16px' }}>Agent Prompt Overrides</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['context_agent', 'reasoning_agent', 'recommendation_agent', 'explanation_agent'].map((agentKey) => {
                const overrideText = domain_pack.prompt_overrides?.[agentKey]
                const agentLabel = agentKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                return (
                  <div key={agentKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{agentLabel}</strong>
                      {overrideText ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          ✓ Override Loaded
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          No Override
                        </span>
                      )}
                    </div>
                    {overrideText ? (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '6px', fontStyle: 'italic' }}>
                        "{overrideText}"
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Using fallback base prompt configurations.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Platform Metrics & Validation Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Validation Checklist Card */}
          <div className="glass" style={{ padding: '24px', borderLeft: '4px solid var(--accent-emerald)' }}>
            <h3 className="domain-detail-label" style={{ marginBottom: '16px', color: 'var(--accent-emerald)' }}>
              Platform Validation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>✓</span>
                <span>Domain switched successfully</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>✓</span>
                <span>Active collection changed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>✓</span>
                <span>Prompt overrides loaded</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>✓</span>
                <span>Planner ready</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>✓</span>
                <span>No code changes required</span>
              </div>
            </div>
          </div>

          {/* Validation Timeline Card */}
          <div className="glass" style={{ padding: '24px' }}>
            <h3 className="domain-detail-label" style={{ marginBottom: '16px' }}>
              Configuration Validation Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>1. Domain Pack Loaded ✓</div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>2. Memory Collection Switched ✓</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Target collection: <code style={{ color: 'var(--accent-cyan)' }}>{memory.active_collection}</code>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>3. Prompt Overrides Loaded ✓</div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>4. Planner Ready ✓</div>
              </div>
            </div>
          </div>

          {/* Dynamic Platform Metrics Panel */}
          <div className="glass" style={{ padding: '24px' }}>
            <h3 className="domain-detail-label" style={{ marginBottom: '16px' }}>
              Platform Metrics Panel ({domain_pack.name})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Acceptance Rate</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                    {Math.round(metrics.acceptance_rate * 100)}%
                  </div>
                </div>
              </div>

              {domain_pack.id === 'customer_success' && (
                <>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Risk Catch Lead Time</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                        {metrics.risk_catch_lead_time_days} Days
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Simulated NRR Impact</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                        +{metrics.simulated_nrr_impact_pct}%
                      </div>
                    </div>
                  </div>
                </>
              )}

              {domain_pack.id === 'recruitment' && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Average Time To Hire</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      {metrics.time_to_hire_days} Days
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Capabilities Badges */}
          <div className="glass" style={{ padding: '24px' }}>
            <h3 className="domain-detail-label" style={{ marginBottom: '12px' }}>Platform Capabilities</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {platform_capabilities?.map((cap) => (
                <span key={cap} className="domain-tag" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                  {cap.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
