import PlayFeed from '@/components/PlayFeed';
import { GAMES, getGame } from '@/lib/games';
import { SITE } from '@/lib/site';
import { itemListLd, ld, metaDescription } from '@/lib/seo';

// /play: the swipe feed. ?g=<slug> opens the feed on that game (used by shared links).
export function generateMetadata({ searchParams }) {
  const g = getGame(typeof searchParams?.g === 'string' ? searchParams.g : '');
  const title = g ? `${g.title} and more: swipe to play free games` : 'Swipe to play: free games instead of scrolling';
  const description = g
    ? `${g.tagline} Play ${g.title} free in your browser, then swipe up for the next game. No download, no sign up.`
    : `Scroll less, play more. Swipe through ${GAMES.length} free browser games like a video feed and play any of them instantly. No download, no sign up.`;
  return {
    title,
    description: metaDescription(description),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(itemListLd(`${SITE.name} play feed`, GAMES, '/play'))} />
      <h1 className="sr-only">{SITE.name} play feed: swipe to play free games</h1>
      {/* The feed itself is interactive; this list gives screen readers and crawlers every game. */}
      <nav className="sr-only" aria-label="All games in the feed">
        <p>
          Scroll less, play more: swipe through {GAMES.length} free browser games like a video feed and play any of them in one tap, with no download
          and no sign up.
        </p>
        <ul>
          {GAMES.map((g) => (
            <li key={g.slug}>
              <a href={`/games/${g.slug}`}>
                {g.title}: {g.tagline}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <PlayFeed games={games} start={start} />
    </>
  );
}
