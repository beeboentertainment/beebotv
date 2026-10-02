/* Beebo Go Fish: private hands, public books and counts; local only. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.GoFishGame=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var SUITS='CDHS',RANKS='23456789TJQKA';
  function deck(){var cards=[];Array.from(SUITS).forEach(function(s){Array.from(RANKS).forEach(function(r){cards.push(r+s);});});return cards;}
  function shuffle(cards,rng){var a=cards.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),v=a[i];a[i]=a[j];a[j]=v;}return a;}
  function clone(s){return{players:s.players,hands:s.hands.map(function(h){return h.slice();}),stock:s.stock.slice(),books:s.books.map(function(b){return b.slice();}),turn:s.turn,done:s.done,winner:s.winner,last:s.last?Object.assign({},s.last):null};}
  function collect(s,seat){var found=[];Array.from(RANKS).forEach(function(rank){if(s.hands[seat].filter(function(c){return c[0]===rank;}).length===4){s.hands[seat]=s.hands[seat].filter(function(c){return c[0]!==rank;});s.books[seat].push(rank);found.push(rank);}});return found;}
  function newGame(players,rng){if(!Number.isInteger(players)||players<2||players>6)throw new Error('Go Fish needs 2–6 players');rng=rng||Math.random;
    var stock=shuffle(deck(),rng),hands=Array.from({length:players},function(){return[];}),books=Array.from({length:players},function(){return[];}),dealt=players<=3?7:5;
    for(var i=0;i<dealt;i++)for(var seat=0;seat<players;seat++)hands[seat].push(stock.shift());
    var s={players:players,hands:hands,stock:stock,books:books,turn:0,done:false,winner:-1,last:null};
    for(var p=0;p<players;p++)collect(s,p);
    return s;
  }
  function scores(s){return s.books.map(function(b){return b.length;});}
  function finish(s){var a=scores(s),best=Math.max.apply(null,a),leaders=a.map(function(n,i){return n===best?i:-1;}).filter(function(i){return i>=0;});s.done=true;s.winner=leaders.length===1?leaders[0]:-1;}
  function legalMoves(s){if(s.done)return[];var hand=s.hands[s.turn],ranks=Array.from(new Set(hand.map(function(c){return c[0];}))),moves=[];
    for(var target=0;target<s.players;target++)if(target!==s.turn&&s.hands[target].length)ranks.forEach(function(rank){moves.push({type:'ask',target:target,rank:rank});});
    return moves;
  }
  function nextHolder(s,from){for(var n=1;n<=s.players;n++){var seat=(from+n)%s.players;if(s.hands[seat].length)return seat;}return -1;}
  function applyMove(s,m){if(!m||!legalMoves(s).some(function(x){return x.type===m.type&&x.target===m.target&&x.rank===m.rank;}))throw new Error('Illegal Go Fish move');
    var n=clone(s),seat=n.turn,taken=n.hands[m.target].filter(function(c){return c[0]===m.rank;}),drawn=null,wished=false;
    if(taken.length){n.hands[m.target]=n.hands[m.target].filter(function(c){return c[0]!==m.rank;});n.hands[seat].push.apply(n.hands[seat],taken);}
    else if(n.stock.length){drawn=n.stock.shift();n.hands[seat].push(drawn);wished=drawn[0]===m.rank;}
    var booked=collect(n,seat);
    n.last={type:'ask',seat:seat,target:m.target,rank:m.rank,taken:taken.length,drew:!!drawn,wished:wished,booked:booked};
    for(var p=0;p<n.players;p++)if(!n.hands[p].length&&n.stock.length)n.hands[p].push(n.stock.shift());
    if(n.books.reduce(function(x,b){return x+b.length;},0)===13){finish(n);return n;}
    if(!taken.length&&!wished||!n.hands[seat].length){var next=nextHolder(n,seat);if(next<0){finish(n);return n;}n.turn=next;}
    var others=n.hands.some(function(h,i){return i!==n.turn&&h.length;});
    if(!others||!n.hands[n.turn].length)finish(n);
    return n;
  }
  function botMove(s,rng){rng=rng||Math.random;var moves=legalMoves(s);if(!moves.length)return null;
    var counts={};s.hands[s.turn].forEach(function(c){counts[c[0]]=(counts[c[0]]||0)+1;});
    var maxRank=Math.max.apply(null,moves.map(function(m){return counts[m.rank];}));moves=moves.filter(function(m){return counts[m.rank]===maxRank;});
    /* Target is random among everyone with cards: always asking the biggest hand could repeat forever once the stock is empty. */
    return moves[Math.floor(rng()*moves.length)];
  }
  return{newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,botMove:botMove,scores:scores,deck:deck,RANKS:RANKS};
});
