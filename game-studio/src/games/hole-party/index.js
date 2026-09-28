// Hole Party - 1 to 4 players on one screen, one button each (engine/party.js).
//
// Every player is a hole in the ground of a tiny city block. While your button is up the
// arrow around your hole spins; hold it to glide that way. Props smaller than your hole
// tip over and sink into it, and you grow by the area you swallow. Grow 20% bigger than a
// rival and you can swallow that hole whole. After 40 seconds the biggest hole takes the
// crown (or the last hole left, if everyone else got eaten first).
//
// Everything that affects play (layout, traffic, walkers, bots) uses ctx.rng, so all-bot
// demo runs are reproducible. Cosmetic sparkle and dust use Math.random.
import { createParty } from '../engine/party.js';
import { ease } from '../engine/fx.js';
import * as draw from '../engine/draw.js';

const TAU = Math.PI * 2;
const W = 420;
const H = 740;

// ---------- tuning ----------
const SPIN = 2.75; // arrow spin (rad/s) while the button is up
const R0 = 16; // starting hole radius (x ctx.size)
const FIT = 0.86; // a prop fits when its radius is below this share of the hole radius
const GROW = 0.34; // share of an eaten prop's footprint the hole gains
const EAT_HOLE = 1.2; // a hole this much bigger swallows a smaller one
const MAX_R = 78;
const ROUND_TIME = 40;

// ---------- city layout ----------
const TOP = 98; // lower edge of the top rooftops
const BOT = 642; // upper edge of the bottom rooftops
const BOUNDS = { x0: 4, y0: TOP + 2, x1: W - 4, y1: BOT - 2 };
const RY = 370; // horizontal street center
const RX = 210; // vertical street center
const RH = 26; // street half width
const SW = 12; // sidewalk width
const BLOCKS = [
  { x0: 6, y0: RY + RH + SW, x1: RX - RH - SW, y1: BOT - SW }, // P1 bottom-left
  { x0: RX + RH + SW, y0: RY + RH + SW, x1: W - 6, y1: BOT - SW }, // P2 bottom-right
  { x0: RX + RH + SW, y0: TOP + SW, x1: W - 6, y1: RY - RH - SW }, // P3 top-right
  { x0: 6, y0: TOP + SW, x1: RX - RH - SW, y1: RY - RH - SW }, // P4 top-left
];
const LANE_E = RY - 13; // eastbound traffic
const LANE_W = RY + 13; // westbound traffic

