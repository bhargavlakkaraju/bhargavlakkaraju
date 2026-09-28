// Snow Sumo - bump your friends off a shrinking ice floe (party kit, 1 to 4 players).
//
// Every player is a snowball with an arrow circling it. HOLD to dig in and charge (the
// arrow freezes, a power ring fills and you are harder to shove), RELEASE to dash along
// the arrow. Collisions are bouncy and weighted by size, snowballs grow as they roll, and
// every few seconds the floe cracks and a ring of ice breaks away. Fall in and you are out;
// the last snowball on the ice takes the crown.
import { createParty } from '../engine/party.js';
import * as draw from '../engine/draw.js';

const CX = 210;
const CY = 372;
const FLOE_R0 = 182;
const BALL_R0 = 19;
const GROW_MAX = 12; // extra radius from rolling
const GROW_RATE = 0.0042; // radius gained per px rolled
const AIM_SPIN = 3.3; // rad/s while the button is up
const CHARGE_TIME = 0.8; // seconds to a full power dash
const DASH_MIN = 110;
const DASH_MAX = 610;
const FRICTION_K = 1.45; // exponential ice drag
const FRICTION_C = 34; // constant drag (px/s^2), so slides come to a stop
const BRAKE_K = 4.6; // drag while charging (digging in)
const BRACE_MASS = 1.6; // mass multiplier while charging
const RESTITUTION = 0.8;
const BUMP = 60; // minimum separation speed after a collision
const SHRINK_EVERY = 8;
const SHRINK_WARN = 1.9;
const SHRINK_STEP = 25;
const TAU = Math.PI * 2;

const SPAWNS = [
  [-96, 96],
  [96, 96],
  [96, -96],
  [-96, -96],
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapPi = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
// deterministic jitter in [-1, 1] (cosmetic shapes stay put between frames)
const jit = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

// Distance a dash of speed v0 slides on bare ice before it stops.
function slideDist(v0) {
  const k = FRICTION_K;
  const c = FRICTION_C;
  return v0 / k - (c / (k * k)) * Math.log(1 + (k * v0) / c);
}
const dashSpeed = (power) => DASH_MIN + (DASH_MAX - DASH_MIN) * power;

// Snow speckles on the unit sphere (golden spiral) - they roll with the ball.
function makeSpeckles() {
  const pts = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - z * z);
    const a = i * 2.39996;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, z]);
  }
  return pts;
}

function rollSpeckles(pts, vx, vy, dist, r) {
  const sp = Math.hypot(vx, vy);
  if (sp < 1e-3 || dist <= 0) return;
  const kx = -vy / sp;
  const ky = vx / sp;
  const th = dist / r;
  const c = Math.cos(th);
  const s = Math.sin(th);
  for (const p of pts) {
    // Rodrigues rotation about k = (kx, ky, 0)
    const [x, y, z] = p;
    const kv = kx * x + ky * y;
    const cx = ky * z;
    const cy = -kx * z;
    const cz = kx * y - ky * x;
    let nx = x * c + cx * s + kx * kv * (1 - c);
    let ny = y * c + cy * s + ky * kv * (1 - c);
    let nz = z * c + cz * s;
    const l = Math.hypot(nx, ny, nz) || 1;
    p[0] = nx / l;
    p[1] = ny / l;
    p[2] = nz / l;
  }
}

// ---------- art ----------
function drawBall(g, x, y, r, color, o = {}) {
  const T = o.t || 0;
  // shadow
  g.fillStyle = 'rgba(10,30,70,0.28)';
  g.beginPath();
  g.ellipse(x + r * 0.16, y + r * 0.42, r * 1.02, r * 0.78, 0, 0, TAU);
  g.fill();
  // body
  const grad = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#eef6ff');
  grad.addColorStop(1, '#a9c8ea');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  // rolling speckles
  if (o.speckles) {
    const pts = o.speckles;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p[2] <= 0.05) continue;
      const k = p[2];
      g.globalAlpha = Math.min(1, k * 1.4);
      g.fillStyle = i % 3 === 0 ? '#9fbfe0' : color;
      g.beginPath();
      g.ellipse(x + p[0] * r * 0.9, y + p[1] * r * 0.9, r * 0.12 * (0.45 + 0.55 * k), r * 0.12 * k, Math.atan2(p[1], p[0]), 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  // colored rim
  g.strokeStyle = color;
  g.lineWidth = Math.max(2.5, r * 0.17);
  g.beginPath();
  g.arc(x, y, r - g.lineWidth * 0.5, 0, TAU);
  g.stroke();
  // shine
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.ellipse(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.13, -0.7, 0, TAU);
  g.fill();
  // face: eyes look where the arrow points
  const a = o.look ?? 0;
  const ex = Math.cos(a);
  const ey = Math.sin(a);
  const fx0 = x + ex * r * 0.32;
  const fy0 = y + ey * r * 0.32;
  const px = -ey * r * 0.27;
  const py = ex * r * 0.27;
  const er = r * 0.2;
  for (let s = -1; s <= 1; s += 2) {
    const cx = fx0 + px * s;
    const cy = fy0 + py * s;
    if (o.dead) {
      g.strokeStyle = '#1b2240';
      g.lineWidth = Math.max(1.6, r * 0.09);
      g.beginPath();
      g.moveTo(cx - er * 0.7, cy - er * 0.7);
      g.lineTo(cx + er * 0.7, cy + er * 0.7);
      g.moveTo(cx + er * 0.7, cy - er * 0.7);
      g.lineTo(cx - er * 0.7, cy + er * 0.7);
      g.stroke();
      continue;
    }
    const blink = Math.sin(T * 1.7 + (o.seed || 0) * 3.1) > 0.985;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(cx, cy, er, blink ? er * 0.15 : er, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(27,34,64,0.35)';
    g.lineWidth = 1;
    g.stroke();
    if (!blink) {
      g.fillStyle = '#1b2240';
      g.beginPath();
      g.arc(cx + ex * er * 0.38, cy + ey * er * 0.38, er * 0.55, 0, TAU);
      g.fill();
    }
    if (o.angry) {
      // brows slanting in toward the middle of the face
      const bx = cx - ex * er * 1.25;
      const by = cy - ey * er * 1.25;
      g.strokeStyle = '#1b2240';
      g.lineWidth = Math.max(1.8, r * 0.1);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx + px * s * 0.55, by + py * s * 0.55);
      g.lineTo(bx + ex * er * 0.55 - px * s * 0.1, by + ey * er * 0.55 - py * s * 0.1);
      g.stroke();
    }
  }
}

function floePath(g, cx, cy, R, seed, n = 72) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = (k / n) * TAU;
    const rr = R + jit(k, seed) * 2.6 + jit(k * 3 + 1, seed) * 1.4;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
}

