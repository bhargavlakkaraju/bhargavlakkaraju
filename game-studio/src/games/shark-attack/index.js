// Shark Attack - 1 to 4 players on one screen, one button each (engine/party.js).
//
// Top-down swimming pool. Each round one player starts as the SHARK (never the same player
// twice in a row) and everyone else is a rubber duck. Let go and you spin in place; hold
// your button to swim forward. Sharks are 25% faster, ducks get a splash boost on every new
// press. A shark that bites a duck turns it into another shark. Survive until the clock runs
// out and every duck still afloat shares the crown; if the sharks catch every duck, the
// original shark wins.
//
// Everything that affects play (shark pick, floaties, bots) uses ctx.rng so all-bot demo runs
// are reproducible. Splashes and ripples use Math.random.
import { createParty } from '../engine/party.js';
import { ease } from '../engine/fx.js';
import * as draw from '../engine/draw.js';

const TAU = Math.PI * 2;
const W = 420;
const H = 740;

// ---------- tuning ----------
const ROUND_TIME = 35;
const DUCK_R = 15;
const SHARK_R = 20;
const BOSS_R = 22; // the original shark is a little bigger
const DUCK_SPEED = 116;
const SHARK_SPEED = DUCK_SPEED * 1.25;
const DUCK_SPIN = 3.3; // rad/s while the button is up
const SHARK_SPIN = 2.5;
const HEAD_START = 1.5; // sharks wait this long at the start of a round
const BOOST = 0.95; // extra speed share at the start of a splash boost
const BOOST_TIME = 0.32;
const BOOST_CD = 0.45;
const STUN = 0.65; // a freshly bitten duck spins while it turns into a shark

// ---------- pool layout ----------
const POOL = { x0: 20, y0: 106, x1: 400, y1: 634 };
const PW = POOL.x1 - POOL.x0;
const PH = POOL.y1 - POOL.y0;
const CX = (POOL.x0 + POOL.x1) / 2;
const CY = (POOL.y0 + POOL.y1) / 2;
const LANES = 5;
const WHIRL_R = 185;

const SHARK_BODY = '#6f8ea8';
const SHARK_DARK = '#4d6a82';
const SHARK_BELLY = '#a9c2d4';

// ---------- helpers ----------
function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return d;
}
const spinGap = (from, to, dir) => ((((to - from) * dir) % TAU) + TAU) % TAU;
// mirrored spin per seat (P1 and P3 clockwise, P2 and P4 counter-clockwise) keeps the corners fair
const seatSpin = (i) => (i === 0 || i === 2 ? 1 : -1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function spawnPoint(i) {
  const left = i === 0 || i === 3;
  const bottom = i === 0 || i === 1;
  return { x: left ? POOL.x0 + 72 : POOL.x1 - 72, y: bottom ? POOL.y1 - 84 : POOL.y0 + 84 };
}

const PAL = {};
function palette(color) {
  if (!PAL[color]) {
    PAL[color] = {
      base: color,
      light: draw.shade(color, 0.35),
      lighter: draw.shade(color, 0.6),
      dark: draw.shade(color, -0.25),
      darker: draw.shade(color, -0.45),
    };
  }
  return PAL[color];
}

// ---------- swimmer drawing (shared by the game and the cover) ----------
function drawDuck(g, x, y, r, a, color, t, bob = 0) {
  const P = palette(color);
  g.save();
  g.translate(x, y);
  g.rotate(a + Math.sin(t * 3 + bob) * 0.05);
  const s = 1 + Math.sin(t * 4.2 + bob) * 0.03;
  g.scale(s, s);
  // waterline foam
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(-r * 0.05, 0, r * 1.22, r * 1.02, 0, 0, TAU);
  g.fill();
  // tail
  g.fillStyle = P.dark;
  g.beginPath();
  g.moveTo(-r * 0.7, -r * 0.3);
  g.lineTo(-r * 1.25, 0);
  g.lineTo(-r * 0.7, r * 0.3);
  g.closePath();
  g.fill();
  // body
  const body = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  body.addColorStop(0, P.lighter);
  body.addColorStop(0.55, P.base);
  body.addColorStop(1, P.dark);
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, 0, r, r * 0.82, 0, 0, TAU);
  g.fill();
  // wings
  g.fillStyle = P.dark;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.ellipse(-r * 0.2, sd * r * 0.48, r * 0.52, r * 0.24, sd * 0.12, 0, TAU);
    g.fill();
  }
  g.strokeStyle = P.darker;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(0, 0, r, r * 0.82, 0, 0, TAU);
  g.stroke();
  // head
  const hx = r * 0.52;
  const hr = r * 0.52;
  const head = g.createRadialGradient(hx - hr * 0.3, -hr * 0.35, hr * 0.1, hx, 0, hr);
  head.addColorStop(0, P.lighter);
  head.addColorStop(1, P.base);
  g.fillStyle = head;
  g.beginPath();
  g.arc(hx, 0, hr, 0, TAU);
  g.fill();
  g.strokeStyle = P.dark;
  g.stroke();
  // beak
  g.fillStyle = '#ff9f1a';
  g.beginPath();
  g.ellipse(hx + hr * 0.95, 0, r * 0.34, r * 0.22, 0, 0, TAU);
  g.fill();
  g.strokeStyle = '#d9730d';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(hx + hr * 0.7, 0);
  g.lineTo(hx + hr * 1.3, 0);
  g.stroke();
  // eyes
  for (const sd of [-1, 1]) {
    draw.circle(g, hx + hr * 0.35, sd * hr * 0.5, r * 0.12, '#1a1020');
    draw.circle(g, hx + hr * 0.4, sd * hr * 0.5 - r * 0.04, r * 0.045, '#ffffff');
  }
  g.restore();
}

