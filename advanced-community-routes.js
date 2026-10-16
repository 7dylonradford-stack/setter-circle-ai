
import crypto from "node:crypto";
import {q} from "./db.js";
const id=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||""));
const cut=(x,n=800)=>String(x??"").trim().slice(0,n);
const bad=(res,e)=>{console.error("Community studio",e?.message);res.status(500).json({error:"Community service temporarily unavailable"})};
const when=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?null:d};
const https=x=>{try{const u=new URL(x);return u.protocol==="https:"?u.href:null}catch{return null}};
export function registerCommunityStudio(app,{requireUser,requireAdmin}){
 app.get("/api/advanced/workshops",requireUser,async(req,res)=>{try{
  const r=await q("SELECT w.id,w.title,w.description,w.host,w.starts_at,w.duration_minutes,w.join_url,(v.user_id IS NOT NULL) rsvped FROM studio_workshops w LEFT JOIN studio_workshop_rsvps v ON v.workshop_id=w.id AND v.user_id=$1 WHERE w.published=TRUE ORDER BY w.starts_at DESC LIMIT 60",[req.user.id]);res.json({workshops:r.rows});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/admin/workshops",requireAdmin,async(req,res)=>{try{
  const x=req.body||{},at=when(x.starts_at),link=x.join_url?https(x.join_url):null;
  if(cut(x.title,110).length<4||cut(x.description,1100).length<12||!at||(x.join_url&&!link))return res.status(400).json({error:"Provide a title, description, date and secure meeting link"});
  const r=await q("INSERT INTO studio_workshops(id,title,description,host,starts_at,duration_minutes,join_url,published) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,title",[crypto.randomUUID(),cut(x.title,110),cut(x.description,1100),cut(x.host,100)||"Setter Circle",at,Math.max(15,Math.min(180,+x.duration_minutes||60)),link,x.published===true]);res.json({workshop:r.rows[0]});
 }catch(e){bad(res,e)}});
 app.put("/api/advanced/workshops/:id/rsvp",requireUser,async(req,res)=>{try{
  if(!id(req.params.id))return res.status(400).json({error:"Invalid workshop"});
  const w=await q("SELECT id FROM studio_workshops WHERE id=$1 AND published=TRUE",[req.params.id]);if(!w.rows[0])return res.status(404).json({error:"Unavailable"});
  if(req.body?.attending===false)await q("DELETE FROM studio_workshop_rsvps WHERE workshop_id=$1 AND user_id=$2",[req.params.id,req.user.id]);
  else await q("INSERT INTO studio_workshop_rsvps(workshop_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.params.id,req.user.id]);res.json({ok:true});
 }catch(e){bad(res,e)}});
 app.get("/api/advanced/cohorts",requireUser,async(req,res)=>{try{
  const r=await q("SELECT c.*,(m.user_id IS NOT NULL) enrolled FROM studio_cohorts c LEFT JOIN studio_cohort_members m ON m.cohort_id=c.id AND m.user_id=$1 WHERE c.active=TRUE ORDER BY c.starts_at DESC",[req.user.id]);res.json({cohorts:r.rows});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/admin/cohorts",requireAdmin,async(req,res)=>{try{
  const x=req.body||{},start=when(x.starts_at);if(!start||cut(x.name,100).length<3||cut(x.description,900).length<12)return res.status(400).json({error:"Enter a cohort, start date and description"});
  const r=await q("INSERT INTO studio_cohorts(id,name,description,starts_at) VALUES($1,$2,$3,$4) RETURNING *",[crypto.randomUUID(),cut(x.name,100),cut(x.description,900),start]);res.json({cohort:r.rows[0]});
 }catch(e){bad(res,e)}});
 app.put("/api/advanced/cohorts/:id/enrol",requireUser,async(req,res)=>{try{
  if(!id(req.params.id))return res.status(400).json({error:"Invalid cohort"});
  const r=await q("SELECT id FROM studio_cohorts WHERE id=$1 AND active=TRUE",[req.params.id]);if(!r.rows[0])return res.status(404).json({error:"Unavailable"});
  if(req.body?.enrolled===false)await q("DELETE FROM studio_cohort_members WHERE cohort_id=$1 AND user_id=$2",[req.params.id,req.user.id]);
  else await q("INSERT INTO studio_cohort_members(cohort_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.params.id,req.user.id]);res.json({ok:true});
 }catch(e){bad(res,e)}});
 app.get("/api/advanced/peers",requireUser,async(req,res)=>{try{
  const [open,own]=await Promise.all([
   q("SELECT id,level,created_at FROM studio_peer_rooms WHERE status='open' AND host_user_id<>$1 ORDER BY created_at DESC LIMIT 15",[req.user.id]),
   q("SELECT id,level,status,created_at,host_user_id,guest_user_id FROM studio_peer_rooms WHERE host_user_id=$1 OR guest_user_id=$1 ORDER BY created_at DESC LIMIT 20",[req.user.id])
  ]);res.json({available:open.rows,rooms:own.rows});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/peers",requireUser,async(req,res)=>{try{
  const level=["beginner","intermediate","advanced"].includes(req.body?.level)?req.body.level:"beginner";
  const ex=await q("SELECT id FROM studio_peer_rooms WHERE host_user_id=$1 AND status='open' LIMIT 1",[req.user.id]);if(ex.rows.length)return res.status(409).json({error:"Close your open room first"});
  const r=await q("INSERT INTO studio_peer_rooms(id,host_user_id,level) VALUES($1,$2,$3) RETURNING id,level,status",[crypto.randomUUID(),req.user.id,level]);res.json({room:r.rows[0]});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/peers/:id/join",requireUser,async(req,res)=>{try{
  if(!id(req.params.id))return res.status(400).json({error:"Invalid room"});
  const r=await q("UPDATE studio_peer_rooms SET guest_user_id=$2,status='active' WHERE id=$1 AND status='open' AND host_user_id<>$2 RETURNING id,status",[req.params.id,req.user.id]);
  if(!r.rows[0])return res.status(409).json({error:"Room no longer available"});res.json({room:r.rows[0]});
 }catch(e){bad(res,e)}});
 app.get("/api/advanced/peers/:id/messages",requireUser,async(req,res)=>{try{
  if(!id(req.params.id))return res.status(400).json({error:"Invalid room"});
  const room=await q("SELECT status FROM studio_peer_rooms WHERE id=$1 AND (host_user_id=$2 OR guest_user_id=$2)",[req.params.id,req.user.id]);
  if(!room.rows[0])return res.status(403).json({error:"You are not a participant"});
  const r=await q("SELECT id,message,created_at,(user_id=$2) own FROM studio_peer_messages WHERE room_id=$1 ORDER BY created_at DESC LIMIT 80",[req.params.id,req.user.id]);res.json({status:room.rows[0].status,messages:r.rows.reverse()});
 }catch(e){bad(res,e)}});
 const msgRate=new Map();
 app.post("/api/advanced/peers/:id/messages",requireUser,async(req,res)=>{try{
  const text=cut(req.body?.message,750);
  if(!id(req.params.id)||text.length<2)return res.status(400).json({error:"Write a valid message"});
  const k=req.user.id,last=msgRate.get(k)||0;if(Date.now()-last<1200)return res.status(429).json({error:"Slow down"});msgRate.set(k,Date.now());
  const r=await q("SELECT id FROM studio_peer_rooms WHERE id=$1 AND status='active' AND (host_user_id=$2 OR guest_user_id=$2)",[req.params.id,req.user.id]);if(!r.rows[0])return res.status(403).json({error:"Join an active room first"});
  await q("INSERT INTO studio_peer_messages(id,room_id,user_id,message) VALUES($1,$2,$3,$4)",[crypto.randomUUID(),req.params.id,req.user.id,text]);res.json({ok:true});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/peers/:id/close",requireUser,async(req,res)=>{try{
  const r=await q("UPDATE studio_peer_rooms SET status='closed' WHERE id=$1 AND host_user_id=$2 RETURNING id",[req.params.id,req.user.id]);
  if(!r.rows[0])return res.status(403).json({error:"Only room host can close"});res.json({ok:true});
 }catch(e){bad(res,e)}});
 app.get("/api/advanced/challenges",requireUser,async(req,res)=>{try{
  const r=await q("SELECT c.id,c.month_key,c.title,c.briefing,c.assessment,e.submission,e.review FROM studio_monthly_challenges c LEFT JOIN studio_challenge_entries e ON e.challenge_id=c.id AND e.user_id=$1 WHERE c.published=TRUE ORDER BY c.month_key DESC LIMIT 18",[req.user.id]);res.json({challenges:r.rows});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/admin/challenges",requireAdmin,async(req,res)=>{try{
  const x=req.body||{},month=cut(x.month_key,7);
  if(!/^\d{4}-\d{2}$/.test(month)||cut(x.title,140).length<4||cut(x.briefing,1300).length<20)return res.status(400).json({error:"Enter YYYY-MM, title and detailed challenge"});
  const r=await q("INSERT INTO studio_monthly_challenges(id,month_key,title,briefing,assessment,published) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(month_key) DO UPDATE SET title=$3,briefing=$4,assessment=$5,published=$6 RETURNING *",[crypto.randomUUID(),month,cut(x.title,140),cut(x.briefing,1300),cut(x.assessment,950),x.published===true]);res.json({challenge:r.rows[0]});
 }catch(e){bad(res,e)}});
 app.post("/api/advanced/challenges/:id/enter",requireUser,async(req,res)=>{try{
  const value=cut(req.body?.submission,1900);
  if(!id(req.params.id)||value.length<25)return res.status(400).json({error:"Write at least 25 characters"});
  const challenge=await q("SELECT id FROM studio_monthly_challenges WHERE id=$1 AND published=TRUE",[req.params.id]);if(!challenge.rows[0])return res.status(404).json({error:"Challenge unavailable"});
  await q("INSERT INTO studio_challenge_entries(id,challenge_id,user_id,submission) VALUES($1,$2,$3,$4) ON CONFLICT(challenge_id,user_id) DO UPDATE SET submission=$4,review=NULL,completed_at=NOW()",[crypto.randomUUID(),req.params.id,req.user.id,value]);res.json({ok:true});
 }catch(e){bad(res,e)}});
}
