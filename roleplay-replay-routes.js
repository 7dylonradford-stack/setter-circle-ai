
import crypto from "node:crypto";
import {q} from "./db.js";
const valid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||""));
const clean=(x,n=1400)=>String(x??"").trim().slice(0,n);
const fail=(res,e)=>{console.error("Replay studio failure",e?.message);res.status(500).json({error:"Replay Studio temporarily unavailable"})};
const replaySchema={
 type:"object",additionalProperties:false,
 properties:{
  prospect_reply:{type:"string"},
  comparison:{type:"string"},
  improvements:{type:"array",items:{type:"string"},minItems:1,maxItems:3},
  remaining_issue:{type:"string"},
  coach_note:{type:"string"}
 },
 required:["prospect_reply","comparison","improvements","remaining_issue","coach_note"]
};
export function registerRoleplayReplay(app,{requireUser,client}){
 app.get("/api/roleplay/replays",requireUser,async(req,res)=>{try{
  const r=await q("SELECT id,prospect_name,prospect_role,mode,difficulty,overall_score,created_at,transcript,debrief FROM simulation_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25",[req.user.id]);
  res.set("Cache-Control","no-store").json({sessions:r.rows.map(x=>({
   id:x.id,name:x.prospect_name,role:x.prospect_role,mode:x.mode,difficulty:x.difficulty,
   score:x.overall_score,created_at:x.created_at,
   turns:(Array.isArray(x.transcript)?x.transcript:[]).filter(m=>m.role==="student"||m.role==="user").length,
   coaching_moments:(x.debrief?.message_feedback||[]).filter(m=>m.rating==="weak").length
  }))});
 }catch(e){fail(res,e)}});
 app.get("/api/roleplay/replays/:id",requireUser,async(req,res)=>{try{
  if(!valid(req.params.id))return res.status(400).json({error:"Invalid training record"});
  const [r,h]=await Promise.all([
   q("SELECT id,prospect_name,prospect_role,mode,difficulty,overall_score,transcript,debrief,created_at FROM simulation_results WHERE user_id=$1 AND id=$2",[req.user.id,req.params.id]),
   q("SELECT id,student_turn,original_text,rewrite_text,alternative_reply,feedback,created_at FROM roleplay_rehearsals WHERE user_id=$1 AND simulation_id=$2 ORDER BY created_at DESC LIMIT 30",[req.user.id,req.params.id])
  ]);
  if(!r.rows[0])return res.status(404).json({error:"Training record unavailable"});
  res.set("Cache-Control","no-store").json({session:r.rows[0],rehearsals:h.rows,disclaimer:"Alternative outcomes are AI-generated counterfactual practice, not proven results or additional competency scores."});
 }catch(e){fail(res,e)}});
 app.get("/api/roleplay/difficulty",requireUser,async(req,res)=>{try{
  const mode=["network","client","role"].includes(req.query.mode)?req.query.mode:"client";
  const r=await q("SELECT overall_score,difficulty FROM simulation_results WHERE user_id=$1 AND mode=$2 ORDER BY created_at DESC LIMIT 8",[req.user.id,mode]);
  const rows=r.rows,average=rows.length?Math.round(rows.reduce((n,x)=>n+Number(x.overall_score||0),0)/rows.length):null;
  const last=rows[0]?.difficulty||1;
  let difficulty=1;
  if(rows.length>=3) difficulty=average>=85?Math.min(4,Math.max(2,last+1)):average>=72?Math.max(2,Math.min(4,last)):average>=55?Math.max(1,Math.min(3,last)):Math.max(1,last-1);
  res.set("Cache-Control","no-store").json({mode,difficulty,average,recent_count:rows.length,
   explanation:rows.length<3?"Start with foundation practice. Complete three roleplays for a better difficulty recommendation.":average>=85?"Your recent practice is strong. Try a harder scenario.":average<55?"Return to a manageable difficulty and build consistency.":"Stay at a challenging but workable level and focus on corrections.",
   advisory:true});
 }catch(e){fail(res,e)}});
 app.post("/api/roleplay/replays/:id/rewrite",requireUser,async(req,res)=>{try{
  if(!valid(req.params.id))return res.status(400).json({error:"Invalid training record"});
  const turn=Number(req.body?.student_turn),rewrite=clean(req.body?.rewrite_text,900);
  if(!Number.isInteger(turn)||turn<1||turn>60||rewrite.length<5)return res.status(400).json({error:"Choose a student message and write a meaningful alternative"});
  const [result,count]=await Promise.all([
   q("SELECT transcript,debrief,prospect_name,prospect_role,mode,difficulty FROM simulation_results WHERE user_id=$1 AND id=$2",[req.user.id,req.params.id]),
   q("SELECT COUNT(*)::int n FROM roleplay_rehearsals WHERE user_id=$1 AND created_at>NOW()-INTERVAL '24 hours'",[req.user.id])
  ]);
  const session=result.rows[0];if(!session)return res.status(404).json({error:"Record not found"});
  if(Number(count.rows[0]?.n||0)>=30)return res.status(429).json({error:"Today's rewrite limit has been reached. Try again tomorrow."});
  const transcript=Array.isArray(session.transcript)?session.transcript:[];
  let nth=0,index=-1;for(let i=0;i<transcript.length;i++){
   if(transcript[i].role==="student"||transcript[i].role==="user"){nth++;if(nth===turn){index=i;break}}
  }
  if(index<0)return res.status(400).json({error:"That student turn does not exist"});
  const original=clean(transcript[index].text),prior=transcript.slice(Math.max(0,index-7),index);
  const next=transcript.slice(index+1).find(x=>x.role==="prospect"||x.role==="assistant");
  if(rewrite.toLowerCase()===original.toLowerCase())return res.status(400).json({error:"Change the message to explore an alternative"});
  const prompt=[
   "This is a completed, FICTIONAL appointment-setting training conversation. Generate a counterfactual, not a real outcome or verified score.",
   "Stay in character as the same prospect and preserve the factual details established before the rewritten turn.",
   "Prospect: "+clean(session.prospect_name,80)+" · "+clean(session.prospect_role,140)+". Mode: "+session.mode+". Difficulty: "+session.difficulty+".",
   "Prior messages: "+JSON.stringify(prior),
   "Original student message: "+original,
   "Original prospect reply: "+clean(next?.text,900),
   "Student's alternative message: "+rewrite,
   "Simulate ONE plausible prospect reply to the alternative, then compare it with the original without inventing proof of booking or earnings.",
   "Give 1–3 concrete improvements, any remaining weakness, and a concise coach note.",
   "Return JSON strictly conforming to the requested response format."
  ].join("\n");
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI rewrite practice currently unavailable"});
  let data;
  try{
   const ai=await client.responses.create({model:process.env.COACH_MODEL||"gpt-5.6-sol",input:prompt,
    reasoning:{effort:"medium"},max_output_tokens:650,
    text:{format:{type:"json_schema",name:"counterfactual_replay",strict:true,schema:replaySchema}}});
   data=JSON.parse(ai.output_text);
  }catch(e){console.error("Replay model failure",e?.message);return res.status(502).json({error:"Could not generate an alternative. Please retry."})}
  const reply=clean(data.prospect_reply,850),comparison=clean(data.comparison,900),note=clean(data.coach_note,700);
  if(!reply||!comparison)return res.status(502).json({error:"Incomplete replay response. Please retry."});
  const feedback={comparison,improvements:(data.improvements||[]).slice(0,3).map(x=>clean(x,300)),remaining_issue:clean(data.remaining_issue,450),coach_note:note};
  const saved=await q("INSERT INTO roleplay_rehearsals(id,user_id,simulation_id,student_turn,original_text,rewrite_text,alternative_reply,feedback) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id,student_turn,original_text,rewrite_text,alternative_reply,feedback,created_at",
   [crypto.randomUUID(),req.user.id,req.params.id,turn,original,rewrite,reply,JSON.stringify(feedback)]);
  res.set("Cache-Control","no-store").json({rehearsal:saved.rows[0],disclaimer:"AI simulation only; no additional Setter Score is awarded."});
 }catch(e){fail(res,e)}});
}
