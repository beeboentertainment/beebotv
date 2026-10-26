#!/usr/bin/env node
// Rebuilds the generated parts of release-evidence.html from testing-status.json, so the JSON is the
// one source of truth: the "Site last updated" stamp, the per-feature progress tables (bars, ticks,
// averages), the description dates and the JSON-LD list.
//
// TEMPORARY testing-phase feature: when testing-status.json has "showChangeMarkers": true, features
// that carry changedEastern / previousPercent / changeNote are drawn with an "Updated" design.
// To switch the markers off, set "showChangeMarkers": false (or delete the key) and re-run this script.
// Missing optional fields never break the page.
//
// The hero block ("Current record", Builds, Last tested, "Newer:") and the newest history entries
// ("historyNew" in the JSON) are generated too. Builds are READ from desktop-version.json and
// downloads/app-build.json, so after each release only the "hero" text and "historyNew" need a look.
// Usage: node tools/build-status-page.mjs        (writes release-evidence.html)
//        node tools/build-status-page.mjs --check (exit 1 if the page is out of date)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../site-data/progress-score.js');
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const J = JSON.parse(readFileSync(join(root, 'testing-status.json'), 'utf8'));
const problems = P.problems(J); if (problems.length) throw Error(problems.join('\n'));
const pagePath = join(root, 'release-evidence.html');
let html = readFileSync(pagePath, 'utf8');
const crlf = html.includes('\r\n');
html = html.replace(/\r\n/g, '\n');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const markers = J.showChangeMarkers === true;
const CH = ['Built', 'Automated tests', 'Real device', 'Real-world check', 'Ready to call Available'];
const SHORT = { 'Built': 'Built', 'Automated tests': 'Tests', 'Real device': 'Device', 'Real-world check': 'Real-world', 'Ready to call Available': 'Ready' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Oct 6, 2026, 9:30 PM Eastern" -> ISO with an Eastern offset (approximate DST window; display text is the source).
function iso(stamp) {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/.exec(stamp || '');
  if (!m) return null;
  const mo = MON.indexOf(m[1]); if (mo < 0) return null;
  let h = Number(m[4]) % 12 + (m[6] === 'PM' ? 12 : 0);
  const d = Number(m[2]);
  const dst = (mo > 2 && mo < 10) || (mo === 2 && d >= 8) || (mo === 10 && d <= 1);
  const p = n => String(n).padStart(2, '0');
  return `${m[3]}-${p(mo + 1)}-${p(d)}T${p(h)}:${m[5]}:00${dst ? '-04:00' : '-05:00'}`;
}
// OWNER RULE (Nick, Oct 13, 2026): every "updated" stamp shows the DATE AND TIME in Eastern, e.g. "Oct 13, 2026, 2:00 PM Eastern".
// The author writes the real time into testing-status.json when the content changes; this script only formats what is stored,
// so --check never depends on the clock. A stamp with a date but no time stops the build.
const STAMP_RE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) Eastern$/;
const ISO_FULL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/;
const stampProblems = [];
function requireStamp(label, v) { if (v !== undefined && v !== null && !STAMP_RE.test(String(v))) stampProblems.push(`${label}: ${JSON.stringify(v)} needs a date AND time, like "Oct 13, 2026, 2:00 PM Eastern"`); }
function requireIso(label, v) { if (v !== undefined && v !== null && !ISO_FULL_RE.test(String(v))) stampProblems.push(`${label}: ${JSON.stringify(v)} needs a full ISO timestamp with the Eastern offset, like "2026-10-13T14:00:00-04:00"`); }
function checkStamps(Jd) {
  requireStamp('updatedEastern', Jd.updatedEastern);
  requireStamp('previousUpdatedEastern', Jd.previousUpdatedEastern);
  requireIso('updated', Jd.updated);
  requireStamp('codeVsHuman.updatedEastern', Jd.codeVsHuman?.updatedEastern);
  requireStamp('fullProgress.updatedEastern', Jd.fullProgress?.updatedEastern);
  if (Jd.hero) { requireStamp('hero.lastTested', Jd.hero.lastTested); requireIso('hero.lastTestedIso', Jd.hero.lastTestedIso); }
  for (const f of Jd.features || []) {
    requireStamp(`features[${f.name}].changedEastern`, f.changedEastern);
    for (const h of f.changeHistory || []) requireStamp(`features[${f.name}].changeHistory.changedEastern`, h.changedEastern);
  }
  if (stampProblems.length) { console.error('testing-status.json has stamps without a time:\n  ' + stampProblems.join('\n  ')); process.exit(1); }
}
checkStamps(J);
const shortDate = stamp => { const m = /^([A-Z][a-z]{2} \d{1,2}, \d{4})/.exec(stamp || ''); return m ? m[1] : ''; };
const tier = p => { const t=P.tierFor(p,J.scoring); return [t.id,t.label]; };
// A feature is "updated in this update" only when it changed after the page's previous update
// (changedEastern later than previousUpdatedEastern), or when it carries "updatedThisRun": true.
// Older changes keep their dated note as quiet history, without the tag or highlight.
const ts = stamp => { const i = iso(stamp); return i ? Date.parse(i) : NaN; };
const isChanged = f => {
  if (!markers) return false;
  if (f.updatedThisRun === true) return true;
  if (!f.changedEastern) return false;
  const prev = ts(J.previousUpdatedEastern);
  if (Number.isNaN(prev)) return true;
  return ts(f.changedEastern) > prev;
};

