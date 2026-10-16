
import crypto from "node:crypto";
import {q} from "./db.js";
const id=x=>/^[0-9a-f-]{36}$/i.test(String(x||""));
const cut=(x,n=1000)=>String(x??"").trim().slice(0,n);
const fail=(res,e)=>{console.error("Career studio",e?.message);res.status(500).json({error:"Career services temporarily unavailable"})};
const date=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?null:d};
const first90=[
 "Understand the client offer and good-fit buyer",
 "Set up the CRM and sales pipeline",
 "Study approved messaging and successful calls",
 "Practise discovery without early pitching",
 "Write your first weekly performance summary",
 "Learn the client's qualification criteria",
 "Confirm booking handoff requirements",
 "Handle slow replies and respectful follow-ups",
 "Review your first objections and corrections",
 "Audit your CRM accuracy",
 "Demonstrate your research process",
 "Practise useful closer handoffs",
 "Apply coach feedback to the next conversation",
 "Build a realistic weekly outreach schedule",
 "Review response and booking quality",
 "Check privacy and consent procedures",
 "Explain the offer in your own words",
 "Present a 90-day performance review"
];
const regions={
 uk:{title:"UK setter pathway",steps:["Study UK privacy and PECR expectations","Review transparent commission and employment terms","Practise GDPR-safe handling of prospect details","Schedule UK-time-zone-aware outreach"]},
 us:{title:"US setter pathway",steps:["Research applicable US messaging and calling rules","Understand contracting and compensation terms","Avoid unverified claims about income or results","Study time-zone and state-specific requirements"]},
 international:{title:"International pathway",steps:["Review your market's applicable outreach laws","Make a time-zone-aware schedule","Check local employment and contracting rules","Adapt professional communication to your market"]}
};
const standards=[
 {id:"discovery",title:"Discovery quality",criterion:"Explores context through relevant follow-up questions."},
 {id:"qualification",title:"Qualification",criterion:"Identifies real fit without inventing buying signals."},
 {id:"integrity",title:"Professional integrity",criterion:"Avoids deceptive pressure or unsupported claims."},
 {id:"crm",title:"CRM and handoff accuracy",criterion:"Records and communicates relevant information accurately."},
 {id:"objections",title:"Handling resistance",criterion:"Clarifies concerns rather than forcing a script."},
 {id:"booking",title:"Booking quality",criterion:"Confirms an appropriate, consensual next step."},
 {id:"communication",title:"Natural communication",criterion:"Responds clearly and contextually to the prospect."}
];
export function registerCareerStudio(app,{requireUser,requireAdmin}){
 app.get("/api/advanced/portfolio",requireUser,async(req,res)=>{try{
  const r=await q("SELECT * FROM studio_portfolios WHERE user_id=$1",[req.user.id]);res.json({portfolio:r.rows[0]||null});
 }catch(e){fail(res,e)}});
 app.put("/api/advanced/portfolio",requireUser,async(req,res)=>{try{
  const x=req.body||{},items=Array.isArray(x.selected_evidence)?x.selected_evidence.slice(0,8).map(y=>({title:cut(y.title,90),description:cut(y.description,350),kind:"practice"})):[];
  const r=await q("INSERT INTO studio_portfolios(user_id,public_token,headline,introduction,selected_evidence,published) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(user_id) DO UPDATE SET headline=$3,introduction=$4,selected_evidence=$5::jsonb,published=$6,updated_at=NOW() RETURNING *",[req.user.id,crypto.randomUUID(),cut(x.headline,120),cut(x.introduction,1300),JSON.stringify(items),x.published===true]);res.json({portfolio:r.rows[0]});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/portfolio/rotate",requireUser,async(req,res)=>{try{
  const r=await q("UPDATE studio_portfolios SET public_token=$2,updated_at=NOW() WHERE user_id=$1 RETURNING public_token",[req.user.id,crypto.randomUUID()]);if(!r.rows[0])return res.status(404).json({error:"Create your portfolio first"});res.json({token:r.rows[0].public_token});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/portfolio/share/:token",async(req,res)=>{try{
  if(!id(req.params.token))return res.status(404).json({error:"Portfolio unavailable"});
  const r=await q("SELECT u.name,p.headline,p.introduction,p.selected_evidence,p.updated_at FROM studio_portfolios p JOIN users u ON u.id=p.user_id WHERE p.public_token=$1 AND p.published=TRUE",[req.params.token]);
  if(!r.rows[0])return res.status(404).json({error:"Portfolio unavailable"});
  res.set("Cache-Control","no-store").json({portfolio:r.rows[0],disclaimer:"Student-selected examples are practice evidence, not independently verified professional work."});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/projects",requireUser,async(req,res)=>{try{
  const r=await q("SELECT p.id,p.title,p.employer_name,p.brief,p.requirements,p.assessment_rubric,s.status,s.mentor_feedback FROM studio_job_projects p LEFT JOIN studio_job_project_submissions s ON s.project_id=p.id AND s.user_id=$1 WHERE p.published=TRUE ORDER BY p.created_at DESC",[req.user.id]);res.json({projects:r.rows});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/admin/projects",requireAdmin,async(req,res)=>{try{
  const x=req.body||{};if(cut(x.title,130).length<5||cut(x.brief,2800).length<40||cut(x.employer_name,120).length<3)return res.status(400).json({error:"Provide a client name and detailed project brief"});
  const r=await q("INSERT INTO studio_job_projects(id,title,employer_name,brief,requirements,published) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,title",[crypto.randomUUID(),cut(x.title,130),cut(x.employer_name,120),cut(x.brief,2800),cut(x.requirements,1600),x.published===true]);res.json({project:r.rows[0]});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/projects/:id/submit",requireUser,async(req,res)=>{try{
  const evidence=cut(req.body?.evidence,3000);if(!id(req.params.id)||evidence.length<30)return res.status(400).json({error:"Provide meaningful assignment evidence"});
  const r=await q("SELECT id FROM studio_job_projects WHERE id=$1 AND published=TRUE",[req.params.id]);if(!r.rows[0])return res.status(404).json({error:"Brief unavailable"});
  await q("INSERT INTO studio_job_project_submissions(id,project_id,user_id,evidence) VALUES($1,$2,$3,$4) ON CONFLICT(project_id,user_id) DO UPDATE SET evidence=$4,status='pending',mentor_feedback=NULL,reviewed_at=NULL",[crypto.randomUUID(),req.params.id,req.user.id,evidence]);res.json({ok:true,status:"pending"});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/admin/projects/reviews",requireAdmin,async(req,res)=>{try{
  const r=await q("SELECT s.*,p.title project_title,u.name student_name FROM studio_job_project_submissions s JOIN studio_job_projects p ON p.id=s.project_id JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 100");res.json({reviews:r.rows});
 }catch(e){fail(res,e)}});
 app.patch("/api/advanced/admin/projects/reviews/:id",requireAdmin,async(req,res)=>{try{
  if(!id(req.params.id)||!["approved","needs_changes"].includes(req.body?.status)||cut(req.body?.feedback,1700).length<10)return res.status(400).json({error:"Provide review decision and feedback"});
  const r=await q("UPDATE studio_job_project_submissions SET status=$2,mentor_feedback=$3,reviewed_by=$4,reviewed_at=NOW() WHERE id=$1 RETURNING id,status",[req.params.id,req.body.status,cut(req.body.feedback,1700),req.user.id]);res.json({review:r.rows[0]||null});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/pathways",requireUser,async(req,res)=>{try{
  const r=await q("SELECT track,step,reflection,completed_at FROM studio_progress WHERE user_id=$1 ORDER BY track,step",[req.user.id]);
  res.json({first90:first90.map((title,i)=>({step:i+1,day:(i+1)*5,title})),regions,standards,progress:r.rows});
 }catch(e){fail(res,e)}});
 app.put("/api/advanced/pathways/:track/:step",requireUser,async(req,res)=>{try{
  const track=req.params.track,step=+req.params.step;
  if(!["first90","uk","us","international"].includes(track)||!Number.isInteger(step)||step<1||step>(track==="first90"?18:4))return res.status(400).json({error:"Invalid learning step"});
  const reflection=cut(req.body?.reflection,850);if(reflection.length<15)return res.status(400).json({error:"Describe what you learnt or completed"});
  await q("INSERT INTO studio_progress(user_id,track,step,reflection) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,track,step) DO UPDATE SET reflection=$4,completed_at=NOW()",[req.user.id,track,step,reflection]);res.json({ok:true});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/outcomes",requireUser,async(req,res)=>{try{
  const r=await q("SELECT id,company,role_title,started_on,status,published_consent,created_at FROM studio_outcomes WHERE user_id=$1 ORDER BY created_at DESC",[req.user.id]);res.json({outcomes:r.rows});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/outcomes",requireUser,async(req,res)=>{try{
  const x=req.body||{};
  if(cut(x.company,120).length<2||cut(x.role_title,120).length<4)return res.status(400).json({error:"Provide an employer and position"});
  const r=await q("INSERT INTO studio_outcomes(id,user_id,company,role_title,started_on,published_consent) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,company,role_title) DO UPDATE SET published_consent=$6 RETURNING id,status",[crypto.randomUUID(),req.user.id,cut(x.company,120),cut(x.role_title,120),x.started_on?date(x.started_on):null,x.published_consent===true]);res.json({outcome:r.rows[0]});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/admin/outcomes",requireAdmin,async(req,res)=>{try{
  const r=await q("SELECT o.*,u.name student_name FROM studio_outcomes o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 100");res.json({outcomes:r.rows});
 }catch(e){fail(res,e)}});
 app.patch("/api/advanced/admin/outcomes/:id",requireAdmin,async(req,res)=>{try{
  const note=cut(req.body?.verification_note,1800);
  if(!id(req.params.id)||!["verified","rejected"].includes(req.body?.status)||note.length<20)return res.status(400).json({error:"A verification decision and supporting review note (20+ characters) are required"});
  const r=await q("UPDATE studio_outcomes SET status=$2,reviewed_by=$3,verification_note=$4,reviewed_at=NOW() WHERE id=$1 RETURNING id,status",[req.params.id,req.body.status,req.user.id,note]);res.json({outcome:r.rows[0]||null});
 }catch(e){fail(res,e)}});
}
