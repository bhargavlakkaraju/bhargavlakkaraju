// Reflex Duel art: a neon-western sunset street and the gunslingers who duel on it.
// Shared by the game and its cover. Everything is Canvas 2D paths, no images.
const TAU = Math.PI * 2;

export const BODY = '#170a1c';
export const GOLD = '#ffd23f';

const lerp = (a, b, k) => a + (b - a) * k;

// deterministic jitter in [-1, 1] (cosmetic shapes stay put between frames)
export const jit = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

// ---------- sky ----------
export function drawSky(g, w, h, hy, T, o = {}) {
  const s = o.s || 1;
  const night = !!o.night;
  const z = o.zoom || 1;
  const sx = o.sunX ?? w / 2;
  const sg = g.createLinearGradient(0, 0, 0, hy);
  if (night) {
    sg.addColorStop(0, '#02030f');
    sg.addColorStop(0.55, '#0a1238');
    sg.addColorStop(1, '#25357a');
  } else {
    sg.addColorStop(0, '#1a0830');
    sg.addColorStop(0.3, '#46124e');
    sg.addColorStop(0.6, '#a12c55');
    sg.addColorStop(0.86, '#f2683c');
    sg.addColorStop(1, '#ffb655');
  }
  g.fillStyle = sg;
  g.fillRect(0, 0, w, hy + 1);

  g.save();
  g.beginPath();
  g.rect(0, 0, w, hy + 0.5);
  g.clip();
  // slow push-in on the background while the tension builds
  g.translate(sx, hy);
  g.scale(z, z);
  g.translate(-sx, -hy);

  // stars (a whole sky of them at night, a few at the top of the dusk)
  g.fillStyle = '#ffffff';
  const nStars = night ? 90 : 34;
  for (let i = 0; i < nStars; i++) {
    const x = (jit(i, 1) * 0.5 + 0.5) * w;
    const yk = jit(i, 2) * 0.5 + 0.5;
    const y = yk * hy * (night ? 0.94 : 0.5);
    const tw = 0.55 + 0.45 * Math.sin(T * (0.8 + (i % 7) * 0.35) + i * 2.1);
    const a = night ? 0.25 + 0.75 * tw : (0.55 - yk) * tw;
    if (a <= 0.02) continue;
    g.globalAlpha = Math.min(1, a);
    const r = (i % 9 === 0 ? 2 : 1.2) * s;
    g.fillRect(x - r / 2, y - r / 2, r, r);
  }
  g.globalAlpha = 1;

  const r = o.sunR ?? 92 * s;
  if (night) {
    // moon
    const mx = sx + r * 0.95;
    const my = hy - r * 1.05;
    const mr = r * 0.42;
    const mg = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
    mg.addColorStop(0, 'rgba(170,195,255,0.35)');
    mg.addColorStop(1, 'rgba(120,150,255,0)');
    g.fillStyle = mg;
    g.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
    g.fillStyle = '#f2efdc';
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(160,160,190,0.35)';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(mx + jit(i, 41) * mr * 0.5, my + jit(i, 42) * mr * 0.5, mr * (0.1 + Math.abs(jit(i, 43)) * 0.14), 0, TAU);
      g.fill();
    }
  } else {
    // synthwave sun sinking into the horizon
    const cy = hy + r * 0.1;
    const gl = g.createRadialGradient(sx, cy, r * 0.55, sx, cy, r * 2.7);
    gl.addColorStop(0, 'rgba(255,196,120,0.6)');
    gl.addColorStop(0.4, 'rgba(255,110,90,0.22)');
    gl.addColorStop(1, 'rgba(255,80,110,0)');
    g.fillStyle = gl;
    g.fillRect(sx - r * 2.7, cy - r * 2.7, r * 5.4, r * 2.7);
    g.save();
    g.beginPath();
    g.arc(sx, cy, r, 0, TAU);
    g.clip();
    const dg = g.createLinearGradient(0, cy - r, 0, hy);
    dg.addColorStop(0, '#fff6b8');
    dg.addColorStop(0.45, '#ffc04d');
    dg.addColorStop(0.8, '#ff6a3d');
    dg.addColorStop(1, '#ff3f6e');
    g.fillStyle = dg;
    let y = cy - r;
    const first = cy - r * 0.52;
    g.fillRect(sx - r, y, 2 * r, first - y);
    y = first;
    for (let k = 0; k < 8 && y < hy; k++) {
      y += r * (0.022 + k * 0.014);
      const band = r * Math.max(0.03, 0.1 - k * 0.011);
      g.fillRect(sx - r, y, 2 * r, band);
      y += band;
    }
    g.restore();
  }

  // thin clouds lit from below
  for (let i = 0; i < 5; i++) {
    const cw = (70 + Math.abs(jit(i, 51)) * 70) * s;
    const ch = (3 + Math.abs(jit(i, 52)) * 3) * s;
    let cx = ((jit(i, 53) * 0.5 + 0.5) * (w + cw * 2) + T * (3 + i) * s) % (w + cw * 2);
    cx -= cw;
    const cy = hy * (0.22 + (jit(i, 54) * 0.5 + 0.5) * 0.5);
    g.fillStyle = night ? 'rgba(110,130,210,0.16)' : `rgba(255,${130 + i * 12},${110 + i * 8},0.42)`;
    g.beginPath();
    g.ellipse(cx, cy, cw, ch, 0, 0, TAU);
    g.ellipse(cx + cw * 0.35, cy - ch * 0.9, cw * 0.55, ch * 0.8, 0, 0, TAU);
    g.fill();
  }

  // vultures circling, far away
  g.strokeStyle = night ? 'rgba(10,14,40,0.9)' : 'rgba(40,10,38,0.85)';
  g.lineWidth = 1.6 * s;
  g.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const a = T * 0.45 + k * Math.PI;
    const bx = w * 0.74 + Math.cos(a) * 30 * s;
    const by = hy * 0.4 + Math.sin(a) * 9 * s;
    const fl = Math.sin(T * 4 + k) * 2.5 * s;
    const bw = 7 * s;
    g.beginPath();
    g.moveTo(bx - bw, by - fl);
    g.quadraticCurveTo(bx - bw * 0.45, by - 3 * s - fl * 0.3, bx, by);
    g.quadraticCurveTo(bx + bw * 0.45, by - 3 * s - fl * 0.3, bx + bw, by - fl);
    g.stroke();
  }

  // far mesas along the whole horizon
  g.fillStyle = night ? '#141d4c' : '#7d2c5c';
  g.beginPath();
  g.moveTo(0, hy + 1);
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const x0 = (i / N) * w;
    const x1 = ((i + 0.62) / N) * w;
    const hh = (jit(i, 7) > 0.1 ? 5 + Math.abs(jit(i, 8)) * 15 : 2 + Math.abs(jit(i, 8)) * 3) * s;
    g.lineTo(x0, hy - hh);
    g.lineTo(x1, hy - hh);
  }
  g.lineTo(w, hy + 1);
  g.closePath();
  g.fill();

  // big mesas framing the sides
  const L = [[-8, 1], [-8, -54], [24, -57], [38, -49], [62, -50], [76, -31], [100, -27], [116, -12], [130, 1]];
  const R = [[-8, 1], [-8, -40], [22, -43], [30, -60], [58, -62], [70, -44], [96, -40], [112, -18], [124, 1]];
  const near = night ? '#090d27' : '#3d1238';
  const rim = night ? 'rgba(130,160,255,0.4)' : 'rgba(255,170,110,0.6)';
  for (let side = 0; side < 2; side++) {
    const pts = side ? R : L;
    const X = (x) => (side ? w - x * s : x * s);
    g.fillStyle = near;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), hy + p[1] * s) : g.moveTo(X(p[0]), hy + p[1] * s)));
    g.closePath();
    g.fill();
    g.strokeStyle = rim;
    g.lineWidth = 1.5 * s;
    g.beginPath();
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      if (i === 1) g.moveTo(X(p[0]), hy + p[1] * s);
      else g.lineTo(X(p[0]), hy + p[1] * s);
    }
    g.stroke();
    // strata
    g.strokeStyle = night ? 'rgba(80,100,180,0.12)' : 'rgba(255,120,110,0.12)';
    g.lineWidth = 1 * s;
    g.beginPath();
    for (let k = 1; k < 4; k++) {
      const yy = hy - k * 11 * s;
      g.moveTo(X(-8), yy);
      g.lineTo(X(side ? 66 : 70), yy + jit(k, side + 60) * 2 * s);
    }
    g.stroke();
  }
  g.restore();
}

