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
