
/* Setter Circle Studio v11 — learning, mentoring, opportunity and analytics views.
   Progressive layer on the existing authenticated account and navigation APIs.
   User-provided text is escaped before insertion into generated views. */
(function(){
'use strict';
if(window.__setterStudioV11)return;
window.__setterStudioV11=true;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const api=async(path,options={})=>{const r=await window.accountFetch(path,options);const json=await r.json();if(!r.ok)throw new Error(json.error||'Request failed');return json};
const notice=(message)=>{if(typeof window.toast==='function')window.toast(message);else alert(message)};
const fmtDate=x=>x?new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const dateDay=x=>String(x||'').slice(0,10);
const loading=(heading)=>'<div class="studio-loading" role="status"><span class="studio-loading-dot"></span> Loading '+esc(heading)+'…</div>';
const empty=(heading,detail)=>'<div class="studio-empty"><span class="studio-empty-mark">SC /</span><h3>'+esc(heading)+'</h3><p>'+esc(detail)+'</p></div>';
const action=(key,label,attrs='')=>'<button type="button" class="studio-button" data-studio="'+esc(key)+'" '+attrs+'>'+esc(label)+' <span aria-hidden="true">↗</span></button>';
const box=(k,v)=>'<div class="studio-metric"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>';
const call=(title,subtitle,content,kicker)=>window.openWorkspace(title,subtitle,content,kicker||'THE SETTER CIRCLE / STUDENT STUDIO');
const modules=['Appointment Setting Foundations','Understanding the Setter Role','Outreach That Starts Conversations','Building Rapport','Discovery & Better Questions','Qualification','Objection Handling','Positioning the Offer','Booking the Call','Loom & Video Outreach','Performing in Your First Role'];
let lessons=[],days=[],dayNo=1,opportunities=[],applications=[],jobFilter='all';
let jobFeedInfo={},jobSearch='',jobKind='all',jobWork='all',jobPay='all',jobLimit=40,jobTimer;
let weekly=[],mentor=[],adminTasks=[],adminAssessments=[];
let admin=false,adminChecked=false,overviewBusy=false;
function layout(top,inside){
 return '<div class="studio-v11">'+top+inside+'</div>';
}
function heading(eyebrow,title,description){
 return '<div class="studio-section-heading"><span>'+esc(eyebrow)+'</span><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p></div>';
}
async function academy(){
 call('Training library','Your lessons, notes and progress — organised across 11 modules.',loading('Academy'),'ACADEMY / CURRICULUM');
 try{
  const d=await api('/api/academy/lessons');lessons=d.lessons||[];
  const done=lessons.filter(x=>x.completed).length;
  const top=heading('PERSONAL LEARNING PATH','Learn with purpose','Select a module to view lessons, practical resources and completion status.')+
   '<div class="studio-mini-metrics">'+box('PUBLISHED LESSONS',lessons.length)+box('COMPLETE',done)+box('MODULES','11')+'</div>';
  const content='<div class="studio-module-grid">'+modules.map((m,i)=>{
   const list=lessons.filter(l=>l.module_number===i+1),complete=list.filter(x=>x.completed).length;
   return '<button type="button" class="studio-module" data-studio="module" data-number="'+(i+1)+'">'+
     '<span class="studio-module-no">'+String(i+1).padStart(2,'0')+' / 11</span>'+
     '<strong>'+esc(m)+'</strong><small>'+(list.length?complete+' of '+list.length+' lessons complete':'Lessons being prepared')+'</small>'+
     '<span class="studio-link">'+(list.length?'Explore module':'View module')+' ↗</span></button>'
  }).join('')+'</div>';
  call('Training library','Your lessons, notes and progress — organised across 11 modules.',layout(top,content),'ACADEMY / CURRICULUM');
 }catch(e){notice(e.message)}
}
function moduleView(n){
 if(!n||n<1||n>11)return academy();
 const mine=lessons.filter(l=>l.module_number===n);
 let title=modules[n-1],content='';
 content+=heading('MODULE '+String(n).padStart(2,'0')+' / 11',title,'Complete the lessons in order, take notes and practise what you learn.');
 content+='<div class="studio-toolbar">'+action('academy','← All modules')+'<span>'+mine.filter(x=>x.completed).length+' / '+mine.length+' lessons complete</span></div>';
 content+=mine.length?'<div class="studio-list">'+mine.map((x,i)=>
  '<button class="studio-list-row" type="button" data-studio="lesson" data-id="'+esc(x.id)+'"><span class="studio-list-index">'+String(i+1).padStart(2,'0')+'</span>'+
  '<span class="studio-list-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.description||'Watch the lesson and apply the training.')+'</small></span>'+
  '<span class="studio-list-state">'+(x.completed?'Completed ✓':x.duration_min?x.duration_min+' min →':'Open →')+'</span></button>'
 ).join('')+'</div>':empty('Lessons are being prepared','The module is in your curriculum. Recorded lessons will appear here when they are published.');
 if(!mine.length)content+='<div class="studio-toolbar">'+action('academy','Back to modules')+'</div>';
 call(title,'Module '+n+' of 11',layout('',content),'ACADEMY / MODULE '+n);
}
function embedUrl(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:')return '';
  if(['youtu.be','www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)){
   const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');
   return /^[A-Za-z0-9_-]{11}$/.test(id||'')?'https://www.youtube-nocookie.com/embed/'+id:'';
  }
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)){
   const id=u.pathname.match(/(\d+)/)?.[1];
   return id?'https://player.vimeo.com/video/'+id:'';
  }
 }catch(e){}
 return '';
}
function lessonView(id){
 const l=lessons.find(x=>x.id===id);if(!l)return academy();
 const u=l.video_url&&/^https:\/\//.test(l.video_url)?l.video_url:null;
 const resource=l.resource_url&&/^https:\/\//.test(l.resource_url)?l.resource_url:null;
 const embed=u?embedUrl(u):'';
 let c=heading('LESSON / MODULE '+String(l.module_number).padStart(2,'0'),l.title,l.description||'Watch, take notes and practise.');
 if(embed)c+='<div class="studio-video"><iframe loading="lazy" src="'+esc(embed)+'" title="'+esc(l.title)+'" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
 else if(u)c+='<div class="studio-video-placeholder"><p>This lesson opens in a separate video player.</p><a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Open lesson video ↗</a></div>';
 else c+=empty('Video coming soon','The team has published this lesson without a video. Review the notes and linked resources.');
 if(resource)c+='<p class="studio-resource"><a href="'+esc(resource)+'" target="_blank" rel="noopener noreferrer">Open lesson resources ↗</a></p>';
 c+='<div class="studio-note"><strong>Apply what you learned</strong><p>Take one useful idea from this lesson into your next simulation or real outreach block.</p></div>';
 c+='<div id="studioLessonCheck" data-lesson-id="'+esc(l.id)+'"></div>';
 c+='<div class="studio-toolbar">'+action('module','← Back to module','data-number="'+l.module_number+'"');
 if(!l.completed)c+='<label class="studio-confirm"><input id="studioWatched" type="checkbox"> I have reviewed this lesson</label>'+action('complete-lesson','Mark lesson complete','data-id="'+esc(l.id)+'"');
 else c+='<span class="studio-completed">Completed ✓</span>';
 c+='</div>';
 call(l.title,'Module '+l.module_number+' · '+(l.duration_min?l.duration_min+' minute lesson':'Training lesson'),layout('',c),'ACADEMY / LESSON');
 loadLessonCheck(l.id);
}

