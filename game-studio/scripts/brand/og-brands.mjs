#!/usr/bin/env node
// Renders public/og/brands.jpg, the share card for /brands: two made-up brands playing a
// branded Stack Tower (the engine's demo autopilot builds the towers), next to the headline.
// Usage: node scripts/brand/og-brands.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = 5199;
const tmp = path.join(root, '.smoke');
fs.mkdirSync(tmp, { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
@font-face{font-family:'Barlow Condensed';font-weight:800;src:url('/public/fonts/BarlowCondensed-800.woff2') format('woff2')}
@font-face{font-family:'Fredoka';font-weight:700;src:url('/public/fonts/Fredoka-700.woff2') format('woff2')}
@font-face{font-family:'Nunito';font-weight:800;src:url('/public/fonts/Nunito-800.woff2') format('woff2')}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#0a0a0c}
.card{position:relative;width:1200px;height:630px;overflow:hidden;background:radial-gradient(700px 420px at 85% 60%,rgba(255,61,127,.28),transparent 70%),radial-gradient(500px 360px at 0% 0%,rgba(139,92,246,.22),transparent 70%),#0a0a0c}
.logo{position:absolute;left:56px;top:40px;height:112px}
.chip{position:absolute;left:60px;top:176px;font:800 20px Nunito;letter-spacing:.22em;color:#ff3d7f}
h1{position:absolute;left:56px;top:208px;margin:0;font:800 78px/0.94 'Barlow Condensed';text-transform:uppercase;color:#fff;width:640px;white-space:nowrap}
h1 span{color:#ff3d7f;display:block}
.sub{position:absolute;left:60px;top:386px;font:800 26px Nunito;color:rgba(255,255,255,.78);width:560px}
.url{position:absolute;left:60px;bottom:44px;font:700 24px Fredoka;color:#ffd23f}
.phone{position:absolute;width:264px;height:465px;border-radius:30px;overflow:hidden;background:#000;box-shadow:0 26px 70px rgba(0,0,0,.6);border:3px solid rgba(255,255,255,.16)}
.phone .tag{position:absolute;left:50%;transform:translateX(-50%);bottom:14px;white-space:nowrap;z-index:2;padding:5px 11px;border-radius:999px;background:rgba(0,0,0,.45);font:800 15px Nunito;color:#fff;display:flex;gap:7px;align-items:center}
.phone .tag i{width:11px;height:11px;border-radius:50%;display:inline-block}
.p1{left:668px;top:96px;transform:rotate(-6deg)}
.p2{left:916px;top:70px;transform:rotate(5deg)}
.stage{position:absolute;inset:0}
</style></head><body><div class="card">
<img class="logo" src="/public/brand/logo-lockup.png">
<div class="chip">GAMES FOR BRANDS</div>
<h1>Get played, <span>not scrolled past.</span></h1>
<div class="sub">Branded games, contest games and playable ads, live in about a week.</div>
<div class="url">retryarcade.com/brands</div>
<div class="phone p1"><div class="stage" id="a"></div></div>
<div class="phone p2"><div class="stage" id="b"></div></div>
</div>
<script type="module">
import { mountGame } from '/src/games/engine/core.js';
import createGame from '/src/games/stack-tower/index.js';
import meta from '/src/games/stack-tower/meta.js';
await document.fonts.ready;
const brands = [
  ['a', { name: 'Sunny Soda', colors: ['#ff5a36', '#ffd23f', '#ff9f1c'] }, 11],
  ['b', { name: 'Nova Bank', colors: ['#3a6df0', '#22d3ee', '#a5b4fc'] }, 5],
];
for (const [id, brand, seed] of brands) mountGame(document.getElementById(id), createGame, meta, { demo: true, seed, brand, autoFocus: false });
window.__ready = true;
</script></body></html>`;
fs.writeFileSync(path.join(tmp, 'og-brands.html'), html);

const server = spawn(process.execPath, [path.join(root, 'scripts/serve-static.mjs'), '--port', String(port), '--root', root], { stdio: 'ignore' });
try {
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${port}/.smoke/og-brands.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ready);
  await page.waitForTimeout(Number(process.env.OG_WAIT || 16000));
  const out = path.join(root, 'public/og/brands.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Wrote ${path.relative(root, out)}`);
} finally {
  server.kill();
}
