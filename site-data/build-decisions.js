#!/usr/bin/env node
/*
 * Builds the question list on decisions.html from decisions.json, so the JSON is the one place to edit.
 * No dependencies. Run from the website root:
 *
 *   node site-data/build-decisions.js          rewrite the generated blocks
 *   node site-data/build-decisions.js --check  exit 1 if decisions.html is out of date
 *
 * Writes only between marker comments in decisions.html:
 *   <!--DECISIONS-STAMP-->  ... <!--/DECISIONS-STAMP-->   (the "Updated" line, date AND Eastern time)
 *   <!--DECISIONS-LIST-->   ... <!--/DECISIONS-LIST-->    (one fieldset of radio options per question)
 * It also keeps the page description and JSON-LD dateModified in step with the stamp.
 *
 * Owner rule (Nick, Oct 13, 2026): every "updated" stamp shows the DATE AND TIME in Eastern.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const D = JSON.parse(fs.readFileSync(path.join(root, 'decisions.json'), 'utf8'));
const pagePath = path.join(root, 'decisions.html');
let html = fs.readFileSync(pagePath, 'utf8');
const crlf = html.includes('\r\n');
html = html.replace(/\r\n/g, '\n');

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STAMP_RE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) Eastern$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
if (!STAMP_RE.test(D.updatedEastern)) { console.error('decisions.json updatedEastern needs a date AND time, like "Oct 21, 2026, 6:30 AM Eastern"'); process.exit(1); }
if (!ISO_RE.test(D.updatedIso)) { console.error('decisions.json updatedIso needs a full ISO timestamp with the Eastern offset'); process.exit(1); }

const ids = new Set();
for (const q of D.decisions) {
  if (!/^D\d+$/.test(q.id) || ids.has(q.id)) { console.error('Bad or repeated id: ' + q.id); process.exit(1); }
  ids.add(q.id);
  const keys = new Set(q.options.map((o) => o.key));
  if (keys.size !== q.options.length) { console.error(q.id + ': repeated option letter'); process.exit(1); }
  if (q.options.filter((o) => o.suggested).length !== 1) { console.error(q.id + ': mark exactly one suggested option'); process.exit(1); }
}

const stamp = `<p class="dec-stamp" id="decisions-updated"><strong>Updated:</strong> <time datetime="${esc(D.updatedIso)}">${esc(D.updatedEastern)}</time> &middot; ${D.decisions.length} open questions</p>`;

const list = D.decisions.map((q) => {
  const opts = q.options.map((o) => {
    const id = `${q.id}-${o.key}`;
    const badge = o.suggested ? ` <span class="dec-rec">${esc(D.suggestedLabel)}</span>` : '';
    return `<label class="dec-opt" for="${id}"><input type="radio" name="${q.id}" id="${id}" value="${o.key}"><span class="dec-opt-text"><b>${o.key}.</b> ${esc(o.text)}${badge}</span></label>`;
  }).join('\n          ');
  return `      <section class="dec-q" id="${q.id.toLowerCase()}" aria-labelledby="${q.id.toLowerCase()}-title" data-decision="${q.id}">
        <p class="dec-tag"><span class="dec-id">${q.id}</span><span class="dec-area">${esc(q.area)}</span></p>
        <h2 id="${q.id.toLowerCase()}-title">${esc(q.title)}</h2>
        <p class="dec-why">${esc(q.why)}</p>
        <fieldset class="dec-opts">
          <legend>Options for ${q.id}: ${esc(q.title)}</legend>
          ${opts}
        </fieldset>
        <div class="dec-row"><button type="button" class="button dec-copy-one" data-copy="${q.id}">Copy this answer</button><span class="dec-line" id="line-${q.id}" aria-live="polite"></span></div>
      </section>`;
}).join('\n');

function replaceBlock(src, name, body) {
  const re = new RegExp(`(<!--${name}-->)[\\s\\S]*?(<!--/${name}-->)`);
  if (!re.test(src)) { console.error(`decisions.html is missing the <!--${name}--> markers`); process.exit(1); }
  return src.replace(re, (_, a, b) => `${a}${body}${b}`);
}

let out = html;
out = replaceBlock(out, 'DECISIONS-STAMP', stamp);
out = replaceBlock(out, 'DECISIONS-LIST', '\n' + list + '\n      ');
// Description + JSON-LD dateModified follow the stamp.
const desc = `Beebo decisions waiting, updated ${D.updatedEastern}: the open questions, the options and the option Claude suggests. Nothing here is a promise.`;
out = out.replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => a + esc(desc) + b);
out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, (_, a, b) => a + esc(desc) + b);
out = out.replace(/(<meta name="twitter:description" content=")[^"]*(")/, (_, a, b) => a + esc(desc) + b);
out = out.replace(/("description":")[^"]*(","inLanguage")/, (_, a, b) => a + desc.replace(/"/g, '\\"') + b);
out = out.replace(/("dateModified":")[^"]*(")/, (_, a, b) => a + D.updatedIso + b);

const final = crlf ? out.replace(/\n/g, '\r\n') : out;
if (check) {
  if (final !== fs.readFileSync(pagePath, 'utf8')) { console.error('decisions.html is out of date: run node site-data/build-decisions.js'); process.exit(1); }
  console.log('decisions.html is up to date (' + D.decisions.length + ' questions).');
} else {
  fs.writeFileSync(pagePath, final);
  console.log('decisions.html written (' + D.decisions.length + ' questions).');
}
