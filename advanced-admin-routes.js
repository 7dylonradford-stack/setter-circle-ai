
import crypto from "node:crypto";
import {q} from "./db.js";
const c=(x,n=1000)=>String(x??"").trim().slice(0,n);
const fail=(res,e)=>{console.error("Admin analytics",e?.message);res.status(500).json({error:"Administration currently unavailable"})};
export function registerAdvancedAdmin(app,{requireUser,requireAdmin}){
 app.get("/api/advanced/admin/analytics",requireAdmin,async(req,res)=>{try{
  const [users,lessons,reps,mentor,jobs,outcomes,threads,workshops]=await Promise.all([
   q("SELECT COUNT(*)::int n FROM users"),
   q("SELECT COUNT(*)::int n FROM lesson_progress"),
   q("SELECT COUNT(*)::int n FROM simulation_results"),
   q("SELECT COUNT(*) FILTER(WHERE status='pending')::int pending FROM mentor_submissions"),
   q("SELECT status,COUNT(*)::int n FROM job_applications GROUP BY status"),
   q("SELECT status,COUNT(*)::int n FROM studio_outcomes GROUP BY status"),
   q("SELECT COUNT(*)::int n FROM advanced_threads"),
   q("SELECT COUNT(*)::int n FROM studio_workshop_rsvps")
  ]);
  res.json({members:users.rows[0].n,lessons_completed:lessons.rows[0].n,simulations:reps.rows[0].n,mentor_pending:mentor.rows[0].pending,job_stages:jobs.rows,outcomes:outcomes.rows,advanced_threads:threads.rows[0].n,workshop_rsvps:workshops.rows[0].n});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/admin/employer-feedback",requireAdmin,async(req,res)=>{try{
  const r=await q("SELECT * FROM studio_employer_feedback ORDER BY created_at DESC LIMIT 80");res.json({feedback:r.rows});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/admin/employer-feedback",requireAdmin,async(req,res)=>{try{
  const x=req.body||{};
  if(c(x.employer,120).length<3||c(x.skill,80).length<3||c(x.observation,1300).length<20)return res.status(400).json({error:"Employer, skill area and evidence required"});
  await q("INSERT INTO studio_employer_feedback(id,employer,skill,observation,verified) VALUES($1,$2,$3,$4,FALSE)",[crypto.randomUUID(),c(x.employer,120),c(x.skill,80),c(x.observation,1300)]);res.json({ok:true,verified:false});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/admin/agencies",requireAdmin,async(req,res)=>{try{
  const r=await q("SELECT * FROM studio_agency_spaces ORDER BY created_at DESC");res.json({agencies:r.rows});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/admin/agencies",requireAdmin,async(req,res)=>{try{
  const x=req.body||{};if(c(x.agency_name,130).length<3||c(x.description,900).length<15)return res.status(400).json({error:"Provide agency name and description"});
  const color=/^#[0-9a-f]{6}$/i.test(String(x.brand_color||""))?x.brand_color:"#D0F83B";
  const r=await q("INSERT INTO studio_agency_spaces(id,agency_name,description,brand_color) VALUES($1,$2,$3,$4) RETURNING *",[crypto.randomUUID(),c(x.agency_name,130),c(x.description,900),color]);res.json({agency:r.rows[0]});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/settings",requireUser,async(req,res)=>{try{
  const r=await q("SELECT locale,reminders,voice_enabled FROM studio_settings WHERE user_id=$1",[req.user.id]);
  res.json({settings:r.rows[0]||{locale:"en-GB",reminders:false,voice_enabled:false}});
 }catch(e){fail(res,e)}});
 app.put("/api/advanced/settings",requireUser,async(req,res)=>{try{
  const x=req.body||{},locale=["en-GB","en-US","en-IE","en-AU"].includes(x.locale)?x.locale:"en-GB";
  const r=await q("INSERT INTO studio_settings(user_id,locale,reminders,voice_enabled) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET locale=$2,reminders=$3,voice_enabled=$4,updated_at=NOW() RETURNING locale,reminders,voice_enabled",[req.user.id,locale,x.reminders===true,x.voice_enabled===true]);res.json({settings:r.rows[0]});
 }catch(e){fail(res,e)}});
}
