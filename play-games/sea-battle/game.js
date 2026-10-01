/* Sea Battle - rules and computer opponent for the Beebo Entertainment website.
 *
 * Plain JavaScript, no dependencies; browser (window.BeeboSeaBattle) and node (module.exports).
 * Rules follow the Android Campsite game: an 8 x 8 sea, five ships of length 4, 3, 3, 2, 2
 * that may touch but never overlap, ONE shot per turn (hit or miss), sink every ship to win.
 *
 * A cell is numbered row * 8 + col. "Shot knowledge" values for what a captain has learnt
 * about the enemy sea: 0 unfired, 1 miss, 2 hit, 3 part of a sunk ship.
 *
 * The computer only ever reads its own record of shots (the same sheet a person would have).
 * It is never handed the enemy fleet.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeeboSeaBattle = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 8;
  var CELLS = W * W;
  var SHIPS = [4, 3, 3, 2, 2];
  var BOT_NAME = 'Hopping Beebo';

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

  function label(cell) { return String.fromCharCode(65 + (cell % W)) + (Math.floor(cell / W) + 1); }

  /** Cells for a ship of `size` whose first cell is (row, col); null if it would leave the sea. */
  function shipCells(row, col, size, across) {
    var out = [];
    for (var i = 0; i < size; i++) {
      var r = across ? row : row + i;
      var c = across ? col + i : col;
      if (r < 0 || r >= W || c < 0 || c >= W) return null;
      out.push(r * W + c);
    }
    return out;
  }

  /** Can `cells` join a fleet that already uses the cells in `taken` (an array or set)? */
  function canPlace(cells, taken) {
    if (!cells) return false;
    var set = {};
    for (var i = 0; i < taken.length; i++) set[taken[i]] = true;
    for (var j = 0; j < cells.length; j++) if (set[cells[j]]) return false;
    return true;
  }

  /** Random legal fleet: [{size, cells}] in SHIPS order. */
  function placeFleet(rng) {
    for (var attempt = 0; attempt < 60; attempt++) {
      var taken = [], fleet = [], failed = false;
      for (var s = 0; s < SHIPS.length && !failed; s++) {
        var size = SHIPS[s], chosen = null;
        for (var t = 0; t < 400 && !chosen; t++) {
          var across = rng() < 0.5;
          var row = Math.floor(rng() * (across ? W : W - size + 1));
          var col = Math.floor(rng() * (across ? W - size + 1 : W));
          var cells = shipCells(row, col, size, across);
          if (cells && canPlace(cells, taken)) chosen = cells;
        }
        if (!chosen) { failed = true; break; }
        taken = taken.concat(chosen);
        fleet.push({ size: size, cells: chosen });
      }
      if (!failed) return fleet;
    }
    // Floor that always exists (never reached in practice).
    return SHIPS.map(function (size, i) {
      var cells = []; for (var k = 0; k < size; k++) cells.push(i * W + k);
      return { size: size, cells: cells };
    });
  }

  /** True when `fleet` is exactly the right ships, straight, in bounds and not overlapping. */
  function validFleet(fleet) {
    if (!Array.isArray(fleet) || fleet.length !== SHIPS.length) return false;
    var sizes = fleet.map(function (s) { return s.size; }).sort().join(',');
    if (sizes !== SHIPS.slice().sort().join(',')) return false;
    var seen = {};
    for (var i = 0; i < fleet.length; i++) {
      var ship = fleet[i];
      if (!ship.cells || ship.cells.length !== ship.size) return false;
      var rows = {}, cols = {};
      for (var k = 0; k < ship.cells.length; k++) {
        var c = ship.cells[k];
        if (!(c >= 0 && c < CELLS) || c !== Math.floor(c) || seen[c]) return false;
        seen[c] = true;
        rows[Math.floor(c / W)] = true; cols[c % W] = true;
      }
      var nr = Object.keys(rows).length, nc = Object.keys(cols).length;
      if (!((nr === 1 && nc === ship.size) || (nc === 1 && nr === ship.size))) return false;
      var sorted = ship.cells.slice().sort(function (a, b) { return a - b; });
      var step = nr === 1 ? 1 : W;
      for (var m = 1; m < sorted.length; m++) if (sorted[m] - sorted[m - 1] !== step) return false;
    }
    return true;
  }

  function copyFleet(fleet) {
    return fleet.map(function (s) { return { size: s.size, cells: s.cells.slice() }; });
  }

  function blankShots() { var a = []; for (var i = 0; i < CELLS; i++) a.push(0); return a; }

  /** opts: {fleets: [fleet0, fleet1], rng}. Player 0 shoots first. */
  function createGame(opts) {
    var fleets = opts.fleets;
    if (!fleets || fleets.length !== 2 || !validFleet(fleets[0]) || !validFleet(fleets[1])) {
      throw new Error('Both fleets must be legal.');
    }
    return {
      rng: opts.rng || defaultRng(),
      fleets: fleets.map(function (f) { return f.map(function (s) { return { size: s.size, cells: s.cells.slice(), hits: [] }; }); }),
      shots: [blankShots(), blankShots()],  // shots[i]: what captain i knows about the OTHER sea
      turn: 0, over: false, winner: -1, last: null, shotCount: [0, 0]
    };
  }

  /** Captain `player` calls `cell`. Returns {player, cell, hit, sunk (size or 0), over}. */
  function fire(state, player, cell) {
    if (state.over) throw new Error('This game has finished.');
    if (player !== state.turn) throw new Error('It is the other captain\'s turn.');
    if (!(cell >= 0 && cell < CELLS) || cell !== Math.floor(cell)) throw new Error('That square is not on the sea.');
    var mine = state.shots[player];
    if (mine[cell] !== 0) throw new Error('That square has already been called.');
    var target = 1 - player;
    var hitShip = null;
    state.fleets[target].forEach(function (ship) { if (ship.cells.indexOf(cell) >= 0) hitShip = ship; });
    var ev = { player: player, cell: cell, hit: !!hitShip, sunk: 0, over: false };
    state.shotCount[player]++;
    if (!hitShip) {
      mine[cell] = 1;
    } else {
      hitShip.hits.push(cell);
      mine[cell] = 2;
      if (hitShip.hits.length === hitShip.cells.length) {
        ev.sunk = hitShip.size;
        hitShip.cells.forEach(function (c) { mine[c] = 3; });
      }
    }
    if (state.fleets[target].every(function (s) { return s.hits.length === s.cells.length; })) {
      state.over = true; state.winner = player; ev.over = true;
    } else {
      state.turn = target;
    }
    state.last = ev;
    return ev;
  }

  /** Ships (sizes) the captain has not yet sunk, from the sizes of the enemy fleet. */
  function afloatSizes(state, player) {
    return state.fleets[1 - player].filter(function (s) { return s.hits.length < s.cells.length; })
      .map(function (s) { return s.size; });
  }

  function neighbours(cell) {
    var r = Math.floor(cell / W), c = cell % W, out = [];
    if (r > 0) out.push(cell - W);
    if (r < W - 1) out.push(cell + W);
    if (c > 0) out.push(cell - 1);
    if (c < W - 1) out.push(cell + 1);
    return out;
  }

  /**
   * The computer's call. Reads ONLY `known` (its own shot sheet) and `remaining` (the sizes
   * of enemy ships still afloat, which a person also knows because sinkings are announced).
   * Every cell returned is unfired.
   */
  function chooseShot(known, remaining, level, rng) {
    var unfired = [];
    for (var i = 0; i < CELLS; i++) if (known[i] === 0) unfired.push(i);
    if (!unfired.length) return -1;
    var wounded = [];
    for (var w = 0; w < CELLS; w++) if (known[w] === 2) wounded.push(w);

    if (level === 'easy') {
      if (wounded.length && rng() < 0.5) {
        var opts = [];
        wounded.forEach(function (h) { neighbours(h).forEach(function (n) { if (known[n] === 0) opts.push(n); }); });
        if (opts.length) return pick(opts, rng);
      }
      return pick(unfired, rng);
    }

    if (level === 'medium') {
      if (wounded.length) {
        var near = [], aligned = [];
        wounded.forEach(function (h) {
          neighbours(h).forEach(function (n) {
            if (known[n] !== 0) return;
            near.push(n);
            // Prefer extending a line of two hits.
            var dir = n - h, back = h - dir;
            var sameRow = Math.floor(back / W) === Math.floor(h / W);
            var horizontal = Math.abs(dir) === 1;
            if (back >= 0 && back < CELLS && known[back] === 2 && (!horizontal || sameRow)) aligned.push(n);
          });
        });
        if (aligned.length) return pick(aligned, rng);
        if (near.length) return pick(near, rng);
      }
      var parity = unfired.filter(function (c) { return (Math.floor(c / W) + (c % W)) % 2 === 0; });
      return pick(parity.length ? parity : unfired, rng);
    }

    // Hard: probability density. Count every way each remaining ship could still lie.
    var score = []; for (var z = 0; z < CELLS; z++) score.push(0);
    remaining.forEach(function (size) {
      for (var across = 0; across < 2; across++) {
        for (var row = 0; row < W; row++) {
          for (var col = 0; col < W; col++) {
            var cells = shipCells(row, col, size, across === 0);
            if (!cells) continue;
            var ok = true, covers = 0;
            for (var k = 0; k < cells.length; k++) {
              var v = known[cells[k]];
              if (v === 1 || v === 3) { ok = false; break; }
              if (v === 2) covers++;
            }
            if (!ok) continue;
            // A placement explaining wounded squares is far likelier than a blank one.
            var weight = covers ? Math.pow(40, covers) : 1;
            for (var q = 0; q < cells.length; q++) if (known[cells[q]] === 0) score[cells[q]] += weight;
          }
        }
      }
    });
    var best = -1, shortlist = [];
    unfired.forEach(function (c) {
      if (score[c] > best) { best = score[c]; shortlist = [c]; } else if (score[c] === best) shortlist.push(c);
    });
    return pick(shortlist, rng);
  }

  /** Convenience: the computer's call for `player` in a live game. */
  function botShot(state, player, level) {
    return chooseShot(state.shots[player], afloatSizes(state, player), level, state.rng);
  }

  return {
    W: W, CELLS: CELLS, SHIPS: SHIPS, BOT_NAME: BOT_NAME,
    makeRng: makeRng, defaultRng: defaultRng, label: label, shipCells: shipCells, canPlace: canPlace,
    placeFleet: placeFleet, validFleet: validFleet, copyFleet: copyFleet,
    createGame: createGame, fire: fire, afloatSizes: afloatSizes, chooseShot: chooseShot, botShot: botShot
  };
});
