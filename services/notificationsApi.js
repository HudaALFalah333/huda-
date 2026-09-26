import { apiFetch } from './apiClient'

export async function listMyNotifications({ unread, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (unread !== undefined) params.set('unread', String(unread))
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return await apiFetch(`/notifications/me?${params.toString()}`)
}

export async function markNotificationRead(id, is_read = true) {
  return await apiFetch(`/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read })
  })
}

export async function markAllNotificationsRead() {
  return await apiFetch('/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({ is_read: true })
  })
}


