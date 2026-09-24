// Wordy - guess the hidden 5-letter word in 6 tries.
// Daily mode: one shared answer per UTC day (#1 = 2026-09-24). Classic: unlimited random words.
import { getAnswers, getValid } from './words.js';
import { scoreGuess, dailyAnswer, puzzleNumber, msUntilNextUtcDay, shareText, CORRECT, PRESENT, ABSENT } from './logic.js';

const C = {
  bg: '#15122a',
  bg2: '#1d1838',
  line: '#2c2647',
  text: '#f5f2ff',
  dim: '#a39cc4',
  empty: '#39334f',
  filled: '#8a82ad',
  tileFill: '#1b1733',
  green: '#35b25b',
  yellow: '#e2b12f',
  gray: '#3d3853',
  key: '#554e76',
  keyAbsent: '#27223d',
  keyAbsentText: '#7d7799',
  toastBg: '#f5f2ff',
  toastText: '#15122a',
  pink: '#ff3d7f',
};
const EVAL_COLOR = [C.gray, C.yellow, C.green];
const KEY_COLOR = [C.keyAbsent, C.yellow, C.green];

const WORD_LEN = 5;
const BASE_ROWS = 6;
const FLIP_STAGGER = 0.26;
const FLIP_DUR = 0.46;
const REVEAL_TIME = FLIP_STAGGER * (WORD_LEN - 1) + FLIP_DUR;
const BOUNCE_STAGGER = 0.09;
const BOUNCE_DUR = 0.5;
const SHAKE_DUR = 0.45;
const PRAISE = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!', 'Clutch!'];
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-']; // + = Enter, - = Backspace

