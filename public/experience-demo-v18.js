/* Anonymous public demo: recoverable sessions, safe retries, and honest send states. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 if(!$('chatInput'))return;
 const input=$('chatInput'),sendButton=$('sendBtn'),startButton=$('startBtn'),finishButton=$('finishBtn');
 const storageKey='setterCirclePublicDemoV18';
 let sessionId=null,remaining=4,completed=0,busy=false,mode='idle',pending=null;
 const uuid=()=>crypto.randomUUID();
 const status=text=>{$('chatMessage').textContent=text;};
 function persist(){
  try{sessionStorage.setItem(storageKey,JSON.stringify({id:sessionId,draft:input.value,pending}));}catch{}
 }
 function controls(){
  const active=mode==='active';
  input.disabled=!active||remaining<=0;input.readOnly=busy;
  sendButton.disabled=busy||!active||remaining<=0||input.value.trim().length<3;
  finishButton.disabled=busy||!active||completed===0;
  finishButton.classList.toggle('hidden',!active);
  startButton.classList.toggle('hidden',active);
  startButton.disabled=busy;
  startButton.textContent=mode==='finished'?'Try another demo':mode==='recover'?'Reconnect demo':mode==='expired'?'Restart demo':'Start free demo';
  input.placeholder=active?'Write your reply to Alex…':mode==='finished'?'Conversation complete':'Start the demo to send a message…';
  $('turns').textContent=mode==='finished'?'Feedback ready':mode==='expired'?'Session ended':remaining+' '+(remaining===1?'reply':'replies')+' left';
  $('demoCharCount').textContent=input.value.length+' / 350';
  $('chatMessages').setAttribute('aria-busy',String(busy));
 }
 function bubble(text,self,pendingMessage=false){
  const el=document.createElement('div');
  el.className='bubble'+(self?' self':'')+(pendingMessage?' is-pending':'');el.textContent=text;
  $('chatMessages').appendChild(el);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;
  return el;
 }
 async function post(url,body){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
  try{
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(body),signal:controller.signal});
   const data=await r.json().catch(()=>({}));
   if(!r.ok){const error=new Error(data.error||'Please try again.');error.code=data.code;error.status=r.status;throw error;}
   return data;
  }catch(error){
   if(error.name==='AbortError'||error instanceof TypeError){const network=new Error('Connection interrupted. Your draft is kept below. Retry to check for a reply.');network.code='DEMO_NETWORK';throw network;}
   throw error;
  }finally{clearTimeout(timeout);}
 }
 function track(event){fetch('/api/experience/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event})}).catch(()=>{});}
 function showFeedback(d){
  $('score').textContent=d.score+' / 100';$('strength').textContent=d.strengths.join(' ');$('improve').textContent=d.improvements.join(' ');$('disclaimer').textContent=d.disclaimer;
  $('metricTurns').textContent=d.turns+' / 4';$('metricFocus').textContent='Discovery';$('metricNext').textContent='AI Coach';$('hubExampleScore').textContent=d.score+' / 100';
  $('feedback').style.display='block';mode='finished';remaining=0;completed=d.turns;pending=null;input.value='';persist();
 }
 function applySession(d){
  sessionId=d.session_id;remaining=d.remaining;completed=d.max_turns-d.remaining;
  $('chatMessages').replaceChildren();bubble(d.opening,false);
  for(const row of d.messages||[]){
   bubble(row.user,true);bubble(row.prospect,false);
   if(pending?.id===row.request_id){input.value='';pending=null;}
  }
  $('feedback').style.display='none';
  if(d.feedback){showFeedback(d.feedback);status('Your practice feedback is ready below.');}
  else{mode='active';status(remaining?'Your turn. Ask one useful question.':'All four replies are complete. Get your feedback below.');}
  persist();
 }
 function handleError(error){
  if(error.code==='DEMO_SESSION_EXPIRED'||error.status===404){
   sessionId=null;pending=null;mode='expired';
   status('This demo has ended. Select Restart demo below. Your unsent draft will be kept.');
  }else if(error.code==='DEMO_FINISHED'){
   remaining=0;status('All four replies are complete. Select Finish & get feedback.');
  }else if(error.code==='DEMO_LIMIT'){
   status(error.message+' You can return to the topics or try the free lesson.');
  }else status(error.message);
  persist();
 }
 async function restore(){
  if(!sessionId||busy)return;
  busy=true;mode='recover';controls();status('Restoring your conversation…');
  try{applySession(await post('/api/experience/demo/resume',{session_id:sessionId}));}
  catch(error){handleError(error);}
  finally{busy=false;controls();}
 }
 startButton.addEventListener('click',async function(){
  if(busy)return;
  if(mode==='recover'&&sessionId){await restore();return;}
  busy=true;controls();this.setAttribute('aria-busy','true');status('Starting your conversation…');
  try{
   const d=await post('/api/experience/demo/start',{});pending=null;applySession(d);track('demo_started');
   controls();input.focus({preventScroll:true});
  }catch(error){handleError(error);}
  finally{busy=false;this.removeAttribute('aria-busy');controls();}
 });
 async function send(){
  if(!sessionId||mode!=='active'||busy||remaining<=0)return;
  const value=input.value.trim();
  if(value.length<3||value.length>350){status('Write between 3 and 350 characters.');return;}
  if(!pending||pending.text!==value)pending={id:uuid(),text:value};
  busy=true;controls();sendButton.setAttribute('aria-busy','true');
  const outgoing=bubble(value,true,true);input.value='';persist();status('Alex is typing…');
  try{
   const d=await post('/api/experience/demo/message',{session_id:sessionId,message:value,request_id:pending.id});
   outgoing.classList.remove('is-pending');bubble(d.reply,false);remaining=d.remaining;completed=d.turn;pending=null;persist();
   status(remaining?'Your turn. Build on what Alex said.':'All four replies are complete. Get your feedback below.');
  }catch(error){
   outgoing.remove();input.value=value;handleError(error);
  }finally{busy=false;sendButton.removeAttribute('aria-busy');controls();}
 }
 sendButton.addEventListener('click',send);
 input.addEventListener('input',()=>{controls();persist();});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();send();}});
 finishButton.addEventListener('click',async function(){
  if(!sessionId||busy||!completed)return;
  busy=true;controls();this.setAttribute('aria-busy','true');status('Preparing your practice feedback…');
  try{
   showFeedback(await post('/api/experience/demo/finish',{session_id:sessionId}));
   status('Your feedback is ready. Pick one improvement to practise next.');track('demo_completed');
   $('feedback').scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }catch(error){handleError(error);}
  finally{busy=false;this.removeAttribute('aria-busy');controls();}
 });
 try{
  const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');
  if(saved){sessionId=typeof saved.id==='string'?saved.id:null;input.value=String(saved.draft||saved.pending?.text||'').slice(0,350);pending=saved.pending&&typeof saved.pending.id==='string'&&typeof saved.pending.text==='string'?saved.pending:null;}
 }catch{}
 controls();if(sessionId)restore();
})();
