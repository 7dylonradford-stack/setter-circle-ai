import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const shell=load("public/member-shell.js"),home=load("public/index.html");
const workplace=load("public/workplace.html"),routes=load("platform-routes.js");
const db=load("db.js"),academy=load("public/platform-growth-v11.js");
const bundle=load("scripts/build-member-css.mjs");
test("Member CSS is consolidated at startup from the original ordered layers",()=>{
 assert.match(home,/href="\/member-ui-v15.css\?v=15"/);
 assert.equal((home.match(/<link rel="stylesheet"/g)||[]).length,1);
 assert.match(bundle,/member-signature-v7.css/);
 assert.match(bundle,/member-journey-v13.css/);
 assert.match(bundle,/member-design-v15.css/);
 assert.match(load("package.json"),/build:styles/);
});
test("Practice section has three focused destinations without discarding the replay tools",()=>{
 const match=shell.match(/practice:\{eyebrow:[\s\S]*?\},\s*progress:\{/);
 assert.ok(match);
 assert.equal((match[0].match(/\['(?:practice|career|coach)'/g)||[]).length,3);
 assert.match(match[0],/showPracticeStudio/);
 const hub=load("public/member-experience-v15.js");
 for(const name of ["showReplayStudio","showResumeTraining","showPersonalCoach","showAdvancedStudio"])
  assert.ok(hub.includes(name));
 assert.match(home,/member-experience-v15.js\?v=15/);
});
test("The landing page leads with a free practice preview and avoids unverified numerical outcome claims",()=>{
 assert.match(home,/href="\/experience.html#demo">Thinking of joining\? →<\/a>/);
 assert.doesNotMatch(home,/<b>20\+<\/b>students landed roles/);
 assert.match(home,/Fictional practice prospect/);
});
test("Academy quiz answers are evaluated server-side before completion",()=>{
 assert.match(db,/CREATE TABLE IF NOT EXISTS lesson_knowledge_checks/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS lesson_check_attempts/);
 assert.match(routes,/app.get\("\/api\/academy\/lessons\/:id\/check"/);
 assert.match(routes,/app.post\("\/api\/academy\/lessons\/:id\/check"/);
 assert.match(routes,/app.put\("\/api\/admin\/academy\/lessons\/:id\/check",requireAdmin/);
 assert.match(routes,/Pass this lesson's knowledge check before marking it complete/);
 const publicRoute=routes.slice(routes.indexOf('app.get("/api/academy/lessons/:id/check"'),routes.indexOf('app.post("/api/academy/lessons/:id/check"'));
 assert.doesNotMatch(publicRoute,/answer_index/);
});
test("Admin authors questions while students see meaningful feedback",()=>{
 assert.match(academy,/submit-check/);
 assert.match(academy,/save-knowledge-check/);
 assert.match(academy,/studioLessonCheck/);
 assert.match(academy,/knowledge check published/i);
});
test("Virtual Workplace prioritises real Academy training over twenty placeholders",()=>{
 assert.match(workplace,/class="btn workplace-academy-link"/);
 assert.doesNotMatch(workplace,/data-tab="videos">Training videos/);
 assert.match(workplace,/workplace-ux-v15.css\?v=15/);
});
test("Mentor review sorts actionable human feedback first",()=>{
 assert.match(academy,/const urgent=mentor\.filter/);
 assert.match(academy,/const sorted=\[\.\.\.mentor\]\.sort/);
 assert.match(academy,/Acknowledging feedback does not count as approval/);
});
test("Experience page uses the same marketing accent",()=>{
 const page=load("public/experience.html");
 assert.match(page,/href="\/site-unified-v15.css\?v=15"/);
 assert.match(page,/--green:#D0F83B/);
});
