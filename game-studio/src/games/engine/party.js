// Party kit: 1-4 players on one screen, one button each.
//
// Every seat owns a corner of the screen (P1 bottom-left, P2 bottom-right, P3 top-right,
// P4 top-left) and one key on a keyboard (Z, M, P, Q: the keys in the same corners).
// Friends join in the lobby by tapping their corner; empty seats are filled by bots, so a
// solo visitor always has a table of three rivals. Matches are "first to N crowns" and
// every round after the first draws a random TWIST card that changes the rules (turbo,
// giants, lights out, swapped controls, ...). That twist is the house style of these games.
//
//   export default function createGame(api) {
//     return createParty(api, {
//       roundsToWin: 3,           // crowns needed to win the cup
//       roundTime: 45,            // optional time limit in seconds, then timeUp(ctx) decides
//       twists: ['turbo', 'giants', { id: 'ice', name: 'ICE', desc: 'No grip at all', emoji: '🧊' }],
//       setup(ctx) {},            // build a fresh round: place ctx.active players, set p.x / p.y
//       update(dt, ctx) {},       // play: read p.down / p.tap / p.release, call ctx.eliminate(p)
//       render(g, ctx) {},        // draw the world (also drawn behind the lobby and cards)
//       bot(p, dt, ctx) {},       // return true while this bot "holds" its button
//       timeUp(ctx) {},           // optional: winners when roundTime runs out (player or array)
//     });
//   }
//
// Rules for games: keep p.x / p.y (world position, used for name tags and LIGHTS OUT)
// up to date, multiply sizes by ctx.size (GIANTS / TINY), keep the four corner button
// areas (about 100px square) free of anything the player must see, and treat ctx.twist.id
// for your own custom twists. The last player standing wins a round automatically
// (set lastStanding: false to decide rounds yourself with ctx.endRound(winners)).
import * as draw from './draw.js';

export const PLAYER_COLORS = ['#ff3d8b', '#2fd9ff', '#ffc93c', '#7dff5a'];
export const PLAYER_NAMES = ['PINK', 'BLUE', 'GOLD', 'LIME'];
const KEYS = ['z', 'm', 'p', 'q'];
const KEY_LABELS = ['Z', 'M', 'P', 'Q'];

export const GENERIC_TWISTS = {
  turbo: { name: 'TURBO', desc: 'Everything moves 30% faster', emoji: '⚡' },
  giants: { name: 'GIANTS', desc: 'Everyone is huge', emoji: '🦖' },
  tiny: { name: 'TINY', desc: 'Everyone is tiny', emoji: '🐜' },
  swap: { name: 'SWAP!', desc: 'Every 7 seconds your button moves to another player', emoji: '🔀' },
  lights: { name: 'LIGHTS OUT', desc: 'You can only see around yourself', emoji: '🔦' },
  wobble: { name: 'WOBBLY', desc: 'The whole world rocks', emoji: '🌀' },
};
const CLASSIC = { id: 'classic', name: 'CLASSIC', desc: 'No twist. Pure skill.', emoji: '🎯' };
const SWAP_EVERY = 7;

