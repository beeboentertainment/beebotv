/* Apply a saved appearance before painting. The site does not track visitors. */
(() => {
  try {
    const theme = localStorage.getItem('beebo-appearance');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch { /* System appearance still works when storage is unavailable. */ }
})();
