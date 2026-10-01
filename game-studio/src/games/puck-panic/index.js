// Puck Panic - neon air hockey for 1 to 4 players on one screen, one button each.
//
// Every player owns one goal and one round mallet. Two players play classic air hockey
// (bottom goal against top goal), three add a side goal and four use every edge of the
// table. HOLD your button and your mallet charges at the puck, with real momentum, so it
// can overshoot; LET GO and it glides back to guard the middle of your goal. A fast charge
// smashes the puck, but it leaves your goal wide open. Three lives each: a puck in your goal
// costs one, and at zero your goal closes into a rail. Last mallet standing takes the crown.
import { createParty } from '../engine/party.js';
import { TABLE, drawMallet, drawPuck, glow, rgba } from './art.js';

export { cover } from './art.js';

const TAU = Math.PI * 2;
const W = 420;
const H = 740;
// playfield (inside the rails)
const X0 = 16;
const X1 = 404;
const Y0 = 106;
const Y1 = 650;
const CX = (X0 + X1) / 2;
const CY = (Y0 + Y1) / 2;
const RC = 40; // rounded table corners
const FRAME = 13; // rail frame thickness
const GOAL_HALF = 70;
const MR0 = 23; // mallet radius
const PR0 = 12; // puck radius
const LIVES = 3;
const ROUND_TIME = 60;
const CHASE_MAX = 560; // mallet top speed while charging
const CHASE_ACC = 2700;
const HOME_MAX = 430; // glide back speed
const HOME_ACC = 2300;
const JAB = 150; // instant kick toward the puck on every fresh press
const MALLET_MASS = 4; // puck mass is 1
const E_MALLET = 0.86;
const E_RAIL = 0.9;
const PUCK_MAX = 880;
const PUCK_DRAG = 0.12; // the air table: almost no friction
const SERVE_T = 0.85;
const REACH_PAST = 56; // a mallet may chase this far past the middle of the table
const TRAIL = 16;
const RUSH_T = 38; // late in the round the air jets kick in: pucks never slow down
const RUSH_FLOOR = 300;

const MULTI = { id: 'multipuck', name: 'MULTI PUCK', desc: 'Two pucks from the first second', emoji: '🥏' };
const ICE = { id: 'ice', name: 'ICE TABLE', desc: 'Mallets slide and overshoot', emoji: '🧊' };
const WIDE = { id: 'wide', name: 'WIDE GOALS', desc: 'Every goal is almost half again as wide', emoji: '🥅' };

// Goal slots: 0 bottom, 1 right, 2 top, 3 left. (nx, ny) points from the goal line into the
// table, (tx, ty) runs along the goal line, depth is the table size along the normal.
const SLOTS = [
  { k: 0, gx: CX, gy: Y1, nx: 0, ny: -1, tx: 1, ty: 0, depth: Y1 - Y0 },
  { k: 1, gx: X1, gy: CY, nx: -1, ny: 0, tx: 0, ty: 1, depth: X1 - X0 },
  { k: 2, gx: CX, gy: Y0, nx: 0, ny: 1, tx: 1, ty: 0, depth: Y1 - Y0 },
  { k: 3, gx: X0, gy: CY, nx: 1, ny: 0, tx: 0, ty: 1, depth: X1 - X0 },
];
const CORNERS = [
  [X0 + RC, Y0 + RC, -1, -1],
  [X1 - RC, Y0 + RC, 1, -1],
  [X0 + RC, Y1 - RC, -1, 1],
  [X1 - RC, Y1 - RC, 1, 1],
];
const SERVE_SPOTS = [0, -50, 50];

