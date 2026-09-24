#!/usr/bin/env node
// Renders every game's cover() into static images used by the site:
//   public/covers/<slug>.webp|.jpg  800x600 card thumbnails (webp on site, jpg for OG/portals)
//   public/og/<slug>.jpg      1200x630 social cards (title + tagline)
//   public/og/site.jpg        1200x630 site social card
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

// Formats: .webp for on-site thumbnails (small), .jpg for social cards / OG composition
// (universally supported by link-preview bots), .png for icons.
async function render(query, ...outs) {
  await page.goto(`http://localhost:${port}/harness/render.html?${query}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 15000 });
  for (const out of outs) {
    const ext = path.extname(out);
    const [type, q] = ext === '.webp' ? ['image/webp', 0.86] : ext === '.jpg' ? ['image/jpeg', 0.88] : ['image/png', undefined];
    const data = await page.evaluate(([t, qq]) => document.getElementById('c').toDataURL(t, qq), [type, q]);
    fs.writeFileSync(path.join(root, out), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', out, `${Math.round(fs.statSync(path.join(root, out)).size / 1024)} KB`);
  }
}

for (const slug of slugs) {
  await render(`kind=cover&game=${slug}&w=800&h=600`, `public/covers/${slug}.webp`, `public/covers/${slug}.jpg`);
  await render(`kind=og&game=${slug}`, `public/og/${slug}.jpg`);
}
const showcase = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush', 'merge-2048', 'road-hopper', 'sky-flap'].filter((s) => all.includes(s));
await render(`kind=site&games=${showcase.slice(0, 6).join(',')}&count=${all.length}`, 'public/og/site.jpg');
await render('kind=icon&size=512', 'public/icons/icon-512.png');
await render('kind=icon&size=192', 'public/icons/icon-192.png');
await render('kind=icon&size=180', 'src/app/apple-icon.png');
await render('kind=icon&size=64', 'src/app/icon.png');

await browser.close();
server.kill();
