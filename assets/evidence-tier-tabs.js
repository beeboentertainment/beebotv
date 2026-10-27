/* Colour key and tier filter: ONE set of chips ("All features" plus one chip per tier).
   A tier chip does two things at once: it lists that tier's features right under the key, and it hides every other tier's rows in the feature tables below
   (so the "Showing N of 70 features" line stays true). "All features", the same chip pressed again, or "Show all (close list)" clears both.
   The lists and the row tiers are generated with the page from the same tier source as the row colours; this script only shows or hides them.
   Without JavaScript the chips stay readable text (disabled) and every feature row is already visible lower on the page. */
(() => {
 const legend=document.querySelector('.status-legend'), panel=document.getElementById('tier-key-panel'), results=document.getElementById('tier-results');
 const chips=[...document.querySelectorAll('[data-tier-chip]')], data=document.querySelector('.tier-key-data');
 const status=legend&&legend.querySelector('.tier-result-count');
 if(!legend||!panel||!results||!chips.length||!data||!status)return;
 const allChip=chips.find(c=>c.dataset.tierChip==='all');
 const rows=[...results.querySelectorAll('tbody.feature-entry')];
 let current=null;
 function setPressed(active){chips.forEach(c=>c.setAttribute('aria-pressed',String(active?c===active:c===allChip)));}
 function filterRows(id){
  let count=0;
  rows.forEach(r=>{r.hidden=id!=='all'&&r.dataset.tier!==id;if(!r.hidden)count++;});
  results.querySelectorAll('.feature-group').forEach(g=>{g.hidden=![...g.querySelectorAll('tbody.feature-entry')].some(r=>!r.hidden);});
  status.textContent=count?(id==='all'?'Showing all '+rows.length+' features.':'Showing '+count+' of '+rows.length+' features.'):'No features in this tier yet.';
 }
 function clear(focusChip){
  const was=current;
  current=null;
  setPressed(null);
  filterRows('all');
  panel.textContent='';
  panel.className='tier-key-panel';
  if(focusChip&&was)was.focus();
 }
 function select(chip){
  const id=chip.dataset.tierChip, src=data.querySelector('[data-tier-list="'+id+'"]');
  if(!src)return;
  current=chip;
  setPressed(chip);
  filterRows(id);
  const n=Number(src.dataset.count)||0;
  panel.textContent='';
  panel.className='tier-key-panel is-open tier-key-'+id;
  const head=document.createElement('div');head.className='tier-key-head';
  const h=document.createElement('h3');h.className='tier-key-title';
  h.textContent=chip.dataset.heading+': '+n+(n===1?' feature':' features');
  const close_=document.createElement('button');close_.type='button';close_.className='tier-key-close';close_.textContent='Show all (close list)';
  close_.addEventListener('click',()=>clear(true));
  head.append(h,close_);
  panel.append(head);
  if(n){panel.append(src.cloneNode(true));}
  else{const p=document.createElement('p');p.className='tier-key-empty';p.textContent='No features in this tier yet.';panel.append(p);}
 }
 chips.forEach(c=>c.addEventListener('click',()=>{if(c===allChip||current===c)clear(false);else select(c);}));
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&current)clear(true);});
 legend.addEventListener('keydown',e=>{if(e.key==='Escape'&&current){e.preventDefault();clear(true);}});
 // A link to a feature row must land on a visible row: if the tier filter is hiding it, show every feature first.
 function revealTarget(hash){
  if(!current||!hash||hash.length<2)return;
  let el=null;try{el=document.getElementById(decodeURIComponent(hash.slice(1)));}catch(_e){return;}
  const entry=el&&el.closest('tbody.feature-entry');
  if(entry&&entry.hidden)clear(false);
 }
 document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href^="#"]');if(a)revealTarget(a.getAttribute('href'));});
 window.addEventListener('hashchange',()=>revealTarget(location.hash));
 // Tiers with no features stay visible but disabled ("none right now").
 chips.forEach(c=>{c.disabled=c.classList.contains('is-empty');});
 setPressed(null);
 legend.classList.add('is-interactive');
})();

/* Pause the shine animation of the key chips and the Ready banner while they are off screen. */
(() => {
 if(!('IntersectionObserver' in window))return;
 const hosts=[...document.querySelectorAll('.ready-banner,.tier-chip.tier-gold,.tier-chip.tier-purple')];
 if(!hosts.length)return;
 const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('glit-paused',!e.isIntersecting)));
 hosts.forEach(h=>io.observe(h));
})();

/* "Show all notes" / "Hide all notes": one button above each feature table opens or closes every "Test history and notes" details in that table.
   Without JavaScript the buttons stay hidden and each details still opens by itself (native details/summary). */
(() => {
 document.querySelectorAll('.feature-group').forEach(g=>{
  const bar=g.querySelector('.notes-toolbar'), btn=bar&&bar.querySelector('.notes-toggle');
  const ds=[...g.querySelectorAll('details.test-history')];
  if(!btn||!ds.length)return;
  const sync=()=>{const all=ds.every(d=>d.open);btn.setAttribute('aria-expanded',String(all));btn.textContent=all?'Hide all notes':'Show all notes';};
  btn.addEventListener('click',()=>{const open=btn.getAttribute('aria-expanded')!=='true';ds.forEach(d=>{d.open=open;});sync();});
  ds.forEach(d=>d.addEventListener('toggle',sync));
  bar.hidden=false;
  sync();
 });
})();
