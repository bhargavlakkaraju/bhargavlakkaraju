// Rope Rumble - a multi-way tug of war for 1 to 4 players on one screen (party kit).
//
// Every player hangs on to a rope tied to one brass ring in a mud pit. TAP to heave the ring
// toward you. A pulse ring closes in around your puller after every heave: tap as it meets
// the circle (the green window) for a POWER PULL worth three normal heaves that also costs
// less stamina. Mashing drains your stamina bar, a heave on an empty bar slips and loses some
// of its pull, and heaves crammed too close together have less weight behind them.
// HOLD to dig in: you brace against being dragged while your stamina slowly drains. Drag the
// ring over your own chalk line to win the round. With 3 or 4 pullers, anyone dragged too far
// the other way loses their footing, face-plants and is out. After 25 seconds SUDDEN DEATH
// pulls every line toward the middle, and at the bell the ring goes to whoever is closest.
import { createParty, PLAYER_COLORS } from '../engine/party.js';
import * as draw from '../engine/draw.js';
import { TAU, PIT_R, clamp, jit, drawField, drawBunting, drawFlag, drawRing, drawRope, drawPuller, pullerGeom, pitPath } from './art.js';

const W = 420;
const H = 740;
const L = { cx: 210, cy: 395, sx: 165, sy: 262 }; // arena units -> screen pixels
const ANCHOR = 0.95; // where the pullers stand (arena units from the centre)
const WALL = 0.86; // the ring cannot leave the pit
const Z0 = 0.5; // win line distance (a three-way star is harder to break, so its lines sit closer)
const Z3 = 0.38;
const FALL0 = 0.4; // dragged this far the other way (3+ pullers): face-plant, out
const FALL3 = 0.31;
const SD_END = 0.6; // sudden death pulls the lines in to this fraction
const ROUND_TIME = 35;
const SUDDEN = 10; // last seconds: the lines close in
const FRICTION = 2.6; // ring drag in the mud (1/s)
const IMP = 0.06; // ring speed added by one normal heave
const POWER = 3; // a power pull is worth this many heaves
const WEAK = 0.64; // a slip still tugs, just less (and costs no stamina)
const LEVERAGE = 0.8; // pullers who are winning get better footing
const BEAT = 0.42; // seconds after a heave when the power window peaks
const WIN_H = 0.085; // half width of the power window
const MISS = 0.12; // the cue restarts this long after a missed window
const CYCLE = BEAT + WIN_H + MISS;
const COST = 0.12; // stamina per heave
const COST_POWER = 0.05;
const REGEN = 0.42; // stamina per second while resting
const REGEN_BUSY = 0.28; // ... and while heaving away
const REGEN_DELAY = 0.18;
const DIG_T = 0.2; // hold this long to dig in
const DIG_DRAIN = 0.16;
const BRAKE = 7; // how hard a dug-in puller resists being dragged
const STUMBLE = 0.25; // running dry while dug in costs this long
const STUMBLE_TIRED = 0.03; // a tired slip is only a wobble (mashers keep playing)
const TEMPO = 0.15; // heaves closer together than this land with less force
const FINISH_T = 0.8; // the winning yank plays this long before the round closes
const GUST = 0.12;
const PREF = [135, 45, -45, -135].map((a) => (a * Math.PI) / 180); // each seat's corner
const FEET = [52, W - 52, 168, 652]; // where feet may stand on screen (corner buttons stay clear)
const DUST = ['#e3c08a', '#c9a06a', '#f1dcb2'];
const MUD = ['#6b411f', '#8a5a2e', '#4e2e12'];
const BUNTING = ['#ff3d8b', '#ffffff', '#2fd9ff', '#ffc93c', '#7dff5a', '#ffffff'];

const BUTTER = { id: 'butter', name: 'BUTTER ROPE', desc: 'Greasy rope: some heaves just slip', emoji: '🧈' };
const GUSTY = { id: 'gust', name: 'GUST', desc: 'The wind keeps shoving the ring around', emoji: '🍃' };

// Bot personalities: mashers burn out, rhythm pros time power pulls, anchors dig in when
// they start losing, hotheads keep the beat until they panic (or smell victory) and mash.
const STYLES = {
  masher: { rate: [6.5, 8.5], restAt: 0.1, resume: [0.55, 0.9], dig: 0.25, lapse: 0.25 },
  rhythm: { sigma: 0.06, restAt: 0.2, resume: [0.45, 0.65], dig: 0.3, lapse: 0.36, extra: 0.07 },
  anchor: { sigma: 0.072, restAt: 0.3, resume: [0.6, 0.85], dig: 1, lapse: 0.36, extra: 0.05 },
  hothead: { sigma: 0.068, rate: [7, 9], restAt: 0.12, resume: [0.5, 0.75], dig: 0.25, lapse: 0.26, extra: 0.06 },
};

const PS = 1.25; // puller scale on the 420x740 field
const toS = (ax, ay) => [L.cx + ax * L.sx, L.cy + ay * L.sy];
const sz = (ctx) => ctx.size * PS;

