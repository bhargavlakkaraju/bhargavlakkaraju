#!/usr/bin/env node
// End-to-end check of the website against a running server (npm run build && npm start).
// Usage: BASE_URL=http://localhost:3000 STUDIO_TOKEN=... node scripts/e2e.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = path.join(root, '.smoke', 'e2e');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const failures = [];
const check = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failures.push(msg);
};

async function newPage(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|Failed to fetch RSC payload|adsbygoogle|googlesyndication/.test(m.text())) errors.push(m.text());
  });
  return { page, errors, ctx };
}

// 1. Home
{
  const { page, errors, ctx } = await newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto(BASE + '/');
  const cards = await page.locator('a[href^="/games/"]').count();
  check(cards >= 5, `home lists game links (${cards})`);
  await page.screenshot({ path: path.join(out, 'home-desktop.png'), fullPage: true });
  check(errors.length === 0, `home has no JS errors ${errors.join(' | ')}`);
  await ctx.close();
}

// 2. Game page: play Stack Tower until game over, post to leaderboard, replay
{
  const { page, errors, ctx } = await newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto(BASE + '/games/stack-tower');
  const canvas = page.locator('canvas.ra-canvas');
  await canvas.waitFor({ timeout: 10000 });
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // start
  let over = false;
  for (let i = 0; i < 80 && !over; i++) {
    await page.waitForTimeout(150 + Math.random() * 500);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    over = await page.getByRole('button', { name: /Play again/ }).isVisible();
  }
  await page.waitForTimeout(900);
  over = await page.getByRole('button', { name: /Play again/ }).isVisible();
  check(over, 'game over panel appears');
  await page.screenshot({ path: path.join(out, 'game-over-desktop.png') });
  const input = page.getByPlaceholder('Your name for the leaderboard');
  if (await input.isVisible().catch(() => false)) {
    await input.fill('E2E Tester');
    await page.getByRole('button', { name: 'Post' }).click();
    await page.waitForTimeout(1200);
    check(await page.getByText(/You are #\d+/).isVisible(), 'leaderboard rank shown after posting');
  } else {
    check(false, 'leaderboard name input visible (score was 0?)');
  }
  const cont = page.getByRole('button', { name: /Continue/ });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await page.waitForTimeout(500);
    check(!(await page.getByRole('button', { name: /Play again/ }).isVisible()), 'continue (revive) closes the panel');
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'game-page-desktop.png'), fullPage: true });
  check(errors.length === 0, `game page has no JS errors ${errors.join(' | ')}`);
  await ctx.close();
}

// 3. Mobile game page + challenge link
{
  const { page, errors, ctx } = await newPage({ ...devices['iPhone 13'] });
  await page.goto(BASE + '/c/stack-tower/7/Bhargav');
  check(await page.getByText(/Bhargav scored/).first().isVisible(), 'challenge banner visible');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  check(/api\/og\?slug=stack-tower/.test(og || ''), 'challenge page has dynamic OG image');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, 'challenge-mobile.png') });
  await page.goto(BASE + '/');
  await page.screenshot({ path: path.join(out, 'home-mobile.png') });
  check(errors.length === 0, `mobile pages have no JS errors ${errors.join(' | ')}`);
  await ctx.close();
}

// 4. Other pages render
{
  const { page, errors, ctx } = await newPage({ viewport: { width: 1280, height: 900 } });
  for (const p of ['/daily', '/leaderboards', '/profile', '/category/arcade', '/about', '/privacy', '/terms', '/developers', '/embed/stack-tower']) {
    const r = await page.goto(BASE + p);
    check(r.status() === 200, `${p} -> ${r.status()}`);
  }
  await page.goto(BASE + '/leaderboards');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'leaderboards.png') });
  await page.goto(BASE + '/profile');
  await page.screenshot({ path: path.join(out, 'profile.png'), fullPage: true });
  check(errors.length === 0, `other pages have no JS errors ${errors.join(' | ')}`);
  await ctx.close();
}

// 4b. Every game page mounts its game without errors (and tap/keys don't crash it)
{
  const { page, errors, ctx } = await newPage({ viewport: { width: 1280, height: 900 } });
  const r = await fetch(BASE + '/sitemap.xml');
  const slugs = [...(await r.text()).matchAll(/\/games\/([a-z0-9-]+)</g)].map((m) => m[1]);
  check(slugs.length >= 15, `sitemap lists ${slugs.length} games`);
  for (const slug of slugs) {
    const before = errors.length;
    await page.goto(`${BASE}/games/${slug}`);
    const canvas = page.locator('canvas.ra-canvas');
    const ok = await canvas.waitFor({ timeout: 10000 }).then(() => true, () => false);
    if (ok) {
      const box = await canvas.boundingBox();
      for (let i = 0; i < 6; i++) {
        await page.mouse.click(box.x + box.width * (0.3 + Math.random() * 0.4), box.y + box.height * (0.4 + Math.random() * 0.4));
        await page.keyboard.press(['ArrowLeft', 'ArrowRight', ' ', 'a', 'Enter'][i % 5]);
        await page.waitForTimeout(120);
      }
    }
    check(ok && errors.length === before, `/games/${slug} plays ${errors.slice(before).join(' | ')}`);
  }
  await page.goto(`${BASE}/guides/how-to-win-2048`);
  check(await page.locator('canvas.ra-canvas').waitFor({ timeout: 10000 }).then(() => true, () => false), 'guide page embeds its game');
  await ctx.close();
}

// 5. APIs
{
  const r = await fetch(BASE + '/api/leaderboard?slug=stack-tower&board=today');
  const j = await r.json();
  check(r.ok && Array.isArray(j.entries), `leaderboard API (${j.entries?.length} entries)`);
  const bad = await fetch(BASE + '/api/leaderboard', { method: 'POST', body: JSON.stringify({ slug: 'stack-tower', score: 999999999, name: 'x y', vid: 'abcdefgh12' }) });
  check(bad.status === 422, 'leaderboard rejects impossible score');
  const og = await fetch(BASE + '/api/og?slug=stack-tower&score=12&name=Test');
  check(og.ok && og.headers.get('content-type') === 'image/png', 'OG image renders');
  if (process.env.STUDIO_TOKEN) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = await fetch(BASE + '/api/stats?days=7', { headers: { authorization: `Bearer ${process.env.STUDIO_TOKEN}` } });
    const sj = await s.json();
    check(s.ok && sj.totals.runs > 0, `stats API sees runs (${sj.totals?.runs})`);
    const unauth = await fetch(BASE + '/api/stats');
    check(unauth.status === 401, 'stats API requires token');
  }
}

await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall e2e checks passed');
process.exit(failures.length ? 1 : 0);
