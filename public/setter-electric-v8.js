
/* THE SETTER CIRCLE — ELECTRIC LIME / MOTION & AUDIO v8
   Small, user-driven Web Audio feedback. No audio files, autoplay or external
   dependencies. Respect reduced motion, provide mute controls, preserve data.
*/
(function(){
 'use strict';
 if(window.__setterElectricV8)return;
 window.__setterElectricV8=true;
 const AUDIO_PREF='setterCircleUiSoundV8';
 const hasReducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 let soundOn=true;
 try{soundOn=localStorage.getItem(AUDIO_PREF)!=='off'}catch(e){}
 let audio=null,lastSound=0,seed=0;
 const AudioEngine=window.AudioContext||window.webkitAudioContext;
 const controls=[];
 const soundIcon=(on)=>on
 ? '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg>'
 : '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5ZM17 9l5 6M22 9l-5 6"/></svg>';
 function updateSoundControls(){
  controls.forEach(btn=>{
    btn.setAttribute('aria-pressed',String(soundOn));
    btn.setAttribute('aria-label',soundOn?'Mute click sounds':'Enable click sounds');
    btn.setAttribute('title',soundOn?'Mute interaction sounds':'Enable interaction sounds');
    const label=btn.querySelector('.sc-sound-caption'),icon=btn.querySelector('.sc-sound-icon');
    if(label)label.textContent=soundOn?'Sound on':'Sound off';
    if(icon)icon.innerHTML=soundIcon(soundOn);
  });
 }
 function soundToggle(){
  soundOn=!soundOn;
  try{localStorage.setItem(AUDIO_PREF,soundOn?'on':'off')}catch(e){}
  updateSoundControls();
  if(soundOn)playBubble(true);
 }
 function buildSoundButton(mobile,extra){
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='sc-sound-control '+(extra||'');
  btn.innerHTML='<span class="sc-sound-icon" aria-hidden="true"></span><span class="sc-sound-caption"></span>';
  btn.dataset.soundToggle='1';
  btn.setAttribute('aria-pressed',String(soundOn));
  if(mobile)btn.classList.add('sc-mobile-sound');
  btn.addEventListener('click',e=>{e.stopPropagation();soundToggle();});
  controls.push(btn);
  updateSoundControls();
  return btn;
 }
 function playBubble(confirmation){
  if(!soundOn||!AudioEngine)return;
  // Avoid repeating sounds when a double-tap or duplicate listener fires.
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(!confirmation&&now-lastSound<55)return;
  lastSound=now;
  try{
   if(!audio)audio=new AudioEngine();
   const context=audio;
   if(context.state==='suspended')context.resume().catch(()=>{});
   const t=context.currentTime+0.004,osc=context.createOscillator(),env=context.createGain();
   osc.type='sine';seed=(seed+1)%3;
   const start=confirmation?470:405+(seed*19);
   const peak=confirmation?845:700+(seed*24);
   osc.frequency.setValueAtTime(start,t);
   osc.frequency.exponentialRampToValueAtTime(peak,t+.037);
   osc.frequency.exponentialRampToValueAtTime(confirmation?560:460,t+.114);
   env.gain.setValueAtTime(.0001,t);
   env.gain.exponentialRampToValueAtTime(confirmation?.027:.019,t+.012);
   env.gain.exponentialRampToValueAtTime(.005,t+.053);
   env.gain.exponentialRampToValueAtTime(.0001,t+.135);
   osc.connect(env);env.connect(context.destination);
   osc.start(t);osc.stop(t+.14);
   osc.onended=()=>{try{osc.disconnect();env.disconnect()}catch(e){}};
  }catch(e){/* Audio feedback never blocks interaction. */}
 }
 function initControls(){
  const nav=document.getElementById('memberAppNav');
  const footer=nav?.querySelector('.member-nav-footer');
  const more=nav?.querySelector('.member-nav-more-panel');
  if(footer&&!footer.querySelector('.sc-sound-control'))footer.prepend(buildSoundButton(false,'sc-sidebar-sound'));
  if(more&&!more.querySelector('.sc-sound-control'))more.appendChild(buildSoundButton(true,'sc-menu-sound'));
  if(document.getElementById('site')||document.querySelector('.experience-menu')){
   if(!document.querySelector('.sc-public-sound'))document.body.appendChild(buildSoundButton(false,'sc-public-sound'));
  }
  const trainer=document.querySelector('#trainer .trainnav');
  if(trainer&&!trainer.querySelector('.sc-trainer-sound')){
   const back=trainer.querySelector('button[onclick*="closeTrainer"]');
   if(back)trainer.insertBefore(buildSoundButton(false,'sc-trainer-sound'),back);
  }
  updateSoundControls();
 }
 document.addEventListener('click',function(e){
  const t=e.target;
  if(!(t instanceof Element)||t.closest('[data-sound-toggle]'))return;
  const clickTarget=t.closest('button,a[href],summary,[role="button"],input[type="checkbox"],input[type="radio"],select');
  if(!clickTarget||clickTarget.matches(':disabled')||clickTarget.closest('[inert]'))return;
  // Keep typing, scoring, AI replies, and text entry completely silent.
  playBubble(false);
  if(!hasReducedMotion()&&clickTarget.matches('button,.btn')){
   clickTarget.classList.remove('sc-click-pop');
   void clickTarget.offsetWidth;
   clickTarget.classList.add('sc-click-pop');
  }
 },{capture:true,passive:true});
 document.addEventListener('animationend',e=>{
  if(e.target instanceof Element&&e.target.classList.contains('sc-click-pop'))e.target.classList.remove('sc-click-pop');
 });
 function spotlights(){
  if(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches)return;
  let frame=0,target=null,clientX=0,clientY=0;
  document.addEventListener('pointermove',e=>{
   const el=e.target instanceof Element?e.target.closest('.sig-tool,.member-root-card,#site .cards .card,.experience-menu-card'):null;
   if(!el)return;
   target=el;clientX=e.clientX;clientY=e.clientY;
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;
    if(!target||!target.isConnected)return;
    const rect=target.getBoundingClientRect();
    target.style.setProperty('--spot-x',Math.round(clientX-rect.left)+'px');
    target.style.setProperty('--spot-y',Math.round(clientY-rect.top)+'px');
   });
  },{passive:true});
 }
 function revealVisible(){
  if(hasReducedMotion()||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver((entries,obs)=>{
   entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('sc-visible');e.target.classList.remove('sc-pending');obs.unobserve(e.target);}});
  },{threshold:.07,rootMargin:'0px 0px 40px 0px'});
  const tracked=new WeakSet();
  const register=()=>{
   const selectors=[
    '#site .cards .card','#site .stats .stat','#site .sectiontop',
    '.experience-menu-card','.testimonial-grid .quote','.founder-photo'
   ];
   document.querySelectorAll(selectors.join(',')).forEach(el=>{
    if(tracked.has(el))return;
    tracked.add(el);el.setAttribute('data-sc-reveal','');
    el.classList.add('sc-pending');observer.observe(el);
   });
  };
  register();
  // Content in the public experience can appear after API fetch or tab switch.
  const root=document.querySelector('.experience-menu')?.closest('main')||document.getElementById('site');
  if(root){
   let queued=false;
   const mutations=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;register()});
   });
   mutations.observe(root,{childList:true,subtree:true});
  }
 }
 function init(){
  initControls();spotlights();revealVisible();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
