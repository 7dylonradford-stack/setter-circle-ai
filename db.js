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
 CREATE TABLE IF NOT EXISTS experience_demo_sessions(
  id UUID PRIMARY KEY, owner_hash TEXT NOT NULL, state JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, busy_token UUID, busy_until TIMESTAMPTZ
 );
 CREATE INDEX IF NOT EXISTS experience_demo_sessions_expiry ON experience_demo_sessions(expires_at);
 CREATE TABLE IF NOT EXISTS achievements(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,code)
 );

 -- Persistent, account-owned practice sessions survive server restarts.
 CREATE TABLE IF NOT EXISTS pending_training_prospects(
  id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,difficulty INTEGER NOT NULL,
  scenario JSONB NOT NULL,expires_at TIMESTAMPTZ NOT NULL DEFAULT(NOW()+INTERVAL '30 minutes')
 );
 CREATE INDEX IF NOT EXISTS pending_training_prospects_user ON pending_training_prospects(user_id,expires_at);
 CREATE TABLE IF NOT EXISTS roleplay_rehearsals(
  id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES simulation_results(id) ON DELETE CASCADE,
  student_turn INTEGER NOT NULL, original_text TEXT NOT NULL,rewrite_text TEXT NOT NULL,
  alternative_reply TEXT NOT NULL,feedback JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS roleplay_rehearsals_user ON roleplay_rehearsals(user_id,simulation_id,created_at DESC);
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
 CREATE TABLE IF NOT EXISTS lesson_knowledge_checks(
  lesson_id UUID PRIMARY KEY REFERENCES training_lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  answer_index INTEGER NOT NULL CHECK(answer_index BETWEEN 0 AND 3),
  explanation TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS lesson_check_attempts(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,lesson_id)
 );
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
 ALTER TABLE mentor_submissions ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
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
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_key TEXT;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS external_id TEXT;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_name TEXT;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_url TEXT;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS workplace_type TEXT;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;
 ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
 CREATE UNIQUE INDEX IF NOT EXISTS opportunities_source_identity ON opportunities(source_key,external_id);
 CREATE TABLE IF NOT EXISTS job_feed_sources(
  source_key TEXT PRIMARY KEY, source_name TEXT NOT NULL,
  attempted_at TIMESTAMPTZ, succeeded_at TIMESTAMPTZ,
  job_count INTEGER NOT NULL DEFAULT 0, error TEXT
 );
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

 -- Advanced Studio: private practice offers and cross-channel conversations.
 CREATE TABLE IF NOT EXISTS advanced_offers(
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, audience TEXT NOT NULL, proposition TEXT NOT NULL,
  price_text TEXT NOT NULL DEFAULT '', objections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS advanced_offers_user ON advanced_offers(user_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS advanced_threads(
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES advanced_offers(id) ON DELETE SET NULL,
  persona JSONB NOT NULL, channel TEXT NOT NULL DEFAULT 'dm',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  phase TEXT NOT NULL DEFAULT 'new', due_at TIMESTAMPTZ,
  last_feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS advanced_threads_user ON advanced_threads(user_id,updated_at DESC);
 -- Workshops, RSVP and cohort learning.
 CREATE TABLE IF NOT EXISTS studio_workshops(
  id UUID PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,
  host TEXT NOT NULL,starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60, join_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS studio_workshop_rsvps(
  workshop_id UUID NOT NULL REFERENCES studio_workshops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(workshop_id,user_id)
 );
 CREATE TABLE IF NOT EXISTS studio_cohorts(
  id UUID PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE
 );
 CREATE TABLE IF NOT EXISTS studio_cohort_members(
  cohort_id UUID NOT NULL REFERENCES studio_cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(cohort_id,user_id)
 );
 -- Optional private student-to-student practice, participation requires explicit joining.
 CREATE TABLE IF NOT EXISTS studio_peer_rooms(
  id UUID PRIMARY KEY,host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'beginner',status TEXT NOT NULL DEFAULT 'open',
  notes TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS studio_peer_messages(
  id UUID PRIMARY KEY,room_id UUID NOT NULL REFERENCES studio_peer_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS studio_peer_messages_room ON studio_peer_messages(room_id,created_at);
 -- Mentor-verified evidence and opt-in publicly shareable skill portfolio.
 CREATE TABLE IF NOT EXISTS studio_portfolios(
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_token UUID UNIQUE NOT NULL,headline TEXT NOT NULL DEFAULT '',
  introduction TEXT NOT NULL DEFAULT '',selected_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS studio_job_projects(
  id UUID PRIMARY KEY,employer_name TEXT NOT NULL,title TEXT NOT NULL,
  brief TEXT NOT NULL,requirements TEXT NOT NULL,
  assessment_rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS studio_job_project_submissions(
  id UUID PRIMARY KEY,project_id UUID NOT NULL REFERENCES studio_job_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',
  mentor_feedback TEXT,reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ,
  UNIQUE(project_id,user_id)
 );
 -- Employer-supplied reports can only be entered by admins until verified agency access exists.
 CREATE TABLE IF NOT EXISTS studio_employer_feedback(
  id UUID PRIMARY KEY,employer TEXT NOT NULL,skill TEXT NOT NULL,
  observation TEXT NOT NULL,verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS studio_outcomes(
  id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,role_title TEXT NOT NULL,started_on DATE,
  status TEXT NOT NULL DEFAULT 'self_reported',
  published_consent BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id,company,role_title)
 );
 -- Structured advanced milestones, challenges, learner preferences and portability.
 CREATE TABLE IF NOT EXISTS studio_progress(
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL,step INTEGER NOT NULL,reflection TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,track,step)
 );
 CREATE TABLE IF NOT EXISTS studio_monthly_challenges(
  id UUID PRIMARY KEY,month_key TEXT NOT NULL UNIQUE,title TEXT NOT NULL,
  briefing TEXT NOT NULL,assessment TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE
 );
 CREATE TABLE IF NOT EXISTS studio_challenge_entries(
  id UUID PRIMARY KEY,challenge_id UUID NOT NULL REFERENCES studio_monthly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission TEXT NOT NULL,review TEXT,completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id,user_id)
 );
 ALTER TABLE studio_outcomes ADD COLUMN IF NOT EXISTS verification_note TEXT;
 CREATE TABLE IF NOT EXISTS studio_settings(
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'en-GB',reminders BOOLEAN NOT NULL DEFAULT FALSE,
  voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 -- Admin-curated agency spaces are drafts until client agreements and proper access are configured.
 CREATE TABLE IF NOT EXISTS studio_agency_spaces(
  id UUID PRIMARY KEY,agency_name TEXT NOT NULL,
  description TEXT NOT NULL,brand_color TEXT NOT NULL DEFAULT '#D0F83B',
  active BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 `);
}
export async function q(text,params=[]){if(!pool)throw new Error("Database unavailable");return pool.query(text,params)}
