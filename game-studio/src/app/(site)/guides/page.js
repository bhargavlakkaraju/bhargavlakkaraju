import Link from 'next/link';
import { TrackPageView } from '@/components/Widgets';
import { GUIDES } from '@/lib/guides';
import { getGame } from '@/lib/games';

export const metadata = {
  title: 'Game Guides & Strategy Tips',
  description: 'Strategy guides for 2048, Sudoku, Solitaire, word games and more. Learn the techniques, then play free in your browser.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  const list = GUIDES.filter((g) => getGame(g.game));
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <TrackPageView />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">📚 Guides & tips</h1>
      <p className="mt-2 text-white/70">Get better, beat your friends, climb the boards.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {list.map((g) => {
          const game = getGame(g.game);
          return (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="card group overflow-hidden hover:ring-2 hover:ring-pink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/covers/${g.game}.png`} alt="" className="aspect-[2/1] w-full object-cover" loading="lazy" />
              <div className="p-5">
                <div className="chip">
                  {game.emoji} {game.title}
                </div>
                <h2 className="mt-2 font-display text-xl font-bold group-hover:text-pink">{g.title}</h2>
                <p className="mt-1 text-sm text-white/60">{g.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