// ---------- ground ----------
export function drawGround(g, w, h, hy, T, o = {}) {
  const s = o.s || 1;
  const night = !!o.night;
  const vx = o.vx ?? w / 2;
  const gg = g.createLinearGradient(0, hy, 0, h);
  if (night) {
    gg.addColorStop(0, '#2e3f84');
    gg.addColorStop(0.08, '#1b2556');
    gg.addColorStop(0.5, '#10173a');
    gg.addColorStop(1, '#070a1a');
  } else {
    gg.addColorStop(0, '#f39050');
    gg.addColorStop(0.06, '#cc5c40');
    gg.addColorStop(0.36, '#8e3444');
    gg.addColorStop(0.72, '#561c3b');
    gg.addColorStop(1, '#2a0c25');
  }
  g.fillStyle = gg;
  g.fillRect(0, hy, w, h - hy);

  // the sun's glare on the sand
  if (!night) {
    const rg = g.createRadialGradient(vx, hy, 4 * s, vx, hy, 190 * s);
    rg.addColorStop(0, 'rgba(255,214,140,0.55)');
    rg.addColorStop(1, 'rgba(255,150,100,0)');
    g.fillStyle = rg;
    g.fillRect(vx - 190 * s, hy, 380 * s, 190 * s);
  }

  // faint neon grid: the "neon" in neon-western
  g.strokeStyle = night ? 'rgba(90,140,255,0.14)' : 'rgba(255,170,120,0.13)';
  g.lineWidth = 1 * s;
  g.beginPath();
  for (let j = -9; j <= 9; j++) {
    g.moveTo(vx + j * 7 * s, hy);
    g.lineTo(vx + j * w * 0.16, h);
  }
  const K = 11;
  const off = (T * 0.04) % 1;
  for (let k = 0; k < K; k++) {
    const u = (k + off) / K;
    const y = hy + (h - hy) * u * u;
    g.moveTo(0, y);
    g.lineTo(w, y);
  }
  g.stroke();

  // wagon ruts
  g.fillStyle = night ? 'rgba(0,0,20,0.22)' : 'rgba(60,10,30,0.2)';
  for (const side of [-1, 1]) {
    for (const off2 of [0, 1]) {
      const x0 = vx + side * (5 + off2 * 6) * s;
      const x1 = vx + side * (52 + off2 * 64) * (w / 420);
      g.beginPath();
      g.moveTo(x0, hy);
      g.lineTo(x0 + side * 1.2 * s, hy);
      g.lineTo(x1 + side * 9 * s, h);
      g.lineTo(x1, h);
      g.closePath();
      g.fill();
    }
  }

  // pebbles and tufts
  for (let i = 0; i < 46; i++) {
    const u = jit(i, 71) * 0.5 + 0.5;
    const yk = Math.pow(jit(i, 72) * 0.5 + 0.5, 1.4);
    const y = hy + 6 * s + (h - hy) * yk;
    const x = u * w;
    const sz = (0.6 + yk * 3) * s;
    g.fillStyle = night ? 'rgba(10,14,40,0.6)' : 'rgba(50,10,30,0.45)';
    g.beginPath();
    g.ellipse(x, y, sz * 1.6, sz * 0.8, 0, 0, TAU);
    g.fill();
    if (i % 3 === 0) {
      g.fillStyle = night ? 'rgba(140,170,255,0.18)' : 'rgba(255,190,140,0.35)';
      g.beginPath();
      g.ellipse(x - sz * 0.3, y - sz * 0.35, sz * 0.8, sz * 0.35, 0, 0, TAU);
      g.fill();
    }
  }
}

