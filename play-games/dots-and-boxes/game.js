/* Dots and Boxes - rules and computer opponent for the Beebo Entertainment website.
 *
 * Plain JavaScript, no dependencies; browser (window.BeeboDots) and node (module.exports).
 * Ported from the Android Campsite game's rules and bot.
 *
 * LINES. Horizontal lines first, row by row: h(r,c) = r*cols + c for r in 0..rows, c in 0..cols-1.
 * Then vertical lines: v(r,c) = H + r*(cols+1) + c for r in 0..rows-1, c in 0..cols.
 * Box (r,c) is bounded by h(r,c), h(r+1,c), v(r,c) and v(r,c+1).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeeboDots = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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
  function shuffled(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function Board(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.horizontal = (rows + 1) * cols;
    this.lineCount = this.horizontal + rows * (cols + 1);
    this.boxCount = rows * cols;
    this.boxesOf = [];
    for (var line = 0; line < this.lineCount; line++) {
      var out = [];
      if (line < this.horizontal) {
        var r = Math.floor(line / cols), c = line % cols;
        if (r > 0) out.push((r - 1) * cols + c);
        if (r < rows) out.push(r * cols + c);
      } else {
        var k = line - this.horizontal;
        var rr = Math.floor(k / (cols + 1)), cc = k % (cols + 1);
        if (cc > 0) out.push(rr * cols + cc - 1);
        if (cc < cols) out.push(rr * cols + cc);
      }
      this.boxesOf.push(out);
    }
  }
  Board.prototype.h = function (r, c) { return r * this.cols + c; };
  Board.prototype.v = function (r, c) { return this.horizontal + r * (this.cols + 1) + c; };
  Board.prototype.sides = function (box) {
    var r = Math.floor(box / this.cols), c = box % this.cols;
    return [this.h(r, c), this.h(r + 1, c), this.v(r, c), this.v(r, c + 1)];
  };
  Board.prototype.drawnSides = function (lines, box) {
    var s = this.sides(box), n = 0;
    for (var i = 0; i < 4; i++) if (lines[s[i]]) n++;
    return n;
  };
  Board.prototype.completes = function (lines, line) {
    var n = 0, b = this.boxesOf[line];
    for (var i = 0; i < b.length; i++) if (this.drawnSides(lines, b[i]) === 3) n++;
    return n;
  };
  Board.prototype.isSafe = function (lines, line) {
    if (lines[line]) return false;
    var b = this.boxesOf[line];
    for (var i = 0; i < b.length; i++) if (this.drawnSides(lines, b[i]) >= 2) return false;
    return true;
  };
  Board.prototype.open = function (lines) {
    var out = [];
    for (var i = 0; i < this.lineCount; i++) if (!lines[i]) out.push(i);
    return out;
  };
  /** Draw and greedily take every box that becomes available; returns boxes taken. */
  Board.prototype.takeAll = function (lines) {
    var taken = 0;
    for (;;) {
      var found = -1;
      for (var i = 0; i < this.lineCount; i++) {
        if (!lines[i] && this.completes(lines, i) > 0) { found = i; break; }
      }
      if (found < 0) return taken;
      taken += this.completes(lines, found);
      lines[found] = 1;
    }
  };

  Board.prototype.choose = function (lines, level, rng) {
    var open = this.open(lines);
    if (!open.length) return -1;
    var self = this;
    var capturing = open.filter(function (l) { return self.completes(lines, l) > 0; });
    var safe = open.filter(function (l) { return self.isSafe(lines, l); });
    if (level === 'easy') {
      if (capturing.length && rng() < 0.7) return pick(capturing, rng);
      if (safe.length) return pick(safe, rng);
      return pick(open, rng);
    }
    if (level === 'medium') {
      if (capturing.length) return pick(capturing, rng);
      if (safe.length) return pick(safe, rng);
      return this._smallestGift(lines, open, rng);
    }
    return this._hard(lines, open, capturing, safe, rng);
  };

  Board.prototype._smallestGift = function (lines, open, rng) {
    var best = Infinity, shortlist = [];
    for (var i = 0; i < open.length; i++) {
      var line = open[i];
      var copy = lines.slice();
      copy[line] = 1;
      var separate = 0, b = this.boxesOf[line];
      for (var k = 0; k < b.length; k++) if (this.drawnSides(copy, b[k]) === 3) separate++;
      var given = this.takeAll(copy) * 10 - separate;
      if (given < best) { best = given; shortlist = [line]; }
      else if (given === best) shortlist.push(line);
    }
    return pick(shortlist, rng);
  };

  /** Chain-aware: control of the safe phase, taking boxes, and the double-dealing decline. */
  Board.prototype._hard = function (lines, open, capturing, safe, rng) {
    var self = this;
    if (capturing.length) {
      var after = lines.slice();
      var onOffer = this.takeAll(after);
      var safeAfter = this.open(after).some(function (l) { return self.isSafe(after, l); });
      var done = 0;
      for (var b = 0; b < this.boxCount; b++) if (this.drawnSides(lines, b) === 4) done++;
      var rest = this.boxCount - done - onOffer;
      if (!safeAfter && rest >= 3) {
        var dd = this._doubleDeal(lines, capturing);
        if (dd !== null) return dd;
      }
      return pick(capturing, rng);
    }
    if (safe.length) {
      if (safe.length <= 12) {
        var budget = [150000];
        var memo = {};
        var order = shuffled(safe, rng);
        for (var i = 0; i < order.length; i++) {
          var copy = lines.slice();
          copy[order[i]] = 1;
          var theyWin = this._moverWinsSafePhase(copy, memo, budget);
          if (budget[0] <= 0) break;
          if (!theyWin) return order[i];
        }
      }
      return pick(safe, rng);
    }
    return this._smallestGift(lines, open, rng);
  };

  Board.prototype._moverWinsSafePhase = function (lines, memo, budget) {
    var safe = [];
    for (var i = 0; i < this.lineCount; i++) if (this.isSafe(lines, i)) safe.push(i);
    if (!safe.length) return false;
    var key = lines.join('');
    if (memo[key] !== undefined) return memo[key];
    if (--budget[0] <= 0) return false;
    var wins = false;
    for (var s = 0; s < safe.length; s++) {
      lines[safe[s]] = 1;
      var opp = this._moverWinsSafePhase(lines, memo, budget);
      lines[safe[s]] = 0;
      if (!opp) { wins = true; break; }
      if (budget[0] <= 0) break;
    }
    memo[key] = wins;
    return wins;
  };

  Board.prototype._doubleDeal = function (lines, capturing) {
    for (var i = 0; i < capturing.length; i++) {
      var line = capturing[i];
      var boxes = this.boxesOf[line];
      var three = [];
      for (var k = 0; k < boxes.length; k++) if (this.drawnSides(lines, boxes[k]) === 3) three.push(boxes[k]);
      if (three.length !== 1 || boxes.length !== 2) continue;
      var first = three[0];
      var second = boxes[0] === first ? boxes[1] : boxes[0];
      if (this.drawnSides(lines, second) !== 2) continue;
      var far = -1, sd = this.sides(second);
      for (var s = 0; s < 4; s++) if (!lines[sd[s]] && sd[s] !== line) { far = sd[s]; break; }
      if (far < 0) continue;
      var beyond = -1, fb = this.boxesOf[far];
      for (var f = 0; f < fb.length; f++) if (fb[f] !== second) { beyond = fb[f]; break; }
      if (beyond >= 0 && this.drawnSides(lines, beyond) >= 2) continue;
      var elsewhere = false;
      for (var o = 0; o < capturing.length; o++) {
        var other = capturing[o];
        if (other === line) continue;
        var ob = this.boxesOf[other];
        if (!ob.some(function (x) { return x === first || x === second; })) elsewhere = true;
      }
      if (elsewhere) continue;
      return far;
    }
    return null;
  };

  /** opts: {size (boxes per side, 2..6), players:[{name,bot}] (2..4), level, rng} */
  function createGame(opts) {
    var size = opts.size || 4;
    var players = opts.players || [];
    if (players.length < 2 || players.length > 4) throw new Error('Dots and Boxes needs 2 to 4 players.');
    var board = new Board(size, size);
    var lines = []; for (var i = 0; i < board.lineCount; i++) lines.push(0);
    var owners = []; for (var b = 0; b < board.boxCount; b++) owners.push(-1);
    return {
      board: board,
      players: players.map(function (p, i) { return { name: p.name || ('Player ' + (i + 1)), bot: !!p.bot }; }),
      level: opts.level || 'medium',
      rng: opts.rng || defaultRng(),
      lines: lines,
      drawnBy: lines.map(function () { return -1; }),
      owners: owners,
      scores: players.map(function () { return 0; }),
      turn: 0, over: false, last: null, winners: []
    };
  }

  /** Draw a line for the current player. Returns {line, player, captured:[boxes], over, winners}. */
  function play(state, line) {
    if (state.over) throw new Error('This game has finished.');
    var board = state.board;
    if (!(line >= 0 && line < board.lineCount) || line !== Math.floor(line)) throw new Error('No such line.');
    if (state.lines[line]) throw new Error('That line is already drawn.');
    var who = state.turn;
    state.lines[line] = 1;
    state.drawnBy[line] = who;
    var captured = [];
    board.boxesOf[line].forEach(function (b) {
      if (state.owners[b] < 0 && board.drawnSides(state.lines, b) === 4) {
        state.owners[b] = who; captured.push(b); state.scores[who]++;
      }
    });
    var total = state.scores.reduce(function (a, b) { return a + b; }, 0);
    var ev = { line: line, player: who, captured: captured, over: false, winners: [] };
    if (total === board.boxCount) {
      state.over = true; ev.over = true;
      var best = Math.max.apply(null, state.scores);
      state.scores.forEach(function (s, i) { if (s === best) ev.winners.push(i); });
      state.winners = ev.winners;
    } else if (!captured.length) {
      state.turn = (state.turn + 1) % state.players.length;
    }
    state.last = ev;
    return ev;
  }

  /** The computer's choice for the current turn (never an illegal line). */
  function botChoose(state) {
    return state.board.choose(state.lines, state.level, state.rng);
  }

  function describe(state, ev) {
    var name = state.players[ev.player].name;
    var s = name + ' drew a line.';
    if (ev.captured.length) {
      s = name + ' closed ' + ev.captured.length + (ev.captured.length === 1 ? ' box' : ' boxes') + (ev.over ? '.' : (name === 'You' ? ' and go again.' : ' and goes again.'));
    }
    if (ev.over) {
      if (ev.winners.length === 1) {
        s += ' ' + state.players[ev.winners[0]].name + (state.players[ev.winners[0]].name === 'You' ? ' win with ' : ' wins with ') + state.scores[ev.winners[0]] + ' boxes.';
      } else {
        s += ' It is a draw.';
      }
    }
    return s;
  }

  return {
    BOT_NAME: BOT_NAME, makeRng: makeRng, defaultRng: defaultRng, Board: Board,
    createGame: createGame, play: play, botChoose: botChoose, describe: describe
  };
});
