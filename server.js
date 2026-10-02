import express from "express";
import OpenAI from "openai";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, q, pool } from "./db.js";

const app = express();
app.use(express.json({limit:"200kb"}));
const accessTokens = new Map();
const ACCESS_TTL = 1000 * 60 * 60 * 24 * 14;
function safeEqual(a,b){const aa=Buffer.from(String(a||"")),bb=Buffer.from(String(b||""));return aa.length===bb.length && crypto.timingSafeEqual(aa,bb)}
async function requireTrainingAccess(req,res,next){
 try{
  const accountToken=String(req.headers["x-account-token"]||"");
  if(accountToken&&pool){
   const r=await q("SELECT u.id,u.email,u.name,u.role,u.xp,u.streak FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",[hashToken(accountToken)]);
   if(r.rows[0]){req.user=r.rows[0];return next()}
  }
  const auth=String(req.headers.authorization||"");
  const token=auth.startsWith("Bearer ")?auth.slice(7):"";
  const exp=accessTokens.get(token);
  if(!token||!exp||exp<Date.now()){if(token)accessTokens.delete(token);return res.status(401).json({error:"Member sign in required"})}
  next();
 }catch(e){res.status(500).json({error:"Account service unavailable"})}
}
app.post("/api/access", (req,res)=>{
 const configured=process.env.TRAINING_PASSWORD;
 if(!configured)return res.status(503).json({error:"Member access is not configured"});
 if(!safeEqual(req.body?.password,configured))return res.status(401).json({error:"Incorrect access password"});
 const token=crypto.randomBytes(32).toString("hex");
 accessTokens.set(token,Date.now()+ACCESS_TTL);
 res.json({token,expires_in:ACCESS_TTL});
});
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const sessions = new Map();
function hashToken(t){return crypto.createHash("sha256").update(t).digest("hex")}
function hashPassword(p,salt=crypto.randomBytes(16).toString("hex")){return salt+":"+crypto.scryptSync(String(p),salt,64).toString("hex")}
function verifyPassword(p,stored){const [salt,key]=String(stored).split(":");if(!salt||!key)return false;const got=crypto.scryptSync(String(p),salt,64);const want=Buffer.from(key,"hex");return got.length===want.length&&crypto.timingSafeEqual(got,want)}
async function currentUser(req){const a=String(req.headers.authorization||"");const t=String(req.headers["x-account-token"]||"")||(a.startsWith("Account ")?a.slice(8):"");if(!t||!pool)return null;const r=await q("SELECT u.id,u.email,u.name,u.role,u.xp,u.streak FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",[hashToken(t)]);return r.rows[0]||null}
async function requireUser(req,res,next){try{const u=await currentUser(req);if(!u)return res.status(401).json({error:"Sign in required"});req.user=u;next()}catch(e){res.status(500).json({error:"Account service unavailable"})}}
const registrationAttempts=new Map();
app.post("/api/account/register",async(req,res)=>{try{if(!pool)return res.status(503).json({error:"Accounts are being prepared"});const rk=String(req.ip||"unknown"),last=registrationAttempts.get(rk)||0;if(Date.now()-last<15000)return res.status(429).json({error:"Please wait before creating another account"});registrationAttempts.set(rk,Date.now());const email=String(req.body?.email||"").trim().toLowerCase(),name=String(req.body?.name||"").trim(),password=String(req.body?.password||""),invite=String(req.body?.invite_code||"");if(!process.env.TRAINING_PASSWORD||!safeEqual(invite,process.env.TRAINING_PASSWORD))return res.status(403).json({error:"A valid Setter Circle member code is required"});if(!email.includes("@")||name.length<2||password.length<8)return res.status(400).json({error:"Use a valid name, email and password of at least 8 characters"});const id=crypto.randomUUID();await q("INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",[id,email,name,hashPassword(password)]);res.json({ok:true})}catch(e){res.status(e.code==="23505"?409:500).json({error:e.code==="23505"?"An account already exists for that email":"Could not create account"})}});
const loginAttempts=new Map();
async function sendPasswordResetEmail(to,link){
 const key=process.env.RESEND_API_KEY,from=process.env.RESET_FROM_EMAIL||"The Setter Circle <onboarding@resend.dev>";
 if(!key){console.warn("RESEND_API_KEY not configured; password reset email not sent");return false}
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],subject:"Reset your Setter Circle password",html:`<div style="font-family:Arial,sans-serif;background:#0b0d0f;color:#f7f8f9;padding:32px"><h2>The Setter Circle</h2><p>We received a request to reset your password.</p><p><a href="${link}" style="display:inline-block;background:#d9ff43;color:#0b0d0f;padding:14px 20px;border-radius:10px;font-weight:700;text-decoration:none">Reset password</a></p><p style="color:#9299a3">This link expires in 30 minutes and can only be used once. If you didn't request this, you can ignore this email.</p></div>`})});
 if(!r.ok){console.error("Password reset email failed",r.status);return false}return true
}
app.post("/api/account/forgot-password",async(req,res)=>{try{
 if(!pool)return res.status(503).json({error:"Accounts are being prepared"});
 const email=String(req.body?.email||"").trim().toLowerCase();
 const generic={ok:true,message:"If an account exists for that email, a reset link has been sent."};
 if(!email.includes("@"))return res.json(generic);
 const r=await q("SELECT id,email FROM users WHERE email=$1",[email]);const u=r.rows[0];if(!u)return res.json(generic);
 await q("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[u.id]);
 const token=crypto.randomBytes(32).toString("hex");
 await q("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 minutes')",[hashToken(token),u.id]);
 const base=process.env.PUBLIC_URL||((req.headers["x-forwarded-proto"]||req.protocol)+"://"+req.get("host"));
 await sendPasswordResetEmail(u.email,base+"/?reset="+encodeURIComponent(token));
 res.json(generic);
 }catch(e){console.error("forgot password",e);res.status(500).json({error:"Could not start password reset"})}});
app.post("/api/account/reset-password",async(req,res)=>{try{
 const token=String(req.body?.token||""),password=String(req.body?.password||"");
 if(token.length<20||password.length<8)return res.status(400).json({error:"Use a password of at least 8 characters"});
 const r=await q("SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW()",[hashToken(token)]),row=r.rows[0];
 if(!row)return res.status(400).json({error:"This reset link is invalid or has expired"});
 await q("BEGIN");try{await q("UPDATE users SET password_hash=$1 WHERE id=$2",[hashPassword(password),row.user_id]);await q("UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=$1",[hashToken(token)]);await q("DELETE FROM auth_sessions WHERE user_id=$1",[row.user_id]);await q("COMMIT")}catch(e){await q("ROLLBACK");throw e}
 res.json({ok:true});
 }catch(e){console.error("reset password",e);res.status(500).json({error:"Could not reset password"})}});

function loginBlocked(key){const x=loginAttempts.get(key);return Boolean(x&&x.until>Date.now())}
function recordLoginFailure(key){const x=loginAttempts.get(key)||{count:0,until:0};x.count++;if(x.count>=8){x.until=Date.now()+900000;x.count=0}loginAttempts.set(key,x)}
app.post("/api/account/login",async(req,res)=>{try{if(!pool)return res.status(503).json({error:"Accounts are being prepared"});const attemptKey=String(req.ip||"unknown")+"|"+String(req.body?.email||"").toLowerCase();if(loginBlocked(attemptKey))return res.status(429).json({error:"Too many sign-in attempts. Try again later"});const email=String(req.body?.email||"").trim().toLowerCase(),password=String(req.body?.password||"");const r=await q("SELECT * FROM users WHERE email=$1",[email]),u=r.rows[0];if(!u||!verifyPassword(password,u.password_hash)){recordLoginFailure(attemptKey);return res.status(401).json({error:"Incorrect email or password"})}loginAttempts.delete(attemptKey);const adminEmail=String(process.env.ADMIN_EMAIL||"").trim().toLowerCase();if(adminEmail&&email===adminEmail&&u.role!=="admin"){await q("UPDATE users SET role='admin' WHERE id=$1",[u.id]);u.role='admin'}const token=crypto.randomBytes(32).toString("hex");await q("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",[hashToken(token),u.id]);res.json({token,user:{name:u.name,email:u.email,role:u.role,xp:u.xp,streak:u.streak}})}catch(e){res.status(500).json({error:"Could not sign in"})}});
app.get("/api/account/me",requireUser,async(req,res)=>{const h=await q("SELECT overall_score,mode,difficulty,prospect_name,prospect_role,scores,created_at FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",[req.user.id]);const a=await q("SELECT code,unlocked_at FROM achievements WHERE user_id=$1 ORDER BY unlocked_at DESC",[req.user.id]);res.json({user:req.user,history:h.rows,achievements:a.rows})});
app.post("/api/account/logout",requireUser,async(req,res)=>{const t=String(req.headers["x-account-token"]||"");if(t)await q("DELETE FROM auth_sessions WHERE token_hash=$1",[hashToken(t)]);res.json({ok:true})});
app.get("/api/account/export",requireUser,async(req,res)=>{const h=await q("SELECT mode,difficulty,prospect_name,prospect_role,overall_score,scores,transcript,debrief,created_at FROM simulation_results WHERE user_id=$1 ORDER BY created_at",[req.user.id]);const a=await q("SELECT code,unlocked_at FROM achievements WHERE user_id=$1 ORDER BY unlocked_at",[req.user.id]);res.json({profile:{name:req.user.name,email:req.user.email,xp:req.user.xp,streak:req.user.streak},simulations:h.rows,achievements:a.rows})});
app.get("/api/leaderboard",requireUser,async(req,res)=>{const r=await q("SELECT u.name,COALESCE(SUM(GREATEST(25,sr.overall_score)),0)::int weekly_xp,COUNT(sr.id)::int reps,COALESCE(ROUND(AVG(sr.overall_score)),0)::int average FROM users u LEFT JOIN simulation_results sr ON sr.user_id=u.id AND sr.created_at>NOW()-INTERVAL '7 days' WHERE u.role='student' GROUP BY u.id ORDER BY weekly_xp DESC,average DESC LIMIT 25");res.json({leaders:r.rows})});
const programmeDays=["Send 15 personalised outreach messages and start 5 genuine networking conversations","Send 20 personalised outreach messages and follow up every reply from Day 1","Start 10 conversations with setters, closers, coaches or agency owners and send 20 prospect messages","Send 25 outreach messages using two different opener styles and note which gets better replies","Follow up every open conversation, send 25 new messages and practise 2 networking roleplays","Send 30 outreach messages and focus on asking natural questions instead of pitching early","Complete a full follow-up sweep, reconnect with 5 useful network contacts and review your first week","Send 30 personalised messages and complete 3 client-acquisition roleplays","Start 10 new networking conversations and ask 3 experienced people useful questions about the industry","Send 30 outreach messages and practise moving 5 conversations from opener into discovery","Follow up every warm conversation and complete 3 discovery-focused roleplays","Send 35 outreach messages and practise identifying situation, goal and problem naturally","Review 5 real conversations, rewrite your weakest messages and complete targeted Smart Practice","Send 35 outreach messages, start 5 new network conversations and follow up all active leads","Practise 5 qualification conversations, then apply the questions naturally in today's outreach","Send 40 outreach messages and focus on identifying genuine fit before suggesting a call","Follow up all active conversations and complete 5 objection-handling roleplays","Send 40 outreach messages and deliberately practise handling real objections without becoming defensive","Reconnect with 10 previous conversations, send 25 new messages and complete 3 advanced roleplays","Run a full pipeline day: 40 new outreach messages, every follow-up due and 5 networking conversations","Audit your profile and positioning, then send 30 messages to prospects who match the role you want","Record 3 personalised practice Looms for real businesses and review clarity, relevance and CTA","Send 5 personalised Looms where appropriate, plus 25 text outreach messages and all follow-ups","Network with 10 setters, closers, founders or sales professionals and create 3 genuine ongoing connections","Send 35 outreach messages, contribute something useful to the community and ask for feedback on one conversation","Complete a full mock setter interview and send 25 outreach messages before reviewing your feedback","Fix the weakest interview answer, practise 3 relevant scenarios and follow up every warm lead","Complete a second mock interview, then send 35 outreach messages using what you have improved","Run a 50-message outreach day while maintaining personalisation and recording replies, conversations and bookings","Follow up every warm lead and revive 10 older conversations with contextual follow-ups","Create or improve your setter CV/profile, practise your introduction and start 5 conversations with people working in sales","Network with 10 people connected to roles you would genuinely want and ask intelligent questions about their work","Approach 10 relevant businesses or hiring contacts directly and send 30 normal prospect outreach messages","Complete 5 on-the-job setter scenarios and apply the weakest skill from them in live conversations","Review your Setter Score, choose the lowest category and complete 5 targeted practice reps","Send 40 outreach messages with one specific skill focus, then review 5 conversations against the Conversation Review Checklist","Follow up every open prospect and role conversation, reconnect with 5 network contacts and complete 3 advanced roleplays","Complete a final mock interview and immediately practise any answer that scores weakly","Complete a final elite roleplay, send 40 outreach messages and review your strongest and weakest live conversations","Run a complete setter day: new outreach, follow-ups, networking, roleplay practice and conversation review","Complete your 40-day review: total outreach, replies, conversations, calls/bookings, network connections and roles pursued; then set your next 30-day targets"];
app.get("/api/programme",requireUser,async(req,res)=>{const r=await q("SELECT day,completed,proof_note,completed_at FROM programme_progress WHERE user_id=$1",[req.user.id]);const by=Object.fromEntries(r.rows.map(x=>[x.day,x]));res.json({days:programmeDays.map((task,i)=>({day:i+1,task,...(by[i+1]||{completed:false,proof_note:null})}))})});
app.post("/api/programme/:day",requireUser,async(req,res)=>{const day=Number(req.params.day),proof=String(req.body?.proof_note||"").trim().slice(0,1000);if(day<1||day>40)return res.status(400).json({error:"Invalid programme day"});const complete=Boolean(req.body?.completed);await q("INSERT INTO programme_progress(user_id,day,completed,proof_note,completed_at,updated_at) VALUES($1,$2,$3,$4,CASE WHEN $3 THEN NOW() ELSE NULL END,NOW()) ON CONFLICT(user_id,day) DO UPDATE SET completed=$3,proof_note=$4,completed_at=CASE WHEN $3 THEN COALESCE(programme_progress.completed_at,NOW()) ELSE NULL END,updated_at=NOW()",[req.user.id,day,complete,proof||null]);res.json({ok:true})});
app.get("/api/opportunities",requireUser,async(req,res)=>{const r=await q("SELECT id,title,company,description,type,location,apply_url,created_at FROM opportunities WHERE active=TRUE ORDER BY created_at DESC LIMIT 50");res.json({opportunities:r.rows})});
app.post("/api/admin/opportunities",requireUser,async(req,res)=>{if(req.user.role!=="admin")return res.status(403).json({error:"Admin only"});const title=String(req.body?.title||"").trim(),company=String(req.body?.company||"").trim(),description=String(req.body?.description||"").trim(),location=String(req.body?.location||"Remote").trim(),apply=String(req.body?.apply_url||"").trim();if(!title||!company||!description)return res.status(400).json({error:"Title, company and description are required"});const id=crypto.randomUUID();await q("INSERT INTO opportunities(id,title,company,description,location,apply_url) VALUES($1,$2,$3,$4,$5,$6)",[id,title,company,description,location,apply||null]);res.json({ok:true,id})});
app.get("/api/daily-challenge",requireUser,async(req,res)=>{
 const day=new Date().toISOString().slice(0,10),seed=[...day].reduce((a,c)=>a+c.charCodeAt(0),0),modes=["network","client","role"],mode=modes[seed%3],difficulty=1+(seed%4),scenario=makePreloadedProspect(seed%PRELOADED_PROSPECT_COUNT,mode,difficulty);
 res.json({date:day,mode,difficulty,scenario});
});
app.get("/api/skills",requireUser,async(req,res)=>{
 const r=await q("SELECT scores FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",[req.user.id]);
 const keys=["conversational_awareness","rapport","discovery","qualification","objection_handling","positioning","cta","naturalness"],out={};
 for(const k of keys){const vals=r.rows.map(x=>Number(x.scores?.[k])).filter(Number.isFinite);out[k]=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null}
 const ranked=Object.entries(out).filter(([,v])=>v!==null).sort((a,b)=>a[1]-b[1]);
 res.json({skills:out,weakest:ranked[0]?.[0]||null,strongest:ranked.at(-1)?.[0]||null});
});
app.get("/api/progression",requireUser,async(req,res)=>{const r=await q("SELECT scores,overall_score FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",[req.user.id]);const reps=r.rows.length,avg=reps?Math.round(r.rows.reduce((a,x)=>a+x.overall_score,0)/reps):0;const stages=[{id:"foundations",name:"Foundations",need:0},{id:"discovery",name:"Discovery",need:3},{id:"objections",name:"Objections",need:8},{id:"qualification",name:"Qualification",need:15},{id:"advanced",name:"Advanced Conversations",need:25},{id:"elite",name:"Elite Setter",need:40}];res.json({reps,average:avg,stages:stages.map(x=>({...x,unlocked:reps>=x.need})),next:stages.find(x=>reps<x.need)||null})});
app.post("/api/practice/weakness",requireUser,async(req,res)=>{const r=await q("SELECT scores FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",[req.user.id]);const keys=["conversational_awareness","rapport","discovery","qualification","objection_handling","positioning","cta","naturalness"],avgs={};for(const k of keys){const v=r.rows.map(x=>Number(x.scores?.[k])).filter(Number.isFinite);avgs[k]=v.length?v.reduce((a,b)=>a+b,0)/v.length:50}const weak=Object.entries(avgs).sort((a,b)=>a[1]-b[1])[0][0],mode=["rapport","naturalness"].includes(weak)?"network":["discovery","positioning"].includes(weak)?"client":"role",scenario=makePreloadedProspect(Math.abs([...weak].reduce((a,c)=>a+c.charCodeAt(0),0))%PRELOADED_PROSPECT_COUNT,mode,3);scenario.objective="Targeted practice: improve "+weak.replaceAll("_"," ")+". "+scenario.objective;scenario.brief+=" Privately create at least one natural opportunity to test "+weak.replaceAll("_"," ")+", but never tell the student the test.";res.json({weakness:weak,mode,difficulty:3,scenario})});
const interviewSchema={type:"object",additionalProperties:false,properties:{score:{type:"integer",minimum:0,maximum:100},communication:{type:"integer",minimum:0,maximum:100},commercial_awareness:{type:"integer",minimum:0,maximum:100},coachability:{type:"integer",minimum:0,maximum:100},strengths:{type:"array",items:{type:"string"},maxItems:4},improvements:{type:"array",items:{type:"string"},maxItems:4},verdict:{type:"string"}},required:["score","communication","commercial_awareness","coachability","strengths","improvements","verdict"]};
const interviewSessions=new Map();
app.post("/api/interview/start",requireUser,async(req,res)=>{const id=crypto.randomUUID();interviewSessions.set(id,{user_id:req.user.id,turn:0,history:[]});res.json({session_id:id,interviewer:"Hiring Manager",message:"Thanks for joining. Start by telling me a little about yourself and why you want an appointment-setting role."})});
app.post("/api/interview/message",requireUser,async(req,res)=>{
 const x=interviewSessions.get(req.body?.session_id);if(!x||x.user_id!==req.user.id)return res.status(404).json({error:"Interview expired"});
 const answer=String(req.body?.message||"").trim().slice(0,2000);if(!answer)return res.status(400).json({error:"Answer required"});
 x.history.push({role:"candidate",text:answer});x.turn++;
 const fallbackQuestions=[
  "What do you think makes someone effective at appointment setting day to day?",
  "Talk me through how you would handle a prospect who replies, “Not interested.”",
  "Imagine your booking numbers have dropped for a week. How would you diagnose what is going wrong?",
  "This role involves rejection and repetitive outreach. How would you stay consistent when results are slow?",
  "Give me an example of feedback you have received and how you applied it."
 ];
 if(x.turn>=6){
  try{
   if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY missing");
   const ev=await client.responses.create({model:process.env.COACH_MODEL||"gpt-5.6-sol",input:"You are a demanding appointment-setting hiring manager. Evaluate this mock interview fairly based only on evidence. Transcript:\n"+x.history.map(h=>h.role.toUpperCase()+": "+h.text).join("\n"),reasoning:{effort:"medium"},max_output_tokens:900,text:{format:{type:"json_schema",name:"interview_review",strict:true,schema:interviewSchema}}});
   const review=JSON.parse(ev.output_text);interviewSessions.delete(req.body.session_id);return res.json({complete:true,review});
  }catch(e){
   console.error("Interview evaluation AI failed:",e?.status,e?.code,e?.message);
   const answers=x.history.filter(h=>h.role==="candidate").map(h=>h.text),words=answers.join(" ").trim().split(/\s+/).filter(Boolean).length;
   const score=Math.max(45,Math.min(78,50+Math.round(words/18)));
   interviewSessions.delete(req.body.session_id);
   return res.json({complete:true,review:{score,communication:score,commercial_awareness:Math.max(40,score-5),coachability:score,strengths:["Completed the full mock interview","Gave direct answers under interview conditions"],improvements:["Use specific examples and measurable evidence","Show clearer understanding of setter KPIs and qualification","Structure scenario answers as action, reasoning and outcome"],verdict:"Mock interview completed. AI scoring was temporarily unavailable, so this is a basic fallback review rather than a full AI assessment."}});
  }
 }
 try{
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY missing");
  const rr=await client.responses.create({model:process.env.COACH_MODEL||"gpt-5.6-sol",input:"Act only as a realistic sales hiring manager interviewing a candidate for an appointment setter role. Ask ONE concise follow-up question based on their exact previous answers. Challenge vague claims, explore experience, resilience, communication, coachability, handling rejection, KPIs, and scenarios. Do not coach them during the interview. Transcript:\n"+x.history.map(h=>h.role.toUpperCase()+": "+h.text).join("\n"),max_output_tokens:140});
  const msg=rr.output_text?.trim();if(!msg)throw new Error("Empty interview response");x.history.push({role:"interviewer",text:msg});return res.json({complete:false,message:msg,turn:x.turn});
 }catch(e){
  console.error("Interview question AI failed:",e?.status,e?.code,e?.message);
  const msg=fallbackQuestions[Math.min(x.turn-1,fallbackQuestions.length-1)];
  x.history.push({role:"interviewer",text:msg});return res.json({complete:false,message:msg,turn:x.turn,fallback:true});
 }
});
app.get("/api/admin/students",requireUser,async(req,res)=>{
 if(req.user.role!=="admin")return res.status(403).json({error:"Admin access required"});
 const r=await q("SELECT u.id,u.name,u.email,u.xp,u.streak,u.last_active,COUNT(sr.id)::int reps,COALESCE(ROUND(AVG(sr.overall_score)),0)::int average FROM users u LEFT JOIN simulation_results sr ON sr.user_id=u.id WHERE u.role='student' GROUP BY u.id ORDER BY u.last_active DESC NULLS LAST,u.created_at DESC");
 res.json({students:r.rows});
});

app.get("/api/admin/student/:id",requireUser,async(req,res)=>{
 if(req.user.role!=="admin")return res.status(403).json({error:"Admin access required"});
 const u=await q("SELECT id,name,email,xp,streak,last_active,created_at FROM users WHERE id=$1 AND role='student'",[req.params.id]);
 if(!u.rows[0])return res.status(404).json({error:"Student not found"});
 const h=await q("SELECT mode,difficulty,prospect_name,overall_score,scores,created_at FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[req.params.id]);
 res.json({student:u.rows[0],history:h.rows});
});


app.post("/api/admin/promote",requireUser,async(req,res)=>{if(process.env.ADMIN_BOOTSTRAP_EMAIL&&req.user.email===process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()){await q("UPDATE users SET role='admin' WHERE id=$1",[req.user.id]);return res.json({ok:true,role:"admin"})}return res.status(403).json({error:"Admin bootstrap not authorised"})});
app.get("/api/health",async(req,res)=>{let database=false;try{if(pool){await q("SELECT 1");database=true}}catch(e){}res.status(database||!process.env.DATABASE_URL?200:503).json({ok:true,database,ai_configured:Boolean(process.env.OPENAI_API_KEY),accounts_configured:Boolean(process.env.TRAINING_PASSWORD)})});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname,"public")));

