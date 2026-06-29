import { useState, useEffect } from 'react'
import { fetchDomain, fetchAccounts, postRecommend, postApprove, postReflect, postInteraction, fetchInteractions } from '../services/api'
import AccountSelector from '../components/AccountSelector'
import PipelineStatus from '../components/PipelineStatus'
import ConfidenceBadge from '../components/ConfidenceBadge'
import CandidateCards from '../components/CandidateCards'
import EvidenceAccordion from '../components/EvidenceAccordion'
import ApprovalButtons from '../components/ApprovalButtons'
import TraceTimeline from '../components/TraceTimeline'
import InteractionModal from '../components/InteractionModal'
import InteractionTimeline from '../components/InteractionTimeline'
import RecentEventsPanel from '../components/RecentEventsPanel'

import { useAppStore } from '../store/appStore'

const PIPELINE_STEPS = [
  { id: 'interaction', label: 'Interaction Received' },
  { id: 'signals', label: 'Signal Extraction' },
  { id: 'impact', label: 'Impact Assessment' },
  { id: 'planner', label: 'Planner Reclassification' },
  { id: 'context', label: 'Context Agent' },
  { id: 'reasoning', label: 'Reasoning Agent' },
  { id: 'recommendation', label: 'Recommendation Agent' },
  { id: 'explanation', label: 'Explanation Agent' },
  { id: 'approval', label: 'Human Approval' },
]

