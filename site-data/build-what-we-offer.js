#!/usr/bin/env node
/*
 * Builds the "Everything we are and offer" content from site-data/what-we-offer.json.
 * No dependencies. Run from the website root:
 *
 *   node site-data/build-what-we-offer.js          rewrite the generated blocks
 *   node site-data/build-what-we-offer.js --check  exit 1 if any block is out of date
 *
 * Writes only between marker comments:
 *   index.html          <!-- WWO:HOME:START --> ... <!-- WWO:HOME:END -->   (collapsed home section)
 *   index.html          <!-- WWO:LD:START -->   ... <!-- WWO:LD:END -->     (JSON-LD for the home page)
 *   what-we-offer.html  <!-- WWO:PAGE:START -->  ... <!-- WWO:PAGE:END -->  (the full page)
 *   llms.txt            # WWO:LLMS:START ... # WWO:LLMS:END
 * and writes site-data/what-we-offer-summary.json (the computed counts).
 *
 * Current download versions are read from desktop-version.json, downloads/app-build.json
 * and downloads/auto-build.json so the numbers on the page cannot drift from the feeds.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SITE = 'https://www.beeboentertainment.com';
const STATUSES = ['Available', 'Beta', 'In development', 'Planned'];
const REAL = ['yes', 'partly', 'no'];
const NOT_COUNTED = ['Dropped', 'Retired', 'Paused'];

const data = JSON.parse(read('site-data/what-we-offer.json'));

/* Updated stamps must carry the DATE AND TIME in Eastern (owner rule, Oct 13, 2026). The author edits both fields in
   what-we-offer.json when the content changes; the generator only formats the stored values, so --check never fails
   just because the clock moved. A stamp with a date but no time stops the build. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function checkUpdatedStamp(meta) {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}) (AM|PM) Eastern$/.exec(String(meta.updatedEastern || ''));
  const i = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}[+-]\d{2}:\d{2}$/.exec(String(meta.updatedIso || ''));
  if (!m) throw new Error('site-data/what-we-offer.json meta.updatedEastern must be a date AND time in Eastern, like "Oct 13, 2026, 2:05 PM Eastern" (got ' + JSON.stringify(meta.updatedEastern) + ')');
  if (!i) throw new Error('site-data/what-we-offer.json meta.updatedIso must be a full ISO timestamp with the Eastern offset, like "2026-10-13T14:05:00-04:00" (got ' + JSON.stringify(meta.updatedIso) + ')');
  const h24 = (Number(m[4]) % 12) + (m[6] === 'PM' ? 12 : 0);
  const same = MONTHS.indexOf(m[1]) + 1 === Number(i[2]) && Number(m[2]) === Number(i[3]) && Number(m[3]) === Number(i[1]) && h24 === Number(i[4]) && Number(m[5]) === Number(i[5]);
  if (!same) throw new Error('site-data/what-we-offer.json meta.updatedEastern (' + meta.updatedEastern + ') and meta.updatedIso (' + meta.updatedIso + ') are not the same moment');
}
checkUpdatedStamp(data.meta);
/* a UTC timestamp (the release feed's publishedAtUtc) as a full ISO timestamp with the Eastern offset */
function easternIso(utc) {
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return undefined;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const off = Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
  const mm = String(Math.abs(off) % 60).padStart(2, '0');
  return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute + ':' + parts.second + (off < 0 ? '-' : '+') + hh + ':' + mm;
}
const winFeed = JSON.parse(read('desktop-version.json'));
const appFeed = JSON.parse(read('downloads/app-build.json'));
const autoFeed = JSON.parse(read('downloads/auto-build.json'));
const ts = JSON.parse(read('testing-status.json')); // the site's one testing-percentage system; read-only here
const tsByName = new Map(ts.features.map((f) => [f.name, f]));
// One scoring rule (site-data/progress-score.js): stop if testing-status.json disagrees with it.
const scoreProblems = require('./progress-score.js').problems(ts);
if (scoreProblems.length) throw new Error('testing-status.json disagrees with the scoring rule:\n  ' + scoreProblems.join('\n  '));
const WEIGHT_TEXT = Object.entries(ts.scoring.weights).map(([k, v]) => k + ' ' + v).join(', ');
/* Mapping from our rows to the evidence page's features, and the label rule: if both pages have a label for the same
   feature, the stricter (less Available) one is shown, so the two pages cannot disagree. */
