
/* Setter Circle Experience v15: coherent places, existing working tools. */
(function(){
'use strict';
if(window.SetterDesignV15)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const card=(action,n,title,description)=>'<button type="button" class="v15-hub-card" data-member-action="'+esc(action)+'"><span class="v15-hub-number">'+esc(n)+'</span><span class="v15-hub-content"><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span><span class="v15-hub-arrow" aria-hidden="true">↗</span></button>';
const headline=(step,title,description)=>'<div class="v15-hub-intro"><span>'+esc(step)+'</span><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p></div>';
const open=(title,description,content,section)=>{
 if(typeof window.openWorkspace!=='function')return;
 window.openWorkspace(title,description,'<div class="v15-hub">'+content+'</div>',section);
};
function practice(){
 const content=headline('PRACTICE / ONE CONNECTED WORKSPACE','Make every rep count.','Start a simulation, return to an unfinished conversation, or improve a completed attempt without navigating between separate apps.')+
 '<div class="v15-hub-hero">'+
 '<div><span>01 / YOUR NEXT CONVERSATION</span><h3>Roleplay Lab</h3><p>Work through a realistic prospect conversation, then review your decisions and coaching.</p></div>'+
 '<button class="v15-primary" data-member-action="openAIStage">Start a new simulation <span>↗</span></button></div>'+
 '<div class="v15-hub-section"><span>CONTINUE & IMPROVE</span><div class="v15-hub-grid">'+
 card('showResumeTraining','02','Resume practice','Continue a conversation saved to your account.')+
 card('showReplayStudio','03','Replay & improve','Rewrite weaker messages and review alternative simulated responses.')+
 card('showPersonalCoach','04','My AI Coach','Work on the specific skills your training history highlights.')+
 '</div></div>'+
 '<div class="v15-hub-section"><span>MORE PRACTICE METHODS</span><div class="v15-hub-grid">'+
 card('showConversationClinic','05','Conversation Clinic','Understand common mistakes, then practise better replies.')+
 card('showAdvancedStudio','06','Multi-channel & voice','Practise fictional prospects across simulated DMs, email and browser speech.')+
 card('showPreShift','07','Prepare for a shift','Review the core standards and expectations before Workplace practice.')+
 '</div></div>';
 open('Roleplay Lab','One connected home for every AI conversation and coaching tool.',content,'PRACTICE / ROLEPLAY LAB');
}
function career(){
 const content=headline('CAREER / PROFESSIONAL DEVELOPMENT','Build evidence. Find a role.','Your career progression stays separate from simulated scores. Choose what to work on next.')+
 '<div class="v15-hub-grid">'+
 card('showSetterProfile','01','My training profile','Review your recorded training and demonstrated strengths.')+
 card('showOpportunities','02','Job opportunities','Find automatically updated roles and track application progress.')+
 card('showPlacementPath','03','Readiness pathway','See what is required before a mentor assessment.')+
 card('showFinalAssessment','04','Request assessment','Submit evidence for a real mentor to review.')+
 card('showAdvancedStudio','05','Professional portfolio','Build optional shareable practice evidence and career milestones.')+
 card('startInterview','06','Interview practice','Rehearse job-specific hiring questions.')+
 '</div>';
 open('Career Studio','A clearer route from training to applying for suitable roles.',content,'CAREER / DEVELOPMENT');
}
function community(){
 const content=headline('COMMUNITY / GROW TOGETHER','Train with other people.','Optional mentoring events, group learning and peer practice when they are available.')+
 '<div class="v15-hub-grid">'+
 card('showAdvancedStudio','01','Events, cohorts & peers','Join published workshops and voluntary peer practice.')+
 card('showMentorDesk','02','Ask your mentor','Send work, track reviews and act on corrections.')+
 card('showLeaderboard','03','Training leaderboard','See optional weekly training participation.')+
 card('showResources','04','Member resources','Read guides and reference material alongside practice.')+
 '</div>';
 open('Community & Workshops','Mentor support and collaborative training.',content,'COMMUNITY / EVENTS');
}
window.showPracticeStudio=practice;
window.showCareerStudio=career;
window.showCommunityStudio=community;
window.SetterDesignV15={practice,career,community};
})();
