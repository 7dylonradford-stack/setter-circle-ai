/* Setter Circle — polish v16. Native UI only; never changes student scores or API state. */
(function(){
 'use strict';
 if(window.__setterPolishV16)return;
 window.__setterPolishV16=true;
 const root=document.documentElement;
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const updateMotion=()=>root.classList.toggle('sc16-reduce-motion',!!reduce?.matches);
 updateMotion();
 reduce?.addEventListener?.('change',updateMotion);
 const inputSelector='input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]';
 let frame=0;
 const keyboardOpen=()=>{
  const el=document.activeElement;
  return el instanceof Element&&el.matches(inputSelector);
 };
 function viewport(){
  frame=0;
  const v=window.visualViewport;
  if(!v)return;
  const available=Math.max(240,Math.floor(v.height));
  const overlap=Math.max(0,window.innerHeight-v.height-v.offsetTop);
  const visibleKeyboard=overlap>110&&keyboardOpen();
  root.style.setProperty('--sc16-visible-height',available+'px');
  root.style.setProperty('--sc16-viewport-top',Math.max(0,Math.floor(v.offsetTop))+'px');
  const wasOpen=document.body.classList.contains('sc16-keyboard-open');
  document.body.classList.toggle('sc16-keyboard-open',visibleKeyboard);
  if(wasOpen&&!visibleKeyboard)root.style.removeProperty('--sc16-viewport-top');
 }
 const scheduleViewport=()=>{if(!frame)frame=requestAnimationFrame(viewport)};
 window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});
 window.visualViewport?.addEventListener('scroll',scheduleViewport,{passive:true});
 window.addEventListener('resize',scheduleViewport,{passive:true});
 document.addEventListener('focusin',e=>{
  if(!(e.target instanceof Element)||!e.target.matches(inputSelector))return;
  scheduleViewport();
  // Keep focused fields above the Android keyboard without scrolling the whole page on tap.
  if(e.target.closest('#workspace,#trainer,#accountModal,.experience-panel,#app')){
   requestAnimationFrame(()=>{
    if(document.activeElement===e.target&&!e.target.closest('#trainer .composer')){
     e.target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    }
   });
  }
 });
 document.addEventListener('focusout',scheduleViewport);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleViewport()});
 // Screen-reader feedback for async UI states already implemented by the platform.
 function enhance(){
  const toast=document.getElementById('toast');
  if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true')}
  const chat=document.getElementById('messages');
  if(chat){chat.setAttribute('role','log');chat.setAttribute('aria-label','Simulated prospect conversation');chat.setAttribute('aria-relevant','additions')}
  const send=document.querySelector('#trainer .composer .send');
  if(send&&!send.getAttribute('aria-label'))send.setAttribute('aria-label','Send your message');
  const input=document.getElementById('input');
  if(input){input.setAttribute('enterkeyhint','send');input.setAttribute('aria-label','Your message to the simulated prospect')}
  const demoStatus=document.getElementById('chatMessage');
  if(demoStatus){demoStatus.setAttribute('role','status');demoStatus.setAttribute('aria-live','polite')}
  const demoMessages=document.getElementById('chatMessages');
  if(demoMessages){demoMessages.setAttribute('role','log');demoMessages.setAttribute('aria-label','Free fictional prospect conversation')}
  const work=document.getElementById('workContent');
  if(work)work.setAttribute('aria-live','off');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{enhance();scheduleViewport()},{once:true});
 else{enhance();scheduleViewport()}
})();
