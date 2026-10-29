import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { validateSnapshot, activityState, codeEstimate, renderActivity } from '../tools/feature-work-snapshot.mjs';
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
test('all 70 scores, checks, issue counts and installed-test dates preserve the reviewed baseline',()=>{
 const baseline=JSON.parse(execFileSync('git',['show','debf65d2c47fb8900dbaa0d71994c3dba473e8aa:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024}));
 for(const before of baseline.features){
  const after=data.features.find(f=>f.name===before.name);
  for(const key of ['percentComplete','checks','status','openIssues','lastTested','testedOn','codeDonePercent','realWorldDonePercent'])assert.deepEqual(after[key],before[key],before.name+': '+key);
 }
});
test('legacy 100% code estimates with outstanding required work are visibly qualified',()=>{
 const contradicted=data.features.filter(f=>codeEstimate(f));
 assert.equal(contradicted.length,43);
 for(const f of contradicted){const card=cards.find(c=>c.includes(`data-feature-name="${escape(f.name)}"`));assert.ok(card.includes('Legacy code estimate is unverified'),f.name);}
 assert.match(page,/43 rows retain a 100% code estimate/);
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
  for(const a of d.querySelectorAll('.feature-work-card a'))assert.ok(d.getElementById(a.hash.slice(1)),a.textContent);
  const baseline=new JSDOM(execFileSync('git',['show','debf65d2c47fb8900dbaa0d71994c3dba473e8aa:release-evidence.html'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024}));
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
