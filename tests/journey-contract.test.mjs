
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../platform-routes.js",import.meta.url),"utf8")
 .replace(/^import[^\n]*\n/gm,"")
 .replace(/\bexport function\b/g,"function");

function build(data={}){
 const calls=[],handlers={};
 const q=async(sql,params)=>{
  calls.push({sql,params});
  if(sql.includes("SELECT day FROM programme_progress"))return {rows:(data.days||[]).map(day=>({day}))};
  if(sql.includes("SELECT l.id,l.title,l.module_number FROM training_lessons"))return {rows:data.lesson?[data.lesson]:[]};
  if(sql.includes("SELECT COUNT(*)::int total,COUNT(lp.completed_at)"))return {rows:[{total:data.lessonTotal||0,completed:data.lessonComplete||0}]};
  if(sql.includes("status='needs_changes'"))return {rows:data.revision?[{subject:data.revision,feedback:"Please apply the corrections"}]:[]};
  if(sql.includes("COUNT(*)::int pending FROM mentor_submissions"))return {rows:[{pending:data.mentorPending||0}]};
  if(sql.includes("SELECT id,updated_at FROM training_sessions"))return {rows:data.active?[{id:"abc"}]:[]};
  if(sql.includes("SELECT overall_score FROM simulation_results"))return {rows:(data.scores||[]).map(overall_score=>({overall_score}))};
  if(sql.includes("COUNT(*)::int active FROM job_applications"))return {rows:[{active:data.applications||0}]};
  if(sql.includes("SELECT status FROM skill_assessments"))return {rows:data.assessment?[{status:data.assessment}]:[]};
  throw Error("Unexpected query in journey test: "+sql.slice(0,90));
 };
 const app={get(path,auth,handler){handlers[path]=handler},post(){},put(){},patch(){}};
 const register=new Function("q","crypto",source+";return registerPlatformRoutes;")(q,{randomUUID:()=>""});
 register(app,{requireUser:()=>{},requireAdmin:()=>{}});
 return {
  calls,
  invoke:async(user="example-user")=>{
   let status=200,payload=null;
   const res={
    status(n){status=n;return this},
    set(){return this},
    json(body){payload=body;return this}
   };
   await handlers["/api/member/journey"]({user:{id:user}},res);
   return {status,payload};
  }
 };
}
test("A new student sees a truthful foundation plan",async()=>{
 const b=build(),r=await b.invoke();
 assert.equal(r.status,200);
 assert.equal(r.payload.summary.stage,"FOUNDATIONS");
 assert.equal(r.payload.summary.programme_completed,0);
 assert.equal(r.payload.summary.academy_total,0);
 assert.equal(r.payload.summary.next_day,1);
 assert.deepEqual(r.payload.next.map(x=>x.action),["programme","first-rep"]);
 assert.ok(r.payload.next.every(x=>!x.title.toLowerCase().includes("verified")));
});
test("Outstanding mentor work and recoverable sessions take priority",async()=>{
 const b=build({revision:"Rewrite your qualification notes",active:true,
  lesson:{id:"lesson-1",title:"Discovery basics",module_number:5},
  lessonTotal:4,lessonComplete:1,days:[1,2,3],scores:[40,62]});
 const r=await b.invoke();
 assert.deepEqual(r.payload.next.map(x=>x.action),["mentor","resume","lesson"]);
 assert.equal(r.payload.next[2].lesson_id,"lesson-1");
 assert.equal(r.payload.summary.academy_completed,1);
 assert.equal(r.payload.summary.programme_completed,3);
 assert.equal(r.payload.summary.next_day,4);
});
test("Readiness requires the programme and score thresholds—not a rep count alone",async()=>{
 const a=await build({scores:Array(25).fill(85),days:[1,2,3]}).invoke();
 assert.notEqual(a.payload.summary.stage,"TRAINING ROLE READY");
 const b=await build({scores:Array(10).fill(65),days:Array.from({length:30},(_,i)=>i+1)}).invoke();
 assert.equal(b.payload.summary.stage,"TRAINING ROLE READY");
 assert.ok(b.payload.all.some(x=>x.action==="assessment"));
 const c=await build({scores:Array(15).fill(70),days:Array.from({length:35},(_,i)=>i+1)}).invoke();
 assert.equal(c.payload.summary.stage,"INTERVIEW READY");
 const d=await build({scores:Array(15).fill(70),days:Array.from({length:35},(_,i)=>i+1),assessment:"approved"}).invoke();
 assert.ok(!d.payload.all.some(x=>x.action==="assessment"));
});
test("All journey database lookups are scoped to the authenticated member",async()=>{
 const b=build({lesson:{id:"lesson",title:"Next",module_number:1}});
 await b.invoke("student-sentinel");
 assert.equal(b.calls.length,9);
 assert.ok(b.calls.every(x=>x.params.length===1&&x.params[0]==="student-sentinel"));
});
test("Member dashboard imports journey assets and direct lesson actions",()=>{
 const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
 const front=readFileSync(new URL("../public/member-journey-v13.js",import.meta.url),"utf8");
 const academy=readFileSync(new URL("../public/platform-growth-v11.js",import.meta.url),"utf8");
 assert.match(html,/member-journey-v13.js\?v=13/);
 assert.match(html,/member-journey-v13.css\?v=13/);
 assert.match(front,/window\.openAcademyLesson/);
 assert.match(academy,/openAcademyLesson:async/);
 assert.match(front,/YOUR RECORDED TRAINING ACTIVITY/);
});
