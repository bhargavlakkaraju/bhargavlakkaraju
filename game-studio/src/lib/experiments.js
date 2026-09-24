// Lightweight A/B testing. Variants are assigned deterministically per visitor, sent
// with every analytics batch, and compared on the /studio dashboard. Force a variant
// with ?exp_<name>=<variant>. To run a new test, add it here and read it with variant().
import { hashString } from '@/games/engine/rng.js';
import { getPlayer } from './player';

export const EXPERIMENTS = {
  // Which CTA wording drives more sharing on the game-over panel.
  share_cta: { variants: ['challenge', 'share'] },
  // Interstitial pacing: revenue per session vs. retention.
  ad_every: { variants: ['3', '4'] },
  // Show "try next" game suggestions on the game-over panel (cross-play) or not.
  next_games: { variants: ['show', 'hide'], weights: [3, 1] },
};

export function variant(name) {
  const exp = EXPERIMENTS[name];
  if (!exp) return null;
  if (typeof window !== 'undefined') {
    const forced = new URLSearchParams(window.location.search).get(`exp_${name}`);
    if (forced && exp.variants.includes(forced)) return forced;
  }
  const weights = exp.weights || exp.variants.map(() => 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = (hashString(`${getPlayer().vid}:${name}`) % 10000) / 10000;
  for (let i = 0; i < exp.variants.length; i++) {
    r -= weights[i] / total;
    if (r < 0) return exp.variants[i];
  }
  return exp.variants[exp.variants.length - 1];
}

export function getAssignments() {
  const out = {};
  for (const name in EXPERIMENTS) out[name] = variant(name);
  return out;
}