// ---------- props ----------
export function drawCactus(g, x, y, hh, o = {}) {
  const w = hh * 0.17;
  const body = o.color || '#260b22';
  const side = o.side || 1;
  g.save();
  g.translate(x, y);
  g.fillStyle = body;
  g.strokeStyle = body;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // trunk
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(0, -w * 0.3);
  g.lineTo(0, -hh + w / 2);
  g.stroke();
  // arms
  g.lineWidth = w * 0.76;
  g.beginPath();
  g.moveTo(0, -hh * 0.4);
  g.quadraticCurveTo(-hh * 0.3, -hh * 0.4, -hh * 0.3, -hh * 0.6);
  g.lineTo(-hh * 0.3, -hh * 0.72);
  g.moveTo(0, -hh * 0.55);
  g.quadraticCurveTo(hh * 0.26, -hh * 0.55, hh * 0.26, -hh * 0.74);
  g.lineTo(hh * 0.26, -hh * 0.83);
  g.stroke();
  // rim light on the side facing the sun
  g.strokeStyle = o.rim || 'rgba(255,165,105,0.6)';
  g.lineWidth = Math.max(1, w * 0.13);
  g.beginPath();
  g.moveTo(side * w * 0.36, -hh + w * 0.6);
  g.lineTo(side * w * 0.36, -w * 0.4);
  const ax = side > 0 ? hh * 0.26 : -hh * 0.3;
  const top = side > 0 ? -hh * 0.83 : -hh * 0.72;
  g.moveTo(ax + side * w * 0.26, top);
  g.lineTo(ax + side * w * 0.26, top + hh * 0.13);
  g.stroke();
  g.restore();
}

