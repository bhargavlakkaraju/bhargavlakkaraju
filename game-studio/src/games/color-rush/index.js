// Color Rush - hop upward through spinning color gates. Only your own color lets you pass.
const TAU = Math.PI * 2;
const Q = Math.PI / 2;
const COLORS = ['#35e0ff', '#ffd23f', '#ff3d8b', '#9b5cff'];
const GRAV = 1500;
const HOP_V = -540;
const MAX_FALL = 900;
const BR = 11; // ball radius
const TH = 16; // obstacle thickness
const GAP = 210; // vertical space between obstacles
const BAR_SEG = 105; // bar colour segment width (4 segments = 420)
const TRAIL = 14;

function segIdx(a) {
  a %= TAU;
  if (a < 0) a += TAU;
  return ((a / Q) | 0) & 3;
}

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  let t = (wx * vx + wy * vy) / (vx * vx + vy * vy);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------- drawing helpers (shared with the cover) ----------
function strokeRing(g, cx, cy, r, rot, order) {
  g.lineWidth = TH;
  g.lineCap = 'butt';
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = COLORS[order[i]];
    g.beginPath();
    g.arc(cx, cy, r, rot + i * Q, rot + (i + 1) * Q + 0.004);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r - TH / 2 + 3, 0, TAU);
  g.stroke();
}

function strokeSquare(g, cx, cy, hs, rot, order) {
  g.lineWidth = TH;
  g.lineCap = 'round';
  const d = hs * Math.SQRT2;
  for (let i = 0; i < 4; i++) {
    const a0 = rot + Math.PI / 4 + i * Q;
    const a1 = a0 + Q;
    g.strokeStyle = COLORS[order[i]];
    g.beginPath();
    g.moveTo(cx + Math.cos(a0) * d, cy + Math.sin(a0) * d);
    g.lineTo(cx + Math.cos(a1) * d, cy + Math.sin(a1) * d);
    g.stroke();
  }
}

function strokeCross(g, hx, hy, len, rot, order) {
  g.lineWidth = TH;
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Q;
    g.strokeStyle = COLORS[order[i]];
    g.beginPath();
    g.moveTo(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12);
    g.lineTo(hx + Math.cos(a) * len, hy + Math.sin(a) * len);
    g.stroke();
  }
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(hx, hy, 12, 0, TAU);
  g.fill();
  g.fillStyle = '#1b1830';
  g.beginPath();
  g.arc(hx, hy, 5, 0, TAU);
  g.fill();
}

function fillBars(g, y, off, order, W) {
  let x0 = off % (BAR_SEG * 4);
  if (x0 > 0) x0 -= BAR_SEG * 4;
  let i = 0;
  for (let x = x0; x < W; x += BAR_SEG, i++) {
    g.fillStyle = COLORS[order[i & 3]];
    if (g.roundRect) {
      g.beginPath();
      g.roundRect(x + 1.5, y - TH / 2, BAR_SEG - 3, TH, TH / 2);
      g.fill();
    } else g.fillRect(x + 1.5, y - TH / 2, BAR_SEG - 3, TH);
  }
}

function drawStar(g, x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i & 1 ? r * 0.45 : r;
    if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function drawOrb(g, x, y, r, rot) {
  for (let i = 0; i < 4; i++) {
    g.fillStyle = COLORS[i];
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, r, rot + i * Q, rot + (i + 1) * Q);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, y, r + 1.5, 0, TAU);
  g.stroke();
}

