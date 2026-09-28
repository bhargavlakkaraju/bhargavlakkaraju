// Tank Tango - a one-button tank brawl for 1 to 4 players on one screen (party kit).
//
// Every tank spins in place while its button is up. HOLD drives forward in the facing
// direction (the spin stops), RELEASE fires a shell. Shells ricochet off walls twice and
// can hit their own tank after the first bounce. One hit and you are scrap metal; the last
// tank rolling takes the crown. Empty seats are driven by bots that line up direct and
// bank shots with a ray tracer, dodge incoming shells and keep off the walls.
import { createParty } from '../engine/party.js';
import * as draw from '../engine/draw.js';

// ---------- arena ----------
const X0 = 14;
const X1 = 406;
const Y0 = 100;
const Y1 = 640;
const CX = (X0 + X1) / 2;
const CY = (Y0 + Y1) / 2;
const RIM = 8;

// ---------- tuning ----------
const TANK_R = 15; // collision radius at size 1
const SPIN = 3.1; // rad/s while the button is up (clockwise)
const DRIVE = 120; // px/s while held
const SHELL_SPEED = 300;
const SHELL_R = 4.5;
const COOLDOWN = 0.45;
const MAX_LIVE = 2;
const BOUNCES = 2;
const ARM_DIST = 80; // a shell must travel this far (and bounce) before it can hit its owner
const SHELL_LIFE = 7;
const SUDDEN_AT = 30; // seconds of play before SUDDEN DEATH speeds everything up
const ROUND_TIME = 50;

// Spawns per seat: P1 bottom-left, P2 bottom-right, P3 top-right, P4 top-left.
const SPAWNS = [
  { x: 70, y: 588 },
  { x: 350, y: 588 },
  { x: 350, y: 152 },
  { x: 70, y: 152 },
];

// Hand-made layouts, written as [cx, cy, w, h] relative to the arena center and mirrored
// across both axes so every corner gets exactly the same cover.
const LAYOUTS = [
  // CROSSROADS: a plus in the middle, four pillars, stubs on every wall
  [
    [0, 0, 112, 18],
    [0, 0, 18, 112],
    [110, 112, 40, 40],
    [178, 0, 36, 18],
    [0, 242, 18, 56],
  ],
  // BUNKERS: an L of cover in front of every spawn, a block in the middle
  [
    [0, 0, 56, 56],
    [128, 154, 84, 16],
    [78, 192, 16, 72],
    [150, 0, 40, 40],
  ],
  // LANES: two long rails split the arena into three lanes
  [
    [0, 100, 212, 18],
    [0, 0, 30, 30],
    [160, 0, 72, 18],
    [0, 208, 18, 62],
  ],
  // PILLARS: a forest of square posts
  [
    [0, 0, 36, 36],
    [100, 72, 34, 34],
    [0, 162, 34, 34],
    [168, 0, 34, 34],
    [72, 238, 30, 30],
  ],
  // BRACKETS: tall side walls, short bars above and below the middle
  [
    [96, 0, 18, 140],
    [0, 152, 124, 18],
    [152, 112, 44, 16],
    [0, 0, 26, 26],
  ],
];