export function drawTumbleweed(g, x, y, r, rot, night) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? (night ? '#7c86b8' : '#d9a066') : night ? '#2e3356' : '#7a4a2a';
    g.lineWidth = pass ? 1.1 : 1.8;
    g.beginPath();
    for (let i = 0; i < 13; i++) {
      const k = i + pass * 13;
      const cx = jit(k, 31) * r * 0.42;
      const cy = jit(k, 32) * r * 0.42;
      const rr = r * (0.4 + Math.abs(jit(k, 33)) * 0.45);
      const a0 = jit(k, 34) * Math.PI;
      g.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
      g.arc(cx, cy, rr, a0, a0 + 2.2 + Math.abs(jit(k, 35)) * 1.5);
    }
    g.stroke();
  }
  g.restore();
}

export function drawSkull(g, x, y, s, night) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = night ? '#8f97c4' : '#f3dcc0';
  g.beginPath();
  g.ellipse(0, 0, 6, 4.4, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(-3, 2);
  g.lineTo(3, 2);
  g.lineTo(2, 7);
  g.lineTo(-2, 7);
  g.closePath();
  g.fill();
  // horns
  g.strokeStyle = g.fillStyle;
  g.lineWidth = 1.8;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-5, -2);
  g.quadraticCurveTo(-11, -3, -12, -8);
  g.moveTo(5, -2);
  g.quadraticCurveTo(11, -3, 12, -8);
  g.stroke();
  g.fillStyle = '#2a0c20';
  g.beginPath();
  g.arc(-2.3, -0.2, 1.3, 0, TAU);
  g.arc(2.3, -0.2, 1.3, 0, TAU);
  g.fill();
  g.restore();
}

// The signal lantern on its post. lit: color or null; k: glow strength 0..1.
export function drawLantern(g, x, y, s, lit, k, T, night) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  if (lit && k > 0) {
    const r = 26 + 110 * k;
    const lg = g.createRadialGradient(0, -74, 4, 0, -74, r);
    lg.addColorStop(0, hexA(lit, 0.75 * Math.min(1, k + 0.3)));
    lg.addColorStop(0.35, hexA(lit, 0.28 * k + 0.1));
    lg.addColorStop(1, hexA(lit, 0));
    g.fillStyle = lg;
    g.fillRect(-r, -74 - r, r * 2, r * 2);
  }
  // shadow + post
  g.fillStyle = night ? 'rgba(0,0,10,0.35)' : 'rgba(40,6,24,0.35)';
  g.beginPath();
  g.ellipse(2, 1, 12, 3, 0, 0, TAU);
  g.fill();
  g.fillStyle = night ? '#0d1030' : '#2b1020';
  g.fillRect(-3, -64, 6, 64);
  g.fillRect(-9, -8, 18, 4);
  g.strokeStyle = night ? 'rgba(120,150,255,0.35)' : 'rgba(255,160,110,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(2.4, -62);
  g.lineTo(2.4, -6);
  g.stroke();
  // lantern
  g.fillStyle = night ? '#0d1030' : '#2b1020';
  g.fillRect(-8, -67, 16, 4);
  const flick = lit ? 0.85 + Math.sin(T * 31) * 0.08 + Math.sin(T * 17) * 0.07 : 0;
  g.fillStyle = lit ? lit : night ? '#1c2148' : '#4a2230';
  g.globalAlpha = lit ? flick : 1;
  g.fillRect(-6, -82, 12, 15);
  g.globalAlpha = 1;
  if (lit) {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.ellipse(0, -73, 2.4, 4, 0, 0, TAU);
    g.fill();
  }
  g.strokeStyle = night ? '#0d1030' : '#2b1020';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-6, -82);
  g.lineTo(-6, -67);
  g.moveTo(6, -82);
  g.lineTo(6, -67);
  g.moveTo(0, -82);
  g.lineTo(0, -67);
  g.stroke();
  g.fillStyle = night ? '#0d1030' : '#2b1020';
  g.beginPath();
  g.moveTo(-8, -82);
  g.lineTo(-4, -88);
  g.lineTo(4, -88);
  g.lineTo(8, -82);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(0, -90.5, 2.6, 0, TAU);
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- gunslinger ----------
// Local space: origin between the boots, x points the way the gunslinger faces, y down,
// about 100 units from the boots to the top of the hat. Each part is a closed polygon
// ('p'), a thick polyline ('l', with width) or a circle ('c'); the body is drawn in three
// passes (soft neon glow, crisp rim, dark fill) so the parts merge into one silhouette.
function part(g, pass, kind, pts, wd) {
  g.beginPath();
  if (kind === 'c') g.arc(pts[0], pts[1], pts[2], 0, TAU);
  else {
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    if (kind === 'p') g.closePath();
  }
  if (pass === 2) {
    if (kind === 'l') {
      g.lineWidth = wd;
      g.stroke();
    } else g.fill();
  } else {
    g.lineWidth = (kind === 'l' ? wd : 0) + (pass === 0 ? 7 : 3.2);
    g.stroke();
  }
}