function PipelineProgressAnimation({ activeStep, steps }) {
  return (
    <div className="pipeline-progress">
      {steps.map((step, i) => {
        const isDone = i < activeStep
        const isActive = i === activeStep
        const isPaused = step.id === 'approval' && isDone
        return (
          <div key={step.id} className={`pipeline-step ${isDone ? 'pipeline-step--done' : ''} ${isActive ? 'pipeline-step--active' : ''} ${isPaused ? 'pipeline-step--paused' : ''}`}>
            <div className="pipeline-step-dot">
              {isDone && !isPaused && <span>&#10003;</span>}
              {isPaused && <span>&#9646;</span>}
              {isActive && <div className="pipeline-dot-pulse" />}
            </div>
            <span className="pipeline-step-label">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function RecommendPage() {
  const activeDomain = useAppStore((state) => state.activeDomain)
  const setExecutionData = useAppStore((state) => state.setExecutionData)
  const setOutcomeData = useAppStore((state) => state.setOutcomeData)
  const setSidebarPanel = useAppStore((state) => state.setSidebarPanel)
  const setInteractionResult = useAppStore((state) => state.setInteractionResult)
  const setInteractions = useAppStore((state) => state.setInteractions)

  const [domain, setDomain] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedEntity, setSelectedEntity] = useState(null)
  const [recoData, setRecoData] = useState(null)
  const [recoLoading, setRecoLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [outcomeResult, setOutcomeResult] = useState(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDesc, setEditedDesc] = useState('')
  const [editFeedback, setEditFeedback] = useState('')

  const [reflectionData, setReflectionData] = useState(null)
  const [reflectLoading, setReflectLoading] = useState(false)

  // Interaction state
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)
  const [interactionLoading, setInteractionLoading] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const [interactions, setLocalInteractions] = useState([])
  const [showPipelineAnimation, setShowPipelineAnimation] = useState(false)

  useEffect(() => {
    loadData(activeDomain)
  }, [activeDomain])

  const loadData = async (domainName) => {
    try {
      setLoading(true)
      setError(null)
      setSelectedEntity(null)
      setRecoData(null)
      setOutcomeResult(null)
      setReflectionData(null)
      setExecutionData(null)
      setOutcomeData(null)
      setInteractionResult(null)
      setLocalInteractions([])

      const [domainData, accountsData] = await Promise.all([
        fetchDomain(domainName),
        fetchAccounts(domainName),
      ])
      setDomain(domainData)
      setAccounts(accountsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEntity = (item) => {
    setSelectedEntity(item)
    setRecoData(null)
    setOutcomeResult(null)
    setLocalInteractions([])
    setShowPipelineAnimation(false)
    setPipelineStep(-1)
    setInteractionResult(null)
  }

  const handleRunPipeline = async () => {
    if (!selectedEntity) return
    setRecoLoading(true)
    setRecoData(null)
    setOutcomeResult(null)
    try {
      const entityId = selectedEntity.account_id || selectedEntity.candidate_id
      const data = await postRecommend(activeDomain, entityId)
      setRecoData(data)
      setExecutionData(data)
      setSidebarPanel('agents')

      if (data.recommendation?.selected_action) {
        setEditedTitle(data.recommendation.selected_action.title || '')
        setEditedDesc(data.recommendation.selected_action.description || '')
      }

      // Load interactions for this entity
      const ints = await fetchInteractions(entityId).catch(() => [])
      setLocalInteractions(ints)
      setInteractions(ints)
    } catch (err) {
      alert(err.message)
    } finally {
      setRecoLoading(false)
    }
  }

  const handleSubmitInteraction = async (formData) => {
    if (!selectedEntity) return
    const entityId = selectedEntity.account_id || selectedEntity.candidate_id

    setInteractionLoading(true)
    setShowPipelineAnimation(true)
    setPipelineStep(0)

    try {
      // Animate through pipeline steps
      const stepDelay = 400
      const advanceStep = (step) => new Promise((r) => setTimeout(() => { setPipelineStep(step); r() }, stepDelay))

      await advanceStep(1) // signals
      await advanceStep(2) // impact

      // Actually call the API
      const result = await postInteraction({
        account_id: entityId,
        domain_pack_id: activeDomain,
        ...formData,
      })

      await advanceStep(3) // planner
      await advanceStep(4) // context
      await advanceStep(5) // reasoning
      await advanceStep(6) // recommendation
      await advanceStep(7) // explanation
      await advanceStep(8) // approval (paused)

      // Update state with new recommendation
      setRecoData(result)
      setExecutionData(result)
      setInteractionResult(result)
      setIsInteractionModalOpen(false)

      if (result.recommendation?.selected_action) {
        setEditedTitle(result.recommendation.selected_action.title || '')
        setEditedDesc(result.recommendation.selected_action.description || '')
      }

      // Reload interactions
      const ints = await fetchInteractions(entityId).catch(() => [])
      setLocalInteractions(ints)
      setInteractions(ints)

      // Switch to interactions panel
      setSidebarPanel('interactions')

    } catch (err) {
      alert(`Interaction failed: ${err.message}`)
      setShowPipelineAnimation(false)
      setPipelineStep(-1)
    } finally {
      setInteractionLoading(false)
    }
  }

  const handleApproval = async (outcome, feedbackText, customEditedAction = null) => {
    if (!recoData) return
    setSubmitLoading(true)
    try {
      const result = await postApprove(recoData.thread_id, outcome, feedbackText, customEditedAction)
      setOutcomeResult(result)
      setOutcomeData(result)
      setIsEditModalOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditClick = (feedbackText) => {
    setEditFeedback(feedbackText)
    setIsEditModalOpen(true)
  }

  const handleReflect = async () => {
    setReflectLoading(true)
    setReflectionData(null)
    try {
      const data = await postReflect(activeDomain)
      setReflectionData(data)
    } catch (err) {
      alert(err.message)
    } finally {
      setReflectLoading(false)
    }
  }

  if (error) {
    return (
      <div className="error-banner">
        <h3 style={{ margin: '0 0 10px 0' }}>Backend Connection Error</h3>
        <p style={{ margin: '0 0 15px 0', fontSize: '0.95rem' }}>
          Make sure the backend server is running on port 8000.
        </p>
        <code className="error-code">PYTHONPATH=. uvicorn backend.api.main:app --port 8000 --reload</code>
        <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#b91c1c' }}>{error}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" />
        <p>Loading {activeDomain.replace(/_/g, ' ')} domain...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      {domain && (
        <div className="stats-grid">
          <div className="stat-card glass">
            <div className="stat-title">Domain Pack</div>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{domain.name}</div>
            <div className="stat-desc">Active business pack</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-title">Workflows</div>
            <div className="stat-value">{domain.workflows?.length || 0}</div>
            <div className="stat-desc">{domain.workflows?.join(', ') || '—'}</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-title">Decision Points</div>
            <div className="stat-value">{domain.decision_points?.length || 0}</div>
            <div className="stat-desc">Orchestration targets</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-title">Records</div>
            <div className="stat-value">{accounts.length}</div>
            <div className="stat-desc">Synthetic entities</div>
          </div>
        </div>
      )}

      <div className="info-section">
        {/* Main content */}
        <div>
          {!selectedEntity ? (
            <>
              <AccountSelector
                accounts={accounts}
                activeDomain={activeDomain}
                onSelect={handleSelectEntity}
              />
              <RecentEventsPanel />
            </>
          ) : (
            <div className="recommendation-panel glass" style={{ padding: '30px', border: '1px solid var(--accent-purple)' }}>
              {/* Header */}
              <div className="recommendation-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', fontFamily: 'var(--heading-font)' }}>
                    {selectedEntity.company_name || selectedEntity.candidate_name}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    ID: {selectedEntity.account_id || selectedEntity.candidate_id} | {selectedEntity.plan_tier || selectedEntity.current_stage || '—'}
                  </p>
                </div>
                <button className="btn-ui btn-secondary-ui" onClick={() => setSelectedEntity(null)}>&#8592; Back</button>
              </div>

              {/* Pipeline Progress Animation */}
              {showPipelineAnimation && (
                <div style={{ margin: '20px 0' }}>
                  <PipelineProgressAnimation activeStep={pipelineStep} steps={PIPELINE_STEPS} />
                </div>
              )}

              {/* Interaction Timeline */}
              {interactions.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <InteractionTimeline interactions={interactions} />
                </div>
              )}

              {/* Pre-recommendation */}
              {!recoData && !recoLoading && !interactionLoading && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem' }}>Ready for Evaluation</h3>
                  <p style={{ maxWidth: '450px', margin: '0 auto 24px auto', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '145%' }}>
                    Run the LangGraph planner to classify this entity and generate a recommendation — or add a customer interaction to evolve it in real time.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-ui btn-primary-ui" onClick={handleRunPipeline}
                      style={{ fontSize: '1.05rem', padding: '12px 24px' }}>
                      Run Decision Pipeline
                    </button>
                    <button className="btn-ui btn-secondary-ui" onClick={() => setIsInteractionModalOpen(true)}
                      style={{ fontSize: '1rem', padding: '12px 20px' }}>
                      + Add Interaction
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {recoLoading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <div className="spinner" />
                  <p style={{ fontSize: '0.95rem' }}>Executing LangGraph pipeline...</p>
                </div>
              )}

              {/* Results */}
              {recoData && !recoLoading && (
                <div>
                  {/* Action bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button
                      className="btn-ui btn-secondary-ui"
                      onClick={() => setIsInteractionModalOpen(true)}
                      disabled={interactionLoading}
                      style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                    >
                      {interactionLoading ? 'Processing...' : '+ Add Interaction'}
                    </button>
                  </div>

                  <PipelineStatus routingPath={recoData.routing_path} executionTimeMs={recoData.execution_time_ms} />

                  <div className="recommendation-grid">
                    {/* Left: Confidence + Candidates + Approval */}
                    <div>
                      <h3 className="domain-detail-label" style={{ marginBottom: '12px' }}>Computed Confidence</h3>
                      <ConfidenceBadge confidence={recoData.recommendation?.computed_confidence} />

                      {/* Calibration & Provenance Details */}
                      <div className="glass" style={{ padding: '12px 16px', margin: '12px 0 20px 0', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Provenances:</span>
                          <span style={{ color: '#fff', fontWeight: '500' }}>
                            {recoData.recommendation?.recommendation_sources?.length > 0
                              ? recoData.recommendation.recommendation_sources.join(', ')
                              : 'no source documents matched'}
                          </span>
                        </div>
                        {recoData.recommendation?.computed_confidence?.confidence_reason && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Calibration:</span>
                            <span style={{ color: 'var(--accent-cyan)' }}>
                              Evidences: {recoData.recommendation.computed_confidence.confidence_reason.evidence_count} · Consensus: {Math.round(recoData.recommendation.computed_confidence.confidence_reason.agreement * 100)}%
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Reproducibility:</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            Model: {recoData.recommendation?.metadata?.model_name || 'local'} · Pack v{recoData.recommendation?.metadata?.domain_pack_version || '1.0.0'} · Planner v{recoData.recommendation?.metadata?.planner_version || '1.5.2'}
                          </span>
                        </div>
                      </div>

                      {/* Advisory Warning */}
                      <div style={{
                        padding: '12px 16px',
                        marginBottom: '20px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        lineHeight: '140%',
                        background: recoData.recommendation?.metadata?.low_confidence_fallback_triggered ? 'rgba(217, 119, 6, 0.1)' : 'rgba(124, 58, 237, 0.08)',
                        borderLeft: recoData.recommendation?.metadata?.low_confidence_fallback_triggered ? '3px solid #d97706' : '3px solid var(--accent-purple)',
                        color: recoData.recommendation?.metadata?.low_confidence_fallback_triggered ? '#f59e0b' : 'var(--text-secondary)'
                      }}>
                        <strong>Advisory Policy</strong>: {recoData.recommendation?.metadata?.execution_policy || 'Recommendations are advisory only. No actions are automatically executed without approval.'}
                      </div>

                      <CandidateCards
                        candidates={recoData.recommendation?.candidate_actions}
                        selectedActionId={recoData.recommendation?.selected_action_id}
                        selectedAction={recoData.recommendation?.selected_action}
                      />

                      {!outcomeResult ? (
                        <ApprovalButtons
                          loading={submitLoading}
                          missingInfo={recoData.recommendation?.metadata?.missing_information}
                          onApprove={(fb) => handleApproval('approved', fb)}
                          onEditClick={handleEditClick}
                          onReject={(fb) => handleApproval('rejected', fb)}
                        />
                      ) : (
                        <div className="outcome-success">
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#6ee7b7' }}>
                            Decision Logged
                          </h3>
                          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Pipeline completed. Episodic memory updated.
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                            <div>Outcome: <strong style={{ color: '#fff' }}>{outcomeResult.outcome?.toUpperCase()}</strong></div>
                            <div>Feedback ID: <code style={{ color: 'var(--accent-cyan)' }}>{outcomeResult.metadata?.outcome_feedback_id}</code></div>
                            <div>Reflection: <span style={{ color: 'var(--accent-emerald)' }}>{outcomeResult.metadata?.reflection_status}</span></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Trace + Evidence */}
                    <div>
                      <div style={{ marginBottom: '30px' }}>
                        <h3 className="domain-detail-label" style={{ marginBottom: '12px' }}>Reasoning Trace</h3>
                        <TraceTimeline trace={recoData.recommendation?.reasoning_trace} />
                      </div>

                      <EvidenceAccordion evidence={recoData.recommendation?.evidence} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          <h2 className="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Domain Settings
          </h2>
          {domain && (
            <div className="domain-card glass">
              <div className="domain-detail-item">
                <div className="domain-detail-label">Description</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '145%' }}>
                  {domain.description}
                </p>
              </div>

              <div className="domain-detail-item">
                <div className="domain-detail-label">Entities</div>
                <div className="domain-tags">
                  {domain.entities?.map(ent => (
                    <span key={ent} className="domain-tag">{ent}</span>
                  ))}
                </div>
              </div>

              <div className="domain-detail-item">
                <div className="domain-detail-label">Success Metrics</div>
                <div className="domain-tags">
                  {domain.success_metrics?.map(metric => (
                    <span key={metric} className="domain-tag" style={{ color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      {metric.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reflection */}
              <div className="domain-detail-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                <div className="domain-detail-label" style={{ color: 'var(--accent-cyan)' }}>Learning Hub</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '135%' }}>
                  Run reflection to generate new heuristics from episodic memory.
                </p>
                <button className="btn-ui btn-primary-ui" onClick={handleReflect} disabled={reflectLoading}
                  style={{ width: '100%', justifyContent: 'center' }}>
                  {reflectLoading ? 'Mining...' : 'Run Reflection'}
                </button>
                {reflectionData && (
                  <div className="reflection-report animate-fadeIn">
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>
                      {reflectionData.status}
                    </h4>
                    <div className="reflection-md">
                      {reflectionData.heuristics || 'Reflection complete. No new patterns found.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Modal */}
      <InteractionModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        onSubmit={handleSubmitInteraction}
        activeDomain={activeDomain}
        loading={interactionLoading}
      />

      {/* Edit Recommendation Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <h3 style={{ margin: '0 0 16px 0', fontFamily: 'var(--heading-font)', color: '#fff' }}>Edit Recommendation & Approve</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Action Title</label>
              <input
                type="text"
                className="edit-input"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Action Description</label>
              <textarea
                className="edit-input"
                value={editedDesc}
                onChange={(e) => setEditedDesc(e.target.value)}
                style={{ width: '100%', height: '80px', padding: '10px', resize: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Feedback Note</label>
              <textarea
                className="edit-input"
                placeholder="Explain the changes or additional logic context..."
                value={editFeedback}
                onChange={(e) => setEditFeedback(e.target.value)}
                style={{ width: '100%', height: '65px', padding: '10px', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-ui btn-secondary-ui" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-ui btn-success-ui"
                onClick={() => {
                  const customAction = {
                    ...(recoData.recommendation?.selected_action || {}),
                    title: editedTitle,
                    description: editedDesc
                  }
                  handleApproval('edited', editFeedback, customAction)
                }}
              >
                Submit Edits & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
