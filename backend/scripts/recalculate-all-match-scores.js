/**
 * Script to recalculate match scores for all existing applications
 * Run with: node scripts/recalculate-all-match-scores.js
 */

import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '..', 'env.local') })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

// Helper function to calculate match score (more accurate version)
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
    let points = basePoints
    if (wordCount >= 50) points += qualityBonus // Very detailed
    else if (wordCount >= 30) points += 3 // Detailed
    else if (wordCount >= 15) points += 1 // Good detail
    return points
  }

  // Resume: 15 points (important document)
  if (hasResume) score += 15

  // Skills: tiered scoring - more skills = better profile
  if (skillsCount === 0) {
    score += 0
  } else if (skillsCount === 1) {
    score += 8
  } else if (skillsCount >= 2 && skillsCount <= 3) {
    score += 15
  } else if (skillsCount >= 4 && skillsCount <= 5) {
    score += 25
  } else {
    score += 35 // 6+ skills = very skilled
  }

  // Work Experience: Base points + quality bonus
  if (workExperienceText && workExperienceText.trim().length > 0) {
    score += getTextQualityScore(workExperienceText, 12, 5)
  }

  // Education: Base points + quality bonus
  if (educationText && educationText.trim().length > 0) {
    score += getTextQualityScore(educationText, 10, 3)
  } else if (hasEducation) {
    score += 8
  }

  // Location: 8 points
  if (locationText && locationText.trim().length > 0) {
    score += 8
  } else if (hasLocation) {
    score += 8
  }

  // Professional Summary: Base points + quality bonus
  if (professionalSummaryText && professionalSummaryText.trim().length > 0) {
    score += getTextQualityScore(professionalSummaryText, 12, 5)
  }

  // Certifications: 10 points per certification, max 30
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

  if (fieldsFilled >= 6) {
    score += 5
  } else if (fieldsFilled >= 5) {
    score += 3
  }

  return Math.min(100, Math.max(0, score))
}

const pool = new Pool({
  connectionString: DATABASE_URL.replace(/\?sslmode=(require|prefer|verify-ca|verify-full)/, ''),
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
})

async function recalculateAllScores() {
  const client = await pool.connect()
  try {
    console.log('🔄 Fetching all applications...')
    
    // Get all applications
    const appsResult = await client.query(`
      select a.id, a.user_account_id, a.resume_id, a.work_experience
      from applications a
    `)
    
    console.log(`📋 Found ${appsResult.rows.length} applications to recalculate\n`)
    
    let updated = 0
    let errors = 0
    
    for (const app of appsResult.rows) {
      try {
        // Get all data for this application
        const appData = await client.query(`
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
          where a.id = $1
          group by a.id, a.resume_id, a.work_experience, up.location, up.professional_summary
        `, [app.id])
        
        if (appData.rows.length === 0) {
          console.log(`⚠️  App ${app.id}: No data found`)
          errors++
          continue
        }
        
        const data = appData.rows[0]
        
        // Get education text
        const educationTextR = await client.query(
          'select string_agg(degree || \' \' || coalesce(university, \'\'), \' \') as education_text from user_education where account_id = $1',
          [app.user_account_id]
        )
        const educationText = educationTextR.rows[0]?.education_text || ''
        
        // Calculate new score
        const newScore = calculateMatchScore({
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
        
        // Update score
        await client.query(
          'update applications set match_score = $1, updated_at = now() where id = $2',
          [newScore, app.id]
        )
        
        console.log(`✅ App ${app.id}: ${data.skills_count || 0} skills, ${data.education_count || 0} education, location: ${data.location ? 'yes' : 'no'} → Score: ${newScore}`)
        updated++
      } catch (error) {
        console.error(`❌ App ${app.id}: Error - ${error.message}`)
        errors++
      }
    }
    
    console.log(`\n✨ Done! Updated ${updated} applications, ${errors} errors`)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

recalculateAllScores()
