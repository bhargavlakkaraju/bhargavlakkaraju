// Sky Flap - one-tap flyer. Flap a round little bird through gaps between neon pillars.
import { mulberry32 } from '../engine/rng.js';

const TAU = Math.PI * 2;
const GRAV = 1650;
const FLAP_V = -505;
const MAX_FALL = 780;
const BIRD_X = 122;
const BIRD_R = 17; // visual radius
const HIT_R = 12.5; // forgiving collision radius
const PW = 70; // pillar width
const LIP = 7; // cap overhang on each side
const LIP_H = 22;
const GROUND_H = 96;
const BASE_SPEED = 150;
const SPACING = 232; // px between pillars
const START_GAP = 192;
const MIN_GAP = 138;
const NEAR = 9; // clearance (px) that counts as a near miss
const NEON = ['#22e5ff', '#ff4fd8', '#a3ff3d', '#ffd23f', '#b37bff'];
const WIN_COLORS = ['#ffd98a', '#7cf7ff', '#ff9ad8'];
const FAR_T = 760;
const NEAR_T = 900;
const CLOUD_T = 1100;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- scenery (cosmetic, generated once from a fixed seed) ----------
let SCENE = null;
function scenery() {
  if (SCENE) return SCENE;
  const r = mulberry32(73313);
  const stars = [];
  for (let i = 0; i < 70; i++) stars.push({ x: r() * 1700, y: r() * 430, s: r() < 0.2 ? 2.5 : 1.5, a: 0.35 + r() * 0.6, f: 1 + r() * 3, p: r() * 6 });
  const far = [];
  let x = 0;
  while (x < FAR_T) {
    const w = 28 + r() * 46;
    far.push({ x, w, h: 80 + r() * 130, ant: r() < 0.3 });
    x += w + 2 + r() * 6;
  }
  const near = [];
  x = 0;
  while (x < NEAR_T) {
    const w = 42 + r() * 52;
    const h = 46 + r() * 104;
    const wins = [];
    for (let wy = 12; wy < h - 10; wy += 14) for (let wx = 7; wx < w - 9; wx += 11) if (r() < 0.32) wins.push(wx, wy, (r() * 3) | 0);
    near.push({ x, w, h, wins, cap: r() < 0.35 ? 8 + r() * 10 : 0 });
    x += w + 5 + r() * 16;
  }
  const clouds = [];
  for (let i = 0; i < 7; i++) clouds.push({ x: i * 160 + r() * 70, y: 90 + r() * 270, s: 0.7 + r() * 0.8, a: 0.1 + r() * 0.12 });
  SCENE = { stars, far, near, clouds };
  return SCENE;
}

function makeGrads(g, W, H, GY) {
  const sunX = Math.round(W * 0.7);
  const sunY = GY - 150;
  const sunR = 92;
  const sky = g.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, '#12082e');
  sky.addColorStop(0.42, '#33105b');
  sky.addColorStop(0.75, '#7a2277');
  sky.addColorStop(1, '#ff6f8e');
  const sun = g.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#fff27a');
  sun.addColorStop(0.5, '#ffac4a');
  sun.addColorStop(1, '#ff3d8b');
  const glow = g.createRadialGradient(sunX, sunY, sunR * 0.7, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, 'rgba(255,120,170,0.38)');
  glow.addColorStop(1, 'rgba(255,120,170,0)');
  const ground = g.createLinearGradient(0, GY, 0, H);
  ground.addColorStop(0, '#2c0d4a');
  ground.addColorStop(1, '#0b0418');
  const body = g.createLinearGradient(0, 0, PW, 0); // pillar body, local coords
  body.addColorStop(0, '#34166e');
  body.addColorStop(0.45, '#1d0b43');
  body.addColorStop(1, '#10052a');
  return { sky, sun, glow, ground, body, sunX, sunY, sunR };
}

function drawCloud(g, x, y, s) {
  // one path, same winding: overlapping lobes don't double the alpha
  g.beginPath();
  g.moveTo(x + 26 * s, y);
  g.arc(x, y, 26 * s, 0, TAU);
  g.moveTo(x + 62 * s, y - 12 * s);
  g.arc(x + 30 * s, y - 12 * s, 32 * s, 0, TAU);
  g.moveTo(x + 88 * s, y);
  g.arc(x + 64 * s, y, 24 * s, 0, TAU);
  g.rect(x, y, 64 * s, 26 * s);
  g.fill();
}

