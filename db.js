import pg from "pg";
const {Pool}=pg;
export const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined}):null;

export async function initDb(){
 if(!pool){console.warn("DATABASE_URL not set; persistent platform features disabled");return}
 await pool.query(`
 CREATE TABLE IF NOT EXISTS users(
  id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
  last_active DATE, current_track TEXT NOT NULL DEFAULT 'foundations', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS auth_sessions(
  token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS simulation_results(
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL, difficulty INTEGER NOT NULL, prospect_name TEXT, prospect_role TEXT,
  overall_score INTEGER NOT NULL, scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb, debrief JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS simulation_results_user_created ON simulation_results(user_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS daily_attempts(\n  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, challenge_date DATE NOT NULL, simulation_id UUID REFERENCES simulation_results(id) ON DELETE SET NULL, score INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,challenge_date)\n );\n CREATE TABLE IF NOT EXISTS roadmap_progress(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, day_number INTEGER NOT NULL CHECK(day_number BETWEEN 1 AND 40),
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb, evidence TEXT, assessment_score INTEGER, completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,day_number)
 );
 CREATE TABLE IF NOT EXISTS course_modules(
  id UUID PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, published BOOLEAN NOT NULL DEFAULT FALSE
 );
 CREATE TABLE IF NOT EXISTS course_lessons(
  id UUID PRIMARY KEY, module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE, title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', video_url TEXT, notes TEXT NOT NULL DEFAULT '', resource_url TEXT, position INTEGER NOT NULL,
  practice_skill TEXT, published BOOLEAN NOT NULL DEFAULT FALSE
 );
 CREATE TABLE IF NOT EXISTS lesson_progress(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,lesson_id)
 );
 CREATE TABLE IF NOT EXISTS job_opportunities(
  id UUID PRIMARY KEY, company TEXT NOT NULL, title TEXT NOT NULL, niche TEXT, description TEXT NOT NULL DEFAULT '',
  compensation TEXT, timezone TEXT, experience TEXT, apply_url TEXT, status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS job_applications(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, job_id UUID NOT NULL REFERENCES job_opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'saved', notes TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,job_id)
 );
 CREATE TABLE IF NOT EXISTS resources(
  id UUID PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', url TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE, position INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS achievements(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,code)
 );
 `);
}
export async function q(text,params=[]){if(!pool)throw new Error("Database unavailable");return pool.query(text,params)}
