/* Setter Circle v17 — discovery, navigation and restrained motion. No account or score mutations. */
(function(){
 'use strict';
 if(window.__setterCircleV17)return;
 window.__setterCircleV17=true;
 const $=id=>document.getElementById(id);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const examples={
  discovery:{person:'Alex · Business owner',avatar:'A',messages:["We've got enquiries coming in. Following up quickly is the hard part.","Where do you notice people dropping off — before the first reply or after you've spoken?","Usually after that first chat. We get busy and the conversation goes cold."],coach:'Find the gap before offering a solution. A specific question gives you something useful to work with.'},
  objections:{person:'Sophie · Consultant',avatar:'S',messages:["I've worked with a setter before. Honestly, it wasn't a great experience.","That makes sense. What let you down most — the conversations themselves or the quality of the calls?","The calls. People turned up with no idea what we actually offered."],coach:'Acknowledge the concern and understand what caused it. Good qualification matters more than filling a calendar.'},
  networking:{person:'Jordan · Appointment setter',avatar:'J',messages:["Your message caught my eye. Are you working in setting already?","I'm building my skills. Your post about follow-ups was useful — what helped you get more consistent?","Keeping a simple daily list. I used to lose track of anyone who didn't reply straight away."],coach:'Build a connection around something specific. A useful conversation creates a reason to stay in touch.'}
 };
 let exampleKey='discovery',timers=[];
 function cancelSequence(){timers.forEach(clearTimeout);timers=[];document.querySelectorAll('.sc17-waiting').forEach(el=>{el.classList.remove('sc17-waiting');el.removeAttribute('aria-hidden')});}
 function showExample(key,animate){
  const data=examples[key],root=$('sc17Conversation');if(!data||!root)return;
  cancelSequence();exampleKey=key;
  $('sc17Person').textContent=data.person;$('sc17Avatar').textContent=data.avatar;$('sc17Coach').textContent=data.coach;
  $('sc17Example').setAttribute('aria-labelledby','sc17Tab-'+key);
  document.querySelectorAll('[data-example]').forEach(b=>{const active=b.dataset.example===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
  root.replaceChildren();
  data.messages.forEach((text,index)=>{
   const bubble=document.createElement('div');bubble.className='sc17-message'+(index===1?' is-you':'');
   if(index===1){const label=document.createElement('small');label.textContent='YOUR APPROACH';bubble.append(label)}
   bubble.append(document.createTextNode(text));root.append(bubble);
   if(animate&&!reduced.matches){
    bubble.classList.add('sc17-waiting');bubble.setAttribute('aria-hidden','true');
    timers.push(setTimeout(()=>{
     bubble.classList.remove('sc17-waiting');bubble.classList.add('sc17-enter');bubble.removeAttribute('aria-hidden');
     if(!document.hidden&&!$('site')?.classList.contains('hidden')&&bubble.getBoundingClientRect().bottom>0&&bubble.getBoundingClientRect().top<window.innerHeight)window.setterCirclePlaySound?.();
    },index*640+70));
   }
  });
 }
 function initExample(){
  if(!$('sc17Example'))return;
  document.querySelectorAll('[data-example]').forEach(b=>{
   b.addEventListener('click',()=>showExample(b.dataset.example,true));
   b.addEventListener('keydown',e=>{
    const keys=Object.keys(examples);let index=keys.indexOf(b.dataset.example);
    if(e.key==='ArrowRight')index=(index+1)%keys.length;
    else if(e.key==='ArrowLeft')index=(index+keys.length-1)%keys.length;
    else if(e.key==='Home')index=0;else if(e.key==='End')index=keys.length-1;else return;
    e.preventDefault();showExample(keys[index],false);$('sc17Tab-'+keys[index]).focus();
   });
  });
  $('sc17Replay')?.addEventListener('click',()=>showExample(exampleKey,true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSequence()});
  reduced.addEventListener?.('change',()=>{if(reduced.matches)cancelSequence()});
 }
 function initNavigation(){
  const toggle=document.querySelector('.sc17-menu-toggle'),links=$('sc17NavLinks');
  if(!toggle||!links)return;
  const close=()=>{links.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation')};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';links.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
  links.addEventListener('click',e=>{if(e.target.closest('a'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&links.classList.contains('is-open')){close();toggle.focus()}});
  document.addEventListener('click',e=>{if(!e.target.closest('.sc17-nav'))close()});
 }
 function initReveals(){
  if(reduced.matches||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('sc17-revealed');observer.unobserve(entry.target)}}),{threshold:.08});
  document.querySelectorAll('[data-sc17-reveal]').forEach(el=>observer.observe(el));
 }
 function initExperience(){
  const menu=$('experienceMenu');if(!menu)return;
  menu.querySelector('.eyebrow').textContent='THE CIRCLE / BEFORE YOU JOIN';
  menu.querySelector('h2').innerHTML='A new skill.<br>A place to start.';
  menu.querySelector('p').textContent='Get a feel for the practice, the programme and the people. Choose a space below and take a closer look.';
  const topics={
   demo:['START HERE / INTERACTIVE PREVIEW','Try your first conversation.','Meet a fictional prospect, try your approach and see the feedback.'],
   roadmap:['THE JOURNEY','What to expect','See how the lessons, practice and personal support fit together.'],
   training:['THE FOUNDATIONS','Inside the training','Learn how to open, qualify and move conversations forward.'],
   workplace:['REALISTIC PRACTICE','The virtual workplace','Explore simulated shifts, CRM tasks, bookings and reporting.'],
   programme:['DAILY ACTION','The 40-day programme','Build a routine with clear tasks and practical work.'],
   founders:['YOUR MENTORS','Meet Dylon & Amar','Get to know the people supporting your next chapter.'],
   stories:['STUDENT EXPERIENCES','In their own words','Read about students and their individual journeys.'],
   faq:['GOOD TO KNOW','Your questions, answered','Experience, support, expectations and how it all works.'],
   enquiry:['LET’S TALK','Find out if it’s for you.','Ask a question or speak with us about joining the Circle.']
  };
  menu.querySelectorAll('[data-open-section]').forEach((card,index)=>{
   const data=topics[card.dataset.openSection];if(!data)return;
   const meta=document.createElement('div');meta.className='sc17-topic-meta';
   const label=document.createElement('span'),number=document.createElement('span');label.textContent=data[0];number.textContent=String(index+1).padStart(2,'0');meta.append(label,number);card.prepend(meta);
   card.querySelector('strong').textContent=data[1];
   [...card.children].find(el=>el.tagName==='SPAN'&&!el.classList.contains('arrow')).textContent=data[2];
   card.querySelector('.arrow').textContent=card.dataset.openSection==='demo'?'Try the demo ↗':'Take a look ↗';
  });
  const cta=document.createElement('div');cta.className='sc17-topic-cta';cta.innerHTML='<span>Explore at your own pace. Start wherever feels right.</span><a href="/?platform=1">Already a member? Sign in ↗</a>';menu.querySelector('.wrap').append(cta);
  const nav=document.querySelector('.navlinks');if(nav){const home=document.createElement('a');home.className='sc17-public-home';home.href='/';home.textContent='← Back to home';nav.prepend(home)}
  // A topic behaves as a page: move keyboard focus to its heading, and return it to the selected tile.
  let previousTopic=location.hash.slice(1);
  window.addEventListener('hashchange',()=>{
   const key=location.hash.slice(1);
   requestAnimationFrame(()=>{
    if(topics[key]){const heading=document.querySelector('.experience-panel.is-active h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}previousTopic=key}
    else if(!key&&previousTopic){menu.querySelector('[data-open-section="'+previousTopic+'"]')?.focus({preventScroll:true})}
   });
  });
  $('backToExperience')?.addEventListener('click',()=>{if(previousTopic)requestAnimationFrame(()=>menu.querySelector('[data-open-section="'+previousTopic+'"]')?.focus({preventScroll:true}))});
 }
 const destinations=[
  ['Dashboard','Your next steps and recent progress','home overview today',()=>window.memberGo?.('dashboard')],
  ['Academy','Lessons and learning materials','course skool learn training',()=>window.showAcademy?.()],
  ['40-Day Programme','Your daily tasks and action plan','roadmap days plan outreach',()=>window.showProgramme?.()],
  ['Roleplay Lab','Start, resume or replay a conversation','ai practise practice simulation prospect',()=>window.showPracticeStudio?.()],
  ['Virtual Workplace','Simulated shifts, CRM and bookings','pipeline leads booking job work',()=>window.memberOpenWorkplace?.()],
  ['Interview practice','Prepare for hiring conversations','mock questions interview',()=>window.startInterview?.()],
  ['Performance Lab','Review your skills and training trends','scores progress stats statistics',()=>window.showPerformanceLab?.()],
  ['Mentor feedback','Submit work and review your feedback','amar dylon support help review coaching',()=>window.showMentorDesk?.()],
  ['Career Studio','Your profile, evidence and next steps','portfolio readiness career',()=>window.showCareerStudio?.()],
  ['Job opportunities','Browse available roles and applications','jobs role apply hiring',()=>window.showOpportunities?.()],
  ['Community','Workshops, events and peer practice','students group events peers',()=>window.showCommunityStudio?.()],
  ['Resources','Playbooks and useful references','scripts templates guides materials',()=>window.showResources?.()]
 ];
 function initSearch(){
  const nav=$('memberAppNav');if(!nav)return;
  let dialog,previousFocus;
  const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  function renderResults(){
   const query=$('sc17SearchInput').value.trim().toLowerCase();const results=$('sc17SearchResults');results.replaceChildren();
   const matches=destinations.filter(d=>query.split(/\s+/).every(term=>(d[0]+' '+d[1]+' '+d[2]).toLowerCase().includes(term)));
   matches.forEach(d=>{const button=document.createElement('button');button.type='button';const copy=document.createElement('span'),name=document.createElement('strong'),description=document.createElement('small'),arrow=document.createElement('span');name.textContent=d[0];description.textContent=d[1];arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');copy.append(name,description);button.append(copy,arrow);button.addEventListener('click',()=>{dialog.close();d[3]()});results.append(button)});
   if(!matches.length){const empty=document.createElement('p');empty.className='sc17-command-empty';empty.textContent='No tools found. Try “practice”, “programme”, “mentor” or “jobs”.';results.append(empty)}
   $('sc17SearchStatus').textContent=matches.length+' '+(matches.length===1?'tool':'tools')+' found';
  }
  function openSearch(){
   if(!document.body.classList.contains('member-shell-active'))return;
   previousFocus=document.activeElement;
   if(!dialog){
    dialog=document.createElement('dialog');dialog.id='sc17Search';dialog.className='sc17-command';dialog.setAttribute('aria-labelledby','sc17SearchTitle');
    dialog.innerHTML='<div class="sc17-command-head"><h2 id="sc17SearchTitle">Where do you want to go?</h2><button type="button" class="sc17-command-close" aria-label="Close tool search">Esc</button></div><label class="sc17-sr-only" for="sc17SearchInput">Search member tools</label><input id="sc17SearchInput" type="search" placeholder="Search lessons, practice, mentoring…" autocomplete="off"><div class="sc17-command-results" id="sc17SearchResults"></div><div class="sc17-command-hint"><span id="sc17SearchStatus" role="status" aria-live="polite"></span> · ↑ ↓ to browse · Enter to open</div>';
    document.body.append(dialog);
    dialog.querySelector('.sc17-command-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
    dialog.addEventListener('close',()=>{if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})});
    $('sc17SearchInput').addEventListener('input',renderResults);
    dialog.addEventListener('keydown',e=>{
     const buttons=[...$('sc17SearchResults').querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
     if(e.key==='ArrowDown'&&buttons.length){e.preventDefault();buttons[(index+1)%buttons.length].focus()}
     else if(e.key==='ArrowUp'&&buttons.length){e.preventDefault();if(index<=0)$('sc17SearchInput').focus();else buttons[index-1].focus()}
     else if(e.key==='Enter'&&document.activeElement===$('sc17SearchInput')&&buttons.length){e.preventDefault();buttons[0].click()}
    });
   }
   if(dialog.open)return;
   $('sc17SearchInput').value='';renderResults();dialog.showModal();$('sc17SearchInput').focus();
  }
  const makeButton=extra=>{const button=document.createElement('button');button.type='button';button.className='sc17-find '+(extra||'');button.innerHTML=searchIcon+'<span>Find a tool</span><kbd>⌘ / Ctrl K</kbd>';button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',openSearch);return button};
  nav.querySelector('.member-nav-brand')?.after(makeButton());
  nav.querySelector('.member-nav-more-panel')?.prepend(makeButton());
  const header=document.querySelector('#workspace .workhead');if(header)header.append(makeButton('sc17-work-find'));
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&document.body.classList.contains('member-shell-active')&&!document.querySelector('dialog[open]')){e.preventDefault();openSearch()}});
 }
 function init(){initExample();initNavigation();initReveals();initExperience();initSearch()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
