import { useState } from 'react'

const CS_TEMPLATES = [
  { label: 'Champion Resigned', type: 'meeting_note', source: 'Customer Success Manager', title: 'Champion Departure', content: 'Our primary champion has left the company. The new interim contact has not responded to outreach. This creates significant renewal risk.', tags: ['champion_change', 'renewal'] },
  { label: 'Budget Freeze', type: 'email', source: 'Finance Team', title: 'Budget Freeze Announced', content: 'Customer announced a company-wide budget freeze effective immediately. All expansion plans and non-essential renewals are under review.', tags: ['budget_freeze'] },
  { label: 'Usage Drop', type: 'product_usage', source: 'Analytics Platform', title: 'Usage Declined 40%', content: 'Product usage has dropped by 40% month-over-month. Key power users have stopped logging in. Feature adoption has stalled.', tags: ['usage_decline'] },
  { label: 'Escalation', type: 'support_ticket', source: 'Support Team', title: 'Critical P1 Incidents', content: 'Three P1 incidents opened in the last week. CTO sent an angry email about SLA breaches. Customer is requesting leadership call to discuss contract termination.', tags: ['escalation'] },
  { label: 'Expansion Request', type: 'meeting_note', source: 'Account Executive', title: 'Expansion Opportunity', content: 'Customer wants to roll out the platform to their EMEA division with 40 additional seats. They need Enterprise tier features.', tags: ['expansion_opportunity'] },
  { label: 'Competitive Threat', type: 'email', source: 'Customer Success Manager', title: 'Competitive Evaluation', content: 'Customer mentioned they are evaluating a competitor product. They received a demo last week and are comparing pricing.', tags: ['competitive_threat'] },
  { label: 'Procurement Delay', type: 'contract_event', source: 'Legal/Procurement', title: 'Procurement Review Started', content: 'Renewal has entered procurement review. Legal team is reviewing terms. Expected 2-3 week delay in contract signing.', tags: ['procurement_delay'] },
  { label: 'Positive NPS', type: 'survey', source: 'NPS Survey', title: 'NPS Improved', content: 'Customer NPS score increased from 6 to 9. Respondent cited excellent support experience and product reliability.', tags: ['positive_sentiment'] },
  { label: 'Pricing Objection', type: 'email', source: 'Customer', title: 'Pricing Concerns', content: 'Customer requested pricing concessions before renewal. They believe current pricing is above market rate and want a 20% discount.', tags: ['pricing_objection'] },
  { label: 'Feature Request', type: 'meeting_note', source: 'Product Team', title: 'Feature Request', content: 'Customer needs advanced reporting capabilities and SSO integration. This is blocking their expansion decision.', tags: ['feature_request'] },
  { label: 'Adoption Growth', type: 'product_usage', source: 'Analytics Platform', title: 'Product Adoption Growing', content: 'New team of 15 users onboarded this week. Feature adoption increased by 25%. Usage is up across all modules.', tags: ['product_adoption_growth'] },
]

const REC_TEMPLATES = [
  { label: 'Candidate Dropoff', type: 'internal_note', source: 'Recruiter', title: 'Candidate Disengaged', content: 'Candidate has not responded to last two outreach attempts. Previously showed strong interest but has gone quiet.', tags: ['candidate_dropoff'] },
  { label: 'Competing Offer', type: 'call_transcript', source: 'Recruiter', title: 'Competing Offer Received', content: 'Candidate disclosed they received a competing offer from another company with higher compensation and remote flexibility.', tags: ['competing_offer'] },
  { label: 'Strong Feedback', type: 'internal_note', source: 'Interview Panel', title: 'Strong Interview Performance', content: 'Candidate received excellent feedback from all interviewers. Technical skills exceeded expectations. Team is highly enthusiastic.', tags: ['strong_fit'] },
  { label: 'Offer Negotiation', type: 'email', source: 'Candidate', title: 'Salary Negotiation', content: 'Candidate is requesting higher base salary and signing bonus. Current offer is below their stated expectations by 15%.', tags: ['salary_concern'] },
  { label: 'Urgent Hire', type: 'internal_note', source: 'Hiring Manager', title: 'Urgent Backfill Needed', content: 'Critical team member departing in 2 weeks. This role needs to be filled immediately to maintain project delivery timelines.', tags: ['urgent_hiring_need'] },
]

const INTERACTION_TYPES = [
  'meeting_note', 'email', 'crm_update', 'call_transcript',
  'support_ticket', 'product_usage', 'survey', 'internal_note', 'contract_event',
]

export default function InteractionModal({ isOpen, onClose, onSubmit, activeDomain, loading }) {
  const [form, setForm] = useState({
    interaction_type: 'meeting_note',
    source: '',
    title: '',
    content: '',
    tags: '',
  })

  if (!isOpen) return null

  const templates = activeDomain === 'customer_success' ? CS_TEMPLATES : REC_TEMPLATES

  const handleTemplate = (tpl) => {
    setForm({
      interaction_type: tpl.type,
      source: tpl.source,
      title: tpl.title,
      content: tpl.content,
      tags: tpl.tags.join(', '),
    })
  }

  const handleSubmit = () => {
    if (!form.content.trim()) return
    onSubmit({
      interaction_type: form.interaction_type,
      source: form.source || 'Manual Entry',
      title: form.title || 'Interaction',
      content: form.content,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass interaction-modal" onClick={(e) => e.stopPropagation()}>
        <div className="interaction-modal-header">
          <h3 style={{ margin: 0, fontFamily: 'var(--heading-font)', color: '#fff' }}>Add Interaction</h3>
          <button className="btn-ui btn-secondary-ui" onClick={onClose} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Close</button>
        </div>

        {/* Templates */}
        <div className="interaction-templates">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Templates</div>
          <div className="template-grid">
            {templates.map((tpl) => (
              <button
                key={tpl.label}
                className="template-btn"
                onClick={() => handleTemplate(tpl)}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="interaction-form-divider" />

        {/* Form */}
        <div className="interaction-form">
          <div className="interaction-form-row">
            <div className="interaction-form-field">
              <label>Type</label>
              <select
                className="edit-input"
                value={form.interaction_type}
                onChange={(e) => setForm({ ...form, interaction_type: e.target.value })}
              >
                {INTERACTION_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="interaction-form-field">
              <label>Source</label>
              <input
                type="text"
                className="edit-input"
                placeholder="e.g. Customer Success Manager"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </div>
          </div>

          <div className="interaction-form-field">
            <label>Title</label>
            <input
              type="text"
              className="edit-input"
              placeholder="Brief summary of the interaction"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="interaction-form-field">
            <label>Content</label>
            <textarea
              className="edit-input"
              placeholder="Describe the interaction details..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              style={{ height: '100px', resize: 'none' }}
            />
          </div>

          <div className="interaction-form-field">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              className="edit-input"
              placeholder="e.g. champion_change, renewal"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button className="btn-ui btn-secondary-ui" onClick={onClose}>Cancel</button>
          <button className="btn-ui btn-primary-ui" onClick={handleSubmit} disabled={loading || !form.content.trim()}>
            {loading ? 'Processing Pipeline...' : 'Submit Interaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
