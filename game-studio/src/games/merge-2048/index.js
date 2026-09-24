// 2048 - classic 4x4 sliding merge puzzle with smooth slides, pops and a keep-going win.
import { shade, rgba, roundRect, text as drawText, FONT } from '../engine/draw.js';
import { SIZE, move, canMove, spawnTile, maxTile } from './logic.js';

const GAP = 12;
const TILE = 90;
const BOARD = SIZE * TILE + (SIZE + 1) * GAP; // 420
const SLIDE = 0.1;
const POP = 0.2;
const SPAWN = 0.17;
const HISTORY = 3; // revive rewinds this many moves

const RAMP = {
  2: ['#efe9ff', '#4b3f74', 0],
  4: ['#ddd0ff', '#4b3f74', 0],
  8: ['#ffab5e', '#ffffff', 0],
  16: ['#ff8a4c', '#ffffff', 0],
  32: ['#ff6857', '#ffffff', 0],
  64: ['#ff4155', '#ffffff', 0],
  128: ['#f6c343', '#ffffff', 0.3],
  256: ['#f4b82c', '#ffffff', 0.42],
  512: ['#f2aa16', '#ffffff', 0.54],
  1024: ['#ee9a06', '#ffffff', 0.66],
  2048: ['#ffb700', '#ffffff', 0.9],
  4096: ['#a45cff', '#ffffff', 0.6],
  8192: ['#7c3cff', '#ffffff', 0.6],
  16384: ['#33c3ff', '#ffffff', 0.6],
  32768: ['#22d99a', '#ffffff', 0.6],
  65536: ['#ff4fd8', '#ffffff', 0.7],
};
const STYLE = {};
for (const k in RAMP) {
  const [bg, fg, glow] = RAMP[k];
  STYLE[k] = { bg, fg, glow, side: shade(bg, -0.25), glowColor: rgba(bg, 0.9), textShadow: fg === '#ffffff' ? shade(bg, -0.35) : 'rgba(0,0,0,0)' };
}
const BIG_STYLE = { bg: '#26204d', fg: '#ffd84a', glow: 0.6, side: '#15112e', glowColor: 'rgba(255,216,74,0.9)', textShadow: '#000000' };
function styleFor(v) {
  return STYLE[v] || BIG_STYLE;
}
const FONTS = {};
function fontSizeFor(v, size) {
  const d = String(v).length;
  const k = d <= 2 ? 0.52 : d === 3 ? 0.44 : d === 4 ? 0.36 : d === 5 ? 0.29 : 0.24;
  return Math.round(size * k);
}

/** Candy-style tile: side lip, face, gloss, digits. (x, y) is the top-left of the full cell. */
function drawTile(g, x, y, size, v, scale = 1, alpha = 1) {
  const st = styleFor(v);
  const s = size * scale;
  const x0 = x + (size - s) / 2;
  const y0 = y + (size - s) / 2;
  const r = Math.max(2, 10 * scale);
  const lip = Math.max(1, 5 * scale);
  g.globalAlpha = alpha;
  if (st.glow) {
    g.shadowColor = st.glowColor;
    g.shadowBlur = 26 * st.glow * scale;
  }
  roundRect(g, x0, y0, s, s, r, st.side);
  g.shadowBlur = 0;
  g.shadowColor = 'rgba(0,0,0,0)';
  roundRect(g, x0, y0, s, s - lip, r, st.bg);
  roundRect(g, x0 + 5 * scale, y0 + 4 * scale, s - 10 * scale, (s - lip) * 0.4, r * 0.8, 'rgba(255,255,255,0.16)');
  const fs = fontSizeFor(v, s);
  g.font = FONTS[fs] || (FONTS[fs] = `800 ${fs}px ${FONT}`);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const cx = x0 + s / 2;
  const cy = y0 + (s - lip) / 2 + fs * 0.04;
  g.fillStyle = st.textShadow;
  g.fillText(String(v), cx, cy + Math.max(1, 2 * scale));
  g.fillStyle = st.fg;
  g.fillText(String(v), cx, cy);
  g.globalAlpha = 1;
}

