#!/usr/bin/env node
// Launch trailer for social posts: public/social/launch-trailer.mp4 (720x1280, ~16 s, silent).
// Intro card, then fast cuts of games playing themselves (the recorded clips), then an end card.
//
//   FFMPEG=/path/to/ffmpeg node scripts/launch-trailer.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FF = process.env.FFMPEG || 'ffmpeg';
const W = 720;
const H = 1280;
const FPS = 30;
const CUTS = ['tank-tango', 'stack-tower', 'juicy-drop', 'snow-sumo', 'sky-flap', 'hole-party', 'blade-spin', 'shark-attack', 'block-crush', 'rooftop-rush', 'color-rush', 'paddle-brawl'];
const CUT_S = 1.0;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'trailer-'));
const OUT = path.join(ROOT, 'public', 'social', 'launch-trailer.mp4');

const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'public', 'fonts', f)).toString('base64')}`;
const titles = Object.fromEntries(
  await Promise.all(CUTS.map(async (s) => [s, (await import(path.join(ROOT, 'src', 'games', s, 'meta.js'))).default.title])),
);
const gameCount = fs.readdirSync(path.join(ROOT, 'src', 'games')).filter((d) => fs.existsSync(path.join(ROOT, 'src', 'games', d, 'meta.js'))).length;

function ff(args) {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

const CSS = `
@font-face{font-family:B;src:url(${font('BarlowCondensed-800.woff2')})}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent;font-family:B,sans-serif;color:#fff}
.card{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%,#3a1560 0%,#0a0a0c 70%);display:flex;flex-direction:column;justify-content:center;padding:0 64px}
.k{font-size:30px;letter-spacing:.3em;color:#ff3d8b}
.big{font-size:132px;line-height:.9;text-transform:uppercase;margin-top:18px}
.pink{color:#ff3d8b}
.sub{font-size:40px;opacity:.8;margin-top:26px;text-transform:uppercase}
.logo{position:absolute;left:64px;top:70px;font-size:44px;letter-spacing:.02em}
.bar{position:absolute;left:0;right:0;bottom:0;height:260px;background:linear-gradient(to top,rgba(0,0,0,.85),transparent)}
.label{position:absolute;left:44px;bottom:70px;font-size:82px;text-transform:uppercase;text-shadow:0 4px 18px rgba(0,0,0,.6)}
.tag{position:absolute;left:46px;bottom:168px;font-size:26px;letter-spacing:.25em;color:#ffd23f}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
async function shot(html, file) {
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: true });
}
await shot(
  `<div class="card"><div class="logo">RETRY<span class="pink">ARCADE</span></div><div class="k">AN EXPERIMENT</div><div class="big">${gameCount} games.<br>4 days.<br><span class="pink">Built by AI.</span></div><div class="sub">Every line of code</div></div>`,
  path.join(TMP, 'intro.png'),
);
await shot(
  `<div class="card"><div class="logo">RETRY<span class="pink">ARCADE</span></div><div class="big">Scroll less.<br><span class="pink">Play more.</span></div><div class="sub">Free · no download</div><div class="sub" style="font-size:64px;opacity:1;color:#ffd23f;margin-top:40px">retryarcade.com</div></div>`,
  path.join(TMP, 'outro.png'),
);
for (const s of CUTS) await shot(`<div class="bar"></div><div class="tag">MADE BY AI</div><div class="label">${titles[s]}</div>`, path.join(TMP, `label-${s}.png`));
await browser.close();

// Segments with identical encoding, then one concat.
const seg = (i) => path.join(TMP, `seg-${String(i).padStart(2, '0')}.mp4`);
const enc = ['-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '22', '-an'];
ff(['-loop', '1', '-t', '2.4', '-i', path.join(TMP, 'intro.png'), '-vf', `scale=${W}:${H},fade=t=in:st=0:d=0.25`, ...enc, seg(0)]);
CUTS.forEach((s, i) => {
  ff([
    '-ss', '1.2', '-t', String(CUT_S), '-i', path.join(ROOT, 'public', 'clips', `${s}.mp4`),
    '-i', path.join(TMP, `label-${s}.png`),
    '-filter_complex', `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fps=${FPS}[v];[v][1:v]overlay=0:0,format=yuv420p[o]`,
    '-map', '[o]', ...enc, seg(i + 1),
  ]);
});
ff(['-loop', '1', '-t', '2.8', '-i', path.join(TMP, 'outro.png'), '-vf', `scale=${W}:${H},fade=t=out:st=2.4:d=0.4`, ...enc, seg(CUTS.length + 1)]);
const list = path.join(TMP, 'list.txt');
fs.writeFileSync(list, Array.from({ length: CUTS.length + 2 }, (_, i) => `file '${seg(i)}'`).join('\n'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
ff(['-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', '-an', OUT]);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`wrote ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
