import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { validateSnapshot, activityState, codeEstimate, renderActivity } from '../tools/feature-work-snapshot.mjs';
import { readinessAudit, validateReadinessAudit } from '../tools/readiness-audit.mjs';
const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(new URL('../testing-status.json', import.meta.url), 'utf8'));
const page = readFileSync(new URL('../release-evidence.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../testing-evidence.css', import.meta.url), 'utf8');
const cards = [...page.matchAll(/<article\b[^>]*class="feature-work-card\b[^>]*>[\s\S]*?<\/article>/g)].map(m => m[0]);
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const snapshot = JSON.parse(readFileSync(new URL('../site-data/feature-work-snapshot.json',import.meta.url),'utf8'));
const script = readFileSync(new URL('../assets/evidence-tier-tabs.js',import.meta.url),'utf8');
function domAt(time=snapshot.capturedAt) {
 const dom=new JSDOM(page,{url:'http://localhost/release-evidence.html',runScripts:'outside-only'});
 dom.window.Date.now=()=>Date.parse(time);
 dom.window.setTimeout=()=>0;
 dom.window.eval(script);
 return dom;
}

test('all 70 original feature rows remain unique and obey the existing rubric', () => {
  assert.equal(data.features.length, 70);
  assert.equal(new Set(data.features.map(f => f.name)).size, 70);
  assert.deepEqual(require('../site-data/progress-score.js').problems(data), []);
  for (const feature of data.features.filter(f => !Object.values(f.checks).some(Boolean))) {
    assert.ok(feature.roadTo100.done.includes('Checks passed: none yet.'), feature.name);
  }
  assert.equal((page.match(/<tr id="[^"]+" class="feat tier-/g) || []).length, 70);
});
test('all 70 concise feature cards are visible in the initial generated page', () => {
  assert.equal(cards.length, 70);
  assert.match(page, /id="feature-work-groups"/);
  assert.doesNotMatch(page, /id="feature-work-groups"[^>]*\bhidden/);
  assert.doesNotMatch(page, /class="tier-key-data" hidden/);
});
test('each card preserves its exact score, name and real evidence anchor', () => {
  assert.equal(cards.length, 70);
  for (const f of data.features) {
    const card = cards.find(c => c.includes(`data-feature-name="${escape(f.name)}"`));
    assert.ok(card, f.name);
    assert.ok(card.includes(`${f.percentComplete}%`), f.name + ' score');
    const target = /class="feature-work-link" href="#([^"]+)"/.exec(card)?.[1];
    assert.ok(target && page.includes(`id="${target}"`), f.name + ' evidence anchor');
    assert.ok(card.includes(escape(f.status)), f.name + ' status');
    if (f.openIssues) assert.match(card, /open known issue/);
  }
});
test('green and lower-percentage sections are adjacent and include every tier', () => {
  assert.match(page, /id="feature-work-green"/);
  assert.match(page, /id="feature-work-below"/);
  assert.ok(page.indexOf('id="feature-work-green"') < page.indexOf('id="feature-work-below"'));
  assert.match(page, /id="feature-work-accepted"/);
});
test('robots use visible state labels and native focusable/tappable details', () => {
  assert.equal((page.match(/<details class="feature-activity"/g) || []).length, 70);
  assert.equal((page.match(/class="work-robot"[^>]*aria-hidden="true"/g) || []).length, 70);
  assert.equal((page.match(/<summary class="activity-toggle\b/g) || []).length, 70);
  assert.match(page, /AI working/);
  assert.match(page, /Not currently worked on/);
  assert.match(page, /Activity not verified/);
  assert.match(page, /not live/i);
});
test('count summaries distinguish automated checks from device/world runs', () => {
  assert.equal((page.match(/class="recorded-checks"/g) || []).length, 70);
  assert.equal((page.match(/class="recorded-device-runs"/g) || []).length, 70);
  assert.match(page, /partial|unknown/i);
  assert.match(page, /dated records|recorded runs/i);
});
test('long evidence is collapsed below prominent charts and feature cards', () => {
  assert.match(page, /<details class="feature-evidence" id="feature-evidence">/);
  assert.ok(page.indexOf('id="platform-matrix"') < page.indexOf('id="feature-work-groups"'));
  assert.ok(page.indexOf('id="feature-work-groups"') < page.indexOf('id="release-changes"'));
});
test('card and activity styles include narrow-screen wrapping and visible focus', () => {
  assert.match(css, /\.feature-work-card/);
  assert.match(css, /\.activity-toggle:focus-visible/);
  assert.match(css, /@media[^{}]*max-width[^{}]*\{[\s\S]*?\.feature-work/);
  assert.match(css, /\.activity-inactive/);
  assert.match(css, /\.activity-unknown/);
});
test('public snapshot has exactly the public feature names and no private provenance', () => {
  const path = new URL('../site-data/feature-work-snapshot.json', import.meta.url);
  assert.equal(existsSync(path), true);
  const text = readFileSync(path, 'utf8');
  const snapshot = JSON.parse(text);
  assert.deepEqual(snapshot.features.map(f => f.name).sort(), data.features.map(f => f.name).sort());
  assert.ok(Number.isFinite(Date.parse(snapshot.capturedAt)));
  assert.doesNotMatch(text, /github\.com[^\s"]*\/issues|issuecomment|taskId|\/workspace\/|\b[a-f0-9]{40}\b/i);
  for (const f of snapshot.features) assert.ok([true, false, null].includes(f.active));
});
const NOV7={
 'Opening the app and the five tabs':{lastTested:'Nov 7, 2026, about 9:45 to 10:05 AM Eastern (public Android 1.52 build 122, Galaxy S24 Ultra, Nick watching: reopen to Home in about 8 seconds, five tabs, 0 crash lines; PASS, marked 100% by Nick for that scope)'},
 'Campsite host start and stop':{lastTested:'Nov 7, 2026, about 8:40 to 8:55 AM Eastern (public Android 1.52 build 122, Galaxy S24 Ultra host, Chrome guest on the 4-core PC, home Wi-Fi, Nick watching: start with QR code and address, guest join, Stop with confirmation; PASS, marked 100% by Nick for that scope)'},
 'Pack for a trip (download planner)':{openIssues:[1,2],lastTested:'Nov 7, 2026, about 10:10 to 10:30 AM Eastern (public Android 1.52 build 122, Galaxy S24 Ultra, Nick watching and listening: packed 2 added test films, 4 of 4 ready, offline play with sound; PASS, marked 100% by Nick for that scope)'},
 'Library sharing with another household':{openIssues:[3,5],lastTested:'Nov 7, 2026, about 9:20 to 9:45 AM Eastern (Windows 0.1.113 host and public Android 1.52 build 122 guest on a Galaxy S24 Ultra, test films, home Wi-Fi, Nick watching: code, accept, watch with sound, download, offline play, stop sharing; PASS, marked 100% by Nick for that scope)'},
 'Library, player and web player':{openIssues:[6,7],lastTested:'Nov 7, 2026, about 9:50 to 10:05 AM Eastern (published Windows 0.1.113, 4-core PC, Nick watching: desktop library, Play in VLC, web player Resume and pause in Chrome; PASS, marked 100% by Nick for that scope, silent)'},
 'Home layouts and Customize layout (desktop)':{lastTested:'Nov 7, 2026, about 9:55 to 10:30 AM Eastern (published Windows 0.1.113, 4-core PC, Nick watching: all five layouts shown, layouts marked 100% by Nick for that scope; Customize layout hide and restore a row PASS)'},
 'Update modes and start with Windows':{lastTested:'Nov 7, 2026, about 9:50 to 10:05 AM Eastern (published Windows 0.1.113, 4-core PC, Nick watching: the three update modes chosen and saved; PASS, marked 100% by Nick for that choice only)'},
};
const NOV8={
 'Opening the app and the five tabs':{openIssues:[2,1],lastTestedStartsWith:'Nov 8, 2026, 9:48 to 9:50 AM Eastern'},
 'Campsite games':{openIssues:[3,5],lastTestedStartsWith:'Nov 8, 2026, 9:49 AM to 11:36 AM Eastern'},
 'Pack for a trip (download planner)':{openIssues:[1,1],lastTestedStartsWith:'Nov 8, 2026, 9:49 AM to 10:25 AM Eastern'},
 'Library, player and web player':{openIssues:[6,8],lastTestedStartsWith:'Nov 8, 2026, 5:58 to 6:02 AM Eastern'},
 'Home layouts and Customize layout (desktop)':{openIssues:[3,0],lastTestedStartsWith:'Nov 7, 2026, 11:05 AM to 5:48 PM Eastern'},
 // Nov 8, 2026 second record (public Android 1.54 / 1.54.1, Windows 0.1.113): dated additions only, no score change.
 'Campsite host start and stop':{lastTestedStartsWith:'Nov 8, 2026, 10:02 to 10:05 AM Eastern'},
 'Keyboard and screen-reader support':{lastTestedStartsWith:'Nov 8, 2026, 5:40 to 5:44 AM Eastern'},
 'Jellyfin-compatible mode':{lastTestedStartsWith:'Nov 8, 2026, 7:19 AM Eastern'},
 'Photos and phone backups (timeline, albums, viewer)':{lastTestedStartsWith:'Nov 8, 2026, 6:34 to 6:37 AM Eastern'},
};
// Nov 9, 2026 record (Nick's decisions of Nov 9, public Android 1.55, Windows 0.1.114): explicit dated additions and the only score moves. PRIOR is the published file just before this update.
const PRIOR=JSON.parse(execFileSync('git',['show','6a3d2812:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
const ALL5={'Built':true,'Automated tests':true,'Real device':true,'Real-world check':true,'Ready to call Available':true};
const NOV9={
 'Wireless speakers':{lastTestedStartsWith:'Nov 9, 2026, 7:10 to 7:42 AM Eastern',expect:{percentComplete:100,checks:ALL5,realWorldDonePercent:100}},
 'Accessibility choices (large text, high contrast, reduced motion, TalkBack)':{lastTestedStartsWith:'Nov 9, 2026, 11:22 AM to 1:47 PM Eastern',expect:{percentComplete:90,openIssues:1}},
 'Playing films, seeking, picture-in-picture':{lastTestedStartsWith:'Nov 9, 2026, 11:08 AM to 1:32 PM Eastern',expect:{openIssues:7}},
 'Away from home (direct, then relay)':{lastTestedStartsWith:'Nov 9, 2026, 5:55 to 6:51 AM Eastern'},
 'Opening the app and the five tabs':{lastTestedStartsWith:'Nov 9, 2026, 11:08 to 11:47 AM Eastern'},
 'Campsite games':{lastTestedStartsWith:'Nov 9, 2026, 11:30 AM to 1:47 PM Eastern',expect:{openIssues:8}},
 'Campsite host start and stop':{lastTestedStartsWith:'Nov 9, 2026, 12:36 to 1:21 PM Eastern'},
 'Chromecast':{lastTestedStartsWith:'Nov 9, 2026, 12:54 PM Eastern'},
 'Share the app (QR over the hotspot)':{lastTestedStartsWith:'Nov 8, 2026, 11:04 to 11:10 PM Eastern'},
 'Home layouts and Customize layout (desktop)':{lastTestedStartsWith:'Nov 9, 2026, 1:26 PM Eastern'},
 'Library, player and web player':{lastTestedStartsWith:'Nov 9, 2026, 1:28 PM Eastern',expect:{openIssues:7}},
 'Keyboard and screen-reader support':{lastTestedStartsWith:'Nov 9, 2026, 1:55 PM Eastern'},
 'Installer and self-update':{lastTestedStartsWith:'Nov 9, 2026, 1:24 PM Eastern'},
 'Converter and quality / speed settings':{lastTestedStartsWith:'Nov 8, 2026, 11:18 to 11:24 PM Eastern'},
 'Live TV (tuner and own playlist)':{lastTestedStartsWith:'Nov 8, 2026, 9:38 to 9:41 PM Eastern'},
 'Jellyfin-compatible mode':{lastTestedStartsWith:'Nov 8, 2026, 9:38 to 9:41 PM Eastern'},
 'Story Studio':{lastTestedStartsWith:'Nov 8, 2026, 11:50 to 11:55 PM Eastern'},
 'Kitchen announcements (messages to phones)':{lastTestedStartsWith:'Nov 8, 2026, about 9:47 PM Eastern'},
 'Parental controls and household profiles':{lastTestedStartsWith:'Nov 9, 2026, 12:14 PM Eastern',expect:{openIssues:3}},
 'Photos and phone backups (timeline, albums, viewer)':{lastTestedStartsWith:'Nov 9, 2026, 11:49 AM Eastern',expect:{percentComplete:74,openIssues:6,realWorldDonePercent:33,checks:{'Built':true,'Automated tests':true,'Real device':true,'Real-world check':false,'Ready to call Available':false}}},
 'Music on the phone (albums, songs, player, sleep timer)':{lastTestedStartsWith:'Nov 9, 2026, 1:28 to 1:47 PM Eastern'},
 'Podcasts and radio':{lastTestedStartsWith:'Nov 9, 2026, 10:43 to 10:47 AM Eastern'},
 'Audiobooks':{lastTestedStartsWith:'Nov 9, 2026, 11:18 AM to 1:13 PM Eastern'},
 'Pack for a trip (download planner)':{lastTestedStartsWith:'Nov 9, 2026, 11:08 AM to 1:32 PM Eastern'},
 'Beebo Auto (Android Auto)':{lastTestedStartsWith:'Nov 9, 2026, 1:07 PM Eastern'},
 'Update modes and start with Windows':{lastTestedStartsWith:'Nov 9, 2026, 1:24 PM Eastern'},
 'Movie Night':{lastTestedStartsWith:'Nov 9, 2026, 1:43 PM Eastern',expect:{openIssues:7}},
 'Library sharing with another household':{lastTestedStartsWith:'Nov 9, 2026, 11:49 AM to 1:31 PM Eastern',expect:{openIssues:8}},
};
// Nov 10, 2026 overnight record (private test builds 1.57/1.58 on a Pixel 3, a Galaxy S9+ and an Android TV emulator; code reviews of the published
// Windows 0.1.115 and Android 1.56): dated lastTested additions and new open issues only, no score move. PRIOR10 is the published file before it.
const PRIOR10=JSON.parse(execFileSync('git',['show','51da7938:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
const NOV10={
 // Nick's own decision, Nov 10, 2026, 3:45 AM Eastern: "Drop them to 90".
 "Posters and info (TMDB)":{openIssues:[0,3],percentComplete:[100,90]},
 "Music on the phone (albums, songs, player, sleep timer)":{openIssues:[0,1],percentComplete:[100,90]},
 "Podcasts and radio":{openIssues:[0,1],percentComplete:[100,90]},
 // Nick, Nov 10, 2026, 7:57 PM Eastern: drop a row when a feature is not working; found by automated tests of the source.
 "Surprise me, playlists, watchlist, favourites":{openIssues:[0,2],percentComplete:[100,90]},
 "Collections and Request a title":{openIssues:[0,2],percentComplete:[100,90]},
 "Opening the app and the five tabs":{lastTestedStartsWith:"Nov 9, 2026, 2:13 to 2:49 PM Eastern",openIssues:[1,2]},
 "Playing films, seeking, picture-in-picture":{lastTestedStartsWith:"Nov 9, 2026, 3:07 PM Eastern"},
 "Campsite host start and stop":{lastTestedStartsWith:"Nov 9, 2026, 2:09 to 2:47 PM Eastern"},
 "Pack for a trip (download planner)":{lastTestedStartsWith:"Nov 9, 2026, 8:45 PM Eastern",openIssues:[1,2]},
 "Campsite games":{lastTestedStartsWith:"Nov 9, 2026, 2:09 PM and 9:12 PM Eastern"},
 "Android TV and Fire TV screens":{lastTestedStartsWith:"Nov 10, 2026, 2:34 AM Eastern"},
 "Link a TV":{lastTestedStartsWith:"Nov 9, 2026, 3:04 and 9:14 PM Eastern"},
 "Accessibility choices (large text, high contrast, reduced motion, TalkBack)":{lastTestedStartsWith:"Nov 9, 2026, 2:42 PM Eastern"},
 "Movie Night":{lastTestedStartsWith:"Nov 9, 2026, 2:51 PM Eastern and Nov 10, 2026, 2:47 AM Eastern",openIssues:[7,8]},
 "Away from home (direct, then relay)":{openIssues:[4,6]},
 "Photos and phone backups (timeline, albums, viewer)":{openIssues:[6,9]},
 "Installer and self-update":{openIssues:[0,1]},
 "Library, player and web player":{openIssues:[7,14]},
 "Converter and quality / speed settings":{openIssues:[2,5]},
 "Jellyfin-compatible mode":{openIssues:[2,3]},
 "Parental controls and household profiles":{openIssues:[3,7]},
 "Keyboard and screen-reader support":{openIssues:[1,4]},
 "Music on the PC (library, mixes, desktop player)":{openIssues:[1,3]},
 "Our own servers and DNS":{openIssues:[0,1]},
};
// Nov 10, 2026 early-morning record (Pixel 3 on the published Android 1.56 against a throwaway test home; automated bug-hunt tests of the published
// Windows 0.1.115 source): dated lastTested additions and new open issues only, no score move. PRIOR10B is the published file before it.
const PRIOR10B=JSON.parse(execFileSync('git',['show','09fba081a45a692d03502e2321a7f79914992f5f:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
const NOV10B={
 "Playing films, seeking, picture-in-picture":{lastTestedStartsWith:"Nov 10, 2026, 5:11 to 6:42 AM Eastern"},
 "Live TV (tuner and own playlist)":{lastTestedStartsWith:"Nov 10, 2026, 5:58 to 6:42 AM Eastern"},
 "Photos and phone backups (timeline, albums, viewer)":{openIssues:[9,10]},
 "Converter and quality / speed settings":{openIssues:[5,10]},
 "Library sharing with another household":{openIssues:[8,14]},
};
// Nov 10, 2026 daytime record (automated tests and reviews of the published Android 1.56 and Windows 0.1.115 source, no device):
// new open issues only, no score move. PRIOR10C is the published file before it.
const PRIOR10C=JSON.parse(execFileSync('git',['show','05fcc6f:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
const NOV10C={
 "Photos and phone backups (timeline, albums, viewer)":{openIssues:[10,15]},
 "Parental controls and household profiles":{openIssues:[7,9]},
 "Android TV and Fire TV screens":{openIssues:[0,1]},
};
// Nov 11, 2026 evening record (public Android 1.59 and 1.60 device tests; fixes now in published builds): PRIOR11 is the published file before it.
const PRIOR11=JSON.parse(execFileSync('git',['show','76b9e71:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
// Nov 12, 2026: [before, after]. Rows that already had a Real device tick and a dated real-device PASS reach the new 98 step (only rows with no open known problem). Nothing went down.
const NOV12={"Update modes and start with Windows":[74,98],"Live TV (tuner and own playlist)":[74,98]};
const NOV11={
 "Opening the app and the five tabs": {
  "openIssues": [
   2,
   1
  ],
  "lastTestedStartsWith": "Nov 11, 2026, 8:45 AM to 10:33 AM Eastern (public Android 1."
 },
 "Playing films, seeking, picture-in-picture": {
  "openIssues": [
   7,
   6
  ],
  "lastTestedStartsWith": "Nov 11, 2026, 8:43 to 10:27 AM Eastern (public Android 1.59 "
 },
 "Campsite games": {
  "openIssues": [
   8,
   8
  ],
  "lastTestedStartsWith": "Nov 11, 2026, 9:35 AM to 11:09 AM Eastern (public Android 1."
 },
 "Share the app (QR over the hotspot)": {
  "lastTestedStartsWith": "Nov 11, 2026, 8:18 to 8:21 AM Eastern (public Android 1.59 b",
  "checks": true
 },
 "Chromecast": {
  "openIssues": [
   6,
   7
  ],
  "lastTestedStartsWith": "Nov 11, 2026, 7:18 to 10:55 AM Eastern (Galaxy S9+ with a fr"
 },
 "Link a TV": {
  "openIssues": [
   0,
   1
  ]
 },
 "Photos and phone backups (timeline, albums, viewer)": {
  "openIssues": [
   15,
   12
  ]
 },
 "Library, player and web player": {
  "openIssues": [
   14,
   11
  ]
 },
 "Converter and quality / speed settings": {
  "openIssues": [
   10,
   8
  ]
 },
 "Movie Night": {
  "openIssues": [
   8,
   6
  ]
 },
 "Jellyfin-compatible mode": {
  "openIssues": [
   3,
   2
  ]
 },
 "Keyboard and screen-reader support": {
  "openIssues": [
   4,
   3
  ]
 },
 "Music on the PC (library, mixes, desktop player)": {
  "openIssues": [
   3,
   1
  ]
 },
 "Beebo Relay (fallback connection)": {
  "openIssues": [
   2,
   1
  ]
 }
};
test('Emulator ticks are explicit: only rows with a recorded PASS on an emulator with the public build, and no score went down',()=>{
 const EMU=['Opening the app and the five tabs','Playing films, seeking, picture-in-picture'];
 assert.deepEqual(data.features.filter(f=>f.checks.Emulator).map(f=>f.name).sort(),[...EMU].sort());
 assert.ok(data.features.every(f=>typeof f.checks.Emulator==='boolean'));
 assert.ok(data.features.every(f=>!f.nextUpdate),'no next-update tag is set without recorded evidence');
});
test('all 70 scores and checks preserve the baseline; dated evidence additions are explicit',()=>{
 const baseline=JSON.parse(execFileSync('git',['show','debf65d2c47fb8900dbaa0d71994c3dba473e8aa:testing-status.json'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
 for(const before of baseline.features){
  const afterRaw=data.features.find(f=>f.name===before.name);
  // Nov 12, 2026: the Emulator step is a new, separate check (floor of 98, never a deduction). Compare the original five checks here; the Emulator ticks are pinned in their own test.
  const {Emulator:_emulator,...checksWithoutEmulator}=afterRaw.checks;
  const after={...afterRaw,checks:checksWithoutEmulator};
  for(const key of ['percentComplete','checks','status','openIssues','lastTested','testedOn','codeDonePercent','realWorldDonePercent']){
  if(key==='percentComplete'&&NOV12[before.name]){assert.equal(after.percentComplete,NOV12[before.name][1],before.name+': Nov 12 percent (Emulator step: a recorded real-device PASS also counts for 98)');assert.ok(after.percentComplete>NOV12[before.name][0],before.name+': Nov 12 score went up, not down');continue;}
  const nov9=NOV9[before.name];
  const nov10=NOV10[before.name];
  const nov10b=NOV10B[before.name];
  const nov10c=NOV10C[before.name];
   const nov11=NOV11[before.name];
   if(nov11 && key==='openIssues' && nov11.openIssues){
    const p11=PRIOR11.features.find(f=>f.name===before.name);
    assert.equal(p11.openIssues||0,nov11.openIssues[0],before.name+': open issues before Nov 11');assert.equal(after.openIssues||0,nov11.openIssues[1],before.name+': Nov 11 open issues');continue;
   }
   if(nov11 && key==='lastTested' && nov11.lastTestedStartsWith){
    const p11=PRIOR11.features.find(f=>f.name===before.name);
    assert.ok(after.lastTested.startsWith(nov11.lastTestedStartsWith),before.name+': Nov 11 lastTested prefix');
    assert.ok(after.lastTested.endsWith('; '+p11.lastTested),before.name+': Nov 11 earlier lastTested kept');continue;
   }
   if(nov11 && nov11.checks && key==='checks'){
    const p11=PRIOR11.features.find(f=>f.name===before.name);
    assert.deepEqual(after.checks,{...p11.checks,'Real-world check':true},before.name+': Nov 11 checks');continue;
   }
   if(nov11 && nov11.checks && key==='percentComplete'){
    const p11=PRIOR11.features.find(f=>f.name===before.name);
    assert.equal(p11.percentComplete,74);assert.equal(after.percentComplete,99,before.name+': Nov 11 percent (Real-world check added)');continue;
   }
   if(nov10c && key==='openIssues' && nov10c.openIssues){
    const prior10c=PRIOR10C.features.find(f=>f.name===before.name);
    assert.equal(prior10c.openIssues||0,nov10c.openIssues[0],before.name+': open issues before the Nov 10 daytime record');assert.equal(after.openIssues||0,nov10c.openIssues[1],before.name+': Nov 10 daytime open issues');continue;
   }
   if(nov10b && key==='lastTested' && nov10b.lastTestedStartsWith){
    const prior10b=PRIOR10B.features.find(f=>f.name===before.name);
    assert.ok(after.lastTested.startsWith(nov10b.lastTestedStartsWith),before.name+': Nov 10 early-morning lastTested prefix');
    assert.ok(after.lastTested.endsWith('; '+prior10b.lastTested),before.name+': Nov 10 early-morning earlier lastTested kept');continue;
   }
   if(nov10b && key==='openIssues' && nov10b.openIssues){
    const prior10b=PRIOR10B.features.find(f=>f.name===before.name);
    assert.equal(prior10b.openIssues||0,nov10b.openIssues[0],before.name+': open issues before the Nov 10 early-morning record');assert.equal(after.openIssues||0,nov10b.openIssues[1],before.name+': Nov 10 early-morning open issues');continue;
   }
   if(nov10 && key==='lastTested' && nov10.lastTestedStartsWith){
    const prior10=PRIOR10.features.find(f=>f.name===before.name);
    assert.ok(after.lastTested.startsWith(nov10.lastTestedStartsWith),before.name+': Nov 10 lastTested prefix');
    assert.ok(after.lastTested.endsWith('; '+prior10.lastTested),before.name+': Nov 10 earlier lastTested kept');continue;
   }
   if(nov10 && key==='percentComplete' && nov10.percentComplete){
    const prior10=PRIOR10.features.find(f=>f.name===before.name);
    assert.equal(prior10.percentComplete,nov10.percentComplete[0],before.name+': percent before Nov 10');assert.equal(after.percentComplete,nov10.percentComplete[1],before.name+': Nov 10 percent (Nick\'s decision)');continue;
   }
   if(nov10 && key==='openIssues' && nov10.openIssues){
    const prior10=PRIOR10.features.find(f=>f.name===before.name);
    assert.equal(prior10.openIssues||0,nov10.openIssues[0],before.name+': open issues before Nov 10');assert.equal(after.openIssues||0,nov10.openIssues[1],before.name+': Nov 10 open issues');continue;
   }
   if(nov9 && key==='lastTested'){
    const prior=PRIOR.features.find(f=>f.name===before.name);
    assert.ok(after.lastTested.startsWith(nov9.lastTestedStartsWith),before.name+': Nov 9 lastTested prefix');
    assert.ok(after.lastTested.endsWith('; '+prior.lastTested),before.name+': earlier lastTested kept');continue;
   }
   if(nov9 && nov9.expect && Object.prototype.hasOwnProperty.call(nov9.expect,key)){
    assert.deepEqual(after[key],nov9.expect[key],before.name+': Nov 9 '+key);continue;
   }   if(key==='percentComplete' && before.name==='Home layouts and Customize layout (desktop)'){
    assert.equal(before.percentComplete,90);assert.equal(after.percentComplete,99);continue;
   }
   if(key==='openIssues' && before.name==='Playing films, seeking, picture-in-picture'){
    assert.equal(before.openIssues,4);assert.equal(after.openIssues,5);continue;
   }
   if(key==='openIssues' && before.name==='BeeboVPN'){
    assert.equal(before.openIssues,undefined);assert.equal(after.openIssues,2);continue;
   }
   if(key==='lastTested' && before.name==='Chromecast'){
    const prefix='Nov 2, 2026, 3:14 to 3:15 PM Eastern (S9+ unpublished tester69/build 119: Cast FAILED/INCONCLUSIVE; receiver SDK error then missing media, actual TV progress/picture and sound unknown; seek check not run, normal Stop cleanup); earlier: ';
    assert.equal(after.lastTested,prefix+before.lastTested);continue;
   }
   if(before.name==='Car party (host and passengers)' && ['lastTested','testedOn'].includes(key))continue;
   // Nov 8, 2026 4-core record (public Windows 0.1.113 and Android 1.53 build 123): explicit dated additions only.
   const nov8=NOV8[before.name];
   if(nov8 && key==='openIssues' && nov8.openIssues){
    assert.equal(before.openIssues,nov8.openIssues[0],before.name+': baseline open issues');assert.equal(after.openIssues,nov8.openIssues[1],before.name+': Nov 8 open issues');continue;
   }
   if(nov8 && key==='lastTested' && nov8.lastTestedStartsWith){
    const older=(NOV7[before.name]?NOV7[before.name].lastTested+'; ':'')+before.lastTested;
    assert.ok(after.lastTested.startsWith(nov8.lastTestedStartsWith),before.name+': Nov 8 lastTested prefix');
    assert.ok(after.lastTested.endsWith('; '+older),before.name+': earlier lastTested kept');continue;
   }
   // Nov 7, 2026 owner-watched record (public Android 1.52 build 122, Windows 0.1.113): explicit dated additions only.
   const nov7=NOV7[before.name];
   if(nov7 && key==='openIssues' && nov7.openIssues){
    assert.equal(before.openIssues,nov7.openIssues[0]);assert.equal(after.openIssues,nov7.openIssues[1]);continue;
   }
   if(nov7 && key==='lastTested' && nov7.lastTested){
    assert.equal(after.lastTested,nov7.lastTested+'; '+before.lastTested,before.name+': Nov 7 lastTested prefix');continue;
   }
   assert.deepEqual(after[key],before[key],before.name+': '+key);
  }
 }
 const car=data.features.find(f=>f.name==='Car party (host and passengers)');
 assert.equal(car.lastTested,'Oct 13, 2026: two-phone host/join/leave; no newer-build real-device PASS recorded');
 const originalCar=baseline.features.find(f=>f.name===car.name);
 assert.equal(car.testedOn,originalCar.testedOn.replace('No real Car Party pass is recorded here. Last PASS: No real-device PASS recorded.','No newer-build Car Party pass is recorded here. The existing device tick rests on the Oct 13, 2026 two-phone host/join/leave run.'));
});

test('every feature card face shows a Latest check line, with honesty when nothing is newer than the public build',()=>{
 assert.equal((page.match(/class="feature-work-latest">Latest check: /g)||[]).length,70);
 for(const f of data.features){
  const card=cards.find(c=>c.includes(`data-feature-name="${escape(f.name)}"`));
  assert.ok(card.includes('Latest check:'),f.name);
  if(!f.latestCheck)assert.ok(card.includes('Not checked yet'),f.name);
 }
 const wireless=cards.find(c=>c.includes('data-feature-name="Wireless speakers"'));
 assert.match(wireless,/Latest check: Nov 9, 2026, 7:42 AM Eastern - Android 1.55/);
 const appBuild=require('../downloads/app-build.json');
 assert.ok(wireless.includes(`Nothing newer than Nov 9, 2026, 7:42 AM Eastern; the public build is now Android ${appBuild.versionName} (build ${appBuild.versionCode})`));
 const chromecast=cards.find(c=>c.includes('data-feature-name="Chromecast"'));
 const latestCast=data.features.find(f=>f.name==='Chromecast').latestCheck;
 assert.ok(chromecast.includes(`Nothing newer than ${latestCast.at}; the public build is now Android ${appBuild.versionName} (build ${appBuild.versionCode})`));
});
test('Checked today lists every receipt since Nov 8, 12:02 PM, with where it landed, and publishes no private links',()=>{
 assert.match(page,/id="checked-today"/);
 const start=page.indexOf('id="checked-today"');
 const section=page.slice(start,page.indexOf('</section>',start));
 assert.ok(data.checkedToday.items.length>=70);
 assert.equal((section.match(/<li>/g)||[]).length,data.checkedToday.items.length);
 for(const id of ['6739703832','6740330602','6740490436','6740961540','6739366247','6741362989','6742969006','6731971385','6727088817','6726779418','6726485009'])assert.ok(section.includes(id),id);
 for(const word of ['Read It To Me','Wireless speakers','Drop Four','Tic-Tac-Toe','Reversi','ingerprint','F32','updated itself','installer']) assert.ok(section.includes(word),word);
 for(const it of data.checkedToday.items){assert.ok(/^(MOVED|RECORDED|LISTED|NOT SCORED|NOT COUNTED)/.test(it.landed),it.id+' landing');assert.ok(it.at&&it.what&&it.build&&it.device&&it.result,it.id);}
 const privateName=new RegExp('beebo-app-'+'private');assert.ok(!privateName.test(page));
 assert.ok(!privateName.test(JSON.stringify(data)));assert.ok(!/issuecomment/.test(page+JSON.stringify(data)));
});

test('the dated percentage audit accounts for all 70 rows and keeps evidence gaps explicit',()=>{
 validateReadinessAudit(data);
 assert.equal(readinessAudit.features.length,70);
 assert.equal(readinessAudit.features.filter(f=>f.outcome==='evidence-gap').length,7);
 // Nov 10, 2026: the review moved no percentage; then Nick's own decision moved three Ready rows from 100% to 90%.
 // Nov 10, 2026 early-morning record: the audit's before and after are for that run, which moved no percentage.
 assert.deepEqual(readinessAudit.features.filter(f=>f.scoreBefore!==f.scoreAfter).map(f=>f.featureId).sort(),["feature-android-phone-app-share-the-app-qr-over-the-hotspot","feature-windows-desktop-app-live-tv-tuner-and-own-playlist","feature-windows-desktop-app-update-modes-and-start-with-windows"]); // Nov 11 evening run moved only Share the app (74 to 99); earlier: collections and surprise-me, Nov 10, 8:06 PM Eastern: Nick's instruction moved these two Ready rows from 100% to 90%
 assert.match(page,/id="percentage-audit"/);
 for(const row of readinessAudit.features){
  const detail=readFileSync(new URL('../features/'+row.featureId+'.html',import.meta.url),'utf8');
  assert.ok(detail.includes(escape(row.summary)),row.featureId);
  assert.ok(detail.includes(readinessAudit.updatedEastern),row.featureId);
 }
 const missing=structuredClone(readinessAudit);missing.features.pop();assert.throws(()=>validateReadinessAudit(data,missing));
 const wrong=structuredClone(readinessAudit);wrong.features[0].scoreAfter++;assert.throws(()=>validateReadinessAudit(data,wrong));
});
test('legacy 100% code estimates with outstanding required work are visibly qualified',()=>{
 const contradicted=data.features.filter(f=>codeEstimate(f));
 assert.equal(contradicted.length,51); // Nov 10, 2026: rows with a 100% code estimate gained open issues (one in the review, three by Nick's decision, one in the daytime record: Android TV and Fire TV screens; then row 7: Surprise me, playlists, watchlist, favourites, and row 30: Collections and Request a title)
 for(const f of contradicted){const card=cards.find(c=>c.includes(`data-feature-name="${escape(f.name)}"`));assert.ok(card.includes('Legacy code estimate is unverified'),f.name);}
 assert.match(page,/51 rows retain a 100% code estimate/);
 const method=data.codeVsHuman.method;
 for(const fact of ['Built and Automated tests checks','Real device, Real-world check and Ready to call Available','Group figures are the average of their features and are never rounded up to 100','Remaining counts are open road-to-100 items','All 70 features are counted, including those that are planned or on hold'])assert.ok(method.includes(fact),fact);
 const generator=readFileSync(new URL('../site-data/build-what-we-offer.js',import.meta.url),'utf8');
 assert.doesNotMatch(generator,/\$\{c\.waiting\} code complete/);
});
test('offer evidence qualifies earlier Ready records when current issues cap the score',()=>{
 const offer=require('../site-data/what-we-offer.json');
 const map=require('../site-data/evidence-map.json').map;
 const ids=['w-posters','p-browse','p-lists','m-music','m-podcasts','m-radio'];
 for(const id of ids){
  const offerRow=offer.features.find(f=>f.id===id);
  const row=data.features.find(f=>f.name===map[id]);
  assert.equal(row.percentComplete,90,id);
  assert.match(offerRow.evidence,/Nick.s earlier Ready record/,id);
  assert.match(offerRow.evidence,/moved from 100% to 90% on Nov 10, 2026, (?:3:45 AM|8:06 PM) Eastern/,id);
  assert.match(offerRow.evidence,/found by (?:automated tests|code review) of the source, not on an installed copy/,id);
  assert.doesNotMatch(offerRow.evidence,/testing (?:evidence )?page (?:now )?(?:lists|records).*as Ready/,id);
 }
});

test('web Watchlist matrix exposes the source findings while remaining untested',()=>{
 const cells=data.platformMatrix.rows.find(r=>r.id==='surprise-me').cells;
 assert.equal(cells.web.state,'untested');
 assert.equal(cells.web.open,cells.and.open);
 assert.ok(cells.web.open.includes('desktop and web Watchlist'));
});

test('five-check summary explicitly describes historical records rather than current readiness',()=>{
 const key='confirmed-on-real-devices';
 const list=data.features.filter(f=>f.realWorldStatus===key);
 const required=['Built','Automated tests','Real device','Real-world check','Ready to call Available'];
 assert.deepEqual(list.map(f=>f.name),data.features.filter(f=>required.every(k=>f.checks[k])).map(f=>f.name));
 assert.equal(list.length,data.codeVsHuman.overall.counts[key]);
 assert.ok(list.some(f=>f.percentComplete<100));
 assert.match(data.realWorldStatusLabels[key],/All five checks recorded.*earlier Ready records/);
 assert.ok(page.includes(escape(data.realWorldStatusLabels[key])+' ('+list.length+')'));
 assert.match(data.codeVsHuman.method,/Open issues can cap the current score below 100%/);
});

test('activity validation rejects assignment, invalid timestamps and private provenance',()=>{
 assert.deepEqual(validateSnapshot(snapshot,data.features),[]);
 for(const modify of [s=>s.features[1].stage='Assigned',s=>s.features[1].confirmedAt='2027-01-01T00:00:00Z',s=>s.features[1].reason='https://github.com/private/issues/1',s=>s.recordsCutoff='unknown',s=>s.features.push(s.features[0])]){
  const altered=structuredClone(snapshot);modify(altered);assert.ok(validateSnapshot(altered,data.features).length);
 }
});
test('active, inactive, unknown and expired activity remain distinct without changing readiness',()=>{
 const row=snapshot.features.find(f=>f.active===true);
 assert.equal(activityState(row,snapshot),'active');
 assert.equal(activityState({...row,active:false},snapshot),'inactive');
 assert.equal(activityState({...row,active:null},snapshot),'unknown');
 for(const time of ['invalid','2027-01-01T00:00:00Z','2026-01-01T00:00:00Z'])assert.equal(activityState(row,snapshot,time),'unknown');
 const rendered=renderActivity({...row,active:false,stage:'Not active',reason:'Accepted; no current repair task.'},snapshot,'fixture');
 assert.match(rendered,/activity-inactive/);assert.match(rendered,/Not currently worked on/);assert.match(rendered,/Accepted; no current repair task/);
});
test('counted source executions exclude skipped cases and retain failed diagnostics',()=>{
 const counted=snapshot.features.filter(f=>f.tests.automated.executions?.length);
 assert.ok(counted.length>0);
 assert.ok(counted.some(f=>f.tests.automated.executions.some(r=>r.failed>0)));
 assert.ok(counted.some(f=>f.tests.automated.executions.some(r=>r.skipped>0)));
 for(const f of counted){const c=f.tests.automated;assert.equal(c.runs,c.executions.length);assert.equal(c.assertions,c.executions.reduce((n,r)=>n+r.passed+r.failed,0));assert.equal(c.coverage,'partial');}
 assert.equal(snapshot.features.find(f=>f.name==='Story Studio').tests.automated.assertions,240);
 assert.match(snapshot.integrationNote,/537/);assert.match(snapshot.integrationNote,/not 537 device runs/);
 assert.ok(data.features.every(f=>!f.sourceUpdate || Date.parse(f.sourceUpdate.asOf)<=Date.parse(snapshot.recordsCutoff)),'latest included source evidence fits the stated cutoff');
 assert.match(snapshot.integrationNote,/reconciliations ended at 3:58 PM and 3:55 PM/);
});
test('tier filtering, Escape and evidence links update the rendered DOM coherently',()=>{
 const dom=domAt();try{
  const {document:d,KeyboardEvent,MouseEvent}=dom.window;
  const green=d.querySelector('[data-tier-chip="green"]');green.click();
  assert.equal(d.querySelectorAll('.feature-work-card:not([hidden])').length,data.features.filter(f=>f.percentComplete>=90&&f.percentComplete<99).length);
  assert.equal(green.getAttribute('aria-pressed'),'true');
  green.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(d.querySelectorAll('.feature-work-card:not([hidden])').length,70);assert.equal(d.activeElement,green);
  const first=d.querySelector('.feature-work-link');first.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(d.querySelector('#feature-evidence').open,true);
  const target=d.getElementById(first.hash.slice(1));assert.ok(target);assert.equal(target.closest('tbody').hidden,false);
 }finally{dom.window.close();}
});
test('native expanders support click and focus while long evidence starts collapsed',()=>{
 const dom=domAt();try{const d=dom.window.document;
  for(const el of d.querySelectorAll('.evidence-archive,.feature-evidence,.feature-work-details,.feature-activity'))assert.equal(el.open,false);
  const summary=d.querySelector('.activity-toggle');summary.focus();assert.equal(d.activeElement,summary);assert.ok(summary.getAttribute('aria-describedby'));assert.ok(summary.title);
  summary.click();assert.equal(summary.parentElement.open,true);summary.click();assert.equal(summary.parentElement.open,false);
 }finally{dom.window.close();}
});
test('stale snapshots become visibly neutral in the rendered DOM',()=>{
 const dom=domAt('2027-01-01T00:00:00Z');try{const d=dom.window.document;
  assert.equal(d.querySelectorAll('.feature-activity[data-activity="active"]').length,0);
  assert.equal(d.querySelectorAll('.feature-activity[data-activity="unknown"]').length,70);
  assert.equal(d.querySelector('.activity-stale-note').hidden,false);
  assert.ok([...d.querySelectorAll('[data-activity-label]')].every(n=>n.textContent==='Activity not verified'));
 }finally{dom.window.close();}
});
test('every newly displayed card link has a real destination and evidence survives relocation',()=>{
 const dom=domAt();try{const d=dom.window.document;
  const aboutLinks=[];
  for(const a of d.querySelectorAll('.feature-work-card a')){
   const href=a.getAttribute('href');
   if(href.startsWith('#'))assert.ok(d.getElementById(a.hash.slice(1)),a.textContent);
   else {
    const id=a.closest('.feature-work-card').dataset.featureId;
    assert.match(id,/^feature-[a-z0-9-]+$/);
    assert.equal(href,`features/${id}.html`);
    assert.ok(existsSync(new URL('../'+href,import.meta.url)),a.textContent);
    aboutLinks.push(href);
   }
  }
  assert.equal(aboutLinks.length,70);assert.equal(new Set(aboutLinks).size,70);
  const baseline=new JSDOM(execFileSync('git',['show','debf65d2c47fb8900dbaa0d71994c3dba473e8aa:release-evidence.html'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true}));
  try{
   for(const el of baseline.window.document.querySelectorAll('section[id]'))assert.ok(d.getElementById(el.id),'retained section '+el.id);
   const links=new Set([...d.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
   for(const a of baseline.window.document.querySelectorAll('a[href]'))assert.ok(links.has(a.getAttribute('href')),'retained evidence link '+a.getAttribute('href'));
   const normalized=el=>el.textContent.replace(/\s+/g,' ').trim();
   for(const id of ['oct22-runs','release-checks-oct19','release-checks-oct18','published-run','oct29-bounded-update'])assert.equal(normalized(d.getElementById(id)),normalized(baseline.window.document.getElementById(id)),'retained evidence text '+id);
  }finally{baseline.window.close();}
  assert.ok(d.querySelector('#platform-matrix'));assert.ok(d.querySelector('#code-vs-human'));assert.ok(d.querySelector('#works-today').closest('details'));
 }finally{dom.window.close();}
});
