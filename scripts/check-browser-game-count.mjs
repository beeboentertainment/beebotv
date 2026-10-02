// Static-site integrity check: browser-play claims must match actual game pages.
// Run: node scripts/check-browser-game-count.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const catalog = read('games.html');
const hub = read('play-games/index.html');
const sitemap = read('sitemap.xml');
const names = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen'];
const expected = new Map([
  ['checkers','checkers'], ['chess','chess'], ['dominoes','dominoes'], ['mancala','mancala'], ['morris','nine-mens-morris'], ['fivedice','five-dice'], ['ludo','ludo'], ['crazy8s','crazy-eights'], ['dotsboxes','dots-and-boxes'],
  ['dropfour','drop-four'], ['reversi','reversi'], ['seabattle','sea-battle'],
  ['snakesladders','snakes-and-ladders'], ['ttt','tic-tac-toe'], ['pairs','memory-match'],
]);
const cards = [...catalog.matchAll(/<article class="game-card"[^>]*\bid="game-([^"]+)"[\s\S]*?<\/article>/g)];
const playable = cards.filter(m => /\bdata-browser-playable="true"/.test(m[0]));
const hubCards = [...hub.matchAll(/<li class="card"[^>]*data-id="([^"]+)"/g)];
const problems = [];
function requireValue(condition, message) { if (!condition) problems.push(message); }
function unique(list) { return new Set(list).size === list.length; }

requireValue(cards.length === 46, `catalogue has ${cards.length} cards, expected 46`);
requireValue((catalog.match(/data-kind="campsite"/g) || []).length === 42, 'campsite count is no longer 42');
requireValue((catalog.match(/data-kind="solo"/g) || []).length === 4, 'independent solo count is no longer four');
requireValue(catalog.includes(`${cards.length} games and activities`), 'visible catalogue count is stale');
requireValue(catalog.includes(`All ${cards.length}`), 'All filter count is stale');
requireValue(catalog.includes(`Explore all ${cards.length}`), 'hero link count is stale');
requireValue(catalog.includes(`Browse all ${cards.length} games`), 'hero description count is stale');
requireValue(playable.length === expected.size, `catalogue marks ${playable.length} browser-playable games, expected ${expected.size}`);
requireValue(hubCards.length === playable.length, `hub has ${hubCards.length} cards, catalogue marks ${playable.length}`);
requireValue(unique(hubCards.map(m => m[1])), 'hub has duplicate game cards');
requireValue(hub.includes(`"numberOfItems":${playable.length}`), 'hub structured-data count is stale');
requireValue(hub.includes(`${names[playable.length]} are a small sample`), 'hub sample count is stale');
requireValue(new RegExp(`${names[playable.length]} of our games run in this browser tab`, 'i').test(catalog), 'catalogue browser count is stale');
requireValue((catalog.match(/class="play-now"/g) || []).length === playable.length, 'Play now link count does not match playable cards');

for (const card of playable) {
  const id = card[1], slug = expected.get(id);
  requireValue(Boolean(slug), `unexpected browser-playable card ${id}`);
  if (!slug) continue;
  requireValue(card[0].includes(`href="/play-games/${slug}/"`), `${id} has wrong browser link`);
  requireValue(card[0].includes('Playable in your browser'), `${id} does not say it is browser-playable`);
  requireValue(hubCards.some(m => m[1] === slug), `${slug} is missing from hub`);
  requireValue(existsSync(join(root, 'play-games', slug, 'index.html')), `${slug} page is missing`);
  requireValue(existsSync(join(root, 'play-games', slug, 'game.js')), `${slug} game logic is missing`);
  requireValue(sitemap.includes(`https://beeboentertainment.com/play-games/${slug}/`), `${slug} is missing from sitemap`);
}
for (const [id] of expected) requireValue(playable.some(m => m[1] === id), `${id} is not marked browser-playable`);
if (problems.length) {
  for (const problem of problems) console.error('FAIL:', problem);
  process.exitCode = 1;
} else console.log(`${cards.length} catalogue games, ${playable.length} verified browser games, hub and sitemap agree.`);
