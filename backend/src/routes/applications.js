import express from 'express'
import { z } from 'zod'

import { pool, query } from '../lib/db.js'
import { createNotification } from '../lib/notifications.js'
import { sendEmail, getApplicationAcceptedEmailTemplate, getApplicationRejectedEmailTemplate } from '../lib/email.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

export const applicationsRouter = express.Router()

const applySchema = z.object({
  job_id: z.number().int().positive(),
  // resume_id: use existing resume by ID (preferred if selecting from uploaded resumes)
  resume_id: z.number().int().positive().optional(),
  // resume: create new resume entry (only if resume_id is not provided)
  resume: z
    .object({
      original_filename: z.string().min(1).max(255),
      file_url: z.string().min(1)
    })
    .optional(),
  skills: z.array(z.string().min(1).max(80)).optional(),
  certifications: z.array(z.string().min(1).max(220)).optional(),
  work_experience: z.string().max(5000).optional(),
  education: z.string().max(500).optional(),
  location: z.string().max(160).optional(),
  professional_summary: z.string().max(5000).optional()
}).refine(data => !data.resume_id || !data.resume, {
  message: "Cannot provide both resume_id and resume object"
})

const statusSchema = z.object({
  status: z.enum(['NEW', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'OFFERED'])
})

function clampInt(val, { min, max, fallback }) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return Math.max(min, Math.min(max, i))
}

/**
 * Calculate match score for an application based on completeness criteria
 * @param {Object} data - Application data
 * @param {boolean|null} hasResume - Whether resume is uploaded
 * @param {number} skillsCount - Number of skills associated
 * @param {boolean} hasWorkExperience - Whether work_experience field is filled
 * @param {boolean} hasEducation - Whether education records exist
 * @param {boolean} hasLocation - Whether location is provided
 * @param {boolean} hasProfessionalSummary - Whether professional_summary is provided
 * @param {number} certificationsCount - Number of certifications
 * @returns {number} Match score from 0-100
 */
function calculateMatchScore({ 
  hasResume, 
  skillsCount, 
  hasWorkExperience,
  workExperienceText,
  hasEducation,
  educationText,
  hasLocation,
  locationText,
  hasProfessionalSummary,
  professionalSummaryText,
  certificationsCount 
}) {
  let score = 0

  // Helper function to evaluate text quality based on word count
  function getTextQualityScore(text, basePoints, qualityBonus = 5) {
    if (!text || text.trim().length === 0) return 0
    const wordCount = text.trim().split(/\s+/).length
    // Base points for having text
    let points = basePoints
    // Quality bonus for detailed content
    if (wordCount >= 50) points += qualityBonus // Very detailed
    else if (wordCount >= 30) points += 3 // Detailed
    else if (wordCount >= 15) points += 1 // Good detail
    return points
  }

  // Resume: 15 points (important document)
  if (hasResume) {
    score += 15
  }

  // Skills: More skills = better candidate profile
  // 1 skill = 8 points, 2-3 skills = 15 points, 4-5 skills = 25 points, 6+ skills = 35 points
  if (skillsCount === 0) {
    score += 0
  } else if (skillsCount === 1) {
    score += 8
  } else if (skillsCount >= 2 && skillsCount <= 3) {
    score += 15
  } else if (skillsCount >= 4 && skillsCount <= 5) {
    score += 25
  } else {
    score += 35 // 6+ skills = very skilled candidate
  }

  // Work Experience: Base points + quality bonus for detailed descriptions
  if (workExperienceText && workExperienceText.trim().length > 0) {
    score += getTextQualityScore(workExperienceText, 12, 5) // Base 12, up to 5 bonus
  }

  // Education: Base points + quality bonus for detailed info
  if (educationText && educationText.trim().length > 0) {
    score += getTextQualityScore(educationText, 10, 3) // Base 10, up to 3 bonus
  } else if (hasEducation) {
    // If education exists in DB but no text, still give base points
    score += 8
  }

  // Location: 8 points (important but less critical)
  if (locationText && locationText.trim().length > 0) {
    score += 8
  } else if (hasLocation) {
    score += 8
  }

  // Professional Summary: Base points + quality bonus for detailed summaries
  if (professionalSummaryText && professionalSummaryText.trim().length > 0) {
    score += getTextQualityScore(professionalSummaryText, 12, 5) // Base 12, up to 5 bonus
  }

  // Certifications: 10 points per certification, up to 3 certs (30 points total)
  // More than 3 certs still get 30 points
  score += Math.min(30, certificationsCount * 10)

  // Completeness Bonus: Reward applicants who filled most fields
  let fieldsFilled = 0
  if (hasResume) fieldsFilled++
  if (skillsCount > 0) fieldsFilled++
  if (workExperienceText && workExperienceText.trim().length > 0) fieldsFilled++
  if (educationText && educationText.trim().length > 0) fieldsFilled++
  if (locationText && locationText.trim().length > 0 || hasLocation) fieldsFilled++
  if (professionalSummaryText && professionalSummaryText.trim().length > 0) fieldsFilled++
  if (certificationsCount > 0) fieldsFilled++

  // Completeness bonus: 6+ fields = 5 bonus points, 5 fields = 3 bonus points
  if (fieldsFilled >= 6) {
    score += 5
  } else if (fieldsFilled >= 5) {
    score += 3
  }

  // Cap total at 100 points
  return Math.min(100, Math.max(0, score))
}

