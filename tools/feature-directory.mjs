import { readFileSync } from 'node:fs';
const directory = JSON.parse(readFileSync(new URL('../site-data/feature-directory.json', import.meta.url), 'utf8'));
export const featureDirectory = directory.features;
export function featureId(feature) {
  const entry = featureDirectory.find(e => e.name === feature.name);
  if (!entry) throw Error('Feature needs an explicitly pinned directory ID: ' + feature.name);
  return entry.id;
}
export const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function activityDirectoryMarkup() {
  return `<script id="feature-activity-ids" type="application/json">${JSON.stringify(featureDirectory.map(f => f.id)).replace(/</g, '\\u003c')}</script>`;
}
export function activityMarkup(id) {
  return `<section class="feature-live-activity" data-live-feature="${escape(id)}" data-live-state="unknown" aria-label="Current work activity"><div class="feature-live-heading"><span class="feature-live-dot" aria-hidden="true"></span><span data-live-label>AI work activity: not verified</span></div><p data-live-scope>No live feed confirms AI work on this feature right now. This says nothing about testing: the Latest check line is the test record.</p><p><strong>Next work step:</strong> <span data-live-next>None confirmed.</span></p><p data-live-time>Last work confirmation: not recorded.</p><p data-live-start></p></section>`;
}