function blankStats() {
  return { played: 0, wins: 0, cur: 0, max: 0, dist: [0, 0, 0, 0, 0, 0, 0], lastWin: null };
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const { draw, sfx, fx } = api;
  const answers = getAnswers();
  const valid = getValid();

  // ---------- layout ----------
  const HEADER_H = 64;
  const KEY_H = 54;
  const KEY_GAP = 6;
  const KEY_ROW_GAP = 8;
  const KB_SIDE = 6;
  const KB_TOP = H - 14 - (KEY_H * 3 + KEY_ROW_GAP * 2);
  const GRID_TOP = HEADER_H + 10;
  const GRID_BOTTOM = KB_TOP - 14;
  const TILE_GAP = 6;

  const keys = [];
  (function buildKeyboard() {
    const kw = (W - KB_SIDE * 2 - KEY_GAP * 9) / 10;
    const wide = kw * 1.5 + KEY_GAP * 0.5;
    KB_ROWS.forEach((row, r) => {
      const widths = [...row].map((ch) => (ch === '+' || ch === '-' ? wide : kw));
      const total = widths.reduce((a, b) => a + b, 0) + KEY_GAP * (row.length - 1);
      let x = (W - total) / 2;
      const y = KB_TOP + r * (KEY_H + KEY_ROW_GAP);
      [...row].forEach((ch, i) => {
        const key = ch === '+' ? 'Enter' : ch === '-' ? 'Backspace' : ch;
        keys.push({ ch, key, x, y, w: widths[i], h: KEY_H });
        x += widths[i] + KEY_GAP;
      });
    });
  })();

  const statsBtn = { x: 12, y: 14, w: 40, h: 36 };

  // ---------- state ----------
  let answer = 'crane';
  let rows = [];
  let rowIdx = 0;
  let cur = '';
  let maxRows = BASE_ROWS;
  let rowsAnim = BASE_ROWS; // eased row count for the grid layout (revive adds a 7th row)
  let phase = 'input'; // input | reveal | done
  let won = false;
  let extraUsed = false;
  let answerShown = false;
  let restoredDone = false;
  let keyState = new Array(26).fill(-1);
  let t = 0;
  let toast = null;
  let panel = { show: false, t0: 0, kind: 'stats' };
  let pressed = null;
  let keyFlash = { key: null, t: -9 };
  let stats = blankStats();
  let statsSnapshot = null;
  let lastShare = '';
  let pendingReveal = null; // answer of a lost classic round to show at the next start
  let dayNo = 1;
  let shareBtn = null;

  const statsKey = () => (api.daily ? 'stats:daily' : 'stats:classic');

  function newRow() {
    return { word: '', ev: null, revealAt: -99, shakeAt: -99, bounceAt: -99, pop: [-9, -9, -9, -9, -9], sounded: 0, appearAt: -99 };
  }

  function loadStats() {
    const s = api.store.get(statsKey(), null);
    const b = blankStats();
    if (!s || typeof s !== 'object') return b;
    return { ...b, ...s, dist: Array.isArray(s.dist) ? [...s.dist, 0, 0, 0, 0, 0, 0, 0].slice(0, 7) : b.dist };
  }

  function shownStreak() {
    if (!api.daily) return stats.cur;
    if (stats.lastWin == null) return 0;
    return stats.lastWin >= dayNo - 1 ? stats.cur : 0;
  }

  function recordResult(win, n) {
    const s = loadStats();
    statsSnapshot = JSON.parse(JSON.stringify(s));
    s.played += 1;
    if (win) {
      s.wins += 1;
      s.dist[Math.min(7, n) - 1] += 1;
      if (api.daily) {
        s.cur = s.lastWin === dayNo - 1 ? s.cur + 1 : 1;
        s.lastWin = dayNo;
      } else s.cur += 1;
      s.max = Math.max(s.max, s.cur);
    } else {
      s.cur = 0;
    }
    api.store.set(statsKey(), s);
    stats = s;
  }

  function label() {
    return api.daily ? `#${dayNo}` : 'Classic';
  }

  function evals() {
    const out = [];
    for (const r of rows) if (r.ev) out.push(r.ev);
    return out;
  }

  function buildShare(solved) {
    lastShare = shareText(label(), evals(), solved, maxRows);
    return lastShare;
  }

  function saveDaily() {
    if (!api.daily) return;
    const guesses = [];
    for (const r of rows) if (r.ev) guesses.push(r.word);
    api.store.set('daily', { day: dayNo, answer, guesses, extra: extraUsed, done: phase === 'done', win: won });
  }

  function applyKeys(word, ev) {
    for (let i = 0; i < WORD_LEN; i++) {
      const k = word.charCodeAt(i) - 97;
      if (ev[i] > keyState[k]) keyState[k] = ev[i];
    }
  }

  function showToast(text, dur = 1.4, big = false) {
    toast = { text, t0: t, dur, big };
  }

  function pickClassicAnswer() {
    const recent = api.store.get('recent', []);
    let w = api.rng.pick(answers);
    for (let i = 0; i < 8 && recent.includes(w); i++) w = api.rng.pick(answers);
    recent.push(w);
    while (recent.length > 60) recent.shift();
    api.store.set('recent', recent);
    return w;
  }

  function reset() {
    t = 0;
    rows = [];
    for (let i = 0; i < BASE_ROWS + 1; i++) rows.push(newRow());
    rowIdx = 0;
    cur = '';
    maxRows = BASE_ROWS;
    rowsAnim = BASE_ROWS;
    phase = 'input';
    won = false;
    extraUsed = false;
    answerShown = false;
    restoredDone = false;
    keyState = new Array(26).fill(-1);
    toast = null;
    panel = { show: false, t0: 0, kind: 'stats' };
    pressed = null;
    statsSnapshot = null;
    lastShare = '';
    shareBtn = null;
    stats = loadStats();
    const now = new Date();
    dayNo = puzzleNumber(now);
    if (api.daily) {
      answer = dailyAnswer(answers, now);
      restoreDaily();
    } else {
      answer = pickClassicAnswer();
    }
    if (pendingReveal) {
      showToast(`Last word: ${pendingReveal.toUpperCase()}`, 3);
      pendingReveal = null;
    } else if (!restoredDone && rowIdx === 0 && stats.played === 0) {
      showToast('Guess the 5-letter word in 6 tries', 3.2);
    }
  }

  function restoreDaily() {
    const saved = api.store.get('daily', null);
    if (!saved || saved.day !== dayNo || saved.answer !== answer || !Array.isArray(saved.guesses)) return;
    extraUsed = !!saved.extra;
    maxRows = extraUsed ? BASE_ROWS + 1 : BASE_ROWS;
    rowsAnim = maxRows;
    const gs = saved.guesses.slice(0, maxRows);
    gs.forEach((g, i) => {
      rows[i].word = g;
      rows[i].ev = scoreGuess(g, answer);
      rows[i].sounded = WORD_LEN;
      applyKeys(g, rows[i].ev);
    });
    rowIdx = gs.length;
    if (saved.done) {
      phase = 'done';
      won = !!saved.win;
      restoredDone = true;
      answerShown = !won;
      rowIdx = Math.max(0, gs.length - 1);
      buildShare(won);
      openPanel('result', 0.2);
    }
  }

  function openPanel(kind, delay = 0) {
    panel = { show: true, t0: t + delay, kind };
  }

  // ---------- actions ----------
  function typeLetter(ch) {
    if (phase !== 'input' || cur.length >= WORD_LEN) return;
    rows[rowIdx].pop[cur.length] = t;
    cur += ch;
    rows[rowIdx].word = cur;
    sfx.tone({ freq: 720 + cur.length * 40, type: 'triangle', dur: 0.04, vol: 0.07 });
  }

  function backspace() {
    if (phase !== 'input' || cur.length === 0) return;
    cur = cur.slice(0, -1);
    rows[rowIdx].word = cur;
    sfx.tone({ freq: 420, type: 'triangle', dur: 0.04, vol: 0.06 });
  }

  function reject(msg) {
    rows[rowIdx].shakeAt = t;
    showToast(msg, 1.2);
    sfx.play('error');
    api.haptic(40);
  }

  function submit() {
    if (phase !== 'input') return;
    if (cur.length < WORD_LEN) return reject('Not enough letters');
    if (!valid.has(cur)) return reject('Not in word list');
    const row = rows[rowIdx];
    row.word = cur;
    row.ev = scoreGuess(cur, answer);
    row.revealAt = t;
    row.sounded = 0;
    phase = 'reveal';
    if (panel.show) panel.show = false;
    sfx.play('swipe');
  }

  function finishReveal() {
    const row = rows[rowIdx];
    applyKeys(row.word, row.ev);
    const n = rowIdx + 1;
    if (row.word === answer) {
      won = true;
      phase = 'done';
      row.bounceAt = t;
      api.setScore(n);
      showToast(PRAISE[Math.min(PRAISE.length, n) - 1], 0.95, true);
      sfx.play('win');
      api.haptic(30);
      const g = gridGeom();
      const cy = g.y + rowIdx * (g.tile + TILE_GAP) + g.tile / 2;
      fx.confetti(W / 2, cy, 90);
      fx.burst(W / 2, cy, { count: 24, colors: [C.green, '#ffffff', C.yellow], speed: 280, size: 4, life: 0.7 });
      if (n <= 2) api.happy();
      recordResult(true, n);
      saveDaily();
      openPanel('result', 0.95);
      api.gameOver({ win: true, delay: 1800, stats: { guesses: n, answer: answer.toUpperCase(), shareText: buildShare(true) } });
      return;
    }
    if (n >= maxRows) {
      phase = 'done';
      won = false;
      api.setScore(0);
      sfx.play('die');
      fx.shake(6, 0.3);
      api.haptic(80);
      const reviveLeft = !extraUsed;
      if (reviveLeft) {
        // Hold the answer back while a continue (extra 7th guess) is still possible.
        showToast('Out of guesses!', 1.0, true);
        pendingReveal = api.daily ? null : answer;
      } else {
        answerShown = true;
        showToast(answer.toUpperCase(), 1.0, true);
      }
      recordResult(false, n);
      saveDaily();
      openPanel('result', 1.0);
      api.gameOver({ win: false, delay: 1800, stats: { guesses: n, answer: answer.toUpperCase(), shareText: buildShare(false) } });
      return;
    }
    rowIdx += 1;
    cur = '';
    phase = 'input';
    saveDaily();
  }

  function revive() {
    // One extra (7th) row. Undo the loss we recorded when the 6th guess failed.
    if (extraUsed || won) return;
    if (statsSnapshot) {
      api.store.set(statsKey(), statsSnapshot);
      stats = statsSnapshot;
      statsSnapshot = null;
    }
    extraUsed = true;
    pendingReveal = null;
    maxRows = BASE_ROWS + 1;
    rowIdx = BASE_ROWS;
    rows[rowIdx] = newRow();
    rows[rowIdx].appearAt = t;
    cur = '';
    phase = 'input';
    panel.show = false;
    toast = null;
    api.setScore(0);
    showToast('One more try!', 1.6, true);
    sfx.play('levelup');
    saveDaily();
  }

  function pressKey(key) {
    if (key === 'Enter') submit();
    else if (key === 'Backspace') backspace();
    else typeLetter(key);
  }

  // ---------- geometry ----------
  function gridGeom() {
    const n = rowsAnim;
    const areaH = GRID_BOTTOM - GRID_TOP;
    const tile = Math.min(62, (areaH - (n - 1) * TILE_GAP) / n);
    const gw = tile * WORD_LEN + TILE_GAP * (WORD_LEN - 1);
    const gh = tile * n + TILE_GAP * (n - 1);
    return { tile, x: (W - gw) / 2, y: GRID_TOP + (areaH - gh) / 2, w: gw, h: gh };
  }

  function hit(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // ---------- update ----------
  function step(dt) {
    t += dt;
    if (rowsAnim !== maxRows) {
      rowsAnim += (maxRows - rowsAnim) * Math.min(1, dt * 10);
      if (Math.abs(rowsAnim - maxRows) < 0.01) rowsAnim = maxRows;
    }
    if (phase === 'reveal') {
      const row = rows[rowIdx];
      const e = t - row.revealAt;
      // a soft tick as each tile turns over, pitched by its result
      while (row.sounded < WORD_LEN && e >= row.sounded * FLIP_STAGGER + FLIP_DUR / 2) {
        const v = row.ev[row.sounded];
        const f = v === CORRECT ? 660 + row.sounded * 60 : v === PRESENT ? 520 + row.sounded * 30 : 300;
        sfx.tone({ freq: f, to: f * 1.25, type: v === ABSENT ? 'sine' : 'triangle', dur: 0.09, vol: v === ABSENT ? 0.08 : 0.12 });
        row.sounded += 1;
      }
      if (e >= REVEAL_TIME) finishReveal();
    }
    if (toast && t - toast.t0 > toast.dur) toast = null;
  }

  // ---------- render ----------
  function drawTile(g, x, y, s, letter, ev, flipK, popK, alpha) {
    // flipK: 0 = unrevealed face, 1 = revealed face; values in between animate the turn
    let sy = 1;
    let showEval = ev != null && flipK >= 0.5;
    if (ev != null && flipK < 1) sy = Math.abs(Math.cos(flipK * Math.PI));
    const sc = popK > 0 ? 1 + 0.1 * Math.sin(Math.PI * popK) : 1;
    g.save();
    g.globalAlpha *= alpha;
    g.translate(x + s / 2, y + s / 2);
    g.scale(sc, sy * sc);
    const hs = s / 2;
    if (showEval) {
      draw.roundRect(g, -hs, -hs, s, s, 6, EVAL_COLOR[ev]);
    } else if (letter) {
      draw.roundRect(g, -hs + 1, -hs + 1, s - 2, s - 2, 6, C.tileFill, C.filled, 2.5);
    } else {
      draw.roundRect(g, -hs + 1, -hs + 1, s - 2, s - 2, 6, null, C.empty, 2);
    }
    if (letter) {
      g.font = draw.font(Math.round(s * 0.54), 800);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = C.text;
      g.fillText(letter.toUpperCase(), 0, s * 0.03);
    }
    g.restore();
  }

  function renderHeader(g) {
    // stats button
    const b = statsBtn;
    draw.roundRect(g, b.x, b.y, b.w, b.h, 10, panel.show ? '#3a3360' : 'rgba(255,255,255,0.06)');
    g.fillStyle = C.text;
    const bx = b.x + 11;
    const by = b.y + 27;
    g.fillRect(bx, by - 8, 4, 8);
    g.fillRect(bx + 7, by - 16, 4, 16);
    g.fillRect(bx + 14, by - 12, 4, 12);
    // logo: five mini tiles
    const s = 24;
    const gap = 4;
    const lx = W / 2 - (s * 5 + gap * 4) / 2;
    const cols = [C.green, C.yellow, C.gray, C.green, C.green];
    'WORDY'.split('').forEach((ch, i) => {
      draw.roundRect(g, lx + i * (s + gap), 12, s, s, 5, cols[i]);
      g.font = draw.font(16, 800);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText(ch, lx + i * (s + gap) + s / 2, 12 + s / 2 + 1);
    });
    const sub = api.daily ? `DAILY  ${label()}` : 'CLASSIC  ·  UNLIMITED';
    draw.text(g, sub, W / 2, 51, { size: 12, weight: 700, color: C.dim, shadow: false });
    g.fillStyle = C.line;
    g.fillRect(0, HEADER_H - 1, W, 1);
  }

  function renderGrid(g) {
    const gg = gridGeom();
    const s = gg.tile;
    for (let r = 0; r < maxRows; r++) {
      const row = rows[r];
      const ry = gg.y + r * (s + TILE_GAP);
      let dx = 0;
      const se = t - row.shakeAt;
      if (se >= 0 && se < SHAKE_DUR) dx = Math.sin(se * 55) * 9 * (1 - se / SHAKE_DUR);
      const appear = row.appearAt > 0 ? Math.min(1, (t - row.appearAt) / 0.35) : 1;
      for (let i = 0; i < WORD_LEN; i++) {
        const letter = row.word[i] || '';
        let flipK = 1;
        if (row.ev && row.revealAt > 0) {
          const e = t - row.revealAt - i * FLIP_STAGGER;
          flipK = Math.max(0, Math.min(1, e / FLIP_DUR));
        }
        const pe = (t - row.pop[i]) / 0.12;
        const popK = pe >= 0 && pe < 1 ? pe : 0;
        let dy = 0;
        const be = t - row.bounceAt - i * BOUNCE_STAGGER;
        if (be >= 0 && be < BOUNCE_DUR) dy = -Math.sin((be / BOUNCE_DUR) * Math.PI) * s * 0.42;
        drawTile(g, gg.x + i * (s + TILE_GAP) + dx, ry + dy, s, letter, row.ev ? row.ev[i] : null, flipK, popK, appear);
      }
    }
  }

  function renderKeyboard(g) {
    for (const k of keys) {
      const isLetter = k.key.length === 1;
      const st = isLetter ? keyState[k.key.charCodeAt(0) - 97] : -1;
      const down = pressed === k.key || (keyFlash.key === k.key && t - keyFlash.t < 0.1);
      const fill = st >= 0 ? KEY_COLOR[st] : C.key;
      const oy = down ? 2 : 0;
      if (!down) draw.roundRect(g, k.x, k.y + 3, k.w, k.h, 8, 'rgba(0,0,0,0.28)');
      draw.roundRect(g, k.x, k.y + oy, k.w, k.h, 8, down ? draw.shade(fill, 0.18) : fill);
      g.fillStyle = st === ABSENT ? C.keyAbsentText : '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const cx = k.x + k.w / 2;
      const cy = k.y + k.h / 2 + oy;
      if (k.key === 'Enter') {
        g.font = draw.font(13, 800);
        g.fillText('ENTER', cx, cy + 1);
      } else if (k.key === 'Backspace') {
        // backspace glyph
        g.save();
        g.translate(cx, cy);
        g.strokeStyle = '#fff';
        g.lineWidth = 2.2;
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(-13, 0);
        g.lineTo(-6, -8);
        g.lineTo(12, -8);
        g.lineTo(12, 8);
        g.lineTo(-6, 8);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.moveTo(-1, -3.5);
        g.lineTo(6, 3.5);
        g.moveTo(6, -3.5);
        g.lineTo(-1, 3.5);
        g.stroke();
        g.restore();
      } else {
        g.font = draw.font(20, 800);
        g.fillText(k.key.toUpperCase(), cx, cy + 1);
      }
    }
  }

  function renderToast(g) {
    if (!toast) return;
    const e = t - toast.t0;
    const a = Math.min(1, e / 0.12) * Math.min(1, (toast.dur - e) / 0.3);
    if (a <= 0) return;
    const size = toast.big ? 20 : 16;
    g.font = draw.font(size, 800);
    const tw = g.measureText(toast.text).width;
    const w = tw + 36;
    const h = size + 24;
    const y = GRID_TOP + 6 + (1 - Math.min(1, e / 0.15)) * -8;
    g.save();
    g.globalAlpha = a;
    draw.roundRect(g, W / 2 - w / 2, y + 3, w, h, h / 2, 'rgba(0,0,0,0.35)');
    draw.roundRect(g, W / 2 - w / 2, y, w, h, h / 2, C.toastBg);
    g.fillStyle = C.toastText;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(toast.text, W / 2, y + h / 2 + 1);
    g.restore();
  }

  function renderPanel(g) {
    if (!panel.show || t < panel.t0) return;
    const k = Math.min(1, (t - panel.t0) / 0.32);
    const sc = 0.92 + 0.08 * api.ease.outBack(k);
    const pw = 360;
    const showAnswer = panel.kind === 'result' && !won && answerShown;
    const daily = api.daily;
    const ph = 334 + (showAnswer ? 58 : 0) + (daily && phase === 'done' ? 34 : 0) + (lastShare && phase === 'done' ? 50 : 0);
    const px = (W - pw) / 2;
    const py = Math.max(HEADER_H + 8, GRID_TOP + (GRID_BOTTOM - GRID_TOP - ph) / 2);
    g.save();
    g.globalAlpha = k;
    g.translate(W / 2, py + ph / 2);
    g.scale(sc, sc);
    g.translate(-W / 2, -(py + ph / 2));
    g.fillStyle = 'rgba(8,5,20,0.45)';
    g.fillRect(-20, -20, W + 40, H + 40);
    draw.roundRect(g, px, py + 5, pw, ph, 20, 'rgba(0,0,0,0.4)');
    draw.roundRect(g, px, py, pw, ph, 20, C.bg2, 'rgba(255,255,255,0.12)', 2);
    let y = py + 34;
    let title = 'STATISTICS';
    if (panel.kind === 'result') title = won ? PRAISE[Math.min(7, rowIdx + 1) - 1].toUpperCase() : 'OUT OF GUESSES';
    draw.text(g, title, W / 2, y, { size: 22, weight: 800, color: panel.kind === 'result' && won ? '#7ff0a0' : C.text, shadow: false });
    y += 22;
    if (showAnswer) {
      const s = 40;
      const gx = W / 2 - (s * 5 + 5 * 4) / 2;
      for (let i = 0; i < 5; i++) {
        draw.roundRect(g, gx + i * (s + 5), y + 4, s, s, 6, C.green);
        draw.text(g, answer[i].toUpperCase(), gx + i * (s + 5) + s / 2, y + 4 + s / 2 + 1, { size: 22, weight: 800, shadow: false });
      }
      y += 58;
    }
    // numbers
    const played = stats.played;
    const winPct = played ? Math.round((stats.wins / played) * 100) : 0;
    const cols = [
      [played, 'Played'],
      [winPct, 'Win %'],
      [shownStreak(), 'Current\nStreak'],
      [stats.max, 'Max\nStreak'],
    ];
    const cw = (pw - 40) / 4;
    cols.forEach(([v, lab], i) => {
      const cx = px + 20 + cw * i + cw / 2;
      draw.text(g, String(v), cx, y + 26, { size: 30, weight: 800, shadow: false });
      lab.split('\n').forEach((ln, j) => draw.text(g, ln, cx, y + 52 + j * 14, { size: 12, weight: 600, color: C.dim, shadow: false }));
    });
    y += 90;
    draw.text(g, 'GUESS DISTRIBUTION', W / 2, y, { size: 13, weight: 800, color: C.text, shadow: false });
    y += 16;
    const nBars = stats.dist[6] > 0 || extraUsed ? 7 : 6;
    const maxD = Math.max(1, ...stats.dist);
    const barH = nBars === 7 ? 17 : 20;
    const bx = px + 44;
    const bwMax = pw - 44 - 28;
    for (let i = 0; i < nBars; i++) {
      const v = stats.dist[i] || 0;
      const by = y + i * (barH + 5);
      const grow = Math.min(1, Math.max(0, (t - panel.t0 - 0.15 - i * 0.04) / 0.35));
      const bw = Math.max(26, (bwMax * v) / maxD) * api.ease.outCubic(grow);
      const isCur = panel.kind === 'result' && won && rowIdx === i;
      draw.text(g, String(i + 1), px + 28, by + barH / 2 + 1, { size: 14, weight: 800, shadow: false });
      draw.roundRect(g, bx, by, bw, barH, 4, isCur ? C.green : '#4a4468');
      if (grow > 0.6) draw.text(g, String(v), bx + bw - 9, by + barH / 2 + 1, { size: 13, weight: 800, align: 'right', shadow: false });
    }
    y += nBars * (barH + 5) + 8;
    shareBtn = null;
    if (daily && phase === 'done') {
      const ms = msUntilNextUtcDay(new Date());
      const s = Math.floor(ms / 1000);
      const txt = `NEXT WORDY IN ${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
      draw.text(g, txt, W / 2, y + 12, { size: 14, weight: 800, color: C.yellow, shadow: false });
      y += 34;
    }
    if (lastShare && phase === 'done') {
      const bw = 150;
      const bh = 40;
      const bxs = W / 2 - bw / 2;
      shareBtn = { x: bxs, y: y + 2, w: bw, h: bh };
      draw.roundRect(g, bxs, y + 5, bw, bh, 12, '#15803d');
      draw.roundRect(g, bxs, y + 2, bw, bh, 12, C.green);
      draw.text(g, 'SHARE', W / 2, y + 2 + bh / 2 + 1, { size: 17, weight: 800, shadow: false });
    }
    g.restore();
  }

  function copyShare() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && lastShare) {
        navigator.clipboard.writeText(lastShare).then(
          () => showToast('Copied results to clipboard', 1.6),
          () => showToast('Could not copy', 1.2),
        );
        sfx.play('click');
      }
    } catch {
      /* clipboard unavailable */
    }
  }

  reset();

  // Test/debug hook (reachable via the engine controller's api object).
  api.__test = {
    get answer() {
      return answer;
    },
    set answer(w) {
      answer = String(w).toLowerCase();
    },
    get phase() {
      return phase;
    },
    get rows() {
      return rows.filter((r) => r.ev).map((r) => ({ word: r.word, ev: r.ev.slice() }));
    },
    get cur() {
      return cur;
    },
    get maxRows() {
      return maxRows;
    },
    get stats() {
      return JSON.parse(JSON.stringify(stats));
    },
    get share() {
      return lastShare;
    },
    get toast() {
      return toast ? toast.text : null;
    },
    get keyState() {
      const o = {};
      keyState.forEach((v, i) => {
        if (v >= 0) o[String.fromCharCode(97 + i)] = v;
      });
      return o;
    },
    get panel() {
      return panel.show ? panel.kind : null;
    },
    get dayNo() {
      return dayNo;
    },
    get answerShown() {
      return answerShown;
    },
    keyRect(key) {
      const k = keys.find((q) => q.key === key);
      return k ? { x: k.x, y: k.y, w: k.w, h: k.h } : null;
    },
    scoreGuess,
  };

  return {
    hud: false,
    reset,
    update(dt) {
      step(dt);
    },
    idle(dt) {
      step(dt);
    },
    input(e) {
      if (e.type === 'down') {
        if (hit(statsBtn, e.x, e.y)) {
          if (panel.show) panel.show = false;
          else openPanel(phase === 'done' ? 'result' : 'stats');
          sfx.play('click');
          return true;
        }
        if (panel.show) {
          if (shareBtn && hit(shareBtn, e.x, e.y)) copyShare();
          else panel.show = false;
          return true;
        }
        for (const k of keys) {
          if (e.x >= k.x - KEY_GAP / 2 && e.x <= k.x + k.w + KEY_GAP / 2 && e.y >= k.y - KEY_ROW_GAP / 2 && e.y <= k.y + k.h + KEY_ROW_GAP / 2) {
            pressed = k.key;
            pressKey(k.key);
            return true;
          }
        }
        return true;
      }
      if (e.type === 'up') {
        pressed = null;
        return true;
      }
      if (e.type === 'keydown') {
        const key = e.key;
        if (key === 'Enter') {
          if (e.repeat) return true;
          keyFlash = { key: 'Enter', t };
          submit();
          return true;
        }
        if (key === 'Backspace' || key === 'Delete') {
          keyFlash = { key: 'Backspace', t };
          backspace();
          return true;
        }
        if (key && key.length === 1 && /[a-z]/i.test(key)) {
          if (e.repeat) return true;
          const ch = key.toLowerCase();
          keyFlash = { key: ch, t };
          typeLetter(ch);
          return true;
        }
        if (key === 'Escape' && panel.show) {
          panel.show = false;
          return true;
        }
      }
      return false;
    },
    revive,
    render(g) {
      // backdrop
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, H);
      renderHeader(g);
      renderGrid(g);
      renderKeyboard(g);
      renderPanel(g);
      renderToast(g);
    },
  };
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1f1845');
  grad.addColorStop(1, '#0f0c22');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // soft glow
  const rg = g.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, Math.max(w, h) * 0.6);
  rg.addColorStop(0, 'rgba(53,178,91,0.28)');
  rg.addColorStop(1, 'rgba(53,178,91,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);

  const rowsDef = [
    // a real solve of WORDY, so the clue colors are correct
    ['s', 't', 'o', 'r', 'y', [0, 0, 1, 1, 2]],
    ['c', 'r', 'o', 'w', 'd', [0, 1, 1, 1, 1]],
    ['d', 'o', 'w', 'r', 'y', [1, 2, 1, 1, 2]],
    ['w', 'o', 'r', 'd', 'y', [2, 2, 2, 2, 2]],
  ];
  const colors = ['#3d3853', '#e2b12f', '#35b25b'];
  const s = Math.min((w * 0.62) / 5.4, (h * 0.8) / 4.4);
  const gap = s * 0.12;
  const gw = s * 5 + gap * 4;
  const gh = s * 4 + gap * 3;
  const x0 = (w - gw) / 2;
  const y0 = (h - gh) / 2;
  g.save();
  // slight tilt for energy
  g.translate(w / 2, h / 2);
  g.rotate(-0.06);
  g.translate(-w / 2, -h / 2);
  rowsDef.forEach((row, r) => {
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * (s + gap);
      const lift = r === 3 ? -Math.sin(((i + 0.5) / 5) * Math.PI) * s * 0.16 : 0;
      const y = y0 + r * (s + gap) + lift;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      roundRectP(g, x + s * 0.04, y + s * 0.08, s, s, s * 0.12);
      g.fill();
      g.fillStyle = colors[row[5][i]];
      roundRectP(g, x, y, s, s, s * 0.12);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      roundRectP(g, x, y, s, s * 0.45, s * 0.12);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = `800 ${Math.round(s * 0.56)}px "Fredoka", "Nunito", "Segoe UI", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(row[i].toUpperCase(), x + s / 2, y + s / 2 + s * 0.03);
    }
  });
  g.restore();
  // confetti sparkles
  const conf = ['#35b25b', '#e2b12f', '#ff3d7f', '#22d3ee', '#ffffff'];
  for (let i = 0; i < 46; i++) {
    const px = ((i * 137.5) % 100) / 100;
    const py = ((i * 61.8 + 13) % 100) / 100;
    const x = px * w;
    const y = py * h;
    if (Math.abs(x - w / 2) < gw * 0.55 && Math.abs(y - h / 2) < gh * 0.62) continue;
    g.save();
    g.translate(x, y);
    g.rotate(i * 0.7);
    g.fillStyle = conf[i % conf.length];
    const cs = Math.max(4, s * 0.1);
    g.fillRect(-cs / 2, -cs / 4, cs, cs / 2);
    g.restore();
  }
}

function roundRectP(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
