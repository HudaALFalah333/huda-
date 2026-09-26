# Backend (Node.js) - Supabase Postgres

This backend connects to your **Supabase Postgres** database (where you already uploaded `schema.sql`).

## What I need from you (put in `backend/.env`)

### 1) Database connection string (**required**)

Get it from:
- Supabase Dashboard → **Project Settings** → **Database** → **Connection string**

Copy the URI string and set:
- `DATABASE_URL=...`

### 2) API keys (**optional**, only if you later use Supabase API/Storage)

Get them from:
- Supabase Dashboard → **Project Settings** → **API**

Copy:
- `SUPABASE_URL` (Project URL)
- `SUPABASE_ANON_KEY` (public/anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (secret service role key — keep on backend only)

## Create the `.env` file

Create **manually**: `backend/.env`  
Use `backend/env.example` as a template.

Important:
- The file must be named exactly `.env` (NOT `.env.txt`)
- Use `KEY=value` format (avoid `KEY : value`)
- Save the file (Ctrl+S) — if it’s not saved, the backend will read it as empty

## Install & run

From `backend/`:

- `npm install`
- `npm run dev`

Server will run on `http://localhost:4000`.

Test it:
- `GET http://localhost:4000/health`

# Backend - EJO SUPPORT HR System

Backend folder for the HR System application.

## Setup

This folder contains the backend API and server code (Node.js + Express).

## 1) Install

From `backend/`:

- `npm install`

## 2) Env

Create a `.env` file manually (this repo blocks generating `.env*` files). Use `backend/env.example` as a template.

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` (use `http://localhost:5173` for Vite)

## 3) Database

Run:

- `backend/sql/schema.sql`
- then `backend/sql/seed.sql`

## 4) Run

- `npm run dev`

Server will start on `http://localhost:4000` (or `PORT`).

## Auth Endpoints (first features)

- `POST /auth/signup/user`
  - body: `{ firstName, lastName, email?, phone?, password }`
  - returns: `{ token, account }`

- `POST /auth/login/user`
  - body: `{ identifier, password }`  (identifier = email or phone)
  - returns: `{ token, account }`

- `POST /auth/login/hr`
  - body: `{ identifier, password }`
  - returns: `{ token, account }`

- `GET /auth/me`
  - header: `Authorization: Bearer <token>`
  - returns: `{ account }`

## Database (SQL)

The frontend currently uses mock data. These SQL files define a real relational model that matches the current React pages:

- `backend/sql/schema.sql`: tables + relations + indexes (PostgreSQL)
- `backend/sql/seed.sql`: sample data matching the UI mocks

### Quick run (PostgreSQL)

1) Create a database (example: `ejo_support`)
2) Run:

- `schema.sql`
- then `seed.sql`





