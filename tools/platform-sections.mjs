// HTML for two plain-English sections near the top of release-evidence.html, both generated from testing-status.json:
//   1. "How close are Windows and Android to 100%?"  (d.platformProgress, counted by site-data/platform-progress.js)
//   2. "What works, platform by platform"             (d.platformMatrix, resolved by site-data/platform-matrix.js)
// Nothing here is typed by hand: counts, percentages, dates, builds and the "who tested" labels are read from the data.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PP = require('../site-data/platform-progress.js');
const PM = require('../site-data/platform-matrix.js');

export function platformProgressHtml(J, { esc, featureId, iso, requireStamp }) {
  const pp = J.platformProgress;
  if (!pp) return '';
  const R = PP.compute(J);
  if (R.problems.length) throw new Error('platformProgress problems:\n  ' + R.problems.join('\n  '));
  requireStamp('platformProgress.updatedEastern', pp.updatedEastern);
  const link = (f) => `<a href="#${esc(featureId(f))}">${esc(f.name)}</a>`;
  const card = (c) => {
    const total = c.stats.total;
    const seg = (cls, n, label) => (n ? `<span class="pp-seg ${cls}" style="flex-grow:${n}" title="${esc(label)}: ${n}"></span>` : '');
    const aria = `${c.name}: ${c.ready.length} Ready, ${c.almost.length} almost there, ${c.building.length} earlier on, out of ${total} features.`;
    const bar = `<div class="pp-bar" role="img" aria-label="${esc(aria)}">${seg('pp-ready', c.ready.length, 'Ready')}${seg('pp-almost', c.almost.length, 'Almost there')}${seg('pp-building', c.building.length, 'Earlier on')}</div>`;
    const legend = `<ul class="pp-legend"><li><span class="pp-sw pp-ready" aria-hidden="true"></span><strong>${c.ready.length}</strong> Ready (100%)</li><li><span class="pp-sw pp-almost" aria-hidden="true"></span><strong>${c.almost.length}</strong> Almost there (90 to 98%)</li><li><span class="pp-sw pp-building" aria-hidden="true"></span><strong>${c.building.length}</strong> Earlier on (below 90%)</li></ul>`;
    const done = c.ready.length
      ? `<ul class="pp-list">${c.ready.map((f) => `<li>${link(f)} <span class="pp-pct">100%</span></li>`).join('')}</ul>`
      : '<p>None yet.</p>';
    const almost = c.almost.length
      ? `<ul class="pp-list pp-need">${c.almost.map((f) => `<li>${link(f)} <span class="pp-pct">${f.percentComplete}%</span><span class="pp-needtext">${esc(c.needs.get(f.name))}</span></li>`).join('')}</ul>`
      : '<p>None right now.</p>';
    const building = c.building.length
      ? `<ul class="pp-list pp-compact">${c.building.map((f) => `<li>${link(f)} <span class="pp-pct">${f.percentComplete}%</span></li>`).join('')}</ul>`
      : '<p>None right now.</p>';
    const blockers = `<ul class="pp-blockers-list">${c.blockers.map((b) => `<li><strong>${esc(b.title)}.</strong> ${esc(b.text)}</li>`).join('')}</ul>`;
    const retired = c.retired.length ? `<p class="pp-notcounted">Not counted: ${c.retired.map((f) => esc(f.name)).join('; ')}. It is a retired button, not something we are building.</p>` : '';
    return `<article class="pp-card" id="platform-${esc(c.id)}" aria-labelledby="pp-${esc(c.id)}-title"><h3 id="pp-${esc(c.id)}-title">${esc(c.name)}</h3><p class="pp-scope">${esc(c.scope)}</p><p class="pp-sentence"><strong>${esc(c.sentence)}</strong></p>${bar}${legend}${retired}` +
      `<h4>Done (Ready)</h4>${done}<h4>Almost there: what is still needed</h4>${almost}<h4>Still being built</h4>${building}` +
      `<div class="pp-blockers"><h4>What stops us calling it 100%</h4>${blockers}</div></article>`;
  };
  const t = iso(pp.updatedEastern);
  const asOf = J.updatedEastern ? ` as of <time${iso(J.updatedEastern) ? ` datetime="${iso(J.updatedEastern)}"` : ''}>${esc(J.updatedEastern)}</time>` : '';
  return `<!--PLATFORM-PROGRESS--><section class="platform-progress" id="platform-progress" aria-labelledby="platform-progress-title"><span class="evidence-kicker">Plain-English progress · updated <time${t ? ` datetime="${t}"` : ''}>${esc(pp.updatedEastern)}</time></span>` +
    `<h2 id="platform-progress-title">${esc(pp.title)}</h2><p class="pp-lead">${esc(pp.lead)}</p><p class="pp-asof">Counted from the feature table below${asOf}.</p><div class="pp-grid">${R.platforms.map(card).join('')}</div>` +
    `<aside class="pp-explain" aria-labelledby="pp-explain-title"><h3 id="pp-explain-title">What the numbers mean</h3><p>${pp.explain.map(esc).join(' ')}</p><p>${esc(pp.note)}</p></aside>` +
    `<p class="pp-more"><a href="#platform-matrix">What works, platform by platform</a> · <a href="#features">Every feature, test record and open item</a></p></section><!--/PLATFORM-PROGRESS-->`;
}

