(function(){
  'use strict';
  var game=window.FiveDiceGame,state,mode,gate=false,busy=false,seed=1,roundToken=0;
  var $=function(id){return document.getElementById(id);};
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='solo'?'You':mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function botTurn(){
    if(mode!=='ai'||state.done||state.turn!==1)return;
    busy=true;render();var token=roundToken;
    window.setTimeout(function(){
      if(token!==roundToken||mode!=='ai'||state.done||state.turn!==1)return;
      var move=game.botMove(state);if(!move)return;
      state=game.applyMove(state,move,rng);busy=false;render();
      say('Hopping Beebo '+(move.type==='score'?'scored '+state.last.points+' in '+game.NAMES[move.category]:
        'rolled the dice')+'. '+$('status').textContent);
      if(!state.done&&state.turn===1)botTurn();
      else if(!state.done)$('roll').focus();
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:300);
  }
  function play(move){
    if(gate||busy||state.done||(mode==='ai'&&state.turn!==0))return;
    var before=state.turn;state=game.applyMove(state,move,rng);
    gate=mode!=='ai'&&mode!=='solo'&&!state.done&&state.turn!==before;
    render();
    var action=move.type==='roll'?'Rolled '+state.rolls+' of 3.':move.type==='hold'?
      'Die '+(move.die+1)+(state.held[move.die]?' kept.':' released.'):
      name(before)+' scored '+state.last.points+' in '+game.NAMES[move.category]+(state.last.bonus?' with a 100-point bonus.':'.');
    say(action+' '+$('status').textContent);
    if(gate)$('ready').focus();
    else if(!state.done&&mode==='ai'&&state.turn===1)botTurn();
    else if(!state.done&&move.type==='score')$('roll').focus();
  }
  function make(tag,text,className){var e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;}
  function renderRoster(){
    var root=$('roster'),result=game.outcome(state);root.replaceChildren();
    for(var i=0;i<state.players;i++){
      var card=make('div','','seat'+(!state.done&&state.turn===i?' active':''));
      card.appendChild(make('strong',name(i)));
      card.appendChild(make('span',result.totals[i]+' points'));
      card.appendChild(make('div',state.sheets[i].filter(function(x){return x>=0;}).length+' of 13 boxes filled'));
      root.appendChild(card);
    }
  }
  function renderDice(){
    var root=$('dice');root.replaceChildren();
    for(var i=0;i<5;i++){
      var number=state.dice[i],held=state.held[i],button=make('button','','die'+(held?' held':''));
      button.type='button';button.disabled=gate||busy||state.done||state.rolls===0||state.rolls>=3||(mode==='ai'&&state.turn===1);
      button.setAttribute('aria-label','Die '+(i+1)+', '+(number||'not rolled')+', '+(held?'kept':'not kept')+
        (button.disabled?'':', press to '+(held?'release':'keep')));
      button.setAttribute('aria-pressed',String(held));
      button.appendChild(make('span',number?String(number):'–','face'));
      button.appendChild(make('span',held?'Kept':'Die '+(i+1),'tag'));
      button.addEventListener('click',(function(at){return function(){play({type:'hold',die:at});};})(i));
      root.appendChild(button);
    }
    $('roll').disabled=gate||busy||state.done||state.rolls>=3||(mode==='ai'&&state.turn===1);
    $('roll').textContent=state.rolls?'Roll again':'Roll dice';
    $('roll-count').textContent=state.rolls+' of 3 rolls';
    $('turn-hint').textContent=!state.rolls?'Roll first. Then select dice to keep or choose a score box.':
      state.rolls===3?'Third roll complete. Choose a score box, including zero if needed.':
      'Press a die to keep or release it. Roll again, or score this roll now.';
  }
  function renderSheet(){
    var root=$('sheet'),seat=state.turn,sheet=state.sheets[seat],preview=game.preview(state);root.replaceChildren();
    game.NAMES.forEach(function(label,i){
      var row=make('div','','sheet-row');row.appendChild(make('span',label,'name'));
      if(sheet[i]>=0)row.appendChild(make('span',String(sheet[i]),'filled'));
      else{
        var button=make('button',preview[i]===null||preview[i]===undefined?'Roll first':'Score '+preview[i],'btn preview');
        button.type='button';button.disabled=gate||busy||state.done||preview[i]===null||preview[i]===undefined||(mode==='ai'&&seat===1);
        button.setAttribute('aria-label',label+', '+button.textContent);
        button.addEventListener('click',function(){play({type:'score',category:i});});row.appendChild(button);
      }
      root.appendChild(row);
    });
    $('bonuses').textContent='Upper boxes: '+game.upper(sheet)+' / 63 for the 35-point bonus. Five-of-a-kind bonuses: '+state.bonuses[seat]+'.';
  }
  function render(){
    var result=game.outcome(state),seat=state.turn;
    $('handoff').hidden=!gate;$('play-area').hidden=gate;$('sheet-area').hidden=gate;
    if(gate)$('handoff-message').textContent='Give the screen to '+name(seat)+'. They should press I am ready themselves.';
    var message;
    if(result.over)message=mode==='solo'?'Final score: '+result.totals[0]+'.':result.winner<0?'The game is a tie.':name(result.winner)+' wins with '+result.totals[result.winner]+' points.';
    else if(gate)message='Pass the screen to '+name(seat)+'.';
    else if(busy)message='Hopping Beebo is taking a turn.';
    else message=name(seat)+(mode==='solo'||mode==='ai'&&seat===0?' have':' has')+' '+(13-state.sheets[seat].filter(function(x){return x>=0;}).length)+' boxes left.';
    $('status').textContent=message;$('turn-title').textContent=name(seat)+' — roll and score';
    renderRoster();renderDice();renderSheet();
  }
  function newGame(){roundToken++;mode=$('mode').value;seed=(Date.now()>>>0)||1;
    state=game.newGame(mode==='solo'?1:mode==='ai'?2:Number(mode));gate=false;busy=false;render();say('New Five Dice game. '+$('status').textContent);
  }
  $('new').addEventListener('click',newGame);
  $('mode').addEventListener('change',newGame);
  $('roll').addEventListener('click',function(){play({type:'roll'});});
  $('ready').addEventListener('click',function(){if(!gate)return;gate=false;render();say(name(state.turn)+' is ready. '+$('status').textContent);$('roll').focus();});
  newGame();
})();
