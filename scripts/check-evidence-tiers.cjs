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
for(const t of d.scoring.tiers) {
 assert.ok(html.includes(t.label), 'visible tier name '+t.id);
 assert.ok(html.includes('id="tier-tab-'+t.id+'"'), 'filter '+t.id);
}
assert.ok(html.includes('role="tablist"')&&html.includes('role="tabpanel"'));
for(const f of d.features) {
 if(f.percentComplete>=99)assert.equal(f.openIssues||0,0,'open issue at 99/100: '+f.name);
 for(const r of f.ownerTests||[]) assert.ok(r.date.includes(' Eastern')&&/\d+:\d+/.test(r.date),'dated owner observation');
 if (f.checks['Real-world check'] && !d.checksBaseline.features[f.name]?.['Real-world check']) {
  assert.ok((f.ownerTests||[]).some(r=>r.result==='PASS'&&r.ticks?.includes('Real-world check')), 'post-baseline Real-world tick needs Nick’s PASS: '+f.name);
 }
}
console.log('PASS: tier boundaries, open-issue cap, Ready weight, generated rows, labels and filter structure');