/**
 * Calculate match score breakdown - returns both the score and detailed breakdown
 * @param {Object} data - Application data
 * @param {boolean|null} hasResume - Whether resume is uploaded
 * @param {number} skillsCount - Number of skills associated
 * @param {boolean} hasWorkExperience - Whether work_experience field is filled
 * @param {boolean} hasEducation - Whether education records exist
 * @param {boolean} hasLocation - Whether location is provided
 * @param {boolean} hasProfessionalSummary - Whether professional_summary is provided
 * @param {number} certificationsCount - Number of certifications
 * @returns {Object} Object with score and breakdown
 */
function calculateMatchScoreBreakdown({ 
  hasResume, 
  skillsCount, 
  hasWorkExperience,
  workExperienceText = '',
  hasEducation,
  educationText = '',
  hasLocation,
  locationText = '',
  hasProfessionalSummary,
  professionalSummaryText = '',
  certificationsCount 
}) {
  // Helper function to evaluate text quality based on word count
  function getTextQualityScore(text, basePoints, qualityBonus = 5) {
    if (!text || text.trim().length === 0) return 0
    const wordCount = text.trim().split(/\s+/).length
    let points = basePoints
    if (wordCount >= 50) points += qualityBonus
    else if (wordCount >= 30) points += 3
    else if (wordCount >= 15) points += 1
    return points
  }

  const breakdown = {
    resume: { points: 0, max: 15, earned: hasResume },
    skills: { points: 0, max: 35, count: skillsCount },
    workExperience: { points: 0, max: 17, earned: hasWorkExperience, wordCount: workExperienceText.trim().split(/\s+/).length },
    education: { points: 0, max: 13, earned: hasEducation, wordCount: educationText.trim().split(/\s+/).length },
    location: { points: 0, max: 8, earned: hasLocation },
    professionalSummary: { points: 0, max: 17, earned: hasProfessionalSummary, wordCount: professionalSummaryText.trim().split(/\s+/).length },
    certifications: { points: 0, max: 30, count: certificationsCount },
    completenessBonus: { points: 0, max: 5 }
  }

  // Calculate points using same logic as calculateMatchScore
  breakdown.resume.points = hasResume ? 15 : 0
  
  // Skills: tiered scoring
  if (skillsCount === 0) {
    breakdown.skills.points = 0
  } else if (skillsCount === 1) {
    breakdown.skills.points = 8
  } else if (skillsCount >= 2 && skillsCount <= 3) {
    breakdown.skills.points = 15
  } else if (skillsCount >= 4 && skillsCount <= 5) {
    breakdown.skills.points = 25
  } else {
    breakdown.skills.points = 35
  }
  
  breakdown.workExperience.points = getTextQualityScore(workExperienceText, 12, 5)
  
  if (educationText && educationText.trim().length > 0) {
    breakdown.education.points = getTextQualityScore(educationText, 10, 3)
  } else if (hasEducation) {
    breakdown.education.points = 8
  }
  
  breakdown.location.points = (locationText && locationText.trim().length > 0) || hasLocation ? 8 : 0
  
  breakdown.professionalSummary.points = getTextQualityScore(professionalSummaryText, 12, 5)
  
  breakdown.certifications.points = Math.min(30, certificationsCount * 10)

  // Completeness bonus
  let fieldsFilled = 0
  if (hasResume) fieldsFilled++
  if (skillsCount > 0) fieldsFilled++
  if (workExperienceText && workExperienceText.trim().length > 0) fieldsFilled++
  if (educationText && educationText.trim().length > 0) fieldsFilled++
  if (locationText && locationText.trim().length > 0 || hasLocation) fieldsFilled++
  if (professionalSummaryText && professionalSummaryText.trim().length > 0) fieldsFilled++
  if (certificationsCount > 0) fieldsFilled++

  if (fieldsFilled >= 6) {
    breakdown.completenessBonus.points = 5
  } else if (fieldsFilled >= 5) {
    breakdown.completenessBonus.points = 3
  }

  const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.points, 0)

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown
  }
}

