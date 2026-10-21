/* Decisions waiting: reads the radio groups already on the page (built from decisions.json),
   remembers picks in this browser only (localStorage, optional), and copies short text lines.
   Nothing is sent anywhere. No cookies. */
(function () {
  'use strict';
  var KEY = 'beebo-decisions-v1';
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-decision]'));
  var ids = sections.map(function (s) { return s.getAttribute('data-decision'); });
  var answers = {};
  try { answers = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { answers = {}; }

  var out = document.getElementById('dec-out');
  var count = document.getElementById('dec-count');
  var ok = document.getElementById('dec-ok');
  var box = document.getElementById('dec-out-box');
  var okTimer = null;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) { /* storage may be blocked */ } }

  function paint() {
    var lines = [], n = 0;
    ids.forEach(function (id) {
      var a = answers[id];
      var radios = document.getElementsByName(id);
      var valid = false;
      for (var i = 0; i < radios.length; i++) {
        radios[i].checked = radios[i].value === a;
        if (radios[i].checked) valid = true;
      }
      if (a && !valid) { delete answers[id]; a = null; }
      var line = document.getElementById('line-' + id);
      if (a) { n++; lines.push(id + ': ' + a); line.textContent = id + ': ' + a; } else { line.textContent = ''; }
    });
    count.textContent = n + ' of ' + ids.length + ' answered';
    out.value = lines.join('\n');
  }

  function flash(msg) {
    ok.textContent = msg;
    ok.hidden = false;
    clearTimeout(okTimer);
    okTimer = setTimeout(function () { ok.hidden = true; }, 1800);
  }

  function copy(text) {
    function fallback() {
      var old = out.value;
      out.value = text;
      out.focus();
      out.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) { done = false; }
      out.value = old;
      flash(done ? 'Copied' : 'Could not copy: select the text in the box and copy it yourself');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash('Copied'); }, fallback);
    } else { fallback(); }
  }

  document.getElementById('questions').addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.type !== 'radio') return;
    answers[t.name] = t.value;
    save();
    paint();
  });
  document.getElementById('questions').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-copy]') : null;
    if (!b) return;
    var id = b.getAttribute('data-copy');
    if (!answers[id]) { flash('Pick an option for ' + id + ' first'); return; }
    copy(id + ': ' + answers[id]);
  });
  document.getElementById('dec-copy-all').addEventListener('click', function () {
    if (!out.value) { flash('Pick at least one option first'); return; }
    copy(out.value);
  });
  document.getElementById('dec-clear').addEventListener('click', function () {
    answers = {};
    save();
    paint();
  });

  // On a narrow screen start with the answers box folded away so the sticky bar stays small.
  try { if (window.matchMedia && window.matchMedia('(max-width: 720px)').matches) box.open = false; } catch (e) { /* keep open */ }

  paint();
})();
