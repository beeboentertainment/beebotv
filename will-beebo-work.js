/* "Will Beebo work on your internet?" (will-beebo-work.html)
 *
 * Step 1, the quick check: asks three STUN servers on three different networks how
 * this computer looks from outside, and reads the answers: can it reach them at all,
 * does the router keep one public port per local socket, is there global IPv6, is
 * the public address in the shared (carrier-grade NAT) range.
 *
 * Step 2, the phone test: the computer opens a short-lived room in the Beebo Worker's
 * /rtc/probe/ mailbox and shows a QR code. The phone (on mobile data) joins, and the
 * two make a real WebRTC data-channel connection with STUN only, the same way
 * Beebo's away-from-home address connects. No relay exists, so if it connects it
 * connected directly. The computer then sends up to 20 MB for up to 8 seconds and
 * the phone reports what arrived.
 *
 * Only the offer and answer (which contain the two devices' addresses) pass through
 * the Worker. Nothing is stored in the browser.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var PC = window.RTCPeerConnection || window.webkitRTCPeerConnection;

  // The probe mailbox lives in the Beebo Worker. A local copy of the site can point
  // it at a local Worker with ?api=http://127.0.0.1:PORT (only on localhost).
  var API = 'https://beebo-licensing.nicholaswill86.workers.dev';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    var apiParam = new URLSearchParams(location.search).get('api');
    if (apiParam && /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(apiParam)) API = apiParam;
  }

  // Exactly what Beebo's own away-from-home connection uses: one STUN server and no
  // relay. STUN only tells each device how it looks from outside.
  var BEEBO_ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }];

  // The quick check needs servers on genuinely different addresses, or comparing
  // their answers proves nothing. Three companies, three networks (checked
  // September 2026: 162.159.207.0, 74.125.250.129, 46.225.95.169).
  var STUN = [
    { name: 'Cloudflare', url: 'stun:stun.cloudflare.com:3478' },
    { name: 'Google', url: 'stun:stun.l.google.com:19302' },
    { name: 'Nextcloud', url: 'stun:stun.nextcloud.com:3478' }
  ];
  var GATHER_MS = 6000;
  var SPEED_MAX_MS = 8000;
  var SPEED_MAX_BYTES = 20 * 1024 * 1024;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // Titles and paragraphs are this file's own copy; anything dynamic goes through esc().
  function verdictHtml(cls, kicker, title, paras) {
    var h = '<div class="verdict ' + cls + '">' + (kicker ? '<p class="kicker-line">' + kicker + '</p>' : '') + '<h3>' + title + '</h3>';
    for (var i = 0; i < paras.length; i++) if (paras[i]) h += '<p>' + paras[i] + '</p>';
    return h + '</div>';
  }
  function setStatus(el, text, busy) {
    el.innerHTML = (busy ? '<span class="spin" aria-hidden="true"></span>' : '') + esc(text);
  }

  // ---------------------------------------------------------------------------
  // Candidates
  // ---------------------------------------------------------------------------
  function parseCandidate(line) {
    var m = /candidate:(\S+) (\d+) (\S+) (\d+) (\S+) (\d+) typ (\S+)(.*)$/i.exec(line || '');
    if (!m) return null;
    var rest = m[8] || '';
    var ra = /\braddr (\S+)/.exec(rest), rp = /\brport (\d+)/.exec(rest), nid = /\bnetwork-id (\d+)/.exec(rest);
    return { protocol: m[3].toLowerCase(), address: m[5], port: +m[6], type: m[7].toLowerCase(), raddr: ra ? ra[1] : '', rport: rp ? +rp[1] : 0, networkId: nid ? nid[1] : '' };
  }
  function isV6(ip) { return String(ip).indexOf(':') !== -1; }
  function isGlobalV6(ip) { return isV6(ip) && /^[23][0-9a-f]{0,3}:/i.test(ip); }
  function inV4(ip, net, bits) {
    var a = String(ip).split('.'), b = net.split('.');
    if (a.length !== 4) return false;
    var x = ((+a[0] << 24) | (+a[1] << 16) | (+a[2] << 8) | +a[3]) >>> 0;
    var y = ((+b[0] << 24) | (+b[1] << 16) | (+b[2] << 8) | +b[3]) >>> 0;
    var mask = (0xffffffff << (32 - bits)) >>> 0;
    return ((x & mask) >>> 0) === ((y & mask) >>> 0);
  }
  function isCgnat(ip) { return !isV6(ip) && inV4(ip, '100.64.0.0', 10); }
  function srflxFromSdp(sdp) {
    var out = [];
    String(sdp || '').split(/\r?\n/).forEach(function (l) {
      if (l.indexOf('a=candidate:') !== 0) return;
      var c = parseCandidate(l.slice(2));
      if (c && c.type === 'srflx' && out.indexOf(c.address) === -1) out.push(c.address);
    });
    return out;
  }

  // Gather candidates from one RTCPeerConnection. No connection is ever made.
  function gather(urls, ms) {
    return new Promise(function (resolve) {
      var out = { cands: [], error: '' };
      var pc, finished = false;
      try { pc = new PC({ iceServers: [{ urls: urls }] }); } catch (e) { out.error = 'no-webrtc'; return resolve(out); }
      function finish() {
        if (finished) return;
        finished = true;
        try { pc.close(); } catch (e) {}
        resolve(out);
      }
      pc.onicecandidate = function (ev) {
        if (!ev.candidate) return finish();
        var c = parseCandidate(ev.candidate.candidate);
        if (!c) return;
        c.url = ev.url || '';
        out.cands.push(c);
      };
      pc.onicegatheringstatechange = function () { if (pc.iceGatheringState === 'complete') finish(); };
      try {
        pc.createDataChannel('check');
        pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).catch(function () { out.error = 'offer-failed'; finish(); });
      } catch (e) { out.error = 'offer-failed'; finish(); }
      setTimeout(finish, ms);
    });
  }

  function waitForGathering(pc, ms) {
    return new Promise(function (resolve) {
      if (pc.iceGatheringState === 'complete') return resolve();
      var t = setTimeout(resolve, ms);
      pc.addEventListener('icegatheringstatechange', function () {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Step 1: the quick check
  // ---------------------------------------------------------------------------
  var quick = null;          // the analysed result, once run
  var quickRunning = null;   // the promise while it runs
  var phone = { result: null };

  function mark(n, cls, text) {
    var d = $('d' + n);
    d.className = 'dot ' + cls;
    d.textContent = cls === 'yes' ? '✓' : cls === 'no' ? '✕' : cls === 'meh' ? '!' : '';
    $('s' + n).textContent = text;
  }

  function analyse(single, combined) {
    var r = { answered4: [], answered6: [], publicV4: [], ipv6: false, cgnat: false, anyCandidate: false, mapping: 'none', groups: {}, certain: true, noWebrtc: false };
    single.forEach(function (res, i) {
      if (res.cands.length) r.anyCandidate = true;
      var got4 = false, got6 = false;
      res.cands.forEach(function (c) {
        if (c.protocol !== 'udp') return;
        if (c.type === 'srflx') {
          if (isV6(c.address)) { got6 = true; if (isGlobalV6(c.address)) r.ipv6 = true; }
          else { got4 = true; if (r.publicV4.indexOf(c.address) === -1) r.publicV4.push(c.address); }
        }
        // A browser that still shows real host addresses can reveal global IPv6 directly.
        if (c.type === 'host' && isGlobalV6(c.address)) r.ipv6 = true;
      });
      if (got4) r.answered4.push(STUN[i].name);
      if (got6) r.answered6.push(STUN[i].name);
    });
    if (combined.cands.length) r.anyCandidate = true;
    r.noWebrtc = !r.anyCandidate;

    // Mapping behaviour: ONE connection asked all three servers. Its server-reflexive
    // answers are grouped by the local socket they came from (the related address,
    // or the browser's network id when the address is hidden), so a second network
    // adapter or a VPN is not mistaken for a strict router. Browsers drop a repeat
    // of an identical public address:port, so a friendly router shows up as one
    // answer per socket; a strict one as several ports for the same socket.
    combined.cands.forEach(function (c) {
      if (c.protocol !== 'udp' || c.type !== 'srflx' || isV6(c.address)) return;
      if (r.publicV4.indexOf(c.address) === -1) r.publicV4.push(c.address);
      var key;
      if (c.raddr && c.raddr !== '0.0.0.0' && c.rport) key = 'socket ' + c.raddr + ':' + c.rport;
      else if (c.networkId) key = 'network ' + c.networkId;
      else { key = 'unknown socket'; r.certain = false; }
      var g = r.groups[key] || (r.groups[key] = { ips: [], ports: [], seen: [] });
      if (g.ips.indexOf(c.address) === -1) g.ips.push(c.address);
      if (g.ports.indexOf(c.port) === -1) g.ports.push(c.port);
      g.seen.push(c.address + ':' + c.port + (c.url ? ' (' + c.url + ')' : ''));
    });
    var keys = Object.keys(r.groups);
    var changed = keys.some(function (k) { return r.groups[k].ports.length > 1 || r.groups[k].ips.length > 1; });
    if (!keys.length) r.mapping = 'none';
    else if (changed) r.mapping = r.certain ? 'dependent' : 'dependent-maybe';
    else if (r.answered4.length >= 2) r.mapping = 'independent';
    else r.mapping = 'unknown';
    r.cgnat = r.publicV4.some(isCgnat);
    r.udpBlocked = r.anyCandidate && !r.answered4.length && !r.answered6.length;
    r.single = single;
    return r;
  }

  function runQuick() {
    if (quickRunning) return quickRunning;
    var btn = $('quick-go');
    btn.disabled = true;
    btn.textContent = 'Checking…';
    $('checks').hidden = false;
    $('quick-verdict').innerHTML = '';
    [1, 2, 3, 4].forEach(function (n) { mark(n, 'run', 'checking…'); });

    if (!PC) {
      quick = { noWebrtc: true, answered4: [], answered6: [], publicV4: [], mapping: 'none', groups: {}, single: [] };
      [1, 2, 3, 4].forEach(function (n) { mark(n, 'meh', 'this browser can’t run the check'); });
      renderQuickVerdict();
      btn.disabled = false; btn.textContent = 'Check again';
      return Promise.resolve(quick);
    }

    var singles = STUN.map(function (s) { return gather([s.url], GATHER_MS); });
    var combined = gather(STUN.map(function (s) { return s.url; }), GATHER_MS);
    quickRunning = Promise.all(singles.concat([combined])).then(function (all) {
      quick = analyse(all.slice(0, STUN.length), all[STUN.length]);
      var q = quick;

      if (q.noWebrtc) {
        [1, 2, 3, 4].forEach(function (n) { mark(n, 'meh', 'blocked in this browser'); });
      } else {
        var got = Math.max(q.answered4.length, q.answered6.length);
        if (!got) mark(1, 'no', 'none of the three answered');
        else mark(1, got === STUN.length ? 'yes' : 'meh', got + ' of ' + STUN.length + ' answered' + (got < STUN.length ? ' (enough to go on)' : ''));

        if (q.mapping === 'independent') mark(2, 'yes', 'yes: the same address and port for every server. That’s the friendly kind.');
        else if (q.mapping === 'dependent') mark(2, 'no', 'no: it hands out a new port for each server. That’s a strict router.');
        else if (q.mapping === 'dependent-maybe') mark(2, 'meh', 'it changed between servers: a strict router, or more than one internet connection');
        else if (q.mapping === 'unknown') mark(2, 'meh', 'couldn’t compare: only one server answered over IPv4');
        else mark(2, q.answered6.length ? 'meh' : 'no', q.answered6.length ? 'no IPv4 answers to compare (IPv6 only)' : 'couldn’t tell');

        mark(3, q.ipv6 ? 'yes' : 'meh', q.ipv6 ? 'yes, which gives Beebo a second way in' : 'not found. That’s common, and fine on its own.');
        if (q.cgnat) mark(4, 'no', 'yes: your provider shares your address with other homes');
        else if (!q.publicV4.length) mark(4, 'meh', 'couldn’t tell');
        else mark(4, 'yes', 'no sign of it (a web page can’t be completely sure: see the two-minute check below)');
      }

      if (q.publicV4.length) $('world-ip').textContent = q.publicV4.join(' and ');
      renderTech(q);
      renderQuickVerdict();
      btn.disabled = false;
      btn.textContent = 'Check again';
      quickRunning = null;
      if (phone.result) renderFinal(false);
      return q;
    });
    return quickRunning;
  }

  function renderTech(q) {
    var lines = [];
    q.single.forEach(function (res, i) {
      var sr = res.cands.filter(function (c) { return c.type === 'srflx'; }).map(function (c) { return c.address + ':' + c.port; });
      lines.push(STUN[i].name + '  ' + STUN[i].url);
      lines.push('  sees you as : ' + (sr.length ? sr.join(', ') : '(no answer)') + (res.error ? '  [' + res.error + ']' : ''));
    });
    lines.push('');
    lines.push('One connection asking all three (mapping test):');
    var keys = Object.keys(q.groups);
    if (!keys.length) lines.push('  (no IPv4 answers)');
    keys.forEach(function (k) { lines.push('  ' + k + ' -> ' + q.groups[k].seen.join(', ')); });
    lines.push('');
    lines.push('mapping        : ' + q.mapping + (q.certain ? '' : ' (the browser hid which socket each answer came from)'));
    lines.push('global IPv6    : ' + (q.ipv6 ? 'yes' : 'no'));
    lines.push('shared (CGNAT) : ' + (q.cgnat ? 'yes, 100.64.0.0/10 seen' : 'not seen'));
    $('quick-tech').textContent = lines.join('\n');
    $('quick-tech-box').hidden = false;
  }

  function cgnatParas() {
    return [
      'Watching on your home Wi-Fi works perfectly. But your internet provider shares one internet address between your home and other customers (it’s called carrier-grade NAT). The door is at their end, so nothing you change on your own router can let your phone in from outside, not even opening a port.',
      '<strong>The fix is usually a phone call:</strong> ask your provider for a public IP address (some call it a dedicated or static IP). Many will switch you for free or a small fee. Then run this check again.',
      'If your provider offers IPv6 internet, turning it on can help too.'
    ];
  }

  function renderQuickVerdict() {
    var q = quick, el = $('quick-verdict');
    var after = 'Now run the phone test below: it’s the real proof.';
    if (q.noWebrtc) {
      el.innerHTML = verdictHtml('info', 'Quick check', 'This browser couldn’t run the check', [
        'Something is stopping the browser making direct connections: often a privacy extension, a VPN, or a work computer’s settings. That doesn’t mean Beebo won’t work, only that this page can’t tell.',
        'Try again in Chrome, Edge, Firefox or Safari with extensions paused.'
      ]);
    } else if (q.udpBlocked) {
      el.innerHTML = verdictHtml('bad', 'Quick check', 'Something here is blocking the connection Beebo needs', [
        'None of the three address servers answered, so this computer can’t make the kind of direct connection Beebo uses to reach your phone. Home broadband almost never blocks this; a VPN, security software or a browser extension usually does.',
        'Switch those off and check again. If it still fails on your home internet, away-from-home viewing won’t work from this computer. <strong>Watching at home works regardless.</strong>'
      ]);
    } else if (q.cgnat && !q.ipv6) {
      el.innerHTML = verdictHtml('bad', 'Quick check', 'Away from home won’t work on this connection', cgnatParas());
    } else if (q.mapping === 'independent' || q.ipv6) {
      el.innerHTML = verdictHtml('good', 'Quick check', 'Looks good. Now prove it with your phone', [
        q.mapping === 'independent'
          ? 'Your router shows the same address and door to every server. That’s the friendly kind, which lets your phone connect straight in.'
          : 'Your router was hard to read, but you have modern IPv6 internet, which gives your phone a direct way in on mobile networks that support it.',
        q.cgnat ? 'Your provider does share your older (IPv4) address with other homes, so IPv6 is doing the work here and the phone test really matters.' : '',
        after
      ]);
    } else if (q.mapping === 'dependent' || q.mapping === 'dependent-maybe') {
      el.innerHTML = verdictHtml('warn', 'Quick check', 'Your router looks strict. Away from home may need one port opened', [
        q.mapping === 'dependent'
          ? 'Your router gives a different door to every server it talks to. That can stop your phone finding its way in on its own.'
          : 'The servers saw different doors. That’s either a strict router, or this computer using more than one internet connection (a VPN, say).',
        'It doesn’t always stop a connection, so run the phone test below: it’s the real proof.'
      ]);
    } else {
      el.innerHTML = verdictHtml('info', 'Quick check', 'Not enough to go on yet', [
        'Only one of the address servers answered, so there was nothing to compare. That’s usually a blip.', after
      ]);
    }
  }

  $('quick-go').addEventListener('click', function () { runQuick(); });

  // ---------------------------------------------------------------------------
  // The probe mailbox
  // ---------------------------------------------------------------------------
  function api(route, body) {
    return fetch(API + '/rtc/probe/' + route, {
      method: 'POST',
      // text/plain keeps this a "simple" request: no extra CORS preflight round trip.
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body || {}),
      cache: 'no-store'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) { var e = new Error(j.error || ('http ' + res.status)); e.code = j.error || ('http_' + res.status); e.status = res.status; throw e; }
        return j;
      });
    }, function () { var e = new Error('offline'); e.code = 'offline'; throw e; });
  }
  function apiErrorText(e) {
    switch (e && e.code) {
      case 'rate_limited': return 'You’ve started quite a few tests in the last few minutes. Give it ten minutes, then try again.';
      case 'expired': return 'That code has run out (they last ten minutes). Start a new phone test on your computer.';
      case 'already_joined': return 'Another phone has already used that code. Start a new phone test on your computer.';
      case 'bad_code': return 'That code doesn’t look right. It’s the six letters and numbers shown on your computer.';
      case 'busy': return 'The test service is busy right now. Try again in a few minutes.';
      case 'offline': return 'Couldn’t reach the Beebo test service. Check this device is online, then try again.';
      default: return 'Something went wrong with the test service (' + ((e && e.code) || 'unknown') + '). Try again in a moment.';
    }
  }

  function hdSentence(mbps, capped) {
    var n = mbps >= 100 ? 'more than 100' : (mbps >= 10 ? String(Math.round(mbps)) : mbps.toFixed(1));
    var s = 'Speed right now: about <strong>' + (capped && mbps < 100 ? 'at least ' : '') + n + ' Mbps</strong> from home to your phone. ';
    if (mbps >= 10) return s + 'That’s plenty for HD films.';
    if (mbps >= 5) return s + 'Enough for most HD films. Very high-quality 1080p or 4K files may pause now and then.';
    if (mbps >= 2) return s + 'Fine for standard-definition films and smaller HD files; big HD files may stop to buffer.';
    return s + 'That’s slow for video, so expect pauses except with small files. On this connection, downloading films to your phone at home is the better way.';
  }

  // ---------------------------------------------------------------------------
  // Final verdict (computer)
  // ---------------------------------------------------------------------------
  function renderFinal(scroll) {
    var r = phone.result, q = quick, el = $('final-verdict');
    if (!r) { el.innerHTML = ''; return; }
    if (r.sameNetwork) {
      el.innerHTML = verdictHtml('info', 'Phone test', 'That test went over your home network', [
        'Your phone and this computer were on the same internet connection, so this says nothing about away from home' + (r.ok ? ', even though the connection itself worked.' : '.'),
        'Turn Wi-Fi off on your phone so it uses mobile data, then start a new phone test.'
      ]);
    } else if (r.ok) {
      el.innerHTML = verdictHtml('good', 'Phone test', 'Beebo works from anywhere, with no port to open', [
        'Your phone just connected straight to this computer over its mobile network' + (r.ipv6 ? ' (using modern IPv6 internet)' : '') + ', with nothing in between. That’s exactly how Beebo reaches your films when you’re out.',
        r.mbps ? hdSentence(r.mbps, r.capped) : '',
        'Some hotel, office and café Wi-Fi is stricter than mobile data, so now and then a network may still say no. And at home, Beebo works either way.'
      ]);
    } else if (q && q.cgnat && !q.ipv6) {
      el.innerHTML = verdictHtml('bad', 'Phone test', 'Away from home won’t work on this connection', ['Your phone couldn’t get through to this computer, and your provider shares your address.'].concat(cgnatParas()));
    } else if (q && q.udpBlocked) {
      el.innerHTML = verdictHtml('bad', 'Phone test', 'Something on this computer is blocking the connection', [
        'Your phone couldn’t get through, and this computer couldn’t reach any address servers either. A VPN, security software or a browser extension is the usual cause. Switch them off and run both checks again.',
        '<strong>Watching at home works regardless.</strong>'
      ]);
    } else {
      el.innerHTML = verdictHtml('warn', 'Phone test', 'Works at home. Away from home needs one port opened', [
        'Watching on your home Wi-Fi works perfectly. But your phone couldn’t get a direct connection to this computer from outside, so on this connection Beebo needs a way in.',
        '<strong>That way in is one open port on your router.</strong> Beebo will try to open it for you automatically. If your router doesn’t allow that, Beebo shows you which port to open, and <a href="#open-a-port">here’s how to open it by hand</a>.',
        q && q.mapping === 'independent'
          ? 'Your router looked friendly in the quick check, so also do <a href="#cgnat-check">the two-minute check</a> to see whether your provider shares your address, and try the phone test on a different mobile network if you can: some are unusually strict.'
          : 'Before opening a port, do <a href="#cgnat-check">the two-minute check</a>: if your provider shares your address with other homes, a port can’t help.'
      ]);
    }
    if (scroll) { try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
  }

  // ---------------------------------------------------------------------------
  // Step 2, computer side ("a"): open a room, answer the phone's offer, send data
  // ---------------------------------------------------------------------------
  function startComputerSide() {
    var btn = $('phone-go'), status = $('a-status');
    btn.disabled = true;
    btn.textContent = 'Starting…';
    $('final-verdict').innerHTML = '';
    var session = phone = { result: null };
    if (!quick && !quickRunning) runQuick();
    if (!PC) {
      setStatus(status, 'This browser can’t make direct connections, so the phone test can’t run here. Try Chrome, Edge, Firefox or Safari.');
      btn.disabled = false; btn.textContent = 'Start the phone test';
      return;
    }

    var room = null, since = 0, pollTimer = null, expiresAt = 0, pc = null, finished = false, answered = false;
    var connectTimer = null, countdown = null, myIps = [], phoneIps = [];
    session.stop = function () {
      finished = true;
      clearTimeout(pollTimer); clearTimeout(connectTimer); clearInterval(countdown);
      try { if (pc) pc.close(); } catch (e) {}
    };
    function sameNet() {
      var mine = myIps.concat(quick && quick.publicV4 ? quick.publicV4 : []);
      return phoneIps.some(function (ip) { return mine.indexOf(ip) !== -1; });
    }
    function reset(text) {
      session.stop();
      $('pair-box').hidden = true;
      setStatus(status, text);
      btn.disabled = false; btn.textContent = 'Start the phone test';
    }
    function finish(result) {
      if (finished) return;
      session.stop();
      session.result = result;
      btn.disabled = false;
      btn.textContent = 'Start a new phone test';
      $('pair-box').hidden = true;
      setStatus(status, result.ok ? 'Test finished.' : 'Test finished: your phone couldn’t get through.');
      renderFinal(true);
    }

    api('new', {}).then(function (j) {
      if (finished) return;
      room = j;
      expiresAt = Date.now() + j.expiresIn * 1000;
      var url = location.href.split('#')[0] + '#join=' + j.code;
      try {
        var qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      } catch (e) { $('qr').textContent = url; }
      $('code').textContent = j.code;
      $('pair-box').hidden = false;
      btn.textContent = 'Waiting for your phone…';
      var tick = function () {
        if (answered || finished) return;
        var left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        setStatus(status, 'Waiting for your phone… (this code works for another ' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2) + ')', true);
        if (!left) reset('The code ran out before a phone joined. Start a new phone test when you’re ready.');
      };
      tick();
      countdown = setInterval(tick, 1000);
      poll();
    }).catch(function (e) {
      reset(apiErrorText(e));
    });

    function poll() {
      if (finished) return;
      api('poll', { code: room.code, key: room.key, since: since }).then(function (j) {
        (j.msgs || []).forEach(function (m) {
          since = Math.max(since, m.id);
          if (m.kind === 'offer' && !answered) onOffer(m.data);
          else if (m.kind === 'result' && m.data && m.data.ok === false) {
            finish({ ok: false, reason: String(m.data.reason || 'phone'), sameNetwork: !!m.data.sameNetwork || sameNet() });
          }
        });
      }).catch(function (e) {
        if (e.code === 'expired' && !answered) reset('The code ran out. Start a new phone test when you’re ready.');
      }).then(function () {
        if (!finished) pollTimer = setTimeout(poll, answered ? 1500 : 2000);
      });
    }

    function onOffer(offer) {
      if (!offer || offer.type !== 'offer' || typeof offer.sdp !== 'string') return;
      answered = true;
      clearInterval(countdown);
      $('pair-box').hidden = true;
      btn.textContent = 'Testing…';
      setStatus(status, 'Your phone has joined. Connecting directly…', true);
      phoneIps = srflxFromSdp(offer.sdp);
      try { pc = new PC({ iceServers: BEEBO_ICE }); } catch (e) { return finish({ ok: false, reason: 'no-webrtc' }); }
      pc.ondatachannel = function (ev) { onChannel(ev.channel); };
      pc.oniceconnectionstatechange = function () {
        if (pc.iceConnectionState === 'failed') finish({ ok: false, reason: 'ice', sameNetwork: sameNet() });
      };
      pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp })
        .then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); })
        .then(function () { return waitForGathering(pc, 5000); })
        .then(function () {
          myIps = srflxFromSdp(pc.localDescription.sdp);
          return api('send', { code: room.code, key: room.key, kind: 'answer', data: { type: 'answer', sdp: pc.localDescription.sdp } });
        })
        .then(function () {
          connectTimer = setTimeout(function () { finish({ ok: false, reason: 'timeout', sameNetwork: sameNet() }); }, 35000);
        })
        .catch(function (e) {
          finish({ ok: false, reason: e && e.code ? e.code : 'answer-failed' });
          if (e && e.code) setStatus(status, apiErrorText(e));
        });
    }

    function onChannel(ch) {
      ch.binaryType = 'arraybuffer';
      var rtts = [], pingAt = 0, sent = 0, t0 = 0, stopped = false, guard = null, started = false, completed = null, dbg = { pumps: 0, lows: 0, endAt: 0 };
      var send = function (o) { try { ch.send(JSON.stringify(o)); } catch (e) {} };
      var ping = function () { pingAt = performance.now(); send({ t: 'ping' }); };
      var opened = function () {
        clearTimeout(connectTimer);
        connectTimer = setTimeout(function () { finish({ ok: false, reason: 'stalled', sameNetwork: sameNet() }); }, 45000);
        setStatus(status, 'Connected! Measuring how much it can carry…', true);
        ping();
      };
      ch.onmessage = function (ev) {
        if (typeof ev.data !== 'string') return;
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'pong') { rtts.push(performance.now() - pingAt); if (rtts.length < 3) ping(); else if (!started) { started = true; blast(); } }
        else if (m.t === 'got' && m.ms > 0) setStatus(status, 'Connected! Measuring… about ' + (m.bytes * 8 / (m.ms / 1000) / 1e6).toFixed(1) + ' Mbps so far', true);
        else if (m.t === 'done') done(m);
      };
      // The phone closes its end once it has the result; that is success, not a drop.
      ch.onclose = function () { if (!finished) finish(completed || { ok: false, reason: 'closed', sameNetwork: sameNet() }); };
      if (ch.readyState === 'open') opened(); else ch.onopen = opened;

      function blast() {
        send({ t: 'start' });
        var chunk = new Uint8Array(16384);
        crypto.getRandomValues(chunk);
        ch.bufferedAmountLowThreshold = 256 * 1024;
        t0 = performance.now();
        function end() { if (stopped) return; stopped = true; dbg.endAt = Math.round(performance.now() - t0); clearInterval(guard); send({ t: 'end', sent: sent }); }
        function pump() {
          dbg.pumps++;
          while (!stopped && ch.readyState === 'open' && ch.bufferedAmount < 512 * 1024) {
            if (sent >= SPEED_MAX_BYTES || performance.now() - t0 > SPEED_MAX_MS) return end();
            try { ch.send(chunk); } catch (e) { return end(); }
            sent += chunk.length;
          }
        }
        ch.onbufferedamountlow = function () { dbg.lows++; pump(); };
        guard = setInterval(function () { if (performance.now() - t0 > SPEED_MAX_MS) end(); else pump(); }, 250);
        pump();
      }

      function done(m) {
        if (finished) return;
        var bytes = Number(m.bytes) || 0, ms = Number(m.ms) || 0;
        var mbps = ms > 0 ? bytes * 8 / (ms / 1000) / 1e6 : 0;
        var capped = sent >= SPEED_MAX_BYTES && bytes >= sent;
        describePath(pc).then(function (path) {
          var same = sameNet() || !!(path && path.lan);
          var result = { ok: true, mbps: mbps, capped: capped, rttMs: rtts.length ? Math.round(Math.min.apply(null, rtts)) : 0, ipv6: !!(path && path.ipv6), sameNetwork: same, path: path, debug: { sent: sent, pumps: dbg.pumps, lows: dbg.lows, endAt: dbg.endAt, phoneBytes: bytes, phoneMs: ms } };
          completed = result;
          send({ t: 'result', ok: true, mbps: mbps, capped: capped, ipv6: result.ipv6, sameNetwork: same });
          setTimeout(function () { finish(result); }, 1500);
        });
      }
    }
  }

  function describePath(pc) {
    return pc.getStats().then(function (stats) {
      var byId = {}, pair = null;
      stats.forEach(function (s) { byId[s.id] = s; });
      stats.forEach(function (s) { if (s.type === 'transport' && s.selectedCandidatePairId) pair = byId[s.selectedCandidatePairId]; });
      if (!pair) stats.forEach(function (s) { if (!pair && s.type === 'candidate-pair' && s.state === 'succeeded' && (s.selected || s.nominated)) pair = s; });
      if (!pair) return null;
      var l = byId[pair.localCandidateId] || {}, r = byId[pair.remoteCandidateId] || {};
      var remote = r.address || r.ip || '';
      return { local: l.candidateType || '', remote: r.candidateType || '', remoteAddress: remote, ipv6: isV6(remote), lan: l.candidateType === 'host' && r.candidateType === 'host' };
    }).catch(function () { return null; });
  }

  $('phone-go').addEventListener('click', function () {
    if (phone && phone.stop) phone.stop();
    startComputerSide();
  });

  // ---------------------------------------------------------------------------
  // Step 2, phone side ("b"): join, offer, receive data
  // ---------------------------------------------------------------------------
  var phoneSession = null;
  function startPhoneSide() {
    if (phoneSession && phoneSession.busy) return;
    var btn = $('b-go'), status = $('b-status'), out = $('b-verdict');
    var code = $('join-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    out.innerHTML = '';
    if (code.length !== 6) { setStatus(status, 'Type the six-character code shown on your computer.'); return; }
    if (!PC) { setStatus(status, 'This browser can’t make direct connections. Try Chrome, Firefox or Safari.'); return; }
    btn.disabled = true;
    btn.textContent = 'Testing…';
    setStatus(status, 'Joining your computer’s test…', true);

    var s = phoneSession = { busy: true };
    var key = '', since = 0, pc = null, ch = null, finished = false, timers = [], myIps = [], theirIps = [];
    var bytes = 0, first = 0, last = 0, ended = false, endSent = 0, reportTimer = null, doneSent = false;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function stop() { finished = true; s.busy = false; clearTimers(); clearInterval(reportTimer); try { if (pc) pc.close(); } catch (e) {} }
    function sameNet() { return theirIps.some(function (ip) { return myIps.indexOf(ip) !== -1; }); }

    function fail(reason, text) {
      if (finished) return;
      var same = sameNet();
      if (key) api('send', { code: code, key: key, kind: 'result', data: { ok: false, reason: reason, sameNetwork: same } }).catch(function () {});
      stop();
      btn.disabled = false; btn.textContent = 'Try again';
      if (text) { setStatus(status, text); return; }
      setStatus(status, '');
      out.innerHTML = same
        ? verdictHtml('info', 'Phone test', 'This phone is on your home network', ['Turn Wi-Fi off so the test uses mobile data, then start a new test on your computer.'])
        : verdictHtml('warn', 'Phone test', 'Your phone couldn’t get through', ['Your computer now shows what that means and what to do next. Watching at home works regardless.']);
    }

    api('join', { code: code }).then(function (j) {
      key = j.key;
      setStatus(status, 'Joined. Connecting directly to your computer…', true);
      pc = new PC({ iceServers: BEEBO_ICE });
      ch = pc.createDataChannel('beebo-probe', { ordered: true });
      ch.binaryType = 'arraybuffer';
      ch.onopen = function () { setStatus(status, 'Connected! Measuring speed…', true); };
      ch.onmessage = onMessage;
      pc.oniceconnectionstatechange = function () { if (pc.iceConnectionState === 'failed') fail('ice'); };
      return pc.createOffer()
        .then(function (o) { return pc.setLocalDescription(o); })
        .then(function () { return waitForGathering(pc, 5000); })
        .then(function () {
          myIps = srflxFromSdp(pc.localDescription.sdp);
          return api('send', { code: code, key: key, kind: 'offer', data: { type: 'offer', sdp: pc.localDescription.sdp } });
        })
        .then(function () {
          later(function () { fail('no-answer', 'Your computer didn’t answer. Is the test page still open on it? Start a new phone test there and scan the new code.'); }, 45000);
          pollAnswer();
        });
    }).catch(function (e) {
      fail('join', e && e.code ? apiErrorText(e) : 'This browser couldn’t start the connection.');
    });

    function pollAnswer() {
      if (finished) return;
      api('poll', { code: code, key: key, since: since }).then(function (j) {
        if (finished) return;
        var answer = null;
        (j.msgs || []).forEach(function (m) { since = Math.max(since, m.id); if (m.kind === 'answer') answer = m.data; });
        if (answer && typeof answer.sdp === 'string') {
          theirIps = srflxFromSdp(answer.sdp);
          clearTimers();
          later(function () { if (!ch || ch.readyState !== 'open') fail('timeout'); }, 35000);
          return pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp }).catch(function () { fail('bad-answer'); });
        }
        later(pollAnswer, 1000);
      }).catch(function (e) {
        if (e && (e.code === 'expired' || e.code === 'unauthorized')) fail('expired', apiErrorText({ code: 'expired' }));
        else later(pollAnswer, 1500);
      });
    }

    function onMessage(ev) {
      if (finished) return;
      if (typeof ev.data !== 'string') {
        var now = performance.now();
        if (!first) first = now;
        last = now;
        bytes += ev.data.byteLength || 0;
        if (ended && bytes >= endSent) report(true);
        return;
      }
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'ping') { try { ch.send(JSON.stringify({ t: 'pong' })); } catch (e) {} }
      else if (m.t === 'start') {
        clearTimers();
        later(function () { fail('stalled'); }, 45000);
        reportTimer = setInterval(function () { report(false); }, 700);
      }
      else if (m.t === 'end') { ended = true; endSent = Number(m.sent) || 0; if (bytes >= endSent) report(true); else later(function () { report(true); }, 5000); }
      else if (m.t === 'result') {
        finished = true;
        s.busy = false;
        clearTimers(); clearInterval(reportTimer);
        setTimeout(stop, 2000);   // let the computer finish on its own before hanging up
        btn.disabled = false; btn.textContent = 'Test again';
        setStatus(status, 'Test finished.');
        var mbps = Number(m.mbps) || 0;
        out.innerHTML = m.sameNetwork
          ? verdictHtml('info', 'Phone test', 'That went over your home network', ['Turn Wi-Fi off so the test uses mobile data, then start a new test on your computer.'])
          : verdictHtml('good', 'Phone test', 'It worked! Your phone reached your computer directly', [mbps ? hdSentence(mbps, !!m.capped) : '', 'Your computer has the full answer.']);
      }
    }

    function report(final) {
      if (!ch || ch.readyState !== 'open' || doneSent) return;
      var ms = Math.max(1, Math.round(last - first));
      if (final) { doneSent = true; clearInterval(reportTimer); setStatus(status, 'Nearly done…', true); }
      try { ch.send(JSON.stringify({ t: final ? 'done' : 'got', bytes: bytes, ms: ms })); } catch (e) {}
    }
  }

  $('b-go').addEventListener('click', startPhoneSide);
  $('join-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') startPhoneSide(); });

  // ---------------------------------------------------------------------------
  // Which half is this device?
  // ---------------------------------------------------------------------------
  var connWatch = false;
  function showPhoneMode(code) {
    $('computer-mode').hidden = true;
    $('phone-mode').hidden = false;
    if (code) $('join-code').value = code;
    var c = navigator.connection;
    var onWifi = function () { $('wifi-warn').hidden = !(c && c.type === 'wifi'); };
    onWifi();
    if (c && c.addEventListener && !connWatch) { connWatch = true; c.addEventListener('change', onWifi); }
  }
  function showComputerMode() {
    $('phone-mode').hidden = true;
    $('computer-mode').hidden = false;
  }
  function route() {
    var m = /[#&]join=([A-Za-z0-9]{0,6})/.exec(location.hash);
    if (m) showPhoneMode(m[1].toUpperCase()); else showComputerMode();
  }
  $('have-code').addEventListener('click', function () { location.hash = 'join='; setTimeout(function () { $('join-code').focus(); }, 0); });
  $('to-computer').addEventListener('click', function () { history.replaceState(null, '', location.pathname + location.search); route(); });
  window.addEventListener('hashchange', route);
  route();

  // Local copies only: lets a tester read what happened and preview each verdict.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.__beeboProbe = {
      get quick() { return quick; },
      get phone() { return phone.result; },
      preview: function (result, quickPatch) {
        if (quickPatch) { quick = Object.assign({}, quick || { answered4: [], answered6: [], publicV4: [], groups: {}, single: [] }, quickPatch); renderQuickVerdict(); }
        phone.result = result; renderFinal(false);
      }
    };
  }
})();
