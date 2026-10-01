/* Reversi rules + AI. 8x8. Plain JS, works in a browser and in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReversiGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var N = 8;
  // board: 64 cells row-major. 0 empty, 1 = player 0 (dark, moves first), 2 = player 1 (light).
  // Passing is automatic: if the next player cannot move, the turn stays with the mover (state.passed).
  var DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  var WEIGHTS = [
    100,-20, 10,  5,  5, 10,-20,100,
    -20,-50, -2, -2, -2, -2,-50,-20,
     10, -2,  3,  1,  1,  3, -2, 10,
      5, -2,  1,  0,  0,  1, -2,  5,
      5, -2,  1,  0,  0,  1, -2,  5,
     10, -2,  3,  1,  1,  3, -2, 10,
    -20,-50, -2, -2, -2, -2,-50,-20,
    100,-20, 10,  5,  5, 10,-20,100];

  function newGame() {
    var b = new Array(64).fill(0);
    b[3 * N + 3] = 2; b[3 * N + 4] = 1; b[4 * N + 3] = 1; b[4 * N + 4] = 2;
    return { board: b, turn: 0, passed: false };
  }
  function flips(b, cell, p) { // p = 1|2; returns the cells that would flip
    if (b[cell] !== 0) return [];
    var r = Math.floor(cell / N), c = cell % N, out = [];
    for (var d = 0; d < 8; d++) {
      var line = [], rr = r + DIRS[d][0], cc = c + DIRS[d][1];
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr * N + cc] === 3 - p) {
        line.push(rr * N + cc); rr += DIRS[d][0]; cc += DIRS[d][1];
      }
      if (line.length && rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr * N + cc] === p) out = out.concat(line);
    }
    return out;
  }
  function movesFor(b, p) {
    var out = [];
    for (var i = 0; i < 64; i++) if (b[i] === 0 && flips(b, i, p).length) out.push(i);
    return out;
  }
  function counts(b) {
    var a = 0, c = 0;
    for (var i = 0; i < 64; i++) { if (b[i] === 1) a++; else if (b[i] === 2) c++; }
    return [a, c];
  }
  function outcome(s) {
    if (movesFor(s.board, 1).length || movesFor(s.board, 2).length) return { over: false, winner: -1, line: [] };
    var c = counts(s.board);
    return { over: true, winner: c[0] > c[1] ? 0 : c[1] > c[0] ? 1 : -1, line: [], counts: c };
  }
  function legalMoves(s) { return movesFor(s.board, s.turn + 1); }
  function applyMove(s, cell) {
    var p = s.turn + 1, f = flips(s.board, cell, p);
    if (!f.length) throw new Error('illegal move');
    var b = s.board.slice(); b[cell] = p;
    f.forEach(function (i) { b[i] = p; });
    var other = 1 - s.turn;
    if (movesFor(b, other + 1).length) return { board: b, turn: other, passed: false, last: cell, flipped: f };
    if (movesFor(b, p).length) return { board: b, turn: s.turn, passed: true, passer: other, last: cell, flipped: f };
    return { board: b, turn: other, passed: false, last: cell, flipped: f };
  }
  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }

  function evaluate(b, me) {
    var mine = me + 1, theirs = 2 - me, pos = 0, i;
    for (i = 0; i < 64; i++) { if (b[i] === mine) pos += WEIGHTS[i]; else if (b[i] === theirs) pos -= WEIGHTS[i]; }
    var m1 = movesFor(b, mine).length, m2 = movesFor(b, theirs).length;
    var mob = (m1 + m2) ? 50 * (m1 - m2) / (m1 + m2) : 0;
    return pos + mob;
  }
  function search(s, depth, alpha, beta, me) {
    var m1 = movesFor(s.board, 1), m2 = movesFor(s.board, 2);
    if (!m1.length && !m2.length) { var c = counts(s.board); return (c[me] - c[1 - me]) * 1000; }
    if (depth === 0) return evaluate(s.board, me);
    var moves = s.turn === 0 ? m1 : m2, maxing = s.turn === me, best = maxing ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      var v = search(applyMove(s, moves[i]), depth - 1, alpha, beta, me);
      if (maxing) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }

  function aiMove(s, level, rng) {
    rng = rng || Math.random;
    var moves = legalMoves(s);
    if (!moves.length) return null;
    var me = s.turn;
    if (level === 'easy') return pick(moves, rng);
    if (level === 'medium') {
      // Greedy: favours corners and flips, shuns squares next to empty corners.
      var scored = moves.map(function (m) {
        return { m: m, v: flips(s.board, m, me + 1).length + WEIGHTS[m] * 0.5 + rng() };
      });
      scored.sort(function (a, b) { return b.v - a.v; });
      return scored[0].m;
    }
    var empties = s.board.filter(function (c) { return c === 0; }).length;
    var depth = empties <= 8 ? 8 : 4;
    var bestScore = -Infinity, bestMoves = [];
    moves.forEach(function (m) {
      var v = search(applyMove(s, m), depth - 1, -Infinity, Infinity, me);
      if (v > bestScore + 0.001) { bestScore = v; bestMoves = [m]; } else if (Math.abs(v - bestScore) <= 0.001) bestMoves.push(m);
    });
    return pick(bestMoves, rng);
  }

  return { N: N, newGame: newGame, legalMoves: legalMoves, applyMove: applyMove, outcome: outcome,
           aiMove: aiMove, flips: function (b, cell, p) { return flips(b, cell, p + 1); }, counts: counts };
});
