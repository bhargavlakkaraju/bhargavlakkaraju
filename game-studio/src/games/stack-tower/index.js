// Stack Tower - one-tap block stacking. Reference implementation of the game contract.
import { mulberry32 } from '../engine/rng.js';

const BH = 30; // block height
const DEPTH = 16; // fake-3D depth of the top/side faces
const START_W = 230;
const PERFECT_TOL = 5;

function blockColors(hue) {
  return {
    front: `hsl(${hue % 360}, 72%, 58%)`,
    top: `hsl(${hue % 360}, 80%, 71%)`,
    side: `hsl(${hue % 360}, 62%, 42%)`,
  };
}

// Branded edition (api.brand): blocks cycle through the brand colors and carry its logo.
function hexRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const v = h.length === 3 ? h.replace(/./g, '$&$&') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(v, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// k > 0 mixes toward white, k < 0 toward black.
function shade(hex, k) {
  const t = k > 0 ? 255 : 0;
  const a = Math.abs(k);
  const [r, g, b] = hexRgb(hex).map((c) => Math.round(c + (t - c) * a));
  return `rgb(${r},${g},${b})`;
}
function luma(hex) {
  const [r, g, b] = hexRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
// Very dark brand colors are lifted a little so blocks stay visible on the dark sky.
function brandColors(hex) {
  const lift = luma(hex) < 0.22 ? 0.3 : 0;
  return { front: shade(hex, lift), top: shade(hex, lift + 0.32 * (1 - lift)), side: shade(hex, lift ? -0.1 : -0.3) };
}

function drawBlock(g, x, y, w, c, alpha = 1, mark = null) {
  const d = DEPTH;
  const dy = d * 0.6;
  g.globalAlpha = alpha;
  // top face
  g.fillStyle = c.top;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w + d, y - dy);
  g.lineTo(x + d, y - dy);
  g.closePath();
  g.fill();
  // right side face
  g.fillStyle = c.side;
  g.beginPath();
  g.moveTo(x + w, y);
  g.lineTo(x + w + d, y - dy);
  g.lineTo(x + w + d, y - dy + BH);
  g.lineTo(x + w, y + BH);
  g.closePath();
  g.fill();
  // front face
  g.fillStyle = c.front;
  g.fillRect(x, y, w, BH);
  // subtle highlight line
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(x, y, w, 3);
  if (mark) drawMark(g, x, y, w, mark);
  g.globalAlpha = 1;
}

// The brand logo (or name) printed on a block's front face, clipped to the block.
function drawMark(g, x, y, w, mark) {
  const pad = 5;
  g.save();
  g.beginPath();
  g.rect(x, y, w, BH);
  g.clip();
  const img = mark.logo;
  if (img && img.naturalWidth) {
    const lh = BH - pad * 2;
    const lw = Math.min(lh * (img.naturalWidth / img.naturalHeight), 140);
    const lhh = lw / (img.naturalWidth / img.naturalHeight);
    if (w > lw + pad * 2) g.drawImage(img, x + (w - lw) / 2, y + (BH - lhh) / 2, lw, lhh);
  } else if (mark.name) {
    g.font = mark.font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = mark.ink;
    if (w > g.measureText(mark.name).width + pad * 2) g.fillText(mark.name, x + w / 2, y + BH / 2 + 1);
  }
  g.restore();
}

function drawSky(g, W, H, level, t, brand = null) {
  const h1 = 250 + level * 2.2;
  const grad = g.createLinearGradient(0, 0, 0, H);
  if (brand) {
    const dim = Math.min(0.2, level * 0.004);
    grad.addColorStop(0, shade(brand.colors[0], -0.78 - dim));
    grad.addColorStop(1, shade(brand.colors[1] || brand.colors[0], -0.55 - dim));
  } else {
    grad.addColorStop(0, `hsl(${h1 % 360}, 55%, ${Math.max(8, 22 - level * 0.12)}%)`);
    grad.addColorStop(1, `hsl(${(h1 + 40) % 360}, 60%, ${Math.max(14, 34 - level * 0.12)}%)`);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // stars fade in as you climb
  const starA = Math.min(1, level / 40);
  if (starA > 0) {
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97.3) % W;
      const sy = (i * 53.7 + level * 3) % H;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      g.globalAlpha = starA * tw * 0.8;
      g.fillStyle = '#fff';
      g.fillRect(sx, sy, 2, 2);
    }
    g.globalAlpha = 1;
  }
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const baseY = H - 150; // screen y of the base block top at camera 0
  const brand = api.brand && api.brand.colors && api.brand.colors.length ? api.brand : null;
  // In a branded edition "hue" is the floor index, mapped onto the brand colors.
  const colorsFor = (hue) => (brand ? brandColors(brand.colors[((hue % brand.colors.length) + brand.colors.length) % brand.colors.length]) : blockColors(hue));
  const markFor = (hue) => {
    if (!brand) return null;
    const hex = brand.colors[((hue % brand.colors.length) + brand.colors.length) % brand.colors.length];
    return { logo: brand.logo || null, name: brand.name || '', font: api.font(15, 800), ink: luma(hex) > 0.62 ? 'rgba(20,12,40,0.78)' : 'rgba(255,255,255,0.92)' };
  };
  const block = (g, x, y, w, hue, alpha = 1) => drawBlock(g, x, y, w, colorsFor(hue), alpha, markFor(hue));

  let blocks; // {x, w, hue}
  let moving; // {x, w, dir, speed, hue}
  let falling; // {x, y, w, vy, vx, rot, vr, hue}
  let cam; // current camera offset (pixels scrolled up)
  let hue0;
  let combo;
  let t;
  let pulses; // perfect-drop outline pulses

  // ---------- demo autopilot (only runs when the engine calls demo()) ----------
  // Its own tiny PRNG so the seeded game randomness (api.rng) is never touched.
  const PILOT_SEED = 0x57ac4;
  let prand = mulberry32(PILOT_SEED);
  let pilotAim = null; // wanted offset (moving.x - top.x) for the current block
  let pilotFor = null; // the moving block the aim was chosen for
  let pilotWait = 0; // reaction time left before the pilot may tap
  let pilotStreak = 0; // perfect drops left before the next deliberate trim

  function pilotReset() {
    prand = mulberry32(PILOT_SEED);
    pilotAim = null;
    pilotFor = null;
    pilotWait = 0;
    pilotStreak = 0;
  }

  // Trim a little off now and then (it sets up the "block grows back" perfect streaks),
  // otherwise go for a perfect drop with a hair of human wobble.
  function pilotPlan() {
    const floors = blocks.length - 1;
    const top = blocks[blocks.length - 1];
    let trim = false;
    if (floors === 0 || floors === 2) trim = true;
    else if (floors > 2 && pilotStreak <= 0 && top.w > 170) trim = true;
    if (trim) {
      pilotStreak = 5 + Math.floor(prand() * 4);
      const cut = 14 + prand() * 10;
      pilotAim = (prand() < 0.5 ? -1 : 1) * cut;
    } else {
      pilotStreak -= 1;
      pilotAim = (prand() - 0.5) * 2;
    }
    pilotFor = moving;
    pilotWait = 0.3 + prand() * 0.15;
  }

  function demo(dt) {
    if (!moving || !(dt > 0)) return;
    if (pilotFor !== moving) pilotPlan();
    if (pilotWait > 0) {
      pilotWait -= dt;
      return;
    }
    const top = blocks[blocks.length - 1];
    const target = top.x + pilotAim;
    const step = moving.dir * moving.speed * dt;
    const here = Math.abs(moving.x - target);
    // tap on the frame that lands closest to the aim point (the block is heading for it)
    if ((target - moving.x) * moving.dir >= 0 ? here <= Math.abs(moving.x + step - target) : here < Math.abs(step) * 0.5) drop();
  }

  function levelY(i) {
    return baseY - i * BH + cam;
  }

  function spawn() {
    const top = blocks[blocks.length - 1];
    const level = blocks.length;
    const fromLeft = api.rng() < 0.5;
    const speed = Math.min(560, 210 + level * 6.5) * api.rng.range(0.92, 1.08);
    moving = {
      w: top.w,
      x: fromLeft ? -top.w * 0.6 : W - top.w * 0.4,
      dir: fromLeft ? 1 : -1,
      speed,
      hue: brand ? level : hue0 + level * 9,
    };
  }

  function reset() {
    hue0 = api.rng.int(0, 360);
    blocks = [{ x: (W - START_W) / 2 - DEPTH / 2, w: START_W, hue: brand ? 0 : hue0 }];
    falling = [];
    pulses = [];
    cam = 0;
    combo = 0;
    t = 0;
    spawn();
    pilotReset();
  }

  function moveBlock(dt) {
    moving.x += moving.dir * moving.speed * dt;
    const minX = -moving.w * 0.6;
    const maxX = W - moving.w * 0.4;
    if (moving.x < minX) {
      moving.x = minX;
      moving.dir = 1;
    } else if (moving.x > maxX) {
      moving.x = maxX;
      moving.dir = -1;
    }
  }

  function drop() {
    const top = blocks[blocks.length - 1];
    const level = blocks.length;
    const y = levelY(level);
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.w, top.x + top.w);
    const overlap = right - left;

    if (overlap <= 0) {
      // Missed completely: the block tumbles away.
      falling.push({ x: moving.x, y, w: moving.w, vy: 0, vx: moving.dir * 120, rot: 0, vr: moving.dir * 2.5, hue: moving.hue });
      moving = null;
      api.sfx.play('die');
      api.fx.shake(14, 0.4);
      api.fx.flash('#ff3d7f', 0.35);
      api.haptic(80);
      api.gameOver({ delay: 900, stats: { floors: blocks.length - 1 } });
      return;
    }

    const diff = moving.x - top.x;
    let placed;
    if (Math.abs(diff) <= PERFECT_TOL) {
      combo += 1;
      let w = top.w;
      let x = top.x;
      if (combo >= 3 && w < START_W) {
        const grow = Math.min(12, START_W - w);
        w += grow;
        x -= grow / 2;
      }
      placed = { x, w, hue: moving.hue };
      pulses.push({ x, w, level, age: 0 });
      api.sfx.combo(combo);
      api.fx.text(x + w / 2, y - 30, combo >= 2 ? `PERFECT ×${combo}` : 'PERFECT!', { color: '#ffd23f', size: 30 });
      api.fx.burst(x + w / 2, y, { count: 18 + combo * 4, colors: ['#fff', '#ffd23f', colorsFor(moving.hue).top], speed: 260, spread: Math.PI, angle: -Math.PI / 2, size: 4, gravity: 600 });
      api.haptic(20);
    } else {
      combo = 0;
      placed = { x: left, w: overlap, hue: moving.hue };
      const cutW = moving.w - overlap;
      const cutX = diff > 0 ? right : moving.x;
      falling.push({ x: cutX, y, w: cutW, vy: -60, vx: diff > 0 ? 90 : -90, rot: 0, vr: diff > 0 ? 3 : -3, hue: moving.hue });
      api.sfx.play('place');
      api.fx.shake(4, 0.12);
      api.fx.burst(diff > 0 ? right : left, y + BH / 2, { count: 10, color: colorsFor(moving.hue).front, speed: 180, size: 3.5 });
      if (overlap < 14) api.fx.text(placed.x + placed.w / 2, y - 26, 'PHEW!', { color: '#22d3ee', size: 24 });
      api.haptic(10);
    }
    blocks.push(placed);
    api.addScore(1);
    const floors = blocks.length - 1;
    if (floors % 10 === 0) {
      api.fx.confetti(W / 2, H * 0.3, 70);
      api.fx.text(W / 2, H * 0.36, `${floors} FLOORS!`, { size: 40, color: '#ffffff', life: 1.3 });
      api.sfx.play('levelup');
      api.emit('milestone', { floors });
    }
    spawn();
  }

  function stepWorld(dt) {
    t += dt;
    // camera keeps the top of the tower around 45% of the screen height
    const want = Math.max(0, (blocks.length - 1) * BH - (baseY - H * 0.45));
    cam += (want - cam) * Math.min(1, dt * 6);
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i];
      f.vy += 1500 * dt;
      f.y += f.vy * dt;
      f.x += f.vx * dt;
      f.rot += f.vr * dt;
      if (f.y > H + 200) falling.splice(i, 1);
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].age += dt;
      if (pulses[i].age > 0.5) pulses.splice(i, 1);
    }
  }

  reset();

  return {
    reset,
    demo,
    update(dt) {
      stepWorld(dt);
      if (moving) moveBlock(dt);
    },
    idle(dt) {
      stepWorld(dt);
      if (moving && api.state === 'ready') moveBlock(dt * 0.6);
    },
    input(e) {
      if (!moving) return false;
      if (e.type === 'down' || (e.type === 'keydown' && !e.repeat && api.isTapKey(e.key))) {
        drop();
        return true;
      }
      return false;
    },
    revive() {
      falling = [];
      combo = 0;
      spawn();
    },
    render(g) {
      const level = blocks.length;
      drawSky(g, W, H, level, t, brand);
      // ground pedestal
      const gy = levelY(0) + BH;
      if (gy < H) {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, gy, W, H - gy);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(0, gy, W, 4);
      }
      // tower (only visible blocks)
      for (let i = 0; i < blocks.length; i++) {
        const y = levelY(i);
        if (y > H + BH || y < -BH * 2) continue;
        const b = blocks[i];
        block(g, b.x, y, b.w, b.hue);
      }
      // perfect pulses
      for (const p of pulses) {
        const k = p.age / 0.5;
        const pad = 4 + k * 18;
        g.strokeStyle = `rgba(255,255,255,${1 - k})`;
        g.lineWidth = 3;
        g.strokeRect(p.x - pad, levelY(p.level) - pad, p.w + pad * 2, BH + pad * 2);
      }
      // moving block (+ faint drop guide)
      if (moving) {
        const y = levelY(blocks.length);
        g.fillStyle = 'rgba(255,255,255,0.05)';
        g.fillRect(moving.x, y + BH, moving.w, 4);
        block(g, moving.x, y, moving.w, moving.hue);
      }
      // falling pieces
      for (const f of falling) {
        g.save();
        g.translate(f.x + f.w / 2, f.y + BH / 2);
        g.rotate(f.rot);
        block(g, -f.w / 2, -BH / 2, f.w, f.hue);
        g.restore();
      }
    },
  };
}

