import { readFileSync } from 'node:fs';
import { featureDirectory, escape as esc } from './feature-directory.mjs';

export const readinessAudit = JSON.parse(readFileSync(new URL('../site-data/readiness-audit.json', import.meta.url), 'utf8'));
export function validateReadinessAudit(data, audit = readinessAudit) {
  if (audit.schemaVersion !== 1 || !Number.isFinite(Date.parse(audit.updatedAt)) ||
      !/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) Eastern$/.test(audit.updatedEastern)) throw Error('Readiness audit needs a full dated Eastern timestamp.');
  if (audit.features.length !== data.features.length || new Set(audit.features.map(f => f.featureId)).size !== data.features.length) throw Error('Readiness audit must account for every feature exactly once.');
  for (const entry of featureDirectory) {
    const row = audit.features.find(f => f.featureId === entry.id);
    const feature = data.features.find(f => f.name === entry.name);
    if (!row || !feature || !['reviewed', 'evidence-gap'].includes(row.outcome) || !row.summary || !row.evidenceDates?.length ||
        row.scoreAfter !== feature.percentComplete || !Number.isInteger(row.scoreBefore) || row.scoreBefore < 0 || row.scoreBefore > 100) throw Error('Invalid audit record for ' + entry.name);
    if (row.scoreAfter === 100 && row.scoreBefore !== 100) throw Error('A new 100% requires a separate per-feature owner acceptance update.');
  }
}
export function featureAuditMarkup(id) {
  const row = readinessAudit.features.find(f => f.featureId === id);
  if (!row) throw Error('Missing readiness audit record: ' + id);
  return `<section class="feature-detail-panel feature-score-audit" aria-label="Percentage audit"><h2>Percentage review</h2><p><time datetime="${esc(readinessAudit.updatedAt)}">${esc(readinessAudit.updatedEastern)}</time> · ${row.scoreBefore === row.scoreAfter ? `${row.scoreAfter}% retained` : `${row.scoreBefore}% → ${row.scoreAfter}%`}${row.outcome === 'evidence-gap' ? ' · evidence gap remains' : ''}.</p><p>${esc(row.summary)}</p><p>Dated records considered: ${esc(row.evidenceDates.join('; '))}. Reviewing a record is not a new test or final acceptance.</p></section>`;
}
export function readinessAuditMarkup() {
  const gaps = readinessAudit.features.filter(f => f.outcome === 'evidence-gap');
  const moved = readinessAudit.features.filter(f => f.scoreBefore !== f.scoreAfter);
  const gapNames = gaps.map(f => featureDirectory.find(e => e.id === f.featureId).name);
  return `<!--READINESS-AUDIT--><section class="evidence-section" id="percentage-audit"><h2>Latest percentage review</h2><p><time datetime="${esc(readinessAudit.updatedAt)}">${esc(readinessAudit.updatedEastern)}</time>: all ${readinessAudit.features.length} feature records examined. ${moved.length ? `${moved.length} scores changed on dated evidence.` : 'No percentage changed.'} ${gaps.length ? `${gaps.length} evidence gap${gaps.length === 1 ? '' : 's'} remain: ${esc(gapNames.join('; '))}. Those scores are retained pending the missing proof.` : 'No row was left unaudited.'} No new final acceptance was added.</p><p>This review checks the dated evidence supporting the existing marks. It does not mean every feature was retested today. Coding, reviews and work activity do not add readiness credit.</p><details><summary>Read the outcome for all ${readinessAudit.features.length} features</summary><ul>${readinessAudit.features.map(row => { const entry = featureDirectory.find(e => e.id === row.featureId); return `<li><a href="features/${esc(entry.id)}.html">${esc(entry.name)}</a>: ${row.scoreBefore === row.scoreAfter ? `${row.scoreAfter}% retained` : `${row.scoreBefore}% → ${row.scoreAfter}%`}${row.outcome === 'evidence-gap' ? ' (evidence gap)' : ''}. ${esc(row.summary)} Dated records: ${esc(row.evidenceDates.join('; '))}.</li>`; }).join('')}</ul></details></section><!--/READINESS-AUDIT-->`;
}
