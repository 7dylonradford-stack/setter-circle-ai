import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const read=p=>readFileSync(path.join(process.cwd(),p),'utf8');
const server=read('server.js');
const db=read('db.js');
const routes=read('platform-routes.js');
const shell=read('public/member-shell.js');
const atelier=read('public/member-atelier-v9.js');
const index=read('public/index.html');
const main=read('public/platform-growth-v11.js');
const typing=read('public/room-typing-v10.js');
test('Progression counts every completed simulation',()=>{
 assert.match(server,/FROM simulation_results WHERE user_id=\$1 ORDER BY created_at DESC/);
 assert.doesNotMatch(server,/SELECT scores,overall_score FROM simulation_results WHERE user_id=\$1 ORDER BY created_at DESC LIMIT 30/);
});
test('Roleplay sessions belong to an account and persist',()=>{
 assert.match(server,/user_id:req\.user\.id,mode/);
 assert.match(server,/loadTrainingSession\(req\.body\.session_id,req\.user\)/);
 assert.match(server,/storeTrainingSession\(id,createdSession\)/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS training_sessions/);
});
test('Active session recovery does not disclose the private prospect brief',()=>{
 const route=server.slice(server.indexOf('app.get("/api/training/active"'),server.indexOf('app.post("/api/session"'));
 assert.ok(route.includes('name:x.state.scenario.name'));
 assert.ok(!route.includes('brief:x.state.scenario.brief'));
});
test('Roleplay feedback uses correct student and prospect roles',()=>{
 assert.match(server,/x.role==="student"\|\|x.role==="user"/);
 assert.match(server,/x.role==="prospect"\|\|x.role==="assistant"/);
});
test('Academy supports published lessons and completion',()=>{
 assert.match(routes,/\/api\/academy\/lessons/);
 assert.match(routes,/\/api\/admin\/academy\/lessons/);
 assert.match(routes,/\/academy\/lessons\/:id\/complete/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS training_lessons/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS lesson_progress/);
});
test('Mentorship and certificates require human approval',()=>{
 assert.match(routes,/\/api\/mentor\/submissions/);
 assert.match(routes,/\/api\/admin\/mentor\/submissions/);
 assert.match(routes,/\/api\/admin\/assessments\/:id/);
 assert.match(routes,/req\.user\.id/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS earned_certificates/);
});
test('Career applications and weekly reviews are account scoped',()=>{
 assert.match(routes,/\/api\/job-applications/);
 assert.match(routes,/\/api\/weekly-reviews/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS job_applications/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS weekly_reviews/);
});
test('Practice navigation includes recovery and removes illustration tiles',()=>{
 assert.match(shell,/showResumeTraining/);
 assert.match(atelier,/if\(icon\)icon\.remove\(\)/);
 assert.match(atelier,/if\(tile\)tile\.remove\(\)/);
 assert.doesNotMatch(atelier,/card\.insertAdjacentHTML\('beforeend',preview\(meta.kind\)\)/);
});
test('Member and Workplace features are loaded',()=>{
 for(const name of ['platform-growth-v11.js','training-recovery-v11.js'])assert.ok(index.includes(name));
 assert.ok(main.includes('showPersonalCoach:coachPlan'));
 assert.ok(main.includes('showFinalAssessment:assessment'));
 assert.ok(read('public/workplace.html').includes('workplace-assessment-v11.js'));
});
test('Typing audio respects the mute control',()=>{
 assert.ok(typing.includes('setterCircleSoundEnabled'));
 assert.ok(typing.includes('setter:sound-change'));
});
test('Mock interview AI failure is not falsely scored',()=>{
 assert.match(server,/const score=null;/);
 assert.match(server,/AI scoring was temporarily unavailable\. This interview remains unscored/);
});
