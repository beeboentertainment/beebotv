import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { validateSnapshot, activityState, codeEstimate, renderActivity } from '../tools/feature-work-snapshot.mjs';
import { readinessAudit, validateReadinessAudit } from '../tools/readiness-audit.mjs';
const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(new URL('../testing-status.json', import.meta.url), 'utf8'));
const page = readFileSync(new URL('../release-evidence.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../testing-evidence.css', import.meta.url), 'utf8');
const cards = [...page.matchAll(/<article\b[^>]*class="feature-work-card\b[^>]*>[\s\S]*?<\/article>/g)].map(m => m[0]);
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const snapshot = JSON.parse(readFileSync(new URL('../site-data/feature-work-snapshot.json',import.meta.url),'utf8'));
const script = readFileSync(new URL('../assets/evidence-tier-tabs.js',import.meta.url),'utf8');
function domAt(time=snapshot.capturedAt) {
 const dom=new JSDOM(page,{url:'http://localhost/release-evidence.html',runScripts:'outside-only'});
 dom.window.Date.now=()=>Date.parse(time);
 dom.window.setTimeout=()=>0;
 dom.window.eval(script);
 return dom;
}

test('all 70 original feature rows remain unique and obey the existing rubric', () => {
  assert.equal(data.features.length, 70);
  assert.equal(new Set(data.features.map(f => f.name)).size, 70);
  assert.deepEqual(require('../site-data/progress-score.js').problems(data), []);
  for (const feature of data.features.filter(f => !Object.values(f.checks).some(Boolean))) {
    assert.ok(feature.roadTo100.done.includes('Checks passed: none yet.'), feature.name);
  }
  assert.equal((page.match(/<tr id="[^"]+" class="feat tier-/g) || []).length, 70);
});
test('all 70 concise feature cards are visible in the initial generated page', () => {
  assert.equal(cards.length, 70);
  assert.match(page, /id="feature-work-groups"/);
  assert.doesNotMatch(page, /id="feature-work-groups"[^>]*\bhidden/);
  assert.doesNotMatch(page, /class="tier-key-data" hidden/);
});
test('each card preserves its exact score, name and real evidence anchor', () => {
  assert.equal(cards.length, 70);
  for (const f of data.features) {
    const card = cards.find(c => c.includes(`data-feature-name="${escape(f.name)}"`));
    assert.ok(card, f.name);
    assert.ok(card.includes(`${f.percentComplete}%`), f.name + ' score');
    const target = /class="feature-work-link" href="#([^"]+)"/.exec(card)?.[1];
    assert.ok(target && page.includes(`id="${target}"`), f.name + ' evidence anchor');
    assert.ok(card.includes(escape(f.status)), f.name + ' status');
    if (f.openIssues) assert.match(card, /open known issue/);
  }
});
test('green and lower-percentage sections are adjacent and include every tier', () => {
  assert.match(page, /id="feature-work-green"/);
  assert.match(page, /id="feature-work-below"/);
  assert.ok(page.indexOf('id="feature-work-green"') < page.indexOf('id="feature-work-below"'));
  assert.match(page, /id="feature-work-accepted"/);
});
test('robots use visible state labels and native focusable/tappable details', () => {
  assert.equal((page.match(/<details class="feature-activity"/g) || []).length, 70);
  assert.equal((page.match(/class="work-robot"[^>]*aria-hidden="true"/g) || []).length, 70);
  assert.equal((page.match(/<summary class="activity-toggle\b/g) || []).length, 70);
  assert.match(page, /AI working/);
  assert.match(page, /Not currently worked on/);
  assert.match(page, /Activity not verified/);
  assert.match(page, /not live/i);
});
test('count summaries distinguish automated checks from device/world runs', () => {
  assert.equal((page.match(/class="recorded-checks"/g) || []).length, 70);
  assert.equal((page.match(/class="recorded-device-runs"/g) || []).length, 70);
  assert.match(page, /partial|unknown/i);
  assert.match(page, /dated records|recorded runs/i);
});
test('long evidence is collapsed below prominent charts and feature cards', () => {
  assert.match(page, /<details class="feature-evidence" id="feature-evidence">/);
  assert.ok(page.indexOf('id="platform-matrix"') < page.indexOf('id="feature-work-groups"'));
  assert.ok(page.indexOf('id="feature-work-groups"') < page.indexOf('id="release-changes"'));
});
test('card and activity styles include narrow-screen wrapping and visible focus', () => {
  assert.match(css, /\.feature-work-card/);
  assert.match(css, /\.activity-toggle:focus-visible/);
  assert.match(css, /@media[^{}]*max-width[^{}]*\{[\s\S]*?\.feature-work/);
  assert.match(css, /\.activity-inactive/);
  assert.match(css, /\.activity-unknown/);
});
test('public snapshot has exactly the public feature names and no private provenance', () => {
  const path = new URL('../site-data/feature-work-snapshot.json', import.meta.url);
  assert.equal(existsSync(path), true);
  const text = readFileSync(path, 'utf8');
  const snapshot = JSON.parse(text);
  assert.deepEqual(snapshot.features.map(f => f.name).sort(), data.features.map(f => f.name).sort());
  assert.ok(Number.isFinite(Date.parse(snapshot.capturedAt)));
  assert.doesNotMatch(text, /github\.com[^\s"]*\/issues|issuecomment|taskId|\/workspace\/|\b[a-f0-9]{40}\b/i);
  for (const f of snapshot.features) assert.ok([true, false, null].includes(f.active));
});
const NOV7={
 'Opening the app and the five tabs':{lastTested:'Nov 7, 2026, about 9:45 to 10:05 AM Eastern (public Android 1.52 build 122, Galaxy S24 Ultra, Nick watching: reopen to Home in about 8 seconds, five tabs, 0 crash lines; PASS, marked 100% by Nick for that scope)'},
 'Campsite host start and stop':{lastTested:'Nov 7, 2026, about 8:40 to 8:55 AM Eastern (public Android 1.52 build 122, Galaxy S24 Ultra host, Chrome guest on the 4-core PC, home Wi-Fi, Nick watching: start with QR code and address, guest join, Stop with confirmation; PASS, marked 100% by Nick for that scope)'},
 'Pack for a trip (download planner)':{openIssues:[1,2],lastTested:'Nov 7, 2026, about 10:10 to 10:30 AM Eastern (public Android 1.52 build 122, Galaxy S24 Ultra, Nick watching and listening: packed 2 added test films, 4 of 4 ready, offline play with sound; PASS, marked 100% by Nick for that scope)'},
 'Library sharing with another household':{openIssues:[3,5],lastTested:'Nov 7, 2026, about 9:20 to 9:45 AM Eastern (Windows 0.1.113 host and public Android 1.52 build 122 guest on a Galaxy S24 Ultra, test films, home Wi-Fi, Nick watching: code, accept, watch with sound, download, offline play, stop sharing; PASS, marked 100% by Nick for that scope)'},
 'Library, player and web player':{openIssues:[6,7],lastTested:'Nov 7, 2026, about 9:50 to 10:05 AM Eastern (published Windows 0.1.113, 4-core PC, Nick watching: desktop library, Play in VLC, web player Resume and pause in Chrome; PASS, marked 100% by Nick for that scope, silent)'},
 'Home layouts and Customize layout (desktop)':{lastTested:'Nov 7, 2026, about 9:55 to 10:30 AM Eastern (published Windows 0.1.113, 4-core PC, Nick watching: all five layouts shown, layouts marked 100% by Nick for that scope; Customize layout hide and restore a row PASS)'},
 'Update modes and start with Windows':{lastTested:'Nov 7, 2026, about 9:50 to 10:05 AM Eastern (published Windows 0.1.113, 4-core PC, Nick watching: the three update modes chosen and saved; PASS, marked 100% by Nick for that choice only)'},
};
const NOV8={
 'Opening the app and the five tabs':{openIssues:[2,1],lastTestedStartsWith:'Nov 8, 2026, about 3:20 to 3:40 AM Eastern'},
 'Campsite games':{openIssues:[3,5],lastTestedStartsWith:'Nov 8, 2026, about 4:00 to 4:21 AM Eastern'},
 'Pack for a trip (download planner)':{openIssues:[1,2],lastTestedStartsWith:'Nov 8, 2026, 3:28 to 3:35 AM Eastern'},
 'Library, player and web player':{openIssues:[6,8],lastTestedStartsWith:'Nov 7, 2026, 10:39 AM to 1:35 PM'},
 'Home layouts and Customize layout (desktop)':{openIssues:[3,0],lastTestedStartsWith:'Nov 7, 2026, 11:05 AM to 5:48 PM Eastern'},
};
test('all 70 scores and checks preserve the baseline; dated evidence additions are explicit',()=>{
 const baseline=JSON.parse(execFileSync('git',['show','debf65d2c47fb8900dbaa0d71994c3dba473e8aa:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
 for(const before of baseline.features){
  const after=data.features.find(f=>f.name===before.name);
  for(const key of ['percentComplete','checks','status','openIssues','lastTested','testedOn','codeDonePercent','realWorldDonePercent']){
   if(key==='percentComplete' && before.name==='Home layouts and Customize layout (desktop)'){
    assert.equal(before.percentComplete,90);assert.equal(after.percentComplete,99);continue;
   }
   if(key==='openIssues' && before.name==='Playing films, seeking, picture-in-picture'){
    assert.equal(before.openIssues,4);assert.equal(after.openIssues,5);continue;
   }
   if(key==='openIssues' && before.name==='BeeboVPN'){
    assert.equal(before.openIssues,undefined);assert.equal(after.openIssues,2);continue;
   }
   if(key==='lastTested' && before.name==='Chromecast'){
    const prefix='Nov 2, 2026, 3:14 to 3:15 PM Eastern (S9+ unpublished tester69/build 119: Cast FAILED/INCONCLUSIVE; receiver SDK error then missing media, actual TV progress/picture and sound unknown; seek check not run, normal Stop cleanup); earlier: ';
    assert.equal(after.lastTested,prefix+before.lastTested);continue;
   }
   if(before.name==='Car party (host and passengers)' && ['lastTested','testedOn'].includes(key))continue;
   // Nov 8, 2026 4-core record (public Windows 0.1.113 and Android 1.53 build 123): explicit dated additions only.
   const nov8=NOV8[before.name];
   if(nov8 && key==='openIssues' && nov8.openIssues){
    assert.equal(before.openIssues,nov8.openIssues[0],before.name+': baseline open issues');assert.equal(after.openIssues,nov8.openIssues[1],before.name+': Nov 8 open issues');continue;
   }
   if(nov8 && key==='lastTested' && nov8.lastTestedStartsWith){
    const older=(NOV7[before.name]?NOV7[before.name].lastTested+'; ':'')+before.lastTested;
    assert.ok(after.lastTested.startsWith(nov8.lastTestedStartsWith),before.name+': Nov 8 lastTested prefix');
    assert.ok(after.lastTested.endsWith('; '+older),before.name+': earlier lastTested kept');continue;
   }
   // Nov 7, 2026 owner-watched record (public Android 1.52 build 122, Windows 0.1.113): explicit dated additions only.
   const nov7=NOV7[before.name];
   if(nov7 && key==='openIssues' && nov7.openIssues){
    assert.equal(before.openIssues,nov7.openIssues[0]);assert.equal(after.openIssues,nov7.openIssues[1]);continue;
   }
   if(nov7 && key==='lastTested' && nov7.lastTested){
    assert.equal(after.lastTested,nov7.lastTested+'; '+before.lastTested,before.name+': Nov 7 lastTested prefix');continue;
   }
   assert.deepEqual(after[key],before[key],before.name+': '+key);
  }
 }
 const car=data.features.find(f=>f.name==='Car party (host and passengers)');
 assert.equal(car.lastTested,'Oct 13, 2026: two-phone host/join/leave; no newer-build real-device PASS recorded');
 const originalCar=baseline.features.find(f=>f.name===car.name);
 assert.equal(car.testedOn,originalCar.testedOn.replace('No real Car Party pass is recorded here. Last PASS: No real-device PASS recorded.','No newer-build Car Party pass is recorded here. The existing device tick rests on the Oct 13, 2026 two-phone host/join/leave run.'));
});

test('the dated percentage audit accounts for all 70 rows and keeps evidence gaps explicit',()=>{
 validateReadinessAudit(data);
 assert.equal(readinessAudit.features.length,70);
 assert.equal(readinessAudit.features.filter(f=>f.outcome==='evidence-gap').length,7);
 assert.deepEqual(readinessAudit.features.filter(f=>f.scoreBefore!==f.scoreAfter).map(f=>f.featureId),['feature-windows-desktop-app-home-layouts-and-customize-layout-desktop']);
 assert.match(page,/id="percentage-audit"/);
 for(const row of readinessAudit.features){
  const detail=readFileSync(new URL('../features/'+row.featureId+'.html',import.meta.url),'utf8');
  assert.ok(detail.includes(escape(row.summary)),row.featureId);
  assert.ok(detail.includes(readinessAudit.updatedEastern),row.featureId);
 }
 const missing=structuredClone(readinessAudit);missing.features.pop();assert.throws(()=>validateReadinessAudit(data,missing));
 const wrong=structuredClone(readinessAudit);wrong.features[0].scoreAfter++;assert.throws(()=>validateReadinessAudit(data,wrong));
});
test('legacy 100% code estimates with outstanding required work are visibly qualified',()=>{
 const contradicted=data.features.filter(f=>codeEstimate(f));
 assert.equal(contradicted.length,43);
 for(const f of contradicted){const card=cards.find(c=>c.includes(`data-feature-name="${escape(f.name)}"`));assert.ok(card.includes('Legacy code estimate is unverified'),f.name);}
 assert.match(page,/43 rows retain a 100% code estimate/);
 const method=data.codeVsHuman.method;
 for(const fact of ['Built and Automated tests checks','Real device, Real-world check and Ready to call Available','Group figures are the average of their features and are never rounded up to 100','Remaining counts are open road-to-100 items','All 70 features are counted, including those that are planned or on hold'])assert.ok(method.includes(fact),fact);
 const generator=readFileSync(new URL('../site-data/build-what-we-offer.js',import.meta.url),'utf8');
 assert.doesNotMatch(generator,/\$\{c\.waiting\} code complete/);
});
test('activity validation rejects assignment, invalid timestamps and private provenance',()=>{
 assert.deepEqual(validateSnapshot(snapshot,data.features),[]);
 for(const modify of [s=>s.features[1].stage='Assigned',s=>s.features[1].confirmedAt='2027-01-01T00:00:00Z',s=>s.features[1].reason='https://github.com/private/issues/1',s=>s.recordsCutoff='unknown',s=>s.features.push(s.features[0])]){
  const altered=structuredClone(snapshot);modify(altered);assert.ok(validateSnapshot(altered,data.features).length);
 }
});
test('active, inactive, unknown and expired activity remain distinct without changing readiness',()=>{
 const row=snapshot.features.find(f=>f.active===true);
 assert.equal(activityState(row,snapshot),'active');
 assert.equal(activityState({...row,active:false},snapshot),'inactive');
 assert.equal(activityState({...row,active:null},snapshot),'unknown');
 for(const time of ['invalid','2027-01-01T00:00:00Z','2026-01-01T00:00:00Z'])assert.equal(activityState(row,snapshot,time),'unknown');
 const rendered=renderActivity({...row,active:false,stage:'Not active',reason:'Accepted; no current repair task.'},snapshot,'fixture');
 assert.match(rendered,/activity-inactive/);assert.match(rendered,/Not currently worked on/);assert.match(rendered,/Accepted; no current repair task/);
});
test('counted source executions exclude skipped cases and retain failed diagnostics',()=>{
 const counted=snapshot.features.filter(f=>f.tests.automated.executions?.length);
 assert.ok(counted.length>0);
 assert.ok(counted.some(f=>f.tests.automated.executions.some(r=>r.failed>0)));
 assert.ok(counted.some(f=>f.tests.automated.executions.some(r=>r.skipped>0)));
 for(const f of counted){const c=f.tests.automated;assert.equal(c.runs,c.executions.length);assert.equal(c.assertions,c.executions.reduce((n,r)=>n+r.passed+r.failed,0));assert.equal(c.coverage,'partial');}
 assert.equal(snapshot.features.find(f=>f.name==='Story Studio').tests.automated.assertions,240);
 assert.match(snapshot.integrationNote,/537/);assert.match(snapshot.integrationNote,/not 537 device runs/);
 assert.ok(data.features.every(f=>!f.sourceUpdate || Date.parse(f.sourceUpdate.asOf)<=Date.parse(snapshot.recordsCutoff)),'latest included source evidence fits the stated cutoff');
 assert.match(snapshot.integrationNote,/reconciliations ended at 3:58 PM and 3:55 PM/);
});
test('tier filtering, Escape and evidence links update the rendered DOM coherently',()=>{
 const dom=domAt();try{
  const {document:d,KeyboardEvent,MouseEvent}=dom.window;
  const green=d.querySelector('[data-tier-chip="green"]');green.click();
  assert.equal(d.querySelectorAll('.feature-work-card:not([hidden])').length,data.features.filter(f=>f.percentComplete>=90&&f.percentComplete<99).length);
  assert.equal(green.getAttribute('aria-pressed'),'true');
  green.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(d.querySelectorAll('.feature-work-card:not([hidden])').length,70);assert.equal(d.activeElement,green);
  const first=d.querySelector('.feature-work-link');first.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(d.querySelector('#feature-evidence').open,true);
  const target=d.getElementById(first.hash.slice(1));assert.ok(target);assert.equal(target.closest('tbody').hidden,false);
 }finally{dom.window.close();}
});
test('native expanders support click and focus while long evidence starts collapsed',()=>{
 const dom=domAt();try{const d=dom.window.document;
  for(const el of d.querySelectorAll('.evidence-archive,.feature-evidence,.feature-work-details,.feature-activity'))assert.equal(el.open,false);
  const summary=d.querySelector('.activity-toggle');summary.focus();assert.equal(d.activeElement,summary);assert.ok(summary.getAttribute('aria-describedby'));assert.ok(summary.title);
  summary.click();assert.equal(summary.parentElement.open,true);summary.click();assert.equal(summary.parentElement.open,false);
 }finally{dom.window.close();}
});
test('stale snapshots become visibly neutral in the rendered DOM',()=>{
 const dom=domAt('2027-01-01T00:00:00Z');try{const d=dom.window.document;
  assert.equal(d.querySelectorAll('.feature-activity[data-activity="active"]').length,0);
  assert.equal(d.querySelectorAll('.feature-activity[data-activity="unknown"]').length,70);
  assert.equal(d.querySelector('.activity-stale-note').hidden,false);
  assert.ok([...d.querySelectorAll('[data-activity-label]')].every(n=>n.textContent==='Activity not verified'));
 }finally{dom.window.close();}
});
test('every newly displayed card link has a real destination and evidence survives relocation',()=>{
 const dom=domAt();try{const d=dom.window.document;
  const aboutLinks=[];
  for(const a of d.querySelectorAll('.feature-work-card a')){
   const href=a.getAttribute('href');
   if(href.startsWith('#'))assert.ok(d.getElementById(a.hash.slice(1)),a.textContent);
   else {
    const id=a.closest('.feature-work-card').dataset.featureId;
    assert.match(id,/^feature-[a-z0-9-]+$/);
    assert.equal(href,`features/${id}.html`);
    assert.ok(existsSync(new URL('../'+href,import.meta.url)),a.textContent);
    aboutLinks.push(href);
   }
  }
  assert.equal(aboutLinks.length,70);assert.equal(new Set(aboutLinks).size,70);
  const baseline=new JSDOM(execFileSync('git',['show','debf65d2c47fb8900dbaa0d71994c3dba473e8aa:release-evidence.html'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
  try{
   for(const el of baseline.window.document.querySelectorAll('section[id]'))assert.ok(d.getElementById(el.id),'retained section '+el.id);
   const links=new Set([...d.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
   for(const a of baseline.window.document.querySelectorAll('a[href]'))assert.ok(links.has(a.getAttribute('href')),'retained evidence link '+a.getAttribute('href'));
   const normalized=el=>el.textContent.replace(/\s+/g,' ').trim();
   for(const id of ['oct22-runs','release-checks-oct19','release-checks-oct18','published-run','oct29-bounded-update'])assert.equal(normalized(d.getElementById(id)),normalized(baseline.window.document.getElementById(id)),'retained evidence text '+id);
  }finally{baseline.window.close();}
  assert.ok(d.querySelector('#platform-matrix'));assert.ok(d.querySelector('#code-vs-human'));assert.ok(d.querySelector('#works-today').closest('details'));
 }finally{dom.window.close();}
});
