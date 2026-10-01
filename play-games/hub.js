(function () {
  'use strict';
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var status = document.getElementById('filter-status');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      var shown = 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      cards.forEach(function (card) {
        var types = (card.getAttribute('data-type') || '').split(' ');
        var match = f === 'all' || types.indexOf(f) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      if (status) status.textContent = f === 'all' ? '' : 'Showing ' + shown + ' ' + f + ' game' + (shown === 1 ? '' : 's') + '.';
    });
  });

  // Optional session scores written by game pages. Plain text only, never HTML.
  cards.forEach(function (card) {
    var id = card.getAttribute('data-id');
    var el = card.querySelector('.score');
    if (!id || !el) return;
    try {
      var raw = window.sessionStorage.getItem('beebo.play.' + id);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      var parts = [];
      if (isFinite(d.wins)) parts.push('Wins ' + Number(d.wins));
      if (isFinite(d.losses)) parts.push('Losses ' + Number(d.losses));
      if (isFinite(d.draws)) parts.push('Draws ' + Number(d.draws));
      if (isFinite(d.best)) parts.push('Best ' + Number(d.best));
      if (parts.length) { el.textContent = 'This session: ' + parts.join(' / '); el.hidden = false; }
    } catch (e) { /* storage unavailable or not JSON */ }
  });
})();
