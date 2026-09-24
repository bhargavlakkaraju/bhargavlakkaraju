// Block Crush - drag jewel blocks onto an 8x8 board, clear rows AND columns, chain combos.
import { shade, roundRect, text as drawText } from '../engine/draw.js';
import {
  N,
  SHAPES,
  pickShape,
  canPlace,
  fitsAnywhere,
  placeShape,
  fullLines,
  clearLines,
  isEmpty,
  dealTray,
  clearPoints,
  LINE_WORDS,
  ALL_CLEAR_BONUS,
} from './logic.js';

const CELL = 52;
const BW = CELL * N; // 416
const TRAY_CELL = 27;
const TRAY_Y = 666;
const TRAY_TOP = 590;
const SLOT_X = [86, 240, 394];
const LIFT = 54; // gap between the finger and the bottom of a dragged piece
const COMBO_LIFE = 3; // placements you get to keep a combo alive

// Jewel palette: ruby, amber, topaz, emerald, aqua, sapphire, amethyst, rose.
const JEWELS = ['#ff4769', '#ff9a1f', '#ffd23f', '#35d77f', '#1fd1e8', '#4a7dff', '#a45cff', '#ff5fc1'];

function makePalette(hex) {
  return {
    base: hex,
    top: shade(hex, 0.5),
    left: shade(hex, 0.22),
    right: shade(hex, -0.28),
    bottom: shade(hex, -0.48),
    face: hex,
    glow: shade(hex, 0.35),
  };
}
const PALS = JEWELS.map(makePalette);
const GRAY = makePalette('#6d7194');
const RED = makePalette('#ff3355');

/** Faceted jewel block with bevels, a facet highlight and a sparkle. */
function jewel(g, x, y, s, p) {
  const b = s * 0.17;
  const x2 = x + s;
  const y2 = y + s;
  g.fillStyle = p.top;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x2, y);
  g.lineTo(x2 - b, y + b);
  g.lineTo(x + b, y + b);
  g.closePath();
  g.fill();
  g.fillStyle = p.left;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + b, y + b);
  g.lineTo(x + b, y2 - b);
  g.lineTo(x, y2);
  g.closePath();
  g.fill();
  g.fillStyle = p.right;
  g.beginPath();
  g.moveTo(x2, y);
  g.lineTo(x2, y2);
  g.lineTo(x2 - b, y2 - b);
  g.lineTo(x2 - b, y + b);
  g.closePath();
  g.fill();
  g.fillStyle = p.bottom;
  g.beginPath();
  g.moveTo(x, y2);
  g.lineTo(x + b, y2 - b);
  g.lineTo(x2 - b, y2 - b);
  g.lineTo(x2, y2);
  g.closePath();
  g.fill();
  g.fillStyle = p.face;
  g.fillRect(x + b, y + b, s - 2 * b, s - 2 * b);
  // facet: the upper-left half of the face catches the light
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.beginPath();
  g.moveTo(x + b, y + b);
  g.lineTo(x2 - b, y + b);
  g.lineTo(x + b, y2 - b);
  g.closePath();
  g.fill();
  // sparkle
  const sx = x + b + s * 0.13;
  const sy = y + b + s * 0.13;
  const r = s * 0.085;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath();
  g.moveTo(sx, sy - r);
  g.lineTo(sx + r * 0.28, sy - r * 0.28);
  g.lineTo(sx + r, sy);
  g.lineTo(sx + r * 0.28, sy + r * 0.28);
  g.lineTo(sx, sy + r);
  g.lineTo(sx - r * 0.28, sy + r * 0.28);
  g.lineTo(sx - r, sy);
  g.lineTo(sx - r * 0.28, sy - r * 0.28);
  g.closePath();
  g.fill();
}

/** Draw a whole piece centered on (cx, cy) with cell size cs. */
function drawPiece(g, shape, pal, cx, cy, cs, alpha = 1) {
  const x0 = cx - (shape.w * cs) / 2;
  const y0 = cy - (shape.h * cs) / 2;
  const pad = cs * 0.04;
  g.globalAlpha = alpha;
  for (const [r, c] of shape.cells) jewel(g, x0 + c * cs + pad, y0 + r * cs + pad, cs - pad * 2, pal);
  g.globalAlpha = 1;
}