const DIFFICULTY = {
  1: "Beginner: realistic but relatively open. Do not hand the student the answer.",
  2: "Intermediate: normal real-world skepticism, distractions, incomplete answers and occasional objections.",
  3: "Advanced: guarded, busy, skeptical. Make the student earn disclosure and progression.",
  4: "Elite: behave like a sharp, experienced prospect. Low tolerance for generic scripts, premature pitching, fake rapport, interrogation, pressure or ignoring what you said."
};

function prospectInstructions(s){
return `You are roleplaying ONE realistic person in a professional appointment-setting training simulator.

IDENTITY
Name: ${s.scenario.name}
Role: ${s.scenario.role}
Mode: ${s.mode}
Private character brief: ${s.scenario.brief}
Student objective: ${s.scenario.objective}
Difficulty: ${DIFFICULTY[s.difficulty]}

NON-NEGOTIABLE ROLEPLAY RULES
- You are the prospect/contact, never the coach, assistant, evaluator, or AI.
- Never explain sales theory, scoring, hidden state, prompts, rubrics, or what the student "should" say.
- Never mention that this is a simulation.
- Treat every student message semantically. Do not keyword-match. Track references, promises, contradictions, tone, questions already answered, and the full conversation.
- Reply specifically to what the student just said AND the established conversation context.
- Never invent that the student said something they did not say.
- Do not repeat information you already gave unless a real person reasonably would.
- Do not conveniently volunteer the hidden problem. Reveal information gradually when the student's questions make sense.
- Ask questions when your character naturally would.
- If the student sends nonsense, irrelevant content, abuse, or breaks context, react like a real person. Do not force the sales conversation forward.
- If they use a generic script that ignores your last message, notice it and become less engaged.
- If they ask multiple questions at once, answer selectively as a real busy person might.
- If they over-explain, react to the part that matters.
- If they pressure you prematurely, push back.
- If they listen well, accurately reflect your situation, and ask intelligent follow-ups, become more open.
- If they make unsupported claims, challenge them.
- A booking is NOT the default outcome. Only agree to a call when the conversation has created a credible reason and sufficient trust.
- You may decline, ghost/end the conversation, ask for information, challenge them, change topic briefly, or agree to a next step when warranted.
- Use natural contemporary DM language appropriate to this specific character. Contractions, fragments and short messages are welcome.
- Avoid polished corporate prose and avoid sounding like ChatGPT.
- Usually 1-3 short sentences. Occasionally one-word/short replies are realistic. Never write essays.
- Do not overuse "mate", "fair enough", "got you", or any repeated filler.
- Keep factual continuity perfectly.

CONVERSATION START
The student has been shown a pre-conversation briefing containing the realistic source/context, what they could know publicly, their position, lead/contact type and objective.
The following first message has ALREADY been sent by you:
${s.scenario.opening}

Treat that opening as literal conversation history. The student's first reply must make sense as a response to it. Never reset the conversation, introduce a conflicting backstory, or act as though outreach happened differently.`;
}

