import { GAMES, getGame } from '@/lib/games';
import { GUIDES } from '@/lib/guides';
import { SITE, CATEGORIES } from '@/lib/site';

export default function sitemap() {
  const now = new Date();
  const page = (path, priority, changeFrequency = 'weekly') => ({ url: `${SITE.url}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page('/', 1, 'daily'),
    page('/daily', 0.9, 'daily'),
    page('/leaderboards', 0.6, 'daily'),
    ...GAMES.map((g) => page(`/games/${g.slug}`, 0.9)),
    ...Object.keys(CATEGORIES).map((c) => page(`/category/${c}`, 0.7)),
    page('/guides', 0.6),
    ...GUIDES.filter((g) => getGame(g.game)).map((g) => page(`/guides/${g.slug}`, 0.7, 'monthly')),
    page('/about', 0.4, 'monthly'),
    page('/developers', 0.4, 'monthly'),
    page('/contact', 0.3, 'monthly'),
    page('/privacy', 0.2, 'yearly'),
    page('/terms', 0.2, 'yearly'),
  ];
}
