// Solitaire - classic Klondike (draw 1 / draw 3), portrait layout for phones.
// Every deal is checked by a solver so it can be won (see solver.js).
import { drawFace, drawBack, drawFelt, roundRectPath, isRed, RANKS } from './cards.js';
import { isWinnable, dealFromOrder } from './solver.js';

const DEV_HOST = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

const CW = 62;
const CH = 88;
const GAP = 5;
const MARGIN = 8;
const HUD_H = 46;
const TOP_Y = 56;
const TAB_Y = 156;
const TOOL_Y = 700;
const TAB_BOTTOM = TOOL_Y - 6;
const FD = 10; // face-down fan offset
const FU = 26; // face-up fan offset
const FAN = 17; // draw-3 waste fan
const PAD = 5; // sprite padding for the baked shadow
const FLIP_DUR = 0.22;
const DRAG_THRESHOLD = 7;
const SOLVER_BUDGET = 6000;
const SOLVER_TRIES = 8;

const colX = (i) => MARGIN + i * (CW + GAP);
const STOCK_X = colX(6);
const WASTE_X = colX(4);
const PILE_IDS = ['f0', 'f1', 'f2', 'f3', 's', 'w', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = s < 10 ? '0' + s : '' + s;
  if (h) return `${h}:${m < 10 ? '0' + m : m}:${ss}`;
  return `${m}:${ss}`;
}

