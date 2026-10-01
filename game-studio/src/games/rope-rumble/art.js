// Rope Rumble art: the grass field with its mud pit, the brass ring, braided ropes and the
// chunky little pullers. Shared by the game and the cover art so both always match.
import * as draw from '../engine/draw.js';

export const TAU = Math.PI * 2;
export const PIT_R = 0.8; // pit radius in arena units

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// deterministic jitter in [-1, 1] (cosmetic shapes stay put between frames)
export const jit = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};
const rot = (x, y, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
};

// ---------- field ----------
function blob(g, cx, cy, rx, ry, seed, amp = 0.025, n = 56) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = (k / n) * TAU;
    const m = 1 + jit(k, seed) * amp + jit(k * 3 + 7, seed) * amp * 0.5;
    const x = cx + Math.cos(a) * rx * m;
    const y = cy + Math.sin(a) * ry * m;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

export function pitPath(g, L, grow = 1) {
  blob(g, L.cx, L.cy, L.sx * PIT_R * grow, L.sy * PIT_R * grow, 3, 0.025);
}

// L maps arena units to pixels: x = cx + ax * sx, y = cy + ay * sy. k scales the details.
export function drawField(g, w, h, L, o = {}) {
  const k = o.k || 1;
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#2a7a3e');
  base.addColorStop(0.55, '#2f8a45');
  base.addColorStop(1, '#226a34');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // mowing stripes
  g.save();
  g.translate(L.cx, L.cy);
  g.rotate(-0.62);
  const D = Math.hypot(w, h);
  const band = 44 * k;
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = -D; x < D; x += band * 2) g.fillRect(x, -D, band, D * 2);
  g.restore();
  const outside = (x, y, m) => {
    const ex = (x - L.cx) / (L.sx * PIT_R);
    const ey = (y - L.cy) / (L.sy * PIT_R);
    return ex * ex + ey * ey > m;
  };
  // grass tufts
  const n = Math.round((w * h) / (900 * k * k));
  g.lineCap = 'round';
  g.lineWidth = 1.4 * k;
  for (let i = 0; i < n; i++) {
    const x = (jit(i, 1) * 0.5 + 0.5) * w;
    const y = (jit(i, 2) * 0.5 + 0.5) * h;
    if (!outside(x, y, 1.12)) continue;
    const s = (2.5 + Math.abs(jit(i, 3)) * 4) * k;
    g.strokeStyle = i % 3 === 0 ? 'rgba(18,64,28,0.5)' : 'rgba(140,215,120,0.4)';
    g.beginPath();
    g.moveTo(x - s * 0.5, y);
    g.lineTo(x - s * 0.85, y - s);
    g.moveTo(x, y);
    g.lineTo(x + jit(i, 4) * s * 0.25, y - s * 1.35);
    g.moveTo(x + s * 0.5, y);
    g.lineTo(x + s * 0.9, y - s * 0.9);
    g.stroke();
  }
  // little flowers
  const nf = Math.round((w * h) / (7000 * k * k));
  const petals = ['#ffffff', '#ffe066', '#ff9ec7', '#ffffff'];
  for (let i = 0; i < nf; i++) {
    const x = (jit(i, 11) * 0.5 + 0.5) * w;
    const y = (jit(i, 12) * 0.5 + 0.5) * h;
    if (!outside(x, y, 1.25)) continue;
    const r = (1.6 + Math.abs(jit(i, 13))) * k;
    g.fillStyle = petals[i % petals.length];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU + i;
      g.beginPath();
      g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#f5a623';
    g.beginPath();
    g.arc(x, y, r * 0.6, 0, TAU);
    g.fill();
  }
  drawPit(g, L, k);
  // vignette
  const vg = g.createRadialGradient(L.cx, L.cy, Math.min(w, h) * 0.3, L.cx, L.cy, Math.hypot(w, h) * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,28,12,0.5)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

