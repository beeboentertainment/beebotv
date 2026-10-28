/* Check and cross chart: details for each box on hover, keyboard focus and tap.
   Without this script every box is a plain link to the full "How it was tested" list under the table, so nothing is only in a pop-up. */
(function () {
  'use strict';
  var pop = document.getElementById('pm-pop');
  var wrap = document.querySelector('.pm-wrap');
  if (!pop || !wrap) return;
  var current = null, pinned = false, hideTimer = null;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function contentFor(id) {
    var src = document.getElementById(id);
    if (!src) return null;
    return src.innerHTML;
  }
  function close() {
    pop.hidden = true; pop.innerHTML = '';
    if (current) { current.setAttribute('aria-expanded', 'false'); current.removeAttribute('aria-controls'); }
    current = null; pinned = false;
  }
  function place(el) {
    if (window.innerWidth <= 700) { pop.style.left = ''; pop.style.top = ''; return; }
    var r = el.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + window.pageXOffset;
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    pop.style.left = left + 'px';
    pop.style.top = (top + window.pageYOffset) + 'px';
  }
  function open(el, pin) {
    var id = el.getAttribute('data-pm');
    var html = contentFor(id);
    if (!html) return false;
    if (current && current !== el) current.setAttribute('aria-expanded', 'false');
    current = el; pinned = !!pin;
    pop.innerHTML = '<button type="button" class="pm-pop-close" aria-label="Close details">×</button>' + html;
    pop.hidden = false;
    el.setAttribute('aria-expanded', 'true'); el.setAttribute('aria-controls', 'pm-pop');
    place(el);
    return true;
  }
  var cells = document.querySelectorAll('.pm-cell[data-pm], a[data-pm]');
  Array.prototype.forEach.call(cells, function (el) {
    el.setAttribute('role', 'button');
    el.setAttribute('aria-expanded', 'false');
    el.addEventListener('click', function (e) {
      e.preventDefault();
      if (current === el && pinned) { close(); return; }
      open(el, true);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === ' ') { e.preventDefault(); if (current === el && pinned) close(); else open(el, true); }
    });
    el.addEventListener('focus', function () {
      var kb = false; try { kb = el.matches(':focus-visible'); } catch (x) { kb = false; }
      if (kb && !pinned) open(el, false);
    });
    if (canHover) {
      el.addEventListener('mouseenter', function () { clearTimeout(hideTimer); if (!pinned) open(el, false); });
      el.addEventListener('mouseleave', function () { if (!pinned) hideTimer = setTimeout(function () { if (!pinned) close(); }, 250); });
    }
  });
  if (canHover) {
    pop.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
    pop.addEventListener('mouseleave', function () { if (!pinned) hideTimer = setTimeout(function () { if (!pinned) close(); }, 250); });
  }
  pop.addEventListener('click', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('pm-pop-close')) { var c = current; close(); if (c) c.focus(); return; }
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (a) { var id = a.getAttribute('href').slice(1); var t = document.getElementById(id); if (t) { var d = t.closest('details'); if (d) d.open = true; } close(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) { var c = current; close(); c.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!current) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('[data-pm]')) return;
    close();
  });
  window.addEventListener('resize', function () { if (current) place(current); });
  wrap.addEventListener('scroll', function () { if (current) place(current); });
  // Jumping to a box from a link: open the row it is in so the text is visible.
  function openFromHash() {
    var h = location.hash.slice(1);
    if (!h) return;
    var t = document.getElementById(h);
    if (t) { var d = t.closest('details'); if (d) d.open = true; }
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();
