// Juicy Drop - fruit-merge physics puzzle.
// Drop fruit into the jar; two identical fruits that touch merge into the next bigger one.
// Physics: position-based Verlet circles, fixed 480 Hz substeps, 2 solver iterations,
// wall/floor friction, soft growth on merge and sleeping bodies so big piles stay calm.

const W = 420;
const H = 740;
const TAU = Math.PI * 2;
const JL = 26; // jar interior left
const JR = 394; // jar interior right
const JB = 688; // jar floor
const JT = 198; // jar rim (top of the walls)
const DY = 216; // danger line
const HOLD_Y = 148;

const G = 1700;
const H_STEP = 1 / 480;
const ITER = 2;
const DAMP = 0.9993;
const REST = 0.14;
const MAXC = 5;
const FLOOR_F = 0.03;
const WALL_F = 0.02;
const PAIR_F = 0.012;
const SLEEP_SPEED = 7;
const SLEEP_TIME = 0.4;
const WAKE_STEP = 0.1;
const WAKE_PEN = 1.5;
const DANGER_TIME = 2;
const SEP_MAX = 0.3; // max separating speed from overlap correction (px/step = 144 px/s)
const VMAX_X = 800 * H_STEP;
const VMAX_DOWN = 1500 * H_STEP;
const VMAX_UP = 520 * H_STEP;
const SS = 2.5; // sprite supersampling

export const FRUITS = [
  { name: 'Cherry', r: 15, color: '#e8203a', light: '#ff8a96', dark: '#9e0f26', line: '#7a0b1c', juice: '#ff3355' },
  { name: 'Strawberry', r: 20, color: '#ff3b55', light: '#ff9aa6', dark: '#b3172f', line: '#8a1024', juice: '#ff5470' },
  { name: 'Grape', r: 26, color: '#8b52ff', light: '#c9a8ff', dark: '#5226b8', line: '#3e1a8f', juice: '#b184ff' },
  { name: 'Orange', r: 32, color: '#ff9b1f', light: '#ffd08a', dark: '#d9690a', line: '#a84f05', juice: '#ffb347' },
  { name: 'Persimmon', r: 39, color: '#ff6b1f', light: '#ffb07a', dark: '#c8430b', line: '#9a3208', juice: '#ff8a3d' },
  { name: 'Apple', r: 47, color: '#f2303c', light: '#ff8f95', dark: '#b3141f', line: '#850d16', juice: '#ff6b6b' },
  { name: 'Pear', r: 56, color: '#cfe047', light: '#f3f8b0', dark: '#9db325', line: '#71831a', juice: '#eef58a' },
  { name: 'Peach', r: 65, color: '#ffaa94', light: '#ffe0d4', dark: '#f0756a', line: '#c4544c', juice: '#ffc2b3' },
  { name: 'Pineapple', r: 75, color: '#ffc933', light: '#fff0a6', dark: '#e0930f', line: '#a86a08', juice: '#ffe066' },
  { name: 'Melon', r: 86, color: '#a6e05a', light: '#e2f7bd', dark: '#6fb02c', line: '#4d8219', juice: '#d4f59a' },
  { name: 'Watermelon', r: 98, color: '#2fae4f', light: '#8fe3a2', dark: '#16762f', line: '#0d5520', juice: '#ff5c7a' },
];
const MAX_TIER = FRUITS.length - 1;
const SPAWN_W = [0.3, 0.26, 0.2, 0.14, 0.1];

function padFor(tier, r) {
  return (tier === 0 ? 0.85 : tier === 8 ? 0.62 : 0.4) * r + 4;
}

// deterministic pseudo random for art details
function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function leaf(g, x, y, len, wid, ang, color, vein) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -wid, len, 0);
  g.quadraticCurveTo(len * 0.5, wid, 0, 0);
  g.fill();
  if (vein) {
    g.strokeStyle = vein;
    g.lineWidth = Math.max(0.8, wid * 0.14);
    g.beginPath();
    g.moveTo(len * 0.1, 0);
    g.lineTo(len * 0.85, 0);
    g.stroke();
  }
  g.restore();
}

function stem(g, x0, y0, x1, y1, bend, w, color) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
  g.stroke();
  g.lineCap = 'butt';
}

