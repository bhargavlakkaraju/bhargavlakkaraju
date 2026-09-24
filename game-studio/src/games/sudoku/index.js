// Sudoku - unique-solution puzzles in three difficulties, notes, hints, mistakes and sweeps.
import { roundRect, text as drawText, FONT } from '../engine/draw.js';
import { ROW, COL, BOX, UNITS, PEERS, BIT, POP, ALL, generate, DIFFICULTY } from './core.js';

const GX = 15;
const GY = 104;
const CS = 50;
const GS = CS * 9; // 450
const TAB_Y = 14;
const TAB_H = 38;
const TAB_W = 108;
const TAB_GAP = 8;
const TOOL_Y = 570;
const TOOL_H = 60;
const TOOL_W = 105;
const PAD_Y = 644;
const PAD_H = 104;
const PAD_GAP = 5;
const PAD_W = (GS - PAD_GAP * 8) / 9;
const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const DIFFS = ['easy', 'medium', 'hard'];
const FONT_GIVEN = `700 30px ${FONT}`;
const FONT_USER = `600 30px ${FONT}`;

const C = {
  board: '#f6f8ff',
  peer: '#e2e9ff',
  same: '#c6d4ff',
  sel: '#a9c1ff',
  conflict: '#ffd3db',
  wrongBg: '#ffe3e8',
  given: '#1a2150',
  user: '#2c63ff',
  wrong: '#ff3355',
  hint: '#d98200',
  note: '#6f78a0',
  thin: '#cfd5ec',
  thick: '#1a2150',
  ink: '#dfe5ff',
  dim: 'rgba(223,229,255,0.55)',
};