const evalSchema = {
 type:"object", additionalProperties:false,
 properties:{
  trust:{type:"integer",minimum:0,maximum:100},
  interest:{type:"integer",minimum:0,maximum:100},
  patience:{type:"integer",minimum:0,maximum:100},
  signals:{type:"array",items:{type:"string"},maxItems:5},
  coach_note:{type:"string"},
  should_end:{type:"boolean"},
  evidence:{type:"array",items:{type:"string"},maxItems:5}
 }, required:["trust","interest","patience","signals","coach_note","should_end","evidence"]
};

const PRELOADED_PROSPECT_COUNT=100;
const preloadNames=["Aiden","Amelia","Archie","Ava","Blake","Brooke","Cameron","Charlie","Daisy","Elijah","Ella","Evie","Finn","Freya","George","Grace","Hannah","Harvey","Holly","Isaac","Isla","Jack","Jacob","Jasmine","Jay","Jessica","Joe","Kai","Katie","Leo","Lily","Logan","Lucy","Luke","Maisie","Mason","Mia","Millie","Nathan","Noah","Oscar","Phoebe","Reece","Ruby","Sam","Sienna","Theo","Zara","Beth","Adam","Niamh"];
const preloadPersonalities=[
 ["Direct","decisive, blunt and impatient with vague answers"],["Skeptical","analytical and suspicious of unsupported claims"],
 ["Friendly","warm and conversational but not automatically interested"],["Busy","time-poor and easily distracted"],
 ["Guarded","private and slow to disclose problems"],["Analytical","detail-oriented and wants specifics"],
 ["Chatty","open but frequently goes off-topic"],["Blunt","short replies and low tolerance for filler"],
 ["Curious","asks questions and wants to understand the process"],["Cautious","interested but worried about another bad decision"],
 ["Confident","believes their current process works"],["Defensive","interprets generic sales questions as criticism"],
 ["Independent","prefers doing things themselves"],["Results-focused","cares about measurable outcomes"],
 ["Relationship-led","values trust and reputation"],["Price-sensitive","focuses on cost early"],
 ["Distracted","answers inconsistently and may disappear"],["Experienced","recognises canned sales frameworks"],
 ["Reserved","polite but gives minimal information"],["Challenging","tests confidence and pushes back"]
];
const preloadFrictions=[
 "follow-up is inconsistent and good conversations go cold","show rates are weaker than expected","a previous setter damaged trust",
 "they believe the current team already has this covered","time is the real constraint","they wasted money on a previous service",
 "they need proof before giving more time","they receive too many generic sales DMs","qualification quality is inconsistent",
 "old opportunities are not being reactivated","they have not measured the cost of the problem","brand reputation matters more than booking volume",
 "they are comparing alternatives","they dislike premature call pushes","they know something is leaking but not where"
];
const preloadRoles={
 network:["Appointment Setter","High-Ticket Closer","Sales Manager","Sales Recruiter","SDR","Account Executive","Head of Sales","Setter Team Lead","Sales Trainer","Revenue Manager"],
 client:["Fitness Coach","Agency Founder","Recruitment Founder","Business Coach","Property Mentor","E-commerce Educator","SaaS Founder","Consultant","Career Coach","Content Agency Owner","Leadership Coach","Health Coach"],
 role:["Inbound Lead","Warm Lead","Cold Re-engagement","Qualified Lead","Previous No-Show","Referral Lead","Webinar Lead","Instagram Lead","Application Lead","Price-Conscious Lead"]
};
const preloadOpenings={
 network:["Yeah, saw your message. What's up?","Appreciate the message — what made you reach out?","Hey. You working in sales at the minute?","How did you come across my page?"],
 client:["Hey, saw your message. What exactly are you reaching out about?","We get a lot of these DMs. What did you actually notice?","Potentially — what are you suggesting?","We've already got a process for this. What's the angle?"],
 role:["Hey, I was having a look earlier. What happens from here?","Yeah I'm interested, just got a couple of concerns first.","Sorry for the slow reply — still looking into it.","Before we book anything, can I ask you something?"]
};
function makePreloadedProspect(index,mode,difficulty){
 const p=preloadPersonalities[(index*7+(mode==="client"?3:mode==="role"?8:0))%preloadPersonalities.length];
 const roles=preloadRoles[mode],role=roles[(index*11)%roles.length],name=preloadNames[(index*13)%preloadNames.length];
 const friction=preloadFrictions[(index*5+(mode==="role"?2:0))%preloadFrictions.length];
 const opening=preloadOpenings[mode][(index*3)%preloadOpenings[mode].length];
 const objective=mode==="network"?"Build a genuine professional connection and uncover mutual relevance without forcing a job ask.":mode==="client"?"Diagnose whether there is a genuine commercial gap and earn the right to progress.":"Understand the lead, qualify fit and progress only when the next step is earned.";
 return {id:"preloaded_"+mode+"_"+index,name,role:role+" · "+p[0],objective,
  brief:p[1]+". Hidden reality: "+friction+". Difficulty "+difficulty+". Reveal this gradually only when earned.",
  opening,public_context:mode==="network"?"You reached out after seeing this person in the remote-sales space.":mode==="client"?"You researched the business and initiated a cold DM.":"You are handling this lead as the setter for the offer.",
  public_known:role,contact_type:mode==="network"?"Cold network contact":mode==="client"?"Cold outbound":"Lead conversation"};
}
const generatedScenarioSchema={
 type:"object",additionalProperties:false,
 properties:{
  name:{type:"string"},role:{type:"string"},objective:{type:"string"},
  brief:{type:"string"},opening:{type:"string"},
  public_context:{type:"string"},public_known:{type:"string"},contact_type:{type:"string"}
 },
 required:["name","role","objective","brief","opening","public_context","public_known","contact_type"]
};

