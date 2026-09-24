// Vector playing cards: suits, faces (with geometric court-card art), backs and felt.
// Everything is drawn with Canvas 2D paths so it stays crisp at any size.
import { FONT } from '../engine/draw.js';

export const SUIT_NAMES = ['spades', 'hearts', 'clubs', 'diamonds'];
export const SUIT_CHARS = ['♠', '♥', '♣', '♦'];
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RED = '#d0233a';
export const BLACK = '#1b1f2e';
export const isRed = (suit) => (suit & 1) === 1;
export const suitColor = (suit) => (isRed(suit) ? RED : BLACK);

export function roundRectPath(g, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// Heart outline (normalised: ~1 wide, centred on 0,0).
function heartSub(g, flip) {
  const f = flip ? -1 : 1;
  g.moveTo(0, 0.472 * f);
  g.bezierCurveTo(0, 0.472 * f, -0.5, 0.139 * f, -0.5, -0.172 * f);
  g.bezierCurveTo(-0.5, -0.361 * f, -0.356, -0.472 * f, -0.222, -0.472 * f);
  g.bezierCurveTo(-0.111, -0.472 * f, -0.033, -0.406 * f, 0, -0.328 * f);
  g.bezierCurveTo(0.033, -0.406 * f, 0.111, -0.472 * f, 0.222, -0.472 * f);
  g.bezierCurveTo(0.356, -0.472 * f, 0.5, -0.361 * f, 0.5, -0.172 * f);
  g.bezierCurveTo(0.5, 0.139 * f, 0, 0.472 * f, 0, 0.472 * f);
  g.closePath();
}

function stemSub(g) {
  g.moveTo(0, 0.08);
  g.quadraticCurveTo(0.02, 0.36, 0.2, 0.5);
  g.lineTo(-0.2, 0.5);
  g.quadraticCurveTo(-0.02, 0.36, 0, 0.08);
  g.closePath();
}

/** Fill a suit symbol of size s (width) centred at x,y. */
export function drawSuit(g, suit, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = color || suitColor(suit);
  g.beginPath();
  if (suit === 1) {
    heartSub(g, false);
  } else if (suit === 3) {
    g.moveTo(0, -0.52);
    g.quadraticCurveTo(0.16, -0.2, 0.4, 0);
    g.quadraticCurveTo(0.16, 0.2, 0, 0.52);
    g.quadraticCurveTo(-0.16, 0.2, -0.4, 0);
    g.quadraticCurveTo(-0.16, -0.2, 0, -0.52);
    g.closePath();
  } else if (suit === 0) {
    g.save();
    g.translate(0, -0.08);
    g.scale(0.94, 0.9);
    heartSub(g, true);
    g.restore();
    stemSub(g);
  } else {
    g.arc(0, -0.25, 0.225, 0, Math.PI * 2);
    g.moveTo(-0.02, 0.07);
    g.arc(-0.245, 0.07, 0.225, 0, Math.PI * 2);
    g.moveTo(0.47, 0.07);
    g.arc(0.245, 0.07, 0.225, 0, Math.PI * 2);
    g.moveTo(0.14, -0.02);
    g.arc(0, -0.02, 0.14, 0, Math.PI * 2);
    stemSub(g);
  }
  g.fill();
  g.restore();
}

function crown(g, cx, top, w, h, kind, gem) {
  g.fillStyle = '#e9b634';
  g.strokeStyle = '#9a6b12';
  g.lineWidth = Math.max(0.6, w * 0.04);
  g.beginPath();
  const l = cx - w / 2;
  const r = cx + w / 2;
  const b = top + h;
  g.moveTo(l, b);
  if (kind === 'K') {
    g.lineTo(l, top + h * 0.25);
    g.lineTo(l + w * 0.25, top + h * 0.6);
    g.lineTo(cx, top);
    g.lineTo(r - w * 0.25, top + h * 0.6);
    g.lineTo(r, top + h * 0.25);
  } else {
    g.lineTo(l + w * 0.06, top + h * 0.35);
    g.quadraticCurveTo(l + w * 0.28, top + h * 0.75, cx, top + h * 0.2);
    g.quadraticCurveTo(r - w * 0.28, top + h * 0.75, r - w * 0.06, top + h * 0.35);
  }
  g.lineTo(r, b);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = gem;
  g.beginPath();
  g.arc(cx, top + h * 0.68, w * 0.09, 0, Math.PI * 2);
  g.fill();
  if (kind === 'Q') {
    g.fillStyle = '#fff4c7';
    for (const px of [l + w * 0.06, cx, r - w * 0.06]) {
      g.beginPath();
      g.arc(px, px === cx ? top + h * 0.18 : top + h * 0.32, w * 0.07, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** Geometric court-card portrait inside the rect (x,y,w,h). rank 11..13. */
function courtArt(g, rank, suit, x, y, w, h) {
  const red = isRed(suit);
  const robe = red ? '#c62f3e' : '#28375c';
  const robe2 = red ? '#f06b5e' : '#4f6fb3';
  const gold = '#e9b634';
  const skin = '#f5d3b0';
  const cx = x + w / 2;
  g.save();
  roundRectPath(g, x, y, w, h, w * 0.08);
  g.fillStyle = red ? '#fdecea' : '#e9eef8';
  g.fill();
  g.clip();
  // diagonal sun rays
  g.fillStyle = red ? 'rgba(198,47,62,0.08)' : 'rgba(40,55,92,0.08)';
  for (let i = -3; i < 6; i += 2) {
    g.beginPath();
    g.moveTo(x + i * w * 0.2, y + h);
    g.lineTo(x + (i + 1) * w * 0.2, y + h);
    g.lineTo(cx, y + h * 0.35);
    g.closePath();
    g.fill();
  }
  const headY = y + h * 0.43;
  const headR = w * 0.15;
  // hair behind (queen: long hair)
  if (rank === 12) {
    g.fillStyle = '#7a3f1d';
    g.beginPath();
    g.ellipse(cx, headY + headR * 0.6, headR * 1.45, headR * 2.0, 0, 0, Math.PI * 2);
    g.fill();
  }
  // body
  g.fillStyle = robe;
  g.beginPath();
  g.moveTo(x + w * 0.08, y + h);
  g.lineTo(x + w * 0.22, y + h * 0.66);
  g.quadraticCurveTo(cx, y + h * 0.56, x + w * 0.78, y + h * 0.66);
  g.lineTo(x + w * 0.92, y + h);
  g.closePath();
  g.fill();
  // trim
  g.strokeStyle = gold;
  g.lineWidth = w * 0.05;
  g.beginPath();
  g.moveTo(x + w * 0.3, y + h * 0.63);
  g.lineTo(cx, y + h * 0.8);
  g.lineTo(x + w * 0.7, y + h * 0.63);
  g.stroke();
  g.fillStyle = robe2;
  g.fillRect(x + w * 0.08, y + h * 0.93, w * 0.84, h * 0.07);
  // suit badge on the chest
  drawSuit(g, suit, cx, y + h * 0.88, w * 0.2, '#ffffff');
  // neck + head
  g.fillStyle = skin;
  g.fillRect(cx - headR * 0.35, headY + headR * 0.7, headR * 0.7, headR * 0.6);
  g.beginPath();
  g.arc(cx, headY, headR, 0, Math.PI * 2);
  g.fill();
  // king beard
  if (rank === 13) {
    g.fillStyle = '#efe9da';
    g.beginPath();
    g.moveTo(cx - headR * 0.95, headY + headR * 0.1);
    g.quadraticCurveTo(cx, headY + headR * 2.3, cx + headR * 0.95, headY + headR * 0.1);
    g.quadraticCurveTo(cx, headY + headR * 0.9, cx - headR * 0.95, headY + headR * 0.1);
    g.fill();
  }
  // jack: short hair fringe
  if (rank === 11) {
    g.fillStyle = '#3b2a1e';
    g.beginPath();
    g.arc(cx, headY - headR * 0.1, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    g.closePath();
    g.fill();
  }
  // eyes
  g.fillStyle = '#2b1d14';
  g.beginPath();
  g.arc(cx - headR * 0.38, headY - headR * 0.05, headR * 0.12, 0, Math.PI * 2);
  g.arc(cx + headR * 0.38, headY - headR * 0.05, headR * 0.12, 0, Math.PI * 2);
  g.fill();
  // cheeks
  g.fillStyle = 'rgba(230,110,110,0.35)';
  g.beginPath();
  g.arc(cx - headR * 0.55, headY + headR * 0.3, headR * 0.18, 0, Math.PI * 2);
  g.arc(cx + headR * 0.55, headY + headR * 0.3, headR * 0.18, 0, Math.PI * 2);
  g.fill();
  // headwear
  if (rank === 13) crown(g, cx, headY - headR * 2.35, headR * 2.2, headR * 1.55, 'K', red ? '#2f6fd6' : '#d0233a');
  else if (rank === 12) crown(g, cx, headY - headR * 2.0, headR * 1.9, headR * 1.2, 'Q', red ? '#2f6fd6' : '#d0233a');
  else {
    // jack: tilted cap with a feather
    g.fillStyle = robe2;
    g.beginPath();
    g.ellipse(cx + headR * 0.1, headY - headR * 0.95, headR * 1.25, headR * 0.55, -0.18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = gold;
    g.fillRect(cx - headR * 1.0, headY - headR * 0.75, headR * 2.0, headR * 0.28);
    g.strokeStyle = red ? '#2f6fd6' : '#d0233a';
    g.lineWidth = w * 0.05;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + headR * 0.8, headY - headR * 1.1);
    g.quadraticCurveTo(cx + headR * 1.9, headY - headR * 2.2, cx + headR * 2.2, headY - headR * 1.2);
    g.stroke();
  }
  g.restore();
  g.save();
  roundRectPath(g, x, y, w, h, w * 0.08);
  g.strokeStyle = red ? 'rgba(198,47,62,0.55)' : 'rgba(40,55,92,0.55)';
  g.lineWidth = Math.max(0.7, w * 0.025);
  g.stroke();
  g.restore();
}

/**
 * Card face at (x,y) with size (w,h). Layout is tuned for narrow mobile cards: big rank at
 * the top-left and a suit at the top-right (both visible when fanned), plus a large centre
 * suit or court art below.
 */
export function drawFace(g, rank, suit, x, y, w, h) {
  const color = suitColor(suit);
  const r = w * 0.1;
  roundRectPath(g, x, y, w, h, r);
  g.fillStyle = '#fdfcf7';
  g.fill();
  g.lineWidth = Math.max(0.8, w * 0.016);
  g.strokeStyle = '#cfc8b8';
  g.stroke();
  // corner rank
  const rs = w * (rank === 10 ? 0.33 : 0.36);
  g.fillStyle = color;
  g.font = `800 ${rs}px ${FONT}`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText(RANKS[rank], x + w * 0.075 - (rank === 10 ? w * 0.02 : 0), y + w * 0.36, w * 0.5);
  // corner suit (top right)
  drawSuit(g, suit, x + w * 0.79, y + w * 0.2, w * 0.25, color);
  if (rank >= 11) {
    courtArt(g, rank, suit, x + w * 0.09, y + h * 0.33, w * 0.82, h * 0.61);
  } else if (rank === 1) {
    drawSuit(g, suit, x + w / 2, y + h * 0.63, w * 0.62, color);
  } else {
    drawSuit(g, suit, x + w / 2, y + h * 0.64, w * 0.52, color);
  }
}

/** Patterned card back. */
export function drawBack(g, x, y, w, h) {
  const r = w * 0.1;
  roundRectPath(g, x, y, w, h, r);
  g.fillStyle = '#fdfcf7';
  g.fill();
  g.lineWidth = Math.max(0.8, w * 0.016);
  g.strokeStyle = '#cfc8b8';
  g.stroke();
  const ix = x + w * 0.07;
  const iy = y + w * 0.07;
  const iw = w * 0.86;
  const ih = h - w * 0.14;
  g.save();
  roundRectPath(g, ix, iy, iw, ih, r * 0.6);
  const grad = g.createLinearGradient(ix, iy, ix + iw, iy + ih);
  grad.addColorStop(0, '#e23c64');
  grad.addColorStop(1, '#8e1747');
  g.fillStyle = grad;
  g.fill();
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = Math.max(0.6, w * 0.02);
  const step = w * 0.16;
  g.beginPath();
  for (let d = -ih; d < iw + ih; d += step) {
    g.moveTo(ix + d, iy);
    g.lineTo(ix + d + ih, iy + ih);
    g.moveTo(ix + d, iy + ih);
    g.lineTo(ix + d + ih, iy);
  }
  g.stroke();
  // emblem
  const cx = x + w / 2;
  const cy = y + h / 2;
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.moveTo(cx, cy - w * 0.22);
  g.lineTo(cx + w * 0.16, cy);
  g.lineTo(cx, cy + w * 0.22);
  g.lineTo(cx - w * 0.16, cy);
  g.closePath();
  g.fill();
  g.fillStyle = '#8e1747';
  g.beginPath();
  g.arc(cx, cy, w * 0.06, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.save();
  roundRectPath(g, ix, iy, iw, ih, r * 0.6);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = Math.max(0.7, w * 0.022);
  g.stroke();
  g.restore();
}

/** Green felt table with a soft vignette. */
export function drawFelt(g, w, h) {
  const rg = g.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.75);
  rg.addColorStop(0, '#23915a');
  rg.addColorStop(0.6, '#177443');
  rg.addColorStop(1, '#0c4a2a');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}
