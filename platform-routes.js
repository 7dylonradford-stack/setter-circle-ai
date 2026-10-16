
import crypto from "node:crypto";
import {q} from "./db.js";
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||""));
const clean=(v,n=1000)=>String(v??"").trim().slice(0,n);
const url=v=>{if(!v)return null;try{let x=new URL(String(v));return x.protocol==="https:"?x.href:null}catch(e){return null}};
const sendError=(res,e)=>{console.error("Platform workflow",e);res.status(500).json({error:"This section is temporarily unavailable"})};
const monday=()=>{let d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
export function registerPlatformRoutes(app,{requireUser,requireAdmin}){
 app.get("/api/academy/lessons",requireUser,async(req,res)=>{try{
  const drafts=req.user.role==="admin"&&req.query.include_drafts==="1";
  const r=await q("SELECT l.id,l.module_number,l.title,l.description,l.video_url,l.resource_url,l.duration_min,l.sort_order,l.published,(lp.completed_at IS NOT NULL) completed FROM training_lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1 WHERE l.published=TRUE OR $2::boolean ORDER BY l.module_number,l.sort_order,l.created_at",[req.user.id,drafts]);
  res.json({lessons:r.rows});
 }catch(e){sendError(res,e)}});
 app.post("/api/admin/academy/lessons",requireAdmin,async(req,res)=>{try{
  const x=req.body||{},n=Number(x.module_number),title=clean(x.title,160);
  if(!Number.isInteger(n)||n<1||n>11||title.length<3)return res.status(400).json({error:"Choose module 1–11 and enter a lesson title"});
  if(x.video_url&&!url(x.video_url)||x.resource_url&&!url(x.resource_url))return res.status(400).json({error:"Use secure https:// links"});
  const r=await q("INSERT INTO training_lessons(id,module_number,title,description,video_url,resource_url,duration_min,sort_order,published) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",[crypto.randomUUID(),n,title,clean(x.description,1800),url(x.video_url),url(x.resource_url),Math.min(480,Math.max(0,Number(x.duration_min)||0)),Math.min(999,Math.max(0,Number(x.sort_order)||0)),!!x.published]);
  res.json({lesson:r.rows[0]});
 }catch(e){sendError(res,e)}});
 app.patch("/api/admin/academy/lessons/:id",requireAdmin,async(req,res)=>{try{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid lesson"});
  const old=await q("SELECT * FROM training_lessons WHERE id=$1",[req.params.id]);if(!old.rows[0])return res.status(404).json({error:"Lesson not found"});
  const x={...old.rows[0],...req.body};if(!Number.isInteger(Number(x.module_number))||Number(x.module_number)<1||Number(x.module_number)>11||clean(x.title).length<3)return res.status(400).json({error:"Invalid lesson"});
  if(x.video_url&&!url(x.video_url)||x.resource_url&&!url(x.resource_url))return res.status(400).json({error:"Use secure links"});
  const r=await q("UPDATE training_lessons SET module_number=$2,title=$3,description=$4,video_url=$5,resource_url=$6,duration_min=$7,sort_order=$8,published=$9,updated_at=NOW() WHERE id=$1 RETURNING *",[req.params.id,Number(x.module_number),clean(x.title,160),clean(x.description,1800),url(x.video_url),url(x.resource_url),Math.min(480,Math.max(0,Number(x.duration_min)||0)),Math.min(999,Math.max(0,Number(x.sort_order)||0)),!!x.published]);
  res.json({lesson:r.rows[0]});
 }catch(e){sendError(res,e)}});
 app.post("/api/academy/lessons/:id/complete",requireUser,async(req,res)=>{try{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid lesson"});
  const r=await q("SELECT video_url FROM training_lessons WHERE id=$1 AND published=TRUE",[req.params.id]);
  if(!r.rows.length)return res.status(404).json({error:"Lesson unavailable"});
  if(r.rows[0].video_url&&!req.body?.confirm_watched)return res.status(400).json({error:"Confirm you watched the lesson"});
  await q("INSERT INTO lesson_progress(user_id,lesson_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.user.id,req.params.id]);res.json({ok:true});
 }catch(e){sendError(res,e)}});
 app.get("/api/academy/progress",requireUser,async(req,res)=>{try{
  const r=await q("SELECT l.module_number,COUNT(*)::int lessons,COUNT(lp.completed_at)::int completed FROM training_lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1 WHERE l.published=TRUE GROUP BY l.module_number ORDER BY l.module_number",[req.user.id]);res.json({modules:r.rows});
 }catch(e){sendError(res,e)}});
 app.get("/api/weekly-reviews",requireUser,async(req,res)=>{try{
  const r=await q("SELECT week_start,review,updated_at FROM weekly_reviews WHERE user_id=$1 ORDER BY week_start DESC LIMIT 52",[req.user.id]);res.json({reviews:r.rows,current_week:monday()});
 }catch(e){sendError(res,e)}});
 app.put("/api/weekly-reviews",requireUser,async(req,res)=>{try{
  const w=clean(req.body?.week_start,10)||monday();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(w)||!Number.isFinite(Date.parse(w))||new Date(w).getUTCDay()!==1)return res.status(400).json({error:"Select the Monday of your review week"});
  const src=req.body?.review||{},review={};
  for(const k of ["outreach","replies","bookings","followups"]){const n=Number(src[k]||0);if(!Number.isInteger(n)||n<0||n>100000)return res.status(400).json({error:"Enter valid weekly totals"});review[k]=n}
  review.lesson=clean(src.lesson,1600);review.target=clean(src.target,1600);
  await q("INSERT INTO weekly_reviews(user_id,week_start,review) VALUES($1,$2,$3::jsonb) ON CONFLICT(user_id,week_start) DO UPDATE SET review=$3::jsonb,updated_at=NOW()",[req.user.id,w,JSON.stringify(review)]);
  res.json({ok:true,week_start:w});
 }catch(e){sendError(res,e)}});
 app.get("/api/mentor/submissions",requireUser,async(req,res)=>{try{
  const r=await q("SELECT id,category,subject,submission,status,feedback,acknowledged_at,submitted_at,reviewed_at FROM mentor_submissions WHERE user_id=$1 ORDER BY submitted_at DESC LIMIT 100",[req.user.id]);res.json({submissions:r.rows});
 }catch(e){sendError(res,e)}});
 app.post("/api/mentor/submissions",requireUser,async(req,res)=>{try{
  const cat=clean(req.body?.category,50),subject=clean(req.body?.subject,150),note=clean(req.body?.submission,3000);
  if(!["programme","conversation","workplace","general"].includes(cat)||subject.length<3||note.length<15)return res.status(400).json({error:"Choose a category and describe your work"});
  const r=await q("INSERT INTO mentor_submissions(id,user_id,category,subject,submission) VALUES($1,$2,$3,$4,$5) RETURNING id,status,submitted_at",[crypto.randomUUID(),req.user.id,cat,subject,note]);res.json({submission:r.rows[0]});
 }catch(e){sendError(res,e)}});

 app.post("/api/mentor/submissions/:id/acknowledge",requireUser,async(req,res)=>{try{
  if(!uuid(req.params.id))return res.status(400).json({error:"Invalid submission"});
  const r=await q("UPDATE mentor_submissions SET acknowledged_at=NOW() WHERE id=$1 AND user_id=$2 AND status='needs_changes' AND feedback IS NOT NULL RETURNING id,acknowledged_at",[req.params.id,req.user.id]);
  if(!r.rows.length)return res.status(404).json({error:"No actionable mentor feedback found"});
  res.json({acknowledged:r.rows[0]});
 }catch(e){sendError(res,e)}});
 app.get("/api/admin/mentor/submissions",requireAdmin,async(req,res)=>{try{
  const r=await q("SELECT m.*,u.name student_name,u.email student_email FROM mentor_submissions m JOIN users u ON u.id=m.user_id ORDER BY CASE WHEN m.status='pending' THEN 0 ELSE 1 END,m.submitted_at DESC LIMIT 200");res.json({submissions:r.rows});
 }catch(e){sendError(res,e)}});
 app.patch("/api/admin/mentor/submissions/:id",requireAdmin,async(req,res)=>{try{
  if(!uuid(req.params.id)||!["approved","needs_changes"].includes(req.body?.status)||clean(req.body?.feedback).length<10)return res.status(400).json({error:"Select a decision and provide feedback"});
  const r=await q("UPDATE mentor_submissions SET status=$2,feedback=$3,acknowledged_at=NULL,reviewed_by=$4,reviewed_at=NOW() WHERE id=$1 RETURNING id,status",[req.params.id,req.body.status,clean(req.body.feedback,3000),req.user.id]);
  if(!r.rows.length)return res.status(404).json({error:"Submission not found"});res.json({review:r.rows[0]});
 }catch(e){sendError(res,e)}});
 app.get("/api/assessments",requireUser,async(req,res)=>{try{
  const [a,c]=await Promise.all([q("SELECT id,status,notes,feedback,created_at,reviewed_at FROM skill_assessments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",[req.user.id]),q("SELECT id,certificate_type,issued_at FROM earned_certificates WHERE user_id=$1 ORDER BY issued_at DESC",[req.user.id])]);
  res.json({assessments:a.rows,certificates:c.rows});
 }catch(e){sendError(res,e)}});
 app.post("/api/assessments/request",requireUser,async(req,res)=>{try{
  const note=clean(req.body?.notes,2200);if(note.length<20)return res.status(400).json({error:"Explain what you want assessed"});
  const exists=await q("SELECT 1 FROM skill_assessments WHERE user_id=$1 AND status='pending' LIMIT 1",[req.user.id]);
  if(exists.rows.length)return res.status(409).json({error:"An assessment is already awaiting review"});
  const r=await q("INSERT INTO skill_assessments(id,user_id,notes) VALUES($1,$2,$3) RETURNING id,status",[crypto.randomUUID(),req.user.id,note]);res.json({assessment:r.rows[0]});
 }catch(e){sendError(res,e)}});
 app.get("/api/admin/assessments",requireAdmin,async(req,res)=>{try{
  const r=await q("SELECT a.*,u.name student_name,u.email student_email FROM skill_assessments a JOIN users u ON u.id=a.user_id ORDER BY CASE WHEN a.status='pending' THEN 0 ELSE 1 END,a.created_at DESC LIMIT 100");res.json({assessments:r.rows});
 }catch(e){sendError(res,e)}});
 app.patch("/api/admin/assessments/:id",requireAdmin,async(req,res)=>{try{
  if(!uuid(req.params.id)||!["approved","needs_changes"].includes(req.body?.status)||clean(req.body?.feedback).length<15)return res.status(400).json({error:"Provide a decision with meaningful feedback"});
  const r=await q("UPDATE skill_assessments SET status=$2,feedback=$3,approved_by=$4,reviewed_at=NOW() WHERE id=$1 AND status='pending' RETURNING id,user_id,status",[req.params.id,req.body.status,clean(req.body.feedback,2000),req.user.id]);
  if(!r.rows.length)return res.status(409).json({error:"Assessment already decided or unavailable"});
  if(req.body.status==="approved")await q("INSERT INTO earned_certificates(id,user_id,certificate_type,approved_by) VALUES($1,$2,'Setter Circle Assessed Competency',$3) ON CONFLICT(user_id,certificate_type) DO NOTHING",[crypto.randomUUID(),r.rows[0].user_id,req.user.id]);
  res.json({assessment:r.rows[0]});
 }catch(e){sendError(res,e)}});
 app.get("/api/job-applications",requireUser,async(req,res)=>{try{
  const r=await q("SELECT a.opportunity_id,a.status,a.notes,a.updated_at,o.title,o.company,o.location,o.type,o.apply_url,o.active,o.salary_text,o.category FROM job_applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE a.user_id=$1 ORDER BY a.updated_at DESC",[req.user.id]);res.json({applications:r.rows});
 }catch(e){sendError(res,e)}});
 app.put("/api/job-applications/:id",requireUser,async(req,res)=>{try{
  const status=req.body?.status;
  if(!uuid(req.params.id)||!["saved","applied","interview","offer","placed","rejected"].includes(status))return res.status(400).json({error:"Invalid application status"});
  const r=await q("SELECT id FROM opportunities WHERE id=$1",[req.params.id]);if(!r.rows.length)return res.status(404).json({error:"Opportunity unavailable"});
  await q("INSERT INTO job_applications(user_id,opportunity_id,status,notes) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,opportunity_id) DO UPDATE SET status=$3,notes=$4,updated_at=NOW()",[req.user.id,req.params.id,status,clean(req.body?.notes,1200)]);res.json({ok:true,status});
 }catch(e){sendError(res,e)}});
 app.get("/api/performance/trends",requireUser,async(req,res)=>{try{
  const [recent,total]=await Promise.all([q("SELECT overall_score,scores,mode,difficulty,created_at FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[req.user.id]),q("SELECT COUNT(*)::int total FROM simulation_results WHERE user_id=$1",[req.user.id])]);
  res.json({total_reps:total.rows[0]?.total||0,recent:recent.rows.reverse()});
 }catch(e){sendError(res,e)}});
 app.get("/api/member/overview",requireUser,async(req,res)=>{try{
  const [lessons,pending,apps,assess]=await Promise.all([
   q("SELECT COUNT(*) FILTER(WHERE lp.completed_at IS NOT NULL)::int completed,COUNT(*)::int total FROM training_lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1 WHERE l.published=TRUE",[req.user.id]),
   q("SELECT COUNT(*) FILTER(WHERE status='pending')::int pending FROM mentor_submissions WHERE user_id=$1",[req.user.id]),
   q("SELECT COUNT(*) FILTER(WHERE status IN ('applied','interview','offer','placed'))::int active FROM job_applications WHERE user_id=$1",[req.user.id]),
   q("SELECT status FROM skill_assessments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[req.user.id])
  ]);
  res.json({academy:lessons.rows[0],mentor_pending:pending.rows[0]?.pending||0,applications_active:apps.rows[0]?.active||0,assessment:assess.rows[0]?.status||null});
 }catch(e){sendError(res,e)}});
 app.get("/api/workplace/assessment",requireUser,async(req,res)=>{try{
  const r=await q("SELECT state,updated_at FROM workplace_progress WHERE user_id=$1",[req.user.id]);
  const data=r.rows[0]?.state;
  if(!data)return res.json({ready:false,detail:"Start a simulated Workplace shift first."});
  const leads=Array.isArray(data.leads)?data.leads:[],bookings=Array.isArray(data.bookings)?data.bookings:[];
  const messages=leads.reduce((n,l)=>n+Math.max(0,Number(l.messages)||0),0);
  const qualified=leads.filter(l=>l.aiQualified).length;
  const incorrect=leads.filter(l=>/qualified/i.test(String(l.status||""))&&!l.aiQualified).length;
  const validBookings=bookings.filter(b=>leads.some(l=>l.name===b.name&&l.aiQualified)).length;
  const handoff=String(data.handoff||"").trim(),reflection=String(data.notes||"").trim();
  const detail=[
   {name:"Prospect conversations",value:messages,target:8,points:25},
   {name:"Evidence-based qualification",value:qualified,target:2,points:25},
   {name:"Correctly booked appointments",value:validBookings,target:1,points:20},
   {name:"Closer handoff",value:handoff.length,target:70,points:15},
   {name:"Written shift reflection",value:reflection.length,target:100,points:15}
  ];
  const score=Math.max(0,Math.min(100,Math.round(detail.reduce((sum,x)=>sum+x.points*Math.min(1,x.value/x.target),0)-incorrect*8)));
  const feedback=[
   ...(messages<8?["Practise more conversations before completing your shift."]:[]),
   ...(qualified<2?["Build stronger evidence before qualifying prospects."]:[]),
   ...(incorrect?["Review CRM records marked qualified without AI-supported evidence."]:[]),
   ...(validBookings<1?["Confirm genuine qualification and consent before booking."]:[]),
   ...(handoff.length<70?["Write a more complete factual closer handoff."]:[]),
   ...(reflection.length<100?["Reflect on what went well and one concrete improvement."]:[])
  ];
  res.json({ready:true,score,detail,feedback,stage:Number(data.stage)||0,
   updated_at:r.rows[0].updated_at,disclaimer:"Practice-only automated shift review. Not a hiring credential or mentor approval."});
 }catch(e){sendError(res,e)}});

 // Journey V13: actual account-scoped activity, not synthetic scores or credentials.
 app.get("/api/member/journey",requireUser,async(req,res)=>{try{
  const [days,nextLesson,lessons,mentor,pending,session,scores,applications,assessment]=await Promise.all([
   q("SELECT day FROM programme_progress WHERE user_id=$1 AND completed=TRUE ORDER BY day",[req.user.id]),
   q("SELECT l.id,l.title,l.module_number FROM training_lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1 WHERE l.published=TRUE AND lp.completed_at IS NULL ORDER BY l.module_number,l.sort_order,l.created_at LIMIT 1",[req.user.id]),
   q("SELECT COUNT(*)::int total,COUNT(lp.completed_at)::int completed FROM training_lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1 WHERE l.published=TRUE",[req.user.id]),
   q("SELECT id,subject,feedback FROM mentor_submissions WHERE user_id=$1 AND status='needs_changes' AND acknowledged_at IS NULL AND feedback IS NOT NULL ORDER BY reviewed_at DESC LIMIT 1",[req.user.id]),
   q("SELECT COUNT(*)::int pending FROM mentor_submissions WHERE user_id=$1 AND status='pending'",[req.user.id]),
   q("SELECT id,updated_at FROM training_sessions WHERE user_id=$1 AND expires_at>NOW() ORDER BY updated_at DESC LIMIT 1",[req.user.id]),
   q("SELECT overall_score FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[req.user.id]),
   q("SELECT COUNT(*)::int active FROM job_applications WHERE user_id=$1 AND status IN ('applied','interview','offer','placed')",[req.user.id]),
   q("SELECT status FROM skill_assessments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[req.user.id])
  ]);
  const completed=new Set(days.rows.map(x=>Number(x.day)));
  const day=Array.from({length:40},(_,i)=>i+1).find(n=>!completed.has(n))||null;
  const recentReps=scores.rows.length;
  const recentAverage=recentReps?Math.round(scores.rows.reduce((sum,x)=>sum+Number(x.overall_score||0),0)/recentReps):0;
  const roleReady=completed.size>=30&&recentReps>=10&&recentAverage>=65;
  const interviewReady=completed.size>=35&&recentReps>=15&&recentAverage>=70;
  const stage=interviewReady?"INTERVIEW READY":roleReady?"TRAINING ROLE READY":recentReps>=5?"PRACTISING":completed.size>=5?"LEARNING":"FOUNDATIONS";
  const state={
   programme_completed:completed.size,programme_total:40,next_day:day,
   academy_total:lessons.rows[0]?.total||0,academy_completed:lessons.rows[0]?.completed||0,
   recent_reps:recentReps,recent_average:recentAverage,stage,
   pending_mentor:pending.rows[0]?.pending||0,applications_active:applications.rows[0]?.active||0,
   assessment_status:assessment.rows[0]?.status||null
  };
  const steps=[];
  if(mentor.rows[0])steps.push({key:"mentor",eyebrow:"MENTOR FEEDBACK",title:"Review your mentor's corrections",detail:mentor.rows[0].subject,action:"mentor"});
  if(session.rows[0])steps.push({key:"resume",eyebrow:"IN PROGRESS",title:"Resume your conversation",detail:"Continue your saved AI roleplay where you stopped.",action:"resume"});
  if(nextLesson.rows[0]){
   const lesson=nextLesson.rows[0];
   steps.push({key:"lesson",eyebrow:"CONTINUE LEARNING",title:lesson.title,detail:"Module "+lesson.module_number+" · Next unfinished published lesson",action:"lesson",lesson_id:lesson.id});
  }
  if(day!==null)steps.push({key:"day",eyebrow:"40-DAY PROGRAMME",title:"Complete Day "+day,detail:"Record what you practised and the evidence of your work.",action:"programme"});
  steps.push({key:"practice",eyebrow:"DELIBERATE PRACTICE",title:recentReps?"Train your weakest measured skill":"Establish your first Setter Score",detail:recentReps?"Use the AI Coach to select your next targeted rep.":"Start a simulated conversation and get actionable feedback.",action:recentReps?"coach":"first-rep"});
  if(roleReady&&state.assessment_status!=="pending"&&state.assessment_status!=="approved")steps.push({key:"assessment",eyebrow:"NEXT MILESTONE",title:"Request a mentor assessment",detail:"Readiness indicators are not a verified employment credential.",action:"assessment"});
  res.set("Cache-Control","no-store").json({summary:state,next:steps.slice(0,3),all:steps});
 }catch(e){sendError(res,e)}});

}