/** Cover art for thumbnails & social cards. */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2a1459');
  grad.addColorStop(1, '#7a1f5c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 50; i++) {
    g.globalAlpha = 0.5 + ((i * 37) % 50) / 100;
    g.fillStyle = '#fff';
    g.fillRect((i * 131) % w, (i * 71) % (h * 0.6), 2, 2);
  }
  g.globalAlpha = 1;
  const s = h / 600;
  const bh = BH * s * 1.4;
  const widths = [300, 280, 270, 270, 250, 236, 236, 220, 200];
  const offs = [0, 8, -6, -6, 10, 4, 4, -10, 6];
  const baseY = h * 0.86;
  g.save();
  g.scale(1, 1);
  for (let i = 0; i < widths.length; i++) {
    const bw = widths[i] * s * 1.2;
    const x = w / 2 - bw / 2 + offs[i] * s * 2;
    const y = baseY - i * bh;
    g.save();
    g.translate(x, y);
    g.scale(s * 1.4, s * 1.4);
    drawBlock(g, 0, 0, bw / (s * 1.4), blockColors(320 + i * 12));
    g.restore();
  }
  // moving block
  const mw = 200 * s * 1.2;
  g.save();
  g.translate(w * 0.62, baseY - widths.length * bh - bh * 1.2);
  g.scale(s * 1.4, s * 1.4);
  drawBlock(g, 0, 0, mw / (s * 1.4), blockColors(320 + widths.length * 12));
  g.restore();
  g.restore();
  // motion lines
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 4 * s;
  for (let i = 0; i < 3; i++) {
    const y = baseY - widths.length * bh - bh * 1.2 + i * 12 * s + 8 * s;
    g.beginPath();
    g.moveTo(w * 0.62 - 20 * s - i * 14 * s, y);
    g.lineTo(w * 0.62 - 70 * s - i * 14 * s, y);
    g.stroke();
  }
}
