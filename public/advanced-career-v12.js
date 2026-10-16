
(function(){
'use strict';
const A=window.SetterAdvanced;if(!A)return;
const {api,json,esc,$,notice,show,view,section,btn,card,textArea,input,select,aside,action,date}=A;
let portfolio=null,projects=[],pathways=null,outcomes=[],chosenTrack="first90";
async function portfolioPage(){
 await show("Professional Portfolio","Build and manage shareable training evidence.",async()=>{
  const d=await api("/api/advanced/portfolio");portfolio=d.portfolio;
  const evidence=Array.isArray(portfolio?.selected_evidence)?portfolio.selected_evidence:[];
  let html=section("YOUR EVIDENCE / YOUR CONTROL","Professional student profile","Write an accurate introduction and choose what to share. Published portfolios are visible to anyone with the link.");
  html+='<div class="aa-panel">'+input("aaHead","PROFILE HEADLINE","Trainee appointment setter", "text",portfolio?.headline||"")+
   textArea("aaIntro","ABOUT YOUR TRAINING","Explain what you've practised and your strengths.",portfolio?.introduction||"")+
   input("aaEvidenceTitle","PRACTICE EXAMPLE TITLE","Qualification roleplay", "text",evidence[0]?.title||"")+
   textArea("aaEvidenceDesc","WHAT YOU DEMONSTRATED","Accurate, brief and truthful description of the practice task.",evidence[0]?.description||"")+
   '<label class="aa-check"><input id="aaPublish" type="checkbox" '+(portfolio?.published?"checked":"")+'> Allow sharing with people who have my link</label>'+
   '<div class="aa-actions">'+btn("aa-save-portfolio","Save profile")+(portfolio?btn("aa-rotate-portfolio","Reset sharing link"):"")+'</div></div>';
  if(portfolio?.published)html+=aside("Shareable link","Copy or open your student portfolio. Changing the sharing link invalidates the old link.")+
   '<div class="aa-panel">'+input("aaPortfolioLink","PUBLIC PORTFOLIO URL","", "text",location.origin+"/portfolio.html?token="+portfolio.public_token)+btn("aa-copy-portfolio","Copy sharing link")+'</div>';
  html+=aside("Accuracy matters","The portfolio marks student-selected examples as practice, not verified employment or independent accreditation. Human-approved skills must be assessed separately.");
  view("Professional Portfolio","An opt-in employer-facing record of your development.",html,"CAREER / PORTFOLIO");
 });
}
async function projectsPage(){
 await show("Employer Briefs","Complete approved assessment projects.",async()=>{
  const d=await api("/api/advanced/projects");projects=d.projects||[];
  let html=section("REALISTIC CLIENT WORK","Employer assessment briefs","These are supervised training assignments, not real client work or confirmed job placements.");
  html+=projects.length?'<div class="aa-grid">'+projects.map(p=>'<div class="aa-panel"><span class="aa-overline">'+esc(p.employer_name)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.brief)+'</p><p>'+esc(p.requirements)+'</p><div class="aa-tags"><span>'+esc(p.status||"Not submitted")+'</span></div>'+
   (p.mentor_feedback?aside("MENTOR FEEDBACK",p.mentor_feedback):"")+textArea("aaProject_"+p.id,"YOUR SUBMISSION","Explain the work completed, screenshots kept private, or a redacted text response.")+
   btn("aa-submit-project","Submit for review",'data-id="'+esc(p.id)+'"')+'</div>').join("")+'</div>':
   A.empty("No employer briefs published","When your agency partnerships are agreed and approved briefs are added, assignments will appear here.");
  view("Employer Briefs","Human-reviewed simulated projects from approved partners.",html,"CAREER / EMPLOYER BRIEFS");
 });
}
async function pathwaysPage(track=chosenTrack){
 await show("Career Pathways","First 90 Days, international guidance and professional standards.",async()=>{
  const d=await api("/api/advanced/pathways");pathways=d;chosenTrack=track;
  const choices=[{value:"first90",label:"First 90 Days in Your Job"},{value:"uk",label:"UK Training Track"},{value:"us",label:"US Training Track"},{value:"international",label:"International Track"}];
  const completed=(d.progress||[]).filter(p=>p.track===track);
  const items=track==="first90"?d.first90.map(x=>({n:x.step,title:x.title,detail:"Day "+x.day+" checkpoint"})):
   (d.regions[track]?.steps||[]).map((title,i)=>({n:i+1,title,detail:d.regions[track]?.title}));
  let html=section("CAREER DEVELOPMENT","Learn beyond placement","Complete structured checkpoints and record a meaningful reflection.");
  html+='<div class="aa-panel">'+select("aaTrack","CHOOSE YOUR DEVELOPMENT TRACK",choices)+'<div class="aa-steps">'+items.map(item=>{
   const done=completed.some(p=>p.step===item.n);
   return '<div class="aa-step"><span>'+String(item.n).padStart(2,"0")+'</span><div><strong>'+esc(item.title)+'</strong><small>'+esc(item.detail)+' · '+(done?"Reflection saved":"Not completed")+'</small></div>'+
   btn("aa-step-open",done?"Review":"Complete",'data-step="'+item.n+'"')+'</div>';
  }).join("")+'</div></div>';
  html+='<div class="aa-panel"><span class="aa-overline">COMPETENCY FRAMEWORK</span><h3>Employer-relevant standards</h3>'+
   '<div class="aa-standards">'+d.standards.map(s=>'<div><strong>'+esc(s.title)+'</strong><p>'+esc(s.criterion)+'</p></div>').join("")+'</div></div>';
  view("Career Pathways","Build evidence across practical milestones and localised training.",html,"CAREER / DEVELOPMENT");
  if($("aaTrack"))$("aaTrack").value=track;
 });
}
function stepView(step){
 const track=chosenTrack,item=track==="first90"?pathways?.first90?.find(x=>x.step===step):{step,title:pathways?.regions?.[track]?.steps?.[step-1]};
 if(!item)return pathwaysPage();
 const title=item.title,older=(pathways.progress||[]).find(x=>x.track===track&&x.step===step)?.reflection||"";
 let html=section("DEVELOPMENT CHECKPOINT / "+step,title,"Document how you applied this concept. This is self-recorded practice progress, not a professional certificate.");
 html+='<div class="aa-panel">'+textArea("aaStepReflection","YOUR ACTION AND REFLECTION","What did you actually do, learn or improve?",older)+
 btn("aa-step-save","Save checkpoint",'data-step="'+step+'"')+btn("aa-pathways","Back to pathways")+'</div>';
 view(title,"Career development checkpoint",html,"CAREER / CHECKPOINT");
}
async function outcomesPage(){
 await show("Career Outcomes","Record your employment milestones.",async()=>{
  const d=await api("/api/advanced/outcomes");outcomes=d.outcomes||[];
  let html=section("EVIDENCE / VERIFICATION","Placement outcomes","Report a genuine role, and allow the team to review the evidence. Self-reporting is not a verified placement.");
  html+='<div class="aa-panel">'+input("aaEmployer","EMPLOYER","Company or agency")+
  input("aaJobTitle","JOB TITLE","Appointment Setter")+
  input("aaStartDate","START DATE","", "date")+
  '<label class="aa-check"><input type="checkbox" id="aaOutcomeConsent"> I consent to this outcome being shared publicly after team verification</label>'+
  btn("aa-save-outcome","Submit employment outcome")+'</div>';
  html+=outcomes.length?'<div class="aa-grid">'+outcomes.map(x=>'<div class="aa-panel"><span class="aa-overline">'+esc(x.status.replaceAll("_"," "))+'</span><h3>'+esc(x.role_title)+'</h3><p>'+esc(x.company)+'</p><small>'+esc(x.started_on?date(x.started_on):"No start date")+'</small></div>').join("")+'</div>':A.empty("No outcomes recorded","You can report a placement once you've actually accepted a role.");
  html+=aside("No manufactured claims","Results shown as verified require team review. Public reporting is opt-in and uses your consent.");
  view("Career Outcomes","Accountable, consent-based reporting of real employment milestones.",html,"CAREER / OUTCOMES");
 });
}
action("aa-portfolio",portfolioPage);
action("aa-projects",projectsPage);
action("aa-pathways",()=>pathwaysPage());
action("aa-outcomes",outcomesPage);
action("aa-save-portfolio",async()=>{
 const evidence=$("aaEvidenceTitle")?.value.trim()?[{title:$("aaEvidenceTitle").value,description:$("aaEvidenceDesc")?.value||"",kind:"practice"}]:[];
 await api("/api/advanced/portfolio",json({headline:$("aaHead")?.value,introduction:$("aaIntro")?.value,selected_evidence:evidence,published:!!$("aaPublish")?.checked},"PUT"));
 notice("Portfolio updated");return portfolioPage();
});
action("aa-rotate-portfolio",async()=>{
 await api("/api/advanced/portfolio/rotate",json({}));notice("Previous link invalidated");return portfolioPage();
});
action("aa-copy-portfolio",async()=>{
 const link=$("aaPortfolioLink")?.value;if(!link)return;
 if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);else throw Error("Select and copy the link manually");
 notice("Portfolio link copied");
});
action("aa-submit-project",async b=>{
 const id=b.dataset.id,evidence=$("aaProject_"+id)?.value||"";
 await api("/api/advanced/projects/"+id+"/submit",json({evidence}));notice("Submitted for human review");return projectsPage();
});
action("aa-step-open",b=>stepView(+b.dataset.step));
action("aa-pathways",()=>pathwaysPage(chosenTrack));
action("aa-step-save",async b=>{
 await api("/api/advanced/pathways/"+chosenTrack+"/"+b.dataset.step,json({reflection:$("aaStepReflection")?.value||""},"PUT"));
 notice("Checkpoint saved");return pathwaysPage(chosenTrack);
});
action("aa-save-outcome",async()=>{
 await api("/api/advanced/outcomes",json({company:$("aaEmployer")?.value,role_title:$("aaJobTitle")?.value,started_on:$("aaStartDate")?.value||null,published_consent:!!$("aaOutcomeConsent")?.checked}));
 notice("Outcome recorded as self-reported, pending team verification");return outcomesPage();
});
document.addEventListener("change",e=>{if(e.target.id==="aaTrack")pathwaysPage(e.target.value)});
window.showCareerPortfolio=portfolioPage;
window.showCareer90=()=>pathwaysPage("first90");
})();
