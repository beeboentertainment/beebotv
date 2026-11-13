import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let fixture;
const git = args => execFileSync('git', args, { cwd: fixture || root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' });
const run = (script, args = []) => {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: fixture, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  return { code: result.status, output: result.stdout + result.stderr };
};
const change = (file, edit, check) => {
  const path = join(fixture, file), original = readFileSync(path, 'utf8');
  try { writeFileSync(path, edit(original)); check(); }
  finally { writeFileSync(path, original); }
};

before(() => {
  const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
  mkdirSync(join(root, 'node_modules', '.cache'), { recursive: true });
  fixture = mkdtempSync(join(root, 'node_modules', '.cache', 'site-checks-'));
  for (const file of files) {
    const destination = join(fixture, file);
    mkdirSync(dirname(destination), { recursive: true });
    // Only shell-target existence is relevant for binary assets in this fixture.
    if (/\.(html|json|[cm]?js|css|txt|xml|md)$/.test(file)) cpSync(join(root, file), destination);
    else writeFileSync(destination, 'synthetic fixture asset');
  }
  git(['init', '-q']);
  git(['add', '-f', '.']);
  git(['-c', 'user.name=Site check fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Fixture baseline']);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
});
after(() => { if (fixture) rmSync(fixture, { recursive: true, force: true }); });

test('feature check accepts CRLF checkout without rewriting pages', () => {
  const file = 'features/feature-android-phone-app-opening-the-app-and-the-five-tabs.html';
  change(file, s => s.replace(/\r?\n/g, '\r\n'), () => {
    const before = readFileSync(join(fixture, file));
    const result = run('tools/build-feature-pages.mjs', ['--check']);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(readFileSync(join(fixture, file)), before);
  });
});

test('feature check still rejects a real content change', () => {
  change('features/feature-android-phone-app-opening-the-app-and-the-five-tabs.html', s => s.replace('Screenshots coming soon', 'Invented screenshots'), () => {
    const result = run('tools/build-feature-pages.mjs', ['--check']);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /Feature page is out of date/);
  });
});

test('shell check covers current canonical pages and explicit standalone exceptions', () => {
  const result = run('scripts/check-site-shell.mjs');
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /111 canonical pages; 99 unchanged exceptions \(210 HTML files total\)/);
});

test('dependencies and local check snapshots are outside the website inventory', () => {
  for (const directory of ['node_modules/example', 'site-check/private-snapshot']) {
    mkdirSync(join(fixture, directory), { recursive: true });
    writeFileSync(join(fixture, directory, 'index.html'), '<p>Local tooling fixture</p>');
  }
  const result = run('scripts/check-site-shell.mjs');
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /210 HTML files total/);
});

test('shell check rejects an edited page body against its base', () => {
  change('about-beebo.html', s => s.replace('</main>', '<p>Unreviewed claim</p></main>'), () => {
    const result = run('scripts/check-site-shell.mjs');
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /about-beebo.html: page body changed outside the shell/);
  });
});

test('shell check rejects a damaged canonical header', () => {
  change('about-beebo.html', s => s.replace('BEEBO-SHELL-HEADER:START', 'BROKEN-HEADER:START'), () => {
    const result = run('scripts/check-site-shell.mjs');
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /about-beebo.html: HEADER missing, duplicated or noncanonical/);
  });
});

test('shell check rejects protected feed changes', () => {
  change('desktop-version.json', s => s + '\n ', () => {
    const result = run('scripts/check-site-shell.mjs');
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /desktop-version.json: protected data changed/);
  });
});

test('standalone exceptions still require unchanged bytes against the base', () => {
  change('ai-test-results.html', s => s + '<p>Unreviewed result</p>', () => {
    const result = run('scripts/check-site-shell.mjs');
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /ai-test-results.html: excluded page changed/);
  });
});

test('an unknown new page cannot silently bypass canonical shell checks', () => {
  const path = join(fixture, 'new-page.html');
  try {
    writeFileSync(path, '<!doctype html><body><main>New page</main></body>');
    const result = run('scripts/check-site-shell.mjs');
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /new-page.html: HEADER missing, duplicated or noncanonical/);
  } finally { rmSync(path); }
});

test('an explicit historical base remains available and fails clearly for missing baseline files', () => {
  const result = run('scripts/check-site-shell.mjs', ['--base', 'missing-ref']);
  assert.notEqual(result.code, 0, result.output);
  assert.match(result.output, /missing-ref/);
});
