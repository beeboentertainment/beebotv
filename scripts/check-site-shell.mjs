#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'parse5';
import { root, revision, htmlPages, exclusion, shellBlocks, redesignedPages, blockRE, render, bodyContent } from './site-shell.mjs';

// The fixed October migration snapshot in site-shell.mjs predates current pages,
// content and releases. Preserve bodies/exceptions/feeds against the target branch
// instead. For a historical migration audit pass --base <exact pre-change SHA>.
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--base' || !args[1])) {
  throw Error('Usage: node scripts/check-site-shell.mjs [--base <ref>]');
}
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
const base = git(['rev-parse', '--verify', `${args[1] || 'origin/main'}^{commit}`]).trim();
const baselineFiles = new Set(git(['ls-tree', '-r', '--name-only', '-z', base]).split('\0'));

const problems = [], pages = htmlPages();
const normalize = text => text.replace(/\r\n/g, '\n');
const read = file => normalize(readFileSync(join(root, file), 'utf8'));
const original = file => baselineFiles.has(file) ? normalize(git(['show', `${base}:${file}`])) : undefined;
const requireValue = (ok, note) => { if (!ok) problems.push(note); };
// Only these explicitly redesigned pages may cross from the old presentation.
// Subsequent checks against a redesigned baseline still compare the whole body.
const legalContainer = (source, file) => {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const wanted = file === 'delete-account.html' ? ['del-wrap'] : ['wrap', 'doc'];
  const matches = [], scripts = [];
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
    const classes = (attrs.class || '').split(/\s+/);
    const loc = node.sourceCodeLocation;
    if (wanted.every(c => classes.includes(c)) && loc?.endTag) matches.push(source.slice(loc.startTag.endOffset, loc.endTag.startOffset));
    if (file === 'delete-account.html' && node.tagName === 'script' && !attrs.src && !attrs.type && loc) scripts.push(source.slice(loc.startOffset, loc.endOffset));
    for (const child of node.childNodes || []) visit(child);
  }
  visit(document);
  return matches.length === 1 && (file !== 'delete-account.html' || scripts.length === 1) ? JSON.stringify([matches[0], scripts]) : null;
};
const ids = source => [...source.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
let checked = 0, excluded = 0, added = 0, redesigned = 0;
for (const file of baselineFiles) {
  if (file.endsWith('.html') && !file.startsWith('site-check/') && !file.startsWith('node_modules/')) requireValue(pages.includes(file), `${file}: baseline HTML path removed`);
}
for (const file of pages) {
  const source = read(file), before = original(file);
  if (before === undefined) added++;
  if (exclusion(file)) {
    excluded++;
    requireValue(before !== undefined && source === before, `${file}: excluded page changed or absent from base (review its generator separately)`);
    continue;
  }
  checked++;
  const modern = redesignedPages.has(file);
  if (modern) redesigned++;
  for (const [name, expected] of shellBlocks(file)) {
    const matches = [...source.matchAll(blockRE(name))];
    requireValue(matches.length === 1 && matches[0][0] === expected, `${file}: ${name} missing, duplicated or noncanonical`);
  }
  try { requireValue(source === render(source, file), `${file}: generator is not idempotent`); }
  catch (error) { problems.push(error.message); }
  if (before !== undefined) {
    const designMigration = modern && !before.includes('class="site-header"');
    if (!designMigration) {
      requireValue(bodyContent(source, file) === bodyContent(before, file), `${file}: page body changed outside the shell`);
      requireValue(source.match(/<body\b[^>]*>/i)?.[0] === before.match(/<body\b[^>]*>/i)?.[0], `${file}: body attributes changed`);
    }
    if (modern && ['terms.html', 'movie-privacy.html', 'delete-account.html'].includes(file)) {
      const legal = legalContainer(before, file);
      requireValue(legal !== null && legalContainer(source, file) === legal, `${file}: protected legal content or deletion script changed`);
    }
    if (modern && file === 'index.html') {
      const currentIds = ids(source);
      requireValue(ids(before).every(id => currentIds.includes(id)), `${file}: original fragment ID removed`);
    }
  }
  for (const tag of source.matchAll(/<link\b[^>]*href=["'](?:\/|\.\.\/|\.\/)?(site|polish|refresh|example|corporate-home|corporate-supporting-dark|aurora-editorial|rectangular-buttons)\.css([^"']*)["'][^>]*>/g)) {
    requireValue(tag[2] === '?v=' + revision, `${file}: inconsistent cache key for ${tag[1]}.css`);
  }
  requireValue((source.match(modern ? /class="site-header"/g : /class="beebo-site-header"/g) || []).length === 1, `${file}: duplicate site header`);
  requireValue((source.match(/class="beebo-tester-banner"/g) || []).length === (modern || file === 'index.html' ? 0 : 1), `${file}: duplicate tester banner`);
  if (modern) requireValue(!/class="beebo-site-header"|class="beebo-shell-footer"|(?:website-shell|beebo-testers)\.(?:js|css)/.test(source), `${file}: legacy shell mixed into redesigned page`);
  const shell = shellBlocks(file).map(([, value]) => value).join('');
  for (const match of shell.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replace(/&amp;/g, '&');
    const url = new URL(raw, 'https://shell.invalid/' + file);
    if (url.origin !== 'https://shell.invalid') continue;
    const pathname = decodeURIComponent(url.pathname);
    const target = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!existsSync(target)) { problems.push(`${file}: missing shell target ${raw}`); continue; }
    requireValue(statSync(target).isFile(), `${file}: shell target is not a file: ${raw}`);
    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      const html = readFileSync(target, 'utf8');
      const ids = [...html.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)].map(m => m[1]);
      requireValue(ids.includes(id), `${file}: missing shell anchor ${raw}`);
    }
  }
}
for (const file of ['testing-status.json','desktop-version.json','downloads/app-build.json','downloads/auto-build.json','relay-pricing.json']) {
  requireValue(read(file) === original(file), `${file}: protected data changed`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`PASS: ${checked} canonical pages; ${excluded} unchanged exceptions (${pages.length} HTML files total). Markers, links/anchors, assets, idempotence, bodies and protected data verified against ${base}; ${added} new canonical pages have no baseline body comparison; ${redesigned} use the redesigned shell.`);
