/* Beebo War: face-down piles, simultaneous reveal, three buried cards on ties. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.WarGame=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var RANKS='23456789TJQKA',SUITS='CDHS',CAP=300;
  function deck(){var out=[];Array.from(SUITS).forEach(function(s){Array.from(RANKS).forEach(function(r){out.push(r+s);});});return out;}
  function shuffle(cards,rng){var a=cards.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),v=a[i];a[i]=a[j];a[j]=v;}return a;}
  function clone(s){return{piles:s.piles.map(function(p){return p.slice();}),revealed:s.revealed.slice(),shown:s.shown.slice(),stake:s.stake.slice(),tricks:s.tricks,war:s.war,done:s.done,winner:s.winner,last:s.last?Object.assign({},s.last):null};}
  function newGame(rng){rng=rng||Math.random;var cards=shuffle(deck(),rng),piles=[[],[]];cards.forEach(function(c,i){piles[i%2].push(c);});
    return{piles:piles,revealed:[null,null],shown:[null,null],stake:[],tricks:0,war:0,done:false,winner:-1,last:null};}
  function counts(s){return s.piles.map(function(p,i){return p.length+(s.revealed[i]?1:0);});}
  function legalMoves(s){if(s.done)return[];return[0,1].filter(function(i){return !s.revealed[i];}).map(function(i){return{type:'flip',seat:i};});}
  function finishCounts(s){var c=counts(s);s.done=true;s.winner=c[0]===c[1]?-1:c[0]>c[1]?0:1;}
  function rank(card){return RANKS.indexOf(card[0])+2;}
  function applyMove(s,m,rng){if(!m||!legalMoves(s).some(function(x){return x.type===m.type&&x.seat===m.seat;}))throw new Error('Illegal War move');rng=rng||Math.random;
    var n=clone(s),seat=m.seat;
    if(!n.piles[seat].length){n.done=true;n.winner=1-seat;n.last={type:'empty',seat:seat};return n;}
    n.revealed[seat]=n.piles[seat].shift();n.last={type:'waiting',seat:seat};
    if(!n.revealed[0]||!n.revealed[1])return n;
    var a=n.revealed[0],b=n.revealed[1];n.shown=[a,b];n.revealed=[null,null];n.stake.push(a,b);n.tricks++;
    var winner=rank(a)===rank(b)?-1:rank(a)>rank(b)?0:1;
    if(winner>=0){n.piles[winner].push.apply(n.piles[winner],shuffle(n.stake,rng));n.last={type:'win',winner:winner,cards:n.stake.length,shown:[a,b]};n.stake=[];n.war=0;
      if(!n.piles[1-winner].length){n.done=true;n.winner=winner;}
      else if(n.tricks>=CAP)finishCounts(n);
      return n;}
    n.war++;for(var p=0;p<2;p++){var buried=Math.min(3,Math.max(0,n.piles[p].length-1));while(buried--)n.stake.push(n.piles[p].shift());}
    n.last={type:'war',shown:[a,b],cards:n.stake.length,depth:n.war};
    var broke=n.piles.findIndex(function(p){return !p.length;});if(broke>=0){n.done=true;n.winner=n.piles[0].length||n.piles[1].length?1-broke:-1;}
    return n;
  }
  function botMove(s,seat){return legalMoves(s).find(function(m){return m.seat===seat;})||null;}
  return{newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,botMove:botMove,deck:deck,counts:counts,CAP:CAP};
});
