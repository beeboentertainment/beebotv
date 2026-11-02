import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { exportActivity } from '../tools/export-feature-activity.mjs';
import { activityMarkup, activityDirectoryMarkup, featureDirectory } from '../tools/feature-directory.mjs';
const require = createRequire(import.meta.url);
const { validateFeed, mount, eastern } = require('../assets/feature-activity.js');
const first = featureDirectory[0].id, second = featureDirectory[1].id;
const ids = new Set(featureDirectory.map(f => f.id));
const start = Date.parse('2026-11-02T11:00:00-05:00');
const iso = ms => new Date(ms).toISOString();
function record(extra = {}) { return { featureId:first, revision:1, state:'running', stage:'coding', scope:'feature', deviceClass:'none', startedAt:iso(start), updatedAt:iso(start), expiresAt:iso(start+60000), nextAction:'review', ...extra }; }
function feed(records = [record()], updatedAt = iso(start)) { return { schemaVersion:1, updatedAt, features:records }; }
function privateInput(r = record(), source = {}) {
  return { updatedAt:r.updatedAt, records:[{ ...r, privateText:'DO NOT EMIT private host or account', source:{ featureId:r.featureId, sha:'a'.repeat(40), taskId:'test-task', evidence:'https://github.com/beeboentertainment/beebo-app-private/issues/184#issuecomment-123', confirmedAt:r.updatedAt, verified:true, kind:'START', ...source } }] };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(initial = feed(), displayed = [first,second]) {
  const dom = new JSDOM(activityDirectoryMarkup()+displayed.map(activityMarkup).join(''), { url:'https://example.test/features/detail.html', runScripts:'outside-only' });
  let clock=start, hidden=false, fetchValue=initial, count=0, reject=false;
  const timers=new Map(); let serial=0;
  dom.window.Date.now=()=>clock;
  Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});
  dom.window.setTimeout=(fn, delay)=>{ const id=++serial; timers.set(id,{fn,at:clock+delay,delay}); return id; };
  dom.window.clearTimeout=id=>timers.delete(id);
  const requests=[];
  dom.window.fetch=async (url,options)=>{ count++;requests.push({url,options});if(reject)throw Error('offline');return {ok:true,text:async()=>JSON.stringify(fetchValue)}; };
  const client=mount(dom.window);
  const node=()=>dom.window.document.querySelector('[data-live-feature]');
  return { dom,client,node,timers,requests,get count(){return count;},set value(v){fetchValue=v;},set reject(v){reject=v;},advance(ms){clock+=ms;},async runDue(){const due=[...timers].filter(([,t])=>t.at<=clock);for(const [id,t]of due){timers.delete(id);t.fn();}await flush();},visibility(v){hidden=v;dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));},close(){client.stop();dom.window.close();} };
}
test('exporter emits only pinned public fields and requires matching evidence',()=>{
  const out=exportActivity(privateInput(),start);
  assert.equal(validateFeed(out,ids,start),true);
  assert.doesNotMatch(JSON.stringify(out),/privateText|test-task|DO NOT EMIT|issuecomment|aaaaaaa/);
  for(const change of [{verified:false},{sha:'short'},{featureId:second},{confirmedAt:iso(start-1000)},{kind:'ASSIGNED'}]) assert.throws(()=>exportActivity(privateInput(record(),change),start));
});
test('phone RUNNING requires actual testing start vouched by exclusive QA owner',()=>{
  const r=record({stage:'testing',deviceClass:'phone',scope:'phone-check'});
  assert.throws(()=>exportActivity(privateInput(r),start));
  assert.throws(()=>exportActivity(privateInput(r,{exclusiveQaOwnerConfirmed:true,qaOwner:'fixture',action:'installed'}),start));
  assert.equal(exportActivity(privateInput(r,{exclusiveQaOwnerConfirmed:true,qaOwner:'fixture',action:'testing-started'}),start).features[0].deviceClass,'phone');
});
test('validation rejects malformed, duplicate, unknown, future and overlong activity',()=>{
  for(const bad of [null,{},feed([record(),record()]),feed([record({featureId:'feature-unknown'})]),feed([record({nextAction:'<img src=x onerror=alert(1)>'})]),feed([record({scope:'secret title'})]),feed([record({expiresAt:iso(start+3600001)})]),feed([record({updatedAt:iso(start+1)})]),feed([record({startedAt:null})]),feed([record({revision:0})]),feed([record({extra:'private'})])]) assert.equal(validateFeed(bad,ids,start),false);
});
test('actual client runs coding → waiting → phone testing → complete without moving scores',async()=>{
  const h=harness();await flush();
  assert.equal(h.node().dataset.liveState,'running');
  const changes=[{state:'waiting',nextAction:'device'},{state:'running',stage:'testing',deviceClass:'phone',scope:'phone-check',nextAction:'acceptance'},{state:'complete',stage:'testing',deviceClass:'phone',scope:'phone-check',nextAction:'acceptance'}];
  for(let i=0;i<changes.length;i++){h.value=feed([record({revision:i+2,...changes[i]})]);await h.client.check();assert.equal(h.node().dataset.liveState,changes[i].state);}
  assert.match(h.node().textContent,/Work step complete/);assert.match(h.node().textContent,/Final acceptance remains/);
  assert.equal(h.requests[0].url,'/site-data/feature-activity.json');assert.equal(h.requests[0].options.cache,'no-cache');assert.equal(h.requests[0].options.credentials,'omit');h.close();
});
test('phone label describes actual device stage and reduced-motion CSS disables pulse',async()=>{
  const h=harness(feed([record({stage:'testing',deviceClass:'phone',scope:'phone-check'})]));await flush();assert.match(h.node().textContent,/Testing on a phone/);h.close();
  const css=readFileSync(new URL('../assets/feature-detail.css',import.meta.url),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\).*animation:none/s);
});
test('each expiry is scheduled, including a later feature after the first expires',async()=>{
  const h=harness(feed([record(),record({featureId:second,expiresAt:iso(start+120000)})]));await flush();
  h.advance(60000);await h.runDue();assert.equal(h.node().dataset.liveState,'unknown');
  assert.equal(h.dom.window.document.querySelectorAll('[data-live-feature]')[1].dataset.liveState,'running');
  h.advance(60000);await h.runDue();assert.equal(h.dom.window.document.querySelectorAll('[data-live-feature]')[1].dataset.liveState,'unknown');h.close();
});
test('an identical response cannot extend expiry; changed or older revisions cannot overwrite',async()=>{
  const h=harness();await flush();assert.equal(h.client.accept(feed()),true);
  assert.equal(h.client.accept(feed([record({nextAction:'none'})])),false);
  assert.equal(h.client.accept(feed([record({revision:2,state:'waiting'})])),true);
  assert.equal(h.client.accept(feed()),false);assert.equal(h.node().dataset.liveState,'waiting');
  h.advance(60000);h.client.render();assert.equal(h.node().dataset.liveState,'unknown');h.close();
});
test('offline or invalid responses immediately neutralize active status and back off',async()=>{
  const h=harness();await flush();h.reject=true;await h.client.check();assert.equal(h.node().dataset.liveState,'unknown');assert.ok([...h.timers.values()].some(t=>t.delay===600000));
  h.reject=false;h.value={not:'a feed'};await h.client.check();assert.equal(h.node().dataset.liveState,'unknown');assert.ok([...h.timers.values()].some(t=>t.delay===1200000));h.close();
});
test('a newer snapshot missing a row clears that row; old whole snapshots stay rejected',async()=>{
  const h=harness();await flush();h.advance(1000);assert.equal(h.client.accept(feed([],iso(start+1000))),true);assert.equal(h.node().dataset.liveState,'unknown');assert.equal(h.client.accept(feed()),false);h.close();
});
test('detail page accepts the full catalogue feed while rendering one feature',async()=>{
  const h=harness(feed([record(),record({featureId:second})]),[first]);await flush();assert.equal(h.node().dataset.liveState,'running');h.close();
});
test('hidden tabs abort pending requests, ignore late responses and recheck expiry on return',async()=>{
  const h=harness();await flush();let resolve;
  h.dom.window.fetch=(_u,o)=>{h.requests.push({options:o});return new Promise(r=>resolve=r);};
  const pending=h.client.check();h.visibility(true);assert.equal(h.requests.at(-1).options.signal.aborted,true);
  resolve({ok:true,text:async()=>JSON.stringify(feed([record({revision:2})]))});await pending;
  h.advance(120000);h.visibility(false);assert.equal(h.node().dataset.liveState,'unknown');assert.equal(h.count,1);h.close();
});
test('request timeout aborts and pagehide retires an in-flight response',async()=>{
  const h=harness();await flush();let resolve;let signal;
  h.dom.window.fetch=(_u,o)=>{signal=o.signal;return new Promise(r=>resolve=r);};
  const pending=h.client.check();h.advance(10000);await h.runDue();assert.equal(signal.aborted,true);
  h.dom.window.dispatchEvent(new h.dom.window.Event('pagehide'));
  resolve({ok:true,text:async()=>JSON.stringify(feed([record({revision:2,state:'complete'})]))});await pending;assert.notEqual(h.node().dataset.liveState,'complete');h.close();
});
test('timestamps include calendar date and explicit Eastern UTC offset across DST',()=>{
  assert.match(eastern('2026-11-02T16:00:00Z'),/Nov 2, 2026/);assert.match(eastern('2026-11-02T16:00:00Z'),/GMT-05:00.*Eastern/);
  assert.match(eastern('2026-10-29T16:00:00Z'),/GMT-04:00.*Eastern/);
});
test('all detail pages keep source status/score, collapsed technicals, placeholders and back links',()=>{
  const data=JSON.parse(readFileSync(new URL('../testing-status.json',import.meta.url),'utf8'));
  assert.equal(new Set(featureDirectory.map(f=>f.id)).size,70);
  for(const entry of featureDirectory){const f=data.features.find(f=>f.name===entry.name);const html=readFileSync(new URL('../features/'+entry.id+'.html',import.meta.url),'utf8');const dom=new JSDOM(html);const doc=dom.window.document;
    assert.equal(doc.querySelector('progress').value,f.percentComplete,entry.name);assert.equal(doc.querySelector('.eyebrow').textContent,`${f.group} · ${f.status}`);assert.equal(doc.querySelector('details').open,false);assert.match(doc.body.textContent,/Screenshots coming soon/);assert.ok(doc.querySelector('a[href="../release-evidence.html#features"]'));assert.equal(doc.querySelectorAll('img').length,0);assert.equal(doc.querySelector('[data-live-feature]').dataset.liveFeature,entry.id);dom.window.close();}
});
test('representative Campsite page preserves Beta, 90%, two issues and no current-build claim',()=>{
  const entry=featureDirectory.find(f=>f.name==='Campsite host start and stop');const html=readFileSync(new URL('../features/'+entry.id+'.html',import.meta.url),'utf8');assert.match(html,/Beta/);assert.match(html,/90%/);assert.match(html,/2 open known issues/);assert.match(html,/not proof that every route works in the current build/);assert.match(html,/Stop and confirm Stop/);
});