function texture(g, tier, r) {
  if (tier === 1) {
    // strawberry seeds
    g.fillStyle = '#ffe98a';
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        const x = j * r * 0.34 + (i & 1 ? r * 0.17 : 0);
        const y = i * r * 0.3 + r * 0.05;
        if (x * x + y * y > r * r * 0.72) continue;
        g.beginPath();
        g.ellipse(x, y, r * 0.045, r * 0.075, 0, 0, TAU);
        g.fill();
      }
    }
  } else if (tier === 2) {
    const rg = g.createRadialGradient(r * 0.2, r * 0.3, 0, r * 0.2, r * 0.3, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.18)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(-r, -r, r * 2, r * 2);
  } else if (tier === 3 || tier === 6) {
    g.fillStyle = tier === 3 ? 'rgba(170,70,0,0.22)' : 'rgba(110,90,20,0.3)';
    const n = tier === 3 ? 40 : 18;
    for (let i = 0; i < n; i++) {
      const a = hash(i + tier * 50) * TAU;
      const d = Math.sqrt(hash(i * 3 + 7 + tier)) * r * 0.9;
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, r * (tier === 3 ? 0.028 : 0.035), 0, TAU);
      g.fill();
    }
  } else if (tier === 4) {
    g.strokeStyle = 'rgba(150,40,0,0.18)';
    g.lineWidth = r * 0.05;
    for (let k = -1; k <= 1; k += 2) {
      g.beginPath();
      g.ellipse(0, 0, r * 0.45, r * 0.98, 0, k < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, k < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
      g.stroke();
    }
  } else if (tier === 7) {
    const rg = g.createRadialGradient(r * 0.45, r * 0.25, 0, r * 0.45, r * 0.25, r * 0.9);
    rg.addColorStop(0, 'rgba(255,70,90,0.45)');
    rg.addColorStop(1, 'rgba(255,70,90,0)');
    g.fillStyle = rg;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.strokeStyle = 'rgba(200,70,70,0.35)';
    g.lineWidth = r * 0.04;
    g.beginPath();
    g.moveTo(-r * 0.05, -r * 0.98);
    g.quadraticCurveTo(r * 0.28, -r * 0.55, r * 0.06, -r * 0.1);
    g.stroke();
  } else if (tier === 8) {
    // pineapple diamonds
    g.strokeStyle = 'rgba(170,95,0,0.45)';
    g.lineWidth = r * 0.035;
    const s = r * 0.36;
    for (let k = -4; k <= 4; k++) {
      g.beginPath();
      g.moveTo(-r + k * s, -r);
      g.lineTo(r + k * s, r);
      g.moveTo(r - k * s, -r);
      g.lineTo(-r - k * s, r);
      g.stroke();
    }
    g.fillStyle = 'rgba(150,80,0,0.4)';
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        const x = (i + j) * s * 0.5;
        const y = (j - i) * s * 0.5 + s * 0.5;
        if (x * x + y * y > r * r) continue;
        g.beginPath();
        g.arc(x, y, r * 0.03, 0, TAU);
        g.fill();
      }
    }
  } else if (tier === 9) {
    // melon net
    g.strokeStyle = 'rgba(250,255,235,0.55)';
    g.lineWidth = r * 0.025;
    for (let k = -4; k <= 4; k++) {
      g.beginPath();
      for (let y = -r; y <= r; y += r * 0.1) {
        const x = k * r * 0.24 + Math.sin(y * 0.08 + k) * r * 0.05;
        if (y === -r) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.beginPath();
      for (let x = -r; x <= r; x += r * 0.1) {
        const y = k * r * 0.24 + Math.cos(x * 0.09 + k * 2) * r * 0.05;
        if (x === -r) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (tier === 10) {
    // watermelon stripes
    g.strokeStyle = '#146b2b';
    g.lineWidth = r * 0.13;
    g.lineJoin = 'round';
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const y = -r + (i / 12) * 2 * r;
        const bow = Math.sqrt(Math.max(0, 1 - (y / r) * (y / r)));
        const x = k * r * 0.3 * bow + (i & 1 ? r * 0.06 : -r * 0.06);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    // keep the face readable: soften the stripes behind it
    const fg = g.createRadialGradient(0, r * 0.18, 0, 0, r * 0.18, r * 0.62);
    fg.addColorStop(0, 'rgba(58,184,88,0.95)');
    fg.addColorStop(0.6, 'rgba(52,176,82,0.75)');
    fg.addColorStop(1, 'rgba(47,174,79,0)');
    g.fillStyle = fg;
    g.fillRect(-r, -r, r * 2, r * 2);
  }
}

/** Vector fruit centred on 0,0. face: 0 normal, 1 happy/closed eyes, 2 surprised. */
export function drawFruit(g, tier, r, face = 0) {
  const F = FRUITS[tier];
  g.save();
  // behind-body decorations
  if (tier === 8) {
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.28;
      const len = r * (0.72 - Math.abs(i) * 0.08);
      g.fillStyle = i & 1 ? '#3fa34d' : '#58c45e';
      g.beginPath();
      const bx = Math.cos(a) * r * 0.62;
      const by = Math.sin(a) * r * 0.62;
      const tx = Math.cos(a) * (r * 0.62 + len);
      const ty = Math.sin(a) * (r * 0.62 + len);
      const px = Math.cos(a + Math.PI / 2) * r * 0.12;
      const py = Math.sin(a + Math.PI / 2) * r * 0.12;
      g.moveTo(bx - px, by - py);
      g.quadraticCurveTo((bx + tx) / 2 - px * 0.3, (by + ty) / 2 - py * 0.3, tx, ty);
      g.quadraticCurveTo((bx + tx) / 2 + px * 0.3, (by + ty) / 2 + py * 0.3, bx + px, by + py);
      g.fill();
    }
  }
  if (tier === 0) {
    stem(g, 0, -r * 0.82, r * 0.42, -r * 1.62, -r * 0.35, Math.max(1.6, r * 0.13), '#6b3e1f');
    leaf(g, r * 0.4, -r * 1.55, r * 0.75, r * 0.3, -0.25, '#4cbb4f', '#2e8a35');
  }
  // body
  const grd = g.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.05, 0, 0, r * 1.02);
  grd.addColorStop(0, F.light);
  grd.addColorStop(0.5, F.color);
  grd.addColorStop(1, F.dark);
  g.fillStyle = grd;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.clip();
  texture(g, tier, r);
  // soft bottom shade
  const sh = g.createLinearGradient(0, r * 0.2, 0, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.14)');
  g.fillStyle = sh;
  g.fillRect(-r, 0, r * 2, r);
  g.restore();
  g.strokeStyle = F.line;
  g.lineWidth = Math.max(1.3, r * 0.05);
  g.beginPath();
  g.arc(0, 0, r - g.lineWidth * 0.4, 0, TAU);
  g.stroke();

  // top decorations
  const top = -r * 0.9;
  if (tier === 1) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      leaf(g, 0, top + r * 0.06, r * 0.5, r * 0.16, a + Math.PI, '#39a845', null);
    }
    g.fillStyle = '#2f8f3a';
    g.beginPath();
    g.arc(0, top, r * 0.12, 0, TAU);
    g.fill();
    stem(g, 0, top, r * 0.05, top - r * 0.25, 0, Math.max(1.2, r * 0.09), '#2f8f3a');
  } else if (tier === 2) {
    stem(g, 0, top, r * 0.08, top - r * 0.32, r * 0.08, Math.max(1.4, r * 0.1), '#7a5230');
    g.strokeStyle = '#5cb85c';
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath();
    g.arc(r * 0.24, top - r * 0.2, r * 0.12, Math.PI, TAU * 0.9);
    g.stroke();
  } else if (tier === 3) {
    g.fillStyle = '#3d7a2a';
    g.beginPath();
    g.arc(0, top + r * 0.04, r * 0.09, 0, TAU);
    g.fill();
    leaf(g, r * 0.04, top + r * 0.02, r * 0.55, r * 0.2, -0.45, '#4cbb4f', '#2e8a35');
  } else if (tier === 4) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      g.save();
      g.translate(0, top + r * 0.1);
      g.scale(1, 0.55);
      g.rotate(a);
      g.fillStyle = i & 1 ? '#3f8f38' : '#4fa844';
      g.beginPath();
      g.ellipse(r * 0.2, 0, r * 0.24, r * 0.14, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    g.fillStyle = '#6b4a22';
    g.beginPath();
    g.arc(0, top + r * 0.02, r * 0.07, 0, TAU);
    g.fill();
  } else if (tier === 5 || tier === 6) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.beginPath();
    g.ellipse(0, top + r * 0.1, r * 0.16, r * 0.06, 0, 0, TAU);
    g.fill();
    stem(g, 0, top + r * 0.1, r * 0.06, top - r * 0.22, r * 0.1, Math.max(1.8, r * 0.07), '#6b4222');
    leaf(g, r * 0.05, top - r * 0.12, r * 0.42, r * 0.15, -0.5, '#58b947', '#377f2c');
  } else if (tier === 7) {
    leaf(g, 0, top + r * 0.02, r * 0.4, r * 0.14, -0.7, '#58b947', '#377f2c');
    leaf(g, 0, top + r * 0.02, r * 0.34, r * 0.12, -2.4, '#4aa63c', '#377f2c');
  } else if (tier === 9) {
    stem(g, 0, top + r * 0.02, 0, top - r * 0.12, 0, Math.max(2, r * 0.06), '#5b8a2a');
    stem(g, -r * 0.08, top - r * 0.12, r * 0.08, top - r * 0.12, 0, Math.max(2, r * 0.05), '#5b8a2a');
  } else if (tier === 10) {
    g.strokeStyle = '#3d6b1f';
    g.lineWidth = Math.max(2, r * 0.045);
    g.beginPath();
    g.moveTo(0, top + r * 0.02);
    g.bezierCurveTo(r * 0.05, top - r * 0.12, r * 0.18, top - r * 0.06, r * 0.14, top - r * 0.16);
    g.stroke();
  }

  // face
  const ex = r * 0.3;
  const ey = r * 0.08;
  const es = Math.max(1.5, r * 0.1);
  const ink = '#2a1320';
  if (face === 1) {
    g.strokeStyle = ink;
    g.lineWidth = Math.max(1.2, es * 0.42);
    g.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      g.beginPath();
      g.arc(s * ex, ey + es * 0.45, es * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
  } else {
    const big = face === 2 ? 1.28 : 1;
    for (let s = -1; s <= 1; s += 2) {
      g.fillStyle = ink;
      g.beginPath();
      g.ellipse(s * ex, ey, es * 0.82 * big, es * big, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(s * ex - es * 0.28, ey - es * 0.38, es * 0.36 * big, 0, TAU);
      g.fill();
    }
  }
  // blush
  g.fillStyle = tier >= 9 || tier === 6 ? 'rgba(255,110,150,0.75)' : 'rgba(255,90,130,0.45)';
  for (let s = -1; s <= 1; s += 2) {
    g.beginPath();
    g.ellipse(s * r * 0.52, ey + r * 0.2, r * 0.12, r * 0.07, 0, 0, TAU);
    g.fill();
  }
  // mouth
  if (face === 2) {
    g.fillStyle = '#5a1020';
    g.beginPath();
    g.ellipse(0, ey + r * 0.27, r * 0.07, r * 0.09, 0, 0, TAU);
    g.fill();
  } else {
    g.strokeStyle = ink;
    g.lineWidth = Math.max(1.1, r * 0.045);
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, ey + r * 0.14, r * 0.11, Math.PI * 0.18, Math.PI * 0.82);
    g.stroke();
    g.lineCap = 'butt';
  }
  // gloss
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(-r * 0.45, -r * 0.4, r * 0.2, r * 0.11, -0.75, 0, TAU);
  g.fill();
  g.beginPath();
  g.arc(-r * 0.2, -r * 0.64, r * 0.05, 0, TAU);
  g.fill();
  g.restore();
}