function crown(g, x, y, s, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x - s, y + s * 0.6);
  g.lineTo(x - s, y - s * 0.45);
  g.lineTo(x - s * 0.45, y + s * 0.05);
  g.lineTo(x, y - s * 0.7);
  g.lineTo(x + s * 0.45, y + s * 0.05);
  g.lineTo(x + s, y - s * 0.45);
  g.lineTo(x + s, y + s * 0.6);
  g.closePath();
  g.fill();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const BX = Math.round((W - BW) / 2);
  const BY = 138;
  const { fx, sfx, ease } = api;

  const board = new Uint8Array(N * N);
  const scratch = new Uint8Array(N * N);
  const landT = new Float32Array(N * N);
  const previewMask = new Uint8Array(N * N);
  let tray; // [{ piece: {shape, color}, appear, delay, hidden, ret }]
  const trayFits = [true, true, true];
  let drag = null;
  let kb = null; // keyboard cursor: { slot, r, c }
  let clearing = [];
  let combo = 0;
  let comboLife = 0;
  let bestCombo = 0;
  let lines = 0;
  let placed = 0;
  let stuck = false;
  let stuckT = 0;
  let t = 0;
  let shown = 0;
  let pop = 0;
  let comboPulse = 0;
  let boardPulse = 0;
  let bgGrad = null;
  let glowGrad = null;
  let previewKey = '';
  let previewCount = 0;

  function slotFromPiece(piece, i, delay = 0) {
    return { piece, appear: 0, delay, hidden: false, ret: null, i };
  }

  function dealNewTray() {
    const dealt = dealTray(api.rng, board, PALS.length);
    tray = dealt.map((p, i) => slotFromPiece(p, i, i * 0.07));
    sfx.play('swipe');
  }

  function computeFits() {
    for (let i = 0; i < 3; i++) trayFits[i] = !!(tray[i] && fitsAnywhere(board, tray[i].piece.shape));
  }

  function reset() {
    board.fill(0);
    landT.fill(9);
    previewMask.fill(0);
    clearing = [];
    drag = null;
    kb = null;
    combo = 0;
    comboLife = 0;
    bestCombo = 0;
    lines = 0;
    placed = 0;
    stuck = false;
    stuckT = 0;
    shown = 0;
    pop = 0;
    previewKey = '';
    previewCount = 0;
    const dealt = dealTray(api.rng, board, PALS.length);
    tray = dealt.map((p, i) => slotFromPiece(p, i, 0.1 + i * 0.08));
    computeFits();
  }

  // ---------- geometry ----------
  function cellX(c) {
    return BX + c * CELL;
  }
  function cellY(r) {
    return BY + r * CELL;
  }

  /** Where a dragged piece would land (snapped), or near=false when it is away from the board. */
  function updateAnchor() {
    const d = drag;
    const s = d.piece.shape;
    const tx = d.px;
    const ty = d.py - LIFT - (s.h * CELL) / 2;
    d.tx = tx;
    d.ty = ty;
    const fc = (tx - (s.w * CELL) / 2 - BX) / CELL;
    const fr = (ty - (s.h * CELL) / 2 - BY) / CELL;
    const slack = 0.85;
    d.near = fc > -slack && fr > -slack && fc < N - s.w + slack && fr < N - s.h + slack;
    d.c = Math.max(0, Math.min(N - s.w, Math.round(fc)));
    d.r = Math.max(0, Math.min(N - s.h, Math.round(fr)));
    d.valid = d.near && canPlace(board, s, d.r, d.c);
    updatePreview(d.valid ? d : null);
  }

  /** Marks the cells of every line the pending placement would complete. */
  function updatePreview(p) {
    const key = p ? `${p.slot}:${p.r}:${p.c}` : '';
    if (key === previewKey) return;
    previewKey = key;
    previewMask.fill(0);
    previewCount = 0;
    if (!p) return;
    scratch.set(board);
    placeShape(scratch, tray[p.slot].piece.shape, p.r, p.c, 1);
    const { rows, cols } = fullLines(scratch);
    previewCount = rows.length + cols.length;
    for (const r of rows) for (let c = 0; c < N; c++) previewMask[r * N + c] = 1;
    for (const c of cols) for (let r = 0; r < N; r++) previewMask[r * N + c] = 1;
    if (previewCount) sfx.tone({ freq: 880 + previewCount * 120, type: 'sine', dur: 0.05, vol: 0.05 });
  }

  function slotAt(x, y) {
    if (y < TRAY_TOP - 36) return -1;
    let best = -1;
    let bd = 1e9;
    for (let i = 0; i < 3; i++) {
      if (!tray[i]) continue;
      const d = Math.abs(x - SLOT_X[i]);
      if (d < 80 && d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  // ---------- actions ----------
  function startDrag(slot, e) {
    const s = tray[slot];
    const home = slotHome(slot);
    drag = { slot, piece: s.piece, id: e.id, px: e.x, py: e.y, dx: home.x, dy: home.y, sc: TRAY_CELL, r: 0, c: 0, tx: 0, ty: 0, near: false, valid: false };
    s.hidden = true;
    s.ret = null;
    updateAnchor();
    sfx.tone({ freq: 520, to: 780, type: 'sine', dur: 0.07, vol: 0.1 });
    api.haptic(6);
  }

  function slotHome(i) {
    return { x: SLOT_X[i], y: TRAY_Y };
  }

  function endDrag() {
    const d = drag;
    drag = null;
    updatePreview(null);
    if (d.valid) {
      place(d.slot, d.r, d.c);
      return;
    }
    const s = tray[d.slot];
    if (!s) return;
    s.hidden = false;
    s.ret = { x: d.dx, y: d.dy, s: d.sc, t: 0 };
    if (d.near) {
      sfx.tone({ freq: 190, to: 120, type: 'triangle', dur: 0.12, vol: 0.12 });
      api.haptic(15);
    } else sfx.tone({ freq: 420, to: 300, type: 'sine', dur: 0.06, vol: 0.06 });
  }

  function place(slot, r0, c0) {
    const piece = tray[slot].piece;
    const shape = piece.shape;
    const cells = placeShape(board, shape, r0, c0, piece.color + 1);
    for (const i of cells) landT[i] = 0;
    tray[slot] = null;
    kb = null;
    placed += 1;
    const cx = cellX(c0) + (shape.w * CELL) / 2;
    const cy = cellY(r0) + (shape.h * CELL) / 2;
    let gained = shape.cells.length;
    sfx.play('place');
    api.haptic(10);
    fx.burst(cx, cy, { count: 8, color: PALS[piece.color].glow, speed: 120, size: 3, life: 0.35, gravity: 0 });

    const { rows, cols } = fullLines(board);
    const L = rows.length + cols.length;
    if (L > 0) {
      combo += 1;
      comboLife = COMBO_LIFE;
      bestCombo = Math.max(bestCombo, combo);
      lines += L;
      const pts = clearPoints(L, combo);
      gained += pts;
      const cleared = clearLines(board, rows, cols);
      const ccol = c0 + shape.w / 2 - 0.5;
      const crow = r0 + shape.h / 2 - 0.5;
      const rowSet = new Set(rows);
      for (const o of cleared) {
        const r = (o.i / N) | 0;
        const c = o.i % N;
        const dRow = rowSet.has(r) ? Math.abs(c - ccol) : 99;
        const dCol = cols.includes(c) ? Math.abs(r - crow) : 99;
        clearing.push({ x: cellX(c), y: cellY(r), pal: PALS[o.v - 1], delay: Math.min(dRow, dCol) * 0.032, t: 0, burst: false });
        landT[o.i] = 9;
      }
      boardPulse = 1;
      comboPulse = 1;
      const allClear = isEmpty(board);
      if (allClear) gained += ALL_CLEAR_BONUS;
      // feedback
      sfx.play('pop');
      sfx.combo(Math.min(20, combo + L - 1));
      if (L >= 2) sfx.play('perfect');
      fx.shake(Math.min(14, 3 + L * 2.5 + combo), 0.22 + L * 0.04);
      api.haptic(20 + L * 10);
      fx.text(cx, cy - 10, `+${gained}`, { size: 30 + Math.min(14, L * 3), color: '#ffffff', life: 1 });
      if (L >= 2) fx.text(W / 2, BY + BW * 0.36, LINE_WORDS[Math.min(L, LINE_WORDS.length - 1)], { size: 40 + Math.min(12, L * 2), color: PALS[piece.color].glow, life: 1.1, rise: 50 });
      if (combo >= 2) {
        fx.text(W / 2, BY + BW * 0.52, `COMBO x${combo}!`, { size: 46 + Math.min(16, combo * 2), color: '#ffd23f', life: 1.2, rise: 60 });
        fx.ring(W / 2, BY + BW * 0.52, { color: '#ffd23f', radius: 150, life: 0.5, width: 6 });
        if (combo >= 3) api.happy();
      }
      if (allClear) {
        fx.text(W / 2, BY + BW * 0.7, `ALL CLEAR! +${ALL_CLEAR_BONUS}`, { size: 36, color: '#35d77f', life: 1.6, rise: 40 });
        fx.confetti(W / 2, BY + BW * 0.5, 90);
        fx.flash('#ffffff', 0.35);
        sfx.play('win');
        api.happy();
      } else if (L >= 3) fx.flash('#ffffff', 0.18);
    } else {
      if (combo > 0) {
        comboLife -= 1;
        if (comboLife <= 0) combo = 0;
      }
      fx.text(cx, cy - 8, `+${gained}`, { size: 22, color: 'rgba(255,255,255,0.9)', life: 0.6, rise: 36 });
    }
    api.addScore(gained);
    pop = 1;

    if (!tray[0] && !tray[1] && !tray[2]) dealNewTray();
    computeFits();
    if (!trayFits[0] && !trayFits[1] && !trayFits[2]) noMoves();
  }

  function noMoves() {
    stuck = true;
    stuckT = 0;
    kb = null;
    drag = null;
    sfx.play('hit');
    fx.shake(9, 0.4);
    api.haptic(70);
    const share = `🧩 ${api.score} pts · ${lines} line${lines === 1 ? '' : 's'} · 🔥 best combo x${Math.max(1, bestCombo)}`;
    api.gameOver({ delay: 1700, stats: { lines, bestCombo, pieces: placed, shareText: share } });
  }

  // ---------- keyboard ----------
  function kbSelect(slot) {
    if (slot < 0 || !tray[slot]) return;
    const s = tray[slot].piece.shape;
    if (kb && kb.slot === slot) return;
    let r = kb ? kb.r : Math.floor((N - s.h) / 2);
    let c = kb ? kb.c : Math.floor((N - s.w) / 2);
    if (!kb) {
      // start from the valid spot nearest the center
      let bd = 1e9;
      for (let rr = 0; rr <= N - s.h; rr++)
        for (let cc = 0; cc <= N - s.w; cc++) {
          if (!canPlace(board, s, rr, cc)) continue;
          const d = Math.abs(rr + s.h / 2 - N / 2) + Math.abs(cc + s.w / 2 - N / 2);
          if (d < bd) {
            bd = d;
            r = rr;
            c = cc;
          }
        }
    }
    kb = { slot, r: Math.min(r, N - s.h), c: Math.min(c, N - s.w) };
    sfx.play('click');
    kbPreview();
  }

  function kbPreview() {
    if (!kb) return updatePreview(null);
    const ok = canPlace(board, tray[kb.slot].piece.shape, kb.r, kb.c);
    updatePreview(ok ? { slot: kb.slot, r: kb.r, c: kb.c } : null);
  }

  function firstUsableSlot(from = 0, step = 1) {
    for (let k = 0; k < 3; k++) {
      const i = (((from + k * step) % 3) + 3) % 3;
      if (tray[i] && trayFits[i]) return i;
    }
    for (let k = 0; k < 3; k++) {
      const i = (((from + k * step) % 3) + 3) % 3;
      if (tray[i]) return i;
    }
    return -1;
  }

  const DIRS = {
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    a: [0, -1],
    d: [0, 1],
    w: [-1, 0],
    s: [1, 0],
    A: [0, -1],
    D: [0, 1],
    W: [-1, 0],
    S: [1, 0],
  };

  function onKey(e) {
    const k = e.key;
    if (drag) return true;
    if (k === '1' || k === '2' || k === '3') {
      kb = null;
      kbSelect(Number(k) - 1);
      return true;
    }
    if (k === 'Escape' || k === 'Backspace') {
      kb = null;
      updatePreview(null);
      return true;
    }
    if (k === 'Tab' || k === 'q' || k === 'e' || k === 'Q' || k === 'E') {
      const step = k === 'q' || k === 'Q' ? -1 : 1;
      const cur = kb ? kb.slot : -step;
      const next = firstUsableSlot(cur + step, step);
      if (next >= 0) {
        const keep = kb;
        kb = keep ? { ...keep, slot: next } : null;
        if (kb) {
          const s = tray[next].piece.shape;
          kb.r = Math.min(kb.r, N - s.h);
          kb.c = Math.min(kb.c, N - s.w);
          sfx.play('click');
          kbPreview();
        } else kbSelect(next);
      }
      return true;
    }
    const dir = DIRS[k];
    if (dir) {
      if (!kb) kbSelect(firstUsableSlot());
      else {
        const s = tray[kb.slot].piece.shape;
        kb.r = Math.max(0, Math.min(N - s.h, kb.r + dir[0]));
        kb.c = Math.max(0, Math.min(N - s.w, kb.c + dir[1]));
        sfx.tone({ freq: 700, type: 'sine', dur: 0.03, vol: 0.05 });
        kbPreview();
      }
      return true;
    }
    if (k === 'Enter' || k === ' ') {
      if (!kb) kbSelect(firstUsableSlot());
      else if (canPlace(board, tray[kb.slot].piece.shape, kb.r, kb.c)) {
        const { slot, r, c } = kb;
        updatePreview(null);
        place(slot, r, c);
      } else {
        sfx.play('error');
        api.haptic(15);
      }
      return true;
    }
    return false;
  }

  // ---------- update ----------
  function step(dt) {
    t += dt;
    for (let i = 0; i < landT.length; i++) if (landT[i] < 9) landT[i] += dt;
    if (tray) {
      for (const s of tray) {
        if (!s) continue;
        if (s.appear < 1) {
          if (s.delay > 0) s.delay -= dt;
          else s.appear = Math.min(1, s.appear + dt / 0.32);
        }
        if (s.ret) {
          s.ret.t += dt;
          if (s.ret.t >= 0.2) s.ret = null;
        }
      }
    }
    if (drag) {
      const k = Math.min(1, dt * 28);
      drag.dx += (drag.tx - drag.dx) * k;
      drag.dy += (drag.ty - drag.dy) * k;
      drag.sc += (CELL - drag.sc) * Math.min(1, dt * 18);
    }
    for (let i = clearing.length - 1; i >= 0; i--) {
      const c = clearing[i];
      c.t += dt;
      const k = (c.t - c.delay) / 0.4;
      if (!c.burst && k >= 0.28) {
        c.burst = true;
        fx.burst(c.x + CELL / 2, c.y + CELL / 2, { count: 5, colors: [c.pal.base, c.pal.top, '#ffffff'], speed: 230, size: 4.5, life: 0.6, gravity: 650, shape: 'square' });
      }
      if (k >= 1) clearing.splice(i, 1);
    }
    shown += (api.score - shown) * Math.min(1, dt * 12);
    if (Math.abs(api.score - shown) < 0.5) shown = api.score;
    pop = Math.max(0, pop - dt * 4);
    comboPulse = Math.max(0, comboPulse - dt * 2.5);
    boardPulse = Math.max(0, boardPulse - dt * 3);
    if (stuck) stuckT += dt;
  }

  // ---------- render ----------
  function renderBackground(g) {
    if (!bgGrad) {
      bgGrad = g.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#26165a');
      bgGrad.addColorStop(0.55, '#150d38');
      bgGrad.addColorStop(1, '#0c0824');
      glowGrad = g.createRadialGradient(W / 2, BY + BW / 2, 30, W / 2, BY + BW / 2, 380);
      glowGrad.addColorStop(0, 'rgba(150,110,255,0.28)');
      glowGrad.addColorStop(1, 'rgba(150,110,255,0)');
    }
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = glowGrad;
    g.fillRect(0, 0, W, H);
    // drifting ambient gems
    for (let i = 0; i < 14; i++) {
      const sz = 6 + ((i * 7) % 14);
      const x = (i * 97 + Math.sin(t * 0.3 + i) * 12) % W;
      const y = H + 30 - ((t * (8 + (i % 5) * 3) + i * 83) % (H + 60));
      g.save();
      g.translate(x, y);
      g.rotate(t * 0.2 + i);
      g.globalAlpha = 0.07;
      g.fillStyle = JEWELS[i % JEWELS.length];
      g.fillRect(-sz / 2, -sz / 2, sz, sz);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  function renderHud(g) {
    const best = Math.max(api.best ?? 0, api.score);
    // best (top-left)
    if (best > 0) {
      crown(g, 30, 34, 11, '#ffd23f');
      drawText(g, best.toLocaleString('en-US'), 48, 35, { size: 22, weight: 800, color: '#ffe89a', align: 'left', shadow: false });
    }
    if (api.daily) {
      roundRect(g, 18, 56, 70, 22, 11, 'rgba(34,211,238,0.18)');
      drawText(g, 'DAILY', 53, 67.5, { size: 13, weight: 800, color: '#7ff0ff', shadow: false });
    }
    // score (center)
    const s = 1 + ease.outQuad(pop) * 0.18;
    g.save();
    g.translate(W / 2, 62);
    g.scale(s, s);
    drawText(g, Math.round(shown).toLocaleString('en-US'), 0, 0, { size: 52, weight: 800, color: '#ffffff', shadow: 'rgba(0,0,0,0.4)' });
    g.restore();
    // challenge target
    if (api.target != null) {
      const beat = api.score > api.target;
      drawText(g, beat ? `TARGET ${api.target.toLocaleString('en-US')} BEATEN!` : `BEAT ${api.target.toLocaleString('en-US')}`, W / 2, 99, {
        size: 15,
        weight: 800,
        color: beat ? '#a3e635' : '#ffd23f',
        shadow: false,
      });
    }
    // combo meter
    if (combo >= 1) {
      const y = api.target != null ? 120 : 108;
      const cs = 1 + comboPulse * 0.25;
      g.save();
      g.translate(W / 2, y);
      g.scale(cs, cs);
      roundRect(g, -78, -13, 156, 26, 13, 'rgba(255,210,63,0.16)', 'rgba(255,210,63,0.5)', 1.5);
      drawText(g, `COMBO x${combo}`, -18, 0.5, { size: 15, weight: 800, color: '#ffd23f', shadow: false });
      for (let i = 0; i < COMBO_LIFE; i++) {
        const on = i < comboLife;
        g.fillStyle = on ? '#ffd23f' : 'rgba(255,210,63,0.22)';
        g.beginPath();
        g.arc(38 + i * 13, 0, 4.2, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  }

  function renderBoard(g) {
    const pulse = boardPulse;
    // frame
    roundRect(g, BX - 12, BY - 12, BW + 24, BW + 24, 20, '#0b0721');
    roundRect(g, BX - 12, BY - 12, BW + 24, BW + 24, 20, null, pulse > 0 ? `rgba(255,255,255,${0.1 + pulse * 0.5})` : 'rgba(255,255,255,0.1)', 2 + pulse * 2);
    // sockets
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        roundRect(g, cellX(c) + 3, cellY(r) + 3, CELL - 6, CELL - 6, 8, (r + c) & 1 ? '#1c1446' : '#211850');
      }
    }
    // placed blocks
    const dragPal = drag ? PALS[drag.piece.color] : kb && tray[kb.slot] ? PALS[tray[kb.slot].piece.color] : null;
    const wave = 0.5 + 0.5 * Math.sin(t * 10);
    for (let i = 0; i < N * N; i++) {
      const v = board[i];
      if (!v) continue;
      const r = (i / N) | 0;
      const c = i % N;
      let pal = PALS[v - 1];
      if (previewMask[i] && dragPal) pal = dragPal;
      if (stuck && stuckT > 0.12 + r * 0.06) pal = GRAY;
      const lt = landT[i];
      const x = cellX(c);
      const y = cellY(r);
      if (lt < 0.2) {
        const k = lt / 0.2;
        const sc = 1 + 0.14 * (1 - ease.outCubic(k));
        const size = (CELL - 4) * sc;
        jewel(g, x + CELL / 2 - size / 2, y + CELL / 2 - size / 2, size, pal);
        g.globalAlpha = 0.55 * (1 - k);
        g.fillStyle = '#ffffff';
        g.fillRect(x + CELL / 2 - size / 2, y + CELL / 2 - size / 2, size, size);
        g.globalAlpha = 1;
      } else jewel(g, x + 2, y + 2, CELL - 4, pal);
      if (previewMask[i] && dragPal) {
        g.globalAlpha = 0.12 + wave * 0.16;
        g.fillStyle = '#ffffff';
        g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        g.globalAlpha = 1;
      }
    }
    // clearing sweep
    for (const cl of clearing) {
      const k = (cl.t - cl.delay) / 0.4;
      if (k < 0) {
        jewel(g, cl.x + 2, cl.y + 2, CELL - 4, cl.pal);
        continue;
      }
      let sc;
      if (k < 0.28) sc = 1 + 0.2 * ease.outQuad(k / 0.28);
      else sc = 1.2 * (1 - ease.inQuad((k - 0.28) / 0.72));
      const size = (CELL - 4) * sc;
      if (size <= 0.5) continue;
      const cx = cl.x + CELL / 2;
      const cy = cl.y + CELL / 2;
      g.save();
      g.translate(cx, cy);
      g.rotate(k > 0.28 ? (k - 0.28) * 1.2 : 0);
      jewel(g, -size / 2, -size / 2, size, cl.pal);
      g.globalAlpha = k < 0.28 ? 0.35 + 0.6 * (k / 0.28) : Math.max(0, 0.95 - (k - 0.28) * 1.4);
      g.fillStyle = '#ffffff';
      g.fillRect(-size / 2, -size / 2, size, size);
      g.restore();
      g.globalAlpha = 1;
    }
  }

  function renderGhost(g, shape, r0, c0, valid, pal) {
    for (const [dr, dc] of shape.cells) {
      const x = cellX(c0 + dc);
      const y = cellY(r0 + dr);
      if (valid) {
        g.globalAlpha = 0.38;
        jewel(g, x + 2, y + 2, CELL - 4, pal);
        g.globalAlpha = 1;
        roundRect(g, x + 3, y + 3, CELL - 6, CELL - 6, 8, null, 'rgba(255,255,255,0.55)', 2);
      } else if (!board[(r0 + dr) * N + c0 + dc]) {
        roundRect(g, x + 3, y + 3, CELL - 6, CELL - 6, 8, 'rgba(255,51,85,0.28)', 'rgba(255,80,110,0.85)', 2);
      } else {
        roundRect(g, x + 3, y + 3, CELL - 6, CELL - 6, 8, null, 'rgba(255,80,110,0.95)', 3);
      }
    }
  }

  function renderTray(g) {
    roundRect(g, 14, TRAY_TOP + 2, W - 28, H - TRAY_TOP - 16, 24, 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0.07)', 1.5);
    for (let i = 0; i < 3; i++) {
      const s = tray[i];
      if (!s || s.hidden) continue;
      const home = slotHome(i);
      let x = home.x;
      let y = home.y;
      let cs = TRAY_CELL;
      if (s.ret) {
        const k = ease.outCubic(Math.min(1, s.ret.t / 0.2));
        x = s.ret.x + (home.x - s.ret.x) * k;
        y = s.ret.y + (home.y - s.ret.y) * k;
        cs = s.ret.s + (TRAY_CELL - s.ret.s) * k;
      }
      let sc = s.appear < 1 ? ease.outBack(s.appear) : 1;
      if (s.appear <= 0) continue;
      const fits = trayFits[i];
      let pal = PALS[s.piece.color];
      let alpha = 1;
      if (stuck) {
        pal = RED;
        x += Math.sin(stuckT * 38 + i) * 4 * Math.max(0, 1 - stuckT * 0.6);
      } else if (!fits) {
        pal = GRAY;
        alpha = 0.45;
      }
      if (kb && kb.slot === i) {
        roundRect(g, x - 68, y - 66, 136, 132, 18, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.5)', 2);
        sc *= 0.85;
      }
      if (s.appear < 1) x += (1 - ease.outCubic(s.appear)) * 60;
      drawPiece(g, s.piece.shape, pal, x, y, cs * sc, alpha);
      if (stuck) {
        // a clear "doesn't fit" mark
        g.strokeStyle = `rgba(255,255,255,${Math.min(1, stuckT * 3)})`;
        g.lineWidth = 5;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 12, y - 12);
        g.lineTo(x + 12, y + 12);
        g.moveTo(x + 12, y - 12);
        g.lineTo(x - 12, y + 12);
        g.stroke();
      }
    }
  }

  function renderDrag(g) {
    if (!drag) return;
    const s = drag.piece.shape;
    const pal = PALS[drag.piece.color];
    if (drag.near) renderGhost(g, s, drag.r, drag.c, drag.valid, pal);
    // soft shadow under the lifted piece
    g.fillStyle = 'rgba(0,0,0,0.28)';
    const cs = drag.sc;
    const x0 = drag.dx - (s.w * cs) / 2;
    const y0 = drag.dy - (s.h * cs) / 2;
    for (const [r, c] of s.cells) g.fillRect(x0 + c * cs + 6, y0 + r * cs + 10, cs - 2, cs - 2);
    drawPiece(g, s, pal, drag.dx, drag.dy, cs, 1);
  }

  function renderKb(g) {
    if (!kb || !tray[kb.slot]) return;
    const piece = tray[kb.slot].piece;
    const s = piece.shape;
    const ok = canPlace(board, s, kb.r, kb.c);
    renderGhost(g, s, kb.r, kb.c, ok, PALS[piece.color]);
    const bob = Math.sin(t * 6) * 2;
    drawPiece(g, s, ok ? PALS[piece.color] : RED, cellX(kb.c) + (s.w * CELL) / 2, cellY(kb.r) + (s.h * CELL) / 2 - 6 + bob, CELL, 0.82);
  }

  return {
    hud: false,
    reset,
    update: step,
    idle: step,
    input(e) {
      if (stuck || !tray) return false;
      if (e.type === 'down') {
        if (drag) return true;
        const slot = slotAt(e.x, e.y);
        if (slot >= 0) {
          kb = null;
          updatePreview(null);
          startDrag(slot, e);
        }
        return true;
      }
      if (e.type === 'move') {
        if (drag && e.id === drag.id) {
          drag.px = e.x;
          drag.py = e.y;
          updateAnchor();
        }
        return true;
      }
      if (e.type === 'up') {
        if (drag && e.id === drag.id) {
          drag.px = e.x;
          drag.py = e.y;
          updateAnchor();
          endDrag();
        }
        return true;
      }
      if (e.type === 'keydown') return onKey(e);
      return false;
    },
    revive() {
      stuck = false;
      stuckT = 0;
      drag = null;
      kb = null;
      combo = 0;
      comboLife = 0;
      // Clear the three fullest rows with the normal sweep...
      const counts = [];
      for (let r = 0; r < N; r++) {
        let n = 0;
        for (let c = 0; c < N; c++) if (board[r * N + c]) n++;
        if (n > 0) counts.push({ r, n });
      }
      counts.sort((a, b) => b.n - a.n || a.r - b.r);
      const rows = counts.slice(0, 3).map((o) => o.r);
      const cleared = clearLines(board, rows, []);
      for (const o of cleared) {
        const r = (o.i / N) | 0;
        const c = o.i % N;
        clearing.push({ x: cellX(c), y: cellY(r), pal: PALS[o.v - 1], delay: 0.15 + c * 0.04, t: 0, burst: false });
        landT[o.i] = 9;
      }
      // ...and deal a fresh tray where every piece fits.
      const c0 = api.rng.int(0, PALS.length - 1);
      tray = [0, 1, 2].map((i) => {
        let shape = null;
        for (let k = 0; k < 60 && !shape; k++) {
          const s = pickShape(api.rng());
          if (fitsAnywhere(board, s)) shape = s;
        }
        return slotFromPiece({ shape: shape || SHAPES[0], color: (c0 + i * 3) % PALS.length }, i, 0.3 + i * 0.08);
      });
      computeFits();
      boardPulse = 1;
      sfx.play('whoosh');
      sfx.play('levelup');
      fx.text(W / 2, BY + BW / 2, 'SECOND CHANCE!', { size: 38, color: '#7ff0ff', life: 1.4, rise: 40 });
    },
    render(g) {
      if (!tray) reset();
      renderBackground(g);
      renderHud(g);
      renderBoard(g);
      renderKb(g);
      renderTray(g);
      renderDrag(g);
    },
    /** Test hook: read-only snapshot of the run (not used by the engine). */
    debug() {
      return {
        board: Array.from(board),
        tray: tray.map((s) => (s ? { pat: s.piece.shape.pat, color: s.piece.color } : null)),
        trayFits: trayFits.slice(),
        combo,
        comboLife,
        lines,
        stuck,
        score: api.score,
      };
    },
  };
}

/** Cover art: a jewel board mid-clear with a piece hovering above it. */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#2d1868');
  grad.addColorStop(0.6, '#170d3f');
  grad.addColorStop(1, '#0b0724');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = Math.min(w / 800, h / 600);
  const cs = 50 * s;
  const bw = cs * N;
  const bx = w / 2 - bw / 2 - (w > h * 1.5 ? 150 * s : 60 * s);
  const by = h / 2 - bw / 2 + 12 * s;
  // glow
  const rg = g.createRadialGradient(bx + bw / 2, by + bw / 2, 10, bx + bw / 2, by + bw / 2, bw);
  rg.addColorStop(0, 'rgba(170,120,255,0.45)');
  rg.addColorStop(1, 'rgba(170,120,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  // decorative scattered gems
  for (let i = 0; i < 26; i++) {
    const x = (i * 173.3) % w;
    const y = (i * 97.7 + 40) % h;
    const sz = (10 + ((i * 13) % 20)) * s;
    g.save();
    g.translate(x, y);
    g.rotate(i * 0.7);
    g.globalAlpha = 0.18;
    jewel(g, -sz / 2, -sz / 2, sz, PALS[i % PALS.length]);
    g.restore();
  }
  g.globalAlpha = 1;
  roundRect(g, bx - 14 * s, by - 14 * s, bw + 28 * s, bw + 28 * s, 22 * s, '#0b0721', 'rgba(255,255,255,0.14)', 3 * s);
  const layout = [
    '........',
    '.6....1.',
    '66..3311',
    '0022331.',
    '########',
    '4455.772',
    '4.55.772',
    '44..0022',
  ];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = bx + c * cs;
      const y = by + r * cs;
      roundRect(g, x + 3 * s, y + 3 * s, cs - 6 * s, cs - 6 * s, 7 * s, (r + c) & 1 ? '#1c1446' : '#211850');
      const ch = layout[r][c];
      if (ch === '.') continue;
      if (ch === '#') {
        const pal = PALS[(c + 2) % PALS.length];
        jewel(g, x + 2 * s, y + 2 * s, cs - 4 * s, pal);
        g.globalAlpha = 0.55;
        g.fillStyle = '#ffffff';
        g.fillRect(x + 2 * s, y + 2 * s, cs - 4 * s, cs - 4 * s);
        g.globalAlpha = 1;
      } else jewel(g, x + 2 * s, y + 2 * s, cs - 4 * s, PALS[Number(ch)]);
    }
  }
  // clearing beam across the full row
  const ry = by + 4 * cs + cs / 2;
  const beam = g.createLinearGradient(0, ry - cs, 0, ry + cs);
  beam.addColorStop(0, 'rgba(255,255,255,0)');
  beam.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  beam.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = beam;
  g.fillRect(bx - 40 * s, ry - cs, bw + 80 * s, cs * 2);
  // sparkles
  for (let i = 0; i < 40; i++) {
    const x = bx - 30 * s + ((i * 37.3) % (bw + 60 * s));
    const y = ry + Math.sin(i * 2.3) * cs * 1.3;
    const r = (2 + (i % 4)) * s;
    g.fillStyle = PALS[i % PALS.length].top;
    g.globalAlpha = 0.9;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
  // floating pieces with shadows
  const pieces = [
    { pat: '###|.#.', col: 6, x: bx + bw + 150 * s, y: by + 120 * s, rot: -0.18, cs: cs * 1.05 },
    { pat: '##|##', col: 2, x: bx + bw + 120 * s, y: by + bw - 40 * s, rot: 0.14, cs: cs * 0.9 },
    { pat: '#.|#.|##', col: 4, x: bx + bw + 300 * s, y: by + bw * 0.55, rot: 0.1, cs: cs * 0.95 },
  ];
  const shown = w > h * 1.5 ? pieces : pieces.slice(0, 2);
  for (const p of shown) {
    const shape = SHAPES.find((sh) => sh.pat === p.pat);
    if (p.x > w + 40 * s) continue;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.globalAlpha = 0.35;
    g.fillStyle = '#000';
    const x0 = -(shape.w * p.cs) / 2;
    const y0 = -(shape.h * p.cs) / 2;
    for (const [r, c] of shape.cells) g.fillRect(x0 + c * p.cs + 12 * s, y0 + r * p.cs + 18 * s, p.cs - 4 * s, p.cs - 4 * s);
    g.globalAlpha = 1;
    drawPiece(g, shape, PALS[p.col], 0, 0, p.cs, 1);
    g.restore();
  }
}