function drawBall(g, x, y, r, color, sx, sy) {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  g.globalAlpha = 0.22;
  g.fillStyle = color;
  g.beginPath();
  g.arc(0, 0, r + 7, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, TAU);
  g.fill();
  g.restore();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;
  const CX = W / 2;
  const rng = api.rng;
  const START_Y = H - 150;

  const dots = [];
  for (let i = 0; i < 55; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, f: 0.15 + Math.random() * 0.35, r: 0.8 + Math.random() * 1.8, c: (Math.random() * 4) | 0 });

  const ball = { x: CX, y: START_Y, vy: 0, color: 0, s: 1, sv: 0, dead: false };
  const trail = new Float32Array(TRAIL * 2);
  let trailHead = 0;
  const pad = { y: START_Y + BR, on: true, glow: 0 };
  let obstacles = [];
  let stars = [];
  let orbs = [];
  let camY = 0;
  let cursor = 0;
  let obsCount = 0;
  let genColor = 0;
  let lastType = '';
  let clock = 0;
  let killer = null;
  let bumpT = 0;

  function resetTrail() {
    for (let i = 0; i < TRAIL; i++) {
      trail[i * 2] = ball.x;
      trail[i * 2 + 1] = ball.y;
    }
  }

  function genNext() {
    const n = obsCount++;
    const lvl = Math.min(1, n / 28);
    const pool =
      n < 2
        ? ['ring']
        : n < 5
          ? ['ring', 'ring', 'bars', 'square']
          : n < 9
            ? ['ring', 'bars', 'square', 'cross', 'double']
            : ['ring', 'bars', 'square', 'cross', 'double', 'twin', 'double', 'cross'];
    let type = rng.pick(pool);
    if (type === lastType && rng.chance(0.65)) type = rng.pick(pool);
    lastType = type;
    const dir = rng.sign();
    const spd = (1.15 + 1.45 * lvl) * rng.range(0.9, 1.1);
    const order = rng.shuffle([0, 1, 2, 3]);
    const ob = { type, n, y: 0, hh: 0, rot: rng.range(0, TAU), w: dir * spd, r1: 0, r2: 0, off: 0, v: 0, cxo: 0, order, order2: null, passed: false, near: false, removed: false, fade: 1 };
    let starDy = 0;
    let orbFrac = 0.5;
    if (type === 'ring') {
      ob.r1 = rng.range(94, 108);
      ob.hh = ob.r1 + TH / 2;
    } else if (type === 'double') {
      // inner ring is the mirror image of the outer one: they counter-rotate but always
      // show the same colour straight above/below the centre, so the pair reads as one thick gate
      ob.r1 = 118;
      ob.r2 = 86;
      ob.w *= 0.85;
      ob.order2 = [order[3], order[2], order[1], order[0]];
      ob.hh = ob.r1 + TH / 2;
    } else if (type === 'bars') {
      ob.v = dir * (70 + 110 * lvl) * rng.range(0.9, 1.1);
      ob.off = rng.range(0, BAR_SEG * 4);
      ob.hh = 48;
    } else if (type === 'square') {
      ob.r1 = 88;
      ob.w *= 0.9;
      ob.hh = ob.r1 * Math.SQRT2 + TH / 2;
    } else if (type === 'cross') {
      ob.r1 = 104;
      ob.cxo = rng.sign() * 74;
      ob.hh = ob.r1 + TH / 2;
    } else {
      // twin gears touching at the ball's column; right ring mirrors the left one
      ob.r1 = 78;
      ob.order2 = [order[3], order[2], order[1], order[0]];
      ob.hh = ob.r1 + TH / 2;
      starDy = -ob.hh - 40;
      orbFrac = 0.66;
    }
    ob.y = cursor - ob.hh;
    obstacles.push(ob);
    stars.push({ y: ob.y + starDy, taken: false });
    if (n < 2 || rng.chance(0.82)) {
      let c = rng.int(0, 2);
      if (c >= genColor) c += 1;
      genColor = c;
      orbs.push({ y: ob.y - ob.hh - GAP * orbFrac, taken: false, color: c });
    }
    cursor = ob.y - ob.hh - GAP;
  }

  function ensureGen() {
    while (cursor > camY - H * 0.6) genNext();
    // drop things far below the screen
    if (obstacles.length > 8 && obstacles[0].y - obstacles[0].hh > camY + H + 400) obstacles.shift();
    if (stars.length > 10 && stars[0].y > camY + H + 400) stars.shift();
    if (orbs.length > 10 && orbs[0].y > camY + H + 400) orbs.shift();
  }

  function reset() {
    obstacles = [];
    stars = [];
    orbs = [];
    camY = 0;
    obsCount = 0;
    lastType = '';
    killer = null;
    genColor = rng.int(0, 3);
    ball.color = genColor;
    ball.x = CX;
    ball.y = START_Y;
    ball.vy = 0;
    ball.s = 1;
    ball.sv = 0;
    ball.dead = false;
    pad.y = START_Y + BR;
    pad.on = true;
    pad.glow = 0;
    cursor = START_Y - 180;
    resetTrail();
    ensureGen();
  }

  // bitmask of colours the ball (radius rad) touches on obstacle ob
  function probe(ob, bx, by, rad) {
    let m = 0;
    const reach = TH / 2 + rad;
    if (ob.type === 'ring' || ob.type === 'double') {
      m |= ringMask(CX, ob.y, ob.r1, ob.rot, ob.order, bx, by, rad, reach);
      if (ob.type === 'double') m |= ringMask(CX, ob.y, ob.r2, Math.PI - ob.rot, ob.order2, bx, by, rad, reach);
    } else if (ob.type === 'twin') {
      m |= ringMask(CX - ob.r1, ob.y, ob.r1, ob.rot, ob.order, bx, by, rad, reach);
      m |= ringMask(CX + ob.r1, ob.y, ob.r1, Math.PI - ob.rot, ob.order2, bx, by, rad, reach);
    } else if (ob.type === 'bars') {
      // the upper bar is the mirror image of the lower one, so both always show the same colour in the middle
      m |= barMask(ob.y - 40, ob.off, ob.order, bx, by, rad, reach, true);
      m |= barMask(ob.y + 40, ob.off, ob.order, bx, by, rad, reach, false);
    } else if (ob.type === 'square') {
      const d = ob.r1 * Math.SQRT2;
      for (let i = 0; i < 4; i++) {
        const a0 = ob.rot + Math.PI / 4 + i * Q;
        const a1 = a0 + Q;
        if (segDist(bx, by, CX + Math.cos(a0) * d, ob.y + Math.sin(a0) * d, CX + Math.cos(a1) * d, ob.y + Math.sin(a1) * d) < reach) m |= 1 << ob.order[i];
      }
    } else if (ob.type === 'cross') {
      const hx = CX + ob.cxo;
      for (let i = 0; i < 4; i++) {
        const a = ob.rot + i * Q;
        if (segDist(bx, by, hx + Math.cos(a) * 12, ob.y + Math.sin(a) * 12, hx + Math.cos(a) * ob.r1, ob.y + Math.sin(a) * ob.r1) < reach) m |= 1 << ob.order[i];
      }
    }
    return m;
  }

  function ringMask(cx, cy, r, rot, order, bx, by, rad, reach) {
    const dx = bx - cx;
    const dy = by - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(d - r) > reach) return 0;
    const a = Math.atan2(dy, dx) - rot;
    const span = (rad * 0.8) / r;
    return (1 << order[segIdx(a - span)]) | (1 << order[segIdx(a)]) | (1 << order[segIdx(a + span)]);
  }

  function barMask(y0, off, order, bx, by, rad, reach, mirror) {
    if (Math.abs(by - y0) > reach) return 0;
    let m = 0;
    for (let k = -1; k <= 1; k++) {
      const x = bx + k * rad * 0.8;
      let u = ((mirror ? W - x : x) - off) % (BAR_SEG * 4);
      if (u < 0) u += BAR_SEG * 4;
      m |= 1 << order[((u / BAR_SEG) | 0) & 3];
    }
    return m;
  }

  function hop() {
    if (ball.dead) return;
    ball.vy = HOP_V;
    ball.s = 1.3;
    ball.sv = 0;
    api.sfx.tone({ freq: 480, to: 760, type: 'sine', dur: 0.08, vol: 0.12 });
    api.fx.burst(ball.x, ball.y - camY + BR, { count: 3, color: COLORS[ball.color], speed: 90, angle: Math.PI / 2, spread: 1.2, size: 3, life: 0.35, gravity: 0 });
  }

  function die(ob) {
    if (ball.dead) return;
    ball.dead = true;
    killer = ob;
    const sy = Math.min(H - 10, ball.y - camY);
    const col = COLORS[ball.color];
    api.fx.burst(ball.x, sy, { count: 34, colors: [col, col, '#ffffff'], speed: 380, size: 6, life: 0.9, gravity: 700, drag: 0.97, shape: 'square', shrink: false });
    api.fx.burst(ball.x, sy, { count: 18, colors: [col, '#ffffff'], speed: 520, size: 3, life: 0.5, gravity: 0, shape: 'spark' });
    api.fx.ring(ball.x, sy, { color: col, radius: 70, life: 0.45, width: 6 });
    api.fx.shake(14, 0.4);
    api.fx.flash('#ffffff', 0.45);
    api.sfx.play('die');
    api.sfx.noise({ dur: 0.18, vol: 0.25, freq: 2400, to: 300 });
    api.haptic(80);
    api.gameOver({ delay: 950, stats: { stars: api.score } });
  }

  function collect() {
    const bsy = ball.y - camY;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (s.taken || Math.abs(ball.y - s.y) > BR + 15) continue;
      s.taken = true;
      api.addScore(1);
      const sc = api.score;
      const sy = s.y - camY;
      api.sfx.play('coin');
      api.sfx.combo(sc % 12, 660);
      api.fx.burst(CX, sy, { count: 16, colors: ['#ffffff', '#fff3a0', COLORS[ball.color]], speed: 240, size: 3.5, life: 0.5, gravity: 0, shape: 'spark' });
      api.fx.ring(CX, sy, { color: '#ffffff', radius: 40, life: 0.35, width: 3 });
      api.fx.text(CX + 42, sy - 6, '+1', { size: 24, color: '#ffffff', life: 0.6, rise: 40 });
      api.haptic(10);
      if (sc % 10 === 0) {
        api.fx.confetti(W / 2, H * 0.25, 60, COLORS);
        api.fx.text(W / 2, H * 0.28, `${sc}!`, { size: 54, color: COLORS[(sc / 10) & 3], life: 1.2 });
        api.sfx.play('levelup');
        api.emit('milestone', { stars: sc });
        if (sc === 50) api.happy();
      }
    }
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      if (o.taken || Math.abs(ball.y - o.y) > BR + 14) continue;
      o.taken = true;
      ball.color = o.color;
      ball.s = 0.7;
      ball.sv = 0;
      api.sfx.play('pop');
      api.fx.burst(CX, bsy, { count: 20, colors: COLORS, speed: 260, size: 4, life: 0.5, gravity: 0 });
      api.fx.ring(CX, bsy, { color: COLORS[o.color], radius: 46, life: 0.4, width: 5 });
    }
  }

  function step(dt, playing) {
    clock += dt;
    // obstacles animate
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      ob.rot += ob.w * dt;
      if (ob.type === 'bars') ob.off += ob.v * dt;
      if (ob.removed && ob.fade > 0) ob.fade = Math.max(0, ob.fade - dt * 3);
    }
    ball.sv += (-(ball.s - 1) * 480 - ball.sv * 15) * dt;
    ball.s += ball.sv * dt;
    pad.glow = Math.max(0, pad.glow - dt * 3);
    if (!playing) return;
    // physics
    ball.vy = Math.min(MAX_FALL, ball.vy + GRAV * dt);
    ball.y += ball.vy * dt;
    if (pad.on && ball.y + BR > pad.y && ball.y - pad.y < 30) {
      if (ball.vy > 200) {
        ball.s = 0.75;
        ball.sv = 0;
        pad.glow = 1;
        api.sfx.tone({ freq: 220, to: 160, type: 'sine', dur: 0.06, vol: 0.08 });
      }
      ball.y = pad.y - BR;
      ball.vy = 0;
    }
    // camera only moves up
    const target = ball.y - H * 0.52;
    if (target < camY) camY += (target - camY) * Math.min(1, dt * 9);
    ensureGen();
    // trail
    trailHead = (trailHead + 1) % TRAIL;
    trail[trailHead * 2] = ball.x;
    trail[trailHead * 2 + 1] = ball.y;
    collect();
    // collisions
    const myBit = 1 << ball.color;
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      if (ob.removed) continue;
      if (Math.abs(ob.y - ball.y) > ob.hh + BR + 20) {
        if (!ob.passed && ball.y < ob.y - ob.hh - BR) passObstacle(ob);
        continue;
      }
      const m = probe(ob, ball.x, ball.y, BR * 0.82);
      if (m & ~myBit) {
        die(ob);
        return;
      }
      if (!ob.near && probe(ob, ball.x, ball.y, BR * 1.9) & ~myBit) ob.near = true;
    }
    if (ball.y - BR > camY + H + 6) die(null);
  }

  function passObstacle(ob) {
    ob.passed = true;
    if (ob.near) {
      const sy = ball.y - camY;
      api.fx.text(CX - 60, sy + 10, 'CLOSE!', { color: '#ffffff', size: 22, life: 0.7, rise: 30 });
      api.fx.burst(CX, sy + 10, { count: 12, colors: ['#ffffff', COLORS[ball.color]], speed: 200, size: 3, life: 0.45, gravity: 0, shape: 'spark' });
      api.sfx.combo(8, 660);
    }
  }

  reset();
  if (typeof window !== 'undefined' && window.__raDebug) window.__raDebug[api.meta.slug] = { ball, get obstacles() { return obstacles; }, get stars() { return stars; }, get orbs() { return orbs; }, get camY() { return camY; }, get killer() { return killer; }, pad, probe };

  return {
    reset,
    forwardStartInput: true,
    update(dt) {
      step(dt, true);
    },
    idle(dt) {
      // obstacles keep spinning while waiting to start; freeze them on the death screen
      if (api.state === 'ready') step(dt, false);
      else {
        clock += dt;
        for (let i = 0; i < obstacles.length; i++) if (obstacles[i].removed && obstacles[i].fade > 0) obstacles[i].fade = Math.max(0, obstacles[i].fade - dt * 3);
      }
    },
    input(e) {
      if (e.type === 'down' || (e.type === 'keydown' && !e.repeat && api.isTapKey(e.key))) {
        hop();
        return true;
      }
      return false;
    },
    revive() {
      if (killer) killer.removed = true;
      let next = null;
      for (let i = 0; i < obstacles.length; i++) {
        const ob = obstacles[i];
        if (ob.removed || ob.passed) continue;
        if (ob.y - ob.hh > ball.y + 40 && killer === null) continue;
        if (!next || ob.y > next.y) next = ob;
      }
      const y = next ? next.y + next.hh + 64 : ball.y - 120;
      killer = null;
      ball.dead = false;
      ball.y = y;
      for (let i = 0; i < orbs.length; i++) if (orbs[i].y > y - 20) orbs[i].taken = true;
      ball.vy = 0;
      ball.s = 1;
      ball.sv = 0;
      pad.y = y + BR;
      pad.on = true;
      pad.glow = 1;
      camY = y - H * 0.8;
      resetTrail();
      ensureGen();
      api.fx.ring(CX, y - camY, { color: COLORS[ball.color], radius: 60, life: 0.5, width: 5 });
    },
    render(g) {
      // parallax dots
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        let y = (d.y - camY * d.f) % H;
        if (y < 0) y += H;
        g.globalAlpha = 0.25 + d.f;
        g.fillStyle = COLORS[d.c];
        g.fillRect(d.x, y, d.r, d.r);
      }
      g.globalAlpha = 1;
      // obstacles
      for (let i = 0; i < obstacles.length; i++) {
        const ob = obstacles[i];
        const sy = ob.y - camY;
        if (sy + ob.hh < -20 || sy - ob.hh > H + 20) continue;
        if (ob.removed) {
          if (ob.fade <= 0) continue;
          g.globalAlpha = ob.fade;
        }
        if (ob.type === 'ring') strokeRing(g, CX, sy, ob.r1, ob.rot, ob.order);
        else if (ob.type === 'double') {
          strokeRing(g, CX, sy, ob.r1, ob.rot, ob.order);
          strokeRing(g, CX, sy, ob.r2, Math.PI - ob.rot, ob.order2);
        } else if (ob.type === 'twin') {
          strokeRing(g, CX - ob.r1, sy, ob.r1, ob.rot, ob.order);
          strokeRing(g, CX + ob.r1, sy, ob.r1, Math.PI - ob.rot, ob.order2);
        } else if (ob.type === 'bars') {
          fillBars(g, sy + 40, ob.off, ob.order, W);
          g.save();
          g.translate(W, 0);
          g.scale(-1, 1);
          fillBars(g, sy - 40, ob.off, ob.order, W);
          g.restore();
        } else if (ob.type === 'square') strokeSquare(g, CX, sy, ob.r1, ob.rot, ob.order);
        else if (ob.type === 'cross') strokeCross(g, CX + ob.cxo, sy, ob.r1, ob.rot, ob.order);
        g.globalAlpha = 1;
      }
      // stars
      const pulse = 1 + Math.sin(clock * 5) * 0.08;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s.taken) continue;
        const sy = s.y - camY;
        if (sy < -30 || sy > H + 30) continue;
        const sr = Math.sin(clock * 2) * 0.25;
        g.globalAlpha = 0.28;
        g.fillStyle = '#ffe98a';
        drawStar(g, CX, sy, 21 * pulse, sr);
        g.globalAlpha = 1;
        g.fillStyle = '#ffffff';
        drawStar(g, CX, sy, 13 * pulse, sr);
      }
      // colour orbs
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        if (o.taken) continue;
        const sy = o.y - camY;
        if (sy < -30 || sy > H + 30) continue;
        drawOrb(g, CX, sy, 13, clock * 3);
      }
      // pad
      if (pad.on) {
        const sy = pad.y - camY;
        if (sy < H + 20) {
          g.fillStyle = '#2b2550';
          if (g.roundRect) {
            g.beginPath();
            g.roundRect(CX - 38, sy, 76, 12, 6);
            g.fill();
          } else g.fillRect(CX - 38, sy, 76, 12);
          g.fillStyle = COLORS[ball.color];
          g.globalAlpha = 0.6 + pad.glow * 0.4;
          g.fillRect(CX - 30, sy, 60, 3);
          g.globalAlpha = 1;
        }
      }
      if (!ball.dead) {
        const col = COLORS[ball.color];
        g.fillStyle = col;
        for (let k = 1; k < TRAIL; k++) {
          const idx = (trailHead - k + TRAIL) % TRAIL;
          const f = 1 - k / TRAIL;
          g.globalAlpha = f * 0.35;
          g.beginPath();
          g.arc(trail[idx * 2], trail[idx * 2 + 1] - camY, BR * (0.3 + 0.6 * f), 0, TAU);
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = col;
        drawBall(g, ball.x, ball.y - camY, BR, col, 2 - ball.s, ball.s);
        if (api.state === 'ready') {
          // hint: which colour you are
          g.strokeStyle = col;
          g.globalAlpha = 0.5 + Math.sin(clock * 5) * 0.3;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(ball.x, ball.y - camY, BR + 12 + Math.sin(clock * 5) * 2, 0, TAU);
          g.stroke();
          g.globalAlpha = 1;
        }
      }
    },
  };
}