app.post("/api/prospect", requireTrainingAccess, async (req,res)=>{
 try{
  const mode=["network","client","role"].includes(req.body?.mode)?req.body.mode:"client";
  const difficulty=Math.max(1,Math.min(4,Number(req.body?.difficulty)||2));
  const requestedIndex=Number(req.body?.preloaded_index);
  if(Number.isInteger(requestedIndex)&&requestedIndex>=0&&requestedIndex<PRELOADED_PROSPECT_COUNT){
   return res.json({scenario:makePreloadedProspect(requestedIndex,mode,difficulty),source:"preloaded"});
  }
  const modeBrief={
   network:"The student is networking in the appointment-setting / remote-sales space. Create a setter, closer, recruiter, sales manager, SDR, AE, sales trainer, founder, team lead or another realistic sales contact.",
   client:"The student is prospecting for appointment-setting clients. Create a realistic business owner/founder/coach/consultant/agency or service-business decision maker from a varied niche.",
   role:"The student already works as a setter and is handling a lead. Create a realistic inbound, warm, reactivation, referral, application, no-show, skeptical, price-aware or otherwise commercially realistic lead."
  }[mode];
  const prompt=`Create ONE brand-new prospect for an appointment-setting training simulation.
${modeBrief}
Difficulty: ${DIFFICULTY[difficulty]}

Make this prospect materially different from generic sales-training characters. Randomise personality, communication style, patience, sophistication, hidden motivation, objection, commercial situation and openness. Possible personalities include warm, blunt, skeptical, analytical, distracted, guarded, chatty, impatient, experienced, cautious, defensive, curious, confident, price-sensitive and combinations of these.

The private brief must contain the personality and hidden reality the student has to discover. Do NOT put hidden information in public_context or public_known. The opening must be a natural short DM that establishes a concrete starting point. Do not mention AI, simulation, scoring or training. UK/international contemporary DM language is fine. Avoid making every character say "mate".`;
  const g=await client.responses.create({
   model:process.env.PROSPECT_MODEL||"gpt-5.6-terra",
   input:prompt,reasoning:{effort:"low"},max_output_tokens:550,
   text:{format:{type:"json_schema",name:"generated_prospect",strict:true,schema:generatedScenarioSchema}}
  });
  const scenario=JSON.parse(g.output_text);
  scenario.id="generated_"+crypto.randomUUID();
  res.json({scenario});
 }catch(e){console.error(e);res.status(500).json({error:"Could not generate prospect"})}
});

