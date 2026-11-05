'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { admit, clone } = require('./fixture-support.cjs');
const ctx = admit('producer');
// Actual repaired canonical producer, loaded only after GREEN admission.
const PP = require(path.join(ctx.b.sourceRoot, 'site-data/platform-progress.js'));
assert.deepEqual(PP.compute(ctx.original).problems, [], 'preserved OLD data must remain valid');
const android = d => d.platformProgress.platforms.find(p => p.id === 'android');
const need = (d, name) => android(d).almostNeeds.find(n => n.feature === name);
const rejects = (d, name) => assert.ok(PP.compute(d).problems.some(p => p.includes(name)), 'real producer must reject ' + name);

test('default line limit remains 135 and an unrelated line accepts 135 but rejects 136', () => {
  assert.equal(PP.NEED_MAX, 135);
  const d = clone(ctx.original);
  const n = android(d).almostNeeds.find(n => !ctx.approved.some(a => a.name === n.feature));
  n.need = 'x'.repeat(135);
  assert.deepEqual(PP.compute(d).problems, []);
  n.need += 'x';
  rejects(d, n.feature);
});
for (const approved of ctx.approved) {
  test('accept exact reviewed text for ' + approved.id, () => {
    const d = clone(ctx.original);
    need(d, approved.name).need = approved.text;
    assert.deepEqual(PP.compute(d).problems, [], 'actual new producer must accept this exact approved text');
  });
  test('reject changed wording and appended text for ' + approved.id, () => {
    const d = clone(ctx.original);
    need(d, approved.name).need = approved.text[0].toLowerCase() + approved.text.slice(1);
    rejects(d, approved.name);
    need(d, approved.name).need = approved.text + 'x';
    rejects(d, approved.name);
  });
  test('reject transplantation to another real feature/platform for ' + approved.id, () => {
    const d = clone(ctx.original);
    const other = android(d).almostNeeds.find(n => !ctx.approved.some(a => a.name === n.feature));
    other.need = approved.text;
    rejects(d, other.feature);
    const w = clone(ctx.original);
    const win = w.platformProgress.platforms.find(p => p.id === 'windows').almostNeeds[0];
    win.need = approved.text;
    rejects(w, win.feature);
    // Same name, evidence and text must not carry the Android exception across groups.
    const moved = clone(ctx.original);
    const windows = moved.platformProgress.platforms.find(p => p.id === 'windows');
    const feature = clone(moved.features.find(f => f.group === android(moved).group && f.name === approved.name));
    feature.group = windows.group;
    moved.features.push(feature);
    windows.almostNeeds.push({ ...clone(need(moved, approved.name)), need: approved.text });
    assert.ok(PP.compute(moved).problems.some(p => p.startsWith('windows:') && p.includes(approved.name)),
      'same feature name and approved text in another group must not inherit the Android exception');
    // Separately require the Android platform ID, even when group/evidence match.
    const wrongId = clone(ctx.original);
    const renamed = android(wrongId);
    renamed.id = 'android-other';
    renamed.almostNeeds.find(n => n.feature === approved.name).need = approved.text;
    assert.ok(PP.compute(wrongId).problems.some(p => p.startsWith('android-other:') && p.includes(approved.name)),
      'approved text in the Android group must still require the exact platform ID');
  });
  test('basis checks still apply to approved text for ' + approved.id, () => {
    const d = clone(ctx.current);
    need(d, approved.name).basis = [];
    assert.ok(PP.compute(d).problems.some(p => p.includes(approved.name) && p.includes('basis quote')));
    need(d, approved.name).basis = ['This exact phrase is deliberately absent from the evidence record.'];
    assert.ok(PP.compute(d).problems.some(p => p.includes(approved.name) && p.includes('no longer in the record')));
  });
}
test('both reviewed texts preserve all source data and all computed evidence counts', () => {
  const d = clone(ctx.current);
  const before = JSON.stringify(d);
  const result = PP.compute(d);
  assert.deepEqual(result.problems, []);
  assert.equal(JSON.stringify(d), before);
  assert.deepEqual(result.platforms.map(p => p.stats), PP.compute(ctx.original).platforms.map(p => p.stats));
  const restored = clone(d);
  for (const a of ctx.approved) need(restored, a.name).need = need(ctx.original, a.name).need;
  assert.deepEqual(restored, ctx.original, 'only the two approved needs may differ');
});
test('both real platform sentences describe the almost-there tier through 99', () => {
  const result = PP.compute(ctx.current);
  assert.equal(result.platforms.length, 2);
  for (const p of result.platforms) {
    assert.ok(p.sentence.includes('(90 to 99%)'));
    assert.ok(!p.sentence.includes('(90 to 98%)'));
  }
});
