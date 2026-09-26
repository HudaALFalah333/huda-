const DEFAULT_API_BASE_URL = 'http://localhost:4000'

export function getApiBaseUrl() {
  return (import.meta?.env?.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

const TOKEN_KEY = 'ejo_auth_token'
const ROLE_KEY = 'ejo_auth_role'

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getAuthRole() {
  return localStorage.getItem(ROLE_KEY) || ''
}

export function setAuthSession({ token, role }) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (role) localStorage.setItem(ROLE_KEY, role)
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  const headers = new Headers(options.headers || {})
  if (!headers.has('content-type') && options.body && !(options.body instanceof FormData)) {
    headers.set('content-type', 'application/json')
  }

  const token = getAuthToken()
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`)

  try {
    const resp = await fetch(url, { ...options, headers })
    const text = await resp.text().catch(() => '')
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    if (!resp.ok) {
      const msg = data?.error || data?.message || resp.statusText || 'Request failed'
      const err = new Error(msg)
      err.status = resp.status
      err.data = data
      throw err
    }

    return data
  } catch (error) {
    // Handle network errors (e.g., backend not running, CORS issues)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const networkError = new Error('Cannot connect to backend. Please ensure the backend server is running on ' + baseUrl)
      networkError.isNetworkError = true
      throw networkError
    }
    // Re-throw other errors as-is
    throw error
  }
}


