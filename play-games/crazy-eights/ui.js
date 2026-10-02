(function(){
  'use strict';
  var game=window.CrazyEightsGame,state,mode,gate=false,busy=false,selected=null,seed=1,roundToken=0;
  var $=function(id){return document.getElementById(id);};
  var suitWords={C:'Clubs',D:'Diamonds',H:'Hearts',S:'Spades'};
  var suitSymbols={C:'♣',D:'♦',H:'♥',S:'♠'};
  var rankWords={T:'Ten',J:'Jack',Q:'Queen',K:'King',A:'Ace'};
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function cardName(code){return (rankWords[code[0]]||code[0])+' of '+suitWords[code[1]];}
  function cardFace(code){var node=document.createElement('span');node.className='card'+('DH'.includes(code[1])?' red':'');
    var rank=document.createElement('span');rank.className='rank';rank.textContent=code[0]==='T'?'10':code[0];
    var symbol=document.createElement('span');symbol.className='suit-symbol';symbol.textContent=suitSymbols[code[1]];
    var suit=document.createElement('span');suit.className='suit-word';suit.textContent=suitWords[code[1]];
    node.append(rank,symbol,suit);return node;}
  function renderRoster(){var root=$('roster');root.replaceChildren();
    state.hands.forEach(function(cards,seat){var card=document.createElement('div');card.className='seat'+(!state.done&&state.turn===seat?' active':'');
      var title=document.createElement('strong');title.textContent=name(seat);var count=document.createElement('span');count.textContent=cards.length+' '+(cards.length===1?'card':'cards')+' left';card.append(title,count);root.appendChild(card);});}
  function renderTable(){var top=game.top(state),node=$('top');node.replaceChildren();node.className='card'+('DH'.includes(top[1])?' red':'');
    var rank=document.createElement('span');rank.className='rank';rank.textContent=top[0]==='T'?'10':top[0];
    var suit=document.createElement('span');suit.className='suit-symbol';suit.textContent=suitSymbols[top[1]];
    node.append(rank,suit);node.setAttribute('aria-label','Top card: '+cardName(top));
    $('stock').textContent='Stock: '+state.stock.length+' cards';
    $('suit').textContent='Active suit: '+suitWords[state.suit]+(top[0]==='8'?' (called after the wild eight)':'');}
  function renderHand(){var root=$('hand');root.replaceChildren();
    if(gate||busy||state.done||mode==='ai'&&state.turn===1)return;
    var seat=state.turn,moves=game.legalMoves(state),legal=new Set(moves.filter(function(m){return m.type==='play';}).map(function(m){return m.card;}));
    $('hand-heading').textContent=name(seat)+' — '+state.hands[seat].length+' cards';
    state.hands[seat].forEach(function(code){var button=document.createElement('button');button.type='button';button.className='card-button';button.disabled=!legal.has(code)||!!selected;
      button.setAttribute('aria-label',cardName(code)+(legal.has(code)?', playable':', cannot play now'));button.appendChild(cardFace(code));
      button.addEventListener('click',function(){if(code[0]==='8'){selected=code;render();var first=$('suit-buttons').querySelector('button');if(first)first.focus();}else play({type:'play',card:code});});root.appendChild(button);});
    $('draw').disabled=selected!==null||!moves.some(function(m){return m.type==='draw';});
    $('pass').disabled=selected!==null||!moves.some(function(m){return m.type==='pass';});
  }
  function renderChoice(){var choice=$('choice'),root=$('suit-buttons');choice.hidden=!selected;root.replaceChildren();
    if(!selected)return;game.SUITS.forEach(function(suit){var button=document.createElement('button');button.type='button';button.className='btn';
      button.textContent=suitSymbols[suit]+' '+suitWords[suit];button.setAttribute('aria-label','Call '+suitWords[suit]+' and play '+cardName(selected));
      button.addEventListener('click',function(){play({type:'play',card:selected,suit:suit});});root.appendChild(button);});}
  function render(){var seat=state.turn;
    $('handoff').hidden=!gate;$('hand-area').hidden=gate||busy||state.done||mode==='ai'&&seat===1;
    if(gate)$('handoff-message').textContent='Give the screen to '+name(seat)+'. Their cards stay hidden until they press the button.';
    var message=state.done?(state.winner<0?'Round ends in a tie.':name(state.winner)+' wins the round.'):
      gate?'Pass the screen to '+name(seat)+'.':busy?'Hopping Beebo is playing.':name(seat)+' to play on '+cardName(game.top(state))+' — active suit '+suitWords[state.suit]+'.';
    $('status').textContent=message;renderRoster();renderTable();renderChoice();renderHand();}
  function botTurn(){if(mode!=='ai'||state.done||state.turn!==1)return;busy=true;render();var token=roundToken;
    window.setTimeout(function(){if(token!==roundToken||mode!=='ai'||state.done||state.turn!==1)return;
      var move=game.botMove(state,rng);if(!move)return;state=game.applyMove(state,move,rng);busy=false;render();
      say('Hopping Beebo '+(move.type==='play'?'played '+cardName(move.card):move.type==='draw'?'drew a card':'passed')+'. '+$('status').textContent);
      if(!state.done&&state.turn===1)botTurn();else if(!state.done){var first=$('hand').querySelector('button:not(:disabled)');(first||$('draw')).focus();}
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:330);}
  function play(move){if(gate||busy||state.done||mode==='ai'&&state.turn!==0)return;
    var before=state.turn;state=game.applyMove(state,move,rng);selected=null;
    gate=mode!=='ai'&&!state.done&&state.turn!==before;render();
    say(name(before)+' '+(move.type==='play'?'played '+cardName(move.card):move.type==='draw'?'drew a card':'passed')+'. '+$('status').textContent);
    if(gate)$('ready').focus();else if(!state.done&&mode==='ai'&&state.turn===1)botTurn();
    else if(!state.done){var first=$('hand').querySelector('button:not(:disabled)');(first||(!$('draw').disabled?$('draw'):$('pass'))).focus();}}
  function newGame(){roundToken++;mode=$('mode').value;seed=(Date.now()>>>0)||1;state=game.newGame(mode==='ai'?2:Number(mode),rng);gate=mode!=='ai';busy=false;selected=null;render();say('New Crazy Eights round. '+$('status').textContent);if(gate)$('ready').focus();}
  $('new').addEventListener('click',newGame);$('mode').addEventListener('change',newGame);
  $('draw').addEventListener('click',function(){play({type:'draw'});});$('pass').addEventListener('click',function(){play({type:'pass'});});
  $('ready').addEventListener('click',function(){if(!gate)return;gate=false;render();say(name(state.turn)+' is ready. '+$('status').textContent);window.setTimeout(function(){var first=$('hand').querySelector('button:not(:disabled)');(first||(!$('draw').disabled?$('draw'):$('pass'))).focus();},0);});
  $('cancel').addEventListener('click',function(){selected=null;render();var first=$('hand').querySelector('button:not(:disabled)');if(first)first.focus();});
  newGame();
})();
