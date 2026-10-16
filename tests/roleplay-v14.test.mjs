
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calibrateDebrief} from "../scoring-guardrails.js";
const get=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
test("Nonsense, repetitive or minimal messages cannot inflate grades",()=>{
 const d={overall_score:97,scores:{discovery:96,qualification:93,rapport:95}};
 const one=calibrateDebrief(d,[{role:"prospect",text:"Hello"},{role:"student",text:"asdf"}]);
 assert.ok(one.overall_score<=25);assert.equal(one.scoring_integrity.limited,true);
 const repeated=calibrateDebrief(d,[{role:"student",text:"asdf"},{role:"student",text:"asdf"},{role:"student",text:"asdf"},{role:"student",text:"asdf"}]);
 assert.equal(repeated.overall_score,15);
 assert.ok(Object.values(repeated.scores).every(score=>score<=25));
 const empty=calibrateDebrief(d,[]);assert.equal(empty.overall_score,0);
});
test("Substantive multi-turn practice is never artificially boosted",()=>{
 const d={overall_score:63,scores:{rapport:76,discovery:61}};
 const dialogue=Array.from({length:5},(_,i)=>({role:"student",text:"I noticed you mentioned "+i+" in the profile. Could you share how that affects your clients?"}));
 const result=calibrateDebrief(d,dialogue);
 assert.equal(result.overall_score,63);
 assert.equal(result.scores.rapport,76);
 assert.equal(result.scoring_integrity.limited,false);
});
test("Backend uses trusted server-owned prospect records, not submitted scenario fields",()=>{
 const s=get("server.js");
 assert.match(s,/trustedScenarios\[mode\]\?\.find\(x=>x\.id===selected\)/);
 assert.match(s,/makePreloadedProspect\(Number\(preloaded\[2\]\),mode,difficulty\)/);
 assert.match(s,/DELETE FROM pending_training_prospects WHERE id=\$1 AND user_id=\$2/);
 assert.doesNotMatch(s,/if\(!scenario\?\.name\) return res\.status\(400\)/);
 assert.match(s,/const \{brief,\.\.\.visible\}=scenario/);
 assert.match(s,/const \{brief,\.\.\.visible\}=makePreloadedProspect/);
 const trusted=JSON.parse(get("trusted-scenarios.json"));
 assert.equal(Object.values(trusted).flat().length,16);
});
test("Replay requests require matching user IDs and never award a new score",()=>{
 const code=get("roleplay-replay-routes.js");
 assert.match(code,/simulation_results WHERE user_id=\$1 AND id=\$2/);
 assert.match(code,/roleplay_rehearsals WHERE user_id=\$1 AND simulation_id=\$2/);
 assert.match(code,/LIMIT 25/);
 assert.match(code,/COUNT\(\*\)::int n FROM roleplay_rehearsals/);
 assert.doesNotMatch(code,/UPDATE users SET xp/);
 assert.doesNotMatch(code,/INSERT INTO simulation_results/);
 assert.match(code,/AI simulation only; no additional Setter Score/);
});
test("Live coaching failure saves the prospect reply and labels it unscored",()=>{
 const code=get("server.js");
 assert.match(code,/Live coaching temporarily unavailable/);
 assert.match(code,/unscored:true/);
 assert.match(code,/await storeTrainingSession\(req.body.session_id,s\)/);
 assert.match(code,/const data=calibrateDebrief/);
 assert.match(code,/x=>\(x\.role==="prospect"\|\|x\.role==="assistant"\)&&/);
});
test("Practice UI includes accessible replay and adaptive recommendations",()=>{
 const page=get("public/index.html"),nav=get("public/member-shell.js"),js=get("public/roleplay-replay-v14.js");
 assert.match(page,/roleplay-replay-v14.js\?v=14/);
 assert.match(page,/Replay & improve/);
 assert.match(nav,/showReplayStudio/);
 assert.match(js,/data-rp14="turn"/);
 assert.match(js,/roleplay\/difficulty/);
 assert.match(js,/alternative responses are hypothetical/i);
});
test("Generated prospects and rehearsals are persisted with user ownership",()=>{
 const db=get("db.js");
 assert.match(db,/CREATE TABLE IF NOT EXISTS pending_training_prospects/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS roleplay_rehearsals/);
 assert.match(db,/user_id UUID NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/);
});
