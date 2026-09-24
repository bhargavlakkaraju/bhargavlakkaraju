// Sky Hop - endless vertical bouncer. The hero bounces automatically; you only steer.
// World coordinates: y grows downward (like the screen), the ground is at y = 0 and the
// climb goes into negative y. The camera only ever moves up.
const GRAV = 1500;
const JUMP_V = 800; // ~213px apex
const SPRING_V = 1320; // ~580px apex
const MAX_VX = 345;
const R = 17; // hero body radius
const PLAT_H = 16;
const METER = 16; // px per meter
const COIN_BONUS = 5;

// sky palette keyframes by altitude (meters): [m, topRGB, bottomRGB]
const SKY = [
  [0, [94, 200, 255], [200, 240, 255]],
  [250, [120, 140, 255], [255, 196, 222]],
  [550, [255, 122, 170], [255, 214, 150]],
  [900, [70, 44, 132], [190, 92, 170]],
  [1300, [10, 14, 44], [44, 30, 94]],
];

function skyAt(m, out) {
  let a = SKY[0];
  let b = SKY[SKY.length - 1];
  for (let n = 0; n < SKY.length - 1; n++) {
    if (m >= SKY[n][0] && m < SKY[n + 1][0]) {
      a = SKY[n];
      b = SKY[n + 1];
      break;
    }
  }
  const k = m >= SKY[SKY.length - 1][0] ? 1 : Math.max(0, Math.min(1, (m - a[0]) / (b[0] - a[0] || 1)));
  for (let c = 0; c < 3; c++) {
    out[c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * k);
    out[3 + c] = Math.round(a[2][c] + (b[2][c] - a[2][c]) * k);
  }
  return out;
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function drawCloudShape(g, x, y, s) {
  g.beginPath();
  g.arc(x - 22 * s, y + 4 * s, 14 * s, 0, Math.PI * 2);
  g.arc(x, y - 4 * s, 20 * s, 0, Math.PI * 2);
  g.arc(x + 22 * s, y + 3 * s, 15 * s, 0, Math.PI * 2);
  g.arc(x + 6 * s, y + 8 * s, 16 * s, 0, Math.PI * 2);
  g.fill();
}

function drawPlatform(g, type, x, y, w, t, alpha = 1) {
  g.globalAlpha = alpha;
  if (type === 'cloud') {
    g.fillStyle = 'rgba(160,190,230,0.55)';
    g.beginPath();
    g.ellipse(x + w / 2, y + 12, w / 2, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    const n = 4;
    for (let i = 0; i < n; i++) {
      const cx = x + 10 + (i * (w - 20)) / (n - 1);
      const r = i === 1 || i === 2 ? 12 : 9;
      g.moveTo(cx + r, y + 6);
      g.arc(cx, y + 6, r, 0, Math.PI * 2);
    }
    g.fill();
    g.fillStyle = 'rgba(210,230,255,1)';
    g.fillRect(x + 4, y + 8, w - 8, 6);
    g.globalAlpha = 1;
    return;
  }
  let top;
  let body;
  let hi;
  if (type === 'moving') {
    top = '#46c8ff';
    body = '#2a86c9';
    hi = '#a8e8ff';
  } else if (type === 'break') {
    top = '#d69a5c';
    body = '#9a6232';
    hi = '#f0c48f';
  } else if (type === 'rescue') {
    top = '#ffd23f';
    body = '#e59a12';
    hi = '#fff3b0';
  } else {
    top = '#5ad86e';
    body = '#8a5a3a';
    hi = '#a6f5b2';
  }
  g.fillStyle = 'rgba(20,30,60,0.18)';
  roundRect(g, x + 3, y + 5, w, PLAT_H, 8);
  g.fill();
  g.fillStyle = body;
  roundRect(g, x, y, w, PLAT_H, 8);
  g.fill();
  g.fillStyle = top;
  roundRect(g, x, y, w, 9, 6);
  g.fill();
  g.fillStyle = hi;
  g.fillRect(x + 7, y + 2, w - 14, 2.5);
  if (type === 'normal' || type === 'rescue') {
    // little grass tufts dripping over the edge
    g.fillStyle = top;
    for (let gx = x + 8; gx < x + w - 6; gx += 13) {
      g.beginPath();
      g.arc(gx, y + 9, 3.2, 0, Math.PI);
      g.fill();
    }
  } else if (type === 'moving') {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    const cy = y + 12;
    g.beginPath();
    g.moveTo(x + 6, cy);
    g.lineTo(x + 12, cy - 3.5);
    g.lineTo(x + 12, cy + 3.5);
    g.closePath();
    g.moveTo(x + w - 6, cy);
    g.lineTo(x + w - 12, cy - 3.5);
    g.lineTo(x + w - 12, cy + 3.5);
    g.closePath();
    g.fill();
  } else if (type === 'break') {
    g.strokeStyle = '#5e3818';
    g.lineWidth = 2;
    g.beginPath();
    const mx = x + w * 0.48;
    g.moveTo(mx - 3, y);
    g.lineTo(mx + 3, y + 5);
    g.lineTo(mx - 2, y + 10);
    g.lineTo(mx + 2, y + PLAT_H);
    g.moveTo(x + w * 0.2, y + 4);
    g.lineTo(x + w * 0.27, y + 9);
    g.moveTo(x + w * 0.78, y + 5);
    g.lineTo(x + w * 0.72, y + 11);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function drawSpring(g, x, y, comp) {
  // x = center, y = platform top; comp 0..1 (1 = fully compressed)
  const h = 16 - comp * 9;
  g.strokeStyle = '#8a95a8';
  g.lineWidth = 3;
  g.beginPath();
  const turns = 4;
  for (let i = 0; i <= turns * 2; i++) {
    const yy = y - (i / (turns * 2)) * h;
    const xx = x + (i % 2 === 0 ? -7 : 7);
    if (i === 0) g.moveTo(xx, yy);
    else g.lineTo(xx, yy);
  }
  g.stroke();
  g.fillStyle = '#ff4d6d';
  roundRect(g, x - 11, y - h - 5, 22, 6, 3);
  g.fill();
  g.fillStyle = '#ffb3c1';
  g.fillRect(x - 8, y - h - 4, 16, 1.6);
}

function drawCoin(g, x, y, t, s = 1) {
  const sx = Math.max(0.15, Math.abs(Math.cos(t * 3.2)));
  g.save();
  g.translate(x, y);
  g.scale(sx * s, s);
  g.fillStyle = '#e8a10c';
  g.beginPath();
  g.arc(0, 1.5, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.arc(0, 0, 9, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#f5b301';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, 5.5, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fillRect(-4, -6, 2.5, 5);
  g.restore();
}

function drawHero(g, x, y, sx, sy, rot, face, blink, lookY) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(sx, sy);
  // feet
  g.fillStyle = '#ff9f1c';
  g.beginPath();
  g.ellipse(-7, R - 1, 6, 3.6, 0, 0, Math.PI * 2);
  g.ellipse(7, R - 1, 6, 3.6, 0, 0, Math.PI * 2);
  g.fill();
  // body
  g.fillStyle = '#ff5d73';
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  // belly
  g.fillStyle = '#ffd0c4';
  g.beginPath();
  g.ellipse(0, 6, R * 0.62, R * 0.52, 0, 0, Math.PI * 2);
  g.fill();
  // tuft
  g.fillStyle = '#ff5d73';
  g.beginPath();
  g.moveTo(-3, -R + 2);
  g.quadraticCurveTo(-6, -R - 10, 2, -R - 8);
  g.quadraticCurveTo(0, -R - 2, 4, -R + 2);
  g.fill();
  // wings
  g.fillStyle = '#e8435a';
  g.beginPath();
  g.ellipse(-R + 1, 3, 5, 8, 0.5, 0, Math.PI * 2);
  g.ellipse(R - 1, 3, 5, 8, -0.5, 0, Math.PI * 2);
  g.fill();
  // eyes
  const ex = face * 3;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(-6 + ex, -5, 5.5, blink ? 1.2 : 6.5, 0, 0, Math.PI * 2);
  g.ellipse(6 + ex, -5, 5.5, blink ? 1.2 : 6.5, 0, 0, Math.PI * 2);
  g.fill();
  if (!blink) {
    g.fillStyle = '#1d1340';
    g.beginPath();
    g.arc(-5 + ex * 1.4, -4 + lookY, 2.8, 0, Math.PI * 2);
    g.arc(7 + ex * 1.4, -4 + lookY, 2.8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(-5 + ex * 1.4, -6 + lookY, 1.4, 1.4);
    g.fillRect(7 + ex * 1.4, -6 + lookY, 1.4, 1.4);
  }
  // beak
  g.fillStyle = '#ffb627';
  g.beginPath();
  g.moveTo(-3.5 + ex, 1);
  g.lineTo(3.5 + ex, 1);
  g.lineTo(ex, 5.5);
  g.closePath();
  g.fill();
  // cheeks
  g.fillStyle = 'rgba(255,120,150,0.55)';
  g.beginPath();
  g.arc(-11 + ex, 3, 2.6, 0, Math.PI * 2);
  g.arc(11 + ex, 3, 2.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export default function createGame(api) {
  const W = api.width;
  const H = api.height;

  const plats = [];
  const platPool = [];
  const coins = [];
  const coinPool = [];
  const sky = [0, 0, 0, 0, 0, 0];

  const hero = { x: W / 2, y: 0, vx: 0, vy: 0, sx: 1, sy: 1, rot: 0, spin: 0, face: 1, blinkT: 2, alive: true };
  let camY = 0;
  let genY = 0;
  let climbed = 0; // px
  let coinCount = 0;
  let coinChain = 0;
  let coinChainT = 0;
  let lastMilestone = 0;
  let lastSpringGen = false;
  let t = 0;
  let deadT = 0;
  let bestH = 0;
  let bestShown = false;
  let hoverY = null;
  let hudPop = 0;

  // input
  let keyL = false;
  let keyR = false;
  const ptrId = [-1, -1, -1, -1];
  const ptrDir = [0, 0, 0, 0];
  const ptrAt = [0, 0, 0, 0];
  let ptrSeq = 0;

  function steer() {
    let best = -1;
    let dir = 0;
    for (let n = 0; n < 4; n++) {
      if (ptrId[n] !== -1 && ptrAt[n] > best) {
        best = ptrAt[n];
        dir = ptrDir[n];
      }
    }
    if (best >= 0) return dir;
    return (keyR ? 1 : 0) - (keyL ? 1 : 0);
  }

  function clearInput() {
    keyL = keyR = false;
    for (let n = 0; n < 4; n++) ptrId[n] = -1;
  }

  function newPlat(type, x, y, w) {
    const p = platPool.pop() || {};
    p.type = type;
    p.x = x;
    p.y = y;
    p.w = w;
    p.vx = 0;
    p.spring = false;
    p.springX = 0;
    p.springT = 0;
    p.bounceT = 0;
    p.broken = false;
    p.breakT = 0;
    p.vanishT = 0;
    p.dead = false;
    plats.push(p);
    return p;
  }

  function newCoin(x, y) {
    const c = coinPool.pop() || {};
    c.x = x;
    c.y = y;
    c.taken = false;
    c.ph = (x * 0.13 + y * 0.07) % 6.28;
    coins.push(c);
    return c;
  }

  function diffAt(y) {
    const m = -y / METER;
    return Math.max(0, Math.min(1, m / 700));
  }

  function genUntil(yTop) {
    while (genY > yTop) {
      const m = -genY / METER;
      const d = diffAt(genY);
      const gap = api.rng.range(58 + 46 * d, 86 + 78 * d);
      const prevY = genY;
      genY -= gap;
      const w = Math.round(api.rng.range(70, 86) - 20 * d);
      const x = api.rng.range(6, W - w - 6);
      let type = 'normal';
      const r = api.rng();
      const pMove = m < 30 ? 0 : 0.1 + 0.3 * d;
      const pCloud = m < 200 ? 0 : 0.1 + 0.2 * d;
      if (r < pMove) type = 'moving';
      else if (r < pMove + pCloud) type = 'cloud';
      const p = newPlat(type, x, genY, w);
      if (type === 'moving') p.vx = api.rng.sign() * api.rng.range(55, 85 + 85 * d);
      // springs
      if (type !== 'cloud' && m > 15 && !lastSpringGen && api.rng.chance(0.065)) {
        p.spring = true;
        p.springX = api.rng.range(14, w - 14);
        lastSpringGen = true;
        // reward line of coins above a spring
        if (api.rng.chance(0.5)) for (let n = 1; n <= 5; n++) newCoin(x + p.springX, genY - 80 - n * 70);
      } else {
        lastSpringGen = false;
        if (api.rng.chance(0.14)) newCoin(x + w / 2, genY - 38);
      }
      // decoy crumbling platform between two real ones
      if (m > 45 && gap > 70 && api.rng.chance(0.14 + 0.24 * d)) {
        const dw = Math.round(api.rng.range(64, 80) - 10 * d);
        let dx = api.rng.range(6, W - dw - 6);
        // keep decoys from sitting right on top of the real platform's column
        if (Math.abs(dx + dw / 2 - (x + w / 2)) < 60) dx = (dx + W / 2) % (W - dw - 6);
        newPlat('break', dx, prevY - gap * api.rng.range(0.4, 0.6), dw);
      }
    }
  }

  function reset() {
    while (plats.length) platPool.push(plats.pop());
    while (coins.length) coinPool.push(coins.pop());
    Object.assign(hero, { x: W / 2, y: -R, vx: 0, vy: 0, sx: 1, sy: 1, rot: 0, spin: 0, face: 1, blinkT: 2, alive: true });
    camY = -(H - 150);
    genY = 0;
    climbed = 0;
    coinCount = 0;
    coinChain = 0;
    coinChainT = 0;
    lastMilestone = 0;
    lastSpringGen = false;
    t = 0;
    deadT = 0;
    bestH = api.store.get('bestHeight', 0) || 0;
    bestShown = false;
    hoverY = null;
    hudPop = 0;
    clearInput();
    newPlat('ground', -40, 0, W + 80);
    genUntil(camY - 300);
  }

  function landOn(p) {
    const hx = hero.x;
    if (p.type === 'break') {
      p.broken = true;
      api.sfx.noise({ dur: 0.18, vol: 0.22, freq: 700, to: 200 });
      api.sfx.tone({ freq: 190, to: 90, type: 'square', dur: 0.12, vol: 0.08 });
      api.fx.burst(p.x + p.w / 2, p.y + 6, { count: 14, colors: ['#d69a5c', '#9a6232', '#f0c48f'], speed: 160, size: 4, life: 0.6, gravity: 700, shape: 'square', angle: Math.PI / 2, spread: Math.PI });
      return false;
    }
    let v = JUMP_V;
    let springy = false;
    if (p.spring) {
      const sxw = p.x + p.springX;
      if (Math.abs(hx - sxw) < 18 || Math.abs(hx - W - sxw) < 18 || Math.abs(hx + W - sxw) < 18) springy = true;
    }
    hero.y = p.y - R;
    if (springy) {
      v = SPRING_V;
      p.springT = 1;
      hero.spin = 1;
      api.sfx.tone({ freq: 220, to: 880, type: 'square', dur: 0.28, vol: 0.09 });
      api.sfx.play('whoosh');
      api.fx.burst(hx, p.y, { count: 20, colors: ['#ffffff', '#ffd23f', '#ff4d6d'], speed: 260, size: 3.5, life: 0.5, gravity: 400, angle: Math.PI / 2 * -1, spread: Math.PI * 0.9 });
      api.fx.ring(hx, p.y - 6, { color: '#ffffff', radius: 46, life: 0.4 });
      api.fx.shake(4, 0.15);
      api.haptic(25);
    } else {
      api.sfx.tone({ freq: 330 + Math.min(260, climbed / 80), to: 660 + Math.min(300, climbed / 60), type: 'square', dur: 0.1, vol: 0.06 });
      api.fx.burst(hx, p.y + 2, { count: 6, color: p.type === 'cloud' ? '#ffffff' : 'rgba(255,255,255,0.85)', speed: 90, size: 3, life: 0.35, gravity: 150, angle: -Math.PI / 2, spread: Math.PI * 1.2 });
      api.haptic(6);
    }
    hero.vy = -v;
    hero.sx = 1.32;
    hero.sy = 0.7;
    p.bounceT = 1;
    // near miss: saved right at the bottom of the screen
    if (p.y - camY > H * 0.86 && p.type !== 'ground') {
      api.fx.text(hx, p.y - 40, 'CLOSE ONE!', { color: '#fff7b0', size: 22, life: 0.8 });
      api.sfx.play('pop');
    }
    if (p.type === 'cloud') {
      p.vanishT = 0.001;
      api.fx.burst(p.x + p.w / 2, p.y + 6, { count: 16, color: '#ffffff', speed: 120, size: 7, life: 0.6, gravity: -30, spread: Math.PI * 2 });
      api.sfx.noise({ dur: 0.25, vol: 0.12, freq: 1600, to: 500, type: 'bandpass', q: 0.7 });
    }
    return true;
  }

  function collect(c) {
    c.taken = true;
    coinCount++;
    coinChain = coinChainT > 0 ? coinChain + 1 : 0;
    coinChainT = 1.1;
    hudPop = 1;
    api.sfx.combo(Math.min(coinChain, 14), 700);
    api.fx.burst(c.x, c.y, { count: 10, colors: ['#ffd23f', '#fff3b0', '#ffffff'], speed: 150, size: 3, life: 0.45, gravity: 200 });
    api.fx.text(c.x, c.y - 12, coinChain >= 2 ? `+${COIN_BONUS}m ×${coinChain + 1}` : `+${COIN_BONUS}m`, { color: '#fff3b0', size: 18 + Math.min(coinChain, 6), life: 0.6, rise: 40 });
    api.haptic(8);
  }

  function score() {
    return Math.floor(climbed / METER) + coinCount * COIN_BONUS;
  }

  function die() {
    hero.alive = false;
    deadT = 0;
    api.sfx.tone({ freq: 700, to: 120, type: 'triangle', dur: 0.7, vol: 0.16 });
    api.sfx.play('whoosh');
    api.fx.shake(8, 0.3);
    api.fx.flash('#ff5d73', 0.25);
    api.haptic(80);
    // persist the record, but keep this run's marker at the previous best (a revive continues the run)
    if (climbed > (api.store.get('bestHeight', 0) || 0)) api.store.set('bestHeight', Math.round(climbed));
    api.gameOver({ delay: 800, stats: { meters: Math.floor(climbed / METER), coins: coinCount } });
  }

  function update(dt) {
    t += dt;
    const s = steer();
    const target = s * MAX_VX;
    hero.vx += (target - hero.vx) * Math.min(1, dt * (s ? 10 : 6));
    if (Math.abs(hero.vx) > 40) hero.face = hero.vx > 0 ? 1 : -1;
    hero.x += hero.vx * dt;
    if (hero.x < 0) hero.x += W;
    else if (hero.x >= W) hero.x -= W;
    const prevFeet = hero.y + R;
    hero.vy += GRAV * dt;
    if (hero.vy > 1400) hero.vy = 1400;
    hero.y += hero.vy * dt;
    const feet = hero.y + R;

    // moving platforms + animations
    for (let n = 0; n < plats.length; n++) {
      const p = plats[n];
      if (p.vx) {
        p.x += p.vx * dt;
        if (p.x < 4) {
          p.x = 4;
          p.vx = -p.vx;
        } else if (p.x + p.w > W - 4) {
          p.x = W - 4 - p.w;
          p.vx = -p.vx;
        }
      }
    }
    // landing (only while falling)
    if (hero.vy > 0) {
      for (let n = 0; n < plats.length; n++) {
        const p = plats[n];
        if (p.broken || p.vanishT > 0) continue;
        if (prevFeet <= p.y + 4 && feet >= p.y) {
          const hx = hero.x;
          const pad = R * 0.7;
          const inX = (hx > p.x - pad && hx < p.x + p.w + pad) || (hx - W > p.x - pad && hx - W < p.x + p.w + pad) || (hx + W > p.x - pad && hx + W < p.x + p.w + pad);
          if (inX && landOn(p)) break;
        }
      }
    }
    // coins
    for (let n = 0; n < coins.length; n++) {
      const c = coins[n];
      if (c.taken) continue;
      const dx = Math.abs(c.x - hero.x);
      const ddx = Math.min(dx, W - dx);
      const dy = c.y - hero.y;
      if (ddx < R + 9 && dy > -R - 12 && dy < R + 12) collect(c);
    }
    if (coinChainT > 0) coinChainT -= dt;

    // climb + camera
    if (-hero.y - R > climbed) {
      climbed = -hero.y - R;
      const m = Math.floor(climbed / METER);
      if (m >= lastMilestone + 100) {
        lastMilestone = m - (m % 100);
        hudPop = 1;
        api.fx.text(W / 2, H * 0.3, `${lastMilestone}m!`, { size: 42, color: '#ffffff', life: 1.3 });
        api.fx.confetti(W / 2, H * 0.3, 50);
        api.sfx.play('levelup');
        api.emit('milestone', { meters: lastMilestone });
        if (lastMilestone % 500 === 0) api.happy();
      }
      if (!bestShown && bestH > 400 && climbed > bestH) {
        bestShown = true;
        api.fx.text(W / 2, H * 0.4, 'NEW RECORD HEIGHT!', { size: 26, color: '#fff3b0', life: 1.4 });
        api.sfx.play('perfect');
      }
    }
    const sc = score();
    if (sc !== api.score) api.setScore(sc);
    const want = hero.y - H * 0.42;
    if (want < camY) camY += (want - camY) * Math.min(1, dt * 9);
    genUntil(camY - 260);

    if (hero.y - R - camY > H) die();
  }

  function animate(dt) {
    if (hudPop > 0) hudPop = Math.max(0, hudPop - dt * 5);
    hero.sx += (1 - hero.sx) * Math.min(1, dt * 10);
    hero.sy += (1 - hero.sy) * Math.min(1, dt * 10);
    if (hero.alive && hero.vy < -200 && hero.spin === 0) {
      hero.sy = Math.max(hero.sy, 1.06);
      hero.sx = Math.min(hero.sx, 0.95);
    }
    if (hero.spin > 0) {
      hero.spin = Math.max(0, hero.spin - dt * 1.6);
      hero.rot = (1 - hero.spin) * Math.PI * 2 * -hero.face;
      if (hero.spin === 0) hero.rot = 0;
    }
    hero.blinkT -= dt;
    if (hero.blinkT < -0.12) hero.blinkT = 2 + Math.random() * 3;
    for (let n = plats.length - 1; n >= 0; n--) {
      const p = plats[n];
      if (p.springT > 0) p.springT = Math.max(0, p.springT - dt * 4);
      if (p.bounceT > 0) p.bounceT = Math.max(0, p.bounceT - dt * 5);
      if (p.broken) p.breakT += dt;
      if (p.vanishT > 0) p.vanishT += dt;
      if (p.y - camY > H + 80 || p.breakT > 1.2 || p.vanishT > 0.5) {
        platPool.push(p);
        plats[n] = plats[plats.length - 1];
        plats.pop();
      }
    }
    for (let n = coins.length - 1; n >= 0; n--) {
      const c = coins[n];
      if (c.taken || c.y - camY > H + 40) {
        coinPool.push(c);
        coins[n] = coins[coins.length - 1];
        coins.pop();
      }
    }
  }

  function revive() {
    clearInput();
    hero.alive = true;
    hero.x = Math.max(64, Math.min(W - 64, hero.x));
    hero.y = camY + H * 0.52;
    hero.vx = 0;
    hero.vy = 0;
    hero.rot = 0;
    hero.spin = 0;
    hoverY = hero.y;
    // clear decoys around the rescue spot, then add a golden spring pad
    for (let n = 0; n < plats.length; n++) {
      const p = plats[n];
      if (p.type === 'break' && Math.abs(p.y - hero.y) < 200) p.broken = true;
    }
    const p = newPlat('rescue', hero.x - 50, hero.y + R + 70, 100);
    p.spring = true;
    p.springX = 50;
  }

  // ---------- render ----------
  function render(g) {
    const m = Math.max(0, -camY / METER);
    skyAt(m, sky);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgb(${sky[0]},${sky[1]},${sky[2]})`);
    grad.addColorStop(1, `rgb(${sky[3]},${sky[4]},${sky[5]})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // stars at altitude
    const starA = Math.max(0, Math.min(1, (m - 700) / 400));
    if (starA > 0) {
      g.fillStyle = '#ffffff';
      for (let n = 0; n < 50; n++) {
        const x = (n * 97.3) % W;
        const y = (((n * 61.7 - camY * 0.05) % H) + H) % H;
        g.globalAlpha = starA * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + n)));
        g.fillRect(x, y, 2, 2);
      }
      g.globalAlpha = 1;
    }
    // far clouds (parallax)
    const cloudA = 0.75 - starA * 0.5;
    g.fillStyle = `rgba(255,255,255,${cloudA * 0.55})`;
    for (let n = 0; n < 7; n++) {
      const span = H + 240;
      const y = ((((n * 173.3 - camY * 0.25) % span) + span) % span) - 120;
      const x = (((n * 131.7 + t * (6 + n * 2)) % (W + 160)) + W + 160) % (W + 160) - 80;
      drawCloudShape(g, x, y, 0.9 + (n % 3) * 0.35);
    }
    // ground hills near the start
    const gy = -camY;
    if (gy < H + 40) {
      g.fillStyle = '#8fdc8a';
      g.beginPath();
      g.moveTo(0, gy - 40);
      g.quadraticCurveTo(W * 0.25, gy - 110, W * 0.55, gy - 50);
      g.quadraticCurveTo(W * 0.8, gy - 10, W, gy - 70);
      g.lineTo(W, gy + 400);
      g.lineTo(0, gy + 400);
      g.closePath();
      g.fill();
      g.fillStyle = '#5ad86e';
      g.fillRect(0, gy, W, 14);
      g.fillStyle = '#8a5a3a';
      g.fillRect(0, gy + 14, W, Math.max(0, H - gy));
      g.fillStyle = '#6f4629';
      for (let x = 12; x < W; x += 38) g.fillRect(x, gy + 28 + ((x * 7) % 30), 10, 6);
    }
    // best height marker
    if (bestH > 200) {
      const by = -bestH - camY;
      if (by > -20 && by < H + 20) {
        g.strokeStyle = 'rgba(255,255,255,0.7)';
        g.lineWidth = 2;
        g.setLineDash([10, 8]);
        g.beginPath();
        g.moveTo(0, by);
        g.lineTo(W, by);
        g.stroke();
        g.setLineDash([]);
        api.draw.roundRect(g, 8, by - 22, 56, 20, 8, 'rgba(255,255,255,0.85)');
        api.draw.text(g, 'BEST', 36, by - 12, { size: 13, color: '#ff5d73', shadow: false });
      }
    }
    // platforms
    for (let n = 0; n < plats.length; n++) {
      const p = plats[n];
      if (p.type === 'ground') continue;
      const y = p.y - camY + (p.bounceT > 0 ? Math.sin(p.bounceT * Math.PI) * 5 : 0);
      if (y < -40 || y > H + 40) continue;
      if (p.broken) {
        const k = p.breakT;
        const drop = 220 * k * k + 40 * k;
        const half = p.w / 2;
        const a = Math.max(0, 1 - k * 1.1);
        g.save();
        g.translate(p.x + half * 0.5, y + drop);
        g.rotate(-k * 1.4);
        drawPlatform(g, 'break', -half * 0.5, 0, half, t, a);
        g.restore();
        g.save();
        g.translate(p.x + half * 1.5, y + drop * 1.1);
        g.rotate(k * 1.6);
        drawPlatform(g, 'break', -half * 0.5, 0, half, t, a);
        g.restore();
        continue;
      }
      if (p.vanishT > 0) {
        const k = p.vanishT / 0.5;
        g.save();
        g.translate(p.x + p.w / 2, y);
        g.scale(1 + k * 0.5, 1 + k * 0.5);
        drawPlatform(g, 'cloud', -p.w / 2, 0, p.w, t, 1 - k);
        g.restore();
        continue;
      }
      if (p.type === 'rescue') {
        g.fillStyle = `rgba(255,230,120,${0.25 + 0.15 * Math.sin(t * 6)})`;
        g.beginPath();
        g.ellipse(p.x + p.w / 2, y + 8, p.w * 0.75, 26, 0, 0, Math.PI * 2);
        g.fill();
      }
      drawPlatform(g, p.type, p.x, y, p.w, t);
      if (p.spring) drawSpring(g, p.x + p.springX, y + 1, p.springT > 0 ? Math.sin(p.springT * Math.PI) : 0);
    }
    // coins
    for (let n = 0; n < coins.length; n++) {
      const c = coins[n];
      if (c.taken) continue;
      const y = c.y - camY + Math.sin(t * 3 + c.ph) * 3;
      if (y < -20 || y > H + 20) continue;
      drawCoin(g, c.x, y, t + c.ph);
    }
    // hero (+ wrapped copy near the edges)
    const hy = hero.y - camY;
    const blink = hero.blinkT < 0;
    const lookY = Math.max(-2, Math.min(2.5, hero.vy / 400));
    if (hero.spin > 0 || hero.vy < -1000) {
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 2.5;
      for (let n = -1; n <= 1; n++) {
        const lx = hero.x + n * 12;
        g.beginPath();
        g.moveTo(lx, hy + R + 6 + Math.abs(n) * 6);
        g.lineTo(lx, hy + R + 40 + Math.abs(n) * 6);
        g.stroke();
      }
    }
    drawHero(g, hero.x, hy, hero.sx, hero.sy, hero.rot, hero.face, blink, lookY);
    if (hero.x < R + 4) drawHero(g, hero.x + W, hy, hero.sx, hero.sy, hero.rot, hero.face, blink, lookY);
    else if (hero.x > W - R - 4) drawHero(g, hero.x - W, hy, hero.sx, hero.sy, hero.rot, hero.face, blink, lookY);
    // danger glow when falling near the bottom
    if (hero.alive && hero.vy > 300 && hy > H * 0.75 && api.state === 'playing') {
      const k = Math.min(1, (hy - H * 0.75) / (H * 0.25));
      const dg = g.createLinearGradient(0, H - 120, 0, H);
      dg.addColorStop(0, 'rgba(255,60,90,0)');
      dg.addColorStop(1, `rgba(255,60,90,${0.45 * k})`);
      g.fillStyle = dg;
      g.fillRect(0, H - 120, W, 120);
    }
    // steering hint zones on the first run
    if (api.state === 'ready' && hero.alive) {
      const p = 0.5 + 0.5 * Math.sin(t * 4);
      g.fillStyle = `rgba(255,255,255,${0.14 + p * 0.1})`;
      api.draw.roundRect(g, 14, H * 0.5, 64, 64, 18, g.fillStyle);
      api.draw.roundRect(g, W - 78, H * 0.5, 64, 64, 18, g.fillStyle);
      api.draw.text(g, '◀', 46, H * 0.5 + 33, { size: 28, color: '#ffffff' });
      api.draw.text(g, '▶', W - 46, H * 0.5 + 33, { size: 28, color: '#ffffff' });
      api.draw.text(g, 'HOLD TO STEER', W / 2, H * 0.5 + 33, { size: 17, color: 'rgba(255,255,255,0.95)' });
    }
    // score HUD (drawn here so it only pops on coins and milestones, not every meter)
    if (api.state !== 'ready') {
      const sc = 1 + api.ease.outQuad(hudPop) * 0.25;
      g.save();
      g.translate(W / 2, 64);
      g.scale(sc, sc);
      api.draw.text(g, `${api.score}m`, 0, 0, { size: 52, weight: 800, color: '#ffffff', shadow: 'rgba(0,0,0,0.35)' });
      g.restore();
      if (api.target != null) {
        const beat = api.score > api.target;
        api.draw.text(g, beat ? `🎯 ${api.target}m beaten!` : `🎯 beat ${api.target}m`, W / 2, 106, { size: 18, weight: 700, color: beat ? '#a3e635' : '#ffd23f' });
      }
    }
    // coin counter
    if (api.state !== 'ready' || coinCount > 0) {
      drawCoin(g, 26, 30, 0.2, 1.05);
      api.draw.text(g, coinCount, 42, 31, { size: 22, align: 'left', color: '#ffffff', shadow: 'rgba(0,0,0,0.35)' });
    }
  }

  reset();

  return {
    reset,
    update(dt) {
      update(dt);
      animate(dt);
    },
    idle(dt) {
      t += dt;
      if (!hero.alive) {
        deadT += dt;
        hero.vy = Math.min(1400, hero.vy + GRAV * dt);
        hero.y += hero.vy * dt;
      } else if (api.state === 'ready') {
        if (hoverY === null) {
          // idle hop on the ground before the first tap
          const k = Math.abs(Math.sin(t * 3.2));
          hero.y = -R - k * 26;
          if (k < 0.08) {
            hero.sx = 1.18;
            hero.sy = 0.84;
          }
        } else {
          hero.y = hoverY + Math.sin(t * 3) * 5; // hovering after a revive
        }
      }
      animate(dt);
    },
    input(e) {
      if (e.type === 'down') {
        let slot = ptrId.indexOf(e.id);
        if (slot < 0) slot = ptrId.indexOf(-1);
        if (slot < 0) slot = 0;
        ptrId[slot] = e.id;
        ptrDir[slot] = e.x < W / 2 ? -1 : 1;
        ptrAt[slot] = ++ptrSeq;
        return true;
      }
      if (e.type === 'move') {
        const slot = ptrId.indexOf(e.id);
        if (slot >= 0 && e.pressed) ptrDir[slot] = e.x < W / 2 ? -1 : 1;
        return false;
      }
      if (e.type === 'up') {
        const slot = ptrId.indexOf(e.id);
        if (slot >= 0) ptrId[slot] = -1;
        return true;
      }
      const k = e.key;
      const isL = k === 'ArrowLeft' || k === 'a' || k === 'A';
      const isR = k === 'ArrowRight' || k === 'd' || k === 'D';
      if (e.type === 'keydown') {
        if (isL) keyL = true;
        else if (isR) keyR = true;
        return isL || isR || k === ' ' || k === 'ArrowUp' || k === 'ArrowDown';
      }
      if (e.type === 'keyup') {
        if (isL) keyL = false;
        else if (isR) keyR = false;
        return isL || isR;
      }
      return false;
    },
    revive,
    render,
    hud: false,
    forwardStartInput: true,
  };
}

/** Cover art: the hero launching off a spring into a sunset sky full of floating islands. */
export function cover(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5a8dff');
  grad.addColorStop(0.55, '#9fb6ff');
  grad.addColorStop(1, '#ffc6dd');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const s = Math.min(w / 800, h / 600);
  // sun glow
  const sun = g.createRadialGradient(w * 0.78, h * 0.22, 10 * s, w * 0.78, h * 0.22, 220 * s);
  sun.addColorStop(0, 'rgba(255,245,200,0.95)');
  sun.addColorStop(0.3, 'rgba(255,220,160,0.5)');
  sun.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);
  // background clouds
  g.fillStyle = 'rgba(255,255,255,0.7)';
  const cl = [
    [0.12, 0.2, 1.6],
    [0.45, 0.1, 1.2],
    [0.9, 0.55, 1.8],
    [0.2, 0.7, 1.4],
    [0.62, 0.82, 2.2],
  ];
  for (const [cx, cy, cs] of cl) drawCloudShape(g, cx * w, cy * h, cs * s * 1.6);
  // platforms
  const ps = s * 1.9;
  const plats = [
    ['normal', 0.08, 0.34, 88],
    ['moving', 0.62, 0.5, 80],
    ['cloud', 0.15, 0.62, 86],
    ['normal', 0.4, 0.9, 96],
    ['break', 0.78, 0.8, 76],
  ];
  for (const [type, px, py, pw] of plats) {
    g.save();
    g.translate(px * w, py * h);
    g.scale(ps, ps);
    drawPlatform(g, type, 0, 0, pw, 0);
    g.restore();
  }
  // spring platform + hero launching
  const bx = w * 0.46;
  const by = h * 0.9;
  g.save();
  g.translate(bx, by);
  g.scale(ps, ps);
  drawSpring(g, 48, 0, 0);
  g.restore();
  // coin arc
  for (let n = 0; n < 6; n++) {
    const a = n / 5;
    const cx = w * 0.3 + a * w * 0.42;
    const cy = h * 0.28 - Math.sin(a * Math.PI) * h * 0.14;
    g.save();
    g.translate(cx, cy);
    g.scale(ps, ps);
    drawCoin(g, 0, 0, (n % 2) * 0.22);
    g.restore();
  }
  const hx = bx + 48 * ps;
  const hy = h * 0.5;
  // motion streaks
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineCap = 'round';
  g.lineWidth = 5 * s;
  for (let n = -1; n <= 1; n++) {
    g.beginPath();
    g.moveTo(hx + n * 26 * s, hy + (48 + Math.abs(n) * 14) * s);
    g.lineTo(hx + n * 26 * s, hy + (140 + Math.abs(n) * 14) * s);
    g.stroke();
  }
  g.lineCap = 'butt';
  g.save();
  g.translate(hx, hy);
  g.scale(ps * 1.25, ps * 1.25);
  drawHero(g, 0, 0, 0.9, 1.12, -0.12, 1, false, -2);
  g.restore();
}
