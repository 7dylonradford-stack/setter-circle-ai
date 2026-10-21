import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import {registerExperience} from '../experience.js';
import {createDemoStore,DEMO_TTL_MS} from '../experience-demo-store.js';

async function fixture(t, reply=async()=>({output_text:'Most of our new clients come from referrals.'}), store=createDemoStore()) {
  const app=express();app.set('trust proxy',1);app.use(express.json());
  let calls=0;
  registerExperience(app,{responses:{create:async(...args)=>{calls++;return reply(...args);}}},(_req,res)=>res.sendStatus(403),{demoStore:store});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin='http://127.0.0.1:'+server.address().port;
  let cookie='';
  async function request(action,body={},ip='203.0.113.1',withCookie=true){
    const r=await fetch(origin+'/api/experience/demo/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip,...(withCookie&&cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return {status:r.status,data:await r.json(),cookieHeader:r.headers.get('set-cookie')};
  }
  return {request,get calls(){return calls;},store};
}
process.env.OPENAI_API_KEY ||= 'local-demo-test-placeholder';

test('A demo survives a changing mobile IP while another browser cannot read it',async t=>{
  const f=await fixture(t),start=await f.request('start');
  assert.equal(start.status,200);assert.match(start.cookieHeader,/HttpOnly/);assert.match(start.cookieHeader,/SameSite=Strict/);
  const session_id=start.data.session_id,request_id=crypto.randomUUID();
  const reply=await f.request('message',{session_id,request_id,message:'How does your agency find new clients?'},'203.0.113.99');
  assert.equal(reply.status,200);assert.equal(reply.data.remaining,3);
  const stranger=await f.request('resume',{session_id},'203.0.113.99',false);
  assert.equal(stranger.status,404);assert.equal(stranger.data.code,'DEMO_SESSION_EXPIRED');assert.equal(f.calls,1);
});

test('Retrying an accepted message does not repeat the AI call or spend a turn',async t=>{
  const f=await fixture(t),{data}=await f.request('start');
  const body={session_id:data.session_id,request_id:crypto.randomUUID(),message:'What does your current client pipeline look like?'};
  const first=await f.request('message',body),retry=await f.request('message',body,'203.0.113.2');
  assert.equal(first.status,200);assert.deepEqual(retry.data,first.data);assert.equal(f.calls,1);
  assert.equal((await f.request('resume',{session_id:data.session_id})).data.messages.length,1);
  assert.equal((await f.request('message',{...body,message:'A different question using the same request.'})).status,409);
});

test('Overlapping submissions cannot generate two replies',async t=>{
  let release,entered;const started=new Promise(resolve=>entered=resolve);
  const f=await fixture(t,()=>{entered();return new Promise(resolve=>release=()=>resolve({output_text:'Could you explain what you mean?'}));});
  const {data}=await f.request('start');
  const body={session_id:data.session_id,request_id:crypto.randomUUID(),message:'How do new enquiries reach your agency?'};
  const first=f.request('message',body);await started;
  const second=await f.request('message',{...body,request_id:crypto.randomUUID()});
  assert.equal(second.status,409);assert.equal(second.data.code,'DEMO_BUSY');release();
  assert.equal((await first).status,200);assert.equal(f.calls,1);
});

test('An AI failure releases the session and a retry preserves the turn allowance',async t=>{
  let failed=false;
  const f=await fixture(t,async()=>{if(!failed){failed=true;throw new Error('Fixture outage');}return {output_text:'Usually through referrals.'};});
  const {data}=await f.request('start');
  const body={session_id:data.session_id,request_id:crypto.randomUUID(),message:'Where do most new clients find your agency?'};
  assert.equal((await f.request('message',body)).status,503);
  const retry=await f.request('message',body);assert.equal(retry.status,200);assert.equal(retry.data.remaining,3);
});

test('The four-turn cap and completed feedback remain consistent after retries',async t=>{
  const f=await fixture(t),{data}=await f.request('start'),session_id=data.session_id;
  const body={session_id,request_id:crypto.randomUUID(),message:'How do your current leads turn into booked appointments?'};
  for(let i=0;i<4;i++)assert.equal((await f.request('message',{...body,request_id:crypto.randomUUID()})).data.remaining,3-i);
  assert.equal((await f.request('message',body)).data.code,'DEMO_FINISHED');
  const first=await f.request('finish',{session_id}),retry=await f.request('finish',{session_id});
  assert.equal(first.status,200);assert.equal(first.data.turns,4);assert.deepEqual(retry.data,first.data);
  const restored=await f.request('resume',{session_id});assert.equal(restored.data.messages.length,0);assert.deepEqual(restored.data.feedback,first.data);
  assert.equal(f.calls,4);
});

test('Sessions expire after inactivity and an expired lease cannot overwrite a new request',async()=>{
  let now=100;const store=createDemoStore(null,()=>now),id=crypto.randomUUID(),owner='fixture-owner';
  await store.create(id,owner,{messages:[]});const first=await store.acquire(id,owner);
  now+=46000;const second=await store.acquire(id,owner);
  await assert.rejects(store.save(id,owner,first.lease,{messages:['stale']}));
  await store.save(id,owner,second.lease,{messages:['current']});
  now+=DEMO_TTL_MS+1;assert.equal(await store.read(id,owner),null);assert.equal((await store.acquire(id,owner)).error,'expired');
  await store.cleanup();
});

test('Restoring a session does not consume another free start',async t=>{
  const f=await fixture(t),{data}=await f.request('start');
  for(let i=0;i<5;i++)assert.equal((await f.request('resume',{session_id:data.session_id})).status,200);
  assert.equal((await f.request('start')).status,200);assert.equal((await f.request('start')).status,200);assert.equal((await f.request('start')).status,429);
});
