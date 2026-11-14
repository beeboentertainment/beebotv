(function () {
  'use strict';

  const checkLabels = [
    ['Built', 'Code written'],
    ['Automated tests', 'Automated checks'],
    ['Emulator', 'Emulator checks'],
    ['Real device', 'Real-device checks'],
    ['Real-world check', 'Real-world checks'],
    ['Ready to call Available', 'Owner acceptance']
  ];
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const finiteCount = value => Number.isInteger(value) && value >= 0;
  // The public evidence file also contains old technical history. The new
  // presentation deliberately selects fields and never serializes whole records.
  const publicText = value => {
    if (typeof value !== 'string') return '';
    return value
      .replace(/https?:\/\/\S+/gi, '[link omitted]')
      .replace(/[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[contact omitted]')
      .replace(/\b(?:10\.[0-9]+\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+|172\.(?:1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+)\b/g, '[address omitted]')
      .replace(/[A-Z]:\\[^\s,;]+/gi, '[path omitted]')
      .replace(/(?:Source ledger:|paths:)[^.;]*(?:[.;]|$)/gi, '[internal references omitted].')
      .replace(/\b(?:main|commit|SHA|source(?: commit)?)\s+[a-f0-9]{7,64}\b/gi, '[source identifier omitted]')
      .replace(/[a-f0-9]{40,64}/gi, '[identifier omitted]')
      .replace(/\b[a-f0-9]{7,64}\b/gi, '[identifier omitted]')
      .replace(/(?:\.claude[^\s,;]*|docs\/ops\/[^\s,;]+|private evidence(?: archive)?|sourceCommentIds)/gi, '[internal reference omitted]')
      .replace(/\bPuck\b|kid-safe/gi, '[wording omitted]')
      .replace(/100\s*%/g, 'full completion')
      .replace(/\$\s*[0-9][0-9,.]*/g, '[amount omitted]')
      .replace(/\b2099\b/g, '[date omitted]')
      .replace(/Nick[’']s own decision in chat/gi, 'Owner-recorded check')
      .trim();
  };
  const detailText = value => publicText(value)
    .replace(/Decide the Relay price\./gi, 'Beebo Relay is not available to buy.')
    .replace(/Note for Nick: the connection-cost table shows prices in the desktop app in every language\./gi, '')
    .replace(/\b(?:keep|retain)\s*\d+%?[;:,]?/gi, '')
    .replace(/add exact bounded evidence, not new whole-row device\/real-world ticks\.?/gi, '')
    .replace(/If Nick wants the whole row at full completion he can say so\.?/gi, '')
    .replace(/(?:The )?(?:existing|historical|current)\s+\d+%? cap (?:stays|remains|is unchanged)\.?/gi, '')
    .replace(/One100-case batch across12suites/g, 'One 100-case batch across 12 suites')
    .replace(/\s+([,.;])/g, '$1').replace(/\s+/g, ' ').trim();
  const featureId = name => 'evidence-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

  function validate(data, runs) {
    const publicLabel = value => typeof value === 'string' && !!publicText(value) && publicText(value) === value.trim();
    if (!data || !Array.isArray(data.features) || !data.features.length || !publicLabel(data.updatedEastern) || !runs || !Array.isArray(runs.unitTests) || !Array.isArray(runs.tallies)) throw Error('Evidence format unavailable');
    const names = new Set();
    for (const feature of data.features) {
      if (!publicLabel(feature.name) || !publicLabel(feature.group) || names.has(feature.name) || !feature.checks || (feature.openIssues !== undefined && !finiteCount(feature.openIssues))) throw Error('Feature record unavailable');
      names.add(feature.name);
    }
    return data;
  }

  function runFor(feature, date) {
    const records = [...(feature.deviceTests || []), ...(feature.ownerTests || [])];
    return records.find(record => record.date === date)
      || records.find(record => typeof date === 'string' && typeof record.date === 'string' && record.date.startsWith(date + ' ('));
  }

  function recordDetail(record) {
    if (!record) return '';
    return [record.evidence, record.did, record.notes].filter(value => typeof value === 'string' && value.trim()).map(detailText).filter(Boolean).join(' ');
  }

  function recordDay(record) {
    const match = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}), (\d{4})/.exec(record.date || '');
    return match ? Date.UTC(Number(match[3]), ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1]), Number(match[2])) : 0;
  }

  function knownLimits(feature) {
    if (feature.name === 'Beebo Auto (Android Auto)') return '<h4>Known limits and remaining checks</h4><p>Beebo Auto had limited car checks on older builds on Oct 6 and Oct 27, 2026. The current build (1.22) has not been tested in a real car. Car controls, sound, head-unit behavior and driving conditions remain unverified on this build.</p>';
    const current = detailText((feature.leftToReach100 || '').split(/Earlier(?:\s+dated)?\s+record\s*\(\s*kept\s*\)\s*:/i)[0]);
    const remaining = [...new Set((feature.roadTo100?.remaining || []).map(item => detailText(item.text)).filter(Boolean))];
    return current || remaining.length ? `<h4>Known limits and remaining checks</h4>${current ? `<p>${esc(current)}</p>` : ''}${remaining.length ? `<ul>${remaining.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : ''}` : '<h4>Known limits and remaining checks</h4><p>No further description is recorded in these fields. This is not evidence that every path works.</p>';
  }

  function recordMarkup(record, dateKey = 'date') {
    if (!record) return '';
    const fields = [
      ['Record date', publicText(record[dateKey])],
      ['Build', publicText(record.build)],
      ['Device', publicText(record.device)],
      ['Recorded outcome', publicText(record.result)]
    ].filter(([, value]) => value);
    return `<dl class="evidence-record">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  }

  function scopeText(data) {
    const description = data.hero?.recordName || '';
    const windows = /\bWindows ([0-9]+(?:\.[0-9]+)+)/i.exec(description);
    const android = /\bAndroid ([0-9]+(?:\.[0-9]+)+)(?: \(([0-9]+)\))?/i.exec(description);
    const versions = windows && android ? `The evidence audit names Windows ${windows[1]} and Android ${android[1]}${android[2] ? ` (build ${android[2]})` : ''}. ` : '';
    return versions + 'Compare those records with the current downloads: newer releases need their own tests. Individual records also include older and private test builds. A new version does not turn those records into new tests.';
  }

  function exampleMarkup(data, runs) {
    const examples = [
      ['Opening the app and the five tabs', 'Opening screens', 'emulator'],
      ['Playing films, seeking, picture-in-picture', 'A playback failure', 'aiDevice'],
      ['Beebo Auto (Android Auto)', 'Beebo Auto settings', 'emulator']
    ];
    return examples.map(([name, title, kind]) => {
      const tally = runs.tallies.find(run => run.feature === name && run.kind === kind);
      const feature = data.features.find(item => item.name === name);
      if (!tally || !feature || !finiteCount(tally.passed) || !finiteCount(tally.total) || tally.passed > tally.total) return '';
      const record = runFor(feature, tally.recordDate);
      if (!record) return '';
      const summary = recordDetail(record);
      if (!summary) return '';
      return `<article class="panel"><p class="eyebrow">${kind === 'emulator' ? 'Emulator record' : 'Real-phone record'}</p><h3>${esc(title)}</h3><p class="evidence-example-count"><strong>${tally.passed}<span> / ${tally.total}</span></strong> checks recorded as passed</p><p class="small">${esc(tally.recordDate)}</p><p>${esc(summary)}</p><p class="small">${esc(publicText(record.build))} · ${esc(publicText(record.device))}</p><a href="#${featureId(name)}">See this feature’s record <span aria-hidden="true">↗</span></a></article>`;
    }).join('');
  }

  function featureMarkup(feature, data, runs) {
    const issues = feature.openIssues || 0;
    const latest = feature.latestCheck;
    const record = latest ? runFor(feature, latest.at) : undefined;
    const summary = recordDetail(record);
    const unitRuns = runs.unitTests.filter(run => run.feature === feature.name && finiteCount(run.passed) && finiteCount(run.total) && run.passed <= run.total);
    const testCounts = unitRuns.map(run => `<div class="evidence-source-run"><h4>Automated source checks</h4><p><strong>${run.passed} of ${run.total}</strong> checks passed${finiteCount(run.skipped) && run.skipped ? `; ${run.skipped} skipped checks recorded` : ''}. ${esc(publicText(run.date))}.</p>${detailText(run.how) ? `<p>${esc(detailText(run.how))}</p>` : '<p>This is a code-test record. It does not establish a result in an installed app.</p>'}</div>`).join('');
    const recent = latest && publicText(latest.at) ? `<h4>Recorded summary</h4><p class="small">This is the source file’s summary entry. Other dated checks below may be later; a pass applies only to the action described.</p>${recordMarkup(record ? {...latest, ...record, at: record.date} : latest, 'at')}${summary ? `<p>${esc(summary)}</p>` : '<p>The summary has no matching detailed test description. It does not establish which actions passed; no broader result is claimed.</p>'}` : '<h4>Recorded summary</h4><p>No compact test summary is available here. Read the dated checks and known limits below.</p>';
    const additional = [...(feature.deviceTests || []), ...(feature.ownerTests || [])].filter(item => item !== record).sort((a,b) => recordDay(b) - recordDay(a)).slice(0,3);
    const history = additional.length ? `<h4>Other dated checks</h4><p class="small">Up to three additional records, ordered by calendar day. These can describe different actions, devices and builds. Internal references are omitted; test limits are retained.</p>${additional.map(item => `<div class="evidence-source-run">${recordMarkup(item)}<p>${esc(recordDetail(item) || 'No action description was recorded. No broader result is claimed.')}</p></div>`).join('')}` : '';
    return `<details class="evidence-feature" id="${featureId(feature.name)}" data-evidence-name="${esc(feature.name.toLowerCase())}" data-evidence-group="${esc(feature.group)}"><summary><span class="evidence-feature-name">${esc(feature.name)}</span><span class="evidence-issue-count">${issues ? `${issues} open issue${issues === 1 ? '' : 's'}` : 'No open issue listed'}</span></summary><div class="evidence-body"><p class="small">Record updated ${esc(publicText(feature.changedEastern) || data.updatedEastern)}. A record update is not a new test.</p>${recent}${knownLimits(feature)}${history}<h4>Recorded checklist</h4><dl class="evidence-checks">${checkLabels.map(([key, label]) => `<div><dt>${label}</dt><dd>${feature.checks[key] === true ? '<span aria-hidden="true">✓ </span>Recorded' : 'Not recorded'}</dd></div>`).join('')}</dl><p class="small">These checks can come from different dates and builds. Later failures remain open even when an earlier check was recorded. Owner acceptance applies only to its original scope.</p>${testCounts}</div></details>`;
  }

  function render(data, runs) {
    validate(data, runs);
    const issues = data.features.reduce((total, feature) => total + (feature.openIssues || 0), 0);
    const affected = data.features.filter(feature => feature.openIssues > 0).length;
    const groups = [...new Set(data.features.map(feature => feature.group))];
    const examples = exampleMarkup(data, runs);
    const content = `<div class="metric-grid evidence-metrics"><div class="panel"><strong class="metric">${data.features.length}</strong><span>feature records</span></div><div class="panel"><strong class="metric">${affected}</strong><span>features with an open issue</span></div><div class="panel"><strong class="metric">${issues}</strong><span>open issue entries</span></div></div><p class="small">Evidence updated <strong>${esc(data.updatedEastern)}</strong>. Counts describe the recorded checklist; an issue can affect more than one feature.</p>
${examples ? `<section class="section" aria-labelledby="examples-title"><div class="section-heading"><p class="eyebrow">A closer look</p><h2 id="examples-title">A pass needs context.<br>So does a failure.</h2><p>Three recorded examples, with the device, date and limits kept alongside the result. “Not run” checks are not failures or passes.</p></div><div class="evidence-examples">${examples}</div></section>` : ''}
<section class="section" aria-labelledby="records-title"><div class="section-heading"><p class="eyebrow">The full picture</p><h2 id="records-title">Find a feature.</h2><p>Open any record to see its checks and known issues. A checkmark is evidence for a particular test, never a promise that every situation works.</p></div><div class="evidence-tools" hidden><div><label for="evidence-search">Search features</label><input class="search-field" id="evidence-search" type="search" placeholder="Try subtitles, Campsite or music" autocomplete="off"></div><div><label for="evidence-group">Show platform</label><select id="evidence-group"><option value="">All platforms</option>${groups.map(group => `<option>${esc(group)}</option>`).join('')}</select></div></div><p class="evidence-count" id="evidence-count" role="status" aria-live="polite">Showing all ${data.features.length} feature records.</p><div class="evidence-list">${groups.map(group => `<section class="evidence-group" data-group="${esc(group)}"><h3>${esc(group)}</h3>${data.features.filter(feature => feature.group === group).map(feature => featureMarkup(feature, data, runs)).join('')}</section>`).join('')}</div><p id="evidence-empty" class="note" hidden>No matching features. Try a shorter search or choose all platforms.</p></section>`;
    return content;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { render, validate, featureId, scopeText };
    return;
  }
  if (typeof document === 'undefined') return;

  const container = document.querySelector('#testing-data');
  if (!container) return;
  const loadNote = document.querySelector('#evidence-load-note');

  function applyFilters() {
    const input = container.querySelector('#evidence-search');
    const groupInput = container.querySelector('#evidence-group');
    const query = (input?.value || '').trim().toLowerCase();
    const selected = groupInput?.value || '';
    const features = [...container.querySelectorAll('.evidence-feature')];
    let visible = 0;
    for (const feature of features) {
      const matches = (!selected || feature.dataset.evidenceGroup === selected) && (!query || feature.dataset.evidenceName.includes(query) || feature.textContent.toLowerCase().includes(query));
      feature.hidden = !matches;
      if (matches) visible += 1;
    }
    for (const group of container.querySelectorAll('.evidence-group')) group.hidden = ![...group.querySelectorAll('.evidence-feature')].some(feature => !feature.hidden);
    container.querySelector('#evidence-count').textContent = `${visible} of ${features.length} feature records shown${query ? ` for “${input.value.trim()}”` : ''}.`;
    container.querySelector('#evidence-empty').hidden = visible !== 0;
  }

  function openLinkedRecord() {
    if (!location.hash.startsWith('#evidence-')) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target?.classList.contains('evidence-feature')) return;
    container.querySelector('#evidence-search').value = '';
    container.querySelector('#evidence-group').value = '';
    applyFilters();
    target.open = true;
    target.scrollIntoView({ block: 'start' });
  }

  function activate() {
    container.querySelector('.evidence-tools').hidden = false;
    container.querySelector('#evidence-search').addEventListener('input', applyFilters);
    container.querySelector('#evidence-group').addEventListener('change', applyFilters);
  }
  activate();
  openLinkedRecord();
  window.addEventListener('hashchange', openLinkedRecord);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  Promise.all(['/testing-status.json', '/site-data/ai-tested.json'].map(async url => {
    const response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw Error('Evidence unavailable');
    return response.json();
  })).then(([data, runs]) => {
    const query = container.querySelector('#evidence-search').value;
    const selected = container.querySelector('#evidence-group').value;
    const opened = [...container.querySelectorAll('.evidence-feature[open]')].map(feature => feature.id);
    const focusedId = container.contains(document.activeElement) ? document.activeElement.id : '';
    const focusedSummary = container.contains(document.activeElement) && document.activeElement.tagName === 'SUMMARY' ? document.activeElement.closest('.evidence-feature')?.id : '';
    const updated = render(data, runs);
    container.innerHTML = updated;
    activate();
    container.querySelector('#evidence-search').value = query;
    if ([...container.querySelector('#evidence-group').options].some(option => option.value === selected)) container.querySelector('#evidence-group').value = selected;
    for (const id of opened) {
      const feature = document.getElementById(id);
      if (feature) feature.open = true;
    }
    applyFilters();
    if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
    else if (focusedSummary) document.getElementById(focusedSummary)?.querySelector('summary').focus({ preventScroll: true });
    document.querySelector('#evidence-scope-copy').textContent = scopeText(data);
    loadNote.textContent = `Showing the current published evidence file, updated ${data.updatedEastern}.`;
  }).catch(() => {
    loadNote.textContent = 'The live evidence file could not be refreshed. The saved, dated snapshot below is still available.';
  }).finally(() => clearTimeout(timeout));
})();
