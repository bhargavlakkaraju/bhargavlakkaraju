// Puck Panic art: mallets, pucks, glows and the cover illustration.
// Pure drawing helpers (no game state), shared by the game renderer and cover().

const TAU = Math.PI * 2;

export const TABLE = {
  bg: '#03161a',
  surfIn: '#0e4249',
  surfOut: '#06232a',
  frameA: '#123840',
  frameB: '#0a242a',
  rail: '#9ff8ea',
  railGlow: '#3de8d0',
  line: '#ff7a5c',
};

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Soft radial glow sprites, cached per color (drawImage is far cheaper than shadowBlur).
const GLOWS = new Map();
export function glow(color, size = 64, strength = 0.55) {
  const key = color + size + strength;
  if (GLOWS.has(key)) return GLOWS.get(key);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  gr.addColorStop(0, color);
  gr.addColorStop(0.3, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = strength;
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  GLOWS.set(key, c);
  return c;
}

// Top-down air hockey mallet: colored rim, grooved deck and a round handle knob.
// o: { charge (0..1 glow), flash (0..1 hit flash), t (seconds), alpha }
export function drawMallet(g, x, y, r, color, o = {}) {
  const charge = o.charge || 0;
  const flash = o.flash || 0;
  const t = o.t || 0;
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  const gl = glow(color, 96, 0.5 + charge * 0.3);
  if (gl) {
    const gs = r * (4.2 + charge * 1.2);
    g.drawImage(gl, x - gs / 2, y - gs / 2, gs, gs);
  }
  // drop shadow on the table
  g.fillStyle = 'rgba(0,10,14,0.45)';
  g.beginPath();
  g.arc(x + r * 0.12, y + r * 0.2, r * 1.02, 0, TAU);
  g.fill();
  // deck
  const deck = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  deck.addColorStop(0, shade(color, -0.1));
  deck.addColorStop(1, shade(color, -0.55));
  g.fillStyle = deck;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  // bright rim
  g.strokeStyle = flash > 0 ? '#ffffff' : color;
  g.lineWidth = Math.max(2, r * 0.17);
  g.beginPath();
  g.arc(x, y, r - g.lineWidth / 2, 0, TAU);
  g.stroke();
  // groove
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.lineWidth = Math.max(1, r * 0.07);
  g.beginPath();
  g.arc(x, y, r * 0.66, 0, TAU);
  g.stroke();
  // handle knob
  const kr = r * 0.45;
  const knob = g.createRadialGradient(x - kr * 0.4, y - kr * 0.45, kr * 0.1, x, y, kr);
  knob.addColorStop(0, '#ffffff');
  knob.addColorStop(0.35, shade(color, 0.45));
  knob.addColorStop(1, color);
  g.fillStyle = knob;
  g.beginPath();
  g.arc(x, y, kr, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1;
  g.stroke();
  if (flash > 0) {
    g.globalAlpha *= flash;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.restore();
  // charging: a spinning dashed ring around the mallet
  if (charge > 0) {
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.strokeStyle = color;
    g.globalAlpha *= 0.55 + 0.45 * charge;
    g.lineWidth = 3;
    g.setLineDash([r * 0.5, r * 0.32]);
    g.lineDashOffset = -t * 60;
    g.beginPath();
    g.arc(x, y, r + 5 + Math.sin(t * 18) * 1.2, 0, TAU);
    g.stroke();
    g.restore();
  }
}

// Air hockey puck: dark disk, neon rim and a spin mark. o: { color, ang, alpha, glow }
export function drawPuck(g, x, y, r, o = {}) {
  const col = o.color || '#ffffff';
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  const gl = glow(col, 64, 0.6);
  if (gl && o.glow !== false) {
    const gs = r * 6;
    g.drawImage(gl, x - gs / 2, y - gs / 2, gs, gs);
  }
  g.fillStyle = 'rgba(0,10,14,0.4)';
  g.beginPath();
  g.arc(x + r * 0.15, y + r * 0.22, r, 0, TAU);
  g.fill();
  const body = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  body.addColorStop(0, '#3c5560');
  body.addColorStop(1, '#0d171d');
  g.fillStyle = body;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = Math.max(2, r * 0.26);
  g.beginPath();
  g.arc(x, y, r - g.lineWidth / 2, 0, TAU);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = Math.max(1, r * 0.09);
  g.beginPath();
  g.arc(x, y, r * 0.7, 0, TAU);
  g.stroke();
  // spin mark: two opposite ticks that rotate with the puck
  const a = o.ang || 0;
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = Math.max(1.2, r * 0.16);
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y, r * 0.48, a, a + 1.1);
  g.moveTo(x + Math.cos(a + Math.PI) * r * 0.48, y + Math.sin(a + Math.PI) * r * 0.48);
  g.arc(x, y, r * 0.48, a + Math.PI, a + Math.PI + 1.1);
  g.stroke();
  g.restore();
}

// ---------- cover art ----------
// A neon air hockey table in perspective: the puck has just kissed the right rail in a
// shower of sparks, trailing light back to the pink mallet that smashed it, while the
// other three mallets guard their goals.
const PAL = ['#ff3d8b', '#2fd9ff', '#ffc93c', '#7dff5a'];
// deterministic jitter in [0, 1)
const hash = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export function cover(g, w, h) {
  const bg = g.createRadialGradient(w / 2, h * 0.6, 10, w / 2, h * 0.6, Math.max(w, h) * 0.75);
  bg.addColorStop(0, '#0c4248');
  bg.addColorStop(0.5, '#05222b');
  bg.addColorStop(1, '#020c11');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const u = Math.min(w, h * 1.3) / 800; // size unit
  // arcade bokeh behind the table
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 1) * w;
    const y = hash(i, 2) * h * 0.75;
    const r = (14 + hash(i, 3) * 46) * u;
    const c = i % 3 === 0 ? PAL[i % 4] : '#3de8d0';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(c, 0.16));
    gr.addColorStop(0.7, rgba(c, 0.07));
    gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // light beams from above
  for (let i = 0; i < 6; i++) {
    const x = w * (0.04 + i * 0.19);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(80,255,220,0.08)');
    gr.addColorStop(1, 'rgba(80,255,220,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x - w * 0.025, 0);
    g.lineTo(x + w * 0.025, 0);
    g.lineTo(x + w * 0.1, h);
    g.lineTo(x - w * 0.03, h);
    g.closePath();
    g.fill();
  }
  g.restore();

  // Ground-plane perspective: table units x across (-1..1), y along (+HALF_L is the near end).
  const Z0 = 1;
  const Z1 = 2.5;
  const fx = Math.min(w * 0.45, h * 0.66);
  const nearY = h * 0.95;
  const farY = h * 0.15;
  const k = (nearY - farY) / (1 / Z0 - 1 / Z1);
  const hy = nearY - k / Z0;
  const HALF_W = 1;
  const HALF_L = 1.38;
  const vOf = (y) => (HALF_L - y) / (2 * HALF_L);
  const zOf = (v) => Z0 + (Z1 - Z0) * v;
  const S = (x, y) => {
    const z = zOf(vOf(y));
    return [w / 2 + (x * fx) / z, hy + k / z];
  };
  const scaleAt = (y) => fx / zOf(vOf(y));
  // how much a flat circle on the table is squashed vertically at depth y
  const squash = (y) => {
    const [, y0] = S(0, y - 0.02);
    const [, y1] = S(0, y + 0.02);
    return Math.min(0.85, Math.abs(y1 - y0) / (0.04 * scaleAt(y)));
  };
  const outline = (inset, rc) => {
    const pts = [];
    const hw = HALF_W - inset;
    const hl = HALF_L - inset;
    const cs = [
      [hw - rc, hl - rc, 0],
      [-hw + rc, hl - rc, Math.PI / 2],
      [-hw + rc, -hl + rc, Math.PI],
      [hw - rc, -hl + rc, Math.PI * 1.5],
    ];
    for (const [cx, cy, a0] of cs) {
      for (let i = 0; i <= 8; i++) {
        const a = a0 + (i / 8) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]);
      }
    }
    return pts;
  };
  const pathOf = (pts) => {
    g.beginPath();
    pts.forEach((p, i) => {
      const [sx, sy] = S(p[0], p[1]);
      if (i) g.lineTo(sx, sy);
      else g.moveTo(sx, sy);
    });
    g.closePath();
  };
  const ring = (cx, cy, r, a0, a1, color, width) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = a0 + ((a1 - a0) * i) / 40;
      const [sx, sy] = S(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      if (i) g.lineTo(sx, sy);
      else g.moveTo(sx, sy);
    }
    g.stroke();
  };

  // table body and frame
  const frame = outline(-0.09, 0.2);
  g.save();
  g.translate(0, h * 0.03);
  pathOf(frame);
  g.fillStyle = '#031014';
  g.fill();
  g.restore();
  pathOf(frame);
  const fg = g.createLinearGradient(0, farY, 0, nearY);
  fg.addColorStop(0, '#0f2f36');
  fg.addColorStop(1, '#17474f');
  g.fillStyle = fg;
  g.fill();
  // playing surface
  const surf = outline(0, 0.14);
  pathOf(surf);
  const [scx, scy] = S(0, 0);
  const sg = g.createRadialGradient(scx, scy, 10, scx, scy, Math.max(w, h) * 0.55);
  sg.addColorStop(0, '#14555d');
  sg.addColorStop(1, '#062830');
  g.fillStyle = sg;
  g.fill();
  g.save();
  pathOf(surf);
  g.clip();
  g.fillStyle = 'rgba(170,255,240,0.17)';
  for (let iy = 0; iy <= 30; iy++) {
    const ty = -HALF_L + (iy / 30) * 2 * HALF_L;
    const rr = Math.max(0.7, scaleAt(ty) * 0.008);
    for (let ix = 0; ix <= 22; ix++) {
      const [sx, sy] = S(-HALF_W + (ix / 22) * 2 * HALF_W, ty);
      g.fillRect(sx - rr / 2, sy - rr / 2, rr, rr * 0.7);
    }
  }
  const zones = [
    [0, HALF_L, PAL[0]],
    [0, -HALF_L, PAL[1]],
    [-HALF_W, 0, PAL[2]],
    [HALF_W, 0, PAL[3]],
  ];
  for (const [zx, zy, c] of zones) {
    const [sx, sy] = S(zx, zy);
    const rad = scaleAt(zy) * 0.8;
    const zg = g.createRadialGradient(sx, sy, 2, sx, sy, rad);
    zg.addColorStop(0, rgba(c, 0.3));
    zg.addColorStop(1, rgba(c, 0));
    g.fillStyle = zg;
    g.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
  }
  const lw = Math.max(1.5, h * 0.004);
  g.lineWidth = lw;
  g.strokeStyle = rgba(TABLE.line, 0.55);
  g.beginPath();
  const l0 = S(-HALF_W, 0);
  const l1 = S(HALF_W, 0);
  g.moveTo(l0[0], l0[1]);
  g.lineTo(l1[0], l1[1]);
  g.stroke();
  ring(0, 0, 0.32, 0, TAU, 'rgba(255,255,255,0.22)', lw);
  ring(0, HALF_L, 0.5, Math.PI, TAU, rgba(PAL[0], 0.7), lw * 1.3);
  ring(0, -HALF_L, 0.5, 0, Math.PI, rgba(PAL[1], 0.7), lw * 1.3);
  ring(-HALF_W, 0, 0.5, -Math.PI / 2, Math.PI / 2, rgba(PAL[2], 0.6), lw * 1.3);
  ring(HALF_W, 0, 0.5, Math.PI / 2, Math.PI * 1.5, rgba(PAL[3], 0.6), lw * 1.3);
  g.restore();

  // neon rail
  g.save();
  pathOf(surf);
  g.shadowColor = TABLE.railGlow;
  g.shadowBlur = h * 0.03;
  g.strokeStyle = TABLE.rail;
  g.lineWidth = Math.max(2.5, h * 0.008);
  g.stroke();
  g.restore();
  const goal = (ax, ay, bx, by, c) => {
    const [x0, y0] = S(ax, ay);
    const [x1, y1] = S(bx, by);
    g.save();
    g.lineCap = 'round';
    g.shadowColor = c;
    g.shadowBlur = h * 0.045;
    g.strokeStyle = '#0a1418';
    g.lineWidth = Math.max(6, h * 0.022);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = c;
    g.lineWidth = Math.max(3, h * 0.01);
    g.stroke();
    g.restore();
    for (const [px, py] of [
      [x0, y0],
      [x1, y1],
    ]) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(px, py, Math.max(2.5, h * 0.008), 0, TAU);
      g.fill();
    }
  };
  goal(-0.36, HALF_L, 0.36, HALF_L, PAL[0]);
  goal(-0.36, -HALF_L, 0.36, -HALF_L, PAL[1]);
  goal(-HALF_W, -0.36, -HALF_W, 0.36, PAL[2]);
  goal(HALF_W, -0.36, HALF_W, 0.36, PAL[3]);

  // a mallet standing on the table: a low disk with a tall round handle
  const mallet = (tx, ty, r, color) => {
    const [sx, sy] = S(tx, ty);
    const rx = r * scaleAt(ty);
    const sq = squash(ty);
    const ry = rx * sq;
    const base = rx * 0.3;
    const gl = glow(color, 128, 0.75);
    if (gl) g.drawImage(gl, sx - rx * 2.6, sy - rx * 2.3, rx * 5.2, rx * 4.4);
    g.fillStyle = 'rgba(0,10,14,0.55)';
    g.beginPath();
    g.ellipse(sx + rx * 0.12, sy + ry * 0.35, rx * 1.06, ry * 1.06, 0, 0, TAU);
    g.fill();
    // disk side
    g.fillStyle = shade(color, -0.5);
    g.beginPath();
    g.ellipse(sx, sy, rx, ry, 0, 0, Math.PI);
    g.lineTo(sx - rx, sy - base);
    g.ellipse(sx, sy - base, rx, ry, 0, Math.PI, 0, true);
    g.closePath();
    g.fill();
    // disk top
    const top = sy - base;
    const dg = g.createRadialGradient(sx - rx * 0.3, top - ry * 0.4, 1, sx, top, rx);
    dg.addColorStop(0, shade(color, -0.05));
    dg.addColorStop(1, shade(color, -0.45));
    g.fillStyle = dg;
    g.beginPath();
    g.ellipse(sx, top, rx, ry, 0, 0, TAU);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = Math.max(2, rx * 0.14);
    g.beginPath();
    g.ellipse(sx, top, rx * 0.92, ry * 0.92, 0, 0, TAU);
    g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.lineWidth = Math.max(1, rx * 0.05);
    g.beginPath();
    g.ellipse(sx, top, rx * 0.62, ry * 0.62, 0, 0, TAU);
    g.stroke();
    // handle: a column with a domed cap
    const kr = rx * 0.38;
    const kh = rx * 0.7;
    const col = g.createLinearGradient(sx - kr, 0, sx + kr, 0);
    col.addColorStop(0, shade(color, -0.35));
    col.addColorStop(0.35, shade(color, 0.15));
    col.addColorStop(1, shade(color, -0.5));
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(sx, top, kr, kr * sq, 0, 0, Math.PI);
    g.lineTo(sx - kr, top - kh);
    g.ellipse(sx, top - kh, kr, kr * sq, 0, Math.PI, 0, true);
    g.closePath();
    g.fill();
    const kg = g.createRadialGradient(sx - kr * 0.35, top - kh - kr * 0.3, 1, sx, top - kh, kr * 1.1);
    kg.addColorStop(0, '#ffffff');
    kg.addColorStop(0.45, shade(color, 0.35));
    kg.addColorStop(1, color);
    g.fillStyle = kg;
    g.beginPath();
    g.ellipse(sx, top - kh, kr, kr * Math.max(0.55, sq), 0, 0, TAU);
    g.fill();
  };

  // light trail: two straight legs (pink mallet -> rail, rail -> puck), each a tapered
  // band with a gradient, so it reads as one smooth streak
  const A = [-0.3, 0.72];
  const B = [HALF_W - 0.075, -0.02];
  const C = [0.42, -0.36];
  const leg = (p0, p1, w0, w1, a0, a1) => {
    const [x0, y0] = S(p0[0], p0[1]);
    const [x1, y1] = S(p1[0], p1[1]);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    for (const [mul, col, am] of [
      [3.2, '255,70,150', 0.55],
      [1, '255,255,255', 0.9],
    ]) {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, `rgba(${col},${a0 * am})`);
      gr.addColorStop(1, `rgba(${col},${a1 * am})`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x0 + nx * w0 * mul, y0 + ny * w0 * mul);
      g.lineTo(x1 + nx * w1 * mul, y1 + ny * w1 * mul);
      g.lineTo(x1 - nx * w1 * mul, y1 - ny * w1 * mul);
      g.lineTo(x0 - nx * w0 * mul, y0 - ny * w0 * mul);
      g.closePath();
      g.fill();
    }
  };
  const tw = (y) => scaleAt(y) * 0.035;
  g.save();
  g.globalCompositeOperation = 'lighter';
  leg(A, B, tw(A[1]) * 0.2, tw(B[1]) * 0.75, 0, 0.75);
  leg(B, C, tw(B[1]) * 0.75, tw(C[1]) * 1.1, 0.75, 1);
  g.restore();

  // sparks where the puck kissed the rail
  const [bx, by] = S(HALF_W, B[1]);
  const ss = scaleAt(B[1]);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const sgl = glow('#ffe7a0', 128, 0.95);
  if (sgl) g.drawImage(sgl, bx - ss * 0.38, by - ss * 0.38, ss * 0.76, ss * 0.76);
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const a = Math.PI * 0.45 + (i / 21) * Math.PI * 1.1 + (hash(i, 5) - 0.5) * 0.3;
    const l = ss * (0.07 + hash(i, 6) * 0.2);
    g.strokeStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffd27a' : '#9ff8ea';
    g.lineWidth = Math.max(1.5, h * 0.0045);
    g.beginPath();
    g.moveTo(bx + Math.cos(a) * l * 0.3, by + Math.sin(a) * l * 0.3 * 0.6);
    g.lineTo(bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.6);
    g.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 0.5 + hash(i, 7) * Math.PI;
    const l = ss * (0.12 + hash(i, 8) * 0.22);
    g.fillStyle = i % 2 ? '#ffffff' : '#ffd27a';
    g.beginPath();
    g.arc(bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.6, Math.max(1.2, h * 0.003), 0, TAU);
    g.fill();
  }
  g.restore();

  // far mallets first
  mallet(0.06, -HALF_L + 0.3, 0.16, PAL[1]);
  mallet(-HALF_W + 0.26, -0.24, 0.16, PAL[2]);

  // the puck, flat on the table, with a hot glow
  const [px, py] = S(C[0], C[1]);
  const pr = scaleAt(C[1]) * 0.1;
  const psq = squash(C[1]);
  const pgl = glow('#ffffff', 128, 0.9);
  if (pgl) g.drawImage(pgl, px - pr * 3.6, py - pr * 3.2, pr * 7.2, pr * 6.4);
  g.fillStyle = '#05090c';
  g.beginPath();
  g.ellipse(px, py + pr * 0.22, pr, pr * psq, 0, 0, TAU);
  g.fill();
  g.fillRect(px - pr, py, pr * 2, pr * 0.22);
  g.fillStyle = '#1a2a33';
  g.beginPath();
  g.ellipse(px, py, pr, pr * psq, 0, 0, TAU);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(2, pr * 0.24);
  g.beginPath();
  g.ellipse(px, py, pr * 0.88, pr * psq * 0.88, 0, 0, TAU);
  g.stroke();

  mallet(HALF_W - 0.27, 0.46, 0.16, PAL[3]);
  // pink mallet up front, still sliding from the smash, with speed streaks
  const [msx, msy] = S(A[0] - 0.02, A[1] + 0.16);
  const msc = scaleAt(A[1] + 0.16);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * msc * 0.07;
    g.strokeStyle = rgba(PAL[0], 0.55 - i * 0.09);
    g.lineWidth = Math.max(2, msc * 0.022);
    g.beginPath();
    g.moveTo(msx - msc * 0.18 + off, msy + msc * 0.12 + Math.abs(off) * 0.3);
    g.lineTo(msx - msc * 0.42 + off * 1.4, msy + msc * 0.3 + Math.abs(off) * 0.4);
    g.stroke();
  }
  g.restore();
  mallet(A[0] - 0.02, A[1] + 0.16, 0.2, PAL[0]);
}
