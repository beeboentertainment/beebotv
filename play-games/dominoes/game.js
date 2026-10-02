/* Beebo Dominoes, double-six draw rules. Local and dependency-free.
 * Hands stay off the shared screen until the current player accepts the pass screen.
 * State is immutable after each move so tests and UI never change a prior turn. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DominoesGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function fullSet() {
    var tiles=[];
    for (var a=0;a<=6;a++) for (var b=a;b<=6;b++) tiles.push([a,b]);
    return tiles;
  }
  function shuffle(list,rng) {
    var out=list.slice();
    for (var i=out.length-1;i>0;i--) {
      var j=Math.floor(rng()*(i+1)),tmp=out[i]; out[i]=out[j];out[j]=tmp;
    }
    return out;
  }
  function clone(s) {
    return {hands:s.hands.map(function(h){return h.map(function(t){return t.slice();});}),
      boneyard:s.boneyard.map(function(t){return t.slice();}),line:s.line.map(function(t){return t.slice();}),
      turn:s.turn,players:s.players,done:s.done,winner:s.winner,reason:s.reason,scores:s.scores.slice(),
      last:s.last ? Object.assign({},s.last) : null,log:s.log.slice()};
  }
  function ends(s) { return s.line.length ? [s.line[0][0],s.line[s.line.length-1][1]] : []; }
  function fits(s,tile,end) { if (!s.line.length) return true; var e=ends(s)[end]; return tile[0]===e || tile[1]===e; }
  function playable(s,seat) { return s.hands[seat].some(function(t){return !s.line.length || fits(s,t,0)||fits(s,t,1);}); }
  function pipTotal(hand) { return hand.reduce(function(n,t){return n+t[0]+t[1];},0); }
  function opener(hands) {
    var best=-1,seat=0;
    hands.forEach(function(hand,i){hand.forEach(function(t){var v=t[0]===t[1]?100+t[0]:t[0]+t[1];if(v>best){best=v;seat=i;}});});
    return seat;
  }
  function newGame(players,rng) {
    players=players||2; rng=rng||Math.random;
    if (!Number.isInteger(players)||players<2||players>4) throw new Error('Dominoes needs two to four players');
    var deck=shuffle(fullSet(),rng), each=players===2?7:5, hands=[];
    for(var i=0;i<players;i++) hands.push(deck.splice(0,each));
    return {hands:hands,boneyard:deck,line:[],turn:opener(hands),players:players,done:false,winner:-1,reason:'',scores:new Array(players).fill(0),last:null,log:[]};
  }
  function legalMoves(s) {
    if (s.done) return [];
    var out=[],hand=s.hands[s.turn];
    hand.forEach(function(tile,index){
      if (!s.line.length) {out.push({type:'play',tile:index,end:1});return;}
      if (fits(s,tile,0)) out.push({type:'play',tile:index,end:0});
      if (fits(s,tile,1)) out.push({type:'play',tile:index,end:1});
    });
    if (!out.length && s.boneyard.length) out.push({type:'draw'});
    return out;
  }
  function note(s,text) { s.log.push(text); if(s.log.length>12)s.log.shift(); }
  function blocked(s) {
    var totals=s.hands.map(pipTotal),low=Math.min.apply(null,totals),leaders=[];
    totals.forEach(function(v,i){if(v===low)leaders.push(i);});
    s.done=true; s.last={type:'blocked',totals:totals};
    if(leaders.length===1) {
      s.winner=leaders[0];s.reason='blocked game';s.scores[s.winner]+=totals.reduce(function(a,b){return a+b;},0)-low;
      note(s,'Blocked game. Player '+(s.winner+1)+' has the lightest hand.');
    } else {s.winner=-1;s.reason='blocked tie';note(s,'Blocked game. The lightest hands are tied.');}
  }
  function advance(s,from) {
    for(var hop=1;hop<s.players;hop++) {
      var seat=(from+hop)%s.players;
      if(playable(s,seat)||s.boneyard.length) {s.turn=seat;return;}
      note(s,'Player '+(seat+1)+' cannot go and passes.');
    }
    if(!s.boneyard.length&&playable(s,from)) {s.turn=from;note(s,'Everyone else passed. Player '+(from+1)+' goes again.');return;}
    blocked(s);
  }
  function applyMove(s,m) {
    var allowed=legalMoves(s).some(function(x){return x.type===m.type && (x.type==='draw'||x.tile===m.tile&&x.end===m.end);});
    if(!allowed) throw new Error('Illegal domino move');
    var n=clone(s),seat=n.turn,hand=n.hands[seat];
    if(m.type==='draw') {
      var drawn=n.boneyard.shift();hand.push(drawn);
      n.last={type:'draw',seat:seat,tile:drawn.slice()};
      note(n,'Player '+(seat+1)+' took one from the boneyard.');
      if(!playable(n,seat)&&!n.boneyard.length) advance(n,seat);
      return n;
    }
    var tile=hand.splice(m.tile,1)[0],placed=tile.slice();
    if(n.line.length) {
      var end=ends(n)[m.end];
      if(m.end===0) {if(placed[1]!==end)placed.reverse();n.line.unshift(placed);}
      else {if(placed[0]!==end)placed.reverse();n.line.push(placed);}
    } else n.line.push(placed);
    n.last={type:'play',seat:seat,tile:tile.slice(),placed:placed.slice(),end:m.end};
    note(n,'Player '+(seat+1)+' played '+tile.join('-')+'.');
    if(!hand.length) {
      n.done=true;n.winner=seat;n.reason='played out';
      n.scores[seat]+=n.hands.reduce(function(total,h,i){return total+(i===seat?0:pipTotal(h));},0);
      note(n,'Player '+(seat+1)+' played their last tile.');
    } else advance(n,seat);
    return n;
  }
  function outcome(s) { return {over:s.done,winner:s.winner,reason:s.reason,scores:s.scores.slice()}; }
  function viewFor(s,seat) {
    if(!Number.isInteger(seat)||seat<0||seat>=s.players) throw new Error('Invalid player');
    return {line:s.line.map(function(t){return t.slice();}),ends:ends(s),hand:s.hands[seat].map(function(t){return t.slice();}),
      handSizes:s.hands.map(function(h){return h.length;}),boneyard:s.boneyard.length,turn:s.turn,
      done:s.done,winner:s.winner,reason:s.reason,scores:s.scores.slice(),
      reveal:s.done?s.hands.map(function(h){return h.map(function(t){return t.slice();});}):null};
  }
  function botMove(s,rng) {
    rng=rng||Math.random;
    var moves=legalMoves(s),best=null,bestScore=-Infinity;
    for(var i=0;i<moves.length;i++) {
      var m=moves[i];if(m.type==='draw')return m;
      var tile=s.hands[s.turn][m.tile],score=(tile[0]+tile[1])*2+(tile[0]===tile[1]?3:0)+Math.floor(rng()*4);
      if(score>bestScore){bestScore=score;best=m;}
    }
    return best;
  }
  return {fullSet:fullSet,newGame:newGame,ends:ends,legalMoves:legalMoves,applyMove:applyMove,outcome:outcome,viewFor:viewFor,botMove:botMove,pipTotal:pipTotal};
});
