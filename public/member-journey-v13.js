
/* SETTER CIRCLE — MEMBER JOURNEY v13
 * Keeps the dashboard focused on authenticated, unfinished work.
 * Every metric and link is sourced from the user's real saved records.
 */
(function(){
'use strict';
if(window.__setterJourneyV13)return;
window.__setterJourneyV13=true;
const $=id=>document.getElementById(id);
const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastLoaded=0,loading=null,current=null,fetchEpoch=0;
const timeToRefresh=25000;
const actions={
 mentor:()=>window.showMentorDesk?.(),
 resume:()=>window.showResumeTraining?.(),
 lesson:id=>window.openAcademyLesson?.(id),
 programme:()=>window.showProgramme?.(),
 coach:()=>window.showPersonalCoach?.(),
 'first-rep':()=>window.openSetup?.('network'),
 assessment:()=>window.showFinalAssessment?.()
};
function loggedIn(){
 const p=$('profilePanel');
 try{return !!p&&!p.classList.contains('hidden')&&!!localStorage.getItem('setterAccountToken')}catch(e){return false}
}
function note(title,detail){
 const el=$('journeyV13Notice');if(!el)return;
 el.hidden=false;el.textContent=title+(detail?' · '+detail:'');
}
function stageLabel(stage){
 const labels={
  'FOUNDATIONS':'BUILDING FOUNDATIONS',
  'LEARNING':'TRAINING IN PROGRESS',
  'PRACTISING':'PRACTISING',
  'TRAINING ROLE READY':'TRAINING ROLE READY',
  'INTERVIEW READY':'INTERVIEW TRAINING READY'
 };
 return labels[stage]||'TRAINING IN PROGRESS';
}
function progressLine(label,n,total){
 const percent=total?Math.min(100,Math.max(0,Math.round(n/total*100))):0;
 return '<div class="journey-v13-progress-item"><div class="journey-v13-progress-meta"><span>'+escapeText(label)+'</span><strong>'+escapeText(total?n+' / '+total:'Awaiting lessons')+'</strong></div>'+
 '<div class="journey-v13-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'" aria-label="'+escapeText(label)+'"><i style="width:'+percent+'%"></i></div></div>';
}
function render(){
 const p=$('profilePanel');
 if(!p||!p.classList.contains('signature-dashboard')||!loggedIn()||!current)return false;
 const anchor=p.querySelector('.signature-quick')||p.querySelector('.member-shell-quick');
 if(!anchor)return false;
 let root=$('journeyV13');
 if(!root){
  root=document.createElement('section');
  root.id='journeyV13';root.className='journey-v13';
  root.setAttribute('aria-label','Your next steps');
  anchor.insertAdjacentElement('beforebegin',root);
 }
 p.classList.add('journey-v13-on');
 const data=current,summary=data.summary||{},items=data.next||[];
 if($('roleReady')){
  $('roleReady').textContent=stageLabel(summary.stage);
  $('roleReady').setAttribute('title','Training progress only; employer readiness requires a separate human assessment.');
 }
 const steps=items.length?items.map((s,i)=>
  '<button class="journey-v13-step" data-journey-action="'+escapeText(s.action)+'"'+(s.lesson_id?' data-lesson-id="'+escapeText(s.lesson_id)+'"':'')+'>'+
    '<span class="journey-v13-step-count">'+String(i+1).padStart(2,'0')+'</span>'+
    '<span class="journey-v13-step-copy"><span class="journey-v13-eyebrow">'+escapeText(s.eyebrow)+'</span><strong>'+escapeText(s.title)+'</strong><small>'+escapeText(s.detail)+'</small></span>'+
    '<span class="journey-v13-chevron" aria-hidden="true">↗</span>'+
  '</button>').join(''):
  '<div class="journey-v13-quiet">You have no outstanding tasks. Review your training history and mentor feedback.</div>';
 root.innerHTML=
 '<div class="journey-v13-heading">'+
  '<div><span class="journey-v13-topline"><span class="journey-v13-live-dot"></span> YOUR TRAINING PLAN · LIVE FROM YOUR ACCOUNT</span>'+
  '<h3>Pick up where you left off<span>.</span></h3>'+
  '<p>Three clear actions, chosen from your unfinished training and coaching.</p></div>'+
  '<button class="journey-v13-refresh" data-journey-refresh aria-label="Refresh your training plan" title="Refresh">↻ <span>Refresh</span></button>'+
 '</div>'+
 '<div class="journey-v13-body">'+
  '<div class="journey-v13-tasks"><div class="journey-v13-col-title">RECOMMENDED NEXT STEPS <span>0'+items.length+'</span></div>'+steps+
   '<button class="journey-v13-all" data-journey-all>Open your full plan <span aria-hidden="true">↗</span></button></div>'+
  '<div class="journey-v13-summary"><div class="journey-v13-col-title">YOUR RECORDED TRAINING ACTIVITY</div>'+
   '<div class="journey-v13-milestone"><span>TRAINING STAGE</span><strong>'+escapeText(stageLabel(summary.stage))+'</strong><small>Milestones based on completed programme days and recent simulated practice. Not a job credential.</small></div>'+
   '<div class="journey-v13-bars">'+
   progressLine('40-DAY PROGRAMME',summary.programme_completed||0,40)+
   progressLine('PUBLISHED LESSONS',summary.academy_completed||0,summary.academy_total||0)+
   '</div>'+
   '<div class="journey-v13-inline-metrics">'+
    '<div><strong>'+(summary.recent_reps?escapeText(summary.recent_average)+'/100':'—')+'</strong><span>Recent score average</span></div>'+
    '<div><strong>'+escapeText(summary.pending_mentor||0)+'</strong><span>Mentor replies pending</span></div>'+
   '</div>'+
  '</div>'+
 '</div>'+
 '<div id="journeyV13Notice" class="journey-v13-notice" role="status" hidden></div>';
 return true;
}
async function refresh(force=false){
 if(!loggedIn())return;
 if(!force&&current&&Date.now()-lastLoaded<timeToRefresh){render();return}
 if(loading)return loading;
 const thisEpoch=++fetchEpoch;
 loading=(async()=>{
  try{
   const fn=window.accountFetch;
   if(typeof fn!=='function')return;
   const r=await fn('/api/member/journey',{cache:'no-store'}),data=await r.json();
   if(!r.ok)throw Error(data.error||'Training plan unavailable');
   if(!loggedIn()||fetchEpoch!==thisEpoch)return;
   current=data;lastLoaded=Date.now();render();
  }catch(err){
   if(current){render();note('Could not update your plan','Showing the last successful account sync')}
   else console.warn('Journey unavailable:',err.message);
  }finally{loading=null}
 })();
 return loading;
}
function fullPlan(){
 if(!current)return;
 const tasks=current.all||[];
 const body='<div class="journey-v13-full"><div class="journey-v13-full-intro"><span>YOUR PERSONAL PLAN</span><h3>One step at a time.</h3>'+
 '<p>This pathway updates when your real training, lessons and mentor records change. It is not a promised employment outcome.</p></div>'+
 tasks.map((s,i)=>'<button type="button" class="journey-v13-full-step" data-journey-action="'+escapeText(s.action)+'"'+(s.lesson_id?' data-lesson-id="'+escapeText(s.lesson_id)+'"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><div><small>'+escapeText(s.eyebrow)+'</small><strong>'+escapeText(s.title)+'</strong><p>'+escapeText(s.detail)+'</p></div><b>↗</b></button>').join('')+
 '<div class="journey-v13-full-foot"><button type="button" data-journey-refresh>Refresh training records ↻</button></div></div>';
 if(typeof window.openWorkspace==='function')window.openWorkspace('Your Training Plan','Continue the next meaningful activity in your personal programme.',body,'YOUR JOURNEY / NEXT ACTIONS');
}
document.addEventListener('click',e=>{
 const refreshBtn=e.target.closest('[data-journey-refresh]');
 if(refreshBtn){refresh(true);return}
 const full=e.target.closest('[data-journey-all]');
 if(full){fullPlan();return}
 const b=e.target.closest('[data-journey-action]');
 if(!b)return;
 const action=b.dataset.journeyAction,fn=actions[action];
 if(typeof fn==='function'){
  const result=fn(b.dataset.lessonId);
  if(result&&typeof result.catch==='function')result.catch(err=>console.warn('Journey action:',err.message));
 }
});
const previousLoad=window.loadAccount;
if(typeof previousLoad==='function')window.loadAccount=async function(){
 const result=await previousLoad.apply(this,arguments);
 if(loggedIn())await refresh(true);
 return result;
};
const previousOpen=window.openAccount;
if(typeof previousOpen==='function')window.openAccount=async function(){
 const result=await previousOpen.apply(this,arguments);
 if(loggedIn())await refresh();
 return result;
};
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&loggedIn()&&Date.now()-lastLoaded>60000)refresh(true);
});
window.SetterJourneyV13={refresh};
if(document.readyState!=='loading')refresh();
else document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});
})();
