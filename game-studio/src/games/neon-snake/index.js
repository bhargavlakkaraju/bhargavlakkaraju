import { mulberry32 } from '../engine/rng.js';

// Neon Snake - classic snake with smooth interpolated movement and a neon glow look.
// Grid 20x28, buffered swipe/keyboard turns, combo streaks, golden orbs and seeded obstacles.

const W = 420;
const H = 740;
const COLS = 20;
const ROWS = 28;
const CELL = 20;
const GX = 10;
const GY = 146;
const GW = COLS * CELL;
const GH = ROWS * CELL;
const TAU = Math.PI * 2;
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const OPP = [2, 3, 0, 1];
const START_LEN = 5;
const GOLD_LIFE = 6.5;
const WARN_TIME = 1.5;
const PER_LEVEL = 8;

const SHAPES = [
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [0, 0, 1, 0, 2, 0],
  [0, 0, 0, 1, 0, 2],
  [0, 0, 1, 0, 0, 1],
  [0, 0, 1, 0, 1, 1],
  [0, 0, 1, 0, 0, 1, 1, 1],
  [0, 0, 1, 0, 2, 0, 3, 0],
];

// Neon themes, one per level (cycled). snake head -> tail colours, orb, border.
const THEMES = [
  { a: [57, 255, 158], b: [0, 190, 255], orb: '#ff3df2', orb2: '#ff9cf8', border: [34, 211, 238] },
  { a: [255, 233, 61], b: [255, 110, 26], orb: '#22e1ff', orb2: '#a5f3fc', border: [255, 140, 40] },
  { a: [255, 79, 216], b: [124, 77, 255], orb: '#39ff9e', orb2: '#b6ffd9', border: [179, 102, 255] },
  { a: [0, 229, 255], b: [61, 110, 255], orb: '#ffcf3d', orb2: '#fff0a8', border: [61, 123, 255] },
  { a: [255, 94, 94], b: [255, 186, 61], orb: '#3dffd0', orb2: '#b8fff0', border: [255, 94, 94] },
];
const NCOL = 32;
for (const th of THEMES) {
  th.body = [];
  for (let i = 0; i < NCOL; i++) {
    const k = i / (NCOL - 1);
    const c = [0, 1, 2].map((j) => Math.round(th.a[j] + (th.b[j] - th.a[j]) * k));
    th.body.push(`rgb(${c[0]},${c[1]},${c[2]})`);
  }
  th.head = th.body[0];
  th.glow = `rgba(${th.a[0]},${th.a[1]},${th.a[2]},0.16)`;
  th.glow2 = `rgba(${th.a[0]},${th.a[1]},${th.a[2]},0.08)`;
  th.bd = `rgb(${th.border[0]},${th.border[1]},${th.border[2]})`;
  th.bdGlow = `rgba(${th.border[0]},${th.border[1]},${th.border[2]},0.22)`;
  th.bdFaint = `rgba(${th.border[0]},${th.border[1]},${th.border[2]},0.07)`;
}

