// Tiny WebAudio synth: every sound effect is generated at runtime, so games ship
// with zero audio assets and load instantly.
import { load, save } from './storage.js';

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = load('muted', false);
let suspended = false;

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended' && !suspended) ctx.resume().catch(() => {});
  return ctx;
}

function getNoise(ac) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/**
 * Play a synthesized tone.
 * @param {object} o
 * @param {number} o.freq start frequency (Hz)
 * @param {number} [o.to] end frequency for a pitch slide
 * @param {OscillatorType} [o.type]
 * @param {number} [o.dur] seconds
 * @param {number} [o.vol] 0..1
 * @param {number} [o.delay] seconds before start
 */
export function tone({ freq = 440, to = null, type = 'sine', dur = 0.12, vol = 0.25, attack = 0.004, delay = 0 } = {}) {
  const ac = ensure();
  if (!ac || muted || suspended) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function noise({ dur = 0.2, vol = 0.2, freq = 1200, to = null, q = 0.8, type = 'lowpass', delay = 0 } = {}) {
  const ac = ensure();
  if (!ac || muted || suspended) return;
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const semitone = (base, n) => base * Math.pow(2, n / 12);

const PRESETS = {
  tap: () => tone({ freq: 520, to: 700, type: 'square', dur: 0.06, vol: 0.08 }),
  click: () => tone({ freq: 900, type: 'triangle', dur: 0.03, vol: 0.1 }),
  jump: () => tone({ freq: 300, to: 620, type: 'square', dur: 0.12, vol: 0.09 }),
  flap: () => noise({ dur: 0.09, vol: 0.18, freq: 1800, to: 500, type: 'bandpass', q: 1.2 }),
  score: () => {
    tone({ freq: 660, type: 'triangle', dur: 0.08, vol: 0.16 });
    tone({ freq: 990, type: 'triangle', dur: 0.12, vol: 0.14, delay: 0.06 });
  },
  coin: () => {
    tone({ freq: 988, type: 'square', dur: 0.07, vol: 0.08 });
    tone({ freq: 1319, type: 'square', dur: 0.16, vol: 0.08, delay: 0.07 });
  },
  pop: () => tone({ freq: 380, to: 900, type: 'sine', dur: 0.09, vol: 0.22 }),
  place: () => {
    tone({ freq: 180, to: 90, type: 'sine', dur: 0.12, vol: 0.28 });
    noise({ dur: 0.06, vol: 0.12, freq: 900 });
  },
  hit: () => {
    noise({ dur: 0.18, vol: 0.3, freq: 1400, to: 200 });
    tone({ freq: 160, to: 60, type: 'square', dur: 0.16, vol: 0.12 });
  },
  whoosh: () => noise({ dur: 0.25, vol: 0.14, freq: 400, to: 3000, type: 'bandpass', q: 1.5 }),
  die: () => {
    tone({ freq: 420, to: 60, type: 'sawtooth', dur: 0.55, vol: 0.12 });
    noise({ dur: 0.35, vol: 0.2, freq: 800, to: 100 });
  },
  error: () => tone({ freq: 140, type: 'square', dur: 0.18, vol: 0.1 }),
  perfect: () => {
    [0, 4, 7, 12].forEach((n, i) => tone({ freq: semitone(660, n), type: 'triangle', dur: 0.14, vol: 0.12, delay: i * 0.045 }));
  },
  win: () => {
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone({ freq: semitone(523, n), type: 'triangle', dur: 0.2, vol: 0.13, delay: i * 0.07 }));
  },
  levelup: () => {
    [0, 7, 12].forEach((n, i) => tone({ freq: semitone(440, n), type: 'square', dur: 0.12, vol: 0.07, delay: i * 0.08 }));
  },
  merge: () => {
    tone({ freq: 300, to: 600, type: 'sine', dur: 0.12, vol: 0.2 });
    tone({ freq: 600, to: 900, type: 'triangle', dur: 0.1, vol: 0.1, delay: 0.05 });
  },
  swipe: () => noise({ dur: 0.08, vol: 0.1, freq: 2500, to: 900, type: 'bandpass', q: 2 }),
};

export const sfx = {
  /** Play a named preset: tap, click, jump, flap, score, coin, pop, place, hit, whoosh, die, error, perfect, win, levelup, merge, swipe */
  play(name) {
    const p = PRESETS[name];
    if (p) p();
  },
  /** Rising-pitch blip for combos/streaks. n = combo count (0, 1, 2, ...) */
  combo(n = 0, base = 520) {
    const f = semitone(base, Math.min(n, 24));
    tone({ freq: f, type: 'triangle', dur: 0.1, vol: 0.14 });
    tone({ freq: f * 2, type: 'sine', dur: 0.08, vol: 0.05, delay: 0.03 });
  },
  tone,
  noise,
  /** Call on first user gesture (the engine does this for you on pointer/key input). */
  unlock() {
    ensure();
  },
  setMuted(v) {
    muted = !!v;
    save('muted', muted);
    if (master) master.gain.value = muted ? 0 : 0.55;
  },
  isMuted() {
    return muted;
  },
  toggleMuted() {
    this.setMuted(!muted);
    return muted;
  },
  /** Used while ads play: silences everything without changing the user's mute preference. */
  setSuspended(v) {
    suspended = !!v;
    if (!ctx) return;
    if (suspended) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  },
};
