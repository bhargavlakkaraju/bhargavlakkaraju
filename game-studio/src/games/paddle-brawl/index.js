// Paddle Brawl - four-way pong for 1 to 4 players on one screen, one button each.
//
// Every seat defends one wall of a neon court: P1 bottom, P2 right, P3 top, P4 left. The four
// corners are solid blocks (the corner buttons sit on them). Your paddle slides along your
// goal on its own: tap to reverse it, hold to slow it down for precision. Three lives each;
// a ball in your goal costs one, and at zero your goal is walled off and you are out. Balls
// speed up, a second ball joins after 8 seconds and a third one later. Last paddle standing
// takes the crown.
import { createParty } from '../engine/party.js';

const TAU = Math.PI * 2;
const W = 420;
const H = 740;
const X0 = 12;
const X1 = 408;
const Y0 = 72;
const Y1 = 668;
const CB = 108; // corner block size
const CX = 210;
const CY = 370;
const GOAL = 186; // side goal length (the top and bottom goals span the gap between the blocks)
const PT = 12; // paddle thickness
const PL = 58; // paddle length
const INSET = 18; // paddle center distance from its goal line
const FAST = 250;
const SLOW = 82;
const BR = 8;
const LIVES = 3;
const BASE_SPEED = 265;
const MAX_SPEED = 620;
const SERVE_T = 0.75;
const MIN_AXIS = 0.3; // no ball may travel (almost) parallel to a wall

const MULTI = { id: 'multiball', name: 'MULTIBALL', desc: 'Three balls from the start', emoji: '🔴' };
const PINBALL = { id: 'pinball', name: 'PINBALL', desc: 'Bumpers in the middle kick balls faster', emoji: '🎱' };

