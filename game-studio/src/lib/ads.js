// Client-side ad platform singleton + interstitial pacing for the website.
import { createPlatform } from '@/games/engine/platform.js';
import { ADS } from './site';
import { variant } from './experiments';

let platform = null;
let restartsSinceAd = 0;
let lastAdAt = Date.now();

export function getPlatform({ embed = false } = {}) {
  if (platform) return platform;
  const forced = new URLSearchParams(window.location.search).get('ads');
  // Embeds on other sites never show ads (AdSense only allows ads on sites we own).
  const name = embed ? 'none' : forced === 'dev' ? 'dev' : ADS.provider;
  platform = createPlatform(name, { client: ADS.client, test: ADS.test });
  platform.init().catch(() => {});
  return platform;
}

/** Call before each restart; resolves once any interstitial has finished. */
export async function maybeInterstitial(p) {
  restartsSinceAd += 1;
  const every = Number(variant('ad_every')) || ADS.interstitialEvery;
  const gapOk = (Date.now() - lastAdAt) / 1000 >= ADS.minGapSec;
  if (restartsSinceAd < every || !gapOk) return false;
  const shown = await p.interstitial('next');
  if (shown) {
    restartsSinceAd = 0;
    lastAdAt = Date.now();
  }
  return shown;
}
