(() => {
  'use strict';

  const sources = {
    windows: '/desktop-version.json',
    android: '/downloads/app-build.json',
    auto: '/downloads/auto-build.json',
  };

  function release(data, kind) {
    const desktop = kind === 'windows';
    const version = desktop ? data.version : data.versionName;
    const bytes = desktop ? data.size : data.bytes;
    if (typeof version !== 'string' || !/^[0-9][0-9A-Za-z.+-]{0,48}$/.test(version)
      || (!desktop && (!Number.isSafeInteger(data.versionCode) || data.versionCode < 1))
      || !Number.isSafeInteger(bytes) || bytes < 1
      || typeof data.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(data.sha256)
      || typeof data.publishedAtUtc !== 'string' || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(data.publishedAtUtc)
      || !Number.isFinite(Date.parse(data.publishedAtUtc))
      || typeof data.publishedAtEastern !== 'string' || !data.publishedAtEastern.endsWith(' Eastern')
      || data.publishedAtEastern.length > 100 || /[<>\x00-\x1f]/.test(data.publishedAtEastern)
      || typeof data.url !== 'string') throw new Error('Incomplete release details');
    const url = new URL(data.url, location.origin);
    const expectedApk = kind === 'android' ? '/downloads/BeeboEntertainment.apk' : '/downloads/BeeboAuto.apk';
    const allowed = desktop
      ? url.protocol === 'https:' && url.hostname === 'github.com' && !url.port
        && url.pathname.startsWith('/beeboentertainment/beebotv/releases/download/') && url.pathname.endsWith('.exe')
      : url.origin === location.origin && url.pathname === expectedApk;
    if (!allowed || url.username || url.password || url.search || url.hash) throw new Error('Unexpected download location');
    return {
      version: desktop ? version : `${version} (build ${data.versionCode})`,
      bytes: `${bytes.toLocaleString('en-US')} bytes`,
      hash: data.sha256,
      published: data.publishedAtEastern,
      utc: data.publishedAtUtc,
      url: data.url,
    };
  }

  async function refresh(card) {
    const kind = card.dataset.release;
    const field = name => card.querySelector(`[data-field="${name}"]`);
    const message = field('feed-message');
    const retry = field('retry');
    retry.hidden = true;
    message.textContent = 'Checking the release details…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(sources[kind], {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('Release feed unavailable');
      const details = release(await response.json(), kind);
      for (const name of ['version', 'bytes', 'hash', 'published', 'utc']) field(name).textContent = details[name];
      field('published').dateTime = details.utc;
      field('utc').dateTime = details.utc;
      field('download').setAttribute('href', details.url);
      card.removeAttribute('data-feed-error');
      message.textContent = 'Release details checked against the download feed.';
    } catch {
      card.setAttribute('data-feed-error', 'true');
      message.textContent = 'We could not check the release feed. The details shown may be out of date. Please check again before downloading.';
      retry.hidden = false;
    } finally {
      clearTimeout(timer);
    }
  }

  document.querySelectorAll('[data-release]').forEach(card => {
    if (!Object.hasOwn(sources, card.dataset.release)) return;
    card.querySelector('[data-field="retry"]').addEventListener('click', () => refresh(card));
    refresh(card);
  });
})();
