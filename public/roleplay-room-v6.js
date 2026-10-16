
/* Roleplay Room V6 – pure presentation enhancements.
   Existing prospect generation, AI conversation and scoring functions are untouched. */
(function(){
'use strict';
if(window.__setterRoomV6)return;
window.__setterRoomV6=true;

const $=id=>document.getElementById(id);
function setupBriefingLayout(){
 const box=document.querySelector('#briefing .briefbox');
 if(!box||box.querySelector('.room-brief-scroll'))return;
 const actions=box.querySelector('.briefactions');
 if(!actions)return;
 const scroll=document.createElement('div');
 scroll.className='room-brief-scroll';
 for(const selector of ['.briefhead','.missionbox','.briefgrid','.profilepeek']){
  const part=box.querySelector(selector);
  if(part)scroll.appendChild(part);
 }
 box.insertBefore(scroll,actions);
}
function insertRole(labelNode,id,where){
 if(!labelNode||$(id))return null;
 const meta=document.createElement('div');
 meta.id=id;meta.className=where;
 meta.setAttribute('aria-live','polite');
 labelNode.insertAdjacentElement('afterend',meta);
 return meta;
}
function splitName(text){
 const parts=String(text||'').split(/\s+·\s+/).map(x=>x.trim()).filter(Boolean);
 if(parts.length<2)return null;
 return {name:parts[0],role:parts.slice(1).join(' · ')};
}
function attachNameDisplay(id,metaId,metaClass){
 const heading=$(id);
 if(!heading)return;
 const meta=insertRole(heading,metaId,metaClass);
 if(!meta)return;
 let editing=false;
 function sync(){
  if(editing)return;
  const label=String(heading.textContent||'');
  const parsed=splitName(label);
  if(!parsed){
   if(/generating|loading/i.test(label)){
    meta.textContent='';
    if(id==='bName'){
     const h=$('briefProfileHandle'),bio=$('briefProfileBio'),avatar=$('briefProfileAvatar');
     if(h)h.textContent='Profile';
     if(bio)bio.textContent='Loading public details…';
     if(avatar){avatar.textContent='·';avatar.style.background='';}
    }
   }
   return;
  }
  editing=true;
  heading.textContent=parsed.name;
  meta.textContent=parsed.role;
  editing=false;
  if(id==='bName'){
   const profileAvatar=$('briefProfileAvatar');
   const handle=$('briefProfileHandle');
   const bio=$('briefProfileBio');
   if(profileAvatar&&handle&&(handle.textContent==='Profile'||handle.textContent.trim()==='')){
    profileAvatar.textContent=parsed.name.slice(0,1).toUpperCase();
    handle.textContent=parsed.name;
    if(bio)bio.textContent=parsed.role;
   }
  }
 }
 new MutationObserver(sync).observe(heading,{childList:true,characterData:true,subtree:true});
 sync();
}
function makeBriefToggle(){
 const head=document.querySelector('#trainer .chathead');
 const context=$('pContext')?.closest('.profilecard')||document.querySelector('#trainer .profilecard');
 if(!head||!context||head.querySelector('.room-brief-toggle'))return;
 const button=document.createElement('button');
 button.type='button';button.className='room-brief-toggle';
 button.textContent='Brief';button.setAttribute('aria-label','Show conversation briefing');
 button.setAttribute('aria-controls','roomChatContext');button.setAttribute('aria-expanded','false');
 context.id='roomChatContext';
 const profileButton=head.querySelector('button[onclick*="openProspectProfile"]');
 if(profileButton)head.insertBefore(button,profileButton);else head.appendChild(button);
 button.addEventListener('click',()=>{
  const open=!context.classList.contains('room-open');
  context.classList.toggle('room-open',open);
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',open?'Hide conversation briefing':'Show conversation briefing');
  button.textContent=open?'Hide brief':'Brief';
 });
}
function setLabels(){
 const guide=$('guideMode'),difficulty=$('mobileDifficulty');
 if(guide)guide.setAttribute('aria-label','AI guidance mode');
 if(difficulty)difficulty.setAttribute('aria-label','Simulation difficulty, changes apply to the next prospect');
 const status=document.querySelector('#trainer .chathead .active');
 if(status)status.textContent='● Simulated prospect';
 const input=$('input'),send=document.querySelector('#trainer .composer .send');
 if(input)input.setAttribute('aria-label','Your message to the simulated prospect');
 if(send){send.setAttribute('aria-label','Send message');send.setAttribute('title','Send message');}
 const back=document.querySelector('#trainer .trainnav button[onclick*="closeTrainer"]');
 if(back){back.textContent='← Exit practice';back.setAttribute('aria-label','Exit roleplay and return to your platform');}
 const start=$('briefEnter');if(start)start.setAttribute('aria-label','Enter conversation with simulated prospect');
 const exit=$('briefExit');if(exit)exit.setAttribute('aria-label','Leave roleplay');
}
// Some training flows can invoke the briefing before a full page render.
function init(){
 setupBriefingLayout();
 attachNameDisplay('bName','bRole','room-brief-role');
 attachNameDisplay('tName','tRole','chat-person-role');
 makeBriefToggle();
 setLabels();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
