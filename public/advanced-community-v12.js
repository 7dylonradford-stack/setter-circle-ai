
(function(){
'use strict';
const A=window.SetterAdvanced;if(!A)return;
const {api,json,esc,$,notice,show,view,section,btn,card,input,select,textArea,aside,action,date}=A;
let workshops=[],cohorts=[],rooms=[],available=[],activeRoom=null,challenges=[],pollTimer=null;
const stopPoll=()=>{if(pollTimer){clearInterval(pollTimer);pollTimer=null}};
async function workshopsPage(){
 stopPoll();
 await show("Live Workshops","Learn directly with experienced coaches.",async()=>{
  const d=await api("/api/advanced/workshops");workshops=d.workshops||[];
  let html=section("COACHING / LIVE EVENTS","Upcoming workshops","RSVP to a team-hosted practical training session. Meeting links only appear when provided by the organisers.");
  html+=workshops.length?'<div class="aa-grid">'+workshops.map(w=>'<div class="aa-panel"><span class="aa-overline">'+esc(date(w.starts_at))+'</span><h3>'+esc(w.title)+'</h3><p>'+esc(w.description)+'</p><small>Hosted by '+esc(w.host)+' · '+esc(w.duration_minutes)+' minutes</small>'+
   '<div class="aa-actions">'+btn("aa-rsvp",w.rsvped?"Cancel RSVP":"RSVP",'data-id="'+esc(w.id)+'"')+
   (w.join_url&&w.rsvped?'<a class="aa-outlink" href="'+esc(w.join_url)+'" target="_blank" rel="noopener noreferrer">Open live workshop ↗</a>':"")+'</div></div>').join("")+'</div>':
   A.empty("No workshops scheduled","New sessions will appear as soon as the team confirms the date and host.");
  view("Live Workshops","Practical sessions and optional member RSVPs.",html,"COMMUNITY / WORKSHOPS");
 });
}
async function cohortsPage(){
 stopPoll();
 await show("Training Cohorts","Join a practical training group.",async()=>{
  const d=await api("/api/advanced/cohorts");cohorts=d.cohorts||[];
  let html=section("LEARN TOGETHER","Training cohorts","A cohort gives you shared start dates and group accountability.");
  html+=cohorts.length?'<div class="aa-grid">'+cohorts.map(x=>'<div class="aa-panel"><span class="aa-overline">'+esc(date(x.starts_at))+'</span><h3>'+esc(x.name)+'</h3><p>'+esc(x.description)+'</p>'+btn("aa-enrol",x.enrolled?"Leave cohort":"Join cohort",'data-id="'+esc(x.id)+'"')+'</div>').join("")+'</div>':A.empty("No active cohorts","Your mentors will publish group start dates when available.");
  view("Training Cohorts","Structured group learning and accountability.",html,"COMMUNITY / COHORTS");
 });
}
async function peerPage(){
 stopPoll();
 await show("Peer Practice","Two-person training with consenting students.",async()=>{
  const d=await api("/api/advanced/peers");rooms=d.rooms||[];available=d.available||[];
  let html=section("PRACTISE / TOGETHER","Peer roleplay rooms","Create or join a two-person training conversation. Only participants can see the messages.");
  html+='<div class="aa-panel">'+select("aaPeerLevel","PRACTICE LEVEL",[{value:"beginner",label:"Beginner"},{value:"intermediate",label:"Intermediate"},{value:"advanced",label:"Advanced"}])+
  btn("aa-create-peer","Create an open practice room")+'</div>';
  html+='<div class="aa-group-header"><h3>Your rooms</h3></div>'+
  (rooms.length?'<div class="aa-grid">'+rooms.map(r=>card("aa-open-peer","Room · "+r.level,"Status: "+r.status+" · "+date(r.created_at),"YOUR ROOM").replace('data-aa="aa-open-peer"','data-aa="aa-open-peer" data-id="'+esc(r.id)+'"')).join("")+'</div>':A.empty("No peer rooms yet","Create one to invite another member."));
  html+='<div class="aa-group-header"><h3>Open rooms</h3></div>'+
  (available.length?'<div class="aa-grid">'+available.map(r=>'<div class="aa-panel"><span class="aa-overline">'+esc(r.level)+'</span><p>A member is looking for practice.</p>'+btn("aa-join-peer","Join room",'data-id="'+esc(r.id)+'"')+'</div>').join("")+'</div>':A.empty("No open rooms","Other members can join your room when they are online."));
  view("Peer Practice","Optional one-to-one training rooms.",html,"COMMUNITY / PEER ROOMS");
 });
}
async function roomPage(roomId){
 stopPoll();activeRoom=roomId;
 const render=async()=>{
  const d=await api("/api/advanced/peers/"+roomId+"/messages");
  if(activeRoom!==roomId)return;
  const messages=d.messages||[];
  let html=section("PRIVATE / PRACTICE ROOM","Conversation practice","Take turns playing the setter and prospect. Only people in this room can read this transcript.");
  html+='<div class="aa-panel"><div class="aa-messages">'+messages.map(m=>'<div class="aa-message '+(m.own?"mine":"theirs")+'"><small>'+esc(m.own?"YOU":"PARTNER")+'</small><p>'+esc(m.message)+'</p></div>').join("")+'</div>'+
  (d.status==="active"?textArea("aaPeerMessage","YOUR MESSAGE","Respond as the setter or the fictional prospect.")+btn("aa-peer-send","Send message"):'<p class="aa-overline">ROOM '+esc(d.status.toUpperCase())+' · Waiting for another member</p>')+
  '<div class="aa-actions">'+btn("aa-peer-refresh","Refresh chat")+btn("aa-peer-back","Back to rooms")+'</div></div>';
  view("Peer Practice Room","A private two-person practice session.",html,"COMMUNITY / LIVE ROOM");
 };
 await render();
 // Intentionally manual refresh: avoids background polling while the user navigates away.
}
async function challengesPage(){
 stopPoll();
 await show("Monthly Challenges","Improve your skills in optional monthly exercises.",async()=>{
  const d=await api("/api/advanced/challenges");challenges=d.challenges||[];
  let html=section("MONTHLY / TRAINING CHALLENGE","Skill challenges","Complete optional tasks and reflect on your method. There are no fake ratings or prizes.");
  html+=challenges.length?'<div class="aa-grid">'+challenges.map(x=>'<div class="aa-panel"><span class="aa-overline">'+esc(x.month_key)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.briefing)+'</p>'+aside("Review criteria",x.assessment||"Clarity and relevant skill demonstration")+
   textArea("aaChallenge_"+x.id,"YOUR SUBMISSION","Explain what you practised and why.",x.submission||"")+
   btn("aa-submit-challenge",x.submission?"Update entry":"Submit entry",'data-id="'+esc(x.id)+'"')+'</div>').join("")+'</div>':
   A.empty("No monthly challenge published","Challenges will appear when the mentors publish their judging criteria and brief.");
  view("Monthly Challenges","Optional challenges, reviewed for genuine skill.",html,"COMMUNITY / CHALLENGES");
 });
}
action("aa-workshops",workshopsPage);
action("aa-cohorts",cohortsPage);
action("aa-peers",peerPage);
action("aa-challenges",challengesPage);
action("aa-rsvp",async b=>{
 const x=workshops.find(x=>x.id===b.dataset.id);
 await api("/api/advanced/workshops/"+b.dataset.id+"/rsvp",json({attending:!x.rsvped},"PUT"));notice("RSVP updated");return workshopsPage();
});
action("aa-enrol",async b=>{
 const x=cohorts.find(x=>x.id===b.dataset.id);
 await api("/api/advanced/cohorts/"+b.dataset.id+"/enrol",json({enrolled:!x.enrolled},"PUT"));notice("Cohort enrolment updated");return cohortsPage();
});
action("aa-create-peer",async()=>{
 await api("/api/advanced/peers",json({level:$("aaPeerLevel")?.value||"beginner"}));notice("Room open");return peerPage();
});
action("aa-join-peer",async b=>{
 await api("/api/advanced/peers/"+b.dataset.id+"/join",json({}));return roomPage(b.dataset.id);
});
action("aa-open-peer",b=>roomPage(b.dataset.id));
action("aa-peer-refresh",()=>activeRoom&&roomPage(activeRoom));
action("aa-peer-back",peerPage);
action("aa-peer-send",async()=>{
 if(!activeRoom)return;
 await api("/api/advanced/peers/"+activeRoom+"/messages",json({message:$("aaPeerMessage")?.value||""}));
 return roomPage(activeRoom);
});
action("aa-submit-challenge",async b=>{
 await api("/api/advanced/challenges/"+b.dataset.id+"/enter",json({submission:$("aaChallenge_"+b.dataset.id)?.value||""}));
 notice("Challenge entry submitted");return challengesPage();
});
})();
