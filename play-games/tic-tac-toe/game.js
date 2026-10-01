/* Tic-Tac-Toe rules + AI. Plain JS, no dependencies. Works in a browser and in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TicTacToeGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // board: 9 cells, 0 empty, 1 = X (player 0, moves first), 2 = O (player 1). turn: 0 or 1.
  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

  function newGame() { return { board: [0,0,0,0,0,0,0,0,0], turn: 0 }; }
  function winningLine(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l.slice();
    }
    return [];
  }
  function outcome(s) {
    var line = winningLine(s.board);
    if (line.length) return { over: true, winner: s.board[line[0]] - 1, line: line };
    if (s.board.every(function (c) { return c !== 0; })) return { over: true, winner: -1, line: [] };
    return { over: false, winner: -1, line: [] };
  }
  function legalMoves(s) {
    if (outcome(s).over) return [];
    var out = [];
    for (var i = 0; i < 9; i++) if (s.board[i] === 0) out.push(i);
    return out;
  }
  function applyMove(s, cell) {
    if (!(cell >= 0 && cell < 9) || s.board[cell] !== 0 || outcome(s).over) throw new Error('illegal move');
    var b = s.board.slice(); b[cell] = s.turn + 1;
    return { board: b, turn: 1 - s.turn, last: cell };
  }
  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }

  // Score from the point of view of `me`: win = 10 - depth, loss = depth - 10.
  function minimax(s, me, depth) {
    var o = outcome(s);
    if (o.over) return o.winner === me ? 10 - depth : o.winner === -1 ? 0 : depth - 10;
    var best = s.turn === me ? -99 : 99, moves = legalMoves(s);
    for (var i = 0; i < moves.length; i++) {
      var v = minimax(applyMove(s, moves[i]), me, depth + 1);
      if (s.turn === me ? v > best : v < best) best = v;
    }
    return best;
  }

  function aiMove(s, level, rng) {
    rng = rng || Math.random;
    var moves = legalMoves(s);
    if (!moves.length) return null;
    var me = s.turn;
    function finishing(player) {
      return moves.filter(function (m) {
        var b = s.board.slice(); b[m] = player + 1;
        return winningLine(b).length > 0;
      });
    }
    if (level === 'easy') {
      var w = finishing(me);
      if (w.length && rng() < 0.5) return pick(w, rng);
      return pick(moves, rng);
    }
    if (level === 'medium') {
      var win = finishing(me); if (win.length) return win[0];
      var blk = finishing(1 - me); if (blk.length) return blk[0];
      if (rng() < 0.25) return pick(moves, rng);
      for (var i = 0; i < ORDER.length; i++) if (s.board[ORDER[i]] === 0) return ORDER[i];
    }
    // hard: perfect play, random among equally good moves
    var bestScore = -99, bestMoves = [];
    moves.forEach(function (m) {
      var v = minimax(applyMove(s, m), me, 1);
      if (v > bestScore) { bestScore = v; bestMoves = [m]; } else if (v === bestScore) bestMoves.push(m);
    });
    return pick(bestMoves, rng);
  }

  return { LINES: LINES, newGame: newGame, legalMoves: legalMoves, applyMove: applyMove,
           outcome: outcome, aiMove: aiMove, winningLine: winningLine };
});