const evMap = JSON.parse(read('site-data/evidence-map.json')).map;
const RANK = { Available: 0, Beta: 1, 'In development': 2, Planned: 3 };
const labelOf = (s) => STATUSES.find((x) => String(s).startsWith(x)) || null;
const labelDecisions = [];
for (const id of Object.keys(evMap)) if (!data.features.some((f) => f.id === id)) console.error('evidence-map.json: unknown row id ' + id);
for (const f of data.features) {
  f.ts = evMap[f.id] || null;
  f.ownStatus = f.status;
  const t = f.ts ? tsByName.get(f.ts) : null;
  const theirs = t ? labelOf(t.status) : null;
  if (theirs && theirs !== f.ownStatus) {
    const shown = RANK[theirs] > RANK[f.ownStatus] ? theirs : f.ownStatus;
    labelDecisions.push({ id: f.id, name: f.name, ours: f.ownStatus, evidencePage: t.status, shown });
    f.status = shown;
  }
}

/* ---------- validation ---------- */
const problems = [];
const areaIds = new Set(data.areas.map((a) => a.id));
const ids = new Set();
for (const f of data.features) {
  if (ids.has(f.id)) problems.push('duplicate id ' + f.id);
  ids.add(f.id);
  if (!areaIds.has(f.area)) problems.push(f.id + ': unknown area ' + f.area);
  if (!STATUSES.includes(f.status)) problems.push(f.id + ': bad status ' + f.status);
  if (!REAL.includes(f.realTest)) problems.push(f.id + ': bad realTest ' + f.realTest);
  if (f.ts && !tsByName.has(f.ts)) problems.push(f.id + ': ts name not in testing-status.json: ' + f.ts);
  if (!f.name || !f.evidence || f.evidence.length < 8) problems.push(f.id + ': missing name or evidence');
  if (f.status === 'Available' && f.realTest === 'no') problems.push(f.id + ': Available needs a real test (realTest yes or partly)');
  if (f.status === 'Planned' && f.realTest !== 'no') problems.push(f.id + ': Planned cannot be tested');
}
for (const n of data.notCounted) if (!NOT_COUNTED.includes(n.status)) problems.push('notCounted bad status ' + n.status);
for (const a of data.areas) if (!data.features.some((f) => f.area === a.id)) problems.push('empty area ' + a.id);

/* forbidden strings: nothing private may reach a public file */
const FORBIDDEN = [/10\.0\.\d/, /192\.168\./, /148\.113/, /workers\.dev/i, /@gmail/i, /\.jks/i, /password/i, /keystore/i, /C:\\/, /D:\\/, /\/c\/Beebo/i, /apps\/core/, /worker\.js/, /\.kt\b/];
const scanText = JSON.stringify(data, (k, v) => (k === 'ts' ? undefined : v)); // ts holds names from the evidence page, not our wording
for (const re of FORBIDDEN) if (re.test(scanText)) problems.push('forbidden pattern in data: ' + re);
if (problems.length) {
  console.error('what-we-offer.json problems:\n - ' + problems.join('\n - '));
  process.exit(2);
}

/* ---------- numbers ---------- */
const pct = (n, d) => (d ? Math.round((n * 100) / d) : 0);
function stats(rows) {
  const n = rows.length;
  const by = {};
  for (const s of STATUSES) by[s] = rows.filter((r) => r.status === s).length;
  const av = by.Available;
  const ab = av + by.Beta;
  // testing-evidence percentages come only from testing-status.json, once per distinct evidence-page feature
  const names = [...new Set(rows.filter((r) => r.ts).map((r) => r.ts))];
  const pcts = names.map((nm) => tsByName.get(nm).percentComplete);
  const evAvg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  return { listed: n, byStatus: by, available: av, availableOrBeta: ab, pctAvailable: pct(av, n), pctAvailableOrBeta: pct(ab, n), evidenceFeatures: names.length, evidenceAvg: evAvg };
}
const overall = stats(data.features);
const perArea = data.areas.map((a) => ({ ...a, ...stats(data.features.filter((f) => f.area === a.id)) }));
const summary = {
  updatedEastern: data.meta.updatedEastern,
  updatedIso: data.meta.updatedIso,
  versions: {
    windows: winFeed.version,
    android: appFeed.versionName + ' (build ' + appFeed.versionCode + ')',
    auto: autoFeed.versionName + ' (build ' + autoFeed.versionCode + ')',
  },
  overall,
  areas: perArea.map((a) => ({ id: a.id, name: a.name, ...pickStats(a) })),
  evidencePage: { updatedEastern: ts.updatedEastern, overallAveragePercent: ts.overallAveragePercent, featureCount: ts.featureCount, groupAveragePercent: ts.groupAveragePercent },
  labelDecisions,
  ideas: data.ideas.length,
  notCounted: data.notCounted.length,
};
function labelMatches(ours, theirs) {
  return String(theirs).toLowerCase().startsWith(ours.toLowerCase());
}
function pickStats(s) {
  const { listed, byStatus, available, availableOrBeta, pctAvailable, pctAvailableOrBeta, evidenceFeatures, evidenceAvg } = s;
  return { listed, byStatus, available, availableOrBeta, pctAvailable, pctAvailableOrBeta, evidenceFeatures, evidenceAvg };
}

