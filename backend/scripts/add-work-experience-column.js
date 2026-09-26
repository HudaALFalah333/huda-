import { query } from '../src/lib/db.js'

async function addWorkExperienceColumn() {
  try {
    // Check if column already exists
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'applications' AND column_name = 'work_experience'
    `)
    
    if (checkResult.rows.length > 0) {
      console.log('✅ work_experience column already exists in applications table')
      return
    }
    
    // Add the work_experience column
    await query(`
      ALTER TABLE applications 
      ADD COLUMN work_experience TEXT
    `)
    
    console.log('✅ work_experience column added successfully to applications table')
  } catch (error) {
    console.error('❌ Error adding work_experience column:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

addWorkExperienceColumn()
