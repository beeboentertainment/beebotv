/* Beebo Ludo: public board, four tokens each, exact finish and turn cap. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LudoGame=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var TRACK=52,HOME=57,CAP=240;
  function newGame(players){
    if(players===undefined)players=2;
    if(!Number.isInteger(players)||players<2||players>4)throw new Error('Ludo needs two to four players');
    return{players:players,tokens:Array.from({length:players},function(){return[-1,-1,-1,-1];}),
      offsets:Array.from({length:players},function(_,i){return i*(players===2?26:13);}),
      turn:0,die:0,pendingRoll:true,legal:[],sixes:0,turns:0,done:false,winner:-1,last:null};
  }
  function clone(s){return{players:s.players,tokens:s.tokens.map(function(x){return x.slice();}),offsets:s.offsets.slice(),
    turn:s.turn,die:s.die,pendingRoll:s.pendingRoll,legal:s.legal.slice(),sixes:s.sixes,turns:s.turns,
    done:s.done,winner:s.winner,last:s.last?Object.assign({},s.last):null};}
  function square(s,seat,progress){return progress>=0&&progress<TRACK?(s.offsets[seat]+progress)%TRACK:-1;}
  function distance(tokens){return tokens.reduce(function(n,p){return n+(p<0?0:p+1);},0);}
  function standings(s){return s.tokens.map(distance);}
  function legalFor(s,seat,roll){return s.tokens[seat].map(function(p,i){return p===HOME||p<0&&roll!==6||p>=0&&p+roll>HOME?-1:i;}).filter(function(i){return i>=0;});}
  function legalMoves(s){if(s.done)return[];return s.pendingRoll?[{type:'roll'}]:s.legal.map(function(token){return{type:'move',token:token};});}
  function endTurn(s){
    s.turns++;s.sixes=0;s.pendingRoll=true;s.legal=[];
    if(s.turns>=CAP){var scores=standings(s),best=Math.max.apply(null,scores),leaders=scores.filter(function(x){return x===best;});
      s.done=true;s.winner=leaders.length===1?scores.indexOf(best):-1;return;}
    s.turn=(s.turn+1)%s.players;
  }
  function applyMove(s,m,rng){
    if(!m||!legalMoves(s).some(function(x){return x.type===m.type&&(x.type==='roll'||x.token===m.token);}))throw new Error('Illegal Ludo move');
    var n=clone(s),seat=n.turn;
    if(m.type==='roll'){
      rng=rng||Math.random;n.die=1+Math.floor(rng()*6);
      if(n.die===6)n.sixes++;
      n.last={type:'roll',seat:seat,die:n.die};
      if(n.sixes>=3){n.last={type:'forfeit',seat:seat,die:6};endTurn(n);return n;}
      n.legal=legalFor(n,seat,n.die);
      if(!n.legal.length){n.last={type:'no-move',seat:seat,die:n.die};if(n.die!==6)endTurn(n);return n;}
      n.pendingRoll=false;return n;
    }
    var token=m.token,from=n.tokens[seat][token],to=from<0?0:from+n.die;
    n.tokens[seat][token]=to;
    var captured=0,landing=square(n,seat,to);
    if(landing>=0&&!n.offsets.includes(landing))for(var rival=0;rival<n.players;rival++){
      if(rival===seat)continue;
      for(var j=0;j<4;j++)if(square(n,rival,n.tokens[rival][j])===landing){n.tokens[rival][j]=-1;captured++;}
    }
    n.last={type:'move',seat:seat,token:token,die:n.die,from:from,to:to,captured:captured};
    if(n.tokens[seat].every(function(p){return p===HOME;})){n.done=true;n.winner=seat;n.legal=[];return n;}
    n.pendingRoll=true;n.legal=[];
    if(n.die!==6)endTurn(n);
    return n;
  }
  function wouldCapture(s,token){
    var seat=s.turn,p=s.tokens[seat][token],to=p<0?0:p+s.die,landing=square(s,seat,to);
    if(landing<0||s.offsets.includes(landing))return false;
    return s.tokens.some(function(t,rival){return rival!==seat&&t.some(function(q){return square(s,rival,q)===landing;});});
  }
  function botMove(s,rng){
    if(s.done)return null;if(s.pendingRoll)return{type:'roll'};
    rng=rng||Math.random;var legal=s.legal;
    var token=legal.find(function(i){return wouldCapture(s,i);});
    if(token===undefined)token=legal.find(function(i){return s.tokens[s.turn][i]+s.die===HOME;});
    if(token===undefined)token=legal.find(function(i){return s.tokens[s.turn][i]<0;});
    if(token===undefined)token=rng()<0.2?legal[Math.floor(rng()*legal.length)]:
      legal.reduce(function(a,b){return s.tokens[s.turn][b]>s.tokens[s.turn][a]?b:a;});
    return{type:'move',token:token};
  }
  function outcome(s){return{over:s.done,winner:s.winner,standings:standings(s),turns:s.turns};}
  return{newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,botMove:botMove,outcome:outcome,
    square:square,standings:standings,legalFor:legalFor,TRACK:TRACK,HOME:HOME,CAP:CAP};
});