/* ---------- html helpers ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stClass = (s) => 'wwo-st wwo-st-' + s.toLowerCase().replace(/\s+/g, '-');
const chip = (s) => `<span class="${stClass(s)}">${esc(s)}</span>`;
const EVID = SITE + '/release-evidence.html#features';
const evCell = (a) => (a.evidenceFeatures ? a.evidenceAvg + '% (' + a.evidenceFeatures + ' features)' : 'none matched');
function tsInfo(f) {
  if (!f.ts) return '';
  const t = tsByName.get(f.ts);
  const n = Object.values(t.checks || {}).filter(Boolean).length;
  return t.percentComplete + '% on the testing evidence page (' + n + ' of 5 checks recorded' + (t.lastTested ? ', last tested ' + t.lastTested : '') + ')' + (t.scoreNote ? '. ' + t.scoreNote : '');
}
function testedOn(f) {
  const t = f.ts ? tsByName.get(f.ts) : null;
  return t && t.testedOn ? 'Tested on: ' + t.testedOn : '';
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const updated = data.meta.updatedEastern;
const winLine = `Windows ${winFeed.version}`;
const appLine = `Android ${appFeed.versionName} (build ${appFeed.versionCode})`;
const autoLine = `Beebo Auto ${autoFeed.versionName} (build ${autoFeed.versionCode})`;

function downloadsList() {
  return `<ul class="wwo-list">
<li>${chip('Available')} <strong>Beebo for Windows ${esc(winFeed.version)}</strong> (Windows 10 and 11), published ${esc(winFeed.publishedAtEastern)}. <a href="windows.html">Windows page</a></li>
<li>${chip('Available')} <strong>Android phone and tablet app ${esc(appFeed.versionName)} (build ${esc(appFeed.versionCode)})</strong>, a test download from this site, published ${esc(appFeed.publishedAtEastern || appFeed.builtAtEastern)}. Not on Google Play. <a href="app-on-your-phone.html">Android page</a></li>
<li>${chip('Beta')} <strong>Beebo Auto ${esc(autoFeed.versionName)} (build ${esc(autoFeed.versionCode)})</strong>, a sideload test download for Android Auto, built ${esc(autoFeed.builtAtEastern)}. One first parked look in a real car on Oct 27, 2026 (a few screens and an episode with sound); an earlier build had one first check in one car on Oct 6, 2026. Not on Google Play. Use only when parked. <a href="car-companion.html">Beebo Auto page</a></li>
<li>${chip('Available')} <strong>Any web browser</strong>, served by your own Beebo computer. <a href="docs/connect-your-phone.html">How to connect</a></li>
<li>${chip('Beta')} <strong>Linux desktop</strong> (version 0.1.82) and <strong>Docker or NAS</strong> (not offered for download right now). <a href="linux.html">Linux page</a></li>
<li>${chip('In development')} <strong>Fire TV, Roku, LG, Samsung, Xbox, macOS and the native iPhone, iPad and Apple TV apps.</strong> <a href="platforms.html">All platforms</a></li>
</ul>`;
}

function percentBlock(headingTag) {
  const h = headingTag;
  const rows = perArea
    .map(
      (a) =>
        `<tr><th scope="row">${esc(a.name)}</th><td data-label="Listed">${a.listed}</td><td data-label="Available">${a.available} (${a.pctAvailable}%)</td><td data-label="Available or Beta">${a.availableOrBeta} (${a.pctAvailableOrBeta}%)</td><td data-label="Testing evidence page, average of matched features">${evCell(a)}</td></tr>`
    )
    .join('\n');
  const o = overall;
  return `<${h} id="${h === 'h2' ? 'how-complete' : 'wwo-how-complete'}">How complete are we?</${h}>
<p class="wwo-big"><strong>${o.pctAvailable}%</strong> of the ${o.listed} features we list are <em>Available</em>, <strong>${o.pctAvailableOrBeta}%</strong> are Available or Beta.</p>
${codeStatusBlock(h === 'h2' ? 'h3' : 'h4')}
<p>The testing percentages on this page come from our <a href="release-evidence.html#features">testing evidence page</a> (release-evidence.html), and its overall figure is <strong>${ts.overallAveragePercent}%</strong>: each of its ${ts.featureCount} features is scored on 5 checks (${esc(WEIGHT_TEXT)}). ${esc(ts.scoring.explanation)} By group: ${Object.entries(ts.groupAveragePercent).map(([k, v]) => esc(k) + ' ' + v + '%').join(', ')}. When a feature is on both lists, its label, percentage and Tested on note are read from that page, and if the two labels differ the stricter one is shown. The last column below averages that page's numbers for the features that appear on both lists.</p>
<p>By status: ${o.byStatus.Available} Available, ${o.byStatus.Beta} Beta, ${o.byStatus['In development']} In development, ${o.byStatus.Planned} Planned.</p>
<p class="wwo-fine"><strong>How to read this.</strong> These percentages are share-of-list counts, not a promise or an audit. Every feature we list counts once, whether it is big or small, so a long list of small Beta items can move the number as much as one big feature. Features that were dropped or retired, and ideas, are not counted. Available means it is in a current download and a person has run its main use on a real device or PC. Beta means it is in a download or switchable today but is new, tested only by automatic tests, or had real problems. In development means it is being built, switched off, not in a download, or never tried on the real equipment it needs. Planned means intended, not built. The data file is <a href="site-data/what-we-offer.json">site-data/what-we-offer.json</a>; a script calculates the label counts from it and reads the testing numbers from <a href="testing-status.json">testing-status.json</a>.</p>
<div class="wwo-tablewrap"><table class="wwo-table wwo-table-pct"><thead><tr><th scope="col">Area</th><th scope="col">Listed</th><th scope="col">Available</th><th scope="col">Available or Beta</th><th scope="col">Testing evidence page, average of matched features</th></tr></thead><tbody>
${rows}
<tr class="wwo-total"><th scope="row">All areas</th><td data-label="Listed">${o.listed}</td><td data-label="Available">${o.available} (${o.pctAvailable}%)</td><td data-label="Available or Beta">${o.availableOrBeta} (${o.pctAvailableOrBeta}%)</td><td data-label="Testing evidence page, average of matched features">${evCell(o)}</td></tr>
</tbody></table></div>`;
}

/* "Where the code is at" (first added Oct 19, 2026): read from testing-status.json codeVsHuman.overall, so it
   cannot drift from the testing evidence page. */
