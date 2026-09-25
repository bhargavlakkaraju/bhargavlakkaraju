import { mulberry32 } from '../engine/rng.js';

// Brick Barrage - turn-based ball volley shooter.
// Aim from the launcher, release a volley of balls, break numbered bricks before they
// reach the bottom. Every turn the wall steps down one row and a tougher row appears.

const W = 420;
const H = 740;
const COLS = 7;
const ROWS = 10; // row 0 is the empty "behind the lines" lane, new rows spawn in row 1
const FX = 14;
const FW = 392;
const CS = FW / COLS; // 56
const FY = 112;
const FLOOR = FY + ROWS * CS; // 672
const GAP = 3;
const S = CS - GAP * 2; // drawn brick size
const BR = 7; // ball radius
const SPEED = 880;
const FIRE_GAP = 0.068;
const MIN_ANG = 0.13; // min launch angle above horizontal (rad)
const MIN_VY = SPEED * 0.12; // anti-stall: never let a ball travel (almost) horizontally
const PR = 12; // pickup radius
const LAUNCH_Y = FLOOR - BR;
const SHIFT_DUR = 0.34;

const BRICK = 1;
const PICKUP = 2;

// ---------- colour ramp by HP (precomputed, no per-frame string building) ----------
const STOPS = [
  [46, 230, 166],
  [34, 211, 238],
  [59, 130, 246],
  [124, 92, 255],
  [214, 76, 240],
  [247, 60, 110],
  [255, 128, 54],
  [255, 206, 38],
];
const NB = 48;
const FILL = [];
const DARK = [];
const LIGHT = [];
const GLOW = [];
for (let i = 0; i < NB; i++) {
  const t = (i / (NB - 1)) * (STOPS.length - 1);
  const k = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - k;
  const c = [0, 1, 2].map((j) => STOPS[k][j] + (STOPS[k + 1][j] - STOPS[k][j]) * f);
  FILL.push(`rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`);
  DARK.push(`rgb(${(c[0] * 0.55) | 0},${(c[1] * 0.55) | 0},${(c[2] * 0.6) | 0})`);
  LIGHT.push(`rgb(${(c[0] + (255 - c[0]) * 0.45) | 0},${(c[1] + (255 - c[1]) * 0.45) | 0},${(c[2] + (255 - c[2]) * 0.45) | 0})`);
  GLOW.push(`rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.28)`);
}
// Fresh rows (hp == turn) are hot rose, older/damaged bricks cool down towards mint,
// double-HP bricks glow orange/gold.
function bucketFor(hp, turn) {
  const ratio = hp / Math.max(1, turn);
  const t = ratio <= 1 ? 0.7 * Math.pow(ratio, 1.5) : 0.7 + 0.3 * Math.min(1, ratio - 1);
  return Math.max(0, Math.min(NB - 1, Math.round(t * (NB - 1))));
}

const LABELS = [];
function label(n) {
  return LABELS[n] || (LABELS[n] = String(n));
}

// Right-triangle shapes inside the brick square, clockwise (screen space), unit coords.
const TRI = [
  null,
  [0, 0, 1, 0, 0, 1], // missing bottom-right
  [0, 0, 1, 0, 1, 1], // missing bottom-left
  [0, 0, 1, 1, 0, 1], // missing top-right
  [1, 0, 1, 1, 0, 1], // missing top-left
];

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

// Pentatonic steps for the rising "tick" of ball hits.
const STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];

function shapePath(g, shape, x, y, s, h) {
  if (shape === 0) {
    const r = 8;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + s, y, x + s, y + h, r);
    g.arcTo(x + s, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + s, y, r);
    g.closePath();
    return;
  }
  const v = TRI[shape];
  const r = 5;
  const ax = x + v[0] * s;
  const ay = y + v[1] * h;
  const bx = x + v[2] * s;
  const by = y + v[3] * h;
  const cx = x + v[4] * s;
  const cy = y + v[5] * h;
  g.beginPath();
  g.moveTo((ax + bx) / 2, (ay + by) / 2);
  g.arcTo(bx, by, cx, cy, r);
  g.arcTo(cx, cy, ax, ay, r);
  g.arcTo(ax, ay, bx, by, r);
  g.closePath();
}

