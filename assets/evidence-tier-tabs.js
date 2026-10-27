/* Progressive enhancement: without JavaScript all feature rows remain visible. */
(() => {
 const list=document.querySelector('.tier-tabs'), panel=document.getElementById('tier-results');
 if(!list||!panel)return;
 const tabs=[...list.querySelectorAll('[role="tab"]')];
 const rows=[...panel.querySelectorAll('tbody.feature-entry')];
 function select(tab,focus=false){
  tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});
  panel.setAttribute('aria-labelledby',tab.id);
  let count=0;
  rows.forEach(r=>{r.hidden=tab.dataset.tier!=='all'&&r.dataset.tier!==tab.dataset.tier;if(!r.hidden)count++;});
  panel.querySelectorAll('.feature-group').forEach(g=>{g.hidden=![...g.querySelectorAll('tbody.feature-entry')].some(r=>!r.hidden);});
  panel.querySelector('.tier-result-count').textContent=count?'Showing '+count+' of '+rows.length+' features.':'No features in this tier yet.';
  if(focus)tab.focus();
 }
 list.addEventListener('click',e=>{const tab=e.target.closest('[role="tab"]');if(tab&&list.contains(tab))select(tab);});
 list.addEventListener('keydown',e=>{const i=tabs.indexOf(document.activeElement);if(i<0)return;let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();select(tabs[next],true);});
 list.hidden=false;
 select(tabs[0]);
})();

/* Colour key: each chip is a button that lists the features of that tier right below the key.
   The lists are generated with the page (same tier source as the row colours); this script only shows or hides them.
   Without JavaScript the chips stay readable text and every feature row is already visible lower on the page. */
(() => {
 const legend=document.querySelector('.status-legend'), panel=document.getElementById('tier-key-panel');
 const chips=[...document.querySelectorAll('[data-tier-chip]')], data=document.querySelector('.tier-key-data');
 if(!legend||!panel||!chips.length||!data)return;
 let current=null;
 function close(focusChip){
  const was=current;
  current=null;
  chips.forEach(c=>c.setAttribute('aria-pressed','false'));
  panel.textContent='';
  panel.classList.remove('is-open');
  if(focusChip&&was)was.focus();
 }
 function open(chip){
  const id=chip.dataset.tierChip, src=data.querySelector('[data-tier-list="'+id+'"]');
  if(!src)return;
  current=chip;
  chips.forEach(c=>c.setAttribute('aria-pressed',String(c===chip)));
  const n=Number(src.dataset.count)||0;
  panel.textContent='';
  panel.className='tier-key-panel is-open tier-key-'+id;
  const head=document.createElement('div');head.className='tier-key-head';
  const h=document.createElement('h3');h.className='tier-key-title';
  h.textContent=chip.dataset.heading+': '+n+(n===1?' feature':' features');
  const close_=document.createElement('button');close_.type='button';close_.className='tier-key-close';close_.textContent='Show all (close list)';
  close_.addEventListener('click',()=>close(true));
  head.append(h,close_);
  panel.append(head);
  if(n){panel.append(src.cloneNode(true));}
  else{const p=document.createElement('p');p.className='tier-key-empty';p.textContent='No features in this tier yet.';panel.append(p);}
 }
 chips.forEach(c=>c.addEventListener('click',()=>{if(current===c)close(false);else open(c);}));
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&current)close(true);});
 legend.addEventListener('keydown',e=>{if(e.key==='Escape'&&current){e.preventDefault();close(true);}});
 // A feature link must land on a visible row: if the tier filter below is hiding it, switch the filter to All first.
 panel.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');if(!a)return;
  const row=document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
  const entry=row&&row.closest('tbody.feature-entry');
  const all=document.getElementById('tier-tab-all');
  if(entry&&all&&(entry.hidden||entry.closest('[hidden]')))all.click();
 });
 chips.forEach(c=>{c.disabled=false;});
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
