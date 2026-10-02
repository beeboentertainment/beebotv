(function(){
  'use strict';
  var game=window.MorrisGame,state,mode,gate=false,busy=false,selected=null,seed=1,roundToken=0;
  var $=function(id){return document.getElementById(id);};
  var coords=[[23,23],[163,23],[303,23],[70,70],[163,70],[256,70],[116,116],[163,116],[210,116],
    [23,163],[70,163],[116,163],[210,163],[256,163],[303,163],[116,210],[163,210],[210,210],
    [70,256],[163,256],[256,256],[23,303],[163,303],[303,303]];
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function matches(m,type,at){return m.type===type&&(type==='move'?m.from===at:m.at===at);}
  function lines(svg){
    svg.replaceChildren();game.NEIGHBORS.forEach(function(ns,a){ns.forEach(function(b){
      if(b<a)return;var line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',coords[a][0]);line.setAttribute('y1',coords[a][1]);
      line.setAttribute('x2',coords[b][0]);line.setAttribute('y2',coords[b][1]);svg.appendChild(line);
    });});
  }
  function board(){
    var root=$('board'),svg=$('lines'),moves=game.legalMoves(state),interactive=!gate&&!busy&&!state.done&&(mode!=='ai'||state.turn===0);
    root.replaceChildren(svg);lines(svg);
    for(var i=0;i<24;i++){
      var owner=state.board[i],place=moves.some(function(m){return matches(m,'place',i);}),
        remove=moves.some(function(m){return matches(m,'remove',i);}),
        origin=moves.some(function(m){return matches(m,'move',i);}),
        destination=selected!==null&&moves.some(function(m){return m.type==='move'&&m.from===selected&&m.to===i;});
      var enabled=interactive&&(place||remove||origin||destination),button=document.createElement('button');
      button.type='button';button.className='point'+(owner?' p'+owner:'')+
        (enabled&&(place||remove||origin)?' action':'')+(enabled&&destination?' destination':'')+
        (selected===i?' selected':'')+(state.last&&state.last.at===i?' recent':'');
      button.style.left=(coords[i][0]/326*100)+'%';button.style.top=(coords[i][1]/326*100)+'%';button.disabled=!enabled;
      button.setAttribute('aria-label','Point '+(i+1)+', '+(owner?name(owner-1)+' piece':'empty')+
        (remove?', can be captured':place?', place here':destination?', move here':origin?', select to move':'')+
        (state.last&&state.last.at===i?', last action here':''));
      if(selected===i)button.setAttribute('aria-pressed','true');
      var token=document.createElement('span');token.className='piece';token.textContent=owner?'P'+owner:'+';
      var index=document.createElement('span');index.className='index';index.textContent=String(i+1);
      button.append(token,index);button.addEventListener('click',(function(at){return function(){choose(at);};})(i));
      root.appendChild(button);
    }
  }
  function render(){
    var result=game.outcome(state),moves=game.legalMoves(state),active=state.turn;
    for(var seat=0;seat<2;seat++){
      var e=$(seat?'score-b':'score-a');e.textContent=name(seat)+': '+result.counts[seat]+' on board, '+result.inHand[seat]+' to place';
      e.classList.toggle('active',!state.done&&active===seat);
    }
    $('handoff').hidden=!gate;$('play-area').hidden=gate;
    if(gate)$('handoff-message').textContent='Give the screen to '+name(active)+'. They should press I am ready themselves.';
    var message;
    if(result.over)message=result.winner<0?'The game is a draw after 50 moves without a capture.':name(result.winner)+(name(result.winner)==='You'?' win':' wins')+' the game.';
    else if(gate)message='Pass the screen to '+name(active)+'.';
    else if(busy)message='Hopping Beebo is choosing a move.';
    else if(state.pending)message=name(active)+(mode==='ai'&&active===0?' must':' must')+' capture a marked opponent piece.';
    else if(state.inHand[active]>0)message=name(active)+(mode==='ai'&&active===0?' have':' has')+' '+state.inHand[active]+' pieces to place. Choose a marked empty point.';
    else if(selected!==null)message='Choose a marked destination for point '+(selected+1)+', or select another piece.';
    else message=name(active)+(mode==='ai'&&active===0?' choose':' chooses')+' a piece to '+(result.counts[active]===3?'fly':'slide')+'.';
    $('status').textContent=message;board();
  }
  function botTurn(){
    if(mode!=='ai'||state.done||state.turn!==1)return;
    busy=true;render();var token=roundToken;
    window.setTimeout(function(){
      if(token!==roundToken||mode!=='ai'||state.done||state.turn!==1)return;
      var move=game.botMove(state,rng);if(!move)return;
      state=game.applyMove(state,move);busy=false;render();
      say('Hopping Beebo '+(move.type==='remove'?'captured a piece':move.type==='place'?'placed a piece':'moved a piece')+'. '+$('status').textContent);
      if(!state.done&&state.turn===1)botTurn();
      else if(!state.done){var first=$('board').querySelector('button:not(:disabled)');if(first)first.focus();}
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:380);
  }
  function play(move){
    var before=state.turn;state=game.applyMove(state,move);selected=null;
    gate=mode==='friend'&&!state.done&&state.turn!==before;render();
    say(name(before)+' '+(move.type==='remove'?'captured at':move.type==='place'?'placed at':'moved to')+' point '+((move.to??move.at)+1)+'. '+$('status').textContent);
    if(gate)$('ready').focus();
    else if(!state.done&&mode==='ai'&&state.turn===1)botTurn();
    else if(!state.done){var first=$('board').querySelector('button:not(:disabled)');if(first)first.focus();}
  }
  function choose(at){
    if(gate||busy||state.done||(mode==='ai'&&state.turn!==0))return;
    var moves=game.legalMoves(state);
    var direct=moves.find(function(m){return m.at===at&&(m.type==='place'||m.type==='remove');});
    if(direct){play(direct);return;}
    if(selected!==null){var step=moves.find(function(m){return m.type==='move'&&m.from===selected&&m.to===at;});
      if(step){play(step);return;}}
    if(selected===at){selected=null;render();return;}
    if(moves.some(function(m){return m.type==='move'&&m.from===at;})){
      selected=at;render();say('Point '+(at+1)+' selected. Choose a marked empty destination.');
      var button=$('board').querySelectorAll('button')[at];if(button)button.focus();
    }
  }
  function newRound(){roundToken++;mode=$('mode').value;seed=(Date.now()>>>0)||1;state=game.newGame();
    selected=null;gate=false;busy=false;render();say('New Nine Men’s Morris round. '+$('status').textContent);
  }
  $('new').addEventListener('click',newRound);
  $('ready').addEventListener('click',function(){if(!gate)return;gate=false;render();say(name(state.turn)+' is ready. '+$('status').textContent);var first=$('board').querySelector('button:not(:disabled)');if(first)first.focus();});
  newRound();
})();
