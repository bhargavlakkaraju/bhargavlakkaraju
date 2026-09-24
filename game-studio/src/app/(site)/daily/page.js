import GameCard from '@/components/GameCard';
import { Countdown, TrackPageView } from '@/components/Widgets';
import { GAMES, dailyGames } from '@/lib/games';

export const revalidate = 3600;

export const metadata = {
  title: 'Daily Challenges: New Game Levels Every Day',
  description: 'Play today’s Daily Challenges: the same seeded level for every player worldwide. Post your score before midnight UTC and keep your streak alive.',
  alternates: { canonical: '/daily' },
};

export default function DailyPage() {
  const featured = dailyGames(new Date(), 4);
  const all = GAMES.filter((g) => g.daily !== false);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <TrackPageView />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">📅 Daily Challenges</h1>
          <p className="mt-2 max-w-2xl text-white/70">
            Every game gets a brand-new level every day, identical for every player on Earth. Beat your friends, climb today’s board, and come back tomorrow to
            keep your 🔥 streak alive.
          </p>
        </div>
        <div className="card px-5 py-3 text-right">
          <div className="text-[10px] font-extrabold tracking-widest text-white/40">RESETS IN</div>
          <Countdown className="text-2xl font-bold text-sun" />
        </div>
      </div>
      <h2 className="section-title mt-10">⭐ Featured today</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {featured.map((g) => (
          <GameCard key={g.slug} game={g} href={`/games/${g.slug}?mode=daily`} badge="+15 XP" priority />
        ))}
      </div>
      <h2 className="section-title mt-12">All daily challenges</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {all.map((g) => (
          <GameCard key={g.slug} game={g} href={`/games/${g.slug}?mode=daily`} badge="DAILY" />
        ))}
      </div>
    </div>
  );
}
