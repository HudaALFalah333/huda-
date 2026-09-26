import express from 'express'
import { z } from 'zod'

import { pool, query } from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

export const jobsRouter = express.Router()

function clampInt(val, { min, max, fallback }) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return Math.max(min, Math.min(max, i))
}

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  company_name: z.string().min(1).max(200),
  department: z.string().max(200).optional(),
  location: z.string().max(160).optional(),
  employment_type: z.string().max(60).optional(),
  currency: z.string().max(10).optional().default('JOD'),
  salary_min: z.number().nonnegative().optional(),
  salary_max: z.number().nonnegative().optional(),
  about_role: z.string().optional(),
  requirements_text: z.string().optional(),
  skills: z.array(z.string().min(1).max(80)).optional().default([])
})

// GET /jobs?q=...&limit=...&offset=...&active=true|false
jobsRouter.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })
  const activeParam = req.query.active
  const active =
    activeParam === undefined
      ? undefined
      : String(activeParam).toLowerCase() === 'true'

  const where = []
  const params = []

  if (q) {
    params.push(`%${q}%`)
    where.push(
      `(j.title ilike $${params.length}
        or j.department ilike $${params.length}
        or j.location ilike $${params.length}
        or c.name ilike $${params.length})`
    )
  }

  if (active !== undefined) {
    params.push(active)
    where.push(`j.is_active = $${params.length}`)
  }

  params.push(limit)
  params.push(offset)

  const sql = `
    select
      j.id,
      j.title,
      j.department,
      j.location,
      j.employment_type,
      j.salary_min,
      j.salary_max,
      j.currency,
      j.is_active,
      j.created_at,
      j.updated_at,
      jsonb_build_object('id', c.id, 'name', c.name, 'logo_url', c.logo_url) as company,
      coalesce(
        jsonb_agg(distinct s.name) filter (where s.name is not null),
        '[]'::jsonb
      ) as skills
    from jobs j
    join companies c on c.id = j.company_id
    left join job_skills js on js.job_id = j.id
    left join skills s on s.id = js.skill_id
    ${where.length ? `where ${where.join(' and ')}` : ''}
    group by j.id, c.id
    order by j.created_at desc
    limit $${params.length - 1}
    offset $${params.length}
  `

  // Get total count (same WHERE conditions but without GROUP BY, LIMIT, OFFSET)
  const countParams = []
  const countWhere = []
  
  if (q) {
    countParams.push(`%${q}%`)
    countWhere.push(
      `(j.title ilike $${countParams.length}
        or j.department ilike $${countParams.length}
        or j.location ilike $${countParams.length}
        or c.name ilike $${countParams.length})`
    )
  }
  
  if (active !== undefined) {
    countParams.push(active)
    countWhere.push(`j.is_active = $${countParams.length}`)
  }
  
  const countSql = `
    select count(distinct j.id) as total
    from jobs j
    join companies c on c.id = j.company_id
    ${countWhere.length ? `where ${countWhere.join(' and ')}` : ''}
  `
  const countResult = await query(countSql, countParams)
  const total = Number(countResult.rows[0]?.total || 0)

  const r = await query(sql, params)
  return res.json({ ok: true, jobs: r.rows, limit, offset, total })
})

// GET /jobs/me (HR only - get jobs created by current HR)
jobsRouter.get('/me', requireAuth, requireRole('HR'), async (req, res) => {
  const hrId = Number(req.auth?.sub)
  if (!Number.isFinite(hrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })

  const sql = `
    select
      j.id,
      j.title,
      j.department,
      j.location,
      j.employment_type,
      j.salary_min,
      j.salary_max,
      j.currency,
      j.is_active,
      j.created_at,
      j.updated_at,
      jsonb_build_object('id', c.id, 'name', c.name, 'logo_url', c.logo_url) as company,
      coalesce(
        jsonb_agg(distinct s.name) filter (where s.name is not null),
        '[]'::jsonb
      ) as skills
    from jobs j
    join companies c on c.id = j.company_id
    left join job_skills js on js.job_id = j.id
    left join skills s on s.id = js.skill_id
    where j.created_by_hr_id = $1
    group by j.id, c.id
    order by j.created_at desc
    limit $2
    offset $3
  `

  // Get total count
  const countResult = await query(
    'select count(*) as total from jobs where created_by_hr_id = $1',
    [hrId]
  )
  const total = Number(countResult.rows[0]?.total || 0)

  const r = await query(sql, [hrId, limit, offset])
  return res.json({ ok: true, jobs: r.rows, limit, offset, total })
})

