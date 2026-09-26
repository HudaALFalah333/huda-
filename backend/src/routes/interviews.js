import express from 'express'
import { z } from 'zod'

import { pool, query } from '../lib/db.js'
import { createNotification } from '../lib/notifications.js'
import { sendEmail, getInterviewScheduledEmailTemplate, createHrTransporter } from '../lib/email.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

export const interviewsRouter = express.Router()

function clampInt(val, { min, max, fallback }) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return Math.max(min, Math.min(max, i))
}

const createInterviewSchema = z.object({
  application_id: z.number().int().positive(),
  // Optional: if not provided we default to the logged-in HR (scheduler)
  hr_interviewer_id: z.number().int().positive().optional(),
  scheduled_at: z.string().min(1), // ISO timestamp string preferred
  duration_minutes: z.number().int().min(5).max(480).optional().default(60),
  meeting_type: z.string().max(40).optional().default('Video Call'),
  meeting_link: z.string().url().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).optional().default('CONFIRMED')
})

const updateInterviewSchema = z
  .object({
    scheduled_at: z.string().min(1).optional(),
    duration_minutes: z.number().int().min(5).max(480).optional(),
    meeting_type: z.string().max(40).optional(),
    meeting_link: z.string().url().nullable().optional(),
    status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional()
  })
  .refine((x) => Object.keys(x).length > 0, { message: 'No fields to update' })

