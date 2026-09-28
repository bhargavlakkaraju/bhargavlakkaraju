import PlayFeed from '@/components/PlayFeed';
import { GAMES, getGame } from '@/lib/games';
import { SITE } from '@/lib/site';

// /play: the swipe feed. ?g=<slug> opens the feed on that game (used by shared links).
export function generateMetadata({ searchParams }) {
  const g = getGame(typeof searchParams?.g === 'string' ? searchParams.g : '');
  const title = g ? `${g.title} and more: swipe to play free games` : 'Play feed: swipe to play free games instead of scrolling';
  const description = g
    ? `${g.tagline} Play ${g.title} free in your browser, then swipe up for the next game. No download, no sign up.`
    : `Scroll less, play more. Swipe through ${GAMES.length} free browser games like a video feed and play any of them instantly. No download, no sign up.`;
  return {
    title,
    description,
    alternates: { canonical: '/play' },
    openGraph: {
      title: `${g ? `${g.emoji} ${g.title}` : '▶ Play feed'} | ${SITE.name}`,
      description,
      url: g ? `/play?g=${g.slug}` : '/play',
      images: [{ url: g ? `/og/${g.slug}.jpg` : '/og/site.jpg', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [g ? `/og/${g.slug}.jpg` : '/og/site.jpg'] },
  };
}

export default function PlayPage({ searchParams }) {
  const start = typeof searchParams?.g === 'string' ? searchParams.g : null;
  const games = GAMES.map((g) => ({ slug: g.slug, title: g.title, tagline: g.tagline, category: g.category, emoji: g.emoji, party: !!g.party }));
  return (
    <>
      <h1 className="sr-only">{SITE.name} play feed: swipe to play free games</h1>
      <PlayFeed games={games} start={start} />
    </>
  );
}
