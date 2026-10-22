import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {normalizeJob,ukEligible,category,applicationUrl,plain,fetchSource,createJobFeed,INTERVAL_MS} from '../job-feed.js';
const source={provider:'greenhouse',board:'example',company:'Example',key:'greenhouse:example'};
const row={id:123,title:'Appointment Setter',location:{name:'Remote, United Kingdom'},absolute_url:'https://example.com/jobs/123?utm_source=test',content:'<p>Book qualified calls. Experience required.</p>'};
test('UK eligibility excludes overseas roles and ambiguous remote eligibility',()=>{
 assert.equal(ukEligible('South Africa','Calling UK businesses'),false);
 assert.equal(ukEligible('Remote'),false);assert.equal(ukEligible('EMEA'),false);
 assert.equal(ukEligible('Remote','Work from the UK'),true);
 assert.equal(ukEligible('London, United Kingdom'),true);
 assert.equal(ukEligible('Remote, Philippines','Our UK sales team'),false);
});
test('Only setter and related prospecting roles enter the feed',()=>{
 assert.equal(category('Appointment Setter'),'Appointment Setting');
 assert.equal(category('Sales Development Representative'),'SDR / BDR');
 for(const title of ['Sales Development Manager','Head of SDR','Account Executive','Engineering Manager'])assert.equal(category(title),null);
});
test('Normalization preserves real details and never fabricates pay or posting dates',()=>{
 const j=normalizeJob(source,row);assert.equal(j.company,'Example');assert.equal(j.salary_text,'Pay not disclosed');assert.equal(j.posted_at,null);assert.equal(j.workplace_type,'Remote');assert.equal(j.description,'Book qualified calls. Experience required.');assert.equal(j.apply_url,'https://example.com/jobs/123');
 assert.equal(normalizeJob(source,{...row,location:{name:'South Africa'}}),null);
 assert.equal(normalizeJob(source,{...row,absolute_url:'javascript:alert(1)'}),null);
 assert.equal(applicationUrl('https://user:secret@example.com'),null);
 assert.equal(plain('&lt;p&gt;Hello&lt;/p&gt;<script>bad()</script>'),'Hello');
});
test('Valid source snapshots are parsed; failed or malformed responses cannot close jobs',async()=>{
 const ok=await fetchSource(source,async()=>({ok:true,text:async()=>JSON.stringify({jobs:[row]})}));assert.equal(ok.jobs.length,1);
 for(const data of [{}, {jobs:[]},{jobs:[{id:1}]}])await assert.rejects(fetchSource(source,async()=>({ok:true,text:async()=>JSON.stringify(data)})));
 await assert.rejects(fetchSource(source,async()=>({ok:false,status:503})));
});
function harness(fetcher){
 const calls=[];let released=false;
 const client={query:async(sql)=>({rows:[sql.includes('try_advisory')?{locked:true}:{latest:null}]}),release:()=>{released=true}};
 const feed=createJobFeed({pool:{connect:async()=>client},q:async(sql,params)=>{calls.push({sql,params});return {rows:[]}},sources:[source],fetcher});
 return {feed,calls,released:()=>released};
}
test('Sync upserts stable source identity, closes disappeared jobs and throttles public refreshes',async()=>{
 const h=harness(async()=>({ok:true,text:async()=>JSON.stringify({jobs:[row]})}));
 const result=await h.feed.sync();assert.equal(result.imported,1);assert.equal(h.released(),true);
 const insert=h.calls.find(x=>x.sql.startsWith('INSERT INTO opportunities'));assert.match(insert.sql,/ON CONFLICT\(source_key,external_id\)/);assert.equal(insert.params[10],'123');
 const close=h.calls.find(x=>x.sql.includes('NOT (external_id'));assert.deepEqual(close.params,[source.key,['123']]);
 const count=h.calls.length;assert.equal((await h.feed.sync()).skipped,true);assert.equal(h.calls.length,count);
});
test('Source outages retain prior listings and record failure rather than closing the source',async()=>{
 const h=harness(async()=>({ok:false,status:503}));const result=await h.feed.sync();assert.equal(result.failed,1);
 assert.equal(h.calls.some(x=>x.sql.includes('NOT (external_id')),false);
 assert.ok(h.calls.some(x=>x.sql.includes('job_feed_sources')&&x.params.includes('Source HTTP 503')));
 assert.equal(INTERVAL_MS,3600000);
});
test('Concurrent importer requests share a single run',async()=>{
 let release;const wait=new Promise(r=>release=r);let fetches=0;
 const h=harness(async()=>{fetches++;await wait;return {ok:true,text:async()=>JSON.stringify({jobs:[row]})}});
 const a=h.feed.sync();const b=h.feed.sync();release();await Promise.all([a,b]);assert.equal(fetches,1);
});
test('Waking before an import is due does not postpone the next scheduled refresh',async()=>{
 let clock=Date.parse('2026-10-22T19:17:00Z'),fetches=0;
 const client={query:async sql=>({rows:[sql.includes('try_advisory')?{locked:true}:{latest:'2026-10-22T18:29:00Z'}]}),release:()=>{}};
 const feed=createJobFeed({pool:{connect:async()=>client},q:async()=>({rows:[]}),sources:[source],now:()=>clock,fetcher:async()=>{fetches++;return {ok:true,text:async()=>JSON.stringify({jobs:[row]})}}});
 assert.equal((await feed.sync()).skipped,true);assert.equal(fetches,0);
 clock=Date.parse('2026-10-22T19:43:00Z');
 assert.equal((await feed.sync()).imported,1);assert.equal(fetches,1);
});
test('Job board renders escaped employer details, filters results and preserves apply links',async()=>{
 const handlers={},elements=new Map(),views=[];
 const document={readyState:'loading',hidden:false,activeElement:null,addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),getElementById:id=>elements.get(id)||null};
 const jobs=[{id:'1',title:'Appointment Setter',company:'<img src=x>',category:'Appointment Setting',location:'UK remote',workplace_type:'Remote',salary_text:'Pay not disclosed',description:'Book calls',apply_url:'https://example.com/apply',source_key:'a',source_name:'Example careers'},{id:'2',title:'SDR',company:'Example',category:'SDR / BDR',location:'London',salary_text:'£30,000',description:'Prospecting'}];
 const window={accountFetch:async path=>({ok:true,json:async()=>path==='/api/opportunities'?{opportunities:jobs,feed:{last_synced:'2026-10-22T12:00:00Z'}}:{applications:[]}}),openWorkspace:(...args)=>{views.push(args);for(const id of ['liveJobBoard','studioJobKind','studioJobWork','studioJobPay','studioJobFilter'])elements.set(id,{value:''})},toast:()=>{}};
 const context=vm.createContext({window,document,console,Element:class{},setInterval:()=>1,clearInterval:()=>{},URL,Date});
 vm.runInContext(readFileSync(new URL('../public/platform-growth-v11.js',import.meta.url),'utf8'),context);
 await window.showOpportunities();let html=views.at(-1)[2];assert.ok(html.includes('&lt;img src=x&gt;'));assert.ok(!html.includes('<img src=x>'));assert.ok(html.includes('https://example.com/apply'));assert.ok(html.includes('Automatic job feed'));
 const target={id:'studioJobKind',value:'Appointment Setting'};Object.setPrototypeOf(target,context.Element.prototype);
 for(const fn of handlers.change)await fn({target});html=views.at(-1)[2];assert.ok(html.includes('1 matching roles'));assert.ok(!html.includes('<h3>SDR</h3>'));
});