// Helper function to recalculate and update match_score for an application
async function recalculateMatchScore(appId, userId, client = null) {
  const queryFn = client ? (sql, params) => client.query(sql, params) : query

  try {
    // Get all data needed for match score calculation
    const appData = await queryFn(
    `
    select
      a.resume_id,
      a.work_experience,
      count(distinct aps.skill_id)::int as skills_count,
      count(distinct uc.id)::int as certifications_count,
      count(distinct ue.id)::int as education_count,
      up.location,
      up.professional_summary
    from applications a
    left join application_skills aps on aps.application_id = a.id
    left join user_certifications uc on uc.account_id = a.user_account_id
    left join user_education ue on ue.account_id = a.user_account_id
    left join user_profiles up on up.account_id = a.user_account_id
    where a.id = $1 and a.user_account_id = $2
    group by a.id, a.resume_id, a.work_experience, up.location, up.professional_summary
    `,
    [appId, userId]
  )

  if (appData.rows.length === 0) return null

  const data = appData.rows[0]
  
  // Get education text from user_education table
  const educationTextR = await queryFn(
    'select string_agg(degree || \' \' || coalesce(university, \'\'), \' \') as education_text from user_education where account_id = $1',
    [userId]
  )
  const educationText = educationTextR.rows[0]?.education_text || ''
  
  const matchScore = calculateMatchScore({
      hasResume: data.resume_id !== null,
      skillsCount: data.skills_count || 0,
      hasWorkExperience: data.work_experience && data.work_experience.trim().length > 0,
      workExperienceText: data.work_experience || '',
      hasEducation: (data.education_count || 0) > 0,
      educationText: educationText || '',
      hasLocation: data.location && data.location.trim().length > 0,
      locationText: data.location || '',
      hasProfessionalSummary: data.professional_summary && data.professional_summary.trim().length > 0,
      professionalSummaryText: data.professional_summary || '',
      certificationsCount: data.certifications_count || 0
    })

    // Update match_score
    await queryFn(
      'update applications set match_score = $1, updated_at = now() where id = $2',
      [matchScore, appId]
    )
    
    console.log(`[Match Score] App ${appId}: skills=${data.skills_count || 0}, certs=${data.certifications_count || 0}, location=${data.location ? 'yes' : 'no'}, edu=${educationText ? 'yes' : 'no'}, work=${data.work_experience ? 'yes' : 'no'} → Score: ${matchScore}`)
    
    return matchScore
  } catch (error) {
    console.error(`[Match Score] Error calculating score for app ${appId}:`, error)
    return null
  }
}

