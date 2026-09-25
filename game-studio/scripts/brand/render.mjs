#!/usr/bin/env node
// Retry Arcade brand + social kit renderer.
//
//   node scripts/brand/render.mjs                    # render everything
//   node scripts/brand/render.mjs logos banners      # only some groups: logos banners posts stories carousel x contact
//   node scripts/brand/render.mjs --domain=retryarcade.vercel.app   # change the URL printed on posts/stories/carousel
//   node scripts/brand/render.mjs --fast             # use public/covers/*.jpg instead of re-rendering hi-res art
//
// Outputs: public/brand/* (site press kit) and public/social/* (files for posting).
// Game art is re-rendered at the exact pixel size needed from each game's cover() function through
// harness/render.html (file:// + --allow-file-access-from-files, no server needed), falling back to public/covers.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, TMP, fileUrl, loadGames, assertNoDash, DASH_RE } from './lib.mjs';
import { optimizePng } from './png.mjs';
import * as T from './templates.mjs';

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const a = argv.find((x) => x.startsWith(`--${name}`));
  if (!a) return def;
  return a.includes('=') ? a.split('=').slice(1).join('=') : true;
};
const groups = argv.filter((a) => !a.startsWith('--'));
const want = (g) => !groups.length || groups.includes(g);
const DOMAIN = flag('domain', 'retryarcade.com');
const FAST = flag('fast', false);

const BRAND = path.join(ROOT, 'public/brand');
const SOCIAL = path.join(ROOT, 'public/social');
for (const d of [BRAND, SOCIAL, path.join(SOCIAL, 'posts'), path.join(SOCIAL, 'stories'), path.join(TMP, 'art'), path.join(TMP, 'pages')]) fs.mkdirSync(d, { recursive: true });

const games = await loadGames();
const bySlug = Object.fromEntries(games.map((g) => [g.slug, g]));
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const written = [];

// ---------- hi-res game art ----------
const artPage = await browser.newPage();
const artCache = new Map();
async function art(slug, w, h) {
  w = Math.round(w);
  h = Math.round(h);
  const key = `${slug}-${w}x${h}`;
  if (artCache.has(key)) return artCache.get(key);
  let url = fileUrl(path.join(ROOT, 'public/covers', `${slug}.jpg`));
  if (!FAST) {
    try {
      await artPage.goto(fileUrl(path.join(ROOT, 'harness/render.html')) + `?kind=cover&game=${slug}&w=${w}&h=${h}`);
      await artPage.waitForFunction(() => window.__done === true, null, { timeout: 15000 });
      const data = await artPage.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.95));
      const out = path.join(TMP, 'art', `${key}.jpg`);
      fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
      url = fileUrl(out);
    } catch (e) {
      console.warn(`! hi-res art failed for ${slug} (${e.message.split('\n')[0]}), using public/covers`);
    }
  }
  artCache.set(key, url);
  return url;
}
const ctx = { games, bySlug, art, DOMAIN };

// ---------- screenshot ----------
async function shot(rel, spec) {
  const { W, H, html, transparent = false, element = null, quality = 88 } = spec;
  assertNoDash(html.replace(/<[^>]+>/g, ' '), rel);
  const name = rel.replace(/[\\/]/g, '__');
  const htmlFile = path.join(TMP, 'pages', `${name}.html`);
  fs.writeFileSync(htmlFile, html);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(fileUrl(htmlFile));
  const info = await page.evaluate(() => window.prepare());
  if (info.broken.length) throw new Error(`${rel}: broken images ${info.broken.join(', ')}`);
  if (info.fonts.length) throw new Error(`${rel}: fonts not loaded ${info.fonts.join(', ')}`);
  if (DASH_RE.test(info.text)) throw new Error(`${rel}: dash character in rendered text`);
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const type = out.endsWith('.png') ? 'png' : 'jpeg';
  const opts = { path: out, type, ...(type === 'jpeg' ? { quality } : { omitBackground: transparent }) };
  if (element) await page.locator(element).screenshot(opts);
  else await page.screenshot(opts);
  await page.close();
  if (type === 'png') fs.writeFileSync(out, optimizePng(fs.readFileSync(out)));
  const kb = Math.round(fs.statSync(out).size / 1024);
  written.push({ rel, kb });
  console.log(`wrote ${rel}  ${kb} KB`);
}

