
/* Member experience quality pass: navigation, tools, scorecard and accessibility. */
(function(){
'use strict';
if(window.__setterPremiumV3)return;
window.__setterPremiumV3=true;
const $=id=>document.getElementById(id);
const sectionNames={dashboard:'Dashboard',academy:'Academy',practice:'Practice',progress:'Progress',career:'Career',community:'Community'};
const sectionTitles=new Set(Object.values(sectionNames));
const skillLabels={
 conversational_awareness:'Conversation awareness',
 rapport:'Rapport and trust',
 discovery:'Discovery questions',
 qualification:'Lead qualification',
 objection_handling:'Objection handling',
 positioning:'Offer positioning',
 cta:'Moving to next step',
 naturalness:'Natural communication'
};
const safe=(value)=>typeof window.escapeHtml==='function'?window.escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=(n)=>Math.max(0,Math.min(100,Number.isFinite(Number(n))?Math.round(Number(n)):0));
function activeSection(){
 const selected=document.querySelector('#memberAppNav .member-nav-item.is-active[data-member-section]');
 return selected?.dataset.memberSection||'dashboard';
}
function setSection(section){
 document.querySelectorAll('#memberAppNav [data-member-section]').forEach(b=>{
  const match=b.dataset.memberSection===section;
  b.classList.toggle('is-active',match);
  if(match)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
}
function parentFor(title){
 if(sectionTitles.has(title))return 'dashboard';
 if(/roleplay|conversation|interview|workplace|pre-shift|simulation/i.test(title))return 'practice';
 if(/academy|40-day|resource|playbook|module/i.test(title))return 'academy';
 if(/performance|results|coach|weekly review|progression|intelligence/i.test(title))return 'progress';
 if(/opportunit|placement|setter profile|career/i.test(title))return 'career';
 if(/referral|leaderboard|community/i.test(title))return 'community';
 return activeSection()||'dashboard';
}
function decorateWorkspace(title){
 const ws=$('workspace'), content=$('workContent');
 if(!ws||!content)return;
 ws.classList.remove('module-page','workplace-page','roleplay-page');
 ws.classList.toggle('member-root-page',sectionTitles.has(title));
 const isAcademy=title==='Setter Academy';
 if(isAcademy)ws.classList.add('module-page');
 ws.scrollTop=0;
 const parent=parentFor(title);
 const button=ws.querySelector('.workhead>button');
 if(button){
  button.textContent=parent==='dashboard'?'← Dashboard':'← '+sectionNames[parent];
  button.setAttribute('aria-label','Back to '+sectionNames[parent]);
  button.onclick=function(){if(typeof window.memberGo==='function')window.memberGo(parent);else window.closeWorkspace()};
 }
 if(isAcademy){
  content.querySelectorAll('.workitem button').forEach(b=>{
   if((b.getAttribute('onclick')||'').includes('lesson content is being uploaded')){
    b.removeAttribute('onclick');
    b.onclick=null;
    b.textContent='Lessons being prepared';
    b.disabled=true;
    b.setAttribute('aria-label','Lessons being prepared');
   }
  });
 }
 const h=ws.querySelector('.workhead h2');
 if(h)document.title=title+' | The Setter Circle';
 const section=parentFor(title);
 if(title!=='Dashboard'&&section!=='dashboard')setSection(section);
}
const origOpenWorkspace=window.openWorkspace;
if(typeof origOpenWorkspace==='function'){
 window.openWorkspace=function(title,sub,html,eyebrow){
  const out=origOpenWorkspace.apply(this,arguments);
  decorateWorkspace(title);
  return out;
 };
}
const originalRoleplay=window.openAIStage;
if(typeof originalRoleplay==='function'){
 window.openAIStage=function(prefill){
  const result=originalRoleplay.apply(this,arguments);
  if(prefill)return result;
  const ws=$('workspace'), content=$('workContent');
  if(!ws||ws.classList.contains('hidden')||!content)return result;
  ws.classList.remove('module-page','workplace-page','member-root-page');
  ws.classList.add('roleplay-page');
  $('workEyebrow').textContent='PRACTICE / AI ROLEPLAY LAB';
  $('workTitle').textContent='Choose your training scenario';
  $('workSub').textContent='Train against realistic prospects. Choose a scenario, select the difficulty and review your performance afterwards.';
  content.innerHTML='<div class="member-shell-section-intro">Each simulation tests a different part of the job. Start with the skill you want to improve.</div>'+
   '<div class="member-shell-section-grid">'+
   '<button type="button" class="member-shell-feature" data-roleplay-mode="network"><span class="member-feature-icon">01</span><strong>Build connections</strong><span>Practise networking with setters, recruiters and other sales professionals without forcing the conversation.</span><em>Start networking rep →</em></button>'+
   '<button type="button" class="member-shell-feature" data-roleplay-mode="client"><span class="member-feature-icon">02</span><strong>Land clients</strong><span>Research businesses, uncover commercial problems and earn the right to suggest a conversation.</span><em>Start client rep →</em></button>'+
   '<button type="button" class="member-shell-feature" data-roleplay-mode="role"><span class="member-feature-icon">03</span><strong>On the job</strong><span>Handle inbound leads, qualification, objections and appointment booking with realistic pressure.</span><em>Start on-the-job rep →</em></button>'+
   '</div><div class="member-shell-section-intro" style="margin-top:17px">HOW IT WORKS · Choose your training scenario → select difficulty → research the prospect → complete the conversation → review your score and feedback.</div>';
  setSection('practice');
  decorateWorkspace('AI Roleplay Lab');
  return result;
 };
}
document.addEventListener('click',function(event){
 const mode=event.target.closest('[data-roleplay-mode]');
 if(mode){event.preventDefault();window.openSetupFromStage(mode.dataset.roleplayMode);}
});
const origWorkplace=window.memberOpenWorkplace;
if(typeof origWorkplace==='function'){
 window.memberOpenWorkplace=function(){
  const result=origWorkplace.apply(this,arguments);
  const ws=$('workspace'),frame=ws?.querySelector('.member-workplace-frame');
  if(!ws||!frame)return result;
  ws.classList.remove('module-page','roleplay-page','member-root-page');
  ws.classList.add('workplace-page');
  const bar=document.createElement('div');
  bar.className='member-workplace-toolbar';
  bar.innerHTML='<div><span>PRACTICE / SIMULATED SHIFT</span><strong>Virtual Workplace</strong></div>'+
    '<button type="button" aria-label="Back to practice" data-workplace-close="1">← Practice</button>';
  frame.insertAdjacentElement('beforebegin',bar);
  bar.addEventListener('click',e=>{if(e.target.closest('[data-workplace-close]'))window.memberGo('practice')});
  ws.scrollTop=0;
  setSection('practice');
  return result;
 };
}
function nameForSkill(key){
 return skillLabels[key]||key.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());
}
function summaryLabel(score){return score>=75?'A stronger area':score>=50?'Building consistency':'Needs focused practice'}
function scoreRow(s,i,weakKey){
 const val=percent(s.value),label=safe(nameForSkill(s.key));
 return '<div class="pm-skill '+(s.key===weakKey?'is-priority':'')+'">'+
  '<div class="pm-skill-top"><div class="pm-skill-name"><span class="pm-skill-rank">'+String(i+1).padStart(2,'0')+'</span>'+label+'</div>'+
  '<span class="pm-skill-value">'+val+' <small>/ 100</small></span></div>'+
  '<div class="pm-track" role="progressbar" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+val+'"><span style="--fill:'+val+'%"></span></div></div>';
}
window.showPerformanceLab=async function(){
 try{
  const data=await window.getStudentHub(),recent=Array.isArray(data.recent)?data.recent:[];
  if(!recent.length){
   window.openWorkspace('Performance Lab','Your skill development, tracked across practice sessions.',
    '<div class="pm-panel"><div class="pm-overview"><div><span class="pm-kicker">YOUR PERFORMANCE</span><h3>Your progress starts with your first simulation.</h3><p>Complete an AI roleplay to unlock your skill breakdown, performance trends and tailored practice recommendations.</p></div><div class="pm-average"><div class="pm-ring" style="--score:0%" role="img" aria-label="No completed sessions yet"><div><strong>—</strong><span>NOT SCORED</span></div></div></div></div>'+
    '<div class="pm-action"><button class="btn" type="button" data-performance-start="1">Start your first roleplay →</button><p>Scores will appear here once a session is completed.</p></div></div>',
    'PROGRESS / PERFORMANCE');
   return;
  }
  const accum=new Map();
  for(const r of recent){
   const scores=(r?.scores&&typeof r.scores==='object')?r.scores:{};
   for(const [key,value] of Object.entries(scores)){
    const n=Number(value);
    if(!Number.isFinite(n)||n<0||n>100)continue;
    if(!accum.has(key))accum.set(key,[]);
    accum.get(key).push(n);
   }
  }
  const rows=[...accum].map(([key,values])=>({key,value:Math.round(values.reduce((a,b)=>a+b,0)/values.length)})).sort((a,b)=>b.value-a.value);
  const highest=rows[0]||null,lowest=rows[rows.length-1]||null;
  const scoredSessions=recent.map(r=>Number(r.overall_score)).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);
  const overall=scoredSessions.length?percent(scoredSessions.reduce((a,b)=>a+b,0)/scoredSessions.length):0;
  const firstName=highest?safe(nameForSkill(highest.key)):'Not available';
  const weakName=lowest?safe(nameForSkill(lowest.key)):'Not available';
  const overview='<section class="pm-overview"><div><span class="pm-kicker">YOUR PERFORMANCE SNAPSHOT</span>'+
     '<h3>Know your strengths. Train your gaps.</h3>'+
     '<p>Based on your latest '+recent.length+' completed simulation'+(recent.length===1?'':'s')+'. Your scores reflect simulated practice, not an employer assessment.</p></div>'+
     '<div class="pm-average"><div class="pm-ring" style="--score:'+overall+'%" role="img" aria-label="Average simulation score '+overall+' out of 100"><div><strong>'+overall+'</strong><span>AVG. SETTER SCORE</span></div></div></div></section>';
  const summary='<div class="pm-summary">'+
   '<div class="pm-mini"><span class="pm-kicker">STRONGEST AREA</span><strong>'+firstName+'</strong><p>'+(highest?summaryLabel(highest.value)+'. Keep this consistent.':'Complete more roleplays to build this view.')+'</p></div>'+
   '<div class="pm-mini"><span class="pm-kicker">PRACTICE PRIORITY</span><strong>'+weakName+'</strong><p>'+(lowest?'Your lowest recent skill score. Make it the focus of your next rep.':'Complete more roleplays to find a training priority.')+'</p></div></div>';
  const skills='<section class="pm-section"><div class="pm-section-head"><div><span class="pm-kicker">SKILL BREAKDOWN</span><h3>Your recent skill pattern</h3></div><span>Average score / 100</span></div>'+
    '<div class="pm-skill-list">'+(rows.length?rows.map((s,i)=>scoreRow(s,i,lowest?.key)).join(''):
    '<p class="muted">No individual skill ratings are available for these sessions yet.</p>')+'</div></section>';
  const simulations='<section class="pm-section"><div class="pm-section-head"><div><span class="pm-kicker">SESSION HISTORY</span><h3>Recent simulations</h3></div><span>Latest first</span></div>'+
    '<div class="pm-recent">'+recent.map(r=>{
      let date='';try{date=new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}catch(e){date=''}
      const role=[r.prospect_name,r.prospect_role].filter(Boolean).join(' · ')||'Completed practice';
      const sub=[r.mode?String(r.mode).replaceAll('_',' '):'',Number.isFinite(Number(r.difficulty))?'Difficulty '+Number(r.difficulty):'',date].filter(Boolean).join(' · ');
      return '<div class="pm-recent-row"><div><strong>'+safe(role)+'</strong><span>'+safe(sub)+'</span></div><div class="pm-recent-score">'+percent(r.overall_score)+' <small>/ 100</small></div></div>';
    }).join('')+'</div></section>';
  const next='<div class="pm-action"><button class="btn" type="button" data-performance-coach="1">See your recommended practice →</button>'+
  '<p>Use your lowest-scoring area as the starting point for your next session, then compare results over time.</p></div>';
  window.openWorkspace('Performance Lab','Understand your simulation results and focus your next practice session.',
    '<div class="pm-panel">'+overview+summary+skills+simulations+next+'</div>','PROGRESS / PERFORMANCE');
 }catch(err){
  console.error('Performance Lab:',err);
  if(typeof window.toast==='function')window.toast('Could not load performance. Please try again.');
 }
};
document.addEventListener('click',function(e){
 if(e.target.closest('[data-performance-coach]'))window.showPersonalCoach();
 if(e.target.closest('[data-performance-start]'))window.openAIStage();
});
window.addEventListener('pageshow',()=>{
 if($('workspace')&&!$('workspace').classList.contains('hidden'))$('workspace').scrollTop=0;
});
})();
