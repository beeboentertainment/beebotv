(() => {
  'use strict';

  const root = document.body;
  const state = { lobby: null, room: null, seatToken: null, pendingAction: null, pollTimer: null };
  const elements = {
    lobbyStatus: document.getElementById('lobby-status'), openTables: document.getElementById('open-tables'), gameList: document.getElementById('game-list'), refresh: document.getElementById('refresh-lobby'), roomPanel: document.getElementById('room-panel'), roomStatus: document.getElementById('room-status'), board: document.getElementById('tic-tac-toe-board'), invite: document.getElementById('invite-panel'), qr: document.getElementById('invite-qr'), copyInvite: document.getElementById('copy-invite'), copyStatus: document.getElementById('copy-status'), leaveRoom: document.getElementById('leave-room'), dialog: document.getElementById('seat-dialog'), form: document.getElementById('seat-form'), nickname: document.getElementById('guest-nickname'), context: document.getElementById('seat-context'), seatError: document.getElementById('seat-error'), signIn: document.getElementById('play-sign-in'), dialogSignIn: document.getElementById('dialog-sign-in')
  };

  // This is the only integration point for the planned web-games Worker.
  // The public page deliberately has no fallback activity, rooms or bot logic.
  const api = (() => {
    const origin = root.dataset.apiOrigin.trim().replace(/\/$/, '');
    const base = origin ? `${origin}/web-games/v1` : '';
    const configured = Boolean(base);
    async function request(path, options = {}) {
      if (!configured) throw new Error('The Beebo Play service has not been connected to this site yet.');
      const response = await fetch(`${base}${path}`, { headers: { Accept: 'application/json', ...(state.seatToken ? { Authorization: `Bearer ${state.seatToken}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, credentials: 'include', ...options });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'That request could not be completed.');
      return body;
    }
    return {
      configured,
      lobby: () => request('/lobby'),
      createRoom: (payload) => request('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
      joinRoom: (invite, payload) => request('/invites/join', { method: 'POST', body: JSON.stringify({ invite, ...payload }) }),
      room: (roomId) => request(`/rooms/${encodeURIComponent(roomId)}`),
      move: (roomId, cell) => request(`/rooms/${encodeURIComponent(roomId)}/moves`, { method: 'POST', body: JSON.stringify({ cell }) }),
      leave: (roomId) => request(`/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST' })
    };
  })();

  function text(node, value) { node.textContent = value; return node; }
  function make(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content !== undefined) text(node, content); return node; }
  function setLobbyMessage(message, kind = '') { text(elements.lobbyStatus, message); elements.lobbyStatus.dataset.state = kind; }
  function loginUrl() { return root.dataset.signInUrl || '/account/sign-in'; }
  elements.signIn.href = loginUrl(); elements.dialogSignIn.href = loginUrl();

  function button(label, className, onClick) { const node = make('button', className, label); node.type = 'button'; node.addEventListener('click', onClick); return node; }
  function setLoading() {
    elements.openTables.replaceChildren(make('div', 'loading-card'));
    elements.gameList.replaceChildren(...Array.from({ length: 3 }, () => make('div', 'game-card loading-card')));
    elements.openTables.setAttribute('aria-busy', 'true'); elements.gameList.setAttribute('aria-busy', 'true');
  }
  function showEmpty(node, message) { node.replaceChildren(make('p', 'empty-panel', message)); }
  function renderUnavailableGame(message) {
    const card = make('article', 'game-card');
    card.append(make('p', 'eyebrow', 'Browser beta'), make('h3', '', 'Tic-Tac-Toe'), make('p', '', 'Three in a row, on your own screens.'), make('p', 'availability', message));
    const actions = make('div', 'game-actions');
    ['Play a bot', 'Invite a friend', 'Find a player'].forEach((label) => { const item = button(label, label === 'Play a bot' ? 'primary-button' : 'secondary-button', () => {}); item.disabled = true; item.title = 'Connect the web-games service to start a table.'; actions.append(item); });
    card.append(actions); elements.gameList.replaceChildren(card);
  }

  function renderLobby(lobby) {
    state.lobby = lobby;
    const openTables = (Array.isArray(lobby.openTables) ? lobby.openTables : []).filter((table) => table.gameId === 'tic-tac-toe');
    const games = (Array.isArray(lobby.games) ? lobby.games : []).filter((game) => game.id === 'tic-tac-toe');
    elements.openTables.setAttribute('aria-busy', 'false'); elements.gameList.setAttribute('aria-busy', 'false');
    setLobbyMessage('', 'ready');
    if (!openTables.length) showEmpty(elements.openTables, 'No open tables right now. Start one and it will appear here for another player.');
    else {
      elements.openTables.replaceChildren(...openTables.map((table) => {
        const card = make('article', 'open-table');
        const info = make('div'); info.append(make('h3', '', table.gameName || 'Game table'), make('p', '', table.label || 'Looking for one player.'));
        const actions = make('div', 'open-table-actions'); actions.append(make('span', 'occupancy', table.playerCount ? `${table.playerCount}/${table.capacity || 2} seated` : 'Open seat'), button('Join table', 'primary-button', () => beginSeat({ kind: 'join', invite: table.invite })));
        card.append(info, actions); return card;
      }));
    }
    if (!games.length) showEmpty(elements.gameList, 'There are no web game entries in the lobby yet.');
    else {
      const sorted = [...games].sort((a, b) => Number(Boolean(b.openTables)) - Number(Boolean(a.openTables)) || (b.waitingPlayers || 0) - (a.waitingPlayers || 0));
      elements.gameList.replaceChildren(...sorted.map(renderGame));
    }
  }

  function renderGame(game) {
    const card = make('article', `game-card${game.openTables ? ' is-open' : ''}`);
    card.append(make('p', 'eyebrow', game.category || 'Quick game'), make('h3', '', game.name || game.id));
    if (game.description) card.append(make('p', '', game.description));
    const availability = game.openTables ? `${game.openTables} open ${game.openTables === 1 ? 'table' : 'tables'} · join now` : (game.waitingPlayers ? `${game.waitingPlayers} player${game.waitingPlayers === 1 ? '' : 's'} waiting` : 'No open tables yet');
    card.append(make('p', 'availability', availability));
    const actions = make('div', 'game-actions');
    if (game.supportsBot) actions.append(button('Play a bot', 'primary-button', () => beginSeat({ kind: 'create', gameId: game.id, mode: 'bot' })));
    if (game.supportsPrivate !== false) actions.append(button('Invite a friend', 'secondary-button', () => beginSeat({ kind: 'create', gameId: game.id, mode: 'private' })));
    if (game.supportsMatchmaking) actions.append(button('Find a player', 'secondary-button', () => beginSeat({ kind: 'create', gameId: game.id, mode: 'matchmaking' })));
    card.append(actions); return card;
  }

  function beginSeat(action) {
    state.pendingAction = action;
    const labels = { bot: 'Start a bot game', private: 'Create a private table', matchmaking: 'Find a player', join: 'Join this table' };
    text(elements.context, labels[action.mode || action.kind] || 'Choose a name for this game.');
    elements.seatError.hidden = true;
    elements.dialog.showModal(); elements.nickname.focus();
  }

  async function submitSeat(event) {
    event.preventDefault();
    const nickname = elements.nickname.value.trim();
    if (!nickname) return;
    const action = state.pendingAction;
    if (!action) return;
    elements.seatError.hidden = true;
    try {
      let result;
      if (action.kind === 'join') result = await api.joinRoom(action.invite, { nickname });
      else result = await api.createRoom({ gameId: action.gameId, mode: action.mode, nickname });
      elements.dialog.close();
      await enterRoom(result.room || result, result.seatToken);
    } catch (error) { text(elements.seatError, error.message); elements.seatError.hidden = false; }
  }

  function inviteUrl(invite) { return `${location.origin}${location.pathname}#join=${encodeURIComponent(invite)}`; }
  function renderRoom(room) {
    state.room = room; elements.roomPanel.hidden = false;
    const game = room.game || {}; text(document.getElementById('room-heading'), game.name || 'Tic-Tac-Toe');
    const board = room.board || {}; const cells = Array.isArray(board.cells) ? board.cells : Array(9).fill('');
    const yourMark = room.you && room.you.mark; const canMove = !board.winner && board.turn === yourMark;
    const status = board.winner ? (board.winner === 'draw' ? 'This round ended in a draw.' : `${board.winner.toUpperCase()} won this round.`) : (canMove ? 'Your turn. Choose an open square.' : 'Waiting for the other player’s move.');
    text(elements.roomStatus, status);
    elements.board.replaceChildren(...cells.map((mark, cell) => {
      const square = button(mark || ' ', 'ttt-square', () => sendMove(cell)); square.setAttribute('role', 'gridcell'); square.setAttribute('aria-label', mark ? `Square ${cell + 1}: ${mark}` : `Square ${cell + 1}: empty`); square.disabled = Boolean(mark) || !canMove; return square;
    }));
    const invite = room.invite;
    elements.invite.hidden = !invite;
    if (invite) renderInvite(invite);
  }
  function renderInvite(invite) {
    const url = inviteUrl(invite); elements.qr.replaceChildren();
    if (typeof qrcode !== 'function') { text(elements.qr, 'QR code could not load. You can still copy the invite.'); return; }
    const code = qrcode(0, 'M'); code.addData(url); code.make(); elements.qr.innerHTML = code.createSvgTag(5, 0, 'QR code for private game invite', 'Private Beebo Play invitation');
    elements.copyInvite.onclick = async () => { try { await navigator.clipboard.writeText(url); text(elements.copyStatus, 'Invite copied.'); } catch { text(elements.copyStatus, 'Copy is not available here. Select the address after opening the QR code.'); } };
  }
  async function enterRoom(room, seatToken) {
    if (!room || !room.id) throw new Error('The game service did not return a room.');
    if (!seatToken) throw new Error('The game service did not return table authorization.');
    state.seatToken = seatToken;
    renderRoom(room); window.clearInterval(state.pollTimer); state.pollTimer = window.setInterval(refreshRoom, 5000); await loadLobby();
  }
  async function refreshRoom() { if (!state.room || document.hidden) return; try { renderRoom(await api.room(state.room.id)); } catch (error) { text(elements.roomStatus, error.message); } }
  async function sendMove(cell) { if (!state.room) return; try { renderRoom(await api.move(state.room.id, cell)); } catch (error) { text(elements.roomStatus, error.message); } }
  async function leaveRoom() { if (state.room) { try { await api.leave(state.room.id); } catch (_) {} } window.clearInterval(state.pollTimer); state.room = null; state.seatToken = null; elements.roomPanel.hidden = true; await loadLobby(); }
  async function loadLobby() {
    if (!api.configured) { elements.openTables.setAttribute('aria-busy', 'false'); elements.gameList.setAttribute('aria-busy', 'false'); setLobbyMessage('Multiplayer is not connected to this preview yet. Configure the web-games service to show live tables.', 'error'); showEmpty(elements.openTables, 'The lobby will show open tables once the web-games service is connected.'); renderUnavailableGame('Live availability is unavailable until the service is connected.'); return; }
    setLobbyMessage('Refreshing the live lobby…');
    try { renderLobby(await api.lobby()); } catch (error) { elements.openTables.setAttribute('aria-busy', 'false'); elements.gameList.setAttribute('aria-busy', 'false'); setLobbyMessage(error.message, 'error'); showEmpty(elements.openTables, 'The live lobby could not be reached. Try refreshing.'); renderUnavailableGame('Live availability is unavailable while the lobby cannot be reached.'); }
  }
  async function joinFromFragment() {
    const params = new URLSearchParams(location.hash.slice(1)); const invite = params.get('join');
    if (!invite) return;
    // Keep the capability in the fragment until the person chooses a nickname; never copy it into a query string.
    beginSeat({ kind: 'join', invite });
  }
  document.querySelectorAll('[data-close-dialog]').forEach((node) => node.addEventListener('click', () => elements.dialog.close()));
  elements.form.addEventListener('submit', submitSeat); elements.refresh.addEventListener('click', loadLobby); elements.leaveRoom.addEventListener('click', leaveRoom);
  setLoading(); loadLobby(); joinFromFragment();
})();
