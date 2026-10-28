'use strict';
/*
 * "What works, platform by platform": a tick / cross chart worked out from testing-status.json (d.platformMatrix).
 *
 * The chart never invents a result. Every cell names the feature rows it maps to (their percentage and open-issue count are
 * READ live) and the dated records that back it (a "checks confirmed" entry, a Nick observation, or a device test record):
 * the date and Eastern time, the build and who tested are read from those records. Rules enforced here:
 *   - a tick ("Works") needs every mapped feature row to be Ready (100%, no open issue) or a Nick-and-second-tester check with no
 *     open issue on the mapped rows, plus at least one dated record;
 *   - "Mostly works" and "Does not work" must say why and name the open problem, and need a dated record;
 *   - "Not tested yet" and "Not applicable" must say why;
 *   - every quote a cell relies on must still be in the named feature's own record (so the text cannot drift from the data).
 * Used by tools/build-status-page.mjs (the table), scripts/check-evidence-tiers.cjs (assertions).
 */
const STATES = {
  works: { symbol: '✓', word: 'Works', long: 'Works: a person confirmed it and nothing known is open for this use' },
  mostly: { symbol: '◐', word: 'Mostly works', long: 'Mostly works, with known problems' },
  fails: { symbol: '✗', word: 'Does not work', long: 'Does not work (yet)' },
  untested: { symbol: '○', word: 'Not tested yet', long: 'Not tested yet' },
  na: { symbol: '–', word: 'Not applicable', long: 'Not applicable, or not available yet' },
};
const STATE_ORDER = ['works', 'mostly', 'fails', 'untested', 'na'];
const LIST_WHO = {
  both: 'Nick and a second tester together',
  alone: 'A second tester alone (Nick away)',
  phones: 'An AI tester on real phones',
};
const BUILD_RE = /(Android 1\.51-tester\d+|Windows 0\.1\.\d+|Beebo 0\.1\.\d+|Beebo Auto 1\.\d+)/g;
const buildsOf = (s) => [...new Set((String(s).match(BUILD_RE) || []).map((x) => x.replace(/^Beebo (0.1.)/, 'Windows $1')))].join(', ');
const shortWhen = (s) => String(s).replace(/(?: \([^)]*\))+$/, '');
const EASTERN_TIME = /\d{1,2}:\d{2}.*Eastern/;

