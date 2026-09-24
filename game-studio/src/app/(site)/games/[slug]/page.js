import { notFound } from 'next/navigation';
import GamePage from '@/components/GamePage';
import { GAMES, getGame } from '@/lib/games';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
  const meta = getGame(params.slug);
  if (!meta) return {};
  const title = `${meta.title}: Play Free Online, No Download`;
  return {
    title,
    description: meta.description,
    keywords: [meta.title, `${meta.title} online`, `${meta.title} free`, ...(meta.tags || []), 'free online game', 'no download'],
    alternates: { canonical: `/games/${meta.slug}` },
    openGraph: {
      title: `${meta.emoji} ${meta.title} | ${SITE.name}`,
      description: meta.description,
      url: `/games/${meta.slug}`,
      images: [{ url: `/og/${meta.slug}.jpg`, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: { card: 'summary_large_image', title: `${meta.emoji} ${meta.title}`, description: meta.tagline, images: [`/og/${meta.slug}.jpg`] },
  };
}

export default function Page({ params }) {
  const meta = getGame(params.slug);
  if (!meta) notFound();
  return <GamePage meta={meta} />;
}