async function loadLessonCheck(id){
 const area=$('studioLessonCheck');
 if(!area||area.dataset.lessonId!==id)return;
 area.innerHTML='<div class="studio-loading"><span class="studio-loading-dot"></span> Checking learning assessment…</div>';
 try{
  const d=await api('/api/academy/lessons/'+id+'/check');
  if(!area.isConnected||area.dataset.lessonId!==id)return;
  if(!d.check){area.innerHTML='<div class="studio-note"><strong>Practice task</strong><p>Apply this lesson in a roleplay. A formal knowledge check has not been published for this lesson.</p></div>';return}
  const c=d.check;
  area.innerHTML='<section class="studio-main-card studio-lesson-check">'+
   '<span class="studio-overline">LESSON UNDERSTANDING · '+(d.passed?'PASSED':'PRACTICE CHECK')+'</span>'+
   '<h3>'+esc(c.question)+'</h3>'+
   (d.passed?'<p class="studio-completed">Knowledge check passed ✓</p>':
   '<div class="studio-check-options">'+c.options.map((x,i)=>'<label class="studio-check-answer"><input type="radio" name="studioCheckAnswer" value="'+i+'"><span>'+esc(x)+'</span></label>').join('')+'</div>'+
   '<div class="studio-toolbar">'+action('submit-check','Check my answer','data-id="'+esc(id)+'"')+'</div>')+
   '<div id="studioCheckFeedback" role="status" aria-live="polite"></div></section>';
 }catch(err){if(area.isConnected)area.innerHTML='<p class="studio-help">Knowledge check could not be loaded. '+esc(err.message)+'</p>'}
}
async function programme(){
 call('40-Day Programme','Structured assignments, proof of work and mentor review.',loading('Programme'),'ACADEMY / 40 DAYS');
 try{const d=await api('/api/programme');days=d.days||[];const next=days.find(x=>!x.completed);dayNo=next?.day||40;renderProgramme()}catch(e){notice(e.message)}
}
function renderProgramme(){
 const d=days.find(x=>x.day===dayNo);
 if(!d)return;
 const completed=days.filter(x=>x.completed).length,week=Math.ceil(dayNo/7);
 let c=heading('YOUR ACTION ROADMAP','Day '+dayNo+' of 40','Daily execution matters more than ticking boxes. Capture useful proof of your work.');
 c+='<div class="studio-mini-metrics">'+box('COMPLETE',completed+' / 40')+box('CURRENT WEEK',week)+box('DAY STATUS',d.completed?'Done':'To do')+'</div>';
 c+='<div class="studio-weekstrip">'+[1,2,3,4,5,6].map(w=>'<button type="button" data-studio="programme-day" data-number="'+Math.min(40,(w-1)*7+1)+'" class="'+(w===week?'active':'')+'">W'+w+'</button>').join('')+'</div>';
 c+='<div class="studio-main-card"><span class="studio-overline">DAY '+String(dayNo).padStart(2,'0')+' · PRACTICAL ASSIGNMENT</span><h3>'+esc(d.task)+'</h3>'+
 '<p>Complete the activity, then record what you did and what you learned. A submitted note is not automatically mentor-approved.</p>'+
 '<label class="studio-field-label" for="studioProof">YOUR EVIDENCE / REFLECTION</label>'+
 '<textarea id="studioProof" rows="5" placeholder="Record activity completed, outcomes, difficulties and what you will improve.">'+esc(d.proof_note||'')+'</textarea>'+
 '<div class="studio-toolbar">'+action('programme-prev','← Previous')+action('programme-save',d.completed?'Update evidence':'Save and complete day')+action('programme-next','Next →')+'</div>'+
 '<div class="studio-toolbar">'+action('programme-submit','Submit evidence for mentor review')+'</div></div>';
 call('40-Day Programme','Your personalised daily execution roadmap.',layout('',c),'ACADEMY / DAILY ACTION');
}
async function weeklyReview(){
 call('Weekly Review','Track outreach, reflection and improvement across weeks.',loading('reviews'),'PROGRESS / WEEKLY REVIEW');
 try{const d=await api('/api/weekly-reviews');weekly=d.reviews||[];renderWeekly(d.current_week)}catch(e){notice(e.message)}
}
function renderWeekly(week){
 const existing=weekly.find(x=>dateDay(x.week_start)===week),v=existing?.review||{};
 let c=heading('REVIEW & IMPROVE','Your weekly execution','These records are saved to your account so you can compare real activity over time.');
 c+='<div class="studio-main-card"><span class="studio-overline">WEEK BEGINNING '+esc(week)+'</span><div class="studio-field-grid">'+
 [['Outreach sent','outreach'],['Replies received','replies'],['Calls booked','bookings'],['Follow-ups','followups']].map(([label,key])=>'<label class="studio-field">'+esc(label)+'<input id="studioWr_'+key+'" type="number" min="0" max="100000" value="'+esc(v[key]||0)+'"></label>').join('')+'</div>'+
 '<label class="studio-field-label" for="studioWr_lesson">BIGGEST LESSON</label><textarea id="studioWr_lesson" rows="3">'+esc(v.lesson||'')+'</textarea>'+
 '<label class="studio-field-label" for="studioWr_target">NEXT WEEK\'S TARGET</label><textarea id="studioWr_target" rows="3">'+esc(v.target||'')+'</textarea>'+
 '<div class="studio-toolbar">'+action('save-review','Save weekly review','data-week="'+esc(week)+'"')+'</div></div>';
 c+='<div class="studio-list studio-review-history">'+weekly.map(x=>'<div class="studio-list-row"><span class="studio-list-index">'+fmtDate(x.week_start)+'</span><span class="studio-list-copy"><strong>'+esc((x.review?.outreach||0)+' outreach · '+(x.review?.bookings||0)+' bookings')+'</strong><small>'+esc(x.review?.lesson||'No reflection added')+'</small></span></div>').join('')+'</div>';
 call('Weekly Review','Your real activity, recorded week by week.',layout('',c),'PROGRESS / WEEKLY REVIEW');
}
async function mentorDesk(){
 call('Mentor feedback','Submit work and review guidance from your mentors.',loading('mentor feedback'),'MENTORSHIP / FEEDBACK');
 try{const d=await api('/api/mentor/submissions');mentor=d.submissions||[];renderMentor()}catch(e){notice(e.message)}
}
function renderMentor(){
 const urgent=mentor.filter(x=>x.status==='needs_changes'&&!x.acknowledged_at).length;
 const waiting=mentor.filter(x=>x.status==='pending').length;
 const approved=mentor.filter(x=>x.status==='approved').length;
 const sorted=[...mentor].sort((a,b)=>{
  const priority=x=>x.status==='needs_changes'&&!x.acknowledged_at?0:x.status==='pending'?1:x.status==='approved'?2:3;
  return priority(a)-priority(b)||(new Date(b.submitted_at)-new Date(a.submitted_at));
 });
 let c=heading('PERSONAL GUIDANCE','Mentor feedback centre','Send redacted practice work, track real human reviews and respond to specific corrections.');
 c+='<div class="studio-mini-metrics">'+box('ACTION REQUIRED',urgent)+box('AWAITING REVIEW',waiting)+box('APPROVED',approved)+'</div>';
 c+='<div class="studio-note"><strong>How reviews work</strong><p>Submit a clear example and the question you want answered. Your mentor reviews it and may approve it or request changes. Acknowledging feedback does not count as approval.</p></div>';
 c+='<div class="studio-main-card"><div class="studio-field-grid"><label class="studio-field">TYPE<select id="studioMentorCategory"><option value="programme">40-Day evidence</option><option value="conversation">Conversation review</option><option value="workplace">Workplace performance</option><option value="general">General support</option></select></label><label class="studio-field">SUBJECT<input id="studioMentorSubject" maxlength="150" placeholder="What should your mentor review?"></label></div>'+
 '<label class="studio-field-label" for="studioMentorBody">YOUR SUBMISSION</label><textarea id="studioMentorBody" rows="5" placeholder="Include a summary, redacted conversation excerpts, your questions or a link to non-sensitive work."></textarea>'+
 '<p class="studio-help">Remove real prospects\' personal details before submitting.</p>'+
 action('submit-mentor','Submit for mentor review')+'</div>';
 c+='<div class="studio-section-heading"><span>REVIEW HISTORY</span><h3>Your submissions</h3></div>';
 c+=mentor.length?'<div class="studio-list">'+sorted.map(x=>'<div class="studio-list-row studio-stack studio-review-item"><span class="studio-review-status studio-status-'+esc(x.status)+'">'+esc(x.status==='needs_changes'?'Needs changes':x.status==='pending'?'Awaiting review':'Approved')+'</span><span class="studio-overline">'+esc(x.category)+' · '+fmtDate(x.submitted_at)+'</span><strong>'+esc(x.subject)+'</strong><p>'+esc(x.submission)+'</p>'+(x.feedback?'<div class="studio-note"><strong>Mentor feedback</strong><p>'+esc(x.feedback)+'</p></div>':'')+
 (x.status==='needs_changes'&&!x.acknowledged_at?'<div class="studio-toolbar">'+action('mentor-acknowledge','Mark feedback reviewed','data-id="'+esc(x.id)+'"')+'</div><p class="studio-help">If changes are requested, you can submit revised evidence using the form above.</p>':'')+'</div>').join('')+'</div>':empty('No submissions yet','Send your first piece of work when you are ready for feedback.');
 call('Mentor feedback','Human support for practical training.',layout('',c),'MENTORSHIP / FEEDBACK');
}
async function assessment(){
 call('Final assessment','Request a human assessment of your training evidence.',loading('assessments'),'CAREER / ASSESSMENT');
 try{
  const d=await api('/api/assessments');
  let c=heading('PROVE YOUR ABILITY','Practical assessment','Your final assessment is reviewed by a real mentor, not awarded automatically from AI scores.');
  c+='<div class="studio-main-card"><label class="studio-field-label" for="studioAssessmentNotes">WHY ARE YOU READY?</label><textarea id="studioAssessmentNotes" rows="5" placeholder="Reference your programme work, roleplay history, Workplace performance and feedback you have applied."></textarea>'+action('request-assessment','Request mentor assessment')+'</div>';
  if(d.certificates?.length)c+='<div class="studio-main-card"><h3>Earned certificates</h3>'+d.certificates.map(x=>'<p class="studio-completed">'+esc(x.certificate_type)+' · '+fmtDate(x.issued_at)+'</p>').join('')+'</div>';
  c+='<div class="studio-list">'+(d.assessments||[]).map(x=>'<div class="studio-list-row studio-stack"><strong>'+esc(x.status)+' · '+fmtDate(x.created_at)+'</strong><p>'+esc(x.notes)+'</p>'+(x.feedback?'<div class="studio-note"><strong>Assessment feedback</strong><p>'+esc(x.feedback)+'</p></div>':'')+'</div>').join('')+'</div>';
  call('Final assessment','Your evidence of competency, subject to human review.',layout('',c),'CAREER / ASSESSMENT');
 }catch(e){notice(e.message)}
}
async function jobBoard(){
 call('Opportunities','Available roles and your application pipeline.',loading('opportunities'),'CAREER / JOB BOARD');
 try{
  const [d,a]=await Promise.all([api('/api/opportunities'),api('/api/job-applications')]);opportunities=d.opportunities||[];jobFeedInfo=d.feed||{};applications=a.applications||[];renderJobs();
  clearInterval(jobTimer);jobTimer=setInterval(async()=>{
   if(!document.getElementById('liveJobBoard')){clearInterval(jobTimer);return}
   if(document.hidden||document.activeElement?.closest('#liveJobBoard'))return;
   try{const d=await api('/api/opportunities');if(!document.getElementById('liveJobBoard'))return;opportunities=d.opportunities||[];jobFeedInfo=d.feed||{};renderJobs()}catch{}
  },60000);
 }catch(e){call('Opportunities','Available roles and your application pipeline.',empty('Could not load the job board',e.message),'CAREER / JOB BOARD')}
}
function renderJobs(){
 const stage=applications.filter(x=>['applied','interview','offer','placed'].includes(x.status)).length;
 let c='<div id="liveJobBoard">'+heading('CAREER OPPORTUNITIES','Your live job board','New roles arrive automatically from employer career feeds. Save opportunities and track your applications.');
 c+='<div class="live-job-sync" role="status"><span class="live-job-dot" aria-hidden="true"></span><strong>Automatic job feed</strong><span>'+(jobFeedInfo.last_synced?'Last source check '+esc(new Date(jobFeedInfo.last_synced).toLocaleString('en-GB')):'First source check in progress — roles will appear automatically')+'</span><small>Sources checked hourly. This page refreshes automatically.</small></div>';
 c+='<div class="studio-mini-metrics">'+box('AVAILABLE ROLES',opportunities.length)+box('ACTIVE APPLICATIONS',stage)+box('SAVED ROLES',applications.filter(x=>x.status==='saved').length)+'</div>';
 c+='<div class="live-job-filters"><label class="studio-field">SEARCH<input id="studioJobSearch" type="search" placeholder="Company, role or keyword" value="'+esc(jobSearch)+'"></label><label class="studio-field">ROLE<select id="studioJobKind"><option value="all">All relevant roles</option><option value="Appointment Setting">Appointment setters</option><option value="SDR / BDR">SDR / BDR</option></select></label><label class="studio-field">WORKING STYLE<select id="studioJobWork"><option value="all">Any location</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option></select></label><label class="studio-field">PAY<select id="studioJobPay"><option value="all">All pay structures</option><option value="listed">Pay disclosed</option><option value="commission">Commission only</option></select></label><label class="studio-field">YOUR PIPELINE<select id="studioJobFilter"><option value="all">All roles</option><option value="saved">Saved roles</option><option value="applied">Applied</option><option value="interview">Interview</option><option value="offer">Offer</option><option value="placed">Placed</option></select></label></div>';
 const visible=opportunities.filter(x=>(jobFilter==='all'||applications.find(y=>y.opportunity_id===x.id)?.status===jobFilter)&&(jobKind==='all'||x.category===jobKind)&&(jobWork==='all'||x.workplace_type===jobWork)&&(jobPay==='all'||(jobPay==='commission'?/commission[ -]only/i.test(x.salary_text):!!x.salary_text&&!/not disclosed/i.test(x.salary_text)))&&[x.title,x.company,x.description,x.location].join(' ').toLowerCase().includes(jobSearch.toLowerCase()));
 c+='<p class="small muted">'+visible.length+' matching roles · UK locations and explicitly UK-accessible remote roles. Check language and experience requirements.</p>';
 c+=visible.length?'<div class="studio-job-grid">'+visible.slice(0,jobLimit).map(x=>{
  const record=applications.find(a=>a.opportunity_id===x.id),status=record?.status||'';
  const experience=String(x.description||'').match(/(?:\b(?:at least|minimum(?: of)?)\s+)?\b\d(?:\s*[–-]\s*\d)?\+?\s+years?['’]?\s+(?:of\s+)?(?:relevant\s+|professional\s+|previous\s+)?(?:experience|in\b|working\b)[^.!?]{0,100}/i)?.[0]||'See employer requirements';
  const link=x.apply_url&&/^https:\/\//i.test(x.apply_url)?'<a class="live-job-apply" target="_blank" rel="noopener noreferrer" href="'+esc(x.apply_url)+'">View role & apply ↗</a>':'';
  return '<div class="studio-job"><span class="studio-overline">'+esc(x.category||x.type||'Setter role')+' · '+esc(x.location||'See employer')+'</span><h3>'+esc(x.title)+'</h3><strong>'+esc(x.company)+'</strong><div class="live-job-tags"><span>'+esc(x.workplace_type||'See employer')+'</span><span>'+esc(x.source_key?'Public employer listing':'Shared by the team')+'</span></div><p>'+esc(String(x.description||'').slice(0,450))+(x.description?.length>450?'…':'')+'</p><div class="studio-pay">'+esc(x.salary_text||'Pay not disclosed')+'</div><small class="muted">'+esc(x.posted_at?'Posted '+fmtDate(x.posted_at):'Added to Hub '+fmtDate(x.created_at))+(x.source_name?' · '+esc(x.source_name):'')+'</small>'+
   '<p class="small"><b>Experience:</b> '+esc(experience)+'</p><details class="live-job-details"><summary>Role details & requirements</summary><p>'+esc(x.description||'See the full employer advert for details.')+'</p></details><div class="studio-toolbar"><label class="studio-field">YOUR STATUS<select class="studio-job-status" data-job-id="'+esc(x.id)+'">'+['','saved','applied','interview','offer','placed','rejected'].map(k=>'<option value="'+k+'" '+(status===k?'selected':'')+'>'+esc(k||'Not saved')+'</option>').join('')+'</select></label>'+link+'</div></div>'
 }).join('')+'</div>':empty('No matching opportunities',opportunities.length?'Try a different keyword or clear your filters.':'New matching roles will appear after a successful source check.');
 if(visible.length>jobLimit)c+=action('jobs-more','Show more roles');
 c+='<p class="small muted live-job-note">Public listings are automatically imported, not independently vetted or exclusive placements. Apply on the employer’s website. OTE and commission are not guaranteed earnings. Confirm eligibility and terms before accepting a role.</p></div>';
 call('Opportunities','Automatically updated roles and your application pipeline.',layout('',c),'CAREER / JOB BOARD');
 for(const [id,value] of [['studioJobFilter',jobFilter],['studioJobKind',jobKind],['studioJobWork',jobWork],['studioJobPay',jobPay]])if($(id))$(id).value=value;
}
document.addEventListener('input',e=>{if(e.target.id!=='studioJobSearch')return;const pos=e.target.selectionStart;jobSearch=e.target.value;jobLimit=40;renderJobs();const input=$('studioJobSearch');input?.focus();input?.setSelectionRange(pos,pos)});
document.addEventListener('click',e=>{if(e.target.closest('[data-studio="jobs-more"]')){jobLimit+=40;renderJobs()}});

function polylineChart(points){
 const values=points.slice(-25).map(x=>Number(x.overall_score)).filter(Number.isFinite);
 if(!values.length)return empty('No scores recorded','Complete an AI roleplay to start building your performance history.');
 const coords=values.map((v,i)=>[18+i*(420/Math.max(1,values.length-1)),126-(v/100)*113]);
 const path=coords.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(1)).join(' ')).join(' ');
 return '<div class="studio-chart"><svg viewBox="0 0 456 152" preserveAspectRatio="none" role="img" aria-label="Recent Setter Scores trend"><path d="M18 12H438M18 69H438M18 126H438" stroke="#435331" stroke-dasharray="3 7"/><path d="'+path+'" fill="none" stroke="#D0F83B" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>'+coords.map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3.3" fill="#d0f83b"/>').join('')+'</svg><small>Recent '+values.length+' simulations · Scores out of 100</small></div>';
}
async function performance(){
 call('Performance Lab','Score trends and individual skill development.',loading('performance'),'PROGRESS / SKILL INTELLIGENCE');
 try{
  const d=await api('/api/performance/trends'),rows=d.recent||[],last=rows.at(-1);
  const averages={},counts={};
  rows.forEach(r=>Object.entries(r.scores||{}).forEach(([k,v])=>{if(Number.isFinite(Number(v))){averages[k]=(averages[k]||0)+Number(v);counts[k]=(counts[k]||0)+1}}));
  const skills=Object.entries(averages).map(([k,v])=>({label:k.replaceAll('_',' '),score:Math.round(v/counts[k])})).sort((a,b)=>b.score-a.score);
  let c=heading('YOUR TRAINING DATA','Skill intelligence','Use your score history to spot patterns, train weaknesses and measure genuine improvement.');
  c+='<div class="studio-mini-metrics">'+box('TOTAL REPS',d.total_reps)+box('LATEST SCORE',last?last.overall_score+'/100':'—')+box('RECENT RESULTS',rows.length)+'</div>'+polylineChart(rows);
  c+='<div class="studio-skill-bars">'+skills.map(x=>'<div class="studio-skill"><div><span>'+esc(x.label)+'</span><strong>'+x.score+'/100</strong></div><div class="studio-track"><i style="width:'+Math.max(0,Math.min(100,x.score))+'%"></i></div></div>').join('')+'</div>';
  if(!rows.length)c+=action('roleplay','Start a training rep');
  else c+=action('coach','Train your weakest skill');
  call('Performance Lab','Evidence-based trends from your real practice.',layout('',c),'PROGRESS / SKILL INTELLIGENCE');
 }catch(e){notice(e.message)}
}