export function formatTime(sec, padMinutes = true) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  if (h) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${padMinutes ? String(m).padStart(2, '0') : m}:${ss}`;
}

// ---------- small vector icons ----------
function iconUndo(g, x, y, c) {
  g.strokeStyle = c;
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.arc(x + 1, y + 2, 9, Math.PI * 1.05, Math.PI * 0.35, false);
  g.stroke();
  g.beginPath();
  g.moveTo(x - 12, y - 6);
  g.lineTo(x - 8.5, y + 2);
  g.lineTo(x - 1, y - 2);
  g.stroke();
}
function iconErase(g, x, y, c) {
  g.strokeStyle = c;
  g.lineWidth = 2.6;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - 13, y);
  g.lineTo(x - 6, y - 9);
  g.lineTo(x + 13, y - 9);
  g.lineTo(x + 13, y + 9);
  g.lineTo(x - 6, y + 9);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(x - 1, y - 4);
  g.lineTo(x + 7, y + 4);
  g.moveTo(x + 7, y - 4);
  g.lineTo(x - 1, y + 4);
  g.stroke();
}
function iconPencil(g, x, y, c) {
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 4);
  g.strokeStyle = c;
  g.fillStyle = c;
  g.lineWidth = 2.6;
  g.lineJoin = 'round';
  g.strokeRect(-12, -4.5, 19, 9);
  g.beginPath();
  g.moveTo(7, -4.5);
  g.lineTo(14, 0);
  g.lineTo(7, 4.5);
  g.closePath();
  g.stroke();
  g.fillRect(-12, -4.5, 4, 9);
  g.restore();
}
function iconBulb(g, x, y, c) {
  g.strokeStyle = c;
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y - 3, 8.5, Math.PI * 0.8, Math.PI * 2.2);
  g.lineTo(x + 4, y + 9);
  g.lineTo(x - 4, y + 9);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(x - 3.5, y + 13);
  g.lineTo(x + 3.5, y + 13);
  g.stroke();
}
function iconClock(g, x, y, r, c) {
  g.strokeStyle = c;
  g.lineWidth = 2.2;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.moveTo(x, y - r * 0.55);
  g.lineTo(x, y);
  g.lineTo(x + r * 0.45, y + r * 0.3);
  g.stroke();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const { fx, sfx, ease } = api;

  let diff = 'easy';
  let puzzle = null;
  let sol = null;
  const vals = new Int8Array(81);
  const given = new Uint8Array(81);
  const hinted = new Uint8Array(81);
  const notes = new Int16Array(81);
  const conflict = new Uint8Array(81);
  const popT = new Float32Array(81);
  const shakeT = new Float32Array(81);
  const sweepT = new Float32Array(81);
  const sweepGold = new Uint8Array(81);
  const padGlow = new Float32Array(10);
  const padPress = new Float32Array(10);
  const toolPress = new Float32Array(4);
  let sel = 40;
  let notesMode = false;
  let mistakes = 0;
  let hintsLeft = MAX_HINTS;
  let hintsUsed = 0;
  let elapsed = 0;
  let done = false;
  let won = false;
  let introT = 0;
  let history = [];
  let armed = null; // { diff, t } waiting for a confirming tap
  let toast = null;
  let t = 0;
  let bgGrad = null;
  let mistakePulse = 0;
  let genMs = 0;
  let winAt = 0;
  let confettiT = -1;

  function bestKey(d) {
    return `best-${d}`;
  }
  function bestFor(d) {
    if (api.daily) return api.best;
    return api.store.get(bestKey(d), null);
  }

  function newPuzzle(d) {
    diff = d;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const p = generate(api.rng, d);
    genMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    puzzle = p.puzzle;
    sol = p.solution;
    for (let i = 0; i < 81; i++) {
      vals[i] = puzzle[i];
      given[i] = puzzle[i] ? 1 : 0;
    }
    hinted.fill(0);
    notes.fill(0);
    conflict.fill(0);
    popT.fill(9);
    shakeT.fill(9);
    sweepT.fill(-9);
    padGlow.fill(9);
    padPress.fill(9);
    toolPress.fill(9);
    sel = 40;
    notesMode = false;
    mistakes = 0;
    hintsLeft = MAX_HINTS;
    hintsUsed = 0;
    elapsed = 0;
    done = false;
    won = false;
    introT = 0;
    history = [];
    armed = null;
    api.setScore(0);
  }

  function reset() {
    const d = api.daily ? 'medium' : api.store.get('difficulty', 'easy');
    newPuzzle(DIFFS.includes(d) ? d : 'easy');
    toast = null;
  }

  // ---------- helpers ----------
  const isCorrect = (i) => vals[i] !== 0 && vals[i] === sol[i];
  const isWrong = (i) => vals[i] !== 0 && vals[i] !== sol[i];

  function remaining(d) {
    let n = 9;
    for (let i = 0; i < 81; i++) if (vals[i] === d && sol[i] === d) n--;
    return n;
  }

  function recomputeConflicts() {
    conflict.fill(0);
    for (let i = 0; i < 81; i++) {
      if (!isWrong(i)) continue;
      for (const p of PEERS[i]) if (vals[p] === vals[i]) conflict[p] = 1;
    }
  }

  /** After an undo, drop notes made stale by digits placed since that snapshot. */
  function cleanNotes(snapVals) {
    for (let i = 0; i < 81; i++) {
      if (vals[i]) {
        notes[i] = 0;
        continue;
      }
      if (!notes[i]) continue;
      for (const p of PEERS[i]) if (isCorrect(p) && snapVals[p] !== vals[p]) notes[i] &= ~BIT(vals[p]);
    }
  }

  function pushHistory() {
    history.push({ vals: Int8Array.from(vals), notes: Int16Array.from(notes) });
    if (history.length > 200) history.shift();
  }

  function showToast(msg, color = '#ffffff', dur = 2) {
    toast = { msg, color, t: 0, dur };
  }

  function cellCenter(i) {
    return { x: GX + COL[i] * CS + CS / 2, y: GY + ROW[i] * CS + CS / 2 };
  }

  function sweepUnit(u, from, gold = false) {
    const cells = UNITS[u];
    const f = cells.indexOf(from);
    cells.forEach((i, k) => {
      const d = Math.abs(k - (f < 0 ? 4 : f));
      sweepT[i] = -d * 0.045;
      sweepGold[i] = gold ? 1 : 0;
    });
  }

  // ---------- actions ----------
  function enter(d) {
    padPress[d] = 0;
    if (done || sel < 0) return;
    const i = sel;
    if (given[i] || isCorrect(i)) {
      sfx.tone({ freq: 300, type: 'triangle', dur: 0.05, vol: 0.06 });
      return;
    }
    if (notesMode) {
      if (vals[i]) return;
      pushHistory();
      notes[i] ^= BIT(d);
      sfx.tone({ freq: notes[i] & BIT(d) ? 880 : 620, type: 'sine', dur: 0.05, vol: 0.08 });
      return;
    }
    if (vals[i] === d) return;
    if (d === sol[i]) placeCorrect(i, d, false);
    else placeWrong(i, d);
  }

  function placeCorrect(i, d, isHint) {
    vals[i] = d;
    notes[i] = 0;
    if (isHint) hinted[i] = 1;
    for (const p of PEERS[i]) notes[p] &= ~BIT(d);
    popT[i] = 0;
    recomputeConflicts();
    const c = cellCenter(i);
    fx.burst(c.x, c.y, { count: isHint ? 16 : 7, colors: isHint ? ['#ffd23f', '#ffb000', '#fff'] : ['#2c63ff', '#7aa7ff', '#ffffff'], speed: 150, size: 3.5, life: 0.45, gravity: 0 });
    api.haptic(8);
    // unit completions
    const units = [ROW[i], 9 + COL[i], 18 + BOX[i]];
    let completed = 0;
    for (const u of units) {
      if (UNITS[u].every(isCorrect)) {
        completed += 1;
        sweepUnit(u, i);
      }
    }
    // digit completion
    const digitDone = remaining(d) === 0;
    if (digitDone) padGlow[d] = 0;
    // win?
    let all = true;
    for (let k = 0; k < 81 && all; k++) if (!isCorrect(k)) all = false;
    if (all) return win(i);
    if (completed >= 2) {
      sfx.play('perfect');
      fx.text(c.x, c.y - 30, completed === 3 ? 'TRIPLE!' : 'DOUBLE!', { size: 26, color: '#2c63ff', life: 0.9 });
    } else if (completed === 1) sfx.play('score');
    else sfx.play(isHint ? 'coin' : 'pop');
    if (digitDone) {
      sfx.play('coin');
      const x = GX + (d - 1) * (PAD_W + PAD_GAP) + PAD_W / 2;
      fx.burst(x, PAD_Y + PAD_H / 2, { count: 14, colors: ['#2c63ff', '#7aa7ff', '#ffffff'], speed: 200, size: 4, life: 0.5, gravity: 200 });
    }
  }

  function placeWrong(i, d) {
    pushHistory();
    vals[i] = d;
    notes[i] = 0;
    shakeT[i] = 0;
    mistakes += 1;
    mistakePulse = 1;
    recomputeConflicts();
    sfx.play('error');
    api.haptic(40);
    fx.shake(5, 0.2);
    const c = cellCenter(i);
    fx.text(c.x, c.y - 26, mistakes >= MAX_MISTAKES ? 'OUT OF CHANCES' : `MISTAKE ${mistakes}/${MAX_MISTAKES}`, { size: 20, color: '#ff5470', life: 0.9, rise: 40 });
    if (mistakes >= MAX_MISTAKES) lose();
  }

  function erase() {
    toolPress[1] = 0;
    if (done || sel < 0) return;
    const i = sel;
    if (given[i] || isCorrect(i)) {
      sfx.tone({ freq: 300, type: 'triangle', dur: 0.05, vol: 0.06 });
      return;
    }
    if (!vals[i] && !notes[i]) return;
    pushHistory();
    vals[i] = 0;
    notes[i] = 0;
    recomputeConflicts();
    sfx.tone({ freq: 500, to: 260, type: 'sine', dur: 0.08, vol: 0.1 });
  }

  function undo() {
    toolPress[0] = 0;
    if (done) return;
    const snap = history.pop();
    if (!snap) {
      sfx.tone({ freq: 220, type: 'triangle', dur: 0.06, vol: 0.06 });
      showToast('Nothing to undo', C.dim, 1.2);
      return;
    }
    for (let i = 0; i < 81; i++) {
      if (!isCorrect(i)) vals[i] = snap.vals[i];
      notes[i] = snap.notes[i];
    }
    cleanNotes(snap.vals);
    recomputeConflicts();
    sfx.play('whoosh');
  }

  function toggleNotes() {
    toolPress[2] = 0;
    if (done) return;
    notesMode = !notesMode;
    sfx.tone({ freq: notesMode ? 700 : 500, to: notesMode ? 900 : 380, type: 'sine', dur: 0.08, vol: 0.1 });
  }

  function hint() {
    toolPress[3] = 0;
    if (done) return;
    if (hintsLeft <= 0) {
      sfx.play('error');
      showToast('No hints left', '#ff8fa3', 1.4);
      return;
    }
    let target = -1;
    if (sel >= 0 && !given[sel] && !isCorrect(sel)) target = sel;
    else {
      // reveal the most constrained open cell (fewest candidates given correct digits)
      let bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (isCorrect(i)) continue;
        let m = ALL;
        for (const p of PEERS[i]) if (isCorrect(p)) m &= ~BIT(vals[p]);
        const n = POP[m];
        if (n < bestN) {
          bestN = n;
          target = i;
        }
      }
    }
    if (target < 0) return;
    hintsLeft -= 1;
    hintsUsed += 1;
    sel = target;
    const c = cellCenter(target);
    fx.ring(c.x, c.y, { color: '#ffd23f', radius: 44, life: 0.45, width: 4 });
    placeCorrect(target, sol[target], true);
  }

  function win(last) {
    done = true;
    won = true;
    const secs = Math.max(1, Math.round(elapsed));
    api.setScore(secs);
    // gold wave radiating from the last cell
    const r0 = ROW[last];
    const c0 = COL[last];
    for (let i = 0; i < 81; i++) {
      sweepT[i] = -Math.hypot(ROW[i] - r0, COL[i] - c0) * 0.05;
      sweepGold[i] = 1;
    }
    if (!api.daily) {
      const prev = api.store.get(bestKey(diff), null);
      if (prev == null || secs < prev) api.store.set(bestKey(diff), secs);
    }
    sfx.play('win');
    api.happy();
    fx.confetti(W * 0.25, GY + GS * 0.3, 60);
    fx.confetti(W * 0.75, GY + GS * 0.3, 60);
    confettiT = 0.35;
    const label = api.daily ? 'Daily Sudoku' : `Sudoku ${DIFFICULTY[diff].label}`;
    const squares = '🟩'.repeat(MAX_MISTAKES - mistakes) + '🟥'.repeat(mistakes);
    const share = `${squares} ${label} ${formatTime(secs, false)}${hintsUsed ? ` · 💡${hintsUsed}` : ''}`;
    api.emit('milestone', { solved: diff, seconds: secs });
    api.gameOver({ win: true, delay: 2300, stats: { difficulty: diff, rankable: diff === 'medium', mistakes, hints: hintsUsed, shareText: share } });
  }

  function lose() {
    done = true;
    won = false;
    api.setScore(Math.max(1, Math.round(elapsed)));
    sfx.play('die');
    fx.shake(10, 0.4);
    fx.flash('#ff3355', 0.25);
    let solved = 0;
    let open = 0;
    for (let i = 0; i < 81; i++) {
      if (given[i]) continue;
      open++;
      if (isCorrect(i)) solved++;
    }
    const pct = open ? Math.round((solved / open) * 100) : 0;
    const label = api.daily ? 'Daily Sudoku' : `Sudoku ${DIFFICULTY[diff].label}`;
    api.gameOver({ win: false, delay: 1500, stats: { difficulty: diff, mistakes, hints: hintsUsed, shareText: `🟥🟥🟥 ${label} · ${pct}% solved` } });
  }

  function chooseDifficulty(d) {
    if (api.daily) {
      showToast('Daily Challenge is always Medium', C.dim, 1.6);
      sfx.play('click');
      return;
    }
    if (d === diff) return;
    let progress = history.length > 0 || elapsed > 30;
    for (let i = 0; i < 81 && !progress; i++) if (!given[i] && vals[i]) progress = true;
    if (progress && !(armed && armed.diff === d)) {
      armed = { diff: d, t: 0 };
      showToast(`Tap ${DIFFICULTY[d].label} again for a new puzzle`, '#ffffff', 2.4);
      sfx.play('click');
      return;
    }
    api.store.set('difficulty', d);
    newPuzzle(d);
    toast = null;
    sfx.play('whoosh');
    sfx.play('levelup');
  }

  function moveSel(dr, dc) {
    if (sel < 0) sel = 40;
    else {
      const r = (ROW[sel] + dr + 9) % 9;
      const c = (COL[sel] + dc + 9) % 9;
      sel = r * 9 + c;
    }
    sfx.tone({ freq: 760, type: 'sine', dur: 0.025, vol: 0.05 });
  }

  // ---------- hit testing ----------
  function tabAt(x, y) {
    if (y < TAB_Y - 4 || y > TAB_Y + TAB_H + 4) return -1;
    for (let k = 0; k < 3; k++) {
      const x0 = 20 + k * (TAB_W + TAB_GAP);
      if (x >= x0 - 3 && x <= x0 + TAB_W + 3) return k;
    }
    return -1;
  }

  function onDown(x, y) {
    if (!puzzle) return;
    const tab = tabAt(x, y);
    if (tab >= 0) return chooseDifficulty(DIFFS[tab]);
    if (done) return;
    if (x >= GX && x < GX + GS && y >= GY && y < GY + GS) {
      const c = Math.min(8, Math.floor((x - GX) / CS));
      const r = Math.min(8, Math.floor((y - GY) / CS));
      sel = r * 9 + c;
      sfx.tone({ freq: 700, type: 'sine', dur: 0.03, vol: 0.06 });
      return;
    }
    if (y >= TOOL_Y && y <= TOOL_Y + TOOL_H) {
      const k = Math.floor((x - GX) / (TOOL_W + 10));
      if (k === 0) undo();
      else if (k === 1) erase();
      else if (k === 2) toggleNotes();
      else if (k === 3) hint();
      return;
    }
    if (y >= PAD_Y - 4 && y <= PAD_Y + PAD_H + 4 && x >= GX - 4 && x <= GX + GS + 4) {
      const k = Math.max(0, Math.min(8, Math.floor((x - GX + PAD_GAP / 2) / (PAD_W + PAD_GAP))));
      enter(k + 1);
    }
  }

  // ---------- update ----------
  function step(dt) {
    t += dt;
    introT += dt;
    for (let i = 0; i < 81; i++) {
      if (popT[i] < 9) popT[i] += dt;
      if (shakeT[i] < 9) shakeT[i] += dt;
      if (sweepT[i] > -9) {
        sweepT[i] += dt;
        if (sweepT[i] > 0.6) sweepT[i] = -9;
      }
    }
    for (let d = 1; d <= 9; d++) {
      if (padGlow[d] < 9) padGlow[d] += dt;
      if (padPress[d] < 9) padPress[d] += dt;
    }
    for (let k = 0; k < 4; k++) if (toolPress[k] < 9) toolPress[k] += dt;
    if (armed) {
      armed.t += dt;
      if (armed.t > 2.6) armed = null;
    }
    if (toast) {
      toast.t += dt;
      if (toast.t > toast.dur) toast = null;
    }
    mistakePulse = Math.max(0, mistakePulse - dt * 2);
    if (confettiT > 0) {
      confettiT -= dt;
      if (confettiT <= 0) fx.confetti(W / 2, GY + GS * 0.2, 70);
    }
  }

  // ---------- render ----------
  function renderTabs(g) {
    if (api.daily) {
      roundRect(g, 20, TAB_Y, 340, TAB_H, 19, 'rgba(34,211,238,0.14)', 'rgba(34,211,238,0.45)', 1.5);
      drawText(g, 'DAILY CHALLENGE  ·  MEDIUM', 190, TAB_Y + TAB_H / 2 + 1, { size: 16, weight: 800, color: '#7ff0ff', shadow: false });
      return;
    }
    for (let k = 0; k < 3; k++) {
      const d = DIFFS[k];
      const x = 20 + k * (TAB_W + TAB_GAP);
      const on = d === diff;
      const isArmed = armed && armed.diff === d;
      const pulse = isArmed ? 0.5 + 0.5 * Math.sin(t * 10) : 0;
      roundRect(g, x, TAB_Y, TAB_W, TAB_H, 19, on ? '#2c63ff' : isArmed ? `rgba(44,99,255,${0.25 + pulse * 0.3})` : 'rgba(255,255,255,0.07)', on ? null : 'rgba(255,255,255,0.14)', 1.5);
      drawText(g, DIFFICULTY[d].label, x + TAB_W / 2, TAB_Y + TAB_H / 2 + 1, { size: 17, weight: 800, color: on ? '#ffffff' : C.ink, shadow: false });
    }
  }

  function renderStatus(g) {
    const y = 79;
    // mistakes
    drawText(g, 'MISTAKES', 20, y, { size: 13, weight: 800, color: C.dim, align: 'left', shadow: false });
    for (let k = 0; k < MAX_MISTAKES; k++) {
      const x = 116 + k * 21;
      const used = k < mistakes;
      const s = used && k === mistakes - 1 ? 1 + mistakePulse * 0.6 : 1;
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      g.strokeStyle = used ? '#ff4d6d' : 'rgba(223,229,255,0.28)';
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-6, -6);
      g.lineTo(6, 6);
      g.moveTo(6, -6);
      g.lineTo(-6, 6);
      g.stroke();
      g.restore();
    }
    // timer
    iconClock(g, 212, y, 9, C.dim);
    drawText(g, formatTime(elapsed), 228, y + 1, { size: 24, weight: 800, color: '#ffffff', align: 'left', shadow: false });
    // best / target
    if (api.target != null) {
      drawText(g, `BEAT ${formatTime(api.target)}`, W - 20, y, { size: 15, weight: 800, color: '#ffd23f', align: 'right', shadow: false });
    } else {
      const b = bestFor(diff);
      drawText(g, `BEST ${b != null ? formatTime(b) : '--:--'}`, W - 20, y, { size: 15, weight: 800, color: '#ffe89a', align: 'right', shadow: false });
    }
  }

  function renderGrid(g) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.4)';
    g.shadowBlur = 24;
    g.shadowOffsetY = 6;
    roundRect(g, GX - 3, GY - 3, GS + 6, GS + 6, 12, C.board);
    g.restore();
    const sv = sel >= 0 ? vals[sel] : 0;
    const selOk = sel >= 0;
    // cell backgrounds
    for (let i = 0; i < 81; i++) {
      let bg = null;
      if (i === sel) bg = C.sel;
      else if (isWrong(i)) bg = C.wrongBg;
      else if (conflict[i]) bg = C.conflict;
      else if (sv && vals[i] === sv && (isCorrect(sel) || given[sel])) bg = C.same;
      else if (selOk && (ROW[i] === ROW[sel] || COL[i] === COL[sel] || BOX[i] === BOX[sel])) bg = C.peer;
      if (bg) {
        g.fillStyle = bg;
        g.fillRect(GX + COL[i] * CS, GY + ROW[i] * CS, CS, CS);
      }
      const sw = sweepT[i];
      if (sw >= 0 && sw <= 0.6) {
        const k = sw / 0.6;
        g.globalAlpha = Math.sin(k * Math.PI) * (sweepGold[i] ? 0.75 : 0.6);
        g.fillStyle = sweepGold[i] ? '#ffd23f' : '#7aa7ff';
        g.fillRect(GX + COL[i] * CS, GY + ROW[i] * CS, CS, CS);
        g.globalAlpha = 1;
      }
    }
    // thin lines
    g.strokeStyle = C.thin;
    g.lineWidth = 1;
    g.beginPath();
    for (let k = 1; k < 9; k++) {
      if (k % 3 === 0) continue;
      g.moveTo(GX + k * CS + 0.5, GY);
      g.lineTo(GX + k * CS + 0.5, GY + GS);
      g.moveTo(GX, GY + k * CS + 0.5);
      g.lineTo(GX + GS, GY + k * CS + 0.5);
    }
    g.stroke();
    // thick lines
    g.strokeStyle = C.thick;
    g.lineWidth = 2.5;
    g.beginPath();
    for (let k = 3; k < 9; k += 3) {
      g.moveTo(GX + k * CS, GY);
      g.lineTo(GX + k * CS, GY + GS);
      g.moveTo(GX, GY + k * CS);
      g.lineTo(GX + GS, GY + k * CS);
    }
    g.stroke();
    roundRect(g, GX - 1.5, GY - 1.5, GS + 3, GS + 3, 10, null, C.thick, 3);
    // selection outline
    if (sel >= 0) {
      g.strokeStyle = C.user;
      g.lineWidth = 2.5;
      g.strokeRect(GX + COL[sel] * CS + 1.5, GY + ROW[sel] * CS + 1.5, CS - 3, CS - 3);
    }
    // digits
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < 81; i++) {
      const cx = GX + COL[i] * CS + CS / 2;
      const cy = GY + ROW[i] * CS + CS / 2 + 1;
      const v = vals[i];
      if (v) {
        let scale = 1;
        let ox = 0;
        let alpha = 1;
        if (given[i]) {
          const d = (ROW[i] + COL[i]) * 0.025;
          const k = Math.max(0, Math.min(1, (introT - d) / 0.25));
          scale = k < 1 ? ease.outBack(k) : 1;
          alpha = Math.min(1, k * 2);
        }
        if (popT[i] < 0.3) scale = 1 + 0.4 * (1 - ease.outBack(popT[i] / 0.3));
        if (shakeT[i] < 0.4) ox = Math.sin(shakeT[i] * 55) * 5 * (1 - shakeT[i] / 0.4);
        const sw = sweepT[i];
        if (sw >= 0 && sw <= 0.6) scale *= 1 + 0.18 * Math.sin((sw / 0.6) * Math.PI);
        if (scale <= 0.01) continue;
        g.globalAlpha = alpha;
        g.fillStyle = given[i] ? C.given : isWrong(i) ? C.wrong : hinted[i] ? C.hint : C.user;
        g.font = scale === 1 ? (given[i] ? FONT_GIVEN : FONT_USER) : `${given[i] ? 700 : 600} ${Math.round(30 * scale)}px ${FONT}`;
        g.fillText(String(v), cx + ox, cy);
        g.globalAlpha = 1;
      } else if (notes[i]) {
        g.font = `700 13px ${FONT}`;
        for (let d = 1; d <= 9; d++) {
          if (!(notes[i] & BIT(d))) continue;
          const nx = cx + (((d - 1) % 3) - 1) * 15;
          const ny = cy + (((d - 1) / 3) | 0) * 15 - 15;
          if (sv === d && (isCorrect(sel) || given[sel])) {
            g.fillStyle = C.user;
            g.beginPath();
            g.arc(nx, ny, 7, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#ffffff';
          } else g.fillStyle = C.note;
          g.fillText(String(d), nx, ny + 0.5);
        }
      }
    }
  }

  function renderTools(g) {
    const labels = ['Undo', 'Erase', 'Notes', 'Hint'];
    for (let k = 0; k < 4; k++) {
      const x = GX + k * (TOOL_W + 10);
      const press = toolPress[k] < 0.15 ? 1 - toolPress[k] / 0.15 : 0;
      const on = k === 2 && notesMode;
      g.save();
      g.translate(x + TOOL_W / 2, TOOL_Y + TOOL_H / 2);
      g.scale(1 - press * 0.08, 1 - press * 0.08);
      roundRect(g, -TOOL_W / 2, -TOOL_H / 2, TOOL_W, TOOL_H, 16, on ? 'rgba(44,99,255,0.9)' : 'rgba(255,255,255,0.07)', on ? null : 'rgba(255,255,255,0.12)', 1.5);
      const ic = on ? '#ffffff' : C.ink;
      if (k === 0) iconUndo(g, 0, -8, ic);
      else if (k === 1) iconErase(g, 0, -8, ic);
      else if (k === 2) iconPencil(g, 0, -8, ic);
      else iconBulb(g, 0, -10, hintsLeft ? '#ffd23f' : 'rgba(223,229,255,0.35)');
      drawText(g, labels[k], 0, 17, { size: 13, weight: 800, color: on ? '#ffffff' : C.dim, shadow: false });
      if (k === 2) {
        roundRect(g, 22, -25, 30, 16, 8, on ? '#ffffff' : 'rgba(255,255,255,0.14)');
        drawText(g, on ? 'ON' : 'OFF', 37, -16.5, { size: 10, weight: 800, color: on ? '#2c63ff' : C.dim, shadow: false });
      }
      if (k === 3) {
        g.fillStyle = hintsLeft ? '#ff4d6d' : 'rgba(255,255,255,0.2)';
        g.beginPath();
        g.arc(30, -18, 10, 0, Math.PI * 2);
        g.fill();
        drawText(g, hintsLeft, 30, -17.5, { size: 12, weight: 800, color: '#ffffff', shadow: false });
      }
      g.restore();
    }
  }

  function renderPad(g) {
    for (let d = 1; d <= 9; d++) {
      const x = GX + (d - 1) * (PAD_W + PAD_GAP);
      const rem = remaining(d);
      const press = padPress[d] < 0.15 ? 1 - padPress[d] / 0.15 : 0;
      const glow = padGlow[d] < 0.8 ? 1 - padGlow[d] / 0.8 : 0;
      const doneDigit = rem === 0;
      g.save();
      g.translate(x + PAD_W / 2, PAD_Y + PAD_H / 2);
      const s = 1 - press * 0.08 + glow * 0.12;
      g.scale(s, s);
      roundRect(g, -PAD_W / 2, -PAD_H / 2, PAD_W, PAD_H, 12, doneDigit ? 'rgba(255,255,255,0.08)' : '#eef2ff');
      if (glow > 0) roundRect(g, -PAD_W / 2, -PAD_H / 2, PAD_W, PAD_H, 12, null, `rgba(122,167,255,${glow})`, 4);
      if (notesMode && !doneDigit) {
        drawText(g, d, 0, -8, { size: 30, weight: 700, color: '#6f78a0', shadow: false });
      } else drawText(g, d, 0, -8, { size: 36, weight: 700, color: doneDigit ? 'rgba(223,229,255,0.3)' : C.user, shadow: false });
      if (doneDigit) {
        g.strokeStyle = '#35d77f';
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(-7, 26);
        g.lineTo(-2, 31);
        g.lineTo(8, 20);
        g.stroke();
      } else drawText(g, rem, 0, 28, { size: 13, weight: 800, color: '#8b93b8', shadow: false });
      g.restore();
    }
  }

  function renderToast(g) {
    if (!toast) return;
    const k = toast.t / toast.dur;
    const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
    g.save();
    g.globalAlpha = Math.max(0, a);
    g.font = `800 15px ${FONT}`;
    const w = g.measureText(toast.msg).width + 36;
    roundRect(g, W / 2 - w / 2, 64, w, 30, 15, 'rgba(10,14,40,0.95)', 'rgba(255,255,255,0.2)', 1.5);
    drawText(g, toast.msg, W / 2, 79.5, { size: 15, weight: 800, color: toast.color, shadow: false });
    g.restore();
  }

  function renderWin(g) {
    if (!won) return;
    const k = Math.min(1, Math.max(0, (t - winAt) / 0.4));
    if (k <= 0) return;
    g.globalAlpha = k * 0.9;
    roundRect(g, GX + 50, GY + GS / 2 - 62, GS - 100, 124, 22, 'rgba(10,14,40,0.9)');
    g.globalAlpha = k;
    const s = ease.outBack(k);
    g.save();
    g.translate(W / 2, GY + GS / 2 - 18);
    g.scale(s, s);
    drawText(g, 'SOLVED!', 0, 0, { size: 44, weight: 800, color: '#ffd23f', shadow: 'rgba(0,0,0,0.5)' });
    g.restore();
    drawText(g, `${DIFFICULTY[diff].label} in ${formatTime(Math.round(elapsed))}`, W / 2, GY + GS / 2 + 32, { size: 19, weight: 700, color: '#ffffff', shadow: false });
    g.globalAlpha = 1;
  }

  return {
    hud: false,
    reset,
    update(dt) {
      if (!done) elapsed += dt;
      step(dt);
    },
    idle: step,
    input(e) {
      if (!puzzle) return false;
      if (e.type === 'down') {
        onDown(e.x, e.y);
        return true;
      }
      if (e.type === 'keydown') {
        const k = e.key;
        if (k >= '1' && k <= '9' && k.length === 1) {
          if (!done) enter(Number(k));
          return true;
        }
        if (done) return false;
        if (k === 'Backspace' || k === 'Delete' || k === '0') {
          erase();
          return true;
        }
        if (k === 'ArrowUp' || k === 'w' || k === 'W') moveSel(-1, 0);
        else if (k === 'ArrowDown' || k === 's' || k === 'S') moveSel(1, 0);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') moveSel(0, -1);
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') moveSel(0, 1);
        else if (k === 'n' || k === 'N' || k === 'p' || k === 'P') toggleNotes();
        else if (k === 'h' || k === 'H') hint();
        else if (k === 'u' || k === 'U' || k === 'z' || k === 'Z') undo();
        else return false;
        return true;
      }
      return e.type === 'move' || e.type === 'up';
    },
    revive() {
      // One more chance: back to 2 mistakes, wrong digits removed, timer keeps running.
      mistakes = MAX_MISTAKES - 1;
      for (let i = 0; i < 81; i++) if (isWrong(i)) vals[i] = 0;
      recomputeConflicts();
      done = false;
      won = false;
      mistakePulse = 1;
      sfx.play('whoosh');
      showToast('One more chance! Careful now.', '#7ff0ff', 2.2);
    },
    render(g) {
      if (!puzzle) reset();
      if (won && winAt === 0) winAt = t;
      if (!won) winAt = 0;
      if (!bgGrad) {
        bgGrad = g.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#1a2352');
        bgGrad.addColorStop(1, '#0a0f2c');
      }
      g.fillStyle = bgGrad;
      g.fillRect(0, 0, W, H);
      renderTabs(g);
      renderStatus(g);
      renderGrid(g);
      renderTools(g);
      renderPad(g);
      renderToast(g);
      renderWin(g);
    },
    /** Test hook: read-only snapshot (not used by the engine). */
    debug() {
      return {
        diff,
        puzzle: puzzle.slice(),
        solution: sol.slice(),
        vals: Array.from(vals),
        notes: Array.from(notes),
        mistakes,
        hintsLeft,
        elapsed,
        done,
        won,
        sel,
        notesMode,
        genMs,
      };
    },
  };
}

/** Cover art: a tilted paper grid with a glowing solved row and floating number keys. */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1f2a63');
  grad.addColorStop(1, '#090d28');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = Math.min(w / 800, h / 600);
  const rg = g.createRadialGradient(w * 0.45, h * 0.5, 10, w * 0.45, h * 0.5, Math.max(w, h) * 0.6);
  rg.addColorStop(0, 'rgba(90,140,255,0.45)');
  rg.addColorStop(1, 'rgba(90,140,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  const grid = [
    '534678912',
    '672195348',
    '198342567',
    '859761423',
    '426853791',
    '713924856',
    '961537284',
    '287419635',
    '345286179',
  ];
  const show = [
    '53..7....',
    '6..195...',
    '.98....6.',
    '8...6...3',
    '426853791',
    '7...2...6',
    '.6....28.',
    '...419..5',
    '....8..79',
  ];
  const cs = 52 * s;
  const gs = cs * 9;
  g.save();
  g.translate(w / 2 - (w > h * 1.5 ? 120 : 30) * s, h / 2 + 20 * s);
  g.rotate(-0.16);
  g.shadowColor = 'rgba(0,0,0,0.55)';
  g.shadowBlur = 50 * s;
  g.shadowOffsetY = 16 * s;
  roundRect(g, -gs / 2 - 4 * s, -gs / 2 - 4 * s, gs + 8 * s, gs + 8 * s, 16 * s, '#f6f8ff');
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
  g.shadowColor = 'rgba(0,0,0,0)';
  const x0 = -gs / 2;
  const y0 = -gs / 2;
  // highlights: selected cell's column + box, solved row glowing gold
  const selR = 6;
  const selC = 2;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let bg = null;
      if (r === 4) bg = '#ffe27a';
      else if (r === selR && c === selC) bg = '#a9c1ff';
      else if (c === selC || (Math.floor(r / 3) === 2 && Math.floor(c / 3) === 0)) bg = '#e2e9ff';
      if (bg) {
        g.fillStyle = bg;
        g.fillRect(x0 + c * cs, y0 + r * cs, cs, cs);
      }
    }
  }
  g.strokeStyle = '#cfd5ec';
  g.lineWidth = 1 * s;
  g.beginPath();
  for (let k = 1; k < 9; k++) {
    g.moveTo(x0 + k * cs, y0);
    g.lineTo(x0 + k * cs, y0 + gs);
    g.moveTo(x0, y0 + k * cs);
    g.lineTo(x0 + gs, y0 + k * cs);
  }
  g.stroke();
  g.strokeStyle = '#1a2150';
  g.lineWidth = 3 * s;
  g.beginPath();
  for (let k = 3; k < 9; k += 3) {
    g.moveTo(x0 + k * cs, y0);
    g.lineTo(x0 + k * cs, y0 + gs);
    g.moveTo(x0, y0 + k * cs);
    g.lineTo(x0 + gs, y0 + k * cs);
  }
  g.stroke();
  roundRect(g, x0 - 2 * s, y0 - 2 * s, gs + 4 * s, gs + 4 * s, 12 * s, null, '#1a2150', 4 * s);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const ch = show[r][c];
      const cx = x0 + c * cs + cs / 2;
      const cy = y0 + r * cs + cs / 2 + 1 * s;
      if (ch !== '.') {
        g.fillStyle = r === 4 ? '#8a5200' : r === 7 && c > 2 && c < 6 ? '#2c63ff' : '#1a2150';
        g.font = `700 ${Math.round(31 * s)}px ${FONT}`;
        g.fillText(ch, cx, cy);
      } else if ((r * 7 + c * 3) % 5 === 0) {
        // pencil notes
        g.fillStyle = '#6f78a0';
        g.font = `700 ${Math.round(12 * s)}px ${FONT}`;
        const d = Number(grid[r][c]);
        const alt = (d % 9) + 1;
        [d, alt].forEach((n) => g.fillText(String(n), cx + (((n - 1) % 3) - 1) * 14 * s, cy + (((n - 1) / 3) | 0) * 14 * s - 14 * s));
      }
    }
  }
  g.strokeStyle = '#2c63ff';
  g.lineWidth = 3.5 * s;
  g.strokeRect(x0 + selC * cs + 2 * s, y0 + selR * cs + 2 * s, cs - 4 * s, cs - 4 * s);
  g.restore();
  // floating number keys
  const keys = [
    [0.86, 0.22, 7, 0.18],
    [0.9, 0.62, 3, -0.12],
    [0.1, 0.18, 9, -0.2],
    [0.08, 0.8, 4, 0.16],
    [0.72, 0.86, 1, 0.1],
  ];
  for (const [kx, ky, d, rot] of keys) {
    if (w < h * 1.5 && (kx === 0.72 || kx === 0.9)) continue;
    const size = 70 * s;
    g.save();
    g.translate(w * kx, h * ky);
    g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,0.4)';
    g.shadowBlur = 20 * s;
    roundRect(g, -size / 2, -size * 0.6, size, size * 1.2, 14 * s, '#eef2ff');
    g.shadowBlur = 0;
    g.shadowColor = 'rgba(0,0,0,0)';
    g.fillStyle = '#2c63ff';
    g.font = `700 ${Math.round(44 * s)}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(d), 0, 2 * s);
    g.restore();
  }
  // sparkles
  for (let i = 0; i < 16; i++) {
    const x = (i * 211.7) % w;
    const y = (i * 131.3 + 30) % h;
    const r = (2 + (i % 3)) * s;
    g.fillStyle = i % 3 ? 'rgba(255,255,255,0.7)' : 'rgba(255,210,63,0.9)';
    g.beginPath();
    g.moveTo(x, y - r * 2.5);
    g.lineTo(x + r * 0.5, y);
    g.lineTo(x, y + r * 2.5);
    g.lineTo(x - r * 0.5, y);
    g.closePath();
    g.fill();
  }
}
