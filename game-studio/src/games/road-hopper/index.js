// Road Hopper - endless forward hopper on a grid of grass, roads, rivers and railways.
// Rows are indexed upward from 0 (the start). The camera creeps forward on its own, so
// dawdling too long lets a hawk swoop in. Everything that affects the level layout
// (row types, trees, traffic patterns, log spacing, train timetables) comes from api.rng
// at generation time, so the Daily Challenge is identical for everyone.
const COLS = 9;
const HOP_T = 0.12;
const CAR_COLORS = ['#ff4d6d', '#ffb703', '#4cc9f0', '#8e7dff', '#ff8fab', '#06d6a0', '#f77f00'];
const HATS = [
  [20, 'cap'],
  [60, 'party'],
  [150, 'crown'],
];

function block(g, x, y, w, h, z, top, front) {
  // 3/4 view box: footprint (x, y, w, h) on the ground, extruded up by z
  g.fillStyle = front;
  g.fillRect(x, y + h - z, w, z);
  g.fillStyle = top;
  g.fillRect(x, y - z, w, h);
}

function rblock(g, x, y, w, h, z, r, top, front) {
  g.fillStyle = front;
  rrect(g, x, y - z + r, w, h + z - r, r);
  g.fill();
  g.fillStyle = top;
  rrect(g, x, y - z, w, h, r);
  g.fill();
}