function codeStatus() {
  const c = ts.codeVsHuman && ts.codeVsHuman.overall;
  if (!c || !c.counts) throw new Error('testing-status.json codeVsHuman.overall is missing');
  return { code: c.codeDone, human: c.humanTestingDone, n: c.features, confirmed: c.counts['confirmed-on-real-devices'], waiting: c.counts['code-complete-needs-real-world-testing'], building: c.counts['code-still-being-finished'], updated: ts.codeVsHuman.updatedEastern };
}
function codeStatusBlock(tag) {
  const c = codeStatus();
  const meter = (label, p, cls) => `<div class="wwo-cs-meter" role="img" aria-label="${label}: ${p}%"><span class="wwo-cs-label"><strong>${label}</strong><span>${p}%</span></span><span class="wwo-cs-bar${cls}" aria-hidden="true"><i style="width:${p}%"></i></span></div>`;
  return `<div class="wwo-code-status" role="group" aria-labelledby="wwo-code-status-title"><${tag} id="wwo-code-status-title">Where the code is at</${tag}><p>The code is about <strong>${c.code}%</strong> built and passing its automated tests, and about <strong>${c.human}%</strong> of our real-device and real-world checks have passed. Most of what is left is real-world testing. ${c.n} features: ${c.confirmed} confirmed working on real devices, ${c.waiting} code complete and waiting for real-world testing, ${c.building} code still being finished.</p>${meter('Code built and passing automated tests', c.code, '')}${meter('Device and real-world checks recorded', c.human, ' wwo-cs-bar2')}<p class="wwo-fine">These percentages measure our own checklist, not that nothing can go wrong. Updated ${esc(c.updated)}. <a href="release-evidence.html#code-status">See every feature and what is left to do</a>. <a href="progress-update.html">Read our full progress report</a>.</p></div>`;
}

