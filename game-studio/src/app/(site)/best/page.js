import Link from 'next/link';
import { TrackPageView } from '@/components/Widgets';
import { COLLECTIONS } from '@/lib/collections';
import { getGame } from '@/lib/games';
import { SITE } from '@/lib/site';

const TITLE = 'Games Like Your Favorites: Free Collections';
const DESCRIPTION =
  'Hand-picked free browser games like Wordle, 2048, Tetris, Flappy Bird, Crossy Road and Snake, plus brain games and relaxing puzzles. No download needed.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/best' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: TITLE,
    description: DESCRIPTION,
    url: '/best',
    images: [{ url: '/og/site.jpg', width: 1200, height: 630 }],
  },
};

export default function CollectionsIndex() {
  const list = COLLECTIONS.map((c) => ({ ...c, games: c.picks.map((p) => getGame(p.game)).filter(Boolean) })).filter((c) => c.games.length);
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Game collections',
      url: `${SITE.url}/best`,
      numberOfItems: list.length,
      itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/best/${c.slug}`, name: c.title })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Game collections', item: `${SITE.url}/best` },
      ],
    },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <TrackPageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">🎯 Games like your favorites</h1>
      <p className="mt-2 max-w-2xl text-white/70">
        Loved a game and want more like it? Each collection picks the {SITE.name} games that play the most like it, explains why, and answers the questions
        people ask. Every game is free and runs in your browser.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {list.map((c, i) => {
          const lead = c.games[0];
          return (
            <Link key={c.slug} href={`/best/${c.slug}`} className="card group overflow-hidden hover:ring-2 hover:ring-pink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/covers/${lead.slug}.webp`} alt="" className="aspect-[2/1] w-full object-cover" loading={i < 2 ? 'eager' : 'lazy'} />
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip">{c.games.length} games</span>
                  <span className="text-lg leading-none" aria-hidden>
                    {c.games.map((g) => g.emoji).join(' ')}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-xl font-bold group-hover:text-pink">{c.title}</h2>
                <p className="mt-1 text-sm text-white/60">{c.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
