(function(){
  'use strict';
  var game=window.WarGame,state,mode,seed=1,roundToken=0,busy=false;
  var $=function(id){return document.getElementById(id);};
  var suitWords={C:'Clubs',D:'Diamonds',H:'Hearts',S:'Spades'},suitSymbols={C:'♣',D:'♦',H:'♥',S:'♠'},rankWords={T:'Ten',J:'Jack',Q:'Queen',K:'King',A:'Ace'};
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function cardName(code){return(rankWords[code[0]]||code[0])+' of '+suitWords[code[1]];}
  function renderCard(seat){var root=$('card'+seat),code=state.shown[seat];root.replaceChildren();root.className='card'+(!code?' back':'DH'.includes(code[1])?' red':'');
    if(!code){var back=document.createElement('span');back.className='rank';back.textContent='Beebo';root.appendChild(back);root.setAttribute('aria-label','No revealed card');return;}
    var rank=document.createElement('span');rank.className='rank';rank.textContent=code[0]==='T'?'10':code[0];
    var symbol=document.createElement('span');symbol.className='suit-symbol';symbol.textContent=suitSymbols[code[1]];
    var suit=document.createElement('span');suit.className='suit-word';suit.textContent=suitWords[code[1]];
    root.append(rank,symbol,suit);root.setAttribute('aria-label',cardName(code));}
  function render(){var counts=game.counts(state);for(var seat=0;seat<2;seat++){
      $('name'+seat).textContent=name(seat);$('count'+seat).textContent=counts[seat]+' '+(counts[seat]===1?'card':'cards')+' held';
      renderCard(seat);var button=$('flip'+seat);button.textContent=mode==='ai'?(seat?'Hopping Beebo turns':'Turn your card'):'Player '+(seat+1)+': turn card';
      button.disabled=state.done||busy||!!state.revealed[seat]||mode==='ai'&&seat===1;
    }
    var message=state.done?(state.winner<0?'Game ends in a tie.':name(state.winner)+(name(state.winner)==='You'?' win':' wins')+' War.'):
      busy?'Hopping Beebo is turning a card.':state.revealed[0]||state.revealed[1]?'One card is turned face down. Waiting for the other player.':state.war?'War! Both players turn another card.':'Both players turn a card.';
    $('status').textContent=message;$('table-note').textContent='Comparison '+state.tricks+' of '+game.CAP+'. '+state.stake.length+' cards at stake.'+(state.war?' War depth '+state.war+'.':'');}
  function botTurn(){if(mode!=='ai'||state.done||state.revealed[1])return;busy=true;render();var token=roundToken;
    window.setTimeout(function(){if(token!==roundToken||mode!=='ai'||state.done)return;
      var move=game.botMove(state,1);if(!move)return;state=game.applyMove(state,move,rng);busy=false;render();
      say(lastMessage()+' '+$('status').textContent);if(!state.done)$('flip0').focus();
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:350);}
  function lastMessage(){var action=state.last;if(!action)return'';
    if(action.type==='waiting')return name(action.seat)+' turned a card face down.';
    if(action.type==='war')return 'War: '+cardName(action.shown[0])+' tied '+cardName(action.shown[1])+'. '+action.cards+' cards at stake.';
    if(action.type==='win')return name(action.winner)+' took '+action.cards+' cards with '+cardName(action.shown[action.winner])+'.';
    return name(action.seat)+' ran out of cards.';}
  function flip(seat){if(state.done||busy||mode==='ai'&&seat===1)return;state=game.applyMove(state,{type:'flip',seat:seat},rng);render();say(lastMessage()+' '+$('status').textContent);
    if(mode==='ai'&&!state.done&&state.revealed[0]&&!state.revealed[1])botTurn();
    else if(!state.done){var next=state.revealed[0]?1:0;if(mode!=='ai')$('flip'+next).focus();else $('flip0').focus();}}
  function newGame(){roundToken++;mode=$('mode').value;seed=(Date.now()>>>0)||1;state=game.newGame(rng);busy=false;render();say('New War game. Both piles have 26 face-down cards.');}
  $('new').addEventListener('click',newGame);$('mode').addEventListener('change',newGame);
  $('flip0').addEventListener('click',function(){flip(0);});$('flip1').addEventListener('click',function(){flip(1);});
  newGame();
})();
