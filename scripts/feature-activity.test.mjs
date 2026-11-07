import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { exportActivity } from '../tools/export-feature-activity.mjs';
import { activityMarkup, activityDirectoryMarkup, featureDirectory } from '../tools/feature-directory.mjs';
const require = createRequire(import.meta.url);
const { validateFeed, mount, eastern } = require('../assets/feature-activity.js');
const first = featureDirectory[0].id, second = featureDirectory[1].id;
const ids = new Set(featureDirectory.map(f => f.id));
const start = Date.parse('2026-11-02T11:00:00-05:00');
const iso = ms => new Date(ms).toISOString();
const evidencePrefix = 'https://github.com/example-coordinator/receipt-board/issues/';
function record(extra = {}) { return { featureId:first, revision:1, state:'running', stage:'coding', scope:'feature', deviceClass:'none', startedAt:iso(start), updatedAt:iso(start), expiresAt:iso(start+60000), nextAction:'review', ...extra }; }
function feed(records = [record()], updatedAt = iso(start), revision = Math.max(1,...records.map(r=>r.revision))) { return { schemaVersion:1, revision, updatedAt, features:records }; }
function privateInput(r = record(), source = {}) {
  return { revision:1, updatedAt:r.updatedAt, records:[{ ...r, privateText:'DO NOT EMIT private host or account', source:{ featureId:r.featureId, sha:'a'.repeat(40), taskId:'test-task', evidence:evidencePrefix+'184#issuecomment-123', confirmedAt:r.updatedAt, verified:true, kind:'START', ...source } }] };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(initial = feed(), displayed = [first,second]) {
  const dom = new JSDOM(activityDirectoryMarkup()+displayed.map(activityMarkup).join(''), { url:'https://example.test/features/detail.html', runScripts:'outside-only' });
  let clock=start, elapsed=0, hidden=false, fetchValue=initial, count=0, reject=false;
  const timers=new Map(); let serial=0;
  dom.window.Date.now=()=>clock;
  dom.window.performance.now=()=>elapsed;
  Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});
  dom.window.setTimeout=(fn, delay)=>{ const id=++serial; timers.set(id,{fn,at:clock+delay,delay}); return id; };
  dom.window.clearTimeout=id=>timers.delete(id);
  const requests=[];
  dom.window.fetch=async (url,options)=>{ count++;requests.push({url,options});if(reject)throw Error('offline');return {ok:true,text:async()=>JSON.stringify(fetchValue)}; };
  const client=mount(dom.window);
  const node=()=>dom.window.document.querySelector('[data-live-feature]');
  return { dom,client,node,timers,requests,get count(){return count;},set value(v){fetchValue=v;},set reject(v){reject=v;},advance(ms){clock+=ms;elapsed+=Math.max(0,ms);},async runDue(){const due=[...timers].filter(([,t])=>t.at<=clock);for(const [id,t]of due){timers.delete(id);t.fn();}await flush();},visibility(v){hidden=v;dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));},close(){client.stop();dom.window.close();} };
}
test('exporter emits only pinned public fields and requires matching evidence',()=>{
  const out=exportActivity(privateInput(),start,evidencePrefix);
  assert.equal(validateFeed(out,ids,start),true);
  assert.doesNotMatch(JSON.stringify(out),/privateText|test-task|DO NOT EMIT|issuecomment|aaaaaaa/);
  for(const change of [{verified:false},{sha:'short'},{featureId:second},{confirmedAt:iso(start-1000)},{kind:'ASSIGNED'}]) assert.throws(()=>exportActivity(privateInput(record(),change),start,evidencePrefix));
});
test('exporter requires independently configured canonical evidence authority, even for empty input',()=>{
  const forged={...privateInput(),expectedEvidencePrefix:evidencePrefix};
  for(const input of [privateInput(),forged,{revision:1,updatedAt:iso(start),records:[]}]) assert.throws(()=>exportActivity(input,start),/canonical evidence repository prefix/);
  for(const prefix of ['',null,42,'http://github.com/org/repo/issues/','https://github.com.evil.test/org/repo/issues/','https://user@github.com/org/repo/issues/','https://github.com:443/org/repo/issues/','https://github.com/org/repo/issues/?q=x','https://github.com/org/repo/issues/#x','https://github.com/org/repo/extra/issues/','https://github.com/org/repo%2Fother/issues/','https://github.com/org/../issues/','https://github.com/org/./issues/']) assert.throws(()=>exportActivity(privateInput(),start,prefix),/canonical evidence repository prefix/);
});
test('evidence receipts must match the configured prefix literally and have issue and comment IDs',()=>{
  const suffix='184#issuecomment-123';
  for(const evidence of ['https://github.com/other/receipt-board/issues/'+suffix,'https://github.com/example-coordinator/other/issues/'+suffix,'https://github.com.evil.test/example-coordinator/receipt-board/issues/'+suffix,evidencePrefix+'0#issuecomment-123',evidencePrefix+'184#issuecomment-0',evidencePrefix+'184',evidencePrefix+suffix+'?q=x',undefined]) assert.throws(()=>exportActivity(privateInput(record(),{evidence}),start,evidencePrefix));
  const dotted='https://github.com/example-coordinator/receipt.board/issues/';
  assert.equal(exportActivity(privateInput(record(),{evidence:dotted+suffix}),start,dotted).features.length,1);
  assert.throws(()=>exportActivity(privateInput(record(),{evidence:dotted.replace('receipt.board','receiptXboard')+suffix}),start,dotted));
});
test('CLI uses operator environment configuration without emitting it',()=>{
  const now=Date.now(),input=privateInput(record({startedAt:iso(now),updatedAt:iso(now),expiresAt:iso(now+60000)}));
  const env={...process.env};delete env.BEEBO_ACTIVITY_EVIDENCE_PREFIX;
  const run=env=>spawnSync(process.execPath,[fileURLToPath(new URL('../tools/export-feature-activity.mjs',import.meta.url))],{input:JSON.stringify(input),encoding:'utf8',env,windowsHide:true});
  const missing=run(env);assert.equal(missing.status,1);assert.equal(missing.stdout,'');assert.match(missing.stderr,/canonical evidence repository prefix/);
  const configured=run({...env,BEEBO_ACTIVITY_EVIDENCE_PREFIX:evidencePrefix});assert.equal(configured.status,0,configured.stderr);assert.equal(JSON.parse(configured.stdout).features.length,1);assert.equal(configured.stdout.includes(evidencePrefix),false);assert.equal(configured.stderr,'');
});
test('phone RUNNING requires actual testing start vouched by exclusive QA owner',()=>{
  const r=record({stage:'testing',deviceClass:'phone',scope:'phone-check'});
  assert.throws(()=>exportActivity(privateInput(r),start,evidencePrefix));
  assert.throws(()=>exportActivity(privateInput(r,{exclusiveQaOwnerConfirmed:true,qaOwner:'fixture',action:'installed'}),start,evidencePrefix));
  assert.equal(exportActivity(privateInput(r,{exclusiveQaOwnerConfirmed:true,qaOwner:'fixture',action:'testing-started'}),start,evidencePrefix).features[0].deviceClass,'phone');
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
  const h=harness();await flush();h.advance(1000);assert.equal(h.client.accept(feed([],iso(start+1000),2)),true);assert.equal(h.node().dataset.liveState,'unknown');assert.equal(h.client.accept(feed()),false);h.close();
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
test('equal snapshot version cannot remove and then revive a running confirmation',async()=>{
  const h=harness();await flush();assert.equal(h.client.accept(feed([])),false);h.close();
});
test('clock rewind cannot revive an expired revision',async()=>{
  const h=harness();await flush();h.advance(60000);h.client.render();assert.equal(h.node().dataset.liveState,'unknown');h.advance(-30000);h.client.render();assert.equal(h.node().dataset.liveState,'unknown');h.close();
});
test('visibility honors the current failure backoff deadline',async()=>{
  const h=harness();await flush();h.reject=true;await h.client.check();const attempts=h.count;h.visibility(true);h.advance(300000);h.visibility(false);await flush();assert.equal(h.count,attempts);h.close();
});
test('qualified unavailable and retired statuses do not offer current setup controls',()=>{
  for(const name of ['Rewards, ads and credit','Stream from my PC (old button)']){
    const entry=featureDirectory.find(f=>f.name===name);const html=readFileSync(new URL('../features/'+entry.id+'.html',import.meta.url),'utf8');assert.doesNotMatch(html,/Use the linked guide for the current setup and controls/);
  }
});

test('feature page CLI accepts paired line endings and rejects real drift', t => {
  const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
  const fixtureParent = realpathSync(tmpdir());
  const fixtureRoot = mkdtempSync(join(fixtureParent, 'fp-'));
  assert.equal(dirname(fixtureRoot), fixtureParent);
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  const fixturePath = name => {
    assert.equal(isAbsolute(name), false);
    assert.ok(!name.split(/[\\/]/).includes('..'));
    const path = join(fixtureRoot, name);
    if (process.platform === 'win32') assert.ok(path.length < 240, 'Fixture path is too long');
    return path;
  };
  const inputNames = [...new Set([
    'tools/build-feature-pages.mjs', 'tools/feature-directory.mjs', 'tools/readiness-audit.mjs',
    'testing-status.json', 'site-data/feature-directory.json', 'site-data/readiness-audit.json',
    ...featureDirectory.map(entry => entry.guide),
    ...featureDirectory.flatMap(entry => entry.gallery.map(image => image.image)),
  ])];
  for (const name of inputNames) {
    const destination = fixturePath(name);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(sourceRoot, name), destination);
  }
  const pageNames = featureDirectory.map(entry => 'features/' + entry.id + '.html');
  const snapshot = () => [...inputNames, ...pageNames].map(name => [
    name, existsSync(fixturePath(name))
      ? createHash('sha256').update(readFileSync(fixturePath(name))).digest('hex')
      : null,
  ]);
  const run = args => spawnSync(process.execPath, [fixturePath('tools/build-feature-pages.mjs'), ...args], {
    cwd: fixtureRoot, encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  const assertExit = (result, expected, label) => {
    assert.ifError(result.error);
    assert.equal(result.signal, null, label);
    assert.equal(result.status, expected, label + '\n' + result.stderr);
  };
  const generated = run([]);
  assertExit(generated, 0, 'Generate LF fixture with the actual CLI');
  assert.equal(generated.stderr, '');
  assert.equal(generated.stdout.trim(), featureDirectory.length + ' feature pages built from the unchanged readiness source.');
  assert.deepEqual(readdirSync(fixturePath('features')).sort(), pageNames.map(name => name.slice('features/'.length)).sort());
  const lfPages = pageNames.map(name => {
    const html = readFileSync(fixturePath(name), 'utf8');
    assert.equal(html.includes('\r'), false, name);
    assert.ok(html.endsWith('\n'), name);
    return [name, html];
  });
  const setEndings = style => {
    for (const [name, html] of lfPages) {
      let line = 0;
      const physical = style === 'lf' ? html : html.replace(/\n/g, () =>
        style === 'crlf' || ++line % 2 ? '\r\n' : '\n');
      assert.equal(physical.replace(/\r\n/g, '\n'), html, name);
      writeFileSync(fixturePath(name), physical);
    }
  };
  const check = (label, failingId) => {
    const before = snapshot();
    const result = run(['--check']);
    assert.deepEqual(snapshot(), before, label + ': --check must not rewrite inputs or pages');
    assertExit(result, failingId ? 1 : 0, label);
    if (failingId) {
      assert.equal(result.stdout, '', label);
      assert.ok(result.stderr.includes('Error: Feature page is out of date: ' + failingId), label + '\n' + result.stderr);
    } else {
      assert.equal(result.stderr, '', label);
      assert.equal(result.stdout.trim(), featureDirectory.length + ' feature pages match the unchanged readiness source.', label);
    }
  };
  for (const style of ['lf', 'crlf', 'mixed']) {
    setEndings(style);
    check(style + ' unchanged content');
  }
  const lastId = featureDirectory.at(-1).id;
  const lastPage = 'features/' + lastId + '.html';
  const mutations = [
    ['visible text', html => html.replace(/(<h1>)([^<])/, (_, tag, char) => tag + (char === 'X' ? 'Y' : 'X'))],
    ['numeric value', html => html.replace(/(<progress value=")(\d+)/, (_, prefix, value) => prefix + (Number(value) + 1))],
    ['markup', html => html.replace('<h1>', '<h2>')],
    ['meaningful space', html => html.replace(/(<h1>[^<])/, '$1 ')],
    ['final newline', html => html.replace(/\r?\n$/, '')],
    ['bare CR', html => html.replace(/\r?\n/, '\r')],
    ['doubled CR', html => html.replace(/\r?\n/, '\r\r\n')],
  ];
  for (const style of ['lf', 'crlf']) {
    for (const [kind, mutate] of mutations) {
      setEndings(style);
      check(style + ' baseline before ' + kind);
      const before = readFileSync(fixturePath(lastPage), 'utf8');
      const changed = mutate(before);
      assert.notEqual(changed, before, kind + ': fixture mutation must change bytes');
      writeFileSync(fixturePath(lastPage), changed);
      check(style + ' rejects ' + kind + ' on last page', lastId);
    }
    setEndings(style);
    check(style + ' baseline before missing page');
    rmSync(fixturePath(lastPage));
    check(style + ' rejects missing last page', lastId);
  }
});
