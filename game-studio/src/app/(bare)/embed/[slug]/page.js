// Embeddable player for other websites (iframe). No ads (AdSense policy), a backlink
// bar to the arcade, and cross-promotion on game over. Every embed = free distribution.
import { notFound } from 'next/navigation';
import GamePlayer from '@/components/GamePlayer';
import { TrackPageView } from '@/components/Widgets';
import { GAMES, getGame } from '@/lib/games';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
  const meta = getGame(params.slug);
  if (!meta) return {};
  return {
    title: `${meta.title} | ${SITE.name}`,
    alternates: { canonical: `/games/${meta.slug}` },
    robots: { index: false, follow: true },
  };
}

export default function EmbedPage({ params }) {
  const meta = getGame(params.slug);
  if (!meta) notFound();
  return (
    <div className="flex h-[100svh] flex-col bg-ink">
      <TrackPageView game={meta.slug} />
      <div className="min-h-0 flex-1">
        <GamePlayer slug={meta.slug} embed />
      </div>
      <a
        href={`${SITE.url}/games/${meta.slug}?utm_source=embed&utm_campaign=${meta.slug}`}
        target="_blank"
        rel="noopener"
        className="flex h-9 shrink-0 items-center justify-center gap-2 bg-gradient-to-r from-pink to-grape text-xs font-extrabold text-white"
      >
        ↻ {meta.title} on {SITE.name}: play {GAMES.length}+ free games ↗
      </a>
    </div>
  );
}
