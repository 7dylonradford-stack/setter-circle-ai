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
function requireTrainingAccess(req,res,next){
 const auth=String(req.headers.authorization||"");
 const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 const exp=accessTokens.get(token);
 if(!token||!exp||exp<Date.now()){if(token)accessTokens.delete(token);return res.status(401).json({error:"Member access required"})}
 next();
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
const userTokens = new Map();
const USER_TTL=1000*60*60*24*30;
function hashToken(t){return crypto.createHash("sha256").update(t).digest("hex")}
function hashPassword(p,salt=crypto.randomBytes(16).toString("hex")){return salt+":"+crypto.scryptSync(String(p),salt,64).toString("hex")}
function verifyPassword(p,stored){const [salt,key]=String(stored).split(":");if(!salt||!key)return false;const got=crypto.scryptSync(String(p),salt,64);const want=Buffer.from(key,"hex");return got.length===want.length&&crypto.timingSafeEqual(got,want)}
async function currentUser(req){const a=String(req.headers.authorization||"");const t=a.startsWith("Bearer ")?a.slice(7):"";if(!t||!pool)return null;const r=await q("SELECT u.id,u.email,u.name,u.role,u.xp,u.streak FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",[hashToken(t)]);return r.rows[0]||null}
async function requireUser(req,res,next){try{const u=await currentUser(req);if(!u)return res.status(401).json({error:"Sign in required"});req.user=u;next()}catch(e){res.status(500).json({error:"Account service unavailable"})}}
app.post("/api/account/register",async(req,res)=>{try{if(!pool)return res.status(503).json({error:"Accounts are being prepared"});const email=String(req.body?.email||"").trim().toLowerCase(),name=String(req.body?.name||"").trim(),password=String(req.body?.password||"");if(!email.includes("@")||name.length<2||password.length<8)return res.status(400).json({error:"Use a valid name, email and password of at least 8 characters"});const id=crypto.randomUUID();await q("INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",[id,email,name,hashPassword(password)]);res.json({ok:true})}catch(e){res.status(e.code==="23505"?409:500).json({error:e.code==="23505"?"An account already exists for that email":"Could not create account"})}});
app.post("/api/account/login",async(req,res)=>{try{if(!pool)return res.status(503).json({error:"Accounts are being prepared"});const email=String(req.body?.email||"").trim().toLowerCase(),password=String(req.body?.password||"");const r=await q("SELECT * FROM users WHERE email=$1",[email]),u=r.rows[0];if(!u||!verifyPassword(password,u.password_hash))return res.status(401).json({error:"Incorrect email or password"});const token=crypto.randomBytes(32).toString("hex");await q("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",[hashToken(token),u.id]);res.json({token,user:{name:u.name,email:u.email,role:u.role,xp:u.xp,streak:u.streak}})}catch(e){res.status(500).json({error:"Could not sign in"})}});
app.get("/api/account/me",requireUser,async(req,res)=>{const h=await q("SELECT overall_score,mode,difficulty,prospect_name,created_at FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",[req.user.id]);res.json({user:req.user,history:h.rows})});
app.get("/api/leaderboard",requireUser,async(req,res)=>{const r=await q("SELECT u.name,u.xp,COUNT(sr.id)::int reps,COALESCE(ROUND(AVG(sr.overall_score)),0)::int average FROM users u LEFT JOIN simulation_results sr ON sr.user_id=u.id AND sr.created_at>NOW()-INTERVAL '7 days' WHERE u.role='student' GROUP BY u.id ORDER BY xp DESC LIMIT 25");res.json({leaders:r.rows})});
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
app.get("/api/admin/students",requireUser,async(req,res)=>{
 if(req.user.role!=="admin")return res.status(403).json({error:"Admin access required"});
 const r=await q("SELECT u.id,u.name,u.email,u.xp,u.streak,u.last_active,COUNT(sr.id)::int reps,COALESCE(ROUND(AVG(sr.overall_score)),0)::int average FROM users u LEFT JOIN simulation_results sr ON sr.user_id=u.id WHERE u.role='student' GROUP BY u.id ORDER BY u.last_active DESC NULLS LAST,u.created_at DESC");
 res.json({students:r.rows});
});


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
  hidden_reveal:{type:"string"}
 },required:["overall_score","scores","outcome","strengths","improvements","better_approach","hidden_reveal"]
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
Hidden prospect reality must reveal the private brief after the roleplay.

Mode: ${s.mode}
Difficulty: ${s.difficulty}
Objective: ${s.scenario.objective}
Private brief: ${s.scenario.brief}
Final prospect state: ${JSON.stringify(s.state)}
Transcript:
${s.transcript.map(x=>`${x.role.toUpperCase()}: ${x.text}`).join("\n")}`;
  const r=await client.responses.create({
   model:process.env.COACH_MODEL||"gpt-5.6-sol",
   input:prompt, reasoning:{effort:"high"}, max_output_tokens:1400,
   text:{format:{type:"json_schema",name:"session_debrief",strict:true,schema:debriefSchema}}
  });
  const data=JSON.parse(r.output_text);
  // Persist completed work when the student is signed into a platform account.
  const user=await currentUser(req).catch(()=>null);
  if(user&&pool){
   const xp=Math.max(25,Math.round(data.overall_score));
   await q("INSERT INTO simulation_results(id,user_id,mode,difficulty,prospect_name,prospect_role,overall_score,scores,transcript,debrief) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[crypto.randomUUID(),user.id,s.mode,s.difficulty,s.scenario.name,s.scenario.role,data.overall_score,JSON.stringify(data.scores),JSON.stringify(s.transcript),JSON.stringify(data)]);
   await q("UPDATE users SET xp=xp+$1,last_active=CURRENT_DATE,streak=CASE WHEN last_active=CURRENT_DATE-1 THEN streak+1 WHEN last_active=CURRENT_DATE THEN streak ELSE 1 END WHERE id=$2",[xp,user.id]);
  }
  sessions.delete(req.body.session_id); res.json(data);
 }catch(e){console.error(e);res.status(500).json({error:"Debrief failed"})}
});

app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
initDb().catch(console.error).finally(()=>app.listen(port,()=>console.log(`Setter Circle AI running on ${port}`)));
