/* Memory Match - rules and computer opponent for the Beebo Entertainment website.
 *
 * Plain JavaScript, no dependencies; browser (window.BeeboMemory) and node (module.exports).
 * Rules follow the Android Campsite "Pairs" game: turn two cards; a match is kept and you
 * go again; a mismatch is shown, then covered, and the turn passes. Most pairs wins.
 *
 * The computer remembers only cards that were turned face up in front of everybody, and
 * only the most recent few (easy 2, medium 5, hard 12), so it can be beaten.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeeboMemory = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BOT_NAME = 'Hopping Beebo';
  var RECALL = { easy: 2, medium: 5, hard: 12 };

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function defaultRng() {
    var c = (typeof globalThis !== 'undefined') ? globalThis.crypto : null;
    if (c && typeof c.getRandomValues === 'function') {
      return function () { var b = new Uint32Array(1); c.getRandomValues(b); return b[0] / 4294967296; };
    }
    return Math.random;
  }
  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }

  /**
   * opts: {pairs (2..18), cols, players:[{name,bot}] (1..4), level, rng, layout (tests only)}
   * Card faces are integers 0..pairs-1.
   */
  function createGame(opts) {
    var pairs = opts.pairs || 8;
    var players = opts.players || [];
    if (players.length < 1 || players.length > 4) throw new Error('Memory Match needs 1 to 4 players.');
    var rng = opts.rng || defaultRng();
    var cards = [];
    if (opts.layout) {
      cards = opts.layout.slice();
    } else {
      for (var p = 0; p < pairs; p++) { cards.push(p); cards.push(p); }
      for (var i = cards.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = cards[i]; cards[i] = cards[j]; cards[j] = t;
      }
    }
    return {
      pairs: cards.length / 2,
      cols: opts.cols || 4,
      rng: rng,
      level: opts.level || 'medium',
      players: players.map(function (pl, k) { return { name: pl.name || ('Player ' + (k + 1)), bot: !!pl.bot }; }),
      cards: cards,
      owner: cards.map(function () { return -1; }),     // -1 face down / unclaimed, else who took it
      up: cards.map(function () { return false; }),      // currently face up (matched or being looked at)
      turned: [],                                        // cells turned this turn (0..2)
      pendingMismatch: false,                            // a mismatched pair is on show, waiting to be covered
      scores: players.map(function () { return 0; }),
      flips: 0,                                          // pairs of cards turned (a "move")
      turn: 0, over: false, winners: [],
      recall: players.map(function () { return []; })    // per player: [{cell, face}] oldest first
    };
  }

  function remember(state, cell) {
    state.players.forEach(function (pl, k) {
      var list = state.recall[k];
      for (var i = list.length - 1; i >= 0; i--) if (list[i].cell === cell) list.splice(i, 1);
      list.push({ cell: cell, face: state.cards[cell] });
      var cap = RECALL[state.level] || 5;
      while (list.length > cap) list.shift();
    });
  }
  function forget(state, cell) {
    state.recall.forEach(function (list) {
      for (var i = list.length - 1; i >= 0; i--) if (list[i].cell === cell) list.splice(i, 1);
    });
  }

  /** Turn a face-down card for the current player. Returns {cell, face, stage, matched, over, mismatch}. */
  function flip(state, cell) {
    if (state.over) throw new Error('This game has finished.');
    if (state.pendingMismatch) throw new Error('Cover the mismatched pair first.');
    if (!(cell >= 0 && cell < state.cards.length) || cell !== Math.floor(cell)) throw new Error('No such card.');
    if (state.up[cell]) throw new Error('That card is already face up.');
    state.up[cell] = true;
    state.turned.push(cell);
    remember(state, cell);
    var ev = { player: state.turn, cell: cell, face: state.cards[cell], stage: state.turned.length, matched: false, mismatch: false, over: false };
    if (state.turned.length < 2) return ev;

    state.flips++;
    var a = state.turned[0], b = state.turned[1];
    if (state.cards[a] === state.cards[b]) {
      state.owner[a] = state.turn; state.owner[b] = state.turn;
      state.scores[state.turn]++;
      forget(state, a); forget(state, b);
      state.turned = [];
      ev.matched = true;
      if (state.scores.reduce(function (x, y) { return x + y; }, 0) === state.pairs) {
        state.over = true; ev.over = true;
        var best = Math.max.apply(null, state.scores);
        state.scores.forEach(function (s, i) { if (s === best) state.winners.push(i); });
      }
    } else {
      state.pendingMismatch = true;
      ev.mismatch = true;
    }
    return ev;
  }

  /** Cover a mismatched pair and pass the turn. No-op when nothing is pending. */
  function resolve(state) {
    if (!state.pendingMismatch) return false;
    state.turned.forEach(function (c) { state.up[c] = false; });
    state.turned = [];
    state.pendingMismatch = false;
    state.turn = (state.turn + 1) % state.players.length;
    return true;
  }

  function faceDown(state) {
    var out = [];
    for (var i = 0; i < state.cards.length; i++) if (!state.up[i]) out.push(i);
    return out;
  }

  /** The computer's next card. Reads only its own recall of publicly turned cards. */
  function botPick(state) {
    var down = faceDown(state);
    if (!down.length) return -1;
    var list = state.recall[state.turn];
    var known = {};
    list.forEach(function (r) { known[r.cell] = r.face; });
    var rng = state.rng;
    var isDown = function (c) { return !state.up[c]; };

    if (state.turned.length === 1) {
      var first = state.turned[0], face = state.cards[first];
      // Second card: if the first card's twin is remembered, take it.
      var twin = list.filter(function (r) { return r.face === face && r.cell !== first && isDown(r.cell); });
      if (twin.length) return twin[0].cell;
      var fresh = down.filter(function (c) { return !(c in known) && c !== first; });
      if (fresh.length) return pick(fresh, rng);
      var any = down.filter(function (c) { return c !== first; });
      return any.length ? pick(any, rng) : -1;
    }
    // First card: a remembered pair if there is one.
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        if (list[i].face === list[j].face && isDown(list[i].cell) && isDown(list[j].cell)) return list[i].cell;
      }
    }
    var unseen = down.filter(function (c) { return !(c in known); });
    return pick(unseen.length ? unseen : down, rng);
  }

  function describe(state, ev, faceName) {
    var name = state.players[ev.player].name;
    var nm = faceName || function (f) { return 'card ' + (f + 1); };
    if (ev.stage === 1) return name + ' turned ' + nm(ev.face) + '.';
    if (ev.matched) {
      return name + ' found a pair' + (ev.over ? '.' : (name === 'You' ? ' and go again.' : ' and goes again.'));
    }
    return name + ' turned ' + nm(ev.face) + '. No match.';
  }

  return {
    BOT_NAME: BOT_NAME, RECALL: RECALL, makeRng: makeRng, defaultRng: defaultRng,
    createGame: createGame, flip: flip, resolve: resolve, botPick: botPick, describe: describe
  };
});