app.post("/api/session", requireTrainingAccess, async (req,res)=>{
 try{
  const {mode,difficulty,scenario}=req.body;
  if(!scenario?.name) return res.status(400).json({error:"Invalid scenario"});
  const id=crypto.randomUUID();
  sessions.set(id,{mode,difficulty:Math.max(1,Math.min(4,difficulty||2)),scenario,transcript:[{role:"prospect",text:scenario.opening}],state:{trust:45,interest:45,patience:80},responseId:null,created:Date.now()});
  res.json({session_id:id});
 }catch(e){res.status(500).json({error:"Could not create session"})}
});

app.post("/api/message", requireTrainingAccess, async (req,res)=>{
 const s=sessions.get(req.body.session_id);
 if(!s)return res.status(404).json({error:"Session expired"});
 const message=String(req.body.message||"").slice(0,2500);
 if(!message.trim())return res.status(400).json({error:"Empty message"});
 try{
   const input = s.responseId
     ? [{role:"user",content:message}]
     : [
        {role:"system",content:prospectInstructions(s)},
        {role:"assistant",content:s.scenario.opening},
        {role:"user",content:message}
       ];
   const pr=await client.responses.create({
     model:process.env.PROSPECT_MODEL||"gpt-5.6-terra",
     input,
     previous_response_id:s.responseId||undefined,
     store:true,
     max_output_tokens:180,
     reasoning:{effort:"low"},
     text:{verbosity:"low"}
   });
   const prospectReply=pr.output_text.trim();
   s.responseId=pr.id;
   s.transcript.push({role:"student",text:message},{role:"prospect",text:prospectReply});

   const evaluatorPrompt=`You are the silent senior evaluator for an appointment-setting roleplay.
Evaluate ONLY observable behavior in the transcript. Do not reward buzzwords or the mere presence of a question.
Maintain realistic prospect psychology. Previous state: ${JSON.stringify(s.state)}.
Difficulty: ${s.difficulty}.
Student objective: ${s.scenario.objective}.
Private prospect brief: ${s.scenario.brief}

Evaluate the newest student turn in context for:
- relevance to the prospect's last message
- listening and conversational continuity
- rapport without fake mirroring
- discovery quality and question sequencing
- qualification when appropriate
- ability to uncover consequences/desire without interrogation
- objection handling: acknowledge, clarify, isolate, respond
- positioning/value only when earned
- CTA timing and clarity
- brevity, natural language, confidence, and pressure
- factual consistency and unsupported claims
- whether a real prospect's trust, interest, patience should move

Coach note: one concise actionable observation. Never give the exact magic reply during the live session.
Signals: short evidence-based labels, not generic praise.
should_end is true only if the prospect clearly ended/disengaged, a natural outcome was reached, or continuing is no longer useful.

TRANSCRIPT:
${s.transcript.map(x=>`${x.role.toUpperCase()}: ${x.text}`).join("\n")}`;

   const ev=await client.responses.create({
     model:process.env.EVALUATOR_MODEL||"gpt-5.6-terra",
     input:evaluatorPrompt,
     reasoning:{effort:"medium"},
     max_output_tokens:500,
     text:{format:{type:"json_schema",name:"live_evaluation",strict:true,schema:evalSchema}}
   });
   const evaluation=JSON.parse(ev.output_text);
   s.state={trust:evaluation.trust,interest:evaluation.interest,patience:evaluation.patience};
   res.json({prospect_reply:prospectReply,evaluation});
 }catch(e){
   console.error(e);
   res.status(500).json({error:"AI response failed"});
 }
});

