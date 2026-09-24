// Brand + deployment configuration. Everything monetization-related is driven by env
// vars so the site runs fully (with no ads) before any ad account is approved.
export const SITE = {
  name: 'Retry Arcade',
  short: 'Retry',
  tagline: 'Just one more try.',
  description:
    'Free online games you can play instantly in your browser. No downloads, no sign-ups: tap, play, and try to beat your best. New daily challenges every day.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  twitter: process.env.NEXT_PUBLIC_TWITTER || '@retryarcade',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@retryarcade.com',
  themeColor: '#0b0618',
};

export const ADS = {
  // 'adsense' | 'dev' | 'none'
  provider: process.env.NEXT_PUBLIC_ADS_PROVIDER || (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? 'adsense' : 'none'),
  client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '', // ca-pub-XXXXXXXXXXXXXXXX
  test: process.env.NEXT_PUBLIC_ADS_TEST === '1',
  slots: {
    gameSide: process.env.NEXT_PUBLIC_AD_SLOT_GAME_SIDE || '',
    gameBelow: process.env.NEXT_PUBLIC_AD_SLOT_GAME_BELOW || '',
    homeInline: process.env.NEXT_PUBLIC_AD_SLOT_HOME || '',
    rail: process.env.NEXT_PUBLIC_AD_SLOT_RAIL || '',
  },
  // Show an interstitial at most every N restarts and never more often than minGapSec.
  interstitialEvery: Number(process.env.NEXT_PUBLIC_INTERSTITIAL_EVERY || 3),
  minGapSec: Number(process.env.NEXT_PUBLIC_INTERSTITIAL_MIN_GAP || 60),
};

export const ANALYTICS = {
  ga4: process.env.NEXT_PUBLIC_GA4_ID || '',
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
};

export const CATEGORIES = {
  arcade: { name: 'Arcade', emoji: '🕹️', blurb: 'One-tap reflex games built for “just one more try”.' },
  puzzle: { name: 'Puzzle', emoji: '🧩', blurb: 'Relaxing brain teasers you can play for five minutes or five hours.' },
  classic: { name: 'Classics', emoji: '🃏', blurb: 'Timeless favorites, rebuilt to feel great on any screen.' },
  word: { name: 'Word', emoji: '🔤', blurb: 'Daily word puzzles to share with friends.' },
};
