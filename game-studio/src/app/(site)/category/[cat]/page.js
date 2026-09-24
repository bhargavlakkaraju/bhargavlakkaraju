import { notFound } from 'next/navigation';
import GameCard from '@/components/GameCard';
import { TrackPageView } from '@/components/Widgets';
import { gamesByCategory } from '@/lib/games';
import { CATEGORIES } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((cat) => ({ cat }));
}

export function generateMetadata({ params }) {
  const c = CATEGORIES[params.cat];
  if (!c) return {};
  return {
    title: `Free ${c.name} Games Online: Play Instantly`,
    description: `${c.blurb} Play free ${c.name.toLowerCase()} games in your browser on phone or computer, no download.`,
    alternates: { canonical: `/category/${params.cat}` },
  };
}

export default function CategoryPage({ params }) {
  const c = CATEGORIES[params.cat];
  if (!c) notFound();
  const games = gamesByCategory(params.cat);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <TrackPageView />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        {c.emoji} Free {c.name} Games
      </h1>
      <p className="mt-2 max-w-2xl text-white/70">{c.blurb}</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {games.map((g, i) => (
          <GameCard key={g.slug} game={g} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}
