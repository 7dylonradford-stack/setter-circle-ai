import pg from "pg";
const {Pool}=pg;
export const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined}):null;

export async function initDb(){
 if(!pool){console.warn("DATABASE_URL not set; persistent platform features disabled");return}
 await pool.query(`
 CREATE TABLE IF NOT EXISTS users(
  id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
  last_active DATE, current_track TEXT NOT NULL DEFAULT 'foundations', access_status TEXT NOT NULL DEFAULT 'active', access_expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 ALTER TABLE users ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'active';
 ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
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
 CREATE TABLE IF NOT EXISTS daily_attempts(\n  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, challenge_date DATE NOT NULL, simulation_id UUID REFERENCES simulation_results(id) ON DELETE SET NULL, score INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,challenge_date)\n );\n CREATE TABLE IF NOT EXISTS password_reset_tokens(\n  token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n );\n CREATE INDEX IF NOT EXISTS password_reset_user_created ON password_reset_tokens(user_id,created_at DESC);\n CREATE TABLE IF NOT EXISTS programme_progress(\n  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 40),\n  completed BOOLEAN NOT NULL DEFAULT FALSE, proof_note TEXT, completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,day)\n );\n CREATE TABLE IF NOT EXISTS opportunities(\n  id UUID PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, description TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'Appointment Setter',\n  location TEXT NOT NULL DEFAULT 'Remote', apply_url TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n );\n CREATE TABLE IF NOT EXISTS referral_challenges(
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL, reward_pence INTEGER NOT NULL, duration_days INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  referred_name TEXT, referred_email TEXT, verified_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,challenge_date)
 );
 CREATE INDEX IF NOT EXISTS referral_challenges_user_created ON referral_challenges(user_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS achievements(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,code)
 );
 `);
}
export async function q(text,params=[]){if(!pool)throw new Error("Database unavailable");return pool.query(text,params)}
