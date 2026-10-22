import crypto from 'node:crypto';

// Public employer ATS feeds. Never fetch an application URL or user-supplied host.
export const SOURCES = [
 ['greenhouse','scileads','SciLeads'],['greenhouse','conga','Conga'],
 ['greenhouse','deliveroo','Deliveroo'],['greenhouse','triplewhale','Triple Whale'],
 ['greenhouse','brandwatch','Brandwatch'],['greenhouse','canonical','Canonical'],
 ['greenhouse','guidepoint','Guidepoint'],['greenhouse','endorlabs','Endor Labs'],
 ['greenhouse','opensesame','OpenSesame'],['greenhouse','doitintl','DoiT'],
 ['greenhouse','braze','Braze'],['greenhouse','align','A-LIGN'],
 ['greenhouse','showpad','Showpad'],['greenhouse','recordedfuture','Recorded Future'],
 ['greenhouse','aircallioinc','Aircall'],['greenhouse','veeamsoftware','Veeam'],
 ['greenhouse','coreview','CoreView'],['greenhouse','vercel','Vercel'],
 ['lever','extremenetworks','Extreme Networks'],['lever','endpointclinical','Endpoint Clinical'],
 ['lever','insiderone','Insider One'],['lever','doxel','Doxel'],
 ['lever','brightedge','BrightEdge'],['lever','controlup','ControlUp'],
 ['ashby','andela','Andela'],['ashby','webflow','Webflow'],
 ['ashby','streetgroup','Street Group'],['ashby','dataro','Dataro'],
 ['ashby','Bobyard','Bobyard'],['ashby','chattermill','Chattermill'],
 ['ashby','nylon','Nylon'],['ashby','paddle','Paddle'],
 ['ashby','rillet','Rillet'],['ashby','pandektes','Pandektes'],
 ['ashby','splose','splose'],['ashby','Fonio','fonio'],
 ['workable','huzzle','Huzzle'],['workable','ubteam','Universal Business Team'],
].map(([provider,board,company])=>({provider,board,company,key:provider+':'+board}));
export const INTERVAL_MS=60*60*1000;
export function sourceUrl(s){
 if(s.provider==='greenhouse')return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(s.board)}/jobs?content=true`;
 if(s.provider==='lever')return `https://api.lever.co/v0/postings/${encodeURIComponent(s.board)}?mode=json`;
 if(s.provider==='ashby')return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(s.board)}?includeCompensation=true`;
 if(s.provider==='workable')return `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(s.board)}/jobs`;
 throw new Error('Unsupported feed');
}
export function plain(value){return String(value||'').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
export function category(title){
 const t=plain(title);
 if(/\b(manager|director|head of|vice president|vp|account executive|talent pool|talent network)\b/i.test(t))return null;
 if(/appointment\s*(setter|setting|booker)|(?:DM|chat|phone|call)\s+setter/i.test(t))return 'Appointment Setting';
 if(/sales development representative|business development representative|\b(?:SDR|BDR)\b/i.test(t))return 'SDR / BDR';
 return null;
}
const UK=/\b(united kingdom|UK|U\.K\.|great britain|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|belfast|cardiff|nottingham|sheffield|liverpool|newcastle|doncaster|reading|cambridge|oxford|brighton|hull)\b/i;
const OTHER=/\b(united states|USA|U\.S\.|south africa|philippines|india|germany|france|canada|australia|new york|san francisco|paris|berlin|toronto|singapore)\b/i;
export function ukEligible(location,description=''){
 if(OTHER.test(location)&&!/\b(united kingdom|UK|U\.K\.|great britain|england|scotland|wales|northern ireland)\b/i.test(location))return false;
 if(UK.test(location))return true;
 if(OTHER.test(location))return false;
 // "Remote" or "EMEA" alone does not establish UK eligibility.
 return /\b(worldwide|anywhere in the world|global remote)\b/i.test(location)||
  (/\b(remote|EMEA|europe)\b/i.test(location)&&/\b(?:based|living|located|reside|work|hiring|remote)\s+(?:anywhere\s+)?(?:in|from|across|within)\s+(?:the\s+)?(?:UK|United Kingdom)\b/i.test(description));
}
export function applicationUrl(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(/^(utm_|gh_src$|source$)/i.test(k))u.searchParams.delete(k);return u.href}catch{return null}}
const iso=x=>{if(!x)return null;const d=new Date(x);return Number.isNaN(d.getTime())?null:d.toISOString()};
export function normalizeJob(source,raw){
 const title=plain(raw.title||raw.text).slice(0,240),kind=category(title);if(!kind)return null;
 const locations=source.provider==='ashby'?[raw.location,...(raw.secondaryLocations||[]).map(x=>x.location)]:source.provider==='lever'?[raw.categories?.location]:[raw.location?.name];
 const location=locations.filter(Boolean).join(' / '),description=plain(raw.descriptionPlain||raw.descriptionPlainText||raw.content||raw.descriptionHtml||raw.description);
 if(!ukEligible(location,description))return null;
 if(raw.isListed===false)return null;
 const url=applicationUrl(raw.absolute_url||raw.hostedUrl||raw.jobUrl||raw.applyUrl);if(!url||!raw.id)return null;
 const remote=raw.isRemote===true||/^remote$/i.test(raw.workplaceType)||/\bremote\b/i.test(location)?'Remote':/hybrid/i.test(raw.workplaceType||location)?'Hybrid':'See employer';
 const salary=raw.salaryRange;
 let pay='';
 if(salary&&Number.isFinite(salary.min)&&Number.isFinite(salary.max))pay=`${salary.currency||''} ${salary.min.toLocaleString('en-GB')}–${salary.max.toLocaleString('en-GB')} / ${salary.interval||'period'}`;
 if(!pay)pay=plain(raw.compensation?.compensationTierSummary||raw.compensation?.scrapeableCompensationSalarySummary).slice(0,350);
 if(!pay&&/commission[ -]only/i.test(description))pay='Commission only — see employer for rates';
 return {external_id:String(raw.id),title,company:source.company,description:description.slice(0,6000)||'Read the employer listing for the full responsibilities and requirements.',location:location.slice(0,350),apply_url:url,salary_text:pay||'Pay not disclosed',category:kind,workplace_type:remote,posted_at:iso(raw.publishedAt||raw.createdAt),source_updated_at:iso(raw.updated_at),source_key:source.key,source_name:source.company+' careers',source_url:sourceUrl(source)};
}
export async function fetchSource(source,fetcher=fetch){
 if(source.provider==='workable')return fetchWorkable(source,fetcher);
 const response=await fetcher(sourceUrl(source),{signal:AbortSignal.timeout(18000),redirect:'error',headers:{Accept:'application/json','User-Agent':'SetterCircleJobBoard/1.0'}});
 if(!response.ok)throw new Error('Source HTTP '+response.status);
 const text=await response.text();if(text.length>12000000)throw new Error('Source response too large');
 const data=JSON.parse(text),raw=source.provider==='lever'?data:data.jobs;
 if(!Array.isArray(raw)||raw.length>15000)throw new Error('Invalid source snapshot');
 // Treat malformed/empty snapshots as failure so they cannot close existing jobs.
 if(!raw.length)throw new Error('Empty source snapshot');
 if(raw.some(x=>!x||typeof x!=='object'||x.id==null||!(x.title||x.text)))throw new Error('Malformed source listing');
 return {ids:raw.map(x=>String(x.id)),jobs:raw.map(x=>normalizeJob(source,x)).filter(Boolean)};
}
async function fetchWorkable(source,fetcher){
 let token=null,raw=[],complete=false;
 for(let page=0;page<12;page++){
  const r=await fetcher(sourceUrl(source),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:'appointment',...(token?{token}:{})}),signal:AbortSignal.timeout(18000),redirect:'error'});
  if(!r.ok)throw new Error('Source HTTP '+r.status);
  const data=await r.json();if(!Array.isArray(data.results))throw new Error('Invalid source snapshot');
  raw.push(...data.results);if(!data.nextPage){complete=true;break;}if(data.nextPage===token)throw new Error('Source pagination stalled');token=data.nextPage;
 }
 if(!complete||!raw.length)throw new Error('Incomplete source snapshot');
 const jobs=[];
 for(const item of raw){
  const location=(item.locations?.length?item.locations:[item.location]).filter(x=>x&&!x.hidden).map(x=>[x.city,x.country].filter(Boolean).join(', ')).join(' / ');
  if(item.isInternal||item.state!=='published'||!category(item.title)||!ukEligible(location))continue;
  if(!/^[A-Z0-9]+$/i.test(item.shortcode))throw new Error('Invalid job reference');
  const url=`https://apply.workable.com/api/v2/accounts/${encodeURIComponent(source.board)}/jobs/${encodeURIComponent(item.shortcode)}`;
  const r=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000),redirect:'error'});
  if(!r.ok)throw new Error('Job detail HTTP '+r.status);
  const detail=await r.json();
  const normalized=normalizeJob({...source,provider:'greenhouse'},{id:item.id,title:item.title,location:{name:location},content:detail.description,absolute_url:`https://apply.workable.com/${source.board}/j/${item.shortcode}/`,publishedAt:item.published,workplaceType:item.remote?'remote':item.workplace});
  if(normalized)jobs.push({...normalized,source_url:sourceUrl(source)});
 }
 return {ids:raw.map(x=>String(x.id)),jobs};
}
export function createJobFeed({pool,q,sources=SOURCES,fetcher=fetch,now=()=>Date.now()}){
 let running=null,lastAttempt=0,timer;
 async function sync(force=false){
  if(!pool)return {enabled:false};
  if(running)return running;
  if(!force&&now()-lastAttempt<INTERVAL_MS)return {skipped:true};
  lastAttempt=now();
  running=(async()=>{
   const client=await pool.connect();let locked=false;
   const summary={enabled:true,sources:sources.length,succeeded:0,failed:0,imported:0};
   try{
    locked=(await client.query('SELECT pg_try_advisory_lock(739121084) locked')).rows[0]?.locked;
    if(!locked)return {skipped:true};
    if(!force){const r=await client.query('SELECT MAX(attempted_at) latest FROM job_feed_sources');if(r.rows[0]?.latest&&now()-new Date(r.rows[0].latest).getTime()<INTERVAL_MS-60000){lastAttempt=new Date(r.rows[0].latest).getTime();return {skipped:true};}}
    const queue=[...sources];
    await Promise.all(Array.from({length:3},async()=>{while(queue.length){const source=queue.shift();
     try{
      const snap=await fetchSource(source,fetcher);
      for(const j of snap.jobs){
       await q(`INSERT INTO opportunities(id,title,company,description,type,location,apply_url,salary_text,category,source_key,external_id,source_name,source_url,workplace_type,posted_at,source_updated_at,last_seen_at,active)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),TRUE)
        ON CONFLICT(source_key,external_id) DO UPDATE SET title=EXCLUDED.title,company=EXCLUDED.company,description=EXCLUDED.description,location=EXCLUDED.location,apply_url=EXCLUDED.apply_url,salary_text=EXCLUDED.salary_text,category=EXCLUDED.category,workplace_type=EXCLUDED.workplace_type,posted_at=COALESCE(EXCLUDED.posted_at,opportunities.posted_at),source_updated_at=EXCLUDED.source_updated_at,last_seen_at=NOW(),active=TRUE`,[crypto.randomUUID(),j.title,j.company,j.description,j.category==='Appointment Setting'?'Appointment Setter':'SDR / BDR',j.location,j.apply_url,j.salary_text,j.category,j.source_key,j.external_id,j.source_name,j.source_url,j.workplace_type,j.posted_at,j.source_updated_at]);
       summary.imported++;
      }
      // Only a successful full snapshot can close jobs belonging to that source.
      // IDs excluded by eligibility/title changes are also retired.
      await q('UPDATE opportunities SET active=FALSE WHERE source_key=$1 AND NOT (external_id=ANY($2::text[]))',[source.key,snap.jobs.map(j=>j.external_id)]);
      await q(`INSERT INTO job_feed_sources(source_key,source_name,attempted_at,succeeded_at,job_count,error) VALUES($1,$2,NOW(),NOW(),$3,NULL) ON CONFLICT(source_key) DO UPDATE SET attempted_at=NOW(),succeeded_at=NOW(),job_count=$3,error=NULL`,[source.key,source.company,snap.jobs.length]);
      summary.succeeded++;
     }catch(e){
      summary.failed++;
      await q(`INSERT INTO job_feed_sources(source_key,source_name,attempted_at,error) VALUES($1,$2,NOW(),$3) ON CONFLICT(source_key) DO UPDATE SET attempted_at=NOW(),error=$3`,[source.key,source.company,String(e.message).slice(0,200)]);
     }
    }}));
    // Stop publishing stale jobs after a prolonged source outage; keep applications.
    await q("UPDATE opportunities SET active=FALSE WHERE source_key IS NOT NULL AND last_seen_at<NOW()-INTERVAL '72 hours'");
    console.log('Job feed sync',JSON.stringify(summary));return summary;
   }finally{if(locked)await client.query('SELECT pg_advisory_unlock(739121084)').catch(()=>{});client.release();}
  })().finally(()=>{running=null});return running;
 }
 function kick(){sync().catch(e=>console.error('Job feed unavailable:',e.message));}
 function start(){if(!pool||timer)return;kick();timer=setInterval(kick,INTERVAL_MS);timer.unref?.();}
 function stop(){clearInterval(timer);timer=null;}
 return {sync,kick,start,stop};
}
