#!/usr/bin/env node
/*
 * Checks (or refreshes) the numbers in testing-status.json against the one scoring rule in
 * site-data/progress-score.js.
 *
 *   node site-data/check-progress-score.js          exit 1 if any percentage or average disagrees with the rule
 *   node site-data/check-progress-score.js --write  rewrite percentComplete, groupAveragePercent and
 *                                                   overallAveragePercent from the checks (nothing else changes)
 *
 * --write does not touch any "updated" stamp, change note or previousPercent. Those are written by the person
 * who makes the change, with the real Eastern date AND time.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./progress-score.js');

const file = path.resolve(__dirname, '..', 'testing-status.json');
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const data = JSON.parse(raw);

if (process.argv.includes('--write')) {
  if (!data.scoring) throw new Error('testing-status.json has no "scoring" block');
  const r = P.recompute(data);
  data.features.forEach((f, i) => { f.percentComplete = r.percents[i]; });
  data.groupAveragePercent = r.groups;
  data.overallAveragePercent = r.overall;
  const text = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
  console.log(`testing-status.json refreshed: ${data.features.length} features, overall ${r.overall}%`);
} else {
  const list = P.problems(data);
  if (list.length) {
    console.error('testing-status.json disagrees with the scoring rule:\n  ' + list.join('\n  '));
    process.exit(1);
  }
  console.log(`testing-status.json follows the scoring rule: ${data.features.length} features, overall ${data.overallAveragePercent}%`);
}
