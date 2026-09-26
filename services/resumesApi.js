import { apiFetch } from './apiClient'

export async function listMyResumes() {
  return await apiFetch('/resumes/me')
}

export async function uploadResume({ fileName, fileUrl }) {
  return await apiFetch('/resumes/me', {
    method: 'POST',
    body: JSON.stringify({
      original_filename: fileName,
      file_url: fileUrl
    })
  })
}

export async function deleteResume(resumeId) {
  return await apiFetch(`/resumes/${resumeId}`, {
    method: 'DELETE'
  })
}
