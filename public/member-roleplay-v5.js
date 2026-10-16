
/* Setter Circle roleplay flow v5
 * An inline two-step setup: choose scenario → difficulty → launch.
 * Underlying simulation / scoring / APIs remain unchanged.
 */
(function(){
  'use strict';
  if(window.__setterRoleplayFlowV5)return;
  window.__setterRoleplayFlowV5=true;

  const $=id=>document.getElementById(id);
  const stages=[
    {id:'network',num:'01',tag:'NETWORKING',title:'Build connections',copy:'Start natural conversations with setters, recruiters and sales professionals.',hint:'Focus on rapport, curiosity and meaningful conversations.',icon:'network'},
    {id:'client',num:'02',tag:'CLIENT ACQUISITION',title:'Land clients',copy:'Research business owners, discover problems and earn the next step.',hint:'Focus on relevance, discovery and opportunity identification.',icon:'client'},
    {id:'role',num:'03',tag:'ON THE JOB',title:'Work live leads',copy:'Handle qualification, objections and appointment-booking conversations.',hint:'Focus on fit, listening and clear next steps.',icon:'role'}
  ];
  const difficulties=[
    {level:1,label:'Beginner',tag:'OPEN',copy:'More patient prospects. Learn the conversation flow.',recommended:true},
    {level:2,label:'Intermediate',tag:'REALISTIC',copy:'Natural objections, mixed interest and incomplete answers.'},
    {level:3,label:'Advanced',tag:'GUARDED',copy:'Busy prospects. Weak questions lose their attention.'},
    {level:4,label:'Elite',tag:'UNFORGIVING',copy:'High resistance. Every message needs to earn its place.'}
  ];
  const icon=name=>{
    const paths={
      network:'<circle cx="8" cy="7" r="3"/><circle cx="17.5" cy="8" r="2.5"/><path d="M2.5 20v-2.1A5.1 5.1 0 0 1 7.6 13h.8a5.1 5.1 0 0 1 5.1 4.9V20zM15 14h2.6A4.4 4.4 0 0 1 22 18.4V20"/>',
      client:'<rect x="3.5" y="6" width="17" height="15" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3.5 12h17M10 12v2h4v-2"/>',
      role:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.5 9h9M7.5 13h5M7.5 17h8"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
  };
  let selectedStage=null,selectedDifficulty=1,isLaunching=false;

  function stageCard(s){
    return '<button type="button" class="rp-stage-card" data-rp-stage="'+s.id+'" aria-pressed="false" aria-controls="rpDifficultyPanel" aria-expanded="false">'+
       '<span class="rp-stage-art">'+icon(s.icon)+'</span>'+
       '<span class="rp-stage-copy">'+
       '<span class="rp-stage-tag">'+s.num+' / '+s.tag+'</span>'+
       '<strong>'+s.title+'</strong>'+
       '<span class="rp-stage-description">'+s.copy+'</span></span>'+
       '<span class="rp-stage-check" aria-hidden="true">✓</span></button>';
  }
  function difficultyCard(d){
    return '<button class="rp-diff-card" type="button" data-rp-difficulty="'+d.level+'" aria-pressed="'+(d.level===selectedDifficulty)+'">'+
       '<span class="rp-diff-indicator" aria-hidden="true"></span>'+
       '<span class="rp-diff-copy"><strong>'+d.label+'</strong><span>'+d.tag+(d.recommended?' · GOOD STARTING POINT':'')+'</span><small>'+d.copy+'</small></span></button>';
  }
  function renderRoleplay(){
    const content=$('workContent'),ws=$('workspace');
    if(!content||!ws)return;
    selectedStage=null;selectedDifficulty=1;isLaunching=false;
    ws.classList.remove('member-root-page','workplace-page','module-page');
    ws.classList.add('roleplay-page','rp-v5-page');
    $('workEyebrow').textContent='PRACTICE  /  AI ROLEPLAY LAB';
    $('workTitle').textContent='Train your conversation skills';
    $('workSub').textContent='Choose what to practise, set the challenge and begin. Every simulation gives you feedback to improve.';
    const stageMarkup=stages.map(stageCard).join('');
    const diffMarkup=difficulties.map(difficultyCard).join('');
    content.innerHTML=
      '<div class="rp-flow" id="rpFlow">'+
        '<div class="rp-topline"><span class="rp-signal"><span class="rp-signal-dot"></span>SIMULATOR READY</span><span class="rp-flow-steps">01 / 02  ·  SETUP</span></div>'+
        '<div class="rp-section-header"><div><span class="rp-step">01 <i></i> CHOOSE A SCENARIO</span><h3>What are you training today?</h3></div>'+
         '<span class="rp-section-extra">Select a focus to continue</span></div>'+
        '<div class="rp-stage-grid">'+stageMarkup+'</div>'+
        '<section id="rpDifficultyPanel" class="rp-difficulty-panel" hidden aria-label="Choose practice difficulty">'+
          '<div class="rp-panel-kicker"><span class="rp-step">02 <i></i> SET THE DIFFICULTY</span><span id="rpSelectedStage" class="rp-chosen-name"></span></div>'+
          '<h3>How challenging should this feel?</h3>'+
          '<p class="rp-panel-desc" id="rpSelectedHint"></p>'+
          '<div class="rp-diff-grid" role="group" aria-label="Difficulty levels">'+diffMarkup+'</div>'+
          '<div class="rp-start-panel"><div class="rp-start-copy"><span>YOUR SESSION</span><strong id="rpSessionLabel" aria-live="polite">Ready to practise</strong></div>'+
          '<button type="button" class="rp-start-button" id="rpLaunch" data-rp-launch="1">Start simulation <span aria-hidden="true">↗</span></button></div>'+
        '</section>'+
        '<div class="rp-bottom-note"><span class="rp-note-icon">✦</span><span>Realistic practice. Useful feedback. No pressure to get it perfect on the first attempt.</span></div>'+
      '</div>';
    ws.scrollTop=0;
    document.title='AI Roleplay Lab | The Setter Circle';
  }

  const oldOpen=window.openAIStage;
  if(typeof oldOpen==='function'){
    window.openAIStage=function(prefill){
      const out=oldOpen.apply(this,arguments);
      if(prefill)return out;
      if($('workspace')&&!$('workspace').classList.contains('hidden'))renderRoleplay();
      return out;
    };
  }
  function chooseStage(id){
    const found=stages.find(x=>x.id===id);
    if(!found)return;
    selectedStage=found;
    const ws=$('workspace'),panel=$('rpDifficultyPanel');
    if(!ws||!panel||ws.classList.contains('hidden'))return;
    ws.querySelectorAll('[data-rp-stage]').forEach(b=>{
      const current=b.dataset.rpStage===id;
      b.classList.toggle('is-selected',current);
      b.setAttribute('aria-pressed',String(current));
      b.setAttribute('aria-expanded',String(current));
    });
    $('rpSelectedStage').textContent=found.title;
    $('rpSelectedHint').textContent=found.hint;
    selectedDifficulty=1;
    setDifficulty(1);
    panel.hidden=false;
    panel.classList.remove('rp-appear');
    void panel.offsetWidth;
    panel.classList.add('rp-appear');
    requestAnimationFrame(()=>{
      panel.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    });
  }
  function setDifficulty(level){
    const diff=difficulties.find(x=>x.level===level);
    if(!diff)return;
    selectedDifficulty=level;
    const panel=$('rpDifficultyPanel');if(!panel)return;
    panel.querySelectorAll('[data-rp-difficulty]').forEach(b=>{
      const current=Number(b.dataset.rpDifficulty)===level;
      b.classList.toggle('is-selected',current);
      b.setAttribute('aria-pressed',String(current));
    });
    if($('rpSessionLabel'))$('rpSessionLabel').textContent=(selectedStage?.title||'Practice')+' / '+diff.label;
  }
  function launch(){
    if(isLaunching||!selectedStage)return;
    if(!$('trainer')||!$('difficulty')||typeof window.enterTrainer!=='function'||typeof window.syncDifficultyControls!=='function'){
      if(typeof window.toast==='function')window.toast('Training is unavailable. Please try again.');
      return;
    }
    const launchButton=$('rpLaunch');
    isLaunching=true;
    if(launchButton){launchButton.disabled=true;launchButton.textContent='Opening simulation…';}
    // Use the same setup parameters as the original launchSetup(), but do not
    // open the duplicate modal. The original roleplay engine remains unchanged.
    $('difficulty').value=String(selectedDifficulty);
    window.syncDifficultyControls();
    $('workspace').classList.add('hidden');
    $('workspace').style.zIndex='';
    $('accountModal').classList.add('hidden');
    $('simSetup').classList.add('hidden');
    window.enterTrainer(selectedStage.id);
  }
  document.addEventListener('click',e=>{
    const stage=e.target.closest('[data-rp-stage]');
    if(stage&&stage.closest('#rpFlow')){e.preventDefault();chooseStage(stage.dataset.rpStage);return;}
    const diff=e.target.closest('[data-rp-difficulty]');
    if(diff&&diff.closest('#rpFlow')){e.preventDefault();setDifficulty(Number(diff.dataset.rpDifficulty));return;}
    const launchBtn=e.target.closest('[data-rp-launch]');
    if(launchBtn&&launchBtn.closest('#rpFlow')){e.preventDefault();launch();}
  });

  // For roleplays opened from other features with a pre-selected scenario,
  // preserve that selection instead of asking them to choose it twice.
  const originalOpenSetup=window.openSetup;
  if(typeof originalOpenSetup==='function'){
    window.openSetup=function(prefill){
      const result=originalOpenSetup.apply(this,arguments);
      const chosen=stages.find(x=>x.id===prefill);
      const modes=$('setupModes'),title=$('setupTitle'),sub=$('setupSub');
      if(chosen&&modes){
        modes.classList.add('hidden');
        $('simSetup').classList.add('rp-prefilled-setup');
        if(title)title.textContent='Choose your difficulty';
        if(sub)sub.textContent=chosen.title+' — '+chosen.hint;
      }else{
        if(modes)modes.classList.remove('hidden');
        $('simSetup').classList.remove('rp-prefilled-setup');
        if(title)title.textContent='What do you want to work on?';
        if(sub)sub.textContent='Choose the skill you want this rep to test.';
      }
      return result;
    };
  }
})();