const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const { draw, sfx, fx } = api;
  const hasDom = typeof document !== 'undefined';

  // ---------- cards & piles ----------
  const cards = [];
  for (let id = 0; id < 52; id++) {
    cards.push({ id, suit: (id / 13) | 0, rank: (id % 13) + 1, up: false, x: STOCK_X, y: TOP_Y, tx: STOCK_X, ty: TOP_Y, fx0: 0, fy0: 0, ft: 1, fd: 1, flipT: 9, dragging: false, launched: false, shake: -9 });
  }
  const piles = {};
  for (const id of PILE_IDS) piles[id] = [];

  let drawCount = api.daily ? 1 : api.store.get('draw', 1) === 3 ? 3 : 1;
  let fanN = 0;
  let moves = 0;
  let elapsed = 0;
  let clockOn = false;
  let won = false;
  let history = [];
  let flyers = [];
  let t = 0;
  let dealEnd = 0;
  let lastOrder = null;
  let pending = null; // pointer down on a movable card
  let dragPos = null; // {x, y, rx, ry}
  let dropHover = null;
  let activePointer = null;
  let pressedBtn = null;
  let hint = null;
  let toast = null;
  let confirm = null; // {id, until}
  let autoAvail = false;
  let autoRunning = false;
  let autoTimer = 0;
  let cascade = null;
  let winT = -1;
  let stuckShown = false;

  // ---------- sprites (cards pre-rendered at device resolution) ----------
  const sprites = new Array(53).fill(null);
  let spriteScale = 0;
  let trail = null;
  let trailG = null;

  function ensureSprites(ds) {
    if (!hasDom) return false;
    if (Math.abs(ds - spriteScale) < 0.001 && sprites[52]) return true;
    spriteScale = ds;
    for (let i = 0; i < 53; i++) {
      const cv = sprites[i] || document.createElement('canvas');
      cv.width = Math.ceil((CW + PAD * 2) * ds);
      cv.height = Math.ceil((CH + PAD * 2) * ds);
      const cg = cv.getContext('2d');
      cg.setTransform(1, 0, 0, 1, 0, 0);
      cg.clearRect(0, 0, cv.width, cv.height);
      cg.setTransform(ds, 0, 0, ds, 0, 0);
      cg.save();
      cg.shadowColor = 'rgba(0,0,0,0.32)';
      cg.shadowBlur = 3.2 * ds;
      cg.shadowOffsetY = 1.2 * ds;
      roundRectPath(cg, PAD, PAD, CW, CH, CW * 0.1);
      cg.fillStyle = '#fdfcf7';
      cg.fill();
      cg.restore();
      if (i < 52) drawFace(cg, (i % 13) + 1, (i / 13) | 0, PAD, PAD, CW, CH);
      else drawBack(cg, PAD, PAD, CW, CH);
      sprites[i] = cv;
    }
    if (trail) {
      trail = null;
      trailG = null;
    }
    return true;
  }

  // ---------- layout ----------
  function colOffsets(col) {
    let nd = 0;
    for (const c of col) if (!c.up) nd++;
    const nu = col.length - nd;
    const avail = TAB_BOTTOM - TAB_Y - CH;
    let fd = FD;
    let fu = FU;
    if (nd * fd + Math.max(0, nu - 1) * fu > avail) {
      fd = Math.min(FD, 6);
      fu = Math.max(13, (avail - nd * fd) / Math.max(1, nu - 1));
      if (nd * fd + Math.max(0, nu - 1) * fu > avail) fd = Math.max(3, (avail - Math.max(0, nu - 1) * fu) / Math.max(1, nd));
    }
    return { fd, fu };
  }

  function wasteVisible() {
    const n = piles.w.length;
    return drawCount === 3 ? Math.min(n, Math.max(1, Math.min(3, fanN))) : Math.min(1, n);
  }

  function layout() {
    for (const c of piles.s) {
      c.tx = STOCK_X;
      c.ty = TOP_Y;
    }
    const n = piles.w.length;
    const v = wasteVisible();
    piles.w.forEach((c, k) => {
      c.tx = WASTE_X + Math.max(0, k - (n - v)) * FAN;
      c.ty = TOP_Y;
    });
    for (let i = 0; i < 4; i++) {
      for (const c of piles['f' + i]) {
        c.tx = colX(i);
        c.ty = TOP_Y;
      }
    }
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      const { fd, fu } = colOffsets(col);
      let y = TAB_Y;
      for (const c of col) {
        c.tx = colX(i);
        c.ty = y;
        y += c.up ? fu : fd;
      }
    }
  }

  function startFly(c, dur = 0.2, delay = 0) {
    c.fx0 = c.x;
    c.fy0 = c.y;
    c.ft = -delay;
    c.fd = dur;
    const i = flyers.indexOf(c);
    if (i >= 0) flyers.splice(i, 1);
    flyers.push(c);
  }

  function locate(c) {
    for (const id of PILE_IDS) {
      const i = piles[id].indexOf(c);
      if (i >= 0) return { id, i };
    }
    return null;
  }

  // ---------- rules ----------
  function isRun(list) {
    for (let k = 1; k < list.length; k++) {
      const a = list[k - 1];
      const b = list[k];
      if (!a.up || !b.up || isRed(a.suit) === isRed(b.suit) || b.rank !== a.rank - 1) return false;
    }
    return list.length > 0 && list[0].up;
  }

  function canMove(fromId, index, toId) {
    const from = piles[fromId];
    if (!from || !piles[toId] || fromId === toId || fromId === 's' || toId === 's' || toId === 'w') return false;
    if (index < 0 || index >= from.length) return false;
    if ((fromId === 'w' || fromId[0] === 'f') && index !== from.length - 1) return false;
    const list = from.slice(index);
    if (!isRun(list)) return false;
    const c = list[0];
    const to = piles[toId];
    if (toId[0] === 'f') {
      if (list.length !== 1) return false;
      if (!to.length) return c.rank === 1;
      const top = to[to.length - 1];
      return top.suit === c.suit && c.rank === top.rank + 1;
    }
    if (!to.length) return c.rank === 13;
    const top = to[to.length - 1];
    return top.up && isRed(top.suit) !== isRed(c.suit) && c.rank === top.rank - 1;
  }

  function foundationFor(c) {
    for (let i = 0; i < 4; i++) {
      const f = piles['f' + i];
      if (f.length && f[0].suit === c.suit) return 'f' + i;
    }
    if (c.rank !== 1) return null;
    for (let i = 0; i < 4; i++) if (!piles['f' + i].length) return 'f' + i;
    return null;
  }

  /** Best destination for a tap: foundation first, then a tableau column. */
  function bestTarget(fromId, index) {
    const from = piles[fromId];
    const c = from[index];
    if (!c || !c.up) return null;
    if (index === from.length - 1 && fromId[0] !== 'f') {
      const f = foundationFor(c);
      if (f && canMove(fromId, index, f)) return f;
    }
    let empty = null;
    const start = fromId[0] === 't' ? Number(fromId[1]) : 0;
    for (let k = 1; k <= 7; k++) {
      const id = 't' + ((start + k) % 7);
      if (id === fromId || !canMove(fromId, index, id)) continue;
      if (piles[id].length) return id;
      // only move a king into an empty column if that achieves something
      if (!(fromId[0] === 't' && index === 0) && !empty) empty = id;
    }
    return empty;
  }

  // ---------- history ----------
  function snapshot() {
    return { p: PILE_IDS.map((id) => piles[id].map((c) => c.id)), up: cards.map((c) => (c.up ? 1 : 0)), moves, fanN };
  }

  function pushHistory() {
    history.push(snapshot());
  }

  function restore(s) {
    PILE_IDS.forEach((id, i) => {
      piles[id] = s.p[i].map((cid) => cards[cid]);
    });
    cards.forEach((c, i) => {
      const up = !!s.up[i];
      if (up && !c.up) c.flipT = 0;
      else if (!up) c.flipT = 9;
      c.up = up;
    });
    moves = s.moves;
    fanN = s.fanN;
  }

  // ---------- feedback ----------
  function showToast(text, dur = 1.8) {
    toast = { text, t0: t, dur };
  }

  function snapSound() {
    sfx.noise({ dur: 0.05, vol: 0.16, freq: 2600, to: 900, type: 'bandpass', q: 1.1 });
    sfx.tone({ freq: 210, to: 150, type: 'sine', dur: 0.07, vol: 0.14 });
  }

  function softNo() {
    sfx.tone({ freq: 220, to: 160, type: 'triangle', dur: 0.12, vol: 0.12 });
  }

  // ---------- actions ----------
  function busy() {
    return t < dealEnd || autoRunning || won;
  }

  function startClock() {
    clockOn = true;
  }

  function flipExposed(fromId) {
    if (fromId[0] !== 't') return;
    const col = piles[fromId];
    const top = col[col.length - 1];
    if (top && !top.up) {
      top.up = true;
      top.flipT = -0.06;
      sfx.tone({ freq: 1250, to: 900, type: 'triangle', dur: 0.05, vol: 0.08, delay: 0.06 });
    }
  }

  function moveCards(fromId, index, toId, opts = {}) {
    if (!canMove(fromId, index, toId)) return false;
    pushHistory();
    const moved = piles[fromId].splice(index);
    for (const c of moved) {
      c.dragging = false;
      piles[toId].push(c);
    }
    if (fromId === 'w') fanN = Math.max(1, fanN - 1);
    flipExposed(fromId);
    layout();
    moved.forEach((c, k) => startFly(c, opts.dur ?? 0.2, k * 0.025));
    moves += 1;
    startClock();
    stuckShown = false;
    const top = moved[0];
    if (toId[0] === 'f') {
      sfx.combo(top.rank - 1, 440);
      api.haptic(10);
      const x = colX(Number(toId[1])) + CW / 2;
      fx.burst(x, TOP_Y + CH / 2, { count: top.rank === 13 ? 30 : 10, colors: ['#ffffff', '#ffd23f', '#9ff5c0'], speed: top.rank === 13 ? 260 : 150, size: 3, life: 0.5, gravity: 200 });
      if (top.rank === 13) fx.ring(x, TOP_Y + CH / 2, { color: '#ffd23f', radius: 70, width: 4 });
    } else {
      snapSound();
      api.haptic(8);
    }
    afterChange();
    return true;
  }

  function clickStock() {
    if (piles.s.length) {
      pushHistory();
      const n = Math.min(drawCount, piles.s.length);
      for (let k = 0; k < n; k++) {
        const c = piles.s.pop();
        c.up = true;
        c.flipT = -k * 0.05;
        piles.w.push(c);
      }
      fanN = n;
      layout();
      for (let k = 0; k < n; k++) startFly(piles.w[piles.w.length - n + k], 0.22, k * 0.05);
      moves += 1;
      startClock();
      sfx.play('swipe');
    } else if (piles.w.length) {
      pushHistory();
      while (piles.w.length) {
        const c = piles.w.pop();
        c.up = false;
        c.flipT = 9;
        piles.s.push(c);
      }
      fanN = 0;
      layout();
      piles.s.forEach((c, k) => startFly(c, 0.26, Math.min(0.12, k * 0.005)));
      moves += 1;
      startClock();
      sfx.play('whoosh');
    } else {
      softNo();
      return;
    }
    stuckShown = false;
    afterChange();
  }

  function undo() {
    if (!history.length || busy()) {
      if (!history.length && !busy()) softNo();
      return;
    }
    const before = cards.map((c) => locate(c));
    restore(history.pop());
    layout();
    cards.forEach((c, i) => {
      const now = locate(c);
      const b = before[i];
      if (!b || !now || b.id !== now.id || b.i !== now.i) startFly(c, 0.24);
    });
    sfx.play('swipe');
    stuckShown = false;
    afterChange();
  }

  function tapMove(fromId, index) {
    const to = bestTarget(fromId, index);
    if (to) {
      moveCards(fromId, index, to, { dur: 0.22 });
      return true;
    }
    const c = piles[fromId][index];
    if (c) c.shake = t;
    softNo();
    return false;
  }

  // ---------- auto-complete ----------
  function talonCodes() {
    const T = piles.w.map((c) => c.id);
    for (let i = piles.s.length - 1; i >= 0; i--) T.push(piles.s[i].id);
    return T;
  }

  function computeAutoAvail() {
    // offered once every card is face up (tableau revealed, stock drawn out) and a clean finish exists
    if (piles.s.length) return false;
    for (let i = 0; i < 7; i++) for (const c of piles['t' + i]) if (!c.up) return false;
    const found = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const f = piles['f' + i];
      if (f.length) found[f[0].suit] = f.length;
    }
    const tabs = [];
    for (let i = 0; i < 7; i++) tabs.push(piles['t' + i].map((c) => c.id));
    const T = talonCodes();
    let wp = piles.w.length;
    let idle = 0;
    for (let iter = 0; iter < 5000; iter++) {
      if (found[0] + found[1] + found[2] + found[3] === 52) return true;
      let progress = false;
      for (const col of tabs) {
        const c = col[col.length - 1];
        if (c != null && found[(c / 13) | 0] === c % 13) {
          col.pop();
          found[(c / 13) | 0] += 1;
          progress = true;
        }
      }
      if (wp > 0) {
        const c = T[wp - 1];
        if (found[(c / 13) | 0] === c % 13) {
          T.splice(wp - 1, 1);
          wp -= 1;
          found[(c / 13) | 0] += 1;
          progress = true;
        }
      }
      if (progress) {
        idle = 0;
        continue;
      }
      if (!T.length) return false;
      if (++idle > Math.ceil(T.length / drawCount) * 2 + 4) return false;
      wp = wp >= T.length ? Math.min(drawCount, T.length) : Math.min(wp + drawCount, T.length);
    }
    return false;
  }

  function autoStep() {
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      if (!col.length) continue;
      const f = foundationFor(col[col.length - 1]);
      if (f && canMove('t' + i, col.length - 1, f)) return moveCards('t' + i, col.length - 1, f, { dur: 0.16 });
    }
    if (piles.w.length) {
      const f = foundationFor(piles.w[piles.w.length - 1]);
      if (f && canMove('w', piles.w.length - 1, f)) return moveCards('w', piles.w.length - 1, f, { dur: 0.16 });
    }
    if (piles.s.length || piles.w.length) {
      clickStock();
      return true;
    }
    return false;
  }

  // ---------- hints ----------
  function reachableTalon() {
    const T = talonCodes();
    const n = T.length;
    const wp = piles.w.length;
    const out = new Set();
    if (drawCount === 1) {
      for (let j = 0; j < n; j++) out.add(j);
    } else {
      if (wp > 0) out.add(wp - 1);
      let p = wp;
      while (p < n) {
        p = Math.min(p + drawCount, n);
        out.add(p - 1);
      }
      p = 0;
      while (p < n) {
        p = Math.min(p + drawCount, n);
        out.add(p - 1);
      }
    }
    return [...out].map((j) => cards[T[j]]);
  }

  function talonUseful() {
    for (const c of reachableTalon()) {
      const f = foundationFor(c);
      if (f) {
        const fp = piles[f];
        if ((!fp.length && c.rank === 1) || (fp.length && fp[fp.length - 1].rank === c.rank - 1)) return true;
      }
      for (let i = 0; i < 7; i++) {
        const col = piles['t' + i];
        const top = col[col.length - 1];
        if (!top ? c.rank === 13 : top.up && isRed(top.suit) !== isRed(c.suit) && top.rank === c.rank + 1) return true;
      }
    }
    return false;
  }

  function findHint() {
    // 1. anything to a foundation
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      if (!col.length) continue;
      const f = foundationFor(col[col.length - 1]);
      if (f && canMove('t' + i, col.length - 1, f)) return { from: 't' + i, index: col.length - 1, to: f };
    }
    if (piles.w.length) {
      const f = foundationFor(piles.w[piles.w.length - 1]);
      if (f && canMove('w', piles.w.length - 1, f)) return { from: 'w', index: piles.w.length - 1, to: f };
    }
    // 2. a run that uncovers a face-down card
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      const u = col.findIndex((c) => c.up);
      if (u <= 0) continue;
      for (let j = 0; j < 7; j++) if (canMove('t' + i, u, 't' + j)) return { from: 't' + i, index: u, to: 't' + j };
    }
    // 3. waste to tableau
    if (piles.w.length) {
      const to = bestTarget('w', piles.w.length - 1);
      if (to && to[0] === 't') return { from: 'w', index: piles.w.length - 1, to };
    }
    // 4. split a run so the exposed card can go up
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      for (let k = 1; k < col.length; k++) {
        if (!col[k - 1].up) continue;
        const f = foundationFor(col[k - 1]);
        if (!f || piles[f].length !== col[k - 1].rank - 1) continue;
        for (let j = 0; j < 7; j++) if (piles['t' + j].length && canMove('t' + i, k, 't' + j)) return { from: 't' + i, index: k, to: 't' + j };
      }
    }
    // 5. the stock, if any stock/waste card can actually be played somewhere
    if (talonUseful()) return { stock: true };
    return null;
  }

  function showHint() {
    if (busy()) return;
    const h = findHint();
    if (!h) {
      showToast('No useful moves left. Try Undo or New');
      softNo();
      return;
    }
    hint = { ...h, t0: t };
    sfx.play('pop');
  }

  // ---------- flow ----------
  function afterChange() {
    layout();
    hint = null;
    if (!won && piles.f0.length + piles.f1.length + piles.f2.length + piles.f3.length === 52) {
      onWin();
      return;
    }
    autoAvail = !autoRunning && computeAutoAvail();
    if (!autoRunning && !stuckShown && !findHint()) {
      stuckShown = true;
      showToast('No useful moves left. Try Undo or New', 2.8);
    }
  }

  function shareText(secs) {
    const mode = `Draw ${drawCount}`;
    const head = api.daily ? `Solitaire Daily ${new Date().toISOString().slice(0, 10)}` : `Solitaire (${mode})`;
    return `${head} ♠♥♣♦\nSolved in ${fmtTime(secs)} · ${moves} moves${api.daily ? ` · ${mode}` : ''}`;
  }

  function onWin() {
    won = true;
    autoRunning = false;
    autoAvail = false;
    clockOn = false;
    pending = null;
    dragPos = null;
    const secs = Math.max(1, Math.round(elapsed));
    api.setScore(secs);
    winT = t;
    sfx.play('win');
    api.haptic(40);
    api.happy();
    fx.confetti(W * 0.3, H * 0.45, 70);
    fx.confetti(W * 0.7, H * 0.45, 70);
    api.gameOver({ win: true, delay: 3600, stats: { moves, time: fmtTime(secs), draw: drawCount, shareText: shareText(secs) } });
  }

  function startCascade() {
    const order = [];
    for (let r = 13; r >= 1; r--) {
      for (let i = 0; i < 4; i++) {
        const c = piles['f' + i].find((q) => q.rank === r);
        if (c) order.push(c);
      }
    }
    cascade = { order, idx: 0, next: 0, bouncers: [] };
    trail = null;
    trailG = null;
  }

  function stepCascade(dt) {
    if (!cascade) return;
    cascade.next -= dt;
    while (cascade.next <= 0 && cascade.idx < cascade.order.length) {
      const c = cascade.order[cascade.idx++];
      c.launched = true;
      const dir = Math.random() < 0.5 ? -1 : 1;
      cascade.bouncers.push({ c, x: c.x, y: c.y, vx: dir * (110 + Math.random() * 170), vy: -60 - Math.random() * 260 });
      cascade.next += 0.15;
    }
    const floor = H - CH - 4;
    for (let i = cascade.bouncers.length - 1; i >= 0; i--) {
      const b = cascade.bouncers[i];
      for (let s = 0; s < 3; s++) {
        const h = dt / 3;
        b.vy += 1400 * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (b.y > floor) {
          b.y = floor;
          b.vy = -Math.abs(b.vy) * 0.76;
        }
        stamp(b);
      }
      if (b.x < -CW - 20 || b.x > W + 20) cascade.bouncers.splice(i, 1);
    }
  }

  function stamp(b) {
    if (!hasDom || !sprites[b.c.id]) return;
    if (!trail) {
      trail = document.createElement('canvas');
      trail.width = Math.ceil(W * spriteScale);
      trail.height = Math.ceil(H * spriteScale);
      trailG = trail.getContext('2d');
    }
    trailG.drawImage(sprites[b.c.id], Math.round((b.x - PAD) * spriteScale), Math.round((b.y - PAD) * spriteScale));
  }

  // ---------- deal ----------
  function generateOrder() {
    let order = null;
    for (let attempt = 0; attempt < SOLVER_TRIES; attempt++) {
      order = [];
      for (let i = 0; i < 52; i++) order.push(i);
      api.rng.shuffle(order);
      if (isWinnable(order, drawCount, SOLVER_BUDGET).solved) break;
    }
    return order;
  }

  function newDeal(sameDeal) {
    if (!sameDeal || !lastOrder) lastOrder = generateOrder();
    const d = dealFromOrder(lastOrder);
    for (const id of PILE_IDS) piles[id] = [];
    for (const c of cards) {
      c.up = false;
      c.flipT = 9;
      c.dragging = false;
      c.launched = false;
      c.x = STOCK_X;
      c.y = TOP_Y;
      c.ft = 1;
      c.fd = 1;
      c.shake = -9;
    }
    flyers = [];
    for (let i = 0; i < 7; i++) piles['t' + i] = d.tab[i].map((id) => cards[id]);
    piles.s = d.stock.map((id) => cards[id]);
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      col[col.length - 1].up = true;
    }
    layout();
    // deal animation: row by row, like a real dealer
    let k = 0;
    for (let row = 0; row < 7; row++) {
      for (let col = row; col < 7; col++) {
        const c = piles['t' + col][row];
        const delay = 0.08 + k * 0.03;
        startFly(c, 0.26, delay);
        if (c.up) c.flipT = -(delay + 0.2);
        sfx.tone({ freq: 1500 + (k % 7) * 40, type: 'triangle', dur: 0.02, vol: 0.035, delay });
        k++;
      }
    }
    dealEnd = t + 0.08 + k * 0.03 + 0.3;
    history = [];
    moves = 0;
    elapsed = 0;
    clockOn = false;
    won = false;
    winT = -1;
    fanN = 0;
    hint = null;
    toast = null;
    confirm = null;
    pending = null;
    dragPos = null;
    dropHover = null;
    autoRunning = false;
    cascade = null;
    trail = null;
    trailG = null;
    stuckShown = false;
    autoAvail = false;
    api.setScore(0);
  }

  function reset() {
    t = 0;
    lastOrder = null;
    drawCount = api.daily ? 1 : api.store.get('draw', 1) === 3 ? 3 : 1;
    newDeal(false);
  }

  function needsConfirm(id, msg) {
    if (moves === 0 || won) return false;
    if (confirm && confirm.id === id && t < confirm.until) {
      confirm = null;
      return false;
    }
    confirm = { id, until: t + 2.6 };
    showToast(msg, 2.6);
    sfx.play('click');
    return true;
  }

  function pressButton(id) {
    if (id === 'new') {
      if (t < dealEnd || autoRunning) return;
      if (needsConfirm('new', 'Tap New again to deal a new game')) return;
      sfx.play('whoosh');
      newDeal(api.daily);
      if (api.daily) showToast('Daily deal restarted', 1.4);
    } else if (id === 'draw') {
      if (api.daily) {
        showToast('The Daily deal is always Draw 1', 1.8);
        softNo();
        return;
      }
      if (t < dealEnd || autoRunning) return;
      const next = drawCount === 1 ? 3 : 1;
      if (needsConfirm('draw', `Tap again to start a Draw ${next} game`)) return;
      drawCount = next;
      api.store.set('draw', drawCount);
      sfx.play('whoosh');
      newDeal(false);
      showToast(`Draw ${drawCount}`, 1.2);
    } else if (id === 'undo') {
      undo();
    } else if (id === 'hint') {
      showHint();
    } else if (id === 'auto') {
      if (!autoAvail || busy()) return;
      autoRunning = true;
      autoTimer = 0;
      sfx.play('levelup');
    }
  }

  // ---------- geometry / hit testing ----------
  function buttons() {
    const bw = W / 4;
    const ids = ['new', 'draw', autoAvail ? 'auto' : 'hint', 'undo'];
    return ids.map((id, i) => ({ id, x: i * bw + 6, y: TOOL_Y + 5, w: bw - 12, h: 50 }));
  }

  const inRect = (x, y, rx, ry, rw, rh) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

  function cardAt(x, y) {
    // tableau (top-most card first)
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      for (let k = col.length - 1; k >= 0; k--) {
        const c = col[k];
        if (inRect(x, y, c.x, c.y, CW, CH)) return { id: 't' + i, index: k, c };
      }
    }
    if (piles.w.length) {
      const c = piles.w[piles.w.length - 1];
      if (inRect(x, y, c.x, c.y, CW, CH)) return { id: 'w', index: piles.w.length - 1, c };
    }
    for (let i = 0; i < 4; i++) {
      const f = piles['f' + i];
      if (f.length && inRect(x, y, colX(i), TOP_Y, CW, CH)) return { id: 'f' + i, index: f.length - 1, c: f[f.length - 1] };
    }
    return null;
  }

  function dropTarget() {
    if (!pending || !pending.dragging) return null;
    const c0 = pending.cards[0];
    const ax = c0.x;
    const ay = c0.y;
    let best = null;
    let bestA = 0;
    const consider = (id, rx, ry, rw, rh) => {
      if (!canMove(pending.id, pending.index, id)) return;
      const ox = Math.min(ax + CW, rx + rw) - Math.max(ax, rx);
      const oy = Math.min(ay + CH, ry + rh) - Math.max(ay, ry);
      if (ox <= 0 || oy <= 0) return;
      const a = ox * oy;
      if (a > bestA) {
        bestA = a;
        best = id;
      }
    };
    for (let i = 0; i < 7; i++) {
      const col = piles['t' + i];
      const top = col[col.length - 1];
      if (top) consider('t' + i, top.tx, top.ty, CW, CH + 16);
      else consider('t' + i, colX(i), TAB_Y, CW, CH + 16);
    }
    if (pending.cards.length === 1) for (let i = 0; i < 4; i++) consider('f' + i, colX(i), TOP_Y, CW, CH);
    return best;
  }

  // ---------- update ----------
  function step(dt) {
    t += dt;
    if (clockOn && !won) elapsed += dt;
    // auto-complete driver
    if (autoRunning) {
      autoTimer -= dt;
      if (autoTimer <= 0) {
        autoTimer = 0.085;
        if (!autoStep()) autoRunning = false;
      }
    }
    // card motion
    for (const c of cards) {
      if (c.flipT < FLIP_DUR) c.flipT += dt;
      if (c.dragging) continue;
      if (c.ft < c.fd) {
        c.ft += dt;
        if (c.ft < 0) continue;
        const k = Math.min(1, c.ft / c.fd);
        const e = easeOutCubic(k);
        c.x = c.fx0 + (c.tx - c.fx0) * e;
        c.y = c.fy0 + (c.ty - c.fy0) * e;
        if (k >= 1) {
          c.ft = c.fd;
          const i = flyers.indexOf(c);
          if (i >= 0) flyers.splice(i, 1);
        }
      } else if (!c.launched) {
        const kk = Math.min(1, dt * 22);
        c.x += (c.tx - c.x) * kk;
        c.y += (c.ty - c.y) * kk;
      }
    }
    // drag follow (slightly smoothed)
    if (pending && pending.dragging && dragPos) {
      const kk = Math.min(1, dt * 32);
      dragPos.rx += (dragPos.x - dragPos.rx) * kk;
      dragPos.ry += (dragPos.y - dragPos.ry) * kk;
      pending.cards.forEach((c, k) => {
        c.x = dragPos.rx;
        c.y = dragPos.ry + k * FU;
      });
      dropHover = dropTarget();
    }
    if (won && !cascade && t - winT > 0.5 && !flyers.length) startCascade();
    if (cascade) stepCascade(dt);
    if (toast && t - toast.t0 > toast.dur) toast = null;
    if (hint && t - hint.t0 > 2.2) hint = null;
  }

  // ---------- render ----------
  function drawCard(g, c, x, y, ds, lift = 0) {
    let faceUp = c.up;
    let sx = 1;
    if (c.up && c.flipT < FLIP_DUR) {
      if (c.flipT < 0) faceUp = false;
      else {
        const k = c.flipT / FLIP_DUR;
        sx = Math.abs(Math.cos(k * Math.PI));
        faceUp = k >= 0.5;
      }
    }
    let ox = 0;
    const se = t - c.shake;
    if (se >= 0 && se < 0.35) ox = Math.sin(se * 60) * 5 * (1 - se / 0.35);
    const spr = sprites[faceUp ? c.id : 52];
    const sc = 1 + lift;
    if (spr) {
      if (sx !== 1 || sc !== 1) {
        g.save();
        g.translate(x + ox + CW / 2, y + CH / 2);
        g.scale(Math.max(0.02, sx) * sc, sc);
        g.drawImage(spr, -CW / 2 - PAD, -CH / 2 - PAD, CW + PAD * 2, CH + PAD * 2);
        g.restore();
      } else {
        g.drawImage(spr, Math.round((x + ox - PAD) * ds) / ds, Math.round((y - PAD) * ds) / ds, CW + PAD * 2, CH + PAD * 2);
      }
    } else {
      g.save();
      g.translate(x + ox + CW / 2, y + CH / 2);
      g.scale(Math.max(0.02, sx) * sc, sc);
      if (faceUp) drawFace(g, c.rank, c.suit, -CW / 2, -CH / 2, CW, CH);
      else drawBack(g, -CW / 2, -CH / 2, CW, CH);
      g.restore();
    }
  }

  function slot(g, x, y, label) {
    roundRectPath(g, x + 1, y + 1, CW - 2, CH - 2, 7);
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 1.5;
    g.stroke();
    if (label) draw.text(g, label, x + CW / 2, y + CH / 2 + 1, { size: 26, weight: 800, color: 'rgba(255,255,255,0.22)', shadow: false });
  }

  function glow(g, x, y, w, h, color, a) {
    g.save();
    g.globalAlpha = a;
    g.shadowColor = color;
    g.shadowBlur = 12 * spriteScale;
    roundRectPath(g, x - 2, y - 2, w + 4, h + 4, 8);
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  }

  function renderHud(g) {
    g.fillStyle = 'rgba(0,0,0,0.24)';
    g.fillRect(0, 0, W, HUD_H);
    draw.text(g, 'MOVES', 16, 15, { size: 11, weight: 800, color: 'rgba(255,255,255,0.62)', align: 'left', shadow: false });
    draw.text(g, String(moves), 16, 33, { size: 19, weight: 800, align: 'left', shadow: false });
    draw.text(g, fmtTime(elapsed), W / 2, 24, { size: 24, weight: 800, shadow: 'rgba(0,0,0,0.3)' });
    const tag = api.daily ? 'DAILY' : `DRAW ${drawCount}`;
    g.font = draw.font(12, 800);
    const tw = g.measureText(tag).width + 18;
    const tx = W - 76 - tw;
    draw.roundRect(g, tx, 12, tw, 22, 11, api.daily ? '#ffd23f' : 'rgba(255,255,255,0.14)');
    draw.text(g, tag, tx + tw / 2, 24, { size: 12, weight: 800, color: api.daily ? '#3a2600' : '#ffffff', shadow: false });
  }

  function icon(g, id, cx, cy, color) {
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (id === 'new') {
      roundRectPath(g, -8, -11, 16, 22, 3);
      g.stroke();
      g.beginPath();
      g.moveTo(0, -5);
      g.lineTo(0, 5);
      g.moveTo(-5, 0);
      g.lineTo(5, 0);
      g.stroke();
    } else if (id === 'draw') {
      roundRectPath(g, -11, -9, 13, 18, 2.5);
      g.stroke();
      roundRectPath(g, -2, -12, 13, 18, 2.5);
      g.fillStyle = '#123d25';
      g.fill();
      g.stroke();
      g.fillStyle = color;
      g.font = draw.font(12, 800);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(drawCount), 4.5, -2.5);
    } else if (id === 'hint') {
      g.beginPath();
      g.arc(0, -3, 7.5, Math.PI * 0.8, Math.PI * 2.2);
      g.lineTo(3, 7);
      g.lineTo(-3, 7);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.moveTo(-3, 11);
      g.lineTo(3, 11);
      g.stroke();
    } else if (id === 'auto') {
      g.beginPath();
      g.moveTo(2, -12);
      g.lineTo(-7, 2);
      g.lineTo(0, 2);
      g.lineTo(-2, 12);
      g.lineTo(7, -2);
      g.lineTo(0, -2);
      g.closePath();
      g.fill();
    } else if (id === 'undo') {
      g.beginPath();
      g.arc(1, 2, 8, Math.PI * 1.15, Math.PI * 0.55);
      g.stroke();
      g.beginPath();
      g.moveTo(-10, -6);
      g.lineTo(-7, 1);
      g.lineTo(-1, -3);
      g.stroke();
    }
    g.restore();
  }

  function renderToolbar(g) {
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(0, TOOL_Y, W, H - TOOL_Y);
    for (const b of buttons()) {
      const isAuto = b.id === 'auto';
      const down = pressedBtn === b.id;
      const pulse = isAuto ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      if (isAuto) {
        draw.roundRect(g, b.x, b.y + 2, b.w, b.h, 14, '#b7791f');
        draw.roundRect(g, b.x, b.y + (down ? 2 : 0), b.w, b.h, 14, `rgba(255,${200 + pulse * 30},${50 + pulse * 40},1)`);
      } else if (down) {
        draw.roundRect(g, b.x, b.y, b.w, b.h, 14, 'rgba(255,255,255,0.16)');
      }
      const disabled = (b.id === 'undo' && !history.length) || (b.id === 'draw' && api.daily);
      const color = isAuto ? '#3a2600' : disabled ? 'rgba(255,255,255,0.35)' : '#ffffff';
      const oy = down ? 2 : 0;
      icon(g, b.id, b.x + b.w / 2, b.y + 18 + oy, color);
      const label = b.id === 'new' ? 'New' : b.id === 'draw' ? `Draw ${drawCount}` : b.id === 'hint' ? 'Hint' : b.id === 'auto' ? 'Auto' : 'Undo';
      draw.text(g, label, b.x + b.w / 2, b.y + 41 + oy, { size: 13, weight: 800, color, shadow: false });
    }
  }

  function renderPiles(g, ds) {
    // slots
    for (let i = 0; i < 4; i++) slot(g, colX(i), TOP_Y, 'A');
    slot(g, STOCK_X, TOP_Y, '');
    for (let i = 0; i < 7; i++) slot(g, colX(i), TAB_Y, '');
    if (!piles.s.length && piles.w.length) {
      // recycle arrow
      g.save();
      g.translate(STOCK_X + CW / 2, TOP_Y + CH / 2);
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(0, 0, 13, -Math.PI * 0.35, Math.PI * 1.35);
      g.stroke();
      g.beginPath();
      g.moveTo(9, -16);
      g.lineTo(9, -8);
      g.lineTo(17, -8);
      g.stroke();
      g.restore();
    }
    // foundations: draw the top two resting cards
    for (let i = 0; i < 4; i++) drawStack(g, piles['f' + i], ds);
    // stock: a little thickness
    const sn = piles.s.filter((c) => !isFlying(c)).length;
    if (sn) {
      const layers = Math.min(3, Math.ceil(sn / 8));
      for (let l = layers - 1; l >= 1; l--) drawCard(g, piles.s[0], STOCK_X + l * 1.2, TOP_Y + l * 1.2, ds);
      const top = lastResting(piles.s);
      if (top) drawCard(g, top, top.x, top.y, ds);
      if (!won) draw.text(g, String(piles.s.length), STOCK_X + CW - 6, TOP_Y + CH - 9, { size: 11, weight: 800, color: 'rgba(255,255,255,0.85)', align: 'right', shadow: 'rgba(0,0,0,0.6)' });
    }
    // waste: fanned cards are all visible
    const wv = wasteVisible();
    const wn = piles.w.length;
    for (let k = Math.max(0, wn - wv - 1); k < wn; k++) {
      const c = piles.w[k];
      if (!isFlying(c) && !c.dragging) drawCard(g, c, c.x, c.y, ds);
    }
    // tableau
    for (let i = 0; i < 7; i++) {
      for (const c of piles['t' + i]) if (!isFlying(c) && !c.dragging) drawCard(g, c, c.x, c.y, ds);
    }
  }

  function isFlying(c) {
    return c.ft < c.fd;
  }

  function lastResting(list) {
    for (let k = list.length - 1; k >= 0; k--) if (!isFlying(list[k]) && !list[k].dragging && !list[k].launched) return list[k];
    return null;
  }

  function drawStack(g, list, ds) {
    let found = 0;
    const show = [];
    for (let k = list.length - 1; k >= 0 && found < 2; k--) {
      const c = list[k];
      if (isFlying(c) || c.dragging || c.launched) continue;
      show.push(c);
      found++;
    }
    for (let k = show.length - 1; k >= 0; k--) drawCard(g, show[k], show[k].x, show[k].y, ds);
  }

  function renderHints(g) {
    if (hint) {
      const a = 0.55 + 0.45 * Math.sin((t - hint.t0) * 10);
      if (hint.stock) glow(g, STOCK_X, TOP_Y, CW, CH, '#ffe066', a);
      else {
        const col = piles[hint.from];
        const c0 = col[hint.index];
        const last = col[col.length - 1];
        if (c0 && last) glow(g, c0.x, c0.y, CW, last.y - c0.y + CH, '#ffe066', a);
        const to = piles[hint.to];
        const top = to[to.length - 1];
        const r = top ? { x: top.x, y: top.y } : hint.to[0] === 'f' ? { x: colX(Number(hint.to[1])), y: TOP_Y } : { x: colX(Number(hint.to[1])), y: TAB_Y };
        glow(g, r.x, r.y, CW, CH, '#7df0ff', a);
      }
    }
    if (dropHover) {
      const to = piles[dropHover];
      const top = to[to.length - 1];
      const r = top ? { x: top.tx, y: top.ty } : dropHover[0] === 'f' ? { x: colX(Number(dropHover[1])), y: TOP_Y } : { x: colX(Number(dropHover[1])), y: TAB_Y };
      glow(g, r.x, r.y, CW, CH, '#7df0ff', 0.9);
    }
  }

  function renderWinBanner(g) {
    if (!won || winT < 0) return;
    const k = Math.min(1, (t - winT - 0.3) / 0.5);
    if (k <= 0) return;
    const sc = 0.7 + 0.3 * api.ease.outBack(k);
    g.save();
    g.globalAlpha = Math.min(1, k * 1.5);
    g.translate(W / 2, H * 0.4);
    g.scale(sc, sc);
    draw.roundRect(g, -150, -58, 300, 116, 26, 'rgba(8,30,18,0.72)', 'rgba(255,255,255,0.18)', 2);
    draw.text(g, 'SOLVED!', 0, -18, { size: 40, weight: 800, color: '#ffd23f', shadow: 'rgba(0,0,0,0.45)' });
    draw.text(g, `${fmtTime(api.score)}  ·  ${moves} moves`, 0, 28, { size: 20, weight: 800, shadow: false });
    g.restore();
  }

  function renderToast(g) {
    if (!toast) return;
    const e = t - toast.t0;
    const a = Math.min(1, e / 0.12) * Math.min(1, (toast.dur - e) / 0.3);
    if (a <= 0) return;
    g.font = draw.font(15, 800);
    const w = Math.min(W - 24, g.measureText(toast.text).width + 34);
    const h = 38;
    const y = TOOL_Y - 52;
    g.save();
    g.globalAlpha = a;
    draw.roundRect(g, W / 2 - w / 2, y, w, h, h / 2, 'rgba(10,20,14,0.88)', 'rgba(255,255,255,0.2)', 1.5);
    draw.text(g, toast.text, W / 2, y + h / 2 + 1, { size: 15, weight: 800, shadow: false, maxWidth: w - 20 });
    g.restore();
  }

  // ---------- test hooks (reachable through the engine controller's api) ----------
  const name = (c) => `${RANKS[c.rank]}${'SHCD'[c.suit]}`;
  const parse = (s) => {
    const m = /^(A|K|Q|J|10|[2-9])([SHCD])$/.exec(s);
    const rank = RANKS.indexOf(m[1]);
    return 'SHCD'.indexOf(m[2]) * 13 + rank - 1;
  };
  // Test hooks exist only on localhost (dev harness), never on the live site.
  if (DEV_HOST) api.__test = {
    state() {
      const o = { moves, elapsed, drawCount, won, autoAvail, busy: busy(), fanN };
      for (const id of PILE_IDS) o[id] = piles[id].map((c) => (c.up ? name(c) : name(c).toLowerCase()));
      return o;
    },
    /** Load a position: { t0: ['KS', 'qh'(face-down), ...], f0: [...], s: [...], w: [...] }; unspecified piles are empty. */
    load(spec) {
      for (const id of PILE_IDS) piles[id] = [];
      const used = new Set();
      for (const id of PILE_IDS) {
        for (const s of spec[id] || []) {
          const c = cards[parse(s.toUpperCase())];
          c.up = !/[a-z]/.test(s); // lowercase = face down
          c.flipT = 9;
          c.launched = false;
          c.dragging = false;
          c.ft = c.fd = 1;
          used.add(c.id);
          piles[id].push(c);
        }
      }
      for (const c of cards) if (!used.has(c.id)) throw new Error('missing card ' + name(c));
      history = [];
      moves = spec.moves || 0;
      fanN = Math.min(3, piles.w.length);
      won = false;
      winT = -1;
      cascade = null;
      dealEnd = 0;
      autoRunning = false;
      if (spec.draw) drawCount = spec.draw;
      layout();
      for (const c of cards) {
        c.x = c.tx;
        c.y = c.ty;
      }
      flyers = [];
      afterChange();
    },
    canMove: (a, i, b) => canMove(a, i, b),
    move: (a, i, b) => moveCards(a, i, b),
    tap: (a, i) => tapMove(a, i),
    bestTarget: (a, i) => bestTarget(a, i),
    stock: () => clickStock(),
    undo: () => undo(),
    press: (id) => pressButton(id),
    hint: () => findHint(),
    cardRect(id, i) {
      const c = piles[id][i < 0 ? piles[id].length + i : i];
      return c ? { x: c.x, y: c.y, w: CW, h: CH } : null;
    },
    slotRect(id) {
      if (id === 's') return { x: STOCK_X, y: TOP_Y, w: CW, h: CH };
      if (id[0] === 'f') return { x: colX(Number(id[1])), y: TOP_Y, w: CW, h: CH };
      return { x: colX(Number(id[1])), y: TAB_Y, w: CW, h: CH };
    },
    buttonRect(id) {
      return buttons().find((b) => b.id === id) || null;
    },
    get cascade() {
      return cascade ? { launched: cascade.idx, active: cascade.bouncers.length } : null;
    },
    get toast() {
      return toast ? toast.text : null;
    },
    get dragging() {
      return !!(pending && pending.dragging);
    },
    get dropHover() {
      return dropHover;
    },
    get lastOrder() {
      return lastOrder ? lastOrder.slice() : null;
    },
    get flyers() {
      return flyers.length;
    },
  };

  reset();

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
        if (activePointer != null && activePointer !== e.id) return true;
        activePointer = e.id;
        const b = buttons().find((q) => inRect(e.x, e.y, q.x, q.y, q.w, q.h));
        if (b) {
          pressedBtn = b.id;
          return true;
        }
        if (busy()) return true;
        if (inRect(e.x, e.y, STOCK_X, TOP_Y, CW, CH)) {
          clickStock();
          return true;
        }
        const hit = cardAt(e.x, e.y);
        if (hit && hit.c.up) {
          pending = { id: hit.id, index: hit.index, x0: e.x, y0: e.y, offX: e.x - hit.c.x, offY: e.y - hit.c.y, dragging: false, cards: piles[hit.id].slice(hit.index) };
        }
        return true;
      }
      if (e.type === 'move') {
        if (activePointer == null || e.id !== activePointer) return false;
        if (pending && !busy()) {
          if (!pending.dragging && Math.hypot(e.x - pending.x0, e.y - pending.y0) > DRAG_THRESHOLD) {
            // only runs that could legally move are draggable
            if (pending.id[0] === 't' && !isRun(pending.cards)) {
              pending = null;
              return true;
            }
            pending.dragging = true;
            const c0 = pending.cards[0];
            dragPos = { x: e.x - pending.offX, y: e.y - pending.offY, rx: c0.x, ry: c0.y };
            for (const c of pending.cards) {
              c.dragging = true;
              const fi = flyers.indexOf(c);
              if (fi >= 0) flyers.splice(fi, 1);
              c.ft = c.fd;
            }
            hint = null;
            sfx.tone({ freq: 900, to: 1100, type: 'triangle', dur: 0.04, vol: 0.07 });
          }
          if (pending.dragging) {
            dragPos.x = e.x - pending.offX;
            dragPos.y = e.y - pending.offY;
          }
        }
        return true;
      }
      if (e.type === 'up') {
        if (e.id !== activePointer) return false;
        activePointer = null;
        if (pressedBtn) {
          const b = buttons().find((q) => inRect(e.x, e.y, q.x, q.y, q.w, q.h));
          const id = pressedBtn;
          pressedBtn = null;
          if (b && b.id === id) pressButton(id);
          return true;
        }
        if (pending) {
          const p = pending;
          pending = null;
          if (p.dragging && piles[p.id][p.index] !== p.cards[0]) {
            // the piles changed under the drag (should not happen): just put the cards back
            for (const c of p.cards) c.dragging = false;
            dragPos = null;
            dropHover = null;
            layout();
          } else if (p.dragging) {
            // final position straight from the pointer, then drop
            dragPos.rx = dragPos.x;
            dragPos.ry = dragPos.y;
            p.cards.forEach((c, k) => {
              c.x = dragPos.x;
              c.y = dragPos.y + k * FU;
            });
            pending = p;
            const target = dropTarget();
            pending = null;
            dropHover = null;
            for (const c of p.cards) c.dragging = false;
            if (target && moveCards(p.id, p.index, target, { dur: 0.13 })) {
              // moved
            } else {
              layout();
              p.cards.forEach((c, k) => startFly(c, 0.24, k * 0.015));
              softNo();
            }
            dragPos = null;
          } else if (!busy()) {
            tapMove(p.id, p.index);
          }
        }
        return true;
      }
      if (e.type === 'keydown') {
        const k = e.key;
        if (pending && pending.dragging) return true; // finish the drag first
        if (k === 'z' || k === 'Z' || k === 'u' || k === 'U' || k === 'Backspace') {
          undo();
          return true;
        }
        if (k === ' ' || k === 'd' || k === 'D' || k === 'Enter') {
          if (!e.repeat && !busy()) clickStock();
          return true;
        }
        if (k === 'h' || k === 'H') {
          showHint();
          return true;
        }
        if (k === 'a' || k === 'A') {
          pressButton('auto');
          return true;
        }
        if (k === 'n' || k === 'N') {
          pressButton('new');
          return true;
        }
      }
      return false;
    },
    render(g) {
      const m = g.getTransform();
      const ds = Math.max(0.5, Math.round(Math.hypot(m.a, m.b) * 100) / 100);
      ensureSprites(ds);
      drawFelt(g, W, H);
      renderHud(g);
      renderPiles(g, ds);
      if (trail) g.drawImage(trail, 0, 0, trail.width / spriteScale, trail.height / spriteScale);
      renderHints(g);
      // cards in flight, in the order they started moving
      for (const c of flyers) {
        if (c.dragging || c.launched) continue;
        const k = c.ft < 0 ? 0 : Math.min(1, c.ft / c.fd);
        drawCard(g, c, c.x, c.y, ds, 0.05 * Math.sin(Math.PI * k));
      }
      // bouncing win cascade
      if (cascade) for (const b of cascade.bouncers) drawCard(g, b.c, b.x, b.y, ds);
      // dragged stack with a lifted shadow
      if (pending && pending.dragging) {
        const c0 = pending.cards[0];
        const hgt = (pending.cards.length - 1) * FU + CH;
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.45)';
        g.shadowBlur = 16 * ds;
        g.shadowOffsetY = 8 * ds;
        roundRectPath(g, c0.x + 3, c0.y + 4, CW - 6, hgt - 6, 8);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fill();
        g.restore();
        for (const c of pending.cards) drawCard(g, c, c.x, c.y, ds);
      }
      renderToolbar(g);
      renderWinBanner(g);
      renderToast(g);
    },
  };
}