// POST /interviews (HR schedules an interview for an application)
interviewsRouter.post('/', requireAuth, requireRole('HR'), async (req, res) => {
  const parsed = createInterviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  if (!pool) return res.status(500).json({ ok: false, error: 'DB not configured (DATABASE_URL missing)' })

  const schedulerHrId = Number(req.auth.sub)
  if (!Number.isFinite(schedulerHrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const body = parsed.data
  const interviewerId = body.hr_interviewer_id ?? schedulerHrId

  const client = await pool.connect()
  try {
    await client.query('begin')

    // Ensure application exists
    const a = await client.query(
      `select id, user_account_id, job_id, status from applications where id = $1`,
      [body.application_id]
    )
    const app = a.rows[0]
    if (!app) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, error: 'Application not found' })
    }

    // Create interview
    const ins = await client.query(
      `
      insert into interviews (
        application_id,
        hr_interviewer_id,
        status,
        scheduled_at,
        duration_minutes,
        meeting_type,
        meeting_link
      )
      values ($1,$2,$3,$4,$5,$6,$7)
      returning id
      `,
      [
        body.application_id,
        interviewerId,
        body.status,
        body.scheduled_at,
        body.duration_minutes,
        body.meeting_type,
        body.meeting_link ?? null
      ]
    )
    const interviewId = ins.rows[0].id

    // Update application status to INTERVIEW_SCHEDULED (unless already OFFERED/REJECTED)
    await client.query(
      `
      update applications
      set status = case
        when status in ('REJECTED', 'OFFERED') then status
        else 'INTERVIEW_SCHEDULED'
      end,
      updated_at = now()
      where id = $1
      `,
      [body.application_id]
    )

    await client.query('commit')

    // Notify candidate about interview (notification + email)
    try {
      // Get candidate info and HR email credentials
      // Use schedulerHrId (the one who scheduled) for email, not interviewerId
      const info = await query(
        `
        select 
          a.user_account_id, 
          j.title as job_title,
          c.name as company_name,
          coalesce(u.full_name, nullif(concat_ws(' ', u.first_name, u.last_name), '')) as candidate_name,
          u.email as candidate_email,
          hr.email as hr_email,
          hr.email_password as hr_email_password,
          coalesce(hr_acc.full_name, nullif(concat_ws(' ', hr_acc.first_name, hr_acc.last_name), '')) as hr_name
        from applications a
        join jobs j on j.id = a.job_id
        join companies c on c.id = j.company_id
        join accounts u on u.id = a.user_account_id
        left join accounts hr_acc on hr_acc.id = $2
        left join hr_profiles hr on hr.account_id = $2
        where a.id = $1
        `,
        [body.application_id, schedulerHrId]
      )
      const row = info.rows[0]
      const userId = row?.user_account_id
      const jobTitle = row?.job_title ?? 'your application'
      
      if (userId) {
        // Create in-app notification
        await createNotification({
          account_id: userId,
          title: 'Interview scheduled',
          message: `Your interview for "${jobTitle}" has been scheduled at ${body.scheduled_at}.`,
          link_url: `/dashboard/user`
        }).catch(() => {})

        // Send email notification using HR's email if available, otherwise use global
        const candidateEmail = row?.candidate_email
        if (candidateEmail) {
          const scheduledDate = new Date(body.scheduled_at)
          const emailHtml = getInterviewScheduledEmailTemplate({
            candidateName: row?.candidate_name || 'Candidate',
            jobTitle,
            companyName: row?.company_name,
            scheduledDate: scheduledDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            scheduledTime: scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            durationMinutes: body.duration_minutes || 60,
            meetingType: body.meeting_type || 'Video Call',
            meetingLink: body.meeting_link || null
          })

          // Try to use HR's email credentials if available
          const hrEmail = row?.hr_email
          const hrEmailPassword = row?.hr_email_password
          const hrName = row?.hr_name || 'EJO Support Team'
          
          let emailTransporter = null
          let emailFrom = null
          
          if (hrEmail && hrEmailPassword) {
            // Create transporter using HR's email credentials
            emailTransporter = createHrTransporter(hrEmail, hrEmailPassword)
            emailFrom = hrEmail
            console.log(`[Interview Email] Using HR email: ${hrEmail}`)
          } else {
            console.log('[Interview Email] HR email not configured, using global email settings')
          }

          await sendEmail({
            to: candidateEmail,
            subject: `Interview Scheduled - ${jobTitle}`,
            html: emailHtml,
            transporter: emailTransporter,
            fromEmail: emailFrom,
            fromName: hrName
          }).catch(err => console.error('[Interview Email] Failed:', err?.message))
        }
      }
    } catch {
      // ignore
    }

    const full = await query(
      `
      select
        i.id,
        i.status,
        i.scheduled_at,
        i.duration_minutes,
        i.meeting_type,
        i.meeting_link,
        i.created_at,
        a.id as application_id,
        a.status as application_status,
        j.id as job_id,
        j.title as job_title,
        c.name as company_name,
        u.id as user_id,
        coalesce(u.full_name, nullif(concat_ws(' ', u.first_name, u.last_name), '')) as candidate_name,
        hr.id as hr_interviewer_id,
        coalesce(hr.full_name, nullif(concat_ws(' ', hr.first_name, hr.last_name), '')) as hr_interviewer_name
      from interviews i
      join applications a on a.id = i.application_id
      join jobs j on j.id = a.job_id
      join companies c on c.id = j.company_id
      join accounts u on u.id = a.user_account_id
      left join accounts hr on hr.id = i.hr_interviewer_id
      where i.id = $1
      `,
      [interviewId]
    )

    return res.status(201).json({ ok: true, interview: full.rows[0] })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Schedule interview failed' })
  } finally {
    client.release()
  }
})