function drawBackdrop(g, W, H, GY, scroll, t, gr) {
  const sc = scenery();
  g.fillStyle = gr.sky;
  g.fillRect(0, 0, W, GY);
  // stars
  g.fillStyle = '#ffffff';
  const stars = sc.stars;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.x > W) continue;
    g.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * s.f + s.p));
    g.fillRect(s.x, s.y, s.s, s.s);
  }
  g.globalAlpha = 1;
  // retro sun
  g.fillStyle = gr.glow;
  g.fillRect(gr.sunX - gr.sunR * 2.4, gr.sunY - gr.sunR * 2.4, gr.sunR * 4.8, gr.sunR * 4.8);
  g.save();
  g.beginPath();
  g.arc(gr.sunX, gr.sunY, gr.sunR, 0, TAU);
  g.clip();
  g.fillStyle = gr.sun;
  g.fillRect(gr.sunX - gr.sunR, gr.sunY - gr.sunR, gr.sunR * 2, gr.sunR * 2);
  g.fillStyle = gr.sky;
  for (let i = 0; i < 7; i++) {
    const yy = gr.sunY + gr.sunR * (0.04 + i * 0.14);
    g.fillRect(gr.sunX - gr.sunR, yy, gr.sunR * 2, 2 + i * 1.7);
  }
  g.restore();
  // clouds
  g.fillStyle = '#ffb8e0';
  const cl = sc.clouds;
  const cOff = -(((scroll * 0.05) % CLOUD_T) + CLOUD_T) % CLOUD_T;
  for (let bx = cOff; bx < W; bx += CLOUD_T) {
    for (let i = 0; i < cl.length; i++) {
      const c = cl[i];
      const x = bx + c.x;
      if (x > W || x + 110 * c.s < 0) continue;
      g.globalAlpha = c.a;
      drawCloud(g, x, c.y, c.s);
    }
  }
  g.globalAlpha = 1;
  // far skyline
  g.fillStyle = '#3b1566';
  const far = sc.far;
  const fOff = -(((scroll * 0.1) % FAR_T) + FAR_T) % FAR_T;
  for (let bx = fOff; bx < W; bx += FAR_T) {
    for (let i = 0; i < far.length; i++) {
      const b = far[i];
      const x = bx + b.x;
      if (x > W || x + b.w < 0) continue;
      g.fillRect(x, GY - b.h, b.w, b.h);
      if (b.ant) g.fillRect(x + b.w / 2 - 1.5, GY - b.h - 16, 3, 16);
    }
  }
  // near skyline with lit windows
  const near = sc.near;
  const nOff = -(((scroll * 0.3) % NEAR_T) + NEAR_T) % NEAR_T;
  for (let bx = nOff; bx < W; bx += NEAR_T) {
    for (let i = 0; i < near.length; i++) {
      const b = near[i];
      const x = bx + b.x;
      if (x > W || x + b.w < 0) continue;
      const top = GY - b.h;
      g.fillStyle = '#1c0a3a';
      g.fillRect(x, top, b.w, b.h);
      if (b.cap) g.fillRect(x + b.w * 0.25, top - b.cap, b.w * 0.5, b.cap);
      g.fillStyle = 'rgba(255,79,216,0.35)';
      g.fillRect(x, top, b.w, 2);
      const wins = b.wins;
      for (let k = 0; k < wins.length; k += 3) {
        g.fillStyle = WIN_COLORS[wins[k + 2]];
        g.globalAlpha = 0.72;
        g.fillRect(x + wins[k], top + wins[k + 1], 4, 6);
      }
      g.globalAlpha = 1;
    }
  }
}

function drawGround(g, W, H, GY, scroll, gr) {
  g.fillStyle = gr.ground;
  g.fillRect(0, GY, W, H - GY);
  // perspective neon grid
  g.strokeStyle = 'rgba(255,79,216,0.42)';
  g.lineWidth = 1.5;
  g.beginPath();
  const sp = 48;
  const off = ((scroll % sp) + sp) % sp;
  const cx = W / 2;
  for (let x = -off - sp * 8; x < W + sp * 8; x += sp) {
    g.moveTo(x, GY);
    g.lineTo(cx + (x - cx) * 2.6, H);
  }
  for (let i = 1; i < 7; i++) {
    const k = i / 7;
    const yy = GY + (H - GY) * k * k;
    g.moveTo(0, yy);
    g.lineTo(W, yy);
  }
  g.stroke();
  // glowing horizon line
  g.fillStyle = 'rgba(255,79,216,0.25)';
  g.fillRect(0, GY - 3, W, 9);
  g.fillStyle = '#ff7be5';
  g.fillRect(0, GY, W, 3);
}

