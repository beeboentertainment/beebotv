// Public, dated activity and recorded-test summaries. Activity never changes a score.
import { parse, parseFragment, serialize } from 'parse5';
const STAGES = new Set(['Implementation', 'Review', 'Testing', 'Not active', 'Unverified']);
export const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeText = value => typeof value === 'string' && value.length <= 600 && !/https?:\/\/|issuecomment|\/workspace\/|\b[a-f0-9]{32,40}\b|[\u0000-\u0008\u000b-\u001f]/i.test(value);
export function validateSnapshot(snapshot, features) {
  const errors = [];
  if (!Number.isFinite(Date.parse(snapshot?.capturedAt))) errors.push('Activity snapshot needs a full timestamp.');
  if (!Number.isFinite(Date.parse(snapshot?.expiresAt)) || Date.parse(snapshot.expiresAt) <= Date.parse(snapshot.capturedAt)) errors.push('Activity snapshot needs a later verification expiry.');
  const names = new Set(features.map(f => f.name));
  const seen = new Set();
  for (const row of snapshot?.features || []) {
    if (!names.has(row.name) || seen.has(row.name)) errors.push('Activity feature names must match the feature table exactly once.');
    seen.add(row.name);
    if (![true, false, null].includes(row.active)) errors.push('Activity must be confirmed active, confirmed inactive, or unknown.');
    if (!STAGES.has(row.stage)) errors.push('Unrecognized activity stage.');
    if (row.active === true && !['Implementation', 'Review', 'Testing'].includes(row.stage)) errors.push('Assigned, held or completed work is not active work.');
    if (row.active === null && row.stage !== 'Unverified') errors.push('Unknown activity needs an unverified stage.');
    if (row.active === false && row.stage !== 'Not active') errors.push('Inactive activity needs an explicit inactive stage.');
    if (!safeText(row.reason) || !row.reason.trim()) errors.push('Activity needs a public, plain-language reason.');
    if (row.active !== null && !Number.isFinite(Date.parse(row.confirmedAt))) errors.push('Confirmed activity needs its own confirmation time.');
    const allowed = new Set(['name', 'active', 'stage', 'reason', 'confirmedAt', 'tests']);
    if (Object.keys(row).some(key => !allowed.has(key))) errors.push('Unexpected activity field.');
    for (const kind of ['automated', 'deviceWorld']) {
      const count = row.tests?.[kind];
      if (!count || !['unknown', 'partial', 'complete'].includes(count.coverage)) { errors.push('Test counts need an honest coverage label.'); continue; }
      for (const key of ['runs', 'assertions', 'datedRecords']) if (count[key] !== undefined && count[key] !== null && (!Number.isInteger(count[key]) || count[key] < 0)) errors.push('Recorded counts must be whole numbers or unknown.');
      if (count.coverage === 'unknown' && (count.runs !== null || count.assertions != null)) errors.push('Unknown counts cannot imply zero or a measured total.');
      if (!safeText(count.note)) errors.push('Test-count notes must be public plain text.');
    }
  }
  if (seen.size !== names.size) errors.push('Every feature needs an activity entry, including unverified entries.');
  return [...new Set(errors)];
}
export function activityState(row, snapshot, now = snapshot.capturedAt) {
  if (Date.parse(now) > Date.parse(snapshot.expiresAt) || Date.parse(now) < Date.parse(snapshot.capturedAt)) return 'unknown';
  return row.active === true ? 'active' : row.active === false ? 'inactive' : 'unknown';
}
export function codeEstimate(feature) {
  const outstanding = feature.roadTo100?.remaining?.some(item => item.kind === 'CODE') || feature.openIssues > 0;
  return feature.codeDonePercent === 100 && outstanding
    ? 'Legacy code estimate is unverified: required code work or an open issue remains.'
    : null;
}
const robot = '<svg class="work-robot" aria-hidden="true" focusable="false" viewBox="0 0 48 48"><path d="M24 5v5M21 5h6M8 25H4v10h4m32-10h4v10h-4M17 39v5m14-5v5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="9" y="11" width="30" height="28" rx="7" fill="currentColor"/><circle cx="18" cy="22" r="2.5" class="robot-eye"/><circle cx="30" cy="22" r="2.5" class="robot-eye"/><path d="M18 31h12" stroke="var(--robot-eye, #101820)" stroke-width="2" stroke-linecap="round"/></svg>';
function countSummary(row, type) {
  const c = row.tests[type];
  if (c.runs !== null) return `${c.runs} recorded run${c.runs === 1 ? '' : 's'}${type === 'automated' && c.assertions != null ? ` · ${c.assertions} assertions` : ''} (${c.coverage})`;
  return type === 'deviceWorld' && c.datedRecords > 0 ? `Run total unknown · ${c.datedRecords} dated records (partial)` : 'Run total unknown';
}
export function renderActivity(row, snapshot, id) {
  const state = activityState(row, snapshot);
  const label = state === 'active' ? 'AI working' : state === 'inactive' ? 'Not currently worked on' : 'Activity not verified';
  const reason = row.reason;
  return `<details class="feature-activity" data-activity="${state}" data-expires="${escapeHtml(snapshot.expiresAt)}"><summary class="activity-toggle activity-${state}" aria-describedby="${id}-activity-note" title="${escapeHtml(reason)}">${robot}<span data-activity-label>${label}</span><span class="activity-at">at snapshot</span><span class="activity-tooltip" aria-hidden="true">${escapeHtml(reason)}</span></summary><p id="${id}-activity-note" class="activity-note">${escapeHtml(reason)} <strong>Stage:</strong> ${escapeHtml(row.stage)}. Snapshot: <time datetime="${escapeHtml(snapshot.capturedAt)}">${escapeHtml(snapshot.displayTime)}</time>. This is not live activity. One worker may cover several features.</p></details>`;
}
export function renderCards(data, snapshot, { featureId, tierFor, checksLine, leftLine }) {
  const errors = validateSnapshot(snapshot, data.features);
  if (errors.length) throw new Error(errors.join('\n'));
  const byName = new Map(snapshot.features.map(row => [row.name, row]));
  const card = f => {
    const id = featureId(f), entry = byName.get(f.name), tier = tierFor(f.percentComplete, data.scoring);
    const risk = f.openIssues ? `${f.openIssues} open known issue${f.openIssues === 1 ? '' : 's'}.` : 'No open issue recorded.';
    const estimate = codeEstimate(f);
    return `<article class="feature-work-card tier-${escapeHtml(tier.id)}" data-tier="${escapeHtml(tier.id)}" data-feature-name="${escapeHtml(f.name)}"><div class="feature-work-heading"><h4><a class="feature-work-link" href="#${escapeHtml(id)}">${escapeHtml(f.name)}</a></h4><strong class="feature-work-percent">${f.percentComplete}%</strong></div><p class="feature-work-status">${escapeHtml(f.status)} · ${escapeHtml(f.group)}</p><p class="feature-work-risk">${escapeHtml(risk)}${f.scoreNote ? ' ' + escapeHtml(f.scoreNote) : ''}</p>${renderActivity(entry, snapshot, id)}<p class="feature-work-counts"><span class="recorded-checks"><strong>Automated checks:</strong> ${escapeHtml(countSummary(entry, 'automated'))}</span><span class="recorded-device-runs"><strong>Device/world runs:</strong> ${escapeHtml(countSummary(entry, 'deviceWorld'))}</span></p>${estimate ? `<p class="feature-work-limit">${escapeHtml(estimate)}</p>` : ''}<details class="feature-work-details"><summary>Why this score, test records and next step</summary><p>${escapeHtml(checksLine(f))}</p><p><strong>Next step:</strong> ${escapeHtml(leftLine(f))}</p><p><strong>Latest recorded test:</strong> ${escapeHtml(f.lastTested || 'Not recorded.')}</p><p><strong>Count coverage:</strong> ${escapeHtml(entry.tests.automated.note)} ${escapeHtml(entry.tests.deviceWorld.note)} Counts are partial unless explicitly marked complete; assertions are not device runs. Cutoff: <time datetime="${escapeHtml(snapshot.recordsCutoff)}">${escapeHtml(snapshot.recordsCutoff)}</time>.</p><p><a href="#${escapeHtml(id)}">Full evidence and test history for ${escapeHtml(f.name)}</a></p></details></article>`;
  };
  const groups = [
    ['accepted', 'Accepted and awaiting final acceptance', f => f.percentComplete >= 99],
    ['green', '90–98%: current green tier', f => f.percentComplete >= 90 && f.percentComplete < 99],
    ['below', 'Below 90%: remaining features', f => f.percentComplete < 90]
  ];
  return `<div class="feature-work-snapshot"><h3>Work confirmed at a dated snapshot</h3><p class="activity-snapshot-stamp">Snapshot: <time datetime="${escapeHtml(snapshot.capturedAt)}">${escapeHtml(snapshot.displayTime)}</time>. <strong>Not live.</strong> Activity may have changed. It is separate from the score or a passed test.</p><ul class="activity-legend"><li><span class="activity-active">AI working</span>: implementation, review or testing was confirmed.</li><li><span class="activity-inactive">Not currently worked on</span>: explicitly confirmed inactive, with a reason.</li><li><span class="activity-unknown">Activity not verified</span>: no confirmation, or this snapshot is stale.</li></ul><p>Open an icon for details with a tap or Enter; hover or keyboard focus also explains it. One worker can cover several features. Unverified activity does not mean the feature is broken.</p><p class="activity-stale-note" hidden>This snapshot is stale. Current activity is not verified; the dated details remain available.</p><div id="feature-work-groups">${groups.map(([id, title, matches]) => { const list = data.features.filter(matches).sort((a,b) => b.percentComplete-a.percentComplete); return `<section class="feature-work-group" id="feature-work-${id}" aria-labelledby="feature-work-${id}-title"><h3 id="feature-work-${id}-title">${title} <span>(${list.length})</span></h3><div class="feature-work-grid">${list.map(card).join('')}</div></section>`; }).join('')}</div></div>`;
}

