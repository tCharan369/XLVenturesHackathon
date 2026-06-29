/**
 * API Service Layer — all backend calls go through here.
 */

const API_BASE = 'http://localhost:8000/api/v1'

export async function fetchDomain(domainName) {
  const res = await fetch(`${API_BASE}/domain?domain=${domainName}`)
  if (!res.ok) throw new Error(`Failed to fetch domain: ${res.status}`)
  return res.json()
}

export async function fetchAccounts(domainName) {
  const res = await fetch(`${API_BASE}/accounts?domain=${domainName}`)
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`)
  return res.json()
}

export async function postRecommend(domainPackId, entityId, interaction = null) {
  const body = { domain_pack_id: domainPackId, entity_id: entityId }
  if (interaction) body.interaction = interaction

  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Recommend failed: ${res.status}`)
  return res.json()
}

export async function postApprove(threadId, outcome, feedbackText = null, editedAction = null) {
  const body = {
    thread_id: threadId,
    outcome,
    feedback_text: feedbackText || `${outcome.charAt(0).toUpperCase() + outcome.slice(1)} via Decision Hub UI.`,
  }
  if (outcome === 'edited' && editedAction) {
    body.edited_action = editedAction
  }

  const res = await fetch(`${API_BASE}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Approve failed: ${res.status}`)
  return res.json()
}

export async function postReflect(domainPackId) {
  const res = await fetch(`${API_BASE}/reflect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain_pack_id: domainPackId }),
  })
  if (!res.ok) throw new Error(`Reflect failed: ${res.status}`)
  return res.json()
}

export async function fetchHistory(domainName) {
  const res = await fetch(`${API_BASE}/history?domain=${domainName}`)
  if (!res.ok) throw new Error(`History failed: ${res.status}`)
  return res.json()
}

export async function fetchHeuristics(domainName) {
  const res = await fetch(`${API_BASE}/heuristics?domain=${domainName}`)
  if (!res.ok) throw new Error(`Heuristics failed: ${res.status}`)
  return res.json()
}

export async function fetchTraces() {
  const res = await fetch(`${API_BASE}/traces`)
  if (!res.ok) throw new Error(`Traces failed: ${res.status}`)
  return res.json()
}

export async function fetchTrace(threadId) {
  const res = await fetch(`${API_BASE}/trace?thread_id=${threadId}`)
  if (!res.ok) throw new Error(`Trace failed: ${res.status}`)
  return res.json()
}

export async function fetchDomainConfig(domainName) {
  const res = await fetch(`${API_BASE}/domain-config?domain=${domainName}`)
  if (!res.ok) throw new Error(`Failed to fetch domain config: ${res.status}`)
  return res.json()
}

export async function fetchPreviousRecommendation(domainName, entityId) {
  try {
    const res = await fetch(`${API_BASE}/previous-recommendation?domain=${domainName}&entity_id=${entityId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function postInteraction(payload) {
  const res = await fetch(`${API_BASE}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Interaction failed: ${res.status}`)
  return res.json()
}

export async function fetchInteractions(accountId) {
  const res = await fetch(`${API_BASE}/interactions?account_id=${accountId}`)
  if (!res.ok) throw new Error(`Fetch interactions failed: ${res.status}`)
  return res.json()
}

export async function fetchInteractionStats(domainName) {
  const res = await fetch(`${API_BASE}/interactions/stats?domain=${domainName}`)
  if (!res.ok) throw new Error(`Interaction stats failed: ${res.status}`)
  return res.json()
}

export async function fetchRecommendationDiff(domainName, entityId) {
  try {
    const res = await fetch(`${API_BASE}/recommendation-diff?domain=${domainName}&entity_id=${entityId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchRecentInteractions(domainName, limit = 20) {
  const res = await fetch(`${API_BASE}/recent-interactions?domain=${domainName}&limit=${limit}`)
  if (!res.ok) throw new Error(`Recent interactions failed: ${res.status}`)
  return res.json()
}


