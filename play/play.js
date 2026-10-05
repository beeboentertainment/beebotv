(() => {
  'use strict';

  // Beebo Play browser client for the Beebo web-games API at
  // https://login.beebo.tv/web-games/v1 (served from our own server).
  //
  // Contract, in short:
  // - No cookies. The API grants CORS to this site's origin WITHOUT
  //   credentials, so every call uses credentials: 'omit'. A table seat is a
  //   bearer "seat token" kept in page memory only (never storage or a URL).
  // - Every POST sends JSON plus the X-Beebo-Web-Game: 1 header.
  // - Game id 'tic_tac_toe'; modes 'bot', 'friend' (private invite link) and
  //   'open' (public lobby table, only when the server's public switch is on).
  // - A friend invite travels in the link fragment (#join=i_...), which the
  //   browser never sends to any server, and works once.

  const root = document.body;
  const GAME_ID = 'tic_tac_toe';
  const POLL_MS = Number(root.dataset.pollMs) || 2000;
  const HEARTBEAT_MS = Number(root.dataset.heartbeatMs) || 30000;
  const $ = (id) => document.getElementById(id);
  const elements = {
    lobbyStatus: $('lobby-status'), openTables: $('open-tables'), gameList: $('game-list'), refresh: $('refresh-lobby'),
    roomPanel: $('room-panel'), roomHeading: $('room-heading'), roomStatus: $('room-status'), roomPlayers: $('room-players'), board: $('tic-tac-toe-board'),
    roomActions: $('room-actions'), invite: $('invite-panel'), qr: $('invite-qr'), copyInvite: $('copy-invite'), copyStatus: $('copy-status'),
    inviteLink: $('invite-link'), inviteExpiry: $('invite-expiry'), leaveRoom: $('leave-room'),
    dialog: $('seat-dialog'), form: $('seat-form'), nickname: $('guest-nickname'), context: $('seat-context'), seatError: $('seat-error'),
    pasteForm: $('paste-invite-form'), pasteInput: $('paste-invite'), pasteError: $('paste-invite-error')
  };
  const state = { games: null, publicTables: false, room: null, pendingAction: null, pollTimer: null, heartbeatTimer: null, busy: false, lastNickname: '' };

  const MESSAGES = {
    name_inappropriate: 'Please choose a family-friendly name without offensive words.',
    name_invalid: 'Choose a shorter nickname.',
    invalid_invite: 'That invite has expired or was already used. Ask your friend to send a new one.',
    invite_unavailable: 'Someone else already took that seat. Ask your friend to send a new invite.',
    public_tables_off: 'Open tables with strangers are switched off right now. Invite a friend with a link instead.',
    room_full: 'That table just filled up. Try another one.',
    room_not_found: 'That table is no longer available.',
    room_closed: 'This table was closed.',
    room_expired: 'This table has timed out.',
    not_in_room: 'You are no longer seated at this table.',
    host_only: 'Only the person who started the table can close it.',
    too_many_requests: 'Too many tries in a short time. Wait a minute and try again.',
    bad_origin: 'Open this page from www.beeboentertainment.com to play.',
    service_unavailable: 'The game service is busy. Try again in a moment.'
  };

  const api = (() => {
    const origin = String(root.dataset.apiOrigin || '').trim().replace(/\/$/, '');
    const base = origin ? `${origin}/web-games/v1` : '';
    async function request(path, { method = 'GET', body, seatToken } = {}) {
      if (!base) { const e = new Error('The game service is not connected to this page.'); e.code = 'not_configured'; throw e; }
      const headers = { Accept: 'application/json' };
      if (seatToken) headers.Authorization = `Bearer ${seatToken}`;
      const init = { method, headers, credentials: 'omit', mode: 'cors', cache: 'no-store', referrerPolicy: 'no-referrer' };
      if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
        headers['X-Beebo-Web-Game'] = '1';
        init.body = JSON.stringify(body || {});
      }
      let response;
      try { response = await fetch(`${base}${path}`, init); } catch (_) {
        const e = new Error('Could not reach the game service. Check your connection and try again.'); e.code = 'network'; throw e;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = data && data.error;
        const e = new Error((data && data.message) || MESSAGES[code] || 'That did not work. Try again.');
        e.code = code || 'http_' + response.status; e.status = response.status; e.data = data; throw e;
      }
      return data;
    }
    return {
      configured: Boolean(base),
      games: () => request('/games'),
      lobby: () => request('/lobby'),
      createRoom: (mode, nickname) => request('/rooms', { method: 'POST', body: { game: GAME_ID, mode, nickname } }),
      joinInvite: (invite, nickname) => request('/invites/join', { method: 'POST', body: { invite, nickname } }),
      joinOpen: (roomId, nickname) => request(`/rooms/${encodeURIComponent(roomId)}/join`, { method: 'POST', body: { nickname } }),
      room: (roomId, seatToken) => request(`/rooms/${encodeURIComponent(roomId)}`, { seatToken }),
      heartbeat: (roomId, seatToken) => request(`/rooms/${encodeURIComponent(roomId)}/heartbeat`, { method: 'POST', body: {}, seatToken }),
      move: (roomId, seatToken, cell, revision, actionId) => request(`/rooms/${encodeURIComponent(roomId)}/actions`, { method: 'POST', body: { cell, revision, actionId }, seatToken }),
      close: (roomId, seatToken) => request(`/rooms/${encodeURIComponent(roomId)}/close`, { method: 'POST', body: {}, seatToken })
    };
  })();

  function text(node, value) { if (node) node.textContent = value; return node; }
  function make(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content !== undefined) text(node, content); return node; }
  function button(label, className, onClick) { const node = make('button', className, label); node.type = 'button'; node.addEventListener('click', onClick); return node; }
  function setLobbyMessage(message, kind = '') { text(elements.lobbyStatus, message); elements.lobbyStatus.dataset.state = kind; }
  function showEmpty(node, message) { node.replaceChildren(make('p', 'empty-panel', message)); }
  function actionId() {
    const bytes = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return 'a_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  function setLoading() {
    elements.openTables.replaceChildren(make('div', 'loading-card'));
    elements.gameList.replaceChildren(make('div', 'game-card loading-card'));
    elements.openTables.setAttribute('aria-busy', 'true'); elements.gameList.setAttribute('aria-busy', 'true');
  }
  function doneLoading() { elements.openTables.setAttribute('aria-busy', 'false'); elements.gameList.setAttribute('aria-busy', 'false'); }

  // ---------- Lobby ----------
  function showNotConnected() {
    doneLoading();
    setLobbyMessage('The game service could not be reached. Try Refresh in a moment.', 'error');
    showEmpty(elements.openTables, 'Tables will show here once the game service answers.');
    const card = make('article', 'game-card');
    card.append(make('p', 'eyebrow', 'Browser beta'), make('h3', '', 'Tic-Tac-Toe'), make('p', '', 'Three in a row, on your own screens.'), make('p', 'availability', 'Not reachable right now.'));
    elements.gameList.replaceChildren(card);
  }

  function renderGames() {
    const game = (state.games || []).find((g) => g.id === GAME_ID && g.enabled !== false);
    if (!game) { showEmpty(elements.gameList, 'No browser games are available right now.'); return; }
    const card = make('article', 'game-card');
    card.append(make('p', 'eyebrow', 'Browser beta'), make('h3', '', game.title || 'Tic-Tac-Toe'), make('p', '', 'Three in a row, on your own screens.'));
    card.append(make('p', 'availability', state.publicTables ? 'Computer, friend invite or open table' : 'Play the computer or invite a friend'));
    const actions = make('div', 'game-actions');
    if (game.supportsBot) actions.append(button('Play Beebo (computer)', 'primary-button', () => beginSeat({ kind: 'create', mode: 'bot' })));
    if (game.supportsInvites) actions.append(button('Invite a friend', 'secondary-button', () => beginSeat({ kind: 'create', mode: 'friend' })));
    if (game.supportsOpenTables && state.publicTables) actions.append(button('Open a public table', 'secondary-button', () => beginSeat({ kind: 'create', mode: 'open' })));
    card.append(actions);
    elements.gameList.replaceChildren(card);
  }

  function renderLobby(lobby) {
    state.publicTables = Boolean(lobby && lobby.publicTables);
    doneLoading();
    setLobbyMessage('', 'ready');
    if (!state.publicTables) {
      showEmpty(elements.openTables, 'Open tables with strangers are switched off during the friends beta. Start a game below and send the invite link to a friend.');
      return;
    }
    const group = (Array.isArray(lobby.games) ? lobby.games : []).find((g) => g.game === GAME_ID);
    const tables = group && Array.isArray(group.tables) ? group.tables.filter((t) => t.status === 'waiting' && t.openSeats > 0) : [];
    if (!tables.length) { showEmpty(elements.openTables, 'No open tables right now. Open one below and it will show here for another player.'); return; }
    elements.openTables.replaceChildren(...tables.map((table) => {
      const card = make('article', 'open-table');
      const info = make('div'); info.append(make('h3', '', 'Tic-Tac-Toe'), make('p', '', 'Looking for one player.'));
      const actions = make('div', 'open-table-actions');
      actions.append(make('span', 'occupancy', 'Open seat'), button('Join table', 'primary-button', () => beginSeat({ kind: 'openJoin', roomId: table.id })));
      card.append(info, actions); return card;
    }));
  }

  async function loadLobby() {
    if (!api.configured) { showNotConnected(); return; }
    setLobbyMessage('Refreshing…');
    try {
      const [games, lobby] = await Promise.all([api.games(), api.lobby()]);
      state.games = Array.isArray(games.games) ? games.games : [];
      renderLobby(lobby);
      renderGames();
    } catch (_) { showNotConnected(); }
  }

  // ---------- Seat dialog ----------
  function beginSeat(action) {
    state.pendingAction = action;
    const labels = { bot: 'Start a game against Beebo, the computer player.', friend: 'Start a private table. You will get a link to send to one friend.', open: 'Open a public table that another player can join.', openJoin: 'Join this open table.', join: 'A friend invited you to a game of Tic-Tac-Toe.' };
    text(elements.context, labels[action.mode || action.kind] || 'Choose a name for this game.');
    elements.seatError.hidden = true;
    if (state.lastNickname && !elements.nickname.value) elements.nickname.value = state.lastNickname;
    if (typeof elements.dialog.showModal === 'function') elements.dialog.showModal(); else elements.dialog.setAttribute('open', '');
    elements.nickname.focus();
  }
  function closeDialog() { if (typeof elements.dialog.close === 'function') elements.dialog.close(); else elements.dialog.removeAttribute('open'); }

  async function submitSeat(event) {
    event.preventDefault();
    const action = state.pendingAction;
    if (!action || state.busy) return;
    const nickname = elements.nickname.value.trim();
    elements.seatError.hidden = true;
    state.busy = true;
    try {
      let result;
      if (action.kind === 'join') result = await api.joinInvite(action.invite, nickname);
      else if (action.kind === 'openJoin') result = await api.joinOpen(action.roomId, nickname);
      else result = await api.createRoom(action.mode, nickname);
      state.lastNickname = nickname;
      if (action.kind === 'join') clearInviteFragment();
      state.busy = false;
      closeDialog();
      enterRoom(result, action.kind === 'create');
    } catch (error) {
      if (action.kind === 'join' && (error.code === 'invalid_invite' || error.code === 'invite_unavailable')) clearInviteFragment();
      text(elements.seatError, error.message); elements.seatError.hidden = false;
    } finally { state.busy = false; }
  }

  // ---------- Table ----------
  function inviteUrl(invite) { return `${location.origin}${location.pathname}#join=${encodeURIComponent(invite)}`; }
  function clearInviteFragment() { try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { location.hash = ''; } }
  function inviteFromText(value) { const match = /(?:^|[#&=\s])(i_[A-Za-z0-9_-]{16,})/.exec(' ' + String(value || '').trim()); return match ? match[1] : ''; }

  function enterRoom(result, isHost) {
    if (!result || !result.roomId || !result.seatToken || !result.snapshot) throw new Error('The game service did not return a table.');
    state.room = { id: result.roomId, seatToken: result.seatToken, isHost, invite: result.invite || null, inviteExpiresAt: result.inviteExpiresAt || null, snapshot: result.snapshot, ended: false };
    elements.roomPanel.hidden = false;
    renderRoom();
    startTimers();
    if (typeof elements.roomPanel.scrollIntoView === 'function') elements.roomPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function names(snapshot) {
    const players = Array.isArray(snapshot.players) ? snapshot.players : [];
    const me = players.find((p) => p.mark === snapshot.you);
    const other = players.find((p) => p.mark !== snapshot.you);
    return { me: me ? me.nickname : 'You', other: other ? (other.bot ? 'Beebo' : other.nickname) : null };
  }

  function statusLine(snapshot) {
    const who = names(snapshot);
    if (snapshot.status === 'waiting') return snapshot.mode === 'friend' ? 'Waiting for your friend to open the invite…' : 'Waiting for another player to join…';
    if (snapshot.status === 'ended') {
      if (snapshot.winner === 'draw') return 'It’s a draw.';
      return snapshot.winner === snapshot.you ? 'You won!' : `${who.other || 'The other player'} won this round.`;
    }
    if (snapshot.status === 'active') return snapshot.turn === snapshot.you ? 'Your turn. Choose an open square.' : `Waiting for ${who.other || 'the other player'} to move…`;
    return 'This table has ended.';
  }

  function renderRoom(message) {
    const room = state.room; if (!room) return;
    const snapshot = room.snapshot;
    const canMove = !room.ended && snapshot.status === 'active' && snapshot.turn === snapshot.you && !state.busy;
    text(elements.roomHeading, 'Tic-Tac-Toe');
    text(elements.roomStatus, message || statusLine(snapshot));
    const who = names(snapshot);
    const mark = (m) => String(m || '').toUpperCase();
    const otherMark = snapshot.you === 'x' ? 'o' : 'x';
    text(elements.roomPlayers, who.other ? `You (${mark(snapshot.you)}): ${who.me} · ${who.other} (${mark(otherMark)})` : `You (${mark(snapshot.you)}): ${who.me}`);
    const board = Array.isArray(snapshot.board) ? snapshot.board : Array(9).fill(null);
    elements.board.replaceChildren(...board.map((value, cell) => {
      const square = button(value ? value.toUpperCase() : ' ', 'ttt-square', () => sendMove(cell));
      square.setAttribute('role', 'gridcell');
      square.dataset.cell = String(cell);
      square.setAttribute('aria-label', value ? `Square ${cell + 1}: ${value.toUpperCase()}` : `Square ${cell + 1}: empty`);
      square.disabled = Boolean(value) || !canMove;
      return square;
    }));
    const showInvite = Boolean(room.isHost && !room.ended && snapshot.mode === 'friend' && snapshot.status === 'waiting' && room.invite);
    elements.invite.hidden = !showInvite;
    if (showInvite) renderInvite(room.invite, room.inviteExpiresAt);
    elements.roomActions.replaceChildren();
    if (snapshot.status === 'ended' || room.ended) {
      const again = snapshot.mode === 'bot' ? 'Play Beebo again' : snapshot.mode === 'friend' ? 'New game (new invite link)' : 'Open a new table';
      elements.roomActions.append(button(again, 'primary-button', () => playAgain(snapshot.mode)));
    }
    text(elements.leaveRoom, room.isHost && !room.ended && snapshot.status !== 'ended' ? 'Close table' : 'Leave table');
  }

  let renderedInvite = null;
  function renderInvite(invite, expiresAt) {
    const url = inviteUrl(invite);
    if (elements.inviteLink) elements.inviteLink.value = url;
    if (elements.inviteExpiry && expiresAt) {
      const minutes = Math.max(0, Math.round((expiresAt * 1000 - Date.now()) / 60000));
      text(elements.inviteExpiry, minutes > 0 ? `The link works once, for about ${minutes} more minute${minutes === 1 ? '' : 's'}.` : 'This link has expired. Close the table and start a new game for a new link.');
    }
    if (renderedInvite === invite) return;
    renderedInvite = invite;
    text(elements.copyStatus, '');
    elements.qr.replaceChildren();
    if (typeof window.qrcode === 'function') {
      try { const code = window.qrcode(0, 'M'); code.addData(url); code.make(); elements.qr.innerHTML = code.createSvgTag(5, 0, 'QR code for this private game invite', 'Private Beebo Play invite'); } catch (_) { text(elements.qr, 'The QR code could not be drawn. Copy the link instead.'); }
    } else text(elements.qr, 'The QR code could not load. Copy the link instead.');
    elements.copyInvite.onclick = async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Beebo Play invite', text: 'Play Tic-Tac-Toe with me', url }); text(elements.copyStatus, 'Invite shared.'); return; } catch (_) { /* fall back to copy */ } }
      try { await navigator.clipboard.writeText(url); text(elements.copyStatus, 'Invite link copied.'); } catch (_) { if (elements.inviteLink) elements.inviteLink.select(); text(elements.copyStatus, 'Copy is not available here. Select the link above and copy it.'); }
    };
  }

  function applySnapshot(snapshot) {
    if (!state.room || !snapshot) return;
    state.room.snapshot = snapshot;
    if (snapshot.status === 'ended') { state.room.ended = true; stopTimers(); }
    renderRoom();
  }

  function tableGone(error) {
    if (!state.room) return;
    state.room.ended = true; stopTimers();
    renderRoom(MESSAGES[error.code] || error.message);
  }

  async function refreshRoom() {
    const room = state.room; if (!room || room.ended || state.busy) return;
    try { const data = await api.room(room.id, room.seatToken); if (state.room === room) applySnapshot(data.snapshot); }
    catch (error) { if (state.room !== room) return; if (error.status === 410 || error.status === 403 || error.status === 404) tableGone(error); }
  }
  async function heartbeat() {
    const room = state.room; if (!room || room.ended) return;
    try { await api.heartbeat(room.id, room.seatToken); } catch (error) { if (state.room === room && (error.status === 410 || error.status === 403)) tableGone(error); }
  }
  function startTimers() {
    stopTimers();
    if (state.room.snapshot.status === 'ended') { state.room.ended = true; renderRoom(); return; }
    state.pollTimer = window.setInterval(() => { if (!document.hidden) refreshRoom(); }, POLL_MS);
    state.heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);
  }
  function stopTimers() { window.clearInterval(state.pollTimer); window.clearInterval(state.heartbeatTimer); state.pollTimer = null; state.heartbeatTimer = null; }

  async function sendMove(cell) {
    const room = state.room; if (!room || state.busy) return;
    const snapshot = room.snapshot;
    if (room.ended || snapshot.status !== 'active' || snapshot.turn !== snapshot.you || snapshot.board[cell]) return;
    const id = actionId();
    state.busy = true; renderRoom('Sending your move…');
    try {
      let data;
      // A network retry reuses the same action id, so the server never applies the move twice.
      try { data = await api.move(room.id, room.seatToken, cell, snapshot.revision, id); }
      catch (error) { if (error.code !== 'network') throw error; data = await api.move(room.id, room.seatToken, cell, snapshot.revision, id); }
      state.busy = false;
      if (state.room === room) applySnapshot(data.snapshot);
    } catch (error) {
      state.busy = false;
      if (state.room !== room) return;
      if (['stale_revision', 'wrong_turn', 'cell_occupied', 'room_not_active'].includes(error.code)) { await refreshRoom(); return; }
      if (error.status === 410 || error.status === 403) { tableGone(error); return; }
      renderRoom(error.message);
    }
  }

  async function leaveRoom() {
    const room = state.room;
    stopTimers();
    if (room && room.isHost && !room.ended) { try { await api.close(room.id, room.seatToken); } catch (_) { /* the table times out on its own */ } }
    state.room = null; renderedInvite = null;
    elements.roomPanel.hidden = true; elements.invite.hidden = true;
    await loadLobby();
  }

  async function playAgain(mode) {
    const old = state.room;
    if (old && old.isHost && !old.ended) { try { await api.close(old.id, old.seatToken); } catch (_) {} }
    stopTimers(); state.room = null; renderedInvite = null;
    try { enterRoom(await api.createRoom(mode, state.lastNickname), true); }
    catch (error) { elements.roomPanel.hidden = true; beginSeat({ kind: 'create', mode }); text(elements.seatError, error.message); elements.seatError.hidden = false; }
  }

  // ---------- Invite links ----------
  function joinFromFragment() {
    const invite = new URLSearchParams(location.hash.slice(1)).get('join');
    if (invite) beginSeat({ kind: 'join', invite });
  }
  function submitPaste(event) {
    event.preventDefault();
    const invite = inviteFromText(elements.pasteInput.value);
    if (!invite) { text(elements.pasteError, 'That does not look like a Beebo Play invite link.'); elements.pasteError.hidden = false; return; }
    elements.pasteError.hidden = true; elements.pasteInput.value = '';
    beginSeat({ kind: 'join', invite });
  }

  document.querySelectorAll('[data-close-dialog]').forEach((node) => node.addEventListener('click', closeDialog));
  elements.form.addEventListener('submit', submitSeat);
  elements.refresh.addEventListener('click', loadLobby);
  elements.leaveRoom.addEventListener('click', leaveRoom);
  if (elements.pasteForm) elements.pasteForm.addEventListener('submit', submitPaste);
  window.addEventListener('hashchange', joinFromFragment);
  // The seat lives only in this page, so a reload leaves the table. Warn first.
  window.addEventListener('beforeunload', (event) => { if (state.room && !state.room.ended) { event.preventDefault(); event.returnValue = ''; } });
  setLoading(); loadLobby(); joinFromFragment();
})();
