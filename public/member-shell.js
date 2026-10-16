
/* Unified member navigation: non-destructive layer over existing training systems. */
(function(){
'use strict';
if(window.__setterMemberShellV2)return;
window.__setterMemberShellV2=true;
const el=id=>document.getElementById(id);
const icons={
dashboard:'<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-7h6v7"/>',
academy:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H21"/><path d="M6.5 2H21v20H6.5A3.5 3.5 0 0 1 3 18.5v-13A3.5 3.5 0 0 1 6.5 2z"/>',
practice:'<path d="M8 10h8M8 14h5"/><path d="M4 5h16v12H9l-5 4z"/>',
progress:'<path d="M3 21V9M9 21V3M15 21v-7M21 21v-11"/>',
career:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
community:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
exit:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
coach:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
trophy:'<path d="M8 21h8M12 17v4"/><path d="M7 3h10v8a5 5 0 0 1-10 0zM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4"/>',
file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>'
};
const svg=name=>'<svg aria-hidden="true" viewBox="0 0 24 24">'+(icons[name]||icons.arrow)+'</svg>';
const names={dashboard:'Dashboard',academy:'Academy',practice:'Practice',progress:'Progress',career:'Career',community:'Community'};
const sections={
academy:{title:'Learn with a clear plan',summary:'Your foundations, lessons and structured 40-day action plan live together here.',cards:[
['academy','Setter Academy','Build the fundamentals through your training modules.','showAcademy','View lessons'],
['calendar','40-Day Programme','Complete the daily activities that turn learning into action.','showProgramme','Open roadmap'],
['file','Resources & Playbooks','Practical frameworks and guides to support your development.','showResources','Explore resources']]},
practice:{title:'Train for real conversations',summary:'Practise, receive feedback and develop the skills required for actual setter work.',cards:[
['practice','AI Roleplay Lab','Choose a scenario, test your conversation skills and review your feedback.','openAIStage','Start AI training'],
['career','Virtual Workplace','Handle simulated leads, manage a CRM, book calls and complete shift reviews.','workplace','Enter workplace'],
['coach','Mock Interview','Practise answering questions from a simulated hiring manager.','startInterview','Start interview'],
['academy','Conversation Clinic','Learn from realistic conversation problems and common mistakes.','showConversationClinic','Open clinic'],
['calendar','Pre-Shift Checklist','Check your preparation before your next practice session.','showPreShift','Get ready']]},
progress:{title:'Know exactly how you are improving',summary:'All your feedback, development evidence and recommended next steps in one place.',cards:[
['progress','Performance Lab','Review detailed behaviour and roleplay performance.','showPerformanceLab','See analysis'],
['coach','Personal AI Coach','Get a recommended training focus based on your results.','showPersonalCoach','View recommendation'],
['file','Results Vault','Review your training records and completed milestones.','showResultsVault','View evidence'],
['calendar','Weekly Review','Reflect on your activity, actions and consistency.','showWeeklyReview','Open review'],
['trophy','Progression Path','See which development stages you have unlocked.','showProgression','See pathway']]},
career:{title:'Prepare for your next opportunity',summary:'Build your profile, practise interviews and work towards real opportunities as they become available.',cards:[
['career','Setter Profile','Present the skills and evidence you have developed.','showSetterProfile','Open profile'],
['progress','Placement Path','See the milestones between training and job readiness.','showPlacementPath','View pathway'],
['academy','Setter Opportunities','Browse any currently shared roles and opportunities.','showOpportunities','Explore roles'],
['coach','Interview Preparation','Build confidence before speaking to employers.','startInterview','Practice interview']]},
community:{title:'Stay connected and accountable',summary:'Community tools, friendly competition and member resources.',cards:[
['trophy','Weekly Leaderboard','See the weekly training leaderboard.','showLeaderboard','View rankings'],
['calendar','Referral Challenge','Open your daily member referral challenge.','showReferralChallenge','View challenge'],
['file','Member Resources','Explore practical guides for your development.','showResources','Browse guides']]}
};
let currentSection='dashboard';
const item=(id,extra)=>'<button type="button" class="member-nav-item '+(extra||'')+'" data-member-section="'+id+'" aria-label="'+names[id]+'">'+svg(id)+'<span>'+names[id]+'</span></button>';
const nav=document.createElement('aside');
nav.id='memberAppNav';
nav.setAttribute('aria-label','Member platform navigation');
nav.innerHTML='<div class="member-nav-brand"><img src="/setter-logo.svg" alt=""><div><b>THE SETTER <span>CIRCLE</span></b><small>MEMBER PLATFORM</small></div></div>'+
'<div class="member-nav-caption">YOUR WORKSPACE</div><div class="member-nav-main">'+
item('dashboard')+item('academy')+item('practice')+item('progress','member-nav-desktop-extra')+item('career')+item('community','member-nav-desktop-extra')+
'<button class="member-nav-item member-nav-mobile-more" type="button" data-more-toggle="true" aria-label="More sections" aria-expanded="false">'+svg('more')+'<span>More</span></button></div>'+
'<div class="member-nav-mobile-more member-nav-more-panel" id="memberNavMorePanel">'+item('progress')+item('community')+
'<button type="button" class="member-nav-item" data-member-logout="true">'+svg('exit')+'<span>Sign out</span></button></div>'+
'<div class="member-nav-footer"><p>One path from your first lesson to job-ready skills.</p>'+
'<button type="button" class="member-nav-item" data-member-exit="true">'+svg('exit')+'<span>Back to website</span></button>'+
'<button type="button" class="member-nav-item" data-member-logout="true">'+svg('exit')+'<span>Sign out</span></button></div>';
document.body.appendChild(nav);
const panel=el('profilePanel');
if(panel){
 const promo=panel.firstElementChild;
 if(promo&&promo.textContent.includes('Virtual Setter Workplace')&&promo.textContent.includes('NEW'))promo.remove();
 const focus=panel.querySelector('.focusdash');
 if(focus){
  const quick=document.createElement('div');
  quick.className='member-shell-quick';
  quick.innerHTML='<div class="member-shell-quick-head"><div><span>QUICK ACCESS</span><h3>Your learning spaces</h3></div><span>Pick up where you left off</span></div>'+
  '<div class="member-shell-quick-grid">'+
  [['academy','Academy','Lessons & curriculum','showAcademy'],['career','Workplace','Simulated setter shifts','workplace'],['practice','Roleplay Lab','Practise conversations','openAIStage'],['progress','My Progress','Scores & coaching','progress']].map(x=>
  '<button type="button" class="member-shell-quick-card" data-member-action="'+x[3]+'"><span class="quick-icon">'+svg(x[0])+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></button>').join('')+'</div>';
  focus.insertAdjacentElement('afterend',quick);
 }
}
function setActive(id){
 currentSection=id;
 nav.querySelectorAll('[data-member-section]').forEach(b=>{const active=b.dataset.memberSection===id;b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 el('memberNavMorePanel').classList.remove('is-open');
 nav.querySelector('[data-more-toggle]').setAttribute('aria-expanded','false');
}
function activate(){
 if(!localStorage.getItem('setterAccountToken')||!panel||panel.classList.contains('hidden'))return;
 document.body.classList.add('member-shell-active');
 document.body.classList.remove('member-focus-mode');
}
function deactive(){document.body.classList.remove('member-shell-active','member-focus-mode')}
function viewDashboard(){
 const ws=el('workspace'),tr=el('trainer');
 if(ws){ws.classList.add('hidden');ws.style.zIndex='';}
 if(tr)tr.classList.add('hidden');
 el('site').classList.remove('hidden');
 setActive('dashboard');
 window.openAccount();
}
function showSection(id){
 const s=sections[id];if(!s)return viewDashboard();
 setActive(id);
 const cards=s.cards.map(c=>'<button type="button" class="member-shell-feature" data-member-action="'+c[3]+'"><span class="member-feature-icon">'+svg(c[0])+'</span><strong>'+c[1]+'</strong><span>'+c[2]+'</span><em>'+c[4]+' →</em></button>').join('');
 window.openWorkspace(names[id],s.summary,'<div class="member-shell-section-intro">'+s.title+'</div><div class="member-shell-section-grid">'+cards+'</div>','THE SETTER CIRCLE · '+names[id].toUpperCase());
}
window.memberGo=function(id){if(id==='dashboard')viewDashboard();else if(sections[id])showSection(id)};
window.memberOpenWorkplace=function(){
 setActive('practice');
 window.openWorkspace('Virtual Workplace','An interactive setter shift: prospect conversations, CRM updates, booking and reporting.','<div class="member-workplace-frame"><iframe src="/workplace.html?embedded=1" title="Virtual Setter Workplace" loading="eager" allow="clipboard-write"></iframe></div>','PRACTICE · SIMULATED WORKPLACE');
};
function chooseAction(a){
 if(a==='workplace')return window.memberOpenWorkplace();
 if(sections[a])return window.memberGo(a);
 const f=window[a];if(typeof f==='function')return f();
}
document.addEventListener('click',function(e){
 const navButton=e.target.closest('#memberAppNav [data-member-section]');
 if(navButton){window.memberGo(navButton.dataset.memberSection);return;}
 if(e.target.closest('#memberAppNav [data-more-toggle]')){
  const p=el('memberNavMorePanel');const open=p.classList.toggle('is-open');
  nav.querySelector('[data-more-toggle]').setAttribute('aria-expanded',String(open));return;
 }
 if(e.target.closest('#memberAppNav [data-member-logout]')){window.logoutAccount();viewDashboard();return;}
 if(e.target.closest('#memberAppNav [data-member-exit]')){deactive();el('accountModal').classList.add('hidden');el('workspace').classList.add('hidden');el('site').classList.remove('hidden');document.body.style.overflow='';return;}
 const action=e.target.closest('[data-member-action]');
 if(action){chooseAction(action.dataset.memberAction);return;}
 if(!e.target.closest('#memberAppNav')){const p=el('memberNavMorePanel');if(p)p.classList.remove('is-open');}
});
const load=window.loadAccount;
window.loadAccount=async function(){
 await load.apply(this,arguments);
 if(!panel.classList.contains('hidden')){activate();if(el('workspace').classList.contains('hidden'))setActive('dashboard');}
 else deactive();
};
const open=window.openAccount;
window.openAccount=async function(){
 await open.apply(this,arguments);
 if(localStorage.getItem('setterAccountToken')&&!panel.classList.contains('hidden')){
  activate();if(el('workspace').classList.contains('hidden'))setActive('dashboard');
 }else deactive();
};
const oldLogout=window.logoutAccount;
window.logoutAccount=async function(){await oldLogout.apply(this,arguments);deactive();};
const oldWorkspace=window.openWorkspace;
window.openWorkspace=function(title,sub,html,eyebrow){
 const result=oldWorkspace.apply(this,arguments);
 if(localStorage.getItem('setterAccountToken')){document.body.classList.add('member-shell-active');document.body.classList.remove('member-focus-mode');}
 if(!Object.values(names).includes(title)){
  const t=(title||'').toLowerCase();
  if(/opportunit|placement|setter profile|career/.test(t))setActive('career');
  else if(/score|performance|progress|coach|results|review|intelligence/.test(t))setActive('progress');
  else if(/interview|roleplay|clinic|pre-shift|practice|workplace|simulation/.test(t))setActive('practice');
  else if(/academy|programme|resource|playbook/.test(t))setActive('academy');
  else if(/leaderboard|referral|community/.test(t))setActive('community');
 }
 return result;
};
const closeTraining=window.closeTrainer;
window.closeTrainer=function(){closeTraining.apply(this,arguments);document.body.classList.remove('member-focus-mode');if(localStorage.getItem('setterAccountToken'))viewDashboard();};
const beginSetup=window.openSetup;
window.openSetup=function(){document.body.classList.add('member-focus-mode');return beginSetup.apply(this,arguments)};
const beginTraining=window.enterTrainer;
window.enterTrainer=function(){document.body.classList.add('member-focus-mode');return beginTraining.apply(this,arguments)};
const cancel=window.cancelSetup;
window.cancelSetup=function(){const r=cancel.apply(this,arguments);document.body.classList.remove('member-focus-mode');return r};
const interview=window.startInterview;
window.startInterview=async function(){document.body.classList.add('member-focus-mode');try{return await interview.apply(this,arguments)}finally{if(el('interviewModal').classList.contains('hidden'))document.body.classList.remove('member-focus-mode')}};
const finishInterview=window.closeInterview;
window.closeInterview=function(){const r=finishInterview.apply(this,arguments);document.body.classList.remove('member-focus-mode');if(localStorage.getItem('setterAccountToken'))viewDashboard();return r};
if(new URLSearchParams(location.search).get('platform')==='1'){
 const section=new URLSearchParams(location.search).get('section');
 window.openAccount().then(()=>{if(sections[section]&&!panel.classList.contains('hidden'))window.memberGo(section);});
}
})();
