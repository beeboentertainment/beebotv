/*
 * The one place that turns a feature's checks into a percentage.
 *
 * testing-status.json is the single source of truth. It holds a "scoring" block (the weights, the cap, the
 * labels, the colour tiers) and, per feature, the five "checks" plus two optional numbers:
 *   openIssues   whole number, default 0. Known errors that are still open. Above 0 the score is capped
 *                (scoring.openIssuesCap, 90), so a feature with an open known error can never reach 99.
 *   nextUpdate   optional { emulatorPassed, date, evidence }: newest main code passed on the emulator / test PC.
 *                Shows a tag only; never changes the percent. Cleared on release day.
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

  // The Real device tick only counts for the 98 step when a dated PASS on a real (non-emulator) device with a PUBLIC (published) build is recorded in the
  // feature's own device or owner tests. A tick with no such record gets no new credit (it keeps what it had).
  function hasRealDevicePass(feature) {
    return [...(feature.ownerTests || []), ...(feature.deviceTests || [])]
      .some((r) => r && r.result === 'PASS' && !/emulator|simulator/i.test(r.device || '') && /\b(public|published)\b/i.test(r.build || ''));
  }

  function percentFor(feature, scoring) {
    const weights = scoring.weights;
    const checks = feature.checks || {};
    let p = 0;
    for (const name of Object.keys(weights)) if (checks[name] === true) p += weights[name];
    // Emulator step (added Nov 12, 2026): Built + Automated tests + a recorded emulator (Android) or test-PC
    // (Windows / browser) pass of the PUBLIC build lifts the score to 98. A pass on a real phone (the existing Real device tick, rule
    // unchanged, plus a recorded PASS on a real device) also counts for this step. Only rows with no open known problem get the step;
    // a row with openIssues above 0 keeps its plain added-up score (the 90 cap still applies), so an emulator pass is never ranked above a real-device pass. It is a
    // floor, never a deduction; Real-world check on top still gives 99.
    const em = scoring.emulator;
    const noOpenIssues = !(wholeNumber(feature.openIssues) && feature.openIssues > 0);
    if (em && noOpenIssues && (checks[em.check] === true || (checks['Real device'] === true && hasRealDevicePass(feature))) && checks.Built === true && checks['Automated tests'] === true) p = Math.max(p, em.percent);
    if (wholeNumber(feature.openIssues) && feature.openIssues > 0) p = Math.min(p, scoring.openIssuesCap);
    if (wholeNumber(feature.percentCap)) p = Math.min(p, feature.percentCap);
    return p;
  }

  // Label shown beside the bar. Only 99 and 100 get a special label; everything else shows its colour tier.
  function labelFor(percent, scoring) {
    if (percent >= scoring.readyPercent) return { id: 'ready', text: scoring.readyLabel };
    if (percent === scoring.waitingPercent) return { id: 'waiting', text: scoring.waitingLabel };
    if (scoring.emulator && percent === scoring.emulator.percent) return { id: 'emulator', text: scoring.emulator.label };
    return null;
  }

  // Label beside the bar for one feature. At 98 it says what actually got the row there: a real-phone pass reads
  // "Real device passed", an emulator or test-PC pass reads "Emulator passed". Otherwise the same as labelFor.
  function stepLabel(feature, scoring) {
    const p = percentFor(feature, scoring);
    const l = labelFor(p, scoring);
    if (l && l.id === 'emulator' && (feature.checks || {})['Real device'] === true) return { id: 'real-device', text: scoring.emulator.realDeviceLabel };
    return l;
  }

  // Optional "Fixed in next update - emulator passed" tag. It NEVER changes the percent (the percent is the public
  // build only). feature.nextUpdate = { emulatorPassed: true, date, evidence } is recorded when the newest main code,
  // not yet public, passed on the emulator / test PC. Shown only while the public score is still below the emulator
  // step; on release day the tag is cleared and the row moves to 98 from the public build.
  function nextUpdateTag(feature, scoring) {
    const n = feature.nextUpdate;
    if (!n || n.emulatorPassed !== true || !scoring.emulator) return null;
    if (percentFor(feature, scoring) >= scoring.emulator.percent) return null;
    return scoring.emulator.nextUpdateLabel;
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
    if (s.openIssuesCap !== 90) out.push('open issue cap must be 90');
    const requiredTiers = [[100,'gold'],[99,'purple'],[90,'green'],[80,'teal'],[40,'yellow'],[0,'red']];
    if (JSON.stringify((s.tiers || []).map(t => [t.min,t.id])) !== JSON.stringify(requiredTiers)) out.push('tiers must separate 100, 99, 90–98, 80–89, 40–79 and 0–39');
    if (!s.emulator || s.emulator.check !== 'Emulator' || s.emulator.percent !== 98 || !s.emulator.label || !s.emulator.realDeviceLabel || !s.emulator.nextUpdateLabel) out.push('scoring.emulator must name the Emulator check, 98 percent, its label and the next-update tag label');
    else if (!(s.emulator.percent > s.waitingPercent - 2 && s.emulator.percent < s.waitingPercent)) out.push('the emulator step must sit just below the waiting mark');
    if (s.openIssuesCap >= s.waitingPercent) out.push('scoring.openIssuesCap must stay below the waiting mark');
    data.features.forEach((f) => {
      const c = f.checks || {};
      if (c.Emulator !== undefined && typeof c.Emulator !== 'boolean') out.push(`${f.name}: checks.Emulator must be true or false`);
      if (c.Emulator === true && !(c.Built === true && c['Automated tests'] === true)) out.push(`${f.name}: Emulator needs Built and Automated tests`);
      if (c.Emulator === true && !/emulator|test pc|dev pc|24-core/i.test(JSON.stringify(f.deviceTests || []) + JSON.stringify(f.recentDeviceEvidence || []))) out.push(`${f.name}: Emulator is true but no emulator or test-PC run is recorded in its device tests`);
      if (f.nextUpdate !== undefined) {
        const n = f.nextUpdate;
        if (!n || typeof n !== 'object' || typeof n.emulatorPassed !== 'boolean') out.push(`${f.name}: nextUpdate must be { emulatorPassed, date, evidence }`);
        else if (n.emulatorPassed && (!/Eastern/.test(n.date || '') || !String(n.evidence || '').trim())) out.push(`${f.name}: nextUpdate.emulatorPassed needs a dated Eastern "date" and an "evidence" sentence`);
        else if (n.emulatorPassed && s.emulator && percentFor(f, s) >= s.emulator.percent) out.push(`${f.name}: nextUpdate tag must be cleared once the public score is ${s.emulator.percent} or more (clear it on release day)`);
      }
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

  return { percentFor, labelFor, stepLabel, hasRealDevicePass, nextUpdateTag, tierFor, average, recompute, problems };
});
