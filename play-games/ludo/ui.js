(function(){
  'use strict';
  var game=window.LudoGame,state,mode,gate=false,busy=false,seed=1,roundToken=0;
  var $=function(id){return document.getElementById(id);};
  var colors=['#87d7bf','#f0a698','#c7b4e8','#f6d176'];
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function svg(tag,attrs){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.keys(attrs).forEach(function(k){e.setAttribute(k,attrs[k]);});return e;}
  function point(index,radius){var a=-Math.PI/2+index*Math.PI*2/52;return[200+Math.cos(a)*radius,200+Math.sin(a)*radius];}
  function renderBoard(){
    var board=$('board');board.replaceChildren();
    board.appendChild(svg('circle',{cx:200,cy:200,r:155,fill:'none',stroke:'#d5ad70','stroke-width':3}));
    for(var i=0;i<52;i++){
      var p=point(i,155),safe=state.offsets.includes(i);
      board.appendChild(svg('circle',{cx:p[0],cy:p[1],r:safe?8:5,fill:safe?'#9c6c37':'#dfc79f',
        stroke:safe?'#ffdc87':'#6d5338','stroke-width':safe?3:1}));
    }
    var shown=0;
    state.tokens.forEach(function(tokens,seat){tokens.forEach(function(progress,token){
      var square=game.square(state,seat,progress);if(square<0)return;
      var same=state.tokens.slice(0,seat+1).reduce(function(n,list,r){return n+list.filter(function(p,j){
        return game.square(state,r,p)===square&&(r<seat||j<=token);}).length;},0)-1;
      var p=point(square,155+(same%3-1)*10),c=svg('circle',{cx:p[0],cy:p[1],r:8,
        fill:colors[seat],stroke:'#10151c','stroke-width':2});board.appendChild(c);
      var label=svg('text',{x:p[0],y:p[1]+2.7,'font-size':8,'text-anchor':'middle',fill:'#111820'});
      label.textContent=String(seat+1);board.appendChild(label);shown++;
    });});
    var title=svg('text',{x:200,y:185,'font-size':18,'text-anchor':'middle',fill:'#fff2d2'});
    title.textContent='Ludo';board.appendChild(title);
    var counter=svg('text',{x:200,y:210,'font-size':12,'text-anchor':'middle',fill:'#fff2d2'});
    counter.textContent='Turn '+state.turns+' / 240';board.appendChild(counter);
    board.setAttribute('aria-label','Ludo shared track with '+shown+' tokens out. Turn '+state.turns+' of 240. Token buttons below give exact positions.');
  }
  function progressText(p){return p<0?'In yard':p===57?'Home':p>=52?'Home run '+(p-51)+' of 6':'Track '+(p+1)+' of 52';}
  function renderRoster(){
    var root=$('roster'),standing=game.standings(state);root.replaceChildren();
    state.tokens.forEach(function(tokens,seat){
      var card=document.createElement('div');card.className='seat'+(!state.done&&seat===state.turn?' active':'');
      var heading=document.createElement('strong');heading.textContent=name(seat);card.appendChild(heading);
      var home=document.createElement('span');home.textContent=tokens.filter(function(p){return p===57;}).length+' of 4 home';card.appendChild(home);
      var distance=document.createElement('div');distance.textContent='Progress: '+standing[seat];card.appendChild(distance);
      root.appendChild(card);
    });
  }
  function renderTokens(){
    var root=$('tokens'),seat=state.turn;root.replaceChildren();
    $('token-title').textContent=name(seat)+' — tokens';
    for(var i=0;i<4;i++){
      var p=state.tokens[seat][i],button=document.createElement('button');
      button.type='button';button.className='token';
      button.disabled=gate||busy||state.done||state.pendingRoll||!state.legal.includes(i)||(mode==='ai'&&seat===1);
      button.setAttribute('aria-label',name(seat)+' token '+(i+1)+', '+progressText(p)+
        (button.disabled?'':', press to move '+state.die));
      var title=document.createElement('strong');title.textContent='Token '+(i+1);
      var place=document.createElement('small');place.textContent=progressText(p);
      button.append(title,place);button.addEventListener('click',(function(token){return function(){play({type:'move',token:token});};})(i));
      root.appendChild(button);
    }
  }
  function render(){
    var result=game.outcome(state),seat=state.turn;
    $('handoff').hidden=!gate;$('play-area').hidden=gate;
    if(gate)$('handoff-message').textContent='Give the screen to '+name(seat)+'. They should press I am ready themselves.';
    var message;
    if(result.over)message=result.winner<0?'The game ends in a progress tie.':name(result.winner)+' wins'+(state.turns>=240?' on total progress.':' with all four tokens home.');
    else if(gate)message='Pass the screen to '+name(seat)+'.';
    else if(busy)message='Hopping Beebo is taking a turn.';
    else if(state.pendingRoll)message=name(seat)+(mode==='ai'&&seat===0?' roll':' rolls')+' the die.';
    else message=name(seat)+(mode==='ai'&&seat===0?' rolled ':' rolled ')+state.die+'. Choose a movable token.';
    $('status').textContent=message;
    $('die').textContent=state.die?String(state.die):'–';$('die').setAttribute('aria-label',state.die?'Last roll: '+state.die:'Die not rolled');
    $('roll').disabled=gate||busy||state.done||!state.pendingRoll||(mode==='ai'&&seat===1);
    renderRoster();renderBoard();renderTokens();
  }
  function botTurn(){
    if(mode!=='ai'||state.done||state.turn!==1)return;
    busy=true;render();var token=roundToken;
    window.setTimeout(function(){
      if(token!==roundToken||mode!=='ai'||state.done||state.turn!==1)return;
      var move=game.botMove(state,rng);if(!move)return;
      state=game.applyMove(state,move,rng);busy=false;render();
      say('Hopping Beebo '+(move.type==='roll'?'rolled '+state.die:'moved token '+(move.token+1))+'. '+$('status').textContent);
      if(!state.done&&state.turn===1)botTurn();else if(!state.done)$('roll').focus();
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:330);
  }
  function play(move){
    if(gate||busy||state.done||(mode==='ai'&&state.turn!==0))return;
    var before=state.turn;state=game.applyMove(state,move,rng);
    gate=mode!=='ai'&&!state.done&&state.turn!==before;render();
    var action=move.type==='roll'?name(before)+' rolled '+state.die+(state.last.type==='forfeit'?' — third six forfeits the turn.':state.last.type==='no-move'?' — no legal token move.':'.'):
      name(before)+' moved token '+(move.token+1)+(state.last.captured?' and captured '+state.last.captured+' opposing token.':'.');
    say(action+' '+$('status').textContent);
    if(gate)$('ready').focus();
    else if(!state.done&&mode==='ai'&&state.turn===1)botTurn();
    else if(!state.done&&(state.pendingRoll||state.last.type==='no-move'))$('roll').focus();
    else if(!state.done){var first=$('tokens').querySelector('button:not(:disabled)');if(first)first.focus();}
  }
  function newGame(){roundToken++;mode=$('mode').value;seed=(Date.now()>>>0)||1;
    state=game.newGame(mode==='ai'?2:Number(mode));gate=false;busy=false;render();say('New Ludo game. '+$('status').textContent);
  }
  $('new').addEventListener('click',newGame);$('mode').addEventListener('change',newGame);
  $('roll').addEventListener('click',function(){play({type:'roll'});});
  $('ready').addEventListener('click',function(){if(!gate)return;gate=false;render();say(name(state.turn)+' is ready. '+$('status').textContent);$('roll').focus();});
  newGame();
})();
