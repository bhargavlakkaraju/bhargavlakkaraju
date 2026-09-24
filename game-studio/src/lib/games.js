import { ALL_META, LOADERS } from './registry.generated.js';
import { hashString, todayKey } from '@/games/engine/rng.js';

// Showcase order (best "first impression" games first). Unknown slugs go last.
const ORDER = [
  'stack-tower',
  'juicy-drop',
  'block-crush',
  'sky-flap',
  'blade-spin',
  'color-rush',
  'merge-2048',
  'road-hopper',
  'sky-hop',
  'zig-zag',
  'brick-barrage',
  'neon-snake',
  'wordy',
  'sudoku',
  'solitaire',
];
const rank = (m) => {
  const i = ORDER.indexOf(m.slug);
  return i < 0 ? 999 : i;
};

export const GAMES = [...ALL_META].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
export { LOADERS };

export function getGame(slug) {
  return GAMES.find((g) => g.slug === slug) || null;
}

export function gamesByCategory(cat) {
  return GAMES.filter((g) => g.category === cat);
}

function pickBy(list, seedStr) {
  return list[hashString(seedStr) % list.length];
}

export function gameOfTheDay(date = new Date()) {
  return pickBy(GAMES, `gotd:${todayKey(date)}`);
}

/** A rotating set of games featured as today's Daily Challenges. */
export function dailyGames(date = new Date(), n = 4) {
  const pool = GAMES.filter((g) => g.daily !== false);
  const start = hashString(`daily:${todayKey(date)}`) % pool.length;
  const out = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) out.push(pool[(start + i * 3) % pool.length]);
  return [...new Map(out.map((g) => [g.slug, g])).values()];
}

export function related(slug, n = 4) {
  const me = getGame(slug);
  const others = GAMES.filter((g) => g.slug !== slug);
  const same = others.filter((g) => me && g.category === me.category);
  const rest = others.filter((g) => !me || g.category !== me.category);
  const rot = hashString(slug) % Math.max(1, rest.length);
  return [...same.slice(0, 2), ...rest.slice(rot), ...rest.slice(0, rot)].slice(0, n);
}

export function formatScore(meta, v) {
  if (v == null) return '-';
  return meta.formatScore ? meta.formatScore(v) : String(v);
}

/** 0 = none, 1 = bronze, 2 = silver, 3 = gold */
export function medalFor(meta, score) {
  if (!meta.medals || score == null) return 0;
  let m = 0;
  meta.medals.forEach((t, i) => {
    if (meta.lowerIsBetter ? score <= t : score >= t) m = i + 1;
  });
  return m;
}

export const MEDALS = ['', '🥉', '🥈', '🥇'];

/** Serializable subset of meta for client components (functions stripped). */
export function publicMeta(meta) {
  const out = {};
  for (const k in meta) if (typeof meta[k] !== 'function') out[k] = meta[k];
  return out;
}