function drawShark(g, x, y, r, a, color, t, opts = {}) {
  const { wag = 1, boss = false, mouth = 0, flash = 0 } = opts;
  const L = r * 2.15;
  const Wd = r * 0.95;
  g.save();
  g.translate(x, y);
  g.rotate(a);
  // tail (wags)
  const tw = Math.sin(t * 11) * 0.38 * wag;
  g.save();
  g.translate(-L * 0.46, 0);
  g.rotate(tw);
  g.fillStyle = SHARK_DARK;
  g.beginPath();
  g.moveTo(r * 0.1, -r * 0.14);
  g.lineTo(-r * 0.75, -r * 0.62);
  g.lineTo(-r * 0.5, 0);
  g.lineTo(-r * 0.75, r * 0.62);
  g.lineTo(r * 0.1, r * 0.14);
  g.closePath();
  g.fill();
  g.restore();
  // pectoral fins
  g.fillStyle = SHARK_DARK;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(L * 0.14, sd * Wd * 0.36);
    g.lineTo(-L * 0.14, sd * Wd * 1.05);
    g.lineTo(-L * 0.06, sd * Wd * 0.32);
    g.closePath();
    g.fill();
  }
  // body
  g.beginPath();
  g.moveTo(L * 0.56, 0);
  g.bezierCurveTo(L * 0.5, -Wd * 0.5, L * 0.2, -Wd * 0.55, 0, -Wd * 0.5);
  g.bezierCurveTo(-L * 0.25, -Wd * 0.42, -L * 0.42, -Wd * 0.2, -L * 0.5, -Wd * 0.1);
  g.lineTo(-L * 0.5, Wd * 0.1);
  g.bezierCurveTo(-L * 0.42, Wd * 0.2, -L * 0.25, Wd * 0.42, 0, Wd * 0.5);
  g.bezierCurveTo(L * 0.2, Wd * 0.55, L * 0.5, Wd * 0.5, L * 0.56, 0);
  g.closePath();
  const grad = g.createLinearGradient(0, -Wd * 0.5, 0, Wd * 0.5);
  grad.addColorStop(0, SHARK_BELLY);
  grad.addColorStop(0.3, SHARK_BODY);
  grad.addColorStop(0.7, SHARK_BODY);
  grad.addColorStop(1, SHARK_BELLY);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = boss ? 3.2 : 2.6;
  g.strokeStyle = color;
  g.stroke();
  // back ridge
  g.strokeStyle = 'rgba(40,62,82,0.45)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(L * 0.3, 0);
  g.lineTo(-L * 0.42, 0);
  g.stroke();
  // dorsal fin in the player's color (casts a little shadow)
  g.fillStyle = 'rgba(20,40,60,0.3)';
  g.beginPath();
  g.moveTo(L * 0.12 + 2, 2);
  g.lineTo(-L * 0.26 + 2, -Wd * 0.2 + 2);
  g.lineTo(-L * 0.18 + 2, 2);
  g.lineTo(-L * 0.26 + 2, Wd * 0.2 + 2);
  g.closePath();
  g.fill();
  const P = palette(color);
  g.fillStyle = P.base;
  g.beginPath();
  g.moveTo(L * 0.12, 0);
  g.lineTo(-L * 0.26, -Wd * 0.2);
  g.lineTo(-L * 0.18, 0);
  g.lineTo(-L * 0.26, Wd * 0.2);
  g.closePath();
  g.fill();
  if (boss) {
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.moveTo(L * 0.12, 0);
    g.lineTo(L * 0.0, -Wd * 0.07);
    g.lineTo(L * 0.0, Wd * 0.07);
    g.closePath();
    g.fill();
  }
  // mouth: a toothy grin that gapes open as the shark closes in
  if (mouth > 0.15) {
    const mx = L * 0.45;
    const mw = L * (0.08 + mouth * 0.09);
    const mh = Wd * (0.14 + mouth * 0.3);
    g.fillStyle = '#5a0f24';
    g.beginPath();
    g.ellipse(mx, 0, mw, mh, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#ff7a9a';
    g.beginPath();
    g.ellipse(mx - mw * 0.35, 0, mw * 0.45, mh * 0.45, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    const n = 4;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = mx - mw * 0.8 + ((i + 0.5) * mw * 1.6) / n;
      const hw = (mw * 0.8) / n;
      for (const sd of [-1, 1]) {
        const yEdge = sd * mh * Math.sqrt(Math.max(0, 1 - ((x0 - mx) / mw) ** 2)) * 0.98;
        g.moveTo(x0 - hw, yEdge);
        g.lineTo(x0, yEdge * 0.45);
        g.lineTo(x0 + hw, yEdge);
      }
    }
    g.fill();
  } else {
    g.strokeStyle = '#2a3a4a';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(L * 0.3, 0, Wd * 0.34, -0.9, 0.9);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.3;
      const x0 = L * 0.3 + Math.cos(a) * Wd * 0.34;
      const y0 = Math.sin(a) * Wd * 0.34;
      g.moveTo(x0 - 1.4, y0 - 1.6);
      g.lineTo(x0 - 3.2, y0);
      g.lineTo(x0 - 1.4, y0 + 1.6);
    }
    g.fill();
  }
  // eyes
  for (const sd of [-1, 1]) {
    draw.circle(g, L * 0.2, sd * Wd * 0.36, r * 0.15, '#ffffff');
    draw.circle(g, L * 0.23, sd * Wd * 0.37, r * 0.085, '#10081f');
    g.strokeStyle = 'rgba(30,50,70,0.8)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(L * 0.12, sd * Wd * 0.2);
    g.lineTo(L * 0.3, sd * Wd * 0.3);
    g.stroke();
  }
  if (flash > 0) {
    g.globalAlpha = flash;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0, 0, L * 0.6, Wd * 0.7, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

function drawJaws(g, x, y, a, e, color, s = 1) {
  const k = e < 0.35 ? e / 0.35 : 1;
  const open = (1 - ease.inQuad(k)) * 0.75 + 0.02;
  g.save();
  g.globalAlpha = e < 0.6 ? 1 : 1 - (e - 0.6) / 0.4;
  g.translate(x, y);
  g.rotate(a);
  g.scale(s, s);
  for (const sd of [-1, 1]) {
    g.save();
    g.translate(-20, 0);
    g.rotate(sd * open);
    g.translate(20, 0);
    g.beginPath();
    g.ellipse(0, 0, 22, 15, 0, sd > 0 ? 0 : Math.PI, sd > 0 ? Math.PI : TAU);
    g.closePath();
    g.fillStyle = SHARK_BODY;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = color;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let x0 = -18; x0 < 16; x0 += 6) {
      g.moveTo(x0, 0);
      g.lineTo(x0 + 3, sd * 7);
      g.lineTo(x0 + 6, 0);
    }
    g.fill();
    g.restore();
  }
  g.restore();
}

function drawDonut(g, x, y, r, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const n = 8;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.arc(0, 0, r, (i / n) * TAU, ((i + 1) / n) * TAU);
    g.arc(0, 0, r * 0.45, ((i + 1) / n) * TAU, (i / n) * TAU, true);
    g.closePath();
    g.fillStyle = i % 2 ? '#ffffff' : '#ff5a7a';
    g.fill();
  }
  g.strokeStyle = 'rgba(120,20,50,0.35)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.moveTo(r * 0.45, 0);
  g.arc(0, 0, r * 0.45, 0, TAU);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r * 0.75, Math.PI * 1.1, Math.PI * 1.45);
  g.stroke();
  g.restore();
}

function drawBall(g, x, y, r, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const cols = ['#ff4d4d', '#ffffff', '#ffd23f', '#ffffff', '#3fa9ff', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, r, (i / 6) * TAU, ((i + 1) / 6) * TAU);
    g.closePath();
    g.fillStyle = cols[i];
    g.fill();
  }
  draw.circle(g, 0, 0, r * 0.22, '#ffffff');
  g.restore();
  draw.circle(g, x - r * 0.35, y - r * 0.35, r * 0.25, 'rgba(255,255,255,0.55)');
}

