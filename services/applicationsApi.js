import { apiFetch } from './apiClient'

export async function applyToJob({ jobId, resumeId, resumeFileName, skills = [], certifications = [], workExperience, education, location, professionalSummary }) {
  // NOTE: Frontend doesn't upload yet. We store a placeholder URL in DB for now.
  const fileUrl = resumeFileName ? `local://${encodeURIComponent(resumeFileName)}` : `local://resume`
  return await apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify({
      job_id: Number(jobId),
      // If resumeId is provided, use existing resume. Otherwise, create new resume if resumeFileName is provided
      resume_id: resumeId ? Number(resumeId) : undefined,
      resume: (!resumeId && resumeFileName) ? {
        original_filename: resumeFileName || 'resume',
        file_url: fileUrl
      } : undefined,
      skills: skills && skills.length > 0 ? skills : undefined,
      certifications: certifications && certifications.length > 0 ? certifications : undefined,
      work_experience: workExperience || undefined,
      education: education || undefined,
      location: location || undefined,
      professional_summary: professionalSummary || undefined
    })
  })
}


