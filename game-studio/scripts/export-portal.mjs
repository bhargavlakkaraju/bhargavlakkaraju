#!/usr/bin/env node
// Packages each game as a standalone HTML5 build for game portals, which pay a revenue
// share on their own traffic (a second income stream on top of our website):
//   crazygames        CrazyGames SDK v3 (ads + gameplay events)
//   poki              Poki SDK v2
//   gamedistribution  GameDistribution SDK (reaches 1000s of partner sites); needs a game id per game
//   generic           no SDK: itch.io, Newgrounds, Game Jolt, your own CDN
//
// Output: dist/portals/<portal>/<slug>/ (index.html + engine + game + font) and a .zip of each
// (index.html at the root of the zip, as the portals require).
// Usage: node scripts/export-portal.mjs [--portal crazygames|poki|gamedistribution|generic|all] [slug ...]
//
// GameDistribution game ids (32-character hex, from the GD developer dashboard), two ways:
//   1. Fill scripts/portals/gamedistribution-ids.json ({"stack-tower": "<id>", ...}) and
//      rebuild with: npm run gd:build. GD_GAME_IDS='{"slug":"<id>"}' overrides single entries.
//   2. Leave them empty: on GD the build reads the id from its own URL
//      (https://html5.gamedistribution.com/<id>/), see gameDistributionAdapter in platform.js.
// GD builds also get a start screen (the preroll runs on its Play button), an ad request on
// every Play again (the GD SDK enforces its own minimum gap between ads), a rotate-your-device
// hint on phones held sideways, and the GD title from scripts/portals/gamedistribution-listing.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let portalArg = 'all';
const pi = args.indexOf('--portal');
if (pi >= 0) {
  portalArg = args[pi + 1];
  args.splice(pi, 2);
}
const PORTALS = portalArg === 'all' ? ['crazygames', 'poki', 'gamedistribution', 'generic'] : [portalArg];
const gamesDir = path.join(root, 'src/games');
const slugs = args.length ? args : fs.readdirSync(gamesDir).filter((d) => d !== 'engine' && fs.existsSync(path.join(gamesDir, d, 'index.js')));
const GD_ID = /^[0-9a-f]{32}$/i;
function readGdIds() {
  const file = path.join(root, 'scripts/portals/gamedistribution-ids.json');
  let ids = {};
  try {
    ids = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (fs.existsSync(file)) console.warn(`warning: could not parse ${path.relative(root, file)}: ${e.message}`);
  }
  try {
    Object.assign(ids, JSON.parse(process.env.GD_GAME_IDS || '{}'));
  } catch (e) {
    console.warn(`warning: GD_GAME_IDS is not valid JSON: ${e.message}`);
  }
  const out = {};
  for (const [slug, id] of Object.entries(ids)) {
    if (!id) continue;
    if (GD_ID.test(String(id).trim())) out[slug] = String(id).trim().toLowerCase();
    else console.warn(`warning: ignoring GameDistribution id for ${slug}: expected 32 hex characters`);
  }
  return out;
}
const gdIds = readGdIds();
const { LISTING: gdListing } = await import(pathToFileURL(path.join(root, 'scripts/portals/gamedistribution-listing.mjs')).href);
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hasZip = (() => {
  try {
    execFileSync('zip', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    const d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else if (!f.endsWith('.md')) fs.copyFileSync(s, d);
  }
}

function html({ meta, portal }) {
  const gd = portal === 'gamedistribution';
  const platformOpts = gd ? JSON.stringify({ gameId: gdIds[meta.slug] || '' }) : '{}';
  const platformName = portal === 'generic' ? 'none' : portal;
  const title = gd ? gdListing[meta.slug]?.title || meta.title : meta.title;
  const description = gd ? gdListing[meta.slug]?.short || meta.description : meta.description;
  // GD: start screen + preroll on Play, an ad request on every Play again (the SDK paces
  // them), rotate hint on phones held sideways.
  const shellOpts = gd ? `\n  splash: { image: 'cover.jpg' },\n  interstitialEvery: 1,\n  rotateHint: true,` : '';
  const metaExpr = title !== meta.title ? `{ ...meta, title: ${JSON.stringify(title)} }` : 'meta';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<style>
@font-face{font-family:'Fredoka';font-weight:500 800;src:url('fonts/Fredoka-Bold.ttf') format('truetype')}
html,body{margin:0;height:100%;overflow:hidden;background:${meta.bg || '#0b0618'};overscroll-behavior:none;-webkit-user-select:none;user-select:none}
#game{position:fixed;inset:0}
</style>
</head>
<body>
<div id="game"></div>
<script type="module">
import createGame from './game/index.js';
import meta from './game/meta.js';
import { bootStandalone } from './engine/shell.js';
import { createPlatform } from './engine/platform.js';
const q = new URLSearchParams(location.search);
bootStandalone({
  container: document.getElementById('game'),
  createGame,
  meta: ${metaExpr},
  platform: createPlatform('${platformName}', ${platformOpts}),
  mode: q.get('mode') === 'daily' ? 'daily' : 'classic',${shellOpts}
});
</script>
</body>
</html>
`;
}

const summary = [];
for (const portal of PORTALS) {
  for (const slug of slugs) {
    const { default: meta } = await import(pathToFileURL(path.join(gamesDir, slug, 'meta.js')).href);
    const out = path.join(root, 'dist/portals', portal, slug);
    fs.rmSync(out, { recursive: true, force: true });
    copyDir(path.join(gamesDir, 'engine'), path.join(out, 'engine'));
    copyDir(path.join(gamesDir, slug), path.join(out, 'game'));
    fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
    fs.copyFileSync(path.join(root, 'public/fonts/Fredoka-Bold.ttf'), path.join(out, 'fonts/Fredoka-Bold.ttf'));
    const cover = path.join(root, 'public/covers', `${slug}.jpg`);
    if (fs.existsSync(cover)) fs.copyFileSync(cover, path.join(out, 'cover.jpg'));
    fs.writeFileSync(path.join(out, 'index.html'), html({ meta, portal }));
    let size = 0;
    const walk = (d) => fs.readdirSync(d).forEach((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : (size += fs.statSync(path.join(d, f)).size)));
    walk(out);
    if (hasZip) {
      const zipPath = path.join(root, 'dist/portals', portal, `${slug}.zip`);
      fs.rmSync(zipPath, { force: true });
      execFileSync('zip', ['-qr', zipPath, '.'], { cwd: out });
    }
    let zipNote = '';
    if (hasZip) zipNote = `  zip ${(fs.statSync(path.join(root, 'dist/portals', portal, `${slug}.zip`)).size / 1024).toFixed(0)} KB`;
    const idNote = portal === 'gamedistribution' ? (gdIds[slug] ? `  gameId ${gdIds[slug]}` : '  gameId from URL at runtime') : '';
    summary.push(`${portal.padEnd(17)} ${slug.padEnd(15)} ${(size / 1024).toFixed(0).padStart(5)} KB${zipNote}${idNote}`);
  }
}
console.log(summary.join('\n'));
console.log(`\nWrote ${summary.length} builds to dist/portals/${hasZip ? ' (+ .zip per build)' : ''}`);
