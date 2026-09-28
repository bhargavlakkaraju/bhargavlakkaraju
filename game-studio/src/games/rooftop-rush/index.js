// Rooftop Rush - a one-button party race across night-city rooftops.
//
// Every active player gets a horizontal lane (top to bottom P4, P3, P2, P1, so each lane sits
// on its owner's side of the table). All lanes run the same seeded course, so the race is
// fair. Ninjas run on their own: tap to jump (hold for height), tap again in the air for a
// second jump. Hitting a chimney, vent, water tower or laundry line makes you stumble, a roof
// gap drops you back a little. One camera follows the leader: fall off its left edge and you
// are out. First across the finish line takes the crown.
import { createParty } from '../engine/party.js';
import { mulberry32 } from '../engine/rng.js';

const TAU = Math.PI * 2;
const W = 420;
const AREA_TOP = 96;
const AREA_BOT = 644;
const LANE_GAP = 5;
const LANE_U = 150; // design lane height in world units (a 4-lane layout is ~0.9 px per unit)
const BASE = 32; // default roof height above the lane bottom
const RUN = 285;
const G = 2800;
const G_HOLD = 1100;
const V_JUMP = 440;
const HOLD_MAX = 0.24;
const V_AIR = 405;
const AIR_HOLD = 0.1;
const COYOTE = 0.09;
const BUFFER = 0.13;
const NW = 16;
const NH = 28;
const STUMBLE = 0.6;
const BOOST = 1.15;
const COURSE = 8000;
const PAD_W = 46;
const CAM_LEAD = 0.36; // leader sits at 36% of the view
const OUT_MARGIN = 90; // how far past the camera's left edge you may trail before you are out
const HOLDS = [0, 0.05, 0.1, 0.15, 0.2, 0.24];

const MOON = { id: 'moon', name: 'MOON JUMP', desc: 'Low gravity, huge floaty jumps', emoji: '🌙' };
const PADS = { id: 'boost', name: 'BOOST PADS', desc: 'Speed pads on every roof', emoji: '🚀' };

const KINDS = {
  vent: { w: 24, h: 16, y0: 0, solid: true },
  chimney: { w: 22, h: 30, y0: 0, solid: true },
  tower: { w: 36, h: 50, y0: 0, solid: true },
  laundry: { w: 48, h: 38, y0: 20, solid: false },
};

const PALS = [
  { face: '#1d1640', side: '#130e2c', ledge: '#433677', rim: '#9d8cff', win: '#ffd98a' },
  { face: '#152346', side: '#0d1630', ledge: '#2e4a7d', rim: '#6fd6ff', win: '#c4f1ff' },
  { face: '#2b1540', side: '#1c0c2b', ledge: '#5c2a6c', rim: '#ff7ad1', win: '#ffc6ea' },
  { face: '#14293a', side: '#0b1a26', ledge: '#2a5566', rim: '#6effd0', win: '#fff1a8' },
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (a, b, c) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// ---------- course ----------
function pickKind(r, d) {
  // early course: mostly small stuff; later: towers and laundry lines
  const vent = 0.42 - 0.22 * d;
  const chim = vent + 0.33;
  const laun = chim + 0.1 + 0.12 * d;
  return r < vent ? 'vent' : r < chim ? 'chimney' : r < laun ? 'laundry' : 'tower';
}

function buildCourse(rng, twist) {
  const blds = [];
  const obs = [];
  const pads = [];
  let top = BASE;
  let x = 600;
  blds.push({ x0: -1200, x1: x, top, pal: 0, seed: 7 });
  let id = 0;
  const padChance = twist === 'boost' ? 0.9 : 0.24;
  for (let guard = 0; guard < 80; guard++) {
    const d = Math.min(1, x / COURSE);
    x += rng.range(48, 66 + 52 * d);
    top = clamp(top + rng.pick([-12, -6, 0, 0, 6, 12]), BASE - 12, BASE + 12);
    let w = rng.range(340, 560 - 120 * d);
    let last = x > COURSE - 380 || x + w > COURSE - 120;
    if (!last && x + w > COURSE - 380) w = Math.max(240, COURSE - 380 - x);
    if (last) w = COURSE + 1600 - x;
    const b = { x0: x, x1: x + w, top, pal: rng.int(0, 3), seed: rng.int(1, 1e9) };
    blds.push(b);
    if (!last) {
      const mine = [];
      let ox = x + rng.range(110, 160);
      const end = x + w - 130;
      while (ox < end) {
        const kind = pickKind(rng(), d);
        const k = KINDS[kind];
        if (ox + k.w > end) break;
        const o = { id: id++, kind, x: ox, w: k.w, h: k.h, y0: k.y0, solid: k.solid, top, seed: rng.int(0, 999) };
        obs.push(o);
        mine.push(o);
        ox += k.w + rng.range(170 - 35 * d, 260 - 60 * d);
      }
      if (rng.chance(padChance)) {
        const spots = [];
        for (let px = x + 70; px < x + w - PAD_W - 70; px += 30) {
          if (!mine.some((o) => o.x < px + PAD_W + 110 && o.x + o.w > px - 50)) spots.push(px);
        }
        if (spots.length) pads.push({ x: rng.pick(spots), top });
      }
    }
    x += w;
    if (last) break;
  }
  return { blds, obs, pads, finish: COURSE };
}

function bldIndexAt(C, x) {
  // last building with x0 <= x
  const b = C.blds;
  let lo = 0;
  let hi = b.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (b[m].x0 <= x) lo = m;
    else hi = m - 1;
  }
  return lo;
}

