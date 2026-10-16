
import crypto from "node:crypto";
import {q} from "./db.js";
const checkId=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||""));
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
 app.patch("/api/advanced/threads/:id/channel",requireUser,async(req,res)=>{try{
  if(!checkId(req.params.id)||!["dm","email","linkedin","phone"].includes(req.body?.channel))return res.status(400).json({error:"Invalid channel"});
  const r=await q("UPDATE advanced_threads SET channel=$3,updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *",[req.params.id,req.user.id,req.body.channel]);
  if(!r.rows.length)return res.status(404).json({error:"Conversation unavailable"});res.json({thread:expose(r.rows[0])});
 }catch(e){fail(res,e)}});
 app.post("/api/advanced/threads/:id/message",requireUser,async(req,res)=>{try{
  if(!checkId(req.params.id))return res.status(400).json({error:"Invalid conversation"});
  const now=Date.now(),last=wait.get(req.user.id)||0;
  if(now-last<4000)return res.status(429).json({error:"Wait a few seconds between replies"});
  wait.set(req.user.id,now);if(wait.size>2000)wait.clear();
  const message=clean(req.body?.message,1100);
  if(message.length<2)return res.status(400).json({error:"Write a message first"});
  const r=await q("SELECT * FROM advanced_threads WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);
  const t=r.rows[0];if(!t)return res.status(404).json({error:"Conversation unavailable"});
  const history=Array.isArray(t.messages)?t.messages:[];if(history.length>80)return res.status(400).json({error:"Thread complete; start another"});
  if(t.phase==="awaiting_follow_up"&&t.due_at&&new Date(t.due_at)>new Date())return res.status(409).json({error:"Prospect follow-up is not yet due"});
  const offer=t.offer_id?(await q("SELECT title,audience,proposition,price_text,objections FROM advanced_offers WHERE id=$1 AND user_id=$2",[t.offer_id,req.user.id])).rows[0]:null;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI conversations are not configured"});
  const prompt=[
    "Act as one FICTIONAL appointment setting prospect in a training simulator. Stay consistent with your role, personality, business and earlier messages.",
    "Persona: "+JSON.stringify(t.persona),
    "Channel: "+t.channel+". Student offer: "+JSON.stringify(offer||{title:"unspecified service"}),
    "Conversation so far: "+JSON.stringify(history.slice(-24)),
    "Student message: "+message,
    "Respond in one to four natural sentences. You may decline, object or need to follow up later. Never ask for real personal data or payments. Challenge unsupported sales claims.",
    "Return JSON ONLY with keys reply, feedback (short actionable coaching note), phase (active,awaiting_follow_up,qualified,closed), follow_up_days (0,1,2,3,7)."
  ].join("\n");
  let output;
  try{const ans=await client.responses.create({model:process.env.COACH_MODEL||"gpt-5.6-sol",input:prompt,max_output_tokens:400});output=ans.output_text}
  catch(e){console.error("Prospect generation",e?.message);return res.status(502).json({error:"Prospect temporarily unavailable; try again"})}
  let parsed;try{parsed=JSON.parse(String(output||""))}catch{return res.status(502).json({error:"Could not read the reply; message not saved"})}
  const reply=clean(parsed.reply,750),feedback=clean(parsed.feedback,450);
  if(!reply)return res.status(502).json({error:"No reply generated"});
  const phase=["active","awaiting_follow_up","qualified","closed"].includes(parsed.phase)?parsed.phase:"active";
  const days=[1,2,3,7].includes(+parsed.follow_up_days)?+parsed.follow_up_days:1;
  const due=phase==="awaiting_follow_up"?new Date(Date.now()+days*86400000):null;
  const timestamp=new Date().toISOString();
  const next=[...history,{role:"student",text:message,channel:t.channel,at:timestamp},{role:"prospect",text:reply,channel:t.channel,at:timestamp}];
  const saved=await q("UPDATE advanced_threads SET messages=$3::jsonb,phase=$4,due_at=$5,last_feedback=$6,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND updated_at=$7 RETURNING *",[t.id,req.user.id,JSON.stringify(next),phase,due,feedback,t.updated_at]);
  if(!saved.rows.length)return res.status(409).json({error:"Another message updated this conversation; refresh first"});
  res.json({thread:expose(saved.rows[0])});
 }catch(e){fail(res,e)}});

}
