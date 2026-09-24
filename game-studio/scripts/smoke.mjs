#!/usr/bin/env node
// Headless smoke test for every game (or the slugs passed as args).
// For each game: loads the harness, mashes random input for a few seconds, checks for
// JS errors, a non-blank canvas, the start/gameover/restart lifecycle, daily mode and
// the cover renderer. Screenshots land in .smoke/.
//
// Usage: node scripts/smoke.mjs [slug ...] [--seconds 6] [--port 5199]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const seconds = Number(opt('seconds', 6));
const port = Number(opt('port', 5100 + Math.floor(Math.random() * 800)));
const gamesDir = path.join(root, 'src/games');
const slugs = argv.length
  ? argv
  : fs.readdirSync(gamesDir).filter((d) => d !== 'engine' && fs.existsSync(path.join(gamesDir, d, 'index.js')));

const outDir = path.join(root, '.smoke');
fs.mkdirSync(outDir, { recursive: true });

const server = spawn(process.execPath, [path.join(root, 'scripts/serve-static.mjs'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 500));

const browser = await chromium.launch();
const results = [];
let failed = false;

async function canvasStats(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { colors: 0 };
    const g = c.getContext('2d');
    const { width, height } = c;
    const data = g.getImageData(0, 0, width, height).data;
    const seen = new Set();
    for (let i = 0; i < data.length; i += 4 * 97) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return { colors: seen.size, width, height };
  });
}

for (const slug of slugs) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 480, height: 820 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  const res = { slug, errors, lifecycle: {} };
  try {
    await page.goto(`http://localhost:${port}/harness/?game=${slug}`);
    await page.waitForFunction(() => window.__ra && window.__ra.controller, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    await page.screenshot({ path: path.join(outDir, `${slug}-ready.png`) });

    // start + random play
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const end = Date.now() + seconds * 1000;
    const keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'a', 'e', 'r', 's', 't'];
    let midShot = false;
    while (Date.now() < end) {
      const r = Math.random();
      const x = box.x + Math.random() * box.width;
      const y = box.y + Math.random() * box.height;
      if (r < 0.5) await page.mouse.click(x, y);
      else if (r < 0.7) {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(box.x + Math.random() * box.width, box.y + Math.random() * box.height, { steps: 5 });
        await page.mouse.up();
      } else await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]);
      await page.waitForTimeout(60 + Math.random() * 180);
      if (!midShot && Date.now() > end - (seconds * 1000) / 2) {
        midShot = true;
        await page.screenshot({ path: path.join(outDir, `${slug}-play.png`) });
      }
      // if the game-over panel is up, replay to exercise restart
      const over = await page.$('.ra-over.show .ra-btn:not(.alt)');
      if (over && Math.random() < 0.5) {
        await page.screenshot({ path: path.join(outDir, `${slug}-over.png`) });
        await over.click();
      }
    }
    const stats = await canvasStats(page);
    const events = await page.evaluate(() => window.__ra.events.map((e) => e.name));
    res.lifecycle = {
      ready: events.includes('ready'),
      start: events.includes('start'),
      gameover: events.includes('gameover'),
      restart: events.includes('restart'),
    };
    res.canvasColors = stats.colors;
    if (stats.colors < 3) errors.push('canvas looks blank');
    if (!res.lifecycle.start) errors.push('no start event');

    // daily mode loads
    await page.goto(`http://localhost:${port}/harness/?game=${slug}&mode=daily`);
    await page.waitForFunction(() => window.__ra && window.__ra.controller, null, { timeout: 8000 });
    await page.waitForTimeout(300);

    // cover renderer
    await page.goto(`http://localhost:${port}/harness/?game=${slug}&cover=1&w=800&h=600`);
    await page.waitForFunction(() => window.__raCoverDone === true, null, { timeout: 8000 });
    const png = await page.evaluate(() => document.getElementById('coverCanvas').toDataURL('image/png'));
    fs.writeFileSync(path.join(outDir, `${slug}-cover.png`), Buffer.from(png.split(',')[1], 'base64'));
  } catch (e) {
    errors.push(`exception: ${e.message.split('\n')[0]}`);
  }
  await page.close();
  if (errors.length) failed = true;
  results.push(res);
  const lc = Object.entries(res.lifecycle)
    .map(([k, v]) => `${k}:${v ? 'y' : 'n'}`)
    .join(' ');
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${slug.padEnd(16)} ${lc} colors:${res.canvasColors ?? '-'}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
}

await browser.close();
server.kill();
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
