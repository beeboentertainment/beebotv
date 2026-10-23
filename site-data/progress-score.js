/*
 * The one place that turns a feature's checks into a percentage.
 *
 * testing-status.json is the single source of truth. It holds a "scoring" block (the weights, the cap, the
 * labels, the colour tiers) and, per feature, the five "checks" plus two optional numbers:
 *   openIssues   whole number, default 0. Known errors that are still open. Above 0 the score is capped
 *                (scoring.openIssuesCap, 85), so a feature with an open known error can never reach 90.
 *   percentCap   optional whole number. An explicit upper limit that is explained by the feature's scoreNote.
 *
 * Works in Node (require) and in a browser (window.BeeboProgress). No dependencies.
 *   const P = require('./progress-score.js');
 *   P.percentFor(feature, data.scoring)
 *   P.problems(data)          // [] when every stored number matches the rule
 *   P.recompute(data)         // { percents, groups, overall } worked out from checks + openIssues
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeeboProgress = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function wholeNumber(v) { return typeof v === 'number' && Number.isInteger(v) && v >= 0; }

  function percentFor(feature, scoring) {
    const weights = scoring.weights;
    const checks = feature.checks || {};
    let p = 0;
    for (const name of Object.keys(weights)) if (checks[name] === true) p += weights[name];
    if (wholeNumber(feature.openIssues) && feature.openIssues > 0) p = Math.min(p, scoring.openIssuesCap);
    if (wholeNumber(feature.percentCap)) p = Math.min(p, feature.percentCap);
    return p;
  }

  // Label shown beside the bar. Only 90 and 100 get a special label; everything else shows its colour tier.
  function labelFor(percent, scoring) {
    if (percent >= scoring.readyPercent) return { id: 'ready', text: scoring.readyLabel };
    if (percent === scoring.waitingPercent) return { id: 'waiting', text: scoring.waitingLabel };
    return null;
  }

  function tierFor(percent, scoring) {
    for (const t of scoring.tiers) if (percent >= t.min) return t;
    return scoring.tiers[scoring.tiers.length - 1];
  }

  const average = (list) => (list.length ? Math.round(list.reduce((s, n) => s + n, 0) / list.length) : 0);

  function recompute(data) {
    const percents = data.features.map((f) => percentFor(f, data.scoring));
    const groups = {};
    data.features.forEach((f, i) => { (groups[f.group] = groups[f.group] || []).push(percents[i]); });
    for (const g of Object.keys(groups)) groups[g] = average(groups[g]);
    return { percents, groups, overall: average(percents) };
  }

  // Everything that must agree with the rule. Used by the page builders and by the --check script.
  function problems(data) {
    const out = [];
    const s = data.scoring;
    if (!s || !s.weights) return ['testing-status.json has no "scoring" block'];
    const total = Object.values(s.weights).reduce((a, b) => a + b, 0);
    if (total !== s.readyPercent) out.push(`scoring.weights add up to ${total}, not ${s.readyPercent}`);
    const withoutLast = total - (s.weights['Ready to call Available'] || 0);
    if (withoutLast !== s.waitingPercent) out.push(`the four checks before Ready add up to ${withoutLast}, not ${s.waitingPercent}`);
    if (s.openIssuesCap >= s.waitingPercent) out.push('scoring.openIssuesCap must stay below the waiting mark');
    data.features.forEach((f) => {
      if (f.openIssues !== undefined && !wholeNumber(f.openIssues)) out.push(`${f.name}: openIssues must be a whole number, 0 or more`);
      if (f.percentCap !== undefined && !wholeNumber(f.percentCap)) out.push(`${f.name}: percentCap must be a whole number, 0 or more`);
      if (f.percentCap !== undefined && !f.scoreNote) out.push(`${f.name}: percentCap needs a scoreNote that explains it`);
      if (wholeNumber(f.openIssues) && f.openIssues > 0 && !/open known issue/i.test(f.leftToReach100 || '')) {
        out.push(`${f.name}: openIssues is ${f.openIssues} but leftToReach100 does not name the open issue`);
      }
    });
    const r = recompute(data);
    data.features.forEach((f, i) => {
      if (f.percentComplete !== r.percents[i]) out.push(`${f.name}: percentComplete is ${f.percentComplete}, the rule gives ${r.percents[i]}`);
    });
    for (const g of Object.keys(r.groups)) {
      if ((data.groupAveragePercent || {})[g] !== r.groups[g]) out.push(`groupAveragePercent for ${g} is ${(data.groupAveragePercent || {})[g]}, the rule gives ${r.groups[g]}`);
    }
    if (data.overallAveragePercent !== r.overall) out.push(`overallAveragePercent is ${data.overallAveragePercent}, the rule gives ${r.overall}`);
    return out;
  }

  return { percentFor, labelFor, tierFor, average, recompute, problems };
});
