import { apiFetch, setAuthSession } from './apiClient'

function normalizePhone(phone) {
  return String(phone || '').replaceAll(' ', '').trim()
}

export async function signupUser({ firstName, lastName, email, phone, password, resumeFileName }) {
  const res = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      role: 'USER',
      first_name: firstName,
      last_name: lastName,
      email,
      phone: normalizePhone(phone),
      password,
      resume: resumeFileName
        ? {
            original_filename: resumeFileName,
            file_url: `local://${encodeURIComponent(resumeFileName)}`
          }
        : undefined
    })
  })
  if (res?.token) setAuthSession({ token: res.token, role: 'USER' })
  return res
}

export async function login({ role, email, password }) {
  const raw = String(email || '').trim()
  const identifier = raw.includes('@') ? raw : raw.replaceAll(' ', '')
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ role, email: identifier, password })
  })
  if (res?.token) setAuthSession({ token: res.token, role })
  return res
}

export async function getCurrentUser() {
  const res = await apiFetch('/auth/me')
  return res?.account || null
}

export async function updateProfileImage(imageUrl) {
  const res = await apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({
      profile_image_url: imageUrl
    })
  })
  return res?.account || null
}
