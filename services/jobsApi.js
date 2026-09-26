import { apiFetch } from './apiClient'

export async function listJobs({ q = '', limit = 20, offset = 0, active } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (limit != null) params.set('limit', String(limit))
  if (offset != null) params.set('offset', String(offset))
  if (active !== undefined) params.set('active', String(active))
  return await apiFetch(`/jobs?${params.toString()}`)
}

export async function getJob(id) {
  return await apiFetch(`/jobs/${id}`)
}

export async function createJob(payload) {
  return await apiFetch('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function listMyJobsHR({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return await apiFetch(`/jobs/me?${params.toString()}`)
}

export async function updateJob(id, payload) {
  return await apiFetch(`/jobs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteJob(id) {
  return await apiFetch(`/jobs/${id}`, {
    method: 'DELETE'
  })
}


