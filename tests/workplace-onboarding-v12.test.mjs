import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../public/workplace.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../public/workplace-onboarding-v12.css",import.meta.url),"utf8");

test("Workplace onboarding cards are not forced into two columns by inline !important styling",()=>{
 assert.match(html,/<div class="onboard-cards">/);
 assert.doesNotMatch(html,/<div class="grid" style="grid-template-columns:repeat\(2,1fr\)!important"><div class="card"><h2>What success looks like/);
 assert.match(css,/@media\(max-width:820px\)\s*\{[\s\S]*?\.onboard-cards\s*\{\s*grid-template-columns:minmax\(0,1fr\)!important/);
});
test("Rules are readable, separated and never clipped by a max-height",()=>{
 assert.match(html,/class="onboard-rules"/);
 assert.match(html,/<ol class="onboard-rule-list">/);
 for(const title of ["Be truthful","Respect boundaries","Protect information","Book with consent"])
  assert.ok(html.includes("<strong>"+title+"</strong>"));
 assert.match(css,/\.onboard-info-card\s*\{[\s\S]*?max-height:none!important/);
 assert.match(css,/\.onboard-rule-list>li\s*\{/);
 assert.ok(css.indexOf("workplace-onboarding")<0||css.length>1000);
});
test("Both onboarding cards retain accessible headings and lead into the shift checklist",()=>{
 assert.match(html,/aria-labelledby="onboardSuccessTitle"/);
 assert.match(html,/aria-labelledby="onboardRulesTitle"/);
 assert.match(html,/class="onboard-checklist-title">Before you start your shift/);
 assert.match(html,/href="\/workplace-onboarding-v12\.css\?v=12"/);
});
test("Onboarding styles are valid balanced CSS blocks",()=>{
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
