#!/usr/bin/env node
// Renders every game's cover() into static images used by the site:
//   public/covers/<slug>.png  800x600 card thumbnails
//   public/og/<slug>.png      1200x630 social cards (title + tagline)
//   public/og/site.png        1200x630 site social card
//   public/icons/*            PWA / favicon icons
// Usage: node scripts/thumbnails.mjs [slug ...]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = path.join(root, 'src/games');
const all = fs.readdirSync(gamesDir).filter((d) => d !== 'engine' && fs.existsSync(path.join(gamesDir, d, 'index.js')));
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : all;
const port = 5900 + Math.floor(Math.random() * 90);

for (const d of ['public/covers', 'public/og', 'public/icons']) fs.mkdirSync(path.join(root, d), { recursive: true });
const server = spawn(process.execPath, [path.join(root, 'scripts/serve-static.mjs'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 500));
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(query, out) {
  await page.goto(`http://localhost:${port}/harness/render.html?${query}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 15000 });
  const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(path.join(root, out), Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', out);
}

for (const slug of slugs) {
  await render(`kind=cover&game=${slug}&w=800&h=600`, `public/covers/${slug}.png`);
  await render(`kind=og&game=${slug}`, `public/og/${slug}.png`);
}
const showcase = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush', 'merge-2048', 'road-hopper', 'sky-flap'].filter((s) => all.includes(s));
await render(`kind=site&games=${showcase.slice(0, 6).join(',')}&count=${all.length}`, 'public/og/site.png');
await render('kind=icon&size=512', 'public/icons/icon-512.png');
await render('kind=icon&size=192', 'public/icons/icon-192.png');
await render('kind=icon&size=180', 'src/app/apple-icon.png');
await render('kind=icon&size=64', 'src/app/icon.png');

await browser.close();
server.kill();
