#!/usr/bin/env node
// Stamps the static fallback text in every page's version footer
// (the `data-beebo-release-*` markup rendered by polish.js) so it matches
// the current desktop-version.json / downloads/app-build.json at publish
// time.
//
// Why this exists: polish.js already fetches those two JSON files at page
// load and rewrites the footer live, so a signed-in browser always sees the
// current numbers regardless of what is baked into the HTML. But the baked
// text is what a no-JavaScript visitor, a search-engine crawler, a social
// link-preview bot, or a browser where the fetch fails actually sees, and
// nothing was keeping it in sync -- it just carried whatever version was
// live the last time a given page happened to be edited for something
// else. Run this after every release (after desktop-version.json and
// downloads/app-build.json are updated) so every page's fallback text is
// never more than one release out of date, not indefinitely stale.
//
// This does not change anything about the live, JS-driven number
// (polish.js remains the single source of truth for what a real visitor's
// browser shows) and does not "fix" the ~10 minute window after a release
// where a visitor can briefly see mismatched numbers on different pages
// because GitHub Pages' CDN caches desktop-version.json/app-build.json for
// up to 10 minutes (Cache-Control: max-age=600) per edge node -- that is
// normal CDN propagation, self-heals well inside the same visit, and is
// not something a static site can avoid without disabling that caching
// (which would trade a large amount of origin load for closing a
// ten-minute window). See RELEASING.md.
//
// Usage: node tools/stamp-release-footers.mjs [--check]
//   --check  exit non-zero if any matching page's baked footer is stale,
//            without writing anything (useful in CI/pre-publish checks).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes('--check');

const SKIP_DIRS = new Set(['.git', '.codex', 'node_modules', '_scratch', '.claude']);

function findHtmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      findHtmlFiles(full, out);
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function readJson(relPath) {
  return JSON.parse(readFileSync(join(repoRoot, relPath), 'utf8'));
}

const easternFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Toronto',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

// Mirrors polish.js's own `show()` logic exactly, so the baked fallback
// text is never visually distinguishable from what the live fetch would
// render.
function releaseLabel(stampIso, released) {
  const date = new Date(stampIso);
  if (!stampIso || !Number.isFinite(date.getTime())) {
    return { datetime: null, text: 'Release time unavailable' };
  }
  return {
    datetime: date.toISOString(),
    text: (released ? 'Released ' : 'Built ') + easternFormatter.format(date) + ' Eastern',
  };
}

const desktop = readJson('desktop-version.json');
const android = readJson('downloads/app-build.json');

const windowsVersionText = desktop.version;
const windowsStamp = desktop.publishedAtUtc || desktop.releasedAt || desktop.publishedAt;
const windowsDate = releaseLabel(windowsStamp, true);

const androidVersionText = (android.versionName || android.version) +
  (android.versionCode ? ` (build ${android.versionCode})` : '');
const androidStamp = android.publishedAtUtc || android.builtAtUtc;
const androidDate = releaseLabel(androidStamp, Boolean(android.publishedAtUtc));

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stampPlatform(html, platform, versionText, dateInfo) {
  let changed = false;

  const versionRe = new RegExp(
    `(<strong data-beebo-release-version="${platform}">)([^<]*)(</strong>)`
  );
  const newVersion = escapeHtml(versionText);
  html = html.replace(versionRe, (m, pre, cur, post) => {
    if (cur === newVersion) return m;
    changed = true;
    return pre + newVersion + post;
  });

  const dateRe = new RegExp(
    `(<time data-beebo-release-date="${platform}" datetime=")([^"]*)("[^>]*>)([^<]*)(</time>)`
  );
  html = html.replace(dateRe, (m, pre, curDatetime, mid, curText, post) => {
    const newDatetime = dateInfo.datetime ?? '';
    const newText = escapeHtml(dateInfo.text);
    if (curDatetime === newDatetime && curText === newText) return m;
    changed = true;
    return pre + newDatetime + mid + newText + post;
  });

  return { html, changed };
}

const files = findHtmlFiles(repoRoot);
const staleFiles = [];
let updatedCount = 0;
let scannedCount = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes('data-beebo-release-version')) continue;
  scannedCount++;

  let html = original;

  const w = stampPlatform(html, 'windows', windowsVersionText, windowsDate);
  html = w.html;
  const a = stampPlatform(html, 'android', androidVersionText, androidDate);
  html = a.html;
  const changed = w.changed || a.changed;

  if (changed) {
    staleFiles.push(file);
    if (!check) {
      writeFileSync(file, html, 'utf8');
      updatedCount++;
    }
  }
}

if (check) {
  if (staleFiles.length) {
    console.error(`${staleFiles.length} page(s) have a stale baked-in version footer:`);
    for (const f of staleFiles) console.error('  ' + f);
    console.error('Run: node tools/stamp-release-footers.mjs');
    process.exit(1);
  }
  console.log('All page footers match desktop-version.json / downloads/app-build.json.');
} else {
  console.log(`Scanned ${scannedCount} page(s) with a version footer.`);
  console.log(`Updated ${updatedCount} page(s) to Windows ${windowsVersionText} / Android ${androidVersionText}.`);
}