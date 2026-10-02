(function () {
  'use strict';
  var G = window.ChessGame;
  var $ = function (id) { return document.getElementById(id); };
  var symbols = { 1:'♙',2:'♘',3:'♗',4:'♖',5:'♕',6:'♔','-1':'♟','-2':'♞','-3':'♝','-4':'♜','-5':'♛','-6':'♚' };
  var names = { 1:'pawn',2:'knight',3:'bishop',4:'rook',5:'queen',6:'king' };
  var board = $('board'), cells = [], state, selected = -1, cursor = 0, mode, done = false, thinking = false, generation = 0, aiTimer = null;
  var clockSeconds = { 1:0, '-1':0 }, clockEnabled = false, lastTick = Date.now();
  var score = { ai:[0,0,0], friend:[0,0,0] }, history = [];
  function aiSide() { return mode === 'ai-white' ? -1 : mode === 'ai-black' ? 1 : 0; }
  function flipped() { return mode === 'ai-black'; }
  function displayed(i) {
    var whiteView = 56 - 8 * Math.floor(i / 8) + i % 8;
    return flipped() ? 63 - whiteView : whiteView;
  }
  function label(side) { return side > 0 ? 'White' : 'Black'; }
  function actor(side) { return mode === 'friend' ? label(side) : side === aiSide() ? 'Hopping Beebo' : 'You'; }
  function humanTurn() { return !done && !thinking && (!aiSide() || state.side !== aiSide()); }
  function say(message, completed) {
    $('status').textContent = message;
    $('status').className = 'status' + (completed ? ' done' : '');
    $('live').textContent = message;
  }
  function formatClock(seconds) { var total = Math.max(0,Math.ceil(seconds)); return Math.floor(total/60)+':'+String(total%60).padStart(2,'0'); }
  function paintClocks() {
    [[1,'white-clock'],[-1,'black-clock']].forEach(function (entry) {
      var side=entry[0], el=$(entry[1]), remain=clockSeconds[side];
      el.hidden=!clockEnabled;
      el.className='clock'+(!done && state.side===side?' active':'')+(remain<=30?' low':'');
      el.querySelector('strong').textContent=formatClock(remain);
      el.setAttribute('aria-label',label(side)+' clock '+formatClock(remain));
    });
  }
  function paintScore() {
    var list=mode==='friend'?score.friend:score.ai, captions=mode==='friend'?['White','Black','Draws']:['You','Hopping Beebo','Draws'];
    var holder=$('score'); holder.replaceChildren();
    list.forEach(function (value,i) { var span=document.createElement('span'), b=document.createElement('b'); b.textContent=String(value); span.appendChild(b); span.appendChild(document.createTextNode(' '+captions[i])); holder.appendChild(span); });
  }
  function paintMoves() {
    var list=$('moves'); list.replaceChildren();
    history.forEach(function (entry,i) {
      var item=document.createElement('li');
      item.textContent=(Math.floor(i/2)+1)+(i%2?'…':'')+' '+entry;
      list.appendChild(item);
    });
    list.scrollTop=list.scrollHeight;
  }
  function pieceDescription(p) { return p ? (p>0?'White ':'Black ')+names[Math.abs(p)] : 'empty'; }
  function paint() {
    var legal=humanTurn()?G.legalMoves(state):[];
    var available=Object.create(null), targets=Object.create(null);
    legal.forEach(function (m) { available[m.from]=true; if (m.from===selected) targets[m.to]=true; });
    var checked=G.inCheck(state), checkedKing=checked?state.board.indexOf(state.side*6):-1;
    cells.forEach(function (button,i) {
      var square=displayed(i), p=state.board[square], piece=button.firstChild;
      button.className='square '+((Math.floor(square/8)+square%8)%2?'light':'dark');
      if (state.last && (state.last.from===square || state.last.to===square)) button.className+=' last';
      if (selected===square) button.className+=' selected';
      if (targets[square]) button.className+=' target';
      if (checkedKing===square) button.className+=' king-check';
      piece.textContent=symbols[p]||'';
      piece.className='piece'+(p?(p>0?' white':' black'):'');
      var words=G.squareName(square)+', '+pieceDescription(p);
      if (selected===square) words+=', selected';
      else if (targets[square]) words+=', legal destination';
      else if (available[square] && selected<0) words+=', can move';
      if (checkedKing===square) words+=', in check';
      button.setAttribute('aria-label',words);
      button.setAttribute('aria-pressed',selected===square?'true':'false');
      button.tabIndex=i===cursor?0:-1;
    });
    paintClocks();
  }
  function outcomeAfterMove() {
    var out=G.outcome(state);
    if (!out.over) return false;
    finish(out.winner,out.reason);
    return true;
  }
  function finish(winner,reason) {
    done=true; thinking=false; generation++; clearTimeout(aiTimer); lastTick=Date.now();
    var list=mode==='friend'?score.friend:score.ai;
    if (winner===0) list[2]++;
    else list[mode==='friend'?(winner>0?0:1):(winner===aiSide()?1:0)]++;
    paintScore(); paint();
    var text=winner===0?'Draw by '+reason+'.':actor(winner)+(mode==='friend'?' wins':' wins')+' by '+reason+'.';
    say(text+' Press New game to play again.',true);
  }
  function moveText(before,move) {
    var p=before.board[move.from], capture=before.board[move.to]!==0 || !!move.ep;
    if (move.castle) return move.castle==='king'?'O-O':'O-O-O';
    return G.squareName(move.from)+(capture?'×':'–')+G.squareName(move.to)+(move.promotion?'='+names[move.promotion][0].toUpperCase():'');
  }
  function play(move) {
    var before=state, who=actor(before.side), notation=moveText(before,move);
    state=G.applyMove(state,move); selected=-1; history.push(notation); paintMoves();
    if (outcomeAfterMove()) return;
    var message=who+' played '+notation+'. '+(G.inCheck(state)?label(state.side)+' is in check. ':'')+(mode==='friend'?label(state.side)+' to move.':state.side===aiSide()?'Hopping Beebo is thinking…':'Your turn ('+label(state.side)+').');
    paint(); say(message,false);
    if (state.side===aiSide()) scheduleAi();
  }
  function scheduleAi() {
    thinking=true; paint();
    var current=++generation;
    aiTimer=setTimeout(function () {
      if (current!==generation || done) return;
      var move=G.chooseMove(state,$('difficulty').value,Math.random);
      thinking=false;
      if (move) play(move);
    },180);
  }
  function select(square) {
    if (!humanTurn()) return;
    var legal=G.legalMoves(state), choices=legal.filter(function (m) { return m.from===selected && m.to===square; });
    if (choices.length) {
      var promotion=Number($('promotion').value);
      play(choices.find(function (m) { return !m.promotion || m.promotion===promotion; })||choices[0]);
      return;
    }
    if (state.board[square]*state.side>0 && legal.some(function (m) { return m.from===square; })) {
      selected=square; paint(); say('Selected '+G.squareName(square)+'. Choose a marked square, or press Escape to cancel.',false);
      return;
    }
    selected=-1; paint();
  }
  function start() {
    generation++; clearTimeout(aiTimer); thinking=false; done=false; selected=-1; cursor=0;
    mode=$('mode').value; $('difficulty').disabled=mode==='friend';
    state=G.newGame(); history=[]; paintMoves();
    var seconds=Number($('clock').value); clockEnabled=seconds>0; clockSeconds={1:seconds,'-1':seconds}; lastTick=Date.now();
    paintScore(); paint();
    say('New game. '+(state.side===aiSide()?'Hopping Beebo is thinking…':mode==='friend'?'White to move.':'Your turn (White).'),false);
    if (state.side===aiSide()) scheduleAi();
  }
  function tick() {
    var now=Date.now();
    if (!done && clockEnabled && !document.hidden) {
      clockSeconds[state.side]-=(now-lastTick)/1000;
      if (clockSeconds[state.side]<=0) { clockSeconds[state.side]=0; finish(-state.side,'time'); }
      else paintClocks();
    }
    lastTick=now;
  }
  for (var i=0;i<64;i++) {
    (function (index) {
      var button=document.createElement('button'), span=document.createElement('span');
      button.type='button'; span.setAttribute('aria-hidden','true'); button.appendChild(span);
      button.addEventListener('click',function () { select(displayed(index)); });
      button.addEventListener('focus',function () { if (cursor!==index) { cells[cursor].tabIndex=-1; cursor=index; button.tabIndex=0; } });
      board.appendChild(button); cells.push(button);
    })(i);
  }
  board.addEventListener('keydown',function (event) {
    var delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key], next;
    if (event.key==='Escape') { if (selected>=0) { selected=-1; paint(); say('Selection cleared.',false); } return; }
    if (event.key==='Home') next=cursor-cursor%8;
    else if (event.key==='End') next=cursor-cursor%8+7;
    else if (delta!==undefined) next=cursor+delta;
    else return;
    event.preventDefault();
    if (next<0 || next>=64 || delta===-1 && cursor%8===0 || delta===1 && cursor%8===7) return;
    cells[cursor].tabIndex=-1; cursor=next; cells[cursor].tabIndex=0; cells[cursor].focus();
  });
  $('new').addEventListener('click',start);
  $('mode').addEventListener('change',start);
  $('clock').addEventListener('change',start);
  document.addEventListener('visibilitychange',function () { lastTick=Date.now(); });
  setInterval(tick,250);
  start();
})();
