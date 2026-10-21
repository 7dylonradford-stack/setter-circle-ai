import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const script=readFileSync(new URL('../public/experience-demo-v18.js',import.meta.url),'utf8');

function fixture(respond, saved=null){
 const nodes=new Map(),storage=new Map(saved?[['setterCirclePublicDemoV18',JSON.stringify(saved)]]:[]),requests=[];
 function el(id){
  if(nodes.has(id))return nodes.get(id);
  const classes=new Set(),attrs=new Map();
  let text='';
  const node={id,children:[],events:{},value:'',disabled:false,readOnly:false,style:{},className:'',
   classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
   addEventListener(name,fn){this.events[name]=fn;},
   appendChild(child){this.children.push(child);child.parent=this;},replaceChildren(){this.children=[];},
   remove(){this.parent.children=this.parent.children.filter(x=>x!==this);},
   setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),focus(){},scrollIntoView(){}
  };
  Object.defineProperty(node,'textContent',{get:()=>text,set:value=>{text=String(value);node.children=[];}});
  nodes.set(id,node);return node;
 }
 const context={document:{getElementById:el,createElement:()=>el('bubble-'+Math.random())},crypto:webcrypto,AbortController,setTimeout,clearTimeout,
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{matchMedia:()=>({matches:true})},
  fetch:async(url,options)=>{
   const body=JSON.parse(options.body);if(url.endsWith('/event'))return {ok:true,json:async()=>({})};
   requests.push({url,body});const result=await respond(url,body);
   return {ok:result.status<400,status:result.status,json:async()=>result.data};
  }
 };
 vm.runInNewContext(script,context);
 return {el,requests,storage,input:async value=>{el('chatInput').value=value;el('chatInput').events.input();},click:id=>el(id).events.click.call(el(id))};
}
const snapshot={session_id:'fixture-session',opening:'What is this about?',max_turns:4,messages:[],remaining:4,finished:false};

test('A failed send restores the draft and a successful retry leaves one user bubble',async()=>{
 let attempts=0;
 const f=fixture(async url=>url.endsWith('/start')?{status:200,data:snapshot}:++attempts===1?{status:503,data:{error:'Temporary outage',code:'DEMO_UNAVAILABLE'}}:{status:200,data:{reply:'Most clients come through referrals.',turn:1,remaining:3}});
 await f.click('startBtn');await f.input('How do your new clients find you?');await f.click('sendBtn');
 assert.equal(f.el('chatInput').value,'How do your new clients find you?');assert.equal(f.el('chatMessages').children.length,1);assert.equal(f.el('sendBtn').disabled,false);
 await f.click('sendBtn');assert.equal(f.el('chatMessages').children.length,3);assert.equal(f.el('chatInput').value,'');
 const messages=f.requests.filter(r=>r.url.endsWith('/message'));assert.equal(messages[0].body.request_id,messages[1].body.request_id);
});

test('Expired sessions show a working restart control and preserve the unsent draft',async()=>{
 const f=fixture(async url=>url.endsWith('/message')?{status:404,data:{code:'DEMO_SESSION_EXPIRED'}}:{status:200,data:snapshot});
 await f.click('startBtn');await f.input('How is your current lead follow-up working?');await f.click('sendBtn');
 assert.equal(f.el('chatInput').disabled,true);assert.equal(f.el('startBtn').classList.contains('hidden'),false);assert.equal(f.el('startBtn').textContent,'Restart demo');
 assert.equal(f.el('finishBtn').classList.contains('hidden'),true);assert.match(f.el('chatMessage').textContent,/Restart demo/);
 await f.click('startBtn');assert.equal(f.el('chatInput').disabled,false);assert.equal(f.el('chatInput').value,'How is your current lead follow-up working?');
});

test('Rapid submission is disabled while a reply is in progress',async()=>{
 let release;
 const f=fixture(url=>url.endsWith('/start')?{status:200,data:snapshot}:new Promise(resolve=>release=()=>resolve({status:200,data:{reply:'Through referrals.',remaining:3,turn:1}})));
 await f.click('startBtn');await f.input('Where do new agency clients come from?');const first=f.click('sendBtn');
 await f.click('sendBtn');assert.equal(f.requests.filter(r=>r.url.endsWith('/message')).length,1);assert.equal(f.el('sendBtn').disabled,true);
 release();await first;assert.equal(f.el('chatMessages').children.length,3);
});

test('A restored accepted retry clears its draft and displays the real transcript',async()=>{
 const pending={id:'accepted-request',text:'What are your lead sources?'};
 const f=fixture(async()=>({status:200,data:{...snapshot,messages:[{request_id:pending.id,user:pending.text,prospect:'Mostly referrals.'}],remaining:3}}),{id:snapshot.session_id,draft:pending.text,pending});
 await new Promise(setImmediate);
 assert.equal(f.requests.length,1);assert.ok(f.requests[0].url.endsWith('/resume'));assert.equal(f.el('chatMessages').children.length,3);assert.equal(f.el('chatInput').value,'');assert.equal(f.el('finishBtn').disabled,false);
});

test('Feedback is usable, including a zero score, and another demo can be started',async()=>{
 const feedback={score:0,strengths:['No clear strength yet.'],improvements:['Ask a relevant question.'],disclaimer:'Practice estimate.',turns:1};
 const f=fixture(async url=>url.endsWith('/start')?{status:200,data:snapshot}:url.endsWith('/finish')?{status:200,data:feedback}:{status:200,data:{reply:'What do you mean?',remaining:3,turn:1}});
 await f.click('startBtn');assert.equal(f.el('finishBtn').disabled,true);await f.input('Hello');await f.click('sendBtn');await f.click('finishBtn');
 assert.equal(f.el('score').textContent,'0 / 100');assert.equal(f.el('feedback').style.display,'block');assert.equal(f.el('chatInput').disabled,true);assert.equal(f.el('startBtn').textContent,'Try another demo');
 await f.click('startBtn');assert.equal(f.el('feedback').style.display,'none');assert.equal(f.el('finishBtn').disabled,true);
});
