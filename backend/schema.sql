-- EJO SUPPORT HR System - SQL Schema (PostgreSQL)
-- This schema is designed directly from the current React pages/routes:
-- - User: jobs list, job details + apply (CV upload), my applications dashboard, profile
-- - HR: dashboard stats, view applicants, applicant details + schedule interview, scheduled interviews, add new job

-- Enable UUIDs if you ever switch IDs to UUIDs (optional)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Core Accounts
-- =========================

CREATE TABLE IF NOT EXISTS accounts (
  id               BIGSERIAL PRIMARY KEY,
  role             VARCHAR(10) NOT NULL CHECK (role IN ('USER', 'HR')),
  first_name       VARCHAR(80),
  last_name        VARCHAR(80),
  full_name        VARCHAR(160),
  email            VARCHAR(255) UNIQUE,
  phone            VARCHAR(40) UNIQUE,
  password_hash    TEXT NOT NULL,
  profile_image_url TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional HR-only extra fields
CREATE TABLE IF NOT EXISTS hr_profiles (
  account_id        BIGINT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  department        VARCHAR(120),
  title             VARCHAR(120),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER (candidate) profile details shown in HR "Applicant Details"
CREATE TABLE IF NOT EXISTS user_profiles (
  account_id            BIGINT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  headline              VARCHAR(160),              -- e.g. "Senior Frontend Developer"
  location              VARCHAR(160),              -- e.g. "Amman, Jordan"
  active_since_year     INT CHECK (active_since_year BETWEEN 1900 AND 2100),
  professional_summary  TEXT,
  total_experience_years INT CHECK (total_experience_years >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_education (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  degree      VARCHAR(200) NOT NULL,
  university  VARCHAR(200) NOT NULL,
  period_text VARCHAR(60),          -- UI currently uses strings like "2015 - 2017"
  start_year  INT CHECK (start_year BETWEEN 1900 AND 2100),
  end_year    INT CHECK (end_year BETWEEN 1900 AND 2100)
);

CREATE TABLE IF NOT EXISTS user_work_experience (
  id           BIGSERIAL PRIMARY KEY,
  account_id   BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  company      VARCHAR(200) NOT NULL,
  period_text  VARCHAR(60),         -- UI currently uses strings like "2020 - Present"
  start_year   INT CHECK (start_year BETWEEN 1900 AND 2100),
  end_year     INT CHECK (end_year BETWEEN 1900 AND 2100),
  description  TEXT
);

CREATE TABLE IF NOT EXISTS user_certifications (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        VARCHAR(220) NOT NULL,
  issued_by   VARCHAR(220),
  issued_year INT CHECK (issued_year BETWEEN 1900 AND 2100)
);

-- =========================
-- Jobs
-- =========================

CREATE TABLE IF NOT EXISTS companies (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL UNIQUE,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id              BIGSERIAL PRIMARY KEY,
  company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  created_by_hr_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  title           VARCHAR(200) NOT NULL,
  department      VARCHAR(200),
  location        VARCHAR(160),
  employment_type VARCHAR(60),      -- "Full-time", "Contract", etc.
  salary_min      NUMERIC(12,2),
  salary_max      NUMERIC(12,2),
  currency        VARCHAR(10) DEFAULT 'JOD',
  about_role      TEXT,
  requirements_text TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id    BIGSERIAL PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS job_skills (
  job_id   BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (job_id, skill_id)
);

-- =========================
-- Applications + CVs
-- =========================

CREATE TABLE IF NOT EXISTS resumes (
  id                BIGSERIAL PRIMARY KEY,
  account_id        BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  file_url          TEXT NOT NULL,     -- can be local path or S3 URL
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id              BIGSERIAL PRIMARY KEY,
  job_id          BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  resume_id       BIGINT REFERENCES resumes(id) ON DELETE SET NULL,
  status          VARCHAR(30) NOT NULL CHECK (
    status IN ('NEW', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'OFFERED')
  ),
  match_score     INT CHECK (match_score BETWEEN 0 AND 100),
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, user_account_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_account_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id, applied_at DESC);

-- =========================
-- Interviews
-- =========================

CREATE TABLE IF NOT EXISTS interviews (
  id               BIGSERIAL PRIMARY KEY,
  application_id   BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  hr_interviewer_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  status           VARCHAR(30) NOT NULL CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 480),
  meeting_type     VARCHAR(40) NOT NULL DEFAULT 'Video Call',
  meeting_link     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_hr_time ON interviews(hr_interviewer_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_app ON interviews(application_id);

-- =========================
-- Notifications (User + HR)
-- =========================

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title       VARCHAR(160) NOT NULL,
  message     TEXT NOT NULL,
  link_url    TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id, created_at DESC);