// POST /applications (USER apply)
applicationsRouter.post('/', requireAuth, requireRole('USER'), async (req, res) => {
  const parsed = applySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  if (!pool) return res.status(500).json({ ok: false, error: 'DB not configured (DATABASE_URL missing)' })

  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const { job_id, resume_id, resume, skills, certifications, work_experience, education, location, professional_summary } = parsed.data

  const client = await pool.connect()
  try {
    await client.query('begin')

    // Ensure job exists and is active
    const jobR = await client.query(`select id, is_active from jobs where id = $1`, [job_id])
    const job = jobR.rows[0]
    if (!job) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, error: 'Job not found' })
    }
    if (job.is_active === false) {
      await client.query('rollback')
      return res.status(409).json({ ok: false, error: 'Job is not active' })
    }

    // Handle resume: use existing resume_id if provided, otherwise create new resume entry
    let resumeId = null
    if (resume_id) {
      // Use existing resume - verify it belongs to the user
      const resumeCheck = await client.query(
        `select id from resumes where id = $1 and account_id = $2`,
        [resume_id, userId]
      )
      if (resumeCheck.rows.length === 0) {
        await client.query('rollback')
        return res.status(403).json({ ok: false, error: 'Resume not found or does not belong to you' })
      }
      resumeId = resume_id
    } else if (resume) {
      // Create new resume entry
      const r = await client.query(
        `
        insert into resumes (account_id, original_filename, file_url)
        values ($1, $2, $3)
        returning id
        `,
        [userId, resume.original_filename, resume.file_url]
      )
      resumeId = r.rows[0]?.id ?? null
    }

    // Insert application (unique per job+user)
    let appId = null
    try {
      const a = await client.query(
        `
        insert into applications (job_id, user_account_id, resume_id, status, work_experience)
        values ($1, $2, $3, 'NEW', $4)
        returning id
        `,
        [job_id, userId, resumeId, work_experience || null]
      )
      appId = a.rows[0]?.id ?? null
    } catch (e) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('unique') || msg.includes('duplicate')) {
        await client.query('rollback')
        return res.status(409).json({ ok: false, error: 'You already applied to this job' })
      }
      throw e
    }

    // Update or insert user profile data (location, professional_summary)
    if (location || professional_summary) {
      await client.query(
        `
        insert into user_profiles (account_id, location, professional_summary)
        values ($1, $2, $3)
        on conflict (account_id) do update
        set location = coalesce(excluded.location, user_profiles.location),
            professional_summary = coalesce(excluded.professional_summary, user_profiles.professional_summary),
            updated_at = now()
        `,
        [userId, location || null, professional_summary || null]
      )
    }

    // Insert education if provided
    if (education) {
      await client.query(
        `
        insert into user_education (account_id, degree, university)
        values ($1, $2, $3)
        `,
        [userId, education, 'Not specified']
      )
    }

    // Upsert skills + link application_skills
    const skillsArray = Array.from(
      new Set((skills || []).map((s) => s.trim()).filter(Boolean))
    )
    if (skillsArray.length) {
      await client.query(
        `
        insert into skills (name)
        select unnest($1::text[])
        on conflict (name) do nothing
        `,
        [skillsArray]
      )

      const skillIdsR = await client.query(
        `
        select id
        from skills
        where name = any($1::text[])
        `,
        [skillsArray]
      )

      const skillIds = skillIdsR.rows.map((r) => r.id)
      if (skillIds.length) {
        await client.query(
          `
          insert into application_skills (application_id, skill_id)
          select $1, unnest($2::bigint[])
          on conflict do nothing
          `,
          [appId, skillIds]
        )
      }
    }

    // Upsert certifications - store in user_certifications
    let certificationsCount = 0
    if (certifications !== undefined) {
      const certsArray = Array.from(
        new Set((certifications || []).map((c) => c.trim()).filter(Boolean))
      )
      
      if (certsArray.length) {
        for (const certName of certsArray) {
          // Check if certification already exists for this user
          const existingCert = await client.query(
            'select id from user_certifications where account_id = $1 and name = $2',
            [userId, certName]
          )
          
          // If not exists, create it
          if (existingCert.rows.length === 0) {
            await client.query(
              'insert into user_certifications (account_id, name) values ($1, $2) returning id',
              [userId, certName]
            )
          }
        }
        certificationsCount = certsArray.length
      } else {
        // Count existing certifications for this user
        const existingCerts = await client.query(
          'select count(*)::int as count from user_certifications where account_id = $1',
          [userId]
        )
        certificationsCount = existingCerts.rows[0]?.count || 0
      }
    } else {
      // Count existing certifications for this user
      const existingCerts = await client.query(
        'select count(*)::int as count from user_certifications where account_id = $1',
        [userId]
      )
      certificationsCount = existingCerts.rows[0]?.count || 0
    }

    // Count skills for this application - use skillsArray.length if we inserted skills, otherwise query DB
    let skillsCount = skillsArray.length
    if (skillsCount === 0) {
      // Only query if we didn't insert any skills (to check for existing ones)
      const skillsCountR = await client.query(
        'select count(*)::int as count from application_skills where application_id = $1',
        [appId]
      )
      skillsCount = skillsCountR.rows[0]?.count || 0
    }

    // Check if user has education
    const educationR = await client.query(
      'select count(*)::int as count from user_education where account_id = $1',
      [userId]
    )
    const hasEducation = (educationR.rows[0]?.count || 0) > 0 || (education && education.trim().length > 0)

    // Get user profile data for location and professional_summary
    const profileR = await client.query(
      'select location, professional_summary from user_profiles where account_id = $1',
      [userId]
    )
    const profile = profileR.rows[0]
    const hasLocation = (location && location.trim().length > 0) || (profile?.location && profile.location.trim().length > 0)
    const hasProfessionalSummary = (professional_summary && professional_summary.trim().length > 0) || (profile?.professional_summary && profile.professional_summary.trim().length > 0)

    // Calculate match score with text content - use provided text or DB text, prioritize provided
    const hasResume = resumeId !== null
    const hasWorkExperience = work_experience && work_experience.trim().length > 0
    const finalEducationText = education || educationTextFromDB || ''
    const finalLocationText = location || profile?.location || ''
    const finalProfessionalSummaryText = professional_summary || profile?.professional_summary || ''

    const matchScore = calculateMatchScore({
      hasResume,
      skillsCount,
      hasWorkExperience,
      workExperienceText: work_experience || '',
      hasEducation,
      educationText: finalEducationText,
      hasLocation,
      locationText: finalLocationText,
      hasProfessionalSummary,
      professionalSummaryText: finalProfessionalSummaryText,
      certificationsCount
    })

    // Update application with calculated match_score
    await client.query(
      'update applications set match_score = $1, updated_at = now() where id = $2',
      [matchScore, appId]
    )

    await client.query('commit')

    // Notify HR(s) about a new application
    try {
      const hrOwner = await query(
        `
        select j.created_by_hr_id, j.title as job_title
        from jobs j
        where j.id = $1
        `,
        [job_id]
      )
      const createdBy = hrOwner.rows[0]?.created_by_hr_id ?? null
      const jobTitle = hrOwner.rows[0]?.job_title ?? 'a job'

      if (createdBy) {
        await createNotification({
          account_id: createdBy,
          title: 'New application received',
          message: `A new candidate applied to "${jobTitle}".`,
          link_url: `/view-applicant-details/hr/${appId}`
        })
      } else {
        const hrs = await query(`select id from accounts where role = 'HR'`)
        await Promise.all(
          hrs.rows.map((x) =>
            createNotification({
              account_id: x.id,
              title: 'New application received',
              message: `A new candidate applied to "${jobTitle}".`,
              link_url: `/view-applicants/hr`
            })
          )
        )
      }
    } catch {
      // don't fail apply if notifications fail
    }

    const full = await query(
      `
      select
        a.id,
        a.status,
        a.match_score,
        a.applied_at,
        a.updated_at,
        j.id as job_id,
        j.title as job_title,
        c.name as company_name,
        r.id as resume_id,
        r.original_filename,
        r.file_url
      from applications a
      join jobs j on j.id = a.job_id
      join companies c on c.id = j.company_id
      left join resumes r on r.id = a.resume_id
      where a.id = $1
      `,
      [appId]
    )

    return res.status(201).json({ ok: true, application: full.rows[0] })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Apply failed' })
  } finally {
    client.release()
  }
})

