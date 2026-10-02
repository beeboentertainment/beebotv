(() => {
  const canvas = document.querySelector('.layout-canvas');
  const status = document.querySelector('#layout-status');
  const arrangeToggle = document.querySelector('#arrange-toggle');
  const panelEls = [...document.querySelectorAll('[data-panel]')];
  const themes = {
    'control-room': { kicker: 'CONTROL ROOM', title: 'A calm household media control room.', copy: 'Rearrange the panels when your household needs a different view. Every move snaps to a safe grid position and never overlaps another panel.' },
    'library-table': { kicker: 'LIBRARY TABLE', title: 'A warm reading room for the collection you already own.', copy: 'Feature a single choice, keep its details nearby, then browse deliberately through shelves instead of a monitoring dashboard.' },
    wayfinder: { kicker: 'WAYFINDER', title: 'A clear, bright board for deciding what happens next.', copy: 'Keep continuation, downloads and household plans in sight. Panels snap into a modular mosaic without creating visual clutter.' },
  };
  const defaults = {
    'control-room': { 'now-playing': [1, 1, 8, 6], shelf: [1, 7, 8, 3], 'home-pulse': [9, 1, 4, 6], queue: [9, 7, 4, 4], household: [1, 10, 6, 4] },
    'library-table': { 'now-playing': [1, 1, 8, 6], shelf: [1, 7, 6, 3], 'home-pulse': [9, 1, 4, 6], queue: [7, 7, 6, 4], household: [1, 10, 6, 4] },
    wayfinder: { 'now-playing': [1, 2, 6, 6], shelf: [1, 8, 8, 3], 'home-pulse': [10, 2, 3, 6], queue: [9, 8, 4, 4], household: [7, 2, 3, 6] },
  };
  let theme = localStorage.getItem('beebo-layout-theme') || 'control-room';
  let layout = loadLayout(theme);

  function loadLayout(name) {
    const stored = localStorage.getItem(`beebo-layout-${name}`);
    return stored ? JSON.parse(stored) : structuredClone(defaults[name]);
  }
  function saveLayout() { localStorage.setItem(`beebo-layout-${theme}`, JSON.stringify(layout)); }
  function setStatus(message) { status.textContent = message; }
  function overlaps(candidate, currentId) {
    return Object.entries(layout).some(([id, [col, row, span, rows]]) => {
      if (id === currentId) return false;
      const [nextCol, nextRow, nextSpan, nextRows] = candidate;
      return nextCol < col + span && nextCol + nextSpan > col && nextRow < row + rows && nextRow + nextRows > row;
    });
  }
  function render() {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-theme-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme)));
    const direction = themes[theme];
    document.querySelector('#direction-kicker').textContent = direction.kicker;
    document.querySelector('#direction-title').textContent = direction.title;
    document.querySelector('#direction-copy').textContent = direction.copy;
    panelEls.forEach((panel) => {
      const [col, row, span, rows] = layout[panel.dataset.panel];
      panel.style.setProperty('--col', col);
      panel.style.setProperty('--row', row);
      panel.style.setProperty('--span', span);
      panel.style.setProperty('--rows', rows);
    });
  }
  function movePanel(id, direction) {
    const current = layout[id];
    const [col, row, span, rows] = current;
    const deltas = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    const [dx, dy] = deltas[direction];
    const next = [col + dx, row + dy, span, rows];
    if (next[0] < 1 || next[0] + next[2] > 13 || next[1] < 1 || overlaps(next, id)) {
      setStatus(`${id.replaceAll('-', ' ')} cannot move ${direction}; that grid position is occupied or outside the canvas.`);
      return;
    }
    layout[id] = next;
    saveLayout(); render();
    setStatus(`${id.replaceAll('-', ' ')} moved ${direction} to column ${next[0]}, row ${next[1]}.`);
  }
  function resizePanel(id, direction) {
    const [col, row, span, rows] = layout[id];
    const next = [col, row, Math.max(3, span + direction), rows];
    if (next[2] > 8 || next[0] + next[2] > 13 || overlaps(next, id)) {
      setStatus(`${id.replaceAll('-', ' ')} cannot resize there; the minimum safe grid or another panel prevents it.`);
      return;
    }
    layout[id] = next;
    saveLayout(); render();
    setStatus(`${id.replaceAll('-', ' ')} is now ${next[2]} grid columns wide.`);
  }
  function buildArrangeControls() {
    panelEls.forEach((panel) => {
      const id = panel.dataset.panel;
      const holder = panel.querySelector('.arrange-actions');
      [['left', '←'], ['right', '→'], ['up', '↑'], ['down', '↓']].forEach(([direction, label]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = label; button.title = `Move ${direction}`; button.setAttribute('aria-label', `Move ${id.replaceAll('-', ' ')} ${direction}`);
        button.addEventListener('click', () => movePanel(id, direction)); holder.append(button);
      });
      [['-1', 'Narrower'], ['1', 'Wider']].forEach(([amount, label]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = label; button.addEventListener('click', () => resizePanel(id, Number(amount))); holder.append(button);
      });
    });
  }
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => {
    theme = button.dataset.themeChoice; layout = loadLayout(theme); localStorage.setItem('beebo-layout-theme', theme); render();
    setStatus(`${themes[theme].kicker} layout loaded. Your saved arrangement is restored when available.`);
  }));
  arrangeToggle.addEventListener('click', () => {
    const arranging = canvas.classList.toggle('is-arranging');
    arrangeToggle.setAttribute('aria-pressed', String(arranging)); arrangeToggle.textContent = arranging ? 'Finish arranging' : 'Arrange panels';
    setStatus(arranging ? 'Arrange mode is on. Use panel move or resize controls; invalid positions are rejected.' : 'Arrange mode is off. Your safe layout is saved locally.');
  });
  document.querySelector('#reset-layout').addEventListener('click', () => {
    layout = structuredClone(defaults[theme]); saveLayout(); render(); setStatus(`${themes[theme].kicker} was reset to its default arrangement.`);
  });
  buildArrangeControls(); render();
})();