const HAT_CROWN = [-8, -87.5, -8.6, -96, -4.2, -99.4, 0, -97.6, 4.2, -99.4, 8.6, -96, 8, -87.5];
const HAT_BRIM = [-18.5, -90.5, -12, -87.4, 12, -87.4, 19, -91.2, 16.5, -85.6, 0, -84.4, -15.5, -85.4];

function hatParts(g, pass, ox, oy) {
  const c = HAT_CROWN.map((v, i) => v + (i % 2 ? oy : ox));
  const b = HAT_BRIM.map((v, i) => v + (i % 2 ? oy : ox));
  part(g, pass, 'p', c);
  part(g, pass, 'p', b);
}

function hatBand(g, color, ox, oy) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-8.2 + ox, -88 + oy);
  g.lineTo(-8.4 + ox, -91 + oy);
  g.lineTo(8.4 + ox, -91 + oy);
  g.lineTo(8.2 + ox, -88 + oy);
  g.closePath();
  g.fill();
}

// A hat on its own (knocked off and flying), centered on its crown.
export function drawHat(g, x, y, s, f, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(f * s, s);
  g.translate(0, 91);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    if (pass === 2) g.fillStyle = BODY;
    else {
      g.strokeStyle = color;
      g.globalAlpha = pass === 0 ? 0.28 : 1;
    }
    hatParts(g, pass, 0, 0);
    g.globalAlpha = 1;
  }
  hatBand(g, color, 0, 0);
  g.restore();
}

