(function(){
  'use strict';
  var game=window.MancalaGame, state, mode, level, gate=false, busy=false, seed=1;
  var $=function(id){return document.getElementById(id);};
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function addText(tag,text,className){var e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;}
  function putPit(container,index,row,col){
    var seat=index<6?0:1, count=state.board[index], own=state.turn===seat;
    var legal=!gate&&!busy&&!state.done&&(mode!=='ai'||seat===0)&&own&&count>0;
    var button=document.createElement('button');button.type='button';button.className='pit'+(legal?' legal':'')+
      (state.last&&state.last.path[state.last.path.length-1]===index?' recent':'');
    button.style.gridRow=String(row);button.style.gridColumn=String(col);button.disabled=!legal;
    button.setAttribute('aria-label',name(seat)+', pit '+(seat?13-index:index+1)+', '+count+' stones'+
      (legal?', choose to sow':'')+(button.classList.contains('recent')?', last landing pit':''));
    button.appendChild(addText('span',String(count),'number'));
    button.appendChild(addText('span','Pit '+(seat?13-index:index+1),'label'));
    button.addEventListener('click',function(){move(index);});container.appendChild(button);
  }
  function putStore(container,seat){
    var e=addText('div','', 'store '+(seat?'left':'right'));
    e.setAttribute('aria-label',name(seat)+' store, '+state.board[game.store(seat)]+' stones');
    e.appendChild(addText('span',String(state.board[game.store(seat)]),'number'));
    e.appendChild(addText('span',name(seat)+' store','label'));container.appendChild(e);
  }
  function board(){
    var e=$('board');e.replaceChildren();
    var top=addText('div',name(1)+' side', 'side-label top');e.appendChild(top);
    for(var c=0;c<6;c++)putPit(e,12-c,2,c+1);
    putStore(e,1);putStore(e,0);
    for(var d=0;d<6;d++)putPit(e,d,4,d+1);
    e.appendChild(addText('div',name(0)+' side','side-label bottom'));
  }
  function render(){
    var result=game.outcome(state),a=$('score-a'),b=$('score-b');
    a.replaceChildren(document.createTextNode(name(0)+': '),addText('span',String(result.scores[0])));
    b.replaceChildren(document.createTextNode(name(1)+': '),addText('span',String(result.scores[1])));
    a.classList.toggle('active',!state.done&&state.turn===0);
    b.classList.toggle('active',!state.done&&state.turn===1);
    $('handoff').hidden=!gate;$('play-area').hidden=gate;
    if(gate)$('handoff-message').textContent='Give the screen to '+name(state.turn)+'. They should press I am ready themselves.';
    var message;
    if(result.over)message=result.winner<0?'The game is a draw, '+result.scores[0]+' to '+result.scores[1]+'.':
      name(result.winner)+' wins, '+result.scores[result.winner]+' to '+result.scores[1-result.winner]+'.';
    else if(gate)message='Pass the screen to '+name(state.turn)+'.';
    else if(busy)message='Hopping Beebo is choosing a pit.';
    else message=name(state.turn)+(mode==='ai'&&state.turn===0?' are':' is')+' up. Choose a pit on '+
      (mode==='ai'&&state.turn===0?'your':'their')+' side.';
    $('status').textContent=message;board();
  }
  function botTurn(){
    if(mode!=='ai'||state.done||state.turn!==1)return;
    busy=true;render();
    window.setTimeout(function(){
      if(mode!=='ai'||state.done||state.turn!==1)return;
      var pit=game.botMove(state,level,rng);if(pit===null)return;
      state=game.applyMove(state,pit);busy=false;render();
      say('Hopping Beebo chose pit '+(13-pit)+'. '+(state.last.again?'They go again.':$('status').textContent));
      if(!state.done&&state.turn===1)botTurn();
      else if(!state.done){var first=$('board').querySelector('button:not(:disabled)');if(first)first.focus();}
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:380);
  }
  function move(pit){
    if(gate||busy||state.done||!game.legalMoves(state).includes(pit))return;
    var before=state.turn;state=game.applyMove(state,pit);
    gate=mode==='friend'&&!state.done&&state.turn!==before;
    render();
    var action=name(before)+' chose pit '+(before?13-pit:pit+1)+'. '+
      (state.last.captured?'Captured '+state.last.captured+' stones. ':'')+
      (state.last.again?'Another turn. ':state.done?'Round over. ':'');
    say(action+$('status').textContent);
    if(gate)$('ready').focus();
    else if(!state.done&&mode==='ai'&&state.turn===1)botTurn();
    else if(!state.done){var next=$('board').querySelector('button:not(:disabled)');if(next)next.focus();}
  }
  function newRound(){mode=$('mode').value;level=$('level').value;seed=(Date.now()>>>0)||1;
    state=game.newGame();gate=false;busy=false;$('level-label').hidden=mode!=='ai';render();say('New Mancala round. '+$('status').textContent);
  }
  $('new').addEventListener('click',newRound);
  $('mode').addEventListener('change',function(){$('level-label').hidden=$('mode').value!=='ai';});
  $('ready').addEventListener('click',function(){if(!gate)return;gate=false;render();say(name(state.turn)+' is ready. '+$('status').textContent);var first=$('board').querySelector('button:not(:disabled)');if(first)first.focus();});
  newRound();
})();
