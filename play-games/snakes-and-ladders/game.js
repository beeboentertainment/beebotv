/* Snakes and Ladders - rules for the Beebo Entertainment website.
 *
 * Plain JavaScript, no dependencies. Works in a browser (window.BeeboSnakes) and in
 * node (module.exports). The rules follow the Android Campsite game: a 100-square board,
 * nine ladders up and ten snakes down, NO exact finish (reaching or passing square 100
 * wins), a six rolls again (at most three rolls in one turn), and a hard cap on total
 * rolls after which the token furthest along wins.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeeboSnakes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LAST = 100;
  var ROLL_CAP = 400;
  var ROLLS_PER_TURN = 3;
  var BOT_NAME = 'Hopping Beebo';

  // square -> square. Ladders go up, snakes go down.
  var JUMPS = {
    1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
    16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73,
    95: 75, 98: 78
  };

  /** Seedable generator (mulberry32). rng() returns a float in [0, 1). */
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

  /** Fair default generator: crypto when available, Math.random otherwise. */
  function defaultRng() {
    var c = (typeof globalThis !== 'undefined') ? globalThis.crypto : null;
    if (c && typeof c.getRandomValues === 'function') {
      return function () {
        var buf = new Uint32Array(1);
        c.getRandomValues(buf);
        return buf[0] / 4294967296;
      };
    }
    return Math.random;
  }

  function rollDie(rng) {
    return 1 + Math.floor(rng() * 6);
  }

  /** players: [{name, bot}] (2 to 4). */
  function createGame(opts) {
    var players = (opts && opts.players) || [];
    if (players.length < 2 || players.length > 4) throw new Error('Snakes and Ladders needs 2 to 4 players.');
    return {
      players: players.map(function (p, i) { return { name: p.name || ('Player ' + (i + 1)), bot: !!p.bot }; }),
      rng: (opts && opts.rng) || defaultRng(),
      pos: players.map(function () { return 0; }),
      turn: 0,
      rollsThisTurn: 0,
      rolls: 0,
      over: false,
      winner: -1,      // index, or -1 for none / a dead level at the cap
      capped: false,
      last: null
    };
  }

  /** Roll for whoever's turn it is. `forced` (1..6) is for tests only. */
  function roll(state, forced) {
    if (state.over) throw new Error('This game has finished.');
    var who = state.turn;
    var die = forced || rollDie(state.rng);
    if (die < 1 || die > 6 || die !== Math.floor(die)) throw new Error('Bad die.');
    var from = state.pos[who];
    var landed = from + die;
    state.rolls++;
    state.rollsThisTurn++;
    var ev = { player: who, die: die, from: from, landed: landed, to: landed, jump: null, home: false, again: false, capped: false };

    if (landed >= LAST) {
      state.pos[who] = LAST;
      ev.to = LAST; ev.landed = LAST; ev.home = true;
      state.over = true; state.winner = who;
      state.last = ev;
      return ev;
    }
    var j = JUMPS[landed];
    if (j !== undefined) {
      ev.jump = j > landed ? 'ladder' : 'snake';
      ev.to = j;
    }
    state.pos[who] = ev.to;

    if (state.rolls >= ROLL_CAP) {
      state.over = true; state.capped = true; ev.capped = true;
      var best = Math.max.apply(null, state.pos);
      var leaders = [];
      state.pos.forEach(function (p, i) { if (p === best) leaders.push(i); });
      state.winner = leaders.length === 1 ? leaders[0] : -1;
      state.last = ev;
      return ev;
    }
    if (die === 6 && state.rollsThisTurn < ROLLS_PER_TURN) {
      ev.again = true;
    } else {
      state.rollsThisTurn = 0;
      state.turn = (state.turn + 1) % state.players.length;
    }
    state.last = ev;
    return ev;
  }

  /** Column (0 = left) and row (0 = top) for a square 1..100, zig-zag from the bottom left. */
  function squareToGrid(n) {
    var k = n - 1;
    var rowFromBottom = Math.floor(k / 10);
    var c = k % 10;
    var col = (rowFromBottom % 2 === 0) ? c : 9 - c;
    return { col: col, row: 9 - rowFromBottom };
  }

  function describe(state, ev) {
    var name = state.players[ev.player].name;
    var you = name === 'You';
    if (ev.home) return name + ' rolled ' + ev.die + ' and got home. ' + name + (you ? ' win!' : ' wins!');
    var s = name + ' rolled ' + ev.die + ' to square ' + ev.landed;
    if (ev.jump === 'ladder') s += ', climbed a ladder up to ' + ev.to;
    else if (ev.jump === 'snake') s += ', slid down a snake to ' + ev.to;
    s += '.';
    if (ev.capped) s += ' That is a long enough race.';
    else if (ev.again) s += ' A six, so ' + name + (you ? ' go again.' : ' goes again.');
    return s;
  }

  return {
    LAST: LAST, ROLL_CAP: ROLL_CAP, ROLLS_PER_TURN: ROLLS_PER_TURN, BOT_NAME: BOT_NAME,
    JUMPS: JUMPS, makeRng: makeRng, defaultRng: defaultRng, rollDie: rollDie,
    createGame: createGame, roll: roll, squareToGrid: squareToGrid, describe: describe
  };
});
