import { query } from '../src/lib/db.js'

async function addHrEmailColumns() {
  try {
    // Check if columns already exist
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hr_profiles' 
      AND column_name IN ('email', 'email_password')
    `)
    
    const existingColumns = checkResult.rows.map(r => r.column_name)
    
    if (!existingColumns.includes('email')) {
      await query(`
        ALTER TABLE hr_profiles 
        ADD COLUMN email VARCHAR(255)
      `)
      console.log('✅ email column added to hr_profiles table')
    } else {
      console.log('✓ email column already exists')
    }
    
    if (!existingColumns.includes('email_password')) {
      await query(`
        ALTER TABLE hr_profiles 
        ADD COLUMN email_password TEXT
      `)
      console.log('✅ email_password column added to hr_profiles table')
    } else {
      console.log('✓ email_password column already exists')
    }
    
    console.log('\n✅ HR email columns setup complete!')
    console.log('\nTo configure an HR user\'s email:')
    console.log('  UPDATE hr_profiles SET email = \'hr@example.com\', email_password = \'app_password\' WHERE account_id = <hr_id>;')
  } catch (error) {
    console.error('❌ Error adding HR email columns:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

addHrEmailColumns()