const KINDS = [
  ['CODE', '&#128736;&#65039;', 'Build or fix (we can do this)', 'code'],
  ['DEVICE', '&#128241;', 'Test on a real device', 'device'],
  ['NICK', '&#129489;', 'Needs Nick', 'nick'],
  ['BLOCKED', '&#128679;', 'Blocked', 'blocked'],
];
// Expandable "what 100% means and what is left" box (native details/summary, no script).
function road(f) {
  const r = f.roadTo100;
  if (!r) return '';
  let h = `<div class="road"><p class="road-title">What 100% means and what is left</p><div class="road-body"><p class="road-means"><strong>What 100% means:</strong> ${esc(r.means)}</p>`;
  if ((r.done || []).length) h += `<p class="road-h">Done so far</p><ul class="road-done">${r.done.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const rem = r.remaining || [];
  h += '<p class="road-h">Still to do</p>';
  if (!rem.length) h += '<p>Nothing listed.</p>';
  for (const [k, icon, label, cls] of KINDS) {
    const items = rem.filter(x => x.kind === k);
    if (items.length) h += `<div class="road-group road-${cls}"><p class="road-label"><span aria-hidden="true">${icon}</span> ${label}</p><ul>${items.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul></div>`;
  }
  if ((f.changeHistory || []).length) h += `<p class="road-h">Earlier updates</p><ul class="road-hist">${f.changeHistory.map(x => `<li><time>${esc(x.changedEastern)}</time> &mdash; ${esc(x.changeNote)}</li>`).join('')}</ul>`;
  for (const [key,title] of [['ownerTests','Nick’s own observations'],['deviceTests','Device test records']]) {
    if ((f[key] || []).length) h += '<h4>'+title+'</h4>'+f[key].map(r => '<details class="dated-record"><summary>'+esc(r.result)+' — '+esc(r.date)+'</summary><p>'+esc(r.evidence || r.did)+'</p><p>'+esc(r.device)+' '+esc(r.build || '')+'</p>'+(r.notes ? '<p>'+esc(r.notes)+'</p>' : '')+'<p>Ticks added: '+esc((r.ticks || []).join(', ') || 'none')+'</p></details>').join('');
  }
  return h + '</div></div>';
}

function featureId(f) {
  return f.id || 'feature-' + `${f.group}-${f.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
}
function row(f) {
  const [t, label] = tier(f.percentComplete);
  const checks = f.checks || {};
  const aria = CH.map(k => `${k} ${checks[k] ? 'passed' : 'not yet'}`).join(', ');
  const chips = CH.map(k => `<span class="chk ${checks[k] ? 'ok' : 'no'}" title="${k}: ${checks[k] ? 'passed' : 'not yet'}" aria-hidden="true"><b>${SHORT[k]}</b>${checks[k] ? '✓' : '–'}</span>`).join('');
  const ch = isChanged(f);
  const prev = ch && Number.isFinite(f.previousPercent) ? f.previousPercent : null;
  let delta = '', prevTick = '', note = '', badge = '';
  if (ch) {
    badge = '<span class="upd-badge">Updated</span>';
    if (f.previousPercent === null) delta = '<span class="upd-delta">New row</span>';
    else if (prev !== null && prev !== f.percentComplete) delta = `<span class="upd-delta">was ${prev}% &rarr; now ${f.percentComplete}%</span>`;
    else delta = `<span class="upd-delta">details updated (still ${f.percentComplete}%)</span>`;
    if (prev !== null && prev !== f.percentComplete) prevTick = `<b class="bar-prev" style="left:${prev}%" title="Previous: ${prev}%"></b>`;
    const dt = iso(f.changedEastern);
    note = `<p class="upd-note">${badge} <time${dt ? ` datetime="${dt}"` : ''}>${esc(f.changedEastern)}</time>${f.changeNote ? `<br>${esc(f.changeNote)}` : ''}</p>`;
  } else if (markers && f.changedEastern) {
    const dt = iso(f.changedEastern);
    note = `<p class="upd-note upd-old">Earlier update: <time${dt ? ` datetime="${dt}"` : ''}>${esc(f.changedEastern)}</time>${f.changeNote ? ` &mdash; ${esc(f.changeNote)}` : ''}</p>`;
  }
  const id = esc(featureId(f));
  return `<tr id="${id}" class="feat tier-${t}${f.percentComplete === 99 ? ' is-99' : f.percentComplete === 100 ? ' is-100' : ''}${ch ? ' is-updated' : ''}"><th id="${id}-name" scope="row">${esc(f.name)}${ch ? `<br>${badge}` : ''}</th><td>${esc(f.status)}</td>` +
    `<td class="done-cell"><strong>${f.percentComplete}%</strong> <span class="tier-tag tier-${t}">${label}</span>${delta ? `<br>${delta}` : ''}` +
    `<span class="bar" aria-hidden="true"><i style="width:${f.percentComplete}%"></i>${prevTick}</span></td>` +
    `<td class="chk-cell" aria-label="${aria}">${chips}</td><td>${esc(f.lastTested)}</td></tr>` +
    `<tr class="feature-notes"><td colspan="5" headers="${id}-name"><div class="feature-notes-content"><p class="feature-left"><strong>Left to reach 100%</strong> ${esc(f.leftToReach100)}</p>${f.scoreNote ? `<p class="score-note"><strong>Record limit:</strong> ${esc(f.scoreNote)}</p>` : ''}${note || f.roadTo100 ? `<details class="feature-details"><summary>What changed / what is left</summary><div class="feature-details-body">${note}${road(f)}</div></details>` : ''}</div></td></tr>`;
}

const features = J.features || [];
const groups = [...new Set(features.map(f => f.group))];
const avg = a => (a.length ? Math.round(a.reduce((s, f) => s + f.percentComplete, 0) / a.length) : 0);
const overall = Number.isFinite(J.overallAveragePercent) ? J.overallAveragePercent : avg(features);
const kindTotals = Object.fromEntries(['CODE', 'DEVICE', 'NICK', 'BLOCKED'].map(k => [k, features.reduce((n, f) => n + (f.roadTo100?.remaining || []).filter(x => x.kind === k).length, 0)]));
const withRoad = features.filter(f => f.roadTo100).length;
const changedCount = features.filter(isChanged).length;
const upd = J.updatedEastern || '';
const THEAD = '<thead><tr><th scope="col">Feature</th><th scope="col">Status</th><th scope="col" aria-label="Progress">Done</th><th scope="col">Checks<span class="feature-check-legend"> (Built / Automated tests / Real device / Real-world check / Ready to call Available)</span></th><th scope="col">Last tested</th></tr></thead>';

let sec = `<section class="evidence-section" id="features" aria-labelledby="features-title">
<span class="evidence-kicker">Progress by feature${upd ? ` · last updated ${esc(upd)}` : ''}</span><h2 id="features-title">Every feature: how far along, and what gets it to 100%.</h2>
<p><strong>How the percentage works.</strong> ${esc(J.scoring.rule)} Realistic AI checks on real devices may count toward Real-world when the evidence covers actual use. Muted or state-only checks cannot prove behavior they did not judge. Only Nick records Ready. Each row lists its limits; all listed checks passing does not mean a feature can never fail.</p>
`;
if (markers) {
  sec += `<p class="upd-summary"><span class="upd-badge">Updated</span> <strong>${changedCount} of ${features.length} features changed since the previous update${J.previousUpdatedEastern ? ` (${esc(J.previousUpdatedEastern)})` : ''}.</strong> Highlighted rows (only those changed in this latest update) show the old and new percentage (the small mark on the bar is the old position), what changed in one sentence, and the date and time in Eastern. Older changes stay in the last column as &ldquo;Earlier update&rdquo; notes. This temporary marker is shown while testing is under way.</p>\n`;
}
if (withRoad) {
  const t = kindTotals;
  sec += `<aside class="road-intro" aria-labelledby="road-intro-title"><h3 id="road-intro-title">How to read the &ldquo;Left to reach 100%&rdquo; column</h3><p><strong>100% means all five checks passed for the whole feature.</strong> Each row has a one-line summary and an expandable box, &ldquo;What 100% means and what is left&rdquo;, with what is already done and what is still to do. The remaining work comes in four kinds:</p><ul class="road-kinds"><li class="road-code"><span aria-hidden="true">${KINDS[0][1]}</span> <strong>Build or fix (we can do this):</strong> code or tests that a developer or AI helper can write.</li><li class="road-device"><span aria-hidden="true">${KINDS[1][1]}</span> <strong>Test on a real device:</strong> needs a real phone, PC, TV or car; a computer test cannot replace it.</li><li class="road-nick"><span aria-hidden="true">${KINDS[2][1]}</span> <strong>Needs Nick:</strong> his decision, an account, money or a legal question.</li><li class="road-blocked"><span aria-hidden="true">${KINDS[3][1]}</span> <strong>Blocked:</strong> waiting on something else, such as a careful security review or a decision.</li></ul><p class="road-totals"><strong>Remaining items across all ${withRoad} features:</strong> ${t.CODE} to build or fix, ${t.DEVICE} real-device tests, ${t.NICK} for Nick, ${t.BLOCKED} blocked.</p></aside>\n`;
}
const tierKey = J.scoring.tiers.map(t => '<span class="tier-tag tier-'+esc(t.id)+'">'+esc(t.range)+': '+esc(t.label)+'</span>').join(' ');
sec += '<aside class="meaning-box" aria-labelledby="meaning-score-title"><h3 id="meaning-score-title">What the tiers mean</h3><p>Green is reserved for 90–98%. At 90%, the listed runnable checks may have passed while an open issue caps the score at 90%; an explicit record limit can also hold it below 99. Teal 80–89% means nearly there. The percentage still follows the recorded checks, never a colour choice.</p><p>99% and 100% keep their existing meanings. An open issue always caps the score at 90%. Colour never replaces words.</p></aside>';
sec += '<div class="status-legend" role="group" aria-label="Colour key"><strong>Colour key</strong> '+tierKey+'<span class="legend-note">Every feature says its percentage and tier name. A tick means passed; a dash means not yet.</span></div>';
const buckets = [{id:'all',label:'All features',match:f=>true},{id:'green',label:'90–98% · Green',match:f=>f.percentComplete>=90&&f.percentComplete<99},{id:'purple',label:'99% · Purple',match:f=>f.percentComplete===99},{id:'gold',label:'100% · Gold',match:f=>f.percentComplete===100},{id:'teal',label:'80–89% · Teal: nearly there',match:f=>f.percentComplete>=80&&f.percentComplete<90},{id:'yellow',label:'40–79% · Yellow',match:f=>f.percentComplete>=40&&f.percentComplete<80},{id:'red',label:'0–39% · Red',match:f=>f.percentComplete<40}];
sec += '<div class="tier-tabs" role="tablist" aria-label="Filter features by progress tier" hidden>'+buckets.map((b,i)=>'<button type="button" role="tab" id="tier-tab-'+b.id+'" aria-controls="tier-results" aria-selected="'+(i===0)+'" tabindex="'+(i===0?'0':'-1')+'" data-tier="'+b.id+'">'+esc(b.label)+' ('+features.filter(b.match).length+')</button>').join('')+'</div><div id="tier-results" role="tabpanel" aria-labelledby="tier-tab-all" tabindex="0"><p class="tier-result-count" aria-live="polite">Showing all '+features.length+' features.</p>';
for (const g of groups) {
  const list = features.filter(f => f.group === g);
  const gAvg = Number.isFinite(J.groupAveragePercent?.[g]) ? J.groupAveragePercent[g] : avg(list);
  sec += `<div class="feature-group"><h3>${esc(g)} · average ${gAvg}% across ${list.length} features</h3>\n<div class="evidence-table-wrap" role="region" aria-label="Progress for ${esc(g)}"><table class="evidence-table feature-progress-table">\n<caption>${esc(g)}: progress by feature</caption>\n${THEAD}\n${list.map(f => `<tbody class="feature-entry" data-tier="${P.tierFor(f.percentComplete,J.scoring).id}">${row(f)}</tbody>`).join('\n')}\n</table></div></div>\n`;
}
sec += '</div>';
const top = features.filter(f => f.percentComplete >= 100).length;
sec += `<p><strong>Across all ${features.length} features the average is ${overall}%.</strong> That average mixes features that are well along with features that are only plans, so use the individual rows. ${top === 0 ? 'No feature is at 100% today, because none has yet passed a real-world check and a readiness review together.' : `${top} feature${top === 1 ? ' is' : 's are'} at 100%.`}</p>\n`;
sec += '<p id="data-download">Machine-readable copy of this progress data: <a href="/testing-status.json">testing-status.json</a> (feature, status, percent, the five checks, last tested date, what is left and, while markers are on, what changed and when). Search engines and tools can read it.</p>\n    </section>';

const secRe = /<section class="evidence-section" id="features"[\s\S]*?<\/section>/;
if (!secRe.test(html)) throw new Error('features section not found');
html = html.replace(secRe, () => sec);

function releaseChangesSection(data) {
  if (!data?.title || !data?.summary) return '';
  return `<section class="evidence-section" id="release-changes" aria-labelledby="release-changes-title"><span class="evidence-kicker">Since the last release</span><h2 id="release-changes-title">${esc(data.title)}</h2><p>${esc(data.summary)}</p>${data.sourceNote ? `<p>${esc(data.sourceNote)}</p>` : ''}</section>`;
}
const releaseChanges = releaseChangesSection(J.releaseChanges);
const releaseChangesRe = /<!--RELEASE-CHANGES-->[\s\S]*?<!--\/RELEASE-CHANGES-->/;
html = html.replace(releaseChangesRe, '');
if (!html.includes('<!--CODE-VS-HUMAN-->')) throw new Error('CODE-VS-HUMAN marker not found');
html = html.replace('<!--CODE-VS-HUMAN-->', () => `<!--RELEASE-CHANGES-->${releaseChanges}<!--/RELEASE-CHANGES--><!--CODE-VS-HUMAN-->`);

// This short comparison deliberately reads only the published JSON summary.  It
// keeps the public wording simple while leaving the detailed evidence below.
function codeVsHumanSection(data) {
  if (!data?.groups?.length) return '';
  const bar = (label, percent, extra = '') => `<div class="code-human-meter" role="img" aria-label="${esc(label)}: ${percent}%.${extra ? ` ${esc(extra)}` : ''}"><div class="code-human-meter-label"><strong>${esc(label)}</strong><span>${percent}%</span></div><span class="code-human-bar" aria-hidden="true"><i style="width:${percent}%"></i></span></div>`;
  const countText = counts => `${counts.CODE} code, ${counts.DEVICE} device, ${counts.NICK} Nick and ${counts.BLOCKED} blocked`;
  const featureRow = feature => {
    const codeText = feature.codeItemsLeft
      ? `Code checks passed; ${feature.codeItemsLeft} code item${feature.codeItemsLeft === 1 ? '' : 's'} still listed`
      : `${feature.codeDone}%`;
    const note = feature.codeItemsLeft
      ? `${feature.codeItemsLeft} code item${feature.codeItemsLeft === 1 ? '' : 's'} still listed.`
      : 'No code item is still listed.';
    return `<tr><th scope="row">${esc(feature.name)}</th><td data-label="Code built and tests passing">${esc(codeText)}</td><td data-label="Human testing left">${feature.humanTestingLeft}%</td><td data-label="What is left">${note}</td></tr>`;
  };
  let out = `<section class="evidence-section code-vs-human" id="code-vs-human" aria-labelledby="code-vs-human-title"><span class="evidence-kicker">Checklist view · updated ${esc(data.updatedEastern || '')}</span><h2 id="code-vs-human-title">Code done vs human testing left</h2>${data.evidenceLimit ? `<p><strong>Evidence limit:</strong> ${esc(data.evidenceLimit)}</p>` : ''}<p>Numbers come from our own test list (last updated ${esc(J.updatedEastern || '')}) and were worked out on ${esc(data.updatedEastern || '')}. They show how much of our checklist has passed, not whether the app is bug-free. A high code number means the code is built and its automated tests pass. It does not mean nothing is left to build: the open code items are listed under each bar.</p><p>${esc(data.method || '')}</p><div class="code-vs-human-groups">`;
  for (const group of data.groups) {
    const humanDone = 100 - group.humanTestingLeft;
    out += `<article class="code-vs-human-group"><h3>${esc(group.name)}</h3>${bar('Code built and tests passing', group.codeDone, `${group.remaining.CODE} code item${group.remaining.CODE === 1 ? '' : 's'} still listed.`)}${bar('Human testing done', humanDone, `${group.humanTestingLeft}% left.`)}<p class="code-vs-human-left"><strong>What is left:</strong> ${esc(countText(group.remaining))}.</p><details><summary>See feature-by-feature numbers</summary><div class="evidence-table-wrap" role="region" aria-label="${esc(group.name)} code and human testing table"><table class="evidence-table code-vs-human-table"><caption>${esc(group.name)}: code done and human testing left</caption><thead><tr><th scope="col">Feature</th><th scope="col">Code built and tests passing</th><th scope="col">Human testing left</th><th scope="col">What is left</th></tr></thead><tbody>${group.features.map(featureRow).join('')}</tbody></table></div></details></article>`;
  }
  return out + '</div></section>';
}
const codeVsHuman = codeVsHumanSection(J.codeVsHuman);
if (!codeVsHuman) throw new Error('codeVsHuman data is missing from testing-status.json');
const codeVsHumanRe = /<!--CODE-VS-HUMAN-->[\s\S]*?<!--\/CODE-VS-HUMAN-->/;
if (!codeVsHumanRe.test(html)) throw new Error('CODE-VS-HUMAN marker not found');
html = html.replace(codeVsHumanRe, () => `<!--CODE-VS-HUMAN-->${codeVsHuman}<!--/CODE-VS-HUMAN-->`);

// Hero block, built from the JSON "hero" plus the real release feeds.
if (J.hero) {
  const hv = JSON.parse(readFileSync(join(root, 'desktop-version.json'), 'utf8'));
  const ab = JSON.parse(readFileSync(join(root, 'downloads', 'app-build.json'), 'utf8'));
  const desk = `Windows ${hv.version}`;
  const andr = `Android ${ab.versionName} (build ${ab.versionCode})`;
  const hr = J.hero;
  const newer = hr.newerText.replaceAll('{desktop}', hv.version).replaceAll('{android}', `${ab.versionName} (build ${ab.versionCode})`);
  html = html.replace(/<!--HERO-NEWER-->[\s\S]*?<!--\/HERO-NEWER-->/, () => `<!--HERO-NEWER--><p><strong>Newer:</strong> ${newer}</p><!--/HERO-NEWER-->`);
  html = html.replace(/<!--HERO-LEDGER-->[\s\S]*?<!--\/HERO-LEDGER-->/, () => `<!--HERO-LEDGER--><header><span class="evidence-label">Current record</span><h2>${esc(hr.recordName)}</h2></header>
        <dl>
          <div><dt>Review scope</dt><dd>${esc(hr.scope)}</dd></div><div><dt>Builds</dt><dd>Published: ${esc(desk)}, ${esc(andr)}</dd></div><div><dt>Broader testing</dt><dd>${esc(hr.broader)}</dd></div><div><dt>Last tested</dt><dd><time datetime="${esc(hr.lastTestedIso)}">${esc(hr.lastTested)}</time> (previous: ${esc(hr.previousTested)}, see history)</dd></div>
        </dl><!--/HERO-LEDGER-->`);
}
const hn = (J.historyNew || []).map(e => `<details class="history-entry"><summary><span class="history-date"><time datetime="${esc(e.iso)}">${esc(e.date)}</time></span><span class="history-headline">${esc(e.headline)}</span></summary><div class="history-body"><p><strong>What was tested:</strong> ${esc(e.tested)}</p><p><strong>What happened:</strong> ${esc(e.happened)}</p></div></details>`).join('\n');
html = html.replace(/<!--HISTORY-NEW-->[\s\S]*?<!--\/HISTORY-NEW-->/, () => `<!--HISTORY-NEW-->${hn}<!--/HISTORY-NEW-->`);

// Top stamp, read from updatedEastern.
const stampHtml = upd
  ? `<!--STATUS-STAMP--><p class="site-stamp" id="site-updated"><strong>Site last updated:</strong> <time${iso(upd) ? ` datetime="${iso(upd)}"` : ''}>${esc(upd)}</time>${markers && changedCount ? ` · <a href="#features">${changedCount} feature${changedCount === 1 ? '' : 's'} changed since the previous update</a>` : ''}</p><!--/STATUS-STAMP-->`
  : '<!--STATUS-STAMP--><!--/STATUS-STAMP-->';
if (html.includes('<!--STATUS-STAMP-->')) html = html.replace(/<!--STATUS-STAMP-->[\s\S]*?<!--\/STATUS-STAMP-->/, () => stampHtml);
else html = html.replace('<section class="evidence-hero"', () => `${stampHtml}\n    <section class="evidence-hero"`);


// Gold banner at the very top: how many features are Ready (100%), generated from the data so it can never go stale.
{
  const ready = features.filter(f => f.percentComplete === 100 && f.checks && f.checks['Ready to call Available']);
  const list = ready.map(f => `<li><a href="#${featureId(f)}">${esc(f.name)}</a></li>`).join('');
  const bannerHtml = ready.length
    ? `<!--READY-BANNER--><section class="ready-banner" aria-labelledby="ready-banner-title"><p class="ready-banner-star" aria-hidden="true">&#9733; &#9733; &#9733;</p><h2 id="ready-banner-title">${ready.length} feature${ready.length === 1 ? ' is' : 's are'} Ready: 100%</h2><p>Each one passed every check and Nick confirmed it himself. The row for each says what was not tested.</p><ul class="ready-banner-list">${list}</ul></section><!--/READY-BANNER-->`
    : '<!--READY-BANNER--><!--/READY-BANNER-->';
  if (html.includes('<!--READY-BANNER-->')) html = html.replace(/<!--READY-BANNER-->[\s\S]*?<!--\/READY-BANNER-->/, () => bannerHtml);
  else html = html.replace('<section class="evidence-hero"', () => `${bannerHtml}\n    <section class="evidence-hero"`);
}

const csRe = /<!--CODE-STATUS-SUMMARY-->[\s\S]*?<!--\/CODE-STATUS-SUMMARY-->/;
if (csRe.test(html)) {
 const o=J.codeVsHuman.overall;
 const groups=Object.entries(J.realWorldStatusLabels).map(([key,label])=>'<details class="cs-list"><summary>'+esc(label)+' ('+o.counts[key]+')</summary><ul>'+features.filter(f=>f.realWorldStatus===key).map(f=>'<li>'+esc(f.name)+'</li>').join('')+'</ul></details>').join('');
 html=html.replace(csRe,()=>'<!--CODE-STATUS-SUMMARY--><section class="evidence-section code-status-summary" id="code-status" aria-labelledby="code-status-title"><p>Where Beebo stands · updated '+esc(upd)+'</p><h2 id="code-status-title">The code checklist is '+o.codeDone+'%; device and real-world checks recorded are '+o.humanTestingDone+'%.</h2><p>'+o.features+' features; '+o.codeItemsLeft+' code items remain. These are checklist totals, not a promise of complete reliability.</p>'+groups+'</section><!--/CODE-STATUS-SUMMARY-->');
}

// Description dates and JSON-LD.
const sd = upd; // the full date-and-time stamp, never the bare date
const STAMP_IN_TEXT = '[A-Z][a-z]{2} \\d{1,2}, \\d{4}(?:, \\d{1,2}:\\d{2} (?:AM|PM) Eastern)?';
if (sd) html = html.replace(new RegExp(`Beebo testing status, updated ${STAMP_IN_TEXT}:`, 'g'), `Beebo testing status, updated ${sd}:`);
html = html.replace(/(<script type="application\/ld\+json" id="testing-ld">)([\s\S]*?)(<\/script>)/, (all, a, body, c) => {
  const ld = JSON.parse(body);
  if (sd) ld.description = ld.description.replace(new RegExp(`updated ${STAMP_IN_TEXT}:`), `updated ${sd}:`);
  if (iso(upd)) ld.dateModified = iso(upd);
  ld.mainEntity.numberOfItems = features.length;
  ld.mainEntity.itemListElement = features.map((f, i) => {
    const n = CH.filter(k => f.checks?.[k]).length;
    let d = `${f.group}. Status: ${f.status}. Progress: ${f.percentComplete}% (${n} of 5 checks recorded). Last tested: ${f.lastTested}. Left to reach 100%: ${f.leftToReach100}${f.scoreNote ? ' Record limit: ' + f.scoreNote : ''}`;
    if (isChanged(f)) d += ` Updated ${f.changedEastern}${Number.isFinite(f.previousPercent) && f.previousPercent !== f.percentComplete ? ` (was ${f.previousPercent}%)` : ''}.`;
    return { '@type': 'ListItem', position: i + 1, name: f.name, description: d };
  });
  return a + JSON.stringify(ld) + c;
});
// Label the responsive cards from their real column headings. Keep captions,
// header scope and all cell contents; this also covers the historical tables.
function responsiveTables(page) {
  page = page.replace(/(<div\b[^>]*class="evidence-table-wrap"[^>]*)(>)/g,
    (_all, attrs, end) => attrs.replace(/ tabindex="0"/g, '').replace(/Scrollable /g, '') + end);
  page = page.replace(/<table\b[^>]*class="[^"]*\b(?:evidence-table|rl-table)\b[^"]*"[^>]*>[\s\S]*?<\/table>/g, (table) => {
    const head = /<thead>[\s\S]*?<\/thead>/.exec(table)?.[0] || '';
    const labels = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
      m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    return table.replace(/<tbody\b([^>]*)>([\s\S]*?)<\/tbody>/g, (_all, attrs, body) => `<tbody${attrs}>` +
      body.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/g, (row) => {
        let col = 0;
        return row.replace(/<(td|th)\b([^>]*)>/g, (_cell, tag, attrs) => {
          if (/\bcolspan=/.test(attrs)) return `<${tag}${attrs.replace(/ data-label="[^"]*"/g, '')}>`;
          const label = labels[col++] || '';
          attrs = attrs.replace(/ data-label="[^"]*"/g, '');
          return `<${tag}${attrs} data-label="${label.replace(/"/g, '&quot;')}">`;
        });
      }) + '</tbody>');
  });
  return page;
}
html = responsiveTables(html);
html=html.replace(/<script>\(function\(\)\{try\{document\.querySelectorAll\('tr\.feat'\)[\s\S]*?<\/script>/g,'');
if(!html.includes('src="/assets/evidence-tier-tabs.js"')) html=html.replace('</body>','<script src="/assets/evidence-tier-tabs.js" defer></script></body>');


function sourceMerges(page) {
 if (!J.sourceMerges?.length) return page;
 const block='<!--SOURCE-MERGES--><section class="evidence-section" id="source-merges"><h2>Source work merged; device results remain separate</h2><p>Report timestamps are shown in Eastern. A source merge is not a public release, deployment or a new device tick. Failures in the tested builds stay open until a matching retest clears them.</p><ul>'+J.sourceMerges.map(r=>'<li><time datetime="'+esc(r.iso)+'">'+esc(r.date)+'</time> — '+esc(r.summary)+'</li>').join('')+'</ul></section><!--/SOURCE-MERGES-->';
 const re=/<!--SOURCE-MERGES-->[\s\S]*?<!--\/SOURCE-MERGES-->/;
 if(re.test(page))return page.replace(re,()=>block);
 return page.replace('</main>',block+'</main>');
}

html = sourceMerges(html);
const out = crlf ? html.replace(/\n/g, '\r\n') : html;
if (process.argv.includes('--check')) {
  if (readFileSync(pagePath, 'utf8') !== out) { console.error('release-evidence.html is out of date: run node tools/build-status-page.mjs'); process.exit(1); }
  console.log('release-evidence.html matches testing-status.json');
} else {
  writeFileSync(pagePath, out);
  console.log(`release-evidence.html rebuilt: ${features.length} features, overall ${overall}%, ${changedCount} marked updated, stamp ${upd}`);
}

// The related static evidence page shares the same responsive table markup.
for (const relatedName of ['whats-tested.html', 'platforms.html']) {
const relatedPath = join(root, relatedName);
const related = readFileSync(relatedPath, 'utf8');
let relatedOut = responsiveTables(related);
if (relatedName === 'whats-tested.html') relatedOut = sourceMerges(relatedOut);

if (process.argv.includes('--check')) {
  if (related !== relatedOut) { console.error(`${relatedName} needs responsive labels: run node tools/build-status-page.mjs`); process.exit(1); }
} else if (related !== relatedOut) writeFileSync(relatedPath, relatedOut);
}
