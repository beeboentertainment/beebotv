const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../site-data/progress-score.js');
const root = path.join(__dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'testing-status.json')));
assert.deepEqual(P.problems(d), []);
for (const [value, tier] of [[0,'red'],[39,'red'],[40,'yellow'],[79,'yellow'],[80,'teal'],[89,'teal'],[90,'green'],[98,'green'],[99,'purple'],[100,'gold']]) {
  assert.equal(P.tierFor(value,d.scoring).id,tier, 'tier boundary '+value);
}
const checks=Object.fromEntries(Object.keys(d.scoring.weights).map(k=>[k,true]));
assert.equal(P.percentFor({checks,openIssues:1},d.scoring),90,'an open issue caps even five passed checks');
assert.equal(P.percentFor({checks,openIssues:0},d.scoring),100);
checks['Ready to call Available']=false;
assert.equal(P.percentFor({checks},d.scoring),99);
const html=fs.readFileSync(path.join(root,'release-evidence.html'),'utf8');
assert.ok(!/mostly proven|Green 80/.test(html),'superseded tier wording');
assert.equal((html.match(/class="feature-entry" data-tier=/g)||[]).length,d.features.length);
// ONE control set: the Colour key chips both list a tier and filter the tables. The old second row of tab buttons must be gone.
for(const t of d.scoring.tiers) {
 assert.ok(html.includes(t.label), 'visible tier name '+t.id);
 assert.ok(html.includes('data-tier-chip="'+t.id+'"'), 'colour key chip / filter '+t.id);
}
assert.ok(html.includes('data-tier-chip="all"'), 'All features chip');
const chipOrder=[...html.matchAll(/class="[^"]*tier-chip[^"]*" data-tier-chip="([a-z]+)"/g)].map(m=>m[1]);
assert.deepEqual(chipOrder,['all',...d.scoring.tiers.map(t=>t.id)],'chips are All features then the key order');
assert.equal((html.match(/data-tier-chip="all"/g)||[]).length,1,'one All features chip');
assert.ok(!html.includes('role="tablist"')&&!html.includes('role="tabpanel"')&&!html.includes('tier-tab-')&&!html.includes('class="tier-tabs"'), 'the duplicate second row of tier tab buttons is gone');
assert.equal((html.match(/class="tier-result-count" role="status" aria-live="polite"/g)||[]).length,1,'one polite Showing N of M status line');
assert.ok(html.includes('id="tier-results"'), 'filtered tables wrapper');
for(const t of d.scoring.tiers) {
 const n=d.features.filter(f=>P.tierFor(f.percentComplete,d.scoring).id===t.id).length;
 const chip=html.match(new RegExp('<button[^>]*data-tier-chip="'+t.id+'"[^>]*>[^]*?</button>'))[0];
 assert.ok(chip.includes('('+n+')'), 'chip count '+t.id);
 assert.equal(/ is-empty/.test(chip), n===0, 'empty tier chip is muted/disabled with none right now: '+t.id);
 if(n===0)assert.ok(chip.includes('none right now'));
}
for(const f of d.features) {
 if(f.percentComplete>=99)assert.equal(f.openIssues||0,0,'open issue at 99/100: '+f.name);
 for(const r of f.ownerTests||[]) assert.ok(r.date.includes(' Eastern')&&/\d+:\d+/.test(r.date),'dated owner observation');
 if (f.checks['Real-world check'] && !d.checksBaseline.features[f.name]?.['Real-world check']) {
  assert.ok([...(f.ownerTests||[]),...(f.deviceTests||[])].some(r=>r.result==='PASS'&&r.ticks?.includes('Real-world check')&&/Eastern/.test(r.date)), 'post-baseline Real-world tick needs dated realistic PASS evidence: '+f.name);
 }
}
if(d.windowsToAndroid){
 assert.ok(html.includes('id="works-today"'),'the "Does it work today?" box is on the page');
 for(const m of (d.windowsToAndroid.scoreLine+d.windowsToAndroid.statusLine).matchAll(/\{pct:([^}]+)\}/g)) {
  const f=d.features.find(x=>x.name===m[1]); assert.ok(f,'works-today names a real feature: '+m[1]);
  assert.ok(html.includes(m[1].split(' (')[0].split(',')[0]) && html.includes(f.percentComplete+'%'),'live percent for '+m[1]);
 }
 assert.ok(!/100% working/i.test(html),'no flat "100% working" claim');
}
console.log('PASS: tier boundaries, open-issue cap, Ready weight, generated rows, labels and the single colour-key filter');
