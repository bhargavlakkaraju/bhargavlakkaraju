#!/usr/bin/env node
// Headless QA for the GameDistribution builds in dist/portals/gamedistribution/ (run
// npm run gd:build first). Each build is served the way GD serves it, at /<32-hex id>/, with
// the GD SDK replaced by a fake that fires SDK_READY / SDK_GAME_PAUSE / SDK_GAME_START /
// SDK_REWARDED_WATCH_COMPLETE, and every other outside request blocked and reported.
//
// Checks per game: boots with no console errors; the game id is read from the URL; start
// screen -> Play -> preroll (game silent during it) -> game mounts; gameplay runs; a GD pause
// in the middle of a run pauses + mutes and then waits for a tap; rewarded continue (when the
// game offers one) pauses + mutes and revives; Play again requests an ad every time and still
// restarts when the SDK refuses one; no host other than the GD SDK is requested.
// Extra scenarios on the first game: SDK blocked, SDK that never answers, phone turned sideways.
//
// Usage: node scripts/gd-verify.mjs [slug ...] [--all]   (default: one game per kind)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, devices } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'dist/portals/gamedistribution');
const outDir = path.join(root, '.smoke/gd');
fs.mkdirSync(outDir, { recursive: true });
const GD_SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';

let argv = process.argv.slice(2);
const all = argv.includes('--all');
argv = argv.filter((a) => a !== '--all');
const built = fs.existsSync(buildDir) ? fs.readdirSync(buildDir).filter((d) => fs.existsSync(path.join(buildDir, d, 'index.html'))) : [];
if (!built.length) {
  console.error('No GD builds found. Run: npm run gd:build');
  process.exit(1);
}
const DEFAULT = ['stack-tower', 'block-crush', 'wordy', 'hole-party', 'sudoku', 'solitaire'];
const slugs = argv.length ? argv : all ? built : DEFAULT.filter((s) => built.includes(s));
const fakeId = (slug) => crypto.createHash('md5').update(`retry-arcade:${slug}`).digest('hex');
const idToSlug = new Map(built.map((s) => [fakeId(s), s]));

// ---------- static server: /<id>/... -> dist/portals/gamedistribution/<slug>/... ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/').filter(Boolean);
  const slug = idToSlug.get(parts[0]);
  if (!slug || parts.includes('..')) return res.writeHead(404).end('not found');
  let file = path.join(buildDir, slug, ...parts.slice(1));
  if (!parts[1]) file = path.join(buildDir, slug, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('not found');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// ---------- fake GD SDK ----------
// window.__gdFake (set by the test) tunes it: { adMs, throttleMs, noRewarded, hang }.
const FAKE_SDK = `(() => {
  const opts = window.GD_OPTIONS || {};
  const fire = (name) => { try { opts.onEvent && opts.onEvent({ name, message: 'fake' }); } catch (e) { console.error('onEvent threw', e); } };
  const log = (window.__gdLog = window.__gdLog || []);
  const cfg = () => window.__gdFake || {};
  const snapshot = (label) => {
    const ra = window.__ra || {};
    log.push({ snap: label, paused: ra.controller ? ra.controller.paused : null, suspended: ra.sfx ? ra.sfx.isSuspended() : null, state: ra.controller ? ra.controller.state : null });
  };
  let lastAd = 0;
  window.gdsdk = {
    showAd(type) {
      const kind = type || 'interstitial';
      log.push({ call: 'showAd', type: kind });
      if (cfg().hang) return new Promise(() => {});
      return new Promise((resolve, reject) => {
        if (kind !== 'rewarded' && cfg().throttleMs && Date.now() - lastAd < cfg().throttleMs) {
          log.push({ refused: kind });
          return reject(new Error('The advertisement was requested too soon.'));
        }
        lastAd = Date.now();
        setTimeout(() => {
          fire('SDK_GAME_PAUSE');
          setTimeout(() => snapshot('mid-' + kind), 300);
          setTimeout(() => {
            if (kind === 'rewarded') fire('SDK_REWARDED_WATCH_COMPLETE');
            fire('SDK_GAME_START');
            resolve();
          }, cfg().adMs || 900);
        }, 120);
      });
    },
    preloadAd(type) {
      log.push({ call: 'preloadAd', type });
      return cfg().noRewarded ? Promise.reject(new Error('no fill')) : Promise.resolve('gdsdk://preloaded');
    },
    openConsole() {},
  };
  if (!cfg().hang) setTimeout(() => fire('SDK_READY'), 80);
})();`;

const browser = await chromium.launch();

async function openGame(slug, { sdk = 'fake', fake = {}, context = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 820 }, ...context });
  await ctx.addInitScript((f) => {
    window.__gdFake = f;
  }, fake);
  const page = await ctx.newPage();
  const errors = [];
  const outside = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // The blocked-SDK scenario aborts the script on purpose.
    if (sdk === 'blocked' && /Failed to load resource/.test(m.text())) return;
    errors.push(`console: ${m.text()}`);
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    if (url === GD_SDK_URL) {
      if (sdk === 'blocked') return route.abort('blockedbyclient');
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SDK });
    }
    outside.push(url);
    return route.abort('blockedbyclient');
  });
  const id = fakeId(slug);
  await page.goto(`${base}/${id}/`);
  return { ctx, page, errors, outside, id };
}

