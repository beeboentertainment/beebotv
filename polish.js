(()=>{const toggle=document.querySelector('.pro-menu'),nav=document.querySelector('#pro-navigation');if(toggle&&nav){const close=()=>{toggle.setAttribute('aria-expanded','false');nav.classList.remove('is-open')};toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});nav.addEventListener('click',e=>{if(e.target.closest('a'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){close();toggle.focus()}})}const input=document.querySelector('#guide-search');if(!input)return;const cards=[...document.querySelectorAll('.help-card')],filters=[...document.querySelectorAll('[data-category]')];let category='all';function refresh(){const words=input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);let count=0;cards.forEach(card=>{const text=(card.textContent+' '+card.dataset.search).toLocaleLowerCase();const match=(category==='all'||card.dataset.guideCategory===category)&&words.every(w=>text.includes(w));card.hidden=!match;if(match)count++});document.querySelector('#guide-count').textContent=count+' '+(count===1?'guide':'guides')+(input.value.trim()?' matching your search':'');document.querySelector('#guide-empty').hidden=count!==0}input.addEventListener('input',refresh);filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.category;filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));refresh()}));document.querySelector('#reset-guides').addEventListener('click',()=>{category='all';input.value='';filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category==='all')));refresh();input.focus()})})();

/* Release labels follow the existing update feeds. No visitor information is sent. */
(() => {
  const dates = new Intl.DateTimeFormat('en-US', {timeZone:'America/Toronto',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});
  const get = async url => { const r = await fetch(url, {cache:'no-store'}); if(!r.ok) throw new Error('Release information unavailable'); return r.json(); };
  const state = {};
  function show(platform, version, code, stamp, released) {
    if (!version) return;
    state[platform] = version;
    document.querySelectorAll('[data-beebo-release-version="'+platform+'"]').forEach(el => {el.textContent = version + (platform==='android' && code ? ' (build '+code+')' : '');});
    document.querySelectorAll('[data-beebo-release-date="'+platform+'"]').forEach(el => {
      const date = new Date(stamp);
      if(!stamp || !Number.isFinite(date.getTime())) {el.textContent='Release time unavailable';el.removeAttribute('datetime');return;}
      el.dateTime=date.toISOString();el.textContent=(released?'Released ':'Built ')+dates.format(date)+' Eastern';
    });
    if(state.windows && state.android) document.querySelectorAll('[data-beebo-release-headline]').forEach(el => {el.textContent='Windows '+state.windows+' · Android '+state.android;});
  }
  function updateDownload(platform, raw) {
    if (!raw) return;
    try {
      const url = new URL(raw, location.href);
      const extension = platform === 'android' ? '.apk' : '.exe';
      const ownHost = url.origin === location.origin && url.pathname.startsWith('/downloads/');
      const githubRelease = platform === 'windows' && url.origin === 'https://github.com' && ['/SWGfan/beebotv/releases/download/', '/beeboentertainment/beebotv/releases/download/'].some(prefix => url.pathname.startsWith(prefix));
      if (!(ownHost || githubRelease) || !url.pathname.endsWith(extension) || url.username || url.password) return;
      document.querySelectorAll('[data-beebo-download="'+platform+'"]').forEach(link => { link.href = url.href; });
    } catch (_) { /* Keep the verified embedded download link if metadata is invalid. */ }
  }
  get('/desktop-version.json').then(data => {
    show('windows',data.version,null,data.publishedAtUtc || data.releasedAt || data.publishedAt,true);
    updateDownload('windows',data.url);
  }).catch(() => {
    document.querySelectorAll('[data-beebo-release-date="windows"]').forEach(el=>{el.textContent+=' · last published details';});
  });
  get('/downloads/app-build.json').then(data => {
    show('android',data.versionName || data.version,data.versionCode,data.publishedAtUtc || data.builtAtUtc,Boolean(data.publishedAtUtc));
    updateDownload('android',data.url);
  }).catch(() => {
    document.querySelectorAll('[data-beebo-release-date="android"]').forEach(el=>{el.textContent+=' · last published details';});
  });
})();

/* A visible, keyboard-friendly way back to the beginning of a long guide. */
(() => {
  const top = document.getElementById('page-content') || document.getElementById('main') || document.body;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'beebo-back-to-top';
  button.setAttribute('aria-label', 'Back to top');
  button.title = 'Back to top';
  button.innerHTML = '<span aria-hidden="true">↑</span><span class="beebo-back-to-top-label">Top</span>';
  button.addEventListener('click', () => top.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  const update = () => button.classList.toggle('is-visible', window.scrollY > 420);
  window.addEventListener('scroll', update, { passive: true });
  update();
  document.body.append(button);
})();

/* Dated editorial credit. This is not an app release or a testing certification. */
(() => {
  const footer = document.querySelector('body > footer') || document.querySelector('footer');
  if (!footer || footer.querySelector('[data-beebo-update-credit]')) return;
  const credit = document.createElement('p');
  credit.setAttribute('data-beebo-update-credit', '');
  credit.style.cssText = "flex-basis:100%;margin:6px 0 0;font-size:.8rem;line-height:1.6";
  credit.append(document.createTextNode("Website update prepared with ChatGPT — GPT-6 Astra (Ultra reasoning)."), document.createElement('br'), document.createTextNode('Updated '));
  const timestamp = document.createElement('time');
  timestamp.dateTime = "2026-09-23T08:51:45Z";
  timestamp.textContent = "Sep 23, 2026, 4:51 AM Eastern";
  credit.append(timestamp, document.createTextNode('.'));
  footer.append(credit);
})();
