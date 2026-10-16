
(function(){
'use strict';
const A=window.SetterAdvanced;if(!A)return;
const {api,json,esc,$,notice,show,view,section,btn,card,textArea,input,select,aside,action}=A;
let offers=[],threads=[],selected=null,voice=false,recognition=null;
const channelLabels={dm:"Instagram-style DM",email:"Email",linkedin:"LinkedIn-style chat",phone:"Voice practice"};
const threadPage=t=>{
 selected=t;const name=t.persona?.name||"Prospect";
 const messages=(t.messages||[]).map(m=>{
 const cls=m.role==="student"?"mine":m.role==="prospect"?"theirs":"info";
 return '<div class="aa-message '+cls+'"><small>'+esc(m.role==="student"?"YOU":m.role==="prospect"?name:"SCENARIO")+' · '+esc(m.channel||t.channel)+'</small><p>'+esc(m.text)+'</p></div>';
 }).join("");
 const status=t.phase==="awaiting_follow_up"?"Prospect follow-up pending until "+A.date(t.due_at):"Status: "+t.phase;
 const body=section("FICTIONAL PROSPECT · "+t.channel.toUpperCase(),name+" · "+(t.persona?.role||"Prospect"),"Practise a realistic, consistent relationship. You may move between channels without losing context.")+
 '<div class="aa-panel aa-thread"><div class="aa-thread-top"><span>'+esc(status)+'</span>'+select("aaChannel","CHANNEL",Object.entries(channelLabels).map(([value,label])=>({value,label})))+'</div>'+
 '<div class="aa-messages" aria-live="polite">'+messages+'</div>'+
 (t.last_feedback?aside("PRIVATE AI COACH NOTE",t.last_feedback):"")+
 textArea("aaReply","YOUR NEXT MESSAGE","Be relevant and natural…")+
 '<div class="aa-actions">'+btn("aa-send","Send message")+(voice?btn("aa-mic","Speak into microphone"):btn("aa-back-ai","All simulations"))+
 (voice?btn("aa-read-last","Read prospect reply"):"")+'</div></div>';
 view(name+" · "+channelLabels[t.channel],"Fictional practice conversation",body,"ADVANCED STUDIO / ROLEPLAY");
 if($("aaChannel"))$("aaChannel").value=t.channel;
};
async function loadThreads(){const d=await api("/api/advanced/threads");threads=d.threads||[]}
async function ai(){
 await show("Advanced AI Training","Persistent multi-channel prospect conversations.",async()=>{
  await Promise.all([loadThreads(),loadOffers()]);
  const content=section("TRAIN / PRACTISE / PROVE","Scenario laboratory","Each fictional prospect keeps a consistent personality across conversations. Their future replies may be delayed.")+
  '<div class="aa-panel">'+select("aaNewChannel","START A SCENARIO",Object.entries(channelLabels).map(([value,label])=>({value,label})))+
  select("aaNewOffer","CLIENT OFFER",[{value:"",label:"General practice"}].concat(offers.map(o=>({value:o.id,label:o.title}))))+
  btn("aa-new-thread","Create fictional prospect")+'</div>'+
  '<div class="aa-grid">'+threads.map(t=>card("aa-open-thread",t.persona?.name+" · "+t.persona?.role,(t.messages?.length||0)+" exchanges · "+t.channel+" · "+t.phase,"CONTINUE · "+t.id.slice(0,6)).replace('data-aa="aa-open-thread"','data-aa="aa-open-thread" data-id="'+esc(t.id)+'"')).join("")+'</div>'+
  (!threads.length?A.empty("No simulations yet","Create your first fictional prospect to practise conversation quality."):"")+
  aside("Ethical practice","These are simulated customers and fictitious messages. Never upload a real prospect's private data into a training brief.");
  view("Advanced AI Training","Multi-channel training with personalities and follow-up behaviour.",content,"ADVANCED STUDIO / AI");
 });
}
async function loadOffers(){const d=await api("/api/advanced/offers");offers=d.offers||[]}
async function offerPage(){
 await show("Custom Client Offers","Practise with a context specific client brief.",async()=>{
  await loadOffers();
  const content=section("CLIENT / OFFER LAB","Build a usable client brief","Create fictional or approved example offers for more relevant roleplays.")+
  '<div class="aa-panel aa-form">'+input("aaOfferTitle","OFFER NAME","B2B Growth Coaching")+
  input("aaOfferAudience","TARGET CUSTOMER","Small UK agencies")+
  textArea("aaOfferProp","WHAT THE SERVICE DOES","Explain the service, legitimate benefits and qualification requirements")+
  input("aaOfferPrice","PRICE OR PAYMENT MODEL (OPTIONAL)","£1500")+
  textArea("aaOfferObjections","COMMON CONCERNS","One concern per line")+
  btn("aa-save-offer","Save offer profile")+'</div>'+
  '<div class="aa-grid">'+offers.map(o=>card("aa-open-offer",o.title,o.audience+" · "+o.proposition,"SAVED OFFER").replace('data-aa="aa-open-offer"','data-aa="aa-open-offer" data-id="'+esc(o.id)+'"')).join('')+'</div>';
  view("Client Offer Lab","Create and reuse offer context.",content,"ADVANCED STUDIO / CLIENTS");
 });
}
function voicePage(){
 voice=true;
 const support=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
 const body=section("VOICE / BROWSER BETA","Practise speaking naturally","A microphone-first simulated call. This does not dial real phone numbers or connect to telephone networks.")+
 '<div class="aa-panel">'+aside("Microphone privacy","The browser will ask your permission before recording. Browser speech recognition may process your speech using its vendor's service. Recognised text is not sent to the AI until you press Send.")+
 (support?btn("aa-start-voice","Open voice simulation"):A.empty("Speech recognition not supported","Try Chrome or a supported browser for microphone practice. You can still type a phone-channel simulation."))+'</div>';
 view("Voice Practice","Spoken setter conversations in your browser.",body,"ADVANCED STUDIO / VOICE");
}
action("aa-ai",ai);
action("aa-offers",offerPage);
action("aa-voice",voicePage);
action("aa-start-voice",async()=>{
 voice=true;await ai();const c=$("aaNewChannel");if(c)c.value="phone";
});
action("aa-new-thread",async()=>{
 const d=await api("/api/advanced/threads",json({channel:$("aaNewChannel")?.value||"dm",offer_id:$("aaNewOffer")?.value||null}));
 threads.unshift(d.thread);threadPage(d.thread);
});
action("aa-open-thread",b=>{const t=threads.find(t=>t.id===b.dataset.id);if(t)threadPage(t)});
action("aa-back-ai",ai);
action("aa-open-offer",b=>{const o=offers.find(o=>o.id===b.dataset.id);if(o)notice(o.title+" is available when creating a new simulation.")});
action("aa-save-offer",async()=>{
 const d=await api("/api/advanced/offers",json({title:$("aaOfferTitle")?.value,audience:$("aaOfferAudience")?.value,proposition:$("aaOfferProp")?.value,price_text:$("aaOfferPrice")?.value,objections:($("aaOfferObjections")?.value||"").split("\n").map(x=>x.trim()).filter(Boolean)}));
 notice("Offer saved");return offerPage();
});
document.addEventListener("change",async e=>{
 if(e.target.id!=="aaChannel"||!selected)return;
 const d=await api("/api/advanced/threads/"+encodeURIComponent(selected.id)+"/channel",json({channel:e.target.value},"PATCH"));
 const i=threads.findIndex(t=>t.id===selected.id);if(i>=0)threads[i]=d.thread;threadPage(d.thread);
});
action("aa-send",async()=>{
 if(!selected)return;
 const value=$("aaReply")?.value||"";
 const button=document.querySelector('[data-aa="aa-send"]');
 if(button)button.textContent="Prospect is replying…";
 try{
  const d=await api("/api/advanced/threads/"+encodeURIComponent(selected.id)+"/message",json({message:value}));
  const i=threads.findIndex(t=>t.id===selected.id);if(i>=0)threads[i]=d.thread;
  threadPage(d.thread);
 }finally{if(button?.isConnected)button.textContent="Send message"}
});
action("aa-mic",()=>{
 const Type=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Type)throw Error("Microphone speech recognition is unavailable in this browser");
 if(recognition){recognition.stop();recognition=null;notice("Microphone stopped");return}
 recognition=new Type();recognition.lang="en-GB";recognition.continuous=false;recognition.interimResults=false;
 recognition.onresult=e=>{const words=e.results?.[0]?.[0]?.transcript||"";if($("aaReply"))$("aaReply").value=words;notice("Transcript ready. Review and press Send.")};
 recognition.onerror=()=>{recognition=null;notice("Microphone unavailable or permission declined")};
 recognition.onend=()=>{recognition=null};
 recognition.start();notice("Listening. Speak your message, then review the transcript.");
});
action("aa-read-last",()=>{
 if(!window.speechSynthesis)throw Error("Spoken playback is unavailable");
 const reply=[...(selected?.messages||[])].reverse().find(x=>x.role==="prospect")?.text;
 if(!reply)return notice("No prospect reply yet");
 window.speechSynthesis.cancel();
 const utter=new SpeechSynthesisUtterance(reply);utter.lang="en-GB";utter.rate=1;
 window.speechSynthesis.speak(utter);
});
})();