const fmtCache = new Map();
function fmt(v) {
  const n = Math.round(v);
  let s = fmtCache.get(n);
  if (s === undefined) {
    if (fmtCache.size > 400) fmtCache.clear();
    s = n.toLocaleString('en-US');
    fmtCache.set(n, s);
  }
  return s;
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const BX = Math.round((W - BOARD) / 2);
  const BY = 190;
  const { fx, sfx, ease } = api;

  let vals = null;
  let tiles = [];
  let nextId = 1;
  let score = 0;
  let moves = 0;
  let at = 1;
  let history = [];
  let pending = [];
  let won = false;
  let showWin = false;
  let winT = 0;
  let winPending = -1;
  let over = false;
  let overT = 0;
  let bump = null;
  let swipe = null;
  let shown = 0;
  let pop = 0;
  let maxT = 0;
  let t = 0;
  let bgGrad = null;
  let glow = null;
  let rewindT = 9;

  function cellPos(i) {
    const r = (i / SIZE) | 0;
    const c = i % SIZE;
    return { x: BX + GAP + c * (TILE + GAP), y: BY + GAP + r * (TILE + GAP) };
  }

  function reset() {
    vals = new Array(SIZE * SIZE).fill(0);
    tiles = [];
    score = 0;
    moves = 0;
    history = [];
    pending = [];
    won = false;
    showWin = false;
    winPending = -1;
    over = false;
    overT = 0;
    bump = null;
    swipe = null;
    shown = 0;
    pop = 0;
    rewindT = 9;
    for (let k = 0; k < 2; k++) {
      const s = spawnTile(vals, api.rng);
      tiles.push({ id: nextId++, v: s.v, idx: s.i, from: s.i, merged: null, isNew: true, delay: 0.15 + k * 0.12 });
    }
    maxT = maxTile(vals);
    at = 0;
  }

  const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function doMove(dir) {
    if (over || showWin || !vals) return;
    const res = move(vals, dir);
    if (!res.moved) {
      bump = { dx: DIR_VEC[dir][0], dy: DIR_VEC[dir][1], t: 0 };
      sfx.tone({ freq: 150, to: 110, type: 'triangle', dur: 0.08, vol: 0.1 });
      return;
    }
    history.push({ vals: vals.slice(), score, moves });
    if (history.length > HISTORY) history.shift();

    // Rebuild display tiles from the move mapping.
    const byTo = new Map();
    for (const m of res.moves) {
      if (!byTo.has(m.to)) byTo.set(m.to, []);
      byTo.get(m.to).push(m.from);
    }
    const oldAt = new Map();
    for (const tl of tiles) oldAt.set(tl.idx, tl);
    const next = [];
    for (const [to, froms] of byTo) {
      if (froms.length > 1) {
        next.push({ id: nextId++, v: res.vals[to], idx: to, from: to, merged: froms.map((f) => ({ v: vals[f], from: f })), isNew: false, delay: 0 });
      } else {
        const old = oldAt.get(froms[0]);
        next.push({ id: old ? old.id : nextId++, v: res.vals[to], idx: to, from: froms[0], merged: null, isNew: false, delay: 0 });
      }
    }
    vals = res.vals;
    moves += 1;
    const sp = spawnTile(vals, api.rng);
    if (sp) next.push({ id: nextId++, v: sp.v, idx: sp.i, from: sp.i, merged: null, isNew: true, delay: 0 });
    tiles = next;
    at = 0;

    sfx.play('swipe');
    if (res.merges.length) {
      score += res.gained;
      api.setScore(score);
      pop = 1;
      let top = 0;
      for (const m of res.merges) {
        pending.push(m);
        if (m.v > top) top = m.v;
      }
      const lvl = Math.log2(top);
      sfx.play('merge');
      // a pitch that climbs with the tile value makes big merges feel bigger
      sfx.tone({ freq: 420 + lvl * 55, to: 620 + lvl * 70, type: 'triangle', dur: 0.1, vol: 0.07, delay: 0.05 });
      if (res.merges.length >= 2) sfx.combo(res.merges.length + 2);
      fx.text(262, 66, `+${res.gained}`, { size: 22 + Math.min(14, lvl), color: '#ffe27a', life: 0.8, rise: 36 });
      api.haptic(res.merges.length > 1 ? 18 : 10);
      const nm = maxTile(vals);
      if (nm > maxT) {
        maxT = nm;
        if (nm >= 128) {
          const tile = next.find((x) => x.v === nm);
          const p = cellPos(tile.idx);
          fx.text(p.x + TILE / 2, p.y - 6, `${nm}!`, { size: 34, color: styleFor(nm).bg, life: 1.1, rise: 46 });
          if (nm >= 512) {
            sfx.play('levelup');
            api.emit('milestone', { tile: nm });
          }
        }
        if (nm >= 2048 && !won) {
          won = true;
          winPending = SLIDE + POP;
        }
      }
    }
    if (!canMove(vals)) noMoves();
  }

  function noMoves() {
    over = true;
    overT = 0;
    sfx.tone({ freq: 330, to: 110, type: 'sawtooth', dur: 0.5, vol: 0.09, delay: 0.12 });
    sfx.play('hit');
    fx.shake(8, 0.35);
    api.haptic(60);
    const share = `🔢 Top tile ${maxT}${won ? ' 🏆' : ''} · ${moves} moves`;
    api.gameOver({ delay: 1500, stats: { maxTile: maxT, moves, shareText: share } });
  }

  function celebrate() {
    showWin = !over; // if the winning move was also the last one, just party
    winT = 0;
    sfx.play('win');
    fx.confetti(W * 0.2, BY + BOARD * 0.35, 70);
    fx.confetti(W * 0.8, BY + BOARD * 0.35, 70);
    fx.confetti(W / 2, BY + BOARD * 0.2, 60);
    fx.flash('#ffd84a', 0.35);
    fx.shake(10, 0.4);
    api.happy();
    api.emit('milestone', { tile: 2048, win: true });
  }

  function dismissWin() {
    showWin = false;
    sfx.play('whoosh');
  }

  function step(dt) {
    t += dt;
    at += dt;
    if (at >= SLIDE && pending.length) {
      for (const m of pending) {
        const p = cellPos(m.to);
        const st = styleFor(m.v);
        const cx = p.x + TILE / 2;
        const cy = p.y + TILE / 2;
        fx.burst(cx, cy, { count: m.v >= 128 ? 16 : 9, colors: [st.bg, shade(st.bg, 0.4), '#ffffff'], speed: m.v >= 128 ? 260 : 180, size: 4, life: 0.45, gravity: 300, shape: 'square' });
        if (m.v >= 128) fx.ring(cx, cy, { color: st.bg, radius: 70, life: 0.4, width: 5 });
        if (m.v >= 512) fx.shake(4 + Math.log2(m.v) - 9, 0.2);
      }
      pending = [];
    }
    if (winPending >= 0) {
      winPending -= dt;
      if (winPending < 0) celebrate();
    }
    if (showWin) winT += dt;
    if (over) overT += dt;
    if (bump) {
      bump.t += dt;
      if (bump.t > 0.18) bump = null;
    }
    shown += (score - shown) * Math.min(1, dt * 12);
    if (Math.abs(score - shown) < 0.5) shown = score;
    pop = Math.max(0, pop - dt * 4);
    rewindT += dt;
  }

  // ---------- render ----------
  function statBox(g, x, y, w, label, value, hi) {
    roundRect(g, x, y, w, 62, 14, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.1)', 1.5);
    drawText(g, label, x + w / 2, y + 17, { size: 12, weight: 800, color: 'rgba(255,255,255,0.6)', shadow: false });
    const s = hi ? 1 + ease.outQuad(pop) * 0.15 : 1;
    const str = fmt(value);
    g.save();
    g.translate(x + w / 2, y + 42);
    g.scale(s, s);
    drawText(g, str, 0, 0, { size: str.length > 7 ? 18 : str.length > 5 ? 21 : 25, weight: 800, color: hi ? '#ffffff' : '#ffe27a', shadow: false });
    g.restore();
  }

  function renderHeader(g) {
    // logo tile
    const lb = 1 + Math.sin(t * 2.2) * 0.015;
    g.save();
    g.translate(20 + 50, 42 + 50);
    g.scale(lb, lb);
    drawTile(g, -50, -50, 100, 2048, 1, 1);
    g.restore();
    statBox(g, 206, 44, 112, 'SCORE', shown, true);
    statBox(g, 330, 44, 112, 'BEST', Math.max(api.best ?? 0, score), false);
    drawText(g, `MOVES ${moves}`, 206, 126, { size: 14, weight: 800, color: 'rgba(255,255,255,0.55)', align: 'left', shadow: false });
    let px = 442;
    if (api.daily) {
      roundRect(g, px - 64, 115, 64, 22, 11, 'rgba(34,211,238,0.18)');
      drawText(g, 'DAILY', px - 32, 126.5, { size: 12, weight: 800, color: '#7ff0ff', shadow: false });
      px -= 72;
    }
    if (api.target != null) {
      const beat = score > api.target;
      const str = beat ? 'BEATEN!' : `BEAT ${api.target.toLocaleString('en-US')}`;
      g.font = `800 12px ${FONT}`;
      const w = g.measureText(str).width + 20;
      roundRect(g, px - w, 115, w, 22, 11, beat ? 'rgba(163,230,53,0.2)' : 'rgba(255,210,63,0.18)');
      drawText(g, str, px - w / 2, 126.5, { size: 12, weight: 800, color: beat ? '#a3e635' : '#ffd23f', shadow: false });
    }
    drawText(g, won ? 'You made 2048! Keep merging for 4096.' : 'Merge matching tiles and reach 2048!', 20, 166, { size: 16, weight: 700, color: 'rgba(255,255,255,0.72)', align: 'left', shadow: false });
  }

  function renderBoard(g) {
    let ox = 0;
    let oy = 0;
    if (bump) {
      const k = Math.sin((bump.t / 0.18) * Math.PI) * 7;
      ox = bump.dx * k;
      oy = bump.dy * k;
    }
    g.save();
    g.translate(ox, oy);
    roundRect(g, BX, BY, BOARD, BOARD, 18, '#1c1542');
    roundRect(g, BX, BY, BOARD, BOARD, 18, null, 'rgba(255,255,255,0.08)', 2);
    for (let i = 0; i < SIZE * SIZE; i++) {
      const p = cellPos(i);
      roundRect(g, p.x, p.y, TILE, TILE, 10, '#2a2258');
    }
    const kSlide = ease.outQuad(Math.min(1, at / SLIDE));
    // pass 1: sliding / static tiles, pass 2: merged + new on top
    for (let pass = 0; pass < 2; pass++) {
      for (const tl of tiles) {
        const top = !!tl.merged || tl.isNew;
        if ((pass === 0) === top) continue;
        const p = cellPos(tl.idx);
        if (tl.merged) {
          if (at < SLIDE) {
            for (const src of tl.merged) {
              const q = cellPos(src.from);
              drawTile(g, q.x + (p.x - q.x) * kSlide, q.y + (p.y - q.y) * kSlide, TILE, src.v);
            }
          } else {
            const k = Math.min(1, (at - SLIDE) / POP);
            drawTile(g, p.x, p.y, TILE, tl.v, 1 + 0.2 * Math.sin(k * Math.PI));
          }
        } else if (tl.isNew) {
          const k = (at - SLIDE * 0.9 - tl.delay) / SPAWN;
          if (k <= 0) continue;
          drawTile(g, p.x, p.y, TILE, tl.v, k >= 1 ? 1 : Math.max(0.01, ease.outBack(k)), Math.min(1, k * 2));
        } else {
          const q = cellPos(tl.from);
          drawTile(g, q.x + (p.x - q.x) * kSlide, q.y + (p.y - q.y) * kSlide, TILE, tl.v);
        }
      }
    }
    // twinkles on 2048+ tiles
    for (const tl of tiles) {
      if (tl.v < 2048 || (tl.merged && at < SLIDE)) continue;
      const p = cellPos(tl.idx);
      for (let k = 0; k < 3; k++) {
        const a = t * 2.4 + k * 2.1;
        const sx = p.x + TILE / 2 + Math.cos(a) * TILE * 0.47;
        const sy = p.y + TILE / 2 + Math.sin(a) * TILE * 0.47;
        const r = 3 + Math.sin(t * 7 + k) * 1.5;
        g.fillStyle = '#fff6c2';
        g.beginPath();
        g.moveTo(sx, sy - r * 2);
        g.lineTo(sx + r * 0.5, sy);
        g.lineTo(sx, sy + r * 2);
        g.lineTo(sx - r * 0.5, sy);
        g.closePath();
        g.fill();
      }
    }
    if (over) {
      const k = Math.min(1, overT / 0.5);
      roundRect(g, BX, BY, BOARD, BOARD, 18, `rgba(14,9,34,${0.62 * k})`);
      const s = ease.outBack(Math.min(1, overT / 0.35));
      g.save();
      g.translate(W / 2, BY + BOARD / 2);
      g.scale(s, s);
      drawText(g, 'NO MOVES LEFT', 0, -8, { size: 40, weight: 800, color: '#ffffff', shadow: 'rgba(0,0,0,0.5)' });
      drawText(g, `Top tile ${maxT}`, 0, 34, { size: 20, weight: 700, color: '#ffe27a', shadow: false });
      g.restore();
    }
    if (rewindT < 1.6) {
      const k = rewindT / 1.6;
      g.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      const s = ease.outBack(Math.min(1, rewindT / 0.3));
      g.save();
      g.translate(W / 2, BY + BOARD / 2);
      g.scale(s, s);
      roundRect(g, -160, -34, 320, 68, 20, 'rgba(14,9,34,0.9)', 'rgba(127,240,255,0.7)', 2.5);
      drawText(g, 'REWOUND 3 MOVES', 0, 1, { size: 30, weight: 800, color: '#7ff0ff', shadow: false });
      g.restore();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function renderWin(g) {
    if (!showWin) return;
    const k = Math.min(1, winT / 0.35);
    roundRect(g, BX - 6, BY - 6, BOARD + 12, BOARD + 12, 22, `rgba(16,10,40,${0.82 * k})`);
    const s = ease.outBack(k);
    g.save();
    g.translate(W / 2, BY + 150);
    g.scale(s, s);
    g.rotate(Math.sin(t * 3) * 0.04);
    drawTile(g, -62, -62, 124, 2048);
    g.restore();
    g.globalAlpha = k;
    drawText(g, 'YOU MADE 2048!', W / 2, BY + 262, { size: 38, weight: 800, color: '#ffd84a', shadow: 'rgba(0,0,0,0.5)' });
    drawText(g, 'Your run continues. How far can you go?', W / 2, BY + 302, { size: 17, weight: 700, color: 'rgba(255,255,255,0.85)', shadow: false });
    if (winT > 0.5) {
      const p = 0.55 + 0.45 * Math.sin(t * 5);
      g.globalAlpha = p;
      drawText(g, 'TAP TO KEEP GOING', W / 2, BY + 356, { size: 20, weight: 800, color: '#ffffff', shadow: false });
    }
    g.globalAlpha = 1;
  }

  function renderTrack(g) {
    const n = 11;
    const ts = 32;
    const gap = 5;
    const x0 = (W - (n * ts + (n - 1) * gap)) / 2;
    const y = BY + BOARD + 24;
    for (let k = 0; k < n; k++) {
      const v = 2 << k;
      const x = x0 + k * (ts + gap);
      if (v <= maxT) drawTile(g, x, y, ts, v);
      else {
        roundRect(g, x, y, ts, ts, 7, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.12)', 1.2);
        drawText(g, v, x + ts / 2, y + ts / 2, { size: v >= 1000 ? 9 : 11, weight: 800, color: 'rgba(255,255,255,0.28)', shadow: false });
      }
    }
    drawText(g, 'Swipe or use the arrow keys  ·  no undo', W / 2, H - 26, { size: 14, weight: 700, color: 'rgba(255,255,255,0.45)', shadow: false });
  }

  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right' };

  return {
    hud: false,
    reset,
    update: step,
    idle: step,
    input(e) {
      if (!vals) return false;
      if (e.type === 'keydown') {
        if (showWin) {
          if (winT > 0.5) dismissWin();
          return true;
        }
        const d = KEYS[e.key];
        if (d) {
          if (!e.repeat) doMove(d);
          return true;
        }
        return false;
      }
      if (e.type === 'down') {
        if (showWin) {
          if (winT > 0.5) dismissWin();
          return true;
        }
        swipe = { x: e.x, y: e.y, id: e.id, done: false };
        return true;
      }
      if (e.type === 'move' || e.type === 'up') {
        if (swipe && e.id === swipe.id && !swipe.done) {
          const dx = e.x - swipe.x;
          const dy = e.y - swipe.y;
          const m = Math.max(Math.abs(dx), Math.abs(dy));
          if (m > (e.type === 'move' ? 30 : 14)) {
            swipe.done = true;
            doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
          }
        }
        if (e.type === 'up') swipe = null;
        return true;
      }
      return false;
    },
    revive() {
      const snap = history[0];
      if (snap) {
        vals = snap.vals.slice();
        score = snap.score;
        moves = snap.moves;
      }
      api.setScore(score);
      shown = score;
      history = [];
      pending = [];
      over = false;
      overT = 0;
      showWin = false;
      winPending = -1;
      tiles = [];
      vals.forEach((v, i) => {
        if (v) tiles.push({ id: nextId++, v, idx: i, from: i, merged: null, isNew: true, delay: 0.1 + (((i / SIZE) | 0) + (i % SIZE)) * 0.04 });
      });
      at = 0;
      rewindT = 0;
      sfx.play('whoosh');
      sfx.tone({ freq: 900, to: 300, type: 'triangle', dur: 0.35, vol: 0.1 });
    },
    render(g) {
      if (!vals) reset();
      if (!bgGrad) {
        bgGrad = g.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#241a52');
        bgGrad.addColorStop(1, '#0e0a26');
      }
      g.fillStyle = bgGrad;
      g.fillRect(0, 0, W, H);
      // soft glow behind the board tinted by the best tile
      if (!glow || glow.v !== maxT) {
        const st = styleFor(Math.max(2, maxT));
        const grad = g.createRadialGradient(W / 2, BY + BOARD / 2, BOARD * 0.2, W / 2, BY + BOARD / 2, BOARD * 0.85);
        grad.addColorStop(0, rgba(st.bg, 0.16 + Math.min(0.16, Math.log2(Math.max(2, maxT)) / 70)));
        grad.addColorStop(1, rgba(st.bg, 0));
        glow = { v: maxT, grad };
      }
      g.fillStyle = glow.grad;
      g.fillRect(0, 0, W, H);
      renderHeader(g);
      renderBoard(g);
      renderTrack(g);
      renderWin(g);
    },
    /** Test hook: read-only snapshot (not used by the engine). */
    debug() {
      return { vals: vals.slice(), score, moves, won, showWin, over, history: history.length, maxTile: maxT };
    },
  };
}

/** Cover art: a glowing 2048 tile bursting out of a tilted board. */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#2b1d63');
  grad.addColorStop(1, '#0d0926');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = Math.min(w / 800, h / 600);
  const rg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.6);
  rg.addColorStop(0, 'rgba(255,183,0,0.35)');
  rg.addColorStop(1, 'rgba(255,183,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  // light rays
  g.save();
  g.translate(w / 2 + 90 * s, h / 2 + 10 * s);
  for (let i = 0; i < 14; i++) {
    g.rotate((Math.PI * 2) / 14);
    g.fillStyle = 'rgba(255,220,120,0.06)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.max(w, h), -60 * s);
    g.lineTo(Math.max(w, h), 60 * s);
    g.closePath();
    g.fill();
  }
  g.restore();
  // tilted board
  const ts = 86 * s;
  const gap = 11 * s;
  const bs = ts * 4 + gap * 5;
  const board = [
    [2, 4, 8, 2],
    [16, 32, 64, 4],
    [128, 256, 512, 8],
    [0, 1024, 0, 2],
  ];
  g.save();
  g.translate(w / 2 - (w > h * 1.5 ? 150 : 60) * s, h / 2 + 10 * s);
  g.rotate(-0.12);
  g.shadowColor = 'rgba(0,0,0,0.5)';
  g.shadowBlur = 40 * s;
  roundRect(g, -bs / 2, -bs / 2, bs, bs, 22 * s, '#1c1542');
  g.shadowBlur = 0;
  g.shadowColor = 'rgba(0,0,0,0)';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = -bs / 2 + gap + c * (ts + gap);
      const y = -bs / 2 + gap + r * (ts + gap);
      roundRect(g, x, y, ts, ts, 10 * s, '#2a2258');
      if (board[r][c]) drawTile(g, x, y, ts, board[r][c], 1, 1);
    }
  }
  g.restore();
  // the hero tile popping out
  const hx = w / 2 + (w > h * 1.5 ? 170 : 150) * s;
  const hy = h / 2 + 30 * s;
  g.save();
  g.translate(hx, hy);
  g.rotate(0.1);
  const hs = 190 * s;
  drawTile(g, -hs / 2, -hs / 2, hs, 2048, 1, 1);
  g.restore();
  // sparkles
  const sp = [
    [-120, -110, 9], [110, -120, 7], [130, 90, 8], [-110, 110, 6], [0, -150, 5], [160, -10, 6], [-160, 0, 5],
  ];
  for (const [dx, dy, r0] of sp) {
    const x = hx + dx * s;
    const y = hy + dy * s;
    const r = r0 * s;
    g.fillStyle = '#fff6c2';
    g.beginPath();
    g.moveTo(x, y - r * 2.4);
    g.lineTo(x + r * 0.5, y);
    g.lineTo(x, y + r * 2.4);
    g.lineTo(x - r * 0.5, y);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(x - r * 2.4, y);
    g.lineTo(x, y + r * 0.5);
    g.lineTo(x + r * 2.4, y);
    g.lineTo(x, y - r * 0.5);
    g.closePath();
    g.fill();
  }
  // floating small tiles
  const fl = [
    [0.08, 0.2, 2, 0.3, 58],
    [0.9, 0.18, 4, -0.25, 54],
    [0.93, 0.82, 8, 0.2, 60],
    [0.07, 0.84, 16, -0.2, 56],
  ];
  for (const [fxp, fyp, v, rot, size] of fl) {
    g.save();
    g.translate(w * fxp, h * fyp);
    g.rotate(rot);
    g.globalAlpha = 0.85;
    drawTile(g, (-size * s) / 2, (-size * s) / 2, size * s, v, 1, 0.85);
    g.restore();
  }
  g.globalAlpha = 1;
}
