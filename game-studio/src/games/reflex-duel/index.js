// Reflex Duel - a sunset showdown that doubles as a reaction time test (party kit, 1 to 4 players).
//
// Every player is a gunslinger standing by their corner. After the countdown comes a tense,
// random wait; the moment DRAW! flashes, the fastest tap wins the round and shoots everyone
// else's hat off. Tap before the signal and you jump the gun: FALSE START, out for the round.
// Every shot shows its reaction time in milliseconds. Human presses are timed from the
// browser event itself (performance.now() when the key or pointer goes down, not the next
// frame), measured against the moment the signal frame was produced. The best time ever is
// saved with api.store ('bestMs').
import { createParty, PLAYER_COLORS } from '../engine/party.js';
import * as draw from '../engine/draw.js';
import { GOLD, jit, hexA, drawSky, drawGround, drawCactus, drawTumbleweed, drawSkull, drawLantern, drawSlinger, drawHat, drawShadow, drawBurst, drawBolt } from './art.js';

const TAU = Math.PI * 2;
const HY = 205; // horizon
// Where each seat's gunslinger stands (boots), depth scale and facing. P1 bottom-left,
// P2 bottom-right, P3 top-right, P4 top-left: the top pair stand far away on the horizon.
const SEATS = [
  { x: 118, y: 612, s: 1.15, f: 1 },
  { x: 302, y: 612, s: 1.15, f: -1 },
  { x: 316, y: 262, s: 0.85, f: -1 },
  { x: 104, y: 262, s: 0.85, f: 1 },
];
const SIG_Y = 346; // the big signal
const POST_X = 210;
const POST_Y = 474;
const TUMBLE_Y = 470;
const SPLIT_MS = 400;
const NO_SHOT = 1.5; // seconds after the signal with nobody firing: no crown
const GUESS_MS = 100; // faster than this is a lucky guess, never saved as a best
const SLOW_DUR = 0.6; // the winner's slow-motion moment (cosmetic only)
const KEYS = ['z', 'm', 'p', 'q'];

const DECOY_WORDS = ['DRAWL', 'DRAIN!', 'DRAT!', 'DREAM', 'DROOL', 'DRAMA', 'DROP!', 'BRAWL', 'DRAW?', 'DRY!', 'DRUM!'];
const DECOY_COLORS = ['#b48cff', '#ff6b6b', '#ff9f43', GOLD];

// Bot gunslingers: human-like reaction times (ms), each with a temper.
const KINDS = {
  ace: { name: 'THE ACE', base: 216, off: -20, sd: 24, slow: 0.04, fs: 0.02, bite: 0.06 },
  jumpy: { name: 'JUMPY', base: 236, off: -6, sd: 46, slow: 0.06, fs: 0.13, bite: 0.34 },
  steady: { name: 'STEADY', base: 258, off: 12, sd: 26, slow: 0.05, fs: 0.02, bite: 0.08 },
  sleepy: { name: 'SLEEPY', base: 298, off: 42, sd: 42, slow: 0.16, fs: 0.01, bite: 0.1 },
};

const TWISTS = [
  { id: 'fakeout', name: 'FAKE OUT', desc: 'Decoy signals! Only DRAW! counts', emoji: '🎭' },
  { id: 'silent', name: 'SILENT', desc: 'No flash. Watch the lantern, listen for the bell', emoji: '🤫' },
  { id: 'double', name: 'DOUBLE TAP', desc: 'Tap twice to fire: cock, then shoot', emoji: '✌️' },
  { id: 'color', name: 'COLOR CALL', desc: 'Draw only when the lantern shows YOUR color', emoji: '🚦' },
  { id: 'split', name: 'SPLIT SECOND', desc: `Slower than ${SPLIT_MS} ms misses`, emoji: '⏱️' },
  { id: 'patience', name: 'PATIENCE', desc: 'A long, long wait. Do not blink', emoji: '🐢' },
  { id: 'lights', name: 'MIDNIGHT', desc: 'A duel in the dark. Wait for the flash', emoji: '🌙' },
  { id: 'wobble', name: 'WOBBLY', desc: 'Too much cactus juice: the street sways', emoji: '🌀' },
];

