import { apiFetch } from './apiClient'

export async function listInterviewsHR({ status, from, to, jobId, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', String(status))
  if (from) params.set('from', String(from))
  if (to) params.set('to', String(to))
  if (jobId != null) params.set('job_id', String(jobId))
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return await apiFetch(`/interviews?${params.toString()}`)
}

export async function scheduleInterview({ applicationId, scheduledAt, meetingLink }) {
  return await apiFetch('/interviews', {
    method: 'POST',
    body: JSON.stringify({
      application_id: Number(applicationId),
      scheduled_at: scheduledAt,
      meeting_link: meetingLink || undefined
    })
  })
}

export async function updateInterview(id, updates) {
  return await apiFetch(`/interviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  })
}

export async function cancelInterview(id) {
  return await apiFetch(`/interviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CANCELLED' })
  })
}

export async function deleteInterview(id) {
  return await apiFetch(`/interviews/${id}`, {
    method: 'DELETE'
  })
}