// GET /interviews (HR list)
// Query: status, q, from, to, limit, offset
interviewsRouter.get('/', requireAuth, requireRole('HR'), async (req, res) => {
  const hrId = Number(req.auth?.sub)
  if (!Number.isFinite(hrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const status = req.query.status ? String(req.query.status) : null
  const q = String(req.query.q || '').trim()
  const from = req.query.from ? String(req.query.from) : null
  const to = req.query.to ? String(req.query.to) : null
  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })

  const where = []
  const params = []

  // Filter by HR's jobs only (jobs created by this HR)
  params.push(hrId)
  where.push(`j.created_by_hr_id = $${params.length}`)

  // Exclude cancelled interviews
  where.push(`i.status != 'CANCELLED'`)

  if (status) {
    params.push(status)
    where.push(`i.status = $${params.length}`)
  }

  // Filter by job_id if provided
  const jobId = req.query.job_id ? Number(req.query.job_id) : null
  if (jobId && Number.isFinite(jobId)) {
    params.push(jobId)
    where.push(`a.job_id = $${params.length}`)
  }

  if (q) {
    params.push(`%${q}%`)
    where.push(
      `(coalesce(u.full_name,'') ilike $${params.length}
        or coalesce(u.email,'') ilike $${params.length}
        or j.title ilike $${params.length}
        or c.name ilike $${params.length}
        or coalesce(hr.full_name,'') ilike $${params.length})`
    )
  }

  if (from) {
    params.push(from)
    where.push(`i.scheduled_at >= $${params.length}`)
  }

  if (to) {
    params.push(to)
    where.push(`i.scheduled_at <= $${params.length}`)
  }

  // Build main query params: WHERE params + limit + offset
  const mainQueryParams = [...params]
  const limitParamIndex = mainQueryParams.length + 1
  const offsetParamIndex = mainQueryParams.length + 2
  mainQueryParams.push(limit)
  mainQueryParams.push(offset)

  const r = await query(
    `
    select
      i.id,
      i.status,
      i.scheduled_at,
      i.duration_minutes,
      i.meeting_type,
      i.meeting_link,
      i.created_at,
      a.id as application_id,
      j.id as job_id,
      j.title as job_title,
      c.name as company_name,
      u.id as user_id,
      coalesce(u.full_name, nullif(concat_ws(' ', u.first_name, u.last_name), '')) as candidate_name,
      hr.id as hr_interviewer_id,
      coalesce(hr.full_name, nullif(concat_ws(' ', hr.first_name, hr.last_name), '')) as hr_interviewer_name
    from interviews i
    join applications a on a.id = i.application_id
    join jobs j on j.id = a.job_id
    join companies c on c.id = j.company_id
    join accounts u on u.id = a.user_account_id
    left join accounts hr on hr.id = i.hr_interviewer_id
    where ${where.join(' and ')}
    order by i.scheduled_at asc
    limit $${limitParamIndex}
    offset $${offsetParamIndex}
    `,
    mainQueryParams
  )

  // Get total count (same WHERE conditions but without LIMIT, OFFSET)
  const countParams = [...params] // Use the same params for WHERE clause
  const countSql = `
    select count(i.id) as total
    from interviews i
    join applications a on a.id = i.application_id
    join jobs j on j.id = a.job_id
    join companies c on c.id = j.company_id
    join accounts u on u.id = a.user_account_id
    left join accounts hr on hr.id = i.hr_interviewer_id
    where ${where.join(' and ')}
  `
  const countResult = await query(countSql, countParams)
  const total = Number(countResult.rows[0]?.total || 0)

  return res.json({ ok: true, interviews: r.rows, limit, offset, total })
})

// GET /interviews/me (USER list)
interviewsRouter.get('/me', requireAuth, requireRole('USER'), async (req, res) => {
  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })

  const r = await query(
    `
    select
      i.id,
      i.status,
      i.scheduled_at,
      i.duration_minutes,
      i.meeting_type,
      i.meeting_link,
      i.created_at,
      a.id as application_id,
      j.id as job_id,
      j.title as job_title,
      c.name as company_name,
      coalesce(hr.full_name, nullif(concat_ws(' ', hr.first_name, hr.last_name), '')) as hr_interviewer_name
    from interviews i
    join applications a on a.id = i.application_id
    join jobs j on j.id = a.job_id
    join companies c on c.id = j.company_id
    left join accounts hr on hr.id = i.hr_interviewer_id
    where a.user_account_id = $1
    order by i.scheduled_at asc
    limit $2
    offset $3
    `,
    [userId, limit, offset]
  )

  return res.json({ ok: true, interviews: r.rows, limit, offset })
})