export default function createGame(api) {
  const { fx, sfx, ease, draw } = api;
  const rng = api.rng;
  const grid = new Array(COLS * ROWS).fill(null);
  const balls = [];
  const aimPts = new Float32Array(10);
  let aimN = 0;
  const ghost = { x: 0, y: 0, vx: 0, vy: 0 };
  const F_BIG = draw.font(20, 800);
  const F_MID = draw.font(17, 800);
  const F_SMALL = draw.font(14, 800);
  const F_TRI = draw.font(15, 800);
  const F_TRI_S = draw.font(12, 800);

  let bgGrad = null;
  let ballCount, turn, phase, launchX, launchVis, nextX, firstBack, fired, fireAcc, pendingAdd;
  let volleyT, speed, pulled, aimAng, aiming, aimValid, hoverAim, kbAim, keyL, keyR;
  let shiftP, t, hitCount, breaks, lastHitSnd, lastBreakSnd, lastSpark, hintA, firedOnce;
  let dangerCount, countPop, speedPop, turnPop, deadT, cleared;

  function makeBrick(hp, shape) {
    return { type: BRICK, hp, maxHp: hp, shape, bucket: bucketFor(hp, turn), label: label(hp), hitT: 0, born: 0, glow: 0 };
  }
  function makePickup() {
    return { type: PICKUP, born: 0, ph: 0 };
  }

  function genRow(n) {
    const base = 1 * COLS;
    const pick = rng.int(0, COLS - 1);
    const p = n <= 2 ? 0.3 : Math.min(0.72, 0.28 + n * 0.01);
    const dbl = n >= 8 ? Math.min(0.28, (n - 6) * 0.011) : 0;
    const tri = Math.min(0.26, 0.08 + n * 0.004);
    let count = 0;
    for (let c = 0; c < COLS; c++) {
      const r1 = rng();
      const r2 = rng();
      const r3 = rng();
      const r4 = rng();
      if (c === pick) {
        grid[base + c] = makePickup();
        continue;
      }
      if (r1 < p) {
        const hp = r2 < dbl ? n * 2 : n;
        const shape = r3 < tri ? 1 + Math.floor(r4 * 4) : 0;
        grid[base + c] = makeBrick(hp, shape);
        count++;
      } else grid[base + c] = null;
    }
    if (count === 0) {
      const c = (pick + 1 + Math.floor(rng() * (COLS - 1))) % COLS;
      grid[base + c] = makeBrick(n, 0);
    }
  }

  function reset() {
    grid.fill(null);
    balls.length = 0;
    turn = 1;
    ballCount = 1;
    phase = 'aim';
    launchX = W / 2;
    launchVis = launchX;
    nextX = launchX;
    firstBack = false;
    fired = 0;
    fireAcc = 0;
    pendingAdd = 0;
    volleyT = 0;
    speed = 1;
    pulled = false;
    aimAng = -Math.PI / 2;
    aiming = false;
    aimValid = false;
    hoverAim = false;
    kbAim = false;
    keyL = keyR = false;
    shiftP = 1;
    t = 0;
    hitCount = 0;
    breaks = 0;
    lastHitSnd = lastBreakSnd = lastSpark = -1;
    hintA = 1;
    firedOnce = false;
    dangerCount = 0;
    countPop = speedPop = turnPop = 0;
    deadT = -1;
    cleared = false;
    genRow(1);
    api.setScore(1);
  }

  // ---------- physics ----------
  function collideBrick(b, o, r, c) {
    const x0 = FX + c * CS + GAP;
    const y0 = FY + r * CS + GAP;
    let nx;
    let ny;
    let pen;
    if (o.shape === 0) {
      const qx = b.x < x0 ? x0 : b.x > x0 + S ? x0 + S : b.x;
      const qy = b.y < y0 ? y0 : b.y > y0 + S ? y0 + S : b.y;
      const dx = b.x - qx;
      const dy = b.y - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= BR * BR) return false;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = dx / d;
        ny = dy / d;
        pen = BR - d;
      } else {
        const l = b.x - x0;
        const rr = x0 + S - b.x;
        const tp = b.y - y0;
        const bt = y0 + S - b.y;
        const m = Math.min(l, rr, tp, bt);
        if (m === l) (nx = -1), (ny = 0);
        else if (m === rr) (nx = 1), (ny = 0);
        else if (m === tp) (nx = 0), (ny = -1);
        else (nx = 0), (ny = 1);
        pen = m + BR;
      }
    } else {
      const v = TRI[o.shape];
      let best = Infinity;
      let bqx = 0;
      let bqy = 0;
      let inside = true;
      let enx = 0;
      let eny = 0;
      for (let i = 0; i < 3; i++) {
        const ax = x0 + v[i * 2] * S;
        const ay = y0 + v[i * 2 + 1] * S;
        const j = (i + 1) % 3;
        const bx = x0 + v[j * 2] * S;
        const by = y0 + v[j * 2 + 1] * S;
        const ex = bx - ax;
        const ey = by - ay;
        const px = b.x - ax;
        const py = b.y - ay;
        if (ex * py - ey * px < 0) inside = false;
        let k = (px * ex + py * ey) / (ex * ex + ey * ey);
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        const qx = ax + ex * k;
        const qy = ay + ey * k;
        const dx = b.x - qx;
        const dy = b.y - qy;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2;
          bqx = qx;
          bqy = qy;
          const el = Math.sqrt(ex * ex + ey * ey);
          enx = ey / el;
          eny = -ex / el;
        }
      }
      if (inside) {
        nx = enx;
        ny = eny;
        pen = Math.sqrt(best) + BR;
      } else {
        if (best >= BR * BR) return false;
        const d = Math.sqrt(best);
        if (d > 1e-6) {
          nx = (b.x - bqx) / d;
          ny = (b.y - bqy) / d;
        } else {
          nx = enx;
          ny = eny;
        }
        pen = BR - d;
      }
    }
    b.x += nx * pen;
    b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= 2 * vn * nx;
      b.vy -= 2 * vn * ny;
      return true;
    }
    return false;
  }

  function normalize(b) {
    if (pulled) return;
    if (b.vy > -MIN_VY && b.vy < MIN_VY) b.vy = b.vy < 0 ? -MIN_VY : MIN_VY;
    const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
    b.vx = (b.vx / sp) * SPEED;
    b.vy = (b.vy / sp) * SPEED;
  }

  /** Advance one small step. live=false for the aim preview ghost (no damage). Returns true on a bounce. */
  function stepBall(b, h, live) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    let hit = false;
    if (b.x < FX + BR) {
      b.x = FX + BR;
      if (b.vx < 0) (b.vx = -b.vx), (hit = true);
    } else if (b.x > FX + FW - BR) {
      b.x = FX + FW - BR;
      if (b.vx > 0) (b.vx = -b.vx), (hit = true);
    }
    if (b.y < FY + BR) {
      b.y = FY + BR;
      if (b.vy < 0) (b.vy = -b.vy), (hit = true);
    }
    const cc = Math.floor((b.x - FX) / CS);
    const rr = Math.floor((b.y - FY) / CS);
    for (let r = rr - 1; r <= rr + 1; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = cc - 1; c <= cc + 1; c++) {
        if (c < 0 || c >= COLS) continue;
        const o = grid[r * COLS + c];
        if (!o) continue;
        if (o.type === BRICK) {
          if (collideBrick(b, o, r, c)) {
            hit = true;
            if (live) damage(o, r, c, b);
          }
        } else if (live) {
          const px = FX + (c + 0.5) * CS;
          const py = FY + (r + 0.5) * CS;
          const dx = b.x - px;
          const dy = b.y - py;
          if (dx * dx + dy * dy < (BR + PR) * (BR + PR)) collect(r, c, px, py);
        }
      }
    }
    if (hit) normalize(b);
    return hit;
  }

  function damage(o, r, c, b) {
    o.hp -= 1;
    o.hitT = 1;
    hitCount++;
    if (o.hp <= 0) {
      grid[r * COLS + c] = null;
      breaks++;
      const cx = FX + (c + 0.5) * CS;
      const cy = FY + (r + 0.5) * CS;
      fx.burst(cx, cy, { count: 16, colors: [FILL[o.bucket], LIGHT[o.bucket], '#ffffff'], shape: 'square', speed: 280, size: 7, life: 0.75, gravity: 900 });
      fx.burst(cx, cy, { count: 6, color: '#ffffff', shape: 'spark', speed: 420, size: 3, life: 0.3, gravity: 0 });
      fx.ring(cx, cy, { color: LIGHT[o.bucket], radius: 46, life: 0.35, width: 5 });
      fx.shake(3.5, 0.1);
      if (t - lastBreakSnd > 0.045) {
        lastBreakSnd = t;
        sfx.noise({ dur: 0.14, vol: 0.2, freq: 2600, to: 500, type: 'bandpass', q: 0.9 });
        sfx.combo(Math.min(breaks - 1, 20), 392);
      }
      api.haptic(8);
      return;
    }
    o.label = label(o.hp);
    o.bucket = bucketFor(o.hp, turn);
    if (t - lastHitSnd > 0.028) {
      lastHitSnd = t;
      const step = STEPS[hitCount % STEPS.length];
      sfx.tone({ freq: 330 * Math.pow(2, step / 12), type: 'triangle', dur: 0.05, vol: 0.075 });
    }
    if (t - lastSpark > 0.03 && b) {
      lastSpark = t;
      fx.burst(b.x, b.y, { count: 3, colors: [LIGHT[o.bucket], '#ffffff'], shape: 'spark', speed: 260, size: 2.5, life: 0.22, gravity: 0 });
    }
  }

  function collect(r, c, px, py) {
    grid[r * COLS + c] = null;
    pendingAdd++;
    fx.burst(px, py, { count: 14, colors: ['#ffffff', '#a7f3d0', '#67e8f9'], speed: 220, size: 4, life: 0.5, gravity: 0 });
    fx.ring(px, py, { color: '#ffffff', radius: 30, life: 0.35, width: 3 });
    fx.text(px, py - 6, '+1', { color: '#a7f3d0', size: 24, life: 0.7, rise: 40 });
    sfx.play('coin');
  }

  // ---------- turn flow ----------
  function fire() {
    if (phase !== 'aim' || !aimValid) return;
    phase = 'fire';
    fired = 0;
    fireAcc = FIRE_GAP;
    firstBack = false;
    nextX = launchX;
    volleyT = 0;
    speed = 1;
    pulled = false;
    hitCount = 0;
    breaks = 0;
    pendingAdd = 0;
    aiming = false;
    hoverAim = false;
    firedOnce = true;
    while (balls.length < ballCount) balls.push({ x: 0, y: 0, vx: 0, vy: 0, st: 0 });
    for (let i = 0; i < ballCount; i++) balls[i].st = 0;
    sfx.play('whoosh');
    api.haptic(10);
  }

  function launchOne(extra) {
    const b = balls[fired++];
    b.x = launchX;
    b.y = LAUNCH_Y;
    b.vx = Math.cos(aimAng) * SPEED;
    b.vy = Math.sin(aimAng) * SPEED;
    b.st = 1;
    // advance by the leftover time so spacing stays exact at any speed
    let rem = extra;
    while (rem > 0 && b.st === 1) {
      const h = Math.min(rem, 3 / SPEED);
      stepBall(b, h, true);
      rem -= h;
    }
    if (fired % 3 === 1) sfx.tone({ freq: 740, to: 980, type: 'sine', dur: 0.035, vol: 0.035 });
  }

  function simulate(sdt) {
    if (fired < ballCount) {
      fireAcc += sdt;
      while (fireAcc >= FIRE_GAP && fired < ballCount) {
        fireAcc -= FIRE_GAP;
        launchOne(fireAcc);
      }
    }
    const steps = Math.max(1, Math.ceil((SPEED * sdt) / 3.4));
    const h = sdt / steps;
    let active = 0;
    for (let i = 0; i < fired; i++) {
      const b = balls[i];
      if (b.st === 1) {
        for (let s = 0; s < steps; s++) {
          if (pulled) b.vy += 1400 * h;
          stepBall(b, h, true);
          if (b.y >= LAUNCH_Y && b.vy > 0) {
            b.y = LAUNCH_Y;
            b.st = 2;
            if (!firstBack) {
              firstBack = true;
              nextX = clamp(b.x, FX + BR + 2, FX + FW - BR - 2);
              fx.ring(nextX, LAUNCH_Y, { color: '#ffffff', radius: 22, life: 0.3, width: 3 });
              sfx.play('tap');
            }
            break;
          }
        }
      }
      if (b.st === 2) {
        const d = nextX - b.x;
        const mv = 1300 * sdt;
        if (Math.abs(d) <= mv) {
          b.x = nextX;
          b.st = 3;
          countPop = 1;
        } else b.x += Math.sign(d) * mv;
      }
      if (b.st !== 3) active++;
    }
    if (fired >= ballCount && active === 0) endTurn();
  }

  function endTurn() {
    launchX = nextX;
    if (pendingAdd > 0) {
      ballCount += pendingAdd;
      countPop = 1;
    }
    let bricksLeft = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i] && grid[i].type === BRICK) bricksLeft++;
    if (bricksLeft === 0) {
      cleared = true;
      fx.confetti(W / 2, H * 0.42, 80);
      fx.text(W / 2, H * 0.42, 'BOARD CLEAR!', { color: '#fde047', size: 38, life: 1.4 });
      sfx.play('win');
      api.happy();
    } else if (breaks >= 5) {
      const words = breaks >= 18 ? 'UNSTOPPABLE!' : breaks >= 12 ? 'AWESOME!' : breaks >= 8 ? 'GREAT!' : 'NICE!';
      fx.text(W / 2, H * 0.45, words, { color: breaks >= 12 ? '#fde047' : '#67e8f9', size: 34 + Math.min(10, breaks - 5), life: 1.1 });
      if (breaks >= 8) sfx.play('perfect');
    }
    turn += 1;
    api.setScore(turn);
    turnPop = 1;
    if (turn % 25 === 0) {
      fx.confetti(W / 2, 90, 60);
      sfx.play('levelup');
      api.emit('milestone', { turn });
    }
    // shift everything down one row
    for (let r = ROWS - 1; r >= 1; r--) {
      for (let c = 0; c < COLS; c++) grid[r * COLS + c] = grid[(r - 1) * COLS + c];
    }
    for (let c = 0; c < COLS; c++) grid[c] = null;
    genRow(turn);
    for (let i = 0; i < grid.length; i++) {
      const o = grid[i];
      if (o && o.type === BRICK) o.bucket = bucketFor(o.hp, turn);
    }
    phase = 'shift';
    shiftP = 0;
    speed = 1;
    sfx.tone({ freq: 150, to: 90, type: 'sine', dur: 0.2, vol: 0.18 });
  }

  function finishShift() {
    shiftP = 1;
    const last = (ROWS - 1) * COLS;
    let dead = false;
    dangerCount = 0;
    for (let c = 0; c < COLS; c++) {
      const o = grid[last + c];
      if (!o) continue;
      if (o.type === PICKUP) {
        grid[last + c] = null;
        ballCount++;
        countPop = 1;
        const px = FX + (c + 0.5) * CS;
        fx.burst(px, FY + (ROWS - 0.5) * CS, { count: 10, color: '#ffffff', speed: 180, size: 3, life: 0.4, gravity: 0 });
        sfx.play('coin');
      } else {
        dead = true;
        o.glow = 1;
      }
    }
    for (let c = 0; c < COLS; c++) {
      const o = grid[(ROWS - 2) * COLS + c];
      if (o && o.type === BRICK) dangerCount++;
    }
    if (dead) {
      phase = 'dead';
      deadT = 0;
      sfx.play('die');
      fx.shake(14, 0.45);
      fx.flash('#ff2d55', 0.35);
      api.haptic(90);
      api.gameOver({ delay: 1000, stats: { balls: ballCount, turn } });
      return;
    }
    phase = 'aim';
    if (dangerCount > 0) sfx.play('error');
  }

  // ---------- aim ----------
  function setAimFrom(px, py) {
    if (py > FLOOR + 16) {
      aimValid = false;
      return;
    }
    const dx = px - launchX;
    const dy = py - LAUNCH_Y;
    if (dx * dx + dy * dy < 18 * 18) return;
    let a = Math.atan2(dy, dx);
    if (a > -MIN_ANG && a <= Math.PI / 2) a = -MIN_ANG;
    else if (a > Math.PI / 2 || a < -Math.PI + MIN_ANG) a = -Math.PI + MIN_ANG;
    aimAng = a;
    aimValid = true;
    computeAim();
  }

  function computeAim() {
    ghost.x = launchX;
    ghost.y = LAUNCH_Y;
    ghost.vx = Math.cos(aimAng) * SPEED;
    ghost.vy = Math.sin(aimAng) * SPEED;
    aimPts[0] = ghost.x;
    aimPts[1] = ghost.y;
    aimN = 1;
    const h = 3 / SPEED;
    let after = -1;
    const wasPulled = pulled;
    pulled = false;
    for (let i = 0; i < 1200; i++) {
      const hit = stepBall(ghost, h, false);
      if (after >= 0) {
        after += 3;
        if (hit || after >= 170) break;
      } else if (hit) {
        aimPts[aimN * 2] = ghost.x;
        aimPts[aimN * 2 + 1] = ghost.y;
        aimN++;
        after = 0;
      }
      if (ghost.y >= LAUNCH_Y && ghost.vy > 0) break;
    }
    aimPts[aimN * 2] = ghost.x;
    aimPts[aimN * 2 + 1] = ghost.y;
    aimN++;
    pulled = wasPulled;
  }

  // ---------- per-frame visuals ----------
  function animate(dt) {
    t += dt;
    for (let i = 0; i < grid.length; i++) {
      const o = grid[i];
      if (!o) continue;
      if (o.hitT > 0) o.hitT = Math.max(0, o.hitT - dt * 7);
      if (o.born < 1) o.born = Math.min(1, o.born + dt * 3.2);
      if (o.type === PICKUP) o.ph += dt;
    }
    launchVis += (launchX - launchVis) * Math.min(1, dt * 14);
    if (countPop > 0) countPop = Math.max(0, countPop - dt * 4);
    if (speedPop > 0) speedPop = Math.max(0, speedPop - dt * 4);
    if (turnPop > 0) turnPop = Math.max(0, turnPop - dt * 3);
    if (firedOnce && hintA > 0) hintA = Math.max(0, hintA - dt * 3);
    if (deadT >= 0) deadT += dt;
  }

  function speedUp(auto) {
    if (speed >= 3) return;
    speed += 1;
    speedPop = 1;
    if (!auto) sfx.play('swipe');
    else sfx.tone({ freq: 500, to: 900, type: 'sine', dur: 0.12, vol: 0.08 });
  }

  reset();

  // Read-only snapshot for automated tests (harness bots, determinism checks).
  api.__state = () => ({
    phase,
    turn,
    ballCount,
    launchX,
    speed,
    rows: Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const o = grid[r * COLS + c];
        return !o ? '.' : o.type === PICKUP ? '+' : `${o.hp}${o.shape ? 't' + o.shape : ''}`;
      }).join(' '),
    ),
  });

  // ---------- rendering ----------
  function drawBrick(g, o, x, y) {
    const pop = o.born < 1 ? ease.outBack(o.born) : 1;
    const sc = pop * (1 - o.hitT * 0.07);
    const scaled = sc !== 1;
    if (scaled) {
      g.save();
      g.translate(x + S / 2, y + S / 2);
      g.scale(sc, sc);
      g.translate(-x - S / 2, -y - S / 2);
      if (o.born < 1) g.globalAlpha = Math.min(1, o.born * 2);
    }
    // soft glow
    g.fillStyle = GLOW[o.bucket];
    shapePath(g, o.shape, x - 3, y - 2, S + 6, S + 6);
    g.fill();
    // extruded base + face
    g.fillStyle = DARK[o.bucket];
    shapePath(g, o.shape, x, y + 4, S, S - 4);
    g.fill();
    g.fillStyle = FILL[o.bucket];
    shapePath(g, o.shape, x, y, S, S - 4);
    g.fill();
    // highlight
    g.fillStyle = 'rgba(255,255,255,0.26)';
    if (o.shape === 0) {
      g.beginPath();
      g.roundRect ? g.roundRect(x + 6, y + 4, S - 12, 5, 2.5) : g.rect(x + 6, y + 4, S - 12, 5);
      g.fill();
    }
    if (o.hitT > 0) {
      g.globalAlpha = o.hitT * 0.6;
      g.fillStyle = '#ffffff';
      shapePath(g, o.shape, x, y, S, S - 4);
      g.fill();
      g.globalAlpha = 1;
    }
    if (o.glow > 0 || (dangerCount > 0 && y > FY + (ROWS - 2.5) * CS && y < FY + (ROWS - 1) * CS)) {
      const a = o.glow > 0 ? 0.6 + 0.4 * Math.sin(t * 20) : 0.35 + 0.35 * Math.sin(t * 8);
      g.globalAlpha = Math.max(0, a);
      g.strokeStyle = '#ff2d55';
      g.lineWidth = 3;
      shapePath(g, o.shape, x - 1, y - 1, S + 2, S + 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    // number
    let lx = x + S / 2;
    let ly = y + S / 2 - 1;
    if (o.shape === 0) g.font = o.hp >= 1000 ? F_SMALL : o.hp >= 100 ? F_MID : F_BIG;
    else {
      const v = TRI[o.shape];
      lx = x + ((v[0] + v[2] + v[4]) / 3) * S;
      ly = y + ((v[1] + v[3] + v[5]) / 3) * (S - 4);
      g.font = o.hp >= 100 ? F_TRI_S : F_TRI;
    }
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillText(o.label, lx, ly + 2);
    g.fillStyle = '#ffffff';
    g.fillText(o.label, lx, ly);
    if (scaled) g.restore();
  }

  function drawPickup(g, o, cx, cy) {
    const pop = o.born < 1 ? ease.outBack(o.born) : 1;
    const pulse = 1 + 0.12 * Math.sin(o.ph * 6);
    const r = PR * pop * pulse;
    g.fillStyle = 'rgba(167,243,208,0.12)';
    g.beginPath();
    g.arc(cx, cy, r + 8, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#a7f3d0';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx, cy, 5.5 * pop, 0, Math.PI * 2);
    g.fill();
    // orbiting sparkle
    const a = o.ph * 3;
    g.fillStyle = '#ffffff';
    g.fillRect(cx + Math.cos(a) * r - 1.5, cy + Math.sin(a) * r - 1.5, 3, 3);
  }

  function drawAim(g) {
    if (aimN < 2) return;
    const spacing = 15;
    let off = (t * 45) % spacing;
    let dotI = 0;
    for (let s = 0; s < aimN - 1; s++) {
      const x0 = aimPts[s * 2];
      const y0 = aimPts[s * 2 + 1];
      const x1 = aimPts[s * 2 + 2];
      const y1 = aimPts[s * 2 + 3];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) continue;
      const alpha = s === 0 ? 0.95 : 0.45;
      g.fillStyle = s === 0 ? '#ffffff' : '#a5f3fc';
      g.beginPath();
      for (let d = off; d < len; d += spacing) {
        const k = d / len;
        const rr = Math.max(1.6, 3.4 - dotI * 0.03) * (s === 0 ? 1 : 0.85);
        const px = x0 + dx * k;
        const py = y0 + dy * k;
        if (s === 0 && d < 16) continue;
        g.moveTo(px + rr, py);
        g.arc(px, py, rr, 0, Math.PI * 2);
        dotI++;
      }
      g.globalAlpha = alpha;
      g.fill();
      g.globalAlpha = 1;
      off = (off - len) % spacing;
      if (off < 0) off += spacing;
    }
    if (aimN >= 3) {
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(aimPts[2], aimPts[3], BR, 0, Math.PI * 2);
      g.stroke();
    }
  }

  function drawBackground(g) {
    if (!bgGrad) {
      bgGrad = g.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#171238');
      bgGrad.addColorStop(0.55, '#110d2a');
      bgGrad.addColorStop(1, '#0b0820');
    }
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, W, H);
    // field
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.fillRect(FX, FY, FW, FLOOR - FY);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let r = 1; r < ROWS; r++) {
      for (let c = 1; c < COLS; c++) g.fillRect(FX + c * CS - 1, FY + r * CS - 1, 2, 2);
    }
    // walls
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(FX - 3, FY - 3, 3, FLOOR - FY + 3);
    g.fillRect(FX + FW, FY - 3, 3, FLOOR - FY + 3);
    g.fillRect(FX - 3, FY - 3, FW + 6, 3);
    // danger zone (last row)
    const dy = FY + (ROWS - 1) * CS;
    const danger = dangerCount > 0 || phase === 'dead';
    const a = danger ? 0.16 + 0.1 * Math.sin(t * 7) : 0.05;
    g.fillStyle = `rgba(255,45,85,${a.toFixed(3)})`;
    g.fillRect(FX, dy, FW, CS);
    g.strokeStyle = danger ? 'rgba(255,45,85,0.8)' : 'rgba(255,45,85,0.28)';
    g.lineWidth = 2;
    g.setLineDash([8, 8]);
    g.lineDashOffset = -t * 20;
    g.beginPath();
    g.moveTo(FX, dy);
    g.lineTo(FX + FW, dy);
    g.stroke();
    g.setLineDash([]);
    // floor
    g.fillStyle = 'rgba(103,232,249,0.55)';
    g.fillRect(FX - 3, FLOOR, FW + 6, 3);
    g.fillStyle = 'rgba(103,232,249,0.08)';
    g.fillRect(FX - 3, FLOOR + 3, FW + 6, 10);
  }

  function drawBalls(g) {
    if (phase !== 'fire') return;
    // trails
    g.strokeStyle = 'rgba(165,243,252,0.22)';
    g.lineWidth = BR * 1.3;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < fired; i++) {
      const b = balls[i];
      if (b.st !== 1) continue;
      g.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
      g.lineTo(b.x, b.y);
    }
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < fired; i++) {
      const b = balls[i];
      if (b.st === 0 || b.st === 3) continue;
      g.moveTo(b.x + BR, b.y);
      g.arc(b.x, b.y, BR, 0, Math.PI * 2);
    }
    g.fill();
    g.lineCap = 'butt';
  }

  function drawLauncher(g) {
    const firing = phase === 'fire';
    const remaining = firing ? ballCount - fired : ballCount;
    const x = launchVis;
    const showMain = !firing || remaining > 0;
    if (showMain) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      g.strokeStyle = `rgba(103,232,249,${(0.25 + pulse * 0.35).toFixed(3)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, LAUNCH_Y, BR + 5 + pulse * 3, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x, LAUNCH_Y, BR + 1, 0, Math.PI * 2);
      g.fill();
      // direction chevron
      if (phase === 'aim' && (aiming || hoverAim || kbAim) && aimValid) {
        g.save();
        g.translate(x, LAUNCH_Y);
        g.rotate(aimAng);
        g.fillStyle = '#67e8f9';
        g.beginPath();
        g.moveTo(BR + 14, 0);
        g.lineTo(BR + 6, -6);
        g.lineTo(BR + 6, 6);
        g.closePath();
        g.fill();
        g.restore();
      }
      const s = 1 + countPop * 0.35;
      const lx = clamp(x, 34, W - 34);
      draw.text(g, `×${remaining}`, lx, FLOOR + 26, { size: 20 * s, weight: 800, color: '#ffffff', shadow: false });
    }
    if (firing && firstBack) {
      let home = 0;
      for (let i = 0; i < fired; i++) if (balls[i].st === 3) home++;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(nextX, LAUNCH_Y, BR + 1, 0, Math.PI * 2);
      g.fill();
      if (home > 0) draw.text(g, `×${home}`, clamp(nextX, 34, W - 34), FLOOR + 26, { size: 18 * (1 + countPop * 0.3), weight: 800, color: '#a5f3fc', shadow: false });
    }
  }

  function drawHud(g) {
    const s = 1 + ease.outQuad(turnPop) * 0.3;
    g.save();
    g.translate(W / 2, 52);
    g.scale(s, s);
    draw.text(g, label(turn), 0, 0, { size: 50, weight: 800, color: '#ffffff', shadow: 'rgba(0,0,0,0.45)' });
    g.restore();
    draw.text(g, 'TURN', W / 2, 88, { size: 13, weight: 800, color: 'rgba(255,255,255,0.55)', shadow: false });
    // balls owned (top-left)
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(30, 40, 7, 0, Math.PI * 2);
    g.fill();
    draw.text(g, label(ballCount), 44, 41, { size: 22, weight: 800, align: 'left', color: '#ffffff', shadow: false });
    if (api.best != null) draw.text(g, `BEST ${api.best}`, 22, 74, { size: 13, weight: 800, align: 'left', color: 'rgba(255,255,255,0.5)', shadow: false });
    // speed indicator
    if (phase === 'fire') {
      const show = volleyT > 1.1 || speed > 1;
      if (show) {
        const sc = 1 + speedPop * 0.35;
        const bx = W / 2;
        const by = FLOOR + 50;
        g.save();
        g.translate(bx, by);
        g.scale(sc, sc);
        const on = speed > 1;
        draw.roundRect(g, -58, -13, 116, 26, 13, on ? 'rgba(103,232,249,0.22)' : 'rgba(255,255,255,0.08)');
        draw.text(g, speed >= 3 ? '▶▶▶ 3× SPEED' : speed === 2 ? '▶▶ 2× SPEED' : 'TAP TO SPEED UP', 0, 1, { size: 12, weight: 800, color: on ? '#a5f3fc' : 'rgba(255,255,255,0.7)', shadow: false });
        g.restore();
      }
    }
    if (hintA > 0 && phase === 'aim') {
      const a = hintA * (0.75 + 0.25 * Math.sin(t * 4));
      draw.text(g, 'DRAG TO AIM', W / 2, FY + CS * 5.4, { size: 26, weight: 800, color: '#ffffff', alpha: a });
      draw.text(g, 'release to fire the volley', W / 2, FY + CS * 5.4 + 30, { size: 16, weight: 700, color: '#a5f3fc', alpha: a, shadow: false });
      // ghost aim line sweeping from the launcher demonstrates the gesture
      if (!aiming && !hoverAim && !kbAim) {
        const a = -Math.PI / 2 + Math.sin(t * 1.3) * 0.75;
        g.fillStyle = '#ffffff';
        g.beginPath();
        for (let d = 24; d < 168; d += 15) {
          const rr = 3 - d * 0.008;
          const px = launchVis + Math.cos(a) * d;
          const py = LAUNCH_Y + Math.sin(a) * d;
          g.moveTo(px + rr, py);
          g.arc(px, py, rr, 0, Math.PI * 2);
        }
        g.globalAlpha = hintA * 0.45;
        g.fill();
        // fingertip at the end of the line
        const fx0 = launchVis + Math.cos(a) * 184;
        const fy0 = LAUNCH_Y + Math.sin(a) * 184;
        g.globalAlpha = hintA * 0.8;
        g.strokeStyle = '#a5f3fc';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(fx0, fy0, 13 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
    }
  }

  // ---------- demo autopilot ----------
  // Only runs when the engine calls demo() (attract mode / preview clips). Each turn it
  // "thinks" for a few frames, test-firing candidate angles on a copy of the wall (the game's
  // own collision code, no damage to the real bricks), scores them (bricks broken, damage,
  // extra balls, and above all clearing the row about to reach the floor), then drags the aim
  // line smoothly to the best angle, holds a beat and releases. Long volleys get a tap or two
  // to speed them up, like an impatient player. Its own PRNG keeps api.rng untouched.
  const PA_N = 56; // coarse candidate angles
  const PA_FINE = 9; // refinement candidates around the best coarse one
  const PA_PER_FRAME = 3;
  const PA_BALLS = 12;
  const PA_TIME = 3.2; // simulated seconds per test volley
  const simHp = new Int32Array(COLS * ROWS);
  const simBalls = [];
  for (let i = 0; i < PA_BALLS; i++) simBalls.push({ x: 0, y: 0, vx: 0, vy: 0, st: 0 });
  let pRand = mulberry32(0xb41c);
  const pilot = { stage: 'idle', wait: 0, k: 0, best: 0, bestV: -Infinity, coarse: 0, from: 0, to: 0, t: 0, dur: 0, hold: 0, taps: 0, tapAt: 0 };

  function pilotReset() {
    pRand = mulberry32(0xb41c);
    pilot.stage = 'idle';
    pilot.taps = 0;
  }

  function simStep(b, h, m) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    let hit = false;
    if (b.x < FX + BR) {
      b.x = FX + BR;
      if (b.vx < 0) (b.vx = -b.vx), (hit = true);
    } else if (b.x > FX + FW - BR) {
      b.x = FX + FW - BR;
      if (b.vx > 0) (b.vx = -b.vx), (hit = true);
    }
    if (b.y < FY + BR) {
      b.y = FY + BR;
      if (b.vy < 0) (b.vy = -b.vy), (hit = true);
    }
    const cc = Math.floor((b.x - FX) / CS);
    const rr = Math.floor((b.y - FY) / CS);
    for (let r = rr - 1; r <= rr + 1; r++) {
      if (r < 0 || r >= ROWS) continue;
      for (let c = cc - 1; c <= cc + 1; c++) {
        if (c < 0 || c >= COLS) continue;
        const i = r * COLS + c;
        const v = simHp[i];
        if (v > 0) {
          if (collideBrick(b, grid[i], r, c)) {
            hit = true;
            simHp[i] = v - 1;
            m.dmg += r >= ROWS - 3 ? 2 : 1;
            if (v === 1) {
              m.broken++;
              m.brokenW += r >= ROWS - 2 ? 60 : r >= ROWS - 3 ? 12 : r >= ROWS - 4 ? 5 : 2;
            }
          }
        } else if (v < 0) {
          const dx = b.x - (FX + (c + 0.5) * CS);
          const dy = b.y - (FY + (r + 0.5) * CS);
          if (dx * dx + dy * dy < (BR + PR) * (BR + PR)) {
            simHp[i] = 0;
            m.picks++;
          }
        }
      }
    }
    if (hit) normalize(b);
  }

  const simM = { dmg: 0, broken: 0, brokenW: 0, picks: 0 };
  // test-fire a volley at angle a on a copy of the wall and score the outcome
  function evalAngle(a) {
    for (let i = 0; i < grid.length; i++) {
      const o = grid[i];
      simHp[i] = !o ? 0 : o.type === BRICK ? o.hp : -1;
    }
    simM.dmg = simM.broken = simM.brokenW = simM.picks = 0;
    const n = Math.min(ballCount, PA_BALLS);
    const h = 3.4 / SPEED;
    const vx = Math.cos(a) * SPEED;
    const vy = Math.sin(a) * SPEED;
    let launched = 0;
    let acc = FIRE_GAP;
    for (let st = 0, tt = 0; tt < PA_TIME; st++, tt += h) {
      acc += h;
      if (launched < n && acc >= FIRE_GAP) {
        acc -= FIRE_GAP;
        const b = simBalls[launched++];
        b.x = launchX;
        b.y = LAUNCH_Y;
        b.vx = vx;
        b.vy = vy;
        b.st = 1;
      }
      let active = launched < n;
      for (let i = 0; i < launched; i++) {
        const b = simBalls[i];
        if (b.st !== 1) continue;
        simStep(b, h, simM);
        if (b.y >= LAUNCH_Y && b.vy > 0) b.st = 2;
        else active = true;
      }
      if (!active) break;
    }
    // what is left near the floor after this volley decides whether we survive the next shift
    let left = 0;
    for (let c = 0; c < COLS; c++) {
      if (simHp[(ROWS - 2) * COLS + c] > 0) left += 400;
      if (simHp[(ROWS - 3) * COLS + c] > 0) left += 4 + simHp[(ROWS - 3) * COLS + c] * 0.5;
    }
    // balls fired beyond the simulated ones repeat the last ones' work, roughly
    const scale = ballCount > n ? 1 + ((ballCount - n) / n) * 0.5 : 1;
    return simM.brokenW * scale + simM.dmg * 0.35 * scale + simM.picks * 9 - left;
  }

  const candAngle = (k) => -Math.PI + MIN_ANG + ((Math.PI - 2 * MIN_ANG) * (k + 0.5)) / PA_N;

  // the finger sits on the aim line, a little way out from the launcher; these mirror what
  // input() does for a pointer down / move / up while aiming
  const aimPX = (a) => launchX + Math.cos(a) * 230;
  const aimPY = (a) => LAUNCH_Y + Math.sin(a) * 230;
  function fingerDown(a) {
    aiming = true;
    kbAim = false;
    setAimFrom(aimPX(a), aimPY(a));
  }
  function fingerMove(a) {
    if (aiming) setAimFrom(aimPX(a), aimPY(a));
  }
  function fingerUp(a) {
    aiming = false;
    setAimFrom(aimPX(a), aimPY(a));
    if (aimValid) fire();
  }

  function demo(dt) {
    if (phase === 'fire') {
      pilot.stage = 'idle';
      // tap to speed up the volley, like an impatient player (same as a tap during a volley)
      if (speed < 3 && volleyT > pilot.tapAt) {
        if (volleyT > 0.35) speedUp(false);
        pilot.tapAt = volleyT + 0.8 + pRand() * 0.5;
      }
      return;
    }
    if (phase !== 'aim') {
      pilot.stage = 'idle';
      return;
    }
    if (pilot.stage === 'done') pilot.stage = 'idle'; // the release did not fire: aim again
    if (pilot.stage === 'idle') {
      pilot.stage = 'think';
      pilot.wait = 0.12 + pRand() * 0.15;
      pilot.k = 0;
      pilot.bestV = -Infinity;
      pilot.tapAt = 0.7 + pRand() * 0.4;
    }
    if (pilot.stage === 'think') {
      pilot.wait -= dt;
      for (let q = 0; q < PA_PER_FRAME && pilot.k < PA_N + PA_FINE; q++, pilot.k++) {
        let a;
        if (pilot.k < PA_N) a = candAngle(pilot.k);
        else {
          if (pilot.k === PA_N) pilot.coarse = pilot.best;
          const step = (Math.PI - 2 * MIN_ANG) / PA_N;
          a = clamp(pilot.coarse + (pilot.k - PA_N - (PA_FINE - 1) / 2) * (step / (PA_FINE - 1)) * 1.6, -Math.PI + MIN_ANG, -MIN_ANG);
        }
        // a slight preference for steeper shots when outcomes tie (they read better)
        const v = evalAngle(a) - Math.abs(a + Math.PI / 2) * 0.4;
        if (v > pilot.bestV) {
          pilot.bestV = v;
          pilot.best = a;
        }
      }
      if (pilot.k >= PA_N + PA_FINE && pilot.wait <= 0) {
        // put a finger down roughly where the last shot went and sweep over to the target
        pilot.from = clamp(aimAng + (pRand() - 0.5) * 0.5, -Math.PI + MIN_ANG, -MIN_ANG);
        pilot.to = pilot.best;
        pilot.t = 0;
        pilot.dur = 0.35 + Math.min(0.35, Math.abs(pilot.to - pilot.from) * 0.3) + pRand() * 0.12;
        pilot.hold = 0.12 + pRand() * 0.14;
        pilot.stage = 'drag';
        fingerDown(pilot.from);
      }
      return;
    }
    if (pilot.stage === 'drag') {
      pilot.t += dt;
      const k = Math.min(1, pilot.t / pilot.dur);
      // ease in-out with a touch of overshoot that settles, like a thumb homing in
      const e = k < 1 ? ease.inOutQuad(k) + Math.sin(k * Math.PI) * 0.06 : 1;
      fingerMove(pilot.from + (pilot.to - pilot.from) * e);
      if (k >= 1) {
        pilot.hold -= dt;
        if (pilot.hold <= 0) {
          fingerUp(pilot.to);
          pilot.stage = 'done';
        }
      }
    }
  }

  return {
    hud: false,
    reset() {
      reset();
      pilotReset();
    },
    demo,
    update(dt) {
      animate(dt);
      if (phase === 'aim') {
        if (keyL || keyR) {
          aimAng += (keyR ? 1 : -1) * dt * 1.5;
          aimAng = clamp(aimAng, -Math.PI + MIN_ANG, -MIN_ANG);
          aimValid = true;
          computeAim();
        }
      } else if (phase === 'fire') {
        volleyT += dt;
        if (volleyT > 5 && speed < 2) speedUp(true);
        if (volleyT > 10 && speed < 3) speedUp(true);
        if (volleyT > 22) pulled = true;
        simulate(dt * speed);
      } else if (phase === 'shift') {
        shiftP += dt / SHIFT_DUR;
        if (shiftP >= 1) finishShift();
      }
    },
    idle(dt) {
      animate(dt);
    },
    input(e) {
      if (e.type === 'down') {
        if (phase === 'fire') {
          if (volleyT > 0.35) speedUp(false);
          return true;
        }
        if (phase !== 'aim') return true;
        aiming = true;
        kbAim = false;
        setAimFrom(e.x, e.y);
        return true;
      }
      if (e.type === 'move') {
        if (phase !== 'aim') return false;
        if (aiming) setAimFrom(e.x, e.y);
        else if (!e.pressed && e.y < FLOOR + 10 && e.y > FY) {
          hoverAim = true;
          setAimFrom(e.x, e.y);
        }
        return true;
      }
      if (e.type === 'up') {
        if (phase === 'aim' && aiming) {
          aiming = false;
          setAimFrom(e.x, e.y);
          if (aimValid) fire();
        }
        return true;
      }
      if (e.type === 'keydown') {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
          keyL = true;
          kbAim = true;
          if (!aimValid) (aimValid = true), computeAim();
          return true;
        }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') {
          keyR = true;
          kbAim = true;
          if (!aimValid) (aimValid = true), computeAim();
          return true;
        }
        if (api.isTapKey(k)) {
          if (e.repeat) return true;
          if (phase === 'fire') speedUp(false);
          else if (phase === 'aim') {
            if (!aimValid) {
              aimValid = true;
              computeAim();
            }
            fire();
          }
          return true;
        }
        return false;
      }
      if (e.type === 'keyup') {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyL = false;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') keyR = false;
        return false;
      }
      return false;
    },
    revive() {
      for (let r = ROWS - 3; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const o = grid[r * COLS + c];
          if (!o) continue;
          const cx = FX + (c + 0.5) * CS;
          const cy = FY + (r + 0.5) * CS;
          if (o.type === BRICK) fx.burst(cx, cy, { count: 14, colors: [FILL[o.bucket], LIGHT[o.bucket], '#ffffff'], shape: 'square', speed: 300, size: 7, life: 0.8, gravity: 800 });
          else ballCount++;
          grid[r * COLS + c] = null;
        }
      }
      fx.ring(W / 2, FY + (ROWS - 1.5) * CS, { color: '#67e8f9', radius: 260, life: 0.6, width: 8 });
      fx.flash('#67e8f9', 0.25);
      fx.shake(8, 0.3);
      sfx.play('whoosh');
      sfx.play('levelup');
      phase = 'aim';
      deadT = -1;
      dangerCount = 0;
      speed = 1;
      pulled = false;
      aiming = false;
      aimValid = false;
    },
    render(g) {
      drawBackground(g);
      // bricks and pickups
      const off = phase === 'shift' ? -CS * (1 - ease.outCubic(Math.min(1, shiftP))) : 0;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const o = grid[r * COLS + c];
          if (!o) continue;
          const x = FX + c * CS + GAP;
          const y = FY + r * CS + GAP + off;
          if (o.type === BRICK) drawBrick(g, o, x, y);
          else drawPickup(g, o, x + S / 2, y + S / 2);
        }
      }
      if (phase === 'aim' && (aiming || hoverAim || kbAim) && aimValid) drawAim(g);
      drawBalls(g);
      drawLauncher(g);
      drawHud(g);
    },
  };
}

/** Cover art: a volley of balls ricocheting into a wall of glowing bricks (text-free). */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1d1450');
  grad.addColorStop(1, '#0a0720');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = h / 600;
  const cs = 78 * s;
  const cols = Math.ceil(w / cs) + 1;
  const ox = (w - cols * cs) / 2;
  // light rays
  g.save();
  g.globalCompositeOperation = 'lighter';
  const rg = g.createRadialGradient(w * 0.5, h * 1.05, 10, w * 0.5, h * 1.05, h * 1.1);
  rg.addColorStop(0, 'rgba(103,232,249,0.35)');
  rg.addColorStop(1, 'rgba(103,232,249,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  g.restore();
  // brick wall (deterministic pattern)
  const pattern = [
    [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [0, 1, 1, 3, 0, 1, 1, 1, 0, 2, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 4, 0, 1, 1, 0, 1, 5, 1, 0, 1, 1, 0],
    [0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
  ];
  const tones = [7, 5, 6, 4, 3, 2, 5, 6, 4, 7, 3, 5, 6, 2, 4, 5, 7, 3];
  const bx = w * 0.62;
  const by = 26 * s + 3.5 * cs;
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < cols; c++) {
      const v = pattern[r][c % pattern[r].length];
      if (!v) continue;
      // the brick being shattered is gone
      if (Math.abs(ox + (c + 0.5) * cs - bx) < cs * 0.75 && Math.abs(26 * s + (r + 0.5) * cs - by) < cs * 0.75) continue;
      const bi = Math.min(NB - 1, Math.round(((tones[(c + r * 3) % tones.length] - r * 0.9) / 7) * (NB - 1)));
      const b = Math.max(0, bi);
      const x = ox + c * cs + 4 * s;
      const y = 26 * s + r * cs;
      const sz = cs - 8 * s;
      const shape = v >= 2 && v <= 5 ? v - 1 : 0;
      g.fillStyle = GLOW[b];
      shapePath(g, shape, x - 4 * s, y - 3 * s, sz + 8 * s, sz + 8 * s);
      g.fill();
      g.fillStyle = DARK[b];
      shapePath(g, shape, x, y + 6 * s, sz, sz - 6 * s);
      g.fill();
      g.fillStyle = FILL[b];
      shapePath(g, shape, x, y, sz, sz - 6 * s);
      g.fill();
      if (shape === 0) {
        g.fillStyle = 'rgba(255,255,255,0.28)';
        g.fillRect(x + 9 * s, y + 6 * s, sz - 18 * s, 7 * s);
        // pips instead of numbers (text-free)
        g.fillStyle = 'rgba(255,255,255,0.9)';
        const pips = 1 + ((c + r) % 3);
        for (let p = 0; p < pips; p++) {
          g.beginPath();
          g.arc(x + sz / 2 + (p - (pips - 1) / 2) * 13 * s, y + sz / 2, 4.2 * s, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
  // shattering brick
  const cols2 = [FILL[40], LIGHT[40], '#ffffff', FILL[30]];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + i * 0.37;
    const d = (24 + ((i * 53) % 60)) * s;
    g.save();
    g.translate(bx + Math.cos(a) * d, by + Math.sin(a) * d * 0.8);
    g.rotate(a * 2);
    g.fillStyle = cols2[i % cols2.length];
    const q = (6 + (i % 4) * 2) * s;
    g.fillRect(-q / 2, -q / 2, q, q * 0.7);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 4 * s;
  g.beginPath();
  g.arc(bx, by, 44 * s, 0, Math.PI * 2);
  g.stroke();
  // launcher and volley path
  const lx = w * 0.3;
  const ly = h - 44 * s;
  const tx = bx;
  const ty = by;
  const n = 11;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(103,232,249,0.28)';
  g.lineWidth = 16 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(lx, ly);
  g.lineTo(tx, ty);
  g.stroke();
  g.restore();
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const k = 0.18 + (i / n) * 0.72;
    const gl = g.createRadialGradient(lx + (tx - lx) * k, ly + (ty - ly) * k, 0, lx + (tx - lx) * k, ly + (ty - ly) * k, 26 * s);
    gl.addColorStop(0, 'rgba(165,243,252,0.35)');
    gl.addColorStop(1, 'rgba(165,243,252,0)');
    g.fillStyle = gl;
    g.fillRect(lx + (tx - lx) * k - 26 * s, ly + (ty - ly) * k - 26 * s, 52 * s, 52 * s);
  }
  g.restore();
  for (let i = 0; i < n; i++) {
    const k = 0.18 + (i / n) * 0.72;
    const x = lx + (tx - lx) * k;
    const y = ly + (ty - ly) * k;
    const r = 11 * s;
    g.fillStyle = 'rgba(165,243,252,0.25)';
    g.beginPath();
    g.arc(x + (lx - tx) * 0.03, y + (ly - ty) * 0.03, r * 1.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // dotted rebound preview
  g.fillStyle = 'rgba(255,255,255,0.8)';
  const rx = bx + (bx - lx) * 0.2;
  for (let i = 1; i < 9; i++) {
    const k = i / 9;
    g.beginPath();
    g.arc(bx + (rx + 160 * s - bx) * k, by + (by + 150 * s - by) * k * 0.9, 4.5 * s * (1 - k * 0.5), 0, Math.PI * 2);
    g.fill();
  }
  // floor + launcher
  g.fillStyle = 'rgba(103,232,249,0.7)';
  g.fillRect(0, ly + 16 * s, w, 5 * s);
  g.strokeStyle = 'rgba(103,232,249,0.8)';
  g.lineWidth = 4 * s;
  g.beginPath();
  g.arc(lx, ly, 22 * s, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(lx, ly, 13 * s, 0, Math.PI * 2);
  g.fill();
}
