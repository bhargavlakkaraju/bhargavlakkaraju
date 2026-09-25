import { notFound } from 'next/navigation';
import GameCard from '@/components/GameCard';
import { TrackPageView } from '@/components/Widgets';
import { gamesByCategory } from '@/lib/games';
import { CATEGORIES } from '@/lib/site';
import { CATEGORY_COPY, itemListLd, faqLd, breadcrumbLd, ld } from '@/lib/seo';

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
  const copy = CATEGORY_COPY[params.cat];
  const path = `/category/${params.cat}`;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <TrackPageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(itemListLd(`Free ${c.name} Games`, games, path))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(breadcrumbLd([['Games', '/'], [`${c.name} games`, path]]))} />
      {copy && <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd(copy.faq))} />}
      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        {c.emoji} Free {c.name} Games
      </h1>
      <p className="mt-2 max-w-3xl text-white/70">{copy ? copy.intro : c.blurb}</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {games.map((g, i) => (
          <GameCard key={g.slug} game={g} priority={i < 4} />
        ))}
      </div>
      {copy && (
        <section className="prose-game mt-12 max-w-3xl">
          <h2 className="!mt-0">About our {c.name.toLowerCase()} games</h2>
          {copy.more.map((p) => (
            <p key={p} className="mt-3">
              {p}
            </p>
          ))}
          <h2>Frequently asked questions</h2>
          <div className="mt-3 space-y-3">
            {copy.faq.map(([q, a]) => (
              <details key={q} className="group rounded-2xl bg-white/5 p-4" open>
                <summary className="cursor-pointer list-none font-bold text-white">{q}</summary>
                <p className="mt-2">{a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
