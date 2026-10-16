
import crypto from "node:crypto";
import {q} from "./db.js";
const checkId=x=>/^[0-9a-f-]{36}$/i.test(String(x||""));
const clean=(x,n=1000)=>String(x??"").trim().slice(0,n);
const fail=(res,e)=>{console.error("Advanced studio",e?.message);res.status(500).json({error:"Studio temporarily unavailable"})};
const people=[
{name:"Sam",role:"Agency founder",mood:"busy",character:"Brief and time-conscious",sector:"Marketing"},
{name:"Harper",role:"Head of sales",mood:"analytical",character:"Methodical and sceptical",sector:"Services"},
{name:"Alex",role:"Creator",mood:"friendly",character:"Friendly but noncommittal",sector:"Coaching"},
{name:"Morgan",role:"Operations director",mood:"reserved",character:"Reserved and cautious",sector:"SaaS"}
];
const expose=x=>({id:x.id,offer_id:x.offer_id,persona:{name:x.persona?.name,role:x.persona?.role,sector:x.persona?.sector,mood:x.persona?.mood},channel:x.channel,phase:x.phase,due_at:x.due_at,messages:x.messages,last_feedback:x.last_feedback,updated_at:x.updated_at});
const wait=new Map();
export function registerAdvancedTraining(app,{requireUser,client}){
 app.get("/api/advanced/offers",requireUser,async(req,res)=>{try{
  const r=await q("SELECT * FROM advanced_offers WHERE user_id=$1 ORDER BY created_at DESC LIMIT 40",[req.user.id]);res.json({offers:r.rows});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/offers",requireUser,async(req,res)=>{try{
  const x=req.body||{},name=clean(x.title,90),audience=clean(x.audience,180),proposition=clean(x.proposition,1200);
  if(name.length<3||audience.length<4||proposition.length<15)return res.status(400).json({error:"Enter a name, audience and useful proposition"});
  const objections=Array.isArray(x.objections)?x.objections.slice(0,8).map(y=>clean(y,140)):[];
  const r=await q("INSERT INTO advanced_offers(id,user_id,title,audience,proposition,price_text,objections) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *",[crypto.randomUUID(),req.user.id,name,audience,proposition,clean(x.price_text,90),JSON.stringify(objections)]);
  res.json({offer:r.rows[0]});
 }catch(e){fail(res,e)}});
 app.get("/api/advanced/threads",requireUser,async(req,res)=>{try{
  const r=await q("SELECT * FROM advanced_threads WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50",[req.user.id]);res.json({threads:r.rows.map(expose)});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/threads",requireUser,async(req,res)=>{try{
  const channel=clean(req.body?.channel,15);
  if(!["dm","email","linkedin","phone"].includes(channel))return res.status(400).json({error:"Choose a practice channel"});
  let offer=null;
  if(req.body?.offer_id){
   if(!checkId(req.body.offer_id))return res.status(400).json({error:"Invalid offer"});
   const r=await q("SELECT id FROM advanced_offers WHERE id=$1 AND user_id=$2",[req.body.offer_id,req.user.id]);
   if(!r.rows.length)return res.status(404).json({error:"Offer not found"});offer=r.rows[0].id;
  }
  const persona=people[Math.floor(Math.random()*people.length)];
  const note="You found "+persona.name+"'s public business profile. Start a relevant conversation.";
  const r=await q("INSERT INTO advanced_threads(id,user_id,offer_id,persona,channel,messages) VALUES($1,$2,$3,$4::jsonb,$5,$6::jsonb) RETURNING *",[crypto.randomUUID(),req.user.id,offer,JSON.stringify(persona),channel,JSON.stringify([{role:"note",text:note,channel,at:new Date().toISOString()}])]);
  res.json({thread:expose(r.rows[0])});
 }catch(e){fail(res,e)}});
}
