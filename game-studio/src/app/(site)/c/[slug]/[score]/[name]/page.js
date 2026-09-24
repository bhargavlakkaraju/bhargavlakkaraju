// Challenge links: /c/<slug>/<score>/<name>. Shared from the game-over panel. The OG
// image shows the score to beat, and the game opens with that target on screen.
import { notFound } from 'next/navigation';
import GamePage from '@/components/GamePage';
import { getGame, formatScore } from '@/lib/games';
import { cleanName } from '@/lib/server';
import { SITE } from '@/lib/site';

function parse(params) {
  const meta = getGame(params.slug);
  const score = Number(decodeURIComponent(params.score));
  if (!meta || !Number.isFinite(score) || score < 0 || score > (meta.maxScore ?? 1e7)) return null;
  const name = cleanName(decodeURIComponent(params.name)) || 'A friend';
  return { meta, challenge: { score, name } };
}

export function generateMetadata({ params }) {
  const p = parse(params);
  if (!p) return {};
  const { meta, challenge } = p;
  const s = formatScore(meta, challenge.score);
  const title = `${challenge.name} scored ${s} in ${meta.title}. Can you beat it?`;
  const og = `/api/og?slug=${meta.slug}&score=${encodeURIComponent(challenge.score)}&name=${encodeURIComponent(challenge.name)}`;
  return {
    title,
    description: `${meta.emoji} ${meta.tagline} Play ${meta.title} free on ${SITE.name} and beat ${challenge.name}'s ${s}.`,
    alternates: { canonical: `/games/${meta.slug}` },
    robots: { index: false, follow: true },
    openGraph: { title, description: meta.tagline, images: [{ url: og, width: 720, height: 378 }] },
    twitter: { card: 'summary_large_image', title, images: [og] },
  };
}

export default function Page({ params }) {
  const p = parse(params);
  if (!p) notFound();
  return <GamePage meta={p.meta} challenge={p.challenge} />;
}
