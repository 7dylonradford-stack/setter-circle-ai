
(function(){
'use strict';
if(window.__setterRecoveryV11)return;window.__setterRecoveryV11=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(p)=>{const r=await window.accountFetch(p),d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d};
let list=[];
async function showResumeTraining(){
 window.openWorkspace('Resume training','Continue an unfinished AI roleplay after refreshing or leaving the platform.',
 '<div class="studio-loading" role="status">Looking for unfinished sessions…</div>','PRACTICE / RESUME');
 try{
  const d=await api('/api/training/active');list=d.sessions||[];
  const html=list.length?'<div class="studio-list">'+list.map(x=>
   '<button type="button" class="studio-list-row" data-session-restore="'+esc(x.id)+'">'+
   '<span class="studio-list-index">'+esc(String(x.mode||'training').toUpperCase())+'</span>'+
   '<span class="studio-list-copy"><strong>'+esc(x.scenario?.name||'Prospect')+' · '+esc(x.scenario?.role||'Roleplay')+'</strong>'+
   '<small>'+esc((x.transcript||[]).filter(m=>m.role==='student').length)+' messages sent · Updated '+new Date(x.updated_at).toLocaleString('en-GB')+'</small></span>'+
   '<span class="studio-list-state">Resume ↗</span></button>').join('')+'</div>':
   '<div class="studio-empty"><h3>Nothing to resume</h3><p>Start a new practice session. Unfinished sessions are retained for up to 12 hours.</p></div>';
  window.openWorkspace('Resume training','Unfinished AI conversations saved to your account.',html,'PRACTICE / RECOVERY');
 }catch(e){if(window.toast)window.toast(e.message)}
}
window.showResumeTraining=showResumeTraining;
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-session-restore]');if(!b)return;
 const saved=list.find(x=>x.id===b.dataset.sessionRestore);
 if(saved&&typeof window.restoreTrainingSession==='function')window.restoreTrainingSession(saved);
});
})();