/** Key art: spinning colour gates, a glowing ball threading its colour, a star and a colour orb. Text-free. */
export function cover(g, w, h) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1d1640');
  bg.addColorStop(1, '#0d0b1c');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const s = h / 600;
  // confetti dots
  for (let i = 0; i < 70; i++) {
    g.globalAlpha = 0.25 + ((i * 37) % 50) / 120;
    g.fillStyle = COLORS[i & 3];
    const r = (1 + ((i * 13) % 3)) * s;
    g.beginPath();
    g.arc((i * 131.7) % w, (i * 71.3) % h, r, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  const cx = w / 2;
  g.save();
  g.translate(cx, h * 0.5);
  g.scale(s, s);
  // soft halo
  const halo = g.createRadialGradient(0, -20, 10, 0, -20, 260);
  halo.addColorStop(0, 'rgba(155,92,255,0.35)');
  halo.addColorStop(1, 'rgba(155,92,255,0)');
  g.fillStyle = halo;
  g.fillRect(-300, -300, 600, 600);
  // side decorations for wide formats
  const side = w / h > 1.5 ? 1 : 0;
  if (side) {
    strokeSquare(g, -330, 40, 60, 0.35, [2, 3, 0, 1]);
    strokeCross(g, 330, -30, 78, 0.5, [1, 0, 3, 2]);
  } else {
    strokeCross(g, -250, 150, 70, 0.4, [1, 0, 3, 2]);
    strokeSquare(g, 250, -150, 44, 0.3, [2, 3, 0, 1]);
  }
  // big double ring, top segment matching the ball
  g.save();
  g.lineWidth = 1;
  strokeRing(g, 0, -40, 158, -Math.PI / 4 - Q + 0.25, [1, 2, 0, 3]);
  strokeRing(g, 0, -40, 124, Math.PI + Math.PI / 4 + Q - 0.25, [3, 0, 2, 1]);
  g.restore();
  // star in the centre
  g.globalAlpha = 0.3;
  g.fillStyle = '#ffe98a';
  drawStar(g, 0, -40, 38, 0.15);
  g.globalAlpha = 1;
  g.fillStyle = '#ffffff';
  drawStar(g, 0, -40, 24, 0.15);
  // colour orb above
  drawOrb(g, 0, -240, 18, 0.5);
  // ball with trail climbing through the bottom (cyan) segment
  const by = 150;
  for (let k = 8; k >= 1; k--) {
    g.globalAlpha = 0.35 * (1 - k / 9);
    g.fillStyle = COLORS[0];
    g.beginPath();
    g.arc(0, by + k * 14, 16 * (1 - k / 12), 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = COLORS[0];
  drawBall(g, 0, by, 17, COLORS[0], 0.9, 1.12);
  // sparkles
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  g.lineCap = 'round';
  const sp = [
    [-44, -92],
    [48, 6],
    [40, -100],
  ];
  for (const [x, y] of sp) {
    g.beginPath();
    g.moveTo(x - 7, y);
    g.lineTo(x + 7, y);
    g.moveTo(x, y - 7);
    g.lineTo(x, y + 7);
    g.stroke();
  }
  g.restore();
}
