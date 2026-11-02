import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { featureDirectory, escape as esc, activityMarkup, activityDirectoryMarkup } from './feature-directory.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(readFileSync(join(root, 'testing-status.json'), 'utf8'));
const check = process.argv.includes('--check');
const kinds = { CODE: 'Implementation or fixes', DEVICE: 'Device and real-world checks', NICK: 'Final owner acceptance', BLOCKED: 'Unresolved prerequisites' };
const checks = { Built: 'Built', 'Automated tests': 'Automated checks', 'Real device': 'Real-device checks', 'Real-world check': 'Real-world checks', 'Ready to call Available': 'Final acceptance' };
const ids = new Set(), names = new Set();
export function renderFeature(f, entry) {
  const remaining = f.roadTo100?.remaining || [];
  const counts = Object.entries(kinds).map(([kind, name]) => [remaining.filter(r => r.kind === kind).length, name]).filter(([count]) => count);
  const steps = entry.steps?.length ? `<ol>${entry.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : `<p>${f.status === 'Planned' || f.status === 'In development' ? 'A complete customer walkthrough is not ready yet.' : 'Use the linked guide for the current setup and controls.'} The status and outstanding checks on this page still apply.</p>`;
  const gallery = entry.gallery.length ? `<div class="feature-gallery">${[...entry.gallery].sort((a,b) => a.order-b.order).map(g => `<figure><img src="../${esc(g.image)}" alt="${esc(g.alt)}" loading="lazy"><figcaption>${esc(g.caption)} · ${esc(g.platform)} · ${esc(g.build)} · captured ${esc(g.capturedAt)}</figcaption></figure>`).join('')}</div>` : '<div class="feature-gallery-placeholder"><strong>Screenshots coming soon</strong><p>Real screenshots will be added after the app layout settles. No app screen is being simulated here.</p></div>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(f.name)} — Beebo</title><meta name="description" content="${esc(entry.purpose)}"><link rel="stylesheet" href="../assets/feature-detail.css"><script src="../assets/feature-activity.js" defer></script></head>
<body class="feature-detail-page"><main class="feature-detail-wrap"><nav aria-label="Breadcrumb"><a href="../release-evidence.html#features">All features and progress</a> / <span>${esc(f.name)}</span></nav>
<header><p class="eyebrow">${esc(f.group)} · ${esc(f.status)}</p><h1>${esc(f.name)}</h1><p class="feature-detail-intro">${esc(entry.purpose)}</p></header>
<section class="feature-progress" aria-label="Recorded readiness"><div class="feature-progress-top"><span>Recorded readiness · ${esc(f.status)}</span><strong>${f.percentComplete}%</strong></div><progress value="${f.percentComplete}" max="100" aria-label="Recorded readiness">${f.percentComplete}%</progress><p>${f.openIssues ? `${f.openIssues} open known issue${f.openIssues === 1 ? '' : 's'} recorded.` : 'No open known issue recorded.'} This score is the same as the feature list. It is not a release date or a time estimate.</p><p>Evidence record updated: ${esc(f.changedEastern || data.updatedEastern)}. This is the record date, not a new device test.</p></section>
${activityMarkup(entry.id)}<p>Activity comes from dated confirmations. A green dot only means a work step was recently confirmed running; it does not mean the feature has passed its checks.</p>
<div class="feature-detail-grid"><div><section><h2>What works today</h2><p>${esc(entry.current || `The recorded status is ${f.status}. The checks below show which kinds of evidence have been recorded; they do not guarantee every device or scenario.`)}</p><ul>${Object.entries(checks).map(([key, label]) => `<li>${esc(label)}: <strong>${f.checks[key] ? 'recorded' : 'not yet recorded'}</strong></li>`).join('')}</ul></section>
<section><h2>How to use it</h2>${steps}<p><a href="../${esc(entry.guide)}">${esc(entry.guideLabel)}</a></p></section>
<section><h2>What remains</h2>${entry.limits?.length ? `<ul>${entry.limits.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}<ul>${counts.map(([count,label]) => `<li>${esc(label)}: ${count} recorded item${count === 1 ? '' : 's'}.</li>`).join('')}</ul><p>${counts.length ? 'These are remaining checks or prerequisites, not a forecast of when the feature will be finished.' : 'No further roadmap item is listed here. Read the full evidence record for any qualifications.'}</p><p><a href="../release-evidence.html#${esc(entry.id)}">Read the dated evidence and known limits for this feature</a></p></section></div>
<aside><section class="feature-detail-panel"><h2>Platforms and requirements</h2><p>${esc(entry.requirements || `This record covers ${f.group.toLowerCase()}. Support and readiness on other platforms must be checked separately.`)}</p><p><a href="../platforms.html">Compare platform support</a></p></section><section class="feature-detail-panel"><h2>About the progress</h2><p>Implementation, automated checks, device checks, real-world checks and final acceptance are separate milestones. A new build or a work update does not add a checkmark.</p></section></aside></div>
<section><h2>Screenshots</h2>${gallery}</section>
<details class="feature-detail-panel"><summary>Technical details and evidence</summary><h2>What completion means</h2><p>${esc(f.roadTo100?.means || 'Final acceptance is still being defined.')}</p><p>The original dated test history, failures, scope limits and remaining checks are kept in the <a href="../release-evidence.html#${esc(entry.id)}">full evidence record</a>.</p><p><a href="../testing-status.json">Public readiness data</a> · <a href="../site-data/feature-activity.json">Public activity confirmations</a></p></details>
<footer><a href="../release-evidence.html#features">Back to all features</a> · <a href="../help.html">Help</a><p>Progress describes recorded evidence. It does not promise a completion date.</p></footer></main>${activityDirectoryMarkup()}</body></html>
`;
}
for (const entry of featureDirectory) {
  if (!/^feature-[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id) || names.has(entry.name)) throw Error('Feature IDs and names must be unique.');
  ids.add(entry.id); names.add(entry.name);
  const f = data.features.find(f => f.name === entry.name);
  if (!f || !entry.purpose || !Array.isArray(entry.gallery) || !existsSync(join(root, entry.guide))) throw Error('Incomplete feature directory entry.');
  for (const g of entry.gallery) {
    if (!/^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(g.image) || !existsSync(join(root,g.image)) || !g.alt || !g.caption || !g.platform || !g.build || !Number.isFinite(Date.parse(g.capturedAt)) || !Number.isInteger(g.order)) throw Error('Gallery requires a real local image and capture metadata.');
  }
  const path = join(root, 'features', entry.id + '.html'), html = renderFeature(f, entry);
  if (check) { if (!existsSync(path) || readFileSync(path,'utf8') !== html) throw Error('Feature page is out of date: ' + entry.id); }
  else { mkdirSync(dirname(path), { recursive:true }); writeFileSync(path, html); }
}
if (names.size !== data.features.length) throw Error('Feature directory must cover the complete evidence list.');
console.log(`${featureDirectory.length} feature pages ${check ? 'match' : 'built from'} the unchanged readiness source.`);
