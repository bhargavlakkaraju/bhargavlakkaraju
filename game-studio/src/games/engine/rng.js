// Seeded randomness. Games must use api.rng for anything that affects gameplay
// so the Daily Challenge gives every player the exact same run.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32-bit
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Daily keys are UTC so the whole world shares one challenge per day.
export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(slug, date = new Date()) {
  return hashString(`${slug}:${todayKey(date)}`);
}

export function randomSeed() {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

// A stable rng function whose underlying generator can be re-seeded. Games keep
// a reference to api.rng; the engine calls rng.reseed() at the start of every run.
export function createRng(seed = randomSeed()) {
  let gen = mulberry32(seed);
  const rng = () => gen();
  rng.seed = seed;
  rng.reseed = (s) => {
    rng.seed = s >>> 0;
    gen = mulberry32(rng.seed);
  };
  rng.range = (min, max) => min + (max - min) * gen();
  rng.int = (min, max) => Math.floor(min + (max - min + 1) * gen()); // inclusive
  rng.pick = (arr) => arr[Math.floor(gen() * arr.length)];
  rng.chance = (p) => gen() < p;
  rng.sign = () => (gen() < 0.5 ? -1 : 1);
  rng.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(gen() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  return rng;
}