// GET /jobs/:id
jobsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid job id' })

  const sql = `
    select
      j.id,
      j.title,
      j.department,
      j.location,
      j.employment_type,
      j.salary_min,
      j.salary_max,
      j.currency,
      j.about_role,
      j.requirements_text,
      j.is_active,
      j.created_at,
      j.updated_at,
      j.created_by_hr_id,
      jsonb_build_object('id', c.id, 'name', c.name, 'logo_url', c.logo_url) as company,
      coalesce(
        jsonb_agg(distinct s.name) filter (where s.name is not null),
        '[]'::jsonb
      ) as skills
    from jobs j
    join companies c on c.id = j.company_id
    left join job_skills js on js.job_id = j.id
    left join skills s on s.id = js.skill_id
    where j.id = $1
    group by j.id, c.id
  `

  const r = await query(sql, [id])
  const job = r.rows[0]
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' })
  return res.json({ ok: true, job })
})

// POST /jobs (HR only)
jobsRouter.post('/', requireAuth, requireRole('HR'), async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  if (!pool) return res.status(500).json({ ok: false, error: 'DB not configured (DATABASE_URL missing)' })

  const hrId = Number(req.auth.sub)
  if (!Number.isFinite(hrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const body = parsed.data
  const skills = Array.from(
    new Set((body.skills || []).map((s) => s.trim()).filter(Boolean))
  )

  const client = await pool.connect()
  try {
    await client.query('begin')

    // Upsert company by name (unique)
    const companyR = await client.query(
      `
      insert into companies (name)
      values ($1)
      on conflict (name) do update set name = excluded.name
      returning id, name, logo_url
      `,
      [body.company_name]
    )
    const company = companyR.rows[0]

    const jobR = await client.query(
      `
      insert into jobs (
        company_id,
        created_by_hr_id,
        title,
        department,
        location,
        employment_type,
        salary_min,
        salary_max,
        currency,
        about_role,
        requirements_text
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      returning id, created_at
      `,
      [
        company.id,
        hrId,
        body.title,
        body.department ?? null,
        body.location ?? null,
        body.employment_type ?? null,
        body.salary_min ?? null,
        body.salary_max ?? null,
        body.currency ?? 'JOD',
        body.about_role ?? null,
        body.requirements_text ?? null
      ]
    )
    const jobId = jobR.rows[0].id

    // Upsert skills + link job_skills
    if (skills.length) {
      await client.query(
        `
        insert into skills (name)
        select unnest($1::text[])
        on conflict (name) do nothing
        `,
        [skills]
      )

      const skillIdsR = await client.query(
        `
        select id
        from skills
        where name = any($1::text[])
        `,
        [skills]
      )

      const skillIds = skillIdsR.rows.map((r) => r.id)
      if (skillIds.length) {
        await client.query(
          `
          insert into job_skills (job_id, skill_id)
          select $1, unnest($2::bigint[])
          on conflict do nothing
          `,
          [jobId, skillIds]
        )
      }
    }

    await client.query('commit')

    // Return the created job in the same shape as GET /jobs/:id
    const full = await query(
      `
      select
        j.id,
        j.title,
        j.department,
        j.location,
        j.employment_type,
        j.salary_min,
        j.salary_max,
        j.currency,
        j.about_role,
        j.requirements_text,
        j.is_active,
        j.created_at,
        j.updated_at,
        jsonb_build_object('id', c.id, 'name', c.name, 'logo_url', c.logo_url) as company,
        coalesce(
          jsonb_agg(distinct s.name) filter (where s.name is not null),
          '[]'::jsonb
        ) as skills
      from jobs j
      join companies c on c.id = j.company_id
      left join job_skills js on js.job_id = j.id
      left join skills s on s.id = js.skill_id
      where j.id = $1
      group by j.id, c.id
      `,
      [jobId]
    )

    return res.status(201).json({ ok: true, job: full.rows[0] })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Create job failed' })
  } finally {
    client.release()
  }
})

const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  company_name: z.string().min(1).max(200).optional(),
  department: z.string().max(200).nullable().optional(),
  location: z.string().max(160).nullable().optional(),
  employment_type: z.string().max(60).nullable().optional(),
  currency: z.string().max(10).optional(),
  salary_min: z.union([z.number().nonnegative(), z.null()]).optional(),
  salary_max: z.union([z.number().nonnegative(), z.null()]).optional(),
  about_role: z.string().nullable().optional(),
  requirements_text: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  skills: z.array(z.string().min(1).max(80)).optional()
}).refine((data) => {
  // Ensure skills array contains only valid strings
  if (data.skills && Array.isArray(data.skills)) {
    return data.skills.every(s => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 80)
  }
  return true
}, { message: 'Skills must be non-empty strings between 1 and 80 characters' })