// GET /applications/me (USER)
applicationsRouter.get('/me', requireAuth, requireRole('USER'), async (req, res) => {
  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })

  // Include latest interview info (if any)
  const r = await query(
    `
    with latest_interview as (
      select distinct on (i.application_id)
        i.application_id,
        i.scheduled_at,
        i.duration_minutes,
        i.meeting_type,
        i.meeting_link,
        i.status as interview_status,
        a2.full_name as hr_interviewer_name
      from interviews i
      left join accounts a2 on a2.id = i.hr_interviewer_id
      order by i.application_id, i.scheduled_at desc
    )
    select
      a.id,
      a.status,
      a.match_score,
      a.applied_at,
      j.id as job_id,
      j.title as job_title,
      c.name as company_name,
      li.scheduled_at as interview_scheduled_at,
      li.duration_minutes as interview_duration_minutes,
      li.meeting_type as interview_meeting_type,
      li.meeting_link as interview_meeting_link,
      li.hr_interviewer_name,
      coalesce(
        jsonb_agg(distinct s.name) filter (where s.name is not null),
        '[]'::jsonb
      ) as skills
    from applications a
    join jobs j on j.id = a.job_id
    join companies c on c.id = j.company_id
    left join latest_interview li on li.application_id = a.id
    left join application_skills aps on aps.application_id = a.id
    left join skills s on s.id = aps.skill_id
    where a.user_account_id = $1
    group by a.id, j.id, c.id, li.scheduled_at, li.duration_minutes, li.meeting_type, li.meeting_link, li.hr_interviewer_name
    order by a.applied_at desc
    limit $2
    offset $3
    `,
    [userId, limit, offset]
  )

  return res.json({ ok: true, applications: r.rows, limit, offset })
})

// GET /applications (HR list)
// query: q, job_id, status, limit, offset
applicationsRouter.get('/', requireAuth, requireRole('HR'), async (req, res) => {
  const hrId = Number(req.auth?.sub)
  if (!Number.isFinite(hrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const q = String(req.query.q || '').trim()
  const jobId = req.query.job_id ? Number(req.query.job_id) : null
  const status = req.query.status ? String(req.query.status) : null
  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })

  const where = []
  const params = []

  // Filter by HR's jobs only
  params.push(hrId)
  where.push(`j.created_by_hr_id = $${params.length}`)

  if (q) {
    params.push(`%${q}%`)
    where.push(
      `(coalesce(u.full_name,'') ilike $${params.length}
        or coalesce(u.email,'') ilike $${params.length}
        or coalesce(u.phone,'') ilike $${params.length}
        or j.title ilike $${params.length}
        or c.name ilike $${params.length})`
    )
  }

  if (jobId && Number.isFinite(jobId)) {
    params.push(jobId)
    where.push(`a.job_id = $${params.length}`)
  }

  if (status) {
    params.push(status)
    where.push(`a.status = $${params.length}`)
  }

  params.push(limit)
  params.push(offset)

  const r = await query(
    `
    select
      a.id,
      a.status,
      a.match_score,
      a.applied_at,
      a.user_account_id,
      a.work_experience,
      j.id as job_id,
      j.title as job_title,
      j.department as job_department,
      c.name as company_name,
      u.id as user_id,
      coalesce(u.full_name, nullif(concat_ws(' ', u.first_name, u.last_name), '')) as full_name,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      up.location,
      up.professional_summary,
      up.active_since_year,
      r.id as resume_id
    from applications a
    join jobs j on j.id = a.job_id
    join companies c on c.id = j.company_id
    join accounts u on u.id = a.user_account_id
    left join user_profiles up on up.account_id = u.id
    left join resumes r on r.id = a.resume_id
    where ${where.join(' and ')}
    order by a.applied_at desc
    limit $${params.length - 1}
    offset $${params.length}
    `,
    params
  )

  // Always recalculate match scores for all applications using new scoring
  const applicationsWithScores = await Promise.all(r.rows.map(async (app) => {
    try {
      // Always recalculate match score for this application (don't check if null)
      const newScore = await recalculateMatchScore(app.id, app.user_account_id)
      // Return application with updated score (use calculated score, fallback to 0)
      return {
        ...app,
        match_score: newScore !== null && newScore !== undefined ? newScore : 0
      }
    } catch (error) {
      console.error(`Error recalculating score for application ${app.id}:`, error)
      // If recalculation fails, return original score
      return {
        ...app,
        match_score: app.match_score || 0
      }
    }
  }))

  return res.json({ ok: true, applications: applicationsWithScores, limit, offset })
})