const log = (page) => page.evaluate(() => window.__gdLog || []);
const events = (page) => page.evaluate(() => (window.__ra ? window.__ra.events.map((e) => e.name) : []));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function canvasColors(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return seen.size;
  });
}

async function mash(page, ms) {
  const box = await page.locator('canvas').first().boundingBox();
  const keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Enter', 'a', 'e', 's'];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const x = box.x + 30 + Math.random() * (box.width - 60);
    const y = box.y + 120 + Math.random() * (box.height - 240);
    const r = Math.random();
    if (r < 0.55) await page.mouse.click(x, y);
    else if (r < 0.75) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(box.x + Math.random() * box.width, box.y + Math.random() * box.height, { steps: 4 });
      await page.mouse.up();
    } else await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]);
    await sleep(70 + Math.random() * 120);
    if (await page.$('.ra-over.show')) break;
  }
}

async function forceGameOver(page) {
  // A run has to be in progress for gameOver(); tap-to-start games need a tap first.
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => window.__ra.controller.state);
    if (st === 'playing') break;
    if (await page.$('.ra-over.show')) return true;
    const box = await page.locator('canvas').first().boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(150);
  }
  await page.evaluate(() => window.__ra.controller.api.gameOver({ delay: 50 }));
  await page.waitForSelector('.ra-over.show', { timeout: 5000 });
  return true;
}

const results = [];
function check(res, cond, msg) {
  if (!cond) res.fail.push(msg);
  else res.ok.push(msg);
}