const debriefSchema={
 type:"object",additionalProperties:false,
 properties:{
  overall_score:{type:"integer",minimum:0,maximum:100},
  scores:{type:"object",additionalProperties:false,properties:{
    conversational_awareness:{type:"integer",minimum:0,maximum:100},
    rapport:{type:"integer",minimum:0,maximum:100},
    discovery:{type:"integer",minimum:0,maximum:100},
    qualification:{type:"integer",minimum:0,maximum:100},
    objection_handling:{type:"integer",minimum:0,maximum:100},
    positioning:{type:"integer",minimum:0,maximum:100},
    cta:{type:"integer",minimum:0,maximum:100},
    naturalness:{type:"integer",minimum:0,maximum:100}
  },required:["conversational_awareness","rapport","discovery","qualification","objection_handling","positioning","cta","naturalness"]},
  outcome:{type:"string"},
  strengths:{type:"array",items:{type:"string"},minItems:2,maxItems:5},
  improvements:{type:"array",items:{type:"string"},minItems:2,maxItems:5},
  better_approach:{type:"string"},
  hidden_reveal:{type:"string"},
  message_feedback:{type:"array",maxItems:14,items:{type:"object",additionalProperties:false,properties:{student_text:{type:"string"},rating:{type:"string",enum:["strong","okay","weak"]},feedback:{type:"string"},better_line:{type:"string"}},required:["student_text","rating","feedback","better_line"]}}
 },required:["overall_score","scores","outcome","strengths","improvements","better_approach","hidden_reveal","message_feedback"]
};

