/* Beebo Crazy Eights: standard 52-card deck; local, dependency-free. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CrazyEightsGame=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var SUITS=['C','D','H','S'],RANKS='23456789TJQKA';
  function deck(){var out=[];SUITS.forEach(function(s){Array.from(RANKS).forEach(function(r){out.push(r+s);});});return out;}
  function shuffle(cards,rng){var a=cards.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),v=a[i];a[i]=a[j];a[j]=v;}return a;}
  function clone(s){return{players:s.players,hands:s.hands.map(function(h){return h.slice();}),stock:s.stock.slice(),discard:s.discard.slice(),suit:s.suit,turn:s.turn,passes:s.passes,done:s.done,winner:s.winner,last:s.last?Object.assign({},s.last):null};}
  function newGame(players,rng){if(!Number.isInteger(players)||players<2||players>6)throw new Error('Crazy Eights needs 2–6 players');rng=rng||Math.random;
    var stock=shuffle(deck(),rng),hands=Array.from({length:players},function(){return[];}),count=players===2?7:5;
    for(var i=0;i<count;i++)for(var seat=0;seat<players;seat++)hands[seat].push(stock.shift());
    var start=stock.findIndex(function(card){return card[0]!=='8';});var first=stock.splice(start,1)[0];
    return{players:players,hands:hands,stock:stock,discard:[first],suit:first[1],turn:0,passes:0,done:false,winner:-1,last:null};
  }
  function top(s){return s.discard[s.discard.length-1];}
  function playable(s,card){return card[0]==='8'||card[1]===s.suit||card[0]===top(s)[0];}
  function legalMoves(s){if(s.done)return[];var hand=s.hands[s.turn],cards=hand.filter(function(c){return playable(s,c);}),moves=[];
    cards.forEach(function(card){if(card[0]==='8')SUITS.forEach(function(suit){moves.push({type:'play',card:card,suit:suit});});else moves.push({type:'play',card:card});});
    if(moves.length)return moves;
    return s.stock.length||s.discard.length>1?[{type:'draw'}]:[{type:'pass'}];
  }
  function countWinner(s){var min=Math.min.apply(null,s.hands.map(function(h){return h.length;})),leaders=s.hands.map(function(h,i){return h.length===min?i:-1;}).filter(function(i){return i>=0;});
    s.done=true;s.winner=leaders.length===1?leaders[0]:-1;
  }
  function applyMove(s,m,rng){if(!m||!legalMoves(s).some(function(x){return x.type===m.type&&(x.type!=='play'||x.card===m.card&&x.suit===m.suit);}))throw new Error('Illegal Crazy Eights move');rng=rng||Math.random;
    var n=clone(s),seat=n.turn;
    if(m.type==='play'){
      n.hands[seat].splice(n.hands[seat].indexOf(m.card),1);n.discard.push(m.card);n.suit=m.card[0]==='8'?m.suit:m.card[1];n.passes=0;
      n.last={type:'play',seat:seat,card:m.card,suit:n.suit};
      if(!n.hands[seat].length){n.done=true;n.winner=seat;return n;}
      n.turn=(seat+1)%n.players;return n;
    }
    if(m.type==='draw'){
      if(!n.stock.length){var keep=n.discard.pop();n.stock=shuffle(n.discard,rng);n.discard=[keep];}
      var drawn=n.stock.shift();n.hands[seat].push(drawn);n.passes=0;
      n.last={type:'draw',seat:seat,canPlay:playable(n,drawn)};
      if(!n.last.canPlay)n.turn=(seat+1)%n.players;
      return n;
    }
    n.passes++;n.last={type:'pass',seat:seat};
    if(n.passes>=n.players)countWinner(n);else n.turn=(seat+1)%n.players;
    return n;
  }
  function rankValue(card){return RANKS.indexOf(card[0])+2;}
  function botMove(s,rng){rng=rng||Math.random;var moves=legalMoves(s);if(!moves.length)return null;
    var plain=moves.filter(function(m){return m.type==='play'&&m.card[0]!=='8';});
    if(plain.length){var high=Math.max.apply(null,plain.map(function(m){return rankValue(m.card);})),ties=plain.filter(function(m){return rankValue(m.card)===high;});return ties[Math.floor(rng()*ties.length)];}
    var eight=moves.filter(function(m){return m.type==='play';});
    if(eight.length){var counts=SUITS.map(function(suit){return s.hands[s.turn].filter(function(c){return c[0]!=='8'&&c[1]===suit;}).length;}),best=Math.max.apply(null,counts),suit=SUITS[counts.indexOf(best)];
      if(best===0)suit=SUITS[Math.floor(rng()*4)];return eight.find(function(m){return m.suit===suit;});}
    return moves[0];
  }
  return{newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,botMove:botMove,playable:playable,deck:deck,top:top,SUITS:SUITS,RANKS:RANKS};
});
