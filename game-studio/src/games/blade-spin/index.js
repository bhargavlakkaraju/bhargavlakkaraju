// Blade Spin - throw blades into a spinning wooden target. Never hit steel.
import { mulberry32 } from '../engine/rng.js';

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const CX = 210;
const CY = 326;
const R_NORMAL = 96;
const R_BOSS = 106;
const EMBED = 16; // how deep a blade sinks into the wood
const BLADE_LEN = 90;
const BLADE_W = 12.5; // two blades closer than this (chord at the rim) collide
const THROW_Y = 606; // tip of the ready blade
const THROW_SPEED = 2900;
const FRUIT_HIT = 0.24; // rad

const PALS = [
  { bark: '#5b3417', wood: '#dca267', ring: '#b77b45', crack: '#8e5a2e', light: '#f3c98f' }, // oak
  { bark: '#6e4a2a', wood: '#f0d3a2', ring: '#cfaa70', crack: '#a98150', light: '#fff0cf' }, // birch
  { bark: '#3a1d0e', wood: '#b06f3e', ring: '#824d26', crack: '#5e3418', light: '#d99a63' }, // walnut
  { bark: '#5c1f1c', wood: '#e39062', ring: '#b8623e', crack: '#8a3f25', light: '#ffc09a' }, // cherry
];
const BOSS_PAL = { bark: '#262a36', wood: '#8f3c2a', ring: '#6b2a1c', crack: '#46160e', light: '#d8755a', rim: '#c3ccd8' };

const angDist = (a, b) => Math.abs(Math.sin((a - b) / 2)) * 2; // chord on a unit circle

function rr(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

/** A throwing blade pointing up: tip at (0,0), pommel at (0, ~90). */
function drawBlade(g, tint) {
  // blade
  g.fillStyle = tint || '#eef3fa';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(6.2, 15);
  g.lineTo(6.2, 48);
  g.lineTo(-6.2, 48);
  g.lineTo(-6.2, 11);
  g.closePath();
  g.fill();
  g.fillStyle = tint ? 'rgba(0,0,0,0.18)' : '#b9c5d6';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(6.2, 15);
  g.lineTo(6.2, 48);
  g.lineTo(0, 48);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(90,105,130,0.55)';
  g.fillRect(-1.2, 17, 2.4, 27);
  // guard
  g.fillStyle = '#ffc93c';
  rr(g, -8, 47, 16, 6, 3);
  g.fill();
  // handle
  g.fillStyle = '#6b3219';
  rr(g, -4.8, 53, 9.6, 30, 4);
  g.fill();
  g.fillStyle = '#4a200f';
  g.fillRect(-4.8, 59, 9.6, 2.5);
  g.fillRect(-4.8, 66, 9.6, 2.5);
  g.fillRect(-4.8, 73, 9.6, 2.5);
  // pommel
  g.fillStyle = '#ffc93c';
  g.beginPath();
  g.arc(0, 86, 4.4, 0, TAU);
  g.fill();
}

function drawLog(g, r, pal, boss) {
  g.fillStyle = pal.bark;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  // bark notches
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    g.beginPath();
    g.arc(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3), 2.2, 0, TAU);
    g.fill();
  }
  g.fillStyle = pal.wood;
  g.beginPath();
  g.arc(0, 0, r - 8, 0, TAU);
  g.fill();
  // growth rings (slightly off-centre for an organic look)
  g.strokeStyle = pal.ring;
  g.lineWidth = 2;
  const ox = r * 0.04;
  const oy = -r * 0.03;
  for (let i = 0; i < 4; i++) {
    const k = 0.8 - i * 0.18;
    g.beginPath();
    g.arc(ox * (1 - k), oy * (1 - k), r * k, 0, TAU);
    g.stroke();
  }
  // cracks
  g.strokeStyle = pal.crack;
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(r * 0.12, r * 0.02);
  g.lineTo(r * 0.42, r * 0.12);
  g.lineTo(r * 0.64, r * 0.06);
  g.moveTo(-r * 0.1, -r * 0.08);
  g.lineTo(-r * 0.3, -r * 0.34);
  g.lineTo(-r * 0.5, -r * 0.4);
  g.moveTo(-r * 0.05, r * 0.14);
  g.lineTo(-r * 0.18, r * 0.5);
  g.stroke();
  g.lineCap = 'butt';
  // knot
  g.fillStyle = pal.ring;
  g.beginPath();
  g.ellipse(r * 0.5, -r * 0.42, 8, 5, 0.7, 0, TAU);
  g.fill();
  g.fillStyle = pal.crack;
  g.beginPath();
  g.ellipse(r * 0.5, -r * 0.42, 4, 2.4, 0.7, 0, TAU);
  g.fill();
  // pith
  g.fillStyle = pal.crack;
  g.beginPath();
  g.arc(ox, oy, 4.5, 0, TAU);
  g.fill();
  if (boss) {
    g.strokeStyle = pal.rim;
    g.lineWidth = 7;
    g.beginPath();
    g.arc(0, 0, r - 4, 0, TAU);
    g.stroke();
    g.fillStyle = '#5d6676';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath();
      g.arc(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4), 2.4, 0, TAU);
      g.fill();
    }
    // iron cross plate
    g.fillStyle = '#3a404d';
    g.fillRect(-r * 0.62, -5, r * 1.24, 10);
    g.fillRect(-5, -r * 0.62, 10, r * 1.24);
    g.fillStyle = '#ff3d5a';
    g.beginPath();
    g.arc(0, 0, 10, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.arc(-3, -3, 3, 0, TAU);
    g.fill();
  }
}

