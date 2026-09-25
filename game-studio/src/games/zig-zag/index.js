// Zig Zag - roll a ball along a narrow isometric path, tap to switch direction.
// The path is a strip of raised diamond tiles on an isometric grid. Grid cell (i, j):
//   +i = up-right on screen, +j = up-left. Every path step increases i + j by exactly 1,
//   so path tile k always sits at depth s = i + j = S0 + k (cheap O(1) lookups).
import { mulberry32 } from '../engine/rng.js';

const TW = 66; // tile diamond width
const HW = TW / 2;
const HH = TW / 4; // 2:1 isometric
const DEPTH = 34; // block side height
const DMAX = 5; // |i - j| limit keeps the path on screen
const S0 = 4; // depth of path tile 0 (the platform ends at depth 4)
const BALL_R = 11;
const TRAIL = 16;
const GRACE = 0.14; // how far (in tiles) the ball may hang over an edge before it drops

function hsl(h, s, l, a = 1) {
  return `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
}

function drawBlock(g, x, y, hw, hh, depth, top, left, right) {
  g.fillStyle = left;
  g.beginPath();
  g.moveTo(x - hw, y);
  g.lineTo(x, y + hh);
  g.lineTo(x, y + hh + depth);
  g.lineTo(x - hw, y + depth);
  g.closePath();
  g.fill();
  g.fillStyle = right;
  g.beginPath();
  g.moveTo(x, y + hh);
  g.lineTo(x + hw, y);
  g.lineTo(x + hw, y + depth);
  g.lineTo(x, y + hh + depth);
  g.closePath();
  g.fill();
  g.fillStyle = top;
  g.beginPath();
  g.moveTo(x, y - hh);
  g.lineTo(x + hw, y);
  g.lineTo(x, y + hh);
  g.lineTo(x - hw, y);
  g.closePath();
  g.fill();
}

function drawGem(g, x, y, s) {
  const w = 7 * s;
  const h = 11 * s;
  g.fillStyle = '#ff5fd6';
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x - w, y);
  g.lineTo(x, y + h);
  g.closePath();
  g.fill();
  g.fillStyle = '#c2189f';
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x + w, y);
  g.lineTo(x, y + h);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x - w * 0.55, y - h * 0.15);
  g.lineTo(x - w * 0.1, y - h * 0.05);
  g.closePath();
  g.fill();
}

function drawBall(g, x, y, r, hue, sx = 1, sy = 1) {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  g.fillStyle = hsl(hue, 88, 58);
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = hsl(hue, 80, 42, 0.55);
  g.beginPath();
  g.arc(0, 0, r, -0.2, Math.PI * 0.9);
  g.arc(-r * 0.18, -r * 0.2, r * 0.82, Math.PI * 0.9, -0.2, true);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(-r * 0.36, -r * 0.38, r * 0.28, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const CX = W / 2;
  const BALL_Y = H * 0.63;

  const tiles = []; // active path tiles, contiguous k from firstK
  const pool = [];
  const plat = []; // 3x3 start platform cells
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) plat.push({ i, j, falling: false, fallY: 0, fallV: 0, delay: 0, appear: 0 });

  const trail = new Float32Array(TRAIL * 2);
  let trailN = 0;
  let trailHead = 0;
  let trailTimer = 0;

  const ball = { u: 1.5, v: 1.5, dir: 0, ci: 1, cj: 1, alive: true, offPath: false, pending: false, curK: -1, fallT: 0, z: 0, vz: 0, fallSp: 0, squash: 0, speedMul: 1 };

  let firstK = 0;
  let genK = 0;
  let genI = 2;
  let genJ = 1;
  let genDir = 0;
  let lastLen = 0;
  let camS = 3;
  let camX = 0;
  let t = 0;
  let maxK = -1;
  let combo = 0;
  let gems = 0;
  let turns = 0;
  let hue = 195;
  let milestoneFlash = 0;
  let tutorial = true;

  function allocTile() {
    return pool.pop() || { i: 0, j: 0, k: 0, corner: false, dirOut: 0, gem: false, gemTaken: false, falling: false, fallY: 0, fallV: 0, delay: 0, appear: 0 };
  }

  function chooseLen(allowed) {
    if (allowed <= 1) return 1;
    const k = genK;
    const diff = Math.min(1, k / 360);
    const r = api.rng();
    const pDouble = k < 14 ? 0 : 0.07 + 0.17 * diff + (lastLen === 1 ? 0.1 * diff : 0);
    const pLong = k < 10 ? 0 : 0.11;
    let L;
    if (r < pDouble) L = 1;
    else if (r < pDouble + pLong) L = allowed;
    else L = api.rng.int(2, diff > 0.65 ? 3 : diff > 0.3 ? 4 : 5);
    return Math.max(1, Math.min(L, allowed));
  }

  function genSegment() {
    const d = genI - genJ;
    const allowed = genDir === 0 ? DMAX - d : DMAX + d;
    const L = genK === 0 ? 3 : chooseLen(allowed);
    const gemP = 0.075 + Math.min(0.04, genK / 5000);
    let prevGem = false;
    for (let n = 1; n <= L; n++) {
      if (genDir === 0) genI++;
      else genJ++;
      const tl = allocTile();
      tl.i = genI;
      tl.j = genJ;
      tl.k = genK++;
      tl.corner = n === L;
      tl.dirOut = n === L ? 1 - genDir : genDir;
      tl.gem = false;
      if (!tl.corner && tl.k > 8 && !prevGem) tl.gem = api.rng() < gemP;
      prevGem = tl.gem;
      tl.gemTaken = false;
      tl.falling = false;
      tl.fallY = 0;
      tl.fallV = 0;
      tl.delay = 0;
      tl.appear = 0;
      tiles.push(tl);
    }
    genDir = 1 - genDir;
    lastLen = L;
  }

  function ensurePath() {
    while (genI + genJ < camS + 36) genSegment();
  }

  function tileAt(ci, cj) {
    const idx = ci + cj - S0 - firstK;
    if (idx < 0 || idx >= tiles.length) return null;
    const tl = tiles[idx];
    if (tl.i !== ci || tl.fallY > 3) return null;
    return tl;
  }

  function platAt(ci, cj) {
    if (ci < 0 || ci > 2 || cj < 0 || cj > 2) return false;
    return plat[ci * 3 + cj].fallY <= 3;
  }

  function speedNow() {
    const k = Math.max(0, ball.curK);
    return 3.3 + 3.9 * (1 - Math.exp(-k / 280));
  }

  function sx(u, v) {
    return CX + (u - v) * HW - camX;
  }
  function sy(u, v) {
    return BALL_Y - (u + v - camS) * HH;
  }

  function reset() {
    while (tiles.length) pool.push(tiles.pop());
    firstK = 0;
    genK = 0;
    genI = 2;
    genJ = 1;
    genDir = 0;
    lastLen = 0;
    camS = 3;
    camX = 0;
    t = 0;
    maxK = -1;
    combo = 0;
    gems = 0;
    turns = 0;
    hue = 195;
    milestoneFlash = 0;
    tutorial = api.best == null || api.best < 15;
    Object.assign(ball, { u: 1.5, v: 1.5, dir: 0, ci: 1, cj: 1, alive: true, offPath: false, pending: false, curK: -1, fallT: 0, z: 0, vz: 0, fallSp: 0, squash: 0, speedMul: 1 });
    trailN = 0;
    trailHead = 0;
    for (let n = 0; n < plat.length; n++) {
      const p = plat[n];
      p.falling = false;
      p.fallY = 0;
      p.fallV = 0;
      p.appear = -0.04 * (p.i + p.j);
    }
    pilotReset();
    ensurePath();
    // intro cascade: the path builds itself upward from the platform
    for (let n = 0; n < tiles.length; n++) tiles[n].appear = -0.2 - n * 0.035;
  }

  // ---------- gameplay ----------
  function doTurn(newDir, kind) {
    ball.dir = newDir;
    ball.squash = 1;
    ball.pending = false;
    turns++;
    const x = sx(ball.u, ball.v);
    const y = sy(ball.u, ball.v);
    if (kind === 'perfect') {
      combo++;
      api.sfx.combo(Math.min(combo - 1, 14), 560);
      api.fx.ring(x, y, { color: 'rgba(255,255,255,0.9)', radius: 26 + Math.min(combo, 8) * 3, life: 0.35, width: 3 });
      if (combo === 3 || (combo >= 5 && combo % 5 === 0)) api.fx.text(x, y - 34, `PERFECT ×${combo}`, { color: '#fff7b0', size: 20 + Math.min(combo, 10), life: 0.7, rise: 40 });
      if (combo > 0 && combo % 8 === 0) {
        api.addScore(5);
        api.fx.text(x, y - 64, 'STREAK +5', { color: '#ffd23f', size: 26, life: 1 });
        api.sfx.play('perfect');
        api.fx.burst(x, y, { count: 24, colors: ['#fff', '#ffd23f', hsl(hue + 170, 90, 65)], speed: 260, size: 4, life: 0.6, gravity: 300 });
        api.happy();
      }
    } else {
      if (kind === 'late') api.fx.text(x, y - 30, 'CLOSE!', { color: '#bff6ff', size: 20, life: 0.6, rise: 36 });
      combo = 0;
      api.sfx.play('tap');
    }
    api.fx.burst(x, y + 2, { count: 5, color: 'rgba(255,255,255,0.9)', speed: 70, size: 2.5, life: 0.35, gravity: 0, spread: Math.PI * 2 });
    api.haptic(8);
  }

  function onTap() {
    if (!ball.alive) return;
    const newDir = 1 - ball.dir;
    const ci = ball.ci;
    const cj = ball.cj;
    if (ball.offPath) {
      // late grace: the ball is just hanging over a corner it should have turned on
      const pi = ball.dir === 0 ? ci - 1 : ci;
      const pj = ball.dir === 0 ? cj : cj - 1;
      const prev = tileAt(pi, pj);
      if (prev && prev.corner && prev.dirOut === newDir) {
        if (ball.dir === 0) ball.u = pi + 0.97;
        else ball.v = pj + 0.97;
        ball.ci = pi;
        ball.cj = pj;
        ball.offPath = false;
        doTurn(newDir, 'late');
        return;
      }
      doTurn(newDir, 'bad');
      return;
    }
    const tl = tileAt(ci, cj);
    const frac = ball.dir === 0 ? ball.u - ci : ball.v - cj;
    if (tl && tl.corner && tl.dirOut === newDir) {
      doTurn(newDir, Math.abs(frac - 0.5) < 0.2 ? 'perfect' : 'good');
      return;
    }
    // early buffer: a tap just before a corner is held until the ball reaches it
    if (frac > 0.78) {
      const ni = ball.dir === 0 ? ci + 1 : ci;
      const nj = ball.dir === 0 ? cj : cj + 1;
      const nx = tileAt(ni, nj);
      if (nx && nx.corner && nx.dirOut === newDir && (tl || platAt(ci, cj))) {
        ball.pending = true;
        return;
      }
    }
    doTurn(newDir, 'bad');
  }

  function enterTile(tl) {
    ball.curK = tl.k;
    if (tl.k > maxK) {
      maxK = tl.k;
      api.addScore(1);
      const n = maxK + 1;
      if (n % 100 === 0) {
        const x = sx(ball.u, ball.v);
        api.fx.confetti(W / 2, H * 0.34, 60);
        api.fx.text(W / 2, H * 0.3, `${n} TILES!`, { size: 40, color: '#ffffff', life: 1.4 });
        api.fx.text(x, sy(ball.u, ball.v) - 40, 'FASTER!', { size: 22, color: '#fff7b0', life: 1 });
        api.sfx.play('levelup');
        api.emit('milestone', { tiles: n });
        milestoneFlash = 1;
        api.happy();
      }
    }
    if (tl.gem && !tl.gemTaken) {
      tl.gemTaken = true;
      gems++;
      api.addScore(3);
      const x = sx(tl.i + 0.5, tl.j + 0.5);
      const y = sy(tl.i + 0.5, tl.j + 0.5) - 18;
      api.sfx.play('coin');
      api.fx.burst(x, y, { count: 16, colors: ['#ff5fd6', '#ffffff', '#ffb3ef'], speed: 190, size: 3.5, life: 0.5, gravity: 240, shape: 'square' });
      api.fx.ring(x, y, { color: '#ff9be8', radius: 30, life: 0.35 });
      api.fx.text(x, y - 16, '+3', { color: '#ffffff', size: 24, life: 0.7 });
      api.haptic(12);
    }
  }

  function onEnterCell(ci, cj) {
    const tl = tileAt(ci, cj);
    if (tl) {
      ball.offPath = false;
      enterTile(tl);
      if (ball.pending) {
        ball.pending = false;
        if (tl.corner && tl.dirOut !== ball.dir) doTurn(tl.dirOut, 'good');
      }
    } else if (platAt(ci, cj)) {
      ball.offPath = false;
    } else {
      ball.offPath = true;
      ball.pending = false;
    }
  }

  function die() {
    ball.alive = false;
    ball.fallT = 0;
    ball.vz = -40;
    ball.z = 0;
    ball.fallSp = speedNow() * ball.speedMul;
    combo = 0;
    api.sfx.play('whoosh');
    api.sfx.tone({ freq: 520, to: 110, type: 'triangle', dur: 0.6, vol: 0.16, delay: 0.05 });
    api.fx.shake(6, 0.3);
    api.fx.flash('#ffffff', 0.18);
    api.haptic(70);
    api.gameOver({ delay: 1000, stats: { tiles: maxK + 1, gems, turns } });
  }

  // ---------- demo autopilot (only runs when the engine calls demo()) ----------
  // Its own tiny PRNG so the seeded game randomness (api.rng) is never touched.
  const PILOT_SEED = 0x2192a;
  let prand = mulberry32(PILOT_SEED);
  let pilotAim = 0.45; // where on the corner tile (0..1 along the travel axis) to tap

  function pilotReset() {
    prand = mulberry32(PILOT_SEED);
    pilotAim = 0.4 + prand() * 0.16;
  }

  // Rolls like a seasoned player: taps on each corner tile close to its centre (PERFECT),
  // with a little natural spread in the timing.
  function demo() {
    tutorial = false; // the first-run "TAP!" hints are for new players, not the attract loop
    if (!ball.alive || ball.pending || ball.offPath) return;
    const tl = tileAt(ball.ci, ball.cj);
    if (!tl || !tl.corner || tl.dirOut === ball.dir) return;
    const frac = ball.dir === 0 ? ball.u - ball.ci : ball.v - ball.cj;
    if (frac < pilotAim) return;
    onTap();
    pilotAim = 0.4 + prand() * 0.16;
  }

  function stepBall(dt) {
    const sp = speedNow() * ball.speedMul;
    if (ball.speedMul < 1) ball.speedMul = Math.min(1, ball.speedMul + dt * 0.45);
    const pull = Math.min(1, dt * 12);
    if (ball.dir === 0) {
      ball.u += sp * dt;
      ball.v += (ball.cj + 0.5 - ball.v) * pull;
    } else {
      ball.v += sp * dt;
      ball.u += (ball.ci + 0.5 - ball.u) * pull;
    }
    const ci = Math.floor(ball.u);
    const cj = Math.floor(ball.v);
    if (ci !== ball.ci || cj !== ball.cj) {
      ball.ci = ci;
      ball.cj = cj;
      onEnterCell(ci, cj);
    }
    if (ball.offPath) {
      const over = ball.dir === 0 ? ball.u - ci : ball.v - cj;
      if (over > GRACE) die();
    } else if (!tileAt(ci, cj) && !platAt(ci, cj)) {
      die(); // safety net: the ground vanished under the ball
    }
  }

  function stepFall(dt) {
    ball.fallT += dt;
    ball.fallSp *= Math.pow(0.1, dt);
    if (ball.dir === 0) ball.u += ball.fallSp * dt;
    else ball.v += ball.fallSp * dt;
    ball.vz += 1100 * dt;
    ball.z += ball.vz * dt;
  }

  function stepWorld(dt, playing) {
    t += dt;
    if (ball.squash > 0) ball.squash = Math.max(0, ball.squash - dt * 5);
    if (milestoneFlash > 0) milestoneFlash = Math.max(0, milestoneFlash - dt * 1.2);
    hue += ((195 + Math.max(0, maxK) * 0.36) - hue) * Math.min(1, dt * 2);
    if (ball.alive) {
      if (playing) stepBall(dt);
      camS += (ball.u + ball.v - camS) * Math.min(1, dt * 7);
      camX += ((ball.u - ball.v) * HW * 0.22 - camX) * Math.min(1, dt * 3);
    } else {
      stepFall(dt);
    }
    ensurePath();
    // trail
    if (ball.alive && playing) {
      trailTimer += dt;
      if (trailTimer > 0.018) {
        trailTimer = 0;
        trail[trailHead * 2] = ball.u;
        trail[trailHead * 2 + 1] = ball.v;
        trailHead = (trailHead + 1) % TRAIL;
        if (trailN < TRAIL) trailN++;
      }
    } else if (trailN > 0 && playing === false) {
      trailTimer += dt;
      if (trailTimer > 0.03) {
        trailTimer = 0;
        trailN--;
      }
    }
    // tiles: drop-in, crumble behind the ball, recycle
    const crumbleK = ball.curK - 2;
    for (let n = 0; n < tiles.length; n++) {
      const tl = tiles[n];
      if (tl.appear < 1) {
        if (tl.appear < 0) tl.appear += dt;
        else if (sy(tl.i + 0.5, tl.j + 0.5) > -HH * 3) tl.appear = Math.min(1, tl.appear + dt * 3.2);
      }
      if (!tl.falling && tl.k <= crumbleK && (playing || !ball.alive)) {
        tl.falling = true;
        tl.delay = 0.08 + Math.random() * 0.12;
      }
      if (tl.falling) {
        if (tl.delay > 0) tl.delay -= dt;
        else {
          tl.fallV += 1300 * dt;
          tl.fallY += tl.fallV * dt;
        }
      }
    }
    while (tiles.length && tiles[0].falling && (tiles[0].fallY > 420 || sy(tiles[0].i + 0.5, tiles[0].j + 0.5) > H + 80)) {
      pool.push(tiles.shift());
      firstK++;
    }
    for (let n = 0; n < plat.length; n++) {
      const p = plat[n];
      if (p.appear < 1) p.appear = Math.min(1, p.appear + dt * 3.5);
      if (!p.falling && ball.curK >= 1 && (playing || !ball.alive)) {
        p.falling = true;
        p.delay = 0.05 + (2 - p.i + 2 - p.j) * 0.07 + Math.random() * 0.06;
      }
      if (p.falling) {
        if (p.delay > 0) p.delay -= dt;
        else if (p.fallY < 900) {
          p.fallV += 1300 * dt;
          p.fallY += p.fallV * dt;
        }
      }
    }
  }

  function revive() {
    // back onto the last solid tile the ball touched, facing along the path
    let tl = ball.curK >= 0 ? tiles[ball.curK - firstK] : null;
    if (tl) {
      for (let n = Math.max(0, ball.curK - 1 - firstK); n < tiles.length; n++) {
        const x = tiles[n];
        x.falling = false;
        x.fallY = 0;
        x.fallV = 0;
      }
      ball.u = tl.i + 0.5;
      ball.v = tl.j + 0.5;
      ball.dir = tl.dirOut;
      ball.ci = tl.i;
      ball.cj = tl.j;
    } else {
      for (let n = 0; n < plat.length; n++) {
        plat[n].falling = false;
        plat[n].fallY = 0;
        plat[n].fallV = 0;
      }
      ball.u = 1.5;
      ball.v = 1.5;
      ball.dir = 0;
      ball.ci = 1;
      ball.cj = 1;
    }
    ball.alive = true;
    ball.offPath = false;
    ball.pending = false;
    ball.fallT = 0;
    ball.z = 0;
    ball.vz = 0;
    ball.speedMul = 0.55;
    ball.squash = 1;
    combo = 0;
    trailN = 0;
    camS = ball.u + ball.v;
  }

  // ---------- rendering ----------
  function drawBg(g) {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, hsl(hue, 66, 70));
    grad.addColorStop(1, hsl(hue + 32, 62, 50));
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // drifting outline diamonds (parallax)
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 2;
    const scroll = camS * HH * 0.35 + t * 10;
    for (let n = 0; n < 14; n++) {
      const x = (n * 83.7 + 37) % W;
      const y = ((n * 151.3 + scroll) % (H + 80)) - 40;
      const s = 6 + ((n * 7) % 11);
      g.globalAlpha = 0.35 + ((n * 13) % 5) * 0.1;
      g.beginPath();
      g.moveTo(x, y - s * 0.5);
      g.lineTo(x + s, y);
      g.lineTo(x, y + s * 0.5);
      g.lineTo(x - s, y);
      g.closePath();
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  let colTop = '';
  let colLeft = '';
  let colRight = '';

  function drawTileAt(g, i, j, appear, fallY) {
    const x = sx(i + 0.5, j + 0.5);
    let y = sy(i + 0.5, j + 0.5);
    if (y < -HH - DEPTH || y - HH > H) return;
    let a = 1;
    if (appear < 1) {
      const k = Math.max(0, appear);
      y -= (1 - k) * (1 - k) * 110;
      a = Math.min(1, k * 2.2);
    }
    if (fallY > 0) {
      y += fallY;
      a = Math.max(0, 1 - fallY / 320);
    }
    if (a <= 0) return;
    g.globalAlpha = a;
    drawBlock(g, x, y, HW, HH, DEPTH, colTop, colLeft, colRight);
    g.globalAlpha = 1;
  }

  function drawBallNow(g) {
    const x = sx(ball.u, ball.v);
    const y = sy(ball.u, ball.v);
    const bhue = hue + 172;
    if (ball.alive) {
      // trail
      g.fillStyle = hsl(bhue, 90, 70);
      for (let n = 0; n < trailN; n++) {
        const idx = (trailHead - 1 - n + TRAIL) % TRAIL;
        const tu = trail[idx * 2];
        const tv = trail[idx * 2 + 1];
        const k = 1 - n / TRAIL;
        g.globalAlpha = 0.28 * k;
        g.beginPath();
        g.arc(sx(tu, tv), sy(tu, tv) - BALL_R + 2, BALL_R * (0.35 + 0.6 * k), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      // shadow
      g.fillStyle = 'rgba(20,30,60,0.2)';
      g.beginPath();
      g.ellipse(x + 2, y + 1, BALL_R * 1.05, BALL_R * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      const sq = ball.squash;
      const bob = Math.sin(t * 22) * 0.6;
      drawBall(g, x, y - BALL_R + 2 + bob, BALL_R, bhue, 1 + sq * 0.28, 1 - sq * 0.22);
    } else {
      const s = Math.max(0.15, 1 - ball.fallT * 0.75);
      g.globalAlpha = Math.max(0, Math.min(1, 1.6 - ball.fallT * 1.4));
      drawBall(g, x, y - BALL_R + 2 + ball.z, BALL_R * s, bhue);
      g.globalAlpha = 1;
    }
  }

  function render(g) {
    drawBg(g);
    colTop = hsl(hue, 40, 97);
    colLeft = hsl(hue + 8, 56, 75);
    colRight = hsl(hue + 12, 50, 52);
    const ballS = Math.floor(ball.u) + Math.floor(ball.v);
    let ballDrawn = ball.alive; // alive ball draws on top of everything
    // path, far to near
    for (let n = tiles.length - 1; n >= 0; n--) {
      const tl = tiles[n];
      if (!ballDrawn && tl.i + tl.j < ballS) {
        drawBallNow(g);
        ballDrawn = true;
      }
      drawTileAt(g, tl.i, tl.j, tl.appear, tl.delay > 0 ? 0 : tl.fallY);
    }
    for (let n = plat.length - 1; n >= 0; n--) {
      const p = plat[n];
      if (!ballDrawn && p.i + p.j < ballS) {
        drawBallNow(g);
        ballDrawn = true;
      }
      drawTileAt(g, p.i, p.j, p.appear, p.delay > 0 ? 0 : p.fallY);
    }
    if (!ballDrawn) drawBallNow(g);
    // gems (float above their tile)
    for (let n = 0; n < tiles.length; n++) {
      const tl = tiles[n];
      if (!tl.gem || tl.gemTaken || tl.appear < 0.6) continue;
      const x = sx(tl.i + 0.5, tl.j + 0.5);
      const y = sy(tl.i + 0.5, tl.j + 0.5) + (tl.delay > 0 ? 0 : tl.fallY);
      if (y < -30 || y > H + 30) continue;
      const bob = Math.sin(t * 4 + tl.k) * 3;
      g.fillStyle = 'rgba(40,20,80,0.16)';
      g.beginPath();
      g.ellipse(x, y + 2, 7, 3.5, 0, 0, Math.PI * 2);
      g.fill();
      drawGem(g, x, y - 18 + bob, 1);
    }
    if (ball.alive) drawBallNow(g);
    // first-run hint at the next corner
    if (tutorial && ball.alive && maxK < 24 && api.state === 'playing') {
      const k0 = Math.max(0, ball.curK + 1) - firstK;
      for (let n = Math.max(0, k0 - 1); n < Math.min(tiles.length, k0 + 4); n++) {
        const tl = tiles[n];
        if (!tl.corner || tl.k < ball.curK) continue;
        if (tl.k === ball.curK && tl.dirOut === ball.dir) continue;
        const x = sx(tl.i + 0.5, tl.j + 0.5);
        const y = sy(tl.i + 0.5, tl.j + 0.5);
        const p = 0.5 + 0.5 * Math.sin(t * 9);
        g.strokeStyle = `rgba(255,255,255,${0.5 + p * 0.5})`;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, y - HH - 3 - p * 3);
        g.lineTo(x + HW + 6 + p * 6, y);
        g.lineTo(x, y + HH + 3 + p * 3);
        g.lineTo(x - HW - 6 - p * 6, y);
        g.closePath();
        g.stroke();
        api.draw.text(g, 'TAP!', x, y - 34 - p * 4, { size: 22, color: '#ffffff', shadow: 'rgba(0,0,0,0.3)' });
        break;
      }
    }
    // gem counter
    if (api.state !== 'ready' || gems > 0) {
      drawGem(g, 26, 30, 0.9);
      api.draw.text(g, gems, 42, 31, { size: 22, align: 'left', color: '#ffffff', shadow: 'rgba(0,0,0,0.3)' });
    }
    if (milestoneFlash > 0) {
      g.globalAlpha = milestoneFlash * 0.25;
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }

  reset();

  return {
    reset,
    demo,
    update(dt) {
      stepWorld(dt, true);
    },
    idle(dt) {
      stepWorld(dt, false);
    },
    input(e) {
      if (e.type === 'down') {
        onTap();
        return true;
      }
      if (e.type !== 'keydown') return false;
      const k = e.key;
      // arrows steer explicitly (left = up-left, right = up-right); tap keys toggle
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        if (!e.repeat && ball.dir !== 1) onTap();
        return true;
      }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        if (!e.repeat && ball.dir !== 0) onTap();
        return true;
      }
      if (api.isTapKey(k) || k === 'ArrowDown') {
        if (!e.repeat) onTap();
        return true;
      }
      return false;
    },
    revive,
    render,
  };
}

/** Cover art: a glowing zig zag path climbing through a pastel sky, ball mid-turn. */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#7fd3f7');
  grad.addColorStop(0.55, '#8f9cf5');
  grad.addColorStop(1, '#d58ff0');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = Math.min(w / 800, h / 600) * 1.25;
  // soft light rays
  g.save();
  g.globalAlpha = 0.12;
  g.fillStyle = '#ffffff';
  for (let n = 0; n < 6; n++) {
    g.beginPath();
    g.moveTo(w * 0.5, -h * 0.2);
    g.lineTo(w * (n / 6) - w * 0.1, h * 1.2);
    g.lineTo(w * (n / 6) + w * 0.02, h * 1.2);
    g.closePath();
    g.fill();
  }
  g.restore();
  // floating outline diamonds
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3 * s;
  for (let n = 0; n < 18; n++) {
    const x = (n * 173.3 + 50) % w;
    const y = (n * 97.7 + 30) % h;
    const r = (8 + ((n * 7) % 14)) * s;
    g.beginPath();
    g.moveTo(x, y - r * 0.5);
    g.lineTo(x + r, y);
    g.lineTo(x, y + r * 0.5);
    g.lineTo(x - r, y);
    g.closePath();
    g.stroke();
  }
  // path cells (i, j) with segment directions
  const hw = 40 * s;
  const hh = 20 * s;
  const depth = 46 * s;
  const cells = [];
  let i = 0;
  let j = 0;
  const segs = [
    [0, 3],
    [1, 2],
    [0, 1],
    [1, 1],
    [0, 3],
    [1, 3],
    [0, 2],
    [1, 2],
    [0, 3],
  ];
  cells.push([i, j]);
  for (const [d, L] of segs) {
    for (let n = 0; n < L; n++) {
      if (d === 0) i++;
      else j++;
      cells.push([i, j]);
    }
  }
  const ballIdx = 9;
  const [bi, bj] = cells[ballIdx];
  const ox = w * 0.5 - (bi - bj) * hw;
  const oy = h * 0.7 + (bi + bj) * hh;
  const px = (a, b) => ox + (a - b) * hw;
  const py = (a, b) => oy - (a + b) * hh;
  for (let n = cells.length - 1; n >= 0; n--) {
    const [a, b] = cells[n];
    const x = px(a, b);
    const y = py(a, b);
    if (n < 3) {
      g.globalAlpha = 0.35 + n * 0.2;
      drawBlock(g, x, y + (3 - n) * 40 * s, hw, hh, depth, '#f7f8ff', '#a6b4f4', '#7584dc');
      g.globalAlpha = 1;
      continue;
    }
    drawBlock(g, x, y, hw, hh, depth, '#f7f8ff', '#a6b4f4', '#7584dc');
  }
  // gems
  for (const n of [12, 16, 19]) {
    const [a, b] = cells[n];
    const x = px(a, b);
    const y = py(a, b);
    g.fillStyle = 'rgba(40,20,80,0.16)';
    g.beginPath();
    g.ellipse(x, y + 2 * s, 9 * s, 4.5 * s, 0, 0, Math.PI * 2);
    g.fill();
    drawGem(g, x, y - 26 * s, 1.5 * s);
  }
  // ball with trail, turning on the corner
  const [ci, cj] = cells[ballIdx];
  for (let n = 8; n >= 1; n--) {
    const u = ci - 0.1;
    const v = cj - n * 0.28;
    g.globalAlpha = 0.35 * (1 - n / 9);
    g.fillStyle = '#ffb07a';
    g.beginPath();
    g.arc(px(u, v), py(u, v) - 14 * s, 14 * s * (1 - n / 12), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const bx = px(ci, cj);
  const by = py(ci, cj);
  const glow = g.createRadialGradient(bx, by - 14 * s, 4 * s, bx, by - 14 * s, 70 * s);
  glow.addColorStop(0, 'rgba(255,240,200,0.75)');
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = glow;
  g.fillRect(bx - 80 * s, by - 94 * s, 160 * s, 160 * s);
  g.fillStyle = 'rgba(20,30,60,0.22)';
  g.beginPath();
  g.ellipse(bx + 3 * s, by + 2 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
  g.fill();
  drawBall(g, bx, by - 17 * s, 18 * s, 14, 1.12, 0.9);
  // sparkle burst at the turn
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 3 * s;
  for (let n = 0; n < 8; n++) {
    const a = (n / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(bx + Math.cos(a) * 26 * s, by - 14 * s + Math.sin(a) * 18 * s);
    g.lineTo(bx + Math.cos(a) * 38 * s, by - 14 * s + Math.sin(a) * 26 * s);
    g.stroke();
  }
}
