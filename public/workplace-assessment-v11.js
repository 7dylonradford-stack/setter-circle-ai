
/* Workplace skill review / real saved simulated shift, no invented performance. */
(function(){
'use strict';
if(window.__setterShiftReviewV11)return;window.__setterShiftReviewV11=true;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function review(){
 const button=$('shiftReviewButton'),result=$('shiftReviewResult');
 if(!button||!result)return;
 button.disabled=true;result.innerHTML='<p class="small muted">Syncing this shift and checking your recorded work…</p>';
 try{
  // Workplace progress autosaves to the authenticated account after changes.
  await new Promise(resolve=>setTimeout(resolve,1100));
  const token=localStorage.getItem('setterAccountToken');
  if(!token)throw Error('Sign in to access your saved assessment');
  const r=await fetch('/api/workplace/assessment',{headers:{'x-account-token':token}}),d=await r.json();
  if(!r.ok)throw Error(d.error||'Review unavailable');
  if(!d.ready){result.innerHTML='<p>'+esc(d.detail)+'</p>';return}
  const points=(d.detail||[]).map(x=>
   '<div class="shift-review-row"><span>'+esc(x.name)+'</span><strong>'+esc(x.value)+' / '+esc(x.target)+'</strong></div>').join('');
  result.innerHTML='<div class="shift-review-summary"><div><span class="ey">WORKPLACE / PRACTICE REVIEW</span>'+
   '<div class="shift-review-number">'+esc(d.score)+'<small>/ 100</small></div><p>Simulated shift evidence score</p></div>'+
   '<div class="shift-review-breakdown">'+points+'</div></div>'+
   (d.feedback?.length?'<div class="stage-note"><h3>Next steps</h3><ul>'+d.feedback.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':
   '<div class="stage-note">Good coverage across the practice shift. Continue with harder conversations and mentor assessment.</div>')+
   '<p class="small muted">'+esc(d.disclaimer||'Practice score only')+'</p>';
 }catch(e){result.textContent=e.message||'Review currently unavailable'}
 finally{button.disabled=false}
}
function init(){
 const report=$('report');if(!report||$('shiftReviewButton'))return;
 const card=document.createElement('section');card.className='card shift-review-card';
 card.innerHTML='<div class="row"><div><div class="ey">SHIFT INTELLIGENCE</div><h2>Review your shift</h2></div>'+
  '<button type="button" class="btn primary" id="shiftReviewButton">Evaluate saved shift ↗</button></div>'+
  '<p class="small muted">Check conversation activity, qualification accuracy, bookings and factual reporting.</p>'+
  '<div id="shiftReviewResult" aria-live="polite"></div>';
 report.appendChild(card);
 $('shiftReviewButton').addEventListener('click',review);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
