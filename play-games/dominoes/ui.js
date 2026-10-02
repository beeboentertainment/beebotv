(function () {
  'use strict';
  var G=window.DominoesGame;
  var $=function(id){return document.getElementById(id);};
  var PIPS=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
  var state, mode, waiting=false, selected=-1, generation=0, aiTimer=null;
  function isAi() { return mode==='ai'; }
  function aiTurn() { return isAi() && state.turn===1 && !state.done; }
  function playerName(seat) { return isAi() ? (seat===0?'You':'Hopping Beebo') : 'Player '+(seat+1); }
  function announce(text,done) {
    $('status').textContent=text; $('status').className='status'+(done?' done':''); $('live').textContent=text;
  }
  function concealHand() { $('hand-area').hidden=true; $('hand').replaceChildren(); $('end-choice').hidden=true; }
  function tileElement(tile) {
    var box=document.createElement('span');box.className='tile';box.setAttribute('aria-hidden','true');
    tile.forEach(function(value){
      var half=document.createElement('span');half.className='half';
      for(var spot=0;spot<9;spot++){var cell=document.createElement('span');if(PIPS[value].includes(spot))cell.className='pip';half.appendChild(cell);}
      box.appendChild(half);
    });
    return box;
  }
  function paintPublic() {
    var view=G.viewFor(state,state.turn),open=view.ends;
    $('ends').textContent=open.length?open[0]+' on the left · '+open[1]+' on the right':'No tiles yet';
    $('boneyard').textContent=String(view.boneyard);
    var line=$('line');line.replaceChildren();
    view.line.forEach(function(tile){var part=tileElement(tile);part.setAttribute('aria-label',tile[0]+' and '+tile[1]);part.setAttribute('aria-hidden','false');line.appendChild(part);});
    var roster=$('roster');roster.replaceChildren();
    view.handSizes.forEach(function(count,seat){
      var block=document.createElement('div');block.className='seat'+(!view.done&&seat===view.turn?' active':'');
      var name=document.createElement('strong');name.textContent=playerName(seat);
      var size=document.createElement('small');size.textContent=count+' tile'+(count===1?'':'s')+' held';
      block.appendChild(name);block.appendChild(size);
      if(view.done){var score=document.createElement('span');score.className='score';score.textContent=view.scores[seat]+' round points';block.appendChild(score);}
      roster.appendChild(block);
    });
  }
  function paintHand() {
    if(waiting||state.done||aiTurn()){$('hand-area').hidden=true;return;}
    var view=G.viewFor(state,state.turn), legal=G.legalMoves(state),holder=$('hand');
    $('hand-area').hidden=false; $('hand-heading').textContent=playerName(state.turn)+' — your hand';
    $('hand-note').textContent=legal.some(function(m){return m.type==='draw';})
      ? 'No tile matches. Draw one at a time until you can play or the boneyard is empty.'
      : 'Choose a playable domino. The two open ends are shown above.';
    holder.replaceChildren();
    view.hand.forEach(function(tile,index){
      var choices=legal.filter(function(m){return m.type==='play'&&m.tile===index;});
      var button=document.createElement('button');button.type='button';button.className='tile-button'+(selected===index?' selected':'');
      button.disabled=!choices.length;button.setAttribute('aria-label','Domino '+tile[0]+' and '+tile[1]+(choices.length?' — playable':' — cannot play'));
      button.appendChild(tileElement(tile));
      var label=document.createElement('span');label.className='tile-label';label.textContent=tile[0]+'–'+tile[1];button.appendChild(label);
      button.addEventListener('click',function(){choose(index);});holder.appendChild(button);
    });
    $('draw').disabled=!legal.some(function(m){return m.type==='draw';});
    $('end-choice').hidden=selected<0;
  }
  function finish() {
    generation++;clearTimeout(aiTimer);waiting=false;selected=-1;
    $('handoff').hidden=true;concealHand();paintPublic();
    var result=G.outcome(state),winner=result.winner;
    var message=winner<0?'The round is a draw — the lightest hands are tied.':playerName(winner)+(playerName(winner)==='You'?' win':' wins')+' by '+({'played out':'playing every tile','blocked game':'a blocked game'}[result.reason]||result.reason)+' and scores '+result.scores[winner]+' pips.';
    announce(message+' Press New round to play again.',true);
  }
  function handoff() {
    selected=-1;waiting=true;concealHand();
    $('handoff').hidden=false;
    var ownTurn=isAi()&&state.turn===0;
    $('handoff-title').textContent=ownTurn?'Your turn':'Pass the screen';
    $('handoff-message').textContent=ownTurn?'Your dominoes are hidden until you are ready to see them.':'Give the device to '+playerName(state.turn)+'. Their dominoes are hidden until they press the button below.';
    announce(ownTurn?'Your turn. Reveal your hand when ready.':'Pass the screen to '+playerName(state.turn)+'.',false);
    $('ready').focus();
  }
  function describeLast(previous) {
    var last=state.last,who=playerName(last.seat);
    if(last.type==='draw')return who+' drew one tile.';
    if(last.type==='blocked')return 'Nobody could play.';
    return who+' played '+last.tile[0]+'–'+last.tile[1]+'.';
  }
  function afterAction(previous) {
    paintPublic();
    if(state.done){finish();return;}
    var message=describeLast(previous);
    if(state.turn!==previous.turn){
      if(aiTurn()) {waiting=false;$('handoff').hidden=true;concealHand();announce(message+' Hopping Beebo is thinking…',false);scheduleAi();}
      else handoff();
      return;
    }
    if(aiTurn()) {announce(message+' Hopping Beebo is thinking…',false);scheduleAi();return;}
    selected=-1;paintHand();announce(message+' '+playerName(state.turn)+', continue your turn.',false);
  }
  function act(move) {
    if(waiting||state.done||aiTurn())return;
    var previous=state;state=G.applyMove(state,move);afterAction(previous);
  }
  function choose(index) {
    if(waiting||state.done||aiTurn())return;
    var options=G.legalMoves(state).filter(function(m){return m.type==='play'&&m.tile===index;});
    if(options.length===1){act(options[0]);return;}
    if(!options.length)return;
    selected=index;paintHand();
    var tile=state.hands[state.turn][index];
    $('end-prompt').textContent=tile[0]+'–'+tile[1]+' fits both ends. Which end should it go on?';
    $('play-left').disabled=!options.some(function(m){return m.end===0;});
    $('play-right').disabled=!options.some(function(m){return m.end===1;});
    $('play-left').focus();
  }
  function scheduleAi() {
    var stamp=++generation;
    aiTimer=setTimeout(function(){
      if(stamp!==generation||!aiTurn())return;
      var move=G.botMove(state,Math.random);if(!move)return;
      var previous=state;state=G.applyMove(state,move);afterAction(previous);
    },300);
  }
  function start() {
    generation++;clearTimeout(aiTimer);mode=$('mode').value;
    state=G.newGame(isAi()?2:Number(mode));waiting=false;selected=-1;
    $('handoff').hidden=true;concealHand();
    paintPublic();
    if(aiTurn()){announce('Hopping Beebo leads this round and is thinking…',false);scheduleAi();}
    else handoff();
  }
  $('new').addEventListener('click',start);$('mode').addEventListener('change',start);
  $('ready').addEventListener('click',function(){
    if(!waiting||state.done||aiTurn())return;
    waiting=false;$('handoff').hidden=true;paintHand();
    announce(playerName(state.turn)+', it is your turn.'+(state.line.length?' Match one of the open ends.':' Choose any domino to begin.'),false);
    var first=$('hand').querySelector('button:not(:disabled)');if(first)first.focus();else $('draw').focus();
  });
  $('draw').addEventListener('click',function(){act({type:'draw'});});
  $('play-left').addEventListener('click',function(){if(selected>=0)act({type:'play',tile:selected,end:0});});
  $('play-right').addEventListener('click',function(){if(selected>=0)act({type:'play',tile:selected,end:1});});
  $('cancel').addEventListener('click',function(){selected=-1;paintHand();var first=$('hand').querySelector('button:not(:disabled)');if(first)first.focus();});
  start();
})();
