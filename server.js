import express from "express";
import OpenAI from "openai";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({limit:"200kb"}));
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const sessions = new Map();
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

OPENING ALREADY SENT
${s.scenario.opening}`;
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

app.post("/api/session", async (req,res)=>{
 try{
  const {mode,difficulty,scenario}=req.body;
  if(!scenario?.name) return res.status(400).json({error:"Invalid scenario"});
  const id=crypto.randomUUID();
  sessions.set(id,{mode,difficulty:Math.max(1,Math.min(4,difficulty||2)),scenario,transcript:[{role:"prospect",text:scenario.opening}],state:{trust:45,interest:45,patience:80},responseId:null,created:Date.now()});
  res.json({session_id:id});
 }catch(e){res.status(500).json({error:"Could not create session"})}
});

app.post("/api/message", async (req,res)=>{
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

app.post("/api/debrief",async(req,res)=>{
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
  const data=JSON.parse(r.output_text); sessions.delete(req.body.session_id); res.json(data);
 }catch(e){console.error(e);res.status(500).json({error:"Debrief failed"})}
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Setter Circle AI running on ${port}`));