// GET /applications/:id (HR or owner)
applicationsRouter.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid application id' })

  const requesterId = Number(req.auth?.sub)
  const requesterRole = req.auth?.role
  if (!Number.isFinite(requesterId) || !requesterRole) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const base = await query(
    `
    select
      a.id,
      a.status,
      a.match_score,
      a.applied_at,
      a.updated_at,
      a.job_id,
      a.user_account_id,
      a.work_experience,
      j.title as job_title,
      j.department as job_department,
      c.name as company_name,
      coalesce(u.full_name, nullif(concat_ws(' ', u.first_name, u.last_name), '')) as full_name,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      up.location,
      up.active_since_year,
      up.professional_summary,
      r.id as resume_id,
      r.original_filename,
      r.file_url
    from applications a
    join jobs j on j.id = a.job_id
    join companies c on c.id = j.company_id
    join accounts u on u.id = a.user_account_id
    left join user_profiles up on up.account_id = u.id
    left join resumes r on r.id = a.resume_id
    where a.id = $1
    `,
    [id]
  )
  const row = base.rows[0]
  if (!row) return res.status(404).json({ ok: false, error: 'Application not found' })

  // Always recalculate match_score to ensure it's up to date with new scoring
  let matchScore = row.match_score
  try {
    const recalculatedScore = await recalculateMatchScore(id, row.user_account_id)
    if (recalculatedScore !== null && recalculatedScore !== undefined) {
      matchScore = recalculatedScore
    } else {
      matchScore = matchScore || 0
    }
  } catch (error) {
    console.error(`Error recalculating score for application ${id}:`, error)
    matchScore = matchScore || 0
  }

  // Calculate match score breakdown for display
  const skillsCountR = await query(
    'select count(*)::int as count from application_skills where application_id = $1',
    [id]
  )
  const skillsCount = skillsCountR.rows[0]?.count || 0

  const educationR = await query(
    'select count(*)::int as count from user_education where account_id = $1',
    [row.user_account_id]
  )
  const hasEducation = (educationR.rows[0]?.count || 0) > 0

  const certsR = await query(
    'select count(*)::int as count from user_certifications where account_id = $1',
    [row.user_account_id]
  )
  const certificationsCount = certsR.rows[0]?.count || 0

  const hasResume = row.resume_id !== null
  const hasWorkExperience = row.work_experience && row.work_experience.trim().length > 0
  const hasLocation = row.location && row.location.trim().length > 0
  const hasProfessionalSummary = row.professional_summary && row.professional_summary.trim().length > 0

  // Get education text for breakdown
  const educationTextR = await query(
    'select string_agg(degree || \' \' || coalesce(university, \'\'), \' \') as education_text from user_education where account_id = $1',
    [row.user_account_id]
  )
  const educationText = educationTextR.rows[0]?.education_text || ''
  
  const matchScoreBreakdown = calculateMatchScoreBreakdown({
    hasResume,
    skillsCount,
    hasWorkExperience,
    workExperienceText: row.work_experience || '',
    hasEducation,
    educationText: educationText,
    hasLocation,
    locationText: row.location || '',
    hasProfessionalSummary,
    professionalSummaryText: row.professional_summary || '',
    certificationsCount
  })

  // Owner or HR can view
  const isOwner = requesterRole === 'USER' && requesterId === Number(row.user_account_id)
  const isHr = requesterRole === 'HR'
  if (!isOwner && !isHr) return res.status(403).json({ ok: false, error: 'Forbidden' })

  const education = await query(
    `
    select degree, university, period_text, start_year, end_year
    from user_education
    where account_id = $1
    order by coalesce(end_year, 9999) desc, coalesce(start_year, 0) desc, id desc
    `,
    [row.user_account_id]
  )

  const work = await query(
    `
    select title, company, period_text, start_year, end_year, description
    from user_work_experience
    where account_id = $1
    order by coalesce(end_year, 9999) desc, coalesce(start_year, 0) desc, id desc
    `,
    [row.user_account_id]
  )

  const certs = await query(
    `
    select name, issued_by, issued_year
    from user_certifications
    where account_id = $1
    order by coalesce(issued_year, 0) desc, id desc
    `,
    [row.user_account_id]
  )

  const skills = await query(
    `
    select s.name
    from application_skills aps
    join skills s on s.id = aps.skill_id
    where aps.application_id = $1
    order by s.name
    `,
    [id]
  )

  return res.json({
    ok: true,
    application: {
      id: row.id,
      status: row.status,
      match_score: matchScore,
      match_score_breakdown: matchScoreBreakdown,
      applied_at: row.applied_at,
      updated_at: row.updated_at,
      work_experience: row.work_experience,
      job: {
        id: row.job_id,
        title: row.job_title,
        department: row.job_department,
        company_name: row.company_name
      },
      candidate: {
        id: row.user_account_id,
        full_name: row.full_name,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        location: row.location,
        active_since_year: row.active_since_year,
        professional_summary: row.professional_summary
      },
      resume: row.resume_id
        ? { id: row.resume_id, original_filename: row.original_filename, file_url: row.file_url }
        : null,
      education: education.rows,
      work_experience_list: work.rows,
      certifications: certs.rows,
      skills: skills.rows.map(s => s.name)
    }
  })
})

