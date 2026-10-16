
(function(){
'use strict';
const A=window.SetterAdvanced;if(!A)return;
const {api,json,esc,$,notice,show,view,section,btn,card,input,select,textArea,aside,action,date}=A;
let admin=false,analytics=null,outcomes=[],submissions=[],feedback=[],agencies=[],settings={};
async function checkAdmin(){
 try{await api("/api/advanced/admin/analytics");admin=true}
 catch(e){admin=false}
 return admin;
}
async function adminPage(){
 await show("Studio Operations","Private management and quality controls.",async()=>{
  if(!await checkAdmin()){view("Studio Operations","Administration only",A.empty("Access restricted","Admin access is required."));return}
  const d=await api("/api/advanced/admin/analytics");analytics=d;
  let html=section("OWNER / OPERATIONS","Student success intelligence","Monitor real learning and recruitment data. Figures come from saved student records.");
  const tiles=[["Members",d.members],["Lessons completed",d.lessons_completed],["Simulations",d.simulations],["Mentor pending",d.mentor_pending],["Advanced conversations",d.advanced_threads],["Workshop RSVPs",d.workshop_rsvps]];
  html+='<div class="aa-metrics">'+tiles.map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join("")+'</div>';
  html+='<div class="aa-panel"><h3>Recorded application stages</h3><div class="aa-tags">'+(d.job_stages||[]).map(x=>'<span>'+esc(x.status)+": "+esc(x.n)+'</span>').join("")+'</div><h3>Placement verification</h3><div class="aa-tags">'+(d.outcomes||[]).map(x=>'<span>'+esc(x.status)+": "+esc(x.n)+'</span>').join("")+'</div></div>';
  html+='<div class="aa-grid">'+
  card("aa-admin-workshop","Schedule workshop","Create a mentor-led event and meeting link.")+
  card("aa-admin-cohort","Create cohort","Set a guided group start date.")+
  card("aa-admin-challenge","Publish challenge","Create a monthly task with clear criteria.")+
  card("aa-admin-project","Publish employer brief","Add a practical assessment from an approved partner.")+
  card("aa-admin-outcomes","Verify outcomes","Review self-reported employment records.")+
  card("aa-admin-review","Review student projects","Provide written feedback on submitted briefs.")+
  card("aa-admin-feedback","Employer feedback","Record confirmed hiring-manager observations.")+
  card("aa-admin-agency","Agency workspace drafts","Prepare approved training-branded agency environments.")+'</div>';
  html+=aside("External access","Agency workspaces remain draft-only. Live employer logins, contracts, multi-tenancy and independently verified accreditation still require separate setup.");
  view("Studio Operations","Admin analytics, publishing and verification.",html,"ADMIN / ADVANCED STUDIO");
 });
}
const publisher=(name,category,details,form)=>view(name,category,section("ADMIN / PUBLISH",name,details)+'<div class="aa-panel">'+form+'</div>','ADVANCED STUDIO / ADMIN');
action("aa-admin",adminPage);
action("aa-admin-workshop",()=>publisher("Schedule workshop","Mentorship events","Students can RSVP after you publish the event.",
 input("aaWTitle","TITLE","Live objection clinic")+textArea("aaWDesc","DESCRIPTION","What will members practise?")+
 input("aaWHost","HOST","Setter Circle Mentor")+input("aaWTime","DATE & TIME","","datetime-local")+
 input("aaWLink","SECURE MEETING LINK","https://")+input("aaWDuration","DURATION (MINUTES)","60","number","60")+
 '<label class="aa-check"><input id="aaWPublish" type="checkbox"> Publish to students</label>'+btn("aa-save-workshop","Save workshop")));
action("aa-save-workshop",async()=>{
 await api("/api/advanced/admin/workshops",json({title:$("aaWTitle")?.value,description:$("aaWDesc")?.value,host:$("aaWHost")?.value,starts_at:$("aaWTime")?.value,join_url:$("aaWLink")?.value,duration_minutes:+$("aaWDuration")?.value,published:!!$("aaWPublish")?.checked}));
 notice("Workshop saved");return adminPage();
});
action("aa-admin-cohort",()=>publisher("Create training cohort","Groups","Students can enrol in active cohorts.",
 input("aaCName","COHORT NAME","October Training Cohort")+textArea("aaCDesc","DESCRIPTION","Start date, weekly commitments and expectations")+
 input("aaCTime","START DATE","","datetime-local")+btn("aa-save-cohort","Create cohort")));
action("aa-save-cohort",async()=>{
 await api("/api/advanced/admin/cohorts",json({name:$("aaCName")?.value,description:$("aaCDesc")?.value,starts_at:$("aaCTime")?.value}));
 notice("Cohort created");return adminPage();
});
action("aa-admin-challenge",()=>publisher("Publish monthly challenge","Skill development","Students receive the brief when published.",
 input("aaMMonth","MONTH (YYYY-MM)","2026-11")+input("aaMTitle","CHALLENGE TITLE","Discovery Week")+
 textArea("aaMBrief","BRIEF","A meaningful assignment with clear criteria")+
 textArea("aaMCriteria","ASSESSMENT CRITERIA","Qualify the prospect with relevant, respectful questions")+
 '<label class="aa-check"><input type="checkbox" id="aaMPub"> Publish challenge</label>'+btn("aa-save-challenge","Save challenge")));
action("aa-save-challenge",async()=>{
 await api("/api/advanced/admin/challenges",json({month_key:$("aaMMonth")?.value,title:$("aaMTitle")?.value,briefing:$("aaMBrief")?.value,assessment:$("aaMCriteria")?.value,published:!!$("aaMPub")?.checked}));
 notice("Challenge saved");return adminPage();
});
action("aa-admin-project",()=>publisher("Create employer assessment brief","Agency projects","Use only partner-approved, supervised work. Real outreach must be authorised separately.",
 input("aaPEmp","PARTNER / CLIENT","Agency name")+
 input("aaPTitle","PROJECT TITLE","Qualify a realistic B2B lead")+
 textArea("aaPBrief","DETAILED PRACTICAL BRIEF","Scenario, goals, fictional materials, what to deliver")+
 textArea("aaPReq","REQUIREMENTS","Privacy, response quality and CRM accuracy")+
 '<label class="aa-check"><input type="checkbox" id="aaPPub"> Publish brief</label>'+btn("aa-save-project","Create brief")));
action("aa-save-project",async()=>{
 await api("/api/advanced/admin/projects",json({employer_name:$("aaPEmp")?.value,title:$("aaPTitle")?.value,brief:$("aaPBrief")?.value,requirements:$("aaPReq")?.value,published:!!$("aaPPub")?.checked}));
 notice("Employer brief saved");return adminPage();
});
async function renderOutcomeQueue(){
 await show("Outcome Verification","Review employment claims before publishing verified statistics.",async()=>{
  const d=await api("/api/advanced/admin/outcomes");outcomes=d.outcomes||[];
  let html=section("QUALITY / EVIDENCE","Reported career outcomes","Approve only after checking convincing independent evidence and consent.");
  html+='<div class="aa-grid">'+outcomes.map(x=>'<div class="aa-panel"><span class="aa-overline">'+esc(x.student_name)+' · '+esc(x.status)+'</span><h3>'+esc(x.role_title)+'</h3><p>'+esc(x.company)+'</p><p>Public consent: '+(x.published_consent?"Yes":"No")+'</p>'+
   textArea("aaVerification_"+x.id,"VERIFICATION NOTE","Record the evidence checked and the basis for your decision.")+
   '<div class="aa-actions">'+btn("aa-verify-outcome","Verified",'data-id="'+esc(x.id)+'"')+btn("aa-reject-outcome","Reject",'data-id="'+esc(x.id)+'"')+'</div></div>').join("")+'</div>';
  view("Outcome Verification","Accountable human verification.",html,"ADMIN / VERIFICATION");
 });
}
action("aa-admin-outcomes",renderOutcomeQueue);
action("aa-verify-outcome",async b=>{await api("/api/advanced/admin/outcomes/"+b.dataset.id,json({status:"verified",verification_note:$("aaVerification_"+b.dataset.id)?.value||""},"PATCH"));notice("Verified");return renderOutcomeQueue()});
action("aa-reject-outcome",async b=>{await api("/api/advanced/admin/outcomes/"+b.dataset.id,json({status:"rejected",verification_note:$("aaVerification_"+b.dataset.id)?.value||""},"PATCH"));notice("Rejected");return renderOutcomeQueue()});
action("aa-admin-review",async()=>{
 await show("Employer Assessment Reviews","Human review of practical assignments.",async()=>{
  const d=await api("/api/advanced/admin/projects/reviews");submissions=d.reviews||[];
  let html=section("MENTOR / REVIEW","Pending submissions","Review evidence and provide meaningful written corrections.");
  html+='<div class="aa-grid">'+submissions.map(x=>'<div class="aa-panel"><span class="aa-overline">'+esc(x.student_name)+' · '+esc(x.status)+'</span><h3>'+esc(x.project_title)+'</h3><p>'+esc(x.evidence)+'</p>'+
   textArea("aaRev_"+x.id,"MENTOR FEEDBACK","What did the student demonstrate and what should change?",x.mentor_feedback||"")+
   '<div class="aa-actions">'+btn("aa-review-approve","Approve",'data-id="'+esc(x.id)+'"')+btn("aa-review-revise","Request changes",'data-id="'+esc(x.id)+'"')+'</div></div>').join("")+'</div>';
  view("Employer Assessment Reviews","Human-reviewed work experience preparation.",html,"ADMIN / PROJECTS");
 });
});
action("aa-review-approve",b=>saveReview(b,"approved"));
action("aa-review-revise",b=>saveReview(b,"needs_changes"));
async function saveReview(b,status){
 await api("/api/advanced/admin/projects/reviews/"+b.dataset.id,json({status,feedback:$("aaRev_"+b.dataset.id)?.value||""},"PATCH"));
 notice("Review saved");return adminPage();
}
action("aa-admin-feedback",()=>publisher("Employer feedback","Employer signals","Record observations with the source identified. Entries start unverified.",
 input("aaFEmployer","EMPLOYER","Agency")+
 input("aaFSkill","SKILL AREA","Qualification")+
 textArea("aaFNote","EMPLOYER OBSERVATION","Specific, grounded information from a conversation with the agency.")+
 btn("aa-save-feedback","Record observation")));
action("aa-save-feedback",async()=>{
 await api("/api/advanced/admin/employer-feedback",json({employer:$("aaFEmployer")?.value,skill:$("aaFSkill")?.value,observation:$("aaFNote")?.value}));
 notice("Observation recorded (unverified)");return adminPage();
});
action("aa-admin-agency",async()=>{
 await show("Agency Workspaces","Prepare approved white-label environments.",async()=>{
  const d=await api("/api/advanced/admin/agencies");agencies=d.agencies||[];
  let html=section("AGENCY / PARTNERSHIPS","Workspace drafts","Capture agency information and brand preferences. These drafts do not grant agency access.");
  html+='<div class="aa-panel">'+input("aaAName","AGENCY NAME","Partner agency")+
  textArea("aaADesc","PROGRAMME NOTES","Training focus, agreed access and scope")+
  input("aaAColor","BRAND COLOUR","#D0F83B","text","#D0F83B")+btn("aa-save-agency","Save agency draft")+'</div>';
  html+='<div class="aa-grid">'+agencies.map(x=>'<div class="aa-panel"><span class="aa-overline">DRAFT ONLY</span><h3>'+esc(x.agency_name)+'</h3><p>'+esc(x.description)+'</p></div>').join("")+'</div>';
  view("Agency Workspaces","Partner preparation; live access requires a separate agreement.",html,"ADMIN / AGENCIES");
 });
});
action("aa-save-agency",async()=>{
 await api("/api/advanced/admin/agencies",json({agency_name:$("aaAName")?.value,description:$("aaADesc")?.value,brand_color:$("aaAColor")?.value}));
 notice("Agency draft saved");return adminPage();
});
action("aa-settings",async()=>{
 await show("Studio Preferences","Adjust regional learning and voice practice.",async()=>{
  const d=await api("/api/advanced/settings");settings=d.settings||{};
  let html=section("MEMBER / SETTINGS","Your preferences","Choose the region and whether browser voice practice is enabled. Notification delivery requires separate setup.");
  html+='<div class="aa-panel">'+select("aaLocale","REGIONAL TRAINING",[{value:"en-GB",label:"United Kingdom"},{value:"en-US",label:"United States"},{value:"en-IE",label:"Ireland"},{value:"en-AU",label:"Australia"}])+
  '<label class="aa-check"><input type="checkbox" id="aaVoice" '+(settings.voice_enabled?"checked":"")+'> Enable microphone practice</label>'+
  '<label class="aa-check"><input type="checkbox" id="aaReminders" '+(settings.reminders?"checked":"")+'> Save my preference for optional reminders</label>'+
  aside("Notification availability","Saving a reminder preference does not enable push notifications. Those require a supported push delivery service.")+
  btn("aa-save-settings","Save preferences")+'</div>';
  view("Studio Preferences","Choose regional training and accessible features.",html,"STUDIO / SETTINGS");
  if($("aaLocale"))$("aaLocale").value=settings.locale||"en-GB";
 });
});
action("aa-save-settings",async()=>{
 await api("/api/advanced/settings",json({locale:$("aaLocale")?.value,voice_enabled:!!$("aaVoice")?.checked,reminders:!!$("aaReminders")?.checked},"PUT"));
 notice("Preferences saved");return A.home();
});
})();
