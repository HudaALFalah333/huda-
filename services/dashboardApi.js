import { apiFetch } from './apiClient'

export async function getDashboardStats() {
  return await apiFetch('/dashboard/stats')
}
