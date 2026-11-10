// "AI tested" bars on every feature card, and the "Built, waiting for someone with the device" section.
// Data: site-data/ai-tested.json (hand-written, dated) plus the public records already in testing-status.json
// (deviceTests and ownerTests). Nothing here changes a feature's main percent.
//
// Honesty rules enforced here (the build stops if the data breaks them):
// - A bar is filled ONLY from one recorded run's own count: passed / total. No blended score, never rounded up.
// - A count for a device, emulator or person run must quote words that are really in that record.
// - A run on an emulator or simulator says so; a run on a private test build says so.
// - A kind with no recorded run shows an empty bar and "Not run yet". A recorded run without a count shows an
//   empty bar and says the record gives no count.
// - A tester confirmation in the "waiting for a device" section renders only when the data has one.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_RE = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/;
const EMU_RE = /emulator|simulator/i;
const TEST_BUILD_RE = /unpublished|private test build|not public|test build only|\(build 1(29|30)\b|1\.5[78]\b/i;
const PUBLIC_RE = /\bpublic\b|\bpublished\b|test copy of the published/i;

export const KINDS = [
  ['unit', 'Automatic code tests'],
  ['emulator', 'AI check on an emulator or simulator'],
  ['aiDevice', 'AI check on a real device'],
  ['person', 'Tried by a person'],
];

export function loadAiTested(root) {
  return JSON.parse(readFileSync(join(root, 'site-data/ai-tested.json'), 'utf8'));
}

const dayValue = s => {
  const m = DATE_RE.exec(s || '');
  if (!m) return -1;
  return Number(m[3]) * 10000 + (MON.indexOf(m[1]) + 1) * 100 + Number(m[2]);
};
const dayText = s => { const m = DATE_RE.exec(s || ''); return m ? m[0] : ''; };
// The bars repeat public record text; they leave out private receipt numbers and code version ids.
const scrub = s => String(s ?? '')
  .replace(/(?:the receipt )?test-channel receipt \d+/g, 'a test-channel receipt')
  .replace(/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/g, '[code version]');
const recordText = r => [r.tester, r.device, r.build, r.date, r.result, r.did, r.evidence, r.notes].filter(Boolean).join(' ');

function buildTag(text) {
  if (TEST_BUILD_RE.test(text)) return 'private test build, not the public download';
  if (PUBLIC_RE.test(text)) return 'public build';
  return '';
}

// Newest record wins; on the same day the record listed first wins (the lists are kept newest first).
function latest(records) {
  let best = null, bestDay = -2;
  for (const r of records) { const d = dayValue(r.date); if (d > bestDay) { best = r; bestDay = d; } }
  return best;
}

export function classify(f) {
  const dev = (f.deviceTests || []).filter(r => !/^No\b/i.test(String(r.device || '').trim()));
  return {
    emulator: dev.filter(r => EMU_RE.test(`${r.device} ${r.tester}`)),
    aiDevice: dev.filter(r => !EMU_RE.test(`${r.device} ${r.tester}`)),
    person: (f.ownerTests || []).filter(r => !/own decision in chat/i.test(String(r.device || ''))),
  };
}

export function validateAiTested(J, data) {
  const bad = [];
  const names = new Set((J.features || []).map(f => f.name));
  const byName = n => J.features.find(f => f.name === n);
  const okDate = s => DATE_RE.test(s || '');
  for (const u of data.unitTests || []) {
    if (!names.has(u.feature)) bad.push(`unitTests: no feature named "${u.feature}"`);
    if (!(Number.isInteger(u.passed) && Number.isInteger(u.total) && u.total > 0 && u.passed >= 0 && u.passed <= u.total)) bad.push(`unitTests ${u.feature}: passed/total must be whole numbers with 0 <= passed <= total and total > 0`);
    if (!okDate(u.date)) bad.push(`unitTests ${u.feature}: date needs a month, day and year`);
    if (!String(u.how || '').trim()) bad.push(`unitTests ${u.feature}: "how" is empty`);
  }
  for (const x of data.extraRuns || []) {
    if (!names.has(x.feature)) bad.push(`extraRuns: no feature named "${x.feature}"`);
    if (x.kind !== 'emulator') bad.push(`extraRuns ${x.feature}: only kind "emulator" is allowed here`);
    if (!EMU_RE.test(x.device || '')) bad.push(`extraRuns ${x.feature}: the device text must say emulator or simulator`);
    if (!(Number.isInteger(x.passed) && Number.isInteger(x.total) && x.total > 0 && x.passed <= x.total)) bad.push(`extraRuns ${x.feature}: bad count`);
    if (!okDate(x.date)) bad.push(`extraRuns ${x.feature}: date needs a month, day and year`);
    for (const k of ['build', 'how', 'notCovered']) if (!String(x[k] || '').trim()) bad.push(`extraRuns ${x.feature}: "${k}" is empty`);
  }
  for (const t of data.tallies || []) {
    const f = byName(t.feature);
    if (!f) { bad.push(`tallies: no feature named "${t.feature}"`); continue; }
    const pool = classify(f)[t.kind];
    if (!pool) { bad.push(`tallies ${t.feature}: kind must be emulator, aiDevice or person`); continue; }
    const rec = pool.find(r => r.date === t.recordDate);
    if (!rec) { bad.push(`tallies ${t.feature}: no ${t.kind} record dated "${t.recordDate}"`); continue; }
    if (!recordText(rec).includes(t.quote)) bad.push(`tallies ${t.feature}: "${t.quote}" is not in that record`);
    if (!(Number.isInteger(t.passed) && Number.isInteger(t.total) && t.total > 0 && t.passed >= 0 && t.passed <= t.total)) bad.push(`tallies ${t.feature}: bad count`);
  }
  const nd = data.needsDevice;
  if (nd) {
    for (const k of ['title', 'intro', 'contactText', 'contactHref']) if (!String(nd[k] || '').trim()) bad.push(`needsDevice.${k} is empty`);
    if (!/^\/[a-z0-9-]+\.html(#[a-z0-9-]+)?$/.test(nd.contactHref || '')) bad.push('needsDevice.contactHref must be a page that already exists on this site');
    for (const r of nd.rows || []) {
      for (const k of ['id', 'area', 'status', 'deviceNeeded', 'proven', 'notTried', 'canTry']) if (!String(r[k] || '').trim()) bad.push(`needsDevice ${r.id || '?'}: "${k}" is empty`);
      if (!['Available', 'Beta', 'In development', 'Planned'].some(l => String(r.status).startsWith(l))) bad.push(`needsDevice ${r.id}: status must start with Available, Beta, In development or Planned`);
      if (r.feature && !names.has(r.feature)) bad.push(`needsDevice ${r.id}: no feature named "${r.feature}"`);
      if (r.emulator) {
        const e = r.emulator;
        if (!EMU_RE.test(e.device || '')) bad.push(`needsDevice ${r.id}: emulator.device must say emulator or simulator`);
        if (!(Number.isInteger(e.passed) && Number.isInteger(e.total) && e.total > 0 && e.passed <= e.total)) bad.push(`needsDevice ${r.id}: bad emulator count`);
        if (!okDate(e.date)) bad.push(`needsDevice ${r.id}: emulator.date needs a month, day and year`);
      } else if (!/Not yet run on an emulator/i.test(r.proven) && !String(r.emulatorNote || '').trim()) bad.push(`needsDevice ${r.id}: with no counted emulator run, "proven" must say "Not yet run on an emulator ..." or an emulatorNote must explain why a run is not counted`);
      for (const c of r.testerConfirmations || []) {
        if (!okDate(c.date) || !['worked', 'did not work'].includes(c.result) || !String(c.device || '').trim()) bad.push(`needsDevice ${r.id}: a tester confirmation needs device, date and result "worked" or "did not work"`);
      }
    }
  }
  if (bad.length) throw new Error('site-data/ai-tested.json problems:\n  ' + bad.join('\n  '));
}

function barHtml(label, s) {
  // s: { state: 'count'|'nocount'|'none', passed, total, tally, meta, tags[], how }
  const pct = s.state === 'count' ? Math.floor((s.passed / s.total) * 100) : 0;
  const tally = s.state === 'count' ? `${s.passed} of ${s.total} passed` : s.state === 'nocount' ? s.tally : 'Not run yet';
  const aria = `${label}: ${tally}${s.meta ? '. ' + s.meta : ''}`;
  const tags = (s.tags || []).filter(Boolean).map(t => `<span class="ait-tag">${esc(t)}</span>`).join('');
  return `<li class="ait-bar ait-${s.state}"><div class="ait-head"><span class="ait-label">${esc(label)}</span><span class="ait-tally">${esc(tally)}</span></div>` +
    `<span class="ait-track" role="img" aria-label="${esc(aria)}"><i style="width:${pct}%"></i></span>` +
    (s.meta || tags ? `<p class="ait-meta">${esc(s.meta || '')}${tags ? ' ' + tags : ''}</p>` : '') +
    (s.how ? `<details class="ait-how"><summary>How it was tested</summary><p>${esc(s.how)}</p></details>` : '') + '</li>';
}

function recordBar(kind, rec, tally, f) {
  if (!rec) return { state: 'none', meta: kind === 'person' ? 'No person has recorded trying this yet.' : '' };
  const text = recordText(rec);
  const tags = [buildTag(`${rec.build || ''} ${rec.device || ''}`)];
  if (kind === 'emulator') tags.unshift('emulator, not a real device');
  const who = kind === 'person' ? 'Nick (the owner)' : '';
  const meta = scrub([dayText(rec.date), who, rec.device, rec.build].filter(Boolean).join(' · '));
  const how = scrub([rec.did, rec.evidence, rec.notes].filter(Boolean).join(' '));
  if (tally) return { state: 'count', passed: tally.passed, total: tally.total, meta, tags, how };
  const result = /\b(PASS|FAIL|PARTIAL|BLOCKED|NOT RUN)\b/.exec(String(rec.result || ''))?.[1] || String(rec.result || '').trim() || 'recorded';
  return { state: 'nocount', tally: `Result: ${result}. No count in the record`, meta, tags, how };
}

export function aiTestedBlock(f, J, data) {
  const c = classify(f);
  const unit = (data.unitTests || []).find(u => u.feature === f.name);
  const extra = (data.extraRuns || []).filter(x => x.feature === f.name);
  const tallyFor = (kind, rec) => rec && (data.tallies || []).find(t => t.feature === f.name && t.kind === kind && t.recordDate === rec.date);
  const bars = [];
  // 1. Automatic code tests
  if (unit) {
    bars.push(barHtml(KINDS[0][1], { state: 'count', passed: unit.passed, total: unit.total, meta: `${dayText(unit.date)} · ${unit.where}${unit.skipped ? ` · ${unit.skipped} skipped, not counted` : ''}`, tags: ['source code, not an installed app'], how: unit.how }));
  } else if (f.checks?.['Automated tests']) {
    bars.push(barHtml(KINDS[0][1], { state: 'nocount', tally: 'Passed. No per-feature count published yet', meta: 'The feature’s “Automated tests” check is ticked; a count for this feature alone is not recorded on this page yet.' }));
  } else bars.push(barHtml(KINDS[0][1], { state: 'none' }));
  // 2. Emulator or simulator: a dated run in this data file, or the newest emulator record in the feature's own test records
  const emuRec = latest(c.emulator);
  const ex = extra.sort((a, b) => dayValue(b.date) - dayValue(a.date))[0];
  if (ex && (!emuRec || dayValue(ex.date) >= dayValue(emuRec.date))) {
    bars.push(barHtml(KINDS[1][1], { state: 'count', passed: ex.passed, total: ex.total, meta: `${dayText(ex.date)} · ${ex.device} · ${ex.build}`, tags: ['emulator, not a real device', buildTag(ex.build)], how: `${ex.how} Not covered: ${ex.notCovered}` }));
  } else bars.push(barHtml(KINDS[1][1], recordBar('emulator', emuRec, tallyFor('emulator', emuRec), f)));
  // 3. AI on a real device
  const devRec = latest(c.aiDevice);
  bars.push(barHtml(KINDS[2][1], recordBar('aiDevice', devRec, tallyFor('aiDevice', devRec), f)));
  // 4. Tried by a person
  const perRec = latest(c.person);
  bars.push(barHtml(KINDS[3][1], recordBar('person', perRec, tallyFor('person', perRec), f)));
  return `<section class="ai-tested" aria-label="AI tested: ${esc(f.name)}"><p class="ait-title">AI tested <span class="ait-sub">(newest recorded run of each kind; does not change the percentage)</span></p><ul class="ait-bars">${bars.join('')}</ul></section>`;
}

export function needsDeviceSection(J, data, { featureId }) {
  const nd = data.needsDevice;
  if (!nd?.rows?.length) return '';
  const row = r => {
    const f = r.feature ? J.features.find(x => x.name === r.feature) : null;
    const conf = (r.testerConfirmations || []).map(c => `<li>Tried on a real ${esc(c.device)} by a tester on ${esc(c.date)}: <strong>${esc(c.result)}</strong>.${c.note ? ' ' + esc(c.note) : ''}</li>`).join('');
    const e = r.emulator;
    const emu = e
      ? `<div class="nd-emu"><p class="ait-head"><span class="ait-label">AI check on an emulator</span><span class="ait-tally">${e.passed} of ${e.total} passed</span></p><span class="ait-track" role="img" aria-label="Emulator check: ${e.passed} of ${e.total} passed on ${esc(dayText(e.date))}"><i style="width:${Math.floor((e.passed / e.total) * 100)}%"></i></span><p class="ait-meta">${esc(dayText(e.date))} · ${esc(e.device)} · ${esc(e.build)} <span class="ait-tag">emulator, not a real device</span></p></div>`
      : `<div class="nd-emu"><p class="ait-head"><span class="ait-label">AI check on an emulator</span><span class="ait-tally">${r.emulatorNote ? 'No counted run' : 'Not run yet'}</span></p><span class="ait-track" role="img" aria-label="Emulator check: ${r.emulatorNote ? 'no counted run' : 'not run yet'}"><i style="width:0%"></i></span>${r.emulatorNote ? `<p class="ait-meta">${esc(r.emulatorNote)}</p>` : ''}</div>`;
    return `<article class="nd-row" id="needs-device-${esc(r.id)}"><h3>${esc(r.area)} <span class="nd-status">${esc(r.status)}</span></h3>` +
      `<dl class="nd-facts"><div><dt>Device needed</dt><dd>${esc(r.deviceNeeded)}</dd></div>` +
      `<div><dt>What we proved, and when</dt><dd>${esc(r.proven)}</dd></div>` +
      `<div><dt>Not tried yet</dt><dd>${esc(r.notTried)}</dd></div>` +
      `<div><dt>Can you try it today?</dt><dd>${esc(r.canTry)}${r.guideHref ? ` <a href="${esc(r.guideHref)}">${esc(r.guideText || 'Install guide')}</a>` : ''}</dd></div>` +
      `<div><dt>Tell Nick</dt><dd><a href="${esc(nd.contactHref)}">${esc(nd.contactText)}</a></dd></div></dl>` +
      emu +
      `<div class="nd-confirm"><p class="ait-head"><span class="ait-label">Tried by a person on a real device</span><span class="ait-tally">${conf ? '' : 'Nobody yet'}</span></p>${conf ? `<ul>${conf}</ul>` : ''}</div>` +
      (f ? `<p class="nd-link"><a href="#${esc(featureId(f))}">Full record for “${esc(f.name)}” (${f.percentComplete}%)</a></p>` : '') + '</article>';
  };
  return `<!--NEEDS-DEVICE--><section class="evidence-section needs-device" id="needs-device" aria-labelledby="needs-device-title"><span class="evidence-kicker">Needs a real-device tester · updated ${esc(nd.updatedEastern)}</span><h2 id="needs-device-title">${esc(nd.title)}</h2>` +
    nd.intro.map(p => `<p class="nd-intro">${esc(p)}</p>`).join('') +
    `<p class="nd-rule">${esc(nd.rule)}</p><div class="nd-rows">${nd.rows.map(row).join('')}</div></section><!--/NEEDS-DEVICE-->`;
}