for (const slug of slugs) {
  const { default: meta } = await import(pathToFileURL(path.join(root, 'src/games', slug, 'meta.js')).href);
  const res = { slug, ok: [], fail: [] };
  const { ctx, page, errors, outside, id } = await openGame(slug);
  try {
    await page.waitForSelector('.ra-splash .ra-play', { timeout: 8000 });
    await page.screenshot({ path: path.join(outDir, `${slug}-1-start.png`) });
    const gameId = await page.evaluate(() => window.GD_OPTIONS && window.GD_OPTIONS.gameId);
    check(res, gameId === id, `game id read from URL (${gameId === id ? 'ok' : gameId})`);
    const zipName = path.join(buildDir, `${slug}.zip`);
    check(res, fs.existsSync(zipName), 'zip exists');

    // Play -> preroll -> game mounts
    await page.click('.ra-splash .ra-play');
    await page.waitForFunction(() => window.__ra && window.__ra.controller, null, { timeout: 15000 });
    let L = await log(page);
    check(res, L.filter((e) => e.call === 'showAd').length === 1, 'preroll requested on Play');
    const pre = L.find((e) => e.snap === 'mid-interstitial');
    check(res, pre && pre.suspended === true, 'audio silenced during preroll');
    check(res, !(await page.$('.ra-splash')), 'start screen gone after preroll');

    // gameplay
    await sleep(300);
    const box = await page.locator('canvas').first().boundingBox();
    if (meta.startMode !== 'immediate') await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(200);
    const midState = await page.evaluate(() => window.__ra.controller.state);
    if (midState === 'playing') {
      // A GD pause in the middle of a run: paused + muted, then waits for a tap.
      await page.evaluate(() => window.GD_OPTIONS.onEvent({ name: 'SDK_GAME_PAUSE' }));
      const a = await page.evaluate(() => ({ p: window.__ra.controller.paused, s: window.__ra.sfx.isSuspended() }));
      check(res, a.p && a.s, 'SDK_GAME_PAUSE pauses and mutes');
      await page.evaluate(() => window.GD_OPTIONS.onEvent({ name: 'SDK_GAME_START' }));
      const b = await page.evaluate(() => ({ p: window.__ra.controller.paused, s: window.__ra.sfx.isSuspended() }));
      check(res, b.p && !b.s, 'after SDK_GAME_START: sound back, run waits for a tap');
      await page.screenshot({ path: path.join(outDir, `${slug}-2-paused.png`) });
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      check(res, !(await page.evaluate(() => window.__ra.controller.paused)), 'tap resumes the run');
    } else {
      check(res, true, `GD mid-run pause skipped (state ${midState})`);
    }
    await mash(page, 2500);
    const colors = await canvasColors(page);
    check(res, colors >= 3, `canvas renders (${colors} colors)`);
    check(res, (await events(page)).includes('start'), 'run started');
    await page.screenshot({ path: path.join(outDir, `${slug}-3-play.png`) });

    // game over -> rewarded continue (if offered)
    if (!(await page.$('.ra-over.show'))) await forceGameOver(page);
    const canRevive = await page.evaluate(() => {
      const e = window.__ra.events.filter((x) => x.name === 'gameover').pop();
      return !!(e && e.data.canRevive);
    });
    if (canRevive) {
      await page.waitForSelector('.ra-over.show .ra-btn.alt', { timeout: 6000 });
      await page.screenshot({ path: path.join(outDir, `${slug}-4-over.png`) });
      L = await log(page);
      check(res, L.some((e) => e.call === 'preloadAd' && e.type === 'rewarded'), 'rewarded ad preloaded before offering');
      const before = (await events(page)).filter((e) => e === 'revive').length;
      await page.click('.ra-over.show .ra-btn.alt');
      await page.waitForFunction((n) => window.__ra.events.filter((e) => e.name === 'revive').length > n, before, { timeout: 8000 });
      L = await log(page);
      const mid = L.find((e) => e.snap === 'mid-rewarded');
      check(res, mid && mid.paused && mid.suspended, 'game paused and muted during rewarded ad');
      check(res, true, 'rewarded continue revives the run');
      await sleep(200);
      await forceGameOver(page);
    } else {
      check(res, true, 'no continue offered (game has none, or already used)');
    }

    // Play again -> interstitial every time, restart even when the SDK refuses
    const showAdsBefore = (await log(page)).filter((e) => e.call === 'showAd').length;
    const restartsBefore = (await events(page)).filter((e) => e === 'restart').length;
    await page.click('.ra-over.show .ra-btn:not(.alt)');
    await page.waitForFunction((n) => window.__ra.events.filter((e) => e.name === 'restart').length > n, restartsBefore, { timeout: 8000 });
    L = await log(page);
    check(res, L.filter((e) => e.call === 'showAd').length === showAdsBefore + 1, 'Play again requests a midroll');
    const midroll = L.filter((e) => e.snap === 'mid-interstitial').pop();
    check(res, midroll && midroll.paused && midroll.suspended, 'game paused and muted during midroll');
    // second Play again with the SDK refusing (too soon): restart must still happen quickly
    await page.evaluate(() => (window.__gdFake.throttleMs = 60000));
    await sleep(200);
    await forceGameOver(page);
    const t0 = Date.now();
    const r2 = (await events(page)).filter((e) => e === 'restart').length;
    await page.click('.ra-over.show .ra-btn:not(.alt)');
    await page.waitForFunction((n) => window.__ra.events.filter((e) => e.name === 'restart').length > n, r2, { timeout: 8000 });
    L = await log(page);
    check(res, L.some((e) => e.refused), 'SDK refusal (too soon) handled');
    check(res, Date.now() - t0 < 2000, `restart without ad is quick (${Date.now() - t0} ms)`);
    check(res, !!(await page.$('.ra-mute')), 'sound toggle present');
  } catch (e) {
    res.fail.push(`exception: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: path.join(outDir, `${slug}-error.png`) }).catch(() => {});
  }
  check(res, errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  check(res, outside.length === 0, `no outside requests except the GD SDK${outside.length ? ': ' + [...new Set(outside.map((u) => new URL(u).host))].join(', ') : ''}`);
  await ctx.close();
  results.push(res);
  console.log(`${res.fail.length ? 'FAIL' : 'ok  '} ${slug.padEnd(15)} ${res.ok.length} checks passed${res.fail.length ? '\n     ' + res.fail.join('\n     ') : ''}`);
}

// ---------- extra scenarios on the first game ----------
const first = slugs[0];
async function scenario(name, fn) {
  const res = { slug: `${first} [${name}]`, ok: [], fail: [] };
  try {
    await fn(res);
  } catch (e) {
    res.fail.push(`exception: ${e.message.split('\n')[0]}`);
  }
  results.push(res);
  console.log(`${res.fail.length ? 'FAIL' : 'ok  '} ${res.slug.padEnd(30)} ${res.ok.length} checks passed${res.fail.length ? '\n     ' + res.fail.join('\n     ') : ''}`);
}

await scenario('SDK blocked', async (res) => {
  const { ctx, page, errors, outside } = await openGame(first, { sdk: 'blocked' });
  await page.waitForSelector('.ra-splash .ra-play', { timeout: 8000 });
  const t0 = Date.now();
  await page.click('.ra-splash .ra-play');
  await page.waitForFunction(() => window.__ra && window.__ra.controller, null, { timeout: 8000 });
  check(res, Date.now() - t0 < 3000, `game starts without the SDK (${Date.now() - t0} ms)`);
  await mash(page, 1200);
  if (!(await page.$('.ra-over.show'))) await forceGameOver(page);
  await sleep(500);
  check(res, !(await page.$('.ra-over.show .ra-btn.alt')), 'no rewarded continue without the SDK');
  const r = (await events(page)).filter((e) => e === 'restart').length;
  await page.click('.ra-over.show .ra-btn:not(.alt)');
  await page.waitForFunction((n) => window.__ra.events.filter((e) => e.name === 'restart').length > n, r, { timeout: 4000 });
  check(res, true, 'Play again works without the SDK');
  check(res, errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  check(res, outside.length === 0, 'no outside requests');
  await ctx.close();
});

await scenario('SDK never answers', async (res) => {
  const { ctx, page, errors } = await openGame(first, { fake: { hang: true } });
  await page.waitForSelector('.ra-splash .ra-play', { timeout: 8000 });
  const t0 = Date.now();
  await page.click('.ra-splash .ra-play');
  await page.waitForFunction(() => window.__ra && window.__ra.controller, null, { timeout: 20000 });
  const ms = Date.now() - t0;
  check(res, ms < 13000, `game starts after the time limits (${ms} ms)`);
  check(res, errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
});

await scenario('phone turned sideways', async (res) => {
  const phone = devices['Pixel 5'];
  const { width: pw, height: ph } = phone.viewport;
  const { ctx, page } = await openGame(first, { context: { ...phone, screen: { width: pw, height: ph } } });
  await page.waitForSelector('.ra-splash .ra-play', { timeout: 8000 });
  check(res, !(await page.$('.ra-rotate.show')), 'no rotate hint in portrait');
  await page.screenshot({ path: path.join(outDir, `${first}-phone-start.png`) });
  await page.click('.ra-splash .ra-play');
  await page.waitForFunction(() => window.__ra && window.__ra.controller, null, { timeout: 15000 });
  const box = await page.locator('canvas').first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(300);
  await page.screenshot({ path: path.join(outDir, `${first}-phone-play.png`) });
  // Turn the phone: Chromium device metrics with a landscape screen orientation.
  const cdp = await ctx.newCDPSession(page);
  const turn = (landscape) =>
    cdp.send('Emulation.setDeviceMetricsOverride', {
      width: landscape ? ph : pw,
      height: landscape ? pw : ph,
      deviceScaleFactor: phone.deviceScaleFactor,
      mobile: true,
      screenWidth: landscape ? ph : pw,
      screenHeight: landscape ? pw : ph,
      screenOrientation: landscape ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
    });
  await turn(true);
  await sleep(500);
  const a = await page.evaluate(() => ({ hint: !!document.querySelector('.ra-rotate.show'), paused: window.__ra.controller.paused }));
  check(res, a.hint, 'rotate hint shown when the phone is held sideways');
  check(res, a.paused, 'game paused while sideways');
  await page.screenshot({ path: path.join(outDir, `${first}-phone-sideways.png`) });
  await turn(false);
  await sleep(500);
  const b = await page.evaluate(() => ({ hint: !!document.querySelector('.ra-rotate.show'), st: window.__ra.controller.state, paused: window.__ra.controller.paused }));
  check(res, !b.hint, 'rotate hint gone when upright again');
  check(res, b.st !== 'playing' || b.paused, 'an interrupted run waits for a tap');
  await ctx.close();
});

await browser.close();
server.close();
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.fail.length);
console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots: .smoke/gd/`);
process.exit(failed.length ? 1 : 0);