function rrect(g, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// car colors are pre-shaded once (no per-frame string building)
const CAR_SHADES = {};
for (const c of CAR_COLORS) CAR_SHADES[c] = { top: shade(c, 0.18), front: shade(c, -0.25), roof: shade(c, 0.35) };

function drawTree(g, x, y, C, tall) {
  const cx = x + C / 2;
  g.fillStyle = 'rgba(20,60,20,0.22)';
  g.fillRect(x + 5, y + C * 0.34, C - 6, C * 0.55);
  block(g, cx - 5, y + C * 0.5, 10, C * 0.3, 10, '#a0673d', '#7a4a28');
  const h = tall ? 46 : 32;
  rblock(g, x + 5, y + C * 0.12, C - 10, C * 0.58, h, 5, '#56c25a', '#2f8f3c');
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(x + 9, y + C * 0.12 - h + 4, (C - 18) * 0.5, 4);
}

function drawRock(g, x, y, C) {
  g.fillStyle = 'rgba(20,40,20,0.2)';
  g.fillRect(x + 6, y + C * 0.45, C - 10, C * 0.4);
  rblock(g, x + 7, y + C * 0.3, C - 14, C * 0.5, 14, 6, '#b8bcc6', '#868b99');
}

function drawCar(g, o, y, C, sh) {
  const h = C * 0.64;
  const yy = y + (C - h) / 2 + 2;
  const x = o.x;
  const L = o.len;
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(x + 3, yy + 6, L, h);
  // wheels
  g.fillStyle = '#23262f';
  g.fillRect(x + L * 0.14, yy + h - 4, 9, 6);
  g.fillRect(x + L * 0.72, yy + h - 4, 9, 6);
  if (o.kind === 'truck') {
    const cabW = C * 0.62;
    const cabX = o.vx > 0 ? x + L - cabW : x;
    const boxX = o.vx > 0 ? x : x + cabW + 3;
    rblock(g, boxX, yy, L - cabW - 3, h, 22, 3, '#f1f3f7', '#c3c8d4');
    rblock(g, cabX, yy, cabW, h, 16, 4, sh.top, sh.front);
    g.fillStyle = '#bfe7ff';
    const wx = o.vx > 0 ? cabX + cabW - 9 : cabX + 3;
    g.fillRect(wx, yy - 14, 6, h - 6);
  } else {
    rblock(g, x, yy, L, h, 12, 5, sh.top, sh.front);
    // cabin
    const cw = L * 0.5;
    const cx = x + (L - cw) / 2 + (o.vx > 0 ? -3 : 3);
    rblock(g, cx, yy + 3, cw, h - 6, 22, 4, sh.roof, '#bfe7ff');
    g.fillStyle = sh.top;
    g.fillRect(cx + 3, yy + 3 - 22, cw - 6, h - 12);
  }
  // headlights on the leading edge
  g.fillStyle = '#fff6b0';
  const hx = o.vx > 0 ? x + L - 4 : x;
  g.fillRect(hx, yy - 8, 4, 5);
  g.fillRect(hx, yy + h - 18, 4, 5);
}

function drawLog(g, o, y, C, t) {
  const h = C * 0.62;
  const yy = y + (C - h) / 2 + 3;
  const bob = Math.sin(t * 3 + o.x * 0.02) * 1;
  if (o.kind === 'lily') {
    const cx = o.x + C / 2;
    const cy = y + C / 2 + 2 + bob;
    g.fillStyle = 'rgba(0,60,90,0.25)';
    g.beginPath();
    g.ellipse(cx + 2, cy + 4, C * 0.4, C * 0.3, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3fbf5a';
    g.beginPath();
    g.moveTo(cx, cy);
    g.ellipse(cx, cy, C * 0.4, C * 0.32, 0, 0.35, Math.PI * 2 - 0.35);
    g.closePath();
    g.fill();
    g.fillStyle = '#7ee08a';
    g.beginPath();
    g.ellipse(cx - 4, cy - 3, C * 0.16, C * 0.1, 0, 0, Math.PI * 2);
    g.fill();
    return;
  }
  g.fillStyle = 'rgba(0,50,80,0.25)';
  g.fillRect(o.x + 3, yy + 4 + bob, o.len - 2, h);
  rblock(g, o.x + 2, yy + bob, o.len - 4, h, 8, 8, '#c07a3f', '#8a5226');
  g.fillStyle = '#a3622f';
  for (let k = 1; k < Math.round(o.len / C); k++) g.fillRect(o.x + k * C - 1, yy - 6 + bob, 2, h - 4);
  g.fillStyle = '#e0a868';
  g.beginPath();
  g.ellipse(o.x + 8, yy - 8 + h / 2 + bob, 5, h / 2 - 2, 0, 0, Math.PI * 2);
  g.ellipse(o.x + o.len - 8, yy - 8 + h / 2 + bob, 5, h / 2 - 2, 0, 0, Math.PI * 2);
  g.fill();
}

function drawTrain(g, x, y, len, dir, C) {
  const h = C * 0.72;
  const yy = y + (C - h) / 2 + 2;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(x + 4, yy + 6, len, h);
  const car = C * 2;
  for (let cx = 0; cx < len - 1; cx += car + 4) {
    const w = Math.min(car, len - cx);
    const isHead = dir > 0 ? cx + car >= len - 1 : cx === 0;
    rblock(g, x + cx, yy, w, h, 26, 5, isHead ? '#ffd166' : '#ef476f', isHead ? '#e0a526' : '#b8304f');
    g.fillStyle = '#cdeeff';
    for (let wx = x + cx + 8; wx < x + cx + w - 12; wx += 16) g.fillRect(wx, yy + h - 20, 9, 8);
  }
}

function drawCoin(g, x, y, t, s = 1) {
  const k = Math.max(0.2, Math.abs(Math.cos(t * 3)));
  g.save();
  g.translate(x, y);
  g.scale(k * s, s);
  g.fillStyle = '#d9910a';
  g.beginPath();
  g.arc(0, 2, 8.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.arc(0, 0, 8.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f5b301';
  g.fillRect(-2, -5, 4, 10);
  g.restore();
}

function drawChick(g, x, y, s, face, sx, sy, hat) {
  // x, y = ground contact center; s = size scale; face: 0 up, 1 right, 2 down, 3 left
  const w = 26 * s;
  const d = 15 * s; // front face height (extrusion)
  const h = 19 * s; // top face depth
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  const bx = -w / 2;
  const topY = -h - d + 2 * s;
  // feet
  g.fillStyle = '#ff9f1c';
  g.fillRect(-8 * s, -3 * s, 5 * s, 4 * s);
  g.fillRect(3 * s, -3 * s, 5 * s, 4 * s);
  // body: front face then top face
  g.fillStyle = '#f0cf8e';
  rrect(g, bx, topY + 6 * s, w, h + d - 7 * s, 5 * s);
  g.fill();
  g.fillStyle = '#fff9ec';
  rrect(g, bx, topY, w, h, 6 * s);
  g.fill();
  // wings
  g.fillStyle = '#ffe3a6';
  g.fillRect(bx - 3 * s, topY + h - 4 * s, 4 * s, 9 * s);
  g.fillRect(bx + w - 1 * s, topY + h - 4 * s, 4 * s, 9 * s);
  // comb
  g.fillStyle = '#ff4d6d';
  const combX = face === 1 ? 4 * s : face === 3 ? -4 * s : 0;
  const combY = face === 2 ? topY + 4 * s : face === 0 ? topY + 8 * s : topY + 6 * s;
  g.fillRect(combX - 3 * s, combY - 6 * s, 6 * s, 6 * s);
  g.fillRect(combX - 1 * s, combY - 9 * s, 4 * s, 4 * s);
  g.fillStyle = '#1d1340';
  if (face === 0) {
    // facing away: eyes peek over the top edge, beak on the far side
    g.fillStyle = '#ff9f1c';
    g.fillRect(-3 * s, topY - 3 * s, 6 * s, 4 * s);
    g.fillStyle = '#1d1340';
    g.fillRect(-8 * s, topY + 2 * s, 3.5 * s, 3.5 * s);
    g.fillRect(4.5 * s, topY + 2 * s, 3.5 * s, 3.5 * s);
  } else if (face === 2) {
    const fy = topY + h;
    g.fillRect(-8 * s, fy - 1 * s, 3.5 * s, 4.5 * s);
    g.fillRect(4.5 * s, fy - 1 * s, 3.5 * s, 4.5 * s);
    g.fillStyle = '#ff9f1c';
    g.fillRect(-3 * s, fy + 3 * s, 6 * s, 5 * s);
    g.fillStyle = 'rgba(255,120,150,0.65)';
    g.fillRect(-12 * s, fy + 3 * s, 4 * s, 3 * s);
    g.fillRect(8 * s, fy + 3 * s, 4 * s, 3 * s);
  } else {
    const dir = face === 1 ? 1 : -1;
    g.fillRect(dir * 7 * s - 1.75 * s, topY + 5 * s, 3.5 * s, 3.5 * s);
    g.fillRect(dir * 7 * s - 1.75 * s, topY + h, 3.5 * s, 4 * s);
    g.fillStyle = '#ff9f1c';
    g.fillRect(dir > 0 ? w / 2 - 1 * s : -w / 2 - 5 * s, topY + h - 1 * s, 6 * s, 5 * s);
  }
  // hat
  if (hat === 'cap') {
    g.fillStyle = '#3a86ff';
    g.fillRect(-9 * s, topY - 3 * s, 18 * s, 8 * s);
    g.fillStyle = '#265fc4';
    g.fillRect(-9 * s, topY + 4 * s, 18 * s, 2.5 * s);
  } else if (hat === 'party') {
    g.fillStyle = '#c77dff';
    g.beginPath();
    g.moveTo(-7 * s, topY + 3 * s);
    g.lineTo(7 * s, topY + 3 * s);
    g.lineTo(0, topY - 15 * s);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffd23f';
    g.fillRect(-2 * s, topY - 17 * s, 4 * s, 4 * s);
  } else if (hat === 'crown') {
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.moveTo(-9 * s, topY + 3 * s);
    g.lineTo(-9 * s, topY - 8 * s);
    g.lineTo(-4.5 * s, topY - 3 * s);
    g.lineTo(0, topY - 10 * s);
    g.lineTo(4.5 * s, topY - 3 * s);
    g.lineTo(9 * s, topY - 8 * s);
    g.lineTo(9 * s, topY + 3 * s);
    g.closePath();
    g.fill();
    g.fillStyle = '#ff4d6d';
    g.fillRect(-1.5 * s, topY - 2 * s, 3 * s, 3 * s);
  }
  g.restore();
}

function drawHawk(g, x, y, t, s = 1) {
  const flap = Math.sin(t * 22) * 0.35;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = '#6b3f22';
  for (const side of [-1, 1]) {
    g.save();
    g.scale(side, 1);
    g.rotate(flap);
    g.beginPath();
    g.moveTo(6, -6);
    g.quadraticCurveTo(46, -26, 70, -4);
    g.lineTo(58, 2);
    g.lineTo(62, 8);
    g.lineTo(48, 8);
    g.lineTo(50, 14);
    g.quadraticCurveTo(24, 12, 6, 10);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.fillStyle = '#8a5530';
  g.beginPath();
  g.ellipse(0, 4, 13, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a321a';
  g.beginPath();
  g.moveTo(-10, -18);
  g.lineTo(10, -18);
  g.lineTo(0, -34);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0, 26, 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffb703';
  g.beginPath();
  g.moveTo(-4, 32);
  g.lineTo(4, 32);
  g.lineTo(0, 42);
  g.closePath();
  g.fill();
  g.fillStyle = '#1d1340';
  g.fillRect(-6, 22, 3, 3);
  g.fillRect(3, 22, 3, 3);
  g.restore();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const C = W / COLS;

  const rows = [];
  let rowBase = 0;
  let genRow = 0;
  let safeCol = 4;
  let chunkType = 'grass';
  let chunkLeft = 0;
  let prevType = 'grass';
  let prevDir = 1;
  let prevLily = false;

  const P = { r: 0, x: 0, fromR: 0, fromX: 0, toR: 0, toX: 0, hopT: -1, face: 0, alive: true, log: null, sx: 1, sy: 1, z: 0, kind: '', deathT: 0, bumpT: 0, bumpDX: 0, bumpDY: 0, press: 0 };
  let cam = 0;
  let gt = 0;
  let autoOn = false;
  let graceT = 0;
  let maxRow = 0;
  let coinsRun = 0;
  let coinsTotal = 0;
  let hat = null;
  let streak = 0;
  let lastLandT = -9;
  let queued = -1;
  let hintT = 0;
  let trainSoundT = 0;
  let phew = false;
  const gest = { id: -1, x0: 0, y0: 0, done: false };
  const hawk = { on: false, t: 0, x: 0, y: 0, grabbed: false };

  const colX = (c) => (c + 0.5) * C;
  const rowTop = (r) => H - (r - cam + 1) * C;

  function getRow(r) {
    const i = r - rowBase;
    return i >= 0 && i < rows.length ? rows[i] : null;
  }

  function difficulty(r) {
    return Math.max(0, Math.min(1, (r - 6) / 210));
  }

  function hatFor(total) {
    let h = null;
    for (const [n, name] of HATS) if (total >= n) h = name;
    return h;
  }

  function makeRow(r, type) {
    return { r, type, blocked: new Uint8Array(COLS), deco: new Uint8Array(COLS), coin: -1, objs: [], dir: 1, loop: 0, x0: 0, period: 0, phase: 0, tlen: 0, lily: false, warn: false, trainX: -9999 };
  }

  function buildLoop(row, minLen, makeObj, gapMin, gapMax, margin) {
    let x = 0;
    while (x < minLen) {
      const o = makeObj();
      o.x = x;
      row.objs.push(o);
      x += o.len + api.rng.range(gapMin, gapMax);
    }
    row.loop = x;
    row.x0 = -margin;
    const phase = api.rng.range(0, x);
    for (const o of row.objs) {
      o.x = row.x0 + ((o.x + phase) % x);
    }
  }

  function genNext() {
    const r = genRow++;
    const d = difficulty(r);
    let type = 'grass';
    if (r > 3) {
      if (chunkLeft <= 0) {
        if (chunkType !== 'grass') {
          chunkType = 'grass';
          chunkLeft = api.rng.int(1, d > 0.6 ? 2 : 3);
        } else {
          const x = api.rng();
          const pRail = r < 22 ? 0 : 0.17;
          const pRiver = r < 12 ? 0 : 0.3;
          if (x < pRail) {
            chunkType = 'rail';
            chunkLeft = api.rng.int(1, d > 0.45 ? 2 : 1);
          } else if (x < pRail + pRiver) {
            chunkType = 'river';
            chunkLeft = api.rng.int(1, 2 + Math.round(2 * d));
          } else {
            chunkType = 'road';
            chunkLeft = api.rng.int(1, 2 + Math.round(3 * d));
          }
        }
      }
      type = chunkType;
      chunkLeft--;
    }
    const row = makeRow(r, type);
    if (type === 'grass') {
      const prevSafe = safeCol;
      safeCol = Math.max(1, Math.min(COLS - 2, safeCol + api.rng.int(-1, 1)));
      const pTree = r < 2 ? 0.04 : prevType === 'river' ? 0.1 : 0.15 + 0.13 * d;
      for (let c = 0; c < COLS; c++) {
        const edge = c === 0 || c === COLS - 1 ? 0.22 : 0;
        const roll = api.rng();
        if (c === safeCol || c === prevSafe || (r < 2 && c > 2 && c < 6)) continue;
        if (roll < pTree + edge) {
          row.blocked[c] = 1;
          row.deco[c] = roll < (pTree + edge) * 0.22 ? 2 : roll < (pTree + edge) * 0.5 ? 3 : 1; // rock / tall tree / tree
        }
      }
      if (r > 2 && api.rng.chance(0.2)) {
        const c = api.rng.int(0, COLS - 1);
        if (!row.blocked[c]) row.coin = c;
      }
    } else if (type === 'road') {
      row.dir = prevType === 'road' ? -prevDir : api.rng.sign();
      const truck = api.rng.chance(0.3);
      const len = truck ? C * 2.2 : C * 1.3;
      const speed = (api.rng.range(58, 88) + 120 * d) * (truck ? 0.8 : 1) * (r < 12 ? 0.8 : 1);
      buildLoop(
        row,
        W + 6 * C,
        () => ({ x: 0, len, kind: truck ? 'truck' : 'car', vx: row.dir * speed, color: CAR_COLORS[api.rng.int(0, CAR_COLORS.length - 1)] }),
        (2.5 - 0.5 * d) * C,
        (5 - 1.3 * d) * C,
        3 * C,
      );
    } else if (type === 'river') {
      row.dir = prevType === 'river' ? -prevDir : api.rng.sign();
      row.lily = prevType === 'river' && !prevLily && api.rng.chance(0.28);
      if (row.lily) {
        const must = api.rng.int(1, COLS - 2);
        for (let c = 0; c < COLS; c++) {
          if (c === must || api.rng.chance(0.4)) row.objs.push({ x: c * C, len: C, kind: 'lily', vx: 0 });
        }
      } else {
        const speed = api.rng.range(42, 66) + 55 * d;
        const maxCells = d > 0.5 ? 3 : 4;
        buildLoop(
          row,
          W + 10 * C,
          () => ({ x: 0, len: api.rng.int(2, maxCells) * C, kind: 'log', vx: row.dir * speed }),
          (1.3 + 0.3 * d) * C,
          (2.5 + 0.5 * d) * C,
          5 * C,
        );
      }
    } else if (type === 'rail') {
      row.period = api.rng.range(5.5, 8.5) - 2.2 * d;
      row.phase = api.rng.range(0, row.period);
      row.dir = api.rng.sign();
      row.tlen = api.rng.int(6, 10) * C;
    }
    prevType = type;
    prevDir = row.dir;
    prevLily = row.lily;
    rows.push(row);
  }

  function ensureRows() {
    while (genRow < Math.ceil(cam) + 22) genNext();
    while (rows.length && rows[0].r < cam - 10) {
      rows.shift();
      rowBase++;
    }
  }

  function reset() {
    rows.length = 0;
    // rows behind the start: a hedge of trees
    rowBase = -7;
    for (let r = -7; r < 0; r++) {
      const row = makeRow(r, 'grass');
      for (let c = 0; c < COLS; c++) {
        if (r <= -3 || c === 0 || c === COLS - 1 || (r === -2 && (c + r) % 3 === 0)) {
          row.blocked[c] = 1;
          row.deco[c] = (c * 7 + r * 3) % 5 === 0 ? 2 : (c + r) % 2 ? 3 : 1;
        }
      }
      rows.push(row);
    }
    genRow = 0;
    safeCol = 4;
    chunkType = 'grass';
    chunkLeft = 0;
    prevType = 'grass';
    prevDir = 1;
    prevLily = false;
    cam = -3.3;
    gt = 0;
    autoOn = false;
    graceT = 0;
    maxRow = 0;
    coinsRun = 0;
    coinsTotal = api.store.get('coins', 0) || 0;
    hat = hatFor(coinsTotal);
    streak = 0;
    lastLandT = -9;
    queued = -1;
    hintT = 0;
    gest.id = -1;
    hawk.on = false;
    hawk.grabbed = false;
    Object.assign(P, { r: 0, x: colX(4), fromR: 0, fromX: colX(4), toR: 0, toX: colX(4), hopT: -1, face: 0, alive: true, log: null, sx: 1, sy: 1, z: 0, kind: '', deathT: 0, bumpT: 0, press: 0 });
    ensureRows();
  }

  // ---------- world simulation ----------
  function stepRows(dt) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.type === 'road' || (row.type === 'river' && !row.lily)) {
        const lo = row.x0;
        const hi = row.x0 + row.loop;
        for (let k = 0; k < row.objs.length; k++) {
          const o = row.objs[k];
          o.x += o.vx * dt;
          if (o.vx > 0 && o.x > hi) o.x -= row.loop;
          else if (o.vx < 0 && o.x < lo) o.x += row.loop;
        }
      } else if (row.type === 'rail') {
        const tt = (gt + row.phase) % row.period;
        const speed = 1150;
        const run = (W + row.tlen + 2 * C) / speed;
        row.warn = tt > row.period - 1.4 || tt < run;
        const wasOn = row.trainX > -9000;
        if (tt < run) row.trainX = row.dir > 0 ? -row.tlen - C + tt * speed : W + C - tt * speed;
        else row.trainX = -9999;
        if (!wasOn && row.trainX > -9000 && api.state === 'playing' && Math.abs(row.r - P.r) < 5) {
          api.sfx.noise({ dur: 0.7, vol: 0.16, freq: 260, to: 110 });
          api.sfx.play('whoosh');
          api.fx.shake(3, 0.35);
        }
      }
    }
  }

  function carAt(row, x) {
    const a = x - C * 0.3;
    const b = x + C * 0.3;
    if (row.type === 'road') {
      for (let k = 0; k < row.objs.length; k++) {
        const o = row.objs[k];
        if (o.x + 3 < b && o.x + o.len - 3 > a) return o;
      }
    } else if (row.type === 'rail' && row.trainX > -9000) {
      if (row.trainX < b && row.trainX + row.tlen > a) return row;
    }
    return null;
  }

  function logAt(row, x) {
    for (let k = 0; k < row.objs.length; k++) {
      const o = row.objs[k];
      if (x > o.x - C * 0.28 && x < o.x + o.len + C * 0.28) return o;
    }
    return null;
  }

  function die(kind) {
    if (!P.alive) return;
    P.alive = false;
    P.kind = kind;
    P.deathT = 0;
    P.hopT = -1;
    queued = -1;
    const sx = P.x;
    const sy = rowTop(P.r) + C / 2;
    if (kind === 'car' || kind === 'train') {
      P.sx = 1.55;
      P.sy = 0.25;
      P.z = 0;
      api.sfx.play('hit');
      api.fx.shake(kind === 'train' ? 16 : 11, 0.35);
      api.fx.flash('#ffffff', 0.35);
      api.fx.burst(sx, sy - 6, { count: 22, colors: ['#ffffff', '#fff8e8', '#ffd23f'], speed: 220, size: 5, life: 0.8, gravity: 300, shape: 'square' });
      api.haptic(90);
    } else if (kind === 'water') {
      api.sfx.noise({ dur: 0.45, vol: 0.28, freq: 1400, to: 300, type: 'lowpass' });
      api.sfx.tone({ freq: 500, to: 160, type: 'sine', dur: 0.3, vol: 0.14 });
      api.fx.burst(sx, sy, { count: 26, colors: ['#ffffff', '#bfe9ff', '#7fd3ff'], speed: 200, size: 4.5, life: 0.7, gravity: 500, angle: -Math.PI / 2, spread: Math.PI * 1.2 });
      api.fx.ring(sx, sy + 4, { color: '#ffffff', radius: 34, life: 0.5, width: 3 });
      api.fx.shake(5, 0.2);
      api.haptic(60);
    } else if (kind === 'hawk') {
      hawk.on = true;
      hawk.t = 0;
      hawk.x = sx;
      hawk.y = -120;
      hawk.grabbed = false;
      api.sfx.tone({ freq: 1600, to: 900, type: 'sawtooth', dur: 0.35, vol: 0.07 });
      api.sfx.tone({ freq: 1400, to: 700, type: 'sawtooth', dur: 0.4, vol: 0.06, delay: 0.18 });
      api.haptic(60);
    }
    api.gameOver({ delay: kind === 'hawk' ? 1300 : 950, stats: { rows: maxRow, coins: coinsRun, cause: kind } });
  }

  function tryHop(dir) {
    // dir: 0 forward, 1 right, 2 back, 3 left
    if (!P.alive) return;
    if (P.hopT >= 0) {
      queued = dir;
      return;
    }
    P.face = dir;
    let tr = P.r;
    let tx = P.x;
    if (dir === 0) tr++;
    else if (dir === 2) tr--;
    else tx += dir === 1 ? C : -C;
    const row = getRow(tr);
    if (!row) return;
    const curRow = getRow(P.r);
    const fromLog = curRow && curRow.type === 'river';
    if (row.type !== 'river') {
      const c = Math.round(tx / C - 0.5);
      if (c < 0 || c >= COLS) return bump(dir);
      if (row.blocked[c]) return bump(dir);
      tx = colX(c);
    } else if (dir === 1 || dir === 3) {
      if (tx < C * 0.3 || tx > W - C * 0.3) return bump(dir);
    } else if (!fromLog) {
      // stepping from land into a river row keeps the column
      tx = colX(Math.max(0, Math.min(COLS - 1, Math.round(tx / C - 0.5))));
    }
    phew = false;
    if (curRow && curRow.type === 'road') {
      for (let k = 0; k < curRow.objs.length; k++) {
        const o = curRow.objs[k];
        const gap = o.vx > 0 ? P.x - C * 0.3 - (o.x + o.len) : o.x - (P.x + C * 0.3);
        if (gap > -2 && gap < Math.abs(o.vx) * 0.22) phew = true;
      }
    }
    P.fromR = P.r;
    P.fromX = P.x;
    P.toR = tr;
    P.toX = tx;
    P.hopT = 0;
    P.log = null;
    P.sx = 0.85;
    P.sy = 1.2;
    api.sfx.tone({ freq: 420 + Math.min(10, streak) * 22, to: 640 + Math.min(10, streak) * 30, type: 'square', dur: 0.06, vol: 0.05 });
    if (!autoOn && dir === 0) autoOn = true;
    hintT = Math.max(hintT, 4);
  }

  function bump(dir) {
    P.bumpT = 1;
    P.bumpDX = dir === 1 ? 1 : dir === 3 ? -1 : 0;
    P.bumpDY = dir === 0 ? -1 : dir === 2 ? 1 : 0;
    api.sfx.tone({ freq: 180, type: 'square', dur: 0.05, vol: 0.05 });
  }

  function land() {
    P.hopT = -1;
    P.r = P.toR;
    P.x = P.toX;
    P.sx = 1.25;
    P.sy = 0.78;
    const row = getRow(P.r);
    if (!row) return;
    if (row.type === 'river') {
      const o = logAt(row, P.x);
      if (!o) {
        die('water');
        return;
      }
      P.log = o;
      // snap onto the nearest log cell
      const cells = Math.max(1, Math.round(o.len / C));
      const k = Math.max(0, Math.min(cells - 1, Math.floor((P.x - o.x) / C)));
      P.x = o.x + (k + 0.5) * C;
      api.sfx.tone({ freq: 240, to: 180, type: 'sine', dur: 0.08, vol: 0.12 });
    } else {
      api.fx.burst(P.x, rowTop(P.r) + C * 0.75, { count: 4, color: row.type === 'grass' ? '#d9f7b0' : 'rgba(255,255,255,0.7)', speed: 60, size: 3, life: 0.3, gravity: 0 });
    }
    if (row.coin >= 0 && Math.abs(colX(row.coin) - P.x) < C * 0.5) {
      const cx = colX(row.coin);
      const cy = rowTop(P.r) + C / 2 - 12;
      row.coin = -1;
      coinsRun++;
      coinsTotal++;
      api.store.set('coins', coinsTotal);
      api.sfx.play('coin');
      api.fx.burst(cx, cy, { count: 12, colors: ['#ffd23f', '#fff3b0', '#ffffff'], speed: 160, size: 3.5, life: 0.45, gravity: 250 });
      api.fx.text(cx, cy - 10, '+1', { color: '#ffd23f', size: 22, life: 0.6, rise: 36 });
      const nh = hatFor(coinsTotal);
      if (nh !== hat) {
        hat = nh;
        api.fx.text(W / 2, H * 0.36, 'NEW HAT!', { color: '#ffffff', size: 36, life: 1.4 });
        api.fx.confetti(P.x, cy, 40);
        api.sfx.play('perfect');
        api.happy();
      }
    }
    if (P.r > maxRow) {
      const quick = gt - lastLandT < 0.42;
      streak = quick ? streak + 1 : 0;
      maxRow = P.r;
      api.setScore(maxRow);
      if (streak >= 2) api.sfx.combo(Math.min(streak - 2, 16), 480);
      if (streak > 0 && streak % 10 === 0) {
        api.fx.text(P.x, rowTop(P.r) - 20, `${streak} IN A ROW!`, { color: '#fff3b0', size: 22, life: 0.8 });
      }
      if (maxRow % 50 === 0) {
        api.fx.confetti(W / 2, H * 0.3, 60);
        api.fx.text(W / 2, H * 0.3, `${maxRow}!`, { size: 44, color: '#ffffff', life: 1.3 });
        api.sfx.play('levelup');
        api.emit('milestone', { rows: maxRow });
        if (maxRow % 100 === 0) api.happy();
      }
    } else {
      streak = 0;
    }
    lastLandT = gt;
    if (phew && P.alive) {
      phew = false;
      api.fx.text(P.x, rowTop(P.r) - 6, 'PHEW!', { color: '#bff6ff', size: 22, life: 0.7, rise: 34 });
      api.sfx.play('pop');
    }
  }

  function stepPlayer(dt) {
    if (!P.alive) return;
    if (P.hopT >= 0) {
      P.hopT += dt / HOP_T;
      if (P.hopT >= 1) {
        land();
        if (!P.alive) return;
        if (queued >= 0) {
          const q = queued;
          queued = -1;
          tryHop(q);
        }
      }
    } else if (P.log) {
      P.x += P.log.vx * dt;
      if (P.x < -C * 0.2 || P.x > W + C * 0.2) {
        die('water');
        return;
      }
    }
    // collisions against traffic in the row we are (mostly) in
    const k = P.hopT >= 0 ? P.hopT : 1;
    const effR = P.hopT >= 0 ? (k < 0.5 ? P.fromR : P.toR) : P.r;
    const ex = P.hopT >= 0 ? P.fromX + (P.toX - P.fromX) * k : P.x;
    const row = getRow(effR);
    if (row && (row.type === 'road' || row.type === 'rail')) {
      const hit = carAt(row, ex);
      if (hit) {
        P.r = effR;
        P.x = ex;
        die(row.type === 'rail' ? 'train' : 'car');
        return;
      }
    }
    if (P.hopT < 0 && row && row.type === 'river' && !P.log) die('water');
  }

  function stepCamera(dt) {
    const pr = P.hopT >= 0 ? P.fromR + (P.toR - P.fromR) * Math.min(1, P.hopT) : P.r;
    const target = pr - 3.3;
    if (target > cam) cam += (target - cam) * Math.min(1, dt * 5);
    if (graceT > 0) graceT -= dt;
    else if (autoOn && P.alive) cam += (0.3 + 0.45 * difficulty(maxRow)) * dt;
    if (P.alive && pr < cam - 0.6) {
      P.r = Math.round(pr);
      die('hawk');
    }
  }

  function stepFx(dt) {
    P.sx += (1 - P.sx) * Math.min(1, dt * 14);
    P.sy += (1 - P.sy) * Math.min(1, dt * 14);
    if (P.bumpT > 0) P.bumpT = Math.max(0, P.bumpT - dt * 6);
    if (P.press > 0) P.press = Math.max(0, P.press - dt * 3);
    if (hintT > 0) hintT -= dt;
    if (!P.alive) {
      P.deathT += dt;
      if (P.kind === 'car' || P.kind === 'train') {
        P.sx = 1.55;
        P.sy = 0.25;
      }
    }
    if (hawk.on) {
      hawk.t += dt;
      hawk.y += 1250 * dt;
      const py = rowTop(P.r) + C / 2;
      if (!hawk.grabbed && hawk.y >= py - 10) hawk.grabbed = true;
    }
    // bell for trains about to cross near the player
    if (trainSoundT > 0) trainSoundT -= dt;
    else if (api.state === 'playing') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.type === 'rail' && row.warn && row.trainX < -9000 && Math.abs(row.r - P.r) < 6) {
          api.sfx.tone({ freq: 1180, type: 'triangle', dur: 0.12, vol: 0.06 });
          trainSoundT = 0.32;
          break;
        }
      }
    }
  }

  function revive() {
    // nearest grass row (preferring behind) with a free column near the old one
    let best = null;
    for (let dd = 0; dd < 12 && !best; dd++) {
      for (const r of [P.r - dd, P.r + dd]) {
        const row = getRow(r);
        if (row && row.type === 'grass' && r >= 0) {
          best = row;
          break;
        }
      }
    }
    if (!best) best = getRow(Math.max(0, P.r)) || rows[0];
    const c0 = Math.max(0, Math.min(COLS - 1, Math.round(P.x / C - 0.5)));
    let col = c0;
    for (let dd = 0; dd < COLS; dd++) {
      if (c0 - dd >= 0 && !best.blocked[c0 - dd]) {
        col = c0 - dd;
        break;
      }
      if (c0 + dd < COLS && !best.blocked[c0 + dd]) {
        col = c0 + dd;
        break;
      }
    }
    Object.assign(P, { r: best.r, x: colX(col), fromR: best.r, toR: best.r, fromX: colX(col), toX: colX(col), hopT: -1, face: 0, alive: true, log: null, sx: 1.3, sy: 0.7, z: 0, kind: '', deathT: 0, bumpT: 0 });
    hawk.on = false;
    hawk.grabbed = false;
    queued = -1;
    gest.id = -1;
    streak = 0;
    cam = Math.min(cam, best.r - 3.3);
    graceT = 2.5;
    ensureRows();
  }

  // ---------- rendering ----------
  function drawGround(g, row, y) {
    const r = row.r;
    if (row.type === 'grass') {
      g.fillStyle = r % 2 ? '#94dd5f' : '#8bd457';
      g.fillRect(0, y, W, C + 1);
      g.fillStyle = r % 2 ? '#84cf51' : '#7cc84b';
      for (let c = 0; c < COLS; c++) {
        const hsh = (r * 31 + c * 17) & 7;
        if (hsh < 3) g.fillRect(c * C + 8 + hsh * 7, y + 10 + hsh * 6, 5, 3);
        if (hsh === 5) {
          g.fillStyle = '#fff3b0';
          g.fillRect(c * C + 20, y + 26, 4, 4);
          g.fillStyle = r % 2 ? '#84cf51' : '#7cc84b';
        }
      }
    } else if (row.type === 'road') {
      g.fillStyle = '#50566a';
      g.fillRect(0, y, W, C + 1);
      const above = getRow(r + 1);
      const below = getRow(r - 1);
      if (above && above.type === 'road') {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        for (let x = 6; x < W; x += 44) g.fillRect(x, y - 1.5, 22, 3);
      } else {
        g.fillStyle = '#6b7186';
        g.fillRect(0, y, W, 4);
      }
      if (!below || below.type !== 'road') {
        g.fillStyle = '#3d4252';
        g.fillRect(0, y + C - 5, W, 5);
      }
    } else if (row.type === 'river') {
      g.fillStyle = '#48b8f0';
      g.fillRect(0, y, W, C + 1);
      g.fillStyle = 'rgba(255,255,255,0.28)';
      const flow = (gt * (row.lily ? 8 : 26) * row.dir) % 70;
      for (let x = -70; x < W + 70; x += 70) {
        const xx = x + flow + ((r * 23) % 35);
        g.fillRect(xx, y + 12 + ((r * 7) % 12), 18, 3);
        g.fillRect(xx + 34, y + 30 - ((r * 5) % 10), 12, 3);
      }
      const above = getRow(r + 1);
      if (!above || above.type !== 'river') {
        g.fillStyle = 'rgba(0,70,120,0.28)';
        g.fillRect(0, y, W, 7);
      }
    } else if (row.type === 'rail') {
      g.fillStyle = '#a8998a';
      g.fillRect(0, y, W, C + 1);
      g.fillStyle = '#7a5738';
      for (let x = 4; x < W; x += 20) g.fillRect(x, y + 8, 9, C - 16);
      g.fillStyle = '#dde3ec';
      g.fillRect(0, y + 13, W, 4);
      g.fillRect(0, y + C - 17, W, 4);
      g.fillStyle = '#8d96a6';
      g.fillRect(0, y + 17, W, 1.5);
      g.fillRect(0, y + C - 13, W, 1.5);
      if (row.warn) {
        g.fillStyle = `rgba(255,60,60,${0.1 + 0.08 * Math.sin(gt * 20)})`;
        g.fillRect(0, y, W, C);
      }
    }
  }

  function drawObjects(g, row, y) {
    if (row.type === 'grass') {
      for (let c = 0; c < COLS; c++) {
        const dcn = row.deco[c];
        if (dcn === 2) drawRock(g, c * C, y, C);
        else if (dcn === 1 || dcn === 3) drawTree(g, c * C, y, C, dcn === 3);
      }
      if (row.coin >= 0) {
        const cx = colX(row.coin);
        g.fillStyle = 'rgba(0,0,0,0.15)';
        g.beginPath();
        g.ellipse(cx, y + C * 0.7, 8, 3.5, 0, 0, Math.PI * 2);
        g.fill();
        drawCoin(g, cx, y + C * 0.45 + Math.sin(gt * 4 + row.r) * 3, gt + row.r);
      }
    } else if (row.type === 'road') {
      for (let k = 0; k < row.objs.length; k++) {
        const o = row.objs[k];
        if (o.x > W + 4 || o.x + o.len < -4) continue;
        drawCar(g, o, y, C, CAR_SHADES[o.color]);
      }
    } else if (row.type === 'river') {
      for (let k = 0; k < row.objs.length; k++) {
        const o = row.objs[k];
        if (o.x > W + 4 || o.x + o.len < -4) continue;
        drawLog(g, o, y, C, gt);
      }
    } else if (row.type === 'rail') {
      // signal post
      const on = row.warn && Math.sin(gt * 18) > 0;
      block(g, 4, y + C * 0.55, 6, 6, 30, '#9aa3b2', '#6c7482');
      g.fillStyle = '#2b2f3a';
      g.fillRect(1, y + C * 0.55 - 40, 12, 12);
      g.fillStyle = on ? '#ff3b3b' : '#5a1f24';
      g.beginPath();
      g.arc(7, y + C * 0.55 - 34, 4.2, 0, Math.PI * 2);
      g.fill();
      if (on) {
        g.fillStyle = 'rgba(255,60,60,0.35)';
        g.beginPath();
        g.arc(7, y + C * 0.55 - 34, 10, 0, Math.PI * 2);
        g.fill();
      }
      if (row.trainX > -9000) drawTrain(g, row.trainX, y, row.tlen, row.dir, C);
    }
  }

  function drawPlayer(g) {
    if (hawk.grabbed) return;
    let x;
    let rr;
    let z = 0;
    if (P.hopT >= 0) {
      const k = Math.min(1, P.hopT);
      x = P.fromX + (P.toX - P.fromX) * k;
      rr = P.fromR + (P.toR - P.fromR) * k;
      z = Math.sin(k * Math.PI) * 16;
    } else {
      x = P.x;
      rr = P.r;
    }
    const bump = P.bumpT > 0 ? Math.sin(P.bumpT * Math.PI) * 6 : 0;
    x += P.bumpDX * bump;
    const y = rowTop(rr) + C * 0.78 + P.bumpDY * bump;
    let alpha = 1;
    let s = 1;
    if (!P.alive && P.kind === 'water') {
      s = Math.max(0, 1 - P.deathT * 2.2);
      alpha = s;
    }
    if (s <= 0) return;
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.beginPath();
    g.ellipse(x, y + 1, 13 * (1 - z / 60), 5 * (1 - z / 60), 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = alpha;
    const press = P.press > 0 ? P.press * 0.12 : 0;
    drawChick(g, x, y - z, s, P.face, P.sx + press, P.sy - press, hat);
    g.globalAlpha = 1;
  }

  function render(g) {
    const rMin = Math.floor(cam) - 1;
    const rMax = Math.ceil(cam + H / C) + 1;
    for (let r = rMin; r <= rMax; r++) {
      const row = getRow(r);
      const y = rowTop(r);
      if (row) drawGround(g, row, y);
      else {
        g.fillStyle = '#7cc84b';
        g.fillRect(0, y, W, C + 1);
      }
    }
    let pr = P.r;
    if (P.hopT >= 0) pr = P.hopT < 0.5 ? P.fromR : P.toR;
    let drawn = false;
    for (let r = rMax; r >= rMin; r--) {
      const row = getRow(r);
      if (row) drawObjects(g, row, rowTop(r));
      if (r === pr) {
        drawPlayer(g);
        drawn = true;
      }
    }
    if (!drawn) drawPlayer(g);
    // hawk
    if (hawk.on) {
      const shadowY = rowTop(P.r) + C * 0.7;
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath();
      g.ellipse(hawk.x, Math.min(shadowY, hawk.y + 60), 40, 12, 0, 0, Math.PI * 2);
      g.fill();
      if (hawk.grabbed) drawChick(g, hawk.x, hawk.y + 46, 0.9, 2, 1, 1, hat);
      drawHawk(g, hawk.x, hawk.y, hawk.t, 1.1);
    }
    // hawk warning when lagging at the bottom edge
    if (P.alive && api.state === 'playing') {
      const pr2 = P.hopT >= 0 ? P.fromR + (P.toR - P.fromR) * P.hopT : P.r;
      const lag = cam + 1.4 - pr2;
      if (lag > 0) {
        const k = Math.min(1, lag / 1.8);
        const pulse = 0.6 + 0.4 * Math.sin(gt * 14);
        const dg = g.createLinearGradient(0, H - 160, 0, H);
        dg.addColorStop(0, 'rgba(255,40,60,0)');
        dg.addColorStop(1, `rgba(255,30,50,${0.75 * k * pulse})`);
        g.fillStyle = dg;
        g.fillRect(0, H - 160, W, 160);
        api.draw.text(g, 'HURRY!', W / 2, H - 42, { size: 28 + pulse * 3, color: '#ffffff', stroke: '#b3122e', strokeWidth: 6, alpha: Math.min(1, k * 1.6) });
      }
    }
    // controls hint on the first seconds
    if (api.state === 'ready' || (api.state === 'playing' && hintT <= 0 && maxRow < 3)) {
      const a = 0.35 + 0.2 * Math.sin(gt * 5);
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath();
      g.moveTo(10, H * 0.5);
      g.lineTo(26, H * 0.5 - 18);
      g.lineTo(26, H * 0.5 + 18);
      g.closePath();
      g.moveTo(W - 10, H * 0.5);
      g.lineTo(W - 26, H * 0.5 - 18);
      g.lineTo(W - 26, H * 0.5 + 18);
      g.closePath();
      g.fill();
    }
    // coin counter
    drawCoin(g, 24, 30, 0);
    api.draw.text(g, coinsRun, 40, 31, { size: 22, align: 'left', color: '#ffffff', shadow: 'rgba(0,0,0,0.4)' });
  }

  reset();

  return {
    reset,
    update(dt) {
      gt += dt;
      stepRows(dt);
      stepPlayer(dt);
      stepCamera(dt);
      stepFx(dt);
      ensureRows();
    },
    idle(dt) {
      gt += dt;
      stepRows(dt);
      stepFx(dt);
    },
    input(e) {
      if (!P.alive) return true;
      if (e.type === 'down') {
        gest.id = e.id;
        gest.x0 = e.x;
        gest.y0 = e.y;
        gest.done = false;
        P.press = 1;
        return true;
      }
      if (e.type === 'move') {
        if (e.id !== gest.id || gest.done || !e.pressed) return false;
        const dx = e.x - gest.x0;
        const dy = e.y - gest.y0;
        if (dx * dx + dy * dy > 26 * 26) {
          gest.done = true;
          if (Math.abs(dx) > Math.abs(dy)) tryHop(dx > 0 ? 1 : 3);
          else tryHop(dy < 0 ? 0 : 2);
        }
        return true;
      }
      if (e.type === 'up') {
        if (e.id !== gest.id) return false;
        gest.id = -1;
        if (gest.done) return true;
        const dx = e.x - gest.x0;
        const dy = e.y - gest.y0;
        if (dx * dx + dy * dy > 26 * 26) {
          if (Math.abs(dx) > Math.abs(dy)) tryHop(dx > 0 ? 1 : 3);
          else tryHop(dy < 0 ? 0 : 2);
        } else if (gest.x0 < W * 0.18) tryHop(3);
        else if (gest.x0 > W * 0.82) tryHop(1);
        else tryHop(0);
        return true;
      }
      if (e.type === 'keydown') {
        const k = e.key;
        let dir = -1;
        if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Enter') dir = 0;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') dir = 1;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') dir = 2;
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') dir = 3;
        if (dir < 0) return false;
        if (!e.repeat) tryHop(dir);
        return true;
      }
      return false;
    },
    revive,
    render,
    forwardStartInput: true,
  };
}