function obsFrom(C, x) {
  // first obstacle whose right edge is past x
  const o = C.obs;
  let lo = 0;
  let hi = o.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (o[m].x + o[m].w < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

// ---------- jump maths (bots plan with the same physics the ninjas use) ----------
const EARTH = { g: G, gh: G_HOLD, v0: V_JUMP, va: V_AIR };
const LUNAR = { g: G * 0.42, gh: G_HOLD * 0.42, v0: V_JUMP * 0.93, va: V_AIR * 0.9 };
function phys(ctx) {
  return ctx.twist.id === 'moon' ? LUNAR : EARTH;
}

function jumpY(t, hold, P, v0 = P.v0) {
  const th = Math.min(hold, v0 / P.gh);
  if (t <= th) return v0 * t - 0.5 * P.gh * t * t;
  const y1 = v0 * th - 0.5 * P.gh * th * th;
  const v1 = v0 - P.gh * th;
  const u = t - th;
  return y1 + v1 * u - 0.5 * P.g * u * u;
}

function aboveWindow(hNeed, hold, P) {
  let t1 = -1;
  for (let t = 0; t < 1.6; t += 1 / 120) {
    const y = jumpY(t, hold, P);
    if (t1 < 0) {
      if (y >= hNeed) t1 = t;
    } else if (y < hNeed) return [t1, t];
    if (t1 < 0 && t > 0.05 && y < 0) break;
  }
  return t1 < 0 ? null : [t1, 1.6];
}

// ---------- pre-rendered scenery (cosmetic, fixed seed) ----------
let ART = null;
function art() {
  if (ART) return ART;
  const r = mulberry32(90417);
  const stars = [];
  for (let i = 0; i < 46; i++) stars.push({ x: r() * W, y: r() * 0.62, s: r() < 0.2 ? 1.8 : 1.1, a: 0.3 + r() * 0.6, f: 1 + r() * 2.5, p: r() * TAU });
  ART = { stars, far: null, mid: null };
  if (typeof document === 'undefined') return ART;
  ART.far = skylineTile(r, 520, 128, 34, 118, '#271a52', '#3a2a74', 0.1, 2.2);
  ART.mid = skylineTile(r, 470, 100, 44, 92, '#1a1238', '#2c2058', 0.22, 3);
  return ART;
}

function skylineTile(r, uw, uh, minH, maxH, fill, edge, winRate, winS) {
  const k = 2; // supersample
  const c = document.createElement('canvas');
  c.width = uw * k;
  c.height = uh * k;
  const g = c.getContext('2d');
  g.scale(k, k);
  let x = -6;
  const neon = ['#ff4fb8', '#3fe0ff', '#b98cff', '#ffd23f'];
  while (x < uw) {
    const bw = 24 + r() * 46;
    const bh = minH + r() * (maxH - minH);
    const y = uh - bh;
    g.fillStyle = fill;
    g.fillRect(x, y, bw, bh);
    g.fillStyle = edge;
    g.fillRect(x, y, bw, 1.5);
    if (r() < 0.35) {
      // antenna / spire
      g.fillRect(x + bw * 0.5 - 1, y - 12 - r() * 14, 2, 14 + r() * 14);
    }
    if (r() < 0.3) {
      // stepped top
      g.fillStyle = fill;
      g.fillRect(x + bw * 0.2, y - 8, bw * 0.6, 8);
    }
    for (let wy = y + 6; wy < uh - 4; wy += winS * 3.2) {
      for (let wx = x + 4; wx < x + bw - 4; wx += winS * 2.6) {
        if (r() < winRate) {
          g.fillStyle = r() < 0.8 ? 'rgba(255,214,140,0.55)' : 'rgba(140,230,255,0.5)';
          g.fillRect(wx, wy, winS, winS * 1.2);
        }
      }
    }
    if (r() < 0.16 && bh > 50) {
      g.fillStyle = neon[(r() * neon.length) | 0];
      g.globalAlpha = 0.75;
      g.fillRect(x + 4, y + 10, Math.min(bw - 8, 18), 5);
      g.globalAlpha = 1;
    }
    x += bw + 1 + r() * 5;
  }
  return { c, uw, uh };
}

let GLOW = new Map();
function glowSprite(color) {
  if (GLOW.has(color)) return GLOW.get(color);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.globalAlpha = 0.55;
  g.fillRect(0, 0, 64, 64);
  GLOW.set(color, c);
  return c;
}

function craters(g, mx, my, mr, list) {
  g.beginPath();
  for (const [cx, cy, cr] of list) {
    g.moveTo(mx + cx * mr + cr * mr, my + cy * mr);
    g.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU);
  }
  g.fill();
}

// ---------- drawing: world pieces (x, y = screen coords of the base, s = px per unit) ----------
function drawBuilding(g, b, x0, x1, ty, bottom, s, t, vw = W) {
  const P = PALS[b.pal];
  const w = x1 - x0;
  g.fillStyle = P.face;
  g.fillRect(x0, ty, w, bottom - ty);
  // shaded right side and left edge light
  g.fillStyle = P.side;
  g.fillRect(x1 - 7 * s, ty, 7 * s, bottom - ty);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(x0, ty, 3 * s, bottom - ty);
  // windows (only the columns on screen)
  const cw = 17 * s;
  const c0 = Math.max(0, Math.floor((0 - x0) / cw));
  const c1 = Math.min(Math.floor((w - 14 * s) / cw), Math.ceil((vw - x0) / cw));
  for (let row = 0; row < 4; row++) {
    const wy = ty + (11 + row * 17) * s;
    if (wy > bottom) break;
    for (let c = c0; c <= c1; c++) {
      const hv = hash(b.seed, c, row);
      const wx = x0 + 8 * s + c * cw;
      if (hv < 0.42) {
        const flick = hv < 0.03 ? 0.35 + 0.35 * Math.sin(t * 9 + c) : 1;
        g.globalAlpha = (0.55 + hv) * flick;
        g.fillStyle = hv < 0.08 ? P.rim : P.win;
        g.fillRect(wx, wy, 7 * s, 9 * s);
      } else {
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(wx, wy, 7 * s, 9 * s);
      }
    }
  }
  g.globalAlpha = 1;
  // parapet + rim light
  g.fillStyle = P.ledge;
  g.fillRect(x0 - 2 * s, ty - 4 * s, w + 4 * s, 6 * s);
  g.fillStyle = P.rim;
  g.globalAlpha = 0.85;
  g.fillRect(x0 - 2 * s, ty - 4 * s, w + 4 * s, 1.4 * s);
  g.globalAlpha = 1;
}

function drawObstacle(g, o, x, y, s, t, smashed) {
  // x = left, y = roof line (screen)
  const u = s;
  if (o.kind === 'vent') {
    if (smashed) {
      g.fillStyle = '#3c405c';
      g.fillRect(x - 2 * u, y - 5 * u, o.w * u + 5 * u, 5 * u);
      return;
    }
    g.fillStyle = '#4b5174';
    g.fillRect(x, y - o.h * u, o.w * u, o.h * u);
    g.fillStyle = '#737ba6';
    g.fillRect(x - 1.5 * u, y - o.h * u - 2 * u, o.w * u + 3 * u, 3 * u);
    g.fillStyle = '#262a42';
    for (let i = 0; i < 3; i++) g.fillRect(x + 4 * u, y - (o.h - 4 - i * 4) * u, o.w * u - 8 * u, 1.6 * u);
    return;
  }
  if (o.kind === 'chimney') {
    if (smashed) {
      g.fillStyle = '#6e2f35';
      g.fillRect(x, y - 8 * u, o.w * u, 8 * u);
      g.fillStyle = '#8f4148';
      g.fillRect(x + 3 * u, y - 11 * u, 7 * u, 4 * u);
      return;
    }
    g.fillStyle = '#8f3d44';
    g.fillRect(x, y - o.h * u, o.w * u, o.h * u);
    g.fillStyle = '#6a2830';
    for (let r = 0; r < 5; r++) {
      const by = y - (6 + r * 6) * u;
      g.fillRect(x, by, o.w * u, 1 * u);
      const off = r % 2 ? 5 : 11;
      g.fillRect(x + off * u, by, 1 * u, 6 * u);
    }
    g.fillStyle = '#4c1d24';
    g.fillRect(x - 2.5 * u, y - o.h * u - 4 * u, o.w * u + 5 * u, 5 * u);
    // smoke
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.55 + i / 3 + o.seed * 0.01) % 1;
      g.globalAlpha = 0.28 * (1 - k);
      g.fillStyle = '#b8a8d8';
      g.beginPath();
      g.arc(x + (o.w / 2 + k * 10 + Math.sin(k * 6 + i) * 3) * u, y - (o.h + 8 + k * 30) * u, (3 + k * 7) * u, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    return;
  }
  if (o.kind === 'tower') {
    const legs = 22;
    if (smashed) {
      g.fillStyle = 'rgba(90,170,255,0.35)';
      g.fillRect(x - 10 * u, y - 2 * u, o.w * u + 20 * u, 2 * u);
      g.fillStyle = '#5b3a27';
      g.fillRect(x + 2 * u, y - 7 * u, o.w * u - 4 * u, 7 * u);
      g.fillStyle = '#3a261c';
      g.fillRect(x, y - 9 * u, 10 * u, 3 * u);
      return;
    }
    g.strokeStyle = '#2d2230';
    g.lineWidth = 2.4 * u;
    g.beginPath();
    g.moveTo(x + 4 * u, y);
    g.lineTo(x + 4 * u, y - legs * u);
    g.moveTo(x + (o.w - 4) * u, y);
    g.lineTo(x + (o.w - 4) * u, y - legs * u);
    g.moveTo(x + 4 * u, y);
    g.lineTo(x + (o.w - 4) * u, y - legs * u);
    g.moveTo(x + (o.w - 4) * u, y);
    g.lineTo(x + 4 * u, y - legs * u);
    g.stroke();
    const tankTop = o.h - 10;
    g.fillStyle = '#80502f';
    g.fillRect(x + 1 * u, y - tankTop * u, (o.w - 2) * u, (tankTop - legs) * u);
    g.fillStyle = '#9b6a42';
    g.fillRect(x + 1 * u, y - tankTop * u, 6 * u, (tankTop - legs) * u);
    g.fillStyle = '#3b2a26';
    g.fillRect(x, y - (legs + 3) * u, o.w * u, 2.2 * u);
    g.fillRect(x, y - (tankTop - 4) * u, o.w * u, 2.2 * u);
    g.fillStyle = '#5c3522';
    g.beginPath();
    g.moveTo(x - 2 * u, y - tankTop * u);
    g.lineTo(x + (o.w / 2) * u, y - o.h * u);
    g.lineTo(x + (o.w + 2) * u, y - tankTop * u);
    g.closePath();
    g.fill();
    return;
  }
  // laundry line
  const sway = Math.sin(t * 2.2 + o.seed) * 1.6;
  const poleH = o.h + 4;
  g.fillStyle = '#8b84a8';
  g.fillRect(x - 1.5 * u, y - poleH * u, 3 * u, poleH * u);
  if (!smashed) g.fillRect(x + o.w * u - 1.5 * u, y - poleH * u, 3 * u, poleH * u);
  else {
    g.save();
    g.translate(x + o.w * u, y);
    g.rotate(0.9);
    g.fillRect(-1.5 * u, -poleH * u, 3 * u, poleH * u);
    g.restore();
  }
  g.strokeStyle = 'rgba(230,220,255,0.7)';
  g.lineWidth = 1.2 * u;
  g.beginPath();
  const ly = y - (o.h + 1) * u;
  g.moveTo(x, ly);
  if (smashed) g.quadraticCurveTo(x + 8 * u, ly + 20 * u, x + 4 * u, y - 4 * u);
  else g.quadraticCurveTo(x + (o.w / 2) * u, ly + 7 * u, x + o.w * u, ly);
  g.stroke();
  if (smashed) return;
  const cloth = ['#ff5a7a', '#ffe066', '#5fd3ff', '#ffffff'];
  for (let i = 0; i < 3; i++) {
    const cx = x + (10 + i * 18) * u + sway * u * (i === 1 ? -1 : 1);
    const sag = Math.sin(((i + 0.5) / 3) * Math.PI) * 6;
    const cy = ly + sag * u;
    const col = cloth[(o.seed + i) % cloth.length];
    g.fillStyle = col;
    if (i === 1) {
      // trousers
      g.fillRect(cx - 6 * u, cy, 12 * u, 8 * u);
      g.fillRect(cx - 6 * u, cy + 8 * u, 5 * u, 13 * u);
      g.fillRect(cx + 1 * u, cy + 8 * u, 5 * u, 13 * u);
    } else {
      // t-shirt
      g.beginPath();
      g.moveTo(cx - 9 * u, cy + 1 * u);
      g.lineTo(cx + 9 * u, cy + 1 * u);
      g.lineTo(cx + 9 * u, cy + 6 * u);
      g.lineTo(cx + 6 * u, cy + 6 * u);
      g.lineTo(cx + 6 * u, cy + 21 * u);
      g.lineTo(cx - 6 * u, cy + 21 * u);
      g.lineTo(cx - 6 * u, cy + 6 * u);
      g.lineTo(cx - 9 * u, cy + 6 * u);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(cx - 6 * u, cy + 16 * u, 12 * u, 3 * u);
  }
}

function drawPad(g, x, y, s, t, hot) {
  const w = PAD_W * s;
  g.fillStyle = '#0f3a4a';
  g.fillRect(x, y - 3 * s, w, 3 * s);
  g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8);
  g.fillStyle = '#3fe8ff';
  g.fillRect(x, y - 5 * s, w, 2 * s);
  g.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const k = (t * 2.5 + i / 3) % 1;
    const cx = x + (8 + k * (PAD_W - 16)) * s;
    g.globalAlpha = Math.sin(k * Math.PI) * (hot ? 1 : 0.85);
    g.strokeStyle = '#9ff6ff';
    g.lineWidth = 2.2 * s;
    g.beginPath();
    g.moveTo(cx - 4 * s, y - 13 * s);
    g.lineTo(cx + 2 * s, y - 8 * s);
    g.lineTo(cx - 4 * s, y - 3 * s);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function drawFinish(g, x, y, s, top, t) {
  // checkered strip on the roof and a banner on two poles
  const cs = 5 * s;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#111' : '#fff';
      g.fillRect(x + j * cs, y - (i + 1) * cs + 2 * s, cs, cs);
    }
  }
  const ph = Math.min(92, (y - top) / s - 8);
  g.fillStyle = '#c9c3e6';
  g.fillRect(x - 36 * s, y - ph * s, 3 * s, ph * s);
  g.fillRect(x + 42 * s, y - ph * s, 3 * s, ph * s);
  const by = y - ph * s;
  const bw = 81 * s;
  const bh = 12 * s;
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 2; j++) {
      const wave = Math.sin(t * 5 + i * 0.7) * 1.4 * s;
      g.fillStyle = (i + j) % 2 ? '#15101f' : '#ffffff';
      g.fillRect(x - 36 * s + (i * bw) / 12, by + (j * bh) / 2 + wave, bw / 12 + 0.5, bh / 2 + 0.5);
    }
  }
}

