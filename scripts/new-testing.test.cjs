const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const {render, featureId} = require('../assets/new-testing.js');
const data = JSON.parse(fs.readFileSync('testing-status.json', 'utf8'));
const runs = JSON.parse(fs.readFileSync('site-data/ai-tested.json', 'utf8'));
const documentFor = value => new JSDOM(render(value, runs)).window.document;
const row = (doc, name) => doc.getElementById(featureId(name));

test('Trip Journal retains the narrow owner pass, later partial export and unverified audio', () => {
  const doc = documentFor(data);
  const trip = row(doc, 'Trip Journal (trips, recap, video export)');
  const text = trip.textContent;
  assert.match(text, /Trip start, share and video export were not exercised; the export failure remains open/);
  assert.match(text, /Oct 27, 2026, 11:32 to 11:48 AM Eastern/);
  assert.match(text, /PARTIAL/);
  assert.match(text, /1080p choice gave a 720p file/);
  assert.match(text, /finished video was not played end to end/);
  assert.match(text, /Not verified:.*audio/);
  assert.doesNotMatch(text, /Latest structured record/);
  assert.match(text, /Other dated checks below may be later/);
});

test('Known failures and remaining work remain readable when no latestCheck exists', () => {
  const doc = documentFor(data);
  const vpn = row(doc, 'BeeboVPN').textContent;
  assert.match(vpn, /25 passed and 55 failed/);
  assert.match(vpn, /configuration-validation failure/);
  assert.match(vpn, /No repaired installed VPN or native tunnel acceptance is added/);
});

test('Redaction preserves limits and rejects source references, private details and HTML execution', () => {
  const altered = structuredClone(data);
  const feature = altered.features.find(item => item.name === 'Trip Journal (trips, recap, video export)');
  const record = feature.ownerTests.find(item => item.date === feature.latestCheck.at);
  record.notes = 'Not verified: audio. Source ledger: private evidence archive. commit abcdef0123456789 and C:\\private\\test.json; 192.168.4.22; person@example.test. Keep49; add exact bounded evidence, not new whole-row device/real-world ticks. Still required: play the final video. <img src=x onerror=alert(1)>';
  const doc = documentFor(altered);
  const trip = row(doc, feature.name);
  assert.match(trip.textContent, /Not verified: audio/);
  assert.match(trip.textContent, /Still required: play the final video/);
  assert.doesNotMatch(trip.textContent, /abcdef0123456789|C:\\private|192\.168\.4\.22|person@example\.test|Keep49|add exact bounded evidence/);
  assert.equal(trip.querySelectorAll('img, script').length, 0);
});

test('Auto retains older limited car evidence without claiming current-build acceptance', () => {
  const doc = documentFor(data);
  const auto = row(doc, 'Beebo Auto (Android Auto)').textContent;
  assert.match(auto, /limited car checks on older builds/);
  assert.match(auto, /Oct 6 and Oct 27, 2026/);
  assert.match(auto, /current build \(1\.22\) has not been tested in a real car/);
  assert.match(auto, /Beebo Auto 1\.20/);
  assert.match(auto, /Bounded observation by the owner, not a whole-feature acceptance/);
  assert.match(auto, /19 PASS \/ 0 FAIL \/ 6 NOT RUN/);
  assert.doesNotMatch(auto, /never (?:been )?tested in a real car/i);
  const text = doc.body.textContent;
  assert.doesNotMatch(text, /\b(?:keep|retain)\s*\d+|add exact bounded evidence|\bPuck\b|kid-safe|100\s*%|\$\s*\d|\b2099\b/i);
  assert.doesNotMatch(text, /\$|\bprice(?:s)?\b/i);
  assert.doesNotMatch(text, /\b(?:main|commit|SHA)\s+[a-f0-9]{7,64}\b|[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
});

test('Actual evidence contains no glued source identifiers or stale scoring instructions', () => {
  const text = documentFor(data).body.textContent;
  assert.doesNotMatch(text, /[a-f0-9]{40,64}/i);
  assert.doesNotMatch(text, /If Nick wants the whole row|Earlier dated record \(kept\)/i);
  assert.match(text, /1080p choice gave a 720p file/);
});

test('Private labels fail closed while unchanged evidence renders', () => {
  assert.doesNotThrow(() => render(data, runs));
  for (const field of ['name', 'group']) {
    const altered = structuredClone(data);
    altered.features[0][field] = 'Contact test@example.invalid';
    assert.throws(() => render(altered, runs), /Feature record unavailable/);
  }
  const altered = structuredClone(data);
  altered.updatedEastern = 'Contact test@example.invalid';
  assert.throws(() => render(altered, runs), /Evidence format unavailable/);
});
