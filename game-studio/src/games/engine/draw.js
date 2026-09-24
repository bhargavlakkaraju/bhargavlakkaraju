// Canvas drawing helpers shared by every game.

export const FONT = '"Fredoka", "Baloo 2", "Nunito", "Segoe UI", system-ui, -apple-system, sans-serif';

export function font(size, weight = 800) {
  return `${weight} ${size}px ${FONT}`;
}

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

export function roundRect(g, x, y, w, h, r, fill = null, stroke = null, lineWidth = 2) {
  roundRectPath(g, x, y, w, h, r);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lineWidth;
    g.stroke();
  }
}

export function circle(g, x, y, r, fill = null, stroke = null, lineWidth = 2) {
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lineWidth;
    g.stroke();
  }
}

/**
 * Draw text with sensible defaults (centered, bold, soft shadow).
 * opts: size, color, align, baseline, weight, shadow (bool|color), stroke (color), strokeWidth, maxWidth
 */
export function text(g, str, x, y, opts = {}) {
  const {
    size = 24,
    color = '#ffffff',
    align = 'center',
    baseline = 'middle',
    weight = 800,
    shadow = true,
    stroke = null,
    strokeWidth = null,
    maxWidth = undefined,
    alpha = 1,
  } = opts;
  g.save();
  g.globalAlpha *= alpha;
  g.font = font(size, weight);
  g.textAlign = align;
  g.textBaseline = baseline;
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = strokeWidth ?? Math.max(2, size / 6);
    g.strokeStyle = stroke;
    g.strokeText(String(str), x, y, maxWidth);
  }
  if (shadow) {
    g.shadowColor = typeof shadow === 'string' ? shadow : 'rgba(0,0,0,0.35)';
    g.shadowBlur = size / 5;
    g.shadowOffsetY = size / 14;
  }
  g.fillStyle = color;
  g.fillText(String(str), x, y, maxWidth);
  g.restore();
}

export function linearGradient(g, x0, y0, x1, y1, stops) {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => grad.addColorStop(Array.isArray(c) ? c[0] : i / Math.max(1, stops.length - 1), Array.isArray(c) ? c[1] : c));
  return grad;
}

export function hsl(h, s = 70, l = 55, a = 1) {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** amt in -1..1: negative darkens, positive lightens. */
export function shade(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