// ---------- pool scenery ----------
function paintPool(g) {
  // evening deck: slate tiles, so the white HUD and the corner buttons read clearly
  g.fillStyle = '#21405a';
  g.fillRect(0, 0, W, H);
  let seed = 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let y = 0; y < H; y += 22) {
    for (let x = 0; x < W; x += 22) {
      g.fillStyle = `rgba(255,255,255,${(0.015 + rnd() * 0.035).toFixed(3)})`;
      g.fillRect(x + 1, y + 1, 20, 20);
    }
  }
  g.strokeStyle = 'rgba(8,20,34,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= W; x += 22) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 22) {
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
  }
  g.stroke();
  deckDecor(g);
  // coping stones
  draw.roundRect(g, POOL.x0 - 14, POOL.y0 - 12, PW + 28, PH + 28, 20, 'rgba(0,0,0,0.3)');
  draw.roundRect(g, POOL.x0 - 13, POOL.y0 - 13, PW + 26, PH + 26, 19, '#e9eef2');
  g.strokeStyle = 'rgba(120,140,160,0.35)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = POOL.x0 + 8; x < POOL.x1; x += 30) {
    g.moveTo(x, POOL.y0 - 13);
    g.lineTo(x, POOL.y0);
    g.moveTo(x, POOL.y1);
    g.lineTo(x, POOL.y1 + 13);
  }
  for (let y = POOL.y0 + 8; y < POOL.y1; y += 30) {
    g.moveTo(POOL.x0 - 13, y);
    g.lineTo(POOL.x0, y);
    g.moveTo(POOL.x1, y);
    g.lineTo(POOL.x1 + 13, y);
  }
  g.stroke();
  // water
  const water = g.createLinearGradient(0, POOL.y0, 0, POOL.y1);
  water.addColorStop(0, '#4fd6f0');
  water.addColorStop(0.5, '#27b7e3');
  water.addColorStop(1, '#1597d0');
  draw.roundRect(g, POOL.x0, POOL.y0, PW, PH, 9, water);
  g.save();
  draw.roundRectPath(g, POOL.x0, POOL.y0, PW, PH, 9);
  g.clip();
  // floor tiles seen through the water
  g.strokeStyle = 'rgba(255,255,255,0.09)';
  g.beginPath();
  for (let x = POOL.x0; x <= POOL.x1; x += 19) {
    g.moveTo(x + 0.5, POOL.y0);
    g.lineTo(x + 0.5, POOL.y1);
  }
  for (let y = POOL.y0; y <= POOL.y1; y += 19) {
    g.moveTo(POOL.x0, y + 0.5);
    g.lineTo(POOL.x1, y + 0.5);
  }
  g.stroke();
  // lane lines on the floor
  g.fillStyle = 'rgba(10,80,140,0.42)';
  for (let k = 0; k < LANES; k++) {
    const x = POOL.x0 + ((k + 0.5) * PW) / LANES;
    g.fillRect(x - 3, POOL.y0 + 30, 6, PH - 60);
    g.fillRect(x - 12, POOL.y0 + 30, 24, 5);
    g.fillRect(x - 12, POOL.y1 - 35, 24, 5);
  }
  // mosaic waterline band
  const tile = 7;
  for (let x = POOL.x0; x < POOL.x1; x += tile) {
    const i = Math.round((x - POOL.x0) / tile);
    const c = i % 4 === 0 ? '#0d5e9e' : i % 2 ? '#2a86c9' : '#e8f6ff';
    g.fillStyle = c;
    g.fillRect(x + 0.5, POOL.y0, tile - 1, 5);
    g.fillRect(x + 0.5, POOL.y1 - 5, tile - 1, 5);
  }
  for (let y = POOL.y0; y < POOL.y1; y += tile) {
    const i = Math.round((y - POOL.y0) / tile);
    const c = i % 4 === 0 ? '#0d5e9e' : i % 2 ? '#2a86c9' : '#e8f6ff';
    g.fillStyle = c;
    g.fillRect(POOL.x0, y + 0.5, 5, tile - 1);
    g.fillRect(POOL.x1 - 5, y + 0.5, 5, tile - 1);
  }
  // depth shading along the walls
  g.strokeStyle = 'rgba(0,50,100,0.2)';
  g.lineWidth = 16;
  draw.roundRectPath(g, POOL.x0, POOL.y0, PW, PH, 9);
  g.stroke();
  // floating lane ropes (with their shadow on the floor)
  for (let k = 1; k < LANES; k++) {
    const x = POOL.x0 + (k * PW) / LANES;
    g.fillStyle = 'rgba(0,40,90,0.18)';
    g.fillRect(x + 5, POOL.y0 + 8, 5, PH - 8);
    const n = Math.floor((PH - 8) / 8);
    for (let i = 0; i <= n; i++) {
      const y = POOL.y0 + 4 + i * ((PH - 8) / n);
      const end = i < 7 || i > n - 7;
      const c = end ? '#ff4d5e' : Math.floor(i / 2) % 2 ? '#ffffff' : '#2f6fe0';
      draw.circle(g, x, y, 3.6, c);
      draw.circle(g, x - 1, y - 1.2, 1.2, 'rgba(255,255,255,0.55)');
    }
  }
  g.restore();
  // ladders
  for (const [lx, ly, dir] of [
    [POOL.x1 - 30, POOL.y1, -1],
    [POOL.x0 + 16, POOL.y0, 1],
  ]) {
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(lx + 2, ly - dir * 8 + 2);
    g.lineTo(lx + 2, ly + dir * 26 + 2);
    g.moveTo(lx + 16, ly - dir * 8 + 2);
    g.lineTo(lx + 16, ly + dir * 26 + 2);
    g.stroke();
    g.strokeStyle = '#eef3f8';
    g.beginPath();
    g.moveTo(lx, ly - dir * 8);
    g.lineTo(lx, ly + dir * 26);
    g.moveTo(lx + 14, ly - dir * 8);
    g.lineTo(lx + 14, ly + dir * 26);
    for (let i = 0; i < 3; i++) {
      g.moveTo(lx, ly + dir * (6 + i * 9));
      g.lineTo(lx + 14, ly + dir * (6 + i * 9));
    }
    g.stroke();
    g.lineCap = 'butt';
  }
}

function deckDecor(g) {
  // party bunting along the top and bottom edges (clear of the HUD and the corner buttons)
  const cols = ['#ff6b9a', '#ffd23f', '#5ee0ff', '#9dff7a', '#c9a0ff', '#ff9d4d'];
  for (const [y0, flip] of [
    [2, 1],
    [H - 2, -1],
  ]) {
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = y0 + flip * (4 + Math.sin((x / W) * Math.PI * 3) * 2);
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    for (let i = 0; i < 21; i++) {
      const x = 8 + i * 20;
      const y = y0 + flip * (4 + Math.sin((x / W) * Math.PI * 3) * 2);
      g.fillStyle = cols[i % cols.length];
      g.beginPath();
      g.moveTo(x - 6, y);
      g.lineTo(x + 6, y);
      g.lineTo(x, y + flip * 12);
      g.closePath();
      g.fill();
    }
  }
  // flip-flops, a rolled towel, a rubber ring and a drink by the pool
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(119, 704, 5, 10, 0.25, 0, TAU);
  g.ellipse(131, 706, 5, 10, 0.05, 0, TAU);
  g.fill();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.ellipse(117, 701, 5, 10, 0.25, 0, TAU);
  g.ellipse(129, 703, 5, 10, 0.05, 0, TAU);
  g.fill();
  g.strokeStyle = '#ff6b9a';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(113, 697);
  g.lineTo(118, 700);
  g.lineTo(121, 695);
  g.moveTo(125, 699);
  g.lineTo(130, 702);
  g.lineTo(133, 697);
  g.stroke();
  draw.roundRect(g, 288, 692, 34, 20, 9, 'rgba(0,0,0,0.25)');
  draw.roundRect(g, 286, 689, 34, 20, 9, '#5ee0ff');
  g.fillStyle = '#ffffff';
  g.fillRect(292, 689, 4, 20);
  g.fillRect(310, 689, 4, 20);
  draw.circle(g, 118, 36, 5, 'rgba(0,0,0,0.25)');
  draw.circle(g, 117, 34, 5, '#ffffff');
  draw.circle(g, 117, 34, 3.4, '#ff9d4d');
  g.strokeStyle = '#ffffff';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(117, 34);
  g.lineTo(122, 26);
  g.stroke();
}