// Little floes drifting past in the open water (cosmetic).
const BITS = [];
for (let i = 0; i < 9; i++) {
  const pts = [];
  const n = 7;
  const r = 7 + Math.abs(jit(i, 21)) * 12;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const rr = r * (0.7 + Math.abs(jit(i * 9 + k, 22)) * 0.4);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8]);
  }
  BITS.push({ pts, x: Math.abs(jit(i, 23)), band: i % 3, off: Math.abs(jit(i, 24)), sp: 5 + Math.abs(jit(i, 25)) * 7, dir: i % 2 ? 1 : -1 });
}

function drawSea(g, w, h, T, cx, cy) {
  const sg = g.createLinearGradient(0, 0, 0, h);
  sg.addColorStop(0, '#06142b');
  sg.addColorStop(0.5, '#0b2448');
  sg.addColorStop(1, '#071730');
  g.fillStyle = sg;
  g.fillRect(0, 0, w, h);
  // drifting ice bits in the open water above and below the floe
  for (const b of BITS) {
    const band = b.band === 0 ? [0.03, 0.2] : b.band === 1 ? [0.8, 0.97] : [0.08, 0.92];
    let x = (b.x * (w + 80) + b.dir * T * b.sp) % (w + 80);
    if (x < 0) x += w + 80;
    x -= 40;
    let y = h * (band[0] + (band[1] - band[0]) * b.off);
    if (b.band === 2) {
      x = b.dir > 0 ? 18 + b.off * 10 : w - 18 - b.off * 10;
      y = ((b.x * h + T * b.sp * 0.8) % (h * 0.84)) + h * 0.08;
    }
    const bob = Math.sin(T * 1.2 + b.off * 9) * 1.2;
    g.save();
    g.translate(x, y + bob);
    g.beginPath();
    b.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 4) : g.moveTo(p[0], p[1] + 4)));
    g.closePath();
    g.fillStyle = 'rgba(70,130,190,0.55)';
    g.fill();
    g.beginPath();
    b.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.fillStyle = 'rgba(210,232,250,0.8)';
    g.fill();
    g.restore();
  }
  // swell highlights drifting slowly
  g.strokeStyle = 'rgba(120,190,255,0.13)';
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 46; i++) {
    const gx = ((i * 97.3) % w) + Math.sin(T * 0.6 + i) * 8;
    const gy = ((i * 61.7 + T * 6) % (h + 40)) - 20;
    const l = 10 + (i % 4) * 6;
    g.moveTo(gx - l, gy);
    g.quadraticCurveTo(gx, gy - 4 - Math.sin(T * 1.3 + i) * 2, gx + l, gy);
  }
  g.stroke();
  // soft dark halo under the floe
  if (cx != null) {
    const hg = g.createRadialGradient(cx, cy + 10, 60, cx, cy + 10, 290);
    hg.addColorStop(0, 'rgba(0,8,24,0.55)');
    hg.addColorStop(1, 'rgba(0,8,24,0)');
    g.fillStyle = hg;
    g.fillRect(0, 0, w, h);
  }
}

function drawFloe(g, cx, cy, R, seed, T, patches) {
  if (R <= 2) return;
  const TH = 14;
  // foam line where the ice meets the water
  g.save();
  g.translate(0, TH);
  floePath(g, cx, cy, R + 3 + Math.sin(T * 2) * 1.2, seed);
  g.fillStyle = 'rgba(200,235,255,0.18)';
  g.fill();
  g.restore();
  // ice thickness (the side you see below the top face)
  g.save();
  g.translate(0, TH);
  floePath(g, cx, cy, R, seed);
  const sideG = g.createLinearGradient(0, cy - R, 0, cy + R + TH);
  sideG.addColorStop(0, '#3f78b4');
  sideG.addColorStop(1, '#5d9ad3');
  g.fillStyle = sideG;
  g.fill();
  g.restore();
  // top face
  floePath(g, cx, cy, R, seed);
  const tg = g.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
  tg.addColorStop(0, '#fbfdff');
  tg.addColorStop(0.7, '#e3f0fb');
  tg.addColorStop(1, '#bcd9f2');
  g.fillStyle = tg;
  g.fill();
  // snow drifts and hairline cracks, clipped to the ice
  g.save();
  floePath(g, cx, cy, R - 1, seed);
  g.clip();
  if (patches) {
    for (const pt of patches) {
      g.fillStyle = pt.c;
      g.beginPath();
      g.ellipse(cx + pt.x, cy + pt.y, pt.rx, pt.ry, pt.a, 0, TAU);
      g.fill();
    }
  }
  g.strokeStyle = 'rgba(120,160,210,0.28)';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = jit(i, 7) * Math.PI;
    const r0 = 30 + Math.abs(jit(i, 9)) * 90;
    let x = cx + Math.cos(a) * r0;
    let y = cy + Math.sin(a) * r0;
    g.moveTo(x, y);
    for (let k = 1; k < 4; k++) {
      x += Math.cos(a + jit(i * 5 + k, 3) * 0.8) * 14;
      y += Math.sin(a + jit(i * 5 + k, 3) * 0.8) * 14;
      g.lineTo(x, y);
    }
  }
  g.stroke();
  g.restore();
  // bright rim
  floePath(g, cx, cy, R, seed);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 2.5;
  g.stroke();
}

