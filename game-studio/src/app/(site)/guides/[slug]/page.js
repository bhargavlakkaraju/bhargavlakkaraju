import Link from 'next/link';
import { notFound } from 'next/navigation';
import GamePlayer from '@/components/GamePlayer';
import { TrackPageView } from '@/components/Widgets';
import { GUIDES, getGuide } from '@/lib/guides';
import { getGame } from '@/lib/games';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.filter((g) => getGame(g.game)).map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
  const g = getGuide(params.slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: 'article', title: g.title, description: g.description, images: [{ url: `/og/${g.game}.png`, width: 1200, height: 630 }] },
  };
}

export default function GuidePage({ params }) {
  const g = getGuide(params.slug);
  const game = g && getGame(g.game);
  if (!g || !game) notFound();
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    datePublished: g.published,
    image: `${SITE.url}/og/${g.game}.png`,
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png` } },
    mainEntityOfPage: `${SITE.url}/guides/${g.slug}`,
  };
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <TrackPageView game={g.game} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/guides" className="text-sm font-bold text-white/50 hover:text-white">
        ← All guides
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight">{g.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-white/75">{g.intro}</p>
      <article className="prose-game mt-2">
        {g.sections.map((s, i) => (
          <section key={i}>
            <h2>{s.h}</h2>
            {(s.p || []).map((t, j) => (
              <p key={j} className="mt-3">
                {t}
              </p>
            ))}
            {s.ol && (
              <ol>
                {s.ol.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ol>
            )}
            {s.ul && (
              <ul>
                {s.ul.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <p className="mt-6 font-bold text-white">{g.outro}</p>
      </article>
      <div className="mt-6">
        <GamePlayer slug={game.slug} />
      </div>
      <div className="mt-4 text-center">
        <Link href={`/games/${game.slug}`} className="btn-ghost">
          {game.emoji} Open {game.title} full page
        </Link>
      </div>
    </div>
  );
}