// PATCH /jobs/:id (HR only - update own job)
jobsRouter.patch('/:id', requireAuth, requireRole('HR'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid job id' })

  const parsed = updateJobSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  if (!pool) return res.status(500).json({ ok: false, error: 'DB not configured (DATABASE_URL missing)' })

  const hrId = Number(req.auth.sub)
  if (!Number.isFinite(hrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  // Check if job exists and belongs to this HR
  const checkR = await query('select created_by_hr_id from jobs where id = $1', [id])
  const job = checkR.rows[0]
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' })
  if (Number(job.created_by_hr_id) !== hrId) {
    return res.status(403).json({ ok: false, error: 'You can only edit your own jobs' })
  }

  const body = parsed.data
  const skills = body.skills ? Array.from(new Set((body.skills || []).map((s) => s.trim()).filter(Boolean))) : null

  const client = await pool.connect()
  try {
    await client.query('begin')

    // Update company if company_name provided
    if (body.company_name) {
      await client.query(
        `
        insert into companies (name)
        values ($1)
        on conflict (name) do update set name = excluded.name
        `,
        [body.company_name]
      )
      const companyR = await client.query('select id from companies where name = $1', [body.company_name])
      const companyId = companyR.rows[0].id

      await client.query('update jobs set company_id = $1 where id = $2', [companyId, id])
    }

    // Build update query dynamically
    const updates = []
    const params = []
    let paramIdx = 1

    if (body.title !== undefined) {
      updates.push(`title = $${paramIdx++}`)
      params.push(body.title)
    }
    if (body.department !== undefined) {
      updates.push(`department = $${paramIdx++}`)
      params.push(body.department ?? null)
    }
    if (body.location !== undefined) {
      updates.push(`location = $${paramIdx++}`)
      params.push(body.location ?? null)
    }
    if (body.employment_type !== undefined) {
      updates.push(`employment_type = $${paramIdx++}`)
      params.push(body.employment_type ?? null)
    }
    if (body.currency !== undefined) {
      updates.push(`currency = $${paramIdx++}`)
      params.push(body.currency ?? 'JOD')
    }
    if (body.salary_min !== undefined) {
      updates.push(`salary_min = $${paramIdx++}`)
      params.push(body.salary_min ?? null)
    }
    if (body.salary_max !== undefined) {
      updates.push(`salary_max = $${paramIdx++}`)
      params.push(body.salary_max ?? null)
    }
    if (body.about_role !== undefined) {
      updates.push(`about_role = $${paramIdx++}`)
      params.push(body.about_role ?? null)
    }
    if (body.requirements_text !== undefined) {
      updates.push(`requirements_text = $${paramIdx++}`)
      params.push(body.requirements_text ?? null)
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIdx++}`)
      params.push(body.is_active)
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`)
      params.push(id)
      await client.query(
        `update jobs set ${updates.join(', ')} where id = $${paramIdx}`,
        params
      )
    }

    // Update skills if provided
    if (skills !== null) {
      // Delete existing job_skills
      await client.query('delete from job_skills where job_id = $1', [id])

      if (skills.length > 0) {
        // Upsert skills
        await client.query(
          `
          insert into skills (name)
          select unnest($1::text[])
          on conflict (name) do nothing
          `,
          [skills]
        )

        const skillIdsR = await client.query(
          `select id from skills where name = any($1::text[])`,
          [skills]
        )

        const skillIds = skillIdsR.rows.map((r) => r.id)
        if (skillIds.length) {
          await client.query(
            `
            insert into job_skills (job_id, skill_id)
            select $1, unnest($2::bigint[])
            on conflict do nothing
            `,
            [id, skillIds]
          )
        }
      }
    }

    await client.query('commit')

    // Return updated job
    const full = await query(
      `
      select
        j.id,
        j.title,
        j.department,
        j.location,
        j.employment_type,
        j.salary_min,
        j.salary_max,
        j.currency,
        j.about_role,
        j.requirements_text,
        j.is_active,
        j.created_at,
        j.updated_at,
        j.created_by_hr_id,
        jsonb_build_object('id', c.id, 'name', c.name, 'logo_url', c.logo_url) as company,
        coalesce(
          jsonb_agg(distinct s.name) filter (where s.name is not null),
          '[]'::jsonb
        ) as skills
      from jobs j
      join companies c on c.id = j.company_id
      left join job_skills js on js.job_id = j.id
      left join skills s on s.id = js.skill_id
      where j.id = $1
      group by j.id, c.id
      `,
      [id]
    )

    return res.json({ ok: true, job: full.rows[0] })
  } catch (e) {
    await client.query('rollback').catch(() => {})
    return res.status(500).json({ ok: false, error: e?.message || 'Update job failed' })
  } finally {
    client.release()
  }
})

// DELETE /jobs/:id (HR only - delete own job)
jobsRouter.delete('/:id', requireAuth, requireRole('HR'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid job id' })

  const hrId = Number(req.auth.sub)
  if (!Number.isFinite(hrId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  // Check if job exists and belongs to this HR
  const checkR = await query('select created_by_hr_id from jobs where id = $1', [id])
  const job = checkR.rows[0]
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' })
  if (Number(job.created_by_hr_id) !== hrId) {
    return res.status(403).json({ ok: false, error: 'You can only delete your own jobs' })
  }

  try {
    await query('delete from jobs where id = $1', [id])
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Delete job failed' })
  }
})


