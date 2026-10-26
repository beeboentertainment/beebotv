#!/usr/bin/env node
// Static, reviewable shell generation. No runtime HTML injection or feed writes.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const base = '489b21d2dd9769332d0f80590a2809583b9191b4';
export const revision = '20261026-shell2';
export function htmlPages(dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.name === '.git' ? [] :
    e.isDirectory() ? htmlPages(join(dir, e.name)) : e.name.endsWith('.html') ? [relative(root, join(dir, e.name)).split(sep).join('/')] : []).sort();
}
export function exclusion(file) {
  if (['release-evidence.html', 'whats-tested.html'].includes(file)) return 'Reserved for WEBSITE-EVIDENCE2; coordinate shell application after its content work.';
  if (file.startsWith('_scratch/')) return 'Template fragment, not a public page.';
  if (file.startsWith('domain-sites/')) return 'Separate-domain source, outside www.beeboentertainment.com.';
  if (/^play-games\/[^/]+\/index\.html$/.test(file)) return 'Standalone game canvas; adding site chrome changes the play viewport and needs a separate layout review.';
  if (file.startsWith('design-lab/')) return 'Standalone desktop layout prototype; its application frame needs a separate layout review.';
  return '';
}
export const marker = (name, html) => `<!-- BEEBO-SHELL-${name}:START -->\n${html}\n<!-- BEEBO-SHELL-${name}:END -->`;
export const nav = [
  ['/index.html#setup', 'How it works'], ['/what-beebo-can-do.html', 'Features'],
  ['/next-features.html', 'Feature status'], ['/what-we-offer.html', 'Everything we offer'],
  ['/index.html#camp', 'Campsite Mode'], ['/subscribe.html', 'Pricing'], ['/help.html', 'Support'],
];
const link = ([href, label], file = '') => `<a href="${href}"${href === '/' + file && !href.includes('#') ? ' aria-current="page"' : ''}>${label}</a>`;
export const banner = marker('BANNER', '<aside class="beebo-tester-banner" id="beebo-shell-banner" aria-label="Help test Beebo" data-beebo-testers-banner><div class="beebo-tester-inner"><p class="beebo-tester-message"><strong>Beebo needs testers.</strong><span>Try Beebo on your devices. Help shape the launch.</span></p><div class="beebo-tester-goal"><span>Android testing requirements can vary by account and eligibility. Join the community to coordinate.</span><div class="beebo-tester-actions"><a class="beebo-tester-primary" href="/become-a-tester.html">Become a tester <span aria-hidden="true">↗</span></a><a href="https://discord.gg/P64HjkNjB4" target="_blank" rel="noopener noreferrer">Join tester chat <span aria-hidden="true">↗</span></a></div></div></div></aside>');
export function header(file) {
  const links = nav.map(n => link(n, file)).join('');
  return marker('HEADER', `<header class="beebo-site-header" id="top"><div class="beebo-header-row"><a class="beebo-header-brand" href="/index.html" aria-label="Beebo home"${file === 'index.html' ? ' aria-current="page"' : ''}><img class="beebo-brand-icon" src="/assets/beebo-desktop.ico" width="44" height="44" alt=""><span>Beebo<small>ENTERTAINMENT &amp; CONNECTION</small></span></a><nav class="beebo-header-nav" aria-label="Main navigation">${links}</nav><details class="beebo-header-menu"><summary>Menu <span aria-hidden="true">+</span></summary><nav aria-label="Mobile navigation"><a class="beebo-header-menu-download" href="/index.html#download">Download Beebo <span aria-hidden="true">↗</span></a>${links}</nav></details><a class="beebo-header-download" href="/index.html#download">Download Beebo <span aria-hidden="true">↗</span></a></div></header>`);
}
const groups = [
  ['Explore Beebo', 'Make yourself at home', [
    ['/about-beebo.html', 'About Beebo'], ['/platforms.html', 'Beebo on your devices'],
    ['/home-theater.html', 'Home theater and big screen'], ['/phone-speakers.html', 'Phone speakers (Beta)'],
    ['/subscribe.html', 'Pricing'], ['/become-a-tester.html', 'Become a tester'],
    ['/beebo-relay.html', 'Beebo Relay'], ['/beebovpn.html', 'BeeboVPN'], ['https://beebo.space/', 'Beebo community'],
  ]],
  ['Beebo support', 'A little helping hand', [
    ['/help.html', 'Help &amp; guides'], ['/docs.html', 'Docs'], ['/visual-tour.html', 'Illustrated app tour'],
    ['/server-setup.html', 'Windows setup'], ['/updates.html', 'Release notes'],
    ['/next-features.html', 'Feature status'], ['/what-we-offer.html', 'Everything we offer'],
  ]],
  ['Testing resources', 'Testing &amp; feedback', [
    ['/release-evidence.html', 'Testing evidence'], ['/whats-tested.html', 'What’s tested'],
    ['/tester-checklist.html', 'Tester checklist'], ['/tester-results.html', 'Tester results'], ['/known-issues.html', 'Known issues'],
  ]],
];
const footerTemplate = marker('FOOTER', `<footer class="beebo-shell-footer" id="beebo-shell-footer"><div class="beebo-shell-footer-inner"><section class="beebo-release-status" aria-label="Current Beebo releases"><div><span class="beebo-release-platform">WINDOWS</span><strong data-beebo-release-version="windows">Release details</strong><time data-beebo-release-date="windows">See release notes for published details</time></div><div><span class="beebo-release-platform">ANDROID</span><strong data-beebo-release-version="android">Release details</strong><time data-beebo-release-date="android">See release notes for published details</time></div><a href="/updates.html">What’s new ↗</a></section><div class="beebo-shell-footer-grid"><div><a class="beebo-shell-footer-brand" href="/index.html"><img src="/assets/beebo-desktop.ico" width="44" height="44" alt=""><span>Beebo<small>ENTERTAINMENT &amp; CONNECTION</small></span></a><p>Your movies. Your people.<br>Your little world.</p></div>${groups.map(([label, title, links]) => `<nav aria-label="${label}"><strong>${title}</strong>${links.map(n => link(n)).join('')}</nav>`).join('')}</div><div class="beebo-shell-footer-bottom"><span>© 2026 Beebo Entertainment</span><nav aria-label="Policies">${[['/movie-privacy.html','Privacy'],['/terms.html','Terms'],['/driving-safety.html','Driving safety'],['/delete-account.html','Delete account']].map(n => link(n)).join('')}</nav><a href="#top">Back to top ↑</a></div></div></footer>`);

