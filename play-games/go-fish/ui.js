(function(){
  'use strict';
  var game=window.GoFishGame,state,mode,gate=false,busy=false,seed=1,roundToken=0;
  var $=function(id){return document.getElementById(id);};
  var suitWords={C:'Clubs',D:'Diamonds',H:'Hearts',S:'Spades'};
  var suitSymbols={C:'♣',D:'♦',H:'♥',S:'♠'};
  var rankWords={T:'Ten',J:'Jack',Q:'Queen',K:'King',A:'Ace'};
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function name(seat){return mode==='ai'?(seat?'Hopping Beebo':'You'):'Player '+(seat+1);}
  function say(message){$('live').textContent=message;}
  function rankName(rank){return rankWords[rank]||rank;}
  function cardName(code){return rankName(code[0])+' of '+suitWords[code[1]];}
  function cardFace(code){var node=document.createElement('div');node.className='card'+('DH'.includes(code[1])?' red':'');node.setAttribute('aria-label',cardName(code));
    var rank=document.createElement('span');rank.className='rank';rank.textContent=code[0]==='T'?'10':code[0];
    var symbol=document.createElement('span');symbol.className='suit-symbol';symbol.textContent=suitSymbols[code[1]];
    var suit=document.createElement('span');suit.className='suit-word';suit.textContent=suitWords[code[1]];
    node.append(rank,symbol,suit);return node;}
  function renderRoster(){var root=$('roster');root.replaceChildren();state.hands.forEach(function(cards,seat){var item=document.createElement('div');item.className='seat'+(!state.done&&state.turn===seat?' active':'');
      var title=document.createElement('strong');title.textContent=name(seat);var count=document.createElement('span');count.textContent=cards.length+' '+(cards.length===1?'card':'cards')+' held';
      var books=document.createElement('small');books.textContent=state.books[seat].length+' '+(state.books[seat].length===1?'book':'books')+(state.books[seat].length?': '+state.books[seat].map(rankName).join(', '):'');
      item.append(title,count,books);root.appendChild(item);});$('stock').textContent='Stock: '+state.stock.length+' cards remain.';}
  function renderHand(){var root=$('hand');root.replaceChildren();$('target').replaceChildren();$('rank').replaceChildren();
    if(gate||busy||state.done||mode==='ai'&&state.turn===1)return;
    var seat=state.turn;state.hands[seat].forEach(function(code){root.appendChild(cardFace(code));});$('hand-heading').textContent=name(seat)+' — '+state.hands[seat].length+' cards';
    var targets=state.hands.map(function(h,i){return i!==seat&&h.length?i:-1;}).filter(function(i){return i>=0;});
    targets.forEach(function(target){var option=document.createElement('option');option.value=String(target);option.textContent=name(target)+' ('+state.hands[target].length+' cards)';$('target').appendChild(option);});
    var ranks=Array.from(new Set(state.hands[seat].map(function(c){return c[0];})));ranks.sort(function(a,b){return game.RANKS.indexOf(a)-game.RANKS.indexOf(b);});
    ranks.forEach(function(rank){var option=document.createElement('option');option.value=rank;option.textContent=rankName(rank);$('rank').appendChild(option);});
    $('ask').disabled=!targets.length||!ranks.length;}
  function publicAction(){var action=state.last;if(!action)return 'No questions yet.';
    var text=name(action.seat)+' asked '+name(action.target)+' for '+rankName(action.rank)+'s. ';
    if(action.taken)text+='Took '+action.taken+' '+(action.taken===1?'card':'cards')+'.';
    else text+='Go Fish!'+(action.wished?' Drew the wished-for rank and asks again.':'');
    if(action.booked.length)text+=' Completed the '+action.booked.map(rankName).join(', ')+(action.booked.length>1?' books.':' book.');
    return text;}
  function render(){var seat=state.turn;
    $('handoff').hidden=!gate;$('hand-area').hidden=gate||busy||state.done||mode==='ai'&&seat===1;
    if(gate)$('handoff-message').textContent='Give the screen to '+name(seat)+'. Their cards stay hidden until they press the button.';
    var message=state.done?(state.winner<0?'Round ends with the top book scores tied.':name(state.winner)+(name(state.winner)==='You'?' win':' wins')+' with the most books.'):
      gate?'Pass the screen to '+name(seat)+'.':busy?'Hopping Beebo is choosing a question.':name(seat)+' to ask for a rank.';
    $('status').textContent=message;$('last').textContent=publicAction();renderRoster();renderHand();}
  function botTurn(){if(mode!=='ai'||state.done||state.turn!==1)return;busy=true;render();var token=roundToken;
    window.setTimeout(function(){if(token!==roundToken||mode!=='ai'||state.done||state.turn!==1)return;
      var move=game.botMove(state,rng);if(!move)return;state=game.applyMove(state,move);busy=false;render();say(publicAction()+' '+$('status').textContent);
      if(!state.done&&state.turn===1)botTurn();else if(!state.done)$('ask').focus();
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:330);}
  function play(){if(gate||busy||state.done||mode==='ai'&&state.turn!==0)return;
    var move={type:'ask',target:Number($('target').value),rank:$('rank').value};var before=state.turn;state=game.applyMove(state,move);
    gate=mode!=='ai'&&!state.done&&state.turn!==before;render();say(publicAction()+' '+$('status').textContent);
    if(gate)$('ready').focus();else if(!state.done&&mode==='ai'&&state.turn===1)botTurn();else if(!state.done)$('ask').focus();}
  function newGame(){roundToken++;mode=$('mode').value;seed=(Date.now()>>>0)||1;state=game.newGame(mode==='ai'?2:Number(mode),rng);gate=mode!=='ai';busy=false;render();say('New Go Fish round. '+$('status').textContent);if(gate)$('ready').focus();}
  $('new').addEventListener('click',newGame);$('mode').addEventListener('change',newGame);$('ask').addEventListener('click',play);
  $('ready').addEventListener('click',function(){if(!gate)return;gate=false;render();say(name(state.turn)+' is ready. '+$('status').textContent);window.setTimeout(function(){$('target').focus();},0);});
  newGame();
})();
