// "Juice" toolkit: particles, floating text, screen shake, flashes and tweens.
// The engine owns one fx instance per game and updates/renders it automatically.
import { FONT } from './draw.js';

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const MAX_PARTICLES = 700;

export function createFx() {
  const parts = [];
  const texts = [];
  const rings = [];
  const tweens = [];
  let shakeT = 0;
  let shakeDur = 0;
  let shakeMag = 0;
  let flashA = 0;
  let flashColor = '#fff';
  const offset = { x: 0, y: 0 };

  const fx = {
    /**
     * Spray particles.
     * opts: count, color | colors[], speed, speedVar, angle, spread (radians), size, life,
     *       gravity, drag, shape ('circle' | 'square' | 'spark'), shrink (bool)
     */
    burst(x, y, opts = {}) {
      const {
        count = 16,
        color = '#ffffff',
        colors = null,
        speed = 240,
        speedVar = 0.6,
        angle = 0,
        spread = Math.PI * 2,
        size = 4,
        sizeVar = 0.5,
        life = 0.6,
        gravity = 500,
        drag = 0.985,
        shape = 'circle',
        shrink = true,
      } = opts;
      for (let i = 0; i < count && parts.length < MAX_PARTICLES; i++) {
        const a = angle - spread / 2 + Math.random() * spread;
        const s = speed * (1 - speedVar / 2 + Math.random() * speedVar);
        parts.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size: size * (1 - sizeVar / 2 + Math.random() * sizeVar),
          life: life * (0.7 + Math.random() * 0.6),
          age: 0,
          color: colors ? colors[(Math.random() * colors.length) | 0] : color,
          gravity,
          drag,
          shape,
          shrink,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 12,
        });
      }
    },

    /** Celebration confetti raining from a point. */
    confetti(x, y, count = 60, colors = ['#ff3d7f', '#ffd23f', '#22d3ee', '#a3e635', '#c084fc']) {
      fx.burst(x, y, { count, colors, speed: 520, spread: Math.PI * 0.9, angle: -Math.PI / 2, size: 7, life: 1.6, gravity: 700, drag: 0.975, shape: 'square', shrink: false });
    },

    /** Floating text that rises and fades ("+1", "PERFECT!"). */
    text(x, y, str, opts = {}) {
      const { color = '#ffffff', size = 28, life = 0.9, rise = 70, weight = 800, stroke = 'rgba(0,0,0,0.35)', pop = true } = opts;
      texts.push({ x, y, str, color, size, life, age: 0, rise, weight, stroke, pop });
    },

    /** Expanding ring shockwave. */
    ring(x, y, opts = {}) {
      const { color = '#ffffff', radius = 60, life = 0.45, width = 4 } = opts;
      rings.push({ x, y, color, radius, life, age: 0, width });
    },

    shake(mag = 8, dur = 0.25) {
      if (mag >= shakeMag * (shakeT / (shakeDur || 1))) {
        shakeMag = mag;
        shakeDur = dur;
        shakeT = dur;
      }
    },

    flash(color = '#ffffff', alpha = 0.5) {
      flashColor = color;
      flashA = alpha;
    },

    /** Tween numeric props on an object: fx.tween(obj, {scale: 1}, 0.3, ease.outBack) */
    tween(obj, to, dur = 0.3, easing = ease.outQuad, onDone = null) {
      const from = {};
      for (const k in to) from[k] = obj[k];
      tweens.push({ obj, from, to, dur, t: 0, easing, onDone });
    },

    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += p.gravity * dt;
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d;
        p.vy *= d;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        texts[i].age += dt;
        if (texts[i].age >= texts[i].life) texts.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].age += dt;
        if (rings[i].age >= rings[i].life) rings.splice(i, 1);
      }
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        const e = tw.easing(k);
        for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
        if (k >= 1) {
          tweens.splice(i, 1);
          if (tw.onDone) tw.onDone();
        }
      }
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const m = shakeMag * (shakeT / shakeDur);
        offset.x = (Math.random() * 2 - 1) * m;
        offset.y = (Math.random() * 2 - 1) * m;
      } else {
        offset.x = 0;
        offset.y = 0;
        shakeMag = 0;
      }
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.5);
    },

    /** Drawn in world space (inside the shake transform), after the game's render. */
    renderWorld(g) {
      for (const r of rings) {
        const k = r.age / r.life;
        g.globalAlpha = 1 - k;
        g.strokeStyle = r.color;
        g.lineWidth = r.width * (1 - k) + 0.5;
        g.beginPath();
        g.arc(r.x, r.y, r.radius * ease.outCubic(k), 0, Math.PI * 2);
        g.stroke();
      }
      for (const p of parts) {
        const k = p.age / p.life;
        const s = p.shrink ? p.size * (1 - k) : p.size;
        g.globalAlpha = p.shrink ? 1 : Math.min(1, (1 - k) * 3);
        g.fillStyle = p.color;
        if (p.shape === 'square') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.fillRect(-s / 2, -s / 2, s, s * 0.6);
          g.restore();
        } else if (p.shape === 'spark') {
          g.strokeStyle = p.color;
          g.lineWidth = Math.max(1, s * 0.5);
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          g.stroke();
        } else {
          g.beginPath();
          g.arc(p.x, p.y, Math.max(0.1, s), 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalAlpha = 1;
      for (const t of texts) {
        const k = t.age / t.life;
        const popScale = t.pop ? (k < 0.15 ? ease.outBack(k / 0.15) : 1) : 1;
        g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        g.save();
        g.translate(t.x, t.y - t.rise * ease.outCubic(k));
        g.scale(popScale, popScale);
        g.font = `${t.weight} ${t.size}px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (t.stroke) {
          g.lineWidth = Math.max(3, t.size / 7);
          g.strokeStyle = t.stroke;
          g.lineJoin = 'round';
          g.strokeText(t.str, 0, 0);
        }
        g.fillStyle = t.color;
        g.fillText(t.str, 0, 0);
        g.restore();
      }
      g.globalAlpha = 1;
    },

    /** Drawn in screen space over everything (flashes). */
    renderScreen(g, w, h) {
      if (flashA > 0) {
        g.globalAlpha = flashA;
        g.fillStyle = flashColor;
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 1;
      }
    },

    get offset() {
      return offset;
    },

    clear() {
      parts.length = 0;
      texts.length = 0;
      rings.length = 0;
      tweens.length = 0;
      shakeT = 0;
      flashA = 0;
    },
  };
  return fx;
}