// ---------- jobs ----------
if (want('logos')) {
  await shot('public/brand/logo-mark-1024.png', T.logoMark(1024));
  await shot('public/brand/logo-mark-400.png', T.logoMark(400));
  await shot('public/brand/logo-wordmark.png', T.logoWordmark({ dark: false }));
  await shot('public/brand/logo-wordmark-dark.png', T.logoWordmark({ dark: true }));
  await shot('public/brand/avatar-1080.png', T.avatar(1080));
}
if (want('banners')) {
  await shot('public/brand/banner-x-1500x500.jpg', await T.bannerX(ctx));
  await shot('public/brand/banner-linkedin-1584x396.jpg', await T.bannerLinkedIn(ctx));
  await shot('public/brand/banner-linkedin-company-1128x191.jpg', await T.bannerLinkedInCompany(ctx));
  await shot('public/brand/banner-youtube-2560x1440.jpg', { ...(await T.bannerYouTube(ctx)), quality: 84 });
  await shot('public/brand/cover-facebook-1640x624.jpg', await T.coverFacebook(ctx));
  await shot('public/brand/banner-discord-960x540.jpg', await T.bannerDiscord(ctx));
}
if (want('posts')) {
  for (const g of games) await shot(`public/social/posts/${g.slug}-1080x1350.jpg`, await T.post(ctx, g));
}
if (want('stories')) {
  for (const s of T.STORIES) await shot(`public/social/stories/${s.slug}-1080x1920.jpg`, await T.story(ctx, bySlug[s.slug], s));
}
if (want('carousel')) {
  for (let i = 1; i <= 5; i++) await shot(`public/social/launch-carousel-${i}-1080x1350.jpg`, await T.carousel(ctx, i));
}
if (want('carousel') || want('pdf')) {
  // LinkedIn posts carousels as a document (PDF), one slide per page.
  const imgs = [1, 2, 3, 4, 5].map((i) => fileUrl(path.join(SOCIAL, `launch-carousel-${i}-1080x1350.jpg`)));
  const htmlFile = path.join(TMP, 'pages', 'carousel-pdf.html');
  fs.writeFileSync(htmlFile, `<!doctype html><html><head><style>@page{size:1080px 1350px;margin:0}html,body{margin:0}img{display:block;width:1080px;height:1350px;page-break-after:always}</style></head><body>${imgs.map((u) => `<img src="${u}">`).join('')}</body></html>`);
  const page = await browser.newPage();
  await page.goto(fileUrl(htmlFile));
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = r))))));
  const rel = 'public/social/launch-carousel-linkedin.pdf';
  await page.pdf({ path: path.join(ROOT, rel), width: '1080px', height: '1350px', printBackground: true, pageRanges: '1-5' });
  await page.close();
  const kb = Math.round(fs.statSync(path.join(ROOT, rel)).size / 1024);
  written.push({ rel, kb });
  console.log(`wrote ${rel}  ${kb} KB`);
}
if (want('x')) {
  await shot('public/social/x-launch-1200x675.jpg', await T.xLaunch(ctx));
}
if (want('contact')) {
  await shot('marketing/social/contact-sheet.jpg', { ...T.contactSheet(ctx), quality: 80 });
}

await browser.close();

const brandBytes = fs.readdirSync(BRAND).reduce((s, f) => s + fs.statSync(path.join(BRAND, f)).size, 0);
console.log(`\npublic/brand total: ${(brandBytes / 1024 / 1024).toFixed(2)} MB (budget ~2.5 MB)`);
if (brandBytes > 2.5 * 1024 * 1024) console.warn('! public/brand is over the 2.5 MB budget');
