// Local player profile: anonymous id, nickname, XP/levels, daily streak, per-game
// progress (runs, best, medals), badges. Lives in localStorage; no account needed.
import { load, save } from '@/games/engine/storage.js';
import { medalFor } from './games';

const KEY = 'player';
const today = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function randomId() {
  const a = new Uint8Array(10);
  (globalThis.crypto || window.crypto).getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-4);
}

function fresh() {
  return {
    vid: randomId(),
    name: '',
    xp: 0,
    firstSeen: today(),
    lastActive: null,
    streak: { count: 0, last: null, best: 0 },
    games: {},
    recent: [],
    badges: [],
    dailyDone: {},
  };
}

let cache = null;

export function getPlayer() {
  if (cache) return cache;
  const p = load(KEY, null);
  cache = p && p.vid ? { ...fresh(), ...p } : fresh();
  if (!p) save(KEY, cache);
  return cache;
}

export function savePlayer(p) {
  cache = p;
  save(KEY, p);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ra:player', { detail: p }));
}

export function xpForLevel(level) {
  return 30 * (level - 1) * level;
}

export function levelInfo(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, need: next - base, pct: Math.round(((xp - base) / (next - base)) * 100) };
}

export const BADGES = {
  first: { emoji: '🎮', name: 'First Game', desc: 'Played your first game' },
  explorer5: { emoji: '🧭', name: 'Explorer', desc: 'Played 5 different games' },
  explorerAll: { emoji: '🗺️', name: 'Completionist', desc: 'Played every game in the arcade' },
  streak3: { emoji: '🔥', name: 'On Fire', desc: '3-day play streak' },
  streak7: { emoji: '☄️', name: 'Unstoppable', desc: '7-day play streak' },
  streak30: { emoji: '👑', name: 'Legend', desc: '30-day play streak' },
  gold: { emoji: '🥇', name: 'Gold Hands', desc: 'Earned a gold medal' },
  gold5: { emoji: '🏆', name: 'Champion', desc: 'Gold medals in 5 games' },
  daily: { emoji: '📅', name: 'Daily Player', desc: 'Played a Daily Challenge' },
  sharer: { emoji: '📣', name: 'Hype Machine', desc: 'Challenged a friend' },
  runs100: { emoji: '💯', name: 'Dedicated', desc: 'Played 100 runs' },
};

function grant(p, id, out) {
  if (!p.badges.includes(id)) {
    p.badges.push(id);
    out.push(id);
  }
}

/** Record that the player was active now; returns account age in days on the first activity of a new day, else null. */
export function touchActivity() {
  const p = getPlayer();
  const t = today();
  if (p.lastActive === t) return null;
  p.lastActive = t;
  savePlayer(p);
  return Math.max(0, dayDiff(p.firstSeen, t));
}

/**
 * Update progression after a finished run.
 * @returns {{xp:number, reasons:string[], levelUp:number|null, medal:number, newBadges:string[], streak:number}}
 */
export function recordRun({ meta, score, isNewBest, mode, win }) {
  const p = getPlayer();
  const t = today();
  const reasons = [];
  let xp = 10;
  reasons.push('+10 run');

  // streak (counts days with at least one finished run)
  let streakBonus = 0;
  if (p.streak.last !== t) {
    const gap = p.streak.last ? dayDiff(p.streak.last, t) : null;
    p.streak.count = gap === 1 ? p.streak.count + 1 : 1;
    p.streak.last = t;
    p.streak.best = Math.max(p.streak.best || 0, p.streak.count);
    streakBonus = Math.min(p.streak.count, 10) * 5;
    if (streakBonus) reasons.push(`+${streakBonus} day ${p.streak.count} streak`);
  }
  xp += streakBonus;

  const g = p.games[meta.slug] || { runs: 0, best: null, medal: 0, last: null };
  const firstPlay = g.runs === 0;
  if (firstPlay) {
    xp += 30;
    reasons.push('+30 new game');
  }
  g.runs += 1;
  g.last = Date.now();
  const counts = !(meta.lowerIsBetter && win === false);
  if (counts && (g.best == null || (meta.lowerIsBetter ? score < g.best : score > g.best))) g.best = score;
  if (isNewBest) {
    xp += 20;
    reasons.push('+20 new best');
  }
  const medal = counts ? medalFor(meta, score) : 0;
  let newMedal = 0;
  if (medal > (g.medal || 0)) {
    newMedal = medal;
    xp += 25 * medal;
    reasons.push(`+${25 * medal} medal`);
    g.medal = medal;
  }
  if (mode === 'daily') {
    xp += 15;
    reasons.push('+15 daily');
    p.dailyDone[meta.slug] = t;
  }
  if (win === true) {
    xp += 20;
    reasons.push('+20 win');
  }
  p.games[meta.slug] = g;
  p.recent = [meta.slug, ...p.recent.filter((s) => s !== meta.slug)].slice(0, 8);

  const before = levelInfo(p.xp).level;
  p.xp += xp;
  const after = levelInfo(p.xp).level;

  const newBadges = [];
  const played = Object.keys(p.games).length;
  const totalRuns = Object.values(p.games).reduce((a, x) => a + x.runs, 0);
  const golds = Object.values(p.games).filter((x) => x.medal >= 3).length;
  grant(p, 'first', newBadges);
  if (played >= 5) grant(p, 'explorer5', newBadges);
  if (typeof window !== 'undefined' && window.__RA_TOTAL_GAMES && played >= window.__RA_TOTAL_GAMES) grant(p, 'explorerAll', newBadges);
  if (p.streak.count >= 3) grant(p, 'streak3', newBadges);
  if (p.streak.count >= 7) grant(p, 'streak7', newBadges);
  if (p.streak.count >= 30) grant(p, 'streak30', newBadges);
  if (golds >= 1) grant(p, 'gold', newBadges);
  if (golds >= 5) grant(p, 'gold5', newBadges);
  if (mode === 'daily') grant(p, 'daily', newBadges);
  if (totalRuns >= 100) grant(p, 'runs100', newBadges);

  savePlayer(p);
  return { xp, reasons, levelUp: after > before ? after : null, medal: newMedal, newBadges, streak: p.streak.count, firstPlay };
}

export function setName(name) {
  const p = getPlayer();
  p.name = name;
  savePlayer(p);
}

export function markShared() {
  const p = getPlayer();
  const out = [];
  grant(p, 'sharer', out);
  savePlayer(p);
  return out;
}