function hash3(a, b, c) {
  let h = (a ^ Math.imul(b + 0x632be5ab, 0x9e3779b1) ^ Math.imul(c + 0x1b873593, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

const cx = (i) => GX + ((i % COLS) + 0.5) * CELL;
const cy = (i) => GY + (((i / COLS) | 0) + 0.5) * CELL;

export default function createGame(api) {
  const { fx, sfx, draw, ease } = api;
  const occ = new Uint8Array(COLS * ROWS);
  const obst = new Uint8Array(COLS * ROWS); // 0 free, 1 warning, 2 solid
  const pts = new Float32Array((COLS * ROWS + 4) * 2);
  const trail = [];
  for (let i = 0; i < 48; i++) trail.push({ x: 0, y: 0, life: 0, max: 1 });
  let trailI = 0;
  const debris = [];
  const bulges = new Int32Array(8);
  let bulgeI = 0;

  let body;
  let dir;
  let queue;
  let grow;
  let lastTail;
  let acc;
  let tickLen;
  let ticks;
  let orb;
  let orbK;
  let orbT;
  let gold;
  let goldT;
  let goldIn;
  let seed;
  let eaten;
  let level;
  let combo;
  let comboTimer;
  let comboFull = 1;
  let comboMax;
  let dead;
  let deathT;
  let deathCell;
  let deathDir;
  let scattered;
  let t;
  let headAng;
  let blinkT;
  let tongueT;
  let warnT;
  let levelT;
  let swipe;
  let startTap;
  let scorePop;
  let bgCanvas = null;

  function theme() {
    return THEMES[(level - 1) % THEMES.length];
  }

  function placeSnake(head, d, len) {
    body = [];
    occ.fill(0);
    const hx = head % COLS;
    const hy = (head / COLS) | 0;
    for (let i = 0; i < len; i++) {
      const c = (hy - DY[d] * i) * COLS + (hx - DX[d] * i);
      body.push(c);
      occ[c]++;
    }
    const tx = hx - DX[d] * len;
    const ty = hy - DY[d] * len;
    lastTail = tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS ? ty * COLS + tx : -1;
    dir = d;
    headAng = Math.atan2(DY[d], DX[d]);
    queue = [];
    grow = 0;
    acc = 0;
  }

  function reset() {
    seed = (api.rng() * 4294967296) >>> 0;
    obst.fill(0);
    placeSnake(20 * COLS + 10, 0, START_LEN);
    ticks = 0;
    eaten = 0;
    level = 1;
    combo = 0;
    comboTimer = 0;
    comboMax = 0;
    dead = false;
    deathT = 0;
    scattered = false;
    debris.length = 0;
    t = 0;
    blinkT = 3;
    tongueT = 2;
    warnT = 0;
    levelT = 0;
    swipe = null;
    startTap = false;
    scorePop = 0;
    gold = -1;
    goldT = 0;
    goldIn = 5 + (hash3(seed, 999, 1) % 4);
    orbK = 0;
    for (const p of trail) p.life = 0;
    bulges.fill(-1000);
    tickLen = speedFor(0);
    spawnOrb();
  }

  function speedFor(n) {
    return Math.max(0.058, 0.128 * Math.pow(0.986, n));
  }

  function isFree(c, margin) {
    if (occ[c] || obst[c] || c === orb || c === gold) return false;
    if (margin) {
      const hx = body[0] % COLS;
      const hy = (body[0] / COLS) | 0;
      const x = c % COLS;
      const y = (c / COLS) | 0;
      if (Math.abs(x - hx) + Math.abs(y - hy) < margin) return false;
    }
    return true;
  }

  function pickCell(k, salt) {
    for (let j = 0; j < 300; j++) {
      const c = hash3(seed, k * 7 + salt, j) % (COLS * ROWS);
      if (isFree(c, 3)) return c;
    }
    for (let c = 0; c < COLS * ROWS; c++) if (isFree(c, 0)) return c;
    return -1;
  }

  function spawnOrb() {
    orb = -1;
    orb = pickCell(orbK++, 1);
    orbT = 0;
    if (orb >= 0) {
      const d = Math.abs((orb % COLS) - (body[0] % COLS)) + Math.abs(((orb / COLS) | 0) - ((body[0] / COLS) | 0));
      comboTimer = (d + 3) * tickLen * 1.45 + 0.9;
      comboFull = comboTimer;
    }
  }

  function spawnGold() {
    gold = -1;
    gold = pickCell(1000 + eaten, 3);
    goldT = GOLD_LIFE;
    if (gold >= 0) {
      sfx.play('coin');
      fx.ring(cx(gold), cy(gold), { color: '#ffd23f', radius: 40, life: 0.5, width: 3 });
    }
  }

  function levelUp() {
    level += 1;
    levelT = 1;
    const th = theme();
    fx.flash(th.head, 0.18);
    sfx.play('levelup');
    api.emit('milestone', { level });
    // seeded obstacle shapes (appear as warnings first, then solidify)
    const n = Math.min(4, 1 + (level >> 1));
    let total = 0;
    for (let i = 0; i < obst.length; i++) if (obst[i]) total++;
    const hx = body[0] % COLS;
    const hy = (body[0] / COLS) | 0;
    for (let s = 0; s < n && total < 48; s++) {
      const h = hash3(seed, 5000 + level, s);
      const shape = SHAPES[h % SHAPES.length];
      const ox = 2 + ((h >>> 8) % (COLS - 6));
      const oy = 2 + ((h >>> 16) % (ROWS - 6));
      let ok = true;
      for (let k = 0; k < shape.length; k += 2) {
        const x = ox + shape[k];
        const y = oy + shape[k + 1];
        const c = y * COLS + x;
        if (x >= COLS - 1 || y >= ROWS - 1 || !isFree(c, 0)) ok = false;
        else if (Math.max(Math.abs(x - hx), Math.abs(y - hy)) < 5) ok = false;
        else {
          // keep the lane straight ahead of the head clear
          const ax = x - hx;
          const ay = y - hy;
          const along = ax * DX[dir] + ay * DY[dir];
          const side = Math.abs(ax * DY[dir] - ay * DX[dir]);
          if (along > 0 && along < 10 && side <= 1) ok = false;
        }
      }
      if (!ok) continue;
      for (let k = 0; k < shape.length; k += 2) {
        obst[(oy + shape[k + 1]) * COLS + ox + shape[k]] = 1;
        total++;
      }
    }
    warnT = WARN_TIME;
  }

  function solidify() {
    for (let i = 0; i < obst.length; i++) {
      if (obst[i] !== 1) continue;
      if (occ[i] || i === orb || i === gold) obst[i] = 0;
      else {
        obst[i] = 2;
        fx.burst(cx(i), cy(i), { count: 4, color: '#ff4fd8', speed: 90, size: 2.5, life: 0.35, gravity: 0 });
      }
    }
    sfx.tone({ freq: 120, to: 70, type: 'square', dur: 0.12, vol: 0.08 });
    fx.shake(3, 0.12);
  }

  function eat(golden) {
    const c = golden ? gold : orb;
    const x = cx(c);
    const y = cy(c);
    const th = theme();
    if (golden) {
      gold = -1;
      grow += 3;
      const pts = 5;
      api.addScore(pts);
      fx.burst(x, y, { count: 40, colors: ['#ffd23f', '#fff4b0', '#ffffff'], speed: 320, size: 4, life: 0.8, gravity: 0, drag: 0.93 });
      fx.ring(x, y, { color: '#ffd23f', radius: 70, life: 0.5, width: 5 });
      fx.text(x, y - 18, '+5', { color: '#ffd23f', size: 36, life: 1 });
      fx.shake(5, 0.15);
      sfx.play('perfect');
      api.haptic(25);
    } else {
      combo = comboTimer > 0 ? combo + 1 : 1;
      comboMax = Math.max(comboMax, combo);
      const bonus = Math.min(3, Math.floor((combo - 1) / 2));
      const pts = 1 + bonus;
      api.addScore(pts);
      grow += 1;
      eaten++;
      fx.burst(x, y, { count: 16 + Math.min(combo, 10) * 2, colors: [th.orb, th.orb2, '#ffffff'], speed: 220, size: 3.5, life: 0.55, gravity: 0, drag: 0.94 });
      fx.ring(x, y, { color: th.orb, radius: 34 + Math.min(combo, 8) * 4, life: 0.4, width: 3 });
      const tx = Math.max(GX + 44, Math.min(GX + GW - 44, x));
      fx.text(tx, y - 16, combo >= 3 ? `+${pts} ×${combo}` : `+${pts}`, { color: combo >= 3 ? '#ffffff' : th.orb2, size: combo >= 3 ? 26 : 22, life: 0.75, rise: 50 });
      sfx.combo(Math.min(combo - 1, 14), 440);
      if (combo === 5 || combo === 10 || combo === 15) {
        fx.text(W / 2, GY + GH * 0.62, combo >= 10 ? 'ON FIRE!' : 'COMBO!', { color: '#ffffff', size: 40, life: 1.1 });
        api.happy();
      }
      api.haptic(10);
      if (1 + Math.floor(eaten / PER_LEVEL) > level) levelUp();
      tickLen = speedFor(eaten + (level - 1) * 2);
      goldIn--;
      if (goldIn <= 0 && gold < 0) {
        goldIn = 6 + (hash3(seed, 777, eaten) % 5);
        spawnGold();
      }
      spawnOrb();
    }
    bulges[bulgeI++ % bulges.length] = ticks;
    scorePop = 1;
  }

  function die(nx, ny) {
    dead = true;
    deathT = 0;
    deathDir = dir;
    deathCell = [GX + (nx + 0.5) * CELL, GY + (ny + 0.5) * CELL];
    sfx.play('die');
    sfx.play('hit');
    fx.shake(12, 0.4);
    fx.flash('#ff2d55', 0.28);
    api.haptic(90);
    api.gameOver({ delay: 1150, stats: { length: body.length, level, bestCombo: comboMax } });
  }

  function scatter() {
    scattered = true;
    const th = theme();
    const n = body.length;
    for (let i = 0; i < n; i++) {
      const x = cx(body[i]);
      const y = cy(body[i]);
      const a = Math.random() * TAU;
      const sp = 60 + Math.random() * 260 + (n - i) * 0.5;
      debris.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: CELL * (i === 0 ? 0.5 : 0.36), col: th.body[Math.min(NCOL - 1, ((i / Math.max(1, n - 1)) * (NCOL - 1)) | 0)], life: 1.2 + Math.random() * 0.6, age: 0, head: i === 0 });
    }
    fx.burst(cx(body[0]), cy(body[0]), { count: 30, colors: [th.head, '#ffffff', '#ff2d55'], speed: 360, size: 3.5, life: 0.7, gravity: 0, drag: 0.93 });
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const head = body[0];
    const hx = head % COLS;
    const hy = (head / COLS) | 0;
    const nx = hx + DX[dir];
    const ny = hy + DY[dir];
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return die(nx, ny);
    const ni = ny * COLS + nx;
    if (obst[ni] === 2) return die(nx, ny);
    const tail = body[body.length - 1];
    if (occ[ni] && !(ni === tail && grow === 0)) return die(nx, ny);
    if (grow > 0) {
      grow--;
      lastTail = -1;
    } else {
      body.pop();
      occ[tail]--;
      lastTail = tail;
      const p = trail[trailI++ % trail.length];
      p.x = cx(tail);
      p.y = cy(tail);
      p.life = p.max = 0.45;
    }
    body.unshift(ni);
    occ[ni]++;
    ticks++;
    if (ni === orb) eat(false);
    else if (ni === gold) eat(true);
    if (tickLen < 0.1 && ticks % 2 === 0) sfx.tone({ freq: 90, type: 'sine', dur: 0.03, vol: 0.02 });
  }

  function enqueue(d) {
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (d === last || d === OPP[last] || queue.length >= 2) return false;
    queue.push(d);
    sfx.tone({ freq: 660 + d * 40, type: 'triangle', dur: 0.03, vol: 0.04 });
    return true;
  }

  function animate(dt) {
    t += dt;
    for (const p of trail) if (p.life > 0) p.life -= dt;
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.age += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.96;
      d.vy *= 0.96;
      if (d.age >= d.life) debris.splice(i, 1);
    }
    if (orbT < 1) orbT = Math.min(1, orbT + dt * 3);
    if (levelT > 0) levelT = Math.max(0, levelT - dt * 0.6);
    if (scorePop > 0) scorePop = Math.max(0, scorePop - dt * 4);
    blinkT -= dt;
    if (blinkT < -0.12) blinkT = 2.5 + Math.random() * 3;
    tongueT -= dt;
    if (tongueT < -0.25) tongueT = 2 + Math.random() * 3;
    if (dead) {
      deathT += dt;
      if (!scattered && deathT > 0.2) scatter();
    }
    // smooth head angle
    if (body.length > 1) {
      const a = Math.atan2(cy(body[0]) - cy(body[1]), cx(body[0]) - cx(body[1]));
      let d = a - headAng;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      headAng += d * Math.min(1, dt * 18);
    }
  }

  reset();

  api.__state = () => ({
    body: body.slice(),
    head: [body[0] % COLS, (body[0] / COLS) | 0],
    dir,
    orb: orb >= 0 ? [orb % COLS, (orb / COLS) | 0] : null,
    gold: gold >= 0 ? [gold % COLS, (gold / COLS) | 0] : null,
    obst: Array.from(obst.entries())
      .filter(([, v]) => v)
      .map(([i, v]) => `${i % COLS},${(i / COLS) | 0}:${v}`),
    len: body.length,
    eaten,
    level,
    combo,
    tickLen,
    dead,
    cols: COLS,
    rows: ROWS,
  });

  // ---------- rendering ----------
  function buildBg() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    const k = 2;
    c.width = W * k;
    c.height = H * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d0624');
    grad.addColorStop(1, '#05030f');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,5,24,0.9)';
    g.fillRect(GX, GY, GW, GH);
    g.strokeStyle = 'rgba(140,160,255,0.06)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 1; x < COLS; x++) {
      g.moveTo(GX + x * CELL + 0.5, GY);
      g.lineTo(GX + x * CELL + 0.5, GY + GH);
    }
    for (let y = 1; y < ROWS; y++) {
      g.moveTo(GX, GY + y * CELL + 0.5);
      g.lineTo(GX + GW, GY + y * CELL + 0.5);
    }
    g.stroke();
    g.fillStyle = 'rgba(160,180,255,0.12)';
    for (let x = 1; x < COLS; x++) for (let y = 1; y < ROWS; y++) g.fillRect(GX + x * CELL - 0.5, GY + y * CELL - 0.5, 2, 2);
    return c;
  }

  function drawBorder(g, th) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    g.strokeStyle = th.bdFaint;
    g.lineWidth = 14;
    g.strokeRect(GX - 2, GY - 2, GW + 4, GH + 4);
    g.strokeStyle = th.bdGlow;
    g.lineWidth = 6 + pulse * 2;
    g.strokeRect(GX - 2, GY - 2, GW + 4, GH + 4);
    g.strokeStyle = th.bd;
    g.lineWidth = 2;
    g.strokeRect(GX - 2, GY - 2, GW + 4, GH + 4);
  }

  function drawObstacles(g) {
    const blink = warnT > 0 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 22)) : 1;
    for (let i = 0; i < obst.length; i++) {
      const v = obst[i];
      if (!v) continue;
      const x = GX + (i % COLS) * CELL;
      const y = GY + ((i / COLS) | 0) * CELL;
      if (v === 1) {
        g.globalAlpha = blink;
        g.strokeStyle = '#ff4fd8';
        g.lineWidth = 2;
        g.setLineDash([4, 3]);
        g.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
        g.setLineDash([]);
        g.globalAlpha = 1;
      } else {
        g.fillStyle = 'rgba(255,79,216,0.18)';
        g.fillRect(x - 2, y - 2, CELL + 4, CELL + 4);
        g.fillStyle = '#3a1450';
        g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        g.strokeStyle = '#ff4fd8';
        g.lineWidth = 2;
        g.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
        g.fillStyle = 'rgba(255,79,216,0.5)';
        g.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
      }
    }
  }

  function drawOrb(g, th) {
    if (orb < 0) return;
    const x = cx(orb);
    const y = cy(orb);
    const s = ease.outBack(orbT);
    const p = 0.5 + 0.5 * Math.sin(t * 6);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = th.orb;
    g.globalAlpha = 0.12;
    g.beginPath();
    g.arc(x, y, (16 + p * 4) * s, 0, TAU);
    g.fill();
    g.globalAlpha = 0.25;
    g.beginPath();
    g.arc(x, y, 10 * s, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = th.orb;
    g.beginPath();
    g.arc(x, y, 6.5 * s, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x - 1.5, y - 1.5, 2.4 * s, 0, TAU);
    g.fill();
    // orbiting sparkle
    const a = t * 4;
    g.fillStyle = th.orb2;
    g.fillRect(x + Math.cos(a) * 11 - 1, y + Math.sin(a) * 11 - 1, 2.5, 2.5);
  }

  function drawGold(g) {
    if (gold < 0) return;
    const x = cx(gold);
    const y = cy(gold);
    const k = goldT / GOLD_LIFE;
    const urgent = goldT < 2;
    const vis = urgent ? 0.55 + 0.45 * Math.sin(t * 18) : 1;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.18 * vis;
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.arc(x, y, 20, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // countdown ring
    g.strokeStyle = 'rgba(255,210,63,0.25)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, 14, 0, TAU);
    g.stroke();
    g.strokeStyle = urgent ? '#ff6b3d' : '#ffd23f';
    g.beginPath();
    g.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    g.stroke();
    // spinning star
    g.save();
    g.translate(x, y);
    g.rotate(t * 2.5);
    g.globalAlpha = vis;
    g.fillStyle = '#ffd23f';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i & 1 ? 3.4 : 8.5;
      const a = (i / 8) * TAU;
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(0, 0, 2.5, 0, TAU);
    g.fill();
    g.restore();
    g.globalAlpha = 1;
  }

  function buildPath(k) {
    const n = body.length;
    let m = 0;
    if (dead) k = 1;
    const h0 = body[0];
    const h1 = body[1];
    let hxp = cx(h1) + (cx(h0) - cx(h1)) * k;
    let hyp = cy(h1) + (cy(h0) - cy(h1)) * k;
    if (dead && deathT < 0.2) {
      const b = Math.sin((deathT / 0.2) * Math.PI) * CELL * 0.35;
      hxp += DX[deathDir] * b;
      hyp += DY[deathDir] * b;
    }
    pts[m++] = hxp;
    pts[m++] = hyp;
    for (let i = 1; i < n; i++) {
      pts[m++] = cx(body[i]);
      pts[m++] = cy(body[i]);
    }
    if (lastTail >= 0 && !dead) {
      const tl = body[n - 1];
      pts[m++] = cx(lastTail) + (cx(tl) - cx(lastTail)) * k;
      pts[m++] = cy(lastTail) + (cy(tl) - cy(lastTail)) * k;
    }
    return m >> 1;
  }

  function drawSnake(g, th, k) {
    const np = buildPath(k);
    // glow underlay
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = th.glow2;
    g.lineWidth = CELL * 1.9;
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 1; i < np; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
    g.stroke();
    g.strokeStyle = th.glow;
    g.lineWidth = CELL * 1.2;
    g.stroke();
    g.globalCompositeOperation = 'source-over';
    // body core, tail -> head so the head overlaps
    const base = CELL * 0.74;
    const since = ticks + (acc / tickLen);
    for (let i = np - 2; i >= 0; i--) {
      const ci = Math.min(NCOL - 1, ((i / Math.max(1, np - 2)) * (NCOL - 1)) | 0);
      let w = base;
      const fromTail = np - 2 - i;
      if (fromTail < 4) w *= 0.55 + fromTail * 0.11;
      for (let b = 0; b < bulges.length; b++) {
        const d = since - bulges[b] - i;
        if (d > -1.2 && d < 1.2) w += (1 - Math.abs(d) / 1.2) * CELL * 0.32;
      }
      g.strokeStyle = th.body[ci];
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(pts[i * 2 + 2], pts[i * 2 + 3]);
      g.lineTo(pts[i * 2], pts[i * 2 + 1]);
      g.stroke();
    }
    // shine
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 1; i < np - 1; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
    g.stroke();
    g.lineCap = 'butt';
    // head
    const hx = pts[0];
    const hy = pts[1];
    g.save();
    g.translate(hx, hy);
    g.rotate(headAng);
    if (tongueT < 0 && !dead) {
      const f = Math.sin((-tongueT / 0.25) * Math.PI);
      g.strokeStyle = '#ff3d6e';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(CELL * 0.45, 0);
      g.lineTo(CELL * 0.45 + 8 * f, 0);
      g.lineTo(CELL * 0.45 + 11 * f, -3 * f);
      g.moveTo(CELL * 0.45 + 8 * f, 0);
      g.lineTo(CELL * 0.45 + 11 * f, 3 * f);
      g.stroke();
    }
    g.fillStyle = dead && Math.sin(deathT * 40) > 0 ? '#ff2d55' : th.head;
    g.beginPath();
    g.ellipse(0, 0, CELL * 0.56, CELL * 0.5, 0, 0, TAU);
    g.fill();
    // eyes
    let lx = 0;
    let ly = 0;
    const target = gold >= 0 ? gold : orb;
    if (target >= 0 && !dead) {
      const ax = cx(target) - hx;
      const ay = cy(target) - hy;
      const c = Math.cos(-headAng);
      const s = Math.sin(-headAng);
      const rx = ax * c - ay * s;
      const ry = ax * s + ay * c;
      const l = Math.sqrt(rx * rx + ry * ry) || 1;
      lx = (rx / l) * 1.4;
      ly = (ry / l) * 1.4;
    }
    for (let e = -1; e <= 1; e += 2) {
      const ex = 2.5;
      const ey = e * 5;
      if (dead) {
        g.strokeStyle = '#1a0b2e';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(ex - 2.5, ey - 2.5);
        g.lineTo(ex + 2.5, ey + 2.5);
        g.moveTo(ex + 2.5, ey - 2.5);
        g.lineTo(ex - 2.5, ey + 2.5);
        g.stroke();
      } else if (blinkT < 0) {
        g.strokeStyle = '#1a0b2e';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(ex, ey - 3);
        g.lineTo(ex, ey + 3);
        g.stroke();
      } else {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(ex, ey, 3.6, 0, TAU);
        g.fill();
        g.fillStyle = '#1a0b2e';
        g.beginPath();
        g.arc(ex + lx, ey + ly, 2, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  }

  function drawTrail(g, th) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = th.body[NCOL - 1];
    for (const p of trail) {
      if (p.life <= 0) continue;
      const k = p.life / p.max;
      g.globalAlpha = k * 0.5;
      g.beginPath();
      g.arc(p.x, p.y, 2 + k * 4, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawDebris(g) {
    g.globalCompositeOperation = 'lighter';
    for (const d of debris) {
      const k = 1 - d.age / d.life;
      g.globalAlpha = Math.max(0, k);
      g.fillStyle = d.col;
      g.beginPath();
      g.arc(d.x, d.y, d.r * (0.6 + k * 0.4), 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawHud(g, th) {
    const s = 1 + ease.outQuad(scorePop) * 0.22;
    g.save();
    g.translate(W / 2, 58);
    g.scale(s, s);
    draw.text(g, api.score, 0, 0, { size: 54, weight: 800, color: '#ffffff', shadow: th.head });
    g.restore();
    draw.text(g, `LEVEL ${level}  ·  LENGTH ${body.length}`, W / 2, 102, { size: 14, weight: 800, color: th.body[8], shadow: false });
    if (api.best != null) draw.text(g, `BEST ${api.best}`, 16, 26, { size: 14, weight: 800, align: 'left', color: 'rgba(255,255,255,0.55)', shadow: false });
    // combo meter under the grid
    const by = GY + GH + 16;
    if (combo >= 2 && comboTimer > 0 && !dead) {
      const k = Math.max(0, Math.min(1, comboTimer / comboFull));
      draw.text(g, `COMBO ×${combo}`, GX, by, { size: 14, weight: 800, align: 'left', color: '#ffffff', shadow: false });
      draw.roundRect(g, GX + 100, by - 4, GW - 100, 8, 4, 'rgba(255,255,255,0.1)');
      draw.roundRect(g, GX + 100, by - 4, (GW - 100) * k, 8, 4, th.orb);
    }
    if (levelT > 0) {
      const a = Math.min(1, levelT * 2);
      const sc = 1 + (1 - levelT) * 0.2;
      g.save();
      g.translate(W / 2, GY + GH * 0.32);
      g.scale(sc, sc);
      draw.text(g, `LEVEL ${level}`, 0, 0, { size: 46, weight: 800, color: '#ffffff', shadow: th.head, alpha: a });
      if (level >= 2) draw.text(g, 'walls incoming!', 0, 40, { size: 18, weight: 700, color: '#ff9cf8', alpha: a, shadow: false });
      g.restore();
    }
  }

  // ---------- demo autopilot ----------
  // Only runs when the engine calls demo() (attract mode / preview clips). Once per grid step
  // it plans a route to the golden orb (if it can make it in time) or the orb: a time-aware
  // BFS (body cells free up as the tail moves on) that takes the fewest steps and, among
  // those, the fewest turns, so paths look like a player's clean L-shaped swipes. A route is
  // only taken if the tail is still reachable after eating; otherwise the snake heads for the
  // roomiest open space. Its own PRNG keeps api.rng (the seeded run) untouched.
  const NC = COLS * ROWS;
  const pdFree = new Int32Array(NC); // first step at which a cell may be entered
  const pdTurns = new Int32Array(NC * 4);
  const pdStep = new Int32Array(NC * 4);
  const pdPrev = new Int32Array(NC * 4);
  let pdCur = new Int32Array(NC * 4);
  let pdNext = new Int32Array(NC * 4);
  const pdPath = new Int32Array(NC);
  const pdBody = new Int32Array(NC + 8);
  const pdOrder = [0, 1, 2, 3];
  let pRand = mulberry32(0x5a4e);
  const pilot = { tick: -1, bias: 0, target: -2 };

  function pilotReset() {
    pRand = mulberry32(0x5a4e);
    pilot.tick = -1;
    pilot.bias = 0;
    pilot.target = -2;
  }

  // entry times for a body (head first) of length n with g growth still pending
  function markBody(b, n, g) {
    pdFree.fill(0);
    for (let i = 0; i < n; i++) pdFree[b[i]] = g + (n - i);
  }

  // layered BFS over (cell, heading) from head h (current heading d). Returns the step count
  // to goal (fills pdPath[0..k-1] with the cells, first move first), or -1. goal -1 = count
  // reachable cells instead (returned as a negative number - 2).
  function route(h, d, goal) {
    pdStep.fill(-1);
    let nCur = 0;
    let reach = 0;
    for (let k = 1; k <= NC; k++) {
      let nNext = 0;
      const srcN = k === 1 ? 1 : nCur;
      for (let q = 0; q < srcN; q++) {
        const st = k === 1 ? -1 : pdCur[q];
        const c = k === 1 ? h : st >> 2;
        const hd = k === 1 ? d : st & 3;
        const turns = k === 1 ? 0 : pdTurns[st];
        const x = c % COLS;
        const y = (c / COLS) | 0;
        for (let o = 0; o < 4; o++) {
          const nd = pdOrder[o];
          if (nd === OPP[hd]) continue;
          const nx = x + DX[nd];
          const ny = y + DY[nd];
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
          const nc = ny * COLS + nx;
          if (obst[nc] || pdFree[nc] > k) continue;
          const ns = nc * 4 + nd;
          const nt = turns + (nd === hd ? 0 : 1);
          if (pdStep[ns] === -1) {
            pdStep[ns] = k;
            pdTurns[ns] = nt;
            pdPrev[ns] = st;
            pdNext[nNext++] = ns;
            if (goal < 0) reach++;
          } else if (pdStep[ns] === k && nt < pdTurns[ns]) {
            pdTurns[ns] = nt;
            pdPrev[ns] = st;
          }
        }
      }
      if (goal >= 0) {
        let best = -1;
        for (let nd = 0; nd < 4; nd++) {
          const ns = goal * 4 + nd;
          if (pdStep[ns] === k && (best < 0 || pdTurns[ns] < pdTurns[best])) best = ns;
        }
        if (best >= 0) {
          for (let st = best, i = k - 1; st >= 0; st = pdPrev[st], i--) pdPath[i] = st >> 2;
          return k;
        }
      } else if (reach > NC) return -reach - 2;
      if (nNext === 0) break;
      const tmp = pdCur;
      pdCur = pdNext;
      pdNext = tmp;
      nCur = nNext;
    }
    return goal >= 0 ? -1 : -reach - 2;
  }

  // after following pdPath for k steps and eating (growth add), can the head still reach its tail?
  function safeAfter(k, add) {
    const n0 = body.length;
    const n = Math.min(n0 + Math.min(k, grow), NC);
    let m = 0;
    for (let i = k - 1; i >= 0 && m < n; i--) pdBody[m++] = pdPath[i];
    for (let i = 0; m < n && i < n0; i++) pdBody[m++] = body[i];
    const g = Math.max(0, grow - k) + add;
    markBody(pdBody, n, g);
    const tail = pdBody[n - 1];
    const hd = k >= 2 ? dirOf(pdPath[k - 2], pdPath[k - 1]) : dirOf(body[0], pdPath[0]);
    pdFree[tail] = g + 1;
    return route(pdBody[0], hd, tail) > 0;
  }

  function dirOf(a, b) {
    const d = b - a;
    return d === -COLS ? 0 : d === 1 ? 1 : d === COLS ? 2 : 3;
  }

  function pilotMove() {
    const h = body[0];
    const heading = queue.length ? queue[queue.length - 1] : dir;
    // shuffle the tie-break order once per target so equal routes are not always the same shape
    const tgt = gold >= 0 ? gold : orb;
    if (tgt !== pilot.target) {
      pilot.target = tgt;
      pilot.bias = (pRand() * 4) | 0;
      for (let i = 0; i < 4; i++) pdOrder[i] = (pilot.bias + (pRand() < 0.5 ? i : 3 - i)) % 4;
      const seen = [false, false, false, false];
      for (let i = 0; i < 4; i++) {
        while (seen[pdOrder[i]]) pdOrder[i] = (pdOrder[i] + 1) % 4;
        seen[pdOrder[i]] = true;
      }
    }
    const goals = [];
    if (gold >= 0) goals.push(gold);
    if (orb >= 0) goals.push(orb);
    for (const goal of goals) {
      markBody(body, body.length, grow);
      const k = route(h, heading, goal);
      if (k < 0) continue;
      if (goal === gold && k * tickLen > goldT - 0.25) continue;
      if (!safeAfter(k, goal === gold ? 3 : 1)) continue;
      // route() again: safeAfter reused the buffers
      markBody(body, body.length, grow);
      route(h, heading, goal);
      return dirOf(h, pdPath[0]);
    }
    // no safe meal: take the move that keeps the most room
    let bestD = heading;
    let bestA = -1;
    const x = h % COLS;
    const y = (h / COLS) | 0;
    for (let nd = 0; nd < 4; nd++) {
      if (nd === OPP[heading]) continue;
      const nx = x + DX[nd];
      const ny = y + DY[nd];
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const nc = ny * COLS + nx;
      markBody(body, body.length, grow);
      if (obst[nc] || pdFree[nc] > 1) continue;
      pdFree[h] = 99999;
      const area = -route(nc, nd, -1) - 2;
      if (area > bestA) {
        bestA = area;
        bestD = nd;
      }
    }
    return bestD;
  }

  function demo() {
    if (dead || ticks === pilot.tick || queue.length) return;
    pilot.tick = ticks;
    const d = pilotMove();
    if (d !== (queue.length ? queue[queue.length - 1] : dir)) enqueue(d);
  }

  return {
    hud: false,
    forwardStartInput: true,
    reset() {
      reset();
      pilotReset();
    },
    demo,
    update(dt) {
      animate(dt);
      if (dead) return;
      if (warnT > 0) {
        warnT -= dt;
        if (warnT <= 0) solidify();
      }
      if (gold >= 0) {
        goldT -= dt;
        if (goldT <= 0) {
          fx.burst(cx(gold), cy(gold), { count: 12, color: '#ffd23f', speed: 120, size: 2.5, life: 0.4, gravity: 0 });
          sfx.tone({ freq: 500, to: 200, type: 'triangle', dur: 0.2, vol: 0.08 });
          gold = -1;
        }
      }
      if (comboTimer > 0) comboTimer -= dt;
      else if (combo > 0 && comboTimer <= 0) combo = 0;
      acc += dt;
      let guard = 0;
      while (acc >= tickLen && !dead && guard++ < 4) {
        acc -= tickLen;
        step();
      }
    },
    idle(dt) {
      animate(dt);
    },
    input(e) {
      if (dead) return false;
      if (e.type === 'keydown') {
        const k = e.key;
        let d = -1;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') d = 0;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') d = 1;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') d = 2;
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') d = 3;
        if (d < 0) return false;
        if (!e.repeat) enqueue(d);
        return true;
      }
      if (e.type === 'down') {
        startTap = ticks === 0 && acc === 0;
        swipe = { x: e.x, y: e.y, x0: e.x, y0: e.y, moved: false, id: e.id };
        return true;
      }
      if (e.type === 'move' && e.pressed && swipe) {
        const dx = e.x - swipe.x;
        const dy = e.y - swipe.y;
        if (Math.abs(dx) > 18 || Math.abs(dy) > 18) {
          const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
          enqueue(d);
          swipe.x = e.x;
          swipe.y = e.y;
          swipe.moved = true;
        }
        return true;
      }
      if (e.type === 'up' && swipe) {
        const s = swipe;
        swipe = null;
        if (s.moved) return true;
        const far = Math.abs(e.x - s.x0) + Math.abs(e.y - s.y0);
        if (far < 14 && !startTap) {
          // tap-to-turn relative to the head (handy with a mouse)
          const hx = cx(body[0]);
          const hy = cy(body[0]);
          const last = queue.length ? queue[queue.length - 1] : dir;
          if (last === 1 || last === 3) enqueue(e.y < hy ? 0 : 2);
          else enqueue(e.x < hx ? 3 : 1);
        }
        startTap = false;
        return true;
      }
      return false;
    },
    revive() {
      // shrink to START_LEN and place the snake where it has the longest clear run ahead
      let best = -1;
      let bestD = 0;
      let bestScore = -1;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          for (let d = 0; d < 4; d++) {
            let ok = true;
            for (let i = 0; i < START_LEN && ok; i++) {
              const bx = x - DX[d] * i;
              const by = y - DY[d] * i;
              if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS || obst[by * COLS + bx]) ok = false;
            }
            if (!ok) continue;
            let run = 0;
            let ax = x + DX[d];
            let ay = y + DY[d];
            while (run < 14 && ax >= 0 && ax < COLS && ay >= 0 && ay < ROWS && !obst[ay * COLS + ax]) {
              run++;
              ax += DX[d];
              ay += DY[d];
            }
            // prefer the lower half (clear of the TAP TO PLAY prompt) and away from walls
            const centre = Math.min(x, COLS - 1 - x, y, ROWS - 1 - y);
            let low = true;
            for (let i = 0; i < START_LEN; i++) if (y - DY[d] * i < 12) low = false;
            const score = run * 10 + Math.min(centre, 6) + (low ? 8 : 0);
            if (score > bestScore) {
              bestScore = score;
              best = y * COLS + x;
              bestD = d;
            }
          }
        }
      }
      placeSnake(best >= 0 ? best : 20 * COLS + 10, bestD, START_LEN);
      dead = false;
      deathT = 0;
      scattered = false;
      debris.length = 0;
      combo = 0;
      comboTimer = 0;
      for (let i = 0; i < obst.length; i++) if (obst[i] === 1) obst[i] = 0;
      warnT = 0;
      if (orb < 0 || occ[orb]) spawnOrb();
      if (gold >= 0 && occ[gold]) gold = -1;
      const th = theme();
      for (let i = 0; i < body.length; i++) fx.burst(cx(body[i]), cy(body[i]), { count: 5, colors: [th.head, '#ffffff'], speed: 120, size: 3, life: 0.4, gravity: 0 });
      fx.ring(cx(body[0]), cy(body[0]), { color: th.head, radius: 70, life: 0.6, width: 4 });
      sfx.play('levelup');
    },
    render(g) {
      const th = theme();
      if (!bgCanvas) bgCanvas = buildBg();
      if (bgCanvas) g.drawImage(bgCanvas, 0, 0, W, H);
      else {
        g.fillStyle = '#0a0520';
        g.fillRect(0, 0, W, H);
      }
      drawBorder(g, th);
      drawObstacles(g);
      drawTrail(g, th);
      drawOrb(g, th);
      drawGold(g);
      if (!scattered) drawSnake(g, th, Math.min(1, acc / tickLen));
      if (api.state === 'ready' && !dead) {
        // show where the snake is heading before the run (re)starts
        const hx = pts[0];
        const hy = pts[1];
        const p = 0.5 + 0.5 * Math.sin(t * 6);
        g.strokeStyle = th.head;
        g.globalAlpha = 0.35 + p * 0.4;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(hx, hy, 16 + p * 6, 0, TAU);
        g.stroke();
        g.fillStyle = th.head;
        for (let i = 1; i <= 3; i++) {
          const ax = hx + DX[dir] * (CELL * (0.6 + i * 0.7) + p * 4);
          const ay = hy + DY[dir] * (CELL * (0.6 + i * 0.7) + p * 4);
          g.globalAlpha = (0.9 - i * 0.22) * (0.6 + p * 0.4);
          g.save();
          g.translate(ax, ay);
          g.rotate(Math.atan2(DY[dir], DX[dir]));
          g.beginPath();
          g.moveTo(5, 0);
          g.lineTo(-3, -6);
          g.lineTo(-3, 6);
          g.closePath();
          g.fill();
          g.restore();
        }
        g.globalAlpha = 1;
      }
      drawDebris(g);
      if (dead && deathCell) {
        const a = Math.max(0, 1 - deathT * 1.2);
        g.globalAlpha = a;
        g.strokeStyle = '#ff2d55';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(deathCell[0], deathCell[1], 8 + deathT * 30, 0, TAU);
        g.stroke();
        g.globalAlpha = 1;
      }
      drawHud(g, th);
    },
  };
}

/** Cover art: a glowing neon snake curling toward an orb on a dark grid (text-free). */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#120832');
  grad.addColorStop(1, '#04020c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = h / 600;
  const cell = 40 * s;
  // grid
  g.strokeStyle = 'rgba(140,160,255,0.09)';
  g.lineWidth = 1.5 * s;
  g.beginPath();
  for (let x = (w / 2) % cell; x < w; x += cell) {
    g.moveTo(x, 0);
    g.lineTo(x, h);
  }
  for (let y = (h / 2) % cell; y < h; y += cell) {
    g.moveTo(0, y);
    g.lineTo(w, y);
  }
  g.stroke();
  // vignette glow
  const rg = g.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  rg.addColorStop(0, 'rgba(80,40,200,0.25)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  // snake path (cell coords relative to centre)
  const path = [
    [-9, 4],
    [-7, 4],
    [-5, 4],
    [-5, 2],
    [-5, 0],
    [-3, 0],
    [-1, 0],
    [-1, -2],
    [-1, -3],
    [1, -3],
    [3, -3],
    [3, -1],
    [3, 1],
    [4.5, 1],
  ];
  const ox = w / 2 - 0.5 * cell;
  const oy = h / 2 + 0.2 * cell;
  const P = path.map(([x, y]) => [ox + x * cell, oy + y * cell]);
  const th = THEMES[0];
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const [lw, col] of [
    [cell * 2.4, 'rgba(57,255,158,0.06)'],
    [cell * 1.6, 'rgba(57,255,158,0.12)'],
    [cell * 1.1, 'rgba(0,190,255,0.18)'],
  ]) {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.beginPath();
    P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  g.restore();
  for (let i = 0; i < P.length - 1; i++) {
    const k = 1 - i / (P.length - 2);
    g.strokeStyle = th.body[Math.round(k * (NCOL - 1))];
    g.lineWidth = cell * (i < 2 ? 0.45 + i * 0.12 : 0.74);
    g.beginPath();
    g.moveTo(P[i][0], P[i][1]);
    g.lineTo(P[i + 1][0], P[i + 1][1]);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 4 * s;
  g.beginPath();
  P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  // head
  const [hx, hy] = P[P.length - 1];
  g.fillStyle = th.head;
  g.beginPath();
  g.ellipse(hx, hy, cell * 0.58, cell * 0.52, 0, 0, TAU);
  g.fill();
  for (const e of [-1, 1]) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(hx + cell * 0.14, hy + e * cell * 0.24, cell * 0.17, 0, TAU);
    g.fill();
    g.fillStyle = '#1a0b2e';
    g.beginPath();
    g.arc(hx + cell * 0.2, hy + e * cell * 0.24, cell * 0.09, 0, TAU);
    g.fill();
  }
  g.strokeStyle = '#ff3d6e';
  g.lineWidth = 3 * s;
  g.beginPath();
  g.moveTo(hx + cell * 0.55, hy);
  g.lineTo(hx + cell * 0.9, hy);
  g.lineTo(hx + cell * 1.05, hy - cell * 0.12);
  g.moveTo(hx + cell * 0.9, hy);
  g.lineTo(hx + cell * 1.05, hy + cell * 0.12);
  g.stroke();
  // orb ahead
  const ox2 = hx + cell * 2.2;
  const oy2 = hy;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const [r, a] of [
    [cell * 1.1, 0.1],
    [cell * 0.7, 0.2],
    [cell * 0.45, 0.35],
  ]) {
    g.fillStyle = `rgba(255,61,242,${a})`;
    g.beginPath();
    g.arc(ox2, oy2, r, 0, TAU);
    g.fill();
  }
  g.restore();
  g.fillStyle = '#ff3df2';
  g.beginPath();
  g.arc(ox2, oy2, cell * 0.28, 0, TAU);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(ox2 - cell * 0.08, oy2 - cell * 0.08, cell * 0.1, 0, TAU);
  g.fill();
  // golden orb with countdown ring
  const gx = ox - 6 * cell;
  const gy = oy - 4 * cell;
  g.strokeStyle = 'rgba(255,210,63,0.3)';
  g.lineWidth = 5 * s;
  g.beginPath();
  g.arc(gx, gy, cell * 0.6, 0, TAU);
  g.stroke();
  g.strokeStyle = '#ffd23f';
  g.beginPath();
  g.arc(gx, gy, cell * 0.6, -Math.PI / 2, Math.PI * 0.9);
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = (i & 1 ? 0.15 : 0.38) * cell;
    const a = (i / 8) * TAU + 0.3;
    if (i === 0) g.moveTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r);
    else g.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  // sparkles
  const cols = ['#ff3df2', '#39ff9e', '#22d3ee', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996;
    const d = (0.6 + ((i * 53) % 100) / 100) * cell * 1.8;
    g.fillStyle = cols[i % cols.length];
    g.globalAlpha = 0.5 + (i % 5) * 0.1;
    g.beginPath();
    g.arc(ox2 + Math.cos(a) * d, oy2 + Math.sin(a) * d, (1.5 + (i % 3)) * s, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  // obstacles
  for (const [x, y] of [
    [5, -4],
    [6, -4],
    [-8, -1],
    [-8, 0],
  ]) {
    const bx = ox + x * cell - cell / 2;
    const by = oy + y * cell - cell / 2;
    g.fillStyle = 'rgba(255,79,216,0.15)';
    g.fillRect(bx - 4 * s, by - 4 * s, cell + 8 * s, cell + 8 * s);
    g.fillStyle = '#3a1450';
    g.fillRect(bx + 2 * s, by + 2 * s, cell - 4 * s, cell - 4 * s);
    g.strokeStyle = '#ff4fd8';
    g.lineWidth = 3 * s;
    g.strokeRect(bx + 4 * s, by + 4 * s, cell - 8 * s, cell - 8 * s);
  }
}
