#!/usr/bin/env node
// GameDistribution thumbnails for every game, in the sizes GD asks for:
//   required: 512x512, 512x384, 200x120 (art only: GD advises no title on these, and no
//             small details or logo on 200x120, so it is cropped in on the center)
//   optional: 1280x720, 1280x550 (promo banners with the GD title, og-card style)
// Source: each game's cover() art, the same art behind public/covers and public/og, rendered
// natively at every size (GD declines stretched, blurry or upscaled thumbnails, and cropping the
// 1200x630 og card would need upscaling for the 1280s). Titles come from
// scripts/portals/gamedistribution-listing.mjs.
//
// Output: dist/portals/gamedistribution-assets/<slug>/<slug>-<w>x<h>.jpg (GD names its own
// copies <gameId>-<w>x<h>.jpg) plus _preview.jpg, a contact sheet of everything.
// Usage: node scripts/portal-assets.mjs [slug ...]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = path.join(root, 'src/games');
const all = fs.readdirSync(gamesDir).filter((d) => d !== 'engine' && fs.existsSync(path.join(gamesDir, d, 'index.js')));
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : all;
const outRoot = path.join(root, 'dist/portals/gamedistribution-assets');
const { LISTING } = await import(pathToFileURL(path.join(root, 'scripts/portals/gamedistribution-listing.mjs')).href);

const GD_SIZES = [
  { w: 512, h: 512, required: true },
  { w: 512, h: 384, required: true },
  { w: 200, h: 120, required: true, zoom: 1.22 },
  { w: 1280, h: 720, banner: true, zoom: 0.86, shift: 0.12 },
  { w: 1280, h: 550, banner: true, zoom: 0.94, shift: 0.13 },
];

// Per-game tweaks where the default crop would cut off a character.
const ZOOM_OVERRIDES = { 'reflex-duel': { '200x120': 1.04 } };

const port = 5700 + Math.floor(Math.random() * 200);
const server = spawn(process.execPath, [path.join(root, 'scripts/serve-static.mjs'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 500));
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const written = [];
for (const slug of slugs) {
  const { default: meta } = await import(pathToFileURL(path.join(gamesDir, slug, 'meta.js')).href);
  const title = LISTING[slug]?.title || meta.title;
  const dir = path.join(outRoot, slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const s of GD_SIZES) {
    const qs = new URLSearchParams({ game: slug, w: s.w, h: s.h });
    const zoom = ZOOM_OVERRIDES[slug]?.[`${s.w}x${s.h}`] ?? s.zoom;
    if (zoom) qs.set('zoom', zoom);
    if (s.shift) qs.set('shift', s.shift);
    if (s.banner) {
      qs.set('title', title);
      if (meta.tagline) qs.set('tagline', meta.tagline);
    }
    await page.goto(`http://localhost:${port}/harness/portal-art.html?${qs}`);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 15000 });
    const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.9));
    const file = path.join(dir, `${slug}-${s.w}x${s.h}.jpg`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    written.push(file);
  }
  console.log(`${slug.padEnd(15)} ${GD_SIZES.map((s) => `${s.w}x${s.h}`).join(' ')}`);
}

// Contact sheet for a quick visual check of every thumbnail.
if (slugs.length > 1) {
  const items = slugs.map((slug) => ({ slug, files: GD_SIZES.map((s) => `${slug}/${slug}-${s.w}x${s.h}.jpg`) }));
  // Same origin as the images, so the canvas can be exported.
  await page.goto(`http://localhost:${port}/__sheet`);
  await page.setContent('<canvas id="c"></canvas>');
  await page.evaluate(
    async ({ items, sizes, port }) => {
      const scale = 0.25;
      const rowH = Math.max(...sizes.map((s) => s.h)) * scale + 24;
      const rowW = sizes.reduce((a, s) => a + s.w * scale + 10, 160);
      const c = document.getElementById('c');
      c.width = rowW;
      c.height = rowH * items.length;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
      for (let r = 0; r < items.length; r++) {
        let x = 160;
        g.fillStyle = '#111';
        g.font = '600 15px system-ui';
        g.fillText(items[r].slug, 10, r * rowH + 30);
        for (let k = 0; k < sizes.length; k++) {
          const img = await load(`http://localhost:${port}/dist/portals/gamedistribution-assets/${items[r].files[k]}`);
          if (img) g.drawImage(img, x, r * rowH + 12, sizes[k].w * scale, sizes[k].h * scale);
          x += sizes[k].w * scale + 10;
        }
      }
    },
    { items, sizes: GD_SIZES, port },
  );
  const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.85));
  fs.writeFileSync(path.join(outRoot, '_preview.jpg'), Buffer.from(data.split(',')[1], 'base64'));
}

await browser.close();
server.kill();
if (errors.length) {
  console.error(`page errors:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nWrote ${written.length} images to ${path.relative(root, outRoot)}/`);
