// Explicit new-design profile; retained pages continue using the original shell.
export const redesignedPages = new Set([
  'index.html', 'features.html', 'how-it-works.html', 'testing.html', 'download.html',
  'help.html', 'about.html', 'terms.html', 'movie-privacy.html', 'delete-account.html',
]);
export const redesignedHeaderRE = /<header\b[^>]*class="site-header"[^>]*>[\s\S]*?<\/header>/g;
export const redesignedFooterRE = /<footer\b[^>]*class="site-footer"[^>]*>[\s\S]*?<\/footer>/g;
export function redesignedHeader(slug) {
  const nav = [['features.html','Features'],['how-it-works.html','How it works'],['testing.html','Testing'],['help.html','Help']];
  const links = nav.map(([url, label]) => `<a href="/${url}"${slug === url ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<header class="site-header" id="top"><div class="shell header-row"><a class="brand" href="/" aria-label="Beebo home"><img src="/assets/beebo-badge-192.png" alt="" width="40" height="40"><span>beebo<span class="brand-dot">.</span></span></a><nav class="desktop-nav" aria-label="Main navigation">${links}</nav><div class="header-actions"><button class="theme-toggle" type="button" aria-label="Switch to dark theme" hidden><span aria-hidden="true">◐</span></button><a class="button button-small" href="/download.html"${slug==='download.html'?' aria-current="page"':''}>Get Beebo <span aria-hidden="true">↗</span></a><details class="mobile-menu"><summary aria-label="Navigation menu"><span>Menu</span><span aria-hidden="true">+</span></summary><nav aria-label="Mobile navigation">${links}<a href="/about.html">About Beebo</a></nav></details></div></div></header>`;
}
export const redesignedFooter = `<footer class="site-footer"><div class="shell"><div class="footer-top"><div><a class="brand" href="/">beebo<span class="brand-dot">.</span></a><p>Your collection. Your little world.</p></div><nav aria-label="More about Beebo"><a href="/about.html">About Beebo</a><a href="/testing.html">Testing &amp; progress</a><a href="/help.html">A little help</a></nav></div><div class="footer-bottom"><p>© 2026 Beebo Entertainment <span>·</span> For adults 18+</p><nav aria-label="Legal"><a href="/movie-privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/delete-account.html">Delete account</a></nav><a href="#top">Back to top ↑</a></div></div></footer>`;
export const redesignedAssets = `<script src="/assets/new-theme.js"></script><link rel="stylesheet" href="/assets/new-site.css"><script src="/assets/new-site.js" defer></script>`;
