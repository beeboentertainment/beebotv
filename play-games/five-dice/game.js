/* Beebo Five Dice: five dice, three rolls, thirteen boxes. Local only. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FiveDiceGame=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var NAMES=['Ones','Twos','Threes','Fours','Fives','Sixes','Three of a kind','Four of a kind',
    'Full house','Small straight','Large straight','Five of a kind','Chance'];
  function newGame(players){
    if(players===undefined)players=1;if(!Number.isInteger(players)||players<1||players>6)throw new Error('One to six players');
    return{players:players,sheets:Array.from({length:players},function(){return Array(13).fill(-1);}),
      bonuses:Array(players).fill(0),dice:Array(5).fill(0),held:Array(5).fill(false),rolls:0,
      turn:0,done:false,winner:-1,last:null};
  }
  function clone(s){return{players:s.players,sheets:s.sheets.map(function(x){return x.slice();}),bonuses:s.bonuses.slice(),
    dice:s.dice.slice(),held:s.held.slice(),rolls:s.rolls,turn:s.turn,done:s.done,winner:s.winner,
    last:s.last?Object.assign({},s.last):null};}
  function counts(dice){var c=Array(7).fill(0);dice.forEach(function(d){if(d>=1&&d<=6)c[d]++;});return c;}
  function fiveKind(dice){return dice.length===5&&dice[0]>=1&&dice.every(function(x){return x===dice[0];});}
  function run(c){var best=0,current=0;for(var f=1;f<=6;f++){current=c[f]?current+1:0;best=Math.max(best,current);}return best;}
  function raw(category,dice){
    var c=counts(dice),sum=dice.reduce(function(a,b){return a+b;},0);
    if(category>=0&&category<=5)return c[category+1]*(category+1);
    if(category===6)return c.some(function(n){return n>=3;})?sum:0;
    if(category===7)return c.some(function(n){return n>=4;})?sum:0;
    if(category===8)return c.includes(3)&&c.includes(2)?25:0;
    if(category===9)return run(c)>=4?30:0;
    if(category===10)return run(c)>=5?40:0;
    if(category===11)return fiveKind(dice)?50:0;
    if(category===12)return sum;
    throw new Error('Unknown category');
  }
  function joker(sheet,dice){return fiveKind(dice)&&sheet[11]>=0;}
  function allowed(sheet,dice){
    var open=NAMES.map(function(_,i){return sheet[i]<0?i:-1;}).filter(function(i){return i>=0;});
    if(joker(sheet,dice)&&sheet[dice[0]-1]<0)return[dice[0]-1];
    return open;
  }
  function score(sheet,dice,category){
    if(joker(sheet,dice)&&[8,9,10].includes(category))return[25,30,40][category-8];
    return raw(category,dice);
  }
  function upper(sheet){return sheet.slice(0,6).reduce(function(a,b){return a+Math.max(0,b);},0);}
  function total(sheet,bonuses){return sheet.reduce(function(a,b){return a+Math.max(0,b);},0)+(upper(sheet)>=63?35:0)+bonuses*100;}
  function preview(s){if(!s.rolls||s.done)return[];var sheet=s.sheets[s.turn],open=allowed(sheet,s.dice);
    return NAMES.map(function(_,i){return open.includes(i)?score(sheet,s.dice,i):null;});}
  function legalMoves(s){
    if(s.done)return[];var out=[];
    if(s.rolls<3)out.push({type:'roll'});
    if(s.rolls>=1&&s.rolls<=2)for(var i=0;i<5;i++)out.push({type:'hold',die:i});
    if(s.rolls>0)allowed(s.sheets[s.turn],s.dice).forEach(function(i){out.push({type:'score',category:i});});
    return out;
  }
  function applyMove(s,m,rng){
    if(!m||!legalMoves(s).some(function(x){return x.type===m.type&&
      (x.type==='roll'||x.type==='hold'&&x.die===m.die||x.type==='score'&&x.category===m.category);}))
      throw new Error('Illegal Five Dice move');
    var n=clone(s),seat=n.turn;
    if(m.type==='hold'){
      n.held[m.die]=!n.held[m.die];n.last={type:'hold',seat:seat,die:m.die};return n;
    }
    if(m.type==='roll'){
      rng=rng||Math.random;
      if(n.rolls===0)n.held.fill(false);
      else if(m.held){if(!Array.isArray(m.held)||m.held.length!==5||m.held.some(function(x){return typeof x!=='boolean';}))throw new Error('Invalid held dice');n.held=m.held.slice();}
      for(var d=0;d<5;d++)if(!n.held[d])n.dice[d]=1+Math.floor(rng()*6);
      n.rolls++;n.last={type:'roll',seat:seat,rolls:n.rolls};return n;
    }
    var sheet=n.sheets[seat],cat=m.category,bonus=fiveKind(n.dice)&&sheet[11]===50?1:0;
    var points=score(sheet,n.dice,cat);sheet[cat]=points;n.bonuses[seat]+=bonus;
    n.last={type:'score',seat:seat,category:cat,points:points,bonus:bonus};
    n.dice.fill(0);n.held.fill(false);n.rolls=0;
    if(n.sheets.every(function(x){return x.every(function(v){return v>=0;});})){
      n.done=true;var totals=n.sheets.map(function(x,i){return total(x,n.bonuses[i]);});
      var highest=Math.max.apply(null,totals),leaders=totals.filter(function(x){return x===highest;});
      n.winner=leaders.length===1?totals.indexOf(highest):-1;
    }else n.turn=(seat+1)%n.players;
    return n;
  }
  function outcome(s){return{over:s.done,winner:s.winner,totals:s.sheets.map(function(x,i){return total(x,s.bonuses[i]);})};}
  function botMove(s){
    if(s.done)return null;
    if(s.rolls===0)return{type:'roll'};
    var sheet=s.sheets[s.turn],choices=allowed(sheet,s.dice);
    var best=choices.reduce(function(a,b){return score(sheet,s.dice,b)>score(sheet,s.dice,a)?b:a;},choices[0]);
    if(s.rolls>=3||score(sheet,s.dice,best)>=40)return{type:'score',category:best};
    var c=counts(s.dice),face=1;
    for(var f=2;f<=6;f++)if(c[f]>=c[face])face=f;
    var keep=s.dice.map(function(d){return d===face;});
    if(run(c)>=4){var seen=Array(7).fill(false);keep=s.dice.map(function(d){if(seen[d])return false;seen[d]=true;return true;});}
    return{type:'roll',held:keep};
  }
  return{NAMES:NAMES,newGame:newGame,legalMoves:legalMoves,applyMove:applyMove,outcome:outcome,
    raw:raw,allowed:allowed,score:score,preview:preview,upper:upper,total:total,botMove:botMove};
});