export default function createGame(api) {
  const fx = api.fx;
  const sfx = api.sfx;
  const S = {
    lobby: true,
    n: 4,
    line: null,
    pullers: [],
    rx: 0,
    ry: 0,
    vx: 0,
    vy: 0,
    Z: Z0,
    FALL: FALL0,
    z0: Z0,
    f0: FALL0,
    sudden: false,
    finish: null,
    wind: { a: 0, s: 0, t: 0 },
    skids: [],
    streaks: [],
    leaves: [],
    clock: 0,
    glint: 0,
    beacon: 0,
    tick: 0,
    flash: 0,
    ribbon: -Math.PI / 2,
    creak: 0,
  };
  const styles = [null, null, null, null];
  let field = null;

  // ---------- layout ----------
  // Pullers spread evenly around the ring, each as close to its own corner as possible.
  function makeLayout(list) {
    const n = list.length;
    const sorted = list.slice().sort((a, b) => PREF[b.i] - PREF[a.i]);
    const sp = TAU / n;
    let cx = 0;
    let cy = 0;
    sorted.forEach((p, k) => {
      cx += Math.cos(PREF[p.i] + k * sp);
      cy += Math.sin(PREF[p.i] + k * sp);
    });
    const off = Math.atan2(cy, cx);
    return sorted.map((p, k) => {
      const ang = off - k * sp;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      return { i: p.i, ang, ux, uy, ax: ux * ANCHOR, ay: uy * ANCHOR };
    });
  }

  function freshData(d, lay) {
    Object.assign(d, {
      L: lay,
      stam: 1,
      beat: 0,
      since: 1,
      held: 0,
      dig: false,
      stumble: 0,
      tension: 0.4,
      kick: 0,
      twang: 0,
      combo: 0,
      slide: 0,
      fallen: null,
      tumble: -1,
      cheer: -1,
      textT: -9,
      digT: -9,
      slipT: 0,
      dash: 0,
      danger: 0,
      fx: 0,
      fy: 0,
      skx: 0,
      sky: 0,
      bot: null,
    });
    return d;
  }

  const proj = (d) => S.rx * d.L.ux + S.ry * d.L.uy;
  const awaySpeed = (d) => -(S.vx * d.L.ux + S.vy * d.L.uy);

  function place(q, ctx) {
    const d = q.d;
    const r = ANCHOR + d.slide;
    d.fx = clamp(L.cx + q.L.ux * r * L.sx, FEET[0], FEET[1]);
    d.fy = clamp(L.cy + q.L.uy * r * L.sy, FEET[2], FEET[3]);
    if (q.p) {
      q.p.x = d.fx;
      q.p.y = d.fy - 21 * sz(ctx);
    }
  }

  function setup(ctx) {
    S.lobby = !ctx.active.length;
    S.rx = S.ry = S.vx = S.vy = 0;
    S.sudden = false;
    S.finish = null;
    S.skids = [];
    S.clock = 0;
    S.glint = 0;
    S.beacon = 0;
    S.tick = 0;
    S.flash = 0;
    S.ribbon = -Math.PI / 2;
    S.wind = { a: ctx.rng() * TAU, s: 0, t: 0 };
    S.streaks = [];
    S.leaves = [];
    if (ctx.twist.id === 'gust') {
      for (let i = 0; i < 26; i++) S.streaks.push({ x: Math.random() * W, y: Math.random() * H, l: 16 + Math.random() * 30, z: 0.5 + Math.random() * 0.5 });
      for (let i = 0; i < 9; i++) S.leaves.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, c: i % 3 ? '#9be36b' : '#f2c14e', z: 0.6 + Math.random() * 0.5 });
    }
    const list = S.lobby ? [0, 1, 2, 3].map((i) => ({ i })) : ctx.active;
    const lay = makeLayout(list);
    S.n = lay.length;
    S.line = S.n === 2 ? { x: lay[0].ux, y: lay[0].uy } : null;
    S.z0 = S.n === 3 ? Z3 : Z0;
    S.f0 = S.n === 3 ? FALL3 : FALL0;
    S.Z = S.z0;
    S.FALL = S.f0;
    if (!S.lobby && (ctx.round === 1 || !styles.some(Boolean))) {
      const kinds = ctx.rng.shuffle(['rhythm', 'masher', 'anchor', 'hothead']);
      ctx.active.forEach((p, k) => {
        const kind = kinds[k % kinds.length];
        styles[p.i] = { kind, ...STYLES[kind], sk: ctx.rng.range(0.75, 1.1) };
      });
    }
    S.pullers = lay.map((ly) => {
      const p = S.lobby ? null : ctx.players[ly.i];
      const d = freshData(p ? p.data : {}, ly);
      return { p, i: ly.i, color: PLAYER_COLORS[ly.i], L: ly, d };
    });
    for (const q of S.pullers) {
      place(q, ctx);
      q.d.skx = q.d.fx;
      q.d.sky = q.d.fy;
    }
  }

  // ---------- sounds ----------
  const snd = {
    heave(human) {
      if (human) {
        sfx.tone({ freq: 190 + Math.random() * 30, to: 120, type: 'triangle', dur: 0.08, vol: 0.13 });
        sfx.noise({ dur: 0.06, vol: 0.07, freq: 1500, type: 'bandpass', q: 3 });
      } else sfx.noise({ dur: 0.05, vol: 0.025, freq: 900, type: 'bandpass', q: 2 });
    },
    power(human, combo) {
      const v = human ? 1 : 0.35;
      sfx.tone({ freq: 120, to: 55, type: 'sine', dur: 0.22, vol: 0.3 * v });
      sfx.noise({ dur: 0.16, vol: 0.12 * v, freq: 700, to: 2600, type: 'bandpass', q: 1.2 });
      if (human) sfx.combo(Math.min(combo, 12), 392);
    },
    slip(human) {
      const v = human ? 1 : 0.5;
      sfx.tone({ freq: 760, to: 190, type: 'square', dur: 0.16, vol: 0.06 * v });
      sfx.noise({ dur: 0.12, vol: 0.06 * v, freq: 3000, to: 800, type: 'highpass' });
    },
    dig() {
      sfx.noise({ dur: 0.3, vol: 0.12, freq: 600, to: 180 });
    },
    creak() {
      sfx.tone({ freq: 70 + Math.random() * 30, to: 52, type: 'sawtooth', dur: 0.16, vol: 0.025 });
    },
    splat() {
      sfx.noise({ dur: 0.4, vol: 0.28, freq: 900, to: 140 });
      sfx.tone({ freq: 160, to: 50, type: 'sine', dur: 0.3, vol: 0.2 });
    },
    yank() {
      sfx.play('whoosh');
      sfx.tone({ freq: 90, to: 40, type: 'sine', dur: 0.4, vol: 0.32, delay: 0.1 });
      sfx.noise({ dur: 0.3, vol: 0.2, freq: 1200, to: 150, delay: 0.1 });
    },
    siren() {
      [0, 0.22, 0.44].forEach((delay) => sfx.tone({ freq: 620, to: 920, type: 'square', dur: 0.18, vol: 0.06, delay }));
    },
    tick(n) {
      sfx.tone({ freq: n <= 3 ? 990 : 760, type: 'square', dur: 0.05, vol: 0.06 });
    },
  };

  // ---------- helpers ----------
  const ringScreen = () => toS(S.rx, S.ry);
  const ringR = (ctx) => 19 * ctx.size;

  function dirToRing(q) {
    const [rx, ry] = ringScreen();
    const dx = rx - q.d.fx;
    const dy = ry - q.d.fy;
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  function say(q, str, o, ctx) {
    const s = sz(ctx);
    fx.text(clamp(q.d.fx, 84, W - 84), clamp(q.d.fy - 58 * s, 112, H - 110), str, o);
  }

  // ---------- heaving ----------
  function heave(q, ctx) {
    const d = q.d;
    const p = q.p;
    if (d.stumble > 0) {
      d.beat = 0; // flailing: the press is wasted and the cue starts over
      return;
    }
    const inWin = Math.abs(d.beat - BEAT) <= WIN_H;
    const cost = inWin ? COST_POWER : COST;
    let kind = inWin ? 2 : 1; // 2 power, 1 normal, 0 slip
    let why = '';
    if (d.stam < cost) {
      kind = 0;
      why = 'tired';
    } else if (ctx.twist.id === 'butter' && ctx.rng() < (inWin ? 0.1 : 0.2)) {
      kind = 0;
      why = 'butter';
    }
    if (kind > 0 || why === 'butter') d.stam = Math.max(0, d.stam - cost);
    // nobody can set their feet ten times a second: rushed heaves land lighter
    const tempo = kind === 2 ? 1 : clamp(d.since / TEMPO, 0.35, 1);
    const str = (kind === 2 ? POWER : kind === 1 ? 1 : WEAK) * tempo;
    const lev = 1 + LEVERAGE * clamp(proj(d), -0.5, 0.5);
    const imp = IMP * str * lev * (S.sudden ? 1.2 : 1);
    const ex = d.L.ax - S.rx;
    const ey = d.L.ay - S.ry;
    const el = Math.hypot(ex, ey) || 1;
    S.vx += (ex / el) * imp;
    S.vy += (ey / el) * imp;
    d.beat = 0;
    d.since = 0;
    d.kick = kind === 2 ? 1.4 : kind === 1 ? 1 : 0.3;
    d.tension = 1;
    if (kind === 2) {
      d.combo += 1;
      d.twang = 1;
      S.flash = 1;
    } else d.combo = 0;
    if (kind === 0) {
      d.stumble = why === 'butter' ? STUMBLE * 0.6 : STUMBLE_TIRED;
      d.slipT = 0.28; // the stumble animation outlasts the tiny lockout
    }
    heaveFx(q, kind, why, ctx);
    if (p.human) api.haptic(kind === 2 ? 18 : 8);
  }

  function heaveFx(q, kind, why, ctx) {
    const d = q.d;
    const p = q.p;
    const s = sz(ctx);
    const [dx, dy] = dirToRing(q);
    const awayA = Math.atan2(-dy, -dx);
    if (kind === 2) {
      fx.burst(d.fx - dx * 6 * s, d.fy, { count: 12, colors: DUST, speed: 150, angle: awayA, spread: 1.7, life: 0.5, gravity: 60, drag: 0.9, size: 4.5 * s });
      const hx = d.fx + dx * 18 * s;
      const hy = d.fy - 20 * s + dy * 18 * s;
      fx.ring(hx, hy, { color: p.color, radius: 30 * s, life: 0.3, width: 3 });
      const [rx, ry] = ringScreen();
      fx.burst(rx, ry, { count: 5, colors: ['#fff3b8', '#ffd24d'], speed: 120, angle: Math.atan2(-dy, -dx), spread: 1.2, life: 0.3, gravity: 0, size: 2.5, shape: 'spark' });
      fx.shake(p.human ? 4 : 2, 0.14);
      if (S.clock - d.textT > 0.7) {
        d.textT = S.clock;
        say(q, d.combo >= 3 ? `POWER x${d.combo}!` : 'POWER!', { color: '#6dff9e', size: p.human ? 21 : 15, life: 0.65, rise: 34, stroke: 'rgba(16,8,31,0.65)' }, ctx);
      }
      snd.power(p.human, d.combo);
    } else if (kind === 1) {
      fx.burst(d.fx - dx * 6 * s, d.fy, { count: 4, colors: DUST, speed: 90, angle: awayA, spread: 1.5, life: 0.35, gravity: 40, drag: 0.9, size: 3 * s });
      snd.heave(p.human);
    } else {
      fx.burst(d.fx + dx * 16 * s, d.fy - 22 * s + dy * 16 * s, { count: 7, colors: why === 'butter' ? ['#ffe27a', '#fff6c9'] : ['#ffffff', '#9fe3ff'], speed: 110, life: 0.4, gravity: 200, size: 3 * s });
      if (S.clock - d.textT > 0.45) {
        d.textT = S.clock;
        say(q, why === 'butter' ? 'BUTTERFINGERS!' : 'SLIP!', { color: why === 'butter' ? '#ffe27a' : '#ffffff', size: p.human ? 20 : 15, life: 0.7, rise: 30, stroke: 'rgba(16,8,31,0.65)' }, ctx);
      }
      snd.slip(p.human);
    }
  }

  function startDig(q, ctx) {
    const d = q.d;
    d.dig = true;
    const s = sz(ctx);
    const [dx] = dirToRing(q);
    fx.burst(d.fx - dx * 8 * s, d.fy, { count: 10, colors: DUST, speed: 110, angle: -Math.PI / 2 - dx * 0.8, spread: 1.6, life: 0.45, gravity: 160, size: 3.5 * s });
    if (q.p.human) {
      snd.dig();
      if (S.clock - d.digT > 3) {
        d.digT = S.clock;
        say(q, 'DIG IN!', { color: '#ffb35c', size: 18, life: 0.6, rise: 26, stroke: 'rgba(16,8,31,0.65)' }, ctx);
      }
    }
  }

  function faceplant(q, ctx) {
    const d = q.d;
    const s = sz(ctx);
    d.dig = false;
    d.fallen = { t: 0 };
    d.slide = Math.max(-0.3, d.slide - 0.06);
    place(q, ctx);
    ctx.eliminate(q.p, { x: q.p.x, y: q.p.y });
    fx.burst(d.fx, d.fy - 6 * s, { count: 24, colors: MUD, speed: 230, angle: -Math.PI / 2, spread: 2.4, life: 0.7, gravity: 520, size: 4.5 * s });
    say(q, 'FACEPLANT!', { color: '#ffffff', size: 24, life: 1.1, stroke: q.color }, ctx);
    snd.splat();
  }

  function startFinish(winner, ctx, timeUp) {
    if (S.finish) return;
    const wq = S.pullers.find((q) => q.p === winner);
    if (!wq) return;
    S.finish = { winner, wq, t: 0, x0: S.rx, y0: S.ry, ended: !!timeUp };
    wq.d.cheer = 0;
    wq.d.kick = 1.6;
    wq.d.dig = false;
    for (const q of S.pullers) {
      if (q === wq || !q.p || !q.p.alive || q.d.fallen) continue;
      q.d.tumble = 0;
      q.d.dig = false;
    }
    const [rx, ry] = ringScreen();
    fx.shake(12, 0.4);
    fx.burst(rx, ry, { count: 30, colors: MUD, speed: 300, life: 0.7, gravity: 420, size: 5 });
    fx.ring(rx, ry, { color: winner.color, radius: 90, life: 0.5, width: 6 });
    fx.flash(winner.color, 0.22);
    fx.text(W / 2, H / 2 - 132, timeUp ? 'TIME!' : 'YANK!', { color: '#ffffff', size: 44, life: 1, rise: 30, stroke: winner.color });
    snd.yank();
    if (winner.human) api.haptic(45);
  }

  function stepFinish(dt) {
    const F = S.finish;
    F.t += dt;
    const u = F.wq.d.L;
    const tx = u.ux * (S.Z + 0.24);
    const ty = u.uy * (S.Z + 0.24);
    const k = api.ease.outBack(Math.min(1, F.t / 0.45));
    S.rx = F.x0 + (tx - F.x0) * k;
    S.ry = F.y0 + (ty - F.y0) * k;
    S.vx = S.vy = 0;
  }

  // ---------- update ----------
  function update(dt, ctx) {
    S.clock += dt;
    if (S.finish) {
      stepFinish(dt);
      if (!S.finish.ended && S.finish.t >= FINISH_T) {
        S.finish.ended = true;
        ctx.endRound(S.finish.winner);
      }
      stepCosmetic(dt, ctx);
      return;
    }
    // sudden death: the lines creep toward the middle
    const left = ROUND_TIME - ctx.time;
    if (!S.sudden && left <= SUDDEN) {
      S.sudden = true;
      fx.text(W / 2, H / 2 - 120, 'SUDDEN DEATH!', { color: '#ff5a5a', size: 34, life: 1.7, rise: 20, stroke: '#10081f' });
      fx.text(W / 2, H / 2 - 86, 'the lines close in', { color: '#ffffff', size: 17, life: 1.7, rise: 20, stroke: '#10081f' });
      fx.flash('#ff3b3b', 0.18);
      snd.siren();
    }
    if (S.sudden) {
      const k = clamp((SUDDEN - left) / SUDDEN, 0, 1);
      S.Z = S.z0 * (1 + (SD_END - 1) * k);
      S.FALL = S.f0 * (1 + (SD_END - 1) * k);
    }
    const sec = Math.ceil(left);
    if (sec <= 5 && sec >= 1 && sec !== S.tick) {
      S.tick = sec;
      snd.tick(sec);
    }
    // gusts
    if (ctx.twist.id === 'gust') {
      S.wind.t += dt;
      S.wind.a += Math.sin(S.wind.t * 0.45) * 0.55 * dt;
      S.wind.s = GUST * (0.75 + 0.35 * Math.sin(S.wind.t * 1.3));
    } else S.wind.s = 0;
    // pullers
    for (const q of S.pullers) {
      const p = q.p;
      if (!p || !p.alive) continue;
      const d = q.d;
      d.beat += dt;
      d.since += dt;
      if (d.stumble > 0) d.stumble = Math.max(0, d.stumble - dt);
      if (p.tap) heave(q, ctx);
      if (p.down) {
        d.held += dt;
        if (!d.dig && d.held >= DIG_T && d.stumble <= 0 && d.stam > 0.03) startDig(q, ctx);
      } else {
        d.held = 0;
        d.dig = false;
      }
      if (d.dig) {
        d.stam -= DIG_DRAIN * dt;
        if (d.stam <= 0) {
          d.stam = 0;
          d.dig = false;
          d.stumble = STUMBLE;
          say(q, 'POOPED!', { color: '#ffffff', size: p.human ? 20 : 15, life: 0.7, rise: 30, stroke: 'rgba(16,8,31,0.65)' }, ctx);
          snd.slip(p.human);
        }
      } else d.stam = Math.min(1, d.stam + (!p.down && d.since > REGEN_DELAY ? REGEN : REGEN_BUSY) * dt);
      if (d.beat > CYCLE) d.beat = 0; // missed the window: the cue starts over
    }
    stepRing(dt, ctx);
    if (ctx.twist.id === 'lights') {
      // the ring glints in the dark (particles draw above the darkness)
      S.glint -= dt;
      S.beacon -= dt;
      const [rx, ry] = ringScreen();
      if (S.glint <= 0) {
        S.glint = 0.07;
        fx.burst(rx, ry, { count: 3, colors: ['#fff3b8', '#ffd24d', '#ffffff'], speed: 60, life: 0.55, gravity: 0, size: 3.4 });
      }
      if (S.beacon <= 0) {
        S.beacon = 0.55;
        fx.ring(rx, ry, { color: '#ffd24d', radius: 34, life: 0.5, width: 3 });
      }
    }
    // creaks under load
    S.creak -= dt;
    if (S.creak <= 0 && Math.hypot(S.vx, S.vy) > 0.12) {
      S.creak = 0.35 + Math.random() * 0.4;
      snd.creak();
    }
    checkRules(ctx);
    stepCosmetic(dt, ctx);
  }

  function stepRing(dt, ctx) {
    const steps = 2;
    const h = dt / steps;
    for (let k = 0; k < steps; k++) {
      if (S.wind.s > 0) {
        S.vx += Math.cos(S.wind.a) * S.wind.s * h;
        S.vy += Math.sin(S.wind.a) * S.wind.s * h;
      }
      const f = Math.exp(-FRICTION * h);
      S.vx *= f;
      S.vy *= f;
      // dug-in pullers brake anything that drags the ring away from them
      for (const q of S.pullers) {
        if (!q.p || !q.p.alive || !q.d.dig) continue;
        const ex = q.d.L.ax - S.rx;
        const ey = q.d.L.ay - S.ry;
        const el = Math.hypot(ex, ey) || 1;
        const ux = ex / el;
        const uy = ey / el;
        const vr = S.vx * ux + S.vy * uy;
        if (vr < 0) {
          const b = vr * (1 - Math.exp(-BRAKE * h));
          S.vx -= ux * b;
          S.vy -= uy * b;
        }
      }
      S.rx += S.vx * h;
      S.ry += S.vy * h;
      if (S.line) {
        const u = S.line;
        const pr = S.rx * u.x + S.ry * u.y;
        const pv = S.vx * u.x + S.vy * u.y;
        S.rx = u.x * pr;
        S.ry = u.y * pr;
        S.vx = u.x * pv;
        S.vy = u.y * pv;
      }
      const rr = Math.hypot(S.rx, S.ry);
      if (rr > WALL) {
        const nx = S.rx / rr;
        const ny = S.ry / rr;
        S.rx = nx * WALL;
        S.ry = ny * WALL;
        const vn = S.vx * nx + S.vy * ny;
        if (vn > 0) {
          S.vx -= nx * vn;
          S.vy -= ny * vn;
        }
      }
    }
  }

  function checkRules(ctx) {
    let best = null;
    let bestPr = -Infinity;
    for (const q of S.pullers) {
      if (!q.p || !q.p.alive) continue;
      const pr = proj(q.d);
      if (pr >= S.Z && pr > bestPr) {
        best = q.p;
        bestPr = pr;
      }
    }
    if (best) {
      startFinish(best, ctx, false);
      return;
    }
    if (S.n < 3) return;
    for (const q of S.pullers) {
      if (q.p && q.p.alive && proj(q.d) <= -S.FALL) faceplant(q, ctx);
    }
    const alive = ctx.alive();
    if (alive.length === 1) startFinish(alive[0], ctx, false);
    else if (!alive.length) ctx.endRound(null);
  }

  // At the bell the ring goes to whoever has dragged it furthest toward their own line.
  function timeUp(ctx) {
    if (S.finish) return S.finish.winner;
    const list = S.pullers
      .filter((q) => q.p && q.p.alive)
      .map((q) => ({ q, pr: proj(q.d) }))
      .sort((a, b) => b.pr - a.pr);
    if (!list.length) return null;
    if (list.length > 1 && list[0].pr - list[1].pr < 0.005) {
      // a dead heat: everybody lets go at once
      for (const a of list) a.q.d.tumble = 0;
      fx.text(W / 2, H / 2 - 132, 'TIME!', { color: '#ffffff', size: 44, life: 1, rise: 30, stroke: '#10081f' });
      fx.shake(8, 0.3);
      return null;
    }
    startFinish(list[0].q.p, ctx, true);
    return list[0].q.p;
  }

  // ---------- cosmetics (also run in the lobby and between rounds) ----------
  function stepCosmetic(dt, ctx) {
    S.flash = Math.max(0, S.flash - dt * 4);
    const playing = ctx.phase === 'play' && !S.finish;
    // the ribbon trails behind the ring's motion (and in the wind)
    const sp = Math.hypot(S.vx, S.vy);
    let want = -Math.PI / 2;
    if (sp > 0.03) want = Math.atan2(-S.vy * L.sy, -S.vx * L.sx);
    else if (S.wind.s > 0) want = S.wind.a + Math.PI;
    let da = want - S.ribbon;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    S.ribbon += da * (1 - Math.exp(-5 * dt));
    for (const q of S.pullers) {
      const d = q.d;
      const alive = q.p ? q.p.alive : true;
      const pr = proj(d);
      const away = awaySpeed(d);
      let target;
      if (S.finish) target = q.p === S.finish.winner ? 1 : 0;
      else if (!alive) target = 0;
      else if (S.lobby) target = 0.35;
      else target = clamp(0.28 + (d.dig ? 0.4 : 0) + clamp(away * 3, 0, 0.5) + (d.since < 0.6 ? 0.25 : 0), 0, 1);
      d.tension += (target - d.tension) * (1 - Math.exp(-7 * dt));
      d.kick = Math.max(0, d.kick - dt * 5);
      d.twang = Math.max(0, d.twang - dt * 3.5);
      d.slipT = Math.max(0, d.slipT - dt);
      if (d.tumble >= 0) d.tumble += dt;
      if (d.cheer >= 0) d.cheer += dt;
      if (d.fallen) d.fallen.t += dt;
      if (!d.fallen && d.tumble < 0 && !S.lobby) {
        const w = clamp(pr * 0.42, -0.22, 0.06);
        d.slide += (w - d.slide) * (1 - Math.exp(-8 * dt));
      }
      d.dash += (S.vx * d.L.ux + S.vy * d.L.uy) * dt * 90;
      place(q, ctx);
      d.danger = alive && playing && ((S.n >= 3 && pr < -S.FALL + 0.12) || pr < -S.Z + 0.12) ? Math.min(1, d.danger + dt * 4) : Math.max(0, d.danger - dt * 3);
      // dust and skid marks while being dragged
      if (alive && playing && !d.fallen && away > 0.07) {
        if (Math.random() < dt * 14) fx.burst(d.fx + (Math.random() - 0.5) * 14, d.fy, { count: 2, colors: DUST, speed: 50, angle: -Math.PI / 2, spread: 2, life: 0.45, gravity: 30, size: 3.5 });
        if (Math.hypot(d.fx - d.skx, d.fy - d.sky) > 4) {
          if (S.skids.length < 140) S.skids.push({ x: d.fx, y: d.fy, x0: d.skx, y0: d.sky, t: 0 });
          d.skx = d.fx;
          d.sky = d.fy;
        }
      } else {
        d.skx = d.fx;
        d.sky = d.fy;
      }
      if (alive && d.dig && Math.random() < dt * 9) {
        fx.burst(d.fx + (Math.random() - 0.5) * 18, d.fy + 2, { count: 2, colors: DUST, speed: 70, angle: -Math.PI / 2, spread: 1.4, life: 0.4, gravity: 120, size: 3 });
      }
    }
    for (const s of S.skids) s.t += dt;
    if (S.skids.length && S.skids[0].t > 1.8) S.skids = S.skids.filter((s) => s.t <= 1.8);
    // mud flicks off a fast ring
    if (playing && sp > 0.22 && Math.random() < dt * 20) {
      const [rx, ry] = ringScreen();
      fx.burst(rx, ry + 6, { count: 2, colors: MUD, speed: 90, angle: Math.atan2(-S.vy * L.sy, -S.vx * L.sx), spread: 1.4, life: 0.4, gravity: 300, size: 3 });
    }
    // wind dressing
    if (S.streaks.length) {
      const ws = Math.max(S.wind.s, ctx.twist.id === 'gust' ? GUST * 0.6 : 0) * 2600;
      const wx = Math.cos(S.wind.a) * ws;
      const wy = Math.sin(S.wind.a) * ws;
      for (const s of S.streaks) {
        s.x += wx * s.z * dt;
        s.y += wy * s.z * dt;
        if (s.x < -40) s.x += W + 80;
        if (s.x > W + 40) s.x -= W + 80;
        if (s.y < -40) s.y += H + 80;
        if (s.y > H + 40) s.y -= H + 80;
      }
      for (const f of S.leaves) {
        f.x += wx * 0.7 * f.z * dt + Math.sin(f.r) * 20 * dt;
        f.y += wy * 0.7 * f.z * dt + Math.cos(f.r * 0.7) * 20 * dt;
        f.r += f.vr * dt;
        if (f.x < -20) f.x += W + 40;
        if (f.x > W + 20) f.x -= W + 40;
        if (f.y < -20) f.y += H + 40;
        if (f.y > H + 20) f.y -= H + 40;
      }
    }
  }

  function idle(dt, ctx) {
    if (S.finish) stepFinish(dt);
    stepCosmetic(dt, ctx);
  }

  // ---------- bots ----------
  function planBeat(st, rng) {
    if (st.extra && rng() < st.extra) return rng.range(0.12, 0.26); // a nervous early tap
    const n = (rng() + rng() + rng() - 1.5) * 2; // roughly a standard normal
    return clamp(BEAT + (n * (st.sigma || 0.05)) / st.sk, 0.14, CYCLE - 0.03);
  }

  function think(d, b, st, ctx) {
    const rng = ctx.rng;
    const pr = proj(d);
    const away = awaySpeed(d);
    const losing = pr < -0.1 && away > 0.03;
    const danger = (S.n >= 3 && pr < -S.FALL + 0.1) || pr < -S.Z + 0.12;
    if ((losing || danger) && d.stam > 0.3 && b.mode !== 'rest' && rng() < st.dig * (danger ? 0.45 : 0.18)) {
      b.mode = 'dig';
      b.timer = rng.range(0.5, 1.2);
      return;
    }
    if ((b.mode === 'beat' || b.mode === 'mash') && rng() < (st.lapse * 0.12) / st.sk) {
      b.prev = b.mode;
      b.mode = 'lapse';
      b.timer = rng.range(0.2, 0.55);
      return;
    }
    if (st.kind === 'hothead' && (b.mode === 'beat' || b.mode === 'mash')) {
      b.mode = losing || pr > S.Z - 0.12 || S.sudden ? 'mash' : 'beat';
    }
  }

  function bot(p, dt, ctx) {
    const d = p.data;
    if (!d || !d.L || S.finish || S.lobby) return false;
    const rng = ctx.rng;
    const st = styles[p.i] || (styles[p.i] = { kind: 'rhythm', ...STYLES.rhythm, sk: 1 });
    let b = d.bot;
    if (!b) {
      b = d.bot = {
        mode: st.kind === 'masher' ? 'mash' : 'beat',
        press: 0,
        think: 0.1 + rng() * 0.3,
        timer: 0,
        resume: 0.6,
        gap: 0.13,
        target: planBeat(st, rng),
        start: 0.12 + rng() * 0.3, // reaction time at GO
        prev: 'beat',
      };
    }
    if (b.start > 0) {
      b.start -= dt;
      return false;
    }
    if (b.press > 0) {
      b.press -= dt;
      return true;
    }
    if (b.mode === 'dig') {
      b.timer -= dt;
      if (b.timer <= 0 || d.stam < 0.06 || (proj(d) > -0.06 && awaySpeed(d) < 0.01)) {
        b.mode = 'rest';
        b.resume = Math.min(1, d.stam + 0.12);
        return false;
      }
      return true;
    }
    if (d.stumble > 0) return false;
    b.think -= dt;
    if (b.think <= 0) {
      b.think = 0.12 + rng() * 0.1;
      think(d, b, st, ctx);
      if (b.mode === 'dig') return true;
    }
    if (b.mode === 'lapse') {
      b.timer -= dt;
      if (b.timer <= 0) b.mode = b.prev || 'beat';
      return false;
    }
    if (b.mode === 'rest') {
      if (d.stam < b.resume) return false;
      b.mode = st.kind === 'masher' ? 'mash' : 'beat';
      b.target = planBeat(st, rng);
    }
    if (d.stam < st.restAt) {
      b.mode = 'rest';
      b.resume = rng.range(st.resume[0], st.resume[1]);
      return false;
    }
    if (b.mode === 'mash') {
      if (d.since + dt >= b.gap) {
        b.press = 0.035;
        b.gap = 1 / rng.range(st.rate[0], st.rate[1]);
        return true;
      }
      return false;
    }
    if (d.beat + dt >= b.target) {
      b.press = 0.03 + rng() * 0.03;
      b.target = planBeat(st, rng);
      return true;
    }
    return false;
  }

  // ---------- render ----------
  function drawBg(g) {
    if (typeof document === 'undefined') return;
    if (!field) {
      field = document.createElement('canvas');
      field.width = W * 2;
      field.height = H * 2;
      const fg = field.getContext('2d');
      fg.scale(2, 2);
      drawField(fg, W, H, L);
    }
    g.drawImage(field, 0, 0, W, H);
  }

  function drawZones(g, ctx, T) {
    const n = S.n;
    const half = Math.min(Math.sqrt(PIT_R * PIT_R - S.Z * S.Z) - 0.02, n >= 3 ? S.Z * Math.tan(Math.PI / n) : 9);
    const pulse = S.sudden && !S.finish ? 0.5 + 0.5 * Math.sin(T * 10) : 0;
    for (const q of S.pullers) {
      const u = q.L;
      const live = !q.p || q.p.alive;
      const won = S.finish && S.finish.wq === q;
      const px = -u.uy;
      const py = u.ux;
      const cx = u.ux * S.Z;
      const cy = u.uy * S.Z;
      const [x1, y1] = toS(cx + px * half, cy + py * half);
      const [x2, y2] = toS(cx - px * half, cy - py * half);
      const far = 0.36;
      const [x3, y3] = toS(cx - px * half + u.ux * far, cy - py * half + u.uy * far);
      const [x4, y4] = toS(cx + px * half + u.ux * far, cy + py * half + u.uy * far);
      const [mx, my] = toS(cx, cy);
      const [fx0, fy0] = toS(cx + u.ux * far, cy + u.uy * far);
      // the line lights up as the ring gets close to it
      const close = live && !S.lobby ? clamp(((S.rx * u.ux + S.ry * u.uy) / S.Z - 0.55) / 0.45, 0, 1) : 0;
      // end zone tint, clipped to the pit
      g.save();
      pitPath(g, L, 1);
      g.clip();
      const gr = g.createLinearGradient(mx, my, fx0, fy0);
      const a0 = live ? (won ? 0.55 : 0.3 + pulse * 0.12 + close * 0.25) : 0.08;
      gr.addColorStop(0, draw.rgba(q.color, a0));
      gr.addColorStop(1, draw.rgba(q.color, 0.03));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.lineTo(x3, y3);
      g.lineTo(x4, y4);
      g.closePath();
      g.fill();
      g.restore();
      // chalk line
      g.lineCap = 'round';
      if (close > 0) {
        g.strokeStyle = draw.rgba(q.color, 0.3 + 0.25 * Math.sin(T * 14) * close);
        g.lineWidth = 8 + close * 10;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
      g.strokeStyle = draw.rgba(q.color, live ? 0.95 : 0.3);
      g.lineWidth = 5 + pulse * 2 + close * 2;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      if (live) {
        g.strokeStyle = S.sudden && !S.finish ? `rgba(255,255,255,${0.5 + pulse * 0.5})` : 'rgba(255,255,255,0.75)';
        g.lineWidth = 1.6;
        g.setLineDash([6, 6]);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        g.setLineDash([]);
        drawFlag(g, x1, y1, 0.85, q.color, T, x1 < x2 ? -1 : 1);
        drawFlag(g, x2, y2, 0.85, q.color, T + 1.3, x2 <= x1 ? -1 : 1);
      }
    }
  }

  function drawSkids(g) {
    g.lineCap = 'round';
    for (const s of S.skids) {
      const k = 1 - s.t / 1.8;
      g.strokeStyle = `rgba(90,55,20,${0.35 * k})`;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(s.x0 - 5, s.y0);
      g.lineTo(s.x - 5, s.y);
      g.moveTo(s.x0 + 5, s.y0);
      g.lineTo(s.x + 5, s.y);
      g.stroke();
    }
  }

  function poseOf(q, ctx, T, rx, ry) {
    const d = q.d;
    const s = sz(ctx);
    let dx = rx - d.fx;
    let dy = ry - (d.fy - 21 * s);
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    let pose = 'pull';
    if (d.fallen) pose = 'down';
    else if (d.tumble >= 0) pose = d.tumble < 0.22 ? 'slip' : 'down';
    else if (d.cheer >= 0) pose = d.cheer > 0.38 ? 'cheer' : 'pull';
    else if (d.stumble > 0 || d.slipT > 0) pose = 'slip';
    let lean;
    let crouch = 0;
    let strain;
    if (pose === 'slip') {
      lean = -0.45;
      strain = 0.8;
    } else if (pose === 'cheer') {
      lean = 0.1;
      strain = 0;
    } else if (S.lobby) {
      lean = 0.38 + Math.sin(T * 1.6 + q.i * 1.7) * 0.1;
      strain = 0.2;
    } else {
      lean = Math.min(1.15, 0.3 + d.tension * 0.32 + d.kick * 0.35 + (d.dig ? 0.42 : 0));
      crouch = d.dig ? 1 : Math.min(1, d.kick * 0.3);
      strain = clamp(d.tension * 0.5 + d.kick * 0.6 + (d.dig ? 0.6 : 0), 0, 1);
    }
    return { dx, dy, pose, lean, crouch, strain, geom: pullerGeom(d.fx, d.fy, s, dx, dy, lean, crouch) };
  }

  function render(g, ctx) {
    const T = api.totalTime;
    const s = sz(ctx);
    drawBg(g);
    drawZones(g, ctx, T);
    drawSkids(g);
    const [rx, ry] = ringScreen();
    const rr = ringR(ctx);
    const butter = ctx.twist.id === 'butter' && !S.lobby;
    const poses = S.pullers.map((q) => poseOf(q, ctx, T, rx, ry));
    // ropes (under the ring and the pullers)
    S.pullers.forEach((q, k) => {
      const d = q.d;
      const P = poses[k];
      let hx = P.geom.hx;
      let hy = P.geom.hy;
      const alive = q.p ? q.p.alive : true;
      const slack = !alive || P.pose === 'down' || P.pose === 'cheer' || (S.finish && S.finish.wq !== q);
      if (P.pose === 'down') {
        hx = d.fx + P.dx * 22 * s;
        hy = d.fy - 6 * s + P.dy * 22 * s;
      } else if (P.pose === 'cheer') {
        hx = d.fx + P.dx * 14 * s;
        hy = d.fy + 2 * s;
      }
      P.hx = hx;
      P.hy = hy;
      const a = Math.atan2(hy - ry, hx - rx);
      const x0 = rx + Math.cos(a) * rr * 0.72;
      const y0 = ry + Math.sin(a) * rr * 0.72;
      const len = Math.hypot(hx - x0, hy - y0);
      const sag = slack ? Math.min(32, len * 0.2) : (1 - d.tension) * 15 * s + 1;
      drawRope(g, x0, y0, hx, hy, { w: 5 * s, sag, wave: d.twang * 3, t: T, color: q.color, butter, dash: d.dash });
    });
    drawRing(g, rx, ry, rr, { t: T, flash: S.flash, ribbon: S.ribbon, flutter: S.wind.s * 3 });
    // pullers, back to front
    const order = S.pullers.map((q, k) => k).sort((a, b) => S.pullers[a].d.fy - S.pullers[b].d.fy);
    for (const k of order) {
      const q = S.pullers[k];
      const d = q.d;
      const P = poses[k];
      drawPuller(g, {
        x: d.fx,
        y: d.fy,
        s,
        color: q.color,
        dx: P.dx,
        dy: P.dy,
        lean: P.lean,
        crouch: P.crouch,
        strain: P.strain,
        pose: P.pose,
        geom: P.geom,
        t: T + q.i,
        kick: d.kick,
        shake: d.dig ? 0.7 : d.danger * 0.8,
        sweat: Math.max(d.danger, d.stam < 0.25 && !S.lobby ? 0.8 : 0),
        blink: Math.sin(T * 1.9 + q.i * 2.3) > 0.985,
        hx: P.hx,
        hy: P.hy,
      });
      if (d.danger > 0 && q.p && q.p.alive && !S.finish) {
        const bob = Math.sin(T * 12) * 2;
        g.save();
        g.globalAlpha = d.danger;
        draw.circle(g, P.geom.bx, P.geom.by - 30 * s + bob, 9, '#ff4757', '#ffffff', 2);
        draw.text(g, '!', P.geom.bx, P.geom.by - 30 * s + bob + 1, { size: 13, color: '#ffffff', shadow: false });
        g.restore();
      }
    }
    if (!S.lobby) for (let k = 0; k < S.pullers.length; k++) drawCue(g, S.pullers[k], poses[k], ctx, T);
    drawBunting(g, -10, W + 10, 98, 9, 1, T, BUNTING);
    drawWind(g, ctx);
    drawHints(g, ctx, rx, ry);
    if (S.sudden && !S.finish && ctx.phase === 'play') {
      const a = 0.1 + 0.08 * Math.sin(T * 8);
      const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
      vg.addColorStop(0, 'rgba(255,40,40,0)');
      vg.addColorStop(1, `rgba(255,40,40,${a})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    }
  }

  // The power cue (a ring closing in on every puller) and the stamina bar under the feet.
  function drawCue(g, q, P, ctx, T) {
    const p = q.p;
    if (!p || !p.alive || S.finish) return;
    const ph = ctx.phase;
    if (ph !== 'play' && ph !== 'count' && ph !== 'card') return;
    const d = q.d;
    const s = sz(ctx);
    // Bots' cues fade when people play (except in SWAP, where your button jumps between pullers).
    const dim = ctx.humans > 0 && !p.human && !api.demo && ctx.twist.id !== 'swap' ? 0.5 : 1;
    const cx = P.geom.bx;
    const cy = P.geom.by;
    const cs = Math.min(s, 1.4);
    const R0 = 27 * cs;
    const live = ph === 'play' && d.stumble <= 0;
    const inWin = live && Math.abs(d.beat - BEAT) <= WIN_H;
    g.save();
    g.globalAlpha = dim;
    if (inWin) {
      g.strokeStyle = 'rgba(109,255,158,0.35)';
      g.lineWidth = 9;
      g.beginPath();
      g.arc(cx, cy, R0, 0, TAU);
      g.stroke();
    }
    g.strokeStyle = inWin ? '#6dff9e' : 'rgba(255,255,255,0.32)';
    g.lineWidth = inWin ? 4 : 2;
    g.beginPath();
    g.arc(cx, cy, R0, 0, TAU);
    g.stroke();
    if (live && !d.dig && d.beat < BEAT + WIN_H) {
      const k = Math.min(1, d.beat / BEAT);
      const r = R0 + (1 - k) * 28 * cs;
      g.strokeStyle = `rgba(255,255,255,${0.15 + 0.75 * k})`;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.stroke();
    }
    // stamina
    const bw = 38 * cs;
    const bh = 6;
    const bx = d.fx - bw / 2;
    const by = d.fy + 9 * cs;
    draw.roundRect(g, bx - 1.5, by - 1.5, bw + 3, bh + 3, 4, 'rgba(12,8,24,0.62)');
    const st = clamp(d.stam, 0, 1);
    const low = st < COST;
    let col = st > 0.5 ? '#6dff9e' : st > 0.25 ? '#ffd23f' : '#ff5a5a';
    if (d.dig) col = Math.sin(T * 16) > 0 ? '#ffb35c' : '#ff8a3d';
    if (st > 0.01) draw.roundRect(g, bx, by, bw * st, bh, 3, col);
    if (low && Math.sin(T * 14) > 0) draw.roundRect(g, bx - 1.5, by - 1.5, bw + 3, bh + 3, 4, null, '#ff5a5a', 1.5);
    g.restore();
  }

  function drawWind(g, ctx) {
    if (!S.streaks.length) return;
    const a = S.wind.a;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    for (const s of S.streaks) {
      const l = s.l * (0.6 + S.wind.s * 5);
      g.moveTo(s.x, s.y);
      g.lineTo(s.x - cx * l, s.y - cy * l);
    }
    g.stroke();
    for (const f of S.leaves) {
      g.save();
      g.translate(f.x, f.y);
      g.rotate(f.r);
      g.fillStyle = f.c;
      g.beginPath();
      g.ellipse(0, 0, 6 * f.z, 3 * f.z, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(40,80,20,0.5)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-6 * f.z, 0);
      g.lineTo(6 * f.z, 0);
      g.stroke();
      g.restore();
    }
    // a wind arrow over the ring so everyone sees which way it blows
    if (ctx.phase === 'play' && !S.finish) {
      const [rx, ry] = ringScreen();
      const k = S.wind.s / GUST;
      g.save();
      g.translate(rx + cx * 34, ry + cy * 34);
      g.rotate(a);
      g.globalAlpha = 0.55 + 0.25 * k;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(14, 0);
      g.lineTo(2, -8);
      g.lineTo(2, -3);
      g.lineTo(-12, -3);
      g.lineTo(-12, 3);
      g.lineTo(2, 3);
      g.lineTo(2, 8);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  // First round only: show each human what their one button does.
  function drawHints(g, ctx, rx, ry) {
    if (api.demo || ctx.round !== 1 || S.lobby) return;
    const ph = ctx.phase;
    const k = ph === 'card' || ph === 'count' ? 1 : ph === 'play' && !S.finish ? clamp(4.5 - ctx.time, 0, 1) : 0;
    if (k <= 0) return;
    for (const q of S.pullers) {
      if (!q.p || !q.p.human || !q.p.alive) continue;
      const d = q.d;
      const hx = d.fx + (rx - d.fx) * 0.6;
      const hy = d.fy - 26 + (ry - d.fy + 26) * 0.6;
      g.save();
      g.globalAlpha = k;
      g.translate(clamp(hx, 80, W - 80), clamp(hy, 130, H - 130));
      if (q.i === 2 || q.i === 3) g.rotate(Math.PI); // seats across the table read upside down
      draw.roundRect(g, -78, -24, 156, 48, 14, 'rgba(8,4,20,0.86)', q.color, 2);
      draw.text(g, 'TAP IN THE GREEN', 0, -8, { size: 14, color: '#6dff9e', shadow: false });
      draw.text(g, 'hold to dig in', 0, 10, { size: 11, weight: 700, color: 'rgba(255,255,255,0.8)', shadow: false });
      g.restore();
    }
  }

  return createParty(api, {
    roundsToWin: 3,
    roundTime: ROUND_TIME,
    lastStanding: false,
    lightRadius: 120,
    twists: ['turbo', 'giants', 'tiny', 'swap', 'lights', 'wobble', BUTTER, GUSTY],
    setup,
    update,
    render,
    bot,
    timeUp,
    idle,
  });
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = Math.min(w / 800, h / 600);
  const CL = { cx: w / 2, cy: h * 0.56, sx: Math.min(w * 0.34, h * 0.6), sy: h * 0.34 };
  drawField(g, w, h, CL, { k: 1.5 * s });
  // sunburst and a warm spotlight on the ring for punch
  g.save();
  g.translate(CL.cx, CL.cy);
  const R = Math.hypot(w, h);
  for (let i = 0; i < 28; i++) {
    if (i % 2) continue;
    const a0 = (i / 28) * TAU + 0.05;
    const a1 = ((i + 1) / 28) * TAU + 0.05;
    g.fillStyle = 'rgba(255,236,170,0.1)';
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, R, a0, a1);
    g.closePath();
    g.fill();
  }
  g.restore();
  const spot = g.createRadialGradient(CL.cx, CL.cy, 10 * s, CL.cx, CL.cy, h * 0.55);
  spot.addColorStop(0, 'rgba(255,226,130,0.42)');
  spot.addColorStop(1, 'rgba(255,226,130,0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, w, h);
  const cs = 2.55 * s;
  const at = (ax, ay) => [CL.cx + ax * CL.sx, CL.cy + ay * CL.sy];
  // the ring, yanked toward pink
  const rax = -0.12;
  const ray = 0.1;
  const [rx, ry] = at(rax, ray);
  const rr = 38 * s;
  // win lines
  const seats = [
    { c: PLAYER_COLORS[0], ux: -0.7071, uy: 0.7071, pose: 'pull', lean: 1.12, crouch: 1, kick: 1.2 },
    { c: PLAYER_COLORS[1], ux: 0.7071, uy: 0.7071, pose: 'pull', lean: 0.9, crouch: 0.4, kick: 0.6 },
    { c: PLAYER_COLORS[2], ux: 0.7071, uy: -0.7071, pose: 'pull', lean: 0.95, crouch: 0.7, kick: 0.8 },
    { c: PLAYER_COLORS[3], ux: -0.7071, uy: -0.7071, pose: 'slip', lean: -0.45, crouch: 0, kick: 0 },
  ];
  for (const st of seats) {
    const px = -st.uy;
    const py = st.ux;
    const z = 0.5;
    const half = 0.42;
    const [x1, y1] = at(st.ux * z + px * half, st.uy * z + py * half);
    const [x2, y2] = at(st.ux * z - px * half, st.uy * z - py * half);
    const [x3, y3] = at(st.ux * (z + 0.3) - px * half, st.uy * (z + 0.3) - py * half);
    const [x4, y4] = at(st.ux * (z + 0.3) + px * half, st.uy * (z + 0.3) + py * half);
    g.save();
    pitPath(g, CL, 1);
    g.clip();
    g.fillStyle = draw.rgba(st.c, 0.28);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.lineTo(x4, y4);
    g.closePath();
    g.fill();
    g.restore();
    g.strokeStyle = st.c;
    g.lineWidth = 7 * s;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 2 * s;
    g.setLineDash([9 * s, 8 * s]);
    g.stroke();
    g.setLineDash([]);
    drawFlag(g, x1, y1, 1.5 * s, st.c, 0.6, x1 < x2 ? -1 : 1);
    drawFlag(g, x2, y2, 1.5 * s, st.c, 2.1, x2 <= x1 ? -1 : 1);
  }
  // a jagged burst behind the ring
  g.fillStyle = 'rgba(255,214,77,0.9)';
  g.beginPath();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + 0.1;
    const r0 = (i % 2 ? 0.95 : 1.75 + Math.abs(jit(i, 91)) * 0.5) * rr;
    const x = rx + Math.cos(a) * r0;
    const y = ry + Math.sin(a) * r0 * 0.8;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + 0.25;
    const r0 = (i % 2 ? 0.9 : 1.3) * rr;
    const x = rx + Math.cos(a) * r0;
    const y = ry + Math.sin(a) * r0 * 0.8;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  // speed lines around the ring (it is moving toward pink, bottom-left)
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const off = (i - 3) * 9 * s;
    const len = (40 + (i % 3) * 22) * s;
    const bx = rx + 0.7071 * (rr + 14 * s) - 0.7071 * off;
    const by = ry - 0.7071 * (rr + 14 * s) - 0.7071 * off;
    g.lineWidth = (3.5 - Math.abs(i - 3) * 0.5) * s;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + 0.7071 * len, by - 0.7071 * len);
    g.stroke();
  }
  // pullers
  const list = seats.map((st) => {
    const [fx0, fy0] = at(st.ux * 0.97, st.uy * 0.97);
    let dx = rx - fx0;
    let dy = ry - (fy0 - 21 * cs);
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const geom = pullerGeom(fx0, fy0, cs, dx, dy, st.lean, st.crouch);
    return { ...st, fx0, fy0, dx, dy, geom };
  });
  for (const P of list) {
    const a = Math.atan2(P.geom.hy - ry, P.geom.hx - rx);
    const x0 = rx + Math.cos(a) * rr * 0.72;
    const y0 = ry + Math.sin(a) * rr * 0.72;
    drawRope(g, x0, y0, P.geom.hx, P.geom.hy, { w: 11 * s, sag: P.pose === 'slip' ? 30 * s : 2 * s, color: P.c, t: 0, wave: 0 });
    if (P.pose !== 'slip') {
      // twang lines along the taut rope
      const mx = (x0 + P.geom.hx) / 2;
      const my = (y0 + P.geom.hy) / 2;
      const nx = -(P.geom.hy - y0);
      const ny = P.geom.hx - x0;
      const nl = Math.hypot(nx, ny) || 1;
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 2.5 * s;
      for (let k = -1; k <= 1; k += 2) {
        g.beginPath();
        g.moveTo(mx + (nx / nl) * k * 12 * s - (ny / nl) * 18 * s, my + (ny / nl) * k * 12 * s + (nx / nl) * 18 * s);
        g.lineTo(mx + (nx / nl) * k * 12 * s + (ny / nl) * 18 * s, my + (ny / nl) * k * 12 * s - (nx / nl) * 18 * s);
        g.stroke();
      }
    }
  }
  drawRing(g, rx, ry, rr, { t: 0.4, ribbon: -Math.PI / 4, flash: 0.35 });
  // mud flying off the ring
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 4 + jit(i, 71) * 0.9;
    const d = (rr + 10 * s + Math.abs(jit(i, 72)) * 60 * s) * 1;
    draw.circle(g, rx + Math.cos(a) * d, ry + Math.sin(a) * d, (2 + Math.abs(jit(i, 73)) * 4) * s, i % 3 ? '#6b411f' : '#8a5a2e');
  }
  list.sort((a, b) => a.fy0 - b.fy0);
  for (const P of list) {
    // dust kicked up behind the feet and motion lines behind the body
    const ax = -P.dx;
    const ay = -P.dy;
    for (let i = 0; i < 9; i++) {
      const d = (8 + i * 6) * s;
      const r = (14 - i) * 0.9 * s + 4 * s;
      g.fillStyle = `rgba(241,220,178,${0.5 - i * 0.045})`;
      g.beginPath();
      g.arc(P.fx0 + ax * d * 1.4 + jit(i, 81) * 6 * s, P.fy0 + ay * d * 0.6 - i * 2.2 * s, r, 0, TAU);
      g.fill();
    }
    if (P.pose !== 'slip') {
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 3 * s;
      for (let i = 0; i < 3; i++) {
        const ox = P.geom.bx + ax * 34 * s;
        const oy = P.geom.by + ay * 20 * s + (i - 1) * 12 * s;
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + ax * (24 + i * 8) * s, oy + ay * (14 + i * 4) * s);
        g.stroke();
      }
    }
    drawPuller(g, {
      x: P.fx0,
      y: P.fy0,
      s: cs,
      color: P.c,
      dx: P.dx,
      dy: P.dy,
      lean: P.lean,
      crouch: P.crouch,
      strain: P.pose === 'slip' ? 0.8 : 1,
      pose: P.pose,
      geom: P.geom,
      t: 0.3,
      kick: P.kick,
      sweat: 1,
    });
  }
  drawBunting(g, -10 * s, w + 10 * s, 26 * s, 12 * s, 1.6 * s, 0.7, BUNTING);
}