const SHIRTS = ['#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#43a047', '#fb8c00', '#00acc1', '#f06292', '#5c6bc0'];
const HAIR = ['#3e2723', '#212121', '#6d4c41', '#f9a825', '#bf360c', '#9e9e9e'];
const SKIN = ['#f5cba7', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const CARS = ['#e53935', '#1e88e5', '#43a047', '#8e24aa', '#fafafa', '#ff7043', '#26c6da', '#37474f', '#ffb300'];
const GOLD = '#ffd23f';
const GOLD2 = '#e09a00';

// ---------- helpers ----------
function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return d;
}
// how far an arrow spinning in direction dir (1 = clockwise on screen) still has to turn
const spinGap = (from, to, dir) => ((((to - from) * dir) % TAU) + TAU) % TAU;
// seats spin mirror-wise (P1 and P3 clockwise, P2 and P4 counter-clockwise) so all four corners play the same
const seatSpin = (i) => (i === 0 || i === 2 ? 1 : -1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function rr(g, x, y, w, h, r, fill) {
  draw.roundRect(g, x, y, w, h, r, fill);
}

// ---------- prop catalog ----------
// r: fit radius (a hole must be bigger than r / FIT to swallow it); round / w,h: footprint
// used for shadows and for how much the hole grows; layer: draw order (flat, ground, people, tall).
const K = {
  flower: { r: 4, round: 4, layer: 0, draw: dFlower },
  duckling: { r: 3.4, round: 3, layer: 0, draw: dDuckling },
  chair: { r: 3.6, w: 6, h: 6, layer: 0, draw: dChair },
  fountain: { r: 28, round: 28, layer: 0, draw: dFountain, name: 'FOUNTAIN!!' },
  cone: { r: 4.6, round: 4.6, layer: 1, draw: dCone },
  hydrant: { r: 5, round: 4.8, layer: 1, draw: dHydrant },
  bin: { r: 5.8, round: 5.8, layer: 1, draw: dBin },
  mailbox: { r: 5, w: 9, h: 7, layer: 1, draw: dMailbox },
  ball: { r: 3.6, round: 3.6, layer: 1, draw: dBall },
  crate: { r: 6, w: 10, h: 10, layer: 1, draw: dCrate },
  bush: { r: 8.5, round: 8.5, layer: 1, draw: dBush },
  planter: { r: 7, round: 7, layer: 1, draw: dPlanter },
  bike: { r: 9.5, w: 19, h: 5, layer: 1, draw: dBike },
  bench: { r: 12, w: 24, h: 8, layer: 1, draw: dBench },
  seesaw: { r: 13, w: 26, h: 6, layer: 1, draw: dSeesaw },
  barrier: { r: 11, w: 22, h: 5, layer: 1, draw: dBarrier },
  dumpster: { r: 13.5, w: 26, h: 15, layer: 1, draw: dDumpster, name: 'DUMPSTER!' },
  slide: { r: 15, w: 30, h: 12, layer: 1, draw: dSlide, name: 'SLIDE!' },
  car: { r: 17, w: 34, h: 17, layer: 1, draw: dCar, name: 'CAR!' },
  van: { r: 20, w: 40, h: 19, layer: 1, draw: dVan, name: 'FOOD TRUCK!' },
  bus: { r: 34, w: 68, h: 20, layer: 1, draw: dBus, name: 'BUS!!!' },
  person: { r: 5, round: 4.4, layer: 2, draw: dPerson },
  lamp: { r: 4, round: 3.4, layer: 3, tall: true, draw: dLamp },
  umbrella: { r: 10.5, round: 10.5, layer: 3, tall: true, draw: dUmbrella },
  tree: { r: 15, round: 15, layer: 3, tall: true, draw: dTree, name: 'TREE!' },
};

function dFlower(g, q) {
  draw.circle(g, 0, 0, 4, q.gold ? GOLD2 : '#3f9b43');
  const c = q.gold ? GOLD : q.c;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + q.v * 3;
    draw.circle(g, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 1.5, c);
  }
  draw.circle(g, 0, 0, 1.1, '#fff3a0');
}
function dDuckling(g, q) {
  g.fillStyle = q.gold ? GOLD : '#ffe14d';
  g.beginPath();
  g.ellipse(0, 0, 3.4, 2.5, 0, 0, TAU);
  g.fill();
  draw.circle(g, 2.6, 0, 1.7, q.gold ? GOLD : '#ffe96e');
  draw.circle(g, 4.2, 0, 0.8, '#ff8f00');
}
function dChair(g, q) {
  rr(g, -2.8, -2.8, 5.6, 5.6, 1.2, q.gold ? GOLD : q.c);
  g.fillStyle = q.gold ? GOLD2 : q.c2;
  g.fillRect(-3, -2.8, 1.6, 5.6);
}
function dFountain(g, q, t) {
  draw.circle(g, 0, 0, 28, q.gold ? GOLD2 : '#b8c2cf');
  draw.circle(g, 0, 0, 26.5, q.gold ? GOLD : '#dde3ea');
  const wg = g.createRadialGradient(-6, -6, 2, 0, 0, 24);
  wg.addColorStop(0, '#9be3ff');
  wg.addColorStop(1, '#2fa6dc');
  draw.circle(g, 0, 0, 23, wg);
  g.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1;
    g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - k)})`;
    g.beginPath();
    g.arc(0, 0, 8 + k * 14, 0, TAU);
    g.stroke();
  }
  draw.circle(g, 0, 0, 7.5, q.gold ? GOLD2 : '#c3ccd8');
  draw.circle(g, 0, 0, 6, q.gold ? GOLD : '#eef2f6');
  draw.circle(g, 0, 0, 3.4, '#7fd6ff');
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 1.5;
    const d = 3 + ((t * 9 + i * 1.7) % 5);
    g.fillRect(Math.cos(a) * d - 0.7, Math.sin(a) * d - 0.7, 1.4, 1.4);
  }
}
function dCone(g, q) {
  rr(g, -4.8, -4.8, 9.6, 9.6, 2.2, q.gold ? GOLD2 : '#d9531a');
  draw.circle(g, 0, 0, 3.8, q.gold ? GOLD : '#ff7b22');
  g.strokeStyle = '#fff';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, 0, 2.4, 0, TAU);
  g.stroke();
  draw.circle(g, 0, 0, 1, '#ffd2ad');
}
function dHydrant(g, q) {
  g.fillStyle = q.gold ? GOLD2 : '#a61d1d';
  g.fillRect(-6.2, -1.6, 12.4, 3.2);
  draw.circle(g, 0, 0, 4.6, q.gold ? GOLD : '#e0302f');
  draw.circle(g, 0, 0, 2.7, q.gold ? GOLD2 : '#b3201f');
  draw.circle(g, -1.1, -1.1, 1.1, 'rgba(255,255,255,0.65)');
}
function dBin(g, q) {
  draw.circle(g, 0, 0, 5.8, q.gold ? GOLD2 : q.c2);
  draw.circle(g, 0, 0, 4.5, q.gold ? GOLD : q.c);
  g.strokeStyle = q.gold ? GOLD2 : q.c2;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-3, -1.3);
  g.lineTo(3, -1.3);
  g.moveTo(-3, 1.3);
  g.lineTo(3, 1.3);
  g.stroke();
  draw.circle(g, -1.8, -1.8, 1.2, 'rgba(255,255,255,0.35)');
}
function dMailbox(g, q) {
  rr(g, -4.5, -3.5, 9, 7, 2, q.gold ? GOLD2 : '#1d4fb8');
  rr(g, -4.5, -3.5, 9, 3.6, 2, q.gold ? GOLD : '#2f6fe0');
  g.fillStyle = '#0d2350';
  g.fillRect(-2.5, 0.8, 5, 1);
}
function dBall(g, q) {
  draw.circle(g, 0, 0, 3.6, q.gold ? GOLD : q.c);
  g.fillStyle = q.gold ? GOLD2 : '#ffffff';
  g.beginPath();
  g.moveTo(0, 0);
  g.arc(0, 0, 3.6, 0, 1.2);
  g.closePath();
  g.moveTo(0, 0);
  g.arc(0, 0, 3.6, 2.1, 3.3);
  g.closePath();
  g.moveTo(0, 0);
  g.arc(0, 0, 3.6, 4.2, 5.4);
  g.closePath();
  g.fill();
  draw.circle(g, -1, -1, 0.9, 'rgba(255,255,255,0.8)');
}
function dCrate(g, q) {
  rr(g, -5, -5, 10, 10, 1.2, q.gold ? GOLD2 : '#a8743f');
  rr(g, -4, -4, 8, 8, 0.8, q.gold ? GOLD : '#c99456');
  g.strokeStyle = q.gold ? GOLD2 : '#9a6a36';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(-4, -1.3);
  g.lineTo(4, -1.3);
  g.moveTo(-4, 1.3);
  g.lineTo(4, 1.3);
  g.stroke();
  // produce
  draw.circle(g, -1.8, 0, 1.3, q.c);
  draw.circle(g, 1.2, -0.4, 1.3, q.c);
  draw.circle(g, 0.3, 1.6, 1.2, q.c2);
}
function dBush(g, q) {
  const dark = q.gold ? GOLD2 : '#2f8a3a';
  const mid = q.gold ? GOLD : '#45a94a';
  const light = q.gold ? '#fff0a8' : '#6fc85f';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + q.v * 6;
    draw.circle(g, Math.cos(a) * 4, Math.sin(a) * 4, 4.8, dark);
  }
  draw.circle(g, 0, 0, 5.8, mid);
  draw.circle(g, -2.2, -2.2, 3.2, light);
  draw.circle(g, 2.4, 1.6, 1.8, mid);
  if (q.var === 1) {
    g.fillStyle = '#ff6f91';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + q.v * 9;
      g.fillRect(Math.cos(a) * 4.3 - 0.9, Math.sin(a) * 4.3 - 0.9, 1.8, 1.8);
    }
  }
}
function dPlanter(g, q) {
  draw.circle(g, 0, 0, 7, q.gold ? GOLD2 : '#b8683a');
  draw.circle(g, 0, 0, 5.6, '#5b3f2a');
  const leaf = q.gold ? GOLD : '#4caf50';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + q.v * 5;
    draw.circle(g, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 2.6, leaf);
  }
  draw.circle(g, 0, 0, 1.6, q.c);
}
function dBike(g, q) {
  g.lineCap = 'round';
  g.strokeStyle = '#1f1f27';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(-9.2, 0);
  g.lineTo(-3.8, 0);
  g.moveTo(3.8, 0);
  g.lineTo(9.2, 0);
  g.stroke();
  g.strokeStyle = q.gold ? GOLD : q.c;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-6, 0);
  g.lineTo(6, 0);
  g.stroke();
  g.strokeStyle = '#3d3d48';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(5.4, -3.4);
  g.lineTo(5.4, 3.4);
  g.stroke();
  g.fillStyle = '#26262e';
  g.beginPath();
  g.ellipse(-3.2, 0, 2, 1.3, 0, 0, TAU);
  g.fill();
  g.lineCap = 'butt';
}
function dBench(g, q) {
  g.fillStyle = '#34343f';
  g.fillRect(-12, -4.6, 2.6, 9.2);
  g.fillRect(9.4, -4.6, 2.6, 9.2);
  rr(g, -11.4, -3.6, 22.8, 7.4, 1.4, q.gold ? GOLD : q.c);
  g.fillStyle = q.gold ? GOLD2 : q.c2;
  g.fillRect(-11.4, -4.4, 22.8, 1.8);
  g.fillRect(-11.4, 0.2, 22.8, 0.8);
  g.fillRect(-11.4, 2.4, 22.8, 0.8);
}
function dSeesaw(g, q) {
  rr(g, -13, -2.3, 26, 4.6, 2, q.gold ? GOLD : q.c);
  draw.circle(g, 0, 0, 2.8, '#50505c');
  g.fillStyle = q.gold ? GOLD2 : q.c2;
  g.fillRect(-12, -3.2, 3, 6.4);
  g.fillRect(9, -3.2, 3, 6.4);
}
function dBarrier(g, q) {
  g.fillStyle = '#3a3a44';
  g.fillRect(-11, -3.4, 3, 6.8);
  g.fillRect(8, -3.4, 3, 6.8);
  rr(g, -11, -2.5, 22, 5, 1.2, '#ffffff');
  g.save();
  g.beginPath();
  g.rect(-11, -2.5, 22, 5);
  g.clip();
  g.fillStyle = q.gold ? GOLD2 : '#e53935';
  for (let x = -14; x < 12; x += 6) {
    g.beginPath();
    g.moveTo(x, 2.5);
    g.lineTo(x + 3, 2.5);
    g.lineTo(x + 6, -2.5);
    g.lineTo(x + 3, -2.5);
    g.fill();
  }
  g.restore();
}
function dDumpster(g, q) {
  rr(g, -13, -7.5, 26, 15, 2.2, q.gold ? GOLD2 : '#1f5e43');
  rr(g, -12, -6.5, 11.4, 13, 1.6, q.gold ? GOLD : '#2e7d5b');
  rr(g, 0.6, -6.5, 11.4, 13, 1.6, q.gold ? GOLD : '#2e7d5b');
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(-11, -5.5, 9.4, 2);
  g.fillRect(1.6, -5.5, 9.4, 2);
  g.fillStyle = '#16402e';
  g.fillRect(-13.8, -3, 1.6, 6);
  g.fillRect(12.2, -3, 1.6, 6);
}
function dSlide(g, q) {
  rr(g, -15, -6, 10, 12, 1.6, q.gold ? GOLD2 : '#6d4c41');
  g.fillStyle = '#d7ccc8';
  for (let i = 0; i < 3; i++) g.fillRect(-14, -4.5 + i * 3.6, 8, 1.1);
  rr(g, -6, -4.6, 21, 9.2, 4, q.gold ? GOLD : q.c);
  rr(g, -4, -2.6, 17, 5.2, 2.6, q.gold ? '#fff0a8' : q.c2);
}
function dCar(g, q) {
  const body = q.gold ? GOLD : q.c;
  rr(g, -17, -8.5, 34, 17, 5, q.gold ? GOLD2 : q.c2);
  rr(g, -16.2, -7.8, 32.4, 15.6, 4.6, body);
  // windshields
  rr(g, 3.2, -6.4, 6.4, 12.8, 2, '#23344d');
  rr(g, -12.6, -6, 4.6, 12, 1.8, '#23344d');
  g.fillStyle = 'rgba(160,210,255,0.35)';
  g.fillRect(4.2, -5.4, 2, 10.8);
  // roof
  rr(g, -8.4, -6.4, 11.2, 12.8, 2.4, q.roof || body);
  if (q.var === 1) {
    // taxi sign
    rr(g, -4.6, -2.6, 5.2, 5.2, 1, '#222');
    rr(g, -4, -2, 4, 4, 0.8, '#fff59d');
  }
  // lights
  g.fillStyle = '#fff6c4';
  g.fillRect(15.4, -6.6, 1.6, 3.2);
  g.fillRect(15.4, 3.4, 1.6, 3.2);
  g.fillStyle = '#ff5252';
  g.fillRect(-17, -6.4, 1.4, 3);
  g.fillRect(-17, 3.4, 1.4, 3);
  // mirrors
  g.fillStyle = q.gold ? GOLD2 : q.c2;
  g.fillRect(2.4, -9.8, 2.2, 1.6);
  g.fillRect(2.4, 8.2, 2.2, 1.6);
}
function dVan(g, q) {
  rr(g, -20, -9.5, 40, 19, 3.6, q.gold ? GOLD2 : '#c9ccd6');
  rr(g, -19.2, -8.8, 38.4, 17.6, 3.2, q.gold ? GOLD : '#f5f5f7');
  rr(g, 10.5, -7.6, 6, 15.2, 2, '#23344d');
  rr(g, 14.6, -8.2, 4, 16.4, 1.6, q.gold ? GOLD2 : '#e0e0e6');
  // striped awning on the roof
  g.save();
  g.beginPath();
  g.rect(-17, -7.6, 25, 15.2);
  g.clip();
  for (let i = 0; i < 7; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : q.gold ? GOLD2 : q.c;
    g.fillRect(-17 + i * 3.6, -7.6, 3.6, 15.2);
  }
  g.restore();
  draw.circle(g, -4.5, 0, 3.2, q.gold ? GOLD2 : '#ffca28');
  draw.circle(g, -4.5, 0, 1.6, '#ff7043');
}
function dBus(g, q) {
  rr(g, -34, -10, 68, 20, 4.6, q.gold ? GOLD2 : q.c2);
  rr(g, -33.2, -9.2, 66.4, 18.4, 4.2, q.gold ? GOLD : q.c);
  rr(g, 29.2, -8.4, 3.8, 16.8, 1.6, '#23344d');
  rr(g, -31, -7, 58, 14, 3, q.gold ? '#fff0a8' : '#f1f3f6');
  g.fillStyle = '#9fb3c8';
  for (let i = 0; i < 5; i++) g.fillRect(-28 + i * 10.6, -5.4, 6.4, 10.8);
  rr(g, -9, -4.6, 14, 9.2, 1.6, '#c7ced8');
  draw.circle(g, -5, 0, 2.6, '#8e99a8');
  draw.circle(g, 1, 0, 2.6, '#8e99a8');
  g.fillStyle = '#ff5252';
  g.fillRect(-34, -7, 1.4, 3);
  g.fillRect(-34, 4, 1.4, 3);
}
function dPerson(g, q) {
  const sw = Math.sin(q.walk || 0) * 1.7;
  const skin = q.skin || '#f5cba7';
  draw.circle(g, sw, -2, 1.3, '#2b2b36');
  draw.circle(g, -sw, 2, 1.3, '#2b2b36');
  g.fillStyle = q.gold ? GOLD : q.c;
  g.beginPath();
  g.ellipse(0, 0, 2.9, 4.6, 0, 0, TAU);
  g.fill();
  draw.circle(g, -sw * 0.6, -4.3, 1.2, skin);
  draw.circle(g, sw * 0.6, 4.3, 1.2, skin);
  draw.circle(g, 0.3, 0, 2.7, skin);
  g.fillStyle = q.gold ? GOLD2 : q.c2;
  g.beginPath();
  g.arc(0.3, 0, 2.75, Math.PI * 0.5, Math.PI * 1.5);
  g.fill();
}
function dLamp(g, q) {
  draw.circle(g, 0, 0, 3.6, q.gold ? GOLD2 : '#3d4454');
  draw.circle(g, 0, 0, 2.4, q.gold ? GOLD : '#fff3b8');
  draw.circle(g, -0.6, -0.6, 0.9, '#ffffff');
}
function dUmbrella(g, q) {
  const n = 8;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : q.gold ? GOLD : q.c;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 10.5, (i / n) * TAU, ((i + 1) / n) * TAU);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 0.8;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5);
  }
  g.stroke();
  draw.circle(g, 0, 0, 1.6, '#5d4037');
}
function dTree(g, q) {
  const pal = q.gold
    ? [GOLD2, GOLD, '#fff0a8']
    : q.var === 2
      ? ['#d9608c', '#f48fb1', '#ffd1e0']
      : q.var === 1
        ? ['#1f6b3a', '#2e8b4a', '#4fae62']
        : ['#2f7d3a', '#46a349', '#74c95e'];
  if (q.var === 1 && !q.gold) {
    // pine: layered stars
    for (let k = 0; k < 3; k++) {
      const r = 15 - k * 4.4;
      g.fillStyle = pal[Math.min(2, k)];
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + q.v * 4 + k * 0.3;
        const d = i % 2 ? r * 0.72 : r;
        if (i) g.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        else g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      g.closePath();
      g.fill();
    }
    draw.circle(g, 0, 0, 1.8, '#6d4c41');
    return;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + q.v * 5;
    draw.circle(g, Math.cos(a) * 8, Math.sin(a) * 8, 7.4, pal[0]);
  }
  draw.circle(g, 0, 0, 11.6, pal[1]);
  draw.circle(g, -3.6, -3.8, 6.4, pal[2]);
  draw.circle(g, 4.4, 2.6, 3.8, pal[1]);
  draw.circle(g, -5.6, -5.4, 2.2, 'rgba(255,255,255,0.35)');
}

// ---------- hole drawing (shared by the game and the cover) ----------
function drawHole(g, x, y, r, color, t, sinks) {
  // ground darkening around the lip
  draw.circle(g, x + 1.5, y + 2.5, r + 4, 'rgba(18,10,34,0.2)');
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.clip();
  // inner wall (seen at the top), then the pit
  const wall = g.createLinearGradient(0, y - r, 0, y + r * 0.4);
  wall.addColorStop(0, '#4a3a5e');
  wall.addColorStop(1, '#170f24');
  g.fillStyle = wall;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  const pit = g.createRadialGradient(x, y + r * 0.22, r * 0.05, x, y + r * 0.16, r * 1.02);
  pit.addColorStop(0, '#000000');
  pit.addColorStop(0.72, '#07030e');
  pit.addColorStop(1, '#1e1430');
  g.fillStyle = pit;
  g.beginPath();
  g.arc(x, y + r * 0.16, r * 0.97, 0, TAU);
  g.fill();
  // lazy swirl
  g.strokeStyle = draw.rgba(color, 0.16);
  g.lineWidth = Math.max(1.5, r * 0.07);
  for (let i = 0; i < 3; i++) {
    const a = t * 1.3 + (i * TAU) / 3;
    g.beginPath();
    g.arc(x, y + r * 0.14, r * (0.35 + i * 0.17), a, a + 1.4);
    g.stroke();
  }
  if (sinks) {
    for (const sk of sinks) {
      const e = (t - sk.t0) / sk.dur;
      if (e < 0 || e >= 1) continue;
      const f = ease.inQuad(e);
      const q = sk.q;
      g.save();
      g.globalAlpha = 1 - f * 0.9;
      g.translate(x + sk.dx * (1 - f), y + sk.dy * (1 - f) + f * r * 0.22);
      g.rotate(q.a + sk.spin * f * 1.8);
      const s = q.s * (1 - 0.62 * f);
      g.scale(s, s);
      K[q.k].draw(g, q, t);
      g.restore();
    }
  }
  // lip shadow so things look like they drop under the rim
  const lip = g.createRadialGradient(x, y, r * 0.55, x, y, r);
  lip.addColorStop(0, 'rgba(0,0,0,0)');
  lip.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = lip;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
  // rim
  g.save();
  g.shadowColor = color;
  g.shadowBlur = 10;
  g.strokeStyle = color;
  g.lineWidth = 3.4 + r * 0.05;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(x, y, r + 1.6 + r * 0.02, Math.PI * 1.05, Math.PI * 1.7);
  g.stroke();
}

function drawArrow(g, x, y, r, a, color, held, t, dir = 1) {
  if (!held) {
    g.save();
    g.strokeStyle = draw.rgba(color, 0.4);
    g.lineWidth = 2;
    g.setLineDash([2, 6]);
    g.lineDashOffset = -t * 20 * dir;
    g.beginPath();
    g.arc(x, y, r + 13, 0, TAU);
    g.stroke();
    g.restore();
  }
  const d = r + (held ? 17 : 13);
  g.save();
  g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d);
  g.rotate(a);
  const s = held ? 1.2 : 1;
  g.scale(s, s);
  g.beginPath();
  g.moveTo(10, 0);
  g.lineTo(-5, 8);
  g.lineTo(-1.5, 0);
  g.lineTo(-5, -8);
  g.closePath();
  g.lineJoin = 'round';
  g.lineWidth = 4;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function drawCrown(g, x, y, s) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(-10, 6);
  g.lineTo(-11, -5);
  g.lineTo(-5, 0);
  g.lineTo(0, -8);
  g.lineTo(5, 0);
  g.lineTo(11, -5);
  g.lineTo(10, 6);
  g.closePath();
  g.lineJoin = 'round';
  g.lineWidth = 3;
  g.strokeStyle = '#6b4300';
  g.stroke();
  g.fillStyle = GOLD;
  g.fill();
  g.fillStyle = '#fff6c8';
  g.fillRect(-8, 2.5, 16, 2);
  draw.circle(g, 0, -8, 1.8, '#ff3d8b');
  g.restore();
}

// ---------- scenery painting (pre-rendered once per round) ----------
function paintStreets(g, rnd) {
  // sidewalks everywhere, then streets on top
  g.fillStyle = '#d9d3c7';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(150,140,125,0.35)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= W; x += 24) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 24) {
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
  }
  g.stroke();
  // asphalt
  g.fillStyle = '#4b505e';
  g.fillRect(0, RY - RH, W, RH * 2);
  g.fillRect(RX - RH, TOP, RH * 2, BOT - TOP);
  for (let i = 0; i < 900; i++) {
    const vert = i % 3 === 0;
    const x = vert ? RX - RH + rnd() * RH * 2 : rnd() * W;
    const y = vert ? TOP + rnd() * (BOT - TOP) : RY - RH + rnd() * RH * 2;
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    g.fillRect(x, y, 1.6, 1.6);
  }
  // curbs
  g.fillStyle = '#b5ab9b';
  g.fillRect(0, RY - RH - 2, RX - RH, 2);
  g.fillRect(RX + RH, RY - RH - 2, W - RX - RH, 2);
  g.fillRect(0, RY + RH, RX - RH, 2);
  g.fillRect(RX + RH, RY + RH, W - RX - RH, 2);
  g.fillRect(RX - RH - 2, TOP, 2, RY - RH - TOP);
  g.fillRect(RX + RH, TOP, 2, RY - RH - TOP);
  g.fillRect(RX - RH - 2, RY + RH, 2, BOT - RY - RH);
  g.fillRect(RX + RH, RY + RH, 2, BOT - RY - RH);
  // lane markings: dashed center of the main street, parking bays on the side street
  g.fillStyle = '#f6c945';
  for (let x = 6; x < W; x += 30) {
    if (x > RX - RH - 34 && x < RX + RH + 16) continue;
    g.fillRect(x, RY - 1.5, 16, 3);
  }
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let y = TOP + 10; y < BOT - 10; y += 26) {
    if (y > RY - RH - 40 && y < RY + RH + 26) continue;
    g.fillRect(RX - 1, y, 2, 13);
  }
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (const y0 of [TOP + 5, RY + RH + 31]) {
    for (let k = 0; k <= 5; k++) {
      const y = y0 + k * 42;
      if (y > BOT - 4) break;
      g.fillRect(RX - RH + 2, y, 12, 1.6);
      g.fillRect(RX + RH - 14, y, 12, 1.6);
    }
  }
  // crosswalks
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let x = RX - RH + 4; x < RX + RH - 4; x += 9) {
    g.fillRect(x, RY - RH - 28, 5, 22);
    g.fillRect(x, RY + RH + 6, 5, 22);
  }
  for (let y = RY - RH + 4; y < RY + RH - 4; y += 9) {
    g.fillRect(RX - RH - 28, y, 22, 5);
    g.fillRect(RX + RH + 6, y, 22, 5);
  }
  // manhole
  draw.circle(g, RX + 10, RY - 8, 7, '#3c404c');
  g.strokeStyle = '#5c6170';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(RX + 10, RY - 8, 5, 0, TAU);
  g.moveTo(RX + 5, RY - 8);
  g.lineTo(RX + 15, RY - 8);
  g.stroke();
}

function blockMap(bi) {
  const b = BLOCKS[bi];
  const left = bi === 0 || bi === 3;
  const bottom = bi === 0 || bi === 1;
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  return {
    b,
    w,
    h,
    // u: 0 = screen edge side, 1 = side street; v: 0 = rooftop side, 1 = main street
    x: (u) => (left ? b.x0 + u * w : b.x1 - u * w),
    y: (v) => (bottom ? b.y1 - v * h : b.y0 + v * h),
    a: (a) => {
      let r = a;
      if (!left) r = Math.PI - r;
      if (!bottom) r = -r;
      return r;
    },
  };
}

function paintBlock(g, bi, theme, rnd) {
  const m = blockMap(bi);
  const { b } = m;
  g.save();
  g.beginPath();
  g.rect(b.x0, b.y0, m.w, m.h);
  g.clip();
  if (theme === 'park' || theme === 'playground') {
    g.fillStyle = '#7fcf5f';
    g.fillRect(b.x0, b.y0, m.w, m.h);
    g.fillStyle = '#76c657';
    for (let x = b.x0; x < b.x1; x += 28) g.fillRect(x, b.y0, 14, m.h);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(40,110,30,0.25)' : 'rgba(210,255,170,0.25)';
      g.fillRect(b.x0 + rnd() * m.w, b.y0 + rnd() * m.h, 1.6, 3);
    }
  }
  if (theme === 'park') {
    // winding path and a pond
    g.strokeStyle = '#d9c28e';
    g.lineWidth = 17;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(m.x(-0.1), m.y(0.52));
    g.bezierCurveTo(m.x(0.3), m.y(0.7), m.x(0.6), m.y(0.4), m.x(1.1), m.y(0.6));
    g.stroke();
    g.strokeStyle = '#ead7a8';
    g.lineWidth = 12;
    g.stroke();
    const px = m.x(0.2);
    const py = m.y(0.84);
    g.fillStyle = '#3f9ccc';
    g.beginPath();
    g.ellipse(px, py, 30, 22, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#5ec3ee';
    g.beginPath();
    g.ellipse(px, py, 27, 19, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(px - 6, py - 5, 12, 6, -0.2, Math.PI * 1.1, Math.PI * 1.7);
    g.stroke();
    g.fillStyle = '#3b8f3b';
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU;
      g.fillRect(px + Math.cos(a) * 30 - 1, py + Math.sin(a) * 22 - 3, 2, 6);
    }
  } else if (theme === 'playground') {
    // soft rubber mat and a sandbox
    const x0 = Math.min(m.x(0.08), m.x(0.62));
    const y0 = Math.min(m.y(0.55), m.y(0.97));
    draw.roundRect(g, x0, y0, m.w * 0.54, m.h * 0.42, 14, '#ee9460');
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 70; i++) g.fillRect(x0 + rnd() * m.w * 0.54, y0 + rnd() * m.h * 0.42, 2, 2);
    const sx = Math.min(m.x(0.68), m.x(0.96));
    const sy = Math.min(m.y(0.06), m.y(0.24));
    draw.roundRect(g, sx - 3, sy - 3, m.w * 0.28 + 6, m.h * 0.18 + 6, 5, '#b98a52');
    draw.roundRect(g, sx, sy, m.w * 0.28, m.h * 0.18, 3, '#f3dc9c');
    g.fillStyle = 'rgba(160,120,60,0.25)';
    for (let i = 0; i < 30; i++) g.fillRect(sx + rnd() * m.w * 0.28, sy + rnd() * m.h * 0.18, 1.5, 1.5);
    // hopscotch
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.5;
    const hx = m.x(0.86);
    const hy = m.y(0.62);
    for (let i = 0; i < 4; i++) g.strokeRect(hx - 6, hy - 30 + i * 13, 12, 12);
  } else if (theme === 'parking') {
    g.fillStyle = '#5a5f6c';
    g.fillRect(b.x0, b.y0, m.w, m.h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      g.fillRect(b.x0 + rnd() * m.w, b.y0 + rnd() * m.h, 1.6, 1.6);
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [v0, v1] of [
      [0.02, 0.2],
      [0.64, 0.82],
    ]) {
      for (let k = 0; k <= 5; k++) {
        const x = m.x(0.02 + k * 0.17);
        g.fillRect(x - 1, Math.min(m.y(v0), m.y(v1)), 2, m.h * (v1 - v0));
      }
    }
    // painted arrows in the aisle
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const u of [0.25, 0.7]) {
      const x = m.x(u);
      const y = m.y(0.42);
      g.beginPath();
      g.moveTo(x - 8, y - 3);
      g.lineTo(x + 4, y - 3);
      g.lineTo(x + 4, y - 7);
      g.lineTo(x + 11, y);
      g.lineTo(x + 4, y + 7);
      g.lineTo(x + 4, y + 3);
      g.lineTo(x - 8, y + 3);
      g.fill();
    }
  } else if (theme === 'plaza') {
    g.fillStyle = '#eadbbd';
    g.fillRect(b.x0, b.y0, m.w, m.h);
    g.strokeStyle = 'rgba(170,140,95,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = b.x0 - m.h; x < b.x1; x += 14) {
      g.moveTo(x, b.y0);
      g.lineTo(x + m.h, b.y1);
      g.moveTo(x + m.h, b.y0);
      g.lineTo(x, b.y1);
    }
    g.stroke();
    const fx0 = m.x(0.6);
    const fy0 = m.y(0.66);
    for (let i = 3; i >= 1; i--) draw.circle(g, fx0, fy0, 30 + i * 9, i % 2 ? '#e2cfa8' : '#f1e5cc');
  }
  // block edge
  g.restore();
  g.strokeStyle = theme === 'parking' ? '#9e978a' : 'rgba(120,110,95,0.5)';
  g.lineWidth = 2;
  g.strokeRect(b.x0 + 1, b.y0 + 1, m.w - 2, m.h - 2);
}

function paintRoofs(g, rnd) {
  const pal = ['#7c6aa0', '#5f7f97', '#a97a69', '#6e8f74', '#8f7ba6', '#c09a5b'];
  for (const [y0, y1] of [
    [0, TOP],
    [BOT, H],
  ]) {
    let x = 0;
    let k = Math.floor(rnd() * pal.length);
    while (x < W) {
      const w = Math.min(W - x, 110 + Math.floor(rnd() * 70));
      const c = pal[k++ % pal.length];
      g.fillStyle = draw.shade(c, -0.35);
      g.fillRect(x, y0, w, y1 - y0);
      g.fillStyle = c;
      g.fillRect(x + 5, y0 + 5, w - 10, y1 - y0 - 10);
      g.fillStyle = draw.shade(c, 0.12);
      g.fillRect(x + 5, y0 + 5, w - 10, 3);
      // roof details
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const dx = x + 14 + rnd() * Math.max(10, w - 40);
        const dy = y0 + 14 + rnd() * (y1 - y0 - 40);
        const kind = rnd();
        if (kind < 0.35) {
          draw.roundRect(g, dx + 2, dy + 3, 22, 16, 2, 'rgba(0,0,0,0.2)');
          draw.roundRect(g, dx, dy, 22, 16, 2, '#dfe3ea');
          draw.circle(g, dx + 11, dy + 8, 5, '#9aa3b2');
          draw.circle(g, dx + 11, dy + 8, 1.6, '#dfe3ea');
        } else if (kind < 0.6) {
          draw.roundRect(g, dx, dy, 26, 14, 2, '#3b5b7a');
          g.strokeStyle = 'rgba(160,210,255,0.45)';
          g.lineWidth = 1;
          g.strokeRect(dx + 2.5, dy + 2.5, 21, 9);
          g.beginPath();
          g.moveTo(dx + 13, dy + 2);
          g.lineTo(dx + 13, dy + 12);
          g.stroke();
        } else if (kind < 0.8) {
          draw.circle(g, dx + 13, dy + 13, 12, 'rgba(0,0,0,0.2)');
          draw.circle(g, dx + 11, dy + 11, 11, '#9c6b43');
          g.strokeStyle = '#7b5232';
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(dx + 11, dy + 11, 7, 0, TAU);
          g.stroke();
        } else {
          draw.circle(g, dx + 5, dy + 5, 4, '#b6bdc9');
          draw.circle(g, dx + 5, dy + 5, 2, '#6d7483');
        }
      }
      x += w;
    }
  }
  // soft shadow the top buildings cast onto the sidewalk
  const sh = g.createLinearGradient(0, TOP, 0, TOP + 10);
  sh.addColorStop(0, 'rgba(20,16,40,0.3)');
  sh.addColorStop(1, 'rgba(20,16,40,0)');
  g.fillStyle = sh;
  g.fillRect(0, TOP, W, 10);
}

// ---------- the game ----------
export default function createGame(api) {
  const { rng, sfx, fx } = api;
  const now = () => api.totalTime;

  let props = [];
  let gulps = [];
  let themes = ['park', 'parking', 'plaza', 'playground'];
  let ground = null;
  let roofs = null;
  let tick = -1;
  let dustT = 0;
  let bgSeed = 1;
  let bgDirty = true;

  const hasDom = typeof document !== 'undefined';

  function canvas2x() {
    const c = document.createElement('canvas');
    c.width = W * 2;
    c.height = H * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    return [c, g];
  }

  function paintBackground() {
    bgDirty = false;
    if (!hasDom) return;
    let seed = bgSeed;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const [gc, gg] = ground ? [ground, ground.getContext('2d')] : canvas2x();
    gg.setTransform(2, 0, 0, 2, 0, 0);
    paintStreets(gg, rnd);
    for (let bi = 0; bi < 4; bi++) paintBlock(gg, bi, themes[bi], rnd);
    ground = gc;
    const [rc, rg] = roofs ? [roofs, roofs.getContext('2d')] : canvas2x();
    rg.setTransform(2, 0, 0, 2, 0, 0);
    rg.clearRect(0, 0, W, H);
    paintRoofs(rg, rnd);
    roofs = rc;
  }

  // ----- props -----
  function mk(kind, x, y, a = 0, s = 1) {
    const k = K[kind];
    const q = {
      k: kind,
      x,
      y,
      a,
      s,
      r: k.r * s,
      area: (k.round ? Math.PI * k.round * k.round : k.w * k.h) * s * s,
      c: '#e53935',
      c2: '#b71c1c',
      gold: false,
      lean: 0,
      lt: 0,
      la: 0,
      wob: 0,
      v: rng(),
      var: 0,
      mv: null,
      dead: false,
    };
    if (kind === 'person') {
      q.c = rng.pick(SHIRTS);
      q.c2 = rng.pick(HAIR);
      q.skin = rng.pick(SKIN);
      q.walk = rng() * TAU;
    } else if (kind === 'car') {
      q.c = rng.pick(CARS);
      if (q.c === '#ffb300') q.var = 1;
      q.c2 = draw.shade(q.c, -0.3);
      q.roof = draw.shade(q.c, 0.22);
    } else if (kind === 'bus') {
      q.c = rng.pick(['#ffc934', '#e53935', '#1e88e5']);
      q.c2 = draw.shade(q.c, -0.3);
    } else if (kind === 'bench') {
      q.c = '#c0874d';
      q.c2 = '#8a5a30';
    } else if (kind === 'bin') {
      q.c = rng.chance(0.5) ? '#3aa56b' : '#8b95a7';
      q.c2 = draw.shade(q.c, -0.35);
    } else if (kind === 'umbrella' || kind === 'ball' || kind === 'flower' || kind === 'chair' || kind === 'bike') {
      q.c = rng.pick(['#ff5d73', '#29b6f6', '#ffca28', '#ab47bc', '#66bb6a', '#ff7043']);
      q.c2 = draw.shade(q.c, -0.3);
    } else if (kind === 'slide' || kind === 'seesaw') {
      q.c = rng.pick(['#ff5252', '#42a5f5', '#ffca28']);
      q.c2 = draw.shade(q.c, 0.35);
    } else if (kind === 'crate' || kind === 'planter') {
      q.c = rng.pick(['#ff5252', '#ffa726', '#9ccc65', '#ec407a']);
      q.c2 = '#7cb342';
    } else if (kind === 'tree') {
      q.var = rng() < 0.2 ? 2 : rng() < 0.3 ? 1 : 0;
    } else if (kind === 'bush') {
      q.var = rng() < 0.3 ? 1 : 0;
    }
    return q;
  }

  // placement grid: keeps the no-overlap checks cheap while a city is being built
  const CELL = 40;
  const GW = Math.ceil((W + 200) / CELL);
  let grid = new Map();
  const cellOf = (x, y) => Math.floor((y + 100) / CELL) * GW + Math.floor((x + 100) / CELL);

  function fits(q, list, pad = 3) {
    const reach = q.r + 34 + pad;
    const cx0 = Math.floor((q.x - reach + 100) / CELL);
    const cx1 = Math.floor((q.x + reach + 100) / CELL);
    const cy0 = Math.floor((q.y - reach + 100) / CELL);
    const cy1 = Math.floor((q.y + reach + 100) / CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = grid.get(cy * GW + cx);
        if (!cell) continue;
        for (const o of cell) {
          const d = q.r + o.r + pad;
          const dx = q.x - o.x;
          const dy = q.y - o.y;
          if (dx * dx + dy * dy < d * d) return false;
        }
      }
    }
    return true;
  }

  function place(list, q) {
    list.push(q);
    const k = cellOf(q.x, q.y);
    const cell = grid.get(k);
    if (cell) cell.push(q);
    else grid.set(k, [q]);
  }

  function add(list, q) {
    if (fits(q, list)) place(list, q);
    return q;
  }

  function scatter(list, bi, kind, n, opts = {}) {
    const m = blockMap(bi);
    const [u0, u1] = opts.u || [0.05, 0.95];
    const [v0, v1] = opts.v || [0.05, 0.95];
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 14; tries++) {
        const s = opts.s ? rng.range(opts.s[0], opts.s[1]) : 1;
        const q = mk(kind, m.x(rng.range(u0, u1)), m.y(rng.range(v0, v1)), rng() * TAU, s);
        if (fits(q, list, opts.pad ?? 3)) {
          place(list, q);
          if (opts.walk) walker(q, m.b);
          break;
        }
      }
    }
  }

  function walker(q, zone) {
    q.mv = { type: 'walk', zone, tx: q.x, ty: q.y, sp: rng.range(13, 22), wait: rng.range(0, 1.5), scare: 0, vx: 0, vy: 0 };
  }

  function driver(q, dir, speed) {
    q.mv = { type: 'drive', dir, sp: speed };
    q.a = dir > 0 ? 0 : Math.PI;
  }

  function fillBlock(list, bi, theme) {
    const m = blockMap(bi);
    const P = (kind, u, v, a = 0, s = 1) => add(list, mk(kind, m.x(u), m.y(v), m.a(a), s));
    if (theme === 'park') {
      P('tree', 0.12, 0.12, 0, rng.range(0.9, 1.1));
      P('tree', 0.88, 0.14, 0, rng.range(0.85, 1.05));
      P('tree', 0.72, 0.88, 0, rng.range(0.9, 1.1));
      P('tree', 0.5, 0.86, 0, rng.range(0.8, 0.95));
      P('bench', 0.36, 0.49, 0.25);
      P('bench', 0.8, 0.44, -0.1);
      P('lamp', 0.56, 0.52);
      P('bin', 0.63, 0.5);
      for (let i = 0; i < 3; i++) P('duckling', 0.16 + i * 0.07, 0.8 + (i % 2) * 0.08, rng() * TAU);
      scatter(list, bi, 'bush', 5, { s: [0.8, 1.2], u: [0.05, 0.95], v: [0.08, 0.95] });
      scatter(list, bi, 'flower', 7, { u: [0.6, 0.97], v: [0.1, 0.35] });
      scatter(list, bi, 'flower', 3, { u: [0.05, 0.3], v: [0.3, 0.45] });
      scatter(list, bi, 'person', 2, { v: [0.4, 0.62], walk: true });
    } else if (theme === 'parking') {
      for (let k = 0; k < 5; k++) {
        const u = 0.02 + k * 0.17 + 0.085;
        if (rng() < 0.72) P('car', u, 0.11, Math.PI / 2 + (rng() - 0.5) * 0.08);
        if (k === 2 && rng() < 0.6) P('van', u, 0.73, -Math.PI / 2);
        else if (rng() < 0.62) P('car', u, 0.73, -Math.PI / 2 + (rng() - 0.5) * 0.08);
      }
      P('dumpster', 0.9, 0.93, 0);
      P('bin', 0.08, 0.92);
      P('bin', 0.16, 0.93);
      scatter(list, bi, 'cone', 4, { v: [0.3, 0.55] });
      scatter(list, bi, 'person', 2, { v: [0.3, 0.55], walk: true });
      scatter(list, bi, 'crate', 2, { u: [0.05, 0.4], v: [0.88, 0.97] });
    } else if (theme === 'plaza') {
      P('fountain', 0.6, 0.66);
      P('umbrella', 0.16, 0.2);
      P('chair', 0.16 - 0.09, 0.2);
      P('chair', 0.16 + 0.09, 0.2);
      P('umbrella', 0.86, 0.3);
      P('chair', 0.86, 0.3 - 0.07);
      P('chair', 0.86, 0.3 + 0.07);
      for (let i = 0; i < 3; i++) P('bike', 0.08, 0.62 + i * 0.08, 0);
      P('planter', 0.25, 0.94);
      P('planter', 0.95, 0.94);
      P('planter', 0.95, 0.52);
      P('bench', 0.28, 0.48, Math.PI / 2);
      P('hydrant', 0.44, 0.08);
      P('lamp', 0.3, 0.76);
      scatter(list, bi, 'person', 3, { v: [0.3, 0.95], walk: true });
      scatter(list, bi, 'crate', 2, { u: [0.4, 0.7], v: [0.05, 0.14] });
      scatter(list, bi, 'flower', 3, { u: [0.1, 0.9], v: [0.42, 0.5] });
    } else {
      P('slide', 0.22, 0.72, 0.4);
      P('seesaw', 0.48, 0.9, -0.2);
      P('tree', 0.1, 0.12, 0, rng.range(0.9, 1.05));
      P('tree', 0.93, 0.88, 0, rng.range(0.85, 1));
      P('bench', 0.8, 0.46, 0);
      P('bench', 0.94, 0.6, Math.PI / 2);
      P('bin', 0.66, 0.46);
      scatter(list, bi, 'ball', 5, { u: [0.1, 0.6], v: [0.58, 0.96] });
      scatter(list, bi, 'bush', 4, { s: [0.75, 1.05], v: [0.05, 0.5] });
      scatter(list, bi, 'person', 3, { v: [0.4, 0.95], walk: true, s: [0.78, 0.82] });
      scatter(list, bi, 'flower', 3, { u: [0.3, 0.6], v: [0.05, 0.2] });
    }
  }

  function fillStreets(list, twist) {
    // sidewalk furniture along the main street and the side street
    const walkKinds = ['hydrant', 'lamp', 'bin', 'mailbox', 'bike', 'cone', 'person', 'person', null, null];
    const strips = [
      { horiz: true, y: RY - RH - SW / 2 - 1, from: 10, to: RX - RH - SW - 6 },
      { horiz: true, y: RY - RH - SW / 2 - 1, from: RX + RH + SW + 6, to: W - 10 },
      { horiz: true, y: RY + RH + SW / 2 + 1, from: 10, to: RX - RH - SW - 6 },
      { horiz: true, y: RY + RH + SW / 2 + 1, from: RX + RH + SW + 6, to: W - 10 },
      { horiz: false, x: RX - RH - SW / 2 - 1, from: TOP + 16, to: RY - RH - SW - 6 },
      { horiz: false, x: RX + RH + SW / 2 + 1, from: TOP + 16, to: RY - RH - SW - 6 },
      { horiz: false, x: RX - RH - SW / 2 - 1, from: RY + RH + SW + 6, to: BOT - 16 },
      { horiz: false, x: RX + RH + SW / 2 + 1, from: RY + RH + SW + 6, to: BOT - 16 },
      { horiz: true, y: TOP + SW / 2 + 1, from: 16, to: W - 16 },
      { horiz: true, y: BOT - SW / 2 - 1, from: 16, to: W - 16 },
    ];
    for (const s of strips) {
      for (let d = s.from + rng.range(0, 12); d < s.to; d += rng.range(22, 34)) {
        const kind = rng.pick(walkKinds);
        if (!kind) continue;
        const x = s.horiz ? d : s.x;
        const y = s.horiz ? s.y : d;
        const q = mk(kind, x, y, s.horiz ? 0 : Math.PI / 2);
        if (kind === 'person') {
          q.a = rng() * TAU;
          if (!fits(q, list)) continue;
          place(list, q);
          walker(q, s.horiz ? { x0: s.from - 6, x1: s.to + 6, y0: s.y - 4, y1: s.y + 4 } : { x0: s.x - 4, x1: s.x + 4, y0: s.from - 6, y1: s.to + 6 });
        } else add(list, q);
      }
    }
    // parked cars along the side street
    for (const [x, a] of [
      [RX - RH + 11, -Math.PI / 2],
      [RX + RH - 11, Math.PI / 2],
    ]) {
      for (const y0 of [TOP + 26, RY + RH + 52]) {
        for (let k = 0; k < 5; k++) {
          const y = y0 + k * 42;
          if (y > BOT - 20) break;
          if (rng() < 0.62) add(list, mk('car', x, y, a + (rng() - 0.5) * 0.05));
        }
      }
    }
    // a little roadworks corner
    const cx = rng.pick([RX - RH - 34, RX + RH + 34]);
    const cy = rng.pick([RY - RH - 36, RY + RH + 36]);
    add(list, mk('barrier', cx, cy, rng.pick([0, Math.PI / 2])));
    for (let i = 0; i < 3; i++) add(list, mk('cone', cx + rng.range(-16, 16), cy + rng.range(-14, 14)));
    // traffic on the main street
    const rush = twist === 'rushhour';
    // which side of the street drives which way is a coin flip, so no corner is favored
    const flip = rng() < 0.5 ? -1 : 1;
    for (const [lane, dir] of [
      [LANE_E, flip],
      [LANE_W, -flip],
    ]) {
      const n = rush ? 6 : 3;
      const speed = rush ? rng.range(80, 95) : rng.range(46, 60);
      const span = W + 140;
      const off = rng() * span;
      const busAt = dir < 0 ? 0 : -1;
      for (let i = 0; i < n; i++) {
        const kind = i === busAt ? 'bus' : rush && i === 3 ? 'van' : 'car';
        const x = -70 + ((off + (i * span) / n) % span);
        const q = mk(kind, x, lane, 0);
        driver(q, dir, speed);
        place(list, q);
      }
    }
  }

  function spawnPoint(i) {
    const m = blockMap(i);
    return { x: m.x(0.47), y: m.y(0.3) };
  }

  function buildCity(ctx) {
    const list = [];
    grid = new Map();
    fillStreets(list, ctx.twist.id);
    for (let bi = 0; bi < 4; bi++) fillBlock(list, bi, themes[bi]);
    // keep every spawn point clear
    const clearR = R0 * ctx.size + 10;
    const spawns = [0, 1, 2, 3].map(spawnPoint);
    const out = list.filter((q) => q.mv || spawns.every((s) => Math.hypot(q.x - s.x, q.y - s.y) > clearR + q.r));
    if (ctx.twist.id === 'goldrush') {
      for (const q of out) if (rng() < 0.3) q.gold = true;
    }
    out.sort((a, b) => K[a.k].layer - K[b.k].layer || a.y - b.y);
    return out;
  }

  // ----- round setup -----
  function setup(ctx) {
    themes = rng.shuffle(['park', 'parking', 'plaza', 'playground']);
    props = buildCity(ctx);
    gulps = [];
    tick = -1;
    bgSeed = 1 + Math.floor(rng() * 1e6);
    bgDirty = true; // painted on the next render, so the round setup frame stays cheap
    const r0 = R0 * ctx.size;
    for (const p of ctx.active) {
      const s = spawnPoint(p.i);
      const heading = Math.atan2(RY - s.y, RX - s.x) + rng.range(-0.4, 0.4);
      p.data = {
        x: s.x,
        y: s.y,
        vx: 0,
        vy: 0,
        r: r0,
        rT: r0,
        area: Math.PI * r0 * r0,
        heading,
        spin: seatSpin(p.i),
        pulse: 0,
        sinks: [],
        combo: 0,
        comboT: 0,
        bumpT: 0,
        bot: null,
      };
      p.x = s.x;
      p.y = s.y;
    }
  }

  const holeSpeed = (h, size) => 128 * (1 - 0.3 * clamp((h.r - R0 * size) / 55, 0, 1));

  // ----- movers (walkers and traffic) -----
  // rand: the gameplay rng during a round, Math.random for the lobby scenery.
  function updateMovers(dt, holes, rand = rng) {
    for (const q of props) {
      const m = q.mv;
      if (!m) continue;
      if (m.type === 'drive') {
        q.x += m.dir * m.sp * dt;
        if (m.dir > 0 && q.x > W + 70) q.x -= W + 140;
        else if (m.dir < 0 && q.x < -70) q.x += W + 140;
        continue;
      }
      let px = 0;
      let py = 0;
      let panic = false;
      for (const h of holes) {
        if (q.r >= h.r * FIT) continue;
        const dx = q.x - h.x;
        const dy = q.y - h.y;
        const R = h.r + 48;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const w = (R - d) / R;
          px += (dx / d) * w;
          py += (dy / d) * w;
          panic = true;
        }
      }
      let tvx = 0;
      let tvy = 0;
      if (panic) {
        const l = Math.hypot(px, py) || 1;
        tvx = (px / l) * 58;
        tvy = (py / l) * 58;
        m.scare = 0.5;
      } else {
        m.scare = Math.max(0, m.scare - dt);
        const dx = m.tx - q.x;
        const dy = m.ty - q.y;
        const d = Math.hypot(dx, dy);
        if (d < 3) {
          m.wait -= dt;
          if (m.wait <= 0) {
            m.tx = m.zone.x0 + 4 + rand() * (m.zone.x1 - m.zone.x0 - 8);
            m.ty = m.zone.y0 + 4 + rand() * (m.zone.y1 - m.zone.y0 - 8);
            m.wait = 0.3 + rand() * 1.9;
          }
        } else {
          tvx = (dx / d) * m.sp;
          tvy = (dy / d) * m.sp;
        }
      }
      const k = Math.min(1, dt * 7);
      m.vx += (tvx - m.vx) * k;
      m.vy += (tvy - m.vy) * k;
      q.x = clamp(q.x + m.vx * dt, m.zone.x0 - 6, m.zone.x1 + 6);
      q.y = clamp(q.y + m.vy * dt, m.zone.y0 - 6, m.zone.y1 + 6);
      const sp = Math.hypot(m.vx, m.vy);
      if (sp > 4) {
        q.a = Math.atan2(m.vy, m.vx);
        q.walk += sp * dt * 0.45;
      }
    }
  }

  // ----- eating -----
  function playEat(p, q) {
    const human = p.human && !api.demo;
    const vol = human ? 1 : 0.28;
    const f = 900 - Math.min(q.r, 34) * 18;
    sfx.tone({ freq: f, to: f * 0.45, type: 'sine', dur: 0.1 + q.r * 0.006, vol: 0.16 * vol });
    if (q.r >= 12) {
      sfx.noise({ dur: 0.16, vol: 0.14 * vol, freq: 500, to: 120 });
      sfx.tone({ freq: 140, to: 55, type: 'triangle', dur: 0.22, vol: 0.18 * vol });
    }
    if (q.gold) sfx.tone({ freq: 1320, to: 1760, type: 'square', dur: 0.08, vol: 0.05 * vol, delay: 0.04 });
    if (human && p.data.combo > 2) sfx.combo(Math.min(12, p.data.combo - 2), 620);
  }

  function eat(p, q, idx) {
    const h = p.data;
    props.splice(idx, 1);
    q.dead = true;
    h.area = Math.min(h.area + q.area * GROW * (q.gold ? 3 : 1), Math.PI * MAX_R * MAX_R);
    h.rT = Math.sqrt(h.area / Math.PI);
    h.sinks.push({ q, dx: q.x - h.x, dy: q.y - h.y, t0: now(), dur: 0.42 + q.r * 0.012, spin: Math.random() < 0.5 ? -1 : 1 });
    h.pulse = Math.min(1, h.pulse + 0.2 + q.r * 0.025);
    h.combo = h.comboT > 0 ? h.combo + 1 : 1;
    h.comboT = 0.7;
    fx.burst(q.x, q.y, {
      count: 4 + Math.round(q.r * 0.6),
      colors: q.gold ? [GOLD, '#fff6c8'] : ['#cfc6b6', '#ffffff', q.c],
      speed: 50 + q.r * 5,
      gravity: 0,
      drag: 0.9,
      life: 0.35,
      size: 2.4,
    });
    if (q.gold) fx.text(q.x, q.y - 8, 'x3', { color: GOLD, size: 16, life: 0.6, rise: 30 });
    const name = K[q.k].name;
    if (name) {
      fx.text(clamp(q.x, 50, W - 50), Math.max(TOP + 16, q.y - 12), name, { color: p.color, size: 14 + Math.min(10, q.r * 0.35), stroke: 'rgba(16,8,31,0.8)', life: 0.8 });
      fx.ring(h.x, h.y, { color: p.color, radius: h.r * 1.5, life: 0.35, width: 3 });
      fx.shake(1.5 + q.r * 0.1, 0.16);
      if (p.human) api.haptic(12);
    }
    playEat(p, q);
  }

  function swallow(ctx, bigP, smallP) {
    const big = bigP.data;
    const small = smallP.data;
    gulps.push({ x: small.x, y: small.y, r: small.r, color: smallP.color, eater: big, t0: now() });
    ctx.eliminate(smallP, { x: small.x, y: small.y });
    big.area = Math.min(big.area + small.area * 0.85, Math.PI * MAX_R * MAX_R);
    big.rT = Math.sqrt(big.area / Math.PI);
    big.pulse = 1;
    fx.text(clamp(big.x, 60, W - 60), Math.max(TOP + 20, big.y - big.r - 14), 'GULP!', { color: bigP.color, size: 32, stroke: 'rgba(16,8,31,0.85)', life: 1 });
    fx.ring(big.x, big.y, { color: bigP.color, radius: big.r * 2.2, life: 0.5, width: 6 });
    fx.shake(12, 0.4);
    sfx.tone({ freq: 520, to: 70, type: 'sawtooth', dur: 0.45, vol: 0.1 });
    if (bigP.human) api.haptic(30);
  }

  // ----- per frame -----
  function update(dt, ctx) {
    const alive = ctx.alive();
    const holes = alive.map((p) => p.data);
    const B = BOUNDS;
    for (const p of alive) {
      const h = p.data;
      if (!p.down) h.heading = (h.heading + SPIN * h.spin * dt) % TAU;
      if (p.down) {
        const sp = holeSpeed(h, ctx.size);
        const k = Math.min(1, dt * 7);
        h.vx += (Math.cos(h.heading) * sp - h.vx) * k;
        h.vy += (Math.sin(h.heading) * sp - h.vy) * k;
      } else {
        const k = Math.exp(-dt * 3.4);
        h.vx *= k;
        h.vy *= k;
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      const m = h.r * 0.7;
      const my = Math.max(m, h.r - 6); // never slide under the rooftops
      if (h.x < B.x0 + m) {
        h.x = B.x0 + m;
        if (h.vx < 0) h.vx *= -0.25;
      } else if (h.x > B.x1 - m) {
        h.x = B.x1 - m;
        if (h.vx > 0) h.vx *= -0.25;
      }
      if (h.y < B.y0 + my) {
        h.y = B.y0 + my;
        if (h.vy < 0) h.vy *= -0.25;
      } else if (h.y > B.y1 - my) {
        h.y = B.y1 - my;
        if (h.vy > 0) h.vy *= -0.25;
      }
      h.r += (h.rT - h.r) * Math.min(1, dt * 6);
      h.pulse = Math.max(0, h.pulse - dt * 2.5);
      h.comboT -= dt;
      h.bumpT -= dt;
      if (h.sinks.length && now() - h.sinks[0].t0 > 1.4) h.sinks = h.sinks.filter((s) => now() - s.t0 < s.dur);
      p.x = h.x;
      p.y = h.y;
    }

    // holes against holes: bump when close in size, swallow when 20% bigger
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const A = alive[i];
        const Bp = alive[j];
        if (!A.alive || !Bp.alive) continue;
        const a = A.data;
        const b = Bp.data;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const [bigP, smallP] = a.r >= b.r ? [A, Bp] : [Bp, A];
        const big = bigP.data;
        const small = smallP.data;
        if (big.r >= small.r * EAT_HOLE) {
          if (d < big.r - small.r * 0.5) swallow(ctx, bigP, smallP);
          else if (d < big.r + small.r * 0.5) {
            // the rim of a bigger hole pulls smaller ones in
            const ux = (big.x - small.x) / d;
            const uy = (big.y - small.y) / d;
            small.vx += ux * 40 * dt;
            small.vy += uy * 40 * dt;
          }
        } else if (d < a.r + b.r) {
          const nx = dx / d;
          const ny = dy / d;
          const push = (a.r + b.r - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vrel < 0) {
            const j2 = -vrel * 0.85;
            a.vx -= nx * j2;
            a.vy -= ny * j2;
            b.vx += nx * j2;
            b.vy += ny * j2;
            if (-vrel > 50 && a.bumpT <= 0 && b.bumpT <= 0) {
              a.bumpT = b.bumpT = 0.25;
              const cx = a.x + nx * a.r;
              const cy = a.y + ny * a.r;
              fx.burst(cx, cy, { count: 10, colors: [A.color, Bp.color, '#ffffff'], speed: 160, gravity: 0, life: 0.3, size: 3, shape: 'spark' });
              fx.shake(3, 0.12);
              if ((A.human || Bp.human) && !api.demo) sfx.play('hit');
              else sfx.noise({ dur: 0.1, vol: 0.06, freq: 900, to: 200 });
            }
          }
          A.x = a.x;
          A.y = a.y;
          Bp.x = b.x;
          Bp.y = b.y;
        }
      }
    }

    updateMovers(dt, holes);

    // props: tip toward holes that fit them, swallow once the center is over the pit
    for (const q of props) {
      q.lt = 0;
      if (q.wob > 0) q.wob -= dt;
    }
    const byR = ctx.alive().sort((a, b) => b.data.r - a.data.r);
    for (const p of byR) {
      const h = p.data;
      const fit = h.r * FIT;
      for (let i = props.length - 1; i >= 0; i--) {
        const q = props[i];
        const dx = q.x - h.x;
        const dy = q.y - h.y;
        const edge = h.r + q.r;
        if (dx > edge || dx < -edge || dy > edge || dy < -edge) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > edge * edge) continue;
        if (q.r >= fit) {
          if (d2 < h.r * h.r * 0.8) q.wob = 0.15;
          continue;
        }
        const lim = h.r - q.r * 0.5;
        if (d2 < lim * lim) {
          eat(p, q, i);
          continue;
        }
        const d = Math.sqrt(d2);
        const tl = 1 - (d - lim) / (edge - lim);
        if (tl > q.lt) {
          q.lt = tl;
          q.la = Math.atan2(-dy, -dx);
        }
      }
    }
    for (const q of props) q.lean += (q.lt - q.lean) * Math.min(1, dt * 12);

    // dust trails behind gliding holes (cosmetic)
    dustT -= dt;
    if (dustT <= 0) {
      dustT = 0.07;
      for (const p of ctx.alive()) {
        const h = p.data;
        const sp = Math.hypot(h.vx, h.vy);
        if (sp < 60) continue;
        const bx = h.x - (h.vx / sp) * h.r;
        const by = h.y - (h.vy / sp) * h.r;
        fx.burst(bx, by, { count: 2, colors: ['rgba(255,255,255,0.7)', draw.rgba(p.color, 0.8)], speed: 30, gravity: 0, life: 0.35, size: 2.6 });
      }
    }

    // last five seconds tick
    const left = Math.ceil(ROUND_TIME - ctx.time);
    if (left <= 5 && left !== tick && left > 0) {
      tick = left;
      if (ctx.humans) sfx.tone({ freq: left === 1 ? 1100 : 880, type: 'square', dur: 0.07, vol: 0.06 });
    }
  }

  // party.js also calls idle between rounds, where only cosmetics may move (those run off
  // api.totalTime). The lobby city is pure scenery (every round rebuilds it), so it may roam.
  function idle(dt, ctx) {
    if (ctx.phase === 'lobby') updateMovers(dt, [], Math.random);
  }

  // ----- bots -----
  function newBrain() {
    return {
      hold: false,
      t: 0,
      think: rng.range(0, 0.15),
      want: 0,
      err: 0,
      go: false,
      target: null,
      tx: 0,
      ty: 0,
      skill: rng.range(0.72, 1),
      greed: rng.range(0.45, 0.9),
      minHold: 0.2,
      minRel: 0.1,
      relCw: rng.range(0.3, 0.42),
      relCcw: rng.range(0.9, 1.25),
      stuckT: 0,
      lx: 0,
      ly: 0,
    };
  }

  function steer(b, heading, dir, dt) {
    b.t += dt;
    const d = angDiff(b.want, heading) * dir; // > 0: the target is ahead of the spin (cheap to fix)
    if (b.hold) {
      const off = d > 0 ? d > b.relCw : -d > b.relCcw;
      if (!b.go || (b.t > b.minHold && off)) {
        b.hold = false;
        b.t = 0;
        b.minRel = rng.range(0.06, 0.2);
      }
    } else if (b.go && b.t > b.minRel) {
      const gap = spinGap(heading, b.want + b.err, dir);
      const win = SPIN * dt * 1.3 + 0.02;
      if (gap < win || gap > TAU - 0.02) {
        b.hold = true;
        b.t = 0;
        b.err = rng.range(-1, 1) * (0.04 + 0.22 * (1 - b.skill));
        b.minHold = rng.range(0.16, 0.32);
      }
    }
    return b.hold;
  }

  function plan(p, b, ctx) {
    const h = p.data;
    const me = h.r;
    const sp = holeSpeed(h, ctx.size);
    const others = ctx.alive().filter((o) => o !== p);
    // 1) run from anything that can swallow us
    let fx0 = 0;
    let fy0 = 0;
    let danger = 0;
    const threats = [];
    for (const o of others) {
      const oh = o.data;
      if (oh.r < me * EAT_HOLE * 0.97) continue;
      threats.push(oh);
      const d = Math.hypot(oh.x - h.x, oh.y - h.y) || 1;
      const reach = oh.r + me + 50 + 60 * b.skill;
      if (d < reach) {
        const w = (reach - d) / reach;
        fx0 += ((h.x - oh.x) / d) * w;
        fy0 += ((h.y - oh.y) / d) * w;
        danger = Math.max(danger, w);
      }
    }
    if (danger > 0.08) {
      const m = 70;
      const B = BOUNDS;
      if (h.x - B.x0 < m) fx0 += ((m - (h.x - B.x0)) / m) * 0.8;
      if (B.x1 - h.x < m) fx0 -= ((m - (B.x1 - h.x)) / m) * 0.8;
      if (h.y - B.y0 < m) fy0 += ((m - (h.y - B.y0)) / m) * 0.8;
      if (B.y1 - h.y < m) fy0 -= ((m - (B.y1 - h.y)) / m) * 0.8;
      b.want = Math.atan2(fy0, fx0);
      b.go = true;
      b.target = null;
      b.mode = 'flee';
      return;
    }
    b.mode = 'hunt';
    const turnCost = (ang) => {
      const onCourse = b.hold && Math.abs(angDiff(ang, h.heading)) < 0.3;
      return onCourse ? 0 : (spinGap(h.heading, ang, h.spin) / SPIN) * sp * 0.8;
    };
    let best = null;
    let bestS = 0;
    // 2) smaller holes are the juiciest snack
    for (const o of others) {
      const oh = o.data;
      if (me < oh.r * EAT_HOLE * 1.04) continue;
      const tx = oh.x + oh.vx * 0.45;
      const ty = oh.y + oh.vy * 0.45;
      const d = Math.hypot(tx - h.x, ty - h.y);
      if (d > 120 + 90 * b.skill) continue;
      const s = (oh.area * b.greed) / (d + turnCost(Math.atan2(ty - h.y, tx - h.x)) + 60);
      if (s > bestS) {
        bestS = s;
        best = { hole: oh, x: tx, y: ty };
      }
    }
    // 3) otherwise the richest reachable cluster of props that fit
    const fit = me * FIT;
    const edible = [];
    for (const q of props) {
      if (q.r >= fit) continue;
      if (q.x < BOUNDS.x0 || q.x > BOUNDS.x1) continue;
      let bad = false;
      for (const t of threats) {
        const dx = q.x - t.x;
        const dy = q.y - t.y;
        const R = t.r + me + 26;
        if (dx * dx + dy * dy < R * R) {
          bad = true;
          break;
        }
      }
      if (bad) continue;
      const dx = q.x - h.x;
      const dy = q.y - h.y;
      q.bd = Math.sqrt(dx * dx + dy * dy);
      q.bv = q.area * (q.gold ? 3 : 1);
      edible.push(q);
    }
    // score clusters around the most promising props only (keeps the worst frame cheap)
    let cands = edible;
    if (edible.length > 32) {
      for (const q of edible) q.bs = q.bv / (q.bd + 50);
      cands = edible.slice().sort((a, b) => b.bs - a.bs).slice(0, 32);
    }
    const R2 = (30 + me * 0.8) ** 2;
    for (const q of cands) {
      let v = 0;
      for (const o of edible) {
        const dx = o.x - q.x;
        const dy = o.y - q.y;
        if (dx * dx + dy * dy < R2) v += o.bv;
      }
      const s = v / (q.bd + turnCost(Math.atan2(q.y - h.y, q.x - h.x)) + 50);
      if (s > bestS) {
        bestS = s;
        best = { prop: q, x: q.x, y: q.y };
      }
    }
    if (!best) {
      b.target = null;
      b.tx = RX + rng.range(-120, 120);
      b.ty = RY + rng.range(-160, 160);
    } else {
      b.target = best;
      b.tx = best.x;
      b.ty = best.y;
    }
    b.go = true;
    b.want = Math.atan2(b.ty - h.y, b.tx - h.x);
  }

  function bot(p, dt, ctx) {
    const h = p.data;
    if (!h.bot) h.bot = newBrain();
    const b = h.bot;
    b.think -= dt;
    const t = b.target;
    if (t) {
      if (t.prop && t.prop.dead) b.think = Math.min(b.think, 0.05);
      else if (t.prop) {
        b.tx = t.prop.x;
        b.ty = t.prop.y;
      }
    }
    if (b.think <= 0) {
      plan(p, b, ctx);
      b.think = rng.range(0.22, 0.42) * (1.3 - b.skill * 0.3);
    } else if (b.mode !== 'flee') {
      const d = Math.hypot(b.tx - h.x, b.ty - h.y);
      if (d < h.r * 0.3) b.think = 0;
      else b.want = Math.atan2(b.ty - h.y, b.tx - h.x);
    }
    // unstick from walls
    if (b.hold) {
      b.stuckT += dt;
      if (b.stuckT > 0.5) {
        if (Math.hypot(h.x - b.lx, h.y - b.ly) < 8) {
          b.hold = false;
          b.t = 0;
          b.want += rng.range(0.8, 2.2);
          b.think = 0.6;
        }
        b.stuckT = 0;
        b.lx = h.x;
        b.ly = h.y;
      }
    }
    return steer(b, h.heading, h.spin, dt);
  }

  function timeUp(ctx) {
    const alive = ctx.alive();
    if (!alive.length) return null;
    const top = Math.max(...alive.map((p) => p.data.area));
    return alive.filter((p) => p.data.area >= top * 0.99);
  }

  // ----- drawing -----
  function render(g, ctx) {
    const t = now();
    if (bgDirty) paintBackground();
    if (ground) g.drawImage(ground, 0, 0, W, H);
    else {
      g.fillStyle = '#d9d3c7';
      g.fillRect(0, 0, W, H);
    }
    const alive = ctx.active.filter((p) => p.alive).sort((a, b) => b.data.r - a.data.r);
    for (const p of alive) {
      const h = p.data;
      drawHole(g, h.x, h.y, h.r * (1 + h.pulse * 0.07), p.color, t, h.sinks);
    }
    // swallowed holes spiral into their eater
    for (let i = gulps.length - 1; i >= 0; i--) {
      const gu = gulps[i];
      const e = (t - gu.t0) / 0.5;
      if (e >= 1) {
        gulps.splice(i, 1);
        continue;
      }
      const f = ease.inQuad(e);
      const x = gu.x + (gu.eater.x - gu.x) * f;
      const y = gu.y + (gu.eater.y - gu.y) * f;
      const r = gu.r * (1 - f * 0.9);
      g.save();
      g.globalAlpha = 1 - f;
      g.strokeStyle = gu.color;
      g.lineWidth = 4;
      g.setLineDash([r * 0.8, r * 0.5]);
      g.lineDashOffset = e * 60;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.stroke();
      g.restore();
    }
    drawProps(g, t);
    // arrows and the leader's crown sit on top of everything
    const inPlay = ctx.phase === 'play' || ctx.phase === 'count' || ctx.phase === 'card';
    if (inPlay) {
      for (const p of alive) {
        const h = p.data;
        drawArrow(g, h.x, h.y, h.r, h.heading, p.color, p.down, t, h.spin);
      }
    }
    if (alive.length > 1 && ctx.phase === 'play' && ctx.time > 1.6) {
      const lead = alive[0];
      if (lead.data.area > alive[1].data.area * 1.03) {
        const h = lead.data;
        drawCrown(g, h.x, h.y - h.r - 26 + Math.sin(t * 5) * 2, 0.9);
      }
    }
    if (roofs) g.drawImage(roofs, 0, 0, W, H);
  }

  function drawProps(g, t) {
    // one batched shadow pass, then the props (already sorted by layer)
    g.fillStyle = 'rgba(30,26,56,0.22)';
    g.beginPath();
    for (const q of props) {
      const k = K[q.k];
      const off = k.tall ? 4.5 : 2;
      const ox = q.x + off;
      const oy = q.y + off * 1.4;
      if (k.round) {
        const r = k.round * q.s;
        g.moveTo(ox + r, oy);
        g.arc(ox, oy, r, 0, TAU);
      } else {
        const c = Math.cos(q.a);
        const s = Math.sin(q.a);
        const hw = (k.w / 2) * q.s;
        const hh = (k.h / 2) * q.s;
        g.moveTo(ox + c * hw - s * hh, oy + s * hw + c * hh);
        g.lineTo(ox - c * hw - s * hh, oy - s * hw + c * hh);
        g.lineTo(ox - c * hw + s * hh, oy - s * hw - c * hh);
        g.lineTo(ox + c * hw + s * hh, oy + s * hw - c * hh);
        g.closePath();
      }
    }
    g.fill();
    for (const q of props) {
      if (!q.gold) continue;
      const pulse = 0.8 + 0.2 * Math.sin(t * 4 + q.v * 9);
      draw.circle(g, q.x, q.y, q.r * 1.25 * pulse + 3, 'rgba(255,210,63,0.28)');
    }
    for (const q of props) {
      let x = q.x;
      let y = q.y;
      let a = q.a;
      let s = q.s;
      if (q.lean > 0.02) {
        x += Math.cos(q.la) * q.lean * q.r * 0.4;
        y += Math.sin(q.la) * q.lean * q.r * 0.4;
        a += q.lean * 0.35;
        s *= 1 - q.lean * 0.12;
      }
      if (q.wob > 0) a += Math.sin(t * 36 + q.v * 10) * 0.1;
      g.save();
      g.translate(x, y);
      if (a) g.rotate(a);
      if (s !== 1) g.scale(s, s);
      K[q.k].draw(g, q, t);
      g.restore();
    }
    for (const q of props) {
      if (q.gold && Math.sin(t * 3 + q.v * 20) > 0.93) sparkle(g, q.x + q.r * 0.6, q.y - q.r * 0.6, 3.2);
      if (q.mv && q.mv.type === 'walk' && q.mv.scare > 0) {
        g.font = draw.font(11, 900);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 3;
        g.strokeStyle = '#c62828';
        g.strokeText('!', q.x, q.y - 10);
        g.fillStyle = '#ffffff';
        g.fillText('!', q.x, q.y - 10);
      }
    }
  }

  function sparkle(g, x, y, s) {
    g.fillStyle = '#fffbe0';
    g.beginPath();
    g.moveTo(x, y - s * 2);
    g.lineTo(x + s * 0.5, y - s * 0.5);
    g.lineTo(x + s * 2, y);
    g.lineTo(x + s * 0.5, y + s * 0.5);
    g.lineTo(x, y + s * 2);
    g.lineTo(x - s * 0.5, y + s * 0.5);
    g.lineTo(x - s * 2, y);
    g.lineTo(x - s * 0.5, y - s * 0.5);
    g.closePath();
    g.fill();
  }

  return createParty(api, {
    roundsToWin: 3,
    roundTime: ROUND_TIME,
    twists: [
      'turbo',
      'giants',
      'tiny',
      'swap',
      'lights',
      'wobble',
      { id: 'goldrush', name: 'GOLD RUSH', desc: 'Golden props are worth triple', emoji: '💰' },
      { id: 'rushhour', name: 'RUSH HOUR', desc: 'The main street is jammed with snacks on wheels', emoji: '🚗' },
    ],
    setup,
    update,
    render,
    bot,
    timeUp,
    idle,
  });
}

// ---------- cover art ----------
export function cover(g, w, h) {
  const s = Math.min(w / 320, h / 240);
  g.save();
  g.scale(s, s);
  const VW = w / s;
  const VH = h / s;
  // grass park on the left, a street across the bottom right
  g.fillStyle = '#7fcf5f';
  g.fillRect(0, 0, VW, VH);
  g.fillStyle = '#76c657';
  for (let x = 0; x < VW; x += 26) g.fillRect(x, 0, 13, VH);
  g.fillStyle = '#d9d3c7';
  g.fillRect(0, 150, VW, 14);
  g.fillStyle = '#4b505e';
  g.fillRect(0, 164, VW, VH - 164);
  g.fillStyle = '#f6c945';
  for (let x = 4; x < VW; x += 30) g.fillRect(x, 200, 16, 3);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let x = 236; x < 290; x += 9) g.fillRect(x, 170, 5, 60);
  g.strokeStyle = '#ead7a8';
  g.lineWidth = 12;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-10, 60);
  g.bezierCurveTo(80, 90, 150, 30, 330, 70);
  g.stroke();
  const P = (k, x, y, a = 0, sc = 1, extra = {}) => ({ k, x, y, a, s: sc, v: (x * 0.013 + y * 0.007) % 1, var: 0, c: '#e53935', c2: '#9a1c1c', ...extra });
  const t = 1.2;
  const drawQ = (q) => {
    g.save();
    g.translate(q.x, q.y);
    g.rotate(q.a);
    g.scale(q.s, q.s);
    K[q.k].draw(g, q, t);
    g.restore();
  };
  const shadow = (q, r) => draw.circle(g, q.x + 3, q.y + 4, r, 'rgba(30,26,56,0.22)');
  // the big pink hole mid-swallow
  const sinks = [
    { q: P('car', 0, 0, -0.5, 1, { c: '#1e88e5', c2: '#0d47a1', roof: '#64b5f6' }), dx: 10, dy: -6, t0: 1.0, dur: 0.6, spin: 1 },
    { q: P('person', 0, 0, 1, 1.2, { c: '#ffca28', c2: '#3e2723', skin: '#e0ac69' }), dx: -24, dy: 6, t0: 1.05, dur: 0.5, spin: -1 },
    { q: P('bush', 0, 0, 0, 1), dx: 16, dy: 18, t0: 1.05, dur: 0.5, spin: 1 },
    { q: P('cone', 0, 0, 0, 1.3), dx: -8, dy: 26, t0: 0.9, dur: 0.6, spin: 1 },
    { q: P('bin', 0, 0, 0, 1.2, { c: '#8b95a7', c2: '#5b6474' }), dx: -26, dy: -14, t0: 1.1, dur: 0.5, spin: -1 },
  ];
  drawHole(g, 118, 118, 52, '#ff3d8b', t, sinks);
  drawHole(g, 262, 92, 26, '#2fd9ff', t, null);
  const fixed = [
    P('tree', 30, 28, 0, 1.1),
    P('tree', 300, 20, 0, 1, { var: 2 }),
    P('bench', 200, 38, 0.2, 1, { c: '#c0874d', c2: '#8a5a30' }),
    P('bush', 196, 120, 0, 1),
    P('bush', 22, 132, 0, 0.9, { var: 1 }),
    P('flower', 60, 180 - 40, 0),
    P('hydrant', 170, 157, 0),
    P('bin', 30, 157, 0, 1, { c: '#3aa56b', c2: '#1f6b42' }),
    P('car', 70, 185, 0, 1.05, { c: '#ffb300', c2: '#b37d00', roof: '#ffd54f', var: 1 }),
    P('car', 300, 215, Math.PI, 1, { c: '#e53935', c2: '#9a1c1c', roof: '#ef7a78' }),
    P('bus', 190, 216, Math.PI, 1, { c: '#ffc934', c2: '#b38b12' }),
  ];
  for (const q of fixed) shadow(q, K[q.k].round ? K[q.k].round * q.s : 8);
  for (const q of fixed) drawQ(q);
  // gold props and panicking people
  const gold = [P('cone', 230, 130, 0, 1.2, { gold: true }), P('crate', 186, 146, 0.3, 1.2, { gold: true })];
  for (const q of gold) {
    draw.circle(g, q.x, q.y, 11, 'rgba(255,210,63,0.35)');
    drawQ(q);
  }
  const folks = [
    P('person', 186, 76, -0.4, 1.3, { c: '#8e24aa', c2: '#212121', skin: '#c68642', walk: 1 }),
    P('person', 60, 64, -2.6, 1.3, { c: '#43a047', c2: '#f9a825', skin: '#f5cba7', walk: 2.4 }),
  ];
  for (const q of folks) {
    drawQ(q);
    // a drawn exclamation mark (covers carry no text)
    draw.roundRect(g, q.x - 2.6, q.y - 22, 5.2, 10, 2.6, '#ffffff', '#c62828', 1.6);
    draw.circle(g, q.x, q.y - 8.5, 2.4, '#ffffff', '#c62828', 1.6);
  }
  // props tipping over the pink rim, with a puff of dust
  for (const q of [P('bench', 162, 88, 2.4, 1, { c: '#c0874d', c2: '#8a5a30' }), P('tree', 70, 76, 0.4, 0.85), P('hydrant', 66, 150, 0.8, 1.2)]) {
    shadow(q, 8);
    drawQ(q);
  }
  for (let i = 0; i < 12; i++) {
    const a = -2.4 + i * 0.22;
    draw.circle(g, 118 + Math.cos(a) * 62, 118 + Math.sin(a) * 62, 2 + (i % 3), 'rgba(255,255,255,0.75)');
  }
  drawArrow(g, 118, 118, 52, -0.35, '#ff3d8b', true, t);
  drawArrow(g, 262, 92, 26, 2.3, '#2fd9ff', false, t);
  drawCrown(g, 118, 50, 1.1);
  g.restore();
}
