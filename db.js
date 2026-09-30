import pg from "pg";
const {Pool}=pg;
export const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined}):null;

export async function initDb(){
 if(!pool){console.warn("DATABASE_URL not set; persistent platform features disabled");return}
 await pool.query(`
 CREATE TABLE IF NOT EXISTS users(
  id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
  last_active DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
 CREATE TABLE IF NOT EXISTS achievements(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,code)
 );
 `);
}
export async function q(text,params=[]){if(!pool)throw new Error("Database unavailable");return pool.query(text,params)}