// PATCH /interviews/:id (HR update / cancel / complete)
interviewsRouter.patch('/:id', requireAuth, requireRole('HR'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid interview id' })

  const parsed = updateInterviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const fields = parsed.data
  const isCancelling = fields.status === 'CANCELLED'
  
  const client = await pool.connect()
  try {
    await client.query('begin')

    // Get application_id before updating (needed for status update check)
    const appCheck = await client.query(
      'select application_id from interviews where id = $1',
      [id]
    )
    if (appCheck.rows.length === 0) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, error: 'Interview not found' })
    }
    const applicationId = appCheck.rows[0].application_id

    // Update interview
    const sets = []
    const params = [id]
    let idx = 1

    for (const [k, v] of Object.entries(fields)) {
      idx += 1
      sets.push(`${k} = $${idx}`)
      params.push(v)
    }

    const r = await client.query(
      `
      update interviews
      set ${sets.join(', ')}
      where id = $1
      returning id, status, scheduled_at, duration_minutes, meeting_type, meeting_link
      `,
      params
    )
    const row = r.rows[0]
    if (!row) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, error: 'Interview not found' })
    }

    // If cancelling, check if there are any remaining active interviews for this application
    if (isCancelling) {
      // Count active interviews (excludes CANCELLED status)
      // This query runs AFTER the update, so the cancelled interview is excluded
      const activeInterviews = await client.query(
        `
        select count(*)::int as count
        from interviews
        where application_id = $1 and status != 'CANCELLED'
        `,
        [applicationId]
      )
      const activeCount = activeInterviews.rows[0]?.count || 0

      // If no active interviews remain, reset application status from INTERVIEW_SCHEDULED
      if (activeCount === 0) {
        const updateResult = await client.query(
          `
          update applications
          set status = 'UNDER_REVIEW',
              updated_at = now()
          where id = $1 and status = 'INTERVIEW_SCHEDULED'
          returning id, status
          `,
          [applicationId]
        )
        if (updateResult.rows.length > 0) {
          console.log(`[Interview] Reset application ${applicationId} status from INTERVIEW_SCHEDULED to UNDER_REVIEW (no active interviews)`)
        }
      }
    }

    await client.query('commit')
    return res.json({ ok: true, interview: row })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Update interview failed' })
  } finally {
    client.release()
  }
})

// DELETE /interviews/:id (HR delete interview)
interviewsRouter.delete('/:id', requireAuth, requireRole('HR'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid interview id' })

  const client = await pool.connect()
  try {
    await client.query('begin')

    // Get application_id before deleting (needed for status update check)
    const appCheck = await client.query(
      'select application_id from interviews where id = $1',
      [id]
    )
    if (appCheck.rows.length === 0) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, error: 'Interview not found' })
    }
    const applicationId = appCheck.rows[0].application_id

    // Delete the interview
    const deleteResult = await client.query(
      'delete from interviews where id = $1 returning id',
      [id]
    )
    if (deleteResult.rows.length === 0) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, error: 'Interview not found' })
    }

    // Check if there are any remaining active interviews for this application
    // After deletion, count remaining non-cancelled interviews
    const activeInterviews = await client.query(
      `
      select count(*)::int as count
      from interviews
      where application_id = $1 and status != 'CANCELLED'
      `,
      [applicationId]
    )
    const activeCount = activeInterviews.rows[0]?.count || 0

    // If no active interviews remain, reset application status from INTERVIEW_SCHEDULED
    if (activeCount === 0) {
      const updateResult = await client.query(
        `
        update applications
        set status = 'UNDER_REVIEW',
            updated_at = now()
        where id = $1 and status = 'INTERVIEW_SCHEDULED'
        returning id, status
        `,
        [applicationId]
      )
      if (updateResult.rows.length > 0) {
        console.log(`[Interview] Reset application ${applicationId} status from INTERVIEW_SCHEDULED to UNDER_REVIEW (all interviews deleted)`)
      }
    }

    await client.query('commit')
    return res.json({ ok: true, message: 'Interview deleted successfully' })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Delete interview failed' })
  } finally {
    client.release()
  }
})


