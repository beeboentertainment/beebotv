'use strict';
/*
 * "How close are Windows and Android to 100%?": plain-English platform progress, worked out from testing-status.json.
 *
 * Everything countable (how many features are Ready, almost there or earlier; open problems; real-device and real-world
 * counts; which feature is in which list) is READ from d.features here, never typed. The only hand-written text is in
 * d.platformProgress: one plain sentence of "what is still needed" for each almost-there feature, and the blocker boxes.
 * Each hand-written line names the feature it is about and quotes a phrase that must still be in that feature's own
 * record, so when the record changes the build stops and the line has to be looked at again (it can never quietly drift).
 *
 * Used by tools/build-status-page.mjs (the section on release-evidence.html), site-data/build-what-we-offer.js (the
 * short callout on the home page) and scripts/check-evidence-tiers.cjs (assertions).
 */
const RETIRED = /^Retired/i;
const NEED_MAX = 135;

// The site's own tiers, folded into three plain groups: Ready = 100; almost there = 90 to 99; earlier = below 90.
function tierOf(pct) { return pct >= 100 ? 'ready' : pct >= 90 ? 'almost' : 'building'; }

function plural(n, one, many) { return n === 1 ? one : many; }

function compute(d) {
  const pp = d.platformProgress;
  if (!pp) return null;
  const problems = [];
  const blobOf = (f) => JSON.stringify(f);
  const hasQuote = (f, q) => blobOf(f).includes(JSON.stringify(q).slice(1, -1));
  const platforms = (pp.platforms || []).map((p) => {
    const list = d.features.filter((f) => f.group === p.group);
    if (!list.length) problems.push(`${p.id}: no features in group "${p.group}"`);
    const counted = list.filter((f) => !RETIRED.test(f.status || ''));
    const retired = list.filter((f) => RETIRED.test(f.status || ''));
    const by = (t) => counted.filter((f) => tierOf(f.percentComplete) === t);
    const ready = by('ready');
    const almost = by('almost').sort((a, b) => b.percentComplete - a.percentComplete);
    const building = by('building').sort((a, b) => b.percentComplete - a.percentComplete);
    const total = counted.length;
    const stats = {
      total,
      openIssues: counted.reduce((n, f) => n + (Number(f.openIssues) || 0), 0),
      openFeatures: counted.filter((f) => Number(f.openIssues) > 0).length,
      realDevice: counted.filter((f) => f.checks && f.checks['Real device']).length,
      realWorld: counted.filter((f) => f.checks && f.checks['Real-world check']).length,
      inDev: counted.filter((f) => /^In development/i.test(f.status || '')).length,
    };
    // One plain line of "what is still needed" for every almost-there feature.
    const needs = new Map();
    for (const n of p.almostNeeds || []) {
      const f = list.find((x) => x.name === n.feature);
      if (!f) { problems.push(`${p.id}: almostNeeds names "${n.feature}", which is not in "${p.group}"`); continue; }
      if (tierOf(f.percentComplete) !== 'almost') { problems.push(`${p.id}: "${n.feature}" is at ${f.percentComplete}%, no longer almost there: remove or rewrite its line`); continue; }
      if (needs.has(n.feature)) problems.push(`${p.id}: two lines for "${n.feature}"`);
      if (!String(n.need || '').trim() || n.need.length > NEED_MAX) problems.push(`${p.id}: line for "${n.feature}" must be 1 to ${NEED_MAX} characters`);
      if (!(n.basis || []).length) problems.push(`${p.id}: line for "${n.feature}" needs a basis quote`);
      for (const q of n.basis || []) if (!hasQuote(f, q)) problems.push(`${p.id}: basis "${q}" is no longer in the record of "${n.feature}"`);
      needs.set(n.feature, n.need);
    }
    for (const f of almost) if (!needs.has(f.name)) problems.push(`${p.id}: "${f.name}" (${f.percentComplete}%) is almost there but has no plain line in platformProgress`);
    // Blockers: plain words, with {tokens} filled from the data; every named feature must be in the group and every quote still present.
    const fill = (t) => String(t).replace(/\{(\w+)\}/g, (_m, k) => {
      if (!(k in stats)) { problems.push(`${p.id}: unknown token {${k}}`); return ''; }
      return String(stats[k]);
    });
    const blockers = (p.blockers || []).map((b) => {
      if (!/^[a-z0-9-]+$/.test(b.id || '')) problems.push(`${p.id}: blocker id "${b.id}" is not a slug`);
      for (const n of b.features || []) if (!list.find((x) => x.name === n)) problems.push(`${p.id}/${b.id}: feature "${n}" is not in "${p.group}"`);
      for (const q of b.quotes || []) {
        const f = list.find((x) => x.name === q.feature);
        if (!f) problems.push(`${p.id}/${b.id}: quote names "${q.feature}", not in "${p.group}"`);
        else if (!hasQuote(f, q.quote)) problems.push(`${p.id}/${b.id}: "${q.quote}" is no longer in the record of "${q.feature}"`);
      }
      if (!String(b.title || '').trim() || !String(b.text || '').trim()) problems.push(`${p.id}/${b.id}: title and text are required`);
      return { id: b.id, title: b.title, text: fill(b.text), features: b.features || [] };
    });
    if (blockers.length < 3 || blockers.length > 5) problems.push(`${p.id}: needs 3 to 5 blockers, has ${blockers.length}`);
    const sentence = `${p.name}: ${ready.length} of ${total} features ${plural(ready.length, 'is', 'are')} fully confirmed (Ready); ` +
      `${almost.length} more ${plural(almost.length, 'is', 'are')} almost there (90 to 98%); ` +
      `${building.length} ${plural(building.length, 'is', 'are')} earlier on (below 90%).`;
    return { id: p.id, name: p.name, group: p.group, scope: p.scope, counted, retired, ready, almost, building, needs, blockers, stats, sentence };
  });
  if (platforms.length !== 2) problems.push('platformProgress needs exactly two platforms (Windows and Android)');
  return { platforms, problems };
}

// One short line for the home page callout, e.g. "Windows app: 1 of 21 features Ready, 3 almost there, 17 earlier."
function shortLine(c) {
  return `${c.name}: ${c.ready.length} of ${c.stats.total} features Ready, ${c.almost.length} almost there, ${c.building.length} earlier on.`;
}

module.exports = { compute, tierOf, shortLine, NEED_MAX };