function drawPit(g, L, k) {
  const rx = L.sx * PIT_R;
  const ry = L.sy * PIT_R;
  // trampled grass around the pit
  blob(g, L.cx, L.cy + 3 * k, rx * 1.09, ry * 1.06, 4, 0.035);
  g.fillStyle = 'rgba(92,80,30,0.32)';
  g.fill();
  // the pit wall (you see a sliver of it below the rim)
  g.save();
  g.translate(0, 5 * k);
  pitPath(g, L);
  g.fillStyle = '#5b3818';
  g.fill();
  g.restore();
  // dirt floor
  pitPath(g, L);
  const dg = g.createRadialGradient(L.cx - rx * 0.2, L.cy - ry * 0.25, 10 * k, L.cx, L.cy, Math.max(rx, ry) * 1.02);
  dg.addColorStop(0, '#d6a167');
  dg.addColorStop(0.6, '#bd864d');
  dg.addColorStop(1, '#94612f');
  g.fillStyle = dg;
  g.fill();
  g.save();
  pitPath(g, L);
  g.clip();
  // speckles and pebbles
  const n = Math.round((rx * ry) / (55 * k * k));
  for (let i = 0; i < n; i++) {
    const a = jit(i, 31) * Math.PI;
    const d = Math.sqrt(Math.abs(jit(i, 32)));
    const x = L.cx + Math.cos(a) * rx * d;
    const y = L.cy + Math.sin(a) * ry * d;
    const r = (0.8 + Math.abs(jit(i, 33)) * (i % 7 === 0 ? 2.6 : 1.2)) * k;
    g.fillStyle = i % 3 === 0 ? 'rgba(255,235,200,0.35)' : 'rgba(80,45,15,0.3)';
    g.beginPath();
    g.ellipse(x, y, r * 1.3, r, 0, 0, TAU);
    g.fill();
  }
  // shade under the rim
  g.strokeStyle = 'rgba(70,40,15,0.35)';
  g.lineWidth = 10 * k;
  g.translate(0, -6 * k);
  pitPath(g, L);
  g.stroke();
  g.restore();
  // rim
  pitPath(g, L);
  g.strokeStyle = '#6a4120';
  g.lineWidth = 2.5 * k;
  g.stroke();
  // mud puddle in the middle
  blob(g, L.cx, L.cy, L.sx * 0.3, L.sy * 0.3, 9, 0.05, 40);
  g.fillStyle = '#6b411f';
  g.fill();
  g.strokeStyle = 'rgba(60,32,12,0.6)';
  g.lineWidth = 2 * k;
  g.stroke();
  blob(g, L.cx - L.sx * 0.03, L.cy - L.sy * 0.03, L.sx * 0.22, L.sy * 0.2, 12, 0.06, 36);
  g.fillStyle = '#5a3416';
  g.fill();
  // glossy highlights
  g.fillStyle = 'rgba(255,240,220,0.16)';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(L.cx + jit(i, 41) * L.sx * 0.16, L.cy + jit(i, 42) * L.sy * 0.16, (7 + Math.abs(jit(i, 43)) * 9) * k, (2 + Math.abs(jit(i, 44)) * 2) * k, -0.3, 0, TAU);
    g.fill();
  }
  // grass fringe hanging over the rim
  g.strokeStyle = 'rgba(70,150,70,0.9)';
  g.lineWidth = 1.6 * k;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU + jit(i, 51) * 0.03;
    const x = L.cx + Math.cos(a) * rx * 1.005;
    const y = L.cy + Math.sin(a) * ry * 1.005;
    const l = (3 + Math.abs(jit(i, 52)) * 4) * k;
    g.moveTo(x, y);
    g.lineTo(x - Math.cos(a) * l * 0.6 + jit(i, 53) * 2 * k, y - Math.sin(a) * l * 0.6 - l * 0.4);
  }
  g.stroke();
}

// Festival bunting strung across the top of the field.
export function drawBunting(g, x0, x1, y, sag, k, t, colors) {
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 1.5 * k;
  g.beginPath();
  g.moveTo(x0, y);
  g.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
  g.stroke();
  const n = Math.max(3, Math.round((x1 - x0) / (25 * k)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * u;
    const yy = y + 4 * sag * u * (1 - u);
    const sw = Math.sin(t * 2.3 + i * 0.9) * 0.14;
    g.save();
    g.translate(x, yy);
    g.rotate(sw);
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    g.moveTo(-8 * k, 0);
    g.lineTo(8 * k, 0);
    g.lineTo(0, 14 * k);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(8 * k, 0);
    g.lineTo(0, 14 * k);
    g.closePath();
    g.fill();
    g.restore();
  }
}

// A small pennant on a pole (marks the ends of each player's win line).
export function drawFlag(g, x, y, s, color, t, side = 1) {
  g.strokeStyle = '#f4ead2';
  g.lineWidth = 2 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 22 * s);
  g.stroke();
  const wv = Math.sin(t * 6 + x * 0.05) * 2.5 * s;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - 22 * s);
  g.quadraticCurveTo(x + side * 7 * s, y - 21 * s + wv, x + side * 14 * s, y - 17.5 * s + wv);
  g.quadraticCurveTo(x + side * 7 * s, y - 15 * s + wv * 0.5, x, y - 13 * s);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(30,20,10,0.3)';
  g.beginPath();
  g.ellipse(x, y + 1, 3 * s, 1.4 * s, 0, 0, TAU);
  g.fill();
}

