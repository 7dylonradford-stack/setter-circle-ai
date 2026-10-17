import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const worker=readFileSync(new URL("../public/sw.js",import.meta.url),"utf8");
function extract(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert.ok(a!==-1&&b>a,"Login function anchors exist");
 return html.slice(a,b);
}
function dom(){
 const nodes=new Map();
 function el(id){
  if(!nodes.has(id)){
   const classes=new Set(id==="profilePanel"?["hidden"]:[]);
   nodes.set(id,{style:{},textContent:"",innerHTML:"",disabled:false,
    classList:{contains:v=>classes.has(v),add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,flag)=>flag?classes.add(v):classes.delete(v)}
   });
  }
  return nodes.get(id);
 }
 return {el,nodes};
}
const loader=extract("async function loadAccount(){","async function logoutAccount()");
test("Successful sign-in still opens dashboard when optional skills metrics fail",async()=>{
 const {el}=dom();
 const user={name:"Test student",email:"test@example.invalid",role:"student",xp:0,streak:0};
 const fn=new Function("accountFetch","fetch","$","accountToken","escapeHtml","console",loader+";return loadAccount")(
  async url=>{assert.equal(url,"/api/account/me");return {ok:true,json:async()=>({user,history:[]})}},
  async()=>{throw Error("Metrics unavailable")},el,"example-token",String,{warn(){}}
 );
 assert.equal(await fn(),true);
 assert.equal(el("profilePanel").classList.contains("hidden"),false);
 assert.equal(el("authPanel").classList.contains("hidden"),true);
 assert.equal(el("accountWelcome").textContent,user.email);
});
test("Invalid session returns to a usable login panel",async()=>{
 const {el}=dom();
 const fn=new Function("accountFetch","fetch","$","accountToken","escapeHtml","console",loader+";return loadAccount")(
  async()=>{throw Error("Sign in again")},async()=>{},el,"stale-token",String,{warn(){}}
 );
 assert.equal(await fn(),false);
 assert.equal(el("authPanel").classList.contains("hidden"),false);
 assert.equal(el("profilePanel").classList.contains("hidden"),true);
 assert.match(el("accountError").textContent,/Sign in again/);
});
test("Login form handles mobile Enter and reports errors while allowing retry",()=>{
 assert.match(html,/id="accountEmail"[^>]*autocomplete="email"/);
 assert.match(html,/id="accountPassword"[^>]*autocomplete="current-password"/);
 assert.match(html,/id="accountPassword"[^>]*onkeydown="[^"]*submitAccount\(\)/);
 assert.match(html,/if\(b\.disabled\)return/);
 assert.match(html,/finally\{b\.disabled=false;b\.removeAttribute\('aria-busy'\)/);
});
test("Service worker uses fresh scripts first and never caches account requests",()=>{
 assert.match(worker,/setter-static-v16/);
 assert.match(worker,/fetch\(req,\{cache:"no-store"\}\)/);
 assert.match(worker,/url\.pathname\.startsWith\("\/api\/"\)/);
 assert.match(worker,/req\.mode==="navigate"/);
 assert.doesNotMatch(worker,/return cached\|\|fresh/);
});
