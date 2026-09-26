import express from 'express'
import { query } from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

export const dashboardRouter = express.Router()

// GET /dashboard/stats (HR only)
dashboardRouter.get('/stats', requireAuth, requireRole('HR'), async (req, res) => {
  try {
    // Total applicants
    const totalApplicantsResult = await query('select count(*) as total from applications', [])
    const totalApplicants = Number(totalApplicantsResult.rows[0]?.total || 0)

    // Open positions (active jobs)
    const openPositionsResult = await query('select count(*) as total from jobs where is_active = true', [])
    const openPositions = Number(openPositionsResult.rows[0]?.total || 0)

    // Interviews scheduled (confirmed interviews in the future)
    const now = new Date().toISOString()
    const interviewsScheduledResult = await query(
      'select count(*) as total from interviews where status = $1 and scheduled_at >= $2',
      ['CONFIRMED', now]
    )
    const interviewsScheduled = Number(interviewsScheduledResult.rows[0]?.total || 0)

    // Offers extended
    const offersExtendedResult = await query(
      'select count(*) as total from applications where status = $1',
      ['OFFERED']
    )
    const offersExtended = Number(offersExtendedResult.rows[0]?.total || 0)

    return res.json({
      ok: true,
      stats: {
        totalApplicants,
        openPositions,
        interviewsScheduled,
        offersExtended
      }
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to fetch dashboard stats' })
  }
})