// P: { arm 0..1 draw, aim rad, recoil, blow (smoke-blowing pose), tip 0..1 (keeling over),
//      hop 0..1 (false start hop), sulk, hatOn, expr, muzzle 0..1, twitch, seed, alpha }
export function drawSlinger(g, x, y, s, f, color, P, T) {
  const seed = P.seed || 0;
  g.save();
  g.translate(x, y);
  g.scale(f * s, s);
  if (P.alpha != null && P.alpha < 1) g.globalAlpha = P.alpha;
  const baseA = g.globalAlpha;
  if (P.tip) {
    // keel over backwards around the back heel
    g.translate(-9, 0);
    g.rotate(-P.tip * 1.42);
    g.translate(9, 0);
  }
  const hopping = P.hop > 0 && P.hop < 1;
  const hopY = hopping ? Math.abs(Math.sin(P.hop * Math.PI * 4)) * 9 * (1 - P.hop * 0.6) : 0;
  g.translate(0, -hopY);
  const sulk = P.sulk ? 1 : 0;
  const by = Math.sin(T * 2.1 + seed * 1.7) * 0.6 + sulk * 3; // breathing / slumped shoulders
  const flap = Math.sin(T * 3.1 + seed * 2.3) * 1.6 + Math.sin(T * 7.3 + seed) * 0.5;

  // legs
  let fK = [6, -22];
  let fA = [9, -5];
  if (hopping) {
    fK = [11, -30];
    fA = [5, -20];
  }
  const legB = [-4, -40, -6.5, -22, -9, -5];
  const legF = [4, -40, fK[0], fK[1], fA[0], fA[1]];
  const boot = (ax, ay) => [ax - 4, ay - 4, ax + 3, ay - 4, ax + 3.5, ay + 1, ax + 9, ay + 2.6, ax + 9, ay + 5, ax - 5.5, ay + 5, ax - 5, ay + 1];
  const coat = [-9, -73 + by, -11.5, -60 + by, -12, -47, -17 - flap, -23, -9, -25.5, -3, -35, 3, -27.5, 12 + flap * 0.4, -25, 10, -46, 10.5, -60 + by, 9, -73 + by, 6.5, -77.5 + by, 3, -74.5 + by, -2, -74.5 + by, -6.5, -78 + by];
  const head = [2.5, -81 + by, 7];
  const holster = [8.5, -45, 14, -45, 13.4, -33, 10, -31];

  // arms: back arm hangs, gun arm hovers over the holster until the draw
  const armB = [-6, -70 + by, -9.5, -57 + by * 0.5, -9.8, -45];
  const sh = [6, -70 + by];
  const tw = P.twitch || 0;
  const jx = tw * (Math.sin(T * 23 + seed * 5) * 0.7 + Math.sin(T * 41 + seed) * 0.35);
  const jy = tw * Math.cos(T * 19 + seed * 3) * 0.5;
  const H0 = [13 + jx, -47.5 + jy - tw * 1.5];
  const E0 = [11.8, -58 + by * 0.5];
  const a = (P.aim || 0) - (P.recoil || 0) * 0.55;
  const D1 = [Math.cos(a), Math.sin(a)];
  const H1 = [sh[0] + D1[0] * 26, sh[1] + D1[1] * 26];
  const E1 = [sh[0] + D1[0] * 13 - D1[1] * 1.5, sh[1] + D1[1] * 13 + D1[0] * 1.5];
  const k = P.arm || 0;
  const ke = 1 - (1 - k) * (1 - k);
  let hx = lerp(H0[0], H1[0], ke);
  let hy = lerp(H0[1], H1[1], ke);
  let ex = lerp(E0[0], E1[0], ke);
  let ey = lerp(E0[1], E1[1], ke);
  let ux = D1[0];
  let uy = D1[1];
  const bl = P.blow || 0;
  if (bl > 0) {
    const bk = bl * bl * (3 - 2 * bl);
    hx = lerp(hx, 8.5, bk);
    hy = lerp(hy, -85 + by, bk);
    ex = lerp(ex, 14, bk);
    ey = lerp(ey, -72 + by, bk);
    const bu = [0.22, -0.98];
    ux = lerp(ux, bu[0], bk);
    uy = lerp(uy, bu[1], bk);
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul;
    uy /= ul;
  }
  const drawn = k > 0.3;
  const armF = [sh[0], sh[1], ex, ey, hx, hy];
  // revolver in the hand (barrel along u, grip below)
  const vx = -uy;
  const vy = ux;
  const barrel = [hx + ux * 1, hy + uy * 1, hx + ux * 12.5, hy + uy * 12.5];
  const cyl = [hx + ux * 1 - vx * 1.8, hy + uy * 1 - vy * 1.8, hx + ux * 6 - vx * 1.8, hy + uy * 6 - vy * 1.8, hx + ux * 6 + vx * 2.2, hy + uy * 6 + vy * 2.2, hx + ux * 1 + vx * 2.2, hy + uy * 1 + vy * 2.2];
  const grip = [hx + ux * 1.5, hy + uy * 1.5, hx - ux * 1.5 + vx * 6.5, hy - uy * 1.5 + vy * 6.5, hx - ux * 4 + vx * 5.5, hy - uy * 4 + vy * 5.5, hx - ux * 2, hy - uy * 2];
  const holsterGrip = [9.5, -44, 8, -50.5, 11.5, -51.5, 12.5, -44];

  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    if (pass === 2) {
      g.fillStyle = BODY;
      g.strokeStyle = BODY;
      g.globalAlpha = baseA;
    } else {
      g.strokeStyle = color;
      g.globalAlpha = baseA * (pass === 0 ? 0.26 : 1);
    }
    part(g, pass, 'l', armB, 6);
    part(g, pass, 'l', legB, 8);
    part(g, pass, 'l', legF, 8);
    const bb = boot(-9, -5);
    const bf = boot(fA[0], fA[1]);
    part(g, pass, 'p', bb);
    part(g, pass, 'p', bf);
    part(g, pass, 'p', coat);
    part(g, pass, 'p', holster);
    part(g, pass, 'c', head);
    if (P.hatOn !== false) hatParts(g, pass, 0, by);
    if (!drawn) part(g, pass, 'p', holsterGrip);
    part(g, pass, 'l', armF, 6);
    part(g, pass, 'c', [hx, hy, 3.3]);
    part(g, pass, 'c', [armB[4], armB[5] + 0.5, 3]);
    if (drawn) {
      part(g, pass, 'l', barrel, 2.8);
      part(g, pass, 'p', cyl);
      part(g, pass, 'p', grip);
    }
  }
  g.globalAlpha = baseA;

  // ---- details ----
  // coat lapel and belt
  g.strokeStyle = hexA(color, 0.7);
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(3, -28);
  g.lineTo(5.5, -46);
  g.lineTo(7.5, -66 + by);
  g.stroke();
  g.strokeStyle = 'rgba(255,220,180,0.18)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-10.5, -43);
  g.lineTo(9.5, -43);
  g.stroke();
  const glint = Math.max(0, Math.sin(T * 1.3 + seed * 2.2) - 0.92) * 12;
  g.fillStyle = GOLD;
  g.fillRect(-0.5, -44.6, 3.6, 3.2);
  if (glint > 0) {
    g.fillStyle = `rgba(255,255,255,${Math.min(1, glint)})`;
    g.beginPath();
    g.moveTo(1.3, -48 - glint);
    g.lineTo(1.9, -43);
    g.lineTo(1.3, -38 + glint);
    g.lineTo(0.7, -43);
    g.closePath();
    g.fill();
  }
  // spurs
  g.fillStyle = GOLD;
  for (const [sx, sy] of [[-14.5, -2.5], [fA[0] - 5.5, fA[1] + 2.5]]) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? 0.9 : 2.4;
      const aa = (i / 8) * TAU + T * 2;
      if (i) g.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
      else g.moveTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
    }
    g.closePath();
    g.fill();
  }
  // bandana over the lower face, its tails fluttering behind
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-3.5, -80 + by);
  g.lineTo(9.4, -80.5 + by);
  g.lineTo(6.5, -74.5 + by);
  g.lineTo(2, -72.8 + by);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(-4, -78.5 + by);
  g.lineTo(-11 - flap * 0.8, -76 + by + flap * 0.5);
  g.lineTo(-9.5 - flap * 0.6, -73.5 + by + flap * 0.4);
  g.closePath();
  g.fill();
  if (P.hatOn !== false) hatBand(g, color, 0, by);
  // eyes
  drawEyes(g, P.expr || 'cool', by, T, seed);
  // gun metal highlight
  if (drawn) {
    g.strokeStyle = 'rgba(235,235,245,0.85)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(hx + ux * 2 - vx * 0.6, hy + uy * 2 - vy * 0.6);
    g.lineTo(hx + ux * 12 - vx * 0.6, hy + uy * 12 - vy * 0.6);
    g.stroke();
  }
  // muzzle flash
  const m = P.muzzle || 0;
  if (m > 0 && drawn) {
    const mx = hx + ux * 15;
    const my = hy + uy * 15;
    const r = 4 + m * 9;
    g.fillStyle = `rgba(255,170,50,${Math.min(1, m * 1.4)})`;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const aa = (i / 16) * TAU + seed;
      const rr = i % 2 ? r * 0.32 : r * (i % 4 === 0 ? 1.7 : 0.85);
      const px = mx + ux * Math.cos(aa) * rr - vx * Math.sin(aa) * rr * 0.75;
      const py = my + uy * Math.cos(aa) * rr - vy * Math.sin(aa) * rr * 0.75;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.fillStyle = `rgba(255,252,220,${Math.min(1, m * 1.6)})`;
    g.beginPath();
    g.arc(mx, my, r * 0.4, 0, TAU);
    g.fill();
  }
  // sweat drop when oops / shocked
  if (P.expr === 'oops' || P.expr === 'shock') {
    g.fillStyle = 'rgba(140,220,255,0.95)';
    const sy = -88 + by + ((T * 1.5) % 1) * 4;
    g.beginPath();
    g.moveTo(-4, sy - 3.5);
    g.quadraticCurveTo(-1.6, sy, -4, sy + 1.6);
    g.quadraticCurveTo(-6.4, sy, -4, sy - 3.5);
    g.fill();
  }
  g.restore();
}

