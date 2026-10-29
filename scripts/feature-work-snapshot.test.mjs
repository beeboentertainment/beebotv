import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(new URL('../testing-status.json', import.meta.url), 'utf8'));
const page = readFileSync(new URL('../release-evidence.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../testing-evidence.css', import.meta.url), 'utf8');
const cards = [...page.matchAll(/<article\b[^>]*class="feature-work-card\b[^>]*>[\s\S]*?<\/article>/g)].map(m => m[0]);
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