export function platformMatrixHtml(J, { esc, featureId, iso, requireStamp }) {
  const m = J.platformMatrix;
  if (!m) return '';
  const M = PM.compute(J);
  if (M.problems.length) throw new Error('platformMatrix problems:\n  ' + M.problems.join('\n  '));
  requireStamp('platformMatrix.updatedEastern', m.updatedEastern);
  const colName = (id) => M.columns.find((c) => c.id === id).name;
  const cid = (r, c) => `pm-d-${r}-${c}`;
  const badge = (cell) => `<span class="pm-badge pm-s-${cell.state}"><span class="pm-sym" aria-hidden="true">${cell.symbol}</span> ${esc(cell.word)}</span>`;
  const head = `<tr><th scope="col" class="pm-qcol">What you want to do</th>${M.columns.map((c) => `<th scope="col" class="pm-pcol"><span class="pm-pname">${esc(c.name)}</span><span class="pm-psub">${esc(c.sub || '')}</span></th>`).join('')}</tr>`;
  const body = M.rows.map((r) => `<tr><th scope="row" class="pm-q">${esc(r.question)}</th>${M.columns.map((c) => {
    const cell = r.cells[c.id];
    return `<td class="pm-td"><a class="pm-cell pm-s-${cell.state}" href="#${cid(r.id, c.id)}" data-pm="${cid(r.id, c.id)}" aria-label="${esc(`${r.question}, ${c.name}: ${cell.word}. Details: how it was tested.`)}"><span class="pm-sym" aria-hidden="true">${cell.symbol}</span><span class="pm-word">${esc(cell.word)}</span></a></td>`;
  }).join('')}</tr>`).join('');
  const dl = (pairs) => `<dl class="pm-facts">${pairs.filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const detail = (r, c) => {
    const cell = r.cells[c.id];
    const rowsTxt = cell.rows.map((x) => `<a href="#${esc(x.id)}">${esc(x.name)}</a> (${x.percent}%${x.openIssues ? `, ${x.openIssues} open problem${x.openIssues === 1 ? '' : 's'}` : ''})`).join('; ');
    const devs = cell.devices.map((x) => `${esc(x.name)}: ${esc(x.specs)}`).join('<br>');
    const whens = [...new Set(cell.evidence.map((e) => e.when))].map((w) => `<time>${esc(w)}</time>`).join('<br>');
    const heavy = cell.evidence.length > 0 || cell.state === 'untested' || cell.state === 'na';
    if (!heavy) return '';
    const pairs = cell.evidence.length
      ? [['What we tried', esc(cell.tested)], ['Result', `${esc(cell.word)}${cell.why ? '. ' + esc(cell.why) : ''}`], ['Tested by', esc(cell.who.join('; '))], ['When', whens], ['Build', esc(cell.builds.join(', ') || 'see the dated records')], ['Devices and specs', devs], ['Does not cover', esc(cell.notCovered)], ['Still open', esc(cell.open)], ['Also noticed', esc(cell.note)], ['Feature rows', rowsTxt]]
      : [['Result', `${esc(cell.word)}. ${esc(cell.why)}`], ['Feature rows', rowsTxt]];
    return `<li class="pm-detail" id="${cid(r.id, c.id)}"><h5>${esc(c.name)} ${badge(cell)}</h5><div class="pm-body">${dl(pairs)}</div></li>`;
  };
  const details = M.rows.map((r) => `<details class="pm-rowdetail" id="pm-row-${esc(r.id)}"><summary>${esc(r.question)}: how each box was tested</summary><ul class="pm-details">${M.columns.map((c) => detail(r, c)).join('')}</ul></details>`).join('');
  const quick = `<ul class="pm-quick">${M.quick.map((qk) => `<li><strong>${esc(qk.question)}</strong> ${badge(qk.cell)} ${esc(qk.cell.why)} <a href="#${cid(qk.rowId, qk.col)}" data-pm="${cid(qk.rowId, qk.col)}">How it was tested</a></li>`).join('')}</ul>`;
  const legend = `<ul class="pm-legend" aria-label="Key to the symbols">${PM.STATE_ORDER.map((s) => `<li><span class="pm-badge pm-s-${s}"><span class="pm-sym" aria-hidden="true">${PM.STATES[s].symbol}</span> ${esc(PM.STATES[s].word)}</span> ${esc(PM.STATES[s].long)}</li>`).join('')}</ul>`;
  const c = M.counts;
  const summary = `${c.works} of the ${M.applicable} boxes that apply say Works, ${c.mostly} say Mostly works, ${c.fails} say Does not work and ${c.untested} say Not tested yet. ${c.na} boxes do not apply or are not available yet.`;
  const devBox = `<aside class="pm-devices" aria-labelledby="pm-devices-title"><h3 id="pm-devices-title">${esc(m.devicesTitle)}</h3><p>${esc(m.devicesLead)}</p><ul>${m.devices.map((x) => `<li><strong>${esc(x.name)}.</strong> ${esc(x.specs)}</li>`).join('')}</ul><p class="pm-oldphone"><strong>${esc(m.oldPhone.title)}.</strong> ${esc(m.oldPhone.text)} <em>${esc(m.oldPhone.label)}</em></p></aside>`;
  const t = iso(m.updatedEastern);
  const head2 = `<span class="evidence-kicker">Check and cross chart · section updated <time${t ? ` datetime="${t}"` : ''}>${esc(m.updatedEastern)}</time></span>`;
  return `<!--PLATFORM-MATRIX--><section class="platform-matrix" id="platform-matrix" aria-labelledby="platform-matrix-title">${head2}<h2 id="platform-matrix-title">${esc(m.title)}</h2><p class="pm-lead">${esc(m.lead)}</p>${quick}${legend}<p class="pm-summary">${esc(summary)}</p>` +
    `<p class="pm-hint">On a phone, swipe the table sideways; the first column stays in view.</p><div class="pm-wrap" role="region" aria-label="What works, by platform" tabindex="0"><table class="pm-table"><caption class="pm-caption">What works, platform by platform. Each box has a symbol and a word. Select a box for how it was tested.</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>` +
    `<p class="pm-androidnote"><strong>Android phone app.</strong> ${esc(m.columns.find((x) => x.id === 'and').note)}</p>` +
    devBox +
    `<h3 class="pm-detail-h" id="pm-how-tested">How it was tested: every box in full</h3><p>The same details as the pop-up panels, for everyone, whether or not you can hover. Open a question to read its boxes.</p>${details}` +
    `<div id="pm-pop" class="pm-pop" role="dialog" aria-label="How it was tested" tabindex="-1" hidden></div></section><!--/PLATFORM-MATRIX-->`;
}
