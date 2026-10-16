
/* THE SETTER CIRCLE / ADVANCED STUDIO V12 */
(function(){
'use strict';
if(window.SetterAdvanced)return;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);
const actions={};
const api=async(url,opts={})=>{
 if(typeof window.accountFetch!=="function")throw Error("Sign in to continue");
 const r=await window.accountFetch(url,opts),d=await r.json();
 if(!r.ok)throw Error(d.error||"Request failed");return d;
};
const json=(body,method="POST")=>({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const notice=text=>{if(typeof window.toast==="function")window.toast(text);else alert(text)};
const loading=title=>'<div class="aa-empty" role="status"><span class="aa-pulse"></span> Loading '+esc(title)+'…</div>';
const empty=(title,description)=>'<div class="aa-empty"><strong>'+esc(title)+'</strong><p>'+esc(description)+'</p></div>';
const section=(k,t,d)=>'<div class="aa-section"><span>'+esc(k)+'</span><h3>'+esc(t)+'</h3><p>'+esc(d)+'</p></div>';
const btn=(name,label,attrs="")=>'<button type="button" class="aa-btn" data-aa="'+esc(name)+'" '+attrs+'>'+esc(label)+' <span aria-hidden="true">↗</span></button>';
const card=(name,title,desc,kicker="OPEN")=>'<button type="button" data-aa="'+esc(name)+'" class="aa-card"><span>'+esc(kicker)+'</span><strong>'+esc(title)+'</strong><small>'+esc(desc)+'</small><b aria-hidden="true">↗</b></button>';
const textArea=(id,title,placeholder="",value="")=>'<label class="aa-field">'+esc(title)+'<textarea id="'+esc(id)+'" rows="4" placeholder="'+esc(placeholder)+'">'+esc(value)+'</textarea></label>';
const input=(id,title,placeholder="",type="text",value="")=>'<label class="aa-field">'+esc(title)+'<input id="'+esc(id)+'" type="'+esc(type)+'" placeholder="'+esc(placeholder)+'" value="'+esc(value)+'"></label>';
const select=(id,title,options)=>'<label class="aa-field">'+esc(title)+'<select id="'+esc(id)+'">'+options.map(o=>'<option value="'+esc(o.value)+'">'+esc(o.label)+'</option>').join('')+'</select></label>';
const aside=(title,description)=>'<div class="aa-note"><strong>'+esc(title)+'</strong><p>'+esc(description)+'</p></div>';
const date=v=>v?new Date(v).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Not scheduled";
const view=(title,desc,html,kicker="ADVANCED STUDIO")=>{
 if(typeof window.openWorkspace==="function")window.openWorkspace(title,desc,'<div class="aa-root">'+html+'</div>',kicker);
};
const show=async(title,desc,fn)=>{
 view(title,desc,loading(title));
 try{await fn()}catch(e){view(title,desc,empty("Could not load",e.message));notice(e.message)}
};
const action=(k,fn)=>{actions[k]=fn};
document.addEventListener("click",async e=>{
 const b=e.target.closest("[data-aa]");if(!b)return;
 const f=actions[b.dataset.aa];if(typeof f!=="function")return;
 if(b.disabled)return;b.disabled=true;
 try{await f(b)}catch(err){notice(err.message||"Something went wrong")}finally{b.disabled=false}
});
const groups=[
 ["AI TRAINING","Build realistic skills","Continue simulated relationships across messages, email and calls.",
  [["aa-ai","Prospect simulation","Persistent fictional prospects and multiple communication channels."],
   ["aa-offers","Custom offers","Build a client profile and practise a relevant pitch."],
   ["aa-voice","Voice practice","Use your phone microphone where supported for spoken roleplay."]]],
 ["CAREER","Prove capability","Gather evidence and progress beyond your first placement.",
  [["aa-portfolio","Student portfolio","Opt-in shareable training evidence and professional profile."],
   ["aa-projects","Employer briefs","Structured assessments and mentor-reviewed practical work."],
   ["aa-pathways","First 90 days","Job onboarding, competency standards and country-specific training."],
   ["aa-outcomes","Career outcomes","Report placements and request team verification."]]],
 ["COMMUNITY","Train with others","Useful events, practical cohorts and opt-in peer practice.",
  [["aa-workshops","Live workshops","Team-hosted events and RSVPs."],
   ["aa-peers","Peer practice","Start or join a two-person roleplay room."],
   ["aa-cohorts","Group cohorts","Structured shared learning starts."],
   ["aa-challenges","Monthly challenges","Optional, skills-based submissions."]]],
 ["OPERATIONS","Manage development","Reporting, preferences and employer collaboration.",
  [["aa-admin","Admin operations","Outcomes, employer feedback and white-label drafts."],
   ["aa-settings","Preferences","Select regional settings and voice practice preferences."]]]
];
function home(){
 const body=section("THE SETTER CIRCLE / ADVANCED EXPERIENCE","More than a course","Practical training, career evidence and community development in one place.")+
 groups.map((g,i)=>'<section class="aa-group"><div class="aa-group-header"><span>0'+(i+1)+' / '+g[0]+'</span><h3>'+g[1]+'</h3><p>'+g[2]+'</p></div><div class="aa-cards">'+g[3].map((x,j)=>card(x[0],x[1],x[2],String(j+1).padStart(2,"0")+" / "+g[0])).join('')+'</div></section>').join("")+
 aside("What's available immediately?","AI simulations, private offers, personal portfolios, professional pathways and preferences work without partner data. Workshops, verified assessments and employer opportunities appear when the team publishes them. Voice calling is browser-based; it does not dial real phone numbers.");
 view("Advanced Studio","The next stage of training, career development and community.",body,"THE SETTER CIRCLE / STUDIO");
}
window.SetterAdvanced={api,json,esc,$,notice,loading,empty,section,btn,card,textArea,input,select,aside,date,view,show,action,home};
window.showAdvancedStudio=home;
action("aa-home",home);
})();