async function coachPlan(){
 call('Personal AI Coach','A targeted three-step practice plan based on measured results.',loading('coach'),'PROGRESS / COACHING');
 try{
  const d=await api('/api/profile'),rec=d.recommendation||{};
  const weakness=d.weakest?.skill||null,score=d.weakest?.score;
  const lookup={
   conversational_awareness:{module:4,drill:'Listen for what the prospect actually means before choosing a question.',target:'Respond to the exact preceding message and ask just one useful question.'},
   rapport:{module:4,drill:'Build genuine relevance through the prospect’s own words.',target:'Show comprehension without fake mirroring or over-familiarity.'},
   discovery:{module:5,drill:'Uncover context, challenges and goals before introducing a solution.',target:'Ask follow-up questions that reveal why the situation matters.'},
   qualification:{module:6,drill:'Check fit, interest and readiness without turning the conversation into a checklist.',target:'Find relevant evidence of suitability before suggesting a meeting.'},
   objection_handling:{module:7,drill:'Acknowledge resistance, clarify its cause, and respond without pressure.',target:'Diagnose the actual concern instead of deploying a scripted rebuttal.'},
   positioning:{module:8,drill:'Connect the offer to what was discovered in the conversation.',target:'Never make guarantees or claim unverified results.'},
   cta:{module:9,drill:'Earn the transition to a next step only when sufficient interest is established.',target:'Use a clear, low-pressure invitation.'},
   naturalness:{module:4,drill:'Keep replies short, relevant and conversational.',target:'Avoid stacked questions and robotic frameworks.'}
  };
  const plan=lookup[weakness]||{module:1,drill:'Build one high-quality conversation from the start.',target:'Actively listen and prioritise relevance.'};
  let c=heading('PERSONALISED COACHING',rec.title||'Your next area to improve','Your practice plan is based on your completed training—not a random daily challenge.');
  c+='<div class="studio-mini-metrics">'+box('AVERAGE SCORE',d.reps?d.average+'/100':'Not established')+
   box('CURRENT FOCUS',weakness?weakness.replaceAll('_',' '):'Foundations')+
   box('EVIDENCE',String(d.reps||0)+' reps')+'</div>';
  c+='<div class="studio-main-card"><span class="studio-overline">RECOMMENDED TRAINING PLAN</span><h3>'+esc(rec.title||'Build your baseline')+'</h3><p>'+esc(rec.detail||'Complete a focused simulation to establish a reliable starting point.')+'</p>';
  c+='<div class="studio-list">'+[
   ['01','Learn the concept','Study module '+plan.module+': '+modules[plan.module-1]+'.'],
   ['02','Practise deliberately',plan.drill],
   ['03','Check improvement','Complete three focused simulations, compare your new skill scores, and reflect on feedback.']
  ].map(x=>'<div class="studio-list-row"><span class="studio-list-index">'+x[0]+'</span><span class="studio-list-copy"><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></span></div>').join('')+'</div>';
  c+='<div class="studio-note"><strong>What good performance looks like</strong><p>'+esc(plan.target)+'</p></div>';
  c+='<div class="studio-toolbar">'+action('coach-learn','Open related lesson','data-module="'+plan.module+'"')+action('coach-practise','Start focused practice')+'</div></div>';
  call('Personal AI Coach','A learning plan based on actual training history.',layout('',c),'PROGRESS / COACHING');
 }catch(e){notice(e.message)}
}
async function adminStudio(){
 call('Lesson studio','Admin tools for uploading and publishing lessons.',loading('lessons'),'ADMIN / CURRICULUM');
 try{
  const d=await api('/api/academy/lessons?include_drafts=1');lessons=d.lessons||[];
  let c=heading('MANAGE YOUR ACADEMY','Lesson publishing','Add recordings as you complete them. Draft lessons are hidden until published.');
  c+='<div class="studio-main-card"><div class="studio-field-grid"><label class="studio-field">MODULE<select id="studioAdminModule">'+modules.map((m,i)=>'<option value="'+(i+1)+'">'+(i+1)+' · '+esc(m)+'</option>').join('')+'</select></label><label class="studio-field">TITLE<input id="studioAdminTitle" maxlength="160" placeholder="Lesson title"></label></div>'+
  '<label class="studio-field-label" for="studioAdminDescription">DESCRIPTION</label><textarea id="studioAdminDescription" rows="3"></textarea>'+
  '<div class="studio-field-grid"><label class="studio-field">VIDEO URL<input id="studioAdminVideo" placeholder="https://"></label><label class="studio-field">RESOURCE URL<input id="studioAdminResource" placeholder="https://"></label><label class="studio-field">DURATION (MIN)<input type="number" id="studioAdminDuration" min="0" value="8"></label><label class="studio-field">ORDER<input type="number" id="studioAdminOrder" value="1" min="0"></label></div>'+
  '<label class="studio-checkbox"><input type="checkbox" id="studioAdminPublished"> Publish immediately</label>'+action('create-lesson','Add lesson')+'</div>';
  c+='<div class="studio-list">'+lessons.map(x=>'<div class="studio-list-row studio-stack"><div class="studio-admin-lesson-row"><span class="studio-list-index">'+x.module_number+'</span><span class="studio-list-copy"><strong>'+esc(x.title)+'</strong><small>'+(x.published?'Published':'Draft')+'</small></span>'+action('toggle-publish',x.published?'Unpublish':'Publish','data-id="'+esc(x.id)+'"')+'</div>'+
 '<details class="studio-quiz-editor"><summary>Configure three-answer knowledge check</summary>'+
 '<label class="studio-field">QUESTION<input id="studioQ_'+esc(x.id)+'" maxlength="500" placeholder="What is the correct next step?"></label>'+
 '<div class="studio-field-grid"><label class="studio-field">ANSWER A<input id="studioA0_'+esc(x.id)+'" maxlength="200"></label><label class="studio-field">ANSWER B<input id="studioA1_'+esc(x.id)+'" maxlength="200"></label><label class="studio-field">ANSWER C<input id="studioA2_'+esc(x.id)+'" maxlength="200"></label><label class="studio-field">CORRECT ANSWER<select id="studioCorrect_'+esc(x.id)+'"><option value="0">A</option><option value="1">B</option><option value="2">C</option></select></label></div>'+
 '<label class="studio-field-label">EXPLANATION<textarea rows="2" id="studioExplain_'+esc(x.id)+'" placeholder="Why is this the best answer?"></textarea></label>'+
 action('save-knowledge-check','Save knowledge check','data-id="'+esc(x.id)+'"')+'</details></div>').join('')+'</div>';
  call('Lesson studio','Manage your programme without editing code.',layout('',c),'ADMIN / CURRICULUM');
 }catch(e){notice(e.message)}
}
async function mentorAdmin(){
 call('Mentor desk','Review actual student work and assessment requests.',loading('mentor queue'),'ADMIN / MENTORSHIP');
 try{
  const [r,a]=await Promise.all([api('/api/admin/mentor/submissions'),api('/api/admin/assessments')]);
  adminTasks=r.submissions||[];adminAssessments=a.assessments||[];
  let c=heading('MENTOR OPERATIONS','Review queue','Feedback and approval remain manual. Students see decisions on their own accounts.');
  c+='<div class="studio-mini-metrics">'+box('PENDING SUBMISSIONS',adminTasks.filter(x=>x.status==='pending').length)+box('ASSESSMENTS TO REVIEW',adminAssessments.filter(x=>x.status==='pending').length)+'</div>';
  c+='<div class="studio-list">'+adminTasks.map(x=>'<div class="studio-list-row studio-stack"><span class="studio-overline">'+esc(x.student_name)+' · '+esc(x.category)+' · '+esc(x.status)+'</span><h3>'+esc(x.subject)+'</h3><p>'+esc(x.submission)+'</p>'+(x.status==='pending'?'<textarea id="feedback_'+esc(x.id)+'" rows="2" placeholder="Actionable feedback"></textarea><div class="studio-toolbar">'+action('mentor-approve','Approve','data-id="'+esc(x.id)+'"')+action('mentor-revise','Request changes','data-id="'+esc(x.id)+'"')+'</div>':'<div class="studio-note">'+esc(x.feedback||'Reviewed')+'</div>')+'</div>').join('')+'</div>';
  c+='<div class="studio-section-heading"><span>FINAL ASSESSMENTS</span><h3>Competency sign-off</h3></div><div class="studio-list">'+adminAssessments.map(x=>'<div class="studio-list-row studio-stack"><span class="studio-overline">'+esc(x.student_name)+' · '+esc(x.status)+'</span><p>'+esc(x.notes)+'</p>'+(x.status==='pending'?'<textarea id="feedback_'+esc(x.id)+'" rows="2" placeholder="Assessment evidence and feedback"></textarea><div class="studio-toolbar">'+action('assessment-approve','Approve competency','data-id="'+esc(x.id)+'"')+action('assessment-revise','Request more evidence','data-id="'+esc(x.id)+'"')+'</div>':esc(x.feedback||''))+'</div>').join('')+'</div>';
  call('Mentor desk','Assessment and mentoring decisions.',layout('',c),'ADMIN / MENTORSHIP');
 }catch(e){notice(e.message)}
}
async function dashboardSummary(){
 const p=$('profilePanel');
 if(!p||p.classList.contains('hidden')||overviewBusy)return;
 overviewBusy=true;
 try{
  const d=await api('/api/member/overview');
  const quick=p.querySelector('.signature-quick');
  if(quick){
   let strip=p.querySelector('.studio-dashboard-overview');
   if(!strip){strip=document.createElement('div');strip.className='studio-dashboard-overview';quick.insertAdjacentElement('beforebegin',strip)}
   const data=[
    ['Lessons',d.academy?.total?d.academy.completed+' / '+d.academy.total:'Awaiting publication'],
    ['Mentor reviews',String(d.mentor_pending||0)+' pending'],
    ['Applications',String(d.applications_active||0)+' active'],
    ['Assessment',d.assessment||'Not requested']
   ];
   strip.innerHTML='<div class="studio-dashboard-overline">YOUR REAL PROGRESS <span>ACCOUNT SYNCED</span></div><div class="studio-dashboard-strip">'+data.map(([k,v])=>box(k,v)).join('')+'</div>';
  }
 }catch(e){console.warn('Dashboard overview unavailable',e)}finally{overviewBusy=false}
}
async function enableAdmin(){
 if(adminChecked)return;adminChecked=true;
 try{
  const me=await api('/api/account/me');
  admin=me.user?.role==='admin';
  if(!admin)return;
  const nav=$('memberAppNav');
  if(nav&&!nav.querySelector('[data-studio="admin-studio"]')){
   const more=nav.querySelector('.member-nav-more-panel');
   const footer=nav.querySelector('.member-nav-footer');
   const adminTools=document.createElement('div');
   adminTools.className='studio-admin-shortcuts';
   adminTools.innerHTML=action('admin-studio','Lesson studio')+action('admin-mentor','Mentor desk');
   if(more)more.appendChild(adminTools);
   if(footer)footer.prepend(adminTools.cloneNode(true));
  }
 }catch(e){adminChecked=false}
}
const originalOpen=window.openAccount;
if(typeof originalOpen==='function')window.openAccount=async function(){const r=await originalOpen.apply(this,arguments);if(!$('profilePanel')?.classList.contains('hidden')){dashboardSummary();enableAdmin()}return r};
const originalLoad=window.loadAccount;
if(typeof originalLoad==='function')window.loadAccount=async function(){const r=await originalLoad.apply(this,arguments);if(!$('profilePanel')?.classList.contains('hidden')){dashboardSummary();enableAdmin()}return r};
Object.assign(window,{
 showAcademy:academy,openAcademyLesson:async(id)=>{await academy();if(lessons.some(l=>l.id===id))lessonView(id);},showProgramme:programme,showWeeklyReview:weeklyReview,showOpportunities:jobBoard,showPerformanceLab:performance,showPersonalCoach:coachPlan,
 showMentorDesk:mentorDesk,showFinalAssessment:assessment,showAdminLessonStudio:adminStudio,showAdminMentorDesk:mentorAdmin
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-studio]');if(!b)return;
 const key=b.dataset.studio;
 const state=b.disabled;b.disabled=true;
 try{
  if(key==='academy')return await academy();
  if(key==='module')return moduleView(+b.dataset.number);
  if(key==='lesson')return lessonView(b.dataset.id);
  if(key==='programme-day'){dayNo=+b.dataset.number;return renderProgramme()}
  if(key==='programme-prev'){dayNo=Math.max(1,dayNo-1);return renderProgramme()}
  if(key==='programme-next'){dayNo=Math.min(40,dayNo+1);return renderProgramme()}
  if(key==='programme-save'){
   const proof=$('studioProof')?.value.trim()||'',d=days.find(x=>x.day===dayNo);
   if(!proof||proof.length<10)throw Error('Describe the activity completed before marking the day complete.');
   await api('/api/programme/'+dayNo,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed:true,proof_note:proof})});
   d.completed=true;d.proof_note=proof;notice('Day saved to your account');return renderProgramme();
  }
  if(key==='programme-submit'){
   const proof=$('studioProof')?.value.trim()||'';if(proof.length<15)throw Error('Include at least 15 characters of evidence.');
   await api('/api/mentor/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:'programme',subject:'Day '+dayNo+' practical evidence',submission:proof})});
   notice('Sent to mentor review queue');return;
  }
  if(key==='submit-check'){
   const value=document.querySelector('input[name="studioCheckAnswer"]:checked');
   if(!value)throw Error('Choose an answer first.');
   const d=await api('/api/academy/lessons/'+b.dataset.id+'/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answer_index:Number(value.value)})});
   const feedback=$('studioCheckFeedback');
   if(feedback)feedback.innerHTML='<div class="studio-note"><strong>'+(d.correct?'Correct — well done':'Not quite — review this point')+'</strong><p>'+esc(d.explanation||'')+'</p></div>';
   if(d.passed){setTimeout(()=>loadLessonCheck(b.dataset.id),800)}
   return;
  }
  if(key==='save-knowledge-check'){
   const id=b.dataset.id;
   const question=$('studioQ_'+id)?.value||'';
   const options=[0,1,2].map(i=>$('studioA'+i+'_'+id)?.value||'');
   const answer_index=Number($('studioCorrect_'+id)?.value);
   await api('/api/admin/academy/lessons/'+id+'/check',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,options,answer_index,explanation:$('studioExplain_'+id)?.value||''})});
   notice('Knowledge check published. Students must pass before completing this lesson.');return;
  }
  if(key==='complete-lesson'){
   if(!$('studioWatched')?.checked)throw Error('Confirm you reviewed the lesson first.');
   await api('/api/academy/lessons/'+b.dataset.id+'/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm_watched:true})});
   const item=lessons.find(l=>l.id===b.dataset.id);if(item)item.completed=true;
   notice('Lesson marked complete');return moduleView(item?.module_number||1);
  }
  if(key==='save-review'){
   const values={};for(const k of ['outreach','replies','bookings','followups'])values[k]=Number($('studioWr_'+k)?.value||0);
   values.lesson=$('studioWr_lesson')?.value||'';values.target=$('studioWr_target')?.value||'';
   await api('/api/weekly-reviews',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({week_start:b.dataset.week,review:values})});
   notice('Weekly review saved');return weeklyReview();
  }
  if(key==='mentor-acknowledge'){
   await api('/api/mentor/submissions/'+b.dataset.id+'/acknowledge',{method:'POST'});
   notice('Feedback marked reviewed');return mentorDesk();
  }
  if(key==='submit-mentor'){
   const category=$('studioMentorCategory')?.value,subject=$('studioMentorSubject')?.value,submission=$('studioMentorBody')?.value;
   await api('/api/mentor/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,subject,submission})});
   notice('Work submitted');return mentorDesk();
  }
  if(key==='request-assessment'){
   await api('/api/assessments/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes:$('studioAssessmentNotes')?.value||''})});
   notice('Assessment requested');return assessment();
  }
  if(key==='create-lesson'){
   const payload={module_number:+$('studioAdminModule').value,title:$('studioAdminTitle').value,description:$('studioAdminDescription').value,
    video_url:$('studioAdminVideo').value,resource_url:$('studioAdminResource').value,duration_min:+$('studioAdminDuration').value,sort_order:+$('studioAdminOrder').value,published:$('studioAdminPublished').checked};
   await api('/api/admin/academy/lessons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   notice('Lesson added');return adminStudio();
  }
  if(key==='toggle-publish'){
   const l=lessons.find(x=>x.id===b.dataset.id);if(!l)return;
   await api('/api/admin/academy/lessons/'+l.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({published:!l.published})});
   notice(l.published?'Lesson unpublished':'Lesson published');return adminStudio();
  }
  if(key==='mentor-approve'||key==='mentor-revise'||key==='assessment-approve'||key==='assessment-revise'){
   const id=b.dataset.id,status=key.endsWith('approve')?'approved':'needs_changes',feedback=$('feedback_'+id)?.value||'';
   const endpoint=key.startsWith('mentor')?'/api/admin/mentor/submissions/':'/api/admin/assessments/';
   await api(endpoint+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,feedback})});
   notice('Mentor decision saved');return mentorAdmin();
  }
  if(key==='coach-learn'){
   await academy();return moduleView(Number(b.dataset.module)||1);
  }
  if(key==='coach-practise')return window.startRecommendedTraining?.();
  if(key==='roleplay')return window.openAIStage?.();
  if(key==='coach')return window.showPersonalCoach?.();
  if(key==='admin-studio')return adminStudio();
  if(key==='admin-mentor')return mentorAdmin();
 }catch(err){notice(err.message||'Something went wrong')}finally{b.disabled=state}
});
document.addEventListener('change',async e=>{
 const t=e.target;if(!(t instanceof Element))return;
 if(t.id==='studioJobFilter'){jobFilter=t.value;renderJobs();return}
 if(['studioJobKind','studioJobWork','studioJobPay'].includes(t.id)){if(t.id==='studioJobKind')jobKind=t.value;if(t.id==='studioJobWork')jobWork=t.value;if(t.id==='studioJobPay')jobPay=t.value;jobLimit=40;renderJobs();return}
 if(t.matches('.studio-job-status')){
  const status=t.value,id=t.dataset.jobId;if(!status){notice('Choose a status to save this role');return}
  try{
   await api('/api/job-applications/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
   const a=applications.find(x=>x.opportunity_id===id);
   if(a)a.status=status;else applications.push({opportunity_id:id,status});
   notice('Application status saved');
  }catch(err){notice(err.message)}
 }
});
function addNavigation(){
 const nav=$('memberAppNav'),more=nav?.querySelector('.member-nav-more-panel'),footer=nav?.querySelector('.member-nav-footer');
 if(more&&!more.querySelector('.studio-member-shortcuts')){
  const shortcuts=document.createElement('div');shortcuts.className='studio-member-shortcuts';
  shortcuts.innerHTML='<span class="studio-overline">MEMBER SUPPORT</span>'+
   '<button type="button" data-studio="open-mentor">Mentor feedback ↗</button>'+
   '<button type="button" data-studio="open-assessment">Final assessment ↗</button>';
  more.appendChild(shortcuts);
 }
 if(footer&&!footer.querySelector('.studio-member-shortcuts')){
  const c=more?.querySelector('.studio-member-shortcuts')?.cloneNode(true);
  if(c)footer.prepend(c);
 }
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-studio="open-mentor"],[data-studio="open-assessment"]');
 if(btn){if(btn.dataset.studio==='open-mentor')mentorDesk();else assessment()}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addNavigation,{once:true});else addNavigation();
})();
