
/* SETTER CIRCLE — ATELIER v9 / component art and intelligent micro-details
   Progressive enhancement; no changes to auth, scoring, lesson or navigation APIs.
*/
(function(){
'use strict';
if(window.__setterAtelierV9)return;
window.__setterAtelierV9=true;
const $=id=>document.getElementById(id);
const byAction={
 showAcademy:{kind:'academy',label:'Open training',group:'FOUNDATIONS'},
 showProgramme:{kind:'roadmap',label:'Follow roadmap',group:'DAILY EXECUTION'},
 showResources:{kind:'playbook',label:'Browse resources',group:'YOUR LIBRARY'},
 openAIStage:{kind:'roleplay',label:'Start simulation',group:'AI PRACTICE'},
 workplace:{kind:'workplace',label:'Enter workplace',group:'LIVE SIMULATION'},
 startInterview:{kind:'interview',label:'Prepare for interviews',group:'ROLE READINESS'},
 showConversationClinic:{kind:'clinic',label:'Review conversations',group:'SKILL DEVELOPMENT'},
 showPreShift:{kind:'checklist',label:'Get prepared',group:'BEFORE YOUR SHIFT'},
 showPerformanceLab:{kind:'performance',label:'Review performance',group:'SKILL ANALYSIS'},
 showPersonalCoach:{kind:'coach',label:'Open your coach',group:'PERSONALISED SUPPORT'},
 showResultsVault:{kind:'vault',label:'See your results',group:'YOUR EVIDENCE'},
 showWeeklyReview:{kind:'review',label:'Review this week',group:'WEEKLY REFLECTION'},
 showProgression:{kind:'roadmap',label:'See progression',group:'YOUR PATH'},
 showSetterProfile:{kind:'profile',label:'Open your profile',group:'YOUR CREDENTIALS'},
 showPlacementPath:{kind:'placement',label:'View milestones',group:'CAREER MILESTONES'},
 showOpportunities:{kind:'jobs',label:'Browse opportunities',group:'CAREER OPPORTUNITIES'},
 showLeaderboard:{kind:'leaderboard',label:'View rankings',group:'THE COMMUNITY'},
 showReferralChallenge:{kind:'referral',label:'Open challenge',group:'REFERRAL REWARDS'},
 academy:{kind:'academy',label:'Open Academy',group:'STRUCTURED LEARNING'},
 progress:{kind:'performance',label:'See progress',group:'YOUR DEVELOPMENT'}
};
let lastTitle='';
function art(kind){
 const shapes={
 academy:'<path d="M12 13.5 24 10l12 3.5v19L24 29l-12 3.5V13.5Z"/><path d="M24 10v19M16 18l5-1.5M16 23l5-1.5M28 16.5l5 1.5M28 21.5l5 1.5"/><path d="M11 36h26"/>',
 roadmap:'<rect x="12" y="9" width="25" height="28" rx="6"/><path d="M12 17h25M20 7v6M29 7v6"/><circle cx="20" cy="23" r="2"/><circle cx="29" cy="23" r="2"/><path d="m18 31 2 2 5-5"/><path d="M29 31h3"/>',
 playbook:'<path d="M11 14 19 8h18v29H13a4 4 0 0 1-4-4V17a3 3 0 0 1 3-3Z"/><path d="M19 8v8h-8M18 23h14M18 28h11M18 33h9M25 13h7"/><path d="M8 19H5v20h24v-2"/>',
 roleplay:'<path d="M9 11h28v21H23l-8 7v-7H9z"/><path d="M15 20h3l2-6 5 12 3-7 2 2h3"/><circle cx="36" cy="12" r="2"/><path d="M39 16h4M41 14v4"/>',
 workplace:'<rect x="7" y="12" width="34" height="25" rx="5"/><path d="M17 12V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M7 22h34M21 21v4h6v-4"/><path d="M13 30h6M29 30h6"/>',
 interview:'<circle cx="24" cy="15" r="7"/><path d="M10 38v-3a14 14 0 0 1 28 0v3"/><path d="m33 11 4-3h6v13h-7l-3 3"/><path d="M39 14h1"/>',
 clinic:'<path d="M7 10h29v17H21l-7 6v-6H7z"/><path d="m14 18 3 3 6-7M27 17h5M27 21h3"/><circle cx="38" cy="32" r="6"/><path d="M38 28v5l3 2"/>',
 checklist:'<rect x="10" y="9" width="29" height="32" rx="5"/><path d="M18 9V6h13v3M17 20l3 3 5-6M28 21h5M17 31l3 3 5-6M28 32h5"/>',
 performance:'<path d="M8 38V11M8 38h34"/><path d="M14 31V21M21 31V13M28 31V23M35 31V9"/><path d="m12 16 8-6 8 7 11-11"/><path d="m34 6 5 0v5"/>',
 coach:'<path d="M24 7c8 0 14 6 14 14s-6 14-14 14c-3 0-6-.8-8.5-2.4L9 37l2-8A14 14 0 0 1 24 7Z"/><path d="m24 12 1.7 5.3L31 19l-5.3 1.7L24 26l-1.7-5.3L17 19l5.3-1.7L24 12Z"/><path d="M33 29h7M36 25.5v7"/>',
 vault:'<rect x="8" y="14" width="32" height="25" rx="4"/><path d="M8 20h32M14 14V8h20v6M18 29h12"/><circle cx="34" cy="29" r="3"/><path d="M34 26v6"/>',
 review:'<path d="M10 23a14 14 0 1 1 5 10M10 15v8h8"/><path d="M24 14v11h8M16 39h17"/>',
 profile:'<circle cx="24" cy="15" r="7"/><path d="M12 36v-3a12 12 0 0 1 24 0v3H12Z"/><path d="M9 7H5v7M39 7h4v7M9 41H5v-7M39 41h4v-7"/>',
 placement:'<path d="M8 37h31M13 35V14M13 14l11-7 11 7v21"/><path d="M20 23h8v12h-8zM18 14h2M28 14h2"/><circle cx="39" cy="11" r="5"/><path d="m37 11 2 2 3-4"/>',
 jobs:'<rect x="8" y="11" width="32" height="27" rx="4"/><path d="M17 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M8 21h32M21 20v4h6v-4"/><path d="m31 31 3 3 6-6"/>',
 leaderboard:'<path d="M18 39h13M24.5 31v8M14 9h21v12a10.5 10.5 0 0 1-21 0V9Z"/><path d="M14 13H8v7a7 7 0 0 0 7 7M35 13h6v7a7 7 0 0 1-7 7"/><path d="m24 14 2 4 4.5.5-3.2 3 1 4.5-4.3-2.2-4.3 2.2 1-4.5-3.2-3 4.5-.5z"/>',
 referral:'<circle cx="17" cy="17" r="6"/><circle cx="34" cy="14" r="5"/><path d="M7 36v-3a10 10 0 0 1 20 0v3M28 34v-3a7 7 0 0 1 13 0v3"/><path d="m26 7 4-4 3 4M30 3v6"/>'
 };
 const shape=shapes[kind]||shapes.academy;
 const unique='art-'+kind;
 return '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" class="sc9-vector sc9-vector-'+kind+'">'+
 '<circle cx="24" cy="24" r="21" class="sc9-orbit-track"/>'+
 '<circle cx="24" cy="24" r="18" class="sc9-orbit-trace" pathLength="100"/>'+
 '<g class="sc9-glyph" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+shape+'</g>'+
 '<circle cx="38" cy="9" r="2.2" class="sc9-detail-dot"/></svg>';
}
function preview(kind){
 const bars='<i></i><i></i><i></i><i></i>';
 const map={
 academy:'<span class="sc9-mini-sheets"><i></i><i></i><i></i></span>',
 roadmap:'<span class="sc9-mini-route"><i></i><i></i><i></i><i></i></span>',
 playbook:'<span class="sc9-mini-text"><i></i><i></i><i></i></span>',
 roleplay:'<span class="sc9-mini-waves">'+bars+'</span>',
 workplace:'<span class="sc9-mini-pipeline"><i></i><i></i><i></i></span>',
 interview:'<span class="sc9-mini-bubbles"><i></i><i></i></span>',
 clinic:'<span class="sc9-mini-bubbles"><i></i><i></i></span>',
 checklist:'<span class="sc9-mini-checks"><i></i><i></i><i></i></span>',
 performance:'<span class="sc9-mini-graph">'+bars+'</span>',
 coach:'<span class="sc9-mini-waves">'+bars+'</span>',
 vault:'<span class="sc9-mini-sheets"><i></i><i></i><i></i></span>',
 review:'<span class="sc9-mini-graph">'+bars+'</span>',
 profile:'<span class="sc9-mini-bubbles"><i></i><i></i></span>',
 placement:'<span class="sc9-mini-route"><i></i><i></i><i></i><i></i></span>',
 jobs:'<span class="sc9-mini-pipeline"><i></i><i></i><i></i></span>',
 leaderboard:'<span class="sc9-mini-graph">'+bars+'</span>',
 referral:'<span class="sc9-mini-route"><i></i><i></i><i></i><i></i></span>'
 };
 return '<span class="sc9-mini-preview" aria-hidden="true">'+(map[kind]||map.academy)+'</span>';
}
function enhanceRoot(){
 const ws=$('workspace');if(!ws||ws.classList.contains('hidden'))return;
 const cards=ws.querySelectorAll('.member-root-card');
 if(!cards.length)return;
 const title=ws.querySelector('.workhead h2')?.textContent.trim()||'';
 const section=/academy/i.test(title)?'academy':/practice/i.test(title)?'practice':/progress/i.test(title)?'progress':/career/i.test(title)?'career':'community';
 ws.classList.add('sc9-root');
 ws.dataset.sc9Section=section;
 cards.forEach((card,i)=>{
  if(card.dataset.sc9Enhanced)return;
  card.dataset.sc9Enhanced='true';
  const action=card.dataset.memberAction,meta=byAction[action]||byAction.showResources;
  card.classList.add('sc9-root-card','sc9-root-card-'+meta.kind);
  card.style.setProperty('--sc9-delay',Math.min(i,6)*70+'ms');
  const icon=card.querySelector('.member-root-card-icon');
  if(icon)icon.remove()
  const copy=card.querySelector('.member-root-card-copy');
  if(copy){
   const titleEl=copy.querySelector('strong');
   if(titleEl){
    const marker=document.createElement('span');
    marker.className='sc9-typelabel';marker.textContent=meta.group;
    copy.insertBefore(marker,titleEl);
   }
   const cta=document.createElement('span');cta.className='sc9-inline-cta';
   cta.textContent=meta.label;copy.appendChild(cta);
  }
  /* Decorative illustrations intentionally removed from navigation windows. */
 });
}
function enhanceDashboard(){
 const panel=$('profilePanel');if(!panel||!panel.classList.contains('signature-dashboard'))return;
 panel.classList.add('sc9-dashboard');
 const cards=panel.querySelectorAll('.sig-tool');
 cards.forEach((card,i)=>{
  if(card.dataset.sc9Enhanced)return;
  card.dataset.sc9Enhanced='true';
  const action=card.dataset.memberAction;
  const meta=byAction[action]||byAction.showResources;
  card.classList.add('sc9-sig-tool');
  card.style.setProperty('--sc9-delay',Math.min(i,4)*70+'ms');
  const tile=card.querySelector('.sig-tool-art');
  if(tile)tile.remove()
  /* Decorative illustrations intentionally removed from navigation windows. */
 });
 const hero=panel.querySelector('.todaycard.signature-feature');
 if(hero&&!hero.dataset.sc9Enhanced){
  hero.dataset.sc9Enhanced='true';
  const actions=hero.querySelector('.sig-feature-actions');
  if(actions)actions.insertAdjacentHTML('beforebegin','<div class="sc9-live-context"><span class="sc9-live-beacon"></span><span id="sc9LiveContext">Your next recommended session</span></div>');
  const top=hero.querySelector('.sig-feature-top');
  if(top)top.insertAdjacentHTML('beforeend','<span class="sc9-top-decoration" aria-hidden="true"><i></i><i></i><i></i></span>');
  const t=$('todayTitle'),d=$('todayDetail'),label=$('sc9LiveContext');
  if(t&&d&&label){
   const update=()=>{
    const heading=(t.textContent||'').toLowerCase();
    const summary=(d.textContent||'').toLowerCase();
    if(/baseline|first|start/i.test(heading+' '+summary))label.textContent='Your starting point · One focused rep';
    else if(/objection/i.test(heading+' '+summary))label.textContent='Recommended focus · Handling resistance';
    else if(/qualification|qualify/i.test(heading+' '+summary))label.textContent='Recommended focus · Qualification';
    else if(/discovery|question/i.test(heading+' '+summary))label.textContent='Recommended focus · Discovery';
    else if(/rapport|natural/i.test(heading+' '+summary))label.textContent='Recommended focus · Conversation quality';
    else label.textContent='Recommended from your practice';
   };
   const observe=new MutationObserver(update);
   observe.observe(t,{childList:true,subtree:true,characterData:true});
   observe.observe(d,{childList:true,subtree:true,characterData:true});
   update();
  }
 }
 const skills=panel.querySelectorAll('.signature-insights .membercard');
 skills.forEach((c,i)=>{
  c.classList.add('sc9-insight-card');
  if(!c.dataset.sc9Enhanced){
   c.dataset.sc9Enhanced='true';
   const label=c.querySelector('.eyebrow');
   if(label){
    const tag=document.createElement('span');
    tag.className='sc9-insight-mark';tag.textContent=i===0?'◎':'↗';
    label.appendChild(tag);
   }
  }
 });
}
// Refresh after underlying navigation. Do not replace existing event handlers.
for(const key of ['openWorkspace','openAccount','loadAccount']){
 const fn=window[key];if(typeof fn!=='function')continue;
 window[key]=function(){
  const result=fn.apply(this,arguments);
  if(result&&typeof result.then==='function')return result.finally(()=>{enhanceRoot();enhanceDashboard()});
  enhanceRoot();enhanceDashboard();
  return result;
 };
}
function boot(){enhanceRoot();enhanceDashboard()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