// Feed-derived static fallback also works without JavaScript. polish.js refreshes it.
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function releaseFallback(platform) {
  const data = JSON.parse(readFileSync(join(root, platform === 'windows' ? 'desktop-version.json' : 'downloads/app-build.json'), 'utf8'));
  const version = platform === 'windows' ? data.version : (data.versionName || data.version) + (data.versionCode ? ' (build ' + data.versionCode + ')' : '');
  const stamp = data.publishedAtUtc || (platform === 'windows' ? data.releasedAt || data.publishedAt : data.builtAtUtc);
  const date = new Date(stamp);
  const valid = stamp && Number.isFinite(date.getTime());
  const format = new Intl.DateTimeFormat('en-US', {timeZone:'America/Toronto',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});
  const text = valid ? (platform === 'windows' || data.publishedAtUtc ? 'Released ' : 'Built ') + format.format(date) + ' Eastern' : 'Release time unavailable';
  return '<strong data-beebo-release-version="' + platform + '">' + escape(version) + '</strong><time data-beebo-release-date="' + platform + '"' + (valid ? ' datetime="' + date.toISOString() + '"' : '') + '>' + text + '</time>';
}
export const footer = footerTemplate.replace(/<strong data-beebo-release-version="(windows|android)">[\s\S]*?<\/time>/g, (_, platform) => releaseFallback(platform));

