#!/usr/bin/env node
/*
 * Rewrites the "99% scoreboard" block in release-evidence.html from testing-status.json.
 * Usage: node site-data/build-scoreboard.js "Oct 25, 2026, 4:50 AM Eastern"
 * Only the text between <!--SCOREBOARD--> and <!--/SCOREBOARD--> changes.
 */
const fs = require('fs');
const path = require('path');
const stamp = process.argv[2];
if (!stamp) { console.error('give the Eastern stamp, e.g. "Oct 25, 2026, 4:50 AM Eastern"'); process.exit(1); }
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'testing-status.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = data.features;
const ck = (f, k) => Boolean(f.checks && f.checks[k]);
const top = rows.filter((f) => f.percentComplete >= 99);
const rest = rows.filter((f) => f.percentComplete < 99);
const held = rest.filter((f) => ck(f, 'Real device') && ck(f, 'Real-world check'));
const real = rest.filter((f) => ck(f, 'Real device') && !ck(f, 'Real-world check'));
const dev = rest.filter((f) => !ck(f, 'Real device') && ck(f, 'Built') && ck(f, 'Automated tests'));
const low = rest.filter((f) => !ck(f, 'Real device') && !(ck(f, 'Built') && ck(f, 'Automated tests')));
const names = (list) => list.map((f) => esc(f.name)).join('; ');
const html = [
  '<!--SCOREBOARD-->',
  '<section class="evidence-scoreboard" id="scoreboard" aria-labelledby="scoreboard-title" style="margin:18px 0;padding:16px 18px;border:1px solid currentColor;border-radius:10px">',
  '<h2 id="scoreboard-title" style="margin-top:0">99% scoreboard</h2>',
  `<p><strong>${top.length} of ${rows.length} features are at 99%</strong> (updated <time>${esc(stamp)}</time>). 99% means built, tested automatically, tested on a real device and checked in the real world. It is not 100%: Nick’s own final sound-and-picture check and the Ready tick come last.</p>`,
  '<ul>',
  `<li><strong>At 99% (${top.length}):</strong> ${names(top)}.</li>`,
  `<li><strong>Tested on real devices and in the real world, but held below 99% by an open problem or a stated cap (${held.length}):</strong> ${names(held)}. Fixing or re-testing that one problem is the next step for each.</li>`,
  `<li><strong>Missing only a real-world check (${real.length}):</strong> built and tested on real devices; a real-world scenario is still needed.</li>`,
  `<li><strong>Missing a real-device test and a real-world check (${dev.length}):</strong> built and tested automatically.</li>`,
  `<li><strong>Early or not built (${low.length}):</strong> ${names(low)}.</li>`,
  '</ul>',
  '<p>Numbers are counted from the rows below by <code>site-data/build-scoreboard.js</code>; nothing here is typed by hand.</p>',
  '</section>',
  '<!--/SCOREBOARD-->',
].join('\n');
const file = path.join(root, 'release-evidence.html');
let page = fs.readFileSync(file, 'utf8');
if (page.includes('<!--SCOREBOARD-->')) {
  page = page.replace(/<!--SCOREBOARD-->[\s\S]*?<!--\/SCOREBOARD-->/, () => html);
} else {
  const marker = '<!--/HERO-NEWER-->';
  if (!page.includes(marker)) { console.error('hero marker missing'); process.exit(1); }
  page = page.replace(marker, () => marker + '\n        ' + html);
}
fs.writeFileSync(file, page, 'utf8');
console.log('99%:', top.length, 'held:', held.length, 'real-only:', real.length, 'dev:', dev.length, 'low:', low.length);