// ---------- ring ----------
export function drawRing(g, x, y, r, o = {}) {
  const t = o.t || 0;
  // shadow
  g.fillStyle = 'rgba(35,18,4,0.38)';
  g.beginPath();
  g.ellipse(x + r * 0.12, y + r * 0.62, r * 1.18, r * 0.5, 0, 0, TAU);
  g.fill();
  const lw = r * 0.46;
  const rr = r - lw / 2;
  g.lineWidth = lw + 2.6;
  g.strokeStyle = '#4c2f07';
  g.beginPath();
  g.arc(x, y, rr, 0, TAU);
  g.stroke();
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  gr.addColorStop(0, '#fff3b8');
  gr.addColorStop(0.3, '#ffd24d');
  gr.addColorStop(0.7, '#d9951c');
  gr.addColorStop(1, '#9c600d');
  g.lineWidth = lw;
  g.strokeStyle = gr;
  g.beginPath();
  g.arc(x, y, rr, 0, TAU);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = lw * 0.24;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y, rr + lw * 0.08, -2.7, -1.5);
  g.stroke();
  g.strokeStyle = 'rgba(90,50,5,0.45)';
  g.beginPath();
  g.arc(x, y, rr - lw * 0.1, 0.5, 1.9);
  g.stroke();
  if (o.flash > 0) {
    g.save();
    g.globalAlpha = Math.min(1, o.flash);
    g.strokeStyle = '#ffffff';
    g.lineWidth = lw * 0.7;
    g.beginPath();
    g.arc(x, y, rr, 0, TAU);
    g.stroke();
    g.restore();
  }
  // the white ribbon tied to the ring (the classic centre marker)
  const ba = o.ribbon ?? -Math.PI / 2;
  const bx = x + Math.cos(ba) * rr;
  const by = y + Math.sin(ba) * rr;
  const wv = Math.sin(t * 9) * 0.25 + (o.flutter || 0);
  g.fillStyle = '#ffffff';
  g.strokeStyle = 'rgba(60,40,30,0.45)';
  g.lineWidth = 1;
  for (let k = -1; k <= 1; k += 2) {
    const a = ba + k * 0.42 + wv * k; // tails stream outward
    const l = r * 0.95;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + Math.cos(a - 0.12) * l, by + Math.sin(a - 0.12) * l);
    g.lineTo(bx + Math.cos(a + 0.12) * l * 0.82, by + Math.sin(a + 0.12) * l * 0.82);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#ff4b5c';
  g.beginPath();
  g.ellipse(bx, by, r * 0.22, r * 0.17, ba, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(90,10,20,0.5)';
  g.stroke();
}

// ---------- rope ----------
export function ropeControl(x0, y0, x1, y1, sag) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < 0 || (ny === 0 && nx < 0)) {
    nx = -nx;
    ny = -ny;
  }
  return [(x0 + x1) / 2 + nx * sag, (y0 + y1) / 2 + ny * sag];
}