/** Cover art: a chunky chick mid-hop over traffic, with a river and logs behind. */
export function cover(g, w, h) {
  const C = Math.max(w / 12, h / 6.8);
  const rowsN = Math.ceil(h / C) + 1;
  const types = ['grass', 'road', 'road', 'grass', 'river', 'river', 'grass', 'rail', 'grass'];
  const top = (i) => h - (i + 1) * C + C * 0.35;
  for (let i = 0; i < rowsN; i++) {
    const t = types[i % types.length];
    const y = top(i);
    if (t === 'grass') {
      g.fillStyle = i % 2 ? '#94dd5f' : '#8bd457';
      g.fillRect(0, y, w, C + 1);
    } else if (t === 'road') {
      g.fillStyle = '#50566a';
      g.fillRect(0, y, w, C + 1);
      if (types[(i + 1) % types.length] === 'road') {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        for (let x = 6; x < w; x += C) g.fillRect(x, y - 2, C * 0.5, 4);
      }
    } else if (t === 'river') {
      g.fillStyle = '#48b8f0';
      g.fillRect(0, y, w, C + 1);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      for (let x = (i * 37) % 90; x < w; x += 110) g.fillRect(x, y + C * 0.3, C * 0.4, 4);
    } else {
      g.fillStyle = '#a8998a';
      g.fillRect(0, y, w, C + 1);
      g.fillStyle = '#7a5738';
      for (let x = 4; x < w; x += C * 0.45) g.fillRect(x, y + C * 0.18, C * 0.2, C * 0.64);
      g.fillStyle = '#dde3ec';
      g.fillRect(0, y + C * 0.28, w, C * 0.09);
      g.fillRect(0, y + C * 0.63, w, C * 0.09);
    }
  }
  const s = C / 46.67;
  g.save();
  g.scale(s, s);
  const cw = w / s;
  const Cn = 46.67;
  const ty = (i) => top(i) / s;
  // objects far to near
  for (let i = rowsN - 1; i >= 0; i--) {
    const t = types[i % types.length];
    const y = ty(i);
    if (t === 'grass') {
      for (let c = 0; c < cw / Cn; c++) {
        const hsh = (i * 5 + c * 3) % 7;
        if (hsh === 0) drawTree(g, c * Cn, y, Cn, (i + c) % 2 === 0);
        else if (hsh === 3 && i > 3) drawRock(g, c * Cn, y, Cn);
      }
    } else if (t === 'road') {
      const dir = i % 2 ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        const truck = (i + k) % 3 === 0;
        const len = truck ? Cn * 2.2 : Cn * 1.3;
        const col = CAR_COLORS[(i * 3 + k) % CAR_COLORS.length];
        drawCar(g, { x: ((k * 0.37 + i * 0.13) % 1) * cw - 10, len, kind: truck ? 'truck' : 'car', vx: dir }, y, Cn, CAR_SHADES[col]);
      }
    } else if (t === 'river') {
      for (let k = 0; k < 3; k++) drawLog(g, { x: ((k * 0.36 + i * 0.21) % 1) * cw - 20, len: Cn * (2 + ((i + k) % 3)), kind: 'log' }, y, Cn, 0);
    } else if (t === 'rail') {
      drawTrain(g, cw * 0.55, y, Cn * 8, -1, Cn);
    }
    if (i === 2) {
      // hero hopping out of the road lane
      const hx = cw * 0.44;
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.beginPath();
      g.ellipse(hx, y + Cn * 0.72, 16, 6, 0, 0, Math.PI * 2);
      g.fill();
      drawChick(g, hx, y + Cn * 0.72 - 26, 1.5, 2, 0.94, 1.1, 'crown');
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 3;
      g.lineCap = 'round';
      for (let n = -1; n <= 1; n++) {
        g.beginPath();
        g.moveTo(hx + n * 12, y + Cn * 0.95);
        g.lineTo(hx + n * 12, y + Cn * 1.35);
        g.stroke();
      }
      g.lineCap = 'butt';
    }
    if (i === 3) {
      for (let k = 0; k < 3; k++) drawCoin(g, cw * (0.64 + k * 0.07), y + Cn * 0.5, (k % 2) * 0.2, 1.2);
    }
  }
  g.restore();
}
