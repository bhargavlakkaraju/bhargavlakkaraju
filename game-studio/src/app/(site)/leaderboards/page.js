import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import { TrackPageView } from '@/components/Widgets';
import { GAMES } from '@/lib/games';

export const metadata = {
  title: 'Leaderboards: Top Scores Today and All Time',
  description: 'See the best players in every Retry Arcade game: today’s top scores, daily challenge winners and all-time records.',
  alternates: { canonical: '/leaderboards' },
};

export default function LeaderboardsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <TrackPageView />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">🏆 Leaderboards</h1>
      <p className="mt-2 text-white/70">Boards reset every day at midnight UTC. All-time records last forever.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <div key={g.slug} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-lg font-bold">
                {g.emoji} {g.title}
              </div>
              <Link href={`/games/${g.slug}`} className="rounded-full bg-pink px-3 py-1 text-xs font-extrabold text-white">
                Play
              </Link>
            </div>
            <Leaderboard slug={g.slug} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