export function drawRope(g, x0, y0, x1, y1, o = {}) {
  const w = o.w || 5;
  const wob = o.wave ? Math.sin((o.t || 0) * 48) * o.wave : 0;
  const sag = (o.sag || 0) + wob;
  const [cx, cy] = ropeControl(x0, y0, x1, y1, sag);
  g.lineCap = 'round';
  const path = (ox, oy) => {
    g.beginPath();
    g.moveTo(x0 + ox, y0 + oy);
    g.quadraticCurveTo(cx + ox, cy + oy, x1 + ox, y1 + oy);
  };
  // shadow on the ground: a taut rope rides higher, so its shadow sits further away
  path(0, 3 + Math.max(0, 7 - Math.abs(sag) * 0.4) * (w / 5));
  g.strokeStyle = 'rgba(30,16,4,0.22)';
  g.lineWidth = w + 1;
  g.stroke();
  path(0, 0);
  g.strokeStyle = '#4b3013';
  g.lineWidth = w + 2.4;
  g.stroke();
  g.strokeStyle = o.butter ? '#ffe27a' : '#d8b066';
  g.lineWidth = w;
  g.stroke();
  g.setLineDash([w * 0.75, w * 0.85]);
  g.lineDashOffset = o.dash || 0;
  g.strokeStyle = o.butter ? '#eab42a' : '#a4783a';
  g.lineWidth = w * 0.62;
  g.stroke();
  g.setLineDash([]);
  path(-w * 0.12, -w * 0.18);
  g.strokeStyle = o.butter ? 'rgba(255,255,240,0.9)' : 'rgba(255,240,200,0.45)';
  g.lineWidth = Math.max(1, w * 0.2);
  g.stroke();
  // a grip wrap in the puller's colour just before the hands
  if (o.color) {
    g.strokeStyle = o.color;
    g.lineWidth = w + 1.4;
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const t = 0.7 + (i / 6) * 0.22;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      const x = a * x0 + b * cx + c * x1;
      const y = a * y0 + b * cy + c * y1;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
}

// ---------- pullers ----------
// Where a puller's body and fists are. (x, y) are the feet on the ground, (dx, dy) the unit
// vector toward the ring, lean 0..1 how hard they hang back, crouch 0..1 digging in.
export function pullerGeom(x, y, s, dx, dy, lean, crouch) {
  const tilt = clamp(-dx * lean * 0.6, -0.95, 0.95);
  const hgt = 21 * s * (1 - crouch * 0.16);
  const bx = x + Math.sin(tilt) * hgt;
  const by = y - Math.cos(tilt) * hgt - dy * lean * 3 * s;
  const reach = (12 + Math.max(0, lean) * 5 + (dy < -0.35 ? 5 : 0)) * s;
  return { tilt, bx, by, hx: bx + dx * reach, hy: by + dy * reach + 3 * s };
}

function drawArms(g, P, G, color, jx) {
  const { s, dx, dy } = P;
  const px = -dy;
  const py = dx;
  const armC = draw.shade(color, -0.2);
  const fist = draw.shade(color, 0.55);
  let hands;
  if (P.pose === 'cheer') {
    const up = Math.sin((P.t || 0) * 14) * 2 * s;
    hands = [
      [G.bx - 15 * s, G.by - 22 * s + up],
      [G.bx + 15 * s, G.by - 22 * s - up],
    ];
  } else if (P.pose === 'slip') {
    const f = Math.sin((P.t || 0) * 30) * 5 * s;
    hands = [
      [G.hx + px * 9 * s + f, G.hy + py * 9 * s - 6 * s],
      [G.hx - px * 9 * s - f, G.hy - py * 9 * s - 4 * s],
    ];
  } else {
    hands = [
      [G.hx + px * 2.7 * s, G.hy + py * 2.7 * s],
      [G.hx - px * 2.7 * s, G.hy - py * 2.7 * s],
    ];
  }
  g.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const side = k ? 1 : -1;
    const [sx0, sy0] = rot(side * 10.5 * s, 1.5 * s, G.tilt);
    g.strokeStyle = armC;
    g.lineWidth = 5.2 * s;
    g.beginPath();
    g.moveTo(G.bx + sx0 + jx, G.by + sy0);
    g.lineTo(hands[k][0], hands[k][1]);
    g.stroke();
  }
  for (let k = 0; k < 2; k++) {
    g.fillStyle = fist;
    g.beginPath();
    g.arc(hands[k][0], hands[k][1], 3.9 * s, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(25,10,35,0.45)';
    g.lineWidth = 1.2 * s;
    g.stroke();
  }
}

export function drawPuller(g, P) {
  const { x, y, s, dx, dy, color } = P;
  const t = P.t || 0;
  const lean = P.lean ?? 0.4;
  const crouch = P.crouch || 0;
  const strain = P.strain || 0;
  const pose = P.pose || 'pull';
  const G = P.geom || pullerGeom(x, y, s, dx, dy, lean, crouch);
  if (pose === 'down') {
    drawFallen(g, P);
    return;
  }
  const dark = draw.shade(color, -0.4);
  const mid = draw.shade(color, -0.12);
  const light = draw.shade(color, 0.45);
  const away = dx >= 0 ? -1 : 1;
  const jx = P.shake ? Math.sin(t * 63) * P.shake * s : 0;
  // shadow
  g.fillStyle = 'rgba(25,14,4,0.3)';
  g.beginPath();
  g.ellipse(x + (G.bx - x) * 0.5, y + s, (16 + crouch * 3) * s, 5.5 * s, 0, 0, TAU);
  g.fill();
  // legs and shoes: the stance braces away from the ring
  const brace = Math.max(0, lean) * 4 * s;
  const spread = (6 + crouch * 3) * s;
  g.lineCap = 'round';
  for (let k = -1; k <= 1; k += 2) {
    const [hx0, hy0] = rot(k * 6 * s, 11 * s, G.tilt);
    const fx0 = x + k * spread - dx * brace;
    const fy0 = y - dy * brace * 0.5;
    g.strokeStyle = dark;
    g.lineWidth = 5.5 * s;
    g.beginPath();
    g.moveTo(G.bx + hx0 + jx, G.by + hy0);
    g.lineTo(fx0, fy0);
    g.stroke();
    g.fillStyle = '#2b2236';
    g.beginPath();
    g.ellipse(fx0 - dx * 1.5 * s, fy0 + 0.5 * s, 4.6 * s, 2.8 * s, 0, 0, TAU);
    g.fill();
  }
  // headband tails flap behind the head, away from the ring
  {
    const [kx, ky] = rot(away * 13 * s, -11 * s, G.tilt);
    const ox = G.bx + kx + jx;
    const oy = G.by + ky;
    const fl = Math.sin(t * 11 + x) * 2.5 * s;
    const tx = -dx * 12 * s + away * 4 * s;
    const ty = -dy * 8 * s + 2 * s;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3 * s;
    g.beginPath();
    g.moveTo(ox, oy);
    g.quadraticCurveTo(ox + tx * 0.5, oy + ty * 0.5 + fl, ox + tx, oy + ty - fl);
    g.moveTo(ox, oy + 1 * s);
    g.quadraticCurveTo(ox + tx * 0.4, oy + ty * 0.4 + 4 * s - fl, ox + tx * 0.8, oy + ty * 0.8 + 6 * s + fl);
    g.stroke();
  }
  const armsBehind = dy < -0.35 && pose !== 'cheer';
  if (armsBehind) drawArms(g, P, G, color, jx);
  // body
  g.save();
  g.translate(G.bx + jx, G.by);
  g.rotate(G.tilt);
  const sq = 1 - crouch * 0.07 + (P.kick || 0) * 0.04;
  g.scale(2 - sq, sq);
  const rx = 15 * s;
  const ry = 17.5 * s;
  const bg = g.createRadialGradient(-rx * 0.35, -ry * 0.45, 2 * s, 0, 0, ry * 1.1);
  bg.addColorStop(0, light);
  bg.addColorStop(0.55, color);
  bg.addColorStop(1, mid);
  g.fillStyle = bg;
  g.beginPath();
  g.ellipse(0, 0, rx, ry, 0, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(25,10,35,0.38)';
  g.lineWidth = 1.4 * s;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.ellipse(0, 8.5 * s, 9 * s, 6.5 * s, 0, 0, TAU);
  g.fill();
  // headband
  g.save();
  g.beginPath();
  g.ellipse(0, 0, rx, ry, 0, 0, TAU);
  g.clip();
  g.fillStyle = '#ffffff';
  g.fillRect(-rx, -13.6 * s, rx * 2, 4.6 * s);
  g.fillStyle = 'rgba(30,20,40,0.18)';
  g.fillRect(-rx, -9.8 * s, rx * 2, 0.9 * s);
  g.restore();
  // face: features drift toward the ring
  const [lx, ly] = rot(dx, dy, -G.tilt);
  const fx1 = lx * 2.6 * s;
  const fy1 = ly * 1.8 * s;
  const ink = '#1d1430';
  // blush
  g.fillStyle = 'rgba(255,110,150,0.38)';
  for (let k = -1; k <= 1; k += 2) {
    g.beginPath();
    g.ellipse(k * 9.6 * s + fx1 * 0.6, 3.8 * s + fy1, 2.8 * s, 1.7 * s, 0, 0, TAU);
    g.fill();
  }
  // eyes
  for (let k = -1; k <= 1; k += 2) {
    const ex = k * 5.4 * s + fx1;
    const ey = -2.2 * s + fy1;
    if (pose === 'cheer') {
      g.strokeStyle = ink;
      g.lineWidth = 1.8 * s;
      g.beginPath();
      g.arc(ex, ey + 1.5 * s, 3 * s, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
      continue;
    }
    const squint = pose === 'slip' ? 1.2 : strain > 0.55 ? 0.72 : 1;
    const blink = P.blink && pose !== 'slip';
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(ex, ey, 3.9 * s, (blink ? 0.6 : 4.6 * squint) * s, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(29,20,48,0.35)';
    g.lineWidth = 0.9 * s;
    g.stroke();
    if (!blink) {
      g.fillStyle = ink;
      g.beginPath();
      g.arc(ex + lx * 1.4 * s, ey + ly * 1.5 * s, (pose === 'slip' ? 1.5 : 2.2) * s, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(ex + lx * 1.4 * s - 0.8 * s, ey + ly * 1.5 * s - 0.9 * s, 0.75 * s, 0, TAU);
      g.fill();
    }
  }
  // brows
  if (strain > 0.3 || pose === 'slip') {
    g.strokeStyle = ink;
    g.lineWidth = 1.7 * s;
    g.lineCap = 'round';
    for (let k = -1; k <= 1; k += 2) {
      g.beginPath();
      if (pose === 'slip') {
        g.moveTo(k * 2.6 * s + fx1, -8.6 * s + fy1);
        g.lineTo(k * 8.4 * s + fx1, -7.2 * s + fy1);
      } else {
        g.moveTo(k * 2.2 * s + fx1, -6.4 * s + fy1 + strain * 0.8 * s);
        g.lineTo(k * 8.6 * s + fx1, -8.6 * s + fy1);
      }
      g.stroke();
    }
  }
  // mouth
  const mx = fx1 * 0.8;
  const my = 6 * s + fy1;
  if (pose === 'slip') {
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(mx, my, 2.5 * s, 3.1 * s, 0, 0, TAU);
    g.fill();
  } else if (pose === 'cheer') {
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(mx, my - 0.5 * s, 4.4 * s, 3.6 * s, 0, 0, Math.PI);
    g.fill();
    g.fillStyle = '#ff7a95';
    g.beginPath();
    g.ellipse(mx, my + 1.6 * s, 2.4 * s, 1.3 * s, 0, 0, TAU);
    g.fill();
  } else if (strain > 0.55) {
    draw.roundRect(g, mx - 4.6 * s, my - 2.2 * s, 9.2 * s, 4.4 * s, 1.6 * s, '#ffffff', ink, 1.2 * s);
    g.strokeStyle = 'rgba(29,20,48,0.6)';
    g.lineWidth = 0.8 * s;
    g.beginPath();
    g.moveTo(mx - 4.4 * s, my);
    g.lineTo(mx + 4.4 * s, my);
    g.moveTo(mx - 1.5 * s, my - 2.1 * s);
    g.lineTo(mx - 1.5 * s, my + 2.1 * s);
    g.moveTo(mx + 1.5 * s, my - 2.1 * s);
    g.lineTo(mx + 1.5 * s, my + 2.1 * s);
    g.stroke();
  } else {
    g.strokeStyle = ink;
    g.lineWidth = 1.6 * s;
    g.beginPath();
    g.arc(mx, my - 1.6 * s, 2.8 * s, 0.25 * Math.PI, 0.75 * Math.PI);
    g.stroke();
  }
  // sweat
  if (P.sweat > 0) {
    const sx = away * 13 * s;
    const sy = -12 * s + ((t * 18) % 6) * s;
    g.globalAlpha = Math.min(1, P.sweat);
    g.fillStyle = '#9fe3ff';
    g.beginPath();
    g.moveTo(sx, sy - 4 * s);
    g.quadraticCurveTo(sx + 3 * s, sy, sx, sy + 2.4 * s);
    g.quadraticCurveTo(sx - 3 * s, sy, sx, sy - 4 * s);
    g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
  if (!armsBehind) drawArms(g, P, G, color, jx);
}

// Face-down in the dirt, still clutching the rope.
function drawFallen(g, P) {
  const { x, y, s, dx, dy, color } = P;
  const t = P.t || 0;
  const side = dx >= 0 ? 1 : -1;
  const bx = x + dx * 9 * s;
  const by = y - 6 * s + dy * 5 * s;
  g.fillStyle = 'rgba(25,14,4,0.32)';
  g.beginPath();
  g.ellipse(bx, by + 6 * s, 22 * s, 6.5 * s, 0, 0, TAU);
  g.fill();
  // feet in the air at the far end
  const fx0 = bx - side * 17 * s;
  g.strokeStyle = draw.shade(color, -0.4);
  g.lineWidth = 5 * s;
  g.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const kick = Math.sin(t * 9 + k * 2) * 2 * s;
    g.beginPath();
    g.moveTo(fx0 + side * 3 * s, by - 2 * s);
    g.lineTo(fx0 - side * (4 + k * 4) * s, by - (11 + k * 2) * s + kick);
    g.stroke();
    g.fillStyle = '#2b2236';
    g.beginPath();
    g.ellipse(fx0 - side * (4 + k * 4) * s, by - (12 + k * 2) * s + kick, 3 * s, 4.2 * s, 0.3 * side, 0, TAU);
    g.fill();
  }
  // squashed body
  g.save();
  g.translate(bx, by);
  const grd = g.createRadialGradient(-6 * s, -6 * s, 2 * s, 0, 0, 20 * s);
  grd.addColorStop(0, draw.shade(color, 0.4));
  grd.addColorStop(1, draw.shade(color, -0.15));
  g.fillStyle = grd;
  g.beginPath();
  g.ellipse(0, 0, 19 * s, 11.5 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(25,10,35,0.38)';
  g.lineWidth = 1.4 * s;
  g.stroke();
  // mud splats
  g.fillStyle = 'rgba(90,52,22,0.75)';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(jit(i, 61) * 12 * s, jit(i, 62) * 6 * s, (2.2 + Math.abs(jit(i, 63)) * 2) * s, 1.6 * s, 0, 0, TAU);
    g.fill();
  }
  // dizzy X eyes on the ring side
  g.strokeStyle = '#1d1430';
  g.lineWidth = 1.7 * s;
  for (let k = 0; k < 2; k++) {
    const ex = side * (7 + k * 6) * s;
    const ey = -2 * s;
    g.beginPath();
    g.moveTo(ex - 2.2 * s, ey - 2.2 * s);
    g.lineTo(ex + 2.2 * s, ey + 2.2 * s);
    g.moveTo(ex + 2.2 * s, ey - 2.2 * s);
    g.lineTo(ex - 2.2 * s, ey + 2.2 * s);
    g.stroke();
  }
  g.restore();
  // little stars circling the head
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + (i / 3) * TAU;
    const sx0 = bx + side * 10 * s + Math.cos(a) * 11 * s;
    const sy0 = by - 13 * s + Math.sin(a) * 3.5 * s;
    g.fillStyle = '#ffe066';
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = (k % 2 ? 1.2 : 3) * s;
      const aa = (k / 10) * TAU - Math.PI / 2;
      if (k) g.lineTo(sx0 + Math.cos(aa) * rr, sy0 + Math.sin(aa) * rr);
      else g.moveTo(sx0 + Math.cos(aa) * rr, sy0 + Math.sin(aa) * rr);
    }
    g.closePath();
    g.fill();
  }
  // arms stretched out toward the ring, fists still on the rope
  const hx = P.hx ?? bx + dx * 22 * s;
  const hy = P.hy ?? by + dy * 22 * s;
  g.strokeStyle = draw.shade(color, -0.2);
  g.lineWidth = 5 * s;
  g.beginPath();
  g.moveTo(bx + side * 12 * s, by - 2 * s);
  g.lineTo(hx, hy);
  g.stroke();
  g.fillStyle = draw.shade(color, 0.55);
  g.beginPath();
  g.arc(hx, hy, 3.9 * s, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(25,10,35,0.45)';
  g.lineWidth = 1.2 * s;
  g.stroke();
}
