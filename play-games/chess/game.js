/* Beebo Chess: dependency-free rules shared by browser UI and Node tests.
 * Squares are a1=0 through h8=63; white is positive, black negative.
 * This follows the Android ChessPosition rules, including castling, en passant,
 * four promotion choices, checkmate, stalemate, repetition and draw rules. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChessGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var LETTERS = '.PNBRQK', VALUES = [0, 100, 320, 330, 500, 900, 20000];
  var KNIGHT = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  var KING = [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]];
  var BISHOP = [[1,1],[1,-1],[-1,1],[-1,-1]];
  var ROOK = [[1,0],[-1,0],[0,1],[0,-1]];
  function sq(file, rank) { return rank * 8 + file; }
  function file(i) { return i & 7; }
  function rank(i) { return i >> 3; }
  function squareOf(name) {
    if (!/^[a-h][1-8]$/.test(name)) throw new Error('Invalid square');
    return sq(name.charCodeAt(0) - 97, Number(name[1]) - 1);
  }
  function squareName(i) { return String.fromCharCode(97 + file(i)) + (rank(i) + 1); }
  function pawnBeside(b, square, side) {
    var f=file(square), r=rank(square);
    return f>0 && b[sq(f-1,r)]===side || f<7 && b[sq(f+1,r)]===side;
  }
  function key(s) {
    var ep=s.ep>=0 && pawnBeside(s.board,s.ep-8*s.side,s.side) ? s.ep : -1;
    return s.board.join(',') + '|' + s.side + '|' + s.castling + '|' + ep;
  }
  function fromFen(fen) {
    var parts = fen.trim().split(/\s+/);
    if (parts.length !== 6) throw new Error('Invalid FEN');
    var rows = parts[0].split('/'), b = new Array(64).fill(0);
    if (rows.length !== 8) throw new Error('Invalid FEN board');
    rows.forEach(function (row, index) {
      var f = 0;
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (/^[1-8]$/.test(ch)) { f += Number(ch); continue; }
        var p = LETTERS.indexOf(ch.toUpperCase());
        if (p < 1 || f >= 8) throw new Error('Invalid FEN piece');
        b[sq(f++, 7 - index)] = ch === ch.toUpperCase() ? p : -p;
      }
      if (f !== 8) throw new Error('Invalid FEN rank');
    });
    if (b.filter(function (p) { return p === 6; }).length !== 1 || b.filter(function (p) { return p === -6; }).length !== 1) throw new Error('FEN needs both kings');
    if (parts[1] !== 'w' && parts[1] !== 'b') throw new Error('Invalid FEN side');
    if (parts[2] !== '-' && !/^(K?Q?k?q?)$/.test(parts[2])) throw new Error('Invalid FEN castling');
    var rights = (parts[2].includes('K') ? 1 : 0) | (parts[2].includes('Q') ? 2 : 0) | (parts[2].includes('k') ? 4 : 0) | (parts[2].includes('q') ? 8 : 0);
    var ep = parts[3] === '-' ? -1 : squareOf(parts[3]);
    var halfmove = Number(parts[4]), fullmove = Number(parts[5]);
    if (!Number.isInteger(halfmove) || halfmove < 0 || !Number.isInteger(fullmove) || fullmove < 1) throw new Error('Invalid FEN counters');
    var s = { board: b, side: parts[1] === 'w' ? 1 : -1, castling: rights, ep: ep, halfmove: halfmove, fullmove: fullmove, last: null };
    s.history = [key(s)];
    return s;
  }
  function toFen(s) {
    var rows = [];
    for (var r = 7; r >= 0; r--) {
      var row = '', empty = 0;
      for (var f = 0; f < 8; f++) {
        var p = s.board[sq(f,r)];
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        var ch = LETTERS[Math.abs(p)]; row += p > 0 ? ch : ch.toLowerCase();
      }
      if (empty) row += empty;
      rows.push(row);
    }
    var rights = (s.castling & 1 ? 'K' : '') + (s.castling & 2 ? 'Q' : '') + (s.castling & 4 ? 'k' : '') + (s.castling & 8 ? 'q' : '');
    return rows.join('/') + ' ' + (s.side > 0 ? 'w' : 'b') + ' ' + (rights || '-') + ' ' + (s.ep < 0 ? '-' : squareName(s.ep)) + ' ' + s.halfmove + ' ' + s.fullmove;
  }
  function inside(f,r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
  function attacked(s, target, by) {
    var b = s.board, f = file(target), r = rank(target), x, y, i, j, p;
    var pawnRank = r - by;
    for (i = -1; i <= 1; i += 2) if (inside(f+i,pawnRank) && b[sq(f+i,pawnRank)] === by) return true;
    for (i = 0; i < KNIGHT.length; i++) { x = f + KNIGHT[i][0]; y = r + KNIGHT[i][1]; if (inside(x,y) && b[sq(x,y)] === by*2) return true; }
    for (i = 0; i < KING.length; i++) { x = f + KING[i][0]; y = r + KING[i][1]; if (inside(x,y) && b[sq(x,y)] === by*6) return true; }
    for (j = 0; j < 8; j++) {
      var dir = j < 4 ? BISHOP[j] : ROOK[j-4]; x = f + dir[0]; y = r + dir[1];
      while (inside(x,y)) {
        p = b[sq(x,y)];
        if (p) { if (p === by*5 || p === by*(j < 4 ? 3 : 4)) return true; break; }
        x += dir[0]; y += dir[1];
      }
    }
    return false;
  }
  function inCheck(s, side) {
    var king = s.board.indexOf((side || s.side) * 6);
    return king < 0 || attacked(s, king, -(side || s.side));
  }
  function pseudoMoves(s) {
    var b = s.board, us = s.side, out = [];
    function add(from,to,extra) { var m = { from: from, to: to }; if (extra) Object.assign(m,extra); out.push(m); }
    function pawn(from,to,extra) {
      if (rank(to) === (us > 0 ? 7 : 0)) [5,4,3,2].forEach(function (p) { add(from,to,Object.assign({},extra,{promotion:p})); });
      else add(from,to,extra);
    }
    function jump(from, dirs) {
      var f = file(from), r = rank(from);
      dirs.forEach(function (d) { var x=f+d[0], y=r+d[1]; if (inside(x,y)) { var t=sq(x,y); if (!b[t] || b[t]*us < 0 && Math.abs(b[t]) !== 6) add(from,t); } });
    }
    function slide(from, dirs) {
      var f=file(from), r=rank(from);
      dirs.forEach(function (d) { var x=f+d[0],y=r+d[1]; while (inside(x,y)) { var t=sq(x,y), v=b[t]; if (v*us > 0) break; if (Math.abs(v) !== 6) add(from,t); if (v) break; x+=d[0];y+=d[1]; } });
    }
    for (var from=0;from<64;from++) {
      var p=b[from]; if (!p || p*us < 0) continue;
      var f=file(from),r=rank(from),kind=Math.abs(p),to,other;
      if (kind===1) {
        to=from+8*us;
        if (to>=0 && to<64 && !b[to]) {
          pawn(from,to);
          other=from+16*us;
          if (r===(us>0?1:6) && !b[other]) add(from,other);
        }
        for (var df=-1;df<=1;df+=2) {
          if (!inside(f+df,r+us)) continue;
          to=sq(f+df,r+us);
          if (b[to]*us<0 && Math.abs(b[to])!==6) pawn(from,to);
          if (to===s.ep && !b[to] && b[to-8*us]===-us) add(from,to,{ep:true});
        }
      } else if (kind===2) jump(from,KNIGHT);
      else if (kind===3) slide(from,BISHOP);
      else if (kind===4) slide(from,ROOK);
      else if (kind===5) slide(from,BISHOP.concat(ROOK));
      else {
        jump(from,KING);
        var home=us>0?0:7, base=sq(4,home), enemy=-us;
        if (from===base && !inCheck(s,us)) {
          if ((s.castling & (us>0?1:4)) && b[sq(7,home)]===us*4 && !b[sq(5,home)] && !b[sq(6,home)] && !attacked(s,sq(5,home),enemy) && !attacked(s,sq(6,home),enemy)) add(from,sq(6,home),{castle:'king'});
          if ((s.castling & (us>0?2:8)) && b[sq(0,home)]===us*4 && !b[sq(1,home)] && !b[sq(2,home)] && !b[sq(3,home)] && !attacked(s,sq(3,home),enemy) && !attacked(s,sq(2,home),enemy)) add(from,sq(2,home),{castle:'queen'});
        }
      }
    }
    return out;
  }
  function applyUnchecked(s,m) {
    var b=s.board.slice(), piece=b[m.from], captured=b[m.to], us=s.side, rights=s.castling;
    b[m.from]=0;
    if (m.ep) { captured=b[m.to-8*us]; b[m.to-8*us]=0; }
    b[m.to]=m.promotion ? us*m.promotion : piece;
    if (m.castle) { var row=us>0?0:7, rookFrom=sq(m.castle==='king'?7:0,row), rookTo=sq(m.castle==='king'?5:3,row); b[rookTo]=b[rookFrom]; b[rookFrom]=0; }
    if (piece===6) rights &= ~3;
    if (piece===-6) rights &= ~12;
    if (m.from===0 || m.to===0) rights &= ~2;
    if (m.from===7 || m.to===7) rights &= ~1;
    if (m.from===56 || m.to===56) rights &= ~8;
    if (m.from===63 || m.to===63) rights &= ~4;
    var next={board:b,side:-us,castling:rights,ep:-1,halfmove:Math.abs(piece)===1||captured?0:s.halfmove+1,fullmove:s.fullmove+(us<0?1:0),last:{from:m.from,to:m.to,promotion:m.promotion||0,castle:m.castle||'',capture:!!captured}};
    if (Math.abs(piece)===1 && Math.abs(m.to-m.from)===16 && pawnBeside(b,m.to,-us)) next.ep=(m.to+m.from)/2;
    next.history=(s.history||[key(s)]).concat(key(next));
    return next;
  }
  function legalMoves(s) {
    var us=s.side;
    return pseudoMoves(s).filter(function (m) { return !inCheck(applyUnchecked(s,m),us); });
  }
  function applyMove(s,m) {
    var found=legalMoves(s).find(function (x) { return x.from===m.from && x.to===m.to && (x.promotion||0)===(m.promotion||0); });
    if (!found) throw new Error('Illegal chess move');
    return applyUnchecked(s,found);
  }
  function insufficientMaterial(s) {
    var minors=0,knights=0,bishopColors=0;
    for (var i=0;i<64;i++) {
      var kind=Math.abs(s.board[i]);
      if (kind===1 || kind===4 || kind===5) return false;
      if (kind===2) { minors++;knights++; }
      if (kind===3) { minors++;bishopColors|=1<<((file(i)+rank(i))%2); }
    }
    return minors<=1 || knights===0 && bishopColors!==3;
  }
  function outcome(s) {
    var moves=legalMoves(s);
    if (!moves.length) return {over:true,winner:inCheck(s)?-s.side:0,reason:inCheck(s)?'checkmate':'stalemate'};
    if (insufficientMaterial(s)) return {over:true,winner:0,reason:'insufficient material'};
    if (s.halfmove>=100) return {over:true,winner:0,reason:'fifty moves'};
    var k=key(s),hits=(s.history||[]).filter(function(x){return x===k;}).length;
    if (hits>=3) return {over:true,winner:0,reason:'threefold repetition'};
    return {over:false,winner:0,reason:''};
  }
  function perft(s,depth) {
    if (depth===0) return 1;
    var moves=legalMoves(s),n=0;
    if (depth===1) return moves.length;
    for (var i=0;i<moves.length;i++) n+=perft(applyUnchecked(s,moves[i]),depth-1);
    return n;
  }
  function evaluate(s) {
    var score=0;
    for (var i=0;i<64;i++) { var p=s.board[i]; if (!p) continue; var v=VALUES[Math.abs(p)]; if (Math.abs(p)===1) v+=6*(p>0?rank(i):7-rank(i)); if (Math.abs(p)===2 || Math.abs(p)===3) v+=3*(3-Math.abs(file(i)-3.5)+3-Math.abs(rank(i)-3.5)); score+=(p>0?v:-v); }
    return score*s.side;
  }
  function chooseMove(s,level,rng) {
    var moves=legalMoves(s); if (!moves.length) return null;
    rng=rng||Math.random;
    if (level==='easy') return moves[Math.floor(rng()*moves.length)];
    var depth=level==='hard'?2:1, best=-Infinity,candidates=[];
    function search(pos,d,alpha,beta) {
      var o=outcome(pos); if (o.over) return o.winner===0?0:o.winner===pos.side?100000:-100000;
      if (!d) return evaluate(pos);
      var list=legalMoves(pos),top=-Infinity;
      for (var j=0;j<list.length;j++) { var val=-search(applyUnchecked(pos,list[j]),d-1,-beta,-alpha); if (val>top) top=val; if (val>alpha) alpha=val; if (alpha>=beta) break; }
      return top;
    }
    for (var i=0;i<moves.length;i++) {
      var value=-search(applyUnchecked(s,moves[i]),depth-1,-Infinity,Infinity);
      if (value>best) { best=value;candidates=[moves[i]]; } else if (value===best) candidates.push(moves[i]);
    }
    return candidates[Math.floor(rng()*candidates.length)];
  }
  return {START_FEN:START_FEN,newGame:function(){return fromFen(START_FEN);},fromFen:fromFen,toFen:toFen,squareOf:squareOf,squareName:squareName,attacked:attacked,inCheck:inCheck,legalMoves:legalMoves,applyMove:applyMove,outcome:outcome,perft:perft,chooseMove:chooseMove};
});