// PATCH /applications/:id (USER update own application)
const updateApplicationSchema = z.object({
  resume: z
    .object({
      original_filename: z.string().min(1).max(255),
      file_url: z.string().min(1)
    })
    .optional(),
  resume_id: z.number().int().positive().optional(),
  skills: z.array(z.string().min(1).max(80)).optional(),
  certifications: z.array(z.string().min(1).max(220)).optional(),
  work_experience: z.string().max(2000).optional()
})

applicationsRouter.patch('/:id', requireAuth, requireRole('USER'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid application id' })

  const parsed = updateApplicationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  if (!pool) return res.status(500).json({ ok: false, error: 'DB not configured (DATABASE_URL missing)' })

  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  // Check if application exists and belongs to this user
  const checkR = await query('select id, resume_id from applications where id = $1 and user_account_id = $2', [id, userId])
  if (checkR.rowCount === 0) {
    return res.status(404).json({ ok: false, error: 'Application not found or not owned by user' })
  }

  const { resume, resume_id, skills, certifications, work_experience } = parsed.data
  const client = await pool.connect()
  try {
    await client.query('begin')

    // Update work_experience if provided
    if (work_experience !== undefined) {
      await client.query('update applications set work_experience = $1 where id = $2', [work_experience || null, id])
    }

    // Update resume if provided - prioritize resume_id if provided
    if (resume_id) {
      // Use existing resume by ID (ensure it belongs to the user)
      const resumeCheck = await client.query(
        'select id from resumes where id = $1 and account_id = $2',
        [resume_id, userId]
      )
      if (resumeCheck.rows.length > 0) {
        await client.query('update applications set resume_id = $1 where id = $2', [resume_id, id])
      }
    } else if (resume) {
      const existingResumeId = checkR.rows[0].resume_id
      if (existingResumeId) {
        // Update existing resume
        await client.query(
          'update resumes set original_filename = $1, file_url = $2 where id = $3',
          [resume.original_filename, resume.file_url, existingResumeId]
        )
      } else {
        // Create new resume
        const r = await client.query(
          'insert into resumes (account_id, original_filename, file_url) values ($1, $2, $3) returning id',
          [userId, resume.original_filename, resume.file_url]
        )
        const newResumeId = r.rows[0]?.id ?? null
        await client.query('update applications set resume_id = $1 where id = $2', [newResumeId, id])
      }
    }

    // Update skills if provided
    if (skills !== undefined) {
      // Delete existing application_skills
      await client.query('delete from application_skills where application_id = $1', [id])

      const skillsArray = Array.from(
        new Set((skills || []).map((s) => s.trim()).filter(Boolean))
      )
      if (skillsArray.length) {
        // Upsert skills
        await client.query(
          'insert into skills (name) select unnest($1::text[]) on conflict (name) do nothing',
          [skillsArray]
        )

        const skillIdsR = await client.query(
          'select id from skills where name = any($1::text[])',
          [skillsArray]
        )

        const skillIds = skillIdsR.rows.map((r) => r.id)
        if (skillIds.length) {
          await client.query(
            'insert into application_skills (application_id, skill_id) select $1, unnest($2::bigint[]) on conflict do nothing',
            [id, skillIds]
          )
        }
      }
    }

    // Update certifications if provided - store in user_certifications only (application_certifications table may not exist)
    if (certifications !== undefined) {
      const certsArray = Array.from(
        new Set((certifications || []).map((c) => c.trim()).filter(Boolean))
      )
      
      // Store certifications in user_certifications (this table definitely exists)
      // We'll store them as user-level certifications for now
      if (certsArray.length) {
        for (const certName of certsArray) {
          // Check if certification already exists for this user
          const existingCert = await client.query(
            'select id from user_certifications where account_id = $1 and name = $2',
            [userId, certName]
          )
          
          let certId = existingCert.rows[0]?.id
          
          // If not exists, create it
          if (!certId) {
            const certR = await client.query(
              'insert into user_certifications (account_id, name) values ($1, $2) returning id',
              [userId, certName]
            )
            certId = certR.rows[0]?.id
          }
        }
      }
    }

    await client.query('update applications set updated_at = NOW() where id = $1', [id])
    await client.query('commit')

    return res.json({ ok: true, message: 'Application updated successfully' })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Update application failed' })
  } finally {
    client.release()
  }
})