function whoBlock() {
  return `<p>Beebo Entertainment makes <strong>Beebo</strong>: a free, local-first media server with apps. It runs on your own Windows computer, holds the movies, shows, music, photos, audiobooks, podcasts and radio you already own, and streams them to your phone, tablet, TV, car or any web browser. Video goes straight from your computer to the viewer whenever it can. Beebo's own servers carry only small text, such as sign-in and connection set-up.</p>
<p>Beebo is <strong>made by a family man, not a data company</strong>. The code is <strong>closed source</strong> (all rights reserved). Beebo includes no movies, shows, music or channels; you bring your own files, and Live TV means your own tuner or your own playlist. We use the four labels <em>Available</em>, <em>Beta</em>, <em>In development</em> and <em>Planned</em>, and we never write a flat "100% working". Optional extras such as Beebo Relay (Beta) and BeeboVPN (In development) are listed with their label; this page does not list prices.</p>`;
}

function featureLine(f) {
  const pct = f.ts ? tsByName.get(f.ts).percentComplete : null;
  return `<li>${esc(f.name)} ${chip(f.status)}${f.ts ? (pct === 100 ? ' <span class="wwo-test">100% Ready (Nick confirmed; limits are on the full page)</span>' : ` <span class="wwo-test">${tsInfo(f).split(' on the')[0]} tested</span>`) : ''}</li>`;
}

function homeBody() {
  const areaBlocks = perArea
    .map((a) => {
      const rows = data.features.filter((f) => f.area === a.id);
      return `<h4>${esc(a.name)} <span class="wwo-count">(${a.available} of ${a.listed} Available)</span></h4>
<ul class="wwo-list wwo-cols">
${rows.map(featureLine).join('\n')}
</ul>`;
    })
    .join('\n');
  const nc = data.notCounted.map((n) => `<li>${esc(n.name)} ${esc(n.status)}. ${esc(n.note)}</li>`).join('\n');
  const working = data.workingOn.map((t) => `<li>${esc(t)}</li>`).join('\n');
  const probs = data.knownProblems.map((t) => `<li>${esc(t)}</li>`).join('\n');
  const ideas = data.ideas.map((i) => `<li>${esc(i.title)}${i.partly ? ' (partly built)' : ''}</li>`).join('\n');
  const faq = data.faq.map((q) => `<div class="wwo-q"><h4>${esc(q.q)}</h4><p>${esc(q.a)}</p></div>`).join('\n');
  const finished = data.features.filter((f) => f.status === 'Available').length;
  return `<h3>Who we are</h3>
${whoBlock()}
<h3>Current downloads</h3>
${downloadsList()}
${percentBlock('h3')}
<h3>Everything we list, by area</h3>
<p>Each line shows the label and, where the feature is on our testing evidence page, its checks-passed percentage. <a href="what-we-offer.html#features">The full page</a> says what was seen, and what was not.</p>
${areaBlocks}
<h3>Dropped and retired</h3>
<ul class="wwo-list">
${nc}
</ul>
<h3>What is finished</h3>
<p>${finished} of the ${overall.listed} listed features are Available today. They are the ones in the lists above marked Available; "finished" never means every part has been tested.</p>
<h3>What we are working on</h3>
<ul class="wwo-list">
${working}
</ul>
<h3>Problems we know about</h3>
<ul class="wwo-list">
${probs}
</ul>
<h3>Ideas (not promised)</h3>
<p>These are only ideas. They are not built, not promised and may change or never ship. Items marked partly built reuse something that already exists.</p>
<ul class="wwo-list wwo-cols">
${ideas}
</ul>
<h3>Common questions</h3>
${faq}
<p class="wwo-fine">Last updated ${esc(updated)}. Real-device results are from our own phones, PCs and TV, not a broad beta. A test that was not run is unknown, not broken.</p>`;
}

