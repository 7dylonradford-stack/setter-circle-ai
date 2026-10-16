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
 CREATE TABLE IF NOT EXISTS workplace_progress(
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS member_invites(
  id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'approved',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS member_invites_status ON member_invites(status);
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
 CREATE TABLE IF NOT EXISTS experience_photos(
  slot TEXT PRIMARY KEY,
  media_type TEXT NOT NULL,
  photo BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 ALTER TABLE experience_photos DROP CONSTRAINT IF EXISTS experience_photos_slot_check;
 CREATE TABLE IF NOT EXISTS experience_content(
  content_key TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS experience_leads(
  id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '',
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS experience_leads_created ON experience_leads(created_at DESC);
 CREATE TABLE IF NOT EXISTS experience_events(
  id UUID PRIMARY KEY, event_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS experience_events_created ON experience_events(created_at DESC);
 CREATE TABLE IF NOT EXISTS achievements(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,code)
 );

 -- Persistent, account-owned practice sessions survive server restarts.
 CREATE TABLE IF NOT EXISTS training_sessions(
   id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours')
 );
 CREATE INDEX IF NOT EXISTS training_sessions_active ON training_sessions(user_id,expires_at);
 -- Lesson CMS: unpublished lessons remain hidden until the team publishes them.
 CREATE TABLE IF NOT EXISTS training_lessons(
   id UUID PRIMARY KEY, module_number INTEGER NOT NULL CHECK(module_number BETWEEN 1 AND 11),
   title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
   video_url TEXT, resource_url TEXT, duration_min INTEGER NOT NULL DEFAULT 0,
   sort_order INTEGER NOT NULL DEFAULT 0, published BOOLEAN NOT NULL DEFAULT FALSE,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS training_lessons_module_order ON training_lessons(module_number,sort_order);
 CREATE TABLE IF NOT EXISTS lesson_progress(
   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
   completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   PRIMARY KEY(user_id,lesson_id)
 );
 -- Submitted work and mentor feedback are distinct from self-declared completion.
 ALTER TABLE programme_progress ADD COLUMN IF NOT EXISTS mentor_status TEXT NOT NULL DEFAULT 'not_submitted';
 ALTER TABLE programme_progress ADD COLUMN IF NOT EXISTS mentor_feedback TEXT;
 ALTER TABLE programme_progress ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
 CREATE TABLE IF NOT EXISTS mentor_submissions(
   id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   category TEXT NOT NULL, subject TEXT NOT NULL,
   submission TEXT NOT NULL,
   status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','needs_changes')),
   feedback TEXT, reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
   submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ
 );
 CREATE INDEX IF NOT EXISTS mentor_submissions_user ON mentor_submissions(user_id,submitted_at DESC);
 CREATE TABLE IF NOT EXISTS weekly_reviews(
   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   week_start DATE NOT NULL, review JSONB NOT NULL,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   PRIMARY KEY(user_id,week_start)
 );
 -- Students own their job-application status, not the listing owner.
 CREATE TABLE IF NOT EXISTS job_applications(
   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
   status TEXT NOT NULL DEFAULT 'saved'
     CHECK(status IN ('saved','applied','interview','offer','placed','rejected')),
   notes TEXT NOT NULL DEFAULT '',
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   PRIMARY KEY(user_id,opportunity_id)
 );
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS salary_text TEXT NOT NULL DEFAULT '';
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Appointment Setting';
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
 CREATE TABLE IF NOT EXISTS skill_assessments(
   id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','needs_changes')),
   notes TEXT NOT NULL DEFAULT '', feedback TEXT,
   approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ
 );
 CREATE INDEX IF NOT EXISTS skill_assessments_user ON skill_assessments(user_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS earned_certificates(
   id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   certificate_type TEXT NOT NULL,
   approved_by UUID NOT NULL REFERENCES users(id),
   issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   UNIQUE(user_id,certificate_type)
 );
 `);
}
export async function q(text,params=[]){if(!pool)throw new Error("Database unavailable");return pool.query(text,params)}