function buildLayout(list) {
  const out = [];
  const seen = new Set();
  for (const [x, y, w, h] of list) {
    for (const sx of x === 0 ? [1] : [1, -1]) {
      for (const sy of y === 0 ? [1] : [1, -1]) {
        const cx = CX + x * sx;
        const cy = CY + y * sy;
        const key = `${cx}|${cy}|${w}|${h}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 });
      }
    }
  }
  return out;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

// ---------- geometry (shared by the shells and the bots' ray tracer) ----------
const HIT = { t: 0, nx: 0, ny: 0 };

// Distance along the unit ray to the first wall face (walls grown by pad), with its normal.
function castWalls(walls, ox, oy, dx, dy, pad, out) {
  let best = Infinity;
  let nx = 0;
  let ny = 0;
  const bx0 = X0 + pad;
  const bx1 = X1 - pad;
  const by0 = Y0 + pad;
  const by1 = Y1 - pad;
  if (dx > 1e-9) {
    const t = (bx1 - ox) / dx;
    if (t < best) (best = t), (nx = -1), (ny = 0);
  } else if (dx < -1e-9) {
    const t = (bx0 - ox) / dx;
    if (t < best) (best = t), (nx = 1), (ny = 0);
  }
  if (dy > 1e-9) {
    const t = (by1 - oy) / dy;
    if (t < best) (best = t), (nx = 0), (ny = -1);
  } else if (dy < -1e-9) {
    const t = (by0 - oy) / dy;
    if (t < best) (best = t), (nx = 0), (ny = 1);
  }
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const x0 = w.x0 - pad;
    const x1 = w.x1 + pad;
    const y0 = w.y0 - pad;
    const y1 = w.y1 + pad;
    let tmin = -Infinity;
    let tmax = Infinity;
    let hx = 0;
    let hy = 0;
    if (Math.abs(dx) < 1e-9) {
      if (ox <= x0 || ox >= x1) continue;
    } else {
      let t1 = (x0 - ox) / dx;
      let t2 = (x1 - ox) / dx;
      let n = -1;
      if (t1 > t2) {
        const tt = t1;
        t1 = t2;
        t2 = tt;
        n = 1;
      }
      if (t1 > tmin) (tmin = t1), (hx = n), (hy = 0);
      if (t2 < tmax) tmax = t2;
    }
    if (Math.abs(dy) < 1e-9) {
      if (oy <= y0 || oy >= y1) continue;
    } else {
      let t1 = (y0 - oy) / dy;
      let t2 = (y1 - oy) / dy;
      let n = -1;
      if (t1 > t2) {
        const tt = t1;
        t1 = t2;
        t2 = tt;
        n = 1;
      }
      if (t1 > tmin) (tmin = t1), (hx = 0), (hy = n);
      if (t2 < tmax) tmax = t2;
    }
    if (tmax < tmin || tmax <= 0 || tmin < -1e-6) continue;
    if (tmin < best) (best = tmin), (nx = hx), (ny = hy);
  }
  out.t = best;
  out.nx = nx;
  out.ny = ny;
  return out;
}

// Entry distance of a unit ray into a circle (0 if it starts inside, -1 on a miss).
function rayCircle(ox, oy, dx, dy, cx, cy, rr) {
  const fx = ox - cx;
  const fy = oy - cy;
  const c = fx * fx + fy * fy - rr * rr;
  if (c <= 0) return 0;
  const b = fx * dx + fy * dy;
  if (b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  return -b - Math.sqrt(disc);
}

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const l2 = vx * vx + vy * vy;
  let k = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
  k = clamp(k, 0, 1);
  const qx = ax + vx * k - px;
  const qy = ay + vy * k - py;
  return { d: Math.sqrt(qx * qx + qy * qy), k };
}

// Push a circle out of every wall and keep it inside the arena. Returns true if it touched.
function pushOut(walls, o, r) {
  let hit = false;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const qx = clamp(o.x, w.x0, w.x1);
    const qy = clamp(o.y, w.y0, w.y1);
    const dx = o.x - qx;
    const dy = o.y - qy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      o.x += (dx / d) * (r - d);
      o.y += (dy / d) * (r - d);
    } else {
      const l = o.x - w.x0;
      const rr = w.x1 - o.x;
      const t = o.y - w.y0;
      const b = w.y1 - o.y;
      const m = Math.min(l, rr, t, b);
      if (m === l) o.x = w.x0 - r;
      else if (m === rr) o.x = w.x1 + r;
      else if (m === t) o.y = w.y0 - r;
      else o.y = w.y1 + r;
    }
  }
  const nx = clamp(o.x, X0 + r, X1 - r);
  const ny = clamp(o.y, Y0 + r, Y1 - r);
  if (nx !== o.x || ny !== o.y) hit = true;
  o.x = nx;
  o.y = ny;
  return hit;
}

// Clearance from a point to the nearest wall or the arena border.
function clearance(walls, x, y) {
  let m = Math.min(x - X0, X1 - x, y - Y0, Y1 - y);
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const dx = Math.max(w.x0 - x, 0, x - w.x1);
    const dy = Math.max(w.y0 - y, 0, y - w.y1);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < m) m = d;
  }
  return m;
}

// ---------- art (shared by the game and the cover) ----------
function drawTank(g, x, y, a, color, s, o = {}) {
  const dark = draw.shade(color, -0.5);
  const mid = draw.shade(color, -0.22);
  const light = draw.shade(color, 0.45);
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,0.34)';
  g.beginPath();
  g.ellipse(3 * s, 6 * s, 20 * s, 18 * s, 0, 0, TAU);
  g.fill();
  g.rotate(a);
  g.scale(s, s);
  // treads
  const off = ((o.tread || 0) % 6 + 6) % 6;
  for (let side = -1; side <= 1; side += 2) {
    const ty = side * 12;
    draw.roundRect(g, -17, ty - 5, 34, 10, 4, '#171a2c');
    g.fillStyle = '#3d4266';
    for (let k = -16 + off; k < 15; k += 6) g.fillRect(k, ty - 4, 2.4, 8);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(-15, ty - 5 + (side < 0 ? 0 : 8), 30, 1.5);
  }
  // hull
  draw.roundRect(g, -15, -10, 30, 20, 5, dark);
  draw.roundRect(g, -14, -9, 28, 17, 4.5, mid);
  draw.roundRect(g, -12.5, -8, 25, 13, 4, color);
  g.fillStyle = light;
  g.globalAlpha = 0.55;
  g.fillRect(-10, -7, 19, 2.2);
  g.globalAlpha = 1;
  // rear vents
  g.fillStyle = dark;
  g.fillRect(-13, -4, 2, 8);
  // barrel
  const rc = o.recoil || 0;
  draw.roundRect(g, 1 - rc, -3, 21, 6, 2, dark);
  draw.roundRect(g, 2 - rc, -2, 19, 3, 1.5, mid);
  draw.roundRect(g, 18 - rc, -4, 5, 8, 1.5, dark);
  // turret
  draw.circle(g, -1, 0, 8.6, dark);
  draw.circle(g, -1, 0, 7.4, mid);
  draw.circle(g, -1.8, -1, 5.6, color);
  draw.circle(g, -3, -2.6, 2, light);
  g.restore();
}

function drawWreck(g, x, y, a, color, s) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.scale(s, s);
  for (let side = -1; side <= 1; side += 2) draw.roundRect(g, -17, side * 12 - 5, 34, 10, 4, '#12131d');
  draw.roundRect(g, -15, -10, 30, 20, 5, '#24222e');
  draw.roundRect(g, -12, -7, 24, 13, 4, draw.shade(color, -0.72));
  g.strokeStyle = 'rgba(255,140,60,0.35)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-9, -3);
  g.lineTo(-2, 1);
  g.lineTo(3, -4);
  g.lineTo(9, 2);
  g.stroke();
  g.restore();
}

function drawWall(g, w, t) {
  const x = w.x0;
  const y = w.y0;
  const ww = w.x1 - w.x0;
  const hh = w.y1 - w.y0;
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.fillRect(x + 4, y + 7, ww, hh);
  draw.roundRect(g, x, y, ww, hh, 4, '#262b55');
  draw.roundRect(g, x, y - 5, ww, hh, 4, '#4a5396');
  draw.roundRect(g, x + 2.5, y - 2.5, ww - 5, hh - 5, 3, '#5a64ad');
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(x + 4, y - 4, ww - 8, 1.6);
  if (ww > 26 && hh > 26) {
    g.strokeStyle = 'rgba(20,24,60,0.45)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + 6, y + 1);
    g.lineTo(x + ww - 6, y + hh - 11);
    g.moveTo(x + ww - 6, y + 1);
    g.lineTo(x + 6, y + hh - 11);
    g.stroke();
  }
  void t;
}

function paintFloor(c) {
  const bg = c.createLinearGradient(0, 0, 0, 740);
  bg.addColorStop(0, '#0f1230');
  bg.addColorStop(0.5, '#141840');
  bg.addColorStop(1, '#0f1230');
  c.fillStyle = bg;
  c.fillRect(0, 0, 420, 740);
  // hazard chevrons in the dead zones above and below the arena
  c.save();
  c.globalAlpha = 0.07;
  c.fillStyle = '#ffd23f';
  for (const [y0, y1] of [
    [0, Y0 - RIM],
    [Y1 + RIM, 740],
  ]) {
    c.save();
    c.beginPath();
    c.rect(0, y0, 420, y1 - y0);
    c.clip();
    for (let x = -80; x < 480; x += 28) {
      c.beginPath();
      c.moveTo(x, y1);
      c.lineTo(x + 14, y1);
      c.lineTo(x + 14 + (y1 - y0), y0);
      c.lineTo(x + (y1 - y0), y0);
      c.fill();
    }
    c.restore();
  }
  c.restore();
  // floor
  const fg = c.createRadialGradient(CX, CY, 30, CX, CY, 380);
  fg.addColorStop(0, '#2c3366');
  fg.addColorStop(1, '#1b2047');
  c.fillStyle = fg;
  c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  c.strokeStyle = 'rgba(160,180,255,0.07)';
  c.lineWidth = 1;
  c.beginPath();
  for (let x = X0 + 28; x < X1; x += 28) {
    c.moveTo(x + 0.5, Y0);
    c.lineTo(x + 0.5, Y1);
  }
  for (let y = Y0 + 27; y < Y1; y += 27) {
    c.moveTo(X0, y + 0.5);
    c.lineTo(X1, y + 0.5);
  }
  c.stroke();
  c.strokeStyle = 'rgba(160,180,255,0.12)';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = X0 + 98; x < X1; x += 98) {
    c.moveTo(x, Y0);
    c.lineTo(x, Y1);
  }
  for (let y = Y0 + 135; y < Y1; y += 135) {
    c.moveTo(X0, y);
    c.lineTo(X1, y);
  }
  c.stroke();
  c.fillStyle = 'rgba(160,180,255,0.18)';
  for (let x = X0 + 98; x < X1; x += 98) for (let y = Y0 + 135; y < Y1; y += 135) c.fillRect(x - 2, y - 2, 4, 4);
  // spawn pads
  for (let i = 0; i < 4; i++) {
    const sp = SPAWNS[i];
    c.strokeStyle = draw.rgba(['#ff3d8b', '#2fd9ff', '#ffc93c', '#7dff5a'][i], 0.22);
    c.lineWidth = 3;
    c.setLineDash([6, 6]);
    c.beginPath();
    c.arc(sp.x, sp.y, 26, 0, TAU);
    c.stroke();
    c.setLineDash([]);
  }
  // raised rim
  c.fillStyle = '#343c7a';
  c.fillRect(X0 - RIM, Y0 - RIM, X1 - X0 + RIM * 2, RIM);
  c.fillRect(X0 - RIM, Y1, X1 - X0 + RIM * 2, RIM);
  c.fillRect(X0 - RIM, Y0, RIM, Y1 - Y0);
  c.fillRect(X1, Y0, RIM, Y1 - Y0);
  c.strokeStyle = 'rgba(140,160,255,0.55)';
  c.lineWidth = 1.5;
  c.strokeRect(X0 - RIM + 0.75, Y0 - RIM + 0.75, X1 - X0 + RIM * 2 - 1.5, Y1 - Y0 + RIM * 2 - 1.5);
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.lineWidth = 2;
  c.strokeRect(X0 - 1, Y0 - 1, X1 - X0 + 2, Y1 - Y0 + 2);
  // inner shadow of the rim on the floor
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(X0, Y0, X1 - X0, 5);
  c.fillRect(X0, Y0, 4, Y1 - Y0);
}

// ---------- sounds ----------
function sndFire(sfx) {
  sfx.noise({ dur: 0.12, vol: 0.2, freq: 2600, to: 260 });
  sfx.tone({ freq: 240, to: 70, type: 'square', dur: 0.1, vol: 0.07 });
}
function sndBounce(sfx) {
  sfx.tone({ freq: 1500, to: 950, type: 'triangle', dur: 0.05, vol: 0.05 });
}
function sndBoom(sfx) {
  sfx.noise({ dur: 0.75, vol: 0.42, freq: 800, to: 40 });
  sfx.tone({ freq: 110, to: 32, type: 'sine', dur: 0.55, vol: 0.34 });
}
function sndDry(sfx) {
  sfx.tone({ freq: 190, type: 'square', dur: 0.035, vol: 0.05 });
}
function sndClash(sfx) {
  sfx.noise({ dur: 0.14, vol: 0.2, freq: 3200, to: 900, type: 'bandpass', q: 2 });
  sfx.tone({ freq: 1900, to: 1100, type: 'triangle', dur: 0.09, vol: 0.06 });
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const fx = api.fx;

  let walls = [];
  let layoutIdx = -1;
  let shells = [];
  let flashes = [];
  let debris = [];
  let wrecks = [];
  let sudden = false;
  let suddenT = 0;
  let slow = 0;

  // Floor cache (tread marks and scorches are painted into it for the rest of the round).
  const FS = 2;
  let floorCv = null;
  let floorG = null;
  function floorCtx() {
    if (typeof document === 'undefined') return null;
    if (!floorCv) {
      floorCv = document.createElement('canvas');
      floorCv.width = W * FS;
      floorCv.height = H * FS;
      floorG = floorCv.getContext('2d');
    }
    return floorG;
  }
  function resetFloor() {
    const c = floorCtx();
    if (!c) return;
    c.setTransform(FS, 0, 0, FS, 0, 0);
    paintFloor(c);
  }

  const tankR = (ctx) => TANK_R * ctx.size;
  const shellR = (ctx) => SHELL_R * (0.55 + 0.45 * ctx.size);
  const maxLive = (ctx) => (ctx.twist.id === 'rapid' ? 4 : MAX_LIVE);
  const coolDown = (ctx) => (ctx.twist.id === 'rapid' ? 0.16 : sudden ? 0.32 : COOLDOWN);
  const maxBounces = (ctx) => (ctx.twist.id === 'ricochet' ? 5 : BOUNCES) + (sudden ? 1 : 0);
  const shellSpeed = () => SHELL_SPEED * (sudden ? 1.22 : 1);
  function liveShells(i) {
    let n = 0;
    for (const s of shells) if (s.owner === i && !s.dead) n += 1;
    return n;
  }

  // ---------- round setup ----------
  function setup(ctx) {
    let idx = ctx.rng.int(0, LAYOUTS.length - 1);
    if (idx === layoutIdx) idx = (idx + 1 + ctx.rng.int(0, LAYOUTS.length - 2)) % LAYOUTS.length;
    layoutIdx = idx;
    walls = buildLayout(LAYOUTS[idx]);
    shells = [];
    flashes = [];
    debris = [];
    wrecks = [];
    sudden = false;
    suddenT = 0;
    slow = 0;
    resetFloor();
    for (const p of ctx.active) {
      const sp = SPAWNS[p.i];
      p.x = sp.x;
      p.y = sp.y;
      p.data.a = Math.atan2(CY - p.y, CX - p.x);
      p.data.cd = 0;
      p.data.recoil = 0;
      p.data.tread = 0;
      p.data.mark = 0;
      p.data.blocked = 0;
      p.data.moving = false;
      p.data.flash = 0;
    }
  }

  // ---------- shells ----------
  // Advance a shell by dist, reflecting off walls. Returns false when it ran out of bounces.
  function moveShell(s, dist, ctx, quiet) {
    let rem = dist;
    let guard = 0;
    const maxB = maxBounces(ctx);
    while (rem > 1e-6 && guard++ < 8) {
      castWalls(walls, s.x, s.y, s.dx, s.dy, s.r, HIT);
      if (HIT.t > rem) {
        s.x += s.dx * rem;
        s.y += s.dy * rem;
        s.trav += rem;
        return true;
      }
      const t = Math.max(0, HIT.t - 0.01);
      s.x += s.dx * t;
      s.y += s.dy * t;
      s.trav += t;
      rem -= t;
      if (HIT.nx) s.dx = -s.dx;
      if (HIT.ny) s.dy = -s.dy;
      s.b += 1;
      s.trail.push(s.x, s.y);
      if (s.b > maxB) return false;
      if (!quiet) {
        fx.burst(s.x, s.y, { count: 5, color: '#ffffff', colors: [s.color, '#ffffff'], speed: 140, life: 0.22, gravity: 0, size: 2.4, shape: 'spark', angle: Math.atan2(s.dy, s.dx), spread: 1.6 });
        sndBounce(api.sfx);
      }
    }
    return true;
  }

  function fire(p, ctx) {
    const d = p.data;
    if (d.cd > 0 || liveShells(p.i) >= maxLive(ctx)) {
      if (p.human) sndDry(api.sfx);
      fx.burst(p.x + Math.cos(d.a) * 20 * ctx.size, p.y + Math.sin(d.a) * 20 * ctx.size, { count: 3, color: 'rgba(200,200,220,0.6)', speed: 30, life: 0.3, gravity: 0, size: 3 });
      return;
    }
    d.cd = coolDown(ctx);
    d.recoil = 5;
    const dx = Math.cos(d.a);
    const dy = Math.sin(d.a);
    const s = { x: p.x, y: p.y, dx, dy, owner: p.i, color: p.color, b: 0, trav: 0, age: 0, r: shellR(ctx), trail: [], dead: false };
    const ok = moveShell(s, tankR(ctx) + 7 * ctx.size, ctx, true);
    s.trail.length = 0;
    const tipX = p.x + dx * (tankR(ctx) + 7 * ctx.size);
    const tipY = p.y + dy * (tankR(ctx) + 7 * ctx.size);
    flashes.push({ x: tipX, y: tipY, a: d.a, t: 0, color: p.color, s: ctx.size });
    fx.burst(tipX, tipY, { count: 7, colors: ['#fff6c8', '#ffd23f', p.color], speed: 180, life: 0.2, gravity: 0, size: 2.6, angle: d.a, spread: 0.9, shape: 'spark' });
    fx.burst(tipX, tipY, { count: 4, color: 'rgba(210,210,235,0.5)', speed: 40, life: 0.5, gravity: 0, drag: 0.93, size: 5, angle: d.a, spread: 1.4 });
    sndFire(api.sfx);
    // a little kick back
    p.x -= dx * 2.5;
    p.y -= dy * 2.5;
    pushOut(walls, p, tankR(ctx));
    if (ok) shells.push(s);
    else popShell(s);
  }

  function popShell(s) {
    s.dead = true;
    fx.burst(s.x, s.y, { count: 6, colors: [s.color, '#ffffff', '#b8bedf'], speed: 90, life: 0.3, gravity: 0, size: 2.6 });
    fx.ring(s.x, s.y, { color: s.color, radius: 14, life: 0.25, width: 2 });
  }

  function paintScorch(x, y, r) {
    const c = floorCtx();
    if (!c) return;
    const grad = c.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(8,6,14,0.75)');
    grad.addColorStop(0.55, 'rgba(12,10,20,0.45)');
    grad.addColorStop(1, 'rgba(12,10,20,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(8,6,14,0.4)';
    c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + Math.random() * 0.4;
      const l = r * (0.9 + Math.random() * 0.6);
      c.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35);
      c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    c.stroke();
  }

  function paintTread(p, ctx) {
    const c = floorCtx();
    if (!c) return;
    const s = ctx.size;
    const a = p.data.a;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    c.fillStyle = 'rgba(6,8,22,0.16)';
    for (let side = -1; side <= 1; side += 2) {
      const ox = -sn * 12 * s * side - cs * 12 * s;
      const oy = cs * 12 * s * side - sn * 12 * s;
      c.save();
      c.translate(p.x + ox, p.y + oy);
      c.rotate(a);
      c.fillRect(-2, -4 * s, 3, 8 * s);
      c.restore();
    }
  }

  function killTank(p, s, ctx) {
    const self = s && s.owner === p.i;
    if (globalThis.__ttLog) globalThis.__ttLog.push({ t: +ctx.time.toFixed(2), victim: p.i, owner: s && s.owner, b: s && s.b, trav: s && Math.round(s.trav), age: s && +s.age.toFixed(2), twist: ctx.twist.id, dirv: s && [s.dx.toFixed(2), s.dy.toFixed(2)], pos: [Math.round(p.x), Math.round(p.y)] });
    ctx.eliminate(p, { x: p.x, y: p.y });
    const x = p.x;
    const y = p.y;
    fx.burst(x, y, { count: 30, colors: ['#fff3b0', '#ffd23f', '#ff8a3d', '#ff4d2e'], speed: 280, life: 0.55, gravity: 0, drag: 0.9, size: 7 });
    fx.burst(x, y, { count: 14, colors: ['#3a3450', '#4b4468', '#2a2438'], speed: 80, life: 1.3, gravity: -25, drag: 0.94, size: 11 });
    fx.burst(x, y, { count: 14, colors: [draw.shade(p.color, -0.2), '#2a2e45', '#565d86'], speed: 360, life: 0.9, gravity: 0, drag: 0.92, size: 5, shape: 'square', shrink: false });
    fx.ring(x, y, { color: '#ffd23f', radius: 95 * ctx.size, life: 0.42, width: 9 });
    fx.shake(15, 0.42);
    fx.flash('#fff1d6', 0.22);
    sndBoom(api.sfx);
    if (self) fx.text(x, y - 30, 'OOPS!', { color: '#ffffff', size: 26, life: 1.1, stroke: p.color });
    else if (s) fx.text(x, y - 30, 'BOOM!', { color: '#ffd23f', size: 24, life: 0.9, stroke: 'rgba(0,0,0,0.5)' });
    wrecks.push({ x, y, a: p.data.a, color: p.color, s: ctx.size, smoke: 0 });
    const ang = s ? Math.atan2(s.dy, s.dx) : Math.random() * TAU;
    debris.push({ x, y, vx: Math.cos(ang) * 120 + (Math.random() - 0.5) * 80, vy: Math.sin(ang) * 120 + (Math.random() - 0.5) * 80, z: 0, vz: 260, rot: p.data.a, vr: (Math.random() - 0.5) * 18, color: p.color, s: ctx.size });
    paintScorch(x, y, 34 * ctx.size);
    slow = 0.28;
  }

  // ---------- update ----------
  function update(dt0, ctx) {
    const dt = slow > 0 ? dt0 * 0.35 : dt0;
    slow = Math.max(0, slow - dt0);
    const R = tankR(ctx);
    if (!sudden && ctx.time >= SUDDEN_AT && ctx.alive().length > 1) {
      sudden = true;
      suddenT = 0;
      fx.text(W / 2, H / 2, 'SUDDEN DEATH', { color: '#ff5a5a', size: 38, life: 1.6, rise: 30, stroke: '#10081f' });
      fx.flash('#ff3d5a', 0.25);
      api.sfx.tone({ freq: 620, to: 920, type: 'square', dur: 0.18, vol: 0.07 });
      api.sfx.tone({ freq: 620, to: 920, type: 'square', dur: 0.18, vol: 0.07, delay: 0.24 });
    }
    if (sudden) suddenT += dt;

    for (const p of ctx.active) {
      if (!p.alive) continue;
      const d = p.data;
      d.recoil = Math.max(0, d.recoil - dt * 40);
      d.cd -= dt;
      if (p.down) {
        const step = DRIVE * dt;
        const bx = p.x;
        const by = p.y;
        p.x += Math.cos(d.a) * step;
        p.y += Math.sin(d.a) * step;
        pushOut(walls, p, R);
        const moved = Math.hypot(p.x - bx, p.y - by);
        d.blocked = moved < step * 0.5 ? d.blocked + dt : 0;
        d.moving = moved > 0.1;
        d.tread += moved;
        d.mark += moved;
        if (d.mark > 5) {
          d.mark = 0;
          paintTread(p, ctx);
        }
        if (p.tap && p.human) api.sfx.noise({ dur: 0.06, vol: 0.06, freq: 500, to: 200 });
      } else {
        d.moving = false;
        d.blocked = 0;
        d.a += SPIN * dt;
        if (d.a > TAU) d.a -= TAU;
      }
      if (p.release) fire(p, ctx);
    }

    // tanks shove each other apart
    const act = ctx.active;
    for (let i = 0; i < act.length; i++) {
      const a = act[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < act.length; j++) {
        const b = act[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = R * 2;
        if (d2 < min * min && d2 > 1e-6) {
          const dd = Math.sqrt(d2);
          const push = (min - dd) / 2;
          a.x -= (dx / dd) * push;
          a.y -= (dy / dd) * push;
          b.x += (dx / dd) * push;
          b.y += (dy / dd) * push;
          pushOut(walls, a, R);
          pushOut(walls, b, R);
        }
      }
    }

    // shells
    const speed = shellSpeed();
    for (const s of shells) {
      if (s.dead) continue;
      s.age += dt;
      const sub = 3;
      for (let k = 0; k < sub && !s.dead; k++) {
        if (!moveShell(s, (speed * dt) / sub, ctx, false)) {
          popShell(s);
          break;
        }
        for (const p of act) {
          if (!p.alive) continue;
          if (p.i === s.owner && !(s.b >= 1 && s.trav >= ARM_DIST)) continue;
          const dx = p.x - s.x;
          const dy = p.y - s.y;
          const rr = R + s.r;
          if (dx * dx + dy * dy < rr * rr) {
            s.dead = true;
            killTank(p, s, ctx);
            break;
          }
        }
      }
      if (!s.dead && s.age > SHELL_LIFE) popShell(s);
      s.trail.push(s.x, s.y);
      if (s.trail.length > 16) s.trail.splice(0, s.trail.length - 16);
    }
    // shells cancel each other out
    for (let i = 0; i < shells.length; i++) {
      const a = shells[i];
      if (a.dead) continue;
      for (let j = i + 1; j < shells.length; j++) {
        const b = shells[j];
        if (b.dead) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const rr = a.r + b.r;
        if (dx * dx + dy * dy < rr * rr) {
          a.dead = true;
          b.dead = true;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          fx.burst(mx, my, { count: 16, colors: [a.color, b.color, '#ffffff'], speed: 220, life: 0.35, gravity: 0, size: 3, shape: 'spark' });
          fx.ring(mx, my, { color: '#ffffff', radius: 30, life: 0.3, width: 3 });
          fx.shake(4, 0.12);
          sndClash(api.sfx);
          break;
        }
      }
    }
    if (shells.some((s) => s.dead)) shells = shells.filter((s) => !s.dead);

    stepCosmetic(dt);
  }

  function stepCosmetic(dt) {
    for (const f of flashes) f.t += dt;
    if (flashes.length && flashes[0].t > 0.1) flashes = flashes.filter((f) => f.t <= 0.1);
    for (const b of debris) {
      if (b.z > 0 || b.vz > 0) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.vz -= 900 * dt;
        b.rot += b.vr * dt;
        if (b.z <= 0) {
          b.z = 0;
          if (Math.abs(b.vz) > 120) {
            b.vz = -b.vz * 0.35;
            b.vx *= 0.5;
            b.vy *= 0.5;
            fx.burst(b.x, b.y, { count: 5, color: 'rgba(200,200,220,0.6)', speed: 60, life: 0.35, gravity: 0, size: 3 });
          } else {
            b.vz = 0;
            b.vr = 0;
          }
        }
        b.x = clamp(b.x, X0 + 6, X1 - 6);
        b.y = clamp(b.y, Y0 + 6, Y1 - 6);
      }
    }
    for (const w of wrecks) {
      w.smoke -= dt;
      if (w.smoke <= 0) {
        w.smoke = 0.18 + Math.random() * 0.2;
        fx.burst(w.x + (Math.random() - 0.5) * 10, w.y + (Math.random() - 0.5) * 10, { count: 1, color: 'rgba(70,66,92,0.55)', speed: 18, life: 1.3, gravity: -30, drag: 0.97, size: 7 + Math.random() * 5, shrink: false });
      }
    }
  }

  // ---------- bots ----------
  const PATH = [];
  // Where would a shell fired from (ox, oy) along angle a go? Returns the first tank it
  // hits: { who, b, dist } or null. ignoreEnemies: only check whether it comes home.
  function traceShot(ctx, owner, ox, oy, a, lead, ignoreEnemies) {
    const R = tankR(ctx);
    const r = shellR(ctx);
    const speed = shellSpeed();
    const maxB = maxBounces(ctx);
    let dx = Math.cos(a);
    let dy = Math.sin(a);
    let x = ox;
    let y = oy;
    let trav = 0;
    const maxDist = 780;
    for (let b = 0; b <= maxB; b++) {
      castWalls(walls, x, y, dx, dy, r, HIT);
      const segLen = Math.min(HIT.t, maxDist - trav);
      let best = segLen;
      let who = null;
      for (const q of ctx.active) {
        if (!q.alive) continue;
        let qx = q.x;
        let qy = q.y;
        if (q.i === owner) {
          if (b < 1) continue;
        } else {
          if (ignoreEnemies) continue;
          if (q.down) {
            const T = lead + (trav + Math.hypot(q.x - x, q.y - y)) / speed;
            qx += Math.cos(q.data.a) * DRIVE * T;
            qy += Math.sin(q.data.a) * DRIVE * T;
          }
        }
        const t = rayCircle(x, y, dx, dy, qx, qy, R + r);
        if (t < 0 || t >= best) continue;
        if (q.i === owner && trav + t < ARM_DIST) continue;
        best = t;
        who = q;
      }
      if (who) return { who, b, dist: trav + best };
      trav += segLen;
      if (trav >= maxDist - 0.5) return null;
      x += dx * segLen;
      y += dy * segLen;
      if (HIT.nx) dx = -dx;
      if (HIT.ny) dy = -dy;
    }
    return null;
  }

  // The path a live shell will follow over the next `dist` px, as [x, y, cumDist, ...].
  function shellPath(ctx, s, dist) {
    PATH.length = 0;
    let x = s.x;
    let y = s.y;
    let dx = s.dx;
    let dy = s.dy;
    let trav = 0;
    PATH.push(x, y, 0);
    for (let b = s.b; b <= maxBounces(ctx); b++) {
      castWalls(walls, x, y, dx, dy, s.r, HIT);
      const seg = Math.min(HIT.t, dist - trav);
      x += dx * seg;
      y += dy * seg;
      trav += seg;
      PATH.push(x, y, trav);
      if (trav >= dist - 0.5) break;
      if (HIT.nx) dx = -dx;
      if (HIT.ny) dy = -dy;
    }
    return PATH;
  }

  // Most urgent incoming shell: { t, pts } (time to impact, its path) or null.
  function findThreat(p, ctx, react) {
    const R = tankR(ctx);
    const speed = shellSpeed();
    let best = null;
    for (const s of shells) {
      if (s.dead) continue;
      const own = s.owner === p.i;
      if (!own && s.age < react) continue;
      const pts = shellPath(ctx, s, speed * 1.0);
      for (let k = 0; k + 5 < pts.length; k += 3) {
        // our own shell is harmless until it has bounced and travelled ARM_DIST
        if (own && (s.b + k / 3 < 1 || s.trav + pts[k + 5] < ARM_DIST)) continue;
        const sd = segDist(p.x, p.y, pts[k], pts[k + 1], pts[k + 3], pts[k + 4]);
        if (sd.d < R + s.r + 7) {
          const t = (pts[k + 2] + (pts[k + 5] - pts[k + 2]) * sd.k) / speed;
          if (!best || t < best.t) best = { t, pts: pts.slice() };
          break;
        }
      }
    }
    return best;
  }

  const SIM = { x: 0, y: 0 };
  function simulateDrive(ctx, x, y, a, hold) {
    const R = tankR(ctx);
    SIM.x = x;
    SIM.y = y;
    const dist = DRIVE * hold;
    const n = Math.max(1, Math.ceil(dist / 8));
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    let moved = 0;
    for (let k = 0; k < n; k++) {
      const bx = SIM.x;
      const by = SIM.y;
      SIM.x += (cs * dist) / n;
      SIM.y += (sn * dist) / n;
      pushOut(walls, SIM, R);
      moved += Math.hypot(SIM.x - bx, SIM.y - by);
    }
    return { x: SIM.x, y: SIM.y, ratio: moved / dist };
  }

  function nearestEnemy(p, ctx, x, y) {
    let m = Infinity;
    for (const q of ctx.active) {
      if (!q.alive || q === p) continue;
      m = Math.min(m, Math.hypot(q.x - x, q.y - y));
    }
    return m;
  }

  function decide(p, b, ctx) {
    const d = p.data;
    const R = tankR(ctx);
    const a0 = d.a;
    const rng = ctx.rng;
    const ready = liveShells(p.i) < maxLive(ctx);

    // 1) dodge the most urgent incoming shell
    const threat = findThreat(p, ctx, b.react);
    if (threat && threat.t > 0.12) {
      const hold = 0.3 + rng() * 0.12;
      for (let dl = 0; dl < Math.min(threat.t - 0.12, 1.5); dl += 0.04) {
        const a = a0 + SPIN * dl;
        const end = simulateDrive(ctx, p.x, p.y, a, hold);
        if (end.ratio < 0.6) continue;
        let m = Infinity;
        const pts = threat.pts;
        for (let k = 0; k + 5 < pts.length; k += 3) m = Math.min(m, segDist(end.x, end.y, pts[k], pts[k + 1], pts[k + 3], pts[k + 4]).d);
        if (m <= R + SHELL_R + 12) continue;
        const back = traceShot(ctx, p.i, end.x, end.y, a, 0, true);
        if (back && dl < threat.t - 0.5) continue;
        return { delay: dl, hold, kind: 'move' };
      }
    }

    // 2) line up a shot (direct or banked) within the next spin
    if (ready) {
      const hold = 0.04 + rng() * 0.06;
      for (let dl = 0; dl < 1.25; dl += 0.03) {
        if (d.cd - dl - hold > 0) continue;
        const a = a0 + SPIN * dl;
        const res = traceShot(ctx, p.i, p.x, p.y, a, dl + hold, false);
        if (!res || res.who === p) continue;
        if (res.b >= 2 && res.dist > 560) continue;
        // would it come back for us if the target dodges?
        const home = traceShot(ctx, p.i, p.x, p.y, a, 0, true);
        if (home && home.dist < res.dist + 260 && rng() < 0.75) continue;
        if (rng() < b.hesitate) {
          b.think = 0.2 + rng() * 0.25;
          return null;
        }
        return { delay: dl, hold, kind: 'shot' };
      }
    }

    // 3) reposition: toward open space, away from walls, at a comfy range from rivals
    const clear = clearance(walls, p.x, p.y) - R;
    if (b.idleT > b.patience || clear < 10 || !ready) {
      const hold = 0.3 + rng() * 0.45;
      let best = null;
      let bestScore = -Infinity;
      for (let dl = 0; dl < 2.0; dl += 0.05) {
        const a = a0 + SPIN * dl;
        const end = simulateDrive(ctx, p.x, p.y, a, hold);
        if (end.ratio < 0.55) continue;
        const c = clearance(walls, end.x, end.y) - R;
        const e = nearestEnemy(p, ctx, end.x, end.y);
        let sc = Math.min(c, 48) / 48 - Math.abs(e - 190) / 320 - dl * 0.12 + (rng() - 0.5) * 0.3;
        sc -= Math.hypot(end.x - CX, end.y - CY) / 900;
        const res = traceShot(ctx, p.i, end.x, end.y, a, dl + hold, false);
        if (res && res.who !== p) sc += ready ? 0.9 : 0.3;
        else if (res && res.who === p) sc -= 3;
        else if (traceShot(ctx, p.i, end.x, end.y, a, 0, true)) sc -= 1.2;
        if (sc > bestScore) {
          bestScore = sc;
          best = { delay: dl, hold, kind: 'move' };
        }
      }
      if (best) return best;
    }
    return null;
  }

  function gauss(rng) {
    return (rng() + rng() + rng() - 1.5) * 1.41;
  }

  function bot(p, dt, ctx) {
    const d = p.data;
    const rng = ctx.rng;
    let b = d.bot;
    if (!b) {
      b = d.bot = {
        mode: 'idle',
        think: 0.15 + rng() * 0.35,
        wait: 0,
        hold: 0,
        kind: '',
        idleT: 0,
        react: 0.16 + rng() * 0.14,
        sigma: 0.016 + rng() * 0.014,
        hesitate: 0.12 + rng() * 0.14,
        patience: 0.9 + rng() * 1.2,
      };
    }
    if (b.mode === 'hold') {
      b.hold -= dt;
      const blocked = b.kind === 'move' && d.blocked > 0.1;
      if (b.hold <= 0 || blocked) {
        // letting go fires: keep rolling a little longer if that shell would come home
        if (b.kind === 'move' && !blocked && b.extend < 0.6 && d.cd <= 0 && liveShells(p.i) < maxLive(ctx) && traceShot(ctx, p.i, p.x, p.y, d.a, 0, true)) {
          b.extend += dt;
          return true;
        }
        b.mode = 'idle';
        b.idleT = 0;
        b.think = 0.05 + rng() * 0.12;
        return false;
      }
      return true;
    }
    if (b.mode === 'wait') {
      if (b.wait <= dt * 0.5) {
        b.mode = 'hold';
        return true;
      }
      b.wait -= dt;
      return false;
    }
    b.idleT += dt;
    b.think -= dt;
    if (b.think > 0) return false;
    b.think = 0.07 + rng() * 0.07;
    const plan = decide(p, b, ctx);
    if (!plan) return false;
    b.mode = 'wait';
    b.extend = 0;
    b.wait = Math.max(0, plan.delay + gauss(rng) * b.sigma);
    b.hold = plan.hold;
    b.kind = plan.kind;
    if (b.wait <= dt * 0.5) {
      b.mode = 'hold';
      return true;
    }
    b.wait -= dt;
    return false;
  }

  // ---------- render ----------
  function render(g, ctx) {
    const T = api.totalTime;
    if (floorCv) g.drawImage(floorCv, 0, 0, W, H);
    else paintFloor(g);
    const R = tankR(ctx);
    const inPlay = ctx.phase !== 'lobby';

    if (sudden) {
      const k = 0.35 + 0.25 * Math.sin(T * 8);
      g.strokeStyle = `rgba(255,70,90,${k})`;
      g.lineWidth = 4;
      g.strokeRect(X0 + 2, Y0 + 2, X1 - X0 - 4, Y1 - Y0 - 4);
    }

    for (const w of wrecks) drawWreck(g, w.x, w.y, w.a, w.color, w.s);
    for (const b of debris) if (b.z <= 0) drawTurret(g, b);
    for (const w of walls) drawWall(g, w, T);

    // aim guides
    if (inPlay) {
      g.save();
      g.lineWidth = 2.5;
      g.setLineDash([5, 7]);
      g.lineDashOffset = -T * 40;
      for (const p of ctx.active) {
        if (!p.alive) continue;
        const a = p.data.a;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const r0 = R + 11 * ctx.size;
        const r1 = r0 + (p.down ? 26 : 46) * ctx.size;
        g.strokeStyle = draw.rgba(p.color, p.down ? 0.3 : 0.55);
        g.beginPath();
        g.moveTo(p.x + c * r0, p.y + s * r0);
        g.lineTo(p.x + c * r1, p.y + s * r1);
        g.stroke();
      }
      g.restore();
    }

    // shells
    for (const s of shells) {
      const tr = s.trail;
      if (tr.length >= 4) {
        g.lineCap = 'round';
        g.lineJoin = 'round';
        const n = tr.length / 2;
        for (let k = 1; k < n; k++) {
          const f = k / n;
          g.strokeStyle = draw.rgba(s.color, 0.05 + f * 0.4);
          g.lineWidth = s.r * 2 * (0.3 + f * 0.7);
          g.beginPath();
          g.moveTo(tr[(k - 1) * 2], tr[(k - 1) * 2 + 1]);
          g.lineTo(tr[k * 2], tr[k * 2 + 1]);
          g.stroke();
        }
      }
      draw.circle(g, s.x, s.y, s.r * 2.1, draw.rgba(s.color, 0.25));
      draw.circle(g, s.x, s.y, s.r, s.color);
      draw.circle(g, s.x - s.r * 0.2, s.y - s.r * 0.2, s.r * 0.55, '#ffffff');
    }

    // tanks
    for (const p of ctx.active) {
      if (!p.alive) continue;
      const d = p.data;
      drawTank(g, p.x, p.y, d.a || 0, p.color, ctx.size, { recoil: d.recoil, tread: d.tread });
      if (inPlay) drawAmmo(g, p, ctx);
    }

    for (const b of debris) if (b.z > 0) drawTurret(g, b);

    for (const f of flashes) {
      const k = 1 - f.t / 0.1;
      g.save();
      g.translate(f.x, f.y);
      g.rotate(f.a);
      g.globalAlpha = k;
      g.fillStyle = '#fff4c4';
      g.beginPath();
      g.moveTo(-2, -6 * f.s);
      g.lineTo(16 * f.s, 0);
      g.lineTo(-2, 6 * f.s);
      g.closePath();
      g.fill();
      draw.circle(g, 0, 0, 7 * f.s * k + 2, draw.rgba(f.color, 0.8));
      draw.circle(g, 0, 0, 4 * f.s, '#ffffff');
      g.restore();
    }
    g.globalAlpha = 1;
  }

  function drawAmmo(g, p, ctx) {
    const n = maxLive(ctx);
    const live = liveShells(p.i);
    const cd = p.data.cd;
    const y = p.y + 27 * ctx.size;
    const gap = n > 2 ? 7 : 9;
    for (let k = 0; k < n; k++) {
      const x = p.x + (k - (n - 1) / 2) * gap;
      const ready = k < n - live;
      draw.circle(g, x, y, 3.4, 'rgba(8,10,30,0.7)');
      if (ready) draw.circle(g, x, y, 2.5, cd > 0 ? draw.rgba(p.color, 0.45) : p.color);
    }
  }

  function drawTurret(g, b) {
    const sc = b.s * (1 + b.z / 90);
    g.save();
    g.translate(b.x, b.y - b.z * 0.4);
    if (b.z > 0) {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.ellipse(0, b.z * 0.4 + 4, 9 * b.s, 7 * b.s, 0, 0, TAU);
      g.fill();
    }
    g.rotate(b.rot);
    g.scale(sc, sc);
    const dark = draw.shade(b.color, -0.6);
    draw.roundRect(g, 1, -3, 20, 6, 2, '#1d1b27');
    draw.circle(g, -1, 0, 8.4, '#1d1b27');
    draw.circle(g, -1.5, -0.6, 6, dark);
    g.restore();
  }

  function timeUp(ctx) {
    const alive = ctx.alive();
    return alive.length === 1 ? alive[0] : null;
  }

  return createParty(api, {
    roundsToWin: 3,
    roundTime: ROUND_TIME,
    twists: ['turbo', 'giants', 'tiny', 'swap', 'lights', 'wobble', { id: 'ricochet', name: 'RICOCHET', desc: 'Shells bounce five times', emoji: '🎱' }, { id: 'rapid', name: 'RAPID FIRE', desc: 'Four shells each and almost no reload', emoji: '🔥' }],
    setup,
    update,
    render,
    bot,
    timeUp,
  });
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = Math.min(w / 420, h / 315);
  g.save();
  // floor
  const fg = g.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.7);
  fg.addColorStop(0, '#343c78');
  fg.addColorStop(1, '#161a3c');
  g.fillStyle = fg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,180,255,0.08)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let x = 0; x < w; x += 40 * s) {
    g.moveTo(x, 0);
    g.lineTo(x, h);
  }
  for (let y = 0; y < h; y += 40 * s) {
    g.moveTo(0, y);
    g.lineTo(w, y);
  }
  g.stroke();
  // scorch
  const sx = w * 0.7;
  const sy = h * 0.34;
  const sg = g.createRadialGradient(sx, sy, 4, sx, sy, 70 * s);
  sg.addColorStop(0, 'rgba(8,6,14,0.8)');
  sg.addColorStop(1, 'rgba(8,6,14,0)');
  g.fillStyle = sg;
  g.beginPath();
  g.arc(sx, sy, 70 * s, 0, TAU);
  g.fill();
  // walls
  g.save();
  g.scale(s, s);
  drawWall(g, { x0: 170, y0: 40, x1: 196, y1: 150 }, 0);
  drawWall(g, { x0: 250, y0: 205, x1: 350, y1: 229 }, 0);
  drawWall(g, { x0: 36, y0: 150, x1: 96, y1: 172 }, 0);
  g.restore();
  // bank shot trail: from the pink tank, off the wall, into the blue tank
  const P = (x, y) => [x * s, y * s];
  const pts = [P(92, 245), P(250, 190), P(292, 110)];
  g.lineCap = 'round';
  g.setLineDash([2, 14 * s]);
  g.strokeStyle = 'rgba(255,61,139,0.85)';
  g.lineWidth = 6 * s;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  g.lineTo(pts[1][0], pts[1][1]);
  g.lineTo(pts[2][0], pts[2][1]);
  g.stroke();
  g.setLineDash([]);
  // bounce spark
  g.fillStyle = '#ffffff';
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.35;
    g.globalAlpha = 0.8;
    g.fillRect(pts[1][0] + Math.cos(a) * 12 * s, pts[1][1] + Math.sin(a) * 12 * s - 6 * s, 3 * s, 3 * s);
  }
  g.globalAlpha = 1;
  // tanks
  drawTank(g, 92 * s, 245 * s, Math.atan2(190 - 245, 250 - 92), '#ff3d8b', 2.1 * s, { recoil: 4 });
  drawTank(g, 350 * s, 270 * s, -2.5, '#ffc93c', 2.1 * s, {});
  drawTank(g, 72 * s, 75 * s, 0.6, '#7dff5a', 2.1 * s, { tread: 3 });
  // shell in flight
  const shx = 272 * s;
  const shy = 148 * s;
  draw.circle(g, shx, shy, 14 * s, 'rgba(255,61,139,0.3)');
  draw.circle(g, shx, shy, 8 * s, '#ff3d8b');
  draw.circle(g, shx - 2 * s, shy - 2 * s, 4 * s, '#ffffff');
  // the blue tank going up in flames
  const ex = 300 * s;
  const ey = 92 * s;
  drawTank(g, ex, ey, 2.4, '#2fd9ff', 2.1 * s, {});
  const eg = g.createRadialGradient(ex, ey, 4, ex, ey, 80 * s);
  eg.addColorStop(0, 'rgba(255,250,210,0.95)');
  eg.addColorStop(0.35, 'rgba(255,200,60,0.75)');
  eg.addColorStop(0.7, 'rgba(255,90,40,0.35)');
  eg.addColorStop(1, 'rgba(255,60,40,0)');
  g.fillStyle = eg;
  g.beginPath();
  g.arc(ex, ey, 80 * s, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(255,220,120,0.9)';
  g.lineWidth = 5 * s;
  g.beginPath();
  g.arc(ex, ey, 62 * s, 0, TAU);
  g.stroke();
  const cols = ['#ffd23f', '#ff8a3d', '#ffffff', '#2fd9ff', '#ff4d2e'];
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * TAU + (k % 3) * 0.2;
    const r = (46 + ((k * 37) % 40)) * s;
    g.fillStyle = cols[k % cols.length];
    g.save();
    g.translate(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
    g.rotate(a);
    g.fillRect(-4 * s, -2.5 * s, 9 * s, 5 * s);
    g.restore();
  }
  g.restore();
}