// These overrides live inside the generated shell asset block because this lane
// owns shell markup and links, not the site's page/body stylesheet files.
// Every selector is confined to the banner, header or footer.
const shellOverrides = `
#top.beebo-site-header{background:#07111c;border-bottom-color:#2b4158;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
#top.beebo-site-header .beebo-header-row{min-height:76px;padding-block:0}
#top.beebo-site-header a{color:#f4f0e8}
#top.beebo-site-header .beebo-header-nav a{color:#b8c5d0}
#top.beebo-site-header a:hover,#top.beebo-site-header a[aria-current="page"]{color:#e8ca8f}
#top.beebo-site-header .beebo-header-download{color:#d9b66f;border-bottom-color:#d9b66f}
#top.beebo-site-header summary{border-color:#2b4158;border-radius:8px!important}
#top.beebo-site-header .beebo-header-menu nav{background:#101f31;border-color:#2b4158;top:calc(100% + 10px)}
#top.beebo-site-header :is(a,summary):focus-visible{outline-color:#75b7ff}
#beebo-shell-banner{background:#d9b66f!important;color:#17232f!important;border-bottom-color:#17232f!important}
#beebo-shell-banner .beebo-tester-inner{padding:10px 48px!important}
#beebo-shell-banner .beebo-tester-message{display:flex;align-items:baseline;gap:8px;color:#17232f!important}
#beebo-shell-banner .beebo-tester-message strong,#beebo-shell-banner .beebo-tester-goal{color:#17232f!important}
#beebo-shell-banner a{border-color:#17232f!important;color:#17232f!important;border-radius:999px!important}
#beebo-shell-banner a.beebo-tester-primary{background:#17232f!important;color:#d9b66f!important}
@media(max-width:1000px){#beebo-shell-banner .beebo-tester-inner{padding:10px 24px!important}}
@media(max-width:760px){#beebo-shell-banner .beebo-tester-message{flex-direction:column;gap:2px}#beebo-shell-banner .beebo-tester-inner{padding:12px 18px!important}}
@media(max-width:580px){#top.beebo-site-header .beebo-header-row{display:flex;min-height:72px;padding-block:14px;grid-template-columns:none}#top.beebo-site-header .beebo-header-download{display:none}#top.beebo-site-header .beebo-header-menu{margin-left:auto}#top.beebo-site-header .beebo-header-menu-download{display:flex!important;justify-content:center;margin:0 0 8px;padding:12px!important;background:#d9b66f;color:#17232f!important;font-weight:700;border-radius:8px!important}}
`;
const shellStyles = `
body .beebo-site-header,body .beebo-site-header *{box-sizing:border-box}
body .beebo-site-header{float:none;inset:auto;text-align:left;letter-spacing:normal}
body .beebo-site-header .beebo-header-row{padding-block:0}
body .beebo-site-header nav,body .beebo-site-header details{max-width:none;border-radius:0;float:none;letter-spacing:normal}
body .beebo-site-header nav{background:none;border:0;padding:0;box-shadow:none}
body .beebo-site-header .beebo-header-menu{padding:0;border:0;background:none;box-shadow:none}
body .beebo-site-header .beebo-header-menu summary{margin:0;background:none}
body .beebo-site-header .beebo-header-menu nav{background:#182123;padding:10px;border:1px solid #536365;box-shadow:0 12px 25px #0005}
body .beebo-site-header a[aria-current="page"]{color:#e8cd99;text-decoration:underline;text-underline-offset:6px}
#beebo-shell-footer,#beebo-shell-footer *{box-sizing:border-box}
#beebo-shell-footer{display:block;position:relative;width:100%;max-width:none;margin:0;padding:0;border:0;border-top:1px solid #354143;border-radius:0;background:#0c1214;color:#f3f2ec;font:14px/1.6 Arial,Helvetica,sans-serif;text-align:left;letter-spacing:normal;box-shadow:none;clear:both}
#beebo-shell-footer .beebo-shell-footer-inner{width:min(1280px,calc(100% - 64px));margin:0 auto;padding:36px 0 24px}
#beebo-shell-footer a{color:#b7bdb9;font:inherit;text-decoration:none;overflow-wrap:anywhere}
#beebo-shell-footer a:hover{color:#e8cd99;text-decoration:underline}
#beebo-shell-footer a:focus-visible{outline:3px solid #e8cd99;outline-offset:4px}
#beebo-shell-footer .beebo-shell-footer-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:36px;padding:36px 0}
#beebo-shell-footer nav{display:flex;flex-direction:column;align-items:flex-start;gap:10px;position:static;inset:auto;width:auto;margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none}
#beebo-shell-footer nav strong{display:block;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:#d5b779;margin:0 0 8px;letter-spacing:0}
#beebo-shell-footer nav a{display:block;font-size:12px;line-height:1.6;padding:0;margin:0;border:0;border-radius:0;background:none}
#beebo-shell-footer .beebo-shell-footer-brand{display:inline-flex;align-items:center;gap:12px;font-size:30px;line-height:1;color:#f3f2ec;font-weight:700;letter-spacing:-1px}
#beebo-shell-footer .beebo-shell-footer-brand img{width:44px;height:44px;max-width:44px;object-fit:contain;border:0;border-radius:0}
#beebo-shell-footer .beebo-shell-footer-brand small{display:block;font:400 7px/1.5 Arial,Helvetica,sans-serif;color:#b7bdb9;letter-spacing:1px;margin-top:8px}
#beebo-shell-footer p{font:13px/1.7 Arial,Helvetica,sans-serif;color:#b7bdb9;margin:24px 0 0;max-width:none}
#beebo-shell-footer .beebo-shell-footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid #354143;padding-top:22px;padding-right:80px;font-size:11px;color:#b7bdb9}
#beebo-shell-footer .beebo-shell-footer-bottom nav{flex-direction:row;flex-wrap:wrap;gap:12px 20px}
#beebo-shell-footer .beebo-release-status{display:grid;grid-template-columns:1fr 1fr auto;align-items:center;gap:24px;width:100%;max-width:none;margin:0;padding:0 0 28px;border:0;border-bottom:1px solid #354143;border-radius:0;background:none;color:#f3f2ec;box-shadow:none}
#beebo-shell-footer .beebo-release-status>div{padding:0;border:0;background:none}
#beebo-shell-footer .beebo-release-platform{display:block;font:700 10px/1.5 Arial,Helvetica,sans-serif;letter-spacing:1.4px;color:#d5b779}
#beebo-shell-footer .beebo-release-status strong{display:block;font:600 18px/1.5 Arial,Helvetica,sans-serif;margin:5px 0}
#beebo-shell-footer .beebo-release-status time{display:block;font:11px/1.6 Arial,Helvetica,sans-serif;color:#b7bdb9;margin:0}
#beebo-shell-footer .beebo-release-status>a{color:#d5b779;font-size:12px;white-space:normal}
@media(max-width:1200px){body .beebo-site-header .beebo-header-nav{display:none}body .beebo-site-header .beebo-header-menu{display:block}}
@media(max-width:760px){#beebo-shell-footer .beebo-shell-footer-inner{width:calc(100% - 32px)}#beebo-shell-footer .beebo-shell-footer-grid{grid-template-columns:1fr 1fr;gap:30px 24px}#beebo-shell-footer .beebo-shell-footer-grid>div{grid-column:1/-1}#beebo-shell-footer .beebo-release-status{grid-template-columns:1fr;gap:20px}#beebo-shell-footer .beebo-shell-footer-bottom{flex-direction:column;align-items:flex-start;padding-right:0}}
@media(max-width:580px){body .beebo-site-header .beebo-header-row{padding-block:14px}body .beebo-site-header .beebo-header-menu{margin:0}}
@media(max-width:420px){#beebo-shell-footer .beebo-shell-footer-grid{grid-template-columns:1fr}}
`;
export const assets = marker('ASSETS', `<link rel="stylesheet" href="/beebo-testers.css?v=${revision}">\n<link rel="stylesheet" href="/website-shell.css?v=${revision}">\n<script src="/website-shell.js?v=${revision}" defer></script>\n<script src="/polish.js?v=${revision}" defer></script>\n<style data-beebo-shell-styles>${shellStyles}${shellOverrides}</style>`);
export const blockRE = name => new RegExp(`<!-- BEEBO-SHELL-${name}:START -->[\\s\\S]*?<!-- BEEBO-SHELL-${name}:END -->`, 'g');
export function removeOldShell(source, file) {
  return source.replace(/[\t ]*<aside\b[^>]*class="beebo-tester-banner"[^>]*>[\s\S]*?<\/aside>/g, '')
    .replace(/[\t ]*<header\b[^>]*class="beebo-site-header"[^>]*>[\s\S]*?<\/header>/g, '')
    .replace(file.startsWith('campsite-beta-tests/') ? /<header class="top">[\s\S]*?<\/header>/g : /$^/, '')
    .replace(/[\t ]*<footer\b[\s\S]*?<\/footer>/g, '');
}
const sharedTag = /[\t ]*<link\b[^>]*href=["'](?:\/|\.\.\/|\.\/)?(?:beebo-testers|website-shell)\.css(?:\?[^"']*)?["'][^>]*>|[\t ]*<script\b[^>]*src=["'](?:\/|\.\.\/|\.\/)?(?:website-shell|polish)\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/g;
export function render(source, file) {
  const crlf = (source.match(/\r\n/g) || []).length > (source.match(/\n/g) || []).length / 2;
  const finish = text => crlf ? text.replace(/\n/g, '\r\n') : text;
  let s = source.replace(/\r\n/g, '\n');
  if (['BANNER', 'HEADER', 'FOOTER', 'ASSETS'].every(name => blockRE(name).test(s))) {
    for (const [name, value] of [['BANNER', banner], ['HEADER', header(file)], ['FOOTER', footer], ['ASSETS', assets]]) s = s.replace(blockRE(name), () => value);
    return finish(s);
  }
  for (const name of ['BANNER', 'HEADER', 'FOOTER', 'ASSETS']) s = s.replace(blockRE(name), '');
  s = removeOldShell(s, file).replace(sharedTag, '');
  // One cache key for shared body styles too; their contents and order stay intact.
  s = s.replace(/(<link\b[^>]*href=["'](?:\/|\.\.\/|\.\/)?(?:site|polish|refresh|example|corporate-home|corporate-supporting-dark|aurora-editorial|rectangular-buttons)\.css)(?:\?[^"']*)?(["'])/g, `$1?v=${revision}$2`);
  s = /<\/head>/i.test(s) ? s.replace(/<\/head>/i, assets + '\n</head>') : s.replace(/<body\b/i, assets + '\n<body');
  s = s.replace(/(<body\b[^>]*>)/i, '$1\n' + banner + '\n' + header(file));
  s = s.replace(/<\/body>/i, footer + '\n</body>');
  // Avoid accumulating whitespace at insertion points on subsequent runs.
  return finish(s.replace(/\n(?:[\t ]*\n)+(?=<!-- BEEBO-SHELL-|<\/head>|<\/body>)/g, '\n'));
}
export function bodyContent(source, file) {
  let s = source;
  for (const name of ['BANNER', 'HEADER', 'FOOTER', 'ASSETS']) s = s.replace(blockRE(name), '');
  s = removeOldShell(s, file);
  return (s.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '').replace(sharedTag, '').replace(/\r\n/g, '\n').replace(/>\s+</g, '><').trim();
}
function audit() {
  const rows = htmlPages().map(file => {
    const s = readFileSync(join(root, file), 'utf8');
    const h = s.match(/<header\b[\s\S]*?<\/header>/)?.[0] || '';
    const f = s.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] || '';
    const tags = [...s.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/g)].filter(m => /\.(css|js)(\?|$)/.test(m[1])).map(m => m[1]);
    const text = t => t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return `| ${file} | ${s.match(/<body[^>]*>/)?.[0].replace(/[<>]/g, '') || 'fragment'} | ${s.includes('beebo-tester-banner') ? 'Yes' : 'No'} | ${text(h).replace(/\|/g,'/').slice(0,230) || 'None'} | ${[...f.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).join(', ') || 'None'} | ${tags.join(', ')} | ${exclusion(file) || 'Canonical shell'} |`;
  });
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs/SHELL-AUDIT.md'), `# Shared website shell audit\n\nBase: \`${base}\`. Inventory captured before generation. Body content, evidence, feeds, pricing and legal wording are outside this change.\n\nThe homepage banner and seven navigation items are canonical. The footer combines the existing Make yourself at home, A little helping hand, testing and policy links. Static release fallback values are derived from the existing feeds during generation and refreshed by the existing polish.js at runtime; versions and dates are never hand-typed. Scoped shell styles sit in the generated ASSETS block, after each page’s unchanged body styles. Existing page CSS is retained so its body layout does not change.\n\nRun \`node scripts/site-shell.mjs\`, then \`node scripts/check-site-shell.mjs\`. The checker verifies canonical markers, links/anchors, asset keys, idempotence and body preservation against the base. Excluded pages are listed explicitly below.\n\n| Page | Original body | Banner | Original header/nav | Original footer destinations | Original CSS/scripts | Result / exception |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--audit')) audit();
  else {
    let changed = 0, total = 0;
    for (const file of htmlPages()) {
      if (exclusion(file)) continue;
      total++;
      const s = readFileSync(join(root, file), 'utf8'), next = render(s, file);
      if (next !== s) { writeFileSync(join(root, file), next); changed++; }
    }
    console.log(`Canonical shell: ${total} pages; ${changed} changed.`);
  }
}