function homeBlock() {
  const o = overall;
  return `<section class="wwo-home container" id="everything" aria-labelledby="wwo-home-title">
<details class="wwo-details" id="wwo-details">
<summary><h2 class="wwo-sum-title" id="wwo-home-title">Everything we are and offer</h2><span class="wwo-sum-meta">Updated ${esc(updated)} &middot; ${o.pctAvailable}% of ${o.listed} listed features Available &middot; open to read it all</span></summary>
<div class="wwo-body">
${homeBody()}
</div>
</details>
<p class="wwo-home-link"><a href="what-we-offer.html">Read the full page: every feature, what was tested and what was not &#8599;</a></p>
</section>`;
}

function pageBlock() {
  const areaToc = perArea.map((a) => `<a href="#area-${esc(a.id)}">${esc(a.name)}</a>`).join('');
  const areaSections = perArea
    .map((a) => {
      const rows = data.features.filter((f) => f.area === a.id);
      const trs = rows
        .map(
          (f) =>
            `<tr id="f-${esc(f.id)}"><th scope="row">${esc(f.name)}</th><td data-label="Label">${chip(f.status)}</td><td data-label="What was seen">${esc(f.evidence)}${f.ts ? ' <span class="wwo-test">' + esc(tsInfo(f)) + '.</span>' + (testedOn(f) ? ' <span class="wwo-test">' + esc(testedOn(f)) + '</span>' : '') : ''}${f.ts && f.status !== f.ownStatus ? ' <span class="wwo-test">The testing evidence page and this list used different labels for this feature; the stricter one is shown.</span>' : ''}</td></tr>`
        )
        .join('\n');
      return `<section class="wwo-area" id="area-${esc(a.id)}">
<h3>${esc(a.name)}</h3>
<p>${esc(a.blurb)} ${a.available} of ${a.listed} Available.</p>
<div class="wwo-tablewrap"><table class="wwo-table"><thead><tr><th scope="col">Feature</th><th scope="col">Label</th><th scope="col">What was seen, and what was not</th></tr></thead><tbody>
${trs}
</tbody></table></div>
</section>`;
    })
    .join('\n');
  const nc = data.notCounted.map((n) => `<li>${esc(n.name)} ${esc(n.status)}. ${esc(n.note)}</li>`).join('\n');
  const working = data.workingOn.map((t) => `<li>${esc(t)}</li>`).join('\n');
  const probs = data.knownProblems.map((t) => `<li>${esc(t)}</li>`).join('\n');
  const ideas = data.ideas.map((i) => `<li><strong>${esc(i.title)}</strong>${i.partly ? ' <span class="wwo-st wwo-st-idea">partly built</span>' : ''} ${esc(i.line)}</li>`).join('\n');
  const faq = data.faq.map((q) => `<div class="wwo-q"><h3>${esc(q.q)}</h3><p>${esc(q.a)}</p></div>`).join('\n');
  const finished = data.features.filter((f) => f.status === 'Available');
  const dev = data.features.filter((f) => f.status === 'In development' || f.status === 'Planned');
  return `<section class="hero wwo-hero"><p class="eyebrow">EVERYTHING WE ARE AND OFFER</p><h1>Who we are,<br>what we offer,<br>what is not done.</h1><p class="lead">One honest page for people, search engines and AI assistants: what Beebo is, every feature with its label, what was tested on real devices and what was not, what we are working on, and ideas that are not promised. Last updated ${esc(updated)}.</p>
<p class="wwo-jump"><a href="#who">Who we are</a><a href="#downloads">Downloads</a><a href="#how-complete">How complete</a><a href="#features">Every feature</a><a href="#working">Working on</a><a href="#ideas">Ideas</a><a href="#faq">Questions</a></p></section>
<section class="wwo-sec" id="who"><h2>Who we are</h2>
${whoBlock()}</section>
<section class="wwo-sec" id="downloads"><h2>Current downloads</h2>
<p>Versions come straight from our download feeds: <a href="desktop-version.json">desktop-version.json</a>, <a href="downloads/app-build.json">downloads/app-build.json</a> and <a href="downloads/auto-build.json">downloads/auto-build.json</a>.</p>
${downloadsList()}</section>
<section class="wwo-sec" id="complete">
${percentBlock('h2')}</section>
<section class="wwo-sec" id="features"><h2>Every feature, area by area</h2>
<p>${overall.listed} features in ${perArea.length} areas. Jump to an area: </p>
<p class="wwo-jump">${areaToc}</p>
${areaSections}</section>
<section class="wwo-sec" id="notcounted"><h2>Dropped and retired</h2>
<ul class="wwo-list">
${nc}
</ul></section>
<section class="wwo-sec" id="finished"><h2>What is finished</h2>
<p>${finished.length} features are Available: ${finished.map((f) => esc(f.name)).join('; ')}.</p>
<p>"Finished" never means every part is tested. Each row above says what a person tried and what nobody has tried yet.</p></section>
<section class="wwo-sec" id="working"><h2>What we are working on</h2>
<p>${dev.length} listed features are In development or Planned, and these jobs are open right now:</p>
<ul class="wwo-list">
${working}
</ul>
<h3>Problems we know about</h3>
<ul class="wwo-list">
${probs}
</ul>
<p>More detail: <a href="known-issues.html">known issues</a>, <a href="whats-tested.html">what is new and what is tested</a>, <a href="release-evidence.html">testing evidence</a>.</p></section>
<section class="wwo-sec" id="ideas"><h2>Ideas (not promised)</h2>
<p>These are only ideas. They are not built, not promised and may change or never ship. "Partly built" means it would reuse something that already exists. Ideas are not counted in the percentages.</p>
<ul class="wwo-list">
${ideas}
</ul></section>
<section class="wwo-sec" id="faq"><h2>Common questions</h2>
${faq}</section>
<p class="wwo-fine">Last updated ${esc(updated)}. Real-device results are from our own phones, PCs and TV, not a broad beta. A test that was not run is unknown, not broken. See also <a href="llms.txt">llms.txt</a> for a plain-text summary.</p>`;
}

