#!/usr/bin/env node
// Renders marketing/brand/logo-concepts/*.svg into PNG previews (dark and light) plus one
// contact sheet: marketing/brand/logo-concepts/preview-<name>.png and sheet.png.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DIR = path.join(ROOT, 'marketing', 'brand', 'logo-concepts');
const names = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg') && !f.endsWith('-light.svg')).map((f) => f.slice(0, -4));
const light = (n) => (fs.existsSync(path.join(DIR, `${n}-light.svg`)) ? `${n}-light` : n);
const uri = (n) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(DIR, `${n}.svg`)).toString('base64')}`;
const LABEL = { stacked: '1 · Stacked', block: '2 · Block', neon: '3 · Neon', pixel: '4 · Pixel tiles' };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
for (const n of names) {
  await page.setContent(`<html><body style="margin:0;display:grid;grid-template-columns:1fr 1fr;height:100vh">
    <div style="background:#0a0a0c;display:grid;place-items:center"><img src="${uri(n)}" style="width:88%"></div>
    <div style="background:#f5f2ff;display:grid;place-items:center"><img src="${uri(light(n))}" style="width:88%"></div></body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(DIR, `preview-${n}.png`) });
}
const order = ['stacked', 'block', 'neon', 'pixel'].filter((n) => names.includes(n));
await page.setViewportSize({ width: 1600, height: 1400 });
await page.setContent(`<html><body style="margin:0;background:#0a0a0c;font-family:sans-serif;display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px">
  ${order.map((n) => `<div style="background:#15151b;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:16px">
    <div style="color:#fff;font-weight:800;font-size:28px">${LABEL[n] || n}</div>
    <div style="display:grid;place-items:center;height:260px"><img src="${uri(n)}" style="max-width:100%;max-height:260px"></div>
    <div style="background:#f5f2ff;border-radius:14px;display:grid;place-items:center;height:260px"><img src="${uri(light(n))}" style="max-width:92%;max-height:240px"></div></div>`).join('')}
</body></html>`);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(DIR, 'sheet.png'), fullPage: true });
await browser.close();
console.log('previews written to', path.relative(ROOT, DIR));