// axis 0: goal on a horizontal wall (paddle slides along x); axis 1: vertical wall (along y).
// sgn: direction from the goal line into the court on the other axis.
const SIDES = [
  { i: 0, axis: 0, line: Y1, sgn: -1, lo: CB, hi: W - CB },
  { i: 1, axis: 1, line: X1, sgn: -1, lo: CY - GOAL / 2, hi: CY + GOAL / 2 },
  { i: 2, axis: 0, line: Y0, sgn: 1, lo: CB, hi: W - CB },
  { i: 3, axis: 1, line: X0, sgn: 1, lo: CY - GOAL / 2, hi: CY + GOAL / 2 },
];
const BLOCKS = [
  [0, 0, CB, CB, 3],
  [W - CB, 0, W, CB, 2],
  [0, H - CB, CB, H, 0],
  [W - CB, H - CB, W, H, 1],
];
const BUMPERS = [
  { x: CX, y: CY - 92, r: 20 },
  { x: CX - 84, y: CY + 58, r: 20 },
  { x: CX + 84, y: CY + 58, r: 20 },
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

let GLOWS = new Map();
function glow(color, size = 64) {
  const key = color + size;
  if (GLOWS.has(key)) return GLOWS.get(key);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  gr.addColorStop(0, color);
  gr.addColorStop(0.35, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.5;
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  GLOWS.set(key, c);
  return c;
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.95);
  g.bezierCurveTo(x - s * 1.25, y + s * 0.1, x - s * 1.05, y - s * 0.95, x, y - s * 0.35);
  g.bezierCurveTo(x + s * 1.05, y - s * 0.95, x + s * 1.25, y + s * 0.1, x, y + s * 0.95);
  g.closePath();
}

// ---------- geometry helpers ----------
function paddleRect(side, pos, len) {
  if (side.axis === 0) return { cx: pos, cy: side.line + side.sgn * INSET, hx: len / 2, hy: PT / 2 };
  return { cx: side.line + side.sgn * INSET, cy: pos, hx: PT / 2, hy: len / 2 };
}

function heartSpot(side, k) {
  const off = (k - 1) * 30;
  if (side.axis === 0) return [CX + off, side.line + side.sgn * 62];
  return [side.line + side.sgn * 62, CY + off];
}

function normalize(b) {
  const m = Math.hypot(b.dx, b.dy) || 1;
  b.dx /= m;
  b.dy /= m;
  if (Math.abs(b.dx) < MIN_AXIS) b.dx = (b.dx < 0 ? -1 : 1) * MIN_AXIS;
  if (Math.abs(b.dy) < MIN_AXIS) b.dy = (b.dy < 0 ? -1 : 1) * MIN_AXIS;
  const m2 = Math.hypot(b.dx, b.dy);
  b.dx /= m2;
  b.dy /= m2;
}

// circle vs axis-aligned box: pushes the ball out and reflects it. Returns true on contact.
function bounceBox(b, x0, y0, x1, y1) {
  const qx = clamp(b.x, x0, x1);
  const qy = clamp(b.y, y0, y1);
  let nx = b.x - qx;
  let ny = b.y - qy;
  const d2 = nx * nx + ny * ny;
  if (d2 >= b.r * b.r) return false;
  let d = Math.sqrt(d2);
  if (d < 1e-6) {
    // center inside: push out along the shallowest axis
    const l = b.x - x0;
    const r = x1 - b.x;
    const t = b.y - y0;
    const bt = y1 - b.y;
    const m = Math.min(l, r, t, bt);
    nx = m === l ? -1 : m === r ? 1 : 0;
    ny = m === t ? -1 : m === bt ? 1 : 0;
    d = 0;
  } else {
    nx /= d;
    ny /= d;
  }
  b.x += nx * (b.r - d + 0.3);
  b.y += ny * (b.r - d + 0.3);
  const vn = b.dx * nx + b.dy * ny;
  if (vn < 0) {
    b.dx -= 2 * vn * nx;
    b.dy -= 2 * vn * ny;
  }
  return true;
}

// ---------- the game ----------
export default function createGame(api) {
  const S = {
    balls: [],
    serves: [],
    ballId: 0,
    t: 0,
    lastNow: 0,
    want: 1,
    speedLevel: 0,
    bumperFlash: [0, 0, 0],
    open: [false, false, false, false],
    closeAnim: [1, 1, 1, 1],
    hitFlash: [0, 0, 0, 0],
    lobby: true,
  };

  function newBall(x, y, dx, dy, spd, r, serve) {
    const b = { id: ++S.ballId, x, y, dx, dy, spd, r, serve, owner: -1, trail: [], idle: 0, bounces: 0 };
    normalize(b);
    return b;
  }

  function setup(ctx) {
    S.balls.length = 0;
    S.serves.length = 0;
    S.lobby = !ctx.active.length;
    S.twistId = ctx.twist.id;
    S.speedLevel = 0;
    S.bumperFlash = [0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const p = ctx.players[i];
      S.open[i] = p.active;
      S.closeAnim[i] = p.active ? 0 : 1;
      S.hitFlash[i] = 0;
      if (!p.active) continue;
      const side = SIDES[i];
      p.data = {
        pos: (side.lo + side.hi) / 2,
        dir: ctx.rng.chance(0.5) ? 1 : -1,
        vel: 0,
        lives: LIVES,
        pop: [0, 0, 0],
        turn: 0,
        bot: { think: 0, target: (side.lo + side.hi) / 2, err: 0, lastKey: '', hold: false, last: false, sk: ctx.rng.range(0.7, 1.4), daze: 0 },
      };
      syncPlayer(p, ctx);
    }
    if (S.lobby) {
      // attract mode: two balls bouncing around an empty court
      S.balls.push(newBall(CX - 60, CY - 80, 0.6, -0.8, 230, BR, 0));
      S.balls.push(newBall(CX + 70, CY + 90, -0.7, 0.7, 210, BR, 0));
      return;
    }
    S.want = ctx.twist.id === 'multiball' ? 3 : 1;
    for (let k = 0; k < S.want; k++) S.serves.push({ t: 0.45 + k * 0.55 });
  }

  function paddleLen(ctx) {
    return PL * Math.pow(ctx.size, 0.5);
  }

  function syncPlayer(p, ctx) {
    const side = SIDES[p.i];
    const d = p.data;
    const R = paddleRect(side, d.pos, paddleLen(ctx));
    // name tags / LIGHTS OUT center a little inside the court from the paddle
    if (side.axis === 0) {
      p.x = R.cx;
      p.y = R.cy + side.sgn * 40;
    } else {
      p.x = R.cx + side.sgn * 40;
      p.y = R.cy;
    }
  }

  // ---------- serving ----------
  function serve(ctx) {
    const alive = ctx.alive();
    if (alive.length < 1) return;
    const target = ctx.rng.pick(alive);
    const side = SIDES[target.i];
    const gx = side.axis === 0 ? CX : side.line;
    const gy = side.axis === 0 ? side.line : CY;
    // serve from the center spot, or beside it if another ball is already waiting there
    let sx = CX;
    for (const ox of [0, -44, 44]) {
      if (!S.balls.some((o) => o.serve > 0 && Math.abs(o.x - (CX + ox)) < 20 && Math.abs(o.y - CY) < 20)) {
        sx = CX + ox;
        break;
      }
    }
    const a = Math.atan2(gy - CY, gx - sx) + ctx.rng.range(-0.45, 0.45);
    const base = baseSpeed(ctx);
    const b = newBall(sx, CY, Math.cos(a), Math.sin(a), base, BR * ctx.size, SERVE_T);
    b.target = target.i;
    S.balls.push(b);
  }

  function baseSpeed(ctx) {
    return Math.min(MAX_SPEED * 0.9, BASE_SPEED + ctx.time * 10);
  }

  // ---------- sounds ----------
  function snd(name, k = 0) {
    const sfx = api.sfx;
    if (name === 'paddle') {
      sfx.tone({ freq: 420 + k * 0.9, to: 520 + k, type: 'square', dur: 0.07, vol: 0.09 });
      sfx.tone({ freq: 840 + k * 1.8, type: 'triangle', dur: 0.05, vol: 0.05, delay: 0.02 });
    } else if (name === 'wall') sfx.tone({ freq: 230, to: 190, type: 'triangle', dur: 0.05, vol: 0.07 });
    else if (name === 'block') sfx.tone({ freq: 170, to: 120, type: 'triangle', dur: 0.07, vol: 0.09 });
    else if (name === 'bumper') {
      sfx.tone({ freq: 700, to: 1200, type: 'square', dur: 0.08, vol: 0.07 });
      sfx.noise({ dur: 0.06, vol: 0.08, freq: 3000, type: 'bandpass', q: 2 });
    } else if (name === 'clack') sfx.tone({ freq: 620, to: 540, type: 'sine', dur: 0.05, vol: 0.08 });
    else if (name === 'goal') {
      sfx.noise({ dur: 0.4, vol: 0.3, freq: 1600, to: 120 });
      sfx.tone({ freq: 220, to: 55, type: 'sawtooth', dur: 0.4, vol: 0.13 });
    } else if (name === 'serve') sfx.noise({ dur: 0.2, vol: 0.12, freq: 500, to: 2600, type: 'bandpass', q: 1.5 });
    else if (name === 'turn') sfx.tone({ freq: 880, type: 'triangle', dur: 0.03, vol: 0.05 });
  }

  // ---------- ball physics ----------
  function stepBall(b, dt, ctx) {
    const n = Math.max(1, Math.ceil((b.spd * dt) / 5));
    const h = dt / n;
    for (let k = 0; k < n; k++) {
      b.x += b.dx * b.spd * h;
      b.y += b.dy * b.spd * h;
      if (collideWorld(b, ctx)) return true; // scored
    }
    return false;
  }

  // returns true if the ball went into a goal (and was consumed)
  function collideWorld(b, ctx) {
    const lobby = S.lobby;
    // side walls (x) between the blocks
    if (b.x - b.r < X0) {
      const s = SIDES[3];
      if (!lobby && S.open[3] && b.y > s.lo && b.y < s.hi) {
        if (b.x < X0 - b.r - 1) return goal(3, b, ctx);
      } else if (b.dx < 0 || b.x < X0 + b.r) {
        b.x = X0 + b.r;
        if (b.dx < 0) bounced(b, 'wall', -b.dx, b.dy);
      }
    } else if (b.x + b.r > X1) {
      const s = SIDES[1];
      if (!lobby && S.open[1] && b.y > s.lo && b.y < s.hi) {
        if (b.x > X1 + b.r + 1) return goal(1, b, ctx);
      } else {
        b.x = X1 - b.r;
        if (b.dx > 0) bounced(b, 'wall', -b.dx, b.dy);
      }
    }
    if (b.y - b.r < Y0) {
      if (!lobby && S.open[2] && b.x > CB && b.x < W - CB) {
        if (b.y < Y0 - b.r - 1) return goal(2, b, ctx);
      } else {
        b.y = Y0 + b.r;
        if (b.dy < 0) bounced(b, 'wall', b.dx, -b.dy);
      }
    } else if (b.y + b.r > Y1) {
      if (!lobby && S.open[0] && b.x > CB && b.x < W - CB) {
        if (b.y > Y1 + b.r + 1) return goal(0, b, ctx);
      } else {
        b.y = Y1 - b.r;
        if (b.dy > 0) bounced(b, 'wall', b.dx, -b.dy);
      }
    }
    // goal posts on the side walls
    for (const si of [1, 3]) {
      if (!S.open[si] || lobby) continue;
      const s = SIDES[si];
      for (const py of [s.lo, s.hi]) {
        const dx = b.x - s.line;
        const dy = b.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < b.r * b.r && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          b.x = s.line + nx * (b.r + 0.3);
          b.y = py + ny * (b.r + 0.3);
          const vn = b.dx * nx + b.dy * ny;
          if (vn < 0) bounced(b, 'wall', b.dx - 2 * vn * nx, b.dy - 2 * vn * ny);
        }
      }
    }
    // corner blocks
    for (const bl of BLOCKS) {
      if (bounceBox(b, bl[0], bl[1], bl[2], bl[3])) {
        normalize(b);
        b.bounces++;
        if (!lobby) {
          snd('block');
          ctx.fx.burst(b.x, b.y, { count: 4, color: '#9d8cff', speed: 90, life: 0.25, gravity: 0, size: 2 });
        }
      }
    }
    if (lobby) return false;
    // bumpers (PINBALL twist)
    if (S.twistId === 'pinball') {
      for (let k = 0; k < BUMPERS.length; k++) {
        const u = BUMPERS[k];
        const dx = b.x - u.x;
        const dy = b.y - u.y;
        const rr = u.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          b.x = u.x + nx * (rr + 0.5);
          b.y = u.y + ny * (rr + 0.5);
          const vn = b.dx * nx + b.dy * ny;
          if (vn < 0) {
            b.dx -= 2 * vn * nx;
            b.dy -= 2 * vn * ny;
          }
          normalize(b);
          b.spd = Math.min(MAX_SPEED, b.spd * 1.06);
          S.bumperFlash[k] = 1;
          snd('bumper');
          ctx.fx.burst(b.x, b.y, { count: 8, colors: ['#ff4fd8', '#ffffff'], speed: 160, life: 0.3, gravity: 0, size: 2.5 });
        }
      }
    }
    // paddles
    for (const p of ctx.active) {
      if (!p.alive) continue;
      paddleHit(b, p, ctx);
    }
    return false;
  }

  function bounced(b, kind, dx, dy) {
    b.dx = dx;
    b.dy = dy;
    normalize(b);
    b.bounces++;
    if (!S.lobby && kind === 'wall') snd('wall');
  }

  function paddleHit(b, p, ctx) {
    const side = SIDES[p.i];
    const d = p.data;
    const len = paddleLen(ctx);
    const R = paddleRect(side, d.pos, len);
    const qx = clamp(b.x, R.cx - R.hx, R.cx + R.hx);
    const qy = clamp(b.y, R.cy - R.hy, R.cy + R.hy);
    const ex = b.x - qx;
    const ey = b.y - qy;
    const d2 = ex * ex + ey * ey;
    if (d2 >= b.r * b.r) return;
    const nX = side.axis === 1 ? side.sgn : 0;
    const nY = side.axis === 0 ? side.sgn : 0;
    const front = side.axis === 0 ? (b.y - R.cy) * side.sgn : (b.x - R.cx) * side.sgn;
    const vn = b.dx * nX + b.dy * nY;
    if (front > 0) {
      if (vn >= 0) return; // already leaving
      const along = side.axis === 0 ? b.x - R.cx : b.y - R.cy;
      const off = clamp(along / (len / 2 + b.r * 0.5), -1, 1);
      let ang = off * 1.02 + clamp(d.vel / FAST, -1, 1) * 0.16;
      ang = clamp(ang, -1.15, 1.15);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      if (side.axis === 0) {
        b.dx = s;
        b.dy = side.sgn * c;
        b.y = R.cy + side.sgn * (R.hy + b.r + 0.4);
      } else {
        b.dx = side.sgn * c;
        b.dy = s;
        b.x = R.cx + side.sgn * (R.hx + b.r + 0.4);
      }
      normalize(b);
      b.spd = Math.min(MAX_SPEED, b.spd * 1.035);
      b.owner = p.i;
      b.idle = 0;
      b.bounces = 0;
      const edge = Math.abs(off) > 0.62;
      ctx.fx.burst(b.x, b.y, { count: edge ? 14 : 8, colors: [p.color, '#ffffff'], speed: edge ? 260 : 180, angle: Math.atan2(b.dy, b.dx), spread: 1.6, life: 0.3, gravity: 0, size: 2.5, shape: 'spark' });
      if (edge) ctx.fx.ring(b.x, b.y, { color: p.color, radius: 26, life: 0.25, width: 3 });
      d.flash = 1;
      snd('paddle', b.spd - BASE_SPEED);
      if (p.human) api.haptic(10);
      return;
    }
    // clipped the end or the back of the paddle
    const dd = Math.sqrt(d2) || 1;
    const ux = ex / dd;
    const uy = ey / dd;
    b.x = qx + ux * (b.r + 0.4);
    b.y = qy + uy * (b.r + 0.4);
    const v = b.dx * ux + b.dy * uy;
    if (v < 0) {
      b.dx -= 2 * v * ux;
      b.dy -= 2 * v * uy;
      normalize(b);
    }
  }

  function goal(i, b, ctx) {
    const p = ctx.players[i];
    const d = p.data;
    const side = SIDES[i];
    const gx = side.axis === 0 ? clamp(b.x, side.lo + 10, side.hi - 10) : side.line;
    const gy = side.axis === 0 ? side.line : clamp(b.y, side.lo + 10, side.hi - 10);
    d.lives -= 1;
    d.pop[d.lives] = 1;
    S.hitFlash[i] = 1;
    const [hx, hy] = heartSpot(side, d.lives);
    ctx.fx.burst(hx, hy, { count: 18, colors: [p.color, '#ffffff'], speed: 200, life: 0.6, gravity: 300, size: 3.5 });
    const into = side.axis === 0 ? Math.atan2(side.sgn, 0) : Math.atan2(0, side.sgn);
    ctx.fx.burst(gx, gy, { count: 30, colors: [p.color, '#ffffff', '#ffd23f'], speed: 340, angle: into, spread: 2.4, life: 0.6, gravity: 0, size: 4 });
    ctx.fx.ring(gx, gy, { color: p.color, radius: 90, life: 0.5, width: 6 });
    ctx.fx.flash(p.color, 0.32);
    ctx.fx.shake(11, 0.35);
    ctx.fx.text(hx, hy - 8, '-1', { color: '#ffffff', size: 30, stroke: 'rgba(0,0,0,0.5)' });
    snd('goal');
    if (p.human) api.haptic(35);
    S.balls.splice(S.balls.indexOf(b), 1);
    if (d.lives <= 0) {
      S.open[i] = false;
      ctx.eliminate(p, { x: gx, y: gy });
    }
    if (ctx.alive().length > 1) S.serves.push({ t: 0.7 });
    return true;
  }

  // ---------- paddles ----------
  function stepPaddle(p, dt, ctx) {
    const d = p.data;
    const side = SIDES[p.i];
    const len = paddleLen(ctx);
    const lo = side.lo + len / 2 + 2;
    const hi = side.hi - len / 2 - 2;
    if (p.tap) {
      d.dir = -d.dir;
      d.turn = 1;
      if (p.human) snd('turn');
    }
    const v = p.down ? SLOW : FAST;
    d.pos += d.dir * v * dt;
    if (d.pos < lo) {
      d.pos = lo;
      d.dir = 1;
    } else if (d.pos > hi) {
      d.pos = hi;
      d.dir = -1;
    }
    d.vel = d.dir * v;
    d.slow = p.down;
    syncPlayer(p, ctx);
  }

  function update(dt, ctx) {
    S.twistId = ctx.twist.id;
    for (const p of ctx.alive()) stepPaddle(p, dt, ctx);
    // how many balls should be in play
    let want = ctx.twist.id === 'multiball' ? 3 : 1;
    if (ctx.time > 8) want = Math.max(want, 2);
    if (ctx.time > 22 || (ctx.active.length > 2 && ctx.alive().length === 2)) want = Math.max(want, 3);
    if (want > S.want) {
      for (let k = S.want; k < want; k++) S.serves.push({ t: 0.2 + (k - S.want) * 0.5 });
      ctx.fx.text(CX, CY - 60, want - S.want > 1 ? `+${want - S.want} BALLS!` : '+1 BALL!', { color: '#ffd23f', size: 34, life: 1.3, rise: 40 });
      S.want = want;
    }
    const lvl = Math.floor(ctx.time / 15);
    if (lvl > S.speedLevel) {
      S.speedLevel = lvl;
      ctx.fx.text(CX, CY + 60, 'SPEED UP!', { color: '#6ff3ff', size: 26, life: 1.1, rise: 30 });
    }
    // serves
    for (let k = S.serves.length - 1; k >= 0; k--) {
      S.serves[k].t -= dt;
      if (S.serves[k].t <= 0) {
        S.serves.splice(k, 1);
        if (S.balls.length < S.want) serve(ctx);
      }
    }
    // Last paddle standing: freeze the balls for the moment before the crown, so a stray
    // ball cannot take the winner's final heart and turn the round into a draw.
    if (ctx.alive().length <= 1) return;
    const base = baseSpeed(ctx);
    for (let k = S.balls.length - 1; k >= 0; k--) {
      const b = S.balls[k];
      if (b.serve > 0) {
        b.serve -= dt;
        if (b.serve <= 0) {
          snd('serve');
          ctx.fx.ring(b.x, b.y, { color: '#ffffff', radius: 40, life: 0.3, width: 3 });
        }
        continue;
      }
      if (b.spd < base) b.spd = base;
      b.idle += dt;
      if (b.idle > 7 && ctx.alive().length) {
        // stuck bouncing off solid walls: nudge it toward a random live goal
        const tgt = SIDES[ctx.rng.pick(ctx.alive()).i];
        const gx = tgt.axis === 0 ? CX : tgt.line;
        const gy = tgt.axis === 0 ? tgt.line : CY;
        const a = Math.atan2(gy - b.y, gx - b.x);
        b.dx = Math.cos(a);
        b.dy = Math.sin(a);
        normalize(b);
        b.idle = 0;
      }
      stepBall(b, dt, ctx);
    }
    // ball vs ball
    const bs = S.balls;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i];
      if (a.serve > 0) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const c = bs[j];
        if (c.serve > 0) continue;
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const rr = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const push = (rr - d) / 2 + 0.2;
        a.x -= nx * push;
        a.y -= ny * push;
        c.x += nx * push;
        c.y += ny * push;
        const va = a.dx * a.spd * nx + a.dy * a.spd * ny;
        const vc = c.dx * c.spd * nx + c.dy * c.spd * ny;
        if (va - vc <= 0) continue;
        let ax = a.dx * a.spd + (vc - va) * nx;
        let ay = a.dy * a.spd + (vc - va) * ny;
        let cx = c.dx * c.spd + (va - vc) * nx;
        let cy = c.dy * c.spd + (va - vc) * ny;
        a.dx = ax;
        a.dy = ay;
        c.dx = cx;
        c.dy = cy;
        normalize(a);
        normalize(c);
        snd('clack');
        ctx.fx.burst(a.x + nx * a.r, a.y + ny * a.r, { count: 6, color: '#ffffff', speed: 140, life: 0.25, gravity: 0, size: 2 });
      }
    }
    for (const b of S.balls) {
      b.trail.push(b.x, b.y);
      if (b.trail.length > 20) b.trail.splice(0, 2);
    }
  }

  // Cosmetic only: the party kit also calls idle between rounds, where the live balls must
  // stay frozen (they could score). Only the empty lobby court gets its attract balls moved.
  function idle(dt, ctx) {
    if (!S.lobby || ctx.phase !== 'lobby') return;
    for (const b of S.balls) {
      stepBall(b, dt, ctx);
      b.trail.push(b.x, b.y);
      if (b.trail.length > 20) b.trail.splice(0, 2);
    }
  }

  // ---------- bots ----------
  // Predict where each ball will cross this bot's paddle line (walls and corner blocks
  // reflect it), aim there with a personal, per-shot error, and steer with taps and holds.
  const PB = { x: 0, y: 0, dx: 0, dy: 0, r: BR, spd: 0 };
  function predict(b, side, len, maxT) {
    PB.x = b.x;
    PB.y = b.y;
    PB.dx = b.dx;
    PB.dy = b.dy;
    PB.r = b.r;
    const face = side.line + side.sgn * (INSET + PT / 2 + b.r);
    const step = 1 / 90;
    let t = b.serve > 0 ? b.serve : 0;
    const v = b.spd;
    for (; t < maxT; t += step) {
      PB.x += PB.dx * v * step;
      PB.y += PB.dy * v * step;
      if (PB.x - PB.r < X0) {
        PB.x = X0 + PB.r;
        PB.dx = Math.abs(PB.dx);
      } else if (PB.x + PB.r > X1) {
        PB.x = X1 - PB.r;
        PB.dx = -Math.abs(PB.dx);
      }
      if (PB.y - PB.r < Y0) {
        PB.y = Y0 + PB.r;
        PB.dy = Math.abs(PB.dy);
      } else if (PB.y + PB.r > Y1) {
        PB.y = Y1 - PB.r;
        PB.dy = -Math.abs(PB.dy);
      }
      for (const bl of BLOCKS) bounceBox(PB, bl[0], bl[1], bl[2], bl[3]);
      const perp = side.axis === 0 ? PB.y : PB.x;
      const toward = side.axis === 0 ? PB.dy * -side.sgn : PB.dx * -side.sgn;
      if (toward > 0 && (perp - face) * side.sgn <= 0) {
        const along = side.axis === 0 ? PB.x : PB.y;
        if (along > side.lo - 2 && along < side.hi + 2) return { t, pos: along };
      }
    }
    return null;
  }

  function bot(p, dt, ctx) {
    const d = p.data;
    if (!d || d.bot == null) return false;
    const B = d.bot;
    const side = SIDES[p.i];
    const len = paddleLen(ctx);
    const rng = ctx.rng;
    B.think -= dt;
    if (B.daze > 0) {
      B.daze -= dt; // zoned out: the button stays as it was
      return B.last;
    }
    if (B.think <= 0) {
      B.think = rng.range(0.09, 0.2) * B.sk;
      let best = null;
      let bestBall = null;
      for (const b of S.balls) {
        const pr = predict(b, side, len, 2.4);
        if (pr && (!best || pr.t < best.t)) {
          best = pr;
          bestBall = b;
        }
      }
      if (best) {
        const key = bestBall.id + ':' + bestBall.bounces + ':' + bestBall.owner;
        if (key !== B.lastKey) {
          // a fresh read of this shot: pick how wrong we are about it
          B.lastKey = key;
          const fast = clamp((bestBall.spd - BASE_SPEED) / 280, 0, 1);
          B.err = (rng() + rng() - 1) * (16 + 46 * fast) * B.sk;
          if (rng.chance((0.13 + 0.22 * fast) * B.sk)) B.err += rng.sign() * rng.range(32, 58);
          if (rng.chance(0.04 * B.sk)) B.daze = rng.range(0.3, 0.6);
        }
        B.target = best.pos + B.err * Math.min(1, best.t * 1.6 + 0.3);
      } else {
        // nothing coming: drift back toward the middle of the goal
        B.target = (side.lo + side.hi) / 2 + Math.sin(ctx.time * 0.9 + p.i) * 30;
      }
      B.target = clamp(B.target, side.lo + len / 2, side.hi - len / 2);
    }
    const delta = B.target - d.pos;
    const want = delta > 0 ? 1 : -1;
    let out = false;
    if (Math.abs(delta) > 5 && want !== d.dir) {
      // need to turn around: only a fresh press reverses, so release first if we are down
      if (!B.last) {
        out = true;
        B.hold = Math.abs(delta) < 40; // close to the spot: keep holding to creep there
      }
    } else if (B.last && B.hold && Math.abs(delta) <= 44) out = true;
    if (!out) B.hold = false;
    B.last = out;
    return out;
  }

  // ---------- rendering ----------
  let CACHE = null;
  function cache(g) {
    if (CACHE && CACHE.g === g) return CACHE;
    const floor = g.createRadialGradient(CX, CY, 40, CX, CY, 420);
    floor.addColorStop(0, '#1d1347');
    floor.addColorStop(1, '#0b0722');
    const rim = g.createLinearGradient(0, 0, W, H);
    rim.addColorStop(0, '#1a1236');
    rim.addColorStop(0.5, '#120c28');
    rim.addColorStop(1, '#1a1236');
    CACHE = { g, floor, rim };
    return CACHE;
  }

  function drawCourt(g, ctx, t) {
    const C = cache(g);
    g.fillStyle = C.rim;
    g.fillRect(0, 0, W, H);
    g.fillStyle = C.floor;
    g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    // zones: one triangle per seat, tinted with its owner's color
    const corners = [
      [X0, Y1, X1, Y1],
      [X1, Y1, X1, Y0],
      [X1, Y0, X0, Y0],
      [X0, Y0, X0, Y1],
    ];
    for (let i = 0; i < 4; i++) {
      const p = ctx.players[i];
      if (!p.active) continue;
      const c = corners[i];
      const a = (p.alive ? 0.075 : 0.025) + S.hitFlash[i] * 0.3;
      g.fillStyle = rgba(p.color, a);
      g.beginPath();
      g.moveTo(CX, CY);
      g.lineTo(c[0], c[1]);
      g.lineTo(c[2], c[3]);
      g.closePath();
      g.fill();
    }
    // grid
    g.strokeStyle = 'rgba(160,150,255,0.05)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = CX % 33; x < X1; x += 33) {
      if (x <= X0) continue;
      g.moveTo(x, Y0);
      g.lineTo(x, Y1);
    }
    for (let y = Y0 + ((CY - Y0) % 33); y < Y1; y += 33) {
      g.moveTo(X0, y);
      g.lineTo(X1, y);
    }
    g.stroke();
    // diagonals and center circle
    g.strokeStyle = 'rgba(200,190,255,0.09)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(X0, Y0);
    g.lineTo(X1, Y1);
    g.moveTo(X1, Y0);
    g.lineTo(X0, Y1);
    g.stroke();
    g.beginPath();
    g.arc(CX, CY, 56, 0, TAU);
    g.stroke();
    g.strokeStyle = 'rgba(200,190,255,0.14)';
    g.beginPath();
    g.arc(CX, CY, 14, 0, TAU);
    g.stroke();
  }

  function drawHearts(g, ctx, t, rdt) {
    for (const p of ctx.active) {
      const d = p.data;
      if (!d || d.lives == null) continue;
      const side = SIDES[p.i];
      for (let k = 0; k < LIVES; k++) {
        const [x, y] = heartSpot(side, k);
        if (d.pop[k] > 0) d.pop[k] = Math.max(0, d.pop[k] - rdt * 2.2);
        const full = k < d.lives;
        if (full) {
          const beat = 1 + (d.lives === 1 ? Math.max(0, Math.sin(t * 7)) * 0.16 : 0);
          heartPath(g, x, y, 10 * beat);
          g.fillStyle = rgba(p.color, p.alive ? 0.85 : 0.3);
          g.fill();
          heartPath(g, x - 3, y - 3, 3);
          g.fillStyle = 'rgba(255,255,255,0.55)';
          g.fill();
        } else {
          heartPath(g, x, y, 10);
          g.strokeStyle = rgba(p.color, 0.3);
          g.lineWidth = 1.5;
          g.stroke();
          const pk = d.pop[k];
          if (pk > 0) {
            heartPath(g, x, y, 10 * (1 + (1 - pk) * 1.4));
            g.strokeStyle = rgba(p.color, pk);
            g.lineWidth = 3;
            g.stroke();
          }
        }
      }
    }
  }

  function drawWalls(g, ctx, t) {
    // solid wall tube along the court edge; goals are drawn over it
    g.save();
    g.lineCap = 'round';
    g.shadowColor = '#7b6bff';
    g.shadowBlur = 10;
    g.strokeStyle = '#6f60ff';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(CB, Y0);
    g.lineTo(W - CB, Y0);
    g.moveTo(X1, CB);
    g.lineTo(X1, H - CB);
    g.moveTo(W - CB, Y1);
    g.lineTo(CB, Y1);
    g.moveTo(X0, H - CB);
    g.lineTo(X0, CB);
    g.stroke();
    g.restore();
    for (let i = 0; i < 4; i++) drawGoal(g, ctx, i, t);
  }

  function drawGoal(g, ctx, i, t) {
    const p = ctx.players[i];
    const side = SIDES[i];
    if (!p.active) {
      // empty seat: a plain hatched wall
      hatch(g, side, 'rgba(120,110,200,0.35)', 'rgba(20,14,44,0.95)');
      return;
    }
    const open = S.open[i];
    const k = S.closeAnim[i];
    if (open || k < 1) {
      // glowing goal mouth
      const flash = S.hitFlash[i];
      g.save();
      if (side.axis === 0) {
        const y = side.line;
        const dep = side.sgn > 0 ? -Y0 : H - Y1;
        const gr = g.createLinearGradient(0, y, 0, y + dep);
        gr.addColorStop(0, rgba(p.color, 0.5 + flash * 0.5));
        gr.addColorStop(1, rgba(p.color, 0));
        g.fillStyle = gr;
        g.fillRect(side.lo, Math.min(y, y + dep), side.hi - side.lo, Math.abs(dep));
      } else {
        const x = side.line;
        const dep = side.sgn > 0 ? -X0 : W - X1;
        const gr = g.createLinearGradient(x, 0, x + dep * 3, 0);
        gr.addColorStop(0, rgba(p.color, 0.6 + flash * 0.4));
        gr.addColorStop(1, rgba(p.color, 0));
        g.fillStyle = gr;
        g.fillRect(Math.min(x, x + dep), side.lo, Math.abs(dep), side.hi - side.lo);
      }
      // energy line with running dashes
      g.lineCap = 'round';
      g.shadowColor = p.color;
      g.shadowBlur = 14;
      g.strokeStyle = p.color;
      g.lineWidth = 3;
      g.setLineDash([10, 8]);
      g.lineDashOffset = -t * 40;
      g.beginPath();
      if (side.axis === 0) {
        g.moveTo(side.lo, side.line);
        g.lineTo(side.hi, side.line);
      } else {
        g.moveTo(side.line, side.lo);
        g.lineTo(side.line, side.hi);
      }
      g.stroke();
      g.setLineDash([]);
      g.restore();
      // goal posts
      const pc = '#ffffff';
      if (side.axis === 1) {
        ctx.draw.circle(g, side.line, side.lo, 4, pc);
        ctx.draw.circle(g, side.line, side.hi, 4, pc);
      }
    }
    if (!open) {
      g.save();
      g.globalAlpha = k;
      hatch(g, side, rgba(p.color, 0.55), 'rgba(24,12,40,0.95)');
      g.restore();
      // OUT stamp in the zone
      const [x, y] = heartSpot(side, 1);
      g.save();
      g.globalAlpha = k * (ctx.phase === 'play' ? 0.9 : 0.3);
      g.translate(x + (side.axis === 1 ? side.sgn * 30 : 0), y + (side.axis === 0 ? side.sgn * 30 : 0));
      if (side.axis === 1) g.rotate(side.sgn > 0 ? Math.PI / 2 : -Math.PI / 2);
      else if (side.sgn > 0) g.rotate(Math.PI);
      ctx.draw.text(g, 'OUT', 0, 0, { size: 30, color: p.color, stroke: '#10081f' });
      g.restore();
    }
  }

  function hatch(g, side, line, fill) {
    g.save();
    const th = 10;
    let x;
    let y;
    let w;
    let h;
    if (side.axis === 0) {
      x = side.lo;
      w = side.hi - side.lo;
      y = side.line - (side.sgn > 0 ? th : 0);
      h = th;
    } else {
      y = side.lo;
      h = side.hi - side.lo;
      x = side.line - (side.sgn > 0 ? th : 0);
      w = th;
    }
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.beginPath();
    for (let k = -h; k < w + h; k += 9) {
      g.moveTo(x + k, y);
      g.lineTo(x + k + h, y + h);
    }
    g.stroke();
    g.restore();
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
  }

  function drawBlocks(g, ctx, t) {
    for (const bl of BLOCKS) {
      const [x0, y0, x1, y1, seat] = bl;
      const p = ctx.players[seat];
      const col = p.active ? p.color : '#7b6bff';
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, '#231a4a');
      gr.addColorStop(1, '#150f30');
      ctx.draw.roundRect(g, x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6, 20, gr);
      g.save();
      g.shadowColor = col;
      g.shadowBlur = p.active ? 12 : 4;
      ctx.draw.roundRect(g, x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6, 20, null, rgba(col, p.active ? 0.85 : 0.35), 3);
      g.restore();
      // corner studs
      g.fillStyle = rgba(col, 0.35);
      for (const [sx, sy] of [
        [x0 + 16, y0 + 16],
        [x1 - 16, y0 + 16],
        [x0 + 16, y1 - 16],
        [x1 - 16, y1 - 16],
      ]) {
        g.beginPath();
        g.arc(sx, sy, 2.5, 0, TAU);
        g.fill();
      }
    }
  }

  function drawPaddles(g, ctx, t, rdt) {
    const len = paddleLen(ctx);
    for (const p of ctx.active) {
      if (!p.alive || !p.data || p.data.pos == null) continue;
      const d = p.data;
      const side = SIDES[p.i];
      const R = paddleRect(side, d.pos, len);
      if (d.flash > 0) d.flash = Math.max(0, d.flash - rdt * 5);
      if (d.turn > 0) d.turn = Math.max(0, d.turn - rdt * 6);
      const gl = glow(p.color, 96);
      if (gl) {
        const gs = Math.max(R.hx, R.hy) * 2 + 40;
        g.drawImage(gl, R.cx - gs / 2, R.cy - gs / 2, gs, gs);
      }
      const x = R.cx - R.hx;
      const y = R.cy - R.hy;
      const w = R.hx * 2;
      const h = R.hy * 2;
      ctx.draw.roundRect(g, x - 1.5, y - 1.5, w + 3, h + 3, PT / 2 + 1.5, '#ffffff');
      ctx.draw.roundRect(g, x, y, w, h, PT / 2, p.color);
      // bright core
      g.fillStyle = `rgba(255,255,255,${0.35 + d.flash * 0.6})`;
      if (side.axis === 0) g.fillRect(x + 6, R.cy - 1.5, w - 12, 3);
      else g.fillRect(R.cx - 1.5, y + 6, 3, h - 12);
      // travel arrow in front of the paddle's leading end (dims while held = slow)
      const a = d.slow ? 0.45 : 0.9;
      const lead = (side.axis === 0 ? R.hx : R.hy) + 9 + d.turn * 4;
      const ax = side.axis === 0 ? R.cx + d.dir * lead : R.cx;
      const ay = side.axis === 0 ? R.cy : R.cy + d.dir * lead;
      g.save();
      g.translate(ax, ay);
      if (side.axis === 1) g.rotate(Math.PI / 2);
      g.scale(d.dir, 1);
      g.fillStyle = rgba(p.color, a);
      g.beginPath();
      g.moveTo(5, 0);
      g.lineTo(-2, -5);
      g.lineTo(-2, 5);
      g.closePath();
      g.fill();
      if (!d.slow) {
        g.globalAlpha = 0.5;
        g.beginPath();
        g.moveTo(-3, 0);
        g.lineTo(-9, -4);
        g.lineTo(-9, 4);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
  }

  function drawBalls(g, ctx, t) {
    for (const b of S.balls) {
      const col = b.owner >= 0 ? ctx.players[b.owner].color : '#ffffff';
      if (b.serve > 0) {
        // countdown ring + arrow at the serve spot
        const k = b.serve / SERVE_T;
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(b.x, b.y, 14 + k * 26, -Math.PI / 2, -Math.PI / 2 + TAU * k);
        g.stroke();
        const a = Math.atan2(b.dy, b.dx);
        const tc = b.target != null ? ctx.players[b.target].color : '#ffffff';
        g.save();
        g.translate(b.x, b.y);
        g.rotate(a);
        g.fillStyle = tc;
        g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 20);
        for (let i = 0; i < 3; i++) {
          const ox = 26 + i * 11;
          g.beginPath();
          g.moveTo(ox + 6, 0);
          g.lineTo(ox, -6);
          g.lineTo(ox, 6);
          g.closePath();
          g.fill();
        }
        g.restore();
        g.globalAlpha = 1;
      }
      // trail: a tapering ribbon from the oldest point to the ball
      const tr = b.trail;
      const n = tr.length / 2;
      g.lineCap = 'round';
      g.strokeStyle = col;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        g.globalAlpha = k * 0.5;
        g.lineWidth = b.r * 2 * (0.2 + k * 0.75);
        g.beginPath();
        g.moveTo(tr[i * 2 - 2], tr[i * 2 - 1]);
        g.lineTo(tr[i * 2], tr[i * 2 + 1]);
        g.stroke();
      }
      g.globalAlpha = 1;
      const gl = glow(col, 64);
      if (gl) g.drawImage(gl, b.x - b.r * 3.2, b.y - b.r * 3.2, b.r * 6.4, b.r * 6.4);
      ctx.draw.circle(g, b.x, b.y, b.r + 1.5, col);
      ctx.draw.circle(g, b.x, b.y, b.r - 1, '#ffffff');
    }
  }

  function drawBumpers(g, ctx, t, rdt) {
    if (S.twistId !== 'pinball' || S.lobby) return;
    BUMPERS.forEach((u, k) => {
      const f = S.bumperFlash[k];
      if (f > 0) S.bumperFlash[k] = Math.max(0, f - rdt * 4);
      const r = u.r * (1 + f * 0.18);
      const gl = glow('#ff4fd8', 96);
      if (gl) g.drawImage(gl, u.x - r * 2.4, u.y - r * 2.4, r * 4.8, r * 4.8);
      ctx.draw.circle(g, u.x, u.y, r, '#2a0f3a', '#ff4fd8', 4);
      ctx.draw.circle(g, u.x, u.y, r * 0.5, f > 0 ? '#ffffff' : '#ff9be9');
    });
  }

  // First round only: show each human what their one button does, next to their paddle.
  function drawHints(g, ctx, t) {
    if (api.demo || ctx.round !== 1) return;
    const ph = ctx.phase;
    const k = ph === 'card' || ph === 'count' ? 1 : ph === 'play' ? clamp(4 - ctx.time, 0, 1) : 0;
    if (k <= 0) return;
    for (const p of ctx.active) {
      if (!p.human || !p.alive || !p.data) continue;
      // well inside the court, clear of the name tags the party kit shows at round start
      const spot = [
        [CX, Y1 - 146],
        [X1 - 150, CY + 60],
        [CX, Y0 + 132],
        [X0 + 150, CY - 60],
      ][p.i];
      g.save();
      g.globalAlpha = k;
      g.translate(spot[0], spot[1]);
      if (p.i === 2 || p.i === 3) g.rotate(Math.PI); // seats across the table read upside down
      ctx.draw.roundRect(g, -66, -22, 132, 44, 14, 'rgba(8,4,20,0.85)', p.color, 2);
      ctx.draw.text(g, 'TAP = TURN', 0, -7, { size: 14, color: '#ffffff', shadow: false });
      ctx.draw.text(g, 'hold to slow down', 0, 10, { size: 11, weight: 700, color: 'rgba(255,255,255,0.75)', shadow: false });
      g.restore();
    }
  }

  function render(g, ctx) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    let rdt = S.lastNow ? (now - S.lastNow) / 1000 : 0;
    S.lastNow = now;
    if (!(rdt >= 0) || rdt > 0.05) rdt = 0.016;
    S.t += rdt;
    const t = S.t;
    for (let i = 0; i < 4; i++) {
      if (S.hitFlash[i] > 0) S.hitFlash[i] = Math.max(0, S.hitFlash[i] - rdt * 2.2);
      if (!S.open[i]) S.closeAnim[i] = Math.min(1, S.closeAnim[i] + rdt * 2.5);
    }
    drawCourt(g, ctx, t);
    drawHearts(g, ctx, t, rdt);
    drawBumpers(g, ctx, t, rdt);
    drawWalls(g, ctx, t);
    drawBlocks(g, ctx, t);
    drawPaddles(g, ctx, t, rdt);
    drawBalls(g, ctx, t);
    drawHints(g, ctx, t);
  }

  return createParty(api, {
    roundsToWin: 2, // long rallies: first to 2 keeps a match near 3 minutes
    twists: ['turbo', 'giants', 'tiny', 'swap', 'lights', 'wobble', MULTI, PINBALL],
    setup,
    update,
    render,
    bot,
    idle,
  });
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = h / 600;
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1a1236');
  bg.addColorStop(1, '#0c0822');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // court seen at an angle from above
  g.save();
  g.translate(w / 2, h / 2 + 10 * s);
  g.rotate(-0.12);
  const cw = 560 * s;
  const ch = 440 * s;
  const floor = g.createRadialGradient(0, 0, 20 * s, 0, 0, cw * 0.7);
  floor.addColorStop(0, '#24185a');
  floor.addColorStop(1, '#0d0826');
  g.fillStyle = floor;
  g.fillRect(-cw / 2, -ch / 2, cw, ch);
  const cols = ['#ff3d8b', '#2fd9ff', '#ffc93c', '#7dff5a'];
  const tri = [
    [-cw / 2, ch / 2, cw / 2, ch / 2],
    [cw / 2, ch / 2, cw / 2, -ch / 2],
    [cw / 2, -ch / 2, -cw / 2, -ch / 2],
    [-cw / 2, -ch / 2, -cw / 2, ch / 2],
  ];
  tri.forEach((c, i) => {
    g.fillStyle = rgba(cols[i], 0.1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(c[0], c[1]);
    g.lineTo(c[2], c[3]);
    g.closePath();
    g.fill();
  });
  g.strokeStyle = 'rgba(160,150,255,0.07)';
  g.lineWidth = 1.5 * s;
  g.beginPath();
  for (let x = -cw / 2; x <= cw / 2; x += 40 * s) {
    g.moveTo(x, -ch / 2);
    g.lineTo(x, ch / 2);
  }
  for (let y = -ch / 2; y <= ch / 2; y += 40 * s) {
    g.moveTo(-cw / 2, y);
    g.lineTo(cw / 2, y);
  }
  g.stroke();
  g.strokeStyle = 'rgba(200,190,255,0.14)';
  g.lineWidth = 3 * s;
  g.beginPath();
  g.arc(0, 0, 70 * s, 0, TAU);
  g.stroke();
  // walls, goals, blocks
  const cb = 96 * s;
  g.save();
  g.shadowColor = '#7b6bff';
  g.shadowBlur = 16 * s;
  g.strokeStyle = '#6f60ff';
  g.lineWidth = 6 * s;
  g.strokeRect(-cw / 2, -ch / 2, cw, ch);
  g.restore();
  const goals = [
    [-cw / 2 + cb, ch / 2, cw / 2 - cb, ch / 2],
    [cw / 2, -ch / 2 + cb + 40 * s, cw / 2, ch / 2 - cb - 40 * s],
    [-cw / 2 + cb, -ch / 2, cw / 2 - cb, -ch / 2],
    [-cw / 2, -ch / 2 + cb + 40 * s, -cw / 2, ch / 2 - cb - 40 * s],
  ];
  goals.forEach((q, i) => {
    g.save();
    g.shadowColor = cols[i];
    g.shadowBlur = 22 * s;
    g.strokeStyle = cols[i];
    g.lineWidth = 7 * s;
    g.setLineDash([16 * s, 10 * s]);
    g.beginPath();
    g.moveTo(q[0], q[1]);
    g.lineTo(q[2], q[3]);
    g.stroke();
    g.restore();
  });
  const bx = [
    [-cw / 2, -ch / 2],
    [cw / 2 - cb, -ch / 2],
    [-cw / 2, ch / 2 - cb],
    [cw / 2 - cb, ch / 2 - cb],
  ];
  const bcol = [cols[3], cols[2], cols[0], cols[1]];
  bx.forEach(([x, y], i) => {
    g.fillStyle = '#1d1540';
    g.beginPath();
    g.roundRect(x + 4 * s, y + 4 * s, cb - 8 * s, cb - 8 * s, 18 * s);
    g.fill();
    g.save();
    g.shadowColor = bcol[i];
    g.shadowBlur = 14 * s;
    g.strokeStyle = bcol[i];
    g.lineWidth = 4 * s;
    g.stroke();
    g.restore();
  });
  // paddles
  const pad = (x, y, vertical, col) => {
    const L = 110 * s;
    const T = 20 * s;
    g.save();
    g.shadowColor = col;
    g.shadowBlur = 26 * s;
    g.fillStyle = '#ffffff';
    g.beginPath();
    if (vertical) g.roundRect(x - T / 2 - 3 * s, y - L / 2 - 3 * s, T + 6 * s, L + 6 * s, T);
    else g.roundRect(x - L / 2 - 3 * s, y - T / 2 - 3 * s, L + 6 * s, T + 6 * s, T);
    g.fill();
    g.fillStyle = col;
    g.beginPath();
    if (vertical) g.roundRect(x - T / 2, y - L / 2, T, L, T / 2);
    else g.roundRect(x - L / 2, y - T / 2, L, T, T / 2);
    g.fill();
    g.restore();
  };
  pad(-40 * s, ch / 2 - 30 * s, false, cols[0]);
  pad(cw / 2 - 30 * s, 50 * s, true, cols[1]);
  pad(60 * s, -ch / 2 + 30 * s, false, cols[2]);
  pad(-cw / 2 + 30 * s, -40 * s, true, cols[3]);
  // balls with trails
  const ball = (x, y, vx, vy, col) => {
    for (let i = 10; i > 0; i--) {
      g.globalAlpha = (1 - i / 11) * 0.5;
      g.fillStyle = col;
      g.beginPath();
      g.arc(x - vx * i * 9 * s, y - vy * i * 9 * s, (6 + (10 - i) * 0.9) * s, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    const gr = g.createRadialGradient(x, y, 2 * s, x, y, 46 * s);
    gr.addColorStop(0, rgba(col, 0.7));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(x - 46 * s, y - 46 * s, 92 * s, 92 * s);
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, 17 * s, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x, y, 13 * s, 0, TAU);
    g.fill();
  };
  ball(30 * s, 60 * s, -0.6, 0.8, cols[0]);
  ball(150 * s, -70 * s, 0.8, -0.5, cols[1]);
  ball(-150 * s, 20 * s, -0.7, -0.7, cols[3]);
  // impact sparks on the blue paddle
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3 * s;
  g.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i - 3) * 0.32;
    g.moveTo(cw / 2 - 48 * s + Math.cos(a) * 16 * s, 50 * s + Math.sin(a) * 16 * s);
    g.lineTo(cw / 2 - 48 * s + Math.cos(a) * 40 * s, 50 * s + Math.sin(a) * 40 * s);
  }
  g.stroke();
  // hearts on the floor near the pink goal
  for (let k = 0; k < 3; k++) {
    heartPath(g, -34 * s + k * 34 * s, ch / 2 - 78 * s, 13 * s);
    g.fillStyle = k < 2 ? rgba(cols[0], 0.85) : rgba(cols[0], 0.2);
    g.fill();
  }
  g.restore();
}