function roll(rng) {
  let x = rng();
  for (let i = 0; i < SPAWN_W.length; i++) {
    x -= SPAWN_W[i];
    if (x < 0) return i;
  }
  return 0;
}

export default function createGame(api) {
  const { fx, sfx, draw, ease } = api;
  const rng = api.rng;

  // ---------- sprites ----------
  const sprites = [];
  const canSprite = typeof document !== 'undefined';
  for (let t = 0; t <= MAX_TIER; t++) {
    const r = FRUITS[t].r;
    const half = r + padFor(t, r);
    const row = [];
    for (let f = 0; f < 3; f++) {
      if (!canSprite) {
        row.push(null);
        continue;
      }
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(half * 2 * SS);
      const cg = c.getContext('2d');
      cg.scale(SS, SS);
      cg.translate(half, half);
      drawFruit(cg, t, r, f);
      row.push(c);
    }
    sprites.push({ half, img: row });
  }

  let bodies = [];
  const merges = [];
  let held;
  let nextTier;
  let targetX;
  let heldX;
  let cooldown;
  let acc;
  let t;
  let dangerT;
  let dead;
  let chain;
  let chainT;
  let maxTier;
  let dropped;
  let keyL;
  let keyR;
  let pointerActive;
  let lastThud;
  let heldPop;
  let nextPop;
  let bestPop;
  let dangerFlash;
  let comboN = 0;
  let comboT = 0;
  let comboPop = 0;
  let bgGrad = null;
  let jarGrad = null;
  let mergeOn = true; // only switched off by automated physics stress tests

  function makeBody(tier, x, y) {
    const r = FRUITS[tier].r;
    return {
      tier,
      x,
      y,
      px: x,
      py: y,
      sx: x,
      sy: y,
      r,
      tr: r,
      gr: 0,
      inv: 1 / (r * r),
      asleep: false,
      sleepT: 0,
      age: 0,
      rot: 0,
      sq: 0,
      sqv: 0,
      vyPrev: 0,
      pop: 0,
      blink: 1 + Math.random() * 4,
      happy: 0,
      danger: false,
      dead: false,
    };
  }

  function reset() {
    bodies = [];
    merges.length = 0;
    held = { tier: roll(rng) };
    nextTier = roll(rng);
    targetX = W / 2;
    heldX = W / 2;
    cooldown = 0;
    acc = 0;
    t = 0;
    dangerT = 0;
    dead = false;
    chain = 0;
    chainT = 0;
    maxTier = 0;
    dropped = 0;
    keyL = keyR = false;
    pointerActive = false;
    lastThud = -1;
    heldPop = 1;
    nextPop = 1;
    bestPop = 0;
    dangerFlash = 0;
    comboN = 0;
    comboT = 0;
    comboPop = 0;
  }

  function wake(b) {
    if (b.asleep) {
      b.asleep = false;
      b.sleepT = 0;
      b.px = b.x;
      b.py = b.y;
    }
  }
  function wakeAll() {
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].asleep = false;
      bodies[i].sleepT = 0;
    }
  }

  function queueMerge(a, b) {
    if (a.dead || b.dead) return;
    a.dead = true;
    b.dead = true;
    merges.push(a, b);
  }

  // ---------- physics ----------
  function step(h) {
    const g2 = G * h * h;
    const n = bodies.length;
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      if (b.dead) continue;
      if (b.r < b.tr) {
        b.r = Math.min(b.tr, b.r + b.gr * h);
        b.inv = 1 / (b.r * b.r);
      }
      if (b.asleep) continue;
      let vx = (b.x - b.px) * DAMP;
      let vy = (b.y - b.py) * DAMP;
      // safety net: speed limits (px per step)
      if (vx > VMAX_X) vx = VMAX_X;
      else if (vx < -VMAX_X) vx = -VMAX_X;
      if (vy > VMAX_DOWN) vy = VMAX_DOWN;
      else if (vy < -VMAX_UP) vy = -VMAX_UP;
      b.px = b.x;
      b.py = b.y;
      b.x += vx;
      b.y += vy + g2;
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < n; i++) {
        const a = bodies[i];
        if (a.dead) continue;
        for (let j = i + 1; j < n; j++) {
          const b = bodies[j];
          if (b.dead) continue;
          const rs = a.r + b.r;
          const dx = b.x - a.x;
          if (dx > rs + 2 || dx < -rs - 2) continue;
          const dy = b.y - a.y;
          if (dy > rs + 2 || dy < -rs - 2) continue;
          const d2 = dx * dx + dy * dy;
          if (a.tier === b.tier && mergeOn && !dead && d2 < (rs + 1.5) * (rs + 1.5)) {
            queueMerge(a, b);
            break;
          }
          if (d2 >= rs * rs || (a.asleep && b.asleep)) continue;
          const d = Math.sqrt(d2) || 0.0001;
          const nx = dx / d;
          const ny = dy / d;
          const pen = rs - d;
          let wa = a.inv;
          let wb = b.inv;
          if (a.asleep) {
            const sp = Math.abs(b.x - b.px) + Math.abs(b.y - b.py);
            if (sp > WAKE_STEP || pen > WAKE_PEN) wake(a);
            else wa = 0;
          } else if (b.asleep) {
            const sp = Math.abs(a.x - a.px) + Math.abs(a.y - a.py);
            if (sp > WAKE_STEP || pen > WAKE_PEN) wake(b);
            else wb = 0;
          }
          const ws = wa + wb;
          if (ws <= 0) continue;
          let c = pen * 0.8;
          if (c > MAXC) c = MAXC;
          const ka = (c * wa) / ws;
          const kb = (c * wb) / ws;
          a.x -= nx * ka;
          a.y -= ny * ka;
          b.x += nx * kb;
          b.y += ny * kb;
          // Verlet turns position corrections into velocity. Cap the separating speed a
          // correction may create so deep overlaps (fresh merges) resolve gently instead
          // of launching small fruit out of the jar.
          const rvx = b.x - b.px - (a.x - a.px);
          const rvy = b.y - b.py - (a.y - a.py);
          const vn = rvx * nx + rvy * ny;
          if (vn > SEP_MAX) {
            const ex = vn - SEP_MAX;
            if (wa > 0) {
              a.px -= nx * ex * (wa / ws);
              a.py -= ny * ex * (wa / ws);
            }
            if (wb > 0) {
              b.px += nx * ex * (wb / ws);
              b.py += ny * ex * (wb / ws);
            }
          }
          // contact friction: damp relative tangential motion a little
          if (it === 0) {
            const vt = rvx * -ny + rvy * nx;
            const f = vt * PAIR_F;
            if (wa > 0) {
              a.px -= -ny * f * (wa / ws);
              a.py -= nx * f * (wa / ws);
            }
            if (wb > 0) {
              b.px += -ny * f * (wb / ws);
              b.py += nx * f * (wb / ws);
            }
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (b.dead || b.asleep) continue;
        if (b.x < JL + b.r) {
          b.x = JL + b.r;
          b.py += (b.y - b.py) * WALL_F;
        } else if (b.x > JR - b.r) {
          b.x = JR - b.r;
          b.py += (b.y - b.py) * WALL_F;
        }
        if (b.y > JB - b.r) {
          const vy = b.y - b.py;
          b.y = JB - b.r;
          b.py = vy > 1.1 ? b.y + vy * REST : b.y;
          b.px += (b.x - b.px) * FLOOR_F;
        }
      }
    }
    if (merges.length) processMerges();
  }

  function processMerges() {
    for (let m = 0; m < merges.length; m += 2) {
      const a = merges[m];
      const b = merges[m + 1];
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const tier = a.tier;
      doMerge(tier, x, y, a, b);
    }
    merges.length = 0;
    let k = 0;
    for (let i = 0; i < bodies.length; i++) if (!bodies[i].dead) bodies[k++] = bodies[i];
    bodies.length = k;
    wakeAll();
  }

  function doMerge(tier, x, y, a, b) {
    const F = FRUITS[tier];
    chain = chainT > 0 ? chain + 1 : 1;
    chainT = 0.9;
    let pts;
    if (tier === MAX_TIER) {
      pts = 100;
      fx.burst(x, y, { count: 90, colors: [F.juice, '#ffffff', F.color, '#ffe066'], speed: 520, size: 8, life: 1.1, gravity: 600 });
      fx.confetti(x, y, 90);
      fx.ring(x, y, { color: '#ffffff', radius: 220, life: 0.7, width: 10 });
      fx.shake(16, 0.5);
      fx.flash('#ffffff', 0.5);
      fx.text(x, y - 40, 'JACKPOT!', { color: '#fff4b0', size: 44, life: 1.6, stroke: 'rgba(120,20,40,0.6)' });
      sfx.play('win');
      api.happy();
    } else {
      const nt = tier + 1;
      const N = FRUITS[nt];
      const nb = makeBody(nt, x, y);
      nb.r = Math.max(a.r, b.r);
      nb.inv = 1 / (nb.r * nb.r);
      nb.gr = (N.r - nb.r) / 0.14;
      nb.px = x - ((a.x - a.px + b.x - b.px) / 2) * 0.5;
      nb.py = y - ((a.y - a.py + b.y - b.py) / 2) * 0.5;
      nb.pop = 1;
      nb.happy = 0.8;
      bodies.push(nb);
      pts = ((nt * (nt + 1)) / 2) | 0;
      const cnt = 14 + nt * 3;
      fx.burst(x, y, { count: cnt, colors: [N.juice, F.juice, '#ffffff'], speed: 190 + nt * 26, size: 4 + nt * 0.55, life: 0.65, gravity: 750 });
      fx.burst(x, y, { count: 6 + nt, color: '#ffffff', shape: 'spark', speed: 300 + nt * 20, size: 3, life: 0.3, gravity: 0 });
      fx.ring(x, y, { color: N.juice, radius: N.r * 1.5, life: 0.4, width: 4 + nt * 0.4 });
      if (nt >= 6) fx.shake(2 + nt * 0.9, 0.18 + nt * 0.02);
      if (nt > maxTier) {
        if (nt >= 4) {
          fx.text(W / 2, 326, `NEW: ${N.name.toUpperCase()}!`, { color: '#fff4b0', size: 30, life: 1.3, stroke: 'rgba(120,40,20,0.55)' });
          sfx.play('levelup');
          bestPop = 1;
        }
        maxTier = nt;
        if (nt === MAX_TIER) {
          fx.confetti(W / 2, 260, 80);
          sfx.play('win');
          api.happy();
        }
      }
      // juicy pop: bigger fruit = lower pitch
      const f0 = 820 / (1 + nt * 0.13);
      sfx.tone({ freq: f0, to: f0 * 1.9, type: 'sine', dur: 0.11, vol: 0.22 });
      sfx.tone({ freq: f0 * 1.5, to: f0 * 2.6, type: 'triangle', dur: 0.08, vol: 0.08, delay: 0.035 });
      sfx.noise({ dur: 0.12 + nt * 0.015, vol: 0.12 + nt * 0.01, freq: 2800, to: 500, type: 'lowpass' });
      api.haptic(8 + nt * 2);
    }
    let bonus = 0;
    if (chain >= 2) {
      bonus = chain * 2;
      sfx.combo(Math.min(chain, 16), 523);
      comboN = chain;
      comboT = 1.2;
      comboPop = 1;
    }
    fx.text(x, y - 6, `+${pts + bonus}`, { color: '#ffffff', size: 24 + Math.min(tier, 8) * 2, life: 0.8, rise: 60, stroke: 'rgba(110,30,15,0.85)' });
    api.addScore(pts + bonus);
  }

  function physics(dt) {
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      b.sx = b.x;
      b.sy = b.y;
    }
    acc += dt;
    let steps = 0;
    while (acc >= H_STEP && steps < 30) {
      step(H_STEP);
      acc -= H_STEP;
      steps++;
    }
    if (steps >= 30) acc = 0;
    // per-frame bookkeeping: sleep, rolling, squash, impacts
    const idt = dt > 0 ? 1 / dt : 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      b.age += dt;
      const mx = b.x - b.sx;
      const my = b.y - b.sy;
      const sp = (Math.abs(mx) + Math.abs(my)) * idt;
      if (!b.asleep) {
        if (sp < SLEEP_SPEED && b.r >= b.tr && b.age > 0.35) {
          b.sleepT += dt;
          if (b.sleepT > SLEEP_TIME) {
            b.asleep = true;
            b.px = b.x;
            b.py = b.y;
          }
        } else b.sleepT = 0;
      }
      b.rot += (mx / b.r) * 0.9;
      const vy = my * idt;
      if (b.vyPrev > 240 && vy < b.vyPrev * 0.35) {
        const imp = b.vyPrev;
        b.sqv += Math.min(10, imp * 0.012);
        if (t - lastThud > 0.07 && imp > 320) {
          lastThud = t;
          const f = 190 - b.tier * 9;
          sfx.tone({ freq: f, to: f * 0.55, type: 'sine', dur: 0.09, vol: Math.min(0.2, imp / 4000) });
          if (imp > 600) fx.burst(b.x, b.y + b.r * 0.8, { count: 5, color: 'rgba(255,255,255,0.8)', speed: 90, size: 3, life: 0.35, gravity: 200, spread: Math.PI, angle: -Math.PI / 2 });
        }
      }
      b.vyPrev = vy;
      // squash spring
      b.sqv += (-420 * b.sq - 16 * b.sqv) * dt;
      b.sq += b.sqv * dt;
      if (b.sq > 0.16) b.sq = 0.16;
      else if (b.sq < -0.18) b.sq = -0.18;
      if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 3.2);
      if (b.happy > 0) b.happy -= dt;
      b.blink -= dt;
      if (b.blink < -0.13) b.blink = 1.5 + Math.random() * 4.5;
    }
  }

  function checkDanger(dt) {
    let any = false;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      b.danger = b.age > 1.0 && b.y - b.r < DY;
      if (b.danger) any = true;
    }
    if (any) {
      if (dangerT === 0) sfx.play('error');
      dangerT += dt;
      if (dangerT >= DANGER_TIME && !dead) die();
    } else dangerT = Math.max(0, dangerT - dt * 1.5);
  }

  function die() {
    dead = true;
    held = null;
    sfx.play('die');
    fx.shake(12, 0.45);
    fx.flash('#ff2d55', 0.3);
    api.haptic(90);
    api.gameOver({ delay: 1200, stats: { biggest: FRUITS[maxTier].name, dropped } });
  }

  function drop() {
    if (!held || dead || cooldown > 0) return;
    const r = FRUITS[held.tier].r;
    const x = Math.max(JL + r, Math.min(JR - r, targetX));
    heldX = x;
    const b = makeBody(held.tier, x, HOLD_Y);
    b.py = HOLD_Y - 1.2;
    bodies.push(b);
    held = null;
    cooldown = 0.42;
    dropped++;
    sfx.tone({ freq: 620, to: 380, type: 'sine', dur: 0.08, vol: 0.12 });
    api.haptic(6);
  }

  function tick(dt, playing) {
    t += dt;
    physics(dt);
    if (playing) checkDanger(dt);
    if (chainT > 0) chainT -= dt;
    if (cooldown > 0) cooldown -= dt;
    if (playing && !held && !dead && cooldown <= 0) {
      held = { tier: nextTier };
      nextTier = roll(rng);
      heldPop = 0;
      nextPop = 0;
    }
    if (keyL || keyR) targetX += (keyR ? 1 : -1) * 380 * dt;
    const hr = held ? FRUITS[held.tier].r : 20;
    targetX = Math.max(JL + hr, Math.min(JR - hr, targetX));
    heldX += (targetX - heldX) * Math.min(1, dt * 22);
    if (heldPop < 1) heldPop = Math.min(1, heldPop + dt * 4);
    if (nextPop < 1) nextPop = Math.min(1, nextPop + dt * 4);
    if (bestPop > 0) bestPop = Math.max(0, bestPop - dt * 1.5);
    if (comboT > 0) comboT -= dt;
    if (comboPop > 0) comboPop = Math.max(0, comboPop - dt * 4);
    dangerFlash = dangerT > 0 ? dangerFlash + dt * (4 + dangerT * 6) : 0;
  }

  reset();

  // read-only test hook (physics stress tests)
  api.__state = () => {
    let maxPen = 0;
    let moving = 0;
    let asleep = 0;
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (a.asleep) asleep++;
      moving += Math.abs(a.x - a.px) + Math.abs(a.y - a.py);
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const p = a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y);
        if (p > maxPen) maxPen = p;
      }
    }
    return {
      count: bodies.length,
      asleep,
      moving,
      maxPen,
      held: held ? held.tier : -1,
      next: nextTier,
      dropped,
      maxTier,
      dangerT,
      dead,
      tiers: bodies.map((b) => b.tier),
      tops: bodies.map((b) => Math.round(b.y - b.r)),
      dangerous: bodies.filter((b) => b.danger).map((b) => `${b.tier}@${Math.round(b.x)},${Math.round(b.y - b.r)} age${b.age.toFixed(1)}`),
      escaped: bodies.filter((b) => b.x < JL + b.r - 1 || b.x > JR - b.r + 1 || b.y > JB - b.r + 1).length,
    };
  };

  // ---------- rendering ----------
  function drawSprite(g, tier, x, y, scale, rot, sq, face) {
    const sp = sprites[tier];
    g.save();
    g.translate(x, y);
    if (sq !== 0) g.scale(1 + sq, 1 - sq);
    if (rot !== 0) g.rotate(rot);
    if (sp.img[face]) {
      const hw = sp.half * scale;
      g.drawImage(sp.img[face], -hw, -hw, hw * 2, hw * 2);
    } else {
      g.scale(scale, scale);
      drawFruit(g, tier, FRUITS[tier].r, face);
    }
    g.restore();
  }

  function drawBackground(g) {
    if (!bgGrad) {
      bgGrad = g.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#ffd89b');
      bgGrad.addColorStop(0.5, '#ffb78c');
      bgGrad.addColorStop(1, '#ff9478');
      jarGrad = g.createLinearGradient(JL, 0, JR, 0);
      jarGrad.addColorStop(0, 'rgba(255,255,255,0.34)');
      jarGrad.addColorStop(0.2, 'rgba(255,255,255,0.16)');
      jarGrad.addColorStop(0.8, 'rgba(255,255,255,0.12)');
      jarGrad.addColorStop(1, 'rgba(255,255,255,0.3)');
    }
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, W, H);
    // slow sun rays behind the jar
    g.save();
    g.translate(W / 2, 120);
    g.rotate(t * 0.05);
    g.fillStyle = 'rgba(255,255,255,0.09)';
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.moveTo(0, 0);
      g.arc(0, 0, 820, a, a + 0.13);
      g.closePath();
    }
    g.fill();
    g.restore();
    // polka dots
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    for (let i = 0; i < 30; i++) {
      const x = (i * 83.7) % W;
      const y = (i * 151.3 + 40) % H;
      g.moveTo(x + 5, y);
      g.arc(x, y, 5, 0, TAU);
    }
    g.fill();
    // jar interior
    g.fillStyle = 'rgba(122,52,38,0.16)';
    g.beginPath();
    g.moveTo(JL, JT);
    g.lineTo(JL, JB - 18);
    g.quadraticCurveTo(JL, JB, JL + 18, JB);
    g.lineTo(JR - 18, JB);
    g.quadraticCurveTo(JR, JB, JR, JB - 18);
    g.lineTo(JR, JT);
    g.closePath();
    g.fill();
    g.fillStyle = jarGrad;
    g.fill();
  }

  function drawJarFront(g) {
    // glass walls
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 7;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(JL - 3.5, JT - 6);
    g.lineTo(JL - 3.5, JB - 16);
    g.quadraticCurveTo(JL - 3.5, JB + 3.5, JL + 16, JB + 3.5);
    g.lineTo(JR - 16, JB + 3.5);
    g.quadraticCurveTo(JR + 3.5, JB + 3.5, JR + 3.5, JB - 16);
    g.lineTo(JR + 3.5, JT - 6);
    g.stroke();
    // rim lips
    draw.roundRect(g, JL - 12, JT - 12, 20, 10, 5, '#ffffff');
    draw.roundRect(g, JR - 8, JT - 12, 20, 10, 5, '#ffffff');
    // glass shine
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(JL + 6, JT + 20, 9, JB - JT - 70);
    g.fillRect(JL + 20, JT + 40, 4, JB - JT - 140);
    // shadow under jar
    g.fillStyle = 'rgba(120,40,30,0.18)';
    g.beginPath();
    g.ellipse(W / 2, JB + 12, 200, 7, 0, 0, TAU);
    g.fill();
  }

  function drawDangerLine(g) {
    const warn = dangerT > 0;
    const k = Math.min(1, dangerT / DANGER_TIME);
    g.lineWidth = 3;
    g.setLineDash([10, 9]);
    g.lineDashOffset = -t * 18;
    g.strokeStyle = warn ? (Math.sin(dangerFlash) > 0 ? '#ff2d55' : '#ffffff') : 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.moveTo(JL, DY);
    g.lineTo(JR, DY);
    g.stroke();
    g.setLineDash([]);
    if (warn) {
      // countdown bar closing in from both ends
      const half = ((JR - JL) / 2) * k;
      g.fillStyle = '#ff2d55';
      g.fillRect(JL, DY - 3, half, 6);
      g.fillRect(JR - half, DY - 3, half, 6);
      const a = 0.18 + 0.12 * Math.sin(dangerFlash);
      g.fillStyle = `rgba(255,45,85,${a.toFixed(3)})`;
      g.fillRect(0, 0, 10, H);
      g.fillRect(W - 10, 0, 10, H);
    }
  }

  function drawGuide(g) {
    if (!held || dead) return;
    const r = FRUITS[held.tier].r;
    const x = heldX;
    // predicted landing height
    let land = JB - r;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const rs = r + b.r;
      const dx = Math.abs(b.x - x);
      if (dx >= rs) continue;
      const y = b.y - Math.sqrt(rs * rs - dx * dx);
      if (y < land) land = y;
    }
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 2.5;
    g.setLineDash([2, 9]);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, HOLD_Y + r + 6);
    g.lineTo(x, Math.max(HOLD_Y + r + 6, land + r));
    g.stroke();
    g.setLineDash([]);
    g.lineCap = 'butt';
    if (land > HOLD_Y + r * 2) {
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, land, r, 0, TAU);
      g.stroke();
    }
  }

  function drawHud(g) {
    const sc = api.score;
    draw.text(g, sc, W / 2, 56, { size: 50, weight: 800, color: '#ffffff', stroke: '#b4472c', strokeWidth: 8, shadow: 'rgba(120,40,20,0.35)' });
    if (api.best != null) draw.text(g, `BEST ${api.best}`, W / 2, 96, { size: 15, weight: 800, color: '#8a3a22', shadow: false });
    // next bubble
    const nx = 50;
    const ny = 64;
    draw.circle(g, nx, ny, 32, 'rgba(255,255,255,0.45)', '#ffffff', 3);
    draw.text(g, 'NEXT', nx, 22, { size: 13, weight: 800, color: '#8a3a22', shadow: false });
    const nr = FRUITS[nextTier].r;
    const s = (Math.min(22, nr) / nr) * ease.outBack(nextPop);
    drawSprite(g, nextTier, nx, ny + 2, s, 0, 0, 0);
    // evolution chain
    const y = 716;
    const step = (JR - JL) / MAX_TIER;
    for (let i = 0; i <= MAX_TIER; i++) {
      const x = JL + i * step;
      const got = i <= maxTier;
      const rr = 10.5 + (i === maxTier ? bestPop * 5 : 0);
      g.globalAlpha = got ? 1 : 0.35;
      drawSprite(g, i, x, y, rr / FRUITS[i].r, 0, 0, got ? 0 : 1);
    }
    g.globalAlpha = 1;
  }

  return {
    hud: false,
    reset,
    update(dt) {
      tick(dt, true);
    },
    idle(dt) {
      tick(dt, false);
    },
    input(e) {
      if (e.type === 'move') {
        targetX = e.x;
        return true;
      }
      if (e.type === 'down') {
        targetX = e.x;
        pointerActive = true;
        return true;
      }
      if (e.type === 'up') {
        if (pointerActive) {
          targetX = e.x;
          drop();
        }
        pointerActive = false;
        return true;
      }
      if (e.type === 'keydown') {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
          keyL = true;
          return true;
        }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') {
          keyR = true;
          return true;
        }
        if (k === ' ' || k === 'Enter' || k === 'ArrowDown' || k === 's' || k === 'S' || k === 'ArrowUp' || k === 'w' || k === 'W') {
          if (!e.repeat) drop();
          return true;
        }
        return false;
      }
      if (e.type === 'keyup') {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyL = false;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') keyR = false;
      }
      return false;
    },
    revive() {
      // pop the highest fruit(s) so nothing is left near the line
      const order = bodies.slice().sort((a, b) => a.y - a.r - (b.y - b.r));
      let removed = 0;
      for (let i = 0; i < order.length; i++) {
        const b = order[i];
        if (removed >= 3 && b.y - b.r > DY + 40) break;
        b.dead = true;
        removed++;
        const F = FRUITS[b.tier];
        fx.burst(b.x, b.y, { count: 14 + b.tier * 2, colors: [F.juice, F.color, '#ffffff'], speed: 240, size: 5, life: 0.7, gravity: 600 });
        fx.ring(b.x, b.y, { color: '#ffffff', radius: b.r * 1.4, life: 0.4, width: 4 });
      }
      bodies = bodies.filter((b) => !b.dead);
      wakeAll();
      dangerT = 0;
      dead = false;
      cooldown = 0.25;
      chain = 0;
      fx.flash('#ffffff', 0.3);
      sfx.play('pop');
      sfx.play('levelup');
    },
    render(g) {
      drawBackground(g);
      drawDangerLine(g);
      drawGuide(g);
      // fruit
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const s = (b.r / FRUITS[b.tier].r) * (1 + Math.sin(b.pop * Math.PI) * 0.12);
        const face = b.danger || dead ? 2 : b.happy > 0 || b.blink < 0 ? 1 : 0;
        drawSprite(g, b.tier, b.x, b.y, s, b.rot, b.sq, face);
        if (b.danger) {
          g.strokeStyle = Math.sin(dangerFlash) > 0 ? 'rgba(255,45,85,0.9)' : 'rgba(255,255,255,0.6)';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(b.x, b.y, b.r + 3, 0, TAU);
          g.stroke();
        }
      }
      drawJarFront(g);
      // held fruit
      if (held && !dead) {
        const r = FRUITS[held.tier].r;
        const bob = Math.sin(t * 3) * 2;
        drawSprite(g, held.tier, heldX, HOLD_Y + bob, ease.outBack(heldPop), Math.sin(t * 2) * 0.08, 0, 0);
      }
      drawHud(g);
      if (comboT > 0 && comboN >= 2) {
        const a = Math.min(1, comboT * 3);
        const sc = 1 + ease.outBack(comboPop) * 0.25;
        g.save();
        g.translate(W / 2, 246);
        g.scale(sc, sc);
        draw.text(g, `COMBO ×${comboN}`, 0, 0, { size: 28 + Math.min(comboN, 6) * 2, weight: 800, color: '#fff4b0', stroke: 'rgba(130,40,20,0.9)', strokeWidth: 7, alpha: a, shadow: false });
        g.restore();
      }
    },
  };
}