export function compactEvidenceLayout(input) {
  const document = parse(input);
  const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
  const all = (root, match) => {
    const found = [];
    const walk = node => { if (match(node)) found.push(node); for (const child of node.childNodes || []) walk(child); };
    walk(root); return found;
  };
  const find = match => all(document, match)[0];
  const detach = node => { const p = node.parentNode; if (p) p.childNodes.splice(p.childNodes.indexOf(node), 1); return node; };
  const append = (parent, node) => { detach(node); node.parentNode = parent; parent.childNodes.push(node); };
  const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
  const fragment = html => parseFragment(html).childNodes[0];
  const main = find(n => n.tagName === 'main');
  if (!main) throw new Error('Evidence main element missing.');
  // Unwrap only wrappers introduced by this function so generation remains idempotent.
  for (const wrapper of all(document, n => n.tagName === 'details' && attr(n, 'data-evidence-archive'))) {
    const retained = wrapper.childNodes.filter(n => n.tagName !== 'summary');
    if (!retained.some(n => n.tagName === 'section')) { detach(wrapper); continue; }
    const parent = wrapper.parentNode, at = parent.childNodes.indexOf(wrapper);
    retained.forEach(detach); parent.childNodes.splice(at, 1, ...retained); retained.forEach(n => { n.parentNode = parent; });
  }
  const features = find(n => attr(n, 'id') === 'features');
  if (!features) throw new Error('Features section missing.');
  // Move marker comments with their chart: existing marker-based generators keep one copy.
  const moveBlock = (node, marker) => {
    const start = find(n => n.nodeName === '#comment' && n.data.trim() === marker);
    const end = find(n => n.nodeName === '#comment' && n.data.trim() === '/' + marker);
    if (!start || !end) throw new Error('Chart generation markers missing: ' + marker);
    return [start, node, end].map(detach);
  };
  const charts = [];
  for (const [id, marker] of [['works-today','WORKS-TODAY'], ['platform-progress','PLATFORM-PROGRESS'], ['platform-matrix','PLATFORM-MATRIX'], ['code-vs-human','CODE-VS-HUMAN']]) {
    const node = find(n => attr(n, 'id') === id);
    if (node) charts.push(...moveBlock(node, marker));
  }
  detach(features);
  const archives = [];
  const ids = ['oct22-retest-stage2', 'code-status', 'oct26-second-household', 'oct26-latest', 'oct26-runs', 'oct25-runs', 'oct24-runs', 'oct22-runs', 'release-checks-oct19', 'release-checks-oct18', 'published-run', 'release-changes'];
  for (const id of ids) {
    const node = find(n => n.tagName === 'section' && attr(n, 'id') === id);
    if (!node) continue;
    const heading = all(node, n => n.tagName === 'h2')[0];
    const wrapper = fragment(`<details class="evidence-archive" data-evidence-archive="${id}"><summary>${escapeHtml(heading ? text(heading) : 'Earlier evidence and release records')}</summary></details>`);
    const contents = id === 'code-status' ? moveBlock(node, 'CODE-STATUS-SUMMARY') : id === 'release-changes' ? moveBlock(node, 'RELEASE-CHANGES') : [node];
    contents.forEach(n => append(wrapper,n)); archives.push(wrapper);
  }
  const hero = find(n => n.tagName === 'section' && attr(n, 'class')?.split(' ').includes('evidence-hero'));
  if (hero) {
    const h1 = all(hero, n => n.tagName === 'h1')[0];
    if (h1) { const header = fragment('<header class="feature-summary-header"></header>'); append(header,h1); header.parentNode=main;main.childNodes.unshift(header); }
    const wrapper = fragment('<details class="evidence-archive" data-evidence-archive="context"><summary>How to read the evidence and earlier context</summary></details>');
    append(wrapper,hero);archives.unshift(wrapper);
  }
  const ready = main.childNodes.findIndex(n => n.nodeName === '#comment' && n.data.trim() === '/READY-BANNER');
  const position = ready >= 0 ? ready + 1 : 1;
  main.childNodes.splice(position,0,...charts,features);
  for (const n of [...charts,features]) n.parentNode=main;
  for (const n of archives) append(main,n);
  const significant = main.childNodes.filter(n => n.nodeName !== '#text' || n.value.trim());
  main.childNodes = significant.flatMap(n => [{ nodeName: '#text', value: '\n', parentNode: main }, n]);
  return serialize(document).replace(/[ \t]+(?=\r?\n)/g, '');
}