// A tileable caustics texture (bright light lines where Voronoi cells meet).
function makeCaustics(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const n = 5;
  const cell = size / n;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pts = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.15 + rnd() * 0.7) * cell, (j + 0.15 + rnd() * 0.7) * cell]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let f1 = 1e9;
      let f2 = 1e9;
      const ci = Math.floor(x / cell);
      const cj = Math.floor(y / cell);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = (ci + di + n) % n;
          const jj = (cj + dj + n) % n;
          const p = pts[jj * n + ii];
          const px = p[0] + (ci + di - ii) * cell;
          const py = p[1] + (cj + dj - jj) * cell;
          const d = (px - x) ** 2 + (py - y) ** 2;
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) f2 = d;
        }
      }
      const edge = Math.sqrt(f2) - Math.sqrt(f1);
      const v = Math.max(0, 1 - edge / 7);
      const k = (y * size + x) * 4;
      img.data[k] = 255;
      img.data[k + 1] = 255;
      img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(v * v * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ---------- the game ----------
export default function createGame(api) {
  const { rng, sfx, fx } = api;
  const now = () => api.totalTime;
  const hasDom = typeof document !== 'undefined';

  let bg = null;
  let caustic = null;
  let causticPat = null;
  let floaties = [];
  let ripples = [];
  let chomps = [];
  let lastSharks = [];
  let originals = [];
  let endT = -1;
  let endWinners = null;
  let lastDuckShown = false;
  let tick = -1;
  let wakeT = 0;

  function ensureArt(g) {
    if (!hasDom) return;
    if (!bg) {
      bg = document.createElement('canvas');
      bg.width = W * 2;
      bg.height = H * 2;
      const bg2 = bg.getContext('2d');
      bg2.scale(2, 2);
      paintPool(bg2);
    }
    if (!caustic) {
      caustic = makeCaustics(160);
      causticPat = g.createPattern(caustic, 'repeat');
    }
  }

  function makeFloaties() {
    return [
      { kind: 'donut', x: CX + rng.range(-60, 60), y: CY - 70 + rng.range(-30, 30), vx: rng.range(-10, 10), vy: rng.range(-10, 10), r: 19, rot: rng() * TAU, vr: rng.range(-0.3, 0.3), m: 0.55 },
      { kind: 'ball', x: CX + rng.range(-60, 60), y: CY + 80 + rng.range(-30, 30), vx: rng.range(-10, 10), vy: rng.range(-10, 10), r: 14, rot: rng() * TAU, vr: rng.range(-0.5, 0.5), m: 0.4 },
    ];
  }

  function pickSharks(ctx) {
    const n = ctx.twist.id === 'frenzy' && ctx.active.length >= 3 ? 2 : 1;
    let pool = ctx.active.filter((p) => !lastSharks.includes(p.i));
    if (pool.length < n) pool = ctx.active.filter((p) => p.i !== lastSharks[0]);
    if (pool.length < n) pool = ctx.active.slice();
    const out = [];
    for (let k = 0; k < n; k++) {
      const p = rng.pick(pool.filter((q) => !out.includes(q)));
      if (p) out.push(p);
    }
    return out;
  }

  function setup(ctx) {
    floaties = makeFloaties();
    ripples = [];
    chomps = [];
    endT = -1;
    endWinners = null;
    lastDuckShown = false;
    tick = -1;
    originals = ctx.active.length ? pickSharks(ctx) : [];
    if (originals.length) lastSharks = originals.map((p) => p.i);
    for (const p of ctx.active) {
      const s = spawnPoint(p.i);
      const shark = originals.includes(p);
      p.data = {
        x: s.x,
        y: s.y,
        vx: 0,
        vy: 0,
        heading: Math.atan2(CY - s.y, CX - s.x) + rng.range(-0.3, 0.3),
        spin: seatSpin(p.i),
        shark,
        boss: shark,
        r: (shark ? BOSS_R : DUCK_R) * ctx.size,
        boost: 0,
        boostCd: 0,
        stun: 0,
        morph: -9,
        mouth: 0,
        bob: p.i * 1.7,
        bumpT: 0,
        bot: null,
      };
      p.x = s.x;
      p.y = s.y;
    }
  }

  const ducks = (ctx) => ctx.active.filter((p) => p.alive && !p.data.shark);
  const sharks = (ctx) => ctx.active.filter((p) => p.alive && p.data.shark);

  function speedOf(d) {
    return d.shark ? SHARK_SPEED : DUCK_SPEED * (1 + BOOST * d.boost);
  }

  // ----- effects -----
  function ripple(x, y, r0, r1, life, a = 0.5) {
    if (ripples.length > 90) ripples.shift();
    ripples.push({ x, y, r0, r1, life, a, t0: now() });
  }

  function splash(x, y, n = 10, color = null) {
    fx.burst(x, y, { count: n, colors: color ? ['#ffffff', color] : ['#ffffff', '#c9f3ff', '#7fdcff'], speed: 130, gravity: 0, drag: 0.9, life: 0.4, size: 3 });
  }

  function squeak(p, up = true) {
    if (!p.human || api.demo) return;
    sfx.tone({ freq: up ? 950 : 1250, to: up ? 1400 : 500, type: 'triangle', dur: 0.12, vol: 0.12 });
  }

  function chompSound() {
    sfx.noise({ dur: 0.18, vol: 0.28, freq: 1600, to: 250 });
    sfx.tone({ freq: 220, to: 70, type: 'square', dur: 0.16, vol: 0.12 });
    sfx.tone({ freq: 1250, to: 400, type: 'triangle', dur: 0.14, vol: 0.08, delay: 0.02 });
  }

  function infect(ctx, sharkP, duckP) {
    if (globalThis.__dbg) globalThis.__dbg.push('catch@' + Math.floor(ctx.time / 5) * 5); // DEBUG
    if (typeof window !== 'undefined' && window.__hr) console.log('CATCH', api.totalTime.toFixed(2)); // DEBUG
    const s = sharkP.data;
    const d = duckP.data;
    const cx = (s.x + d.x) / 2;
    const cy = (s.y + d.y) / 2;
    d.shark = true;
    d.boss = false;
    d.stun = STUN;
    d.morph = now();
    d.boost = 0;
    d.r = SHARK_R * ctx.size;
    d.vx = s.vx * 0.4;
    d.vy = s.vy * 0.4;
    s.mouth = 1;
    s.vx *= 0.5;
    s.vy *= 0.5;
    chomps.push({ x: cx, y: cy, a: s.heading, color: sharkP.color, t0: now(), s: ctx.size });
    fx.burst(cx, cy, { count: 26, colors: ['#ffffff', '#c9f3ff', '#7fdcff'], speed: 230, gravity: 0, drag: 0.9, life: 0.55, size: 3.5 });
    fx.burst(cx, cy, { count: 14, colors: [duckP.color, palette(duckP.color).light], speed: 170, gravity: 0, drag: 0.92, life: 0.8, size: 5, shape: 'square' });
    fx.ring(cx, cy, { color: '#ffffff', radius: 60, life: 0.45, width: 5 });
    fx.text(clamp(cx, 70, W - 70), Math.max(POOL.y0 + 20, cy - 30), 'CHOMP!', { color: '#ffffff', size: 30, stroke: palette(sharkP.color).darker, life: 0.9 });
    fx.shake(8, 0.28);
    ripple(cx, cy, 10, 70, 0.8, 0.7);
    chompSound();
    squeak(duckP, false);
    if (duckP.human) api.haptic(50);
    else if (sharkP.human) api.haptic(20);
    const left = ducks(ctx);
    if (left.length === 1 && ctx.active.length > 2 && !lastDuckShown) {
      lastDuckShown = true;
      const last = left[0];
      fx.text(W / 2, CY, 'LAST DUCK!', { color: last.color, size: 40, stroke: '#10081f', life: 1.4, rise: 40 });
      sfx.play('levelup');
    }
  }

  // ----- per frame -----
  function update(dt, ctx) {
    const alive = ctx.active.filter((p) => p.alive);
    const whirl = ctx.twist.id === 'whirlpool';
    for (const p of alive) {
      const d = p.data;
      const spin = d.shark ? SHARK_SPIN : DUCK_SPIN;
      if (d.stun > 0) {
        d.stun -= dt;
        d.heading += 11 * d.spin * dt;
        const k = Math.exp(-dt * 3);
        d.vx *= k;
        d.vy *= k;
      } else {
        if (!p.down) d.heading += spin * d.spin * dt;
        if (p.tap && !d.shark && d.boostCd <= 0) {
          d.boost = 1;
          d.boostCd = BOOST_CD;
          const bx = d.x - Math.cos(d.heading) * d.r;
          const by = d.y - Math.sin(d.heading) * d.r;
          splash(bx, by, 7);
          ripple(bx, by, 4, 26, 0.45, 0.6);
          if (p.human && !api.demo) sfx.noise({ dur: 0.1, vol: 0.12, freq: 2200, to: 700, type: 'bandpass', q: 1.2 });
        }
        const held = p.down && !(d.shark && ctx.time < HEAD_START);
        if (held) {
          const sp = speedOf(d);
          const k = Math.min(1, dt * 6);
          d.vx += (Math.cos(d.heading) * sp - d.vx) * k;
          d.vy += (Math.sin(d.heading) * sp - d.vy) * k;
        } else {
          const k = Math.exp(-dt * 2.4);
          d.vx *= k;
          d.vy *= k;
        }
      }
      d.boost = Math.max(0, d.boost - dt / BOOST_TIME);
      d.boostCd -= dt;
      d.bumpT -= dt;
      d.mouth = Math.max(0, d.mouth - dt * 2.5);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (whirl) swirl(d, dt);
      wall(d, p);
      p.x = d.x;
      p.y = d.y;
    }
    for (const f of floaties) {
      const k = Math.exp(-dt * 0.9);
      f.vx *= k;
      f.vy *= k;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      f.vr *= Math.exp(-dt * 0.8);
      if (whirl) swirl(f, dt);
      wall(f, null);
    }

    // bites first, then bumps
    for (const sp of alive) {
      const s = sp.data;
      if (!s.shark || s.stun > 0 || !sp.alive || ctx.time < HEAD_START) continue;
      const hx = s.x + Math.cos(s.heading) * s.r * 0.8;
      const hy = s.y + Math.sin(s.heading) * s.r * 0.8;
      for (const dp of alive) {
        const d = dp.data;
        if (d.shark) continue;
        const reach = d.r * 0.85 + s.r * 0.4;
        if ((d.x - hx) ** 2 + (d.y - hy) ** 2 < reach * reach) infect(ctx, sp, dp);
        else if ((d.x - hx) ** 2 + (d.y - hy) ** 2 < (reach + 26) ** 2) s.mouth = Math.max(s.mouth, 0.7);
      }
    }
    const bodies = alive.map((p) => p.data).concat(floaties);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j], alive[i], alive[j]);
    }

    // cosmetic wakes
    wakeT -= dt;
    if (wakeT <= 0) {
      wakeT = 0.09;
      for (const p of alive) {
        const d = p.data;
        const sp = Math.hypot(d.vx, d.vy);
        if (sp < 35) continue;
        const bx = d.x - (d.vx / sp) * d.r * (d.shark ? 1.3 : 0.9);
        const by = d.y - (d.vy / sp) * d.r * (d.shark ? 1.3 : 0.9);
        ripple(bx, by, d.r * 0.3, d.r * 1.6, 0.75, Math.min(0.4, sp / 320));
      }
      for (const f of floaties) {
        if (Math.hypot(f.vx, f.vy) > 40) ripple(f.x, f.y, f.r * 0.8, f.r * 1.6, 0.6, 0.35);
      }
    }

    // round end: every duck caught -> the original shark(s) win after a beat
    if (endT < 0 && !ducks(ctx).length) {
      if (globalThis.__dbg) globalThis.__dbg.push('SHARKWIN@' + Math.floor(ctx.time / 5) * 5 + ' ' + ctx.twist.id); // DEBUG
      endT = 0.9;
      endWinners = originals.slice();
    }
    if (endT >= 0) {
      endT -= dt;
      if (endT < 0) ctx.endRound(endWinners);
    }

    const left = Math.ceil(ROUND_TIME - ctx.time);
    if (left <= 5 && left !== tick && left > 0) {
      tick = left;
      if (ctx.humans) sfx.tone({ freq: left === 1 ? 1100 : 880, type: 'square', dur: 0.07, vol: 0.06 });
    }
  }

  function swirl(b, dt) {
    const dx = b.x - CX;
    const dy = b.y - CY;
    const d = Math.hypot(dx, dy) || 1;
    if (d > WHIRL_R) return;
    const f = 1 - d / WHIRL_R;
    const tx = -dy / d;
    const ty = dx / d;
    b.x += (tx * 95 * f - (dx / d) * 26 * f) * dt;
    b.y += (ty * 95 * f - (dy / d) * 26 * f) * dt;
  }

  function wall(b, p) {
    const r = b.r;
    let hit = 0;
    if (b.x < POOL.x0 + r) {
      b.x = POOL.x0 + r;
      if (b.vx < 0) {
        hit = -b.vx;
        b.vx *= -0.45;
      }
    } else if (b.x > POOL.x1 - r) {
      b.x = POOL.x1 - r;
      if (b.vx > 0) {
        hit = b.vx;
        b.vx *= -0.45;
      }
    }
    if (b.y < POOL.y0 + r) {
      b.y = POOL.y0 + r;
      if (b.vy < 0) {
        hit = Math.max(hit, -b.vy);
        b.vy *= -0.45;
      }
    } else if (b.y > POOL.y1 - r) {
      b.y = POOL.y1 - r;
      if (b.vy > 0) {
        hit = Math.max(hit, b.vy);
        b.vy *= -0.45;
      }
    }
    if (hit > 80 && p) {
      splash(b.x, b.y, 6);
      ripple(b.x, b.y, 6, 30, 0.5, 0.5);
    }
  }

  function collide(a, b, pa, pb) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 0.01;
    const nx = dx / d;
    const ny = dy / d;
    const ma = a.m || 1;
    const mb = b.m || 1;
    const over = rr - d;
    a.x -= nx * over * (mb / (ma + mb));
    a.y -= ny * over * (mb / (ma + mb));
    b.x += nx * over * (ma / (ma + mb));
    b.y += ny * over * (ma / (ma + mb));
    const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vrel >= 0) return;
    const j = (-(1 + 0.6) * vrel) / (1 / ma + 1 / mb);
    a.vx -= (j / ma) * nx;
    a.vy -= (j / ma) * ny;
    b.vx += (j / mb) * nx;
    b.vy += (j / mb) * ny;
    if (b.vr !== undefined) b.vr += (Math.random() - 0.5) * 2;
    if (a.vr !== undefined) a.vr += (Math.random() - 0.5) * 2;
    if (-vrel > 60 && (a.bumpT ?? 0) <= 0 && (b.bumpT ?? 0) <= 0) {
      if (a.bumpT !== undefined) a.bumpT = 0.2;
      if (b.bumpT !== undefined) b.bumpT = 0.2;
      const cx = a.x + nx * a.r;
      const cy = a.y + ny * a.r;
      splash(cx, cy, 6);
      ripple(cx, cy, 4, 22, 0.4, 0.5);
      const ducky = pa && pb && pa.data === a && pb.data === b ? [pa, pb] : [];
      const human = ducky.some((p) => p.human && !p.data.shark);
      if (human && !api.demo) sfx.tone({ freq: 900, to: 1350, type: 'triangle', dur: 0.1, vol: 0.1 });
    }
  }

  // party.js also calls idle between rounds, where only cosmetics may move (ripples, bobbing
  // and splashes run off api.totalTime). In the lobby the floaties are scenery, so they drift.
  function idle(dt, ctx) {
    if (ctx.phase !== 'lobby') return;
    for (const f of floaties) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      wall(f, null);
    }
  }

  // ----- bots -----
  function newBrain(p) {
    return {
      hold: false,
      t: 0,
      think: rng.range(0, 0.2),
      want: p.data.heading,
      err: 0,
      go: false,
      skill: rng.range(0.7, 1),
      lead: rng.range(0.45, 0.95),
      relCw: rng.range(0.28, 0.4),
      relCcw: rng.range(0.8, 1.2),
      minHold: 0.2,
      minRel: 0.1,
      wx: CX,
      wy: CY,
      wanderT: 0,
      target: null,
      pump: 0,
    };
  }

  function steer(b, heading, dir, spin, dt) {
    b.t += dt;
    const d = angDiff(b.want, heading) * dir;
    if (b.hold) {
      const off = d > 0 ? d > b.relCw : -d > b.relCcw;
      if (!b.go || (b.t > b.minHold && off)) {
        b.hold = false;
        b.t = 0;
        b.minRel = rng.range(0.05, 0.16);
      }
    } else if (b.go && b.t > b.minRel) {
      const gap = spinGap(heading, b.want + b.err, dir);
      const win = spin * dt * 1.3 + 0.02;
      if (gap < win || gap > TAU - 0.02) {
        b.hold = true;
        b.t = 0;
        b.err = rng.range(-1, 1) * (0.04 + 0.2 * (1 - b.skill));
        b.minHold = rng.range(0.14, 0.28);
      }
    }
    return b.hold;
  }

  function planShark(p, b, ctx) {
    const s = p.data;
    const list = ducks(ctx);
    if (!list.length) {
      b.go = false;
      return;
    }
    const others = sharks(ctx).filter((q) => q !== p);
    let best = null;
    let bestT = 1e9;
    for (const dp of list) {
      const d = dp.data;
      const dist = Math.hypot(d.x - s.x, d.y - s.y);
      const ang = Math.atan2(d.y - s.y, d.x - s.x);
      const onCourse = b.hold && Math.abs(angDiff(ang, s.heading)) < 0.35;
      let t = (onCourse ? 0 : spinGap(s.heading, ang, s.spin) / SHARK_SPIN) + dist / SHARK_SPEED;
      // spread the pack: a duck another shark is already closer to is worth a bit less
      for (const o of others) {
        const od = Math.hypot(d.x - o.data.x, d.y - o.data.y);
        if (od < dist) t += 0.35;
      }
      if (b.target === dp) t -= 0.25;
      if (t < bestT) {
        bestT = t;
        best = dp;
      }
    }
    b.target = best;
    const d = best.data;
    const dist = Math.hypot(d.x - s.x, d.y - s.y);
    const lookAhead = Math.min(0.9, dist / SHARK_SPEED) * b.lead;
    const tx = clamp(d.x + d.vx * lookAhead, POOL.x0 + d.r, POOL.x1 - d.r);
    const ty = clamp(d.y + d.vy * lookAhead, POOL.y0 + d.r, POOL.y1 - d.r);
    b.want = Math.atan2(ty - s.y, tx - s.x);
    b.go = true;
  }

  function planDuck(p, b, ctx) {
    const d = p.data;
    const list = sharks(ctx);
    let near = 1e9;
    for (const sp of list) near = Math.min(near, Math.hypot(sp.data.x - d.x, sp.data.y - d.y));
    const calm = near > 170 + 90 * b.skill;
    b.close = near < 95;
    if (calm) {
      // bob around open water, sometimes just spin and wait
      b.wanderT -= 0.25;
      if (b.wanderT <= 0 || Math.hypot(b.wx - d.x, b.wy - d.y) < 30) {
        b.wanderT = rng.range(1.5, 3.5);
        let bx = CX;
        let by = CY;
        let bs = -1e9;
        for (let k = 0; k < 6; k++) {
          const x = rng.range(POOL.x0 + 50, POOL.x1 - 50);
          const y = rng.range(POOL.y0 + 50, POOL.y1 - 50);
          let sc = 0;
          for (const sp of list) sc += Math.min(260, Math.hypot(sp.data.x - x, sp.data.y - y));
          sc -= Math.hypot(x - d.x, y - d.y) * 0.3;
          if (sc > bs) {
            bs = sc;
            bx = x;
            by = y;
          }
        }
        b.wx = bx;
        b.wy = by;
      }
      b.want = Math.atan2(b.wy - d.y, b.wx - d.x);
      b.go = rng() < 0.9;
      b.flee = false;
      return;
    }
    // flee: try 16 headings, weigh how long the spin takes against how safe each one ends up
    b.flee = true;
    const T = 0.75;
    let best = d.heading;
    let bestS = -1e9;
    for (let k = 0; k < 16; k++) {
      const th = (k / 16) * TAU;
      const onCourse = b.hold && Math.abs(angDiff(th, d.heading)) < 0.3;
      const tAlign = onCourse ? 0 : spinGap(d.heading, th, d.spin) / DUCK_SPIN;
      const reach = DUCK_SPEED * 1.15 * T;
      let px = d.x + d.vx * Math.min(tAlign, 0.4) * 0.5 + Math.cos(th) * reach;
      let py = d.y + d.vy * Math.min(tAlign, 0.4) * 0.5 + Math.sin(th) * reach;
      const cx = clamp(px, POOL.x0 + 30, POOL.x1 - 30);
      const cy = clamp(py, POOL.y0 + 30, POOL.y1 - 30);
      const wallCost = Math.hypot(px - cx, py - cy) * 1.2;
      px = cx;
      py = cy;
      let safe = 1e9;
      for (const sp of list) {
        const s = sp.data;
        const tt = tAlign + T;
        const ddx = px - s.x;
        const ddy = py - s.y;
        const dd = Math.hypot(ddx, ddy) || 1;
        const move = Math.min(dd, SHARK_SPEED * tt * 0.72);
        const sx = s.x + (ddx / dd) * move;
        const sy = s.y + (ddy / dd) * move;
        let v = Math.hypot(px - sx, py - sy);
        // danger while still spinning in place
        const nowD = Math.hypot(d.x - s.x, d.y - s.y) - SHARK_SPEED * tAlign * 0.72;
        if (nowD < s.r + d.r + 10) v -= 120;
        safe = Math.min(safe, v);
      }
      // corners are traps
      const edge = Math.min(px - POOL.x0, POOL.x1 - px) + Math.min(py - POOL.y0, POOL.y1 - py);
      const sc = safe - wallCost - Math.max(0, 110 - edge) * 0.5 - tAlign * 25 + (onCourse ? 12 : 0);
      if (sc > bestS) {
        bestS = sc;
        best = th;
      }
    }
    b.want = best;
    b.go = true;
  }

  function bot(p, dt, ctx) {
    const d = p.data;
    if (!d.bot) d.bot = newBrain(p);
    const b = d.bot;
    if (d.stun > 0) {
      b.hold = false;
      return false;
    }
    b.think -= dt;
    if (b.think <= 0) {
      if (d.shark) planShark(p, b, ctx);
      else planDuck(p, b, ctx);
      b.think = rng.range(0.14, 0.3) * (1.35 - 0.35 * b.skill);
    } else if (d.shark && b.target && b.target.alive && !b.target.data.shark) {
      const t = b.target.data;
      b.want = Math.atan2(t.y - d.y, t.x - d.x);
    }
    let hold = steer(b, d.heading, d.spin, d.shark ? SHARK_SPIN : DUCK_SPIN, dt);
    // a duck with a shark on its tail mashes the button for splash boosts (a quick human tap)
    if (!d.shark && hold && b.flee && b.close && b.t > 0.2 && b.pump <= 0 && d.boostCd <= 0 && rng() < 0.35 * b.skill) {
      b.pump = rng.range(0.05, 0.09);
    }
    if (b.pump > 0) {
      b.pump -= dt;
      hold = false;
    }
    return hold;
  }

  function timeUp(ctx) {
    const left = ducks(ctx);
    if (globalThis.__dbg) globalThis.__dbg.push('survivors=' + left.length + '/' + (ctx.active.length - originals.length) + ' ' + ctx.twist.id); // DEBUG
    return left.length ? left : originals.filter((p) => p.active);
  }

  // ----- drawing -----
  function render(g, ctx) {
    const t = now();
    ensureArt(g);
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      g.fillStyle = '#27b7e3';
      g.fillRect(POOL.x0, POOL.y0, PW, PH);
    }
    // moving light on the water
    g.save();
    draw.roundRectPath(g, POOL.x0, POOL.y0, PW, PH, 9);
    g.clip();
    if (causticPat) {
      const TS = 160;
      g.globalAlpha = 0.2;
      g.fillStyle = causticPat;
      let ox = (t * 11) % TS;
      let oy = (t * 7) % TS;
      g.translate(ox, oy);
      g.fillRect(POOL.x0 - ox, POOL.y0 - oy, PW, PH);
      g.translate(-ox, -oy);
      g.globalAlpha = 0.13;
      ox = (-t * 8) % TS;
      oy = (t * 13) % TS;
      g.translate(ox + 40, oy + 70);
      g.scale(1.3, 1.3);
      g.fillRect((POOL.x0 - ox - 40) / 1.3, (POOL.y0 - oy - 70) / 1.3, PW / 1.3 + 2, PH / 1.3 + 2);
    }
    g.restore();
    if (ctx.twist.id === 'whirlpool') drawWhirl(g, t);
    drawRipples(g, t);
    // soft shadows on the pool floor
    const alive = ctx.active.filter((p) => p.alive);
    g.fillStyle = 'rgba(8,60,110,0.22)';
    g.beginPath();
    for (const p of alive) {
      const d = p.data;
      const rx = d.shark ? d.r * 1.25 : d.r * 1.05;
      g.moveTo(d.x + 8 + rx, d.y + 12);
      g.ellipse(d.x + 8, d.y + 12, rx, d.r * 0.8, 0, 0, TAU);
    }
    for (const f of floaties) {
      g.moveTo(f.x + 8 + f.r, f.y + 12);
      g.arc(f.x + 8, f.y + 12, f.r, 0, TAU);
    }
    g.fill();
    for (const f of floaties) {
      if (f.kind === 'donut') drawDonut(g, f.x, f.y, f.r, f.rot);
      else drawBall(g, f.x, f.y, f.r, f.rot);
    }
    const inRound = ctx.phase !== 'lobby';
    // ducks under sharks
    for (const p of alive) {
      const d = p.data;
      if (d.shark) continue;
      if (d.boost > 0.3) draw.circle(g, d.x, d.y, d.r * (1.3 + d.boost * 0.4), 'rgba(255,255,255,0.25)');
      drawDuck(g, d.x, d.y, d.r, d.heading, p.color, t, d.bob);
    }
    for (const p of alive) {
      const d = p.data;
      if (!d.shark) continue;
      const e = (t - d.morph) / 0.5;
      let r = d.r;
      let flash = 0;
      if (e >= 0 && e < 1) {
        r *= 0.6 + 0.4 * ease.outBack(e);
        flash = 1 - e;
      }
      const waiting = d.boss && inRound && (ctx.phase === 'card' || ctx.phase === 'count' || (ctx.phase === 'play' && ctx.time < HEAD_START));
      if (waiting) {
        // head start countdown ring
        const left = ctx.phase === 'play' ? 1 - ctx.time / HEAD_START : 1;
        const pulse = 0.5 + 0.5 * Math.sin(t * 8);
        g.strokeStyle = 'rgba(255,70,90,0.3)';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(d.x, d.y, r * 1.6, 0, TAU);
        g.stroke();
        g.strokeStyle = `rgba(255,70,90,${0.7 + pulse * 0.3})`;
        g.beginPath();
        g.arc(d.x, d.y, r * 1.6, -Math.PI / 2, -Math.PI / 2 + TAU * left);
        g.stroke();
      }
      const sp = Math.hypot(d.vx, d.vy);
      drawShark(g, d.x, d.y, r, d.heading, p.color, t, { wag: 0.4 + Math.min(1, sp / 120), boss: d.boss, mouth: d.mouth, flash });
      if (waiting) draw.text(g, 'SHARK!', d.x, d.y + r * 1.6 + 18, { size: 16, color: '#ffffff', stroke: '#e0284a' });
    }
    // aim chevrons while spinning
    if (inRound && ctx.phase !== 'roundEnd' && ctx.phase !== 'matchEnd') {
      for (const p of alive) {
        const d = p.data;
        if (p.down || d.stun > 0) continue;
        const dist = d.r * (d.shark ? 1.55 : 1.45) + 10;
        const x = d.x + Math.cos(d.heading) * dist;
        const y = d.y + Math.sin(d.heading) * dist;
        g.save();
        g.translate(x, y);
        g.rotate(d.heading);
        g.beginPath();
        g.moveTo(7, 0);
        g.lineTo(-4, 6);
        g.lineTo(-1, 0);
        g.lineTo(-4, -6);
        g.closePath();
        g.lineJoin = 'round';
        g.lineWidth = 3;
        g.strokeStyle = '#ffffff';
        g.stroke();
        g.fillStyle = p.color;
        g.fill();
        g.restore();
      }
    }
    for (let i = chomps.length - 1; i >= 0; i--) {
      const c = chomps[i];
      const e = (t - c.t0) / 0.55;
      if (e >= 1) {
        chomps.splice(i, 1);
        continue;
      }
      drawJaws(g, c.x, c.y, c.a, e, c.color, 1.1 * c.s);
    }
    if (inRound) drawStatus(g, ctx);
  }

  function drawRipples(g, t) {
    g.lineWidth = 1.6;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const e = (t - r.t0) / r.life;
      if (e >= 1 || e < 0) {
        if (e >= 1) ripples.splice(i, 1);
        continue;
      }
      g.strokeStyle = `rgba(255,255,255,${(r.a * (1 - e)).toFixed(3)})`;
      g.beginPath();
      g.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * ease.outCubic(e), 0, TAU);
      g.stroke();
    }
  }

  function drawWhirl(g, t) {
    g.save();
    const grad = g.createRadialGradient(CX, CY, 4, CX, CY, WHIRL_R);
    grad.addColorStop(0, 'rgba(0,40,90,0.45)');
    grad.addColorStop(1, 'rgba(0,40,90,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(CX, CY, WHIRL_R, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      const a0 = t * 1.6 + (k * TAU) / 5;
      for (let i = 0; i <= 26; i++) {
        const f = i / 26;
        const rr = 12 + f * (WHIRL_R - 20);
        const a = a0 - f * 3.2;
        const x = CX + Math.cos(a) * rr;
        const y = CY + Math.sin(a) * rr;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
    draw.circle(g, CX, CY, 10, 'rgba(0,30,70,0.6)');
    g.restore();
  }

  function drawStatus(g, ctx) {
    const n = ducks(ctx).length;
    const str = n === 1 && ctx.active.length > 2 ? 'LAST DUCK!' : `${n} duck${n === 1 ? '' : 's'} left`;
    const w = 150;
    const x = W / 2 - w / 2;
    const y = H - 44;
    draw.roundRect(g, x, y, w, 30, 15, 'rgba(10,6,24,0.62)');
    draw.text(g, '🦆', x + 20, y + 16, { size: 15, shadow: false });
    draw.text(g, str, x + w / 2 + 10, y + 16, { size: 14, color: n === 1 ? '#ffd23f' : '#ffffff', shadow: false });
  }

  const __party = createParty(api, { // DEBUG
    roundsToWin: 3,
    roundTime: ROUND_TIME,
    lastStanding: false,
    twists: [
      'turbo',
      'giants',
      'tiny',
      'swap',
      'lights',
      'wobble',
      { id: 'frenzy', name: 'FEEDING FRENZY', desc: 'Two sharks from the start', emoji: '🦈' },
      { id: 'whirlpool', name: 'WHIRLPOOL', desc: 'The drain is open. Everyone gets swept around', emoji: '🌊' },
    ],
    setup,
    update,
    render,
    bot,
    timeUp,
    idle,
  });
  if (typeof window !== 'undefined' && window.__hr) { // DEBUG
    const u = __party.update; const rd = __party.render; window.__logic = []; window.__rend = [];
    __party.update = (dt) => { const a = window.__hr(); const ph0 = __party.party.phase; u(dt); const el = window.__hr() - a; window.__logic.push(el); if (el > 2) console.log('SPIKE', el.toFixed(1), 't', api.totalTime.toFixed(2), ph0, '->', __party.party.phase); };
    __party.render = (g) => { const a = window.__hr(); rd(g); window.__rend.push(window.__hr() - a); };
  }
  return __party; // DEBUG
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = Math.min(w / 320, h / 240);
  g.save();
  g.scale(s, s);
  const VW = w / s;
  const VH = h / s;
  const water = g.createLinearGradient(0, 0, 0, VH);
  water.addColorStop(0, '#4fd6f0');
  water.addColorStop(1, '#1597d0');
  g.fillStyle = water;
  g.fillRect(0, 0, VW, VH);
  g.strokeStyle = 'rgba(255,255,255,0.1)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= VW; x += 16) {
    g.moveTo(x, 0);
    g.lineTo(x, VH);
  }
  for (let y = 0; y <= VH; y += 16) {
    g.moveTo(0, y);
    g.lineTo(VW, y);
  }
  g.stroke();
  g.fillStyle = 'rgba(10,80,140,0.35)';
  for (const x of [52, 160, 268]) g.fillRect(x - 3, 0, 6, VH);
  // lane ropes
  for (const x of [106, 214]) {
    for (let y = -4; y < VH + 8; y += 8) {
      const k = Math.floor(y / 8);
      draw.circle(g, x, y, 3.4, k % 6 < 2 ? '#ff4d5e' : k % 6 < 4 ? '#ffffff' : '#2f6fe0');
    }
  }
  // light caustic squiggles
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % VW;
    const y = (i * 53) % VH;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 10, y - 8, x + 20, y + 2);
    g.quadraticCurveTo(x + 28, y + 10, x + 38, y + 4);
    g.stroke();
  }
  const t = 0.4;
  const ring = (x, y, r, a) => {
    g.strokeStyle = `rgba(255,255,255,${a})`;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.stroke();
  };
  // wakes
  ring(92, 150, 30, 0.35);
  ring(70, 160, 42, 0.2);
  ring(236, 70, 22, 0.4);
  ring(262, 58, 32, 0.22);
  ring(250, 186, 20, 0.4);
  // shadows
  g.fillStyle = 'rgba(8,60,110,0.25)';
  for (const [x, y, rx, ry] of [
    [140, 138, 52, 30],
    [214, 124, 18, 13],
    [214, 58, 18, 13],
    [238, 190, 18, 13],
  ]) {
    g.beginPath();
    g.ellipse(x + 8, y + 12, rx, ry, 0, 0, TAU);
    g.fill();
  }
  drawDonut(g, 40, 60, 22, 0.4);
  drawBall(g, 290, 206, 15, 1.2);
  drawDuck(g, 222, 44, 17, -0.5, '#2fd9ff', t, 1);
  drawDuck(g, 246, 196, 17, 0.6, '#ffc93c', t, 2);
  // the lunge: speed lines, the shark with its jaws wide open, a very worried duck
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (const [x, y, l] of [
    [40, 150, 34],
    [30, 170, 44],
    [46, 190, 30],
  ]) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + l, y - l * 0.22);
    g.stroke();
  }
  g.lineCap = 'butt';
  drawShark(g, 126, 150, 34, -0.22, '#ff3d8b', t, { boss: true, mouth: 1 });
  drawDuck(g, 206, 118, 17, -2.6, '#7dff5a', t, 3);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const d = 26 + (i % 3) * 8;
    draw.circle(g, 204 + Math.cos(a) * d, 120 + Math.sin(a) * d * 0.85, 2 + (i % 2) * 1.4, 'rgba(255,255,255,0.9)');
  }
  // sweat drops
  g.fillStyle = '#ffffff';
  for (const [x, y, a] of [
    [228, 96, 0.5],
    [236, 110, 0.9],
  ]) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, -5);
    g.quadraticCurveTo(4, 1, 0, 3);
    g.quadraticCurveTo(-4, 1, 0, -5);
    g.fill();
    g.restore();
  }
  g.restore();
}
