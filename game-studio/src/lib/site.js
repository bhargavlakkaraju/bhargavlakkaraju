// Brand + deployment configuration. Everything monetization-related is driven by env
// vars so the site runs fully (with no ads) before any ad account is approved.

export const SITE = {
  name: 'Retry Arcade',
  short: 'Retry',
  tagline: 'Just one more try.',
  description:
    'Free online games you can play instantly in your browser. No downloads, no sign-ups: tap, play, and try to beat your best. New daily challenges every day.',
  // Resolved at build time in next.config.mjs (explicit NEXT_PUBLIC_SITE_URL, else the Vercel domain).
  url: process.env.SITE_URL_RESOLVED || 'http://localhost:3000',
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
  // Which network fills the display slots (independent of the in-game ad provider above):
  //   adsense  - AdSense display units (needs client + slot ids)
  //   adsterra - Adsterra banners, approves any site quickly (needs NEXT_PUBLIC_ADSTERRA_KEYS)
  //   ezoic    - Ezoic placeholders (needs NEXT_PUBLIC_EZOIC_IDS + Ezoic ads.txt redirect)
  //   house    - our own promos (sponsor us, go ad-free, daily arena) until a network is live
  //   none     - empty
  display: process.env.NEXT_PUBLIC_DISPLAY_NETWORK || (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? 'adsense' : 'house'),
  adsterra: {
    host: process.env.NEXT_PUBLIC_ADSTERRA_HOST || 'www.highperformanceformat.com',
    // "300x250:key,728x90:key,320x50:key,160x600:key" (one key per banner size from the Adsterra dashboard)
    keys: parsePairs(process.env.NEXT_PUBLIC_ADSTERRA_KEYS),
  },
  // "gameSide:101,gameBelow:102,homeInline:103,rail:104" (placeholder ids from the Ezoic dashboard)
  ezoic: parsePairs(process.env.NEXT_PUBLIC_EZOIC_IDS),
};

// Direct revenue that does not depend on an ad network.
export const MONEY = {
  // Retry Arcade Plus: a Stripe Payment Link (its success URL must be <site>/plus/thanks?session_id={CHECKOUT_SESSION_ID}).
  plusLink: process.env.NEXT_PUBLIC_PLUS_LINK || '',
  plusPrice: process.env.NEXT_PUBLIC_PLUS_PRICE || '$4.99 / year',
  // Tip jar (Ko-fi, Buy Me a Coffee, a Stripe link...).
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL || '',
  // Current sponsor of the Daily Arena, as JSON: {"name","url","logo","tagline","until":"YYYY-MM-DD"}
  sponsor: parseJson(process.env.NEXT_PUBLIC_SPONSOR),
};

// Public profiles: shown in the footer and listed as sameAs in structured data.
export const SOCIAL = [
  ['x', 'X', process.env.NEXT_PUBLIC_SOCIAL_X],
  ['instagram', 'Instagram', process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM],
  ['tiktok', 'TikTok', process.env.NEXT_PUBLIC_SOCIAL_TIKTOK],
  ['youtube', 'YouTube', process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE],
  ['linkedin', 'LinkedIn', process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN],
  ['facebook', 'Facebook', process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK],
  ['discord', 'Discord', process.env.NEXT_PUBLIC_SOCIAL_DISCORD],
  ['reddit', 'Reddit', process.env.NEXT_PUBLIC_SOCIAL_REDDIT],
  ['pinterest', 'Pinterest', process.env.NEXT_PUBLIC_SOCIAL_PINTEREST],
]
  .filter(([, , url]) => url)
  .map(([id, name, url]) => ({ id, name, url }));

// Search engine / platform ownership verification codes (meta tags).
export const VERIFY = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '',
  yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
  pinterest: process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION || '',
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION || '',
};

function parsePairs(raw) {
  const out = {};
  for (const part of String(raw || '').split(',')) {
    const [k, v] = part.split(':').map((x) => x && x.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

function parseJson(raw) {
  try {
    const o = raw ? JSON.parse(raw) : null;
    if (!o || !o.name || !o.url) return null;
    if (o.until && new Date(`${o.until}T23:59:59Z`) < new Date()) return null;
    return o;
  } catch {
    return null;
  }
}

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
