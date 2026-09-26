import { apiFetch } from './apiClient'

export async function listApplicationsHR({ q = '', jobId, status, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (jobId != null) params.set('job_id', String(jobId))
  if (status) params.set('status', String(status))
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return await apiFetch(`/applications?${params.toString()}`)
}

export async function getApplicationDetails(id) {
  return await apiFetch(`/applications/${id}`)
}

export async function updateApplicationStatus(id, status) {
  return await apiFetch(`/applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
}


