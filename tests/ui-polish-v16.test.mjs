import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const home=read('public/index.html');
const workplace=read('public/workplace.html');
const experience=read('public/experience.html');
const script=read('public/ui-polish-v16.js');
const css=read('public/ui-polish-v16.css');
const sound=read('public/setter-electric-v8.js');
const typing=read('public/room-typing-v10.js');
const build=read('scripts/build-member-css.mjs');

test('Polish is loaded on public, member, Workplace and Before Joining pages',()=>{
 assert.match(home,/member-ui-v15\.css\?v=16/);
 assert.match(home,/ui-polish-v16\.js\?v=16/);
 for(const page of [workplace,experience]){
  assert.match(page,/ui-polish-v16\.css\?v=16/);
  assert.match(page,/ui-polish-v16\.js\?v=16/);
 }
 assert.match(build,/ui-polish-v16\.css/);
 assert.match(home,/setter-electric-v8\.js\?v=16/);
 assert.match(workplace,/setter-electric-v8\.js\?v=16/);
 assert.match(experience,/setter-electric-v8\.js\?v=16/);
});

test('Sound is off for first-time visitors and preserves explicit on/off preferences',()=>{
 assert.match(sound,/localStorage\.getItem\(AUDIO_PREF\)==='on'/);
 assert.match(typing,/localStorage\.getItem\('setterCircleUiSoundV8'\)==='on'/);
 assert.match(home,/let soundOn=localStorage\.getItem\('setterCircleUiSoundV8'\)==='on'/);
 assert.match(sound,/setter:sound-change/);
 assert.match(sound,/window\.setterCircleToggleSound=soundToggle/);
 assert.match(sound,/sc-workplace-sound/);
 assert.match(css,/sc-workplace-sound/);
});

test('Keyboard viewport handling is event-driven and focused on active text input',()=>{
 assert.match(script,/visualViewport/);
 assert.match(script,/window\.innerHeight-v\.height-v\.offsetTop/);
 assert.match(script,/overlap>110&&keyboardOpen\(\)/);
 assert.match(script,/requestAnimationFrame\(viewport\)/);
 assert.match(css,/body\.sc16-keyboard-open #trainer:not\(\.hidden\)/);
 assert.match(css,/--sc16-visible-height/);
 assert.match(css,/sc16-keyboard-open #memberAppNav/);
 assert.match(css,/#trainer \.composer input\{font-size:16px!important/);
});

test('Real busy states and accessible notifications are supported without artificial delay',()=>{
 assert.match(css,/button\[aria-busy="true"\]/);
 assert.match(experience,/this\.setAttribute\('aria-busy','true'\)/);
 assert.match(experience,/\$\('sendBtn'\)\.setAttribute\('aria-busy','true'\)/);
 assert.match(experience,/\$\('sendBtn'\)\.removeAttribute\('aria-busy'\)/);
 assert.match(script,/toast\.setAttribute\('aria-live','polite'\)/);
 assert.match(script,/demoMessages\.setAttribute\('role','log'\)/);
 assert.doesNotMatch(script,/setTimeout\(/);
});

test('Reduced-motion users have a hard visual-motion override',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation-duration:\.01ms!important/);
 assert.match(css,/scroll-behavior:auto!important/);
 assert.match(script,/prefers-reduced-motion: reduce/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('Static performance keeps authentication fresh and avoids forced reflow on clicks',()=>{
 const worker=read('public/sw.js');
 assert.match(worker,/url\.pathname\.startsWith\("\/api\/"\)/);
 assert.match(worker,/req\.mode==="navigate"/);
 assert.match(worker,/cache:versioned\?"default":"no-store"/);
 assert.doesNotMatch(sound,/clickTarget\.offsetWidth/);
 assert.match(sound,/requestAnimationFrame\(\(\)=>/);
});

test('Additional progress polish does not replace the user account or simulation APIs',()=>{
 assert.doesNotMatch(script,/\/api\//);
 assert.doesNotMatch(script,/localStorage\.setItem/);
 assert.match(home,/function loadAccount/);
 assert.match(home,/async function send\(\)/);
 assert.match(workplace,/\/api\/workplace\/progress/);
});
