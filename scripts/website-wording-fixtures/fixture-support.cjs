'use strict';
// SOURCE ONLY until ROOT admits this exact GREEN packet and current STARTED turn.
// The reviewed outer launcher must supply a minimal environment before Node starts.
// ROOT's live queue/current-turn/idle ownership and global start-floor checks stay
// external requirements; this normalized future contract is not a SOURCE start GO.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const OLD_COMMIT = '1673d883421ba0b81cc4cce4554adf790b54f964';
const SCOPE = 'WEBSITE_PRODUCER_GUARD_GREEN';
const FIXTURES = ['fixture-support.cjs', 'platform-progress-contract.test.cjs',
  'evidence-guard-contract.test.cjs', 'full-generator-contract.test.cjs'];
const IDS = ['feature-android-phone-app-playing-films-seeking-picture-in-picture',
  'feature-android-phone-app-campsite-host-start-and-stop'];
const NEED_PATHS = ['/platformProgress/platforms/1/almostNeeds/1/need',
  '/platformProgress/platforms/1/almostNeeds/3/need'];
const clone = d => JSON.parse(JSON.stringify(d));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function inside(root, relative) {
  assert.ok(path.isAbsolute(root), 'absolute owned root required');
  assert.ok(typeof relative === 'string' && !path.isAbsolute(relative), 'relative path required');
  const dest = path.resolve(root, relative);
  const rel = path.relative(root, dest);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'path escapes owned root');
  return dest;
}
function noLinks(p) {
  assert.ok(path.isAbsolute(p), 'absolute path required');
  for (let q = p; ; q = path.dirname(q)) {
    assert.ok(!fs.lstatSync(q).isSymbolicLink(), 'linked fixture path: ' + q);
    if (q === path.parse(q).root) break;
  }
}
function readJson(p) {
  noLinks(p);
  assert.ok(fs.lstatSync(p).isFile(), 'ordinary JSON file required');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function checkFile(entry, root) {
  assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  const p = inside(root, entry.path);
  noLinks(p);
  assert.ok(fs.lstatSync(p).isFile(), 'ordinary fixture file required');
  assert.equal(sha(p), entry.sha256, 'source drift: ' + entry.path);
  return p;
}
function writeJson(p, value) {
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function bindApprovalBytes(receiptPath) {
  const expected = process.env.BEEBO_WEBSITE_APPROVAL_SHA256;
  assert.match(expected || '', /^[a-f0-9]{64}$/, 'exact ROOT approval SHA256 required');
  noLinks(receiptPath);
  assert.equal(sha(receiptPath), expected, 'ROOT approval receipt bytes changed');
}
function bindLifecycle(receipt, receiptPath) {
  bindApprovalBytes(receiptPath);
  assert.equal(receipt.maximumInvocations, 1, 'one outer suite invocation per receipt');
  const issued = Date.parse(receipt.issuedEastern), expires = Date.parse(receipt.expiresEastern);
  const now = Date.now();
  assert.ok(Number.isFinite(issued) && Number.isFinite(expires) && issued < expires,
    'valid approval issue/expiry times required');
  assert.ok(issued <= now && now < expires, 'ROOT approval not yet valid or expired');
  const life = receipt.lifecycle;
  assert.ok(life && typeof life === 'object', 'ROOT STARTED lifecycle required');
  assert.equal(life.phase, 'STARTED', 'RESERVED and historical phase records do not admit runtime');
  assert.equal(life.executionScope, SCOPE);
  assert.ok(Number.isSafeInteger(life.startEpochSeconds) && life.startEpochSeconds > 0);
  const envFields = {
    ownerThreadId: 'BEEBO_WEBSITE_OWNER', reservationToken: 'BEEBO_WEBSITE_TOKEN',
    cardPath: 'BEEBO_WEBSITE_CARD', cardSha256: 'BEEBO_WEBSITE_CARD_SHA256',
    phase: 'BEEBO_WEBSITE_PHASE', turnId: 'BEEBO_WEBSITE_TURN',
    startEpochSeconds: 'BEEBO_WEBSITE_START_EPOCH', executionScope: 'BEEBO_WEBSITE_EXECUTION_SCOPE'
  };
  for (const [field, env] of Object.entries(envFields)) {
    assert.ok(life[field] !== undefined && String(life[field]).length > 0, 'missing lifecycle ' + field);
    assert.equal(process.env[env], String(life[field]), 'current launcher lifecycle mismatch: ' + field);
  }
  assert.ok(path.isAbsolute(life.cardPath));
  noLinks(life.cardPath);
  assert.equal(sha(life.cardPath), life.cardSha256, 'card changed after ROOT admission');
  const start = receipt.actualStartReceipt;
  assert.ok(start && path.isAbsolute(start.path), 'separate ROOT actualstart receipt required');
  noLinks(start.path);
  assert.equal(sha(start.path), start.sha256, 'actualstart receipt drift');
  const actual = readJson(start.path).lifecycle;
  assert.ok(actual && typeof actual === 'object', 'actualstart lacks normalized GREEN lifecycle; HOLD');
  for (const field of Object.keys(envFields)) assert.equal(actual[field], life[field], 'ROOT actualstart mismatch: ' + field);
  // Current SOURCE receipts are intentionally insufficient. ROOT must separately
  // bind a GREEN start and independently verify the live owner/turn before launch.
}
function indexEntries(entries) {
  assert.ok(Array.isArray(entries) && entries.length > 0);
  const map = new Map();
  for (const e of entries) { assert.ok(!map.has(e.path), 'duplicate binding: ' + e.path); map.set(e.path, e); }
  return map;
}
function pathBudget(b, receipt, suite) {
  assert.ok(path.isAbsolute(b.runParentRoot));
  noLinks(b.runParentRoot);
  assert.ok(fs.lstatSync(b.runParentRoot).isDirectory());
  const runRoot = path.resolve(receipt.runRoot);
  assert.equal(path.dirname(runRoot), path.resolve(b.runParentRoot), 'run root outside exact parent lease');
  for (const readRoot of [b.sourceRoot, b.oldRoot, b.candidateRoot]) {
    const rel = path.relative(path.resolve(readRoot), runRoot);
    assert.ok(rel && (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)),
      'fixture output must be outside every source/baseline/candidate tree');
  }
  assert.match(path.basename(runRoot), new RegExp('^' + suite + '-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$', 'i'));
  const children = ['admission.json'];
  if (suite === 'guard') {
    for (const label of ['baseline', 'candidate']) for (const p of b.graphs.guard) children.push(label + '/' + p);
    children.push('baseline-guard.json', 'candidate-guard.json', 'candidate-producer-diagnostics.json');
  }
  const expected = [...new Set(children)].sort();
  assert.deepEqual([...b.pathBudgetChildren[suite]].sort(), expected, 'path-budget matrix must cover every case');
  assert.ok(runRoot.length <= 240, 'run-root exceeds 240 UTF-16 units');
  for (const rel of expected) assert.ok(inside(runRoot, rel).length <= 240, 'generated path exceeds 240 UTF-16 units: ' + rel);
  assert.ok(!fs.existsSync(runRoot), 'run-root exists; never reuse or delete');
  return runRoot;
}

function admit(suite) {
  assert.ok(suite === 'producer' || suite === 'guard', 'HOLD: full generator is not admitted by this source phase');
  assert.equal(process.env.BEEBO_OFFLINE, '1');
  assert.equal(process.env.DESKTOP_TEST_OFFLINE, '1');
  assert.equal(process.env.NODE_OPTIONS || '', '', 'NODE_OPTIONS must be absent before launch');
  assert.equal(process.env.NODE_PATH || '', '', 'NODE_PATH must be absent before launch');
  const packet = process.env.BEEBO_WEBSITE_FIXTURE_PACKET;
  const receiptPath = process.env.BEEBO_WEBSITE_FIXTURE_APPROVAL;
  assert.ok(packet && path.isAbsolute(packet), 'exact external packet required');
  assert.ok(receiptPath && path.isAbsolute(receiptPath), 'ROOT receipt required; flags are not approval');
  bindApprovalBytes(receiptPath);
  const bindingPath = inside(packet, 'source-bindings.json');
  const manifestPath = inside(packet, 'packet-hashes.json');
  const b = readJson(bindingPath);
  const receipt = readJson(receiptPath);
  assert.equal(receipt.status, 'APPROVED_FOR_GREEN');
  assert.equal(receipt.suite, suite, 'one exact suite per receipt');
  assert.equal(receipt.sourceCommit, b.sourceCommit);
  assert.equal(b.oldCommit, OLD_COMMIT);
  assert.equal(receipt.bindingsSha256, sha(bindingPath));
  assert.equal(receipt.packetHashesSha256, sha(manifestPath));
  bindLifecycle(receipt, receiptPath);
  const manifest = readJson(manifestPath);
  const packetFiles = indexEntries(manifest.files);
  assert.ok(packetFiles.has('source-bindings.json') && packetFiles.has('approved-needs.json'), 'packet must bind inputs');
  for (const entry of manifest.files) checkFile(entry, packet);
  assert.deepEqual(b.fixtureFiles.map(e => e.path).sort(), FIXTURES.map(n => 'scripts/website-wording-fixtures/' + n).sort());
  for (const entry of b.fixtureFiles) {
    const p = checkFile(entry, b.sourceRoot);
    assert.equal(path.resolve(p), path.resolve(__dirname, path.basename(entry.path)), 'executing fixture is not the bound canonical copy');
  }
  assert.equal(path.resolve(process.execPath).toLowerCase(), path.resolve(b.node.path).toLowerCase());
  noLinks(process.execPath);
  assert.equal(sha(process.execPath), b.node.sha256, 'Node executable drift');
  const sources = indexEntries(b.files), olds = indexEntries(b.oldFiles), candidates = indexEntries(b.candidates);
  for (const entry of b.files) checkFile(entry, b.sourceRoot);
  for (const entry of b.oldFiles) checkFile(entry, b.oldRoot);
  for (const entry of b.candidates) checkFile(entry, b.candidateRoot);
  for (const p of b.graphs[suite]) assert.ok(sources.has(p) && olds.has(p), 'missing old/new graph binding: ' + p);
  assert.ok(sources.has('testing-status.json') && olds.has('testing-status.json'));
  assert.ok(sources.has('site-data/feature-directory.json') && olds.has('site-data/feature-directory.json'));
  assert.equal(sources.get('site-data/feature-directory.json').sha256, olds.get('site-data/feature-directory.json').sha256, 'feature identity directory must stay unchanged');
  const runRoot = pathBudget(b, receipt, suite);
  // No product import or fixture-directory creation has happened above.
  const original = readJson(inside(b.oldRoot, 'testing-status.json'));
  const current = readJson(inside(b.sourceRoot, 'testing-status.json'));
  const patch = readJson(inside(packet, 'approved-needs.json'));
  assert.equal(patch.sourceSha256, olds.get('testing-status.json').sha256, 'patch must target preserved OLD data');
  const operations = patch.operations;
  assert.equal(operations.length, 4);
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(operations.slice(i * 2, i * 2 + 2).map(o => [o.op, o.path]), [['test', NEED_PATHS[i]], ['replace', NEED_PATHS[i]]]);
  }
  assert.equal(original.platformProgress.platforms[1].id, 'android');
  const directory = readJson(inside(b.oldRoot, 'site-data/feature-directory.json')).features;
  assert.deepEqual(b.approvedFeatureIds, IDS);
  const approved = operations.filter(o => o.op === 'replace').map((op, i) => {
    const parts = op.path.split('/').slice(1);
    const parent = parts.slice(0, -1).reduce((v, k) => v[k], original);
    const matches = directory.filter(f => f.name === parent.feature && f.id === IDS[i]);
    assert.equal(matches.length, 1);
    assert.equal(op.value.length, [197, 413][i]);
    return { name: parent.feature, id: matches[0].id, text: op.value, parts };
  });
  function revised() {
    const d = clone(original);
    for (const op of operations) {
      const parts = op.path.split('/').slice(1);
      const target = parts.slice(0, -1).reduce((v, k) => v[k], d);
      const key = parts.at(-1);
      assert.equal(key, 'need');
      if (op.op === 'test') assert.equal(target[key], op.value, 'preserved OLD-value guard');
      else target[key] = op.value;
    }
    return d;
  }
  assert.deepEqual(current, revised(), 'actual new JSON must differ from OLD only at the two approved strings');
  fs.mkdirSync(runRoot, { recursive: false });
  writeJson(inside(runRoot, 'admission.json'), { suite, sourceCommit: b.sourceCommit, oldCommit: b.oldCommit,
    bindingsSha256: receipt.bindingsSha256, packetHashesSha256: receipt.packetHashesSha256,
    lifecycle: receipt.lifecycle, runRoot, startedAtUtc: new Date().toISOString() });

  function copyBoundTree(label, root, map) {
    const dest = inside(runRoot, label);
    fs.mkdirSync(dest);
    for (const rel of b.graphs[suite]) {
      const entry = map.get(rel);
      assert.ok(entry, 'missing copy binding: ' + rel);
      const input = checkFile(entry, root);
      const out = inside(dest, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(input, out, fs.constants.COPYFILE_EXCL);
      assert.equal(sha(out), entry.sha256, 'copied fixture bytes drifted');
    }
    return dest;
  }
  function copyOldTree(label) { return copyBoundTree(label, b.oldRoot, olds); }
  function copyCandidateTree(label, reviewedHtml = true) {
    const dest = copyBoundTree(label, b.sourceRoot, sources);
    assert.deepEqual(readJson(inside(dest, 'testing-status.json')), revised());
    // Future generator review must preserve OLD HTML inputs. This phase only
    // admits the complete guard, whose reviewed HTML is explicit fixture input.
    for (const rel of b.graphs[suite].filter(p => p.endsWith('.html'))) {
      const map = reviewedHtml ? candidates : olds;
      const root = reviewedHtml ? b.candidateRoot : b.oldRoot;
      const entry = map.get(rel);
      if (reviewedHtml && !entry) continue;
      assert.ok(entry, 'missing independently bound OLD HTML: ' + rel);
      fs.copyFileSync(checkFile(entry, root), inside(dest, rel));
      assert.equal(sha(inside(dest, rel)), entry.sha256);
    }
    return dest;
  }
  function run(label, cwd, args) {
    assert.equal(suite, 'guard', 'only complete guard child admitted');
    assert.deepEqual(args, ['scripts/check-evidence-tiers.cjs']);
    assert.ok(label === 'baseline-guard' || label === 'candidate-guard');
    assert.equal(path.resolve(cwd), inside(runRoot, label === 'baseline-guard' ? 'baseline' : 'candidate'));
    bindLifecycle(receipt, receiptPath);
    const env = { BEEBO_OFFLINE: '1', DESKTOP_TEST_OFFLINE: '1' };
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
    const r = spawnSync(b.node.path, args, { cwd, env, windowsHide: true, shell: false,
      encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    writeJson(inside(runRoot, label + '.json'), { args, cwd, status: r.status, signal: r.signal,
      error: r.error ? String(r.error) : null, stdout: r.stdout, stderr: r.stderr });
    assert.ok(!r.error && !r.signal, 'execution/setup error is not a behavioral result');
    return r;
  }
  return { b, original, current, approved, revised, copyOldTree, copyCandidateTree, run, runRoot };
}
function inventory(root) {
  const entries = {};
  function visit(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, name), stat = fs.lstatSync(p);
      assert.ok(!stat.isSymbolicLink(), 'unexpected link in fixture output');
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (stat.isDirectory()) { entries[rel + '/'] = 'directory'; visit(p); }
      else { assert.ok(stat.isFile()); entries[rel] = sha(p); }
    }
  }
  visit(root);
  return entries;
}
module.exports = { admit, clone, sha, inside, inventory };