// ---------- cover art ----------
function coverCard(g, rank, suit, x, y, cw, ch, shadow) {
  if (shadow) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.38)';
    g.shadowBlur = ch * 0.08;
    g.shadowOffsetY = ch * 0.03;
    roundRectPath(g, x, y, cw, ch, cw * 0.1);
    g.fillStyle = '#fdfcf7';
    g.fill();
    g.restore();
  }
  if (rank) drawFace(g, rank, suit, x, y, cw, ch);
  else drawBack(g, x, y, cw, ch);
}

export function cover(g, w, h) {
  drawFelt(g, w, h);
  const u = Math.min(w / 800, h / 600);
  // the classic win: a card bouncing across the table, leaving a trail of copies
  const ch2 = 165 * u;
  const cw2 = ch2 / 1.42;
  const floor = h - ch2 - h * 0.035;
  const x0 = w * 0.5;
  const x1 = w - cw2 - w * 0.03;
  const steps = 44;
  let y = h * 0.02;
  let vy = -2 * u;
  const grav = ((floor - y) * 2.2) / (steps * steps * 0.2);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    coverCard(g, 12, 3, x, y, cw2, ch2, i === steps);
    vy += grav;
    y += vy;
    if (y > floor) {
      y = floor;
      vy = -vy * 0.68;
    }
  }
  // soft light behind the hand
  const cx = w * 0.31;
  const glowG = g.createRadialGradient(cx, h * 0.5, 0, cx, h * 0.5, h * 0.6);
  glowG.addColorStop(0, 'rgba(255,255,255,0.18)');
  glowG.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glowG;
  g.fillRect(0, 0, w, h);
  // fanned hand: ace, queen, jack and the king in front
  const ch = Math.min(285 * u, w * 0.325);
  const cw = ch / 1.42;
  const hand = [
    [1, 0],
    [12, 2],
    [11, 3],
    [13, 1],
  ];
  const pivotY = h * 0.5 + ch * 1.35;
  hand.forEach(([rank, suit], i) => {
    const a = (i - 1.5) * 0.22;
    g.save();
    g.translate(cx, pivotY);
    g.rotate(a);
    coverCard(g, rank, suit, -cw / 2, -ch * 1.85, cw, ch, true);
    g.restore();
  });
  // sparkles
  g.fillStyle = '#ffd23f';
  const spark = (px, py, s) => {
    g.beginPath();
    g.moveTo(px, py - s * 3);
    g.quadraticCurveTo(px, py, px + s * 3, py);
    g.quadraticCurveTo(px, py, px, py + s * 3);
    g.quadraticCurveTo(px, py, px - s * 3, py);
    g.quadraticCurveTo(px, py, px, py - s * 3);
    g.fill();
  };
  spark(cx + cw * 1.05, h * 0.12, 7 * u);
  spark(cx - cw * 1.1, h * 0.14, 5 * u);
  spark(cx + cw * 1.45, h * 0.42, 4 * u);
  spark(w * 0.93, h * 0.12, 5 * u);
}
