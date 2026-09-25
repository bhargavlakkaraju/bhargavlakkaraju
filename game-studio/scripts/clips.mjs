#!/usr/bin/env node
// Record short looping gameplay clips (animated covers) of each game playing itself.
//
//   node scripts/clips.mjs [slug ...] [--seconds 6] [--fps 30] [--size 432x768] [--port 5317]
//                          [--seed N] [--start S]   (override scripts/clips.config.json for this run)
//
// Needs ffmpeg with libx264 + libvpx-vp9 (FFMPEG=/path/to/ffmpeg, or on PATH; e.g.
// `pip install imageio-ffmpeg` ships one). Each game runs in demo mode on
// harness/record.html under Playwright's virtual clock, so frames are captured at an exact
// frame rate no matter how fast the machine is, and runs are reproducible (fixed seed).
//
// Output: public/clips/<slug>.mp4 (H.264, Safari/iOS), <slug>.webm (VP9, smaller),
// <slug>.webp (poster = first frame) and .clips/<slug>-sheet.jpg (review contact sheet).
// Per-game seed / start offset / fit ("cover" crop, or "pad" to letterbox wider games)
// live in scripts/clips.config.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const SECONDS = Number(flag('seconds', 6));
const FPS = Number(flag('fps', 30));
const [OW, OH] = flag('size', '432x768').split('x').map(Number);
const FADE = 0.5;
const FF = process.env.FFMPEG || 'ffmpeg';
const PORT = Number(flag('port', 5317));
const OUT = path.join(ROOT, 'public', 'clips');
const REVIEW = path.join(ROOT, '.clips');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'clips.config.json'), 'utf8'));

const slugs = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const all = fs.readdirSync(path.join(ROOT, 'src', 'games')).filter((d) => fs.existsSync(path.join(ROOT, 'src', 'games', d, 'meta.js')));
const todo = slugs.length ? slugs : all;

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REVIEW, { recursive: true });

function ff(argv) {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${argv.join(' ')}`);
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve-static.mjs'), '--port', String(PORT), '--root', ROOT], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
const report = [];

try {
  for (const slug of todo) {
    const { default: meta } = await import(path.join(ROOT, 'src', 'games', slug, 'meta.js'));
    const cfg = { seed: 7, start: 0, ...(CONFIG[slug] || {}) };
    if (flag('seed', null) != null) cfg.seed = Number(flag('seed'));
    if (flag('start', null) != null) cfg.start = Number(flag('start'));
    const ctx = await browser.newContext({ viewport: { width: meta.width, height: meta.height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-09-25T12:00:00Z') });
    // Freeze time: from here on it only moves when we call runFor(), so capture speed
    // cannot leak into the recording (clips play at true speed and are reproducible).
    await page.clock.pauseAt(new Date('2026-09-25T12:00:01Z'));
    await page.goto(`http://localhost:${PORT}/harness/record.html?game=${slug}&seed=${cfg.seed}`);
    for (let i = 0; i < 200; i++) {
      if (await page.evaluate(() => window.__rec && window.__rec.ready)) break;
      await page.clock.runFor(50);
      await new Promise((r) => setTimeout(r, 25));
    }
    if (cfg.start) await page.clock.runFor(cfg.start * 1000);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `clip-${slug}-`));
    const frames = Math.round((SECONDS + FADE) * FPS);
    for (let i = 0; i < frames; i++) {
      await page.clock.runFor(1000 / FPS);
      const b64 = await page.evaluate(() => document.querySelector('canvas.ra-canvas').toDataURL('image/jpeg', 0.92).split(',')[1]);
      fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
    }
    const info = await page.evaluate(() => ({ deaths: window.__rec.deaths, scores: window.__rec.scores, score: window.__rec.ctrl.score, errors: window.__raErrors }));
    await ctx.close();

    // Loop: the clip is frames [FADE, FADE+SECONDS]; its last FADE seconds cross-fade into
    // frames [0, FADE], which lead straight back into the first frame of the clip.
    const graph =
      `[0:v]format=yuv420p,split[a][b];[a]trim=start=${FADE},setpts=PTS-STARTPTS,fps=${FPS}[main];[b]trim=end=${FADE},setpts=PTS-STARTPTS,fps=${FPS}[head];` +
      `[main][head]xfade=transition=fade:duration=${FADE}:offset=${SECONDS - FADE}[x];` +
      (cfg.fit === 'pad'
        ? // Wider games: show the whole playfield, with thin bands in the game's own background color.
          `[x]scale=${OW}:${OH}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${OW}:${OH}:(ow-iw)/2:(oh-ih)/2:color=${(meta.bg || '#0a0a0c').replace('#', '0x')},format=yuv420p[v]`
        : `[x]scale=${OW}:${OH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${OW}:${OH},format=yuv420p[v]`);
    const input = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-filter_complex', graph, '-map', '[v]', '-an', '-r', String(FPS)];
    const mp4 = path.join(OUT, `${slug}.mp4`);
    const webm = path.join(OUT, `${slug}.webm`);
    ff([...input, '-c:v', 'libx264', '-profile:v', 'high', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', mp4]);
    ff([...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webm]);
    ff(['-i', mp4, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', path.join(OUT, `${slug}.webp`)]);
    ff(['-i', mp4, '-vf', `fps=2,scale=${Math.round(OW / 2)}:-1,tile=6x2`, '-frames:v', '1', '-q:v', '4', path.join(REVIEW, `${slug}-sheet.jpg`)]);
    fs.rmSync(dir, { recursive: true, force: true });

    const kb = (f) => Math.round(fs.statSync(f).size / 1024);
    const row = { slug, mp4KB: kb(mp4), webmKB: kb(webm), deaths: info.deaths, score: info.score, errors: info.errors.length };
    report.push(row);
    console.log(JSON.stringify(row), info.errors.length ? info.errors.slice(0, 3) : '');
  }
} finally {
  await browser.close();
  server.kill();
}