/** Settle a list of circles into a pile (deterministic relaxation), used by the cover art. */
function settle(list, left, right, floor) {
  for (let it = 0; it < 900; it++) {
    for (const a of list) a.y += 3;
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const rs = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs) continue;
          const d = Math.sqrt(d2) || 0.01;
          const p = (rs - d) / 2;
          a.x -= (dx / d) * p;
          a.y -= (dy / d) * p;
          b.x += (dx / d) * p;
          b.y += (dy / d) * p;
        }
      }
      for (const a of list) {
        if (a.x < left + a.r) a.x = left + a.r;
        if (a.x > right - a.r) a.x = right - a.r;
        if (a.y > floor - a.r) a.y = floor - a.r;
      }
    }
  }
}

/** Cover art: a glass jar brimming with smiling fruit and a juicy splash (text-free). */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ffe0a3');
  grad.addColorStop(0.55, '#ffb088');
  grad.addColorStop(1, '#ff8672');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = h / 600;
  const cx = w / 2;
  // sun rays
  g.save();
  g.translate(cx, h * 0.3);
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.moveTo(0, 0);
    g.arc(0, 0, Math.max(w, h) * 1.2, a, a + 0.13);
    g.closePath();
  }
  g.fill();
  g.restore();
  // polka dots
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    g.arc((i * 137.3) % w, (i * 71.9 + 13) % h, 6 * s, 0, TAU);
    g.fill();
  }
  // jar
  const k = s * 1.0;
  const jw = 420 * s;
  const jl = cx - jw / 2;
  const jr = cx + jw / 2;
  const jb = h - 22 * s;
  const jt = 205 * s;
  g.fillStyle = 'rgba(122,52,38,0.14)';
  g.fillRect(jl, jt, jw, jb - jt);
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.fillRect(jl, jt, jw, jb - jt);
  const tiers = [10, 8, 7, 5, 6, 3, 2, 3, 1, 2, 0, 1, 4];
  const xs = [0.28, 0.78, 0.2, 0.55, 0.85, 0.45, 0.66, 0.92, 0.3, 0.12, 0.6, 0.8, 0.5];
  const list = tiers.map((t, i) => ({ t, r: FRUITS[t].r * k, x: jl + xs[i] * jw, y: jt - 300 * s - i * 90 * s }));
  settle(list, jl, jr, jb);
  const faces = [1, 0, 0, 2, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    g.save();
    g.translate(b.x, b.y);
    g.scale(k, k);
    g.rotate(((i * 7) % 5) * 0.08 - 0.16);
    drawFruit(g, b.t, FRUITS[b.t].r, faces[i]);
    g.restore();
  }
  // glass walls
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 10 * s;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(jl - 5 * s, jt - 8 * s);
  g.lineTo(jl - 5 * s, jb + 5 * s);
  g.lineTo(jr + 5 * s, jb + 5 * s);
  g.lineTo(jr + 5 * s, jt - 8 * s);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(jl + 12 * s, jt + 24 * s, 12 * s, jb - jt - 70 * s);
  // dashed danger line
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 4 * s;
  g.setLineDash([14 * s, 12 * s]);
  g.beginPath();
  g.moveTo(jl, jt + 18 * s);
  g.lineTo(jr, jt + 18 * s);
  g.stroke();
  g.setLineDash([]);
  // falling apple with juice splash and a guide line
  const ax = cx + 70 * s;
  const ay = 110 * s;
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 4 * s;
  g.setLineDash([3 * s, 12 * s]);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(ax, ay + 70 * s);
  g.lineTo(ax, jt + 60 * s);
  g.stroke();
  g.setLineDash([]);
  g.lineCap = 'butt';
  const cols = ['#ff5470', '#ffffff', '#ffe066', '#ffb347', '#b184ff'];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + 0.3;
    const d = (62 + ((i * 37) % 44)) * s;
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.arc(ax + Math.cos(a) * d, ay + Math.sin(a) * d * 0.85, (3.5 + (i % 3) * 2.5) * s, 0, TAU);
    g.fill();
  }
  g.save();
  g.translate(ax, ay);
  g.scale(s * 1.25, s * 1.25);
  g.rotate(0.12);
  drawFruit(g, 5, FRUITS[5].r, 1);
  g.restore();
  // floating side fruit (wide formats)
  const side = [
    [0, cx - 250 * s, 120 * s, 2.2, -0.3],
    [2, cx + 250 * s, 210 * s, 1.5, 0.25],
  ];
  for (const [t, x, y, sc, rot] of side) {
    g.save();
    g.translate(x, y);
    g.scale(s * sc, s * sc);
    g.rotate(rot);
    drawFruit(g, t, FRUITS[t].r, 0);
    g.restore();
  }
}