function drawEyes(g, expr, by, T, seed) {
  const ey = -82.4 + by;
  const xs = [4.1, 7.6];
  const blink = Math.sin(T * 1.3 + seed * 3.7) > 0.985;
  g.lineCap = 'round';
  if (expr === 'shock' || expr === 'oops') {
    for (const x of xs) {
      g.fillStyle = '#fff6dc';
      g.beginPath();
      g.arc(x, ey, 1.55, 0, TAU);
      g.fill();
      g.fillStyle = BODY;
      g.beginPath();
      g.arc(x + 0.4, ey + 0.2, 0.6, 0, TAU);
      g.fill();
    }
    return;
  }
  g.strokeStyle = '#ffe9a6';
  g.lineWidth = 1.1;
  g.beginPath();
  if (expr === 'win') {
    for (const x of xs) {
      g.moveTo(x - 1.3, ey + 0.5);
      g.lineTo(x, ey - 0.8);
      g.lineTo(x + 1.3, ey + 0.5);
    }
  } else if (expr === 'dizzy') {
    for (const x of xs) {
      g.moveTo(x - 1, ey - 1);
      g.lineTo(x + 1, ey + 1);
      g.moveTo(x + 1, ey - 1);
      g.lineTo(x - 1, ey + 1);
    }
  } else if (!blink) {
    for (const x of xs) {
      g.moveTo(x - 1.3, ey + 0.1);
      g.lineTo(x + 1.3, ey - 0.4);
    }
  } else {
    for (const x of xs) {
      g.moveTo(x - 1.2, ey + 0.3);
      g.lineTo(x + 1.2, ey + 0.3);
    }
  }
  g.stroke();
}

