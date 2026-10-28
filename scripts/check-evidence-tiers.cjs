const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../site-data/progress-score.js');
const root = path.join(__dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'testing-status.json')));
assert.deepEqual(P.problems(d), []);
for (const [value, tier] of [[0,'red'],[39,'red'],[40,'yellow'],[79,'yellow'],[80,'teal'],[89,'teal'],[90,'green'],[98,'green'],[99,'purple'],[100,'gold']]) {
  assert.equal(P.tierFor(value,d.scoring).id,tier, 'tier boundary '+value);
}
const checks=Object.fromEntries(Object.keys(d.scoring.weights).map(k=>[k,true]));
assert.equal(P.percentFor({checks,openIssues:1},d.scoring),90,'an open issue caps even five passed checks');
assert.equal(P.percentFor({checks,openIssues:0},d.scoring),100);
checks['Ready to call Available']=false;
assert.equal(P.percentFor({checks},d.scoring),99);
const html=fs.readFileSync(path.join(root,'release-evidence.html'),'utf8');
assert.ok(!/mostly proven|Green 80/.test(html),'superseded tier wording');
assert.equal((html.match(/class="feature-entry" data-tier=/g)||[]).length,d.features.length);
// ONE control set: the Colour key chips both list a tier and filter the tables. The old second row of tab buttons must be gone.
for(const t of d.scoring.tiers) {
 assert.ok(html.includes(t.label), 'visible tier name '+t.id);
 assert.ok(html.includes('data-tier-chip="'+t.id+'"'), 'colour key chip / filter '+t.id);
}
assert.ok(html.includes('data-tier-chip="all"'), 'All features chip');
const chipOrder=[...html.matchAll(/class="[^"]*tier-chip[^"]*" data-tier-chip="([a-z]+)"/g)].map(m=>m[1]);
assert.deepEqual(chipOrder,['all',...d.scoring.tiers.map(t=>t.id)],'chips are All features then the key order');
assert.equal((html.match(/data-tier-chip="all"/g)||[]).length,1,'one All features chip');
assert.ok(!html.includes('role="tablist"')&&!html.includes('role="tabpanel"')&&!html.includes('tier-tab-')&&!html.includes('class="tier-tabs"'), 'the duplicate second row of tier tab buttons is gone');
assert.equal((html.match(/class="tier-result-count" role="status" aria-live="polite"/g)||[]).length,1,'one polite Showing N of M status line');
assert.ok(html.includes('id="tier-results"'), 'filtered tables wrapper');
for(const t of d.scoring.tiers) {
 const n=d.features.filter(f=>P.tierFor(f.percentComplete,d.scoring).id===t.id).length;
 const chip=html.match(new RegExp('<button[^>]*data-tier-chip="'+t.id+'"[^>]*>[^]*?</button>'))[0];
 assert.ok(chip.includes('('+n+')'), 'chip count '+t.id);
 assert.equal(/ is-empty/.test(chip), n===0, 'empty tier chip is muted/disabled with none right now: '+t.id);
 if(n===0)assert.ok(chip.includes('none right now'));
}
for(const f of d.features) {
 if(f.percentComplete>=99)assert.equal(f.openIssues||0,0,'open issue at 99/100: '+f.name);
 for(const r of f.ownerTests||[]) assert.ok(r.date.includes(' Eastern')&&/\d+:\d+/.test(r.date),'dated owner observation');
 if (f.checks['Real-world check'] && !d.checksBaseline.features[f.name]?.['Real-world check']) {
  assert.ok([...(f.ownerTests||[]),...(f.deviceTests||[])].some(r=>r.result==='PASS'&&r.ticks?.includes('Real-world check')&&/Eastern/.test(r.date)), 'post-baseline Real-world tick needs dated realistic PASS evidence: '+f.name);
 }
}
if(d.windowsToAndroid){
 assert.ok(html.includes('id="works-today"'),'the "Does it work today?" box is on the page');
 for(const m of (d.windowsToAndroid.scoreLine+d.windowsToAndroid.statusLine).matchAll(/\{pct:([^}]+)\}/g)) {
  const f=d.features.find(x=>x.name===m[1]); assert.ok(f,'works-today names a real feature: '+m[1]);
  assert.ok(html.includes(m[1].split(' (')[0].split(',')[0]) && html.includes(f.percentComplete+'%'),'live percent for '+m[1]);
 }
 assert.ok(!/100% working/i.test(html),'no flat "100% working" claim');
}
// "Checks confirmed working": generated from testing-status.json checksConfirmed, so every entry must be on the page, point at a real feature row, and keep its limits.
if(d.checksConfirmed){
 const cc=d.checksConfirmed;
 const start=html.indexOf('<!--CHECKS-CONFIRMED-->'), end=html.indexOf('<!--/CHECKS-CONFIRMED-->');
 assert.ok(start>0&&end>start,'Checks confirmed working section is on the page');
 const block=html.slice(start,end);
 assert.ok(block.includes('id="checks-confirmed-title">'+cc.title+'</h3>'),'section heading');
 assert.ok(/href="#checks-confirmed"/.test(html.slice(0,start)),'the section is linked from the page top (hero buttons and the works-today box)');
 const total=cc.lists.reduce((a,l)=>a+l.entries.length,0);
 assert.equal((block.match(/<li class="cc-item"/g)||[]).length,total,'one list item per entry');
 assert.deepEqual(cc.lists.map(l=>l.id),['both','alone','phones'],'the three lists, in order');
 const WHEN=/^[A-Z][a-z]{2} \d{1,2}, \d{4}, (about )?\d{1,2}:\d{2}( (AM|PM))?( to \d{1,2}:\d{2} (AM|PM))? Eastern( \([^)]*\))?$/;
 const seen=new Set();
 for(const l of cc.lists) {
  assert.ok(block.includes('id="checks-'+l.id+'"')&&block.includes(l.title.replace(/&/g,'&amp;')),'list '+l.id);
  for(const e of l.entries) {
   assert.ok(!seen.has(e.id)&&/^[a-z0-9-]+$/.test(e.id),'unique slug '+e.id); seen.add(e.id);
   const f=d.features.find(x=>x.name===e.feature); assert.ok(f,'entry names a real feature: '+e.id);
   assert.match(e.when,WHEN,'date AND Eastern time on '+e.id);
   for(const k of ['check','build','device','notCovered','sound']) assert.ok(String(e[k]||'').trim(),k+' on '+e.id);
   const li=block.slice(block.indexOf('id="check-'+e.id+'"'));
   const li1=li.slice(0,li.indexOf('</li>'));
   assert.ok(li1.includes('Row score today: '+f.percentComplete+'%'),'live row score on '+e.id);
   const m=/<dt>Feature row<\/dt><dd><a href="#([^"]+)">/.exec(li1); assert.ok(m&&html.includes('<tr id="'+m[1]+'" class="feat'),'link goes to the feature row: '+e.id);
   for(const q of e.recordQuotes||[]) assert.ok(JSON.stringify(f).includes(JSON.stringify(q).slice(1,-1)),'record quote still present: '+e.id);
  }
 }
 // public-safety scan of the section
 assert.ok(!/(?:^|[^0-9])(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}/.test(block),'no private IP addresses');
 assert.ok(!/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(block),'no e-mail addresses');
 assert.ok(!/kid-safe|100% working|Google Play/i.test(block),'no forbidden wording');
 assert.ok(!/\$\d|price/i.test(block),'no prices');
}
// "How close are Windows and Android to 100%?" and "What works, platform by platform": generated from platformProgress / platformMatrix.
{
 const PP=require('../site-data/platform-progress.js'), PM=require('../site-data/platform-matrix.js');
 const section=(a,b)=>{const s=html.indexOf(a),e=html.indexOf(b);assert.ok(s>0&&e>s,'section markers '+a);return html.slice(s,e);};
 const featIdx=html.indexOf('id="features"'), keyIdx=html.indexOf('Colour key');
 const privacy=(txt,label)=>{
  assert.ok(!/(?:^|[^0-9])(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}/.test(txt),label+': no private IP addresses');
  assert.ok(!/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(txt),label+': no e-mail addresses');
  assert.ok(!/kid-safe|100% working|dlink|IMEI|serial number|\bS25\b|PLACEHOLDER|TODO|issue #|SITE-LINE|jsdom|\bgate\b/i.test(txt),label+': forbidden or internal wording');
  assert.ok(!/\$\d|\bprice/i.test(txt),label+': no prices');
  assert.ok(!/DESKTOP-[A-Z0-9]/.test(txt),label+': no PC host names');
 };
 const tierOf=p=>p>=100?'ready':p>=90?'almost':'building';
 // ---- progress section
 const pp=d.platformProgress;
 assert.ok(pp,'platformProgress data');
 const R=PP.compute(d); assert.deepEqual(R.problems,[],'platformProgress problems');
 const pb=section('<!--PLATFORM-PROGRESS-->','<!--/PLATFORM-PROGRESS-->');
 assert.ok(html.indexOf('<!--PLATFORM-PROGRESS-->')<keyIdx && html.indexOf('<!--PLATFORM-PROGRESS-->')<featIdx,'progress section sits before the colour key and the feature tables');
 assert.ok(html.indexOf('<!--PLATFORM-PROGRESS-->')<html.indexOf('class="evidence-hero"')+1000000,'progress section present');
 assert.ok(pb.includes('id="platform-progress-title">'+pp.title+'</h2>'),'progress heading');
 assert.match(pp.updatedEastern,/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) Eastern$/,'progress stamp has date and Eastern time');
 assert.ok(pb.includes(pp.updatedEastern),'progress stamp is shown');
 assert.equal(pp.platforms.length,2);
 for(const p of pp.platforms){
  const list=d.features.filter(f=>f.group===p.group && !/^Retired/i.test(f.status||''));
  const n={ready:0,almost:0,building:0}; for(const f of list) n[tierOf(f.percentComplete)]++;
  const total=list.length, is=k=>k===1?'is':'are';
  const sentence=p.name+': '+n.ready+' of '+total+' features '+is(n.ready)+' fully confirmed (Ready); '+n.almost+' more '+is(n.almost)+' almost there (90 to 98%); '+n.building+' '+is(n.building)+' earlier on (below 90%).';
  assert.ok(pb.includes('<p class="pp-sentence"><strong>'+sentence+'</strong></p>'),'sentence counts equal the data for '+p.name+': '+sentence);
  assert.ok(pb.includes('aria-label="'+p.name+': '+n.ready+' Ready, '+n.almost+' almost there, '+n.building+' earlier on, out of '+total+' features."'),'bar aria-label for '+p.name);
  const card=pb.slice(pb.indexOf('id="platform-'+p.id+'"'));
  const card1=card.slice(0,card.indexOf('</article>'));
  // every feature of the group is listed exactly once, in its own tier list, and links to a real row
  const links=[...card1.matchAll(/<li><a href="#([^"]+)">([^<]*)<\/a> <span class="pp-pct">(\d+)%<\/span>/g)];
  assert.equal(links.length,total,'every counted feature is listed once for '+p.name);
  for(const m of links){ const f=list.find(x=>x.name===m[2].replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")); assert.ok(f,'listed feature exists: '+m[2]); assert.equal(Number(m[3]),f.percentComplete,'listed percent is live: '+f.name); assert.ok(html.includes('<tr id="'+m[1]+'" class="feat'),'link goes to the feature row: '+f.name); }
  for(const f of list.filter(x=>tierOf(x.percentComplete)==='almost')) assert.ok(p.almostNeeds.some(x=>x.feature===f.name&&x.need.length<=PP.NEED_MAX),'plain line for '+f.name);
  assert.ok(p.blockers.length>=3&&p.blockers.length<=5,'3 to 5 blockers for '+p.name);
  const open=list.reduce((a,f)=>a+(Number(f.openIssues)||0),0);
  assert.ok(card1.includes(open+' known problems are open across '+list.filter(f=>f.openIssues>0).length+' of the '+total),'open-problem count equals the data for '+p.name);
 }
 assert.ok(pb.includes('not on Google Play yet'),'the test-download note is shown');
 privacy(pb.replace(/Google Play/g,'GP'),'progress section');
 assert.ok(!/\b(tier|row|merged|jsdom|gate)\b/i.test(pb.replace(/<[^>]+>/g,' ').replace(/Home layouts and Customize layout[^<]*/g,'')),'no jargon words in the progress section');
 // ---- matrix section
 const m=d.platformMatrix; assert.ok(m,'platformMatrix data');
 const M=PM.compute(d); assert.deepEqual(M.problems,[],'platformMatrix problems');
 const mb=section('<!--PLATFORM-MATRIX-->','<!--/PLATFORM-MATRIX-->');
 assert.ok(html.indexOf('<!--PLATFORM-MATRIX-->')>html.indexOf('<!--/PLATFORM-PROGRESS-->')&&html.indexOf('<!--PLATFORM-MATRIX-->')<keyIdx&&html.indexOf('<!--PLATFORM-MATRIX-->')<featIdx,'matrix follows the progress section, before the colour key');
 assert.equal((mb.match(/class="pm-cell pm-s-/g)||[]).length,M.rows.length*M.columns.length,'one box per row and platform');
 assert.equal(M.columns.length,6); assert.deepEqual(M.columns.map(c=>c.id),['win','and','tv','web','auto','ios']);
 const cnt={works:0,mostly:0,fails:0,untested:0,na:0};
 for(const r of m.rows) for(const c of M.columns){ const cell=r.cells[c.id]; cnt[cell.state]++;
  const sym=PM.STATES[cell.state].symbol, word=cell.word||PM.STATES[cell.state].word;
  assert.ok(mb.includes('data-pm="pm-d-'+r.id+'-'+c.id+'"'),'box exists '+r.id+'/'+c.id);
  assert.ok(mb.includes('<span class="pm-sym" aria-hidden="true">'+sym+'</span><span class="pm-word">'+word+'</span>'),'symbol and word on '+r.id+'/'+c.id);
  const li=mb.slice(mb.indexOf('id="pm-d-'+r.id+'-'+c.id+'"')); const li1=li.slice(0,li.indexOf('</li>'));
  assert.ok(li1.length>50,'full detail listed under the table for '+r.id+'/'+c.id);
  if(cell.state==='works'){ assert.ok(/Eastern/.test(li1)&&/\d{1,2}:\d{2}/.test(li1),'tick has a dated record: '+r.id+'/'+c.id);
   for(const n of cell.rows) { const f=d.features.find(x=>x.name===n); assert.ok(f.percentComplete>=100&&!(f.openIssues>0),'tick maps only to Ready rows without open issues: '+r.id+'/'+c.id); } }
  if(cell.state==='mostly'||cell.state==='fails'){ assert.ok(li1.includes('<dt>Still open</dt>')&&li1.includes('<dt>Result</dt>'),'reason and open problem named: '+r.id+'/'+c.id); assert.ok(/Eastern/.test(li1),'dated: '+r.id+'/'+c.id); }
  if(cell.state==='untested'||cell.state==='na') assert.ok(li1.includes('<dt>Result</dt>'),'reason given: '+r.id+'/'+c.id);
 }
 assert.deepEqual(cnt,M.counts,'counts');
 const applicable=cnt.works+cnt.mostly+cnt.fails+cnt.untested;
 assert.ok(mb.includes(cnt.works+' of the '+applicable+' boxes that apply say Works, '+cnt.mostly+' say Mostly works, '+cnt.fails+' say Does not work and '+cnt.untested+' say Not tested yet. '+cnt.na+' boxes do not apply or are not available yet.'),'summary sentence matches the boxes');
 assert.ok(mb.includes('The owner also tried an old Samsung Galaxy S3 (released 2012). Beebo did not work on it, and other major websites did not work on it either, so we consider phones that old too old for any modern app. Beebo needs Android 7.0 or newer.'),'Galaxy S3 note is shown exactly');
 assert.ok(mb.includes('Owner’s own test; exact date not recorded.'),'owner-test label');
 assert.ok(!/repeated|again tried|tested again/i.test(m.oldPhone.text),'the S3 test is not claimed to be repeated');
 assert.ok(!('dateNote_DATA_ONLY' in m.oldPhone)&&!/PLACEHOLDER|TODO/i.test(JSON.stringify([d.platformProgress,d.platformMatrix])),'no placeholder text in the public JSON');
 assert.ok(mb.includes('did not work in our last test (Oct 26, 2026, build 0.1.102)')&&mb.includes('Newer builds were not retested'),'Jellyfin cross states its age');
 assert.ok(/id="pm-pop"/.test(mb)&&html.includes('/assets/platform-matrix.js'),'pop-up panel and its script');
 privacy(mb,'matrix section');
 for(const f of ['Samsung Galaxy S24 Ultra','Google Pixel 3','Samsung Galaxy S9+','i7-4790K','Core Ultra 7 270K Plus']) assert.ok(mb.includes(f),'device spec shown: '+f);
 // links from the page top and the works-today box
 const top=html.slice(0,html.indexOf('<!--PLATFORM-PROGRESS-->'));
 assert.ok(/href="#platform-progress"/.test(top)&&/href="#platform-matrix"/.test(top),'both sections are linked from the page top');
 // home page callout
 const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const cs=idx.slice(idx.indexOf('id="wwo-platforms-title"'),idx.indexOf('</aside>',idx.indexOf('id="wwo-platforms-title"')));
 for(const c of R.platforms) assert.ok(cs.includes('<strong>'+c.name+':</strong> '+c.ready.length+' of '+c.stats.total+' features Ready (100%), '+c.almost.length+' almost there (90 to 98%), '+c.building.length+' earlier on (below 90%).'),'home callout counts: '+c.name);
 assert.ok(cs.includes('release-evidence.html#platform-progress'),'home callout links to the section');
 privacy(cs.replace(/Google Play/g,'GP'),'home callout');
 // section stamps must be real Eastern times: not in the future, and not before the newest evidence stamp they count
 {
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const toMs=s=>{const x=/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}) (AM|PM) Eastern$/.exec(s); assert.ok(x,'stamp format: '+s);
   const mo=MON.indexOf(x[1]), day=+x[2], dst=(mo>2&&mo<10)||(mo===2&&day>=8)||(mo===10&&day<=1);
   return Date.UTC(+x[3],mo,day,(+x[4]%12)+(x[6]==='PM'?12:0),+x[5])+(dst?4:5)*3600000;};
  const now=Date.now(), evidenceMs=toMs(d.updatedEastern);
  for(const [label,s] of [['platformProgress',d.platformProgress.updatedEastern],['platformMatrix',d.platformMatrix.updatedEastern]]){
   assert.ok(toMs(s)<=now+60000,label+' stamp is not in the future (real Eastern time): '+s);
   assert.ok(toMs(s)>=evidenceMs,label+' stamp is not earlier than the evidence it counts ('+d.updatedEastern+'): '+s);
  }
 }
 // the page-wide stamp is untouched by this work
 assert.ok(/<strong>Site last updated:<\/strong> <time datetime="[^"]+">/.test(html),'page stamp present');
}
console.log('PASS: tier boundaries, open-issue cap, Ready weight, generated rows, labels and the single colour-key filter');
