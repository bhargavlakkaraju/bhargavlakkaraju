// Daily social media feed for posting agents (Grokbot etc). Public, read-only JSON.
//   GET /api/social/feed                    today's posts (UTC)
//   GET /api/social/feed?day=2026-10-01     another day (champion posts only exist for today)
//   GET /api/social/feed?platform=x         only posts for one platform
import { json, utcDay } from '@/lib/server';
import { getChampions } from '@/lib/champions';
import { buildFeed, PLATFORMS } from '@/lib/social';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const today = utcDay();
  const dayParam = /^\d{4}-\d{2}-\d{2}$/.test(q.get('day') || '') ? q.get('day') : today;
  const date = new Date(`${dayParam}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return json({ error: 'bad day' }, { status: 400 });
  const champions = dayParam === today ? await getChampions(today).catch(() => []) : [];
  const feed = buildFeed({ date, champions });
  const platform = q.get('platform');
  if (platform && PLATFORMS.includes(platform)) {
    feed.posts = feed.posts
      .filter((p) => p.platforms.includes(platform))
      .map((p) => ({ ...p, platforms: [platform], text: { [platform]: p.text[platform] }, links: { [platform]: p.links[platform] } }));
  }
  return json(feed, { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=600' } });
}