const HINTS = {
  classic: 'TAP ON DRAW!  TOO EARLY = OUT',
  fakeout: 'ONLY DRAW! COUNTS',
  silent: 'WATCH THE LANTERN',
  double: 'TAP TWICE TO FIRE',
  color: 'DRAW ON YOUR COLOR ONLY',
  split: `BEAT ${SPLIT_MS} ms`,
  patience: 'STAY STILL...',
  lights: 'WAIT FOR THE FLASH',
  wobble: 'FOCUS...',
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const gauss = (rng) => (rng() + rng() + rng() - 1.5) * 2;

function rankFor(avg) {
  if (avg == null) return 'TUMBLEWEED';
  if (avg < 190) return 'LEGEND';
  if (avg < 215) return 'SHARPSHOOTER';
  if (avg < 245) return 'GUNSLINGER';
  if (avg < 280) return 'DEPUTY';
  if (avg < 330) return 'GREENHORN';
  return 'TUMBLEWEED';
}

// ---------- sounds ----------
function sndDraw(sfx) {
  sfx.noise({ dur: 0.55, vol: 0.4, freq: 2600, to: 150 });
  sfx.tone({ freq: 150, to: 36, type: 'sine', dur: 0.55, vol: 0.34 });
  sfx.tone({ freq: 2300, to: 1700, type: 'triangle', dur: 0.14, vol: 0.05 });
}
function sndShot(sfx, k) {
  sfx.noise({ dur: 0.2, vol: 0.26, freq: 3300 - k * 280, to: 260 });
  sfx.tone({ freq: 220 - k * 18, to: 58, type: 'square', dur: 0.1, vol: 0.07 });
}
function sndRico(sfx, delay) {
  sfx.tone({ freq: 2900, to: 850, type: 'sine', dur: 0.34, vol: 0.05, delay });
}
function sndTick(sfx, hi) {
  sfx.tone({ freq: hi ? 2300 : 1750, type: 'square', dur: 0.018, vol: 0.028 });
}
function sndHeart(sfx) {
  sfx.tone({ freq: 64, to: 46, type: 'sine', dur: 0.15, vol: 0.2 });
  sfx.tone({ freq: 58, to: 44, type: 'sine', dur: 0.13, vol: 0.14, delay: 0.18 });
}
function sndWhistle(sfx) {
  sfx.tone({ freq: 988, to: 1319, type: 'sine', dur: 0.26, vol: 0.05 });
  sfx.tone({ freq: 1319, to: 880, type: 'sine', dur: 0.55, vol: 0.05, delay: 0.3 });
}
function sndDecoy(sfx) {
  sfx.tone({ freq: 330, to: 140, type: 'sawtooth', dur: 0.2, vol: 0.07 });
  sfx.noise({ dur: 0.08, vol: 0.08, freq: 700 });
}
function sndBell(sfx) {
  sfx.tone({ freq: 1568, type: 'triangle', dur: 0.8, vol: 0.13 });
  sfx.tone({ freq: 3136, type: 'sine', dur: 0.4, vol: 0.04 });
}
function sndOops(sfx) {
  sfx.tone({ freq: 540, to: 130, type: 'sine', dur: 0.42, vol: 0.12, delay: 0.06 });
}
function sndCock(sfx) {
  sfx.tone({ freq: 3200, type: 'square', dur: 0.012, vol: 0.07 });
  sfx.tone({ freq: 1900, type: 'square', dur: 0.014, vol: 0.06, delay: 0.035 });
}
function sndColor(sfx, i) {
  sfx.tone({ freq: [523, 659, 784, 988][i] || 600, type: 'triangle', dur: 0.16, vol: 0.11 });
}
function sndWind(sfx) {
  sfx.noise({ dur: 1.5, vol: 0.035, freq: 380, to: 760, type: 'bandpass', q: 0.8 });
}
function sndThud(sfx) {
  sfx.noise({ dur: 0.2, vol: 0.12, freq: 520, to: 110 });
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const fx = api.fx;
  const sfx = api.sfx;
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let sctx = null; // the party ctx (kept from setup)
  let S = blank();
  let ct = 0; // cosmetic clock: slows down for the winner moment
  const stamps = [0, 0, 0, 0]; // performance.now() of each seat's latest press during play
  let kinds = [null, null, null, null];
  let stats = null; // per seat: { times: [], fs }
  let bestMs = api.store.get('bestMs', null);
  let startBest = bestMs;
  let endAge = 0; // time in the matchEnd phase
  let tumble = null;
  let tumbleCool = 0;
  const smoke = [];
  const tracers = [];
  const motes = [];
  for (let i = 0; i < 26; i++) motes.push({ x: Math.random() * W, y: HY + 10 + Math.random() * (H - HY - 20), z: 0.3 + Math.random() * 0.7, ph: Math.random() * TAU });
  const ghosts = [0, 1, 2, 3].map(() => pose());

  function blank() {
    return {
      stage: 'idle',
      t: 0,
      sigAt: 99,
      sigT: -1,
      sigStamp: 0,
      sigPending: false,
      sigAge: 0,
      winner: null,
      winT: -1,
      late: false,
      endAt: -1,
      allDoneT: -1,
      reason: '',
      anyMiss: false,
      decoys: [],
      decoy: null,
      decoyT: 0,
      decoyAge: 0,
      queue: [],
      gaps: [],
      gapI: 0,
      lit: null,
      litT: 0,
      litStamp: 0,
      litPending: false,
      litAge: 0,
      litDoneT: -1,
      nextLitT: -1,
      volleyAt: -1,
      volleyAge: 9,
      tension: 0,
      slowLeft: 0,
      tick: 0,
      tickN: 0,
      heart: 0,
      whistled: false,
      lamp: null,
      night: false,
      tumbleAt: 0.3,
      boltSeed: 1,
    };
  }

  function pose() {
    return {
      arm: 0,
      armT: 0,
      aim: 0,
      recoil: 0,
      blow: 0,
      blowAt: 0,
      tip: 0,
      tipV: 0,
      tipping: false,
      hitAt: 0,
      hop: 0,
      hopping: false,
      sulk: false,
      hatOn: true,
      hat: null,
      hatKnockAt: 0,
      expr: 'cool',
      muzzle: 0,
      labelT: 0,
    };
  }

  const scaleOf = (p) => SEATS[p.i].s * (sctx ? sctx.size : 1);
  const labelY = (p) => SEATS[p.i].y - 100 * scaleOf(p) - 18;

  function aimAngle(i, s) {
    const st = SEATS[i];
    const sx = st.x + st.f * 6 * s;
    const sy = st.y - 70 * s;
    const ty = sy + (H * 0.5 - sy) * 0.12;
    return clamp(Math.atan2(ty - sy, Math.abs(W / 2 - sx)), -0.6, 0.6);
  }

  // World position of a gunslinger's muzzle (arm fully out) and hat.
  function muzzlePos(p) {
    const st = SEATS[p.i];
    const s = scaleOf(p);
    const a = p.data.aim;
    const lx = 6 + Math.cos(a) * 41;
    const ly = -70 + Math.sin(a) * 41;
    return { x: st.x + st.f * lx * s, y: st.y + ly * s, a: st.f > 0 ? a : Math.PI - a };
  }
  function hatPos(p) {
    const st = SEATS[p.i];
    const s = scaleOf(p);
    return { x: st.x + st.f * 0.5 * s, y: st.y - 92 * s };
  }

  function refMs() {
    let sum = 0;
    let n = 0;
    if (stats && sctx) {
      for (const p of sctx.active) {
        if (!p.human || api.demo) continue;
        for (const v of stats[p.i].times) {
          sum += v;
          n++;
        }
      }
    }
    return n >= 2 ? sum / n : 262;
  }

  function planMs(kind, ref, rng) {
    const mean = clamp(0.5 * kind.base + 0.5 * (ref + kind.off), 192, 345);
    let ms = mean + gauss(rng) * kind.sd;
    if (rng.chance(kind.slow)) ms += rng.range(90, 200);
    return Math.round(Math.max(162, ms));
  }

  function summary(i) {
    const t = stats ? stats[i].times : [];
    if (!t.length) return { avg: null, best: null, n: 0, fs: stats ? stats[i].fs : 0 };
    let sum = 0;
    let best = Infinity;
    for (const v of t) {
      sum += v;
      if (v < best) best = v;
    }
    return { avg: Math.round(sum / t.length), best, n: t.length, fs: stats[i].fs };
  }

  // ---------- round setup ----------
  function newMatch(ctx) {
    stats = [0, 1, 2, 3].map(() => ({ times: [], fs: 0 }));
    bestMs = api.store.get('bestMs', null);
    startBest = bestMs;
    const pool = ctx.rng.shuffle(['ace', 'jumpy', 'steady', 'sleepy']);
    kinds = [null, null, null, null];
    let k = 0;
    for (const p of ctx.active) if (!p.human || api.demo) kinds[p.i] = pool[k++ % 4];
  }

  function setup(ctx) {
    sctx = ctx;
    const rng = ctx.rng;
    const tw = ctx.twist.id;
    S = blank();
    S.night = tw === 'lights';
    S.boltSeed = 1 + ((ctx.round * 7) % 50);
    stamps.fill(0);
    smoke.length = 0;
    tracers.length = 0;
    endAge = 0;
    if (!ctx.active.length) {
      // the quiet street behind the lobby
      S.stage = 'lobby';
      for (let i = 0; i < 4; i++) {
        Object.assign(ghosts[i], pose());
        ghosts[i].aim = aimAngle(i, SEATS[i].s);
      }
      return;
    }
    if (ctx.round === 1 || !stats) newMatch(ctx);
    for (const p of ctx.active) {
      const st = SEATS[p.i];
      const s = st.s * ctx.size;
      p.x = st.x;
      p.y = st.y - 100 * s + 29; // name tags sit just above the hat
      const d = Object.assign(p.data, pose());
      d.aim = aimAngle(p.i, s);
      d.armed = false; // a button already held when the round starts must be let go first
      d.done = false;
      d.ms = null;
      d.fs = false;
      d.miss = false;
      d.slow = false;
      d.cocked = false;
      d.newBest = false;
    }
    S.stage = 'wait';
    S.tumbleAt = Math.random() * 1.2;
    tumbleCool = 0;

    // the wait (it only starts in the play phase, after the framework's countdown)
    let wait;
    if (tw === 'patience') wait = rng.range(4.6, 7.4);
    else if (tw === 'fakeout') wait = rng.range(3.0, 5.2);
    else if (tw === 'color') wait = rng.range(1.3, 2.4);
    else wait = rng.range(1.7, 4.4);
    if (api.demo) wait = Math.max(1.5, wait * 0.72);
    S.sigAt = wait;
    if (tw === 'fakeout') {
      const n = rng.int(1, 3);
      let t = rng.range(0.9, 1.4);
      for (let k = 0; k < n && t < wait - 0.6; k++) {
        S.decoys.push({ t, word: rng.pick(DECOY_WORDS), color: rng.pick(DECOY_COLORS), shown: false });
        t += rng.range(0.75, 1.3);
      }
    }
    if (tw === 'color') {
      S.queue = rng.shuffle(ctx.active.slice());
      for (let k = 0; k < 8; k++) S.gaps.push(rng.range(0.45, 1.05));
    }
    // bots plan their draw now, from their temper and how fast the humans have been
    const ref = refMs();
    for (const p of ctx.active) {
      if (p.human && !api.demo) continue;
      const kind = KINDS[kinds[p.i] || 'steady'];
      const b = (p.data.bot = { kind, plan: 0, cockMs: 0, step: 0, fsAt: -1, biteAt: 0, bites: [] });
      let extra = 0;
      if (tw === 'double') extra = rng.range(95, 150);
      else if (tw === 'color') extra = rng.range(55, 105);
      else if (tw === 'silent') extra = rng.range(20, 55);
      b.plan = planMs(kind, ref, rng) + Math.round(extra);
      if (tw === 'double') b.cockMs = Math.max(140, b.plan - rng.range(80, 130));
      const fsChance = kind.fs * (tw === 'patience' ? 2.2 : 1);
      if (rng.chance(fsChance)) b.fsAt = rng.range(Math.min(0.6, wait * 0.5), wait - 0.05);
      for (let k = 0; k < S.decoys.length; k++) b.bites.push(rng.chance(kind.bite) ? rng.range(0.15, 0.32) : -1);
    }
  }

  // ---------- play ----------
  function takeStamp(i, now) {
    const st = stamps[i];
    stamps[i] = 0;
    return st > 0 && now - st < 250 ? st : now;
  }

  function update(dt, ctx) {
    S.t += dt;
    const now = nowMs();
    // taps first: a press that arrived before this frame's signal is a false start
    let shots = null;
    for (const p of ctx.active) {
      if (!p.alive) continue;
      const d = p.data;
      if (!d.armed) {
        if (!p.down) d.armed = true;
        continue;
      }
      if (!p.tap) continue;
      const stamp = p.human && !api.demo ? takeStamp(p.i, now) : now;
      const ms = tapped(p, stamp, ctx);
      if (ms != null) (shots || (shots = [])).push({ p, ms });
    }
    if (shots) applyShots(shots, ctx);

    if (S.stage === 'wait') waitStage(dt, ctx, now);
    else if (S.stage === 'signal') signalStage(ctx);
    else if (S.stage === 'color') colorStage(dt, ctx, now);
    if (S.volleyAt >= 0 && S.t >= S.volleyAt) {
      S.volleyAt = -1;
      volley(ctx);
    }
    if (S.stage !== 'resolve' && !ctx.alive().length) {
      S.stage = 'resolve';
      S.reason = 'allfs';
      S.endAt = S.t + 1.2;
    }
    if (S.stage === 'resolve') resolveStage(ctx);
    step(dt, ctx);
    testHook(ctx);
  }

  function tapped(p, stamp, ctx) {
    const d = p.data;
    if (S.stage === 'wait') {
      falseStart(p, ctx, S.decoy ? 'decoy' : 'early');
      return null;
    }
    if (S.stage === 'signal' || (S.stage === 'resolve' && S.late)) {
      if (d.done) return null;
      if (ctx.twist.id === 'double' && !d.cocked) {
        d.cocked = true;
        d.armT = 0.55;
        d.labelT = 0;
        sndCock(sfx);
        return null;
      }
      return p.human && !api.demo ? Math.max(1, stamp - S.sigStamp) : d.bot.plan;
    }
    if (S.stage === 'color') {
      if (d.done) return null;
      if (S.lit === p) return p.human && !api.demo ? Math.max(1, stamp - S.litStamp) : d.bot.plan;
      falseStart(p, ctx, 'color');
    }
    return null;
  }

  function applyShots(shots, ctx) {
    shots.sort((a, b) => a.ms - b.ms);
    for (const sh of shots) {
      const p = sh.p;
      const d = p.data;
      d.ms = Math.round(sh.ms);
      d.done = true;
      d.labelT = 0;
      if (ctx.twist.id === 'split' && d.ms >= SPLIT_MS) {
        d.miss = true;
        S.anyMiss = true;
      }
      noteTime(p, d.ms);
      const first = S.stage === 'signal' && !d.miss && !S.winner;
      shootFx(p);
      if (first) {
        S.winner = p;
        S.winT = S.t;
        S.stage = 'resolve';
        S.late = true;
        volley(ctx);
      } else if (S.winner && S.stage === 'resolve') d.expr = 'shock';
    }
  }

  function noteTime(p, ms) {
    if (!stats) return;
    stats[p.i].times.push(ms);
    if (!p.human || api.demo) return;
    if (ms < GUESS_MS || (bestMs != null && ms >= bestMs)) return;
    const had = bestMs != null;
    bestMs = ms;
    api.store.set('bestMs', ms);
    if (!had) return; // the first time sets a best quietly
    p.data.newBest = true;
    const st = SEATS[p.i];
    const y = labelY(p);
    fx.text(clamp(st.x, 80, W - 80), y - 66, 'NEW BEST!', { color: GOLD, size: 26, life: 1.5, rise: 26, stroke: '#2a0a12' });
    fx.confetti(st.x, y, 40, [GOLD, '#ffffff', p.color]);
    sfx.play('perfect');
    api.happy();
    api.haptic(30);
  }

  function shootFx(p) {
    const d = p.data;
    const st = SEATS[p.i];
    const s = scaleOf(p);
    d.armT = 1;
    d.recoil = 1;
    d.muzzle = 1;
    const m = muzzlePos(p);
    puff(m.x, m.y, st.f, s, 4);
    fx.burst(m.x, m.y, { count: 9, colors: ['#fff6c2', '#ffb02e', '#ff6a3d'], speed: 280, angle: m.a, spread: 0.5, gravity: 0, life: 0.18, size: 3, shape: 'spark' });
    sndShot(sfx, p.i);
    if (p.human) api.haptic(25);
  }

  function puff(x, y, f, s, n) {
    for (let i = 0; i < n && smoke.length < 70; i++) {
      smoke.push({ x: x + f * i * 3 * s, y: y - i * 2 * s, vx: f * (20 + Math.random() * 40) * s, vy: -(14 + Math.random() * 20) * s, r: (3 + Math.random() * 3) * s, g: (10 + Math.random() * 8) * s, t: 0, life: 1 + Math.random() * 0.7 });
    }
  }

  // The winner fans the hammer and shoots every rival's hat off.
  function volley(ctx) {
    const w = S.winner;
    if (!w) return;
    const wd = w.data;
    const st = SEATS[w.i];
    wd.armT = 1;
    wd.recoil = 1;
    wd.muzzle = 1;
    wd.expr = 'win';
    wd.blowAt = ct + 0.85;
    S.slowLeft = SLOW_DUR;
    S.volleyAge = 0;
    const m = muzzlePos(w);
    let k = 0;
    for (const p of ctx.active) {
      if (p === w || p.data.fs) continue;
      const d = p.data;
      const hp = hatPos(p);
      tracers.push({ x0: m.x, y0: m.y, x1: hp.x, y1: hp.y - 4, t: -k * 0.05, c: w.color });
      if (d.hatOn) d.hatKnockAt = ct + 0.03 + k * 0.05;
      d.hitAt = ct + 0.22 + k * 0.05;
      d.expr = 'shock';
      sndRico(sfx, 0.04 + k * 0.06);
      k++;
    }
    puff(m.x, m.y, st.f, scaleOf(w), 6);
    fx.shake(8, 0.3);
    fx.text(clamp(m.x + st.f * 34, 60, W - 60), m.y + 8, 'BANG!', { color: GOLD, size: 30, life: 0.8, rise: 12, stroke: '#2a0a12' });
    if (ctx.twist.id === 'color' || ctx.twist.id === 'silent') fx.flash('#fff3cf', 0.35);
    sndShot(sfx, w.i);
  }

  function falseStart(p, ctx, why) {
    const d = p.data;
    const st = SEATS[p.i];
    const s = scaleOf(p);
    d.fs = true;
    d.done = true;
    d.labelT = 0;
    d.armT = 1;
    d.aim = 1.0; // the shot goes into the dirt
    d.muzzle = 1;
    d.hopping = true;
    d.hop = 0.001;
    d.expr = 'oops';
    if (d.hatOn) {
      const hp = hatPos(p);
      d.hatOn = false;
      d.hat = { x: hp.x, y: hp.y, vx: -st.f * 45 * s, vy: -400, rot: 0, vr: -st.f * 7, ground: st.y + 4, s, f: st.f, landed: false, bounced: false };
    }
    const gx = st.x + st.f * 34 * s;
    fx.burst(gx, st.y + 2, { count: 16, colors: ['#e0a070', '#a86a48', '#fff0d0'], speed: 170, angle: -Math.PI / 2, spread: Math.PI * 0.9, gravity: 520, life: 0.6, size: 4 });
    puff(gx, st.y - 4, st.f, s, 3);
    ctx.eliminate(p);
    sndShot(sfx, p.i);
    sndOops(sfx);
    const words = why === 'decoy' ? ['FOOLED!', 'GOTCHA!', 'NOT DRAW!'] : why === 'color' ? ['WRONG COLOR!', 'NOT YOURS!'] : ['TOO SOON!', 'JUMPED IT!', 'EASY THERE!'];
    const top = st.y < H / 2;
    fx.text(clamp(st.x, 80, W - 80), labelY(p) - 28, words[Math.floor(Math.random() * words.length)], { color: '#ffffff', size: 24, life: 1.1, rise: top ? 20 : 50, stroke: '#c0263a' });
    if (stats) stats[p.i].fs += 1;
  }

  function waitStage(dt, ctx, now) {
    const tw = ctx.twist.id;
    if (!S.whistled && S.t > 0.15) {
      S.whistled = true;
      sndWhistle(sfx);
    }
    S.tick += dt;
    if (S.tick >= 0.5) {
      S.tick -= 0.5;
      sndTick(sfx, S.tickN++ % 2 === 0);
    }
    if (tw === 'patience' || S.t > 3.5) {
      S.heart += dt;
      const every = Math.max(0.55, 0.9 - S.t * 0.04);
      if (S.heart >= every) {
        S.heart = 0;
        sndHeart(sfx);
      }
    }
    if (Math.random() < dt * 0.12) sndWind(sfx);
    for (let k = 0; k < S.decoys.length; k++) {
      const dc = S.decoys[k];
      if (dc.shown || S.t < dc.t) continue;
      dc.shown = true;
      S.decoy = dc;
      S.decoyT = S.t;
      S.decoyAge = 0;
      S.lamp = { color: dc.color, t: 0 };
      fx.flash(dc.color, 0.28);
      fx.shake(3, 0.15);
      sndDecoy(sfx);
      for (const p of ctx.active) {
        const b = p.data.bot;
        if (b && p.alive && b.bites[k] > 0) b.biteAt = S.t + b.bites[k];
      }
    }
    if (S.decoy && S.t - S.decoyT > 0.6) {
      S.decoy = null;
      S.lamp = null;
    }
    if (S.t >= S.sigAt) {
      if (tw === 'color') {
        S.stage = 'color';
        S.sigT = S.t;
        S.nextLitT = S.t;
        S.decoy = null;
      } else fireSignal(ctx, now);
    }
  }

  function fireSignal(ctx, now) {
    S.stage = 'signal';
    S.sigT = S.t;
    S.sigStamp = now;
    S.sigPending = true; // re-stamped when the frame showing it has been drawn
    S.sigAge = 0;
    S.decoy = null;
    S.lamp = { color: GOLD, t: 0 };
    if (ctx.twist.id === 'silent') {
      sndBell(sfx);
      return;
    }
    fx.flash('#fff3cf', ctx.twist.id === 'lights' ? 0.95 : 0.8);
    fx.shake(10, 0.32);
    fx.ring(W / 2, SIG_Y, { color: '#fff3cf', radius: 240, life: 0.55, width: 7 });
    fx.burst(POST_X, POST_Y - 70, { count: 22, colors: ['#ffffff', GOLD, '#ff9f43'], speed: 360, life: 0.55, gravity: 120, size: 4, shape: 'spark' });
    sndDraw(sfx);
  }

  function signalStage(ctx) {
    let pending = 0;
    for (const p of ctx.active) if (p.alive && !p.data.done) pending++;
    if (!pending) {
      // everyone fired and nobody hit (SPLIT SECOND)
      S.stage = 'resolve';
      S.late = false;
      S.reason = 'miss';
      S.endAt = S.t + 1.0;
      sfx.play('error');
    } else if (S.t - S.sigT >= NO_SHOT) {
      markSlow(ctx);
      S.stage = 'resolve';
      S.late = false;
      S.reason = S.anyMiss ? 'miss' : 'slow';
      S.endAt = S.t + 1.0;
      sfx.play('error');
    }
  }

  function markSlow(ctx) {
    for (const p of ctx.active) {
      const d = p.data;
      if (!p.alive || d.done) continue;
      d.done = true;
      d.slow = true;
      d.labelT = 0;
      if (d.expr === 'cool') d.expr = 'shock';
    }
  }

  function colorStage(dt, ctx, now) {
    const rng = ctx.rng;
    if (S.lit) {
      const o = S.lit;
      if (o.data.done) {
        if (S.litDoneT < 0) S.litDoneT = S.t;
        if (S.t - S.litDoneT > 0.3) endLit();
      } else if (!o.alive) endLit();
      else if (S.t - S.litT > 1.25) {
        o.data.done = true;
        o.data.slow = true;
        o.data.labelT = 0;
        endLit();
      }
      return;
    }
    S.tick += dt;
    if (S.tick >= 0.5) {
      S.tick -= 0.5;
      sndTick(sfx, S.tickN++ % 2 === 0);
    }
    if (S.t < S.nextLitT) return;
    let next = null;
    while (S.queue.length && !next) {
      const q = S.queue.shift();
      if (q.alive && !q.data.done) next = q;
    }
    if (!next) {
      finishColor(ctx);
      return;
    }
    S.lit = next;
    S.litT = S.t;
    S.litStamp = now;
    S.litPending = true;
    S.litAge = 0;
    S.litDoneT = -1;
    S.lamp = { color: next.color, t: 0 };
    sndColor(sfx, next.i);
    fx.flash(next.color, 0.3);
    fx.shake(4, 0.15);
    for (const p of ctx.active) {
      const b = p.data.bot;
      if (!b || p === next || !p.alive || p.data.done) continue;
      b.biteAt = rng.chance(b.kind.bite * 0.45) ? S.t + rng.range(0.14, 0.3) : 0;
    }
  }

  function endLit() {
    S.lit = null;
    S.lamp = null;
    S.nextLitT = S.t + S.gaps[S.gapI++ % S.gaps.length];
    if (sctx) for (const p of sctx.active) if (p.data.bot) p.data.bot.biteAt = 0;
  }

  function finishColor(ctx) {
    let best = null;
    for (const p of ctx.active) {
      const d = p.data;
      if (d.ms != null && !d.fs && !d.miss && (!best || d.ms < best.data.ms)) best = p;
    }
    S.stage = 'resolve';
    S.late = false;
    if (best) {
      S.winner = best;
      S.winT = S.t + 0.35;
      S.volleyAt = S.winT;
    } else {
      S.reason = 'slow';
      S.endAt = S.t + 1.0;
      sfx.play('error');
    }
  }

  function resolveStage(ctx) {
    if (S.winner) {
      if (S.allDoneT < 0) {
        let all = true;
        for (const p of ctx.active) if (p.alive && !p.data.done) all = false;
        if (all) S.allDoneT = S.t;
      }
      const endA = S.winT + 1.45;
      const endB = S.allDoneT >= 0 ? Math.max(S.allDoneT + 0.5, S.winT + 0.95) : 1e9;
      if (S.t >= Math.min(endA, endB)) {
        markSlow(ctx);
        ctx.endRound(S.winner);
      }
    } else if (S.t >= S.endAt) ctx.endRound([]);
  }

  // ---------- bots ----------
  function bot(p, dt, ctx) {
    const d = p.data;
    const b = d.bot;
    if (!b || d.done) return false;
    if (S.stage === 'wait') {
      if (b.fsAt >= 0 && S.t >= b.fsAt) return true;
      return b.biteAt > 0 && S.t >= b.biteAt;
    }
    if (S.stage === 'signal' || (S.stage === 'resolve' && S.late)) {
      const el = nowMs() - S.sigStamp;
      if (ctx.twist.id === 'double') {
        if (b.step === 0) {
          if (el >= b.cockMs) {
            b.step = 1;
            return true;
          }
          return false;
        }
        if (b.step === 1) {
          b.step = 2;
          return false;
        }
      }
      return el >= b.plan;
    }
    if (S.stage === 'color') {
      if (S.lit === p) return nowMs() - S.litStamp >= b.plan;
      return !!S.lit && b.biteAt > 0 && S.t >= b.biteAt;
    }
    return false;
  }

  // ---------- cosmetics (safe in every phase) ----------
  function step(dt, ctx) {
    let k = 1;
    if (S.slowLeft > 0) {
      const u = 1 - S.slowLeft / SLOW_DUR;
      k = 0.22 + 0.78 * u * u;
      S.slowLeft -= dt;
    }
    const cdt = dt * k;
    ct += cdt;
    const ph = ctx.phase;
    const want = ph === 'count' ? 0.55 : ph === 'play' && (S.stage === 'wait' || S.stage === 'color') ? 1 : 0;
    S.tension += (want - S.tension) * Math.min(1, dt * (want > S.tension ? 1.2 : 3.5));
    S.sigAge += dt;
    S.decoyAge += dt;
    S.litAge += dt;
    S.volleyAge += dt;
    if (S.lamp) S.lamp.t += dt;
    endAge = ph === 'matchEnd' ? endAge + dt : 0;

    // tumbleweed rolling through
    if (tumble) {
      tumble.x += tumble.vx * cdt;
      tumble.ph += cdt * 1.7;
      tumble.rot += (tumble.vx * cdt) / tumble.r;
      if (tumble.x < -70 || tumble.x > W + 70) tumble = null;
    } else {
      tumbleCool -= dt;
      const ok = ph === 'lobby' || (ph === 'play' && S.stage === 'wait' && S.t >= S.tumbleAt);
      if (tumbleCool <= 0 && ok) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        tumble = { x: dir > 0 ? -40 : W + 40, vx: dir * (90 + Math.random() * 40), r: 15, ph: 0, rot: 0, y: TUMBLE_Y + (Math.random() - 0.5) * 16 };
        tumbleCool = ph === 'lobby' ? 5 : 99;
        if (ph === 'play') sndWind(sfx);
      }
    }
    for (const m of motes) {
      m.x += (14 + m.z * 22) * cdt;
      m.y += Math.sin(ct * 0.8 + m.ph) * 6 * cdt;
      if (m.x > W + 6) m.x -= W + 12;
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      s.t += cdt;
      if (s.t > s.life) {
        smoke.splice(i, 1);
        continue;
      }
      s.x += s.vx * cdt;
      s.y += s.vy * cdt;
      s.vx *= Math.exp(-1.6 * cdt);
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].t += cdt;
      if (tracers[i].t > 0.45) tracers.splice(i, 1);
    }
    if (ph === 'lobby') {
      for (const gp of ghosts) gp.labelT += dt;
      return;
    }
    for (const p of ctx.active) animate(p, cdt, dt);
  }

  function animate(p, cdt, dt) {
    const d = p.data;
    if (d.aim == null) return;
    const st = SEATS[p.i];
    const s = scaleOf(p);
    d.arm += (d.armT - d.arm) * Math.min(1, cdt * (d.armT > d.arm ? 24 : 5));
    d.recoil = Math.max(0, d.recoil - cdt * 4.5);
    d.muzzle = Math.max(0, d.muzzle - cdt * 9);
    if (d.blowAt && ct >= d.blowAt) {
      d.blow = Math.min(1, d.blow + cdt * 2.4);
      if (Math.random() < cdt * 6) {
        const hx = st.x + st.f * 11 * s;
        const hy = st.y - 100 * s;
        smoke.push({ x: hx, y: hy, vx: st.f * 6, vy: -22, r: 1.5 * s, g: 6 * s, t: 0, life: 1.1 });
      }
    }
    if (d.hatKnockAt && ct >= d.hatKnockAt) {
      d.hatKnockAt = 0;
      const hp = hatPos(p);
      d.hatOn = false;
      const away = -st.f;
      d.hat = { x: hp.x, y: hp.y, vx: away * (60 + Math.random() * 70) * s, vy: -(320 + Math.random() * 120), rot: 0, vr: away * (9 + Math.random() * 5), ground: st.y + 5, s, f: st.f, landed: false, bounced: false };
      fx.burst(hp.x, hp.y, { count: 12, colors: [p.color, '#ffffff', GOLD], speed: 200, life: 0.4, gravity: 300, size: 3, shape: 'spark' });
    }
    if (d.hitAt && ct >= d.hitAt) {
      d.hitAt = 0;
      d.tipping = true;
    }
    if (d.tipping && d.tip < 1) {
      d.tipV += cdt * 7;
      d.tip = Math.min(1, d.tip + d.tipV * cdt);
      if (d.tip >= 1) {
        d.expr = 'dizzy';
        const hx = st.x - st.f * 80 * s;
        fx.burst(hx, st.y - 6, { count: 14, colors: ['#e0a070', '#a86a48', '#fff0d0'], speed: 120, angle: -Math.PI / 2, spread: Math.PI, gravity: 400, life: 0.5, size: 4 });
        sndThud(sfx);
      }
    }
    if (d.hopping) {
      d.hop += cdt * 0.85;
      if (d.hop >= 1) {
        d.hopping = false;
        d.hop = 0;
        d.sulk = true;
        d.armT = 0;
      }
    }
    const h = d.hat;
    if (h && !h.landed) {
      h.vy += 900 * cdt;
      h.x += h.vx * cdt;
      h.y += h.vy * cdt;
      h.rot += h.vr * cdt;
      if (h.x < 16 || h.x > W - 16) {
        h.x = clamp(h.x, 16, W - 16);
        h.vx *= -0.4;
      }
      if (h.y >= h.ground && h.vy > 0) {
        h.y = h.ground;
        if (h.bounced) {
          h.landed = true;
          h.rot = Math.round(h.rot / Math.PI) * Math.PI;
        } else {
          h.bounced = true;
          h.vy *= -0.32;
          h.vx *= 0.5;
          h.vr *= 0.4;
        }
      }
    }
    d.labelT += dt;
  }

  // ---------- render ----------
  function slingerPose(d, seed) {
    return { arm: d.arm, aim: d.aim, recoil: d.recoil, blow: d.blow, tip: d.tip, hop: d.hopping ? d.hop : 0, sulk: d.sulk, hatOn: d.hatOn, expr: d.expr, muzzle: d.muzzle, twitch: d.done ? 0 : S.tension, seed };
  }

  function drawFigure(g, i, color, d, s, isHuman, T) {
    const st = SEATS[i];
    const dx = st.x - W / 2;
    const dy = st.y - HY;
    const l = Math.hypot(dx, dy) || 1;
    drawShadow(g, st.x, st.y, s, dx / l, dy / l, i < 2 ? 62 : 46, S.night);
    if (isHuman) {
      const pulse = 0.5 + 0.5 * Math.sin(T * 4);
      g.strokeStyle = hexA(color, 0.75);
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(st.x, st.y + 2, 26 * s, 7 * s, 0, 0, TAU);
      g.stroke();
      g.strokeStyle = hexA(color, 0.35 * pulse);
      g.beginPath();
      g.ellipse(st.x, st.y + 2, (30 + pulse * 6) * s, (8.5 + pulse * 1.5) * s, 0, 0, TAU);
      g.stroke();
    }
    drawSlinger(g, st.x, st.y, s, st.f, color, slingerPose(d, i), ct);
    if (d.tip >= 1) {
      // dizzy stars over the fallen gunslinger
      const hx = st.x - st.f * 84 * s;
      const hy = st.y - 14 * s;
      for (let k = 0; k < 3; k++) {
        const a = ct * 4 + (k * TAU) / 3;
        star(g, hx + Math.cos(a) * 12 * s, hy - 8 * s + Math.sin(a) * 4 * s, 3.2 * s, GOLD);
      }
    }
    if (d.sulk) {
      // a tiny rain cloud over whoever jumped the gun
      const cx = st.x + st.f * 2 * s;
      const cy = st.y - 97 * s;
      g.fillStyle = 'rgba(120,120,150,0.85)';
      g.beginPath();
      g.arc(cx - 7 * s, cy, 6 * s, 0, TAU);
      g.arc(cx + 1 * s, cy - 3 * s, 7.5 * s, 0, TAU);
      g.arc(cx + 9 * s, cy, 5.5 * s, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(140,210,255,0.8)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const ry = ((ct * 40 + k * 9) % 18) * s;
        const rx = cx + (k - 1.5) * 5 * s;
        g.moveTo(rx, cy + 5 * s + ry);
        g.lineTo(rx - 1 * s, cy + 9 * s + ry);
      }
      g.stroke();
    }
  }

  function star(g, x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  }

  function render(g, ctx) {
    const T = api.totalTime;
    const lobby = ctx.phase === 'lobby';
    const night = S.night && !lobby;
    drawSky(g, W, H, HY, T, { night, zoom: 1 + S.tension * 0.05 });
    drawGround(g, W, H, HY, T, { night });
    // props around the street
    drawCactus(g, 362, HY + 22, 34, { side: -1, color: night ? '#0c1232' : '#5a1c3c', rim: night ? 'rgba(120,150,255,0.3)' : 'rgba(255,170,110,0.5)' });
    drawCactus(g, 52, HY + 30, 26, { side: 1, color: night ? '#0c1232' : '#5a1c3c', rim: night ? 'rgba(120,150,255,0.3)' : 'rgba(255,170,110,0.5)' });
    drawSkull(g, 150, 452, 1, night);

    const list = lobby ? null : ctx.active;
    // the far pair first
    for (let i = 2; i < 4; i++) {
      if (lobby) drawFigure(g, i, PLAYER_COLORS[i], ghosts[i], SEATS[i].s, false, T);
      else {
        const p = list.find((q) => q.i === i);
        if (p) drawFigure(g, i, p.color, p.data, scaleOf(p), p.human && !api.demo, T);
      }
    }
    // the middle of the street: lantern post, tumbleweed, big cacti
    const lamp = S.lamp;
    let lit = null;
    let lk = 0;
    if (lamp) {
      lit = lamp.color;
      lk = S.stage === 'signal' || S.stage === 'resolve' ? Math.max(0.35, 1 - lamp.t * 0.8) : Math.max(0.3, 1 - lamp.t);
      if (S.decoy) lk *= 0.6 + 0.4 * Math.sin(T * 40);
    } else if (S.stage === 'resolve' && S.sigT >= 0) {
      lit = GOLD;
      lk = 0.35;
    }
    drawLantern(g, POST_X, POST_Y, 1.05, lit, lk, T, night);
    drawCactus(g, 18, 488, 158, { side: 1, color: night ? '#060a1e' : '#1f0819', rim: night ? 'rgba(120,150,255,0.35)' : 'rgba(255,160,100,0.55)' });
    drawCactus(g, 404, 436, 96, { side: -1, color: night ? '#060a1e' : '#22091c', rim: night ? 'rgba(120,150,255,0.35)' : 'rgba(255,160,100,0.5)' });
    if (tumble) {
      const by = Math.abs(Math.sin(tumble.ph * Math.PI)) * 16;
      g.fillStyle = night ? 'rgba(0,0,12,0.35)' : 'rgba(40,6,26,0.3)';
      g.beginPath();
      g.ellipse(tumble.x, tumble.y + tumble.r * 0.9, tumble.r * (1 - by / 40), tumble.r * 0.25, 0, 0, TAU);
      g.fill();
      drawTumbleweed(g, tumble.x, tumble.y - by, tumble.r, tumble.rot, night);
    }
    // the near pair
    for (let i = 0; i < 2; i++) {
      if (lobby) drawFigure(g, i, PLAYER_COLORS[i], ghosts[i], SEATS[i].s, false, T);
      else {
        const p = list.find((q) => q.i === i);
        if (p) drawFigure(g, i, p.color, p.data, scaleOf(p), p.human && !api.demo, T);
      }
    }
    // hats in flight (and lying in the dirt)
    if (list) {
      for (const p of list) {
        const h = p.data.hat;
        if (h) drawHat(g, h.x, h.y, h.s, h.f, h.rot, p.color);
      }
    }
    // gun smoke
    for (const s of smoke) {
      const k = s.t / s.life;
      g.fillStyle = night ? `rgba(180,190,230,${0.32 * (1 - k)})` : `rgba(255,236,220,${0.42 * (1 - k)})`;
      g.beginPath();
      g.arc(s.x, s.y, s.r + s.g * k, 0, TAU);
      g.fill();
    }
    // bullet tracers
    for (const tr of tracers) {
      if (tr.t < 0) continue;
      const k = tr.t / 0.45;
      const head = Math.min(1, tr.t / 0.07);
      const x1 = tr.x0 + (tr.x1 - tr.x0) * head;
      const y1 = tr.y0 + (tr.y1 - tr.y0) * head;
      const tail = Math.max(0, head - 0.55 - k * 0.5);
      const tx0 = tr.x0 + (tr.x1 - tr.x0) * tail;
      const ty0 = tr.y0 + (tr.y1 - tr.y0) * tail;
      g.lineCap = 'round';
      g.strokeStyle = hexA(tr.c, 0.45 * (1 - k));
      g.lineWidth = 9 * (1 - k) + 2;
      g.beginPath();
      g.moveTo(tx0, ty0);
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = `rgba(255,248,210,${1 - k})`;
      g.lineWidth = 3 * (1 - k) + 1;
      g.beginPath();
      g.moveTo(tx0, ty0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    // dust motes in the low sun
    g.fillStyle = night ? 'rgba(170,190,255,0.35)' : 'rgba(255,214,160,0.45)';
    for (const m of motes) {
      g.globalAlpha = 0.3 + m.z * 0.5;
      g.fillRect(m.x, m.y, 1.4 + m.z, 1.4 + m.z);
    }
    g.globalAlpha = 1;
    // winner moment: speed lines rushing at the winner
    if (S.winner && S.volleyAge < 0.45) {
      const k = S.volleyAge / 0.45;
      const m = muzzlePos(S.winner);
      g.strokeStyle = `rgba(255,248,220,${0.4 * (1 - k)})`;
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU + jit(i, 5) * 0.08;
        const r0 = 150 + jit(i, 6) * 30 - k * 60;
        const r1 = r0 + 120 + jit(i, 7) * 60;
        g.moveTo(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0);
        g.lineTo(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1);
      }
      g.stroke();
    }
    // tension: vignette and letterbox bars (the HUD still draws over them)
    if (S.tension > 0.01) {
      const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
      vg.addColorStop(0, 'rgba(12,2,14,0)');
      vg.addColorStop(1, `rgba(12,2,14,${0.55 * S.tension})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      const bar = 24 * S.tension;
      g.fillStyle = '#07020a';
      g.fillRect(0, 0, W, bar);
      g.fillRect(0, H - bar, W, bar);
    }
  }

  // ---------- overlay: drawn above the framework's layers (and LIGHTS OUT) ----------
  function pill(g, x, y, text, o) {
    const size = o.size || 17;
    g.save();
    g.font = draw.font(size, 800);
    const tw = g.measureText(text).width;
    g.restore();
    const w = tw + 22;
    const h = size + 13;
    const cx = clamp(x, w / 2 + 6, W - w / 2 - 6);
    const sc = o.scale ?? 1;
    g.save();
    g.translate(cx, y);
    g.scale(sc, sc);
    draw.roundRect(g, -w / 2, -h / 2, w, h, h / 2, o.bg, o.border || null, 2.5);
    draw.text(g, text, 0, 1, { size, color: o.color, shadow: false });
    g.restore();
    return cx;
  }

  function overlay(g) {
    const ctx = sctx;
    if (!ctx) return;
    const ph = ctx.phase;
    if (S.sigPending || S.litPending) {
      // The reaction clock starts once the signal frame is fully drawn, so a slow frame
      // never counts against the player.
      const t = nowMs();
      if (S.sigPending) S.sigStamp = t;
      if (S.litPending) S.litStamp = t;
      S.sigPending = S.litPending = false;
      testHook(ctx);
    }
    if (ph === 'lobby') {
      lobbyBadge(g);
      return;
    }
    if (ph === 'play') signalLayer(g, ctx);
    if (ph === 'card' || ph === 'count') nicknames(g, ctx);
    if (ph === 'play' || ph === 'roundEnd') labels(g, ctx);
    if (ph !== 'matchEnd') hudPill(g, ctx);
    if (ph === 'roundEnd') roundEndLine(g, ctx);
    if (ph === 'matchEnd') matchCard(g, ctx);
  }

  function lobbyBadge(g) {
    const y = 520;
    draw.roundRect(g, W / 2 - 92, y - 18, 184, 38, 14, 'rgba(8,4,20,0.88)', hexA(GOLD, 0.55), 2);
    draw.text(g, '⏱ REACTION TIME TEST', W / 2, y - 6, { size: 10, weight: 800, color: GOLD, shadow: false });
    draw.text(g, bestMs != null ? `YOUR BEST  ${bestMs} ms` : 'NO BEST TIME YET', W / 2, y + 9, { size: 13, color: '#ffffff', shadow: false });
  }

  function nicknames(g, ctx) {
    for (const p of ctx.active) {
      if (p.human && !api.demo) continue;
      const k = kinds[p.i];
      if (!k) continue;
      const st = SEATS[p.i];
      // under the boots for the near pair, above the name tag for the far pair (clear of the card)
      const y = st.y > H / 2 ? st.y + 18 : st.y - 100 * scaleOf(p) - 46;
      draw.text(g, KINDS[k].name, st.x, y, { size: 10, weight: 800, color: hexA(p.color, 0.9), stroke: 'rgba(10,4,20,0.6)', strokeWidth: 3, shadow: false });
    }
  }

  function hudPill(g, ctx) {
    if (api.demo || !ctx.humans) return;
    const solo = ctx.humans === 1;
    let txt = `⏱ BEST ${bestMs != null ? bestMs + ' ms' : '--'}`;
    if (solo) {
      const h = ctx.active.find((p) => p.human);
      const sm = h ? summary(h.i) : null;
      if (sm && sm.avg != null) txt += `   AVG ${sm.avg} ms`;
    }
    g.save();
    g.font = draw.font(12, 800);
    const w = g.measureText(txt).width + 24;
    g.restore();
    draw.roundRect(g, W / 2 - w / 2, 70, w, 22, 11, 'rgba(10,6,24,0.55)');
    draw.text(g, txt, W / 2, 81, { size: 12, color: 'rgba(255,255,255,0.9)', shadow: false });
  }

  function signalLayer(g, ctx) {
    const tw = ctx.twist.id;
    const T = api.totalTime;
    if (S.stage === 'wait' || (S.stage === 'color' && !S.lit)) {
      if (S.decoy) {
        // a decoy: big, loud, wrong
        const k = S.decoyAge;
        const out = k < 0.45 ? 1 : Math.max(0, 1 - (k - 0.45) / 0.15);
        const sz = 80 * (k < 0.08 ? 1.4 - 5 * k : 1) * out;
        const jx = Math.sin(T * 60) * 3;
        if (sz > 4) draw.text(g, S.decoy.word, W / 2 + jx, SIG_Y, { size: sz, color: S.decoy.color, stroke: '#2a0a12', strokeWidth: 9 });
        return;
      }
      const pulse = 0.6 + 0.3 * Math.sin(T * 3.2);
      const main = S.stage === 'color' ? 'WAIT FOR YOUR COLOR' : 'WAIT FOR IT...';
      draw.text(g, main, W / 2, SIG_Y, { size: S.stage === 'color' ? 20 : 24, color: '#ffffff', alpha: pulse * Math.min(1, S.t * 3), shadow: 'rgba(20,4,16,0.9)' });
      const hint = ctx.round === 1 && tw === 'classic' ? HINTS.classic : HINTS[tw];
      if (hint && S.stage === 'wait') draw.text(g, hint, W / 2, SIG_Y + 30, { size: 13, color: GOLD, alpha: 0.85 * Math.min(1, S.t * 3), shadow: false });
      return;
    }
    if (S.stage === 'color' && S.lit) {
      const c = S.lit.color;
      const a = Math.min(1, S.litAge * 8);
      const eg = g.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
      eg.addColorStop(0, hexA(c, 0));
      eg.addColorStop(1, hexA(c, 0.55 * a));
      g.fillStyle = eg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = hexA(c, 0.9 * a);
      g.lineWidth = 8;
      g.strokeRect(4, 4, W - 8, H - 8);
      bigDraw(g, S.litAge, c, 'DRAW!', T);
      return;
    }
    // signal / resolve
    if (S.sigT < 0) {
      // COLOR CALL resolve: nothing big, the volley says it all
      return;
    }
    if (tw === 'silent') {
      if (S.winner) draw.text(g, 'DRAW!', W / 2, SIG_Y, { size: 36, color: GOLD, stroke: '#2a0a12', alpha: Math.min(1, S.volleyAge * 4) });
    } else if (S.sigStamp) bigDraw(g, S.sigAge, GOLD, 'DRAW!', T);
    if (tw === 'split' && S.sigStamp) {
      const el = nowMs() - S.sigStamp;
      if (el < SPLIT_MS) {
        const k = el / SPLIT_MS;
        g.strokeStyle = k < 0.7 ? '#ffffff' : '#ff5a5a';
        g.lineWidth = 6;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(W / 2, SIG_Y, 92, -Math.PI / 2, -Math.PI / 2 + (1 - k) * TAU);
        g.stroke();
      }
    }
    if (S.stage === 'resolve' && !S.winner && S.reason) {
      const msg = S.reason === 'allfs' ? 'EVERYONE JUMPED!' : S.reason === 'miss' ? 'ALL TOO SLOW!' : 'NOBODY DREW!';
      draw.text(g, msg, W / 2, SIG_Y + 70, { size: 30, color: '#ffffff', stroke: '#c0263a' });
    }
  }

  function bigDraw(g, age, color, text, T) {
    const fade = age < 1.3 ? 1 : Math.max(0, 1 - (age - 1.3) / 0.2);
    if (fade <= 0) return;
    const grow = Math.min(1, age / 0.12);
    const after = S.winner && S.volleyAt < 0 ? Math.max(0, 1 - S.volleyAge / 0.4) : 1;
    drawBurst(g, W / 2, SIG_Y, 190 * grow, T * 0.35, color, (age < 0.5 ? 1 : Math.max(0, 1 - (age - 0.5) / 0.5)) * 0.9 * after);
    if (age < 0.24) {
      const a = 1 - age / 0.24;
      for (let i = 0; i < 6; i++) {
        const ang = jit(i, S.boltSeed) * Math.PI + (i * TAU) / 6;
        drawBolt(g, W / 2 + Math.cos(ang) * 40, SIG_Y + Math.sin(ang) * 30, ang, 120 + Math.abs(jit(i, S.boltSeed + 3)) * 110, S.boltSeed * 10 + i, 2.4, color, a);
      }
    }
    const pop = age < 0.1 ? 1.6 - 6 * age : 1;
    let settle = age > 0.6 ? Math.max(0.78, 1 - (age - 0.6) * 0.5) : 1;
    if (S.winner && S.volleyAt < 0) settle = Math.min(settle, 1 - 0.36 * Math.min(1, S.volleyAge / 0.25));
    const jx = age < 0.2 ? (Math.random() - 0.5) * 6 : 0;
    const jy = age < 0.2 ? (Math.random() - 0.5) * 6 : 0;
    g.save();
    g.translate(W / 2 + jx, SIG_Y + jy);
    g.rotate(-0.06);
    const size = 96 * pop * settle * fade;
    draw.text(g, text, 5, 6, { size, color: 'rgba(20,2,12,0.55)', stroke: 'rgba(20,2,12,0.55)', strokeWidth: 11 * fade, shadow: false });
    draw.text(g, text, 0, 0, { size, color, stroke: '#2a0a12', strokeWidth: 11 * fade, shadow: false });
    g.restore();
  }

  function labels(g, ctx) {
    const solo = ctx.humans === 1 && !api.demo;
    for (const p of ctx.active) {
      const d = p.data;
      const st = SEATS[p.i];
      const y = labelY(p);
      const sc = d.labelT < 0.2 ? api.ease.outBack(Math.min(1, d.labelT / 0.2)) : 1;
      let cx = st.x;
      const isWin = S.winner === p && (S.volleyAt < 0 || ctx.phase !== 'play');
      if (d.fs) cx = pill(g, st.x, y, 'FALSE START', { size: 15, bg: '#c0263a', color: '#ffffff', border: '#ffffff', scale: sc });
      else if (d.ms != null) {
        if (isWin) cx = pill(g, st.x, y, `👑 ${d.ms} ms`, { size: 21, bg: GOLD, color: '#2a0a12', border: '#ffffff', scale: sc });
        else if (d.miss) cx = pill(g, st.x, y, `${d.ms} ms MISS`, { size: 16, bg: 'rgba(40,6,16,0.9)', color: '#ff8a8a', border: '#ff5a5a', scale: sc });
        else cx = pill(g, st.x, y, `${d.ms} ms`, { size: 18, bg: 'rgba(14,6,22,0.88)', color: '#ffffff', border: p.color, scale: sc });
      } else if (d.slow) cx = pill(g, st.x, y, 'TOO SLOW', { size: 14, bg: 'rgba(14,6,22,0.8)', color: 'rgba(255,255,255,0.65)', scale: sc });
      else if (d.cocked) cx = pill(g, st.x, y, 'COCKED 1/2', { size: 13, bg: 'rgba(14,6,22,0.8)', color: GOLD, border: GOLD, scale: sc });
      else continue;
      // who is who, and the moments worth shouting about
      if (p.human && !api.demo) draw.text(g, solo ? 'YOU' : p.tag, cx, y - 24, { size: 12, color: p.color, stroke: 'rgba(10,4,20,0.7)', strokeWidth: 3, shadow: false });
      if (d.newBest) draw.text(g, 'NEW BEST!', cx, y - 40, { size: 13, color: GOLD, stroke: '#2a0a12', strokeWidth: 3, shadow: false });
      else if (d.ms != null && d.ms < GUESS_MS) draw.text(g, 'LUCKY GUESS?', cx, y - 40, { size: 11, color: '#ffffff', stroke: '#2a0a12', strokeWidth: 3, shadow: false });
    }
  }

  function roundEndLine(g, ctx) {
    const y = ctx.H * 0.36 + 34;
    const w = S.winner;
    if (w && w.data.ms != null) {
      draw.text(g, `⚡ ${w.data.ms} ms`, W / 2, y, { size: 20, color: GOLD, stroke: '#2a0a12', strokeWidth: 4 });
      return;
    }
    const msg = S.reason === 'allfs' ? 'NO CROWN: EVERYONE JUMPED THE GUN' : S.reason === 'miss' ? `NO CROWN: NOBODY BEAT ${SPLIT_MS} ms` : 'NO CROWN: NOBODY DREW IN TIME';
    draw.text(g, msg, W / 2, y, { size: 14, color: '#ffffff', stroke: '#2a0a12', strokeWidth: 4, maxWidth: W - 40 });
  }

  function matchCard(g, ctx) {
    const k = Math.min(1, Math.max(0, (endAge - 0.25) / 0.35));
    if (k <= 0) return;
    const sc = api.ease.outBack(k);
    const humans = api.demo ? [] : ctx.active.filter((p) => p.human);
    g.save();
    g.translate(W / 2, 384);
    g.scale(sc, sc);
    const cw = 320;
    if (humans.length === 1) {
      const p = humans[0];
      const sm = summary(p.i);
      const ch = 190;
      draw.roundRect(g, -cw / 2, -ch / 2, cw, ch, 22, 'rgba(22,10,34,0.94)', GOLD, 3);
      draw.text(g, 'YOUR REACTION TIME TEST', 0, -ch / 2 + 22, { size: 13, color: GOLD, shadow: false });
      draw.text(g, 'AVERAGE', -72, -40, { size: 11, weight: 800, color: 'rgba(255,255,255,0.6)', shadow: false });
      draw.text(g, 'BEST', 72, -40, { size: 11, weight: 800, color: 'rgba(255,255,255,0.6)', shadow: false });
      draw.text(g, sm.avg != null ? `${sm.avg} ms` : '--', -72, -14, { size: 30, color: '#ffffff' });
      draw.text(g, sm.best != null ? `${sm.best} ms` : '--', 72, -14, { size: 30, color: p.color });
      draw.text(g, `RANK: ${rankFor(sm.avg)}`, 0, 22, { size: 20, color: GOLD, stroke: '#2a0a12', strokeWidth: 4 });
      const isNew = bestMs != null && (startBest == null || bestMs < startBest);
      draw.text(g, `ALL-TIME BEST ${bestMs != null ? bestMs + ' ms' : '--'}${isNew ? '  NEW!' : ''}`, 0, 52, { size: 13, color: isNew ? GOLD : '#ffffff', shadow: false });
      draw.text(g, `${sm.n} shot${sm.n === 1 ? '' : 's'}  ${sm.fs} false start${sm.fs === 1 ? '' : 's'}`, 0, 74, { size: 11, weight: 700, color: 'rgba(255,255,255,0.6)', shadow: false });
    } else if (humans.length > 1) {
      const ch = 64 + humans.length * 30;
      draw.roundRect(g, -cw / 2, -ch / 2, cw, ch, 22, 'rgba(22,10,34,0.94)', GOLD, 3);
      draw.text(g, 'REACTION TIMES', 0, -ch / 2 + 20, { size: 13, color: GOLD, shadow: false });
      humans.forEach((p, i) => {
        const sm = summary(p.i);
        const y = -ch / 2 + 48 + i * 30;
        draw.circle(g, -cw / 2 + 24, y, 7, p.color);
        draw.text(g, p.tag, -cw / 2 + 38, y, { size: 15, align: 'left', color: '#ffffff', shadow: false });
        draw.text(g, `AVG ${sm.avg != null ? sm.avg : '--'}`, -18, y, { size: 14, color: '#ffffff', shadow: false });
        draw.text(g, `BEST ${sm.best != null ? sm.best : '--'}`, 76, y, { size: 14, color: p.color, shadow: false });
        draw.text(g, sm.fs ? `${sm.fs}✕` : '', cw / 2 - 18, y, { size: 12, color: '#ff8a8a', shadow: false });
      });
      draw.text(g, `ALL-TIME BEST ${bestMs != null ? bestMs + ' ms' : '--'}`, 0, ch / 2 - 16, { size: 12, color: 'rgba(255,255,255,0.75)', shadow: false });
    } else {
      // all bots (demo): the fastest draw of the match
      let fast = null;
      let fastMs = Infinity;
      for (const p of ctx.active) {
        const sm = summary(p.i);
        if (sm.best != null && sm.best < fastMs) {
          fastMs = sm.best;
          fast = p;
        }
      }
      if (fast) {
        const ch = 84;
        draw.roundRect(g, -cw / 2, -ch / 2, cw, ch, 22, 'rgba(22,10,34,0.94)', GOLD, 3);
        draw.text(g, 'FASTEST DRAW', 0, -16, { size: 13, color: GOLD, shadow: false });
        draw.text(g, `${fast.name}  ${fastMs} ms`, 0, 14, { size: 26, color: fast.color });
      }
    }
    g.restore();
  }

  // Test hook: only active when a test page defines window.__reflexDuelTest (read-only mirror).
  function testHook(ctx) {
    if (typeof window === 'undefined') return;
    const o = window.__reflexDuelTest;
    if (!o || typeof o !== 'object') return;
    o.phase = ctx.phase;
    o.stage = S.stage;
    o.round = ctx.round;
    o.twist = ctx.twist.id;
    o.sigStamp = S.sigStamp;
    o.lit = S.lit ? S.lit.i : -1;
    o.litStamp = S.litStamp;
    o.best = bestMs;
    o.ms = ctx.active.map((p) => (p.data.ms == null ? null : p.data.ms));
    o.fs = ctx.active.map((p) => !!p.data.fs);
    o.humans = ctx.active.filter((p) => p.human).map((p) => p.i);
  }

  // The engine passes the run's api; a thin layer over it keeps the match-end stats card on
  // screen a little longer before the host's result panel slides in.
  const papi = Object.create(api);
  papi.gameOver = (r = {}) => {
    const stats0 = r.stats || {};
    const h = sctx ? sctx.active.find((p) => p.human) : null;
    const sm = h && !api.demo ? summary(h.i) : null;
    const extra = sm && sm.best != null ? { reaction: { avg: sm.avg, best: sm.best, allTime: bestMs }, shareText: `My best reaction time: ${sm.best} ms` } : {};
    return api.gameOver({ ...r, delay: api.demo ? r.delay : 2400, stats: { ...stats0, ...extra } });
  };

  const party = createParty(papi, {
    roundsToWin: 5,
    lastStanding: false,
    lightRadius: 100,
    twists: TWISTS,
    setup,
    update,
    render,
    bot,
    idle(dt, ctx) {
      step(dt, ctx);
      testHook(ctx);
    },
  });

  // Time human presses at the event itself: performance.now() as the key / pointer goes down.
  const baseInput = party.input;
  party.input = (ev) => {
    if (!api.demo && sctx && sctx.phase === 'play' && (ev.type === 'down' || (ev.type === 'keydown' && !ev.repeat))) {
      const s = seatOf(ev);
      if (s >= 0) stamps[s] = nowMs();
    }
    return baseInput(ev);
  };
  function seatOf(ev) {
    let solo = -1;
    let n = 0;
    for (const p of sctx.active) {
      if (p.human) {
        n++;
        solo = p.i;
      }
    }
    if (n !== 1) solo = -1;
    if (ev.type === 'down') {
      if (solo >= 0) return solo;
      if (ev.x < W / 2) return ev.y > H / 2 ? 0 : 3;
      return ev.y > H / 2 ? 1 : 2;
    }
    const k = String(ev.key || '').toLowerCase();
    let s = KEYS.indexOf(k);
    if (s < 0 && (k === ' ' || k === 'enter' || k === 'arrowup')) s = solo;
    return s;
  }
  const baseRender = party.render;
  party.render = (g) => {
    baseRender(g);
    overlay(g);
  };
  return party;
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = h / 600;
  const hy = h * 0.55;
  const cx = w / 2;
  drawSky(g, w, h, hy, 2.2, { s, sunR: Math.min(w * 0.2, h * 0.3), sunX: cx });
  drawGround(g, w, h, hy, 1.5, { s });
  // far props
  drawCactus(g, w * 0.12, hy + 16 * s, 40 * s, { side: 1, color: '#5a1c3c' });
  drawCactus(g, w * 0.88, hy + 22 * s, 30 * s, { side: -1, color: '#5a1c3c' });
  // background pair, silhouetted against the sun
  const bs = 1.25 * s;
  const bY = hy + 34 * s;
  const bL = { x: cx - w * 0.2, f: 1 };
  const bR = { x: cx + w * 0.2, f: -1 };
  drawShadow(g, bL.x, bY, bs, -0.8, 0.6, 40, false);
  drawShadow(g, bR.x, bY, bs, 0.8, 0.6, 40, false);
  drawSlinger(g, bL.x, bY, bs, 1, '#ffc93c', { arm: 1, aim: 0.05, expr: 'cool', seed: 2, hatOn: true }, 1.1);
  drawSlinger(g, bR.x, bY, bs, -1, '#7dff5a', { arm: 0.6, aim: 0.1, expr: 'shock', seed: 3, hatOn: false }, 2.3);
  drawHat(g, bR.x + 20 * bs, bY - 132 * bs, bs, -1, 0.7, '#7dff5a');

  // the flash in the middle of the street
  const fy = h * 0.47;
  drawBurst(g, cx, fy, h * 0.42, 0.2, GOLD, 1, 20);
  drawBurst(g, cx, fy, h * 0.24, -0.15, '#ffffff', 0.9, 14);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.4 + jit(i, 3) * 0.3;
    drawBolt(g, cx + Math.cos(a) * h * 0.06, fy + Math.sin(a) * h * 0.05, a, h * (0.22 + Math.abs(jit(i, 4)) * 0.16), 30 + i, 3 * s, GOLD, 1);
  }
  const ring = g.createRadialGradient(cx, fy, h * 0.02, cx, fy, h * 0.16);
  ring.addColorStop(0, 'rgba(255,255,255,1)');
  ring.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = ring;
  g.fillRect(cx - h * 0.16, fy - h * 0.16, h * 0.32, h * 0.32);

  // tumbleweed and the lantern post
  drawLantern(g, cx, h * 0.8, 1.6 * s, GOLD, 0.9, 1.0, false);
  g.fillStyle = 'rgba(40,6,26,0.3)';
  g.beginPath();
  g.ellipse(cx + w * 0.12, h * 0.8, 22 * s, 5 * s, 0, 0, TAU);
  g.fill();
  drawTumbleweed(g, cx + w * 0.12, h * 0.8 - 30 * s, 22 * s, 0.6, false);

  // foreground pair: pink fires first, blue is a split second late
  const fs = 3.3 * s;
  const fY = h * 0.99;
  const fL = { x: w * 0.19 };
  const fR = { x: w * 0.81 };
  drawCactus(g, w * 0.02, h * 0.86, 230 * s, { side: 1, color: '#1f0819' });
  drawShadow(g, fL.x, fY, fs, -0.3, 1, 30, false);
  drawShadow(g, fR.x, fY, fs, 0.3, 1, 30, false);
  drawSlinger(g, fL.x, fY, fs, 1, '#ff3d8b', { arm: 1, aim: -0.22, recoil: 0.25, muzzle: 1, expr: 'win', seed: 0, hatOn: true }, 0.4);
  drawSlinger(g, fR.x, fY, fs, -1, '#2fd9ff', { arm: 0.45, aim: -0.2, expr: 'shock', seed: 1, hatOn: false }, 1.7);
  // blue's hat flying off, a tracer zipping toward it
  const hx = Math.min(fR.x + 22 * fs, w - 64 * s);
  const hyy = fY - 136 * fs;
  const mx = fL.x + (6 + Math.cos(-0.47) * 41) * fs;
  const my = fY + (-70 + Math.sin(-0.47) * 41) * fs;
  g.strokeStyle = 'rgba(255,240,180,0.9)';
  g.lineWidth = 4 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(mx + (hx - mx) * 0.35, my + (hyy - my) * 0.35);
  g.lineTo(mx + (hx - mx) * 0.92, my + (hyy - my) * 0.92);
  g.stroke();
  drawHat(g, hx, hyy, fs, -1, 0.5, '#2fd9ff');
  // smoke from pink's barrel
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(255,236,220,${0.5 - i * 0.07})`;
    g.beginPath();
    g.arc(mx + i * 12 * s, my - i * 9 * s - 6 * s, (7 + i * 4) * s, 0, TAU);
    g.fill();
  }
  // dust motes
  g.fillStyle = 'rgba(255,214,160,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = (jit(i, 81) * 0.5 + 0.5) * w;
    const y = hy + (jit(i, 82) * 0.5 + 0.5) * (h - hy);
    const r = (1 + Math.abs(jit(i, 83)) * 2) * s;
    g.fillRect(x, y, r, r);
  }
}