function drawApple(g, x, y) {
  g.fillStyle = '#ff3b4f';
  g.beginPath();
  g.arc(x, y + 1, 10.5, 0, TAU);
  g.fill();
  g.fillStyle = '#d42039';
  g.beginPath();
  g.arc(x + 3, y + 4, 7.5, 0, TAU);
  g.fill();
  g.fillStyle = '#ff3b4f';
  g.beginPath();
  g.arc(x - 1.5, y + 0.5, 7.5, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.ellipse(x - 4.5, y - 3.5, 3.2, 2, -0.6, 0, TAU);
  g.fill();
  g.fillStyle = '#9b1428';
  g.beginPath();
  g.ellipse(x, y - 8.5, 3.2, 1.6, 0, 0, TAU);
  g.fill();
  g.strokeStyle = '#5a2d17';
  g.lineWidth = 2.2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y - 8);
  g.lineTo(x + 1.5, y - 14);
  g.stroke();
  g.lineCap = 'butt';
  g.fillStyle = '#5fd35a';
  g.beginPath();
  g.ellipse(x + 6, y - 13, 5, 2.6, -0.5, 0, TAU);
  g.fill();
}

/** Half an apple, cut face showing. side -1 = left half. */
function drawAppleHalf(g, side) {
  const a0 = side < 0 ? HALF_PI : -HALF_PI;
  g.fillStyle = '#ff3b4f';
  g.beginPath();
  g.arc(0, 1, 10.5, a0, a0 + Math.PI);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff1c9';
  g.beginPath();
  g.ellipse(0, 1, 3.6, 9.6, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#6b3a1a';
  g.beginPath();
  g.ellipse(0, -1, 1.2, 2, 0, 0, TAU);
  g.ellipse(0, 4, 1.2, 2, 0, 0, TAU);
  g.fill();
}

function drawGem(g, x, y) {
  g.fillStyle = '#3fe6ff';
  g.beginPath();
  g.moveTo(x, y - 12);
  g.lineTo(x + 10, y - 3);
  g.lineTo(x, y + 12);
  g.lineTo(x - 10, y - 3);
  g.closePath();
  g.fill();
  g.fillStyle = '#b8f7ff';
  g.beginPath();
  g.moveTo(x, y - 12);
  g.lineTo(x + 10, y - 3);
  g.lineTo(x, y - 1);
  g.lineTo(x - 10, y - 3);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(0,60,90,0.25)';
  g.beginPath();
  g.moveTo(x, y - 1);
  g.lineTo(x + 10, y - 3);
  g.lineTo(x, y + 12);
  g.closePath();
  g.fill();
}

function drawBackground(g, W, H, spot) {
  g.fillStyle = spot;
  g.fillRect(0, 0, W, H);
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const rng = api.rng;
  const { ease, draw } = api;

  let gctx = null;
  let spotN = null;
  let spotB = null;
  let shadeN = null;
  let shadeB = null;

  // cosmetic dust motes
  const motes = [];
  for (let i = 0; i < 28; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2, v: 6 + Math.random() * 14, p: Math.random() * 6 });

  let stage = null;
  let theta = 0;
  let flying = null; // { y }
  let knifeIn = 1;
  let queued = false;
  let failed = false;
  let failBlade = null;
  let bounce = null;
  let transition = false;
  let transT = 0;
  let pendingClear = -1;
  let introT = 1;
  let kick = 0;
  let hitFlash = 0;
  let clock = 0;
  let totalStuck = 0;
  const chunks = [];
  const flyers = [];
  const halves = [];

  function makeSpin(k, boss) {
    const base = Math.min(3.3, 1.7 + (k - 1) * 0.085) * rng.range(0.92, 1.08);
    const dir = rng.sign();
    let type;
    if (boss) type = 'boss';
    else if (k === 1) type = 'const';
    else if (k < 4) type = rng.pick(['const', 'sine']);
    else type = rng.pick(['const', 'sine', 'sine', 'steps', 'steps']);
    const sched = [];
    for (let i = 0; i < 8; i++) {
      if (type === 'boss') {
        const stop = rng.chance(0.16);
        const v = stop ? 0 : base * rng.range(0.6, 2.0) * (rng.chance(0.5) ? -1 : 1);
        sched.push(v, stop ? rng.range(0.25, 0.45) : rng.range(0.45, 1.25));
      } else {
        const v = base * rng.range(0.45, 1.6) * (rng.chance(0.22) ? -dir : dir);
        sched.push(v, rng.range(0.8, 1.8));
      }
    }
    const amp = base * rng.range(0.55, 1.25);
    const freq = rng.range(1.0, 1.8);
    const phase = rng.range(0, TAU);
    return { type, base, dir, amp, freq, phase, sched, idx: 0, segT: 0, w: dir * base, t: 0, accel: boss ? 6 : 3.2 };
  }

  function makeStage(k) {
    const boss = k % 5 === 0;
    const tier = Math.floor((k - 1) / 5);
    const R = boss ? R_BOSS : R_NORMAL;
    const need = boss ? Math.min(10, 8 + tier) : Math.min(10, 6 + (((k - 1) % 5) >> 1) + tier);
    const spin = makeSpin(k, boss);
    const stuck = [];
    const preCount = k === 1 ? 0 : boss ? Math.min(4, 2 + tier) : Math.min(4, rng.int(1, 2) + tier);
    for (let i = 0; i < preCount; i++) {
      for (let tries = 0; tries < 24; tries++) {
        const a = rng.range(0, TAU);
        let okA = true;
        for (let j = 0; j < stuck.length; j++) if (angDist(a, stuck[j].a) < 0.6) okA = false;
        if (okA) {
          stuck.push({ a, flash: 0, pre: true });
          break;
        }
      }
    }
    const fruits = [];
    const fruitCount = k === 1 ? 1 : rng.int(1, 2);
    for (let i = 0; i < fruitCount; i++) {
      for (let tries = 0; tries < 24; tries++) {
        const a = rng.range(0, TAU);
        let okA = true;
        for (let j = 0; j < stuck.length; j++) if (angDist(a, stuck[j].a) < 0.5) okA = false;
        for (let j = 0; j < fruits.length; j++) if (angDist(a, fruits[j].a) < 0.7) okA = false;
        if (okA) {
          fruits.push({ a, kind: boss || (k > 3 && rng.chance(0.3)) ? 'gem' : 'apple', alive: true });
          break;
        }
      }
    }
    const pal = boss ? BOSS_PAL : PALS[(k - 1) % PALS.length];
    return { k, boss, R, need, left: need, stuck, fruits, spin, pal, hits: 0, label: boss ? 'BOSS STAGE' : `STAGE ${k}` };
  }

  function spinStep(dt) {
    const s = stage.spin;
    s.t += dt;
    if (s.type === 'const') s.w = s.dir * s.base;
    else if (s.type === 'sine') s.w = s.dir * (s.base + s.amp * Math.sin(s.t * s.freq + s.phase));
    else {
      s.segT += dt;
      if (s.segT > s.sched[s.idx * 2 + 1]) {
        s.segT = 0;
        s.idx = (s.idx + 1) % (s.sched.length / 2);
      }
      const target = s.sched[s.idx * 2];
      s.w += (target - s.w) * Math.min(1, dt * s.accel);
    }
    theta += s.w * dt;
    if (theta > TAU * 1000 || theta < -TAU * 1000) theta %= TAU;
  }

  function startStage(k) {
    stage = makeStage(k);
    introT = 0;
    knifeIn = 0;
    flying = null;
    queued = false;
    pendingClear = -1;
  }

  function reset() {
    theta = 0;
    failed = false;
    failBlade = null;
    bounce = null;
    transition = false;
    transT = 0;
    kick = 0;
    hitFlash = 0;
    totalStuck = 0;
    chunks.length = 0;
    flyers.length = 0;
    halves.length = 0;
    startStage(1);
    introT = 1;
    knifeIn = 1;
    pilotReset();
  }

  function throwBlade() {
    if (failed || transition || pendingClear >= 0 || stage.left <= 0) return;
    if (flying || knifeIn < 0.65 || introT < 0.35) {
      queued = true;
      return;
    }
    flying = { y: THROW_Y };
    stage.left -= 1;
    knifeIn = 0;
    api.sfx.play('swipe');
  }

  function sliceFruit(f) {
    f.alive = false;
    const wa = theta + f.a;
    const x = CX + Math.cos(wa) * (stage.R + 12);
    const y = CY + Math.sin(wa) * (stage.R + 12);
    const bonus = f.kind === 'gem' ? 3 : 2;
    api.addScore(bonus);
    api.sfx.play('coin');
    api.fx.text(x, y - 16, `+${bonus}`, { color: f.kind === 'gem' ? '#7cf3ff' : '#ffd23f', size: 30 });
    api.fx.burst(x, y, { count: 18, colors: f.kind === 'gem' ? ['#3fe6ff', '#b8f7ff', '#ffffff'] : ['#ff3b4f', '#ffe3a1', '#ffffff'], speed: 260, size: 4, life: 0.6, gravity: 700 });
    for (let s = -1; s <= 1; s += 2) halves.push({ x, y, vx: s * (140 + Math.random() * 60), vy: -220 - Math.random() * 80, rot: 0, vr: s * 7, side: s, kind: f.kind, life: 1.2 });
  }

  function stick(a, minChord) {
    stage.stuck.push({ a, flash: 1, pre: false });
    stage.hits += 1;
    totalStuck += 1;
    api.addScore(1);
    kick = 1;
    hitFlash = 1;
    api.sfx.play('place');
    api.sfx.combo(stage.hits - 1, 440);
    api.haptic(12);
    const pal = stage.pal;
    api.fx.burst(CX, CY + stage.R, { count: 9, colors: [pal.light, pal.wood, pal.ring], speed: 200, angle: HALF_PI, spread: 2.2, size: 4.5, life: 0.5, gravity: 900, shape: 'square', shrink: false });
    for (let i = 0; i < stage.fruits.length; i++) {
      const f = stage.fruits[i];
      if (f.alive && angDist(a, f.a) < FRUIT_HIT) sliceFruit(f);
    }
    if (minChord < BLADE_W + 7) {
      api.fx.text(CX + 44, CY + stage.R + 16, 'CLOSE!', { color: '#7cf7ff', size: 22, life: 0.7 });
      api.fx.burst(CX, CY + stage.R, { count: 10, colors: ['#ffffff', '#7cf7ff'], speed: 200, size: 3, life: 0.4, gravity: 0, shape: 'spark' });
    }
    if (stage.left === 0) pendingClear = 0.16;
  }

  function fail(b, y) {
    failed = true;
    failBlade = b;
    b.flash = 1;
    flying = null;
    queued = false;
    const dir = Math.random() < 0.5 ? -1 : 1;
    bounce = { x: CX, y: y + BLADE_LEN / 2, vx: dir * (140 + Math.random() * 90), vy: 380, rot: 0, vr: dir * (12 + Math.random() * 6) };
    api.sfx.tone({ freq: 1850, to: 1400, type: 'square', dur: 0.1, vol: 0.09 });
    api.sfx.tone({ freq: 2750, type: 'triangle', dur: 0.35, vol: 0.07, delay: 0.01 });
    api.sfx.tone({ freq: 3300, type: 'sine', dur: 0.45, vol: 0.05, delay: 0.02 });
    api.sfx.play('hit');
    api.fx.burst(CX, y, { count: 26, colors: ['#ffffff', '#ffe066', '#ffae00'], speed: 460, size: 3, life: 0.45, gravity: 600, shape: 'spark' });
    api.fx.ring(CX, y, { color: '#ffe066', radius: 40, life: 0.3, width: 4 });
    api.fx.shake(12, 0.35);
    api.fx.flash('#ff3d5a', 0.35);
    api.haptic(90);
    api.gameOver({ delay: 1000, stats: { stage: stage.k, blades: totalStuck } });
  }

  function arrive() {
    const a = HALF_PI - theta;
    let minChord = 1e9;
    let nearest = null;
    const st = stage.stuck;
    for (let i = 0; i < st.length; i++) {
      const c = angDist(a, st[i].a) * stage.R;
      if (c < minChord) {
        minChord = c;
        nearest = st[i];
      }
    }
    flying = null;
    if (nearest && minChord < BLADE_W) fail(nearest, CY + stage.R);
    else stick(a, minChord);
  }

  function moveFlying(dt) {
    const steps = 4;
    const dy = (THROW_SPEED * dt) / steps;
    const R = stage.R;
    const st = stage.stuck;
    for (let s = 0; s < steps; s++) {
      flying.y -= dy;
      if (flying.y <= CY + R) {
        arrive();
        return;
      }
      // tip against the handles of blades sticking out near the bottom
      const py = flying.y - CY;
      for (let i = 0; i < st.length; i++) {
        const wa = theta + st[i].a;
        const ux = Math.cos(wa);
        const uy = Math.sin(wa);
        const t = py * uy;
        if (t < R || t > R - EMBED + BLADE_LEN) continue;
        if (Math.abs(py * ux) < 8) {
          fail(st[i], flying.y);
          return;
        }
      }
    }
  }

  function clearStage() {
    transition = true;
    transT = 0;
    const R = stage.R;
    const pal = stage.pal;
    chunks.length = 0;
    flyers.length = 0;
    for (let i = 0; i < 8; i++) {
      const a0 = theta + (i / 8) * TAU;
      const mid = a0 + TAU / 16;
      const sp = 240 + Math.random() * 200;
      chunks.push({ a0, x: CX, y: CY, vx: Math.cos(mid) * sp, vy: Math.sin(mid) * sp - 260, rot: 0, vr: (Math.random() - 0.5) * 9, R, pal, boss: stage.boss });
    }
    const st = stage.stuck;
    for (let i = 0; i < st.length; i++) {
      const wa = theta + st[i].a;
      const d = R - EMBED + BLADE_LEN / 2;
      const sp = 300 + Math.random() * 250;
      flyers.push({ x: CX + Math.cos(wa) * d, y: CY + Math.sin(wa) * d, ang: wa + HALF_PI, vx: Math.cos(wa) * sp, vy: Math.sin(wa) * sp - 300, vr: (Math.random() - 0.5) * 14 });
    }
    api.sfx.noise({ dur: 0.35, vol: 0.3, freq: 1100, to: 160 });
    api.sfx.play(stage.boss ? 'win' : 'perfect');
    api.fx.shake(stage.boss ? 16 : 10, 0.4);
    api.fx.flash('#ffffff', 0.4);
    api.fx.burst(CX, CY, { count: 34, colors: [pal.light, pal.wood, pal.ring, pal.bark], speed: 420, size: 6, life: 0.9, gravity: 900, shape: 'square', shrink: false });
    api.fx.ring(CX, CY, { color: '#ffffff', radius: R * 1.8, life: 0.5, width: 6 });
    api.haptic(40);
    if (stage.boss) {
      api.addScore(5);
      api.fx.confetti(CX, CY - 40, 80);
      api.fx.text(CX, CY - 10, 'BOSS DOWN!', { color: '#ffd23f', size: 44, life: 1.3 });
      api.fx.text(CX, CY + 40, '+5', { color: '#ffffff', size: 30, life: 1.1 });
      api.happy();
    } else {
      api.fx.text(CX, CY, 'STAGE CLEAR!', { color: '#ffffff', size: 36, life: 1.0 });
    }
    api.emit('milestone', { stage: stage.k });
  }

  function stepTransition(dt) {
    transT += dt;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      c.vy += 1400 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
    }
    if (transT > 0.95) {
      transition = false;
      chunks.length = 0;
      startStage(stage.k + 1);
      api.sfx.play('whoosh');
      if (stage.boss) {
        api.fx.text(CX, CY + 205, 'BOSS FIGHT!', { color: '#ff5a6e', size: 40, life: 1.3, rise: 30 });
        api.sfx.tone({ freq: 110, to: 70, type: 'sawtooth', dur: 0.5, vol: 0.1 });
      } else api.fx.text(CX, CY + 205, `STAGE ${stage.k}`, { color: '#ffffff', size: 34, life: 0.9, rise: 30 });
    }
  }

  function stepCosmetic(dt) {
    clock += dt;
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.y -= m.v * dt;
      if (m.y < -4) {
        m.y = H + 4;
        m.x = Math.random() * W;
      }
    }
    for (let i = 0; i < flyers.length; i++) {
      const f = flyers[i];
      f.vy += 1500 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.ang += f.vr * dt;
    }
    for (let i = flyers.length - 1; i >= 0; i--) if (flyers[i].y > H + 120) flyers.splice(i, 1);
    for (let i = halves.length - 1; i >= 0; i--) {
      const h = halves[i];
      h.vy += 1200 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      h.life -= dt;
      if (h.life <= 0) halves.splice(i, 1);
    }
    if (bounce) {
      bounce.vy += 2100 * dt;
      bounce.x += bounce.vx * dt;
      bounce.y += bounce.vy * dt;
      bounce.rot += bounce.vr * dt;
    }
    kick = Math.max(0, kick - dt * 7);
    hitFlash = Math.max(0, hitFlash - dt * 5);
    const st = stage.stuck;
    for (let i = 0; i < st.length; i++) if (st[i].flash > 0) st[i].flash = Math.max(0, st[i].flash - dt * (failed ? 0.8 : 4));
    if (introT < 1) introT = Math.min(1, introT + dt / 0.45);
    knifeIn = Math.min(1, knifeIn + dt * 9);
  }

  // ---------- demo autopilot (only runs when the engine calls demo()) ----------
  // Its own tiny PRNG so the seeded game randomness (api.rng) is never touched.
  const PILOT_SEED = 0xb1ade;
  const PILOT_LOOK = 70; // frames of spin the pilot reads ahead
  let prand = mulberry32(PILOT_SEED);
  let pilotWait = 0; // reaction time left before the pilot lines up its next throw
  let pilotAt = -1; // frames until the planned throw (-1 = nothing planned)
  const pilotTh = new Float64Array(PILOT_LOOK + 8);
  const pilotRes = { ok: false, chord: 0, fruit: false };

  function pilotReset() {
    prand = mulberry32(PILOT_SEED);
    pilotWait = 0.3;
    pilotAt = -1;
  }

  // theta after each of the next n spin steps (a copy of spinStep that changes nothing)
  function pilotSpin(n, dt) {
    const s = stage.spin;
    let t = s.t;
    let segT = s.segT;
    let idx = s.idx;
    let w = s.w;
    let th = theta;
    for (let i = 0; i < n; i++) {
      t += dt;
      if (s.type === 'const') w = s.dir * s.base;
      else if (s.type === 'sine') w = s.dir * (s.base + s.amp * Math.sin(t * s.freq + s.phase));
      else {
        segT += dt;
        if (segT > s.sched[idx * 2 + 1]) {
          segT = 0;
          idx = (idx + 1) % (s.sched.length / 2);
        }
        w += (s.sched[idx * 2] - w) * Math.min(1, dt * s.accel);
      }
      th += w * dt;
      pilotTh[i] = th;
    }
  }

  // Where would a blade thrown j frames from now land? Mirrors moveFlying() and arrive()
  // on the spin read ahead by pilotSpin().
  function pilotProbe(j, dt) {
    const res = pilotRes;
    res.ok = false;
    res.chord = 0;
    res.fruit = false;
    const R = stage.R;
    const st = stage.stuck;
    const dy = (THROW_SPEED * dt) / 4;
    let y = THROW_Y;
    for (let f = j; f < pilotTh.length; f++) {
      const th = pilotTh[f];
      for (let k = 0; k < 4; k++) {
        y -= dy;
        if (y <= CY + R) {
          const a = HALF_PI - th;
          let chord = 1e9;
          for (let i = 0; i < st.length; i++) chord = Math.min(chord, angDist(a, st[i].a) * R);
          for (let i = 0; i < stage.fruits.length; i++) {
            const fr = stage.fruits[i];
            if (fr.alive && angDist(a, fr.a) < FRUIT_HIT - 0.05) res.fruit = true;
          }
          res.chord = chord;
          res.ok = chord >= BLADE_W;
          return res;
        }
        const py = y - CY;
        for (let i = 0; i < st.length; i++) {
          const wa = th + st[i].a;
          const tt = py * Math.sin(wa);
          if (tt < R - 2 || tt > R - EMBED + BLADE_LEN + 2) continue;
          if (Math.abs(py * Math.cos(wa)) < 11) return res;
        }
      }
    }
    return res;
  }

  // Read the spin ahead and pick the throw: slice a fruit when one swings by soon, now and
  // then thread a blade right next to another one (CLOSE!), otherwise the first clean gap.
  function pilotPlan(dt) {
    pilotSpin(pilotTh.length, dt);
    let fruitAlive = false;
    for (let i = 0; i < stage.fruits.length; i++) if (stage.fruits[i].alive) fruitAlive = true;
    const wantClose = stage.stuck.length >= 2 && prand() < 0.4;
    let clean = -1;
    let fruit = -1;
    let close = -1;
    for (let j = 0; j < PILOT_LOOK; j++) {
      const r = pilotProbe(j, dt);
      if (!r.ok) continue;
      if (clean < 0 && r.chord >= BLADE_W + 5) clean = j;
      if (fruitAlive && fruit < 0 && r.fruit && r.chord >= BLADE_W + 4) fruit = j;
      if (wantClose && close < 0 && j < 40 && r.chord >= BLADE_W + 1.5 && r.chord < BLADE_W + 6) close = j;
    }
    if (fruit >= 0 && fruit < 56) return fruit;
    if (close >= 0) return close;
    return clean;
  }

  function demo(dt) {
    if (!(dt > 0)) return;
    if (failed || transition || pendingClear >= 0 || stage.left <= 0) {
      pilotAt = -1;
      return;
    }
    if (flying || queued || knifeIn < 0.65 || introT < 0.35) return;
    if (pilotWait > 0) {
      pilotWait -= dt;
      return;
    }
    if (pilotAt < 0) pilotAt = pilotPlan(dt);
    if (pilotAt < 0) return; // nothing safe in sight: look again next frame
    if (pilotAt > 0) {
      pilotAt -= 1;
      return;
    }
    pilotAt = -1;
    pilotSpin(8, dt);
    if (!pilotProbe(0, dt).ok) return;
    throwBlade();
    pilotWait = 0.14 + prand() * 0.2;
  }

  function update(dt) {
    stepCosmetic(dt);
    if (transition) {
      stepTransition(dt);
      return;
    }
    spinStep(dt);
    if (flying) moveFlying(dt);
    if (failed) return;
    if (pendingClear >= 0) {
      pendingClear -= dt;
      if (pendingClear < 0) clearStage();
      return;
    }
    if (queued && !flying && knifeIn >= 0.65 && introT >= 0.35) {
      queued = false;
      throwBlade();
    }
  }

  function idle(dt) {
    stepCosmetic(dt);
    if (transition) stepTransition(dt);
    if (api.state === 'ready' && !failed) spinStep(dt * 0.8);
  }

  reset();
  if (typeof window !== 'undefined' && window.__raDebug && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__raDebug[api.meta.slug] = { get stage() { return stage; }, get theta() { return theta; }, get flying() { return flying; }, get transition() { return transition; } };

  // ---------- rendering ----------
  function ensureGrads(g) {
    if (gctx === g) return;
    gctx = g;
    spotN = g.createRadialGradient(CX, CY, 20, CX, CY, 520);
    spotN.addColorStop(0, '#4a2c6e');
    spotN.addColorStop(0.5, '#2a1846');
    spotN.addColorStop(1, '#140a24');
    spotB = g.createRadialGradient(CX, CY, 20, CX, CY, 520);
    spotB.addColorStop(0, '#6a1f3a');
    spotB.addColorStop(0.5, '#3a1230');
    spotB.addColorStop(1, '#160818');
    shadeN = g.createRadialGradient(-R_NORMAL * 0.35, -R_NORMAL * 0.4, R_NORMAL * 0.1, 0, 0, R_NORMAL);
    shadeN.addColorStop(0, 'rgba(255,255,255,0.16)');
    shadeN.addColorStop(0.6, 'rgba(255,255,255,0)');
    shadeN.addColorStop(1, 'rgba(0,0,0,0.28)');
    shadeB = g.createRadialGradient(-R_BOSS * 0.35, -R_BOSS * 0.4, R_BOSS * 0.1, 0, 0, R_BOSS);
    shadeB.addColorStop(0, 'rgba(255,255,255,0.16)');
    shadeB.addColorStop(0.6, 'rgba(255,255,255,0)');
    shadeB.addColorStop(1, 'rgba(0,0,0,0.3)');
  }

  function drawStuck(g, b, R) {
    g.save();
    g.rotate(b.a);
    g.translate(R - EMBED, 0);
    g.rotate(-HALF_PI);
    drawBlade(g, null);
    if (b.flash > 0) {
      g.globalAlpha = b.flash;
      drawBlade(g, failed && b === failBlade ? '#ff3d5a' : '#ffffff');
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function drawHud(g) {
    const k = stage.k;
    const first = Math.floor((k - 1) / 5) * 5 + 1;
    draw.text(g, stage.label, W / 2, 108, { size: 16, weight: 800, color: stage.boss ? '#ff5a6e' : 'rgba(255,255,255,0.8)', shadow: false });
    for (let i = 0; i < 5; i++) {
      const sk = first + i;
      const x = W / 2 + (i - 2) * 26;
      const y = 132;
      const done = sk < k || (sk === k && transition);
      const cur = sk === k && !transition;
      if (sk % 5 === 0) {
        g.save();
        g.translate(x, y);
        g.rotate(Math.PI / 4);
        const s = cur ? 9 + Math.sin(clock * 6) * 1.2 : 7.5;
        g.fillStyle = done ? '#ffd23f' : cur ? '#ff3d5a' : 'rgba(255,61,90,0.35)';
        g.fillRect(-s, -s, s * 2, s * 2);
        g.restore();
      } else {
        g.fillStyle = done ? '#ffd23f' : cur ? '#ffffff' : 'rgba(255,255,255,0.22)';
        g.beginPath();
        g.arc(x, y, cur ? 7 : 5.5, 0, TAU);
        g.fill();
        if (cur) {
          g.strokeStyle = 'rgba(255,255,255,0.4)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(x, y, 11 + Math.sin(clock * 6), 0, TAU);
          g.stroke();
        }
      }
    }
    // remaining blades (bottom-left column)
    const total = stage.need;
    for (let i = 0; i < total; i++) {
      const y = 704 - i * 21;
      const avail = i < stage.left;
      g.save();
      g.translate(28, y);
      g.rotate(-Math.PI / 4);
      g.globalAlpha = avail ? 1 : 0.22;
      g.fillStyle = avail ? '#ffffff' : '#8a7aa8';
      g.beginPath();
      g.moveTo(0, -12);
      g.lineTo(3.5, -6);
      g.lineTo(3.5, 2);
      g.lineTo(-3.5, 2);
      g.lineTo(-3.5, -8);
      g.closePath();
      g.fill();
      g.fillStyle = avail ? '#ffc93c' : '#8a7aa8';
      g.fillRect(-5, 2, 10, 2.5);
      g.fillStyle = avail ? '#a0522d' : '#8a7aa8';
      g.fillRect(-2.2, 4.5, 4.4, 8);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  return {
    reset,
    update,
    idle,
    demo,
    forwardStartInput: true,
    input(e) {
      if (e.type === 'down' || (e.type === 'keydown' && !e.repeat && api.isTapKey(e.key))) {
        throwBlade();
        return true;
      }
      return false;
    },
    revive() {
      if (failBlade) {
        const i = stage.stuck.indexOf(failBlade);
        if (i >= 0) stage.stuck.splice(i, 1);
      }
      failBlade = null;
      failed = false;
      bounce = null;
      flying = null;
      queued = false;
      stage.left += 1;
      knifeIn = 0;
      api.fx.ring(CX, CY, { color: '#7cf7ff', radius: stage.R * 1.5, life: 0.5, width: 5 });
    },
    render(g) {
      ensureGrads(g);
      drawBackground(g, W, H, stage.boss && !transition ? spotB : spotN);
      // dust
      g.fillStyle = '#ffffff';
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        g.globalAlpha = 0.12 + 0.1 * Math.sin(clock * 2 + m.p);
        g.fillRect(m.x, m.y, m.s, m.s);
      }
      g.globalAlpha = 1;
      drawHud(g);
      const R = stage.R;
      if (!transition) {
        const sc = introT < 1 ? Math.max(0.01, ease.outBack(introT)) : 1;
        const oy = -kick * 7;
        // shadow
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath();
        g.ellipse(CX, CY + 12, R * sc, R * sc, 0, 0, TAU);
        g.fill();
        g.save();
        g.translate(CX, CY + oy);
        g.scale(sc, sc);
        g.save();
        g.rotate(theta);
        const st = stage.stuck;
        for (let i = 0; i < st.length; i++) drawStuck(g, st[i], R);
        drawLog(g, R, stage.pal, stage.boss);
        const fr = stage.fruits;
        for (let i = 0; i < fr.length; i++) {
          const f = fr[i];
          if (!f.alive) continue;
          g.save();
          g.rotate(f.a);
          g.translate(R + 11, 0);
          g.rotate(HALF_PI);
          if (f.kind === 'gem') drawGem(g, 0, 0);
          else drawApple(g, 0, 0);
          g.restore();
        }
        g.restore();
        // fixed lighting over the rotating log
        g.fillStyle = stage.boss ? shadeB : shadeN;
        g.beginPath();
        g.arc(0, 0, R, 0, TAU);
        g.fill();
        if (hitFlash > 0) {
          g.globalAlpha = hitFlash * 0.22;
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(0, 0, R, 0, TAU);
          g.fill();
          g.globalAlpha = 1;
        }
        g.restore();
      } else {
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i];
          g.save();
          g.translate(c.x, c.y);
          g.rotate(c.rot);
          g.beginPath();
          g.moveTo(0, 0);
          g.arc(0, 0, c.R, c.a0, c.a0 + TAU / 8);
          g.closePath();
          g.save();
          g.clip();
          drawLog(g, c.R, c.pal, c.boss);
          g.restore();
          g.strokeStyle = 'rgba(0,0,0,0.3)';
          g.lineWidth = 2;
          g.stroke();
          g.restore();
        }
      }
      for (let i = 0; i < flyers.length; i++) {
        const f = flyers[i];
        g.save();
        g.translate(f.x, f.y);
        g.rotate(f.ang);
        g.translate(0, -BLADE_LEN / 2);
        drawBlade(g, null);
        g.restore();
      }
      for (let i = 0; i < halves.length; i++) {
        const h = halves[i];
        g.save();
        g.translate(h.x, h.y);
        g.rotate(h.rot);
        g.globalAlpha = Math.min(1, h.life * 2);
        if (h.kind === 'gem') {
          g.beginPath();
          g.rect(h.side < 0 ? -16 : 0, -18, 16, 36);
          g.clip();
          drawGem(g, 0, 0);
        } else drawAppleHalf(g, h.side);
        g.restore();
      }
      g.globalAlpha = 1;
      // flying blade + motion trail
      if (flying) {
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(CX - 3, flying.y + 20, 6, 90);
        g.save();
        g.translate(CX, flying.y);
        drawBlade(g, null);
        g.restore();
      }
      // ready blade
      if (!flying && !failed && !transition && stage.left > 0 && pendingClear < 0) {
        const k = ease.outCubic(knifeIn);
        g.save();
        g.globalAlpha = k;
        g.translate(CX, THROW_Y + (1 - k) * 60);
        drawBlade(g, null);
        g.restore();
        g.globalAlpha = 1;
      }
      if (bounce) {
        g.save();
        g.translate(bounce.x, bounce.y);
        g.rotate(bounce.rot);
        g.translate(0, -BLADE_LEN / 2);
        drawBlade(g, null);
        g.restore();
      }
    },
  };
}

/** Key art: a spinning log bristling with blades, a blade in flight and a sliced apple. Text-free. */
export function cover(g, w, h) {
  const s = h / 600;
  const grad = g.createRadialGradient(w / 2, h * 0.46, 10, w / 2, h * 0.46, Math.max(w, h) * 0.75);
  grad.addColorStop(0, '#5a3486');
  grad.addColorStop(0.45, '#2c1848');
  grad.addColorStop(1, '#120820');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // light rays
  g.save();
  g.translate(w / 2, h * 0.42);
  g.fillStyle = 'rgba(255,220,160,0.05)';
  for (let i = 0; i < 12; i++) {
    g.rotate(TAU / 12);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.max(w, h), -60 * s);
    g.lineTo(Math.max(w, h), 60 * s);
    g.closePath();
    g.fill();
  }
  g.restore();
  // chips
  const chips = [
    [-0.3, 0.2, 0.6],
    [0.28, 0.12, 1.2],
    [-0.22, -0.3, 2.1],
    [0.34, -0.22, 0.3],
    [-0.4, -0.05, 1.7],
    [0.42, 0.28, 2.6],
  ];
  const cx = w / 2;
  const cy = h * 0.42;
  const k = 1.36 * s;
  for (const [dx, dy, r] of chips) {
    g.save();
    g.translate(cx + dx * w * 0.9, cy + dy * h);
    g.rotate(r);
    g.fillStyle = r > 1.5 ? '#f3c98f' : '#b77b45';
    g.fillRect(-7 * s, -4 * s, 14 * s, 8 * s);
    g.restore();
  }
  g.save();
  g.translate(cx, cy);
  g.scale(k, k);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.arc(0, 10, R_NORMAL, 0, TAU);
  g.fill();
  g.save();
  g.rotate(0.3);
  const angles = [-2.2, -1.2, -0.5, 0.35, 2.55, 3.4];
  for (const a of angles) {
    g.save();
    g.rotate(a);
    g.translate(R_NORMAL - EMBED, 0);
    g.rotate(-HALF_PI);
    drawBlade(g, null);
    g.restore();
  }
  drawLog(g, R_NORMAL, PALS[0], false);
  g.restore();
  const shade = g.createRadialGradient(-R_NORMAL * 0.35, -R_NORMAL * 0.4, R_NORMAL * 0.1, 0, 0, R_NORMAL);
  shade.addColorStop(0, 'rgba(255,255,255,0.16)');
  shade.addColorStop(0.6, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = shade;
  g.beginPath();
  g.arc(0, 0, R_NORMAL, 0, TAU);
  g.fill();
  // sliced apple halves popping off the rim
  g.save();
  g.translate(-R_NORMAL * 1.02, R_NORMAL * 0.58);
  g.rotate(-0.7);
  g.scale(1.3, 1.3);
  drawAppleHalf(g, -1);
  g.restore();
  g.save();
  g.translate(-R_NORMAL * 0.7, R_NORMAL * 0.98);
  g.rotate(0.8);
  g.scale(1.3, 1.3);
  drawAppleHalf(g, 1);
  g.restore();
  // gem on the rim
  g.save();
  g.rotate(-1.4);
  g.translate(R_NORMAL + 11, 0);
  g.rotate(HALF_PI);
  drawGem(g, 0, 0);
  g.restore();
  // incoming blade with motion streaks
  const by = R_NORMAL + 30;
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(-3, by + 90, 6, 70);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(-12, by + 100, 3, 40);
  g.fillRect(9, by + 104, 3, 36);
  g.save();
  g.translate(0, by);
  drawBlade(g, null);
  g.restore();
  g.restore();
}