// Long sunset shadow cast away from the sun (dx, dy is the unit direction).
export function drawShadow(g, x, y, s, dx, dy, len, night) {
  g.save();
  g.fillStyle = night ? 'rgba(0,0,12,0.4)' : 'rgba(40,6,26,0.38)';
  g.beginPath();
  g.ellipse(x, y + 1, 15 * s, 4 * s, 0, 0, TAU);
  g.fill();
  const px = -dy;
  const py = dx;
  const L = len * s;
  g.globalAlpha = 0.75;
  g.beginPath();
  g.moveTo(x + px * 9 * s, y + py * 9 * s);
  g.lineTo(x + dx * L + px * 14 * s, y + dy * L * 0.55 + py * 14 * s);
  g.lineTo(x + dx * L - px * 14 * s, y + dy * L * 0.55 - py * 14 * s);
  g.lineTo(x - px * 9 * s, y - py * 9 * s);
  g.closePath();
  g.fill();
  g.restore();
}

// A starburst with rays (the DRAW! flash, and the cover's centerpiece).
export function drawBurst(g, x, y, r, rot, color, alpha = 1, n = 18) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const bg = g.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
  bg.addColorStop(0, `rgba(255,255,240,${0.95 * alpha})`);
  bg.addColorStop(0.35, hexA(color, 0.75 * alpha));
  bg.addColorStop(1, hexA(color, 0));
  g.fillStyle = bg;
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU;
    const rr = i % 2 ? r * 0.36 : r * (0.82 + Math.abs(jit(i, 91)) * 0.18);
    if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
}

// Jagged lightning bolt from (x0, y0) toward angle a, length len.
export function drawBolt(g, x0, y0, a, len, seed, width, color, alpha = 1) {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const pts = [[x0, y0]];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const off = i < n ? jit(i, seed) * len * 0.09 : 0;
    pts.push([x0 + Math.cos(a) * len * k - Math.sin(a) * off, y0 + Math.sin(a) * len * k + Math.cos(a) * off]);
  }
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? `rgba(255,255,255,${alpha})` : hexA(color, 0.45 * alpha);
    g.lineWidth = pass ? width : width * 3.2;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  }
  g.restore();
}