function ldBlock() {
  const org = { '@id': SITE + '/#organization' };
  const faqLd = data.faq.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } }));
  const graph = [
    {
      '@type': 'Organization',
      '@id': SITE + '/#organization',
      name: 'Beebo Entertainment',
      url: SITE + '/',
      logo: SITE + '/assets/beebo-badge-512.png',
      description: 'Beebo Entertainment makes Beebo, a free, local-first media server with apps for your own movies, TV, music, photos and more. Closed source. Made by a family man, not a data company.',
    },
    {
      '@type': 'WebSite',
      '@id': SITE + '/#website',
      url: SITE + '/',
      name: 'Beebo Entertainment',
      inLanguage: 'en',
      publisher: org,
    },
    {
      '@type': 'WebPage',
      '@id': SITE + '/#webpage',
      url: SITE + '/',
      name: 'Beebo Entertainment: a free, local-first media server for your own movies, TV and music',
      inLanguage: 'en',
      isPartOf: { '@id': SITE + '/#website' },
      about: org,
      dateModified: data.meta.updatedIso,
      description: 'What Beebo is, every feature with its honest status label, what was tested on real devices and what was not.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': SITE + '/#windows',
      name: 'Beebo Entertainment for Windows',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Windows 10, Windows 11',
      softwareVersion: winFeed.version,
      datePublished: easternIso(winFeed.publishedAtUtc),
      downloadUrl: winFeed.url,
      isAccessibleForFree: true,
      publisher: org,
      url: SITE + '/windows.html',
      description: 'The Beebo media server and desktop app for Windows. Holds your own library and streams it to your other screens. Beebo includes no movies or shows.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': SITE + '/#android',
      name: 'Beebo Entertainment for Android (test download)',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Android',
      softwareVersion: appFeed.versionName,
      datePublished: easternIso(appFeed.publishedAtUtc),
      downloadUrl: SITE + appFeed.url,
      isAccessibleForFree: true,
      publisher: org,
      url: SITE + '/app-on-your-phone.html',
      description: 'The Beebo phone and tablet app, a sideload test download from this website. Not on Google Play.',
    },
    { '@type': 'FAQPage', '@id': SITE + '/#faq', mainEntity: faqLd },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return `<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`;
}