// ---------- sounds ----------
function sndDash(sfx, power) {
  sfx.noise({ dur: 0.16 + power * 0.14, vol: 0.1 + power * 0.12, freq: 700, to: 2600, type: 'bandpass', q: 1.1 });
  sfx.tone({ freq: 180 + power * 120, to: 90, type: 'triangle', dur: 0.12, vol: 0.08 });
}
function sndBump(sfx, k) {
  sfx.noise({ dur: 0.14, vol: 0.12 + k * 0.25, freq: 900, to: 160 });
  sfx.tone({ freq: 190 - k * 60, to: 70, type: 'sine', dur: 0.14, vol: 0.12 + k * 0.2 });
}
function sndCreak(sfx) {
  sfx.noise({ dur: 0.35, vol: 0.12, freq: 3200, to: 900, type: 'bandpass', q: 3 });
  sfx.tone({ freq: 90, to: 60, type: 'sawtooth', dur: 0.3, vol: 0.04 });
}
function sndBreak(sfx) {
  sfx.noise({ dur: 0.6, vol: 0.32, freq: 1800, to: 120 });
  sfx.tone({ freq: 120, to: 40, type: 'sine', dur: 0.5, vol: 0.28 });
}
function sndSplash(sfx) {
  sfx.noise({ dur: 0.5, vol: 0.3, freq: 2400, to: 300, type: 'bandpass', q: 0.7 });
  sfx.noise({ dur: 0.25, vol: 0.18, freq: 500, to: 120, delay: 0.05 });
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const fx = api.fx;

  let R = FLOE_R0; // current floe radius
  let clock = 0; // play time (drives the shrink schedule)
  let ctime = 0; // cosmetic time (snowfall), also advanced by idle()
  let nextShrink = SHRINK_EVERY;
  let warn = null; // { r, t, seeds, cuts } while the next ring is cracking
  let chunks = [];
  let ripples = [];
  let flakes = [];
  let patches = [];
  let seed = 1;
  let wind = { a: 0, s: 0 };

  const shrinkEvery = (ctx) => (ctx.twist.id === 'meltdown' ? 4.6 : SHRINK_EVERY);

  function makePatches() {
    patches = [];
    for (let i = 0; i < 16; i++) {
      const a = jit(i, seed + 4) * Math.PI;
      const d = Math.abs(jit(i, seed + 5)) * (FLOE_R0 - 16);
      patches.push({
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        rx: 14 + Math.abs(jit(i, seed + 6)) * 26,
        ry: 8 + Math.abs(jit(i, seed + 7)) * 12,
        a: jit(i, seed + 8) * Math.PI,
        c: i % 3 === 0 ? 'rgba(150,190,230,0.13)' : 'rgba(255,255,255,0.6)',
      });
    }
  }

  function setup(ctx) {
    R = FLOE_R0;
    clock = 0;
    nextShrink = shrinkEvery(ctx) - 1.5; // the first crack comes a little early
    warn = null;
    chunks = [];
    ripples = [];
    seed = ctx.rng.int(1, 999);
    makePatches();
    wind = { a: ctx.rng() * TAU, s: 0, t: 0 };
    flakes = [];
    for (let i = 0; i < 44; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, z: 0.4 + Math.random() * 0.6, ph: Math.random() * TAU });
    const size = ctx.size;
    for (const p of ctx.active) {
      const [ox, oy] = SPAWNS[p.i];
      p.x = CX + ox;
      p.y = CY + oy;
      p.data.vx = 0;
      p.data.vy = 0;
      p.data.grow = 0;
      p.data.r = BALL_R0 * size;
      p.data.aim = Math.atan2(-oy, -ox);
      p.data.charge = 0;
      p.data.speck = makeSpeckles();
      p.data.fall = null;
      p.data.trail = [];
      p.data.lastHit = -1;
      p.data.lastHitT = -9;
      p.data.squash = 0;
    }
  }

  const radius = (p, ctx) => (BALL_R0 + p.data.grow) * ctx.size;
  const mass = (p, ctx) => {
    const r = radius(p, ctx);
    return r * r * (p.down ? BRACE_MASS : 1);
  };

  // ---------- floe shrinking ----------
  function startWarn(ctx) {
    const r = Math.max(0, R - SHRINK_STEP);
    const n = Math.max(5, Math.round(R / 20));
    const cuts = [];
    const off = ctx.rng() * TAU;
    for (let i = 0; i < n; i++) cuts.push(off + ((i + 0.5 + (ctx.rng() - 0.5) * 0.5) / n) * TAU);
    warn = { r, t: 0, cuts, seeds: [off, off + Math.PI * 0.5, off + Math.PI, off + Math.PI * 1.5] };
    sndCreak(api.sfx);
  }

  function breakRing(ctx) {
    const rIn = warn.r;
    const rOut = R;
    const cuts = warn.cuts;
    for (let i = 0; i < cuts.length; i++) {
      const a0 = cuts[i];
      const a1 = cuts[(i + 1) % cuts.length] + (i === cuts.length - 1 ? TAU : 0);
      const pts = [];
      const steps = 6;
      for (let k = 0; k <= steps; k++) {
        const a = a0 + ((a1 - a0) * k) / steps;
        const rr = rOut + jit(i * 13 + k, seed) * 2.5;
        pts.push([CX + Math.cos(a) * rr, CY + Math.sin(a) * rr]);
      }
      for (let k = steps; k >= 0; k--) {
        const a = a0 + ((a1 - a0) * k) / steps;
        const rr = Math.max(0, rIn + jit(i * 17 + k, seed + 3) * 4);
        pts.push([CX + Math.cos(a) * rr, CY + Math.sin(a) * rr]);
      }
      let mx = 0;
      let my = 0;
      for (const p of pts) {
        mx += p[0];
        my += p[1];
      }
      mx /= pts.length;
      my /= pts.length;
      const am = Math.atan2(my - CY, mx - CX);
      const sp = 22 + Math.random() * 22;
      chunks.push({
        pts: pts.map((p) => [p[0] - mx, p[1] - my]),
        x: mx,
        y: my,
        vx: Math.cos(am) * sp,
        vy: Math.sin(am) * sp,
        rot: 0,
        vr: (Math.random() - 0.5) * 0.7,
        t: 0,
      });
    }
    R = rIn;
    warn = null;
    nextShrink = clock + shrinkEvery(ctx);
    fx.shake(7, 0.35);
    sndBreak(api.sfx);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      fx.burst(CX + Math.cos(a) * (rIn + 10), CY + Math.sin(a) * (rIn + 10), { count: 2, colors: ['#ffffff', '#cfe6f7'], speed: 90, life: 0.5, gravity: 0, size: 3 });
    }
  }

  // ---------- falling in ----------
  function fallIn(p, ctx) {
    const d = p.data;
    const r = radius(p, ctx);
    d.fall = { t: 0, x: p.x, y: p.y, vx: d.vx * 0.5, vy: d.vy * 0.5, r };
    ctx.eliminate(p, { x: p.x, y: p.y });
    fx.burst(p.x, p.y, { count: 26, colors: ['#ffffff', '#bfe6ff', '#6fc3ff'], speed: 240, life: 0.7, gravity: 380, drag: 0.96, size: 4.5, angle: -Math.PI / 2, spread: Math.PI * 1.3 });
    ripples.push({ x: p.x, y: p.y, t: 0, r: r });
    ripples.push({ x: p.x, y: p.y, t: -0.18, r: r });
    sndSplash(api.sfx);
    const recent = d.lastHit >= 0 && clock - d.lastHitT < 2.5;
    const words = ['SPLASH!', 'SPLOOSH!', 'BYE!', 'BRRR!'];
    const tx = clamp(p.x, 60, W - 60);
    const ty = clamp(p.y - 36, 110, H - 110);
    fx.text(tx, ty, recent ? words[Math.floor(Math.random() * words.length)] : 'OOPS!', { color: '#ffffff', size: 26, life: 1.1, stroke: p.color });
  }

  // ---------- update ----------
  function update(dt, ctx) {
    clock += dt;
    const act = ctx.active;

    // blizzard wind: slowly swinging direction, gusting strength
    if (ctx.twist.id === 'blizzard') {
      wind.t += dt;
      wind.a += Math.sin(wind.t * 0.35) * 0.35 * dt;
      wind.s = 62 + Math.sin(wind.t * 1.1) * 26;
    } else wind.s = 0;

    // floe schedule
    if (!warn && R > 0 && clock >= nextShrink - SHRINK_WARN) startWarn(ctx);
    if (warn) {
      warn.t += dt;
      if (Math.random() < dt * 6) api.sfx.noise({ dur: 0.05, vol: 0.05, freq: 3000 + Math.random() * 2000, type: 'highpass' });
      if (clock >= nextShrink) breakRing(ctx);
    }

    for (const p of act) {
      if (!p.alive) continue;
      const d = p.data;
      const r = radius(p, ctx);
      // release first: the dash goes where the arrow was frozen
      if (p.release) {
        const power = clamp(d.charge / CHARGE_TIME, 0.06, 1);
        const sp = dashSpeed(power);
        const dx = Math.cos(d.aim);
        const dy = Math.sin(d.aim);
        d.vx = d.vx * 0.3 + dx * sp;
        d.vy = d.vy * 0.3 + dy * sp;
        d.charge = 0;
        d.squash = 1;
        fx.burst(p.x - dx * r, p.y - dy * r, { count: 6 + Math.round(power * 10), colors: ['#ffffff', '#dcecfb'], speed: 60 + power * 120, life: 0.45, gravity: 0, drag: 0.92, size: 3 + power * 2, angle: d.aim + Math.PI, spread: 1.2 });
        sndDash(api.sfx, power);
      }
      if (p.down) {
        if (p.tap && p.human) api.sfx.tone({ freq: 220, to: 520, type: 'triangle', dur: CHARGE_TIME, vol: 0.035 });
        d.charge = Math.min(CHARGE_TIME * 1.5, d.charge + dt);
      } else {
        d.aim += AIM_SPIN * dt;
        if (d.aim > TAU) d.aim -= TAU;
      }
      // ice drag (digging in while charging)
      const k = p.down ? BRAKE_K : FRICTION_K;
      const decay = Math.exp(-k * dt);
      d.vx *= decay;
      d.vy *= decay;
      let sp = Math.hypot(d.vx, d.vy);
      if (sp > 0) {
        const ns = Math.max(0, sp - FRICTION_C * dt);
        d.vx *= ns / sp;
        d.vy *= ns / sp;
        sp = ns;
      }
      if (wind.s > 0) {
        const push = wind.s * (BALL_R0 / (BALL_R0 + d.grow)) * (p.down ? 0.45 : 1);
        d.vx += Math.cos(wind.a) * push * dt;
        d.vy += Math.sin(wind.a) * push * dt;
      }
      p.x += d.vx * dt;
      p.y += d.vy * dt;
      const moved = sp * dt;
      if (moved > 0) {
        d.grow = Math.min(GROW_MAX, d.grow + moved * GROW_RATE);
        rollSpeckles(d.speck, d.vx, d.vy, moved, r);
      }
      d.squash = Math.max(0, d.squash - dt * 4);
      // skate marks
      const tr = d.trail;
      if (sp > 60) {
        const last = tr.length ? tr[tr.length - 1] : null;
        if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 7) tr.push({ x: p.x, y: p.y, t: 0, w: r * 0.5 });
      }
      for (const q of tr) q.t += dt;
      while (tr.length && tr[0].t > 1.6) tr.shift();
    }

    // collisions (two passes keeps piles stable)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < act.length; i++) {
        const a = act[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < act.length; j++) {
          const b = act[j];
          if (!b.alive) continue;
          collide(a, b, ctx, pass === 0);
        }
      }
    }

    // edge: centre past the rim means a swim
    for (const p of act) {
      if (!p.alive) continue;
      if (Math.hypot(p.x - CX, p.y - CY) > R) fallIn(p, ctx);
    }

    stepCosmetic(dt, ctx);
  }

  function collide(a, b, ctx, fxOn) {
    const ra = radius(a, ctx);
    const rb = radius(b, ctx);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = dx * dx + dy * dy;
    const min = ra + rb;
    if (d2 >= min * min || d2 < 1e-6) return;
    const dist = Math.sqrt(d2);
    const nx = dx / dist;
    const ny = dy / dist;
    const ma = mass(a, ctx);
    const mb = mass(b, ctx);
    const overlap = min - dist;
    a.x -= nx * overlap * (mb / (ma + mb));
    a.y -= ny * overlap * (mb / (ma + mb));
    b.x += nx * overlap * (ma / (ma + mb));
    b.y += ny * overlap * (ma / (ma + mb));
    const A = a.data;
    const B = b.data;
    const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if (rv >= 0) return;
    const inv = 1 / ma + 1 / mb;
    const j = Math.max((-(1 + RESTITUTION) * rv) / inv, BUMP / inv);
    A.vx -= (j / ma) * nx;
    A.vy -= (j / ma) * ny;
    B.vx += (j / mb) * nx;
    B.vy += (j / mb) * ny;
    A.lastHit = b.i;
    A.lastHitT = clock;
    B.lastHit = a.i;
    B.lastHitT = clock;
    if (!fxOn) return;
    const impact = -rv;
    const k = clamp(impact / 600, 0, 1);
    const hx = a.x + nx * ra;
    const hy = a.y + ny * ra;
    fx.burst(hx, hy, { count: 6 + Math.round(k * 18), colors: ['#ffffff', '#e4f1ff', a.color, b.color], speed: 80 + k * 260, life: 0.45, gravity: 0, drag: 0.9, size: 3 + k * 3 });
    if (k > 0.25) fx.ring(hx, hy, { color: '#ffffff', radius: 20 + k * 40, life: 0.3, width: 3 });
    fx.shake(2 + k * 9, 0.18 + k * 0.12);
    A.squash = Math.max(A.squash, 0.6 + k * 0.4);
    B.squash = Math.max(B.squash, 0.6 + k * 0.4);
    sndBump(api.sfx, k);
    if (k > 0.62) {
      const words = ['BONK!', 'POW!', 'WHUMP!', 'BOOF!'];
      fx.text(clamp(hx, 60, W - 60), clamp(hy - 26, 110, H - 110), words[Math.floor(Math.random() * words.length)], { color: '#ffd23f', size: 22, life: 0.7, rise: 40, stroke: 'rgba(16,8,31,0.6)' });
    }
    if ((a.human || b.human) && k > 0.3) api.haptic(20);
  }

  function stepCosmetic(dt, ctx) {
    ctime += dt;
    for (const c of chunks) {
      c.t += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= Math.exp(-0.6 * dt);
      c.vy *= Math.exp(-0.6 * dt);
      c.rot += c.vr * dt;
    }
    if (chunks.length && chunks[0].t > 2.6) chunks = chunks.filter((c) => c.t <= 2.6);
    for (const r of ripples) r.t += dt;
    if (ripples.length && ripples[0].t > 1.6) ripples = ripples.filter((r) => r.t <= 1.6);
    for (const p of ctx.active) {
      const f = p.data.fall;
      if (!f) continue;
      f.t += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.exp(-3 * dt);
      f.vy *= Math.exp(-3 * dt);
      if (f.t > 0.25 && f.t < 1.2 && Math.random() < dt * 8) fx.burst(f.x + (Math.random() - 0.5) * f.r, f.y, { count: 1, color: 'rgba(210,240,255,0.8)', speed: 20, life: 0.5, gravity: -40, size: 2.5 });
    }
    const wx = Math.cos(wind.a) * wind.s * 3.2;
    const wy = Math.sin(wind.a) * wind.s * 3.2;
    for (const f of flakes) {
      f.x += (wx + Math.sin(f.ph + ctime) * 12) * f.z * dt;
      f.y += (wy + 22) * f.z * dt;
      if (f.x < -10) f.x += W + 20;
      if (f.x > W + 10) f.x -= W + 20;
      if (f.y < -10) f.y += H + 20;
      if (f.y > H + 10) f.y -= H + 20;
    }
  }

  // Purely cosmetic, so it is safe to call in any phase (the lobby today).
  function idle(dt, ctx) {
    stepCosmetic(dt, ctx);
  }

  // ---------- bots ----------
  function edgeBehind(from, q) {
    // distance from q to the rim along the push direction (from -> q)
    let dx = q.x - from.x;
    let dy = q.y - from.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const ox = q.x - CX;
    const oy = q.y - CY;
    const b = ox * dx + oy * dy;
    const c = ox * ox + oy * oy - R * R;
    const disc = b * b - c;
    return disc < 0 ? 0 : -b + Math.sqrt(disc);
  }

  function decide(p, b, ctx) {
    const d = p.data;
    const rng = ctx.rng;
    const r = radius(p, ctx);
    const dm = Math.hypot(p.x - CX, p.y - CY);
    const edge = R - dm;
    const toC = Math.atan2(CY - p.y, CX - p.x);
    const sp = Math.hypot(d.vx, d.vy);
    const inwardSoon = warn ? warn.r - dm : edge;

    // 1) about to be shoved? dig in if the arrow already points somewhere safe
    for (const q of ctx.active) {
      if (q === p || !q.alive) continue;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 150) continue;
      const closing = ((q.data.vx - d.vx) * dx + (q.data.vy - d.vy) * dy) / (dist || 1);
      if (closing > 190) {
        const inward = Math.cos(d.aim - toC);
        if (inward > 0.2 && rng() < b.brace) return { press: true, hold: 0.3 + rng() * 0.3, kind: 'brace' };
      }
    }

    // 2) too close to the edge (or on the ring that is about to break): get back in
    if (edge < 34 + r * 0.6 || inwardSoon < r + 6 || (sp > 140 && edge < 70 && ((d.vx * (p.x - CX) + d.vy * (p.y - CY)) / (dm || 1)) > 90)) {
      const power = clamp((Math.min(dm, R * 0.6) + 20) / 260, 0.25, 0.75) + (rng() - 0.5) * 0.1;
      return { want: toC + (rng() - 0.5) * 0.35, hold: power * CHARGE_TIME, kind: 'recover' };
    }

    // 3) bump the rival with the least ice behind it
    let best = null;
    let bestScore = Infinity;
    for (const q of ctx.active) {
      if (q === p || !q.alive) continue;
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      const sc = edgeBehind(p, q) + dist * 0.35 + (q.down ? 30 : 0) + (rng() - 0.5) * 30;
      if (sc < bestScore) {
        bestScore = sc;
        best = q;
      }
    }
    if (best) {
      const dist = Math.hypot(best.x - p.x, best.y - p.y);
      const behind = edgeBehind(p, best);
      let power = clamp(0.22 + dist / 420 + (behind < 60 ? 0.25 : 0) + (rng() - 0.5) * 0.25, 0.18, 1);
      // don't fling ourselves off if we miss (unless we feel lucky)
      const aimA = Math.atan2(best.y - p.y, best.x - p.x);
      if (rng() > b.risk) {
        for (let tries = 0; tries < 6; tries++) {
          const s = slideDist(dashSpeed(power));
          const ex = p.x + Math.cos(aimA) * s;
          const ey = p.y + Math.sin(aimA) * s;
          if (Math.hypot(ex - CX, ey - CY) < R - r * 0.5) break;
          power *= 0.8;
        }
      }
      return { want: aimA, target: best, hold: power * CHARGE_TIME, kind: 'attack' };
    }
    return null;
  }

  function bot(p, dt, ctx) {
    const d = p.data;
    const rng = ctx.rng;
    let b = d.bot;
    if (!b) {
      b = d.bot = {
        mode: 'idle',
        think: 0.2 + rng() * 0.5,
        t: 0,
        hold: 0,
        want: 0,
        target: null,
        aimT: 0,
        retarget: 0,
        err: 0,
        noise: 0.09 + rng() * 0.1,
        risk: 0.1 + rng() * 0.2,
        brace: 0.35 + rng() * 0.4,
        calm: 0.35 + rng() * 0.45,
      };
    }
    if (b.mode === 'charge') {
      b.t += dt;
      if (b.t >= b.hold) {
        b.mode = 'idle';
        b.think = b.calm + rng() * 0.3;
        return false;
      }
      return true;
    }
    if (b.mode === 'aim') {
      b.aimT -= dt;
      b.retarget -= dt;
      if (b.target && b.retarget <= 0) {
        b.retarget = 0.12;
        const q = b.target;
        if (!q.alive) {
          b.mode = 'idle';
          return false;
        }
        const dist = Math.hypot(q.x - p.x, q.y - p.y);
        const lead = dist / 420 + b.hold;
        b.want = Math.atan2(q.y + q.data.vy * lead - p.y, q.x + q.data.vx * lead - p.x);
      }
      const diff = wrapPi(b.want + b.err - d.aim);
      if (diff >= -0.03 && diff <= AIM_SPIN * dt + 0.02) {
        b.mode = 'charge';
        b.t = 0;
        return true;
      }
      if (b.aimT <= 0) b.mode = 'idle';
      return false;
    }
    b.think -= dt;
    if (b.think > 0) return false;
    b.think = 0.08 + rng() * 0.08;
    const plan = decide(p, b, ctx);
    if (!plan) return false;
    b.hold = plan.hold;
    if (plan.press) {
      b.mode = 'charge';
      b.t = 0;
      return true;
    }
    b.mode = 'aim';
    b.want = plan.want;
    b.target = plan.target || null;
    b.err = (rng() + rng() - 1) * b.noise;
    b.aimT = TAU / AIM_SPIN + 0.2;
    b.retarget = 0.12;
    return false;
  }

  // ---------- render ----------
  function render(g, ctx) {
    const T = api.totalTime;
    drawSea(g, W, H, T, CX, CY);

    // ripples on the water
    for (const rp of ripples) {
      if (rp.t < 0) continue;
      const k = rp.t / 1.6;
      g.strokeStyle = `rgba(200,235,255,${0.55 * (1 - k)})`;
      g.lineWidth = 2.5 * (1 - k) + 0.5;
      g.beginPath();
      g.ellipse(rp.x, rp.y, rp.r + k * 60, (rp.r + k * 60) * 0.62, 0, 0, TAU);
      g.stroke();
    }

    // sinking snowballs
    for (const p of ctx.active) {
      const f = p.data.fall;
      if (!f || f.t > 1.4) continue;
      const k = clamp(f.t / 1.2, 0, 1);
      g.save();
      g.globalAlpha = 1 - k;
      drawBall(g, f.x, f.y + k * 6, f.r * (1 - k * 0.45), p.color, { speckles: p.data.speck, look: p.data.aim, dead: true, t: T });
      g.restore();
      g.fillStyle = `rgba(20,70,140,${0.35 + k * 0.4})`;
      g.beginPath();
      g.ellipse(f.x, f.y + f.r * 0.3, f.r * 1.1, f.r * 0.5, 0, 0, TAU);
      g.fill();
    }

    // broken chunks drifting off and sinking
    for (const c of chunks) {
      const k = clamp(c.t / 2.6, 0, 1);
      g.save();
      g.translate(c.x, c.y + k * 10);
      g.rotate(c.rot);
      const sc = 1 - k * 0.2;
      g.scale(sc, sc);
      g.globalAlpha = 1 - k * k;
      g.beginPath();
      c.pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1] + 12 * (1 - k)) : g.moveTo(pt[0], pt[1] + 12 * (1 - k))));
      g.closePath();
      g.fillStyle = '#3f78b4';
      g.fill();
      g.beginPath();
      c.pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
      g.closePath();
      g.fillStyle = k < 0.5 ? '#dcecf9' : `rgba(170,205,235,${1 - k})`;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1.5;
      g.stroke();
      g.restore();
    }

    drawFloe(g, CX, CY, R, seed, T, patches);

    // the ring that is about to break: tinted, flickering, with cracks spreading around it
    if (warn) {
      const k = clamp(warn.t / SHRINK_WARN, 0, 1);
      g.save();
      floePath(g, CX, CY, R, seed);
      g.clip();
      g.fillStyle = `rgba(70,130,205,${0.1 + k * 0.22 + Math.sin(T * 18) * 0.05 * k})`;
      g.beginPath();
      g.arc(CX, CY, R + 6, 0, TAU);
      g.arc(CX, CY, Math.max(0, warn.r), 0, TAU, true);
      g.fill();
      g.restore();
      const reach = k * (Math.PI / 4 + 0.15);
      g.strokeStyle = `rgba(40,80,150,${0.55 + k * 0.4})`;
      g.lineWidth = 1.5 + k * 2;
      g.lineJoin = 'round';
      g.beginPath();
      const n = 96;
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        let near = Infinity;
        for (const s of warn.seeds) near = Math.min(near, Math.abs(wrapPi(a - s)));
        if (near > reach || warn.r <= 2) {
          pen = false;
          continue;
        }
        const rr = warn.r + jit(i, seed + 11) * 3.5;
        const x = CX + Math.cos(a) * rr;
        const y = CY + Math.sin(a) * rr;
        if (!pen) g.moveTo(x, y);
        else g.lineTo(x, y);
        pen = true;
      }
      if (k > 0.35) {
        for (const a of warn.cuts) {
          const e = clamp((k - 0.35) / 0.5, 0, 1);
          g.moveTo(CX + Math.cos(a) * warn.r, CY + Math.sin(a) * warn.r);
          const rr = warn.r + (R - warn.r) * e;
          g.lineTo(CX + Math.cos(a + 0.03) * rr, CY + Math.sin(a + 0.03) * rr);
        }
      }
      g.stroke();
    }

    // skate marks
    g.lineCap = 'round';
    for (const p of ctx.active) {
      const tr = p.data.trail;
      for (let i = 1; i < tr.length; i++) {
        const a = tr[i - 1];
        const b2 = tr[i];
        const k = 1 - b2.t / 1.6;
        if (Math.hypot(b2.x - CX, b2.y - CY) > R) continue;
        g.strokeStyle = `rgba(150,190,230,${0.35 * k})`;
        g.lineWidth = b2.w * k;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b2.x, b2.y);
        g.stroke();
      }
    }

    // snowballs
    const inPlay = ctx.phase !== 'lobby';
    const list = ctx.active.filter((p) => p.alive).sort((a, b) => a.y - b.y);
    for (const p of list) {
      const d = p.data;
      const r = radius(p, ctx);
      const power = clamp(d.charge / CHARGE_TIME, 0, 1);
      const full = p.down && power >= 1;
      const jx = full ? Math.sin(T * 70) * 1.2 : 0;
      // arrow
      if (inPlay) drawArrow(g, p, r, power);
      const sq = d.squash * 0.12;
      g.save();
      g.translate(p.x + jx, p.y);
      g.scale(1 + sq, 1 - sq);
      drawBall(g, 0, 0, r, p.color, { speckles: d.speck, look: d.aim, angry: p.down, t: T, seed: p.i });
      g.restore();
      if (p.down && inPlay) {
        g.strokeStyle = 'rgba(20,50,110,0.2)';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(p.x, p.y, r + 7, 0, TAU);
        g.stroke();
        g.strokeStyle = full ? (Math.sin(T * 30) > 0 ? '#ffffff' : p.color) : p.color;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(p.x, p.y, r + 7, -Math.PI / 2, -Math.PI / 2 + power * TAU);
        g.stroke();
      }
    }

    // snowfall (a proper storm in BLIZZARD)
    const storm = wind.s > 0;
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1.6;
    if (storm) {
      const wx = Math.cos(wind.a) * wind.s * 0.16;
      const wy = Math.sin(wind.a) * wind.s * 0.16;
      g.beginPath();
      for (const f of flakes) {
        g.moveTo(f.x, f.y);
        g.lineTo(f.x - wx * f.z * 2.2, f.y - wy * f.z * 2.2 - 3);
      }
      g.stroke();
    } else {
      for (let i = 0; i < flakes.length; i += 2) {
        const f = flakes[i];
        g.globalAlpha = 0.35 + f.z * 0.4;
        g.beginPath();
        g.arc(f.x, f.y, 1 + f.z * 1.2, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  function drawArrow(g, p, r, power) {
    const a = p.data.aim;
    const d0 = r + 9;
    const len = 12 + power * 30;
    const tip = d0 + len;
    const w = 7 + power * 3;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(a);
    g.globalAlpha = p.down ? 1 : 0.9;
    // stem
    g.strokeStyle = 'rgba(10,20,50,0.45)';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(d0, 0);
    g.lineTo(tip - 6, 0);
    g.stroke();
    g.strokeStyle = p.color;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(d0, 0);
    g.lineTo(tip - 6, 0);
    g.stroke();
    // head
    g.beginPath();
    g.moveTo(tip + 4, 0);
    g.lineTo(tip - 8, -w);
    g.lineTo(tip - 5, 0);
    g.lineTo(tip - 8, w);
    g.closePath();
    g.fillStyle = p.color;
    g.fill();
    g.strokeStyle = 'rgba(10,20,50,0.5)';
    g.lineWidth = 1.5;
    g.stroke();
    g.restore();
  }

  return createParty(api, {
    roundsToWin: 3,
    twists: [
      'turbo',
      'giants',
      'tiny',
      'swap',
      'lights',
      'wobble',
      { id: 'blizzard', name: 'BLIZZARD', desc: 'The wind keeps pushing everyone', emoji: '🌬️' },
      { id: 'meltdown', name: 'MELTDOWN', desc: 'The ice cracks twice as fast', emoji: '🫠' },
    ],
    setup,
    update,
    render,
    bot,
    idle,
  });
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.56;
  drawSea(g, w, h, 3.2, cx, cy);
  const s = h / 420;
  // floe
  const R = 190 * s;
  g.save();
  g.translate(cx, cy);
  g.scale(1, 0.62);
  g.translate(-cx, -cy);
  drawFloe(g, cx, cy, R, 5, 1, [
    { x: -60 * s, y: -40 * s, rx: 50 * s, ry: 22 * s, a: 0.3, c: 'rgba(255,255,255,0.6)' },
    { x: 80 * s, y: 60 * s, rx: 60 * s, ry: 20 * s, a: -0.4, c: 'rgba(255,255,255,0.6)' },
    { x: 20 * s, y: -110 * s, rx: 40 * s, ry: 16 * s, a: 0.1, c: 'rgba(160,200,235,0.25)' },
  ]);
  // a piece of the rim breaking away on the right
  g.save();
  g.translate(46 * s, 26 * s);
  g.rotate(0.06);
  const piece = (dy) => {
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = -0.42 + (i / 8) * 0.62;
      const rr = R + 4 * s + jit(i, 2) * 3 * s;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr + dy;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    for (let i = 8; i >= 0; i--) {
      const a = -0.42 + (i / 8) * 0.62;
      const rr = R - 34 * s + jit(i, 3) * 5 * s;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + dy);
    }
    g.closePath();
  };
  piece(18 * s);
  g.fillStyle = '#3f78b4';
  g.fill();
  piece(0);
  g.fillStyle = '#d6e8f7';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 2 * s;
  g.stroke();
  g.restore();
  // crack line
  g.strokeStyle = 'rgba(40,80,150,0.85)';
  g.lineWidth = 3 * s;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = -0.9 + (i / 40) * 1.9;
    const rr = R - 26 * s + jit(i, 4) * 4 * s;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
  // splash on the left
  const sx = cx - 205 * s;
  const sy = cy + 50 * s;
  g.strokeStyle = 'rgba(200,235,255,0.8)';
  g.lineWidth = 3 * s;
  g.beginPath();
  g.ellipse(sx, sy, 34 * s, 13 * s, 0, 0, TAU);
  g.stroke();
  g.beginPath();
  g.ellipse(sx, sy, 52 * s, 20 * s, 0, 0, TAU);
  g.strokeStyle = 'rgba(200,235,255,0.4)';
  g.stroke();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i - 7.5) * 0.16;
    const l = (30 + (i % 4) * 14) * s;
    draw.circle(g, sx + Math.cos(a) * l, sy - 10 * s + Math.sin(a) * l, (3 + (i % 3)) * s, i % 2 ? '#ffffff' : '#9ed8ff');
  }
  drawBall(g, sx + 6 * s, sy - 20 * s, 24 * s, '#7dff5a', { look: 2.4, dead: true, speckles: makeSpeckles() });
  // two snowballs mid-collision + one charging
  const pk = makeSpeckles();
  rollSpeckles(pk, 1, 0.2, 18, 1);
  const bx = cx - 40 * s;
  const by = cy - 6 * s;
  // motion streaks behind pink
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    g.lineWidth = (6 - i * 1.5) * s;
    g.beginPath();
    g.moveTo(bx - 60 * s - i * 14 * s, by - 16 * s + i * 16 * s);
    g.lineTo(bx - 110 * s - i * 20 * s, by - 22 * s + i * 16 * s);
    g.stroke();
  }
  drawBall(g, bx, by, 44 * s, '#ff3d8b', { look: 0.05, angry: true, speckles: pk });
  const b2x = cx + 52 * s;
  const b2y = cy - 2 * s;
  drawBall(g, b2x, b2y, 40 * s, '#2fd9ff', { look: Math.PI - 0.2, speckles: makeSpeckles() });
  // impact burst
  const ix = cx + 6 * s;
  const iy = cy - 8 * s;
  g.fillStyle = '#ffd23f';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const rr = (i % 2 ? 12 : 30) * s;
    const x = ix + Math.cos(a) * rr;
    const y = iy + Math.sin(a) * rr * 1.2;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.2;
    const rr = (38 + (i % 3) * 10) * s;
    g.beginPath();
    g.arc(ix + Math.cos(a) * rr, iy + Math.sin(a) * rr * 1.1, (3 + (i % 2) * 2) * s, 0, TAU);
    g.fill();
  }
  // gold charging at the back
  const gx = cx + 150 * s;
  const gy = cy - 70 * s;
  drawBall(g, gx, gy, 30 * s, '#ffc93c', { look: Math.PI * 0.85, angry: true, speckles: makeSpeckles() });
  g.strokeStyle = '#ffc93c';
  g.lineWidth = 5 * s;
  g.beginPath();
  g.arc(gx, gy, 38 * s, -Math.PI / 2, -Math.PI / 2 + TAU * 0.7);
  g.stroke();
  // falling snow
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    g.arc(((i * 137) % 1000) / 1000 * w, ((i * 71) % 1000) / 1000 * h * 0.9, (1 + (i % 3)) * s * 0.9, 0, TAU);
    g.fill();
  }
}
