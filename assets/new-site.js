(() => {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const button = document.querySelector('.theme-toggle');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : system.matches;
  const label = () => button?.setAttribute('aria-label', `Switch to ${isDark() ? 'light' : 'dark'} theme`);
  if (button) {
    button.hidden = false;
    label();
    button.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('beebo-appearance', root.dataset.theme); } catch { /* Optional preference only. */ }
      label();
    });
    system.addEventListener('change', label);
  }
  const menu = document.querySelector('.mobile-menu');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });
})();
