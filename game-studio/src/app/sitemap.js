import { GAMES, getGame } from '@/lib/games';
import { GUIDES } from '@/lib/guides';
import { COLLECTIONS } from '@/lib/collections';
import { SITE, CATEGORIES, MONEY } from '@/lib/site';

// Date of the last meaningful edit to evergreen pages. Search engines trust lastmod only
// when it reflects real changes, so pages that change daily use today and the rest use
// their own published/updated date.
const CONTENT_UPDATED = '2026-09-25';

export default function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const page = (path, priority, changeFrequency = 'weekly', lastModified = CONTENT_UPDATED) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  const newest = (a, b) => (a > b ? a : b);
  return [
    page('/', 1, 'daily', today),
    page('/daily', 0.9, 'daily', today),
    page('/leaderboards', 0.6, 'daily', today),
    ...GAMES.map((g) => page(`/games/${g.slug}`, 0.9, 'weekly', newest(g.updated || g.released || CONTENT_UPDATED, CONTENT_UPDATED))),
    ...Object.keys(CATEGORIES).map((c) => page(`/category/${c}`, 0.7)),
    page('/best', 0.7),
    ...COLLECTIONS.map((c) => page(`/best/${c.slug}`, 0.8, 'monthly', c.updated || c.published || CONTENT_UPDATED)),
    page('/guides', 0.6),
    ...GUIDES.filter((g) => getGame(g.game)).map((g) => page(`/guides/${g.slug}`, 0.7, 'monthly', g.updated || g.published || CONTENT_UPDATED)),
    page('/about', 0.4, 'monthly'),
    page('/press', 0.4, 'monthly'),
    page('/advertise', 0.4, 'monthly'),
    ...(MONEY.plusLink ? [page('/plus', 0.3, 'monthly')] : []),
    page('/developers', 0.4, 'monthly'),
    page('/contact', 0.3, 'monthly'),
    page('/privacy', 0.2, 'yearly'),
    page('/terms', 0.2, 'yearly'),
  ];
}