function drawLip(g, x, y, color) {
  const w = PW + LIP * 2;
  g.globalAlpha = 0.28;
  g.fillStyle = color;
  g.beginPath();
  g.roundRect ? g.roundRect(x - 5, y - 5, w + 10, LIP_H + 10, 10) : g.rect(x - 5, y - 5, w + 10, LIP_H + 10);
  g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  g.roundRect ? g.roundRect(x, y, w, LIP_H, 6) : g.rect(x, y, w, LIP_H);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(x + 5, y + 3, w - 10, 3);
  g.fillStyle = 'rgba(20,0,40,0.28)';
  g.fillRect(x + 3, y + LIP_H - 7, w - 6, 4);
}

/** Draws a pillar pair; x = left edge of the body, top/bot = gap edges. */
function drawPillar(g, x, top, bot, GY, color, body, pulse, hit) {
  g.save();
  g.translate(x, 0);
  const h1 = top - LIP_H + 40;
  const y2 = bot + LIP_H;
  const h2 = GY - y2;
  g.fillStyle = body;
  g.fillRect(0, -40, PW, h1);
  g.fillRect(0, y2, PW, h2);
  // segment lines
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = top - LIP_H - 30; y > -30; y -= 34) g.fillRect(4, y, PW - 8, 2);
  for (let y = y2 + 30; y < GY - 8; y += 34) g.fillRect(4, y, PW - 8, 2);
  // neon tube
  g.fillStyle = color;
  g.globalAlpha = 0.55;
  g.fillRect(PW * 0.26, -40, 3, h1);
  g.fillRect(PW * 0.26, y2, 3, h2);
  // glow + crisp outline
  g.strokeStyle = color;
  g.globalAlpha = 0.2 + pulse * 0.35;
  g.lineWidth = 9;
  g.strokeRect(0, -40, PW, h1);
  g.strokeRect(0, y2, PW, h2 + 20);
  g.globalAlpha = 1;
  g.lineWidth = 2.5;
  g.strokeRect(0, -40, PW, h1);
  g.strokeRect(0, y2, PW, h2 + 20);
  g.fillStyle = color;
  drawLip(g, -LIP, top - LIP_H, color);
  g.fillStyle = color;
  drawLip(g, -LIP, bot, color);
  if (hit > 0) {
    g.globalAlpha = hit * 0.7;
    g.fillStyle = '#ffffff';
    g.fillRect(-LIP, -40, PW + LIP * 2, top + 40);
    g.fillRect(-LIP, bot, PW + LIP * 2, GY - bot);
    g.globalAlpha = 1;
  }
  g.restore();
}

