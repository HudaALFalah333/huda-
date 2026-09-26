import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// Remove sslmode from connection string to avoid SSL verification conflicts with Supabase
function normalizeConnectionString(url) {
  if (!url) return url
  return url.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '')
}

const pool = new Pool({
  connectionString: normalizeConnectionString(process.env.DATABASE_URL),
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates (Supabase uses these)
  }
})

async function createTable() {
  const client = await pool.connect()
  try {
    await client.query('begin')
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_skills (
        application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        skill_id       BIGINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
        PRIMARY KEY (application_id, skill_id)
      )
    `)
    
    await client.query('commit')
    console.log('✅ application_skills table created successfully')
  } catch (e) {
    await client.query('rollback').catch(() => {})
    console.error('❌ Failed to create table:', e.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createTable()
