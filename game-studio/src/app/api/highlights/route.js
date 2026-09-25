// Today's champion for every game. Powers the home-page ticker and champions board.
// Cached briefly at the edge.
import { json, utcDay } from '@/lib/server';
import { getChampions } from '@/lib/champions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const day = utcDay();
  const champions = await getChampions(day);
  return json({ day, champions }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=120' } });
}