app.post("/api/debrief", requireTrainingAccess, async(req,res)=>{
 const s=sessions.get(req.body.session_id);
 if(!s)return res.status(404).json({error:"Session expired"});
 try{
  const prompt=`Act as a demanding senior appointment-setting coach reviewing a completed roleplay.
Score evidence, not outcomes. A booking does not automatically mean a good conversation, and no booking does not automatically mean a bad one.
Use the entire transcript. Penalize scripted replies that ignore context, shallow discovery, question stacking, premature pitching, unearned CTAs, weak objection handling, unsupported claims, excessive verbosity, needy tone, and failure to listen.
Reward concise relevance, strong sequencing, genuine curiosity, commercially useful discovery, emotional and logical understanding, good objection diagnosis, appropriate positioning, confident low-pressure progression, and natural language.
Scores must be calibrated: 50 = weak/average novice, 70 = competent, 85 = excellent, 95+ = exceptional and rare.
If a category was not meaningfully tested, score based on what was observable and do not invent evidence.
Give a "better approach" that explains the strategy and includes 1-2 example lines tailored to the exact moments where the student lost leverage.
Hidden prospect reality must reveal the private brief after the roleplay.\nFor message_feedback, review every student message in order. Rate each strong, okay or weak, explain the specific effect it had in context, and give a concise stronger line. If the original was already strong, better_line can be a polished alternative rather than pretending it failed.

Mode: ${s.mode}
Difficulty: ${s.difficulty}
Objective: ${s.scenario.objective}
Private brief: ${s.scenario.brief}
Final prospect state: ${JSON.stringify(s.state)}
Transcript:
${s.transcript.map(x=>`${x.role.toUpperCase()}: ${x.text}`).join("\n")}`;
  const r=await client.responses.create({
   model:process.env.COACH_MODEL||"gpt-5.6-sol",
   input:prompt, reasoning:{effort:"high"}, max_output_tokens:2200,
   text:{format:{type:"json_schema",name:"session_debrief",strict:true,schema:debriefSchema}}
  });
  const data=JSON.parse(r.output_text);
  // Persist completed work when the student is signed into a platform account.
  const user=await currentUser(req).catch(()=>null);
  if(user&&pool){
   const xp=Math.max(25,Math.round(data.overall_score));
   await q("INSERT INTO simulation_results(id,user_id,mode,difficulty,prospect_name,prospect_role,overall_score,scores,transcript,debrief) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[crypto.randomUUID(),user.id,s.mode,s.difficulty,s.scenario.name,s.scenario.role,data.overall_score,JSON.stringify(data.scores),JSON.stringify(s.transcript),JSON.stringify(data)]);
   await q("UPDATE users SET xp=xp+$1,last_active=CURRENT_DATE,streak=CASE WHEN last_active=CURRENT_DATE-1 THEN streak+1 WHEN last_active=CURRENT_DATE THEN streak ELSE 1 END WHERE id=$2",[xp,user.id]);
   const stats=await q("SELECT COUNT(*)::int reps,MAX(overall_score)::int best FROM simulation_results WHERE user_id=$1",[user.id]);
   const unlock=[];if(stats.rows[0].reps>=1)unlock.push("FIRST_REP");if(stats.rows[0].reps>=10)unlock.push("TEN_REPS");if(stats.rows[0].reps>=50)unlock.push("FIFTY_REPS");if(stats.rows[0].best>=80)unlock.push("SCORE_80");if(stats.rows[0].best>=90)unlock.push("SCORE_90");
   for(const code of unlock)await q("INSERT INTO achievements(user_id,code) VALUES($1,$2) ON CONFLICT DO NOTHING",[user.id,code]);
  }
  sessions.delete(req.body.session_id); res.json(data);
 }catch(e){console.error(e);res.status(500).json({error:"Debrief failed"})}
});

app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
initDb().catch(console.error).finally(()=>app.listen(port,()=>console.log(`Setter Circle AI running on ${port}`)));