function llmsBlock() {
  const o = overall;
  const lines = [];
  lines.push('## Everything we are and offer (updated ' + updated + ')');
  lines.push(
    `- Full page with every feature, its label, what was tested on real devices and what was not: ${SITE}/what-we-offer.html (data file: ${SITE}/site-data/what-we-offer.json)`,
    `- Share-of-list counts, not a promise or an audit: ${o.listed} features listed; ${o.byStatus.Available} Available (${o.pctAvailable}%), ${o.byStatus.Beta} Beta, ${o.byStatus['In development']} In development, ${o.byStatus.Planned} Planned; ${o.availableOrBeta} Available or Beta (${o.pctAvailableOrBeta}%); testing is measured on ${SITE}/release-evidence.html#features (overall average ${ts.overallAveragePercent}% across ${ts.featureCount} features; 5 checks scored ${WEIGHT_TEXT}; code built and passing automated tests about ${codeStatus().code}%; real-device and real-world checks passed about ${codeStatus().human}%; ${codeStatus().confirmed} features confirmed on real devices, ${codeStatus().waiting} code complete and waiting for real-world testing, ${codeStatus().building} code still being finished; updated ${codeStatus().updated}; details at ${SITE}/release-evidence.html#code-status).`,
    '- How the feature score works: ' + ts.scoring.explanation,
    `- Current versions (from our download feeds): Windows ${winFeed.version}; Android ${appFeed.versionName} (build ${appFeed.versionCode}), a test download, not on Google Play; Beebo Auto ${autoFeed.versionName} (build ${autoFeed.versionCode}), a test download, not on Google Play.`,
    '- Who we are: made by a family man, not a data company. Free, local-first media server. Closed source (all rights reserved). Beebo includes no movies, shows or channels.',
    '- Per area (Available of listed): ' + perArea.map((a) => `${a.name} ${a.available}/${a.listed}`).join('; ') + '.',
    '- Not counted: PlayStation (Dropped), the original separate-login hub (Retired), the old "Stream from my PC" button (Retired), and ' + data.ideas.length + ' ideas that are not promised.'
  );
  return lines.join('\n');
}

/* ---------- writers ---------- */
const targets = [];
const current = new Map(); // file -> {p, text (original), next (after edits so far)}
function replaceBetween(file, startMarker, endMarker, content) {
  const p = path.join(ROOT, file);
  if (!current.has(file)) {
    const text = fs.readFileSync(p, 'utf8');
    const entry = { p, file, text, next: text };
    current.set(file, entry);
    targets.push(entry);
  }
  const entry = current.get(file);
  const text = entry.next;
  const s = text.indexOf(startMarker);
  const e = text.indexOf(endMarker);
  if (s < 0 || e < 0 || e < s) throw new Error(file + ': markers ' + startMarker + ' / ' + endMarker + ' not found');
  const CR = String.fromCharCode(13);
  const LF = String.fromCharCode(10);
  const eol = entry.text.includes(CR + LF) ? CR + LF : LF;
  const body = content.split(CR + LF).join(LF).split(LF).join(eol);
  entry.next = text.slice(0, s + startMarker.length) + eol + body + eol + text.slice(e);
}

replaceBetween('index.html', '<!-- WWO:HOME:START -->', '<!-- WWO:HOME:END -->', homeBlock());
replaceBetween('index.html', '<!-- WWO:LD:START -->', '<!-- WWO:LD:END -->', ldBlock());
replaceBetween('what-we-offer.html', '<!-- WWO:PAGE:START -->', '<!-- WWO:PAGE:END -->', pageBlock());
replaceBetween('llms.txt', '# WWO:LLMS:START', '# WWO:LLMS:END', llmsBlock());

const summaryPath = path.join(ROOT, 'site-data', 'what-we-offer-summary.json');
const summaryText = JSON.stringify(summary, null, 2) + '\n';
targets.push({ p: summaryPath, file: 'site-data/what-we-offer-summary.json', text: fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf8') : '', next: summaryText });

/* final check of what we are about to publish */
const generated = [homeBlock(), pageBlock(), ldBlock(), llmsBlock(), summaryText].join('\n');
for (const re of FORBIDDEN) if (re.test(generated)) { console.error('forbidden pattern in generated output: ' + re); process.exit(2); }
try { JSON.parse(ldBlock().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); } catch (err) { console.error('JSON-LD does not parse: ' + err.message); process.exit(2); }

const check = process.argv.includes('--check');
let changed = 0;
for (const t of targets) {
  if (t.text.split(String.fromCharCode(13)).join('') !== t.next.split(String.fromCharCode(13)).join('')) { // line endings do not count as a change
    changed++;
    if (check) console.error('out of date: ' + t.file);
    else fs.writeFileSync(t.p, t.next, 'utf8');
  }
}
if (check) process.exit(changed ? 1 : 0);
console.log(`what-we-offer: ${overall.listed} features; ${overall.pctAvailable}% Available, ${overall.pctAvailableOrBeta}% Available or Beta; evidence page average ${ts.overallAveragePercent}%. Files updated: ${changed}.`);
