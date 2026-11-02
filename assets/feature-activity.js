/* Public checkpoint activity. Readiness scores are deliberately outside this module. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) { root.BeeboFeatureActivity = api; api.mount(root); }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const NEXT = Object.freeze({ implementation: 'Continue implementation and fixes.', review: 'Independent review is next.', device: 'A scoped device check is next.', world: 'Real-world checks remain.', acceptance: 'Final acceptance remains.', followup: 'Resolve the recorded follow-up.', waiting: 'Waiting for the next confirmed checkpoint.', none: 'This work step is complete; readiness is shown separately.' });
  const SCOPE = Object.freeze({ feature: 'Feature work', 'website-pages': 'Website feature pages', 'phone-check': 'Phone checks', 'source-review': 'Source review', 'automated-check': 'Automated checks' });
  const STATES = ['running', 'waiting', 'blocked', 'complete', 'unknown'];
  const STAGES = ['coding', 'review', 'testing'];
  const DEVICES = ['none', 'phone', 'tablet', 'computer', 'tv', 'browser'];
  const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/;
  const fields = ['featureId', 'revision', 'state', 'stage', 'scope', 'deviceClass', 'startedAt', 'updatedAt', 'expiresAt', 'nextAction'];
  const own = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
  const time = s => typeof s === 'string' && ISO.test(s) && Number.isFinite(Date.parse(s));
  function validateFeed(feed, ids, now = Date.now()) {
    if (!own(feed, ['schemaVersion', 'updatedAt', 'features']) || feed.schemaVersion !== 1 || !time(feed.updatedAt) || Date.parse(feed.updatedAt) > now || !Array.isArray(feed.features) || feed.features.length > ids.size) return false;
    const seen = new Set();
    return feed.features.every(r => {
      if (!own(r, fields) || !ids.has(r.featureId) || seen.has(r.featureId) || !Number.isSafeInteger(r.revision) || r.revision < 1 || !STATES.includes(r.state) || !STAGES.includes(r.stage) || !DEVICES.includes(r.deviceClass) || !Object.hasOwn(NEXT, r.nextAction) || !Object.hasOwn(SCOPE, r.scope)) return false;
      seen.add(r.featureId);
      if (![r.updatedAt, r.expiresAt].every(time) || (r.startedAt !== null && !time(r.startedAt))) return false;
      const updated = Date.parse(r.updatedAt), expiry = Date.parse(r.expiresAt);
      if (updated > Date.parse(feed.updatedAt) || expiry <= updated || expiry - updated > 3600000 || (r.startedAt !== null && Date.parse(r.startedAt) > updated)) return false;
      if (r.state === 'running' && r.startedAt === null) return false;
      if (r.deviceClass !== 'none' && r.stage !== 'testing') return false;
      if (r.scope === 'phone-check' && (r.stage !== 'testing' || r.deviceClass !== 'phone')) return false;
      return true;
    });
  }
  function eastern(stamp) {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset' }).format(new Date(stamp)) + ' (Eastern)';
  }
  function label(r) {
    if (r.state === 'waiting') return 'Waiting';
    if (r.state === 'blocked') return 'Blocked';
    if (r.state === 'complete') return 'Work step complete';
    if (r.state === 'unknown') return 'Activity not verified';
    if (r.stage === 'testing' && r.deviceClass === 'phone') return 'Testing on a phone';
    return { coding: 'Implementation in progress', review: 'Review in progress', testing: 'Testing in progress' }[r.stage];
  }
  function mount(w) {
    const nodes = [...w.document.querySelectorAll('[data-live-feature]')];
    if (!nodes.length || !w.fetch || !w.AbortController) return null;
    let declared;
    try { declared = JSON.parse(w.document.getElementById('feature-activity-ids').textContent); } catch (_) { return null; }
    if (!Array.isArray(declared) || declared.length > 500 || declared.some(id => typeof id !== 'string' || !/^feature-[a-z0-9-]+$/.test(id))) return null;
    const ids = new Set(declared);
    if (nodes.some(n => !ids.has(n.dataset.liveFeature))) return null;
    const rows = new Map(), seen = new Map();
    let latest = -Infinity, available = false, stopped = false, generation = 0, inflight = null, pollTimer, expiryTimer, failures = 0, lastAttempt = -Infinity;
    const now = () => w.Date.now();
    function render() {
      w.clearTimeout(expiryTimer);
      let nextExpiry = Infinity;
      for (const node of nodes) {
        const r = rows.get(node.dataset.liveFeature);
        const fresh = available && r && now() < Date.parse(r.expiresAt) && now() >= Date.parse(r.updatedAt);
        node.dataset.liveState = fresh ? r.state : 'unknown';
        node.querySelector('[data-live-label]').textContent = fresh ? label(r) : 'Activity not verified';
        node.querySelector('[data-live-scope]').textContent = fresh ? SCOPE[r.scope] : (r ? 'Last confirmation is stale or unavailable.' : 'No current confirmation.');
        node.querySelector('[data-live-next]').textContent = r ? NEXT[r.nextAction] : NEXT.waiting;
        node.querySelector('[data-live-time]').textContent = r ? 'Last confirmed: ' + eastern(r.updatedAt) : 'Last confirmed: not recorded.';
        node.querySelector('[data-live-start]').textContent = r && r.startedAt ? 'Work step started: ' + eastern(r.startedAt) : '';
        if (fresh) nextExpiry = Math.min(nextExpiry, Date.parse(r.expiresAt));
      }
      if (!stopped && !w.document.hidden && Number.isFinite(nextExpiry)) expiryTimer = w.setTimeout(render, Math.max(1, nextExpiry - now()));
    }
    function accept(feed) {
      if (!validateFeed(feed, ids, now()) || Date.parse(feed.updatedAt) < latest) return false;
      // Validate the whole response before changing any visible record. Equal revisions are immutable.
      for (const r of feed.features) {
        const prior = seen.get(r.featureId);
        if (prior && (r.revision < prior.revision || (r.revision === prior.revision && JSON.stringify(r) !== JSON.stringify(prior)))) return false;
      }
      latest = Date.parse(feed.updatedAt);
      rows.clear();
      for (const r of feed.features) { rows.set(r.featureId, r); seen.set(r.featureId, r); }
      available = true; render(); return true;
    }
    function schedule() {
      w.clearTimeout(pollTimer);
      if (!stopped && !w.document.hidden) pollTimer = w.setTimeout(check, Math.min(1800000, 300000 * 2 ** failures));
    }
    async function check() {
      if (stopped || w.document.hidden || inflight) return;
      const ticket = ++generation, controller = new w.AbortController();
      inflight = controller; lastAttempt = now();
      const timeout = w.setTimeout(() => controller.abort(), 10000);
      try {
        const response = await w.fetch('/site-data/feature-activity.json', { cache: 'no-cache', credentials: 'omit', signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw Error('Activity unavailable');
        const body = await response.text();
        if (ticket !== generation || stopped || w.document.hidden) return;
        if (body.length > 262144 || !accept(JSON.parse(body))) throw Error('Activity invalid');
        failures = 0;
      } catch (_) {
        if (ticket === generation && !stopped) { available = false; failures = Math.min(3, failures + 1); render(); }
      } finally {
        w.clearTimeout(timeout);
        if (ticket === generation) { inflight = null; schedule(); }
      }
    }
    function hide() { ++generation; if (inflight) inflight.abort(); inflight = null; w.clearTimeout(pollTimer); w.clearTimeout(expiryTimer); }
    function visibility() {
      if (w.document.hidden) { hide(); return; }
      render();
      // Rapid tab switches do not bypass the cache/backoff budget.
      if (now() - lastAttempt >= 300000) check(); else schedule();
    }
    function stop() { stopped = true; hide(); }
    w.document.addEventListener('visibilitychange', visibility);
    w.addEventListener('pagehide', stop);
    w.addEventListener('pageshow', e => { if (e.persisted) { stopped = false; visibility(); } });
    render(); check();
    return { check, accept, render, stop };
  }
  return { NEXT, SCOPE, validateFeed, eastern, mount };
});
