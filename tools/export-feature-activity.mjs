// Private input comes through stdin. Never save it in this public website repository.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { validateFeed } = require('../assets/feature-activity.js');
const registry = JSON.parse(readFileSync(new URL('../site-data/feature-directory.json', import.meta.url), 'utf8'));
const ids = new Set(registry.features.map(f => f.id));
export function exportActivity(input, now = Date.now()) {
  if (!input || !Array.isArray(input.records)) throw Error('Verified checkpoint records required.');
  const features = input.records.map(record => {
    const source = record?.source;
    if (!source || !/^[a-f0-9]{40}$/.test(source.sha) || typeof source.taskId !== 'string' || !source.taskId.trim() || !/^https:\/\/github\.com\/beeboentertainment\/beebo-app-private\/issues\/\d+#issuecomment-\d+$/.test(source.evidence) || source.featureId !== record.featureId || source.confirmedAt !== record.updatedAt || source.verified !== true) throw Error('Checkpoint provenance is missing or does not match.');
    const kinds = { running: ['START', 'PROGRESS'], waiting: ['WAIT'], blocked: ['BLOCKED'], complete: ['COMPLETE'], unknown: ['UNKNOWN'] };
    if (!kinds[record.state]?.includes(source.kind)) throw Error('Assignment or build delivery is not a running checkpoint.');
    if (record.state === 'running' && ['phone', 'tablet', 'tv'].includes(record.deviceClass) && (source.exclusiveQaOwnerConfirmed !== true || !source.qaOwner || source.action !== 'testing-started')) throw Error('Device activity requires the exclusive QA owner and actual testing start.');
    // Public text is selected from fixed customer-safe enums, never copied from private prose.
    return Object.fromEntries(['featureId', 'revision', 'state', 'stage', 'scope', 'deviceClass', 'startedAt', 'updatedAt', 'expiresAt', 'nextAction'].map(k => [k, record[k]]));
  });
  const output = { schemaVersion: 1, updatedAt: input.updatedAt, features };
  if (!validateFeed(output, ids, now)) throw Error('Invalid public activity, chronology, expiry, or feature mapping.');
  return output;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(JSON.stringify(exportActivity(JSON.parse(readFileSync(0, 'utf8'))), null, 2) + '\n'); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
