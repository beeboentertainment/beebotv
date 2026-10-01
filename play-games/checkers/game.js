/* Checkers (English draughts) rules + AI. Plain JS, works in a browser and in Node.
 * Rules follow the Beebo Android app: compulsory capture (any jump, not necessarily the longest),
 * men move and jump forward only, kings step one square in four directions (no flying), a multi-jump
 * must be finished, crowning ends the turn, no legal move = loss, 40 quiet half-moves = draw.
 * board: 64 cells row-major from top-left. 0 empty, 1 player-0 man, 2 player-1 man, 3 player-0 king,
 * 4 player-1 king. Only dark squares ((row+col) odd) are used. Player 0 starts at the bottom, moves first. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CheckersGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var N = 8, QUIET_LIMIT = 40;
  function seatOf(p) { return p === 1 || p === 3 ? 0 : p === 2 || p === 4 ? 1 : -1; }
  function isKing(p) { return p >= 3; }
  function dark(cell) { return (Math.floor(cell / N) + cell % N) % 2 === 1; }

  function newGame() {
    var b = new Array(64).fill(0);
    for (var i = 0; i < 64; i++) { if (!dark(i)) continue; var r = Math.floor(i / N); if (r <= 2) b[i] = 2; if (r >= 5) b[i] = 1; }
    return { board: b, turn: 0, chaining: -1, quiet: 0, drawn: false };
  }
  function rowSteps(p) { return isKing(p) ? [-1, 1] : seatOf(p) === 0 ? [-1] : [1]; }
  function jumpsFrom(b, from) {
    var p = b[from], out = [];
    if (!p) return out;
    var r = Math.floor(from / N), c = from % N, rs = rowSteps(p);
    for (var i = 0; i < rs.length; i++) for (var dc = -1; dc <= 1; dc += 2) {
      var lr = r + 2 * rs[i], lc = c + 2 * dc;
      if (lr < 0 || lr >= N || lc < 0 || lc >= N) continue;
      var over = (r + rs[i]) * N + c + dc, v = b[over];
      if (v === 0 || seatOf(v) === seatOf(p) || b[lr * N + lc] !== 0) continue;
      out.push({ from: from, to: lr * N + lc, captured: over });
    }
    return out;
  }
  function quietFrom(b, from) {
    var p = b[from], out = [];
    if (!p) return out;
    var r = Math.floor(from / N), c = from % N, rs = rowSteps(p);
    for (var i = 0; i < rs.length; i++) for (var dc = -1; dc <= 1; dc += 2) {
      var nr = r + rs[i], nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N || b[nr * N + nc] !== 0) continue;
      out.push({ from: from, to: nr * N + nc, captured: -1 });
    }
    return out;
  }
  function stepsFor(s) {
    if (s.chaining >= 0) return jumpsFrom(s.board, s.chaining);
    var jumps = [], quiets = [], i;
    for (i = 0; i < 64; i++) if (seatOf(s.board[i]) === s.turn) jumps = jumps.concat(jumpsFrom(s.board, i));
    if (jumps.length) return jumps;
    for (i = 0; i < 64; i++) if (seatOf(s.board[i]) === s.turn) quiets = quiets.concat(quietFrom(s.board, i));
    return quiets;
  }
  function outcome(s) {
    if (s.drawn) return { over: true, winner: -1, line: [], reason: 'draw' };
    if (!stepsFor(s).length) return { over: true, winner: 1 - s.turn, line: [], reason: 'blocked' };
    return { over: false, winner: -1, line: [] };
  }
  function legalMoves(s) { return s.drawn ? [] : stepsFor(s); }
  function applyMove(s, m) {
    var legal = s.drawn ? null : stepsFor(s).filter(function (x) { return x.from === m.from && x.to === m.to; })[0];
    if (!legal) throw new Error('illegal move');
    var b = s.board.slice(), piece = b[m.from];
    b[m.from] = 0;
    if (legal.captured >= 0) b[legal.captured] = 0;
    var row = Math.floor(m.to / N);
    var crowns = !isKing(piece) && ((s.turn === 0 && row === 0) || (s.turn === 1 && row === N - 1));
    b[m.to] = crowns ? piece + 2 : piece;
    var quiet = (legal.captured >= 0 || crowns) ? 0 : s.quiet + 1;
    var next = { board: b, turn: s.turn, chaining: -1, quiet: quiet, drawn: false,
                 last: { from: m.from, to: m.to, captured: legal.captured, crowned: crowns } };
    if (legal.captured >= 0 && !crowns && jumpsFrom(b, m.to).length) { next.chaining = m.to; return next; }
    next.turn = 1 - s.turn;
    if (quiet >= QUIET_LIMIT) next.drawn = true;
    return next;
  }
  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }

  function evaluate(b, me) {
    var score = 0;
    for (var i = 0; i < 64; i++) {
      var p = b[i]; if (!p) continue;
      var seat = seatOf(p), r = Math.floor(i / N), c = i % N, v;
      if (isKing(p)) v = 170 + ((c > 1 && c < 6 && r > 1 && r < 6) ? 6 : 0);
      else {
        var adv = seat === 0 ? N - 1 - r : r;
        v = 100 + adv * 4 + ((seat === 0 && r === 7) || (seat === 1 && r === 0) ? 8 : 0) + (c === 0 || c === 7 ? 2 : 0);
      }
      score += seat === me ? v : -v;
    }
    return score;
  }
  function search(s, depth, alpha, beta, me) {
    var o = outcome(s);
    if (o.over) return o.winner === me ? 100000 + depth : o.winner === -1 ? 0 : -100000 - depth;
    if (depth <= 0 && s.chaining < 0) return evaluate(s.board, me);
    var moves = stepsFor(s), maxing = s.turn === me, best = maxing ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      var n = applyMove(s, moves[i]);
      var v = search(n, n.turn === s.turn ? depth : depth - 1, alpha, beta, me);
      if (maxing) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }

  // One step of the AI's turn. During a multi-jump, call again (state.turn is unchanged).
  function aiMove(s, level, rng) {
    rng = rng || Math.random;
    var moves = legalMoves(s);
    if (!moves.length) return null;
    var me = s.turn;
    if (level === 'easy') return pick(moves, rng); // captures are compulsory already
    var depth = level === 'medium' ? 2 : 6;
    var bestScore = -Infinity, bestMoves = [];
    moves.forEach(function (m) {
      var n = applyMove(s, m);
      var v = search(n, n.turn === s.turn ? depth : depth - 1, -Infinity, Infinity, me);
      if (level === 'medium') v += rng() * 6;
      if (v > bestScore) { bestScore = v; bestMoves = [m]; } else if (v === bestScore) bestMoves.push(m);
    });
    return pick(bestMoves, rng);
  }

  return { N: N, newGame: newGame, legalMoves: legalMoves, applyMove: applyMove, outcome: outcome,
           aiMove: aiMove, seatOf: seatOf, isKing: isKing, dark: dark };
});
