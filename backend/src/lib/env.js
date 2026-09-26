import dotenv from 'dotenv'
import { loadEnvFileIfPresent } from './loadEnvFile.js'

// Load `.env` even if written as `KEY : value`
export const envFile = loadEnvFileIfPresent()
dotenv.config()

function required(name, fallback) {
  const val = process.env[name] ?? fallback
  if (!val) throw new Error(`Missing env var: ${name}`)
  return val
}

export const env = {
  PORT: Number(process.env.PORT || 4000),
  CORS_ORIGIN: required('CORS_ORIGIN', 'http://localhost:5173'),
  // For direct DB connection (pg):
  DATABASE_URL: process.env.DATABASE_URL || '',
  // For Supabase HTTP API (optional):
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  // Auth:
  JWT_SECRET: required('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // SMS (optional)
  SMS_ENABLED: String(process.env.SMS_ENABLED || 'false').toLowerCase() === 'true',
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'none', // none | console | twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || '',
  // Email (optional, Gmail SMTP)
  EMAIL_ENABLED: String(process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true',
  EMAIL_USER: process.env.EMAIL_USER || '', // Gmail address
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '', // Gmail app password
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || ''
}