// Ninja: x, y = screen position of the feet (center), s = px per unit. Drawn a little larger
// than the hitbox (forgiving), in two passes: a light rim silhouette, then the body.
const TINTS = new Map();
function tints(color) {
  let v = TINTS.get(color);
  if (!v) {
    const n = parseInt(color.slice(1), 16);
    const r = (n >> 16) & 255;
    const gg = (n >> 8) & 255;
    const b = n & 255;
    const mix = (k, base) => `rgb(${Math.round(base[0] + (r - base[0]) * k)},${Math.round(base[1] + (gg - base[1]) * k)},${Math.round(base[2] + (b - base[2]) * k)})`;
    v = { body: mix(0.2, [22, 16, 40]), lite: mix(0.42, [40, 32, 70]), rim: mix(0.55, [255, 255, 255]) };
    TINTS.set(color, v);
  }
  return v;
}

function ninjaPose(pose) {
  const ph = pose.run || 0;
  if (pose.air) {
    const tuck = pose.vy > 0 ? 1 : 0.6;
    return [6, -5 - 3 * tuck, -6, -3 - 2 * tuck, 7, -10, -2, -7];
  }
  if (pose.idle) return [4, 0, -4, 0, 3, -6, -3, -6];
  const a = Math.sin(ph);
  const c = Math.cos(ph);
  return [a * 8, -Math.max(0, c) * 5, -a * 8, -Math.max(0, -c) * 5, a * 4 + 3, -6 - Math.max(0, c) * 2, -a * 4 + 3, -6 - Math.max(0, -c) * 2];
}

function ninjaBody(g, L, pose, body, lite, color, e, t) {
  const [f1x, f1y, f2x, f2y, k1x, k1y, k2x, k2y] = L;
  const ph = pose.run || 0;
  const sw = pose.air ? 0.8 : Math.sin(ph);
  g.strokeStyle = body;
  // back leg + back arm
  g.lineWidth = 4.4 + e;
  g.beginPath();
  g.moveTo(0, -11);
  g.lineTo(k2x, k2y);
  g.lineTo(f2x, f2y);
  g.stroke();
  if (!e) {
    // scarf tails
    const wv = Math.sin(t * 16 + ph) * 2.2;
    g.strokeStyle = color;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(-3, -27);
    g.quadraticCurveTo(-10, -29 + wv, -17, -25 - wv);
    g.moveTo(-3, -26);
    g.quadraticCurveTo(-9, -23 - wv, -15, -19 + wv * 0.6);
    g.stroke();
    g.strokeStyle = body;
  }
  g.lineWidth = 3.6 + e;
  g.beginPath();
  g.moveTo(0, -19);
  g.lineTo(-5 - sw * 3, -14 + sw * 2);
  g.stroke();
  // torso
  g.save();
  g.translate(1, -16);
  g.rotate(pose.idle ? 0.05 : 0.22);
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, 0, 5.8 + e / 2, 7.6 + e / 2, 0, 0, TAU);
  g.fill();
  if (!e) {
    g.fillStyle = lite;
    g.beginPath();
    g.ellipse(2.2, -2, 2, 4.2, 0, 0, TAU);
    g.fill();
    g.fillStyle = color;
    g.fillRect(-6, 3.2, 12, 2.6);
  }
  g.restore();
  // front leg
  g.lineWidth = 4.4 + e;
  g.beginPath();
  g.moveTo(1, -11);
  g.lineTo(k1x, k1y);
  g.lineTo(f1x, f1y);
  g.stroke();
  // head (restore() above rolled fillStyle back, so set it again)
  g.fillStyle = body;
  g.beginPath();
  g.arc(3, -25.5, 6.4 + e / 2, 0, TAU);
  g.fill();
  // front arm
  g.lineWidth = 3.6 + e;
  g.beginPath();
  g.moveTo(2, -19);
  if (pose.air) g.lineTo(9, -24);
  else g.lineTo(7 + sw * 3, -13 - sw * 2);
  g.stroke();
}