// PATCH /applications/:id/status (HR)
applicationsRouter.patch('/:id/status', requireAuth, requireRole('HR'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid application id' })

  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const r = await query(
    `
    update applications
    set status = $2, updated_at = now()
    where id = $1
    returning id, status, updated_at
    `,
    [id, parsed.data.status]
  )
  const row = r.rows[0]
  if (!row) return res.status(404).json({ ok: false, error: 'Application not found' })

  // Notify the candidate about status change (notification + email)
  try {
    const info = await query(
      `
      select 
        a.user_account_id, 
        j.title as job_title,
        c.name as company_name,
        coalesce(u.full_name, nullif(concat_ws(' ', u.first_name, u.last_name), '')) as candidate_name,
        u.email as candidate_email
      from applications a
      join jobs j on j.id = a.job_id
      join companies c on c.id = j.company_id
      join accounts u on u.id = a.user_account_id
      where a.id = $1
      `,
      [id]
    )
    const userRow = info.rows[0]
    const userId = userRow?.user_account_id
    const jobTitle = userRow?.job_title ?? 'your job application'
    
    if (userId) {
      const titleMap = {
        ACCEPTED: 'Application accepted',
        REJECTED: 'Application rejected',
        UNDER_REVIEW: 'Application under review',
        INTERVIEW_SCHEDULED: 'Interview scheduled',
        OFFERED: 'Offer extended',
        NEW: 'Application received'
      }
      
      // Create in-app notification
      await createNotification({
        account_id: userId,
        title: titleMap[row.status] || 'Application update',
        message: `Your application for "${jobTitle}" is now: ${row.status}.`,
        link_url: `/dashboard/user`
      }).catch(() => {})

      // Send email notification for ACCEPTED or REJECTED
      const candidateEmail = userRow?.candidate_email
      if (candidateEmail && (row.status === 'ACCEPTED' || row.status === 'REJECTED')) {
        let emailHtml = ''
        let emailSubject = ''
        
        if (row.status === 'ACCEPTED') {
          emailHtml = getApplicationAcceptedEmailTemplate({
            candidateName: userRow?.candidate_name || 'Candidate',
            jobTitle,
            companyName: userRow?.company_name
          })
          emailSubject = `Application Accepted - ${jobTitle}`
        } else if (row.status === 'REJECTED') {
          emailHtml = getApplicationRejectedEmailTemplate({
            candidateName: userRow?.candidate_name || 'Candidate',
            jobTitle,
            companyName: userRow?.company_name
          })
          emailSubject = `Application Status Update - ${jobTitle}`
        }

        if (emailHtml && emailSubject) {
          await sendEmail({
            to: candidateEmail,
            subject: emailSubject,
            html: emailHtml
          }).catch(err => console.error('[Application Email] Failed:', err?.message))
        }
      }
    }
  } catch {
    // ignore
  }

  return res.json({ ok: true, application: row })
})

// DELETE /applications/:id (USER delete own application)
applicationsRouter.delete('/:id', requireAuth, requireRole('USER'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid application id' })

  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  try {
    // Check if application exists and belongs to this user
    const checkR = await query('select id, job_id from applications where id = $1 and user_account_id = $2', [id, userId])
    if (checkR.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Application not found or not owned by user' })
    }

    // Delete the application (cascade will handle related interviews)
    await query('delete from applications where id = $1', [id])

    return res.json({ ok: true, message: 'Application deleted successfully' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Failed to delete application' })
  }
})