function compute(d) {
  const m = d.platformMatrix;
  if (!m) return null;
  const problems = [];
  const feat = (n) => d.features.find((f) => f.name === n);
  const blob = (f) => JSON.stringify(f);
  const hasQuote = (f, qt) => blob(f).includes(JSON.stringify(qt).slice(1, -1));
  const colIds = (m.columns || []).map((c) => c.id);
  const devs = new Map((m.devices || []).map((x) => [x.id, x]));
  const checkIndex = new Map();
  for (const l of (d.checksConfirmed && d.checksConfirmed.lists) || []) for (const e of l.entries) checkIndex.set(e.id, { e, list: l.id });

  const resolve = (ev, where) => {
    if (ev.kind === 'check') {
      const hit = checkIndex.get(ev.id);
      if (!hit) { problems.push(`${where}: no checks-confirmed entry "${ev.id}"`); return null; }
      const { e, list } = hit;
      if (!EASTERN_TIME.test(e.when || '')) problems.push(`${where}: "${ev.id}" has no Eastern time`);
      return { kind: 'check', id: e.id, feature: e.feature, who: LIST_WHO[list] || 'A tester', when: shortWhen(e.when), build: buildsOf(e.build), link: `#check-${e.id}` };
    }
    const f = feat(ev.feature);
    if (!f) { problems.push(`${where}: evidence names unknown feature "${ev.feature}"`); return null; }
    const arr = (ev.kind === 'owner' ? f.ownerTests : f.deviceTests) || [];
    const recs = arr.filter((r) => String(r.date || '').startsWith(ev.date));
    if (recs.length !== 1) { problems.push(`${where}: ${recs.length} ${ev.kind} records of "${ev.feature}" start with "${ev.date}" (need exactly 1)`); return null; }
    const r = recs[0];
    if (!EASTERN_TIME.test(r.date || '')) problems.push(`${where}: record "${ev.date}" has no Eastern time`);
    let who;
    if (ev.kind === 'owner') who = /own decision/i.test(r.device || '') ? 'Nick (his own Ready decision)' : 'Nick (his own observation)';
    else who = /Nick/.test(r.tester || '') ? 'An AI tester with Nick present' : 'An AI tester on real devices';
    const builds = buildsOf(`${r.build || ''} ${r.device || ''}`, true);
    return { kind: ev.kind, feature: f.name, who, when: shortWhen(r.date), build: builds, result: r.result, link: `#${featureIdFor(f)}` };
  };
  const featureIdFor = (f) => f.id || 'feature-' + `${f.group}-${f.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');

  const rows = (m.rows || []).map((row) => {
    const cells = {};
    for (const c of colIds) {
      const raw = (row.cells || {})[c];
      const where = `${row.id}/${c}`;
      if (!raw) { problems.push(`${where}: missing cell`); continue; }
      const st = STATES[raw.state];
      if (!st) { problems.push(`${where}: unknown state "${raw.state}"`); continue; }
      const rowFeats = (raw.rows || []).map((n) => { const f = feat(n); if (!f) problems.push(`${where}: unknown feature row "${n}"`); return f; }).filter(Boolean);
      const evidence = (raw.evidence || []).map((ev, i) => resolve(ev, `${where}#${i + 1}`)).filter(Boolean);
      for (const qt of raw.quotes || []) { const f = feat(qt.feature); if (!f) problems.push(`${where}: quote names unknown feature "${qt.feature}"`); else if (!hasQuote(f, qt.quote)) problems.push(`${where}: "${qt.quote}" is no longer in the record of "${qt.feature}"`); }
      for (const id of raw.devices || []) if (!devs.has(id)) problems.push(`${where}: unknown device "${id}"`);
      const need = (k) => { if (!String(raw[k] || '').trim()) problems.push(`${where}: "${k}" is required for ${raw.state}`); };
      if (raw.state === 'works') {
        if (!rowFeats.length) problems.push(`${where}: a tick needs at least one mapped feature row`);
        const allReady = rowFeats.every((f) => f.percentComplete >= 100 && !(Number(f.openIssues) > 0));
        const togetherNoOpen = evidence.some((e) => e.kind === 'check' && e.who === LIST_WHO.both) && rowFeats.every((f) => !(Number(f.openIssues) > 0));
        if (!allReady && !togetherNoOpen) problems.push(`${where}: a tick needs every mapped row Ready (100%, no open issue): ${rowFeats.map((f) => f.name + ' ' + f.percentComplete + '%/' + (f.openIssues || 0)).join('; ')}`);
        if (!evidence.length) problems.push(`${where}: a tick needs at least one dated record`);
        need('tested'); need('notCovered');
      } else if (raw.state === 'mostly' || raw.state === 'fails') {
        need('why'); need('open'); need('tested'); need('notCovered');
        if (!evidence.length) problems.push(`${where}: ${raw.state} needs at least one dated record`);
        if (!rowFeats.length) problems.push(`${where}: ${raw.state} needs a mapped feature row`);
        if (raw.state === 'fails' && !(raw.quotes || []).length) problems.push(`${where}: a cross needs a quote from the feature record`);
        if (raw.state === 'mostly' && rowFeats.length && rowFeats.every((f) => f.percentComplete >= 100)) problems.push(`${where}: "mostly" but every mapped row is Ready`);
      } else { need('why'); }
      cells[c] = {
        col: c, state: raw.state, symbol: st.symbol, word: raw.word || st.word, long: st.long,
        why: raw.why || '', open: raw.open || '', tested: raw.tested || '', notCovered: raw.notCovered || '', note: raw.note || '',
        rows: rowFeats.map((f) => ({ name: f.name, percent: f.percentComplete, openIssues: Number(f.openIssues) || 0, id: featureIdFor(f) })),
        evidence,
        who: [...new Set(evidence.map((e) => e.who))],
        builds: [...new Set(evidence.flatMap((e) => (e.build || '').split(', ').filter(Boolean)))],
        devices: (raw.devices || []).map((id) => devs.get(id)).filter(Boolean),
      };
    }
    return { id: row.id, question: row.question, cells };
  });
  for (const r of m.rows || []) for (const c of Object.keys(r.cells || {})) if (!colIds.includes(c)) problems.push(`${r.id}: cell for unknown column "${c}"`);
  const counts = Object.fromEntries(STATE_ORDER.map((s) => [s, 0]));
  for (const r of rows) for (const c of Object.values(r.cells)) counts[c.state]++;
  const applicable = counts.works + counts.mostly + counts.fails + counts.untested;
  const quick = (m.quick || []).map((qk) => {
    const row = rows.find((r) => r.id === qk.cell[0]); const cell = row && row.cells[qk.cell[1]];
    if (!cell) { problems.push(`quick answer "${qk.question}" points at a missing cell`); return null; }
    return { question: qk.question, rowId: row.id, col: qk.cell[1], cell };
  }).filter(Boolean);
  // The placeholder for the owner's missing date lives in the data only and must never be shown.
  const oldPhone = m.oldPhone || {};
  if (!/Galaxy S3/.test(oldPhone.shortText || '') || !/2012/.test(oldPhone.shortText || '') || !/Android 7\.0/.test(oldPhone.shortText || '')) problems.push('oldPhone text must name the Galaxy S3, 2012 and Android 7.0');
  if (/PLACEHOLDER|TODO/i.test(JSON.stringify({ t: oldPhone.title, x: oldPhone.text, l: oldPhone.label, s: oldPhone.shortText }))) problems.push('oldPhone visible text must not contain a placeholder');
  return { model: m, columns: m.columns || [], rows, counts, applicable, total: rows.length * colIds.length, quick, devices: m.devices || [], problems };
}

module.exports = { compute, STATES, STATE_ORDER, LIST_WHO };