function drawNinja(g, x, y, s, color, pose, t) {
  const T = tints(color);
  g.save();
  g.translate(x, y);
  g.scale(s * 1.14, s * 1.14);
  const glow = glowSprite(color);
  if (glow) g.drawImage(glow, -26, -44, 52, 52);
  if (pose.rot) {
    g.translate(0, -14);
    g.rotate(pose.rot);
    g.translate(0, 14);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const L = ninjaPose(pose);
  ninjaBody(g, L, pose, T.rim, T.rim, color, 2.2, t);
  ninjaBody(g, L, pose, T.body, T.lite, color, 0, t);
  if (pose.shirt > 0) {
    g.fillStyle = '#ffe066';
    g.beginPath();
    g.moveTo(-5, -33);
    g.lineTo(11, -33);
    g.lineTo(12, -24);
    g.lineTo(8, -24);
    g.lineTo(8, -17);
    g.lineTo(-2, -17);
    g.lineTo(-2, -24);
    g.lineTo(-6, -24);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(-2, -21, 10, 2);
  } else {
    // eye slit and headband
    g.fillStyle = '#f4c9a4';
    g.beginPath();
    g.ellipse(6, -25, 3.6, 2, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#120c20';
    if (pose.dizzy) {
      g.strokeStyle = '#120c20';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(4.2, -26);
      g.lineTo(5.8, -24);
      g.moveTo(5.8, -26);
      g.lineTo(4.2, -24);
      g.moveTo(7.3, -26);
      g.lineTo(8.9, -24);
      g.moveTo(8.9, -26);
      g.lineTo(7.3, -24);
      g.stroke();
    } else if (Math.sin(t * 3.1 + x * 0.1) < 0.985) {
      g.fillRect(4.4, -26, 1.5, 2);
      g.fillRect(7.5, -26, 1.5, 2);
    }
    g.fillStyle = color;
    g.fillRect(-3.4, -30.2, 12.6, 2.8);
  }
  g.restore();
}

// ---------- the game ----------
export default function createGame(api) {
  const S = {
    lanes: [],
    C: null,
    cam: 0,
    view: W,
    parts: [],
    t: 0,
    lastNow: 0,
    winner: null,
  };

  function laneOf(p) {
    for (const L of S.lanes) if (L.p === p) return L;
    return null;
  }

  function setup(ctx) {
    const order = [3, 2, 1, 0];
    const list = order.map((i) => ctx.players[i]).filter((p) => p.active);
    const shown = list.length ? list : order.map((i) => ctx.players[i]);
    const n = shown.length;
    const h = (AREA_BOT - AREA_TOP - LANE_GAP * (n - 1)) / n;
    const s = clamp(h / LANE_U, 0.8, 1.28);
    S.view = W / s;
    S.lanes = shown.map((p, k) => {
      const top = AREA_TOP + k * (h + LANE_GAP);
      return { p, top, h, bottom: top + h, s, U: h / s, art: null, ghost: !list.length };
    });
    S.C = buildCourse(ctx.rng, ctx.twist.id);
    S.cam = -S.view * CAM_LEAD;
    S.parts.length = 0;
    S.winner = null;
    for (const p of list) {
      p.data = {
        x: 0,
        y: BASE,
        vy: 0,
        ground: true,
        air: 1,
        holdT: HOLD_MAX,
        holdMax: HOLD_MAX,
        coyote: 0,
        buffer: 0,
        stumble: 0,
        boost: 0,
        inv: 0,
        shirt: 0,
        spin: 0,
        run: ctx.rng() * TAU,
        sp: RUN,
        respawn: 0,
        rx: 0,
        ry: BASE,
        falling: false,
        out: false,
        danger: 0,
        rank: 1,
        smashed: new Set(),
        padHit: -1,
        bot: { hold: 0, gap: false, plan: null, sk: ctx.rng.range(0.6, 1.5) },
      };
    }
    syncScreen(ctx);
  }

  function effX(d) {
    return d.respawn > 0 ? d.rx : d.x;
  }

  function syncScreen(ctx) {
    for (const L of S.lanes) {
      const p = L.p;
      if (!p.active || !p.data || p.data.x == null) continue;
      const d = p.data;
      const nh = NH * ctx.size;
      p.x = (effX(d) - S.cam) * L.s;
      p.y = L.bottom - ((d.respawn > 0 ? d.ry : d.y) + nh / 2) * L.s;
    }
  }

  // ---------- particles (world units, drawn clipped to their lane) ----------
  function emit(p, x, y, kind, n, o = {}) {
    if (S.parts.length > 420) return;
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? TAU);
      const sp = (o.speed ?? 80) * (0.5 + Math.random());
      S.parts.push({
        lane: p,
        x: x + (Math.random() - 0.5) * (o.jx ?? 4),
        y: y + (Math.random() - 0.5) * (o.jy ?? 4),
        vx: Math.cos(a) * sp + (o.vx ?? 0),
        vy: Math.sin(a) * sp,
        g: o.g ?? 0,
        life: (o.life ?? 0.5) * (0.7 + Math.random() * 0.6),
        age: 0,
        size: (o.size ?? 3) * (0.7 + Math.random() * 0.6),
        color: o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : o.color || '#fff',
        kind,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 14,
      });
    }
  }

  function tickParts(dt) {
    const ps = S.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.age += dt;
      if (q.age >= q.life) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      q.vy -= q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
      if (q.kind === 'smoke' || q.kind === 'dust') {
        q.vx *= 0.94;
        q.vy *= 0.94;
      }
    }
  }

  function drawParts(g, L) {
    for (const q of S.parts) {
      if (q.lane !== L.p) continue;
      const k = q.age / q.life;
      const x = (q.x - S.cam) * L.s;
      const y = L.bottom - q.y * L.s;
      if (q.kind === 'smoke' || q.kind === 'dust') {
        g.globalAlpha = (1 - k) * (q.kind === 'smoke' ? 0.75 : 0.5);
        g.fillStyle = q.color;
        g.beginPath();
        g.arc(x, y, q.size * (1 + k * 1.6) * L.s, 0, TAU);
        g.fill();
      } else if (q.kind === 'spark') {
        g.globalAlpha = 1 - k;
        g.strokeStyle = q.color;
        g.lineWidth = 1.6 * L.s;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - q.vx * 0.04 * L.s, y + q.vy * 0.04 * L.s);
        g.stroke();
      } else {
        g.globalAlpha = Math.min(1, (1 - k) * 2.5);
        g.fillStyle = q.color;
        g.save();
        g.translate(x, y);
        g.rotate(q.rot);
        const sz = q.size * L.s;
        g.fillRect(-sz / 2, -sz / 2, sz, q.kind === 'drop' ? sz : sz * 0.7);
        g.restore();
      }
    }
    g.globalAlpha = 1;
  }

  // ---------- sounds (quiet for bots so a solo player hears their own ninja) ----------
  function snd(p, name) {
    const v = p.human ? 1 : 0.35;
    const sfx = api.sfx;
    if (name === 'jump') sfx.tone({ freq: 330 + p.i * 30, to: 700 + p.i * 40, type: 'square', dur: 0.1, vol: 0.07 * v });
    else if (name === 'air') {
      sfx.tone({ freq: 520 + p.i * 30, to: 1100, type: 'triangle', dur: 0.12, vol: 0.09 * v });
      sfx.noise({ dur: 0.1, vol: 0.08 * v, freq: 2400, to: 900, type: 'bandpass', q: 1.4 });
    } else if (name === 'land') sfx.noise({ dur: 0.06, vol: 0.07 * v, freq: 700, to: 200 });
    else if (name === 'hit') {
      sfx.noise({ dur: 0.18, vol: 0.22 * v, freq: 1500, to: 220 });
      sfx.tone({ freq: 190, to: 70, type: 'square', dur: 0.15, vol: 0.1 * v });
    } else if (name === 'fall') sfx.tone({ freq: 900, to: 180, type: 'triangle', dur: 0.45, vol: 0.09 * v });
    else if (name === 'pop') sfx.tone({ freq: 300, to: 820, type: 'sine', dur: 0.1, vol: 0.18 * v });
    else if (name === 'boost') {
      sfx.noise({ dur: 0.3, vol: 0.14 * v, freq: 500, to: 3200, type: 'bandpass', q: 1.5 });
      sfx.tone({ freq: 600, to: 1300, type: 'sawtooth', dur: 0.16, vol: 0.04 * v });
    }
  }

  // ---------- simulation ----------
  function jump(p, d, air, P) {
    d.vy = air ? P.va : P.v0;
    d.ground = false;
    d.coyote = 0;
    d.buffer = 0;
    d.holdT = 0;
    d.holdMax = air ? AIR_HOLD : HOLD_MAX;
    if (air) {
      d.air -= 1;
      d.spin = 1;
      emit(p, d.x, d.y + 2, 'smoke', 7, { color: '#d9d2ff', speed: 70, spread: Math.PI, angle: -Math.PI / 2, size: 3, life: 0.35 });
      snd(p, 'air');
    } else {
      emit(p, d.x - 4, d.y + 1, 'dust', 5, { color: '#b9b0e6', speed: 50, spread: 1.2, angle: Math.PI - 0.3, size: 2.5, life: 0.35 });
      snd(p, 'jump');
    }
  }

  function hitObstacle(p, d, o, ctx) {
    d.smashed.add(o.id);
    d.stumble = STUMBLE;
    const cx = o.x + o.w / 2;
    const cy = o.top + o.h * 0.6;
    if (o.kind === 'chimney') emit(p, cx, cy, 'debris', 12, { colors: ['#8f3d44', '#6a2830', '#c26a6a'], speed: 170, g: 900, size: 4, life: 0.8, jx: o.w, jy: o.h, spread: 2.4, angle: 1.1 });
    else if (o.kind === 'vent') emit(p, cx, cy, 'debris', 9, { colors: ['#737ba6', '#4b5174', '#c6cbe8'], speed: 160, g: 900, size: 3.5, life: 0.7, jx: o.w, spread: 2.2, angle: 1.1 });
    else if (o.kind === 'tower') {
      emit(p, cx, o.top + 30, 'drop', 22, { colors: ['#6fc8ff', '#b8ecff', '#3f8cff'], speed: 230, g: 1000, size: 3, life: 0.9, jx: o.w, jy: 10, spread: 2.6, angle: 1.2 });
      emit(p, cx, o.top + 30, 'debris', 8, { colors: ['#80502f', '#5c3522'], speed: 150, g: 900, size: 4, life: 0.8, jx: o.w });
    } else {
      d.shirt = 1.1;
      emit(p, cx, o.top + 36, 'debris', 10, { colors: ['#ff5a7a', '#ffe066', '#5fd3ff', '#ffffff'], speed: 120, g: 380, size: 5, life: 1, jx: o.w, spread: 2.4, angle: 1.3 });
    }
    if (d.ground) d.vy = 170;
    snd(p, 'hit');
    ctx.fx.shake(p.human ? 5 : 2.5, 0.18);
    if (p.human) api.haptic(25);
  }

  function step(p, dt, lead, P, ctx) {
    const d = p.data;
    const C = S.C;
    const sz = ctx.size;
    const nw = NW * sz;
    const nh = NH * sz;
    if (d.respawn > 0) {
      d.respawn -= dt;
      if (d.respawn <= 0) {
        d.x = d.rx;
        d.y = d.ry;
        d.vy = 0;
        d.ground = true;
        d.air = 1;
        d.falling = false;
        d.inv = 0.7;
        d.stumble = 0;
        d.boost = 0;
        emit(p, d.x, d.y + nh * 0.5, 'smoke', 16, { color: '#cfc6f2', speed: 90, size: 5, life: 0.55 });
        snd(p, 'pop');
      }
      return;
    }
    d.stumble = Math.max(0, d.stumble - dt);
    d.boost = Math.max(0, d.boost - dt);
    d.inv = Math.max(0, d.inv - dt);
    d.shirt = Math.max(0, d.shirt - dt);
    d.spin = Math.max(0, d.spin - dt * 2.6);
    d.coyote = Math.max(0, d.coyote - dt);

    if (p.tap) {
      if (d.ground || d.coyote > 0) jump(p, d, false, P);
      else if (d.air > 0) jump(p, d, true, P);
      else d.buffer = BUFFER;
    } else d.buffer = Math.max(0, d.buffer - dt);
    if (!p.down) d.holdT = d.holdMax;

    const behind = lead - d.x;
    let sp = RUN * (1 + 0.14 * clamp((behind - 60) / 220, 0, 1));
    if (d.boost > 0) sp *= 1.45;
    if (d.stumble > 0) sp *= 1 - 0.66 * Math.min(1, (d.stumble / STUMBLE) * 1.7);
    if (d.falling) sp *= 0.55;
    d.sp = sp;

    const px = d.x;
    const py = d.y;
    let nx = px + sp * dt;
    const holding = d.vy > 0 && d.holdT < d.holdMax;
    if (holding) d.holdT += dt;
    d.vy -= (holding ? P.gh : P.g) * dt;
    if (d.vy < -1300) d.vy = -1300;
    let ny = py + d.vy * dt;
    const L = laneOf(p);
    const ceil = (L ? L.U : LANE_U) - nh - 1;
    if (ny > ceil) {
      ny = ceil;
      if (d.vy > 0) d.vy = 0;
    }

    // building fronts block you if you are below their roof
    const bi = bldIndexAt(C, nx + nw / 2);
    const bf = C.blds[bi];
    if (bf.x0 > px + nw / 2 - 0.01 && bf.x0 <= nx + nw / 2 && ny < bf.top - 3) {
      nx = bf.x0 - nw / 2 - 0.01;
      if (!d.falling) {
        d.falling = true;
        snd(p, 'fall');
      }
    }
    // support
    const bs = C.blds[bldIndexAt(C, nx + nw * 0.3)];
    const onRoof = nx - nw * 0.3 <= bs.x1;
    let surf = onRoof ? bs.top : -1e9;
    let onObs = null;
    const oi = obsFrom(C, nx - nw);
    for (let k = oi; k < C.obs.length; k++) {
      const o = C.obs[k];
      if (o.x > nx + nw) break;
      if (!o.solid || d.smashed.has(o.id)) continue;
      if (o.x < nx + nw * 0.35 && o.x + o.w > nx - nw * 0.35) {
        const tt = o.top + o.h;
        if (py >= tt - 5 && tt > surf) {
          surf = tt;
          onObs = o;
        }
      }
    }
    if (d.vy <= 0 && ny <= surf && py >= surf - 8) {
      if (!d.ground) {
        if (d.vy < -500) {
          emit(p, nx, surf + 1, 'dust', 6, { color: '#b9b0e6', speed: 60, spread: Math.PI, angle: Math.PI / 2, size: 2.5, life: 0.35 });
          snd(p, 'land');
        }
      }
      ny = surf;
      d.vy = 0;
      d.ground = true;
      d.air = 1;
      d.falling = false;
      if (d.buffer > 0) jump(p, d, false, P);
    } else if (d.ground) {
      d.ground = false;
      if (!onObs && !onRoof) d.coyote = COYOTE;
    }
    if (!onRoof && !d.falling && d.vy < 0) {
      // dropping into a gap (below both roofs): whistle on the way down
      const gi = bldIndexAt(C, nx);
      const nextB = C.blds[gi + 1];
      if (nextB && ny < Math.min(C.blds[gi].top, nextB.top) - 8) {
        d.falling = true;
        snd(p, 'fall');
      }
    }

    // obstacles
    if (d.inv <= 0) {
      for (let k = oi; k < C.obs.length; k++) {
        const o = C.obs[k];
        if (o.x > nx + nw) break;
        if (d.smashed.has(o.id) || o === onObs) continue;
        if (nx + nw / 2 - 2 > o.x + 2 && nx - nw / 2 + 2 < o.x + o.w - 2 && ny + nh - 2 > o.top + o.y0 + 1 && ny + 1 < o.top + o.h - 2) {
          if (o.solid && py >= o.top + o.h - 5) continue;
          hitObstacle(p, d, o, ctx);
        }
      }
    }

    // speed pads
    if (d.ground && !onObs) {
      for (let k = 0; k < C.pads.length; k++) {
        const pad = C.pads[k];
        if (pad.x > nx + 10) break;
        if (nx > pad.x - 4 && nx < pad.x + PAD_W + 4 && Math.abs(ny - pad.top) < 2) {
          if (d.padHit !== k) {
            d.padHit = k;
            d.boost = BOOST;
            emit(p, nx, ny + 6, 'spark', 10, { color: '#9ff6ff', speed: 260, spread: 0.6, angle: Math.PI, size: 2, life: 0.35 });
            snd(p, 'boost');
          }
        }
      }
    }

    d.x = nx;
    d.y = ny;
    d.run += sp * dt * 0.075;
    if (d.boost > 0 && Math.random() < 0.5) emit(p, nx - nw, ny + nh * 0.5, 'spark', 1, { color: '#9ff6ff', speed: 200, spread: 0.2, angle: Math.PI, size: 2, life: 0.25, jy: nh });

    // fell all the way: respawn a little behind, on the roof before the gap
    if (ny < -nh - 10) {
      const b = C.blds[bldIndexAt(C, nx)]; // the roof before the gap
      let rx = b.x1 - 50;
      if (rx < b.x0 + 10) rx = b.x0 + 10;
      for (const o of C.obs) if (o.x < rx + 30 && o.x + o.w > rx - 30) d.smashed.add(o.id);
      d.rx = rx;
      d.ry = b.top;
      d.respawn = 0.35;
      d.vy = 0;
      d.falling = false;
    }
  }

  function update(dt, ctx) {
    const P = phys(ctx);
    const alive = ctx.alive();
    let lead = -1e9;
    for (const p of alive) lead = Math.max(lead, effX(p.data));
    for (const p of alive) step(p, dt, lead, P, ctx);
    lead = -1e9;
    for (const p of ctx.alive()) lead = Math.max(lead, effX(p.data));
    if (lead > -1e8) {
      const target = lead - S.view * CAM_LEAD;
      if (target > S.cam) S.cam += (target - S.cam) * Math.min(1, dt * 6);
      else S.cam = Math.max(target, S.cam - 150 * dt);
    }
    // stragglers
    const nw = NW * ctx.size;
    for (const p of ctx.active) {
      let r = 1;
      for (const q of ctx.active) if (q !== p && (q.alive > p.alive || (q.alive === p.alive && effX(q.data) > effX(p.data)))) r++;
      p.data.rank = r;
    }
    for (const p of ctx.alive()) {
      const d = p.data;
      const rel = effX(d) - S.cam;
      d.danger = clamp(1 - (rel + OUT_MARGIN * 0.6) / (60 + OUT_MARGIN * 0.6), 0, 1);
      if (rel + nw / 2 < -OUT_MARGIN) {
        d.out = true;
        const L = laneOf(p);
        emit(p, S.cam + 14, d.y + 14, 'smoke', 22, { color: '#d6ccff', speed: 120, size: 6, life: 0.7 });
        ctx.eliminate(p, { x: 18, y: L ? L.bottom - (d.y + 14) * L.s : p.y });
      }
    }
    // finish line
    let best = null;
    for (const p of ctx.alive()) {
      const d = p.data;
      if (d.respawn <= 0 && d.x >= S.C.finish && (!best || d.x > best.data.x)) best = p;
    }
    syncScreen(ctx);
    if (best) {
      S.winner = best;
      const L = laneOf(best);
      emit(best, best.data.x, best.data.y + 20, 'debris', 30, { colors: [best.color, '#ffffff', '#ffd23f'], speed: 260, g: 500, size: 5, life: 1.2 });
      ctx.fx.ring(best.x, best.y, { color: '#ffd23f', radius: L ? L.h * 0.7 : 90, life: 0.6, width: 5 });
      ctx.fx.flash(best.color, 0.25);
      ctx.endRound(best);
    }
  }

  // ---------- bots ----------
  // Bots look at the next hazard (obstacle or roof edge), plan a take-off point and a hold
  // time with the same jump maths the ninjas use, then add human-like mistakes: every bot
  // has its own sloppiness, sometimes jumps late or early, and sometimes forgets the air jump.
  const HZ = { id: -1, o: null, b: null, nb: null, dist: 0 };
  function nextHazard(d, nw, nh) {
    const C = S.C;
    const front = d.x + nw / 2;
    let found = false;
    const oi = obsFrom(C, d.x - nw);
    for (let k = oi; k < C.obs.length; k++) {
      const o = C.obs[k];
      if (o.x > front + 500) break;
      if (d.smashed.has(o.id) || o.x < front - 3) continue;
      if (o.kind === 'laundry' && nh < o.y0 - 1) continue; // tiny ninjas run underneath
      HZ.id = o.id;
      HZ.o = o;
      HZ.dist = o.x - front;
      found = true;
      break;
    }
    const bi = bldIndexAt(C, d.x);
    const b = C.blds[bi];
    const nb = C.blds[bi + 1];
    if (nb && d.x <= b.x1 + nw * 0.3) {
      const dist = b.x1 - d.x;
      if (!found || dist < HZ.dist + nw / 2) {
        HZ.id = 100000 + bi;
        HZ.o = null;
        HZ.b = b;
        HZ.nb = nb;
        HZ.dist = dist;
        found = true;
      }
    }
    return found ? HZ : null;
  }

  function makePlan(hz, sp, P, nw, rng, sk) {
    if (hz.o) {
      const o = hz.o;
      const need = o.h + 3;
      let pick = null;
      for (const hold of HOLDS) {
        const win = aboveWindow(need, hold, P);
        if (!win) continue;
        const lo = win[0] * sp - 3;
        const hi = o.solid ? win[1] * sp - 3 : win[1] * sp - (o.w + nw) + 5;
        if (hi - lo >= 12) {
          pick = { hold, lo, hi };
          break;
        }
      }
      let rescue = rng.chance(0.6);
      if (!pick) {
        const win = aboveWindow(need, HOLD_MAX, P) || [0.1, 0.4];
        pick = { hold: HOLD_MAX, lo: win[0] * sp, hi: win[0] * sp + 20 };
        rescue = true;
      }
      let D = pick.lo + (pick.hi - pick.lo) * rng.range(0.25, 0.6);
      const r = rng();
      if (r < 0.07 * sk) D = pick.lo - rng.range(8, 24); // late: clips it
      else if (r < 0.12 * sk) D = pick.hi + rng.range(12, 34); // early: lands short, jumps again
      const hold = clamp(pick.hold + rng.range(-0.02, 0.04), 0, HOLD_MAX);
      return { id: hz.id, T: Math.max(0, D) / sp, hold, rescue, done: false, flew: false, rescued: false };
    }
    const gw = hz.nb.x0 - hz.b.x1;
    const dh = hz.nb.top - hz.b.top;
    let E = rng.range(4, 24);
    let hold = -1;
    for (const h of HOLDS) {
      const tw = (gw + E - nw / 2) / sp;
      if (jumpY(tw, h, P) >= dh + 5) {
        hold = h;
        break;
      }
    }
    let rescue = rng.chance(1 - 0.18 * sk);
    if (hold < 0) {
      hold = HOLD_MAX;
      rescue = true;
    } else hold = Math.min(HOLD_MAX, hold + 0.05);
    const r = rng();
    if (r < 0.035 * sk) E = -rng.range(14, 30); // too late: runs off the edge
    else if (r < 0.08 * sk) hold = Math.max(0, hold - 0.12); // too short
    return { id: hz.id, T: E / sp, hold, rescue, done: false, flew: false, rescued: false };
  }

  function needRescue(d, P, sp, nw, nh) {
    const C = S.C;
    if (d.vy > 120) return false;
    const front = d.x + nw / 2;
    const gi = bldIndexAt(C, d.x);
    const cur = C.blds[gi];
    const next = C.blds[gi + 1];
    if (next && d.x - nw * 0.3 > cur.x1) {
      // over a gap: will we clear the next roof's front wall?
      const tw = Math.max(0, (next.x0 - front) / sp);
      const y = d.y + d.vy * tw - 0.5 * P.g * tw * tw;
      return y < next.top - 1;
    }
    const o = C.obs[obsFrom(C, front)];
    if (!o || d.smashed.has(o.id) || o.x - front > 70 || o.x < front - 2) return false;
    if (o.kind === 'laundry' && nh < o.y0 - 1) return false;
    const ta = (o.x - front) / sp;
    const y = d.y + d.vy * ta - 0.5 * P.g * ta * ta;
    return y < o.top + o.h && d.vy < 0;
  }

  function bot(p, dt, ctx) {
    const d = p.data;
    if (!d || d.smashed == null) return false;
    const B = d.bot;
    if (B.hold > 0) {
      B.hold -= dt;
      return true;
    }
    if (B.gap) {
      B.gap = false;
      return false;
    }
    if (d.respawn > 0 || d.out) return false;
    const P = phys(ctx);
    const sz = ctx.size;
    const nw = NW * sz;
    const nh = NH * sz;
    const sp = Math.max(80, d.sp || RUN);
    const plan = B.plan;
    if (plan && plan.done && !d.ground) plan.flew = true;
    if (d.ground || d.coyote > 0) {
      const hz = nextHazard(d, nw, nh);
      if (!hz) return false;
      // new hazard, or we jumped and landed short of the same one: plan (again)
      if (!plan || plan.id !== hz.id || (plan.done && plan.flew && d.ground)) B.plan = makePlan(hz, sp, P, nw, ctx.rng, B.sk);
      const pl = B.plan;
      if (pl.done) return false;
      if (hz.dist <= pl.T * sp) {
        pl.done = true;
        B.hold = pl.hold - dt;
        B.gap = true;
        return true;
      }
      return false;
    }
    if (d.air > 0 && plan && plan.rescue && !plan.rescued && needRescue(d, P, sp, nw, nh)) {
      plan.rescued = true;
      B.hold = AIR_HOLD - dt;
      B.gap = true;
      return true;
    }
    return false;
  }

  // ---------- rendering ----------
  // per-lane gradients, built once per layout and canvas
  function laneArt(g, L) {
    if (L.art && L.art.g === g) return L.art;
    const { top, h, bottom, s } = L;
    const sky = g.createLinearGradient(0, top, 0, bottom);
    sky.addColorStop(0, '#0a0620');
    sky.addColorStop(0.5, '#221044');
    sky.addColorStop(0.82, '#4a1a5e');
    sky.addColorStop(1, '#6a2466');
    const mr = Math.min(30, h * 0.2);
    const mx = W * 0.8;
    const my = top + h * 0.3;
    const moon = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.6);
    moon.addColorStop(0, 'rgba(255,230,200,0.22)');
    moon.addColorStop(1, 'rgba(255,230,200,0)');
    const fog = g.createLinearGradient(0, bottom - 70 * s, 0, bottom);
    fog.addColorStop(0, 'rgba(30,10,50,0)');
    fog.addColorStop(1, 'rgba(22,8,40,0.85)');
    L.art = { g, sky, moon, fog, mr, mx, my };
    return L.art;
  }

  function drawTiles(g, tile, par, L, lift) {
    if (!tile) return;
    const tw = tile.uw * L.s;
    const th = tile.uh * L.s;
    let off = (S.cam * par * L.s) % tw;
    if (off < 0) off += tw;
    for (let x = -off; x < W; x += tw) g.drawImage(tile.c, x, L.bottom - th - lift * L.s, tw + 0.5, th);
  }

  function drawLane(g, L, ctx, t) {
    const A = art();
    const { top, h, s, bottom } = L;
    const p = L.p;
    const d = p.active ? p.data : null;
    g.save();
    g.beginPath();
    g.rect(0, top, W, h);
    g.clip();
    const LA = laneArt(g, L);
    g.fillStyle = LA.sky;
    g.fillRect(0, top, W, h);
    // stars
    g.fillStyle = '#ffffff';
    for (const st of A.stars) {
      const sy = top + st.y * h * 0.8;
      let sx = (st.x - S.cam * 0.02 * s) % W;
      if (sx < 0) sx += W;
      g.globalAlpha = st.a * (0.6 + 0.4 * Math.sin(t * st.f + st.p));
      g.fillRect(sx, sy, st.s, st.s);
    }
    g.globalAlpha = 1;
    // moon
    const { mr, mx, my } = LA;
    g.fillStyle = LA.moon;
    g.fillRect(mx - mr * 2.6, my - mr * 2.6, mr * 5.2, mr * 5.2);
    g.fillStyle = '#fff1d6';
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(210,180,160,0.35)';
    craters(g, mx, my, mr, [
      [-0.3, -0.2, 0.22],
      [0.35, 0.3, 0.16],
      [0.1, -0.5, 0.1],
    ]);
    // skyline layers
    drawTiles(g, A.far, 0.12, L, 0);
    drawTiles(g, A.mid, 0.34, L, -6);
    g.fillStyle = LA.fog;
    g.fillRect(0, bottom - 70 * s, W, 70 * s);

    // foreground rooftops
    const C = S.C;
    const cam = S.cam;
    const x1v = cam + W / s;
    let bi = bldIndexAt(C, cam - 20);
    for (; bi < C.blds.length; bi++) {
      const b = C.blds[bi];
      if (b.x0 > x1v) break;
      if (b.x1 < cam - 10) continue;
      drawBuilding(g, b, (b.x0 - cam) * s, (b.x1 - cam) * s, bottom - b.top * s, bottom, s, t);
    }
    // finish line
    if (C.finish < x1v + 60 && C.finish > cam - 120) {
      const fb = C.blds[bldIndexAt(C, C.finish)];
      drawFinish(g, (C.finish - cam) * s, bottom - fb.top * s, s, top, t);
    }
    // pads
    for (let k = 0; k < C.pads.length; k++) {
      const pad = C.pads[k];
      if (pad.x > x1v) break;
      if (pad.x + PAD_W < cam) continue;
      drawPad(g, (pad.x - cam) * s, bottom - pad.top * s, s, t, d && d.padHit === k && d.boost > 0);
    }
    // obstacles
    for (let k = obsFrom(C, cam - 40); k < C.obs.length; k++) {
      const o = C.obs[k];
      if (o.x > x1v + 20) break;
      drawObstacle(g, o, (o.x - cam) * s, bottom - o.top * s, s, t, d ? d.smashed.has(o.id) : false);
    }

    // ninja
    if (d && d.smashed) {
      const sz = ctx.size;
      const nh = NH * sz;
      if (p.alive && d.respawn <= 0) {
        const nx = (d.x - cam) * s;
        const ny = bottom - d.y * s;
        // speed streaks
        if (d.boost > 0 || d.sp > RUN * 1.12) {
          g.strokeStyle = d.boost > 0 ? 'rgba(160,246,255,0.55)' : 'rgba(255,255,255,0.22)';
          g.lineWidth = 1.5 * s;
          g.beginPath();
          for (let i = 0; i < 3; i++) {
            const yy = ny - (6 + i * 8) * sz * s;
            const len = (18 + ((t * 60 + i * 13) % 14)) * s;
            g.moveTo(nx - 10 * s * sz, yy);
            g.lineTo(nx - 10 * s * sz - len, yy);
          }
          g.stroke();
        }
        let rot = 0;
        if (d.spin > 0) rot = (1 - d.spin) * TAU;
        const stumbling = d.stumble > 0;
        if (stumbling) {
          const k = 1 - d.stumble / STUMBLE;
          rot = k < 0.55 ? (k / 0.55) * TAU : 0;
        }
        const idle = ctx.phase === 'card' || ctx.phase === 'count';
        if (d.inv > 0 && Math.floor(t * 20) % 2) g.globalAlpha = 0.45;
        drawNinja(g, nx, ny, s * sz, p.color, { run: d.run, air: !d.ground, vy: d.vy, rot, shirt: d.shirt, dizzy: stumbling, idle }, t);
        g.globalAlpha = 1;
        if (stumbling && d.stumble < STUMBLE * 0.6) {
          for (let i = 0; i < 3; i++) {
            const a = t * 7 + (i * TAU) / 3;
            g.fillStyle = '#ffe066';
            g.beginPath();
            g.arc(nx + (Math.cos(a) * 8 + 2) * s * sz, ny - (nh + 4 + Math.sin(a) * 2.5) * s, 1.8 * s, 0, TAU);
            g.fill();
          }
        }
      }
    }
    drawParts(g, L);

    // danger wash on the left edge
    if (d && p.alive && d.danger > 0) {
      const a = d.danger * (0.45 + 0.25 * Math.sin(t * 14));
      const dg = g.createLinearGradient(0, 0, 60, 0);
      dg.addColorStop(0, `rgba(255,40,70,${a})`);
      dg.addColorStop(1, 'rgba(255,40,70,0)');
      g.fillStyle = dg;
      g.fillRect(0, top, 60, h);
      const sx = (effX(d) - S.cam) * s;
      if (sx < 4) {
        // off the left edge but not out yet: an arrow at your height, hang on!
        const ay = clamp(bottom - ((d.respawn > 0 ? d.ry : d.y) + 14 * ctx.size) * s, top + 22, bottom - 10);
        const bob = Math.sin(t * 16) * 2;
        g.fillStyle = p.color;
        g.strokeStyle = '#10081f';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(4 + bob, ay);
        g.lineTo(18 + bob, ay - 9);
        g.lineTo(18 + bob, ay + 9);
        g.closePath();
        g.fill();
        g.stroke();
        ctx.draw.text(g, '!', 28 + bob, ay + 1, { size: 18, color: '#ff4a6a', stroke: '#1a0818' });
      } else if (d.danger > 0.35) ctx.draw.text(g, '!', 16, top + h * 0.55, { size: 22, color: '#ff4a6a', stroke: '#1a0818', alpha: d.danger });
    }
    g.restore();

    // lane frame + hud
    if (L.ghost) return;
    const col = p.color;
    g.fillStyle = col;
    g.fillRect(0, top, 4, h);
    if (d && S.winner === p) {
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 3;
      g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
      g.strokeRect(1.5, top + 1.5, W - 3, h - 3);
      g.globalAlpha = 1;
    }
    drawLaneHud(g, L, ctx, t);
    drawHint(g, L, ctx, t);
    if (d && !p.alive && !(S.winner === p)) {
      g.fillStyle = 'rgba(8,4,18,0.62)';
      g.fillRect(0, top, W, h);
      g.save();
      g.translate(W / 2, top + h / 2);
      g.rotate(-0.08);
      ctx.draw.text(g, 'OUT', 0, 0, { size: Math.min(46, h * 0.36), color: col, stroke: '#10081f' });
      g.restore();
    }
  }

  // First round only: remind each human how their one button works, right in their lane.
  function drawHint(g, L, ctx, t) {
    const p = L.p;
    if (!p.human || api.demo || ctx.round !== 1 || !p.alive) return;
    const ph = ctx.phase;
    const k = ph === 'card' || ph === 'count' ? 1 : ph === 'play' ? clamp(3.5 - ctx.time, 0, 1) : 0;
    if (k <= 0) return;
    const D = ctx.draw;
    g.save();
    g.globalAlpha = k;
    g.translate(W * 0.69, L.top + L.h * 0.6);
    if (p.i === 2 || p.i === 3) g.rotate(Math.PI);
    const pulse = 1 + Math.sin(t * 6) * 0.025;
    g.scale(pulse, pulse);
    D.roundRect(g, -118, -23, 236, 46, 14, 'rgba(8,4,20,0.85)', p.color, 2);
    D.text(g, 'TAP = JUMP   HOLD = HIGHER', 0, -8, { size: 12, color: '#ffffff', shadow: false, maxWidth: 220 });
    D.text(g, 'tap again in the air to double jump', 0, 9, { size: 10, weight: 700, color: 'rgba(255,255,255,0.75)', shadow: false, maxWidth: 220 });
    g.restore();
  }

  function drawLaneHud(g, L, ctx, t) {
    const p = L.p;
    const d = p.data;
    const { top } = L;
    const D = ctx.draw;
    const y = top + 13;
    D.roundRect(g, 9, y - 9, 44, 18, 9, p.color);
    D.text(g, p.human ? p.tag : 'BOT', 31, y + 0.5, { size: 11, color: '#10081f', shadow: false });
    if (!d || d.x == null) return;
    const rank = ['1ST', '2ND', '3RD', '4TH'][Math.max(0, (d.rank || 1) - 1)];
    const x0 = 86;
    const x1 = W - 30;
    D.text(g, rank, 58, y + 0.5, { size: 11, color: d.rank === 1 ? '#ffd23f' : 'rgba(255,255,255,0.75)', align: 'left', shadow: false });
    D.roundRect(g, x0, y - 3, x1 - x0, 6, 3, 'rgba(255,255,255,0.14)');
    const k = clamp(effX(d) / S.C.finish, 0, 1);
    if (k > 0) D.roundRect(g, x0, y - 3, Math.max(6, (x1 - x0) * k), 6, 3, p.color);
    D.circle(g, x0 + (x1 - x0) * k, y, 5, '#ffffff', p.color, 2);
    // flag
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#15101f' : '#ffffff';
      g.fillRect(x1 + 8 + i * 4, y - 6 + j * 4, 4, 4);
    }
    g.fillStyle = '#c9c3e6';
    g.fillRect(x1 + 7, y - 6, 1.5, 13);
  }

  function drawFrame(g, ctx, t) {
    // night sky above and below the lanes
    const D = ctx.draw;
    const top = g.createLinearGradient(0, 0, 0, AREA_TOP);
    top.addColorStop(0, '#07041a');
    top.addColorStop(1, '#130a30');
    g.fillStyle = top;
    g.fillRect(0, 0, W, AREA_TOP);
    const bot = g.createLinearGradient(0, AREA_BOT, 0, 740);
    bot.addColorStop(0, '#130a30');
    bot.addColorStop(1, '#07041a');
    g.fillStyle = bot;
    g.fillRect(0, AREA_BOT, W, 740 - AREA_BOT);
    g.fillStyle = '#07041a';
    for (let k = 1; k < S.lanes.length; k++) g.fillRect(0, S.lanes[k].top - LANE_GAP, W, LANE_GAP);
    // race tracker between the bottom buttons
    const act = ctx.active;
    if (!act.length || !S.C) return;
    // sits high in the band between the bottom buttons: party shells put a mute button
    // at the bottom center
    const x0 = 120;
    const x1 = 290;
    const y = 664;
    D.roundRect(g, x0 - 14, y - 16, x1 - x0 + 44, 32, 14, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 1.5);
    D.roundRect(g, x0, y - 3, x1 - x0, 6, 3, 'rgba(255,255,255,0.16)');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#15101f' : '#ffffff';
      g.fillRect(x1 + 6 + i * 4, y - 8 + j * 4, 4, 4);
    }
    g.fillStyle = '#c9c3e6';
    g.fillRect(x1 + 5, y - 8, 1.5, 16);
    // one dot per racer, stacked a little so a tight pack stays readable
    const n = S.lanes.length;
    S.lanes.forEach((L, k) => {
      const p = L.p;
      const d = p.data;
      if (!d || d.x == null) return;
      const x = x0 + (x1 - x0) * clamp(effX(d) / S.C.finish, 0, 1);
      const yy = y + (k - (n - 1) / 2) * 4 + (p.alive ? Math.sin(t * 10 + p.i) * 1 : 0);
      g.globalAlpha = p.alive ? 1 : 0.35;
      D.circle(g, x, yy, 6, p.color, '#10081f', 2);
      g.globalAlpha = 1;
    });
  }

  function render(g, ctx) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    let rdt = S.lastNow ? (now - S.lastNow) / 1000 : 0;
    S.lastNow = now;
    if (!(rdt >= 0) || rdt > 0.05) rdt = 0.016;
    S.t += rdt;
    tickParts(rdt);
    const t = S.t;
    drawFrame(g, ctx, t);
    for (const L of S.lanes) drawLane(g, L, ctx, t);
  }

  return createParty(api, {
    roundsToWin: 3,
    lightRadius: 78, // narrow lanes: keep each runner's light inside their own lane
    twists: ['turbo', 'giants', 'tiny', 'swap', 'lights', 'wobble', MOON, PADS],
    setup,
    update,
    render,
    bot,
    // Cosmetic only (the party kit also calls this between rounds): pan the empty lobby
    // city. Rounds never see it because setup() resets the camera.
    idle(dt, ctx) {
      if (ctx.phase === 'lobby') S.cam += RUN * 0.6 * dt;
    },
  });
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = h / 300;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0a0620');
  sky.addColorStop(0.5, '#27114c');
  sky.addColorStop(0.85, '#5c1d66');
  sky.addColorStop(1, '#7a2a6a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const r = mulberry32(5150);
  for (let i = 0; i < 90; i++) {
    g.globalAlpha = 0.3 + r() * 0.6;
    g.fillStyle = '#fff';
    const st = r() < 0.2 ? 2.4 : 1.4;
    g.fillRect(r() * w, r() * h * 0.6, st, st);
  }
  g.globalAlpha = 1;
  // huge moon
  const mx = w * 0.62;
  const my = h * 0.36;
  const mr = h * 0.26;
  const mg = g.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.2);
  mg.addColorStop(0, 'rgba(255,220,190,0.35)');
  mg.addColorStop(1, 'rgba(255,220,190,0)');
  g.fillStyle = mg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff0d4';
  g.beginPath();
  g.arc(mx, my, mr, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(214,182,160,0.38)';
  craters(g, mx, my, mr, [
    [-0.35, -0.15, 0.2],
    [0.3, 0.35, 0.14],
    [0.12, -0.5, 0.09],
    [-0.05, 0.12, 0.07],
  ]);
  // skylines
  const A = art();
  if (A.far) {
    const tw = A.far.uw * s * 0.9;
    for (let x = -40; x < w; x += tw) g.drawImage(A.far.c, x, h - A.far.uh * s * 0.9 - 30 * s, tw, A.far.uh * s * 0.9);
    const mw = A.mid.uw * s;
    for (let x = -90; x < w; x += mw) g.drawImage(A.mid.c, x, h - A.mid.uh * s - 20 * s, mw, A.mid.uh * s);
  }
  const fog = g.createLinearGradient(0, h * 0.55, 0, h);
  fog.addColorStop(0, 'rgba(30,10,50,0)');
  fog.addColorStop(1, 'rgba(22,8,40,0.9)');
  g.fillStyle = fog;
  g.fillRect(0, h * 0.55, w, h * 0.45);
  // two rooftops with a gap
  const roofL = { x0: -40, x1: w * 0.43, top: 70, pal: 0, seed: 3 };
  const roofR = { x0: w * 0.6, x1: w + 40, top: 84, pal: 2, seed: 9 };
  drawBuilding(g, roofL, roofL.x0, roofL.x1, h - roofL.top * s, h, s, 0, w);
  drawBuilding(g, roofR, roofR.x0, roofR.x1, h - roofR.top * s, h, s, 0, w);
  drawObstacle(g, { kind: 'tower', w: 36, h: 50, seed: 1 }, w * 0.07, h - roofL.top * s, s * 1.05, 0, false);
  drawObstacle(g, { kind: 'chimney', w: 22, h: 30, seed: 4 }, w * 0.86, h - roofR.top * s, s, 0.3, false);
  drawObstacle(g, { kind: 'laundry', w: 58, h: 46, y0: 22, seed: 2 }, w * 0.69, h - roofR.top * s, s * 0.95, 0.4, false);
  drawPad(g, w * 0.22, h - roofL.top * s, s, 0.2, true);
  // ninjas: gold running, blue leaping, pink flipping over the moon
  const t = 0.3;
  drawNinja(g, w * 0.3, h - roofL.top * s, s * 1.15, '#ffc93c', { run: 1.2, air: false }, t);
  // speed lines behind the gold ninja
  g.strokeStyle = 'rgba(160,246,255,0.6)';
  g.lineWidth = 2 * s;
  g.beginPath();
  for (let i = 0; i < 3; i++) {
    g.moveTo(w * 0.3 - 14 * s, h - (roofL.top + 8 + i * 9) * s);
    g.lineTo(w * 0.3 - (40 + i * 8) * s, h - (roofL.top + 8 + i * 9) * s);
  }
  g.stroke();
  drawNinja(g, w * 0.47, h - 150 * s, s * 1.2, '#2fd9ff', { run: 0, air: true, vy: 100 }, t);
  drawNinja(g, w * 0.66, h - 222 * s, s * 1.35, '#ff3d8b', { run: 0, air: true, vy: -50, rot: -0.9 }, t);
  // motion arcs
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2.5 * s;
  g.setLineDash([6 * s, 7 * s]);
  g.beginPath();
  g.moveTo(w * 0.36, h - 80 * s);
  g.quadraticCurveTo(w * 0.42, h - 150 * s, w * 0.46, h - 146 * s);
  g.moveTo(w * 0.52, h - 190 * s);
  g.quadraticCurveTo(w * 0.58, h - 232 * s, w * 0.64, h - 226 * s);
  g.stroke();
  g.setLineDash([]);
  // a tumbling lime ninja on the right roof, laundry flying
  drawNinja(g, w * 0.8, h - roofR.top * s, s * 1.05, '#7dff5a', { run: 0, air: false, rot: 1.2, dizzy: true }, t);
  const cloth = ['#ff5a7a', '#ffe066', '#5fd3ff'];
  for (let i = 0; i < 5; i++) {
    g.fillStyle = cloth[i % 3];
    g.save();
    g.translate(w * (0.74 + i * 0.03), h - (roofR.top + 40 + (i % 2) * 14) * s);
    g.rotate(i * 0.9);
    g.fillRect(-4 * s, -3 * s, 8 * s, 6 * s);
    g.restore();
  }
}
