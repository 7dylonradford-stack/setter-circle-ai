
/* SETTER CIRCLE / ROLEPLAY REPLAY STUDIO v14 */
(function(){
'use strict';
if(window.__setterReplayV14)return;window.__setterReplayV14=true;
const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const $=id=>document.getElementById(id);
const api=async(path,options={})=>{
 if(typeof window.accountFetch!=="function")throw Error("Sign in to review training");
 const res=await window.accountFetch(path,options),body=await res.json();
 if(!res.ok)throw Error(body.error||"This request failed");return body;
};
const post=x=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(x)});
let sessions=[],session=null,attempts=[],selectedTurn=1,currentRecommendation=null;
const banner=(eyebrow,title,desc)=>'<div class="rp14-heading"><span>'+esc(eyebrow)+'</span><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p></div>';
const button=(action,label,other="")=>'<button type="button" class="rp14-button" data-rp14="'+esc(action)+'" '+other+'>'+esc(label)+' <span aria-hidden="true">↗</span></button>';
const open=(title,description,markup)=>{if(typeof window.openWorkspace!=="function")return;
 window.openWorkspace(title,description,'<div class="rp14-root">'+markup+'</div>','ROLEPLAY LAB / CONVERSATION REPLAY');
};
const toast=msg=>{if(typeof window.toast==="function")window.toast(msg);else alert(msg)};
const stat=(name,value)=>'<div class="rp14-stat"><span>'+esc(name)+'</span><strong>'+esc(value)+'</strong></div>';
const row=()=>session?.transcript?.filter(m=>m.role==="student"||m.role==="user")||[];
async function list(){
 if(typeof window.hideResults==="function")window.hideResults();
 if(typeof window.closeTrainer==="function")window.closeTrainer();
 open("Replay Studio","Improve what you said, not just your next score.",banner("CONVERSATION INTELLIGENCE","Review every decision","Loading your completed roleplays…"));
 try{
  const d=await api("/api/roleplay/replays");sessions=d.sessions||[];
  const markup=banner("TRAINING HISTORY","Replay your conversations","Select a finished roleplay to revisit your real messages, find coaching opportunities and practise alternative replies.")+
  '<div class="rp14-gallery">'+sessions.map(s=>
   '<button type="button" class="rp14-card" data-rp14="open" data-id="'+esc(s.id)+'"><span>'+esc(s.mode?.toUpperCase()||"TRAINING")+' · LEVEL '+esc(s.difficulty)+'</span><h4>'+esc(s.name||"Fictional prospect")+'</h4><p>'+esc(s.role||"Practice session")+'</p>'+
   '<div><small>'+esc(s.turns)+' replies</small><small>'+esc(s.coaching_moments)+' coaching moments</small><strong>'+esc(s.score)+'/100</strong></div></button>'
  ).join("")+'</div>'+
  (sessions.length?"":'<div class="rp14-empty">You have no completed simulations yet. Complete an AI roleplay first, then return here to rehearse its key moments.</div>')+
  '<div class="rp14-footer">'+button("difficulty","Check recommended difficulty")+button("new-simulation","Start a new simulation")+'</div>';
  open("Replay Studio","Revisit completed roleplays and strengthen individual messages.",markup);
 }catch(e){open("Replay Studio","Your training history",'<div class="rp14-empty">'+esc(e.message)+'</div>');toast(e.message)}
}
function messagesHtml(){
 const all=Array.isArray(session?.transcript)?session.transcript:[];
 let n=0;
 return all.map(m=>{
  const mine=m.role==="student"||m.role==="user",number=mine?++n:0,record=mine?(session.debrief?.message_feedback||[])[number-1]:null;
  return '<div class="rp14-chat-row '+(mine?'mine':'prospect')+'"><div class="rp14-chat">'+
   '<small>'+(mine?'YOU · MESSAGE '+number:esc(session.prospect_name||"PROSPECT"))+'</small><p>'+esc(m.text)+'</p></div>'+
   (mine?'<button class="rp14-turn '+(selectedTurn===number?'active':'')+'" data-rp14="turn" data-turn="'+number+'">Analyse message '+number+(record?' · '+esc(record.rating):'')+' ↗</button>':'')+'</div>';
 }).join("");
}
function attemptsHtml(turn){
 const arr=attempts.filter(x=>Number(x.student_turn)===turn);
 return arr.map(x=>'<div class="rp14-alternative"><div class="rp14-alternative-title">YOUR ALTERNATIVE <small>'+esc(new Date(x.created_at).toLocaleDateString("en-GB"))+'</small></div>'+
  '<p>'+esc(x.rewrite_text)+'</p><strong>How this fictional prospect might respond</strong><blockquote>'+esc(x.alternative_reply)+'</blockquote>'+
  '<strong>Comparison with your original</strong><p>'+esc(x.feedback?.comparison)+'</p>'+
  '<ul>'+((x.feedback?.improvements||[]).map(t=>'<li>'+esc(t)+'</li>').join(""))+'</ul>'+
  (x.feedback?.remaining_issue?'<small>Still to improve: '+esc(x.feedback.remaining_issue)+'</small>':'')+'</div>').join("");
}
function focus(){
 if(!session)return;
 const turn=row()[selectedTurn-1],feedback=(session.debrief?.message_feedback||[])[selectedTurn-1];
 const fallback=feedback?.better_line||"";
 const rewriteBox=$("rp14Rewrite"),notice=$("rp14Focus");
 if(!notice)return;
 notice.innerHTML='<div class="rp14-focus-eyebrow">TURN '+selectedTurn+' · '+esc((feedback?.rating||"UNASSESSED").toUpperCase())+'</div>'+
  '<h4>Improve this message</h4><div class="rp14-quote">'+esc(turn?.text||"")+'</div>'+
  '<p>'+esc(feedback?.feedback||"Revisit the prospect's previous message. Respond directly, ask one relevant question and avoid unsupported claims.")+'</p>'+
  (fallback?'<div class="rp14-model">COACHING EXAMPLE <p>'+esc(fallback)+'</p></div>':'')+
  '<label class="rp14-field" for="rp14Rewrite">YOUR REWRITTEN MESSAGE</label>'+
  '<textarea id="rp14Rewrite" rows="4" placeholder="Write how you would approach this moment instead."></textarea>'+
  '<div class="rp14-actions">'+button("compare","Simulate an alternative reply")+'</div>'+
  '<div class="rp14-attempts">'+attemptsHtml(selectedTurn)+'</div>'+
  '<p class="rp14-disclaimer">Alternative responses are hypothetical AI practice, not observed outcomes. Rewriting does not change your original score.</p>';
 if(rewriteBox?.value&&$("rp14Rewrite"))$("rp14Rewrite").value=rewriteBox.value;
}
async function openSession(id){
 open("Replay Studio","Preparing this session…",banner("SESSION REVIEW","Loading conversation","Fetching your training and original coaching notes."));
 try{
  const result=await api("/api/roleplay/replays/"+encodeURIComponent(id));
  session=result.session;attempts=result.rehearsals||[];
  if(!Array.isArray(session?.transcript))throw Error("This training transcript is unavailable");
  selectedTurn=Math.max(1,(session.debrief?.message_feedback||[]).findIndex(x=>x.rating==="weak")+1);
  const top=banner("ROLEPLAY REPLAY / FICTIONAL PROSPECT",session.prospect_name||"Training session","Review the actual conversation. Select any of your messages, rewrite it and see one plausible alternative prospect response.")+
   '<div class="rp14-stats">'+stat("ORIGINAL SCORE",(session.overall_score||0)+"/100")+stat("PRACTICE DIFFICULTY","Level "+session.difficulty)+stat("STUDENT MESSAGES",row().length)+'</div>';
  const content=top+'<div class="rp14-columns"><section class="rp14-transcript"><div class="rp14-col-label">ORIGINAL CONVERSATION</div>'+messagesHtml()+'</section>'+
   '<section class="rp14-analysis"><div class="rp14-col-label">MESSAGE COACHING</div><div id="rp14Focus"></div></section></div>'+
   '<div class="rp14-footer">'+button("back","All sessions")+button("difficulty","Recommended next difficulty")+button("new-simulation","New roleplay")+'</div>';
  open("Conversation Replay","Your original score remains unchanged.",content);focus();
 }catch(e){toast(e.message);list()}
}
async function checkDifficulty(mode="client"){
 const d=await api("/api/roleplay/difficulty?mode="+encodeURIComponent(mode));
 currentRecommendation=d;
 const detail=banner("ADAPTIVE TRAINING","Your next difficulty","A recommendation based on the most recent saved simulations in this training mode.")+
 '<div class="rp14-difficulty"><strong>LEVEL '+esc(d.difficulty)+' / 4</strong><p>'+esc(d.explanation)+'</p>'+
  '<div class="rp14-stats">'+stat("RECENT REPS",d.recent_count)+stat("RECENT AVERAGE",d.average===null?"Not established":d.average+"/100")+'</div></div>'+
 '<p class="rp14-disclaimer">This is an optional practice recommendation. Standardised assessments require separately defined criteria and mentor review.</p>'+
 '<div class="rp14-footer">'+button("difficulty-start","Start at this level")+button("back","Back to history")+'</div>';
 open("Recommended Difficulty","Challenge yourself at a level supported by your recent practice.",detail);
}
document.addEventListener("click",async e=>{
 const btn=e.target.closest("[data-rp14]");if(!btn||btn.disabled)return;
 const action=btn.dataset.rp14;
 try{
  if(action==="open")return openSession(btn.dataset.id);
  if(action==="back")return list();
  if(action==="turn"){
   selectedTurn=Number(btn.dataset.turn);document.querySelectorAll(".rp14-turn").forEach(b=>b.classList.toggle("active",b===btn));focus();return;
  }
  if(action==="difficulty")return checkDifficulty(session?.mode||"client");
  if(action==="new-simulation"){if(typeof window.openAIStage==="function"){window.closeWorkspace?.();window.openAIStage()};return}
  if(action==="difficulty-start"){
   const m=currentRecommendation?.mode||"client",d=currentRecommendation?.difficulty||1;
   window.closeWorkspace?.();window.openSetup?.(m);
   if($("difficulty"))$("difficulty").value=String(d);
   window.syncDifficultyControls?.();
   const choice=[...document.querySelectorAll(".diffchoice")].find(x=>x.getAttribute("onclick")?.includes("("+d));
   window.chooseSetupDifficulty?.(d,choice||null);
   return;
  }
  if(action==="compare"){
   if(!session)return;
   const rewritten=$("rp14Rewrite")?.value||"";
   if(rewritten.trim().length<5)throw Error("Write a more complete alternative before comparing.");
   btn.disabled=true;btn.textContent="Simulating prospect reply…";
   try{
    const response=await api("/api/roleplay/replays/"+encodeURIComponent(session.id)+"/rewrite",
     {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({student_turn:selectedTurn,rewrite_text:rewritten})});
    attempts.unshift(response.rehearsal);focus();toast("Alternative reply generated — original score unchanged");
   }finally{btn.disabled=false}
  }
 }catch(error){toast(error.message)}
});
window.showReplayStudio=list;
window.openRoleplayReplay=openSession;
})();
