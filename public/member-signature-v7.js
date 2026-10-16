
/* THE SETTER CIRCLE — SIGNATURE EXPERIENCE / v7
   Client-side presentation only. The existing training APIs, scoring
   workflows, account state and module navigation remain intact.
*/
(function(){
 'use strict';
 if(window.__setterSignatureV7)return;
 window.__setterSignatureV7=true;
 const $=id=>document.getElementById(id);
 const svg=(name)=>({
  arrow:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  book:'<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M8 27.5h20V7H10a3 3 0 0 0-3 3v18a3 3 0 0 0 3 3h18M10 27.5a3 3 0 0 0-3 3M12 13h11M12 18h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  workplace:'<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="6.5" y="11.5" width="23" height="18" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M13 11.5V9a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2.5M6.5 20.5h23M15 18.5v4h6v-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  message:'<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M7 8.5h22v17H16l-8.5 5V8.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 15h12M12 20h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  progress:'<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M8 28V17m7 11V8m7 20V20m7 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 31h25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
 })[name]||'';
 const actions=[
  {n:'01',title:'Academy',sub:'Build the foundations',note:'STRUCTURED LEARNING',key:'showAcademy',icon:'book'},
  {n:'02',title:'Workplace',sub:'Work a simulated shift',note:'ON-THE-JOB PRACTICE',key:'workplace',icon:'workplace'},
  {n:'03',title:'Roleplay Lab',sub:'Master the conversation',note:'AI SIMULATIONS',key:'openAIStage',icon:'message'},
  {n:'04',title:'Progress',sub:'See how you are improving',note:'PERFORMANCE',key:'progress',icon:'progress'}
 ];
 function transformDashboard(){
  const panel=$('profilePanel');
  const focus=panel?.querySelector('.focusdash');
  const card=panel?.querySelector('.todaycard');
  const stats=panel?.querySelector('.accountstats');
  const quick=panel?.querySelector('.member-shell-quick');
  if(!panel||!focus||!card||!stats||!quick||panel.dataset.signatureV7==='ready')return;
  const oldTitle=$('todayTitle')?.textContent||'Build your training baseline';
  const oldDescription=$('todayDetail')?.textContent||'Complete one focused rep, then build on your results.';
  const oldScore=$('todayScore')?.textContent||'START';
  panel.dataset.signatureV7='ready';
  panel.classList.add('signature-dashboard');
  const greeting=panel.querySelector('.memberhero');
  if(greeting){
   greeting.classList.add('signature-welcome');
   const eyebrow=greeting.querySelector('.eyebrow');
   if(eyebrow)eyebrow.textContent='THE SETTER CIRCLE  /  MEMBER STUDIO';
  }
  // One clear call to action. Dynamic ids are deliberately retained so
  // refreshPersonalCoach() can update the real, personalised recommendation.
  card.classList.add('signature-feature');
  card.innerHTML=
    '<div class="sig-orbit-noise" aria-hidden="true"></div>'+
    '<div class="sig-feature-track" aria-hidden="true"><i></i><i></i><i></i></div>'+
    '<div class="sig-feature-top"><span class="sig-live"><span class="sig-pulse"></span> YOUR DAILY FOCUS</span>'+
    '<span class="sig-feature-serial">01  /  PERSONAL TRAINING</span></div>'+
    '<div class="sig-feature-body"><div class="sig-feature-copy">'+
     '<span class="sig-feature-super">YOUR NEXT MOVE</span>'+
     '<h2 id="todayTitle"></h2>'+
     '<p id="todayDetail"></p>'+
     '<div class="sig-feature-actions"><button type="button" class="sig-primary" onclick="startRecommendedTraining()">'+
       '<span>Start training</span><span class="sig-primary-arrow">'+svg('arrow')+'</span></button>'+
       '<button type="button" class="sig-secondary" onclick="showPersonalCoach()">Why this was chosen <span aria-hidden="true">↗</span></button></div>'+
    '</div>'+
    '<div class="sig-orbit-wrap"><div class="sig-orbit" aria-hidden="true"><div class="sig-orbit-inner">'+
      '<div class="sig-orbit-bars"><i></i><i></i><i></i><i></i><i></i></div></div></div>'+
      '<div class="sig-orbit-score"><span id="todayScore"></span><small>SETTER SCORE</small></div></div>'+
    '</div>'+
    '<div class="sig-feature-foot"><span>PERSONALISED THROUGH PRACTICE</span><span>THE SETTER CIRCLE <b>✦</b> 2026</span></div>';
  $('todayTitle').textContent=oldTitle;
  $('todayDetail').textContent=oldDescription;
  $('todayScore').textContent=oldScore;
  // Key statistics now read as one coherent data strip.
  stats.classList.add('signature-stats');
  focus.insertAdjacentElement('afterend',stats);
  const labels=['TRAINING XP','CURRENT LEVEL','DAY STREAK'];
  [...stats.querySelectorAll('.accountstat')].forEach((stat,i)=>{
    stat.classList.add('sig-stat');
    const label=stat.querySelector('span');
    if(label&&labels[i])label.textContent=labels[i];
    const symbol=document.createElement('span');
    symbol.className='sig-stat-index';
    symbol.textContent=String(i+1).padStart(2,'0');
    stat.prepend(symbol);
  });
  // The full card surface remains a working link.
  quick.classList.add('signature-quick');
  quick.innerHTML=
    '<div class="sig-shortcuts-header"><div>'+
      '<div class="sig-section-kicker"><span class="sig-section-line"></span> YOUR WORKSPACE</div>'+
      '<h3>Everything in reach<span class="sig-head-period">.</span></h3>'+
     '</div><span class="sig-shortcuts-count">04  /  LEARNING SPACES</span></div>'+
    '<div class="sig-shortcuts-grid">'+actions.map((a,i)=>
      '<button type="button" class="sig-tool sig-tool-'+(i+1)+'" data-member-action="'+a.key+'" aria-label="Open '+a.title+'">'+
       '<span class="sig-tool-top"><span class="sig-tool-index">'+a.n+' / 04</span><span class="sig-tool-pointer">'+svg('arrow')+'</span></span>'+
       '<span class="sig-tool-art">'+svg(a.icon)+'</span>'+
       '<span class="sig-tool-meta">'+a.note+'</span>'+
       '<strong>'+a.title+'</strong>'+
       '<span class="sig-tool-sub">'+a.sub+'</span></button>'
    ).join('')+'</div>';
  const scores=panel.querySelector('.membergrid.slimdash');
  if(scores){
   scores.classList.add('signature-insights');
   const cards=scores.querySelectorAll('.membercard');
   if(cards[0]){const e=cards[0].querySelector('.eyebrow');if(e)e.textContent='SKILL INTELLIGENCE'}
   if(cards[1]){const e=cards[1].querySelector('.eyebrow');if(e)e.textContent='YOUR RECENT ACTIVITY'}
  }
  // One bottom cue keeps the platform feeling connected, without adding a
  // fake progress percentage or claiming a placement milestone.
  const note=document.createElement('div');
  note.className='sig-dashboard-footer';
  note.innerHTML='<span class="sig-dash-line"></span><span>DEVELOP SKILLS  /  DEMONSTRATE ABILITY  /  BUILD YOUR CAREER</span>';
  const footer=panel.querySelector('.memberfooter');
  if(footer)panel.insertBefore(note,footer);
  decorateNavigation();
 }
 function decorateNavigation(){
  const nav=$('memberAppNav');if(!nav)return;
  nav.classList.add('signature-navigation');
  const footer=nav.querySelector('.member-nav-footer p');
  if(footer)footer.textContent='Every great setter was a beginner once. Keep building.';
 }
 // Reuse the same stage cards / tools. Add polish, not a new navigation system.
 function enhanceWorkspace(){
  const ws=$('workspace');
  if(!ws||ws.classList.contains('hidden')||!document.body.classList.contains('member-shell-active'))return;
  ws.classList.add('signature-workspace');
  const panel=ws.querySelector('.workspaceinner');
  if(panel)panel.classList.add('sig-animated-page');
  const title=ws.querySelector('.workhead h2');
  if(title&&title.textContent)ws.dataset.currentTitle=title.textContent;
 }
 function sync(){
  transformDashboard();
  enhanceWorkspace();
 }
 // These functions are already wrapped by the member navigation shell. Re-run
 // UI decoration after navigation without changing their return values.
 for(const fname of ['openAccount','loadAccount','openWorkspace']){
  const original=window[fname];
  if(typeof original!=='function')continue;
  window[fname]=function(){
   const result=original.apply(this,arguments);
   if(result&&typeof result.then==='function')return result.finally(sync);
   sync();return result;
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
 else sync();
})();
