'use strict';
// Absolute HOLD before any imports, including fixture support or product modules.
// Releasing this requires separately reviewed dependency, lifecycle, graph,
// path-budget and child-command bindings. Producer/guard GREEN cannot release it.
throw new Error('HOLD: full-generator OLD RED and parse5/transitive bindings are not admitted in this source phase');

// Retained test intent only. Everything below is deliberately unreachable.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { admit, inventory } = require('./fixture-support.cjs');
const ctx = admit('generator');

test('real generator corrects all four range labels with independently bound OLD JSON and HTML', () => {
  const baseline = ctx.copyOldTree('label-baseline');
  const baselineCheck = ctx.run('label-baseline-check', baseline, ['tools/build-status-page.mjs', '--check']);
  assert.equal(baselineCheck.status, 0, 'unrelated old generator drift is not label RED');
  // Future adapter must overlay actual new generator modules on this OLD input
  // tree without changing JSON or seeding reviewed output; no stub is allowed.
  throw new Error('HOLD: exact old-input/new-generator overlay needs its own reviewed adapter');
  const result = ctx.run('label-generation', baseline, ['tools/build-status-page.mjs']);
  assert.equal(result.status, 0);
  const html = fs.readFileSync(path.join(baseline, 'release-evidence.html'), 'utf8');
  const start = html.indexOf('<!--PLATFORM-PROGRESS-->'), end = html.indexOf('<!--/PLATFORM-PROGRESS-->');
  assert.ok(start >= 0 && end > start);
  const section = html.slice(start, end);
  assert.equal((section.match(/90 to 99%/g) || []).length, 4);
  assert.equal((section.match(/90 to 98%/g) || []).length, 0);
});
test('real full generator produces exact reviewed page and preserves every unleased output', () => {
  const baseline = ctx.copyOldTree('baseline');
  const old = ctx.run('baseline-generator', baseline, ['tools/build-status-page.mjs', '--check']);
  assert.equal(old.status, 0, 'unrelated baseline/dependency failure is not this regression');
  // Actual successor code/data, but separately bound OLD HTML inputs. The
  // expected reviewed page is never used to seed the generator's output.
  const candidate = ctx.copyCandidateTree('candidate', false);
  const before = inventory(candidate);
  const result = ctx.run('candidate-generator', candidate, ['tools/build-status-page.mjs']);
  assert.equal(result.status, 0, 'actual full generator must succeed');
  assert.deepEqual(fs.readFileSync(path.join(candidate, 'release-evidence.html')),
    fs.readFileSync(path.join(ctx.b.candidateRoot, 'release-evidence.html')));
  const after = inventory(candidate);
  delete before['release-evidence.html']; delete after['release-evidence.html'];
  assert.deepEqual(after, before, 'no unleased file/directory may be added, removed or modified');
  const check = ctx.run('candidate-generator-check', candidate, ['tools/build-status-page.mjs', '--check']);
  assert.equal(check.status, 0, 'real generator output must be stable');
});
