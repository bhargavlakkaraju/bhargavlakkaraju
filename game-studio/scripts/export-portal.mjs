#!/usr/bin/env node
// Packages each game as a standalone HTML5 build for game portals, which pay a revenue
// share on their own traffic (a second income stream on top of our website):
//   crazygames        CrazyGames SDK v3 (ads + gameplay events)
//   poki              Poki SDK v2
//   gamedistribution  GameDistribution SDK (reaches 1000s of partner sites); needs a game id per game
//   generic           no SDK: itch.io, Newgrounds, Game Jolt, your own CDN
//
// Output: dist/portals/<portal>/<slug>/ (index.html + engine + game + font) and a .zip of each.
// Usage: node scripts/export-portal.mjs [--portal crazygames|poki|gamedistribution|generic|all] [slug ...]
//        GameDistribution ids: GD_GAME_IDS='{"stack-tower":"<id>"}' node scripts/export-portal.mjs --portal gamedistribution
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
const gdIds = JSON.parse(process.env.GD_GAME_IDS || '{}');
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
  const platformOpts = portal === 'gamedistribution' ? JSON.stringify({ gameId: gdIds[meta.slug] || '' }) : '{}';
  const platformName = portal === 'generic' ? 'none' : portal;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${meta.title}</title>
<meta name="description" content="${meta.description.replace(/"/g, '&quot;')}">
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
  meta,
  platform: createPlatform('${platformName}', ${platformOpts}),
  mode: q.get('mode') === 'daily' ? 'daily' : 'classic',
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
    summary.push(`${portal.padEnd(17)} ${slug.padEnd(15)} ${(size / 1024).toFixed(0).padStart(5)} KB${portal === 'gamedistribution' && !gdIds[slug] ? '  (set GD_GAME_IDS before uploading)' : ''}`);
  }
}
console.log(summary.join('\n'));
console.log(`\nWrote ${summary.length} builds to dist/portals/${hasZip ? ' (+ .zip per build)' : ''}`);
