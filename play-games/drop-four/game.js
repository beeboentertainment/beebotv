/* Drop Four rules + AI. 7 columns x 6 rows. Plain JS, works in a browser and in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DropFourGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ROWS = 6, COLS = 7;
  // board: 42 cells row-major, row 0 = top. 0 empty, 1 = player 0 (moves first), 2 = player 1.
  function newGame() { return { board: new Array(ROWS * COLS).fill(0), turn: 0 }; }

  function winningLine(b) {
    var dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var v = b[r * COLS + c]; if (!v) continue;
      for (var d = 0; d < 4; d++) {
        var cells = [], ok = true;
        for (var k = 0; k < 4; k++) {
          var rr = r + dirs[d][0] * k, cc = c + dirs[d][1] * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr * COLS + cc] !== v) { ok = false; break; }
          cells.push(rr * COLS + cc);
        }
        if (ok) return cells;
      }
    }
    return [];
  }
  function outcome(s) {
    var line = winningLine(s.board);
    if (line.length) return { over: true, winner: s.board[line[0]] - 1, line: line };
    if (s.board.every(function (c) { return c !== 0; })) return { over: true, winner: -1, line: [] };
    return { over: false, winner: -1, line: [] };
  }
  function dropRow(b, col) {
    for (var r = ROWS - 1; r >= 0; r--) if (b[r * COLS + col] === 0) return r;
    return -1;
  }
  function legalMoves(s) {
    if (outcome(s).over) return [];
    var out = [];
    for (var c = 0; c < COLS; c++) if (s.board[c] === 0) out.push(c);
    return out;
  }
  function applyMove(s, col) {
    if (!(col >= 0 && col < COLS)) throw new Error('illegal move');
    var r = dropRow(s.board, col);
    if (r < 0) throw new Error('column full');
    if (outcome(s).over) throw new Error('game over');
    var b = s.board.slice(); b[r * COLS + col] = s.turn + 1;
    return { board: b, turn: 1 - s.turn, last: r * COLS + col };
  }
  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }
  var CENTRE = [3, 2, 4, 1, 5, 0, 6];

  function wins(s, col, player) {
    var r = dropRow(s.board, col); if (r < 0) return false;
    var b = s.board.slice(); b[r * COLS + col] = player + 1;
    return winningLine(b).length > 0;
  }

  // Heuristic: centre column plus open windows of four.
  function evaluate(b, me) {
    var score = 0, mine = me + 1, theirs = 2 - me, r;
    for (r = 0; r < ROWS; r++) { if (b[r * COLS + 3] === mine) score += 3; else if (b[r * COLS + 3] === theirs) score -= 3; }
    var dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) for (var d = 0; d < 4; d++) {
      var m = 0, t = 0, ok = true;
      for (var k = 0; k < 4; k++) {
        var rr = r + dirs[d][0] * k, cc = c + dirs[d][1] * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; }
        var v = b[rr * COLS + cc]; if (v === mine) m++; else if (v === theirs) t++;
      }
      if (!ok || (m && t)) continue;
      if (m === 3) score += 5; else if (m === 2) score += 2;
      if (t === 3) score -= 5; else if (t === 2) score -= 2;
    }
    return score;
  }

  function search(s, depth, alpha, beta, me) {
    var o = outcome(s);
    if (o.over) return o.winner === me ? 100000 + depth : o.winner === -1 ? 0 : -100000 - depth;
    if (depth === 0) return evaluate(s.board, me);
    var maxing = s.turn === me, best = maxing ? -Infinity : Infinity;
    for (var i = 0; i < CENTRE.length; i++) {
      var c = CENTRE[i]; if (s.board[c] !== 0) continue;
      var v = search(applyMove(s, c), depth - 1, alpha, beta, me);
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
    var me = s.turn, i;
    var win = moves.filter(function (c) { return wins(s, c, me); });
    var blk = moves.filter(function (c) { return wins(s, c, 1 - me); });
    if (level === 'easy') {
      if (win.length && rng() < 0.6) return win[0];
      if (blk.length && rng() < 0.4) return blk[0];
      return pick(moves, rng);
    }
    if (win.length) return win[0];
    if (blk.length) return blk[0];
    if (level === 'medium') {
      // Prefer central columns that do not hand the opponent a win on top.
      var safe = moves.filter(function (c) {
        var n = applyMove(s, c);
        return !legalMoves(n).some(function (c2) { return wins(n, c2, 1 - me); });
      });
      var pool = safe.length ? safe : moves;
      if (rng() < 0.2) return pick(pool, rng);
      for (i = 0; i < CENTRE.length; i++) if (pool.indexOf(CENTRE[i]) >= 0) return CENTRE[i];
    }
    // hard: alpha-beta search, depth 7 early on, deeper once the board fills up
    var empties = s.board.filter(function (c) { return c === 0; }).length;
    var depth = empties <= 18 ? 9 : 7;
    var bestScore = -Infinity, bestMoves = [];
    for (i = 0; i < CENTRE.length; i++) {
      var c = CENTRE[i]; if (moves.indexOf(c) < 0) continue;
      var v = search(applyMove(s, c), depth - 1, -Infinity, Infinity, me);
      if (v > bestScore) { bestScore = v; bestMoves = [c]; } else if (v === bestScore) bestMoves.push(c);
    }
    return bestMoves[0];
  }

  return { ROWS: ROWS, COLS: COLS, newGame: newGame, legalMoves: legalMoves, applyMove: applyMove,
           outcome: outcome, aiMove: aiMove, winningLine: winningLine, dropRow: dropRow };
});
