
/* Setter Circle / Conversation Room V10
 * AI-reply typing indicator + quiet, responsive keystroke sound.
 * Driven exclusively by the existing pending-response DOM element:
 * no fabricated AI latency, no changes to model or scoring logic.
 */
(function(){
'use strict';
if(window.__setterConversationV10)return;
window.__setterConversationV10=true;
const $=id=>document.getElementById(id);
let timer=0,active=null,noiseBuffer=null,startedAt=0;
const enabled=()=>{
 try{return typeof window.setterCircleSoundEnabled==='function'
   ?window.setterCircleSoundEnabled()
   :localStorage.getItem('setterCircleUiSoundV8')!=='off'}
 catch(e){return false}
};
const shown=()=>document.visibilityState!=='hidden'&&$('trainer')&&!$('trainer').classList.contains('hidden');
function stopAudio(){
 clearTimeout(timer);timer=0;active=null;startedAt=0;
}
function tap(){
 if(!active||!active.isConnected||!enabled()||!shown()){stopAudio();return}
 const ctx=typeof window.setterCircleAudioContext==='function'?window.setterCircleAudioContext():null;
 if(ctx){
  try{
   const t=ctx.currentTime+.006;
   if(!noiseBuffer||noiseBuffer.sampleRate!==ctx.sampleRate){
    const length=Math.max(256,Math.round(ctx.sampleRate*.017));
    noiseBuffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<length;i++){
     const decay=Math.pow(1-i/length,2);
     data[i]=(Math.random()*2-1)*decay;
    }
   }
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   source.buffer=noiseBuffer;filter.type='lowpass';
   filter.frequency.setValueAtTime(650+Math.random()*720,t);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.linearRampToValueAtTime(.008+Math.random()*.004,t+.002);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.026);
   source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
   source.start(t);source.stop(t+.029);
   source.onended=()=>{try{source.disconnect();filter.disconnect();gain.disconnect()}catch(e){}};
  }catch(e){/* Audio is optional and cannot interrupt the chat. */}
 }
 const elapsed=performance.now()-startedAt;
 // Natural variation with a quieter pace if the API request takes longer.
 const interval=(elapsed>10000?420:170)+Math.random()*(elapsed>10000?260:190);
 timer=window.setTimeout(tap,interval);
}
function beginAudio(node){
 if(!node||active===node||!enabled()||!shown())return;
 stopAudio();
 active=node;startedAt=performance.now();
 timer=window.setTimeout(tap,130);
}
function decorate(node){
 if(node.dataset.setterTypingV10)return;
 node.dataset.setterTypingV10='1';
 node.textContent='';
 const name=$('tName')?.textContent.trim().split(/\s*[·•]\s*/)[0]||'Prospect';
 const words=document.createElement('span');
 words.className='room10-typing-label';
 words.textContent=name+' is typing';
 const dots=document.createElement('span');
 dots.className='room10-dots';dots.setAttribute('aria-hidden','true');
 for(let i=0;i<3;i++)dots.appendChild(document.createElement('i'));
 node.setAttribute('role','status');
 node.setAttribute('aria-label',name+' is typing a reply');
 node.append(words,dots);
}
function check(){
 const bubble=$('messages')?.querySelector('.bubble.them.typing');
 if(!bubble||!shown()){
  stopAudio();return;
 }
 decorate(bubble);
 if(!enabled()){stopAudio();return}
 beginAudio(bubble);
}
function init(){
 const messages=$('messages'),trainer=$('trainer');
 if(!messages||!trainer)return;
 const observer=new MutationObserver(check);
 observer.observe(messages,{childList:true});
 const visibilityObserver=new MutationObserver(check);
 visibilityObserver.observe(trainer,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',check);
 window.addEventListener('setter:sound-change',check);
 window.addEventListener('pagehide',stopAudio);
 check();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