const PERSONAS = {
  // stays home, only strikes pucks that are close and slow or about to arrive
  goalie: { name: 'goalie', think: [0.09, 0.17], zone: 0.6, strike: 0.32, slow: 170, chase: 0.6, retreat: 0.92, err: 0.05, eager: 0.012, lat: 52 },
  // charges at anything in reach and forgets to go home
  hothead: { name: 'hothead', think: [0.07, 0.15], zone: 1, strike: 0.55, slow: 270, chase: 1.35, retreat: 0.3, err: 0.07, eager: 0.05, lat: 80 },
  balanced: { name: 'balanced', think: [0.08, 0.16], zone: 0.85, strike: 0.46, slow: 235, chase: 1, retreat: 0.6, err: 0.06, eager: 0.03, lat: 68 },
};
const PERSONA_LIST = ['goalie', 'hothead', 'balanced'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Which goal each seat defends. Four players: P1 bottom, P2 right, P3 top, P4 left (every
// corner button touches its own goal's edge). Two players always play bottom against top,
// three play bottom, top and one side.
function assignSlots(seats) {
  const out = {};
  if (seats.length === 2) {
    const top = seats.includes(2) ? 2 : seats[1];
    for (const s of seats) out[s] = s === top ? 2 : 0;
    return out;
  }
  for (const s of seats) out[s] = s;
  if (seats.length === 3) {
    if (!seats.includes(0)) out[1] = 0; // P2's corner also touches the bottom edge
    if (!seats.includes(2)) out[3] = 2; // P4's corner also touches the top edge
  }
  return out;
}

export default function createGame(api) {
  const S = {
    pucks: [],
    serves: [],
    pid: 0,
    want: 1,
    rush: false,
    lobby: true,
    twist: 'classic',
    gh: GOAL_HALF,
    cr: GOAL_HALF + 16,
    owner: [-1, -1, -1, -1], // slot -> player index
    open: [false, false, false, false],
    closeAnim: [1, 1, 1, 1],
    goalFlash: [0, 0, 0, 0],
    railFx: [],
    sndT: 0,
    wordT: 0,
    lastT: 0,
    t: 0,
    persona: [null, null, null, null],
  };

  const mrOf = (ctx) => MR0 * ctx.size;
  const prOf = (ctx) => PR0 * ctx.size;
  const homeInset = (ctx) => 42 + mrOf(ctx) * 0.45;
  const maxDepth = (sl) => sl.depth / 2 + REACH_PAST;

  function newPuck(x, y, r) {
    return {
      id: ++S.pid,
      x,
      y,
      vx: 0,
      vy: 0,
      r,
      serve: 0,
      serve0: 1,
      ax: 0,
      ay: 1,
      target: -1,
      owner: -1,
      touchT: 0,
      spin: 0,
      ang: 0,
      slowT: 0,
      dead: false,
      fxCool: 0,
      trail: new Float32Array(TRAIL * 2),
      th: 0,
      tn: 0,
    };
  }

  function trailPush(b) {
    b.trail[b.th * 2] = b.x;
    b.trail[b.th * 2 + 1] = b.y;
    b.th = (b.th + 1) % TRAIL;
    if (b.tn < TRAIL) b.tn += 1;
  }

  // ---------- round setup ----------
  function setup(ctx) {
    S.pucks.length = 0;
    S.serves.length = 0;
    S.railFx.length = 0;
    S.lobby = !ctx.active.length;
    S.twist = ctx.twist.id;
    S.gh = GOAL_HALF * Math.sqrt(ctx.size) * (S.twist === 'wide' ? 1.42 : 1);
    S.cr = S.gh + 16;
    S.rush = false;
    for (let k = 0; k < 4; k++) {
      S.owner[k] = -1;
      S.open[k] = false;
      S.closeAnim[k] = 1;
      S.goalFlash[k] = 0;
    }
    if (ctx.round <= 1) {
      // fresh personalities for the bots every match
      for (let i = 0; i < 4; i++) S.persona[i] = PERSONAS[ctx.rng.pick(PERSONA_LIST)];
      // never a table full of goalies: someone has to attack
      if (S.persona.every((q) => q.name === 'goalie')) S.persona[ctx.rng.int(0, 3)] = PERSONAS.hothead;
    }
    const slots = assignSlots(ctx.active.map((p) => p.i));
    const inset = homeInset(ctx);
    for (const p of ctx.active) {
      const k = slots[p.i];
      const sl = SLOTS[k];
      S.owner[k] = p.i;
      S.open[k] = true;
      S.closeAnim[k] = 0;
      p.x = sl.gx + sl.nx * inset;
      p.y = sl.gy + sl.ny * inset;
      p.data = {
        slot: k,
        vx: 0,
        vy: 0,
        lives: LIVES,
        pop: [0, 0, 0],
        hitT: 9,
        charge: 0,
        flash: 0,
        leash: 0,
        gone: 0,
        tgt: -1,
        trail: new Float32Array(16),
        th: 0,
        tn: 0,
        bot: null,
      };
    }
    if (S.lobby) {
      // attract mode: two pucks gliding around an empty table
      const a = newPuck(CX - 60, CY - 90, PR0);
      a.vx = 170;
      a.vy = -230;
      const b = newPuck(CX + 70, CY + 100, PR0);
      b.vx = -210;
      b.vy = 160;
      b.owner = -2;
      S.pucks.push(a, b);
      return;
    }
    S.want = S.twist === 'multipuck' ? 2 : 1;
    for (let k = 0; k < S.want; k++) spawnServe(ctx, SERVE_T + k * 0.45);
  }

  // ---------- serving ----------
  function spawnServe(ctx, delay) {
    const alive = ctx.alive();
    if (!alive.length) return;
    const target = ctx.rng.pick(alive);
    const sl = SLOTS[target.data.slot];
    let sx = CX;
    for (const ox of SERVE_SPOTS) {
      if (!S.pucks.some((o) => !o.dead && o.serve > 0 && Math.abs(o.x - (CX + ox)) < 24 && Math.abs(o.y - CY) < 24)) {
        sx = CX + ox;
        break;
      }
    }
    const b = newPuck(sx, CY, prOf(ctx));
    const a = Math.atan2(sl.gy - CY, sl.gx - sx) + ctx.rng.range(-0.32, 0.32);
    b.ax = Math.cos(a);
    b.ay = Math.sin(a);
    b.serve = delay;
    b.serve0 = delay;
    b.target = target.i;
    S.pucks.push(b);
  }

  function launch(b, ctx) {
    const sp = 290 + Math.min(120, ctx.time * 2) + (S.rush ? 80 : 0);
    b.vx = b.ax * sp;
    b.vy = b.ay * sp;
    b.serve = 0;
    snd('serve');
    ctx.fx.ring(b.x, b.y, { color: '#ffffff', radius: 42, life: 0.3, width: 3 });
    ctx.fx.burst(b.x, b.y, { count: 10, colors: ['#ffffff', TABLE.railGlow], speed: 160, life: 0.35, gravity: 0, size: 2.5 });
  }

  // ---------- sounds ----------
  function snd(name, k = 0) {
    const sfx = api.sfx;
    if (name === 'smash') {
      sfx.tone({ freq: 520 + k * 500, to: 300 + k * 200, type: 'square', dur: 0.06, vol: 0.07 + k * 0.08 });
      sfx.noise({ dur: 0.05 + k * 0.06, vol: 0.08 + k * 0.14, freq: 2400, to: 700, type: 'bandpass', q: 1.5 });
    } else if (name === 'rail') {
      sfx.tone({ freq: 210 + k * 120, to: 150, type: 'triangle', dur: 0.06, vol: 0.05 + k * 0.06 });
    } else if (name === 'clack') sfx.tone({ freq: 900, to: 760, type: 'sine', dur: 0.04, vol: 0.07 });
    else if (name === 'bonk') sfx.tone({ freq: 160, to: 90, type: 'sine', dur: 0.1, vol: 0.1 });
    else if (name === 'goal') {
      sfx.noise({ dur: 0.5, vol: 0.32, freq: 1800, to: 140 });
      sfx.tone({ freq: 330, to: 82, type: 'sawtooth', dur: 0.45, vol: 0.12 });
      sfx.tone({ freq: 660, type: 'square', dur: 0.12, vol: 0.05, delay: 0.05 });
    } else if (name === 'serve') sfx.noise({ dur: 0.22, vol: 0.12, freq: 400, to: 2800, type: 'bandpass', q: 1.4 });
    else if (name === 'charge') sfx.tone({ freq: 240, to: 480, type: 'triangle', dur: 0.09, vol: 0.04 });
    else if (name === 'puff') sfx.noise({ dur: 0.18, vol: 0.08, freq: 900, to: 300, type: 'lowpass' });
    else if (name === 'alarm') sfx.tone({ freq: 880, to: 990, type: 'square', dur: 0.08, vol: 0.05 });
  }

  // ---------- mallets ----------
  // The puck a held button chases: the nearest one, preferring pucks out in front of the
  // mallet (a charge goes out from your goal, it does not smash the puck behind you).
  function nearestPuck(p, d) {
    const sl = SLOTS[d.slot];
    const depM = (p.x - sl.gx) * sl.nx + (p.y - sl.gy) * sl.ny;
    let best = null;
    let bd = Infinity;
    let cur = null;
    let cd = Infinity;
    for (const b of S.pucks) {
      if (b.dead) continue;
      const depB = (b.x - sl.gx) * sl.nx + (b.y - sl.gy) * sl.ny;
      const dd = Math.hypot(b.x - p.x, b.y - p.y) + (b.serve > 0 ? 400 : 0) + (depB < depM - 4 ? 260 : 0);
      if (b.id === d.tgt) {
        cur = b;
        cd = dd;
      }
      if (dd < bd) {
        bd = dd;
        best = b;
      }
    }
    // stick with the current target unless another puck is clearly closer
    if (cur && best !== cur && bd > cd * 0.75) return cur;
    return best;
  }

  // the puck that matters most to a goal (ignoring pucks closer to the goal line than
  // minDep): the one arriving soonest, else the closest
  function threat(sl, minDep) {
    let best = null;
    let bs = Infinity;
    for (const b of S.pucks) {
      if (b.dead || b.serve > 0) continue;
      const dep = (b.x - sl.gx) * sl.nx + (b.y - sl.gy) * sl.ny;
      if (dep < minDep) continue;
      const vin = b.vx * sl.nx + b.vy * sl.ny;
      const s = vin < -30 ? (dep - b.r) / -vin : 2 + dep / 300;
      if (s < bs) {
        bs = s;
        best = b;
      }
    }
    return best;
  }

  function steer(p, dt, ctx) {
    const d = p.data;
    const sl = SLOTS[d.slot];
    const ice = S.twist === 'ice';
    const r = mrOf(ctx);
    let dvx;
    let dvy;
    let acc;
    if (p.down) {
      d.charge += dt;
      const b = nearestPuck(p, d);
      if (b) {
        d.tgt = b.id;
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        const lead = b.serve > 0 ? 0 : clamp(dist / 900, 0, 0.24);
        let ax = b.x + b.vx * lead - p.x;
        let ay = b.y + b.vy * lead - p.y;
        const al = Math.hypot(ax, ay) || 1;
        ax /= al;
        ay /= al;
        if (p.tap) {
          d.vx += ax * JAB;
          d.vy += ay * JAB;
          if (p.human) snd('charge');
        }
        const top = CHASE_MAX * (ice ? 1.1 : 1);
        dvx = ax * top;
        dvy = ay * top;
      } else {
        dvx = 0;
        dvy = 0;
      }
      acc = CHASE_ACC * (ice ? 0.36 : 1);
    } else {
      d.charge = 0;
      // guard spot: in front of the goal, leaning a little toward the most dangerous puck
      const inset = homeInset(ctx);
      const depM = (p.x - sl.gx) * sl.nx + (p.y - sl.gy) * sl.ny;
      const latM = (p.x - sl.gx) * sl.tx + (p.y - sl.gy) * sl.ty;
      let gDep = inset;
      let gLat = 0;
      const tb = threat(sl, depM - 2);
      if (tb) {
        const lat = (tb.x - sl.gx) * sl.tx + (tb.y - sl.gy) * sl.ty;
        gLat = clamp(lat * 0.32, -(S.gh - 10), S.gh - 10);
      }
      // a puck that slipped in behind the mallet: step beside it rather than shove it in
      for (const b of S.pucks) {
        if (b.dead || b.serve > 0) continue;
        const depB = (b.x - sl.gx) * sl.nx + (b.y - sl.gy) * sl.ny;
        const latB = (b.x - sl.gx) * sl.tx + (b.y - sl.gy) * sl.ty;
        if (depB < depM - 2 && depB < inset + 14 && Math.abs(latB - latM) < r + b.r + 18) {
          const side = latM >= latB ? 1 : -1;
          gLat = latB + side * (r + b.r + 10);
          gDep = clamp(depB, r + 1, inset);
          break;
        }
      }
      const hx = sl.gx + sl.nx * gDep + sl.tx * gLat;
      const hy = sl.gy + sl.ny * gDep + sl.ty * gLat;
      let tx = hx - p.x;
      let ty = hy - p.y;
      const dist = Math.hypot(tx, ty);
      const spd = Math.min(HOME_MAX * (ice ? 1.1 : 1), dist * 7);
      if (dist > 0.5) {
        tx /= dist;
        ty /= dist;
      } else {
        tx = 0;
        ty = 0;
      }
      dvx = tx * spd;
      dvy = ty * spd;
      // curl around a puck sitting between the mallet and its goal instead of
      // shoving it in (that would be an own goal on every retreat)
      for (const b of S.pucks) {
        if (b.dead || b.serve > 0) continue;
        const depB = (b.x - sl.gx) * sl.nx + (b.y - sl.gy) * sl.ny;
        if (depB > depM + 4) continue;
        const wx = b.x - p.x;
        const wy = b.y - p.y;
        const along = wx * tx + wy * ty;
        const perp = wx * -ty + wy * tx;
        const clear = r + b.r + 12;
        if (along > -6 && along < dist + b.r + 6 && Math.abs(perp) < clear) {
          const side = perp >= 0 ? -1 : 1;
          const k = 1 - Math.abs(perp) / clear;
          dvx += -ty * side * HOME_MAX * (0.7 + 0.6 * k);
          dvy += tx * side * HOME_MAX * (0.7 + 0.6 * k);
          if (along < clear + 14) {
            dvx -= tx * spd * 0.8;
            dvy -= ty * spd * 0.8;
          }
        }
      }
      acc = HOME_ACC * (ice ? 0.36 : 1);
    }
    let ex = dvx - d.vx;
    let ey = dvy - d.vy;
    const el = Math.hypot(ex, ey);
    const step = acc * dt;
    if (el > step) {
      ex *= step / el;
      ey *= step / el;
    }
    d.vx += ex;
    d.vy += ey;
  }

  function constrainMallet(p, ctx) {
    const d = p.data;
    const sl = SLOTS[d.slot];
    const r = mrOf(ctx);
    // reach: a little past the middle of the table
    const md = maxDepth(sl);
    const dep = (p.x - sl.gx) * sl.nx + (p.y - sl.gy) * sl.ny;
    if (dep > md) {
      p.x -= sl.nx * (dep - md);
      p.y -= sl.ny * (dep - md);
      const vn = d.vx * sl.nx + d.vy * sl.ny;
      if (vn > 0) {
        d.vx -= vn * sl.nx;
        d.vy -= vn * sl.ny;
        if (vn > 120) d.leash = 1;
      }
    }
    // nobody else may enter a live goal's crease
    for (let k = 0; k < 4; k++) {
      if (k === d.slot || !S.open[k]) continue;
      const s2 = SLOTS[k];
      const dx = p.x - s2.gx;
      const dy = p.y - s2.gy;
      const min = S.cr + r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const dd = Math.sqrt(d2) || 1;
        const nx = dx / dd;
        const ny = dy / dd;
        p.x = s2.gx + nx * min;
        p.y = s2.gy + ny * min;
        const vn = d.vx * nx + d.vy * ny;
        if (vn < 0) {
          d.vx -= vn * nx;
          d.vy -= vn * ny;
        }
      }
    }
    // a waiting serve is off limits too
    for (const b of S.pucks) {
      if (b.dead || b.serve <= 0) continue;
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const min = r + b.r + 18;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const dd = Math.sqrt(d2) || 1;
        p.x = b.x + (dx / dd) * min;
        p.y = b.y + (dy / dd) * min;
        const vn = (d.vx * dx + d.vy * dy) / dd;
        if (vn < 0) {
          d.vx -= (vn * dx) / dd;
          d.vy -= (vn * dy) / dd;
        }
      }
    }
    // rails and rounded corners
    if (p.x < X0 + r) {
      p.x = X0 + r;
      if (d.vx < 0) d.vx = 0;
    } else if (p.x > X1 - r) {
      p.x = X1 - r;
      if (d.vx > 0) d.vx = 0;
    }
    if (p.y < Y0 + r) {
      p.y = Y0 + r;
      if (d.vy < 0) d.vy = 0;
    } else if (p.y > Y1 - r) {
      p.y = Y1 - r;
      if (d.vy > 0) d.vy = 0;
    }
    if (r < RC) {
      for (const [cx, cy, sx, sy] of CORNERS) {
        if ((p.x - cx) * sx <= 0 || (p.y - cy) * sy <= 0) continue;
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dd = Math.hypot(dx, dy);
        const lim = RC - r;
        if (dd > lim) {
          p.x = cx + (dx / dd) * lim;
          p.y = cy + (dy / dd) * lim;
          const vn = (d.vx * dx + d.vy * dy) / dd;
          if (vn > 0) {
            d.vx -= (vn * dx) / dd;
            d.vy -= (vn * dy) / dd;
          }
        }
      }
    }
  }

  function malletPair(a, b, ctx) {
    const r = mrOf(ctx);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const min = r * 2;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 < 1e-6) return;
    const dd = Math.sqrt(d2);
    const nx = dx / dd;
    const ny = dy / dd;
    const push = (min - dd) / 2;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    const A = a.data;
    const B = b.data;
    const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if (rv >= 0) return;
    const j = (-(1 + 0.6) * rv) / 2;
    A.vx -= j * nx;
    A.vy -= j * ny;
    B.vx += j * nx;
    B.vy += j * ny;
    if (-rv > 160) {
      const k = clamp(-rv / 900, 0, 1);
      const hx = a.x + nx * r;
      const hy = a.y + ny * r;
      ctx.fx.burst(hx, hy, { count: 5 + Math.round(k * 10), colors: [a.color, b.color, '#ffffff'], speed: 120 + k * 200, life: 0.3, gravity: 0, size: 2.5 });
      ctx.fx.shake(1.5 + k * 4, 0.12);
      snd('bonk');
      if (a.human || b.human) api.haptic(12);
    }
  }

  // ---------- puck physics ----------
  function malletHit(p, b, ctx) {
    const d = p.data;
    const mr = mrOf(ctx);
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const min = mr + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    const dd = Math.sqrt(d2) || 0.001;
    const nx = dd > 0.001 ? dx / dd : 0;
    const ny = dd > 0.001 ? dy / dd : -1;
    b.x = p.x + nx * (min + 0.05);
    b.y = p.y + ny * (min + 0.05);
    const rvx = b.vx - d.vx;
    const rvy = b.vy - d.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    const sl = SLOTS[d.slot];
    const vinBefore = b.vx * sl.nx + b.vy * sl.ny;
    const j = (-(1 + E_MALLET) * vn) / (1 + 1 / MALLET_MASS);
    b.vx += j * nx;
    b.vy += j * ny;
    d.vx -= (j / MALLET_MASS) * nx;
    d.vy -= (j / MALLET_MASS) * ny;
    // glancing blows set the puck spinning
    b.spin += (rvx * -ny + rvy * nx) * 0.03;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > PUCK_MAX) {
      b.vx *= PUCK_MAX / sp;
      b.vy *= PUCK_MAX / sp;
    }
    // Credit: a touch that sends the puck away from your goal makes it yours, and so does a
    // charge that knocks a harmless puck toward your own goal. A guarding mallet that grazes
    // a puck on its way in is only a deflection: the shooter keeps the goal.
    if (b.vx * sl.nx + b.vy * sl.ny > 60 || (p.down && vinBefore > -40)) {
      b.owner = p.i;
      b.touchT = ctx.time;
    }
    b.slowT = 0;
    d.hitT = 0;
    const impact = -vn;
    if (impact < 50 || b.fxCool > 0) return;
    b.fxCool = 0.06;
    const k = clamp(impact / 900, 0, 1);
    const hx = p.x + nx * mr;
    const hy = p.y + ny * mr;
    d.flash = 0.4 + k * 0.6;
    ctx.fx.burst(hx, hy, { count: 4 + Math.round(k * 16), colors: [p.color, '#ffffff'], speed: 120 + k * 300, angle: Math.atan2(ny, nx), spread: 1.8, life: 0.32, gravity: 0, size: 2.5, shape: 'spark' });
    if (k > 0.5) {
      ctx.fx.ring(hx, hy, { color: p.color, radius: 24 + k * 22, life: 0.28, width: 3 });
      ctx.fx.shake(2 + k * 5, 0.14);
      if (k > 0.8 && S.wordT <= 0) {
        S.wordT = 1.1;
        const words = ['SMASH!', 'WHAM!', 'BOOM!', 'SLAP!'];
        ctx.fx.text(clamp(hx, 60, W - 60), clamp(hy - 30, Y0 + 30, Y1 - 30), words[Math.floor(Math.random() * words.length)], { color: p.color, size: 22, life: 0.6, rise: 36 });
      }
    }
    snd('smash', k);
    if (p.human) api.haptic(8 + Math.round(k * 14));
  }

  function railBounce(b, nx, ny, ctx) {
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    b.vx -= (1 + E_RAIL) * vn * nx;
    b.vy -= (1 + E_RAIL) * vn * ny;
    b.spin += (b.vx * -ny + b.vy * nx) * 0.012;
    if (-vn < 70 || S.lobby) return;
    const k = clamp(-vn / 800, 0, 1);
    const x = b.x - nx * b.r;
    const y = b.y - ny * b.r;
    if (S.railFx.length >= 10) S.railFx.shift();
    S.railFx.push({ x, y, nx, ny, t: 0, k });
    const col = b.owner >= 0 ? ctx.players[b.owner].color : '#ffffff';
    ctx.fx.burst(x, y, { count: 3 + Math.round(k * 10), colors: [TABLE.rail, '#ffffff', col], speed: 90 + k * 220, angle: Math.atan2(ny, nx), spread: 2.2, life: 0.3, gravity: 0, size: 2, shape: 'spark' });
    if (S.sndT <= 0) {
      snd('rail', k);
      S.sndT = 0.04;
    }
  }

  // rails, posts, corners and goals. Returns true when the puck went in.
  function railsPuck(b, ctx) {
    const r = b.r;
    const gh = S.gh;
    if (b.x - r < X0) {
      if (S.open[3] && Math.abs(b.y - CY) < gh) {
        if (b.x < X0 - r) return scoreGoal(3, b, ctx);
      } else {
        b.x = X0 + r;
        railBounce(b, 1, 0, ctx);
      }
    } else if (b.x + r > X1) {
      if (S.open[1] && Math.abs(b.y - CY) < gh) {
        if (b.x > X1 + r) return scoreGoal(1, b, ctx);
      } else {
        b.x = X1 - r;
        railBounce(b, -1, 0, ctx);
      }
    }
    if (b.y - r < Y0) {
      if (S.open[2] && Math.abs(b.x - CX) < gh) {
        if (b.y < Y0 - r) return scoreGoal(2, b, ctx);
      } else {
        b.y = Y0 + r;
        railBounce(b, 0, 1, ctx);
      }
    } else if (b.y + r > Y1) {
      if (S.open[0] && Math.abs(b.x - CX) < gh) {
        if (b.y > Y1 + r) return scoreGoal(0, b, ctx);
      } else {
        b.y = Y1 - r;
        railBounce(b, 0, -1, ctx);
      }
    }
    // a puck whose centre is past a goal line is inside the pocket: keep it between the walls
    if (b.x < X0 || b.x > X1) {
      if (Math.abs(b.y - CY) > gh - r) {
        b.y = CY + Math.sign(b.y - CY) * (gh - r);
        b.vy = -b.vy * 0.6;
      }
    }
    if (b.y < Y0 || b.y > Y1) {
      if (Math.abs(b.x - CX) > gh - r) {
        b.x = CX + Math.sign(b.x - CX) * (gh - r);
        b.vx = -b.vx * 0.6;
      }
    }
    // goal posts
    for (let k = 0; k < 4; k++) {
      if (!S.open[k]) continue;
      const sl = SLOTS[k];
      for (let s = -1; s <= 1; s += 2) {
        const px = sl.gx + sl.tx * gh * s;
        const py = sl.gy + sl.ty * gh * s;
        const dx = b.x - px;
        const dy = b.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r && d2 > 1e-6) {
          const dd = Math.sqrt(d2);
          const nx = dx / dd;
          const ny = dy / dd;
          b.x = px + nx * (r + 0.1);
          b.y = py + ny * (r + 0.1);
          railBounce(b, nx, ny, ctx);
        }
      }
    }
    // rounded corners
    for (const [cx, cy, sx, sy] of CORNERS) {
      if ((b.x - cx) * sx <= 0 || (b.y - cy) * sy <= 0) continue;
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dd = Math.hypot(dx, dy);
      const lim = RC - r;
      if (dd > lim) {
        const nx = dx / dd;
        const ny = dy / dd;
        b.x = cx + nx * lim;
        b.y = cy + ny * lim;
        railBounce(b, -nx, -ny, ctx);
      }
    }
    return false;
  }

  function puckPair(a, c, ctx) {
    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const rr = a.r + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 < 1e-6) return;
    const dd = Math.sqrt(d2);
    const nx = dx / dd;
    const ny = dy / dd;
    const push = (rr - dd) / 2 + 0.05;
    a.x -= nx * push;
    a.y -= ny * push;
    c.x += nx * push;
    c.y += ny * push;
    const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
    if (rv >= 0) return;
    const j = (-(1 + 0.95) * rv) / 2;
    a.vx -= j * nx;
    a.vy -= j * ny;
    c.vx += j * nx;
    c.vy += j * ny;
    if (-rv > 80) {
      ctx.fx.burst(a.x + nx * a.r, a.y + ny * a.r, { count: 6, color: '#ffffff', speed: 140, life: 0.25, gravity: 0, size: 2 });
      snd('clack');
    }
  }

  function scoreGoal(k, b, ctx) {
    b.dead = true;
    const p = ctx.players[S.owner[k]];
    const d = p.data;
    const sl = SLOTS[k];
    const lat = (b.x - sl.gx) * sl.tx + (b.y - sl.gy) * sl.ty;
    const gx = sl.gx + sl.tx * clamp(lat, -S.gh + 8, S.gh - 8);
    const gy = sl.gy + sl.ty * clamp(lat, -S.gh + 8, S.gh - 8);
    d.lives -= 1;
    d.pop[Math.max(0, d.lives)] = 1;
    S.goalFlash[k] = 1;
    const into = Math.atan2(sl.ny, sl.nx); // sparks fly back out of the goal into the table
    ctx.fx.burst(gx, gy, { count: 34, colors: [p.color, '#ffffff', '#ffd23f'], speed: 380, angle: into, spread: 2.6, life: 0.65, gravity: 0, size: 4 });
    ctx.fx.burst(gx, gy, { count: 14, colors: ['#ffffff', TABLE.rail], speed: 520, angle: into, spread: 0.9, life: 0.4, gravity: 0, size: 2.5, shape: 'spark' });
    ctx.fx.ring(gx, gy, { color: p.color, radius: 110, life: 0.55, width: 7 });
    ctx.fx.ring(gx, gy, { color: '#ffffff', radius: 60, life: 0.35, width: 3 });
    ctx.fx.flash(p.color, 0.3);
    ctx.fx.shake(12, 0.38);
    let by = b.owner >= 0 ? ctx.players[b.owner] : null;
    // your own clearance that came back much later is just bad luck, not an own goal
    if (by && by.i === p.i && ctx.time - b.touchT > 1.5) by = null;
    const tx = clamp(gx + sl.nx * 96, 74, W - 74);
    const ty = clamp(gy + sl.ny * 96, Y0 + 40, Y1 - 40);
    if (by && by.i === p.i) ctx.fx.text(tx, ty, 'OWN GOAL!', { color: '#ffffff', size: 28, life: 1.1, stroke: p.color });
    else ctx.fx.text(tx, ty, 'GOAL!', { color: by ? by.color : '#ffffff', size: 34, life: 1.1, stroke: 'rgba(3,22,26,0.8)' });
    if (by && by.i !== p.i) by.score += 1;
    snd('goal');
    if (p.human) api.haptic(40);
    if (d.lives <= 0) {
      S.open[k] = false;
      ctx.eliminate(p, { x: gx + sl.nx * 30, y: gy + sl.ny * 30 });
    } else if (d.lives === 1) snd('alarm');
    if (ctx.alive().length > 1) S.serves.push({ t: 0.6 });
    return true;
  }

  // ---------- update ----------
  function update(dt, ctx) {
    S.twist = ctx.twist.id;
    if (S.sndT > 0) S.sndT -= dt;
    if (S.wordT > 0) S.wordT -= dt;
    // the table heats up: a second puck at 20 s, then RUSH at 38 s brings a third and fast air
    let want = S.twist === 'multipuck' ? 2 : 1;
    if (ctx.time > 20) want += 1;
    if (ctx.time > RUSH_T) want = 3;
    if (want > S.want) {
      for (let k = S.want; k < want; k++) S.serves.push({ t: 0.1 + (k - S.want) * 0.4 });
      ctx.fx.text(CX, CY - 70, '+1 PUCK!', { color: '#ffd23f', size: 34, life: 1.3, rise: 40, stroke: 'rgba(3,22,26,0.8)' });
      S.want = want;
    }
    if (!S.rush && ctx.time > RUSH_T) {
      S.rush = true;
      ctx.fx.text(CX, CY + 70, 'RUSH!', { color: TABLE.rail, size: 36, life: 1.3, rise: 30, stroke: 'rgba(3,22,26,0.8)' });
      ctx.fx.flash(TABLE.railGlow, 0.18);
    }
    for (let k = S.serves.length - 1; k >= 0; k--) {
      S.serves[k].t -= dt;
      if (S.serves[k].t <= 0) {
        S.serves.splice(k, 1);
        const live = S.pucks.filter((b) => !b.dead).length;
        if (live < S.want) spawnServe(ctx, SERVE_T);
      }
    }

    const act = ctx.active;
    for (const p of act) {
      const d = p.data;
      if (d.hitT < 9) d.hitT += dt;
      if (!p.alive) {
        d.gone = Math.min(1, d.gone + dt * 3);
        continue;
      }
      steer(p, dt, ctx);
    }

    // Last mallet standing: freeze the pucks for the moment before the crown.
    const frozen = ctx.alive().length <= 1;
    let maxV = 0;
    for (const p of act) if (p.alive) maxV = Math.max(maxV, Math.hypot(p.data.vx, p.data.vy));
    if (!frozen) for (const b of S.pucks) if (!b.dead && b.serve <= 0) maxV = Math.max(maxV, Math.hypot(b.vx, b.vy));
    const n = clamp(Math.ceil((maxV * dt) / 4), 1, 14);
    const h = dt / n;
    for (let s = 0; s < n; s++) {
      for (const p of act) {
        if (!p.alive) continue;
        p.x += p.data.vx * h;
        p.y += p.data.vy * h;
        constrainMallet(p, ctx);
      }
      for (let i = 0; i < act.length; i++) {
        if (!act[i].alive) continue;
        for (let j = i + 1; j < act.length; j++) if (act[j].alive) malletPair(act[i], act[j], ctx);
      }
      if (frozen) continue;
      for (const b of S.pucks) {
        if (b.dead || b.serve > 0) continue;
        b.x += b.vx * h;
        b.y += b.vy * h;
        for (const p of act) if (p.alive) malletHit(p, b, ctx);
        if (railsPuck(b, ctx)) continue;
        // a puck pinned against a rail pushes the mallet back instead
        for (const p of act) {
          if (!p.alive) continue;
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          const min = mrOf(ctx) + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 1e-6) {
            const dd = Math.sqrt(d2);
            p.x = b.x + (dx / dd) * min;
            p.y = b.y + (dy / dd) * min;
            const vn = (p.data.vx * dx + p.data.vy * dy) / dd;
            if (vn < 0) {
              p.data.vx -= (vn * dx) / dd;
              p.data.vy -= (vn * dy) / dd;
            }
          }
        }
      }
      for (let i = 0; i < S.pucks.length; i++) {
        const a = S.pucks[i];
        if (a.dead || a.serve > 0) continue;
        for (let j = i + 1; j < S.pucks.length; j++) {
          const c = S.pucks[j];
          if (!c.dead && c.serve <= 0) puckPair(a, c, ctx);
        }
      }
    }
    if (S.pucks.some((b) => b.dead)) S.pucks = S.pucks.filter((b) => !b.dead);

    const floor = S.rush ? RUSH_FLOOR : 0;
    for (const b of S.pucks) {
      if (b.fxCool > 0) b.fxCool -= dt;
      if (b.serve > 0) {
        if (frozen) continue;
        b.serve -= dt;
        if (b.serve <= 0) launch(b, ctx);
        continue;
      }
      if (frozen) continue;
      const drag = Math.exp(-PUCK_DRAG * dt);
      b.vx *= drag;
      b.vy *= drag;
      let sp = Math.hypot(b.vx, b.vy);
      if (sp < floor && sp > 1) {
        const ns = Math.min(floor, sp + 600 * dt);
        b.vx *= ns / sp;
        b.vy *= ns / sp;
        sp = ns;
      }
      if (sp > PUCK_MAX) {
        b.vx *= PUCK_MAX / sp;
        b.vy *= PUCK_MAX / sp;
      }
      // a puck that dies in no man's land gets a puff from the air jets
      b.slowT = sp < 38 ? b.slowT + dt : 0;
      if (b.slowT > 2.4) {
        b.slowT = 0;
        const alive = ctx.alive();
        const sl = SLOTS[ctx.rng.pick(alive).data.slot];
        const a = Math.atan2(sl.gy - b.y, sl.gx - b.x) + ctx.rng.range(-0.4, 0.4);
        b.vx = Math.cos(a) * 190;
        b.vy = Math.sin(a) * 190;
        ctx.fx.burst(b.x, b.y, { count: 12, colors: ['#ffffff', TABLE.rail], speed: 120, life: 0.4, gravity: 0, size: 3 });
        snd('puff');
      }
      b.spin *= Math.exp(-1.2 * dt);
      b.spin = clamp(b.spin, -40, 40);
      b.ang += b.spin * dt;
      trailPush(b);
    }
    for (const p of act) {
      const d = p.data;
      d.trail[d.th * 2] = p.x;
      d.trail[d.th * 2 + 1] = p.y;
      d.th = (d.th + 1) % 8;
      if (d.tn < 8) d.tn += 1;
    }
  }

  // Cosmetic only: between rounds the live pucks must stay frozen (they could score). Only
  // the empty lobby table gets its attract pucks moved.
  function idle(dt, ctx) {
    if (!S.lobby || ctx.phase !== 'lobby') return;
    for (const b of S.pucks) {
      const n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 5));
      for (let s = 0; s < n; s++) {
        b.x += (b.vx * dt) / n;
        b.y += (b.vy * dt) / n;
        railsPuck(b, ctx);
      }
      b.ang += dt * 3;
      trailPush(b);
    }
  }

  // ---------- bots ----------
  // Bots read the table a few times a second (their reaction lag), then decide to charge
  // (hold) or guard (release). Goalies stay home and only strike what reaches them,
  // hotheads chase everything, and everyone hesitates or misreads now and then.
  function bot(p, dt, ctx) {
    const d = p.data;
    if (!d || d.slot == null) return false;
    const rng = ctx.rng;
    let B = d.bot;
    if (!B) {
      const per = S.persona[p.i] || PERSONAS.balanced;
      B = d.bot = { per, think: rng.range(0.1, 0.35), out: false, lock: 0, sk: rng.range(0.85, 1.2) };
    }
    if (B.lock > 0) {
      B.lock -= dt;
      return B.out;
    }
    B.think -= dt;
    if (B.think > 0) return B.out;
    const per = B.per;
    B.think = rng.range(per.think[0], per.think[1]) * B.sk;
    if (rng.chance(per.err * B.sk)) {
      // hesitate: keep doing whatever we were doing a bit longer
      B.lock = rng.range(0.12, 0.32);
      return B.out;
    }
    const want = decide(p, B, ctx);
    if (want && !B.out && rng.chance(0.25)) {
      // a short jab instead of a long charge
      B.lock = rng.range(0.1, 0.2);
    }
    B.out = want;
    return B.out;
  }

  function decide(p, B, ctx) {
    const d = p.data;
    const per = B.per;
    const rng = ctx.rng;
    const sl = SLOTS[d.slot];
    const depM = (p.x - sl.gx) * sl.nx + (p.y - sl.gy) * sl.ny;
    const latM = (p.x - sl.gx) * sl.tx + (p.y - sl.gy) * sl.ty;
    const md = maxDepth(sl);
    // just hit it: most bots get back home after a strike
    if (B.out && d.hitT < 0.15) {
      if (rng.chance(per.retreat)) {
        B.lock = rng.range(0.15, 0.3);
        return false;
      }
    }
    if (B.out && d.charge > per.chase * B.sk) {
      B.lock = rng.range(0.2, 0.4);
      return false;
    }
    let best = null;
    let bs = Infinity;
    for (const b of S.pucks) {
      if (b.dead || b.serve > 0) continue;
      const dep = (b.x - sl.gx) * sl.nx + (b.y - sl.gy) * sl.ny;
      const vin = b.vx * sl.nx + b.vy * sl.ny;
      const s = vin < -30 ? (dep - b.r) / -vin : 1.5 + dep / 250;
      if (s < bs) {
        bs = s;
        best = b;
      }
    }
    if (!best) return false;
    // the most urgent puck slipped behind us: get home (the glide curls around it)
    if ((best.x - sl.gx) * sl.nx + (best.y - sl.gy) * sl.ny < depM - 8) return false;
    // judge the puck our mallet would actually chase
    const b = nearestPuck(p, d);
    if (!b || b.serve > 0) return false;
    const depB = (b.x - sl.gx) * sl.nx + (b.y - sl.gy) * sl.ny;
    const latB = (b.x - sl.gx) * sl.tx + (b.y - sl.gy) * sl.ty;
    const vin = b.vx * sl.nx + b.vy * sl.ny;
    const vt = b.vx * sl.tx + b.vy * sl.ty;
    const sp = Math.hypot(b.vx, b.vy);
    const inZone = depB < md * per.zone;
    // only pucks behind us are left to chase: stay home rather than knock one in
    if (depB < depM - 8) return false;
    if (rng.chance(per.eager)) return true; // impatience
    if (vin < -50) {
      // incoming: strike when it is about to reach us and lined up
      const tMeet = (depB - depM) / -vin;
      const latMeet = latB + vt * tMeet;
      if (tMeet < per.strike && Math.abs(latMeet - latM) < per.lat) return true;
      if (per.name === 'hothead' && inZone && tMeet < 0.8) return true;
      return B.out && tMeet < per.strike * 1.5;
    }
    if (inZone && sp < per.slow) return true;
    if (vin > 40 && depB > md * 0.8) return false;
    if (B.out && per.name !== 'goalie' && Math.hypot(b.x - p.x, b.y - p.y) < 110) return true;
    return false;
  }

  // ---------- rendering ----------
  let CACHE = null;
  function cache(g) {
    if (CACHE && CACHE.g === g) return CACHE;
    const surf = g.createRadialGradient(CX, CY, 30, CX, CY, 400);
    surf.addColorStop(0, TABLE.surfIn);
    surf.addColorStop(1, TABLE.surfOut);
    const frame = g.createLinearGradient(0, Y0 - FRAME, 0, Y1 + FRAME);
    frame.addColorStop(0, TABLE.frameA);
    frame.addColorStop(0.5, TABLE.frameB);
    frame.addColorStop(1, TABLE.frameA);
    const halo = g.createRadialGradient(CX, CY, 120, CX, CY, 470);
    halo.addColorStop(0, 'rgba(40,200,180,0.16)');
    halo.addColorStop(1, 'rgba(40,200,180,0)');
    let holes = null;
    if (typeof document !== 'undefined') {
      // air holes: a tiny tile repeated over the table (one fill instead of a thousand dots)
      const c = document.createElement('canvas');
      const T = 14;
      const sc = 3;
      c.width = c.height = T * sc;
      const tg = c.getContext('2d');
      tg.fillStyle = 'rgba(150,255,235,0.13)';
      tg.beginPath();
      tg.arc((T / 2) * sc, (T / 2) * sc, 1.1 * sc, 0, TAU);
      tg.fill();
      holes = g.createPattern(c, 'repeat');
      if (holes && holes.setTransform && typeof DOMMatrix !== 'undefined') holes.setTransform(new DOMMatrix([1 / sc, 0, 0, 1 / sc, X0 + 0.5, Y0 + 0.5]));
    }
    CACHE = { g, surf, frame, halo, holes };
    return CACHE;
  }

  function roundRectPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawTable(g, ctx, t) {
    const C = cache(g);
    g.fillStyle = C.halo;
    g.fillRect(0, 0, W, H);
    // frame
    roundRectPath(g, X0 - FRAME, Y0 - FRAME, X1 - X0 + FRAME * 2, Y1 - Y0 + FRAME * 2, RC + FRAME);
    g.fillStyle = C.frame;
    g.fill();
    g.strokeStyle = 'rgba(160,255,240,0.18)';
    g.lineWidth = 1.5;
    g.stroke();
    // frame studs
    g.fillStyle = 'rgba(160,255,240,0.22)';
    for (let i = 1; i < 8; i++) {
      const y = Y0 + ((Y1 - Y0) * i) / 8;
      if (Math.abs(y - CY) < S.gh + 14 && (S.open[1] || S.open[3])) continue;
      g.fillRect(X0 - FRAME / 2 - 1, y - 1, 2, 2);
      g.fillRect(X1 + FRAME / 2 - 1, y - 1, 2, 2);
    }
    // surface
    roundRectPath(g, X0, Y0, X1 - X0, Y1 - Y0, RC);
    g.fillStyle = C.surf;
    g.fill();
    g.save();
    g.clip();
    if (C.holes) {
      g.fillStyle = C.holes;
      g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    }
    if (S.twist === 'ice' && !S.lobby) drawFrost(g, t);
    // each defended goal lights up its end of the table
    for (let k = 0; k < 4; k++) {
      const oi = S.owner[k];
      if (oi < 0) continue;
      const p = ctx.players[oi];
      const sl = SLOTS[k];
      const a = (p.alive ? 0.2 : 0.06) + S.goalFlash[k] * 0.35;
      const gr = g.createRadialGradient(sl.gx, sl.gy, 10, sl.gx, sl.gy, 230);
      gr.addColorStop(0, rgba(p.color, a));
      gr.addColorStop(1, rgba(p.color, 0));
      g.fillStyle = gr;
      g.fillRect(sl.gx - 230, sl.gy - 230, 460, 460);
    }
    // markings
    const sides = S.owner[1] >= 0 || S.owner[3] >= 0;
    g.lineWidth = 2;
    g.strokeStyle = rgba(TABLE.line, 0.4);
    g.beginPath();
    g.moveTo(X0, CY);
    g.lineTo(X1, CY);
    if (sides) {
      g.moveTo(CX, Y0);
      g.lineTo(CX, Y1);
    }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.arc(CX, CY, 56, 0, TAU);
    g.stroke();
    g.fillStyle = 'rgba(3,22,26,0.6)';
    g.beginPath();
    g.arc(CX, CY, 54, 0, TAU);
    g.fill();
    g.strokeStyle = rgba(TABLE.line, 0.5);
    g.beginPath();
    g.arc(CX, CY, 8, 0, TAU);
    g.stroke();
    // creases and home spots
    const inset = homeInset(ctx);
    for (let k = 0; k < 4; k++) {
      const oi = S.owner[k];
      if (oi < 0) continue;
      const p = ctx.players[oi];
      const sl = SLOTS[k];
      const live = S.open[k] && !S.lobby;
      const a0 = Math.atan2(sl.ty, sl.tx);
      g.fillStyle = rgba(p.color, live ? 0.08 : 0.03);
      g.beginPath();
      g.arc(sl.gx, sl.gy, S.cr, a0, a0 + Math.PI, sl.k === 1 || sl.k === 2 ? false : true);
      g.fill();
      g.strokeStyle = rgba(p.color, live ? 0.55 : 0.15);
      g.lineWidth = 2;
      g.stroke();
      if (live) {
        g.strokeStyle = rgba(p.color, 0.35);
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(sl.gx + sl.nx * inset, sl.gy + sl.ny * inset, 5, 0, TAU);
        g.stroke();
      }
    }
    g.restore();
  }

  // ICE TABLE: a frosted sheen with skate scratches over the air holes
  function drawFrost(g, t) {
    const fr = g.createLinearGradient(X0, Y0, X1, Y1);
    const sh = 0.5 + 0.5 * Math.sin(t * 0.7);
    fr.addColorStop(0, 'rgba(225,248,255,0.16)');
    fr.addColorStop(clamp(0.35 + sh * 0.3, 0, 1), 'rgba(225,248,255,0.04)');
    fr.addColorStop(1, 'rgba(225,248,255,0.14)');
    g.fillStyle = fr;
    g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    g.strokeStyle = 'rgba(235,252,255,0.16)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = Math.sin(i * 91.7) * Math.PI;
      const x = X0 + 30 + (((Math.sin(i * 12.9) + 1) / 2) * (X1 - X0 - 60));
      const y = Y0 + 30 + (((Math.sin(i * 78.2) + 1) / 2) * (Y1 - Y0 - 60));
      const L = 26 + (i % 4) * 14;
      g.moveTo(x - Math.cos(a) * L, y - Math.sin(a) * L);
      g.quadraticCurveTo(x + Math.sin(a) * 8, y - Math.cos(a) * 8, x + Math.cos(a) * L, y + Math.sin(a) * L);
    }
    g.stroke();
  }

  function drawLives(g, ctx, t, rdt) {
    for (let k = 0; k < 4; k++) {
      const oi = S.owner[k];
      if (oi < 0) continue;
      const p = ctx.players[oi];
      const d = p.data;
      if (!d || d.lives == null || (!S.open[k] && S.closeAnim[k] >= 1)) continue;
      const sl = SLOTS[k];
      for (let i = 0; i < LIVES; i++) {
        const off = (i - 1) * 19;
        const x = sl.gx + sl.nx * 17 + sl.tx * off;
        const y = sl.gy + sl.ny * 17 + sl.ty * off;
        if (d.pop[i] > 0) d.pop[i] = Math.max(0, d.pop[i] - rdt * 2);
        if (i < d.lives) {
          const beat = d.lives === 1 && p.alive ? 1 + Math.max(0, Math.sin(t * 8)) * 0.3 : 1;
          const gl = glow(p.color, 48, 0.7);
          if (gl) g.drawImage(gl, x - 12 * beat, y - 12 * beat, 24 * beat, 24 * beat);
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(x, y, 5.5 * beat, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.7)';
          g.beginPath();
          g.arc(x - 1.5, y - 1.5, 2, 0, TAU);
          g.fill();
        } else {
          g.strokeStyle = rgba(p.color, 0.35);
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(x, y, 5, 0, TAU);
          g.stroke();
          const pk = d.pop[i];
          if (pk > 0) {
            g.strokeStyle = rgba(p.color, pk);
            g.lineWidth = 3;
            g.beginPath();
            g.arc(x, y, 5 + (1 - pk) * 18, 0, TAU);
            g.stroke();
          }
        }
      }
    }
  }

  function drawRails(g, ctx, t) {
    // neon rail tube along the whole playfield edge; goal mouths are cut into it afterwards
    g.save();
    roundRectPath(g, X0, Y0, X1 - X0, Y1 - Y0, RC);
    g.shadowColor = TABLE.railGlow;
    g.shadowBlur = 10;
    g.strokeStyle = TABLE.rail;
    g.lineWidth = 3.5;
    g.stroke();
    g.restore();
    for (let k = 0; k < 4; k++) drawGoal(g, ctx, k, t);
    // rail flashes where pucks hit
    for (const f of S.railFx) {
      const a = 1 - f.t / 0.35;
      if (a <= 0) continue;
      const gl = glow('#ffffff', 64, 0.9);
      const s = 26 + f.k * 34;
      g.globalAlpha = a;
      if (gl) g.drawImage(gl, f.x - s / 2, f.y - s / 2, s, s);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 4;
      g.lineCap = 'round';
      const L = 10 + f.k * 22;
      g.beginPath();
      g.moveTo(f.x - f.ny * L, f.y + f.nx * L);
      g.lineTo(f.x + f.ny * L, f.y - f.nx * L);
      g.stroke();
      g.globalAlpha = 1;
    }
  }

  function drawGoal(g, ctx, k, t) {
    const oi = S.owner[k];
    if (oi < 0) return;
    const p = ctx.players[oi];
    const sl = SLOTS[k];
    const gh = S.gh;
    const flash = S.goalFlash[k];
    const lastLife = p.alive && p.data.lives === 1 && !S.lobby;
    // pocket: a dark slot through the frame, glowing in the owner's color
    const ox = -sl.nx; // outward
    const oy = -sl.ny;
    const ax = sl.gx - sl.tx * gh;
    const ay = sl.gy - sl.ty * gh;
    const bx = sl.gx + sl.tx * gh;
    const by = sl.gy + sl.ty * gh;
    const depth = FRAME + 4;
    const x0 = Math.min(ax, bx, ax + ox * depth);
    const y0 = Math.min(ay, by, ay + oy * depth);
    const x1 = Math.max(ax, bx, ax + ox * depth);
    const y1 = Math.max(ay, by, ay + oy * depth);
    g.fillStyle = '#020b0d';
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const open = S.open[k];
    const ca = S.closeAnim[k];
    if (open || ca < 1) {
      const gr = g.createLinearGradient(sl.gx, sl.gy, sl.gx + ox * depth, sl.gy + oy * depth);
      const pulse = lastLife ? 0.25 + 0.25 * Math.sin(t * 8) : 0;
      gr.addColorStop(0, rgba(p.color, 0.75 + flash * 0.25));
      gr.addColorStop(1, rgba(p.color, 0.1 + pulse));
      g.fillStyle = gr;
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      // net mesh
      g.save();
      g.beginPath();
      g.rect(x0, y0, x1 - x0, y1 - y0);
      g.clip();
      g.strokeStyle = 'rgba(2,11,13,0.45)';
      g.lineWidth = 1;
      g.beginPath();
      const len = gh * 2;
      for (let s = -depth; s < len + depth; s += 7) {
        g.moveTo(ax + sl.tx * s, ay + sl.ty * s);
        g.lineTo(ax + sl.tx * (s + depth) + ox * depth, ay + sl.ty * (s + depth) + oy * depth);
        g.moveTo(ax + sl.tx * (s + depth), ay + sl.ty * (s + depth));
        g.lineTo(ax + sl.tx * s + ox * depth, ay + sl.ty * s + oy * depth);
      }
      g.stroke();
      g.restore();
      // glowing goal line
      g.save();
      g.shadowColor = p.color;
      g.shadowBlur = 16 + flash * 20;
      g.strokeStyle = lastLife && Math.sin(t * 8) > 0 ? '#ffffff' : p.color;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      g.restore();
    }
    if (!open) {
      // the goal slides shut from both posts into a rail
      const e = ca * ca * (3 - 2 * ca);
      const half = gh * e;
      g.save();
      g.shadowColor = p.color;
      g.shadowBlur = 8;
      g.strokeStyle = rgba(p.color, 0.8);
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(ax + sl.tx * half, ay + sl.ty * half);
      g.moveTo(bx, by);
      g.lineTo(bx - sl.tx * half, by - sl.ty * half);
      g.stroke();
      g.restore();
      if (ca >= 1) {
        // bolted shut: an X over the old mouth
        g.strokeStyle = rgba(p.color, 0.55);
        g.lineWidth = 2;
        const mx = sl.gx + ox * (depth / 2);
        const my = sl.gy + oy * (depth / 2);
        g.beginPath();
        for (let s = -1; s <= 1; s += 2) {
          const cx = mx + sl.tx * gh * 0.5 * s;
          const cy = my + sl.ty * gh * 0.5 * s;
          g.moveTo(cx - 5, cy - 5);
          g.lineTo(cx + 5, cy + 5);
          g.moveTo(cx + 5, cy - 5);
          g.lineTo(cx - 5, cy + 5);
        }
        g.stroke();
        // OUT stamp on the table in front of the closed goal
        g.save();
        g.globalAlpha = ctx.phase === 'play' ? 0.85 : 0.35;
        g.translate(sl.gx + sl.nx * 70, sl.gy + sl.ny * 70);
        if (k === 1) g.rotate(-Math.PI / 2);
        else if (k === 3) g.rotate(Math.PI / 2);
        else if (k === 2) g.rotate(Math.PI);
        ctx.draw.text(g, 'OUT', 0, 0, { size: 28, color: p.color, stroke: '#03161a' });
        g.restore();
      }
    }
    // posts
    for (const [px, py] of [
      [ax, ay],
      [bx, by],
    ]) {
      ctx.draw.circle(g, px, py, 5, '#ffffff', p.color, 2);
    }
  }

  function drawServes(g, ctx, t) {
    for (const b of S.pucks) {
      if (b.serve <= 0 || S.lobby) continue;
      const k = b.serve / b.serve0;
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(b.x, b.y, b.r + 8 + k * 22, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      g.stroke();
      const tc = b.target >= 0 ? ctx.players[b.target].color : '#ffffff';
      const a = Math.atan2(b.ay, b.ax);
      g.save();
      g.translate(b.x, b.y);
      g.rotate(a);
      g.fillStyle = tc;
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 18);
      for (let i = 0; i < 3; i++) {
        const ox = b.r + 14 + i * 11;
        g.beginPath();
        g.moveTo(ox + 7, 0);
        g.lineTo(ox, -6);
        g.lineTo(ox, 6);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
  }

  function drawPucks(g, ctx) {
    for (const b of S.pucks) {
      const col = b.owner >= 0 ? ctx.players[b.owner].color : '#ffffff';
      // trail: a tapering ribbon behind the puck
      if (b.tn > 2 && b.serve <= 0) {
        g.lineCap = 'round';
        g.strokeStyle = col;
        let px = 0;
        let py = 0;
        for (let i = 0; i < b.tn; i++) {
          const idx = (b.th - b.tn + i + TRAIL) % TRAIL;
          const x = b.trail[idx * 2];
          const y = b.trail[idx * 2 + 1];
          if (i > 0) {
            const q = i / b.tn;
            g.globalAlpha = q * 0.45;
            g.lineWidth = b.r * 2 * (0.15 + q * 0.75);
            g.beginPath();
            g.moveTo(px, py);
            g.lineTo(x, y);
            g.stroke();
          }
          px = x;
          py = y;
        }
        g.globalAlpha = 1;
      }
      drawPuck(g, b.x, b.y, b.r, { color: col, ang: b.ang });
    }
  }

  function drawMallets(g, ctx, t, rdt) {
    const r = mrOf(ctx);
    for (const p of ctx.active) {
      const d = p.data;
      if (!d || d.slot == null) continue;
      if (!p.alive && d.gone >= 1) continue;
      if (d.flash > 0) d.flash = Math.max(0, d.flash - rdt * 5);
      if (d.leash > 0) d.leash = Math.max(0, d.leash - rdt * 3);
      const sp = Math.hypot(d.vx, d.vy);
      // speed ghosts while charging fast
      if (p.alive && sp > 260 && d.tn >= 8) {
        for (let i = 1; i < 5; i++) {
          const idx = (d.th - 1 - i * 2 + 16) % 8;
          const x = d.trail[idx * 2];
          const y = d.trail[idx * 2 + 1];
          g.globalAlpha = (0.22 - i * 0.045) * clamp((sp - 260) / 200, 0, 1);
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(x, y, r * (1 - i * 0.08), 0, TAU);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      // reach limit: a short line shows where the mallet was stopped
      if (d.leash > 0 && p.alive) {
        const sl = SLOTS[d.slot];
        const md = maxDepth(sl) + r;
        const lat = (p.x - sl.gx) * sl.tx + (p.y - sl.gy) * sl.ty;
        const lx = sl.gx + sl.nx * md + sl.tx * lat;
        const ly = sl.gy + sl.ny * md + sl.ty * lat;
        g.strokeStyle = rgba(p.color, d.leash * 0.8);
        g.lineWidth = 3;
        g.setLineDash([6, 5]);
        g.beginPath();
        g.moveTo(lx - sl.tx * 34, ly - sl.ty * 34);
        g.lineTo(lx + sl.tx * 34, ly + sl.ty * 34);
        g.stroke();
        g.setLineDash([]);
      }
      const charge = p.alive && p.down && ctx.phase === 'play' ? clamp(0.4 + sp / CHASE_MAX, 0, 1) : 0;
      const alpha = p.alive ? 1 : 1 - d.gone;
      drawMallet(g, p.x, p.y, r * (p.alive ? 1 : 1 + d.gone * 0.4), p.color, { charge, flash: d.flash, t, alpha });
    }
  }

  // First round only: show each human what their one button does, next to their mallet.
  function drawHints(g, ctx) {
    if (api.demo || ctx.round !== 1) return;
    const ph = ctx.phase;
    const k = ph === 'card' || ph === 'count' ? 1 : ph === 'play' ? clamp(4.5 - ctx.time, 0, 1) : 0;
    if (k <= 0) return;
    for (const p of ctx.active) {
      if (!p.human || !p.alive || !p.data) continue;
      const sl = SLOTS[p.data.slot];
      const off = sl.k === 0 || sl.k === 2 ? 150 : 160;
      const x = sl.gx + sl.nx * off;
      const y = sl.gy + sl.ny * off;
      g.save();
      g.globalAlpha = k;
      g.translate(x, y);
      if (p.i === 2 || p.i === 3) g.rotate(Math.PI); // seats across the table read upside down
      ctx.draw.roundRect(g, -76, -23, 152, 46, 14, 'rgba(3,18,22,0.88)', p.color, 2);
      ctx.draw.text(g, 'HOLD = ATTACK', 0, -7, { size: 14, color: '#ffffff', shadow: false });
      ctx.draw.text(g, 'let go = back to goal', 0, 10, { size: 11, weight: 700, color: 'rgba(255,255,255,0.75)', shadow: false });
      g.restore();
    }
  }

  function render(g, ctx) {
    const now = api.totalTime;
    let rdt = now - S.lastT;
    S.lastT = now;
    if (!(rdt >= 0) || rdt > 0.05) rdt = 0.016;
    S.t += rdt;
    const t = S.t;
    for (let k = 0; k < 4; k++) {
      if (S.goalFlash[k] > 0) S.goalFlash[k] = Math.max(0, S.goalFlash[k] - rdt * 2);
      if (!S.open[k] && S.owner[k] >= 0) S.closeAnim[k] = Math.min(1, S.closeAnim[k] + rdt * 2.2);
    }
    for (const f of S.railFx) f.t += rdt;
    drawTable(g, ctx, t);
    drawLives(g, ctx, t, rdt);
    drawRails(g, ctx, t);
    drawServes(g, ctx, t);
    drawPucks(g, ctx);
    drawMallets(g, ctx, t, rdt);
    drawHints(g, ctx);
  }

  return createParty(api, {
    roundsToWin: 3,
    roundTime: ROUND_TIME,
    twists: ['turbo', 'giants', 'tiny', 'swap', 'lights', 'wobble', MULTI, ICE, WIDE],
    lightRadius: 118,
    setup,
    update,
    render,
    bot,
    idle,
    timeUp(ctx) {
      // the crown goes to whoever has the most lives left
      const alive = ctx.alive();
      if (!alive.length) return null;
      const top = Math.max(...alive.map((p) => p.data.lives));
      return alive.filter((p) => p.data.lives === top);
    },
  });
}