export function createParty(api, spec) {
  const { width: W, height: H, rng, sfx, fx } = api;
  const roundsToWin = spec.roundsToWin || 3;
  const lastStanding = spec.lastStanding !== false;
  const deck = (spec.twists || ['turbo', 'giants', 'tiny', 'swap', 'lights', 'wobble']).map((t) =>
    typeof t === 'string' ? { id: t, ...GENERIC_TWISTS[t] } : t,
  );

  // Seat config survives rematches (engine restart -> reset -> lobby with the same seats).
  const seats = [false, false, false, false]; // human joined?
  let botsWanted = -1; // -1 = fill every empty seat
  const seatDown = [0, 0, 0, 0]; // pointers/keys currently holding each seat's button
  const pointerSeat = new Map();

  const players = [0, 1, 2, 3].map((i) => ({
    i,
    color: PLAYER_COLORS[i],
    name: PLAYER_NAMES[i],
    tag: `P${i + 1}`,
    human: false,
    active: false,
    alive: false,
    crowns: 0,
    down: false,
    tap: false,
    release: false,
    prev: false,
    x: W / 2,
    y: H / 2,
    score: 0,
    data: {},
  }));

  let phase = 'lobby'; // lobby | card | count | play | roundEnd | matchEnd
  let phaseT = 0;
  let round = 0;
  let twistBag = [];
  let control = [0, 1, 2, 3]; // control[seat] = index of the player that seat's button drives
  let swapT = 0;
  let pendingEnd = -1;
  let roundWinners = [];
  let matchWinners = [];
  let t = 0;
  let over = false;

  const ctx = {
    W,
    H,
    api,
    rng,
    sfx,
    fx,
    draw,
    players,
    active: [],
    twist: CLASSIC,
    size: 1,
    time: 0,
    round: 0,
    get phase() {
      return phase;
    },
    get humans() {
      return players.filter((p) => p.active && p.human).length;
    },
    alive() {
      return ctx.active.filter((p) => p.alive);
    },
    eliminate(p, opts = {}) {
      if (!p || !p.alive) return;
      p.alive = false;
      p.down = false;
      const x = opts.x ?? p.x;
      const y = opts.y ?? p.y;
      fx.burst(x, y, { count: 34, colors: [p.color, '#ffffff'], speed: 320, life: 0.7, gravity: 200, size: 5 });
      fx.ring(x, y, { color: p.color, radius: 70, life: 0.45 });
      fx.shake(9, 0.3);
      sfx.play('die');
      if (p.human) api.haptic(40);
    },
    endRound(w) {
      if (phase !== 'play') return;
      const list = w == null ? [] : Array.isArray(w) ? w : [w];
      roundWinners = list.map((x) => (typeof x === 'number' ? players[x] : x)).filter(Boolean);
      for (const p of roundWinners) p.crowns += 1;
      setPhase('roundEnd');
      if (roundWinners.length) {
        const c = roundWinners[0];
        fx.confetti(W / 2, H * 0.38, 70, [c.color, '#ffffff', '#ffd23f']);
        sfx.play('win');
      } else sfx.play('error');
    },
  };

  function setPhase(p) {
    phase = p;
    phaseT = 0;
  }

  function participants() {
    const humans = seats.filter(Boolean).length;
    const empty = 4 - humans;
    let bots = botsWanted < 0 ? empty : Math.min(botsWanted, empty);
    if (humans + bots < 2) bots = Math.min(empty, 2 - humans);
    const out = [];
    for (let i = 0; i < 4; i++) {
      if (seats[i]) out.push({ i, human: true });
      else if (bots > 0) {
        out.push({ i, human: false });
        bots -= 1;
      }
    }
    return out;
  }

  function botChoices() {
    const empty = 4 - seats.filter(Boolean).length;
    const min = Math.max(0, 2 - seats.filter(Boolean).length);
    const out = [];
    for (let b = min; b <= empty; b++) out.push(b);
    return out;
  }

  function currentBots() {
    return participants().filter((p) => !p.human).length;
  }

  function nextTwist() {
    if (round === 1 && !api.demo) return CLASSIC;
    if (!twistBag.length) twistBag = rng.shuffle(deck.slice());
    return twistBag.pop() || CLASSIC;
  }

  function beginMatch() {
    const list = participants();
    for (const p of players) {
      const s = list.find((x) => x.i === p.i);
      p.active = !!s;
      p.human = !!(s && s.human);
      p.crowns = 0;
      p.alive = false;
    }
    ctx.active = players.filter((p) => p.active);
    round = 0;
    twistBag = [];
    over = false;
    beginRound();
  }

  function beginRound() {
    round += 1;
    ctx.round = round;
    ctx.twist = nextTwist();
    ctx.size = ctx.twist.id === 'giants' ? 1.35 : ctx.twist.id === 'tiny' ? 0.72 : 1;
    ctx.time = 0;
    control = [0, 1, 2, 3];
    swapT = 0;
    pendingEnd = -1;
    roundWinners = [];
    for (const p of players) {
      p.alive = p.active;
      p.down = p.tap = p.release = p.prev = false;
      p.score = 0;
      p.data = {};
    }
    fx.clear();
    spec.setup(ctx);
    setPhase('card');
    sfx.play('whoosh');
  }

  function toLobby() {
    over = false;
    for (const p of players) {
      p.active = false;
      p.alive = false;
    }
    ctx.active = [];
    round = 0;
    ctx.twist = CLASSIC;
    ctx.size = 1;
    fx.clear();
    spec.setup(ctx); // a quiet world behind the lobby
    setPhase('lobby');
  }

  // ---------- input ----------
  function seatAt(x, y) {
    if (x < W / 2) return y > H / 2 ? 0 : 3;
    return y > H / 2 ? 1 : 2;
  }

  function soloSeat() {
    const humans = ctx.active.filter((p) => p.human);
    return humans.length === 1 ? humans[0].i : -1;
  }

  function lobbyTap(x, y) {
    if (Math.hypot(x - W / 2, y - H / 2) < 66) return startFromLobby();
    if (Math.abs(x - W / 2) < 110 && Math.abs(y - (H / 2 + 104)) < 24) {
      const choices = botChoices();
      const cur = currentBots();
      const idx = choices.indexOf(cur);
      botsWanted = choices[(idx + 1) % choices.length];
      sfx.play('click');
      return true;
    }
    const s = seatAt(x, y);
    seats[s] = !seats[s];
    sfx.play(seats[s] ? 'pop' : 'click');
    if (seats[s]) fx.ring(cornerX(s), cornerY(s), { color: PLAYER_COLORS[s], radius: 80, life: 0.4 });
    return true;
  }

  function startFromLobby() {
    if (!seats.some(Boolean)) seats[0] = true; // solo: you are Pink against the bots
    sfx.play('tap');
    beginMatch();
    return true;
  }

  function press(seat) {
    seatDown[seat] += 1;
  }
  function releaseSeat(seat) {
    seatDown[seat] = Math.max(0, seatDown[seat] - 1);
  }

  function input(ev) {
    if (api.demo) return false;
    if (ev.type === 'down') {
      if (phase === 'lobby') return lobbyTap(ev.x, ev.y);
      if (phase === 'card' && phaseT > 0.5) {
        setPhase('count');
        return true;
      }
      if (phase === 'roundEnd' && phaseT > 1) {
        advanceAfterRound();
        return true;
      }
      const solo = soloSeat();
      const s = solo >= 0 ? solo : seatAt(ev.x, ev.y);
      pointerSeat.set(ev.id, s);
      press(s);
      return true;
    }
    if (ev.type === 'up') {
      if (pointerSeat.has(ev.id)) {
        releaseSeat(pointerSeat.get(ev.id));
        pointerSeat.delete(ev.id);
      }
      return true;
    }
    if (ev.type === 'keydown' || ev.type === 'keyup') {
      const k = String(ev.key || '').toLowerCase();
      let s = KEYS.indexOf(k);
      const startKey = k === ' ' || k === 'enter';
      if (ev.type === 'keydown') {
        if (ev.repeat) return s >= 0 || startKey;
        if (phase === 'lobby') {
          if (startKey) return startFromLobby();
          if (s >= 0) {
            seats[s] = !seats[s];
            sfx.play(seats[s] ? 'pop' : 'click');
            return true;
          }
          return false;
        }
        if (startKey && phase === 'card' && phaseT > 0.5) {
          setPhase('count');
          return true;
        }
        if (startKey && phase === 'roundEnd' && phaseT > 1) {
          advanceAfterRound();
          return true;
        }
        // Space / Enter / arrows also drive the only human in a solo game.
        if (s < 0 && (startKey || k === 'arrowup')) s = soloSeat();
        if (s < 0) return false;
        seatDown[s] = 1;
        return true;
      }
      if (s < 0 && (startKey || k === 'arrowup')) s = soloSeat();
      if (s < 0) return false;
      seatDown[s] = 0;
      return true;
    }
    return false;
  }

  // ---------- loop ----------
  function applyButtons(dt) {
    // Which player each seat drives (SWAP rotates this among the players in the match).
    for (let s = 0; s < 4; s++) {
      const p = players[control[s]];
      if (!p.active) continue;
      const seatHuman = players[s].human;
      let down;
      if (!p.alive) down = false;
      else if (seatHuman && !api.demo) down = seatDown[s] > 0;
      else down = !!spec.bot(p, dt, ctx);
      p.down = down;
      p.tap = down && !p.prev;
      p.release = !down && p.prev;
      p.prev = down;
    }
  }

  function rotateControls() {
    const ids = ctx.active.map((p) => p.i);
    if (ids.length < 2) return;
    const next = [0, 1, 2, 3];
    for (let k = 0; k < ids.length; k++) next[ids[k]] = control[ids[(k + 1) % ids.length]];
    control = next;
    for (const p of players) p.prev = p.down; // no phantom taps on the swap frame
    fx.flash('#ffffff', 0.35);
    sfx.play('swipe');
  }

  function advanceAfterRound() {
    const top = Math.max(...ctx.active.map((p) => p.crowns));
    if (top >= roundsToWin) {
      matchWinners = ctx.active.filter((p) => p.crowns === top);
      setPhase('matchEnd');
      const c = matchWinners[0];
      fx.confetti(W / 2, H * 0.3, 110, [c.color, '#ffffff', '#ffd23f']);
      sfx.play('levelup');
    } else beginRound();
  }

  function finishMatch() {
    if (over) return;
    over = true;
    const humansIn = ctx.active.filter((p) => p.human);
    const humanWon = matchWinners.some((p) => p.human);
    const top = matchWinners[0];
    api.setScore(top ? top.crowns : 0);
    api.gameOver({
      win: humansIn.length ? humanWon : null,
      delay: 200,
      stats: {
        rankable: false,
        party: {
          humans: humansIn.length,
          humanWon,
          winners: matchWinners.map((p) => ({ name: p.name, tag: p.tag, color: p.color, human: p.human })),
          standings: ctx.active
            .slice()
            .sort((a, b) => b.crowns - a.crowns)
            .map((p) => ({ name: p.name, tag: p.tag, color: p.color, human: p.human, crowns: p.crowns })),
          rounds: round,
        },
      },
    });
  }

  function update(dt) {
    t += dt;
    phaseT += dt;
    if (phase === 'lobby') {
      if (spec.idle) spec.idle(dt, ctx);
      return;
    }
    if (phase === 'card') {
      if (phaseT > (api.demo ? 1.3 : 2.2)) setPhase('count');
      return;
    }
    if (phase === 'count') {
      if (phaseT > (api.demo ? 0.9 : 1.6)) {
        setPhase('play');
        sfx.play('score');
      }
      return;
    }
    if (phase === 'play') {
      const scale = ctx.twist.id === 'turbo' ? 1.3 : 1;
      const d = dt * scale;
      ctx.time += d;
      if (ctx.twist.id === 'swap') {
        swapT += dt;
        if (swapT >= SWAP_EVERY) {
          swapT = 0;
          rotateControls();
        }
      }
      applyButtons(d);
      spec.update(d, ctx);
      if (phase !== 'play') return;
      if (spec.roundTime && ctx.time >= spec.roundTime) {
        ctx.endRound(spec.timeUp ? spec.timeUp(ctx) : ctx.alive().length === 1 ? ctx.alive()[0] : null);
        return;
      }
      if (lastStanding) {
        const alive = ctx.alive();
        if (alive.length <= 1 && pendingEnd < 0) pendingEnd = 0.9;
        if (pendingEnd >= 0) {
          pendingEnd -= dt;
          if (pendingEnd < 0) ctx.endRound(ctx.alive()[0] || null);
        }
      }
      return;
    }
    if (phase === 'roundEnd') {
      if (phaseT > (api.demo ? 1.6 : 2.6)) advanceAfterRound();
      return;
    }
    if (phase === 'matchEnd' && phaseT > (api.demo ? 1.8 : 2.2)) finishMatch();
  }

  // ---------- drawing ----------
  const cornerX = (s) => (s === 0 || s === 3 ? 54 : W - 54);
  const cornerY = (s) => (s === 0 || s === 1 ? H - 54 : 54);
  const flipped = (s) => s === 2 || s === 3; // players sitting across the table read upside down

  function seatText(g, s, str, dy, opts) {
    const x = s === 0 || s === 3 ? W / 4 : (W * 3) / 4;
    const y = s === 0 || s === 1 ? H * 0.8 : H * 0.2;
    g.save();
    g.translate(x, y);
    if (flipped(s)) g.rotate(Math.PI);
    draw.text(g, str, 0, dy, opts);
    g.restore();
  }

  function drawWorld(g) {
    if (ctx.twist.id === 'wobble' && phase !== 'lobby') {
      g.save();
      g.translate(W / 2, H / 2);
      g.rotate(Math.sin(t * 1.6) * 0.075);
      g.scale(1.08, 1.08);
      g.translate(-W / 2, -H / 2);
      spec.render(g, ctx);
      g.restore();
    } else spec.render(g, ctx);
    if (ctx.twist.id === 'lights' && (phase === 'play' || phase === 'count')) drawDarkness(g);
  }

  // LIGHTS OUT: a darkness layer (at logical resolution: it is all soft gradients) with a
  // soft hole punched around every living player, so overlapping lights simply merge.
  let dark = null;
  function drawDarkness(g) {
    if (typeof document === 'undefined') return;
    if (!dark) {
      dark = document.createElement('canvas');
      dark.width = W;
      dark.height = H;
    }
    const d = dark.getContext('2d');
    const r = 105 * ctx.size;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(4,2,12,0.94)';
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const p of ctx.alive()) {
      const grad = d.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = grad;
      d.beginPath();
      d.arc(p.x, p.y, r, 0, Math.PI * 2);
      d.fill();
    }
    g.drawImage(dark, 0, 0, W, H);
  }

  function drawButtons(g) {
    for (let s = 0; s < 4; s++) {
      const seatP = players[s];
      if (!seatP.active) continue;
      const driven = players[control[s]];
      const x = cornerX(s);
      const y = cornerY(s);
      if (!seatP.human || api.demo) {
        draw.circle(g, x, y, 18, draw.rgba(seatP.color, 0.18), draw.rgba(seatP.color, 0.5), 2);
        draw.text(g, '🤖', x, y + 1, { size: 16, shadow: false });
        continue;
      }
      const held = driven.down;
      g.save();
      g.globalAlpha = driven.alive ? 1 : 0.35;
      draw.circle(g, x, y, 40, draw.rgba(driven.color, held ? 0.55 : 0.2), driven.color, held ? 5 : 3);
      g.save();
      g.translate(x, y);
      if (flipped(s)) g.rotate(Math.PI);
      draw.text(g, seatP.tag, 0, -4, { size: 18, color: '#fff' });
      draw.text(g, KEY_LABELS[s], 0, 15, { size: 11, weight: 700, color: 'rgba(255,255,255,0.7)', shadow: false });
      g.restore();
      g.restore();
    }
  }

  function drawTags(g) {
    const show = phase === 'card' || phase === 'count' || (phase === 'play' && ctx.time < 1.6);
    if (!show) return;
    for (const p of ctx.active) {
      if (!p.alive) continue;
      const bob = Math.sin(t * 6) * 3;
      const y = p.y - 34 * ctx.size - 16 + bob;
      draw.roundRect(g, p.x - 24, y - 12, 48, 22, 11, p.color);
      draw.text(g, p.human ? p.tag : 'BOT', p.x, y, { size: 13, color: '#10081f', shadow: false });
      g.fillStyle = p.color;
      g.beginPath();
      g.moveTo(p.x - 6, y + 10);
      g.lineTo(p.x + 6, y + 10);
      g.lineTo(p.x, y + 17);
      g.fill();
    }
  }

  function drawTop(g) {
    if (phase === 'lobby') return;
    const label = `ROUND ${round} · ${ctx.twist.emoji} ${ctx.twist.name}`;
    g.save();
    g.font = draw.font(13, 800);
    const w = g.measureText(label).width + 26;
    g.restore();
    draw.roundRect(g, W / 2 - w / 2, 14, w, 26, 13, 'rgba(10,6,24,0.6)');
    draw.text(g, label, W / 2, 27, { size: 13, color: '#fff', shadow: false });
    // crowns row
    const n = ctx.active.length;
    const cw = 44;
    const x0 = W / 2 - ((n - 1) * cw) / 2;
    ctx.active.forEach((p, k) => {
      const x = x0 + k * cw;
      draw.circle(g, x - 9, 54, 6, p.color);
      draw.text(g, `${p.crowns}`, x + 6, 55, { size: 14, color: p.alive || phase !== 'play' ? '#fff' : 'rgba(255,255,255,0.4)', shadow: false });
    });
    if (spec.roundTime && phase === 'play') {
      const left = Math.max(0, Math.ceil(spec.roundTime - ctx.time));
      draw.text(g, `${left}`, W / 2, 80, { size: 20, color: left <= 5 ? '#ff5a5a' : 'rgba(255,255,255,0.85)' });
    }
    if (ctx.twist.id === 'swap' && phase === 'play' && swapT > SWAP_EVERY - 1.2) {
      draw.text(g, 'SWAP IN ' + Math.ceil(SWAP_EVERY - swapT), W / 2, H / 2, { size: 30, color: '#fff', stroke: '#10081f' });
    }
  }

  function panel(g, alpha = 0.62) {
    g.fillStyle = `rgba(8,4,20,${alpha})`;
    g.fillRect(0, 0, W, H);
  }

  function drawLobby(g) {
    panel(g, 0.55);
    for (let s = 0; s < 4; s++) {
      const x = s === 0 || s === 3 ? 0 : W / 2;
      const y = s === 0 || s === 1 ? H / 2 : 0;
      const on = seats[s];
      g.fillStyle = draw.rgba(PLAYER_COLORS[s], on ? 0.3 : 0.08);
      g.fillRect(x + 4, y + 4, W / 2 - 8, H / 2 - 8);
      g.strokeStyle = draw.rgba(PLAYER_COLORS[s], on ? 0.95 : 0.35);
      g.lineWidth = on ? 4 : 2;
      g.strokeRect(x + 4, y + 4, W / 2 - 8, H / 2 - 8);
      const pulse = 0.75 + 0.25 * Math.sin(t * 4 + s);
      if (on) {
        seatText(g, s, `P${s + 1} ✓`, -40, { size: 34, color: PLAYER_COLORS[s] });
        seatText(g, s, 'READY', -8, { size: 16, color: '#fff' });
      } else {
        seatText(g, s, `P${s + 1}`, -40, { size: 30, color: draw.rgba(PLAYER_COLORS[s], 0.9) });
        seatText(g, s, 'TAP TO JOIN', -8, { size: 16, color: '#fff', alpha: pulse });
        seatText(g, s, `or press ${KEY_LABELS[s]}`, 16, { size: 12, weight: 700, color: 'rgba(255,255,255,0.55)', shadow: false });
      }
    }
    // center
    draw.circle(g, W / 2, H / 2, 70, 'rgba(8,4,20,0.85)');
    const pulse = 1 + Math.sin(t * 5) * 0.04;
    g.save();
    g.translate(W / 2, H / 2);
    g.scale(pulse, pulse);
    draw.circle(g, 0, 0, 58, '#ff3d8b', '#ffffff', 4);
    draw.text(g, 'PLAY', 0, 2, { size: 26, color: '#fff' });
    g.restore();
    const humans = seats.filter(Boolean).length;
    const bots = currentBots();
    draw.roundRect(g, W / 2 - 104, H / 2 + 82, 208, 44, 22, 'rgba(8,4,20,0.9)', 'rgba(255,255,255,0.3)');
    draw.text(g, `🤖 ${bots} bot${bots === 1 ? '' : 's'} · tap to change`, W / 2, H / 2 + 104, { size: 14, color: '#fff', shadow: false });
    const line = humans ? `${humans} player${humans === 1 ? '' : 's'} + ${bots} bot${bots === 1 ? '' : 's'}` : 'Grab a corner, or just press PLAY';
    draw.roundRect(g, W / 2 - 128, H / 2 - 124, 256, 44, 16, 'rgba(8,4,20,0.9)');
    draw.text(g, line, W / 2, H / 2 - 110, { size: 14, weight: 800, color: '#fff', shadow: false });
    draw.text(g, `First to ${roundsToWin} 👑 wins the cup`, W / 2, H / 2 - 92, { size: 11, weight: 700, color: 'rgba(255,255,255,0.6)', shadow: false });
  }

  function drawCard(g) {
    panel(g, 0.45);
    const k = Math.min(1, phaseT / 0.35);
    const sc = api.ease.outBack ? api.ease.outBack(k) : k;
    g.save();
    g.translate(W / 2, H / 2 - 10);
    g.scale(sc, sc);
    g.rotate((1 - k) * -0.3);
    const cw = 250;
    const ch = 260;
    draw.roundRect(g, -cw / 2, -ch / 2, cw, ch, 26, '#1d1240', ctx.twist.id === 'classic' ? '#ffffff' : '#ffd23f', 5);
    draw.text(g, `ROUND ${round}`, 0, -ch / 2 + 32, { size: 16, color: 'rgba(255,255,255,0.7)', shadow: false });
    draw.text(g, ctx.twist.emoji, 0, -26, { size: 64, shadow: false });
    draw.text(g, ctx.twist.name, 0, 40, { size: 30, color: ctx.twist.id === 'classic' ? '#ffffff' : '#ffd23f' });
    draw.text(g, ctx.twist.desc, 0, 80, { size: 14, weight: 700, color: 'rgba(255,255,255,0.85)', maxWidth: cw - 30, shadow: false });
    g.restore();
    if (round > 1 && ctx.twist.id !== 'classic') draw.text(g, 'TWIST!', W / 2, H / 2 - 170, { size: 34, color: '#ffd23f', stroke: '#10081f' });
  }

  function drawCount(g) {
    const n = 3 - Math.floor((phaseT / (api.demo ? 0.9 : 1.6)) * 3);
    const k = ((phaseT / (api.demo ? 0.9 : 1.6)) * 3) % 1;
    draw.text(g, n > 0 ? String(n) : 'GO!', W / 2, H / 2, { size: 90 - k * 20, color: '#fff', stroke: '#10081f', alpha: 1 - k * 0.5 });
  }

  function drawRoundEnd(g) {
    panel(g, 0.35);
    const c = roundWinners[0];
    const title = !c ? 'DRAW!' : roundWinners.length > 1 ? 'SHARED CROWN!' : `${c.human ? c.tag : c.name} WINS!`;
    draw.text(g, '👑', W / 2, H * 0.36 - 60, { size: 56, shadow: false });
    draw.text(g, title, W / 2, H * 0.36, { size: 40, color: c ? c.color : '#fff', stroke: '#10081f' });
    ctx.active.forEach((p, k) => {
      const y = H * 0.36 + 56 + k * 34;
      draw.circle(g, W / 2 - 90, y, 9, p.color);
      draw.text(g, p.human ? p.tag : `${p.name} 🤖`, W / 2 - 72, y, { size: 16, align: 'left', color: '#fff', shadow: false });
      let crowns = '';
      for (let i = 0; i < roundsToWin; i++) crowns += i < p.crowns ? '👑' : '·';
      draw.text(g, crowns, W / 2 + 96, y, { size: 16, align: 'right', color: '#fff', shadow: false });
    });
  }

  function drawMatchEnd(g) {
    panel(g, 0.5);
    const c = matchWinners[0];
    if (!c) return;
    draw.text(g, '🏆', W / 2, H * 0.34 - 70, { size: 72, shadow: false });
    draw.text(g, `${c.human ? c.tag : c.name} WINS THE CUP`, W / 2, H * 0.34, { size: 30, color: c.color, stroke: '#10081f', maxWidth: W - 30 });
  }

  function render(g) {
    drawWorld(g);
    if (phase !== 'lobby') {
      drawTags(g);
      drawButtons(g);
      drawTop(g);
    }
    if (phase === 'lobby') drawLobby(g);
    else if (phase === 'card') drawCard(g);
    else if (phase === 'count') drawCount(g);
    else if (phase === 'roundEnd') drawRoundEnd(g);
    else if (phase === 'matchEnd') drawMatchEnd(g);
  }

  function reset() {
    seatDown.fill(0);
    pointerSeat.clear();
    t = 0;
    if (api.demo) {
      seats.fill(false);
      botsWanted = -1;
      beginMatch();
    } else toLobby();
  }

  return {
    hud: false,
    reset,
    update,
    render,
    input,
    idle: update,
    get party() {
      return { phase, round, twist: ctx.twist.id };
    },
  };
}
