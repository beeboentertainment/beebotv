/* Beebo Nine Men's Morris. Local, dependency-free rules, matching Campsite Mode. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.MorrisGame=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var MILLS=[[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],
    [0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
  var NEIGHBORS=[[1,9],[0,2,4],[1,14],[4,10],[1,3,5,7],[4,13],[7,11],[4,6,8],[7,12],
    [0,10,21],[3,9,11,18],[6,10,15],[8,13,17],[5,12,14,20],[2,13,23],[11,16],
    [15,17,19],[12,16],[10,19],[16,18,20,22],[13,19],[9,22],[19,21,23],[14,22]];
  function newGame(){return{board:Array(24).fill(0),inHand:[9,9],turn:0,pending:false,done:false,winner:-1,quiet:0,last:null};}
  function clone(s){return{board:s.board.slice(),inHand:s.inHand.slice(),turn:s.turn,pending:s.pending,
    done:s.done,winner:s.winner,quiet:s.quiet,last:s.last?Object.assign({},s.last):null};}
  function count(s,seat){return s.board.filter(function(x){return x===seat+1;}).length;}
  function inMill(board,cell,seat){return MILLS.some(function(line){return line.includes(cell)&&line.every(function(i){return board[i]===seat+1;});});}
  function removable(s,seat){
    var owned=s.board.map(function(x,i){return x===seat+1?i:-1;}).filter(function(i){return i>=0;});
    var loose=owned.filter(function(i){return !inMill(s.board,i,seat);});return loose.length?loose:owned;
  }
  function flying(s,seat){return s.inHand[seat]===0&&count(s,seat)===3;}
  function legalMoves(s){
    if(s.done)return [];
    if(s.pending)return removable(s,1-s.turn).map(function(at){return{type:'remove',at:at};});
    if(s.inHand[s.turn]>0)return s.board.map(function(x,i){return x===0?{type:'place',at:i}:null;}).filter(Boolean);
    var out=[];
    s.board.forEach(function(x,from){
      if(x!==s.turn+1)return;
      var targets=flying(s,s.turn)?s.board.map(function(_,i){return i;}):NEIGHBORS[from];
      targets.forEach(function(to){if(s.board[to]===0)out.push({type:'move',from:from,to:to});});
    });return out;
  }
  function same(a,b){return a.type===b.type&&(a.type==='move'?a.from===b.from&&a.to===b.to:a.at===b.at);}
  function finishTurn(s,seat,captured){
    var foe=1-seat;
    if(s.inHand[foe]===0&&count(s,foe)<3){s.done=true;s.winner=seat;return;}
    s.turn=foe;
    if(s.inHand[foe]===0&&legalMoves(s).length===0){s.done=true;s.winner=seat;return;}
    if(s.inHand[0]===0&&s.inHand[1]===0){s.quiet=captured?0:s.quiet+1;
      if(s.quiet>=50){s.done=true;s.winner=-1;}}
  }
  function applyMove(s,m){
    if(!legalMoves(s).some(function(x){return same(x,m);}))throw new Error('Illegal Morris move');
    var n=clone(s),seat=n.turn,foe=1-seat;
    if(m.type==='remove'){
      n.board[m.at]=0;n.pending=false;n.quiet=0;n.last={type:'remove',seat:seat,at:m.at};
      finishTurn(n,seat,true);return n;
    }
    var at=m.type==='place'?m.at:m.to;
    if(m.type==='place'){n.board[at]=seat+1;n.inHand[seat]--;}
    else {n.board[m.from]=0;n.board[at]=seat+1;}
    n.last={type:m.type,seat:seat,at:at,from:m.from??null};
    if(inMill(n.board,at,seat)&&removable(n,foe).length){n.pending=true;return n;}
    finishTurn(n,seat,false);return n;
  }
  function botMove(s,rng){
    rng=rng||Math.random;var moves=legalMoves(s),best=-Infinity,shortlist=[];
    moves.forEach(function(m){
      var score=0,n=applyMove(s,m),foe=1-s.turn;
      if(n.done)score+=n.winner===s.turn?1000:0;
      if(n.pending)score+=80;
      if(m.type==='remove')score+=NEIGHBORS[m.at].length*2;
      else {var at=m.type==='place'?m.at:m.to;
        score+=NEIGHBORS[at].length;
        score+=MILLS.filter(function(line){return line.includes(at)&&line.filter(function(i){return s.board[i]===s.turn+1;}).length===1;}).length*5;
        score+=MILLS.filter(function(line){return line.includes(at)&&line.filter(function(i){return s.board[i]===foe+1;}).length===2;}).length*12;
      }
      if(score>best){best=score;shortlist=[m];}else if(score===best)shortlist.push(m);
    });
    return shortlist.length?shortlist[Math.floor(rng()*shortlist.length)]:null;
  }
  function outcome(s){return{over:s.done,winner:s.winner,counts:[count(s,0),count(s,1)],inHand:s.inHand.slice(),quiet:s.quiet};}
  return{newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,botMove:botMove,outcome:outcome,
    inMill:inMill,removable:removable,flying:flying,MILLS:MILLS,NEIGHBORS:NEIGHBORS};
});
