const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const inputs = [
  'site-data/build-what-we-offer.js', 'site-data/progress-score.js', 'site-data/platform-progress.js',
  'site-data/what-we-offer.json', 'site-data/evidence-map.json', 'site-data/what-we-offer-summary.json',
  'desktop-version.json', 'downloads/app-build.json', 'downloads/auto-build.json', 'testing-status.json',
  'index.html', 'testing.html', 'what-we-offer.html', 'llms.txt',
];
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beebo-offer-generator-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const file of inputs) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  const read = file => fs.readFileSync(path.join(dir, file), 'utf8');
  const write = (file, text) => fs.writeFileSync(path.join(dir, file), text);
  const run = (...args) => spawnSync(process.execPath, ['site-data/build-what-we-offer.js', ...args], {
    cwd: dir, encoding: 'utf8', windowsHide: true,
  });
  const initial = run();
  assert.equal(initial.status, 0, initial.stderr);
  return { dir, read, write, run };
}

test('offer generation is idempotent and preserves its source records and legacy page', t => {
  const f = fixture(t);
  for (const file of ['site-data/what-we-offer.json', 'site-data/evidence-map.json', 'site-data/what-we-offer-summary.json', 'testing-status.json', 'desktop-version.json', 'downloads/app-build.json', 'downloads/auto-build.json', 'what-we-offer.html']) {
    assert.equal(f.read(file), fs.readFileSync(path.join(root, file), 'utf8'), file + ' stays byte-identical');
  }
  const before = ['index.html', 'testing.html', 'llms.txt'].map(f.read);
  const again = f.run();
  assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(['index.html', 'testing.html', 'llms.txt'].map(f.read), before);
  const check = f.run('--check');
  assert.equal(check.status, 0, check.stderr);
});

test('hand edits to the generated known-problems list fail check and are repaired by generation', t => {
  const f = fixture(t);
  const saved = f.read('testing.html');
  assert.ok(saved.includes('<ul data-offer-problems>'));
  f.write('testing.html', saved.replace('<ul data-offer-problems>', '<ul data-offer-problems><li>Invented clearance</li>'));
  const check = f.run('--check');
  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stderr, /out of date: testing\.html/);
  assert.ok(f.read('testing.html').includes('Invented clearance'), '--check never writes');
  assert.equal(f.run().status, 0);
  assert.equal(f.read('testing.html'), saved);
});

test('JSON-only changes regenerate escaped known problems and status counts on every new surface', t => {
  const f = fixture(t);
  const data = JSON.parse(f.read('site-data/what-we-offer.json'));
  const summary = JSON.parse(f.read('site-data/what-we-offer-summary.json'));
  data.knownProblems.push('Fixture <check> & "limits" remain.');
  data.features.push({ id: 'fixture-planned', name: 'Fixture planned feature', area: data.areas[0].id, status: 'Planned', realTest: 'no', evidence: 'A fixture idea that has not been tested.' });
  f.write('site-data/what-we-offer.json', JSON.stringify(data));
  assert.equal(f.run('--check').status, 1);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  for (const file of ['index.html', 'testing.html', 'llms.txt']) {
    assert.ok(f.read(file).includes(data.features.length + ' features'), 'live feature total: ' + file);
    assert.ok(f.read(file).includes((summary.overall.byStatus.Planned + 1) + ' Planned'), 'live Planned count: ' + file);
  }
  assert.ok(f.read('testing.html').includes('<li>Fixture &lt;check&gt; &amp; &quot;limits&quot; remain.</li>'));
  assert.ok(!f.read('testing.html').includes('Fixture <check>'), 'source text never becomes markup');
  assert.equal(f.run('--check').status, 0);
});