/** The hero: a round, cheerful bird. Faces right. */
function drawBird(g, x, y, rot, sx, sy, wing, dead) {
  const R = BIRD_R;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(sx, sy);
  g.lineJoin = 'round';
  g.strokeStyle = '#3a1552';
  g.lineWidth = 2.4;
  // tail
  g.fillStyle = '#ff9f1a';
  g.beginPath();
  g.moveTo(-R + 4, -3);
  g.lineTo(-R - 9, -10);
  g.lineTo(-R - 5, -1);
  g.lineTo(-R - 11, 6);
  g.lineTo(-R + 4, 5);
  g.closePath();
  g.fill();
  g.stroke();
  // tuft
  g.beginPath();
  g.moveTo(-2, -R + 2);
  g.quadraticCurveTo(-6, -R - 10, 3, -R - 7);
  g.moveTo(2, -R + 1);
  g.quadraticCurveTo(4, -R - 9, 10, -R - 3);
  g.stroke();
  // body
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.fill();
  g.fillStyle = '#fff3b0';
  g.beginPath();
  g.ellipse(3, 7, R * 0.64, R * 0.46, -0.15, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,140,20,0.25)';
  g.beginPath();
  g.arc(0, 0, R, 0.3, Math.PI - 0.3);
  g.fill();
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.stroke();
  // highlight
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(-6, -9, 5, 3, -0.6, 0, TAU);
  g.fill();
  // cheek
  g.fillStyle = 'rgba(255,100,140,0.6)';
  g.beginPath();
  g.arc(5, 5, 3.6, 0, TAU);
  g.fill();
  // eye
  if (dead) {
    g.strokeStyle = '#1a0a28';
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(4, -9);
    g.lineTo(11, -2);
    g.moveTo(11, -9);
    g.lineTo(4, -2);
    g.stroke();
  } else {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(7, -5, 6.6, 0, TAU);
    g.fill();
    g.strokeStyle = '#3a1552';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#1a0a28';
    g.beginPath();
    g.arc(9, -5, 3.3, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(10.2, -6.4, 1.2, 0, TAU);
    g.fill();
  }
  // beak
  g.fillStyle = '#ff8a1f';
  g.strokeStyle = '#3a1552';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(R - 4, -4);
  g.quadraticCurveTo(R + 12, 0, R - 3, 5);
  g.closePath();
  g.fill();
  g.stroke();
  // wing
  g.save();
  g.translate(-5, 3);
  g.rotate(wing);
  g.fillStyle = '#ffb21f';
  g.beginPath();
  g.ellipse(-3, 0, 10.5, 6.5, 0, 0, TAU);
  g.fill();
  g.lineWidth = 2.2;
  g.stroke();
  g.restore();
  g.restore();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const GY = H - GROUND_H;
  const rng = api.rng;
  let gr = null;
  let gctx = null;

  const bird = { x: BIRD_X, y: H * 0.44, vy: 0, vx: 0, rot: 0, s: 1, sv: 0, wingT: 0, boost: 0, dead: false, landed: false };
  const pool = [];
  const pillars = [];
  let scroll = 0;
  let clock = 0;
  let hoverT = 0;
  let hoverY = H * 0.44;
  let spawned = 0;
  let nextSpawn = 0;
  let prevCenter = 0;
  let nearStreak = 0;
  let speed = BASE_SPEED;
  let hitPillar = null;

  function newPillar() {
    return { x: 0, baseY: 0, gapY: 0, gap: 0, amp: 0, freq: 0, phase: 0, age: 0, passed: false, minClear: 999, color: NEON[0], pulse: 0, hit: 0 };
  }
  for (let i = 0; i < 8; i++) pool.push(newPillar());

  function freePillar(i) {
    pool.push(pillars[i]);
    pillars.splice(i, 1);
  }

  function reset() {
    while (pillars.length) pool.push(pillars.pop());
    bird.x = BIRD_X;
    hoverY = H * 0.44;
    bird.y = hoverY;
    bird.vy = 0;
    bird.vx = 0;
    bird.rot = 0;
    bird.s = 1;
    bird.sv = 0;
    bird.dead = false;
    bird.landed = false;
    hoverT = 0;
    scroll = 0;
    spawned = 0;
    nextSpawn = 30;
    prevCenter = hoverY;
    nearStreak = 0;
    speed = BASE_SPEED;
    hitPillar = null;
  }

  function spawnPillar(x) {
    const p = pool.pop() || newPillar();
    const n = spawned++;
    const gap = Math.max(MIN_GAP, START_GAP - n * 1.45) + rng.range(-6, 6);
    const lo = 92 + gap / 2;
    const hi = GY - 66 - gap / 2;
    const maxD = n === 0 ? 50 : Math.min(240, 110 + n * 5);
    let c = prevCenter + rng.range(-maxD, maxD);
    let amp = 0;
    let freq = 0;
    let phase = 0;
    if (n >= 12 && rng.chance(Math.min(0.55, 0.2 + (n - 12) * 0.02))) {
      amp = Math.min(70, 30 + (n - 12) * 1.3);
      freq = rng.range(1.4, 2.1) * (1 + Math.min(0.35, (n - 12) * 0.008));
      phase = rng.range(0, TAU);
    }
    c = clamp(c, lo + amp, hi - amp);
    prevCenter = c;
    p.x = x;
    p.baseY = c;
    p.gap = gap;
    p.amp = amp;
    p.freq = freq;
    p.phase = phase;
    p.age = 0;
    p.gapY = c + amp * Math.sin(phase);
    p.passed = false;
    p.minClear = 999;
    p.color = NEON[n % NEON.length];
    p.pulse = 0;
    p.hit = 0;
    pillars.push(p);
  }

  function hitRect(cx, cy, r, x, y, w, h) {
    const nx = cx < x ? x : cx > x + w ? x + w : cx;
    const ny = cy < y ? y : cy > y + h ? y + h : cy;
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function collides(p) {
    const cx = bird.x;
    const cy = bird.y;
    const top = p.gapY - p.gap / 2;
    const bot = p.gapY + p.gap / 2;
    return (
      hitRect(cx, cy, HIT_R, p.x, -400, PW, top + 400) ||
      hitRect(cx, cy, HIT_R, p.x - LIP, top - LIP_H, PW + LIP * 2, LIP_H) ||
      hitRect(cx, cy, HIT_R, p.x, bot, PW, GY - bot + 20) ||
      hitRect(cx, cy, HIT_R, p.x - LIP, bot, PW + LIP * 2, LIP_H)
    );
  }

  function flap() {
    if (bird.dead) return;
    bird.vy = FLAP_V;
    bird.s = 1.28; // squash, then spring back with a little wobble
    bird.sv = 0;
    bird.boost = 0.22;
    api.sfx.play('flap');
    api.fx.burst(bird.x - 12, bird.y + 5, {
      count: 3,
      colors: ['#fff6c9', '#ffd23f', '#ffffff', '#ffb21f'],
      speed: 110,
      angle: Math.PI * 0.72,
      spread: 1.1,
      size: 6,
      life: 0.6,
      gravity: 240,
      drag: 0.95,
      shape: 'square',
      shrink: false,
    });
    api.haptic(6);
  }

  function pass(p) {
    p.passed = true;
    p.pulse = 1;
    api.addScore(1);
    const s = api.score;
    api.sfx.play('score');
    const gx = p.x + PW / 2;
    api.fx.burst(gx, p.gapY, { count: 12, colors: [p.color, '#ffffff'], speed: 190, size: 3.5, life: 0.45, gravity: 0, shape: 'spark' });
    if (p.minClear < NEAR) {
      nearStreak += 1;
      api.sfx.combo(nearStreak + 3);
      api.fx.text(bird.x + 16, bird.y - 36, nearStreak > 1 ? `CLOSE ×${nearStreak}` : 'CLOSE!', { color: '#7cf7ff', size: 24 + Math.min(8, nearStreak * 2) });
      api.fx.burst(bird.x, bird.y, { count: 14 + nearStreak * 3, colors: ['#ffffff', '#7cf7ff', '#ffd23f'], speed: 230, size: 3.5, life: 0.55, gravity: 120, shape: 'spark' });
      api.haptic(14);
    } else nearStreak = 0;
    if (s % 10 === 0) {
      api.fx.confetti(W / 2, H * 0.22, 60);
      api.fx.text(W / 2, H * 0.24, `${s}!`, { size: 54, color: '#ffd23f', life: 1.2 });
      api.sfx.play('levelup');
      api.emit('milestone', { gaps: s });
      if (s === 60) api.happy();
    } else if (p.minClear >= NEAR) api.fx.text(gx + 26, p.gapY - p.gap / 2 + 18, '+1', { size: 22, color: p.color, life: 0.6, rise: 36 });
  }

  function die(cause, p) {
    if (bird.dead) return;
    bird.dead = true;
    bird.landed = cause === 'ground';
    hitPillar = p || null;
    if (p) p.hit = 1;
    api.sfx.play('hit');
    api.sfx.tone({ freq: 620, to: 110, type: 'triangle', dur: 0.5, vol: 0.12, delay: 0.14 });
    api.fx.shake(cause === 'ground' ? 10 : 13, 0.38);
    api.fx.flash('#ffffff', 0.55);
    api.haptic(70);
    api.fx.burst(bird.x, bird.y, { count: 14, colors: ['#ffd23f', '#fff6c9', '#ff9f1a', '#ffffff'], speed: 260, size: 6, life: 0.9, gravity: 420, drag: 0.96, shape: 'square', shrink: false });
    api.fx.ring(bird.x, bird.y, { color: '#ffffff', radius: 46, life: 0.35, width: 5 });
    if (cause === 'ground') {
      bird.y = GY - BIRD_R * 0.85;
      bird.vy = 0;
      bird.s = 1.3;
    } else {
      bird.vy = -230;
      bird.vx = -50;
    }
    api.gameOver({ delay: 1150, stats: { gaps: api.score } });
  }

  function animBird(dt) {
    // spring squash/stretch
    bird.sv += (-(bird.s - 1) * 520 - bird.sv * 16) * dt;
    bird.s += bird.sv * dt;
    bird.wingT += dt * (bird.boost > 0 ? 30 : 13);
    bird.boost = Math.max(0, bird.boost - dt);
  }

  function stepPillarFx(dt) {
    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      if (p.pulse > 0) p.pulse = Math.max(0, p.pulse - dt * 2.5);
      if (p.hit > 0) p.hit = Math.max(0, p.hit - dt * 2);
    }
  }

  function update(dt) {
    clock += dt;
    speed = BASE_SPEED + Math.min(78, api.score * 2.3);
    const dx = speed * dt;
    scroll += dx;
    // bird physics
    bird.vy = Math.min(MAX_FALL, bird.vy + GRAV * dt);
    bird.y += bird.vy * dt;
    if (bird.y < 12) {
      bird.y = 12;
      if (bird.vy < 0) bird.vy = 0;
    }
    const want = bird.vy < 0 ? -0.42 : Math.min(1.35, -0.42 + bird.vy / 420);
    bird.rot += (want - bird.rot) * Math.min(1, dt * (want < bird.rot ? 18 : 5.5));
    animBird(dt);
    stepPillarFx(dt);
    // pillars
    for (let i = pillars.length - 1; i >= 0; i--) {
      const p = pillars[i];
      p.x -= dx;
      p.age += dt;
      if (p.amp) p.gapY = p.baseY + p.amp * Math.sin(p.phase + p.age * p.freq);
      if (bird.x + BIRD_R > p.x - LIP && bird.x - BIRD_R < p.x + PW + LIP) {
        const clear = Math.min(bird.y - HIT_R - (p.gapY - p.gap / 2), p.gapY + p.gap / 2 - (bird.y + HIT_R));
        if (clear < p.minClear) p.minClear = clear;
      }
      if (collides(p)) {
        die('pillar', p);
        return;
      }
      if (!p.passed && p.x + PW / 2 < bird.x) pass(p);
      if (p.x + PW + LIP < -30) freePillar(i);
    }
    nextSpawn -= dx;
    if (nextSpawn <= 0) {
      spawnPillar(W + 30 - nextSpawn);
      nextSpawn += SPACING;
    }
    if (bird.y + HIT_R >= GY) die('ground');
  }

  function idle(dt) {
    clock += dt;
    stepPillarFx(dt);
    if (bird.dead) {
      if (!bird.landed) {
        bird.vy = Math.min(MAX_FALL * 1.3, bird.vy + GRAV * 1.1 * dt);
        bird.y += bird.vy * dt;
        bird.x += bird.vx * dt;
        bird.rot += dt * 10;
        if (bird.y + BIRD_R * 0.85 >= GY) {
          bird.y = GY - BIRD_R * 0.85;
          bird.landed = true;
          bird.s = 1.35;
          bird.sv = 0;
          api.sfx.tone({ freq: 150, to: 55, type: 'sine', dur: 0.2, vol: 0.3 });
          api.sfx.noise({ dur: 0.12, vol: 0.15, freq: 700 });
          api.fx.shake(6, 0.2);
          api.fx.burst(bird.x, GY, { count: 12, colors: ['#ff7be5', '#b37bff', '#ffffff'], speed: 170, angle: -Math.PI / 2, spread: 2.4, size: 4, life: 0.5, gravity: 500 });
        }
      }
      bird.boost = 0;
      bird.sv += (-(bird.s - 1) * 520 - bird.sv * 16) * dt;
      bird.s += bird.sv * dt;
      return;
    }
    // ready: hover in place
    hoverT += dt;
    bird.y = hoverY + Math.sin(hoverT * 3.4) * 9;
    bird.vy = 0;
    bird.rot = -Math.cos(hoverT * 3.4) * 0.1;
    animBird(dt);
    if (!pillars.length) scroll += 70 * dt;
  }

  reset();
  // Opt-in test hook (only when a test page defines window.__raDebug).
  if (typeof window !== 'undefined' && window.__raDebug && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__raDebug[api.meta.slug] = { bird, pillars, get speed() { return speed; } };

  return {
    reset,
    update,
    idle,
    forwardStartInput: true,
    input(e) {
      if (e.type === 'down' || (e.type === 'keydown' && !e.repeat && api.isTapKey(e.key))) {
        flap();
        return true;
      }
      return false;
    },
    revive() {
      for (let i = pillars.length - 1; i >= 0; i--) {
        if (pillars[i].x < BIRD_X + 240) freePillar(i);
        else pillars[i].hit = 0;
      }
      if (!pillars.length) nextSpawn = Math.min(nextSpawn, 40);
      bird.dead = false;
      bird.landed = false;
      bird.x = BIRD_X;
      bird.vx = 0;
      bird.vy = 0;
      bird.rot = 0;
      bird.s = 1;
      bird.sv = 0;
      hoverY = H * 0.42;
      bird.y = hoverY;
      hoverT = 0;
      nearStreak = 0;
      hitPillar = null;
      api.fx.ring(bird.x, bird.y, { color: '#ffd23f', radius: 60, life: 0.5, width: 5 });
    },
    render(g) {
      if (gctx !== g) {
        gr = makeGrads(g, W, H, GY);
        gctx = g;
      }
      drawBackdrop(g, W, H, GY, scroll, clock, gr);
      for (let i = 0; i < pillars.length; i++) {
        const p = pillars[i];
        if (p.x > W + 20) continue;
        drawPillar(g, p.x, p.gapY - p.gap / 2, p.gapY + p.gap / 2, GY, p.color, gr.body, p.pulse, p.hit);
      }
      drawGround(g, W, H, GY, scroll, gr);
      const wing = bird.dead ? 0.9 : Math.sin(bird.wingT) * (bird.boost > 0 ? 0.95 : 0.55) - 0.1;
      const s = bird.s;
      drawBird(g, bird.x, bird.y, bird.rot, s, 2 - s, wing, bird.dead);
      if (api.state === 'ready' && !bird.dead) {
        // tiny tap hint chevrons above the bird
        const k = (clock * 1.6) % 1;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 3;
        g.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const kk = (k + i * 0.5) % 1;
          g.globalAlpha = Math.sin(kk * Math.PI) * 0.8;
          const yy = bird.y - 34 - kk * 22;
          g.beginPath();
          g.moveTo(bird.x - 8, yy + 5);
          g.lineTo(bird.x, yy);
          g.lineTo(bird.x + 8, yy + 5);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.lineCap = 'butt';
      }
    },
  };
}

/** Key art: neon synthwave skyline, glowing pillars and the bird mid-flap. Text-free. */
export function cover(g, w, h) {
  const LH = 740;
  const s = h / LH;
  const LW = w / s;
  const GY = LH - GROUND_H;
  g.save();
  g.scale(s, s);
  const gr = makeGrads(g, LW, LH, GY);
  drawBackdrop(g, LW, LH, GY, 260, 1.7, gr);
  // pillars
  const pairs = [
    [LW * 0.56, 300, 250, NEON[1]],
    [LW * 0.83, 400, 240, NEON[0]],
  ];
  if (LW > 1200) pairs.push([LW * 0.07, 380, 240, NEON[2]]);
  for (const [x, c, gap, col] of pairs) drawPillar(g, x - PW / 2, c - gap / 2, c + gap / 2, GY, col, gr.body, 0.6, 0);
  drawGround(g, LW, LH, GY, 30, gr);
  // bird, big and heroic
  const bx = LW * 0.34;
  const by = 330;
  // motion streaks
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    g.lineWidth = 7 - i;
    const yy = by - 26 + i * 20;
    g.beginPath();
    g.moveTo(bx - 70 - i * 16, yy + 12);
    g.lineTo(bx - 150 - i * 26, yy + 30);
    g.stroke();
  }
  // feathers
  const feathers = [
    [-95, 40, 0.6, '#fff6c9'],
    [-130, 70, 1.4, '#ffd23f'],
    [-70, 80, 2.2, '#ffb21f'],
    [-160, 20, 0.2, '#ffffff'],
  ];
  for (const [fx, fy, r, col] of feathers) {
    g.save();
    g.translate(bx + fx, by + fy);
    g.rotate(r);
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(0, 0, 11, 5, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  // sparkles around the gap
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  const sparks = [
    [LW * 0.56 - 60, 250],
    [LW * 0.56 + 58, 360],
    [LW * 0.56 + 10, 205],
  ];
  for (const [sx, sy] of sparks) {
    g.beginPath();
    g.moveTo(sx - 9, sy);
    g.lineTo(sx + 9, sy);
    g.moveTo(sx, sy - 9);
    g.lineTo(sx, sy + 9);
    g.stroke();
  }
  g.save();
  g.translate(bx, by);
  g.scale(2.7, 2.7);
  drawBird(g, 0, 0, -0.32, 1.06, 0.94, -0.8, false);
  g.restore();
  g.restore();
}
