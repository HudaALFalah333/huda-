import { apiFetch } from './apiClient'

export async function listMyApplications({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return await apiFetch(`/applications/me?${params.toString()}`)
}

export async function deleteApplication(id) {
  return await apiFetch(`/applications/${id}`, {
    method: 'DELETE'
  })
}

export async function updateApplication(id, payload) {
  return await apiFetch(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function getApplication(id) {
  return await apiFetch(`/applications/${id}`)
}


