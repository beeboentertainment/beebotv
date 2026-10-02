/* Beebo Mancala: six pits, four stones, traditional sowing, capture and extra-turn rules. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MancalaGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function store(seat) { return seat ? 13 : 6; }
  function pits(seat) { return seat ? [7,8,9,10,11,12] : [0,1,2,3,4,5]; }
  function newGame() {
    return { board: Array.from({length:14}, function(_,i){ return i===6||i===13?0:4; }), turn:0,
      done:false, winner:-1, last:null, moves:0 };
  }
  function legalMoves(state) {
    if (state.done) return [];
    return pits(state.turn).filter(function(i){ return state.board[i]>0; });
  }
  function outcome(state) {
    return {over:state.done,winner:state.winner,scores:[state.board[6],state.board[13]]};
  }
  function applyMove(state,pit) {
    if (!legalMoves(state).includes(pit)) throw new Error('Choose a non-empty pit on your side');
    var board=state.board.slice(), seat=state.turn, hand=board[pit], at=pit, path=[];
    board[pit]=0;
    while (hand>0) {
      at=(at+1)%14;
      if (at===store(1-seat)) continue;
      board[at]++; hand--; path.push(at);
    }
    var again=at===store(seat), captured=0;
    if (!again && pits(seat).includes(at) && board[at]===1 && board[12-at]>0) {
      captured=board[12-at]+1;
      board[store(seat)]+=captured; board[12-at]=0; board[at]=0;
    }
    var done=pits(0).every(function(i){return board[i]===0;}) ||
      pits(1).every(function(i){return board[i]===0;});
    if (done) {
      for(var s=0;s<2;s++) pits(s).forEach(function(i){board[store(s)]+=board[i];board[i]=0;});
      again=false;
    }
    return {board:board,turn:done||again?seat:1-seat,done:done,
      winner:done?(board[6]===board[13]?-1:board[6]>board[13]?0:1):-1,
      last:{seat:seat,pit:pit,path:path,captured:captured,again:again},moves:state.moves+1};
  }
  function score(state,me) {
    var other=1-me,diff=state.board[store(me)]-state.board[store(other)];
    if(state.done) return diff*1000;
    var own=pits(me).reduce(function(n,i){return n+state.board[i];},0);
    var theirs=pits(other).reduce(function(n,i){return n+state.board[i];},0);
    return diff*100+own-theirs;
  }
  function search(state,me,depth,alpha,beta) {
    if(state.done||depth===0) return score(state,me);
    var moves=legalMoves(state), maximizing=state.turn===me;
    var best=maximizing?-Infinity:Infinity;
    for(var i=0;i<moves.length;i++) {
      var val=search(applyMove(state,moves[i]),me,depth-1,alpha,beta);
      if(maximizing) {best=Math.max(best,val);alpha=Math.max(alpha,best);}
      else {best=Math.min(best,val);beta=Math.min(beta,best);}
      if(beta<=alpha) break;
    }
    return best;
  }
  function botMove(state,level,rng) {
    rng=rng||Math.random; level=level||'medium';
    var moves=legalMoves(state);
    if(!moves.length) return null;
    if(level==='easy') return moves[Math.floor(rng()*moves.length)];
    var depth=level==='hard'?7:4,best=-Infinity,choice=[];
    moves.forEach(function(pit){
      var value=search(applyMove(state,pit),state.turn,depth-1,-Infinity,Infinity);
      if(value>best){best=value;choice=[pit];} else if(value===best) choice.push(pit);
    });
    return choice[Math.floor(rng()*choice.length)];
  }
  return {newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,outcome:outcome,
    botMove:botMove,pits:pits,store:store};
});
