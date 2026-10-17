
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
const training=read("advanced-training-routes.js");
const community=read("advanced-community-routes.js");
const career=read("advanced-career-routes.js");
const admin=read("advanced-admin-routes.js");
const db=read("db.js"),index=read("public/index.html");
const shell=read("public/member-shell.js"),pwa=read("public/sw.js");
const ai=read("public/advanced-ai-v12.js");
const pub=read("public/portfolio.html");
const js=read("public/advanced-admin-v12.js");
test("Advanced models are persisted rather than kept in memory only",()=>{
 for(const table of ["advanced_offers","advanced_threads","studio_workshops","studio_peer_rooms","studio_portfolios","studio_job_projects","studio_progress","studio_outcomes","studio_settings"])
  assert.ok(db.includes("CREATE TABLE IF NOT EXISTS "+table));
});
test("All advanced APIs are registered behind the existing access middlewares",()=>{
 for(const text of [training,community,career,admin])assert.match(text,/requireUser/);
 for(const name of ["registerAdvancedTraining","registerCommunityStudio","registerCareerStudio","registerAdvancedAdmin"])
  assert.ok(read("server.js").includes(name+"(app,"));
});
test("AI practice messages and offers are account-owned",()=>{
 assert.match(training,/WHERE id=\$1 AND user_id=\$2/);
 assert.match(training,/UPDATE advanced_threads SET messages/);
 assert.match(training,/req\.user\.id/);
 assert.match(training,/429/);
});
test("Community practice transcripts require room membership",()=>{
 assert.match(community,/host_user_id=\$2 OR guest_user_id=\$2/);
 assert.match(community,/status='active'/);
});
test("Portfolio is public only through an opaque opt-in link",()=>{
 assert.match(career,/public_token=\$1 AND p\.published=TRUE/);
 assert.match(career,/selected_evidence/);
 assert.ok(!career.includes("p.email"));
 assert.match(pub,/student-selected learning portfolio/i);
});
test("Employer reviews and verified outcomes require admins",()=>{
 assert.match(career,/admin\/projects\/reviews.*requireAdmin/);
 assert.match(career,/admin\/outcomes.*requireAdmin/);
 assert.match(admin,/admin\/analytics.*requireAdmin/);
});
test("New client screens and navigation are connected",()=>{
 for(const name of ["advanced-hub-v12.js","advanced-ai-v12.js","advanced-career-v12.js","advanced-community-v12.js","advanced-admin-v12.js"])assert.ok(index.includes(name));
 assert.match(read('public/member-experience-v15.js'),/showAdvancedStudio/);
 assert.match(ai,/SpeechRecognition/);
 assert.match(ai,/recognition\.start\(\)/);
});
test("PWA caches only non-API static assets",()=>{
 assert.match(pwa,/req\.method!=="GET"/);
 assert.match(pwa,/url\.pathname\.startsWith\("\/api\/"\)/);
 assert.match(pwa,/req\.mode==="navigate"/);
});
test("Student preferences do not lead into admin-only area",()=>{
 assert.match(js,/Preferences saved"\);return A\.home\(\)/);
});
test("Admin outcome decisions re-render their review queue",()=>{
 assert.match(js,/return renderOutcomeQueue\(\)/);
});
