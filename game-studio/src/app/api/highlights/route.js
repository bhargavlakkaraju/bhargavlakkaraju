// Today's champion (top classic score) for every game, from the real leaderboards.
// Powers the home-page ticker and champions board. Cached briefly at the edge.
import { pipeline, pairs } from '@/lib/store';
import { json, utcDay } from '@/lib/server';
import { GAMES, formatScore } from '@/lib/games';

export const dynamic = 'force-dynamic';

export async function GET() {
  const day = utcDay();
  const cmds = [];
  for (const g of GAMES) {
    const k = `lb:${g.slug}:t:${day}`;
    cmds.push(g.lowerIsBetter ? ['ZRANGE', k, 0, 0, 'WITHSCORES'] : ['ZRANGE', k, 0, 0, 'REV', 'WITHSCORES'], ['ZCARD', k]);
  }
  const res = await pipeline(cmds);
  const rows = [];
  GAMES.forEach((g, i) => {
    const [top] = pairs(res[i * 2]);
    if (top) rows.push({ slug: g.slug, title: g.title, emoji: g.emoji, vid: top[0], score: Number(top[1]), players: Number(res[i * 2 + 1]) || 0 });
  });
  const names = rows.length ? (await pipeline([['HMGET', 'lbn', ...rows.map((r) => r.vid)]]))[0] || [] : [];
  const champions = rows.map((r, i) => ({
    slug: r.slug,
    title: r.title,
    emoji: r.emoji,
    name: names[i] || 'Player',
    score: formatScore(GAMES.find((g) => g.slug === r.slug), r.score),
    players: r.players,
  }));
  return json({ day, champions }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=120' } });
}
