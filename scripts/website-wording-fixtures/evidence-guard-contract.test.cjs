'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { admit, inventory } = require('./fixture-support.cjs');
const ctx = admit('guard');

test('actual new complete evidence guard accepts the reviewed candidate and preserves evidence rules', () => {
  // OLD modules, guard, JSON and HTML are independently bound; never read from
  // the already-updated checkout as a substitute for this baseline.
  const baseline = ctx.copyOldTree('baseline');
  const oldInventory = inventory(baseline);
  const old = ctx.run('baseline-guard', baseline, ['scripts/check-evidence-tiers.cjs']);
  assert.equal(old.status, 0, 'BASELINE STOP: preserved old complete guard must pass');
  assert.deepEqual(inventory(baseline), oldInventory, 'read-only old guard changed its fixture tree');

  // Actual new code/data plus exact reviewed HTML, only in this fresh owned copy.
  const candidate = ctx.copyCandidateTree('candidate');
  const candidateInventory = inventory(candidate);
  const PP = require(path.join(candidate, 'site-data/platform-progress.js'));
  const diagnostics = PP.compute(ctx.current).problems;
  fs.writeFileSync(path.join(ctx.runRoot, 'candidate-producer-diagnostics.json'),
    JSON.stringify(diagnostics, null, 2) + '\n', { flag: 'wx' });
  assert.deepEqual(diagnostics, [], 'GREEN requires the real repaired producer to accept actual new data');
  const result = ctx.run('candidate-guard', candidate, ['scripts/check-evidence-tiers.cjs']);
  assert.equal(result.status, 0, 'GREEN requires the real complete new evidence guard to pass');
  assert.deepEqual(inventory(candidate), candidateInventory, 'read-only new guard changed its fixture tree');
});
