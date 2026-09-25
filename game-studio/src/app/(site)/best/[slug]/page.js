import Link from 'next/link';
import { notFound } from 'next/navigation';
import GameCard from '@/components/GameCard';
import { TrackPageView } from '@/components/Widgets';
import { COLLECTIONS, getCollection } from '@/lib/collections';
import { getGame } from '@/lib/games';
import { guidesFor } from '@/lib/guides';
import { SITE, CATEGORIES } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

// Picks whose game exists (a removed game never breaks the page).
function picksOf(c) {
  return c.picks.map((p) => ({ ...p, meta: getGame(p.game) })).filter((p) => p.meta);
}

// "Games Like Wordle: Free Daily ..." -> "Games Like Wordle"
const shortTitle = (c) => c.title.split(':')[0];

export function generateMetadata({ params }) {
  const c = getCollection(params.slug);
  if (!c) return {};
  const first = picksOf(c)[0];
  const image = first ? `/og/${first.game}.jpg` : '/og/site.jpg';
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: { canonical: `/best/${c.slug}` },
    openGraph: {
      type: 'article',
      siteName: SITE.name,
      title: c.metaTitle,
      description: c.description,
      url: `/best/${c.slug}`,
      publishedTime: c.published,
      images: [{ url: image, width: 1200, height: 630, alt: c.title }],
    },
    twitter: { card: 'summary_large_image', title: c.metaTitle, description: c.description, images: [image] },
  };
}

function JsonLd({ c, picks }) {
  const url = `${SITE.url}/best/${c.slug}`;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: c.title,
      description: c.description,
      url,
      numberOfItems: picks.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: picks.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/games/${p.game}`, name: p.meta.title })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Game collections', item: `${SITE.url}/best` },
        { '@type': 'ListItem', position: 3, name: shortTitle(c), item: url },
      ],
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function CollectionPage({ params }) {
  const c = getCollection(params.slug);
  if (!c) notFound();
  const picks = picksOf(c);
  const others = COLLECTIONS.filter((o) => o.slug !== c.slug);
  const updated = c.updated || c.published;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:pt-10">
      <TrackPageView />
      <JsonLd c={c} picks={picks} />

      <nav aria-label="Breadcrumb" className="text-sm font-bold text-white/50">
        <Link href="/" className="hover:text-white">
          Home
        </Link>
        <span className="mx-2 text-white/30">/</span>
        <Link href="/best" className="hover:text-white">
          Collections
        </Link>
      </nav>

      <h1 className="mt-3 font-cond text-[2.6rem] font-extrabold uppercase leading-[0.95] sm:text-6xl">{c.title}</h1>
      <p className="mt-2 text-sm text-white/40">
        {picks.length} free games · Updated <time dateTime={updated}>{updated}</time>
      </p>

      {/* The direct answer: short, factual, quotable by search snippets and AI assistants. */}
      <section aria-label="Quick answer" className="mt-6 rounded-3xl bg-gradient-to-br from-pink/20 via-grape/15 to-aqua/10 p-5 ring-1 ring-pink/40 sm:p-6">
        <div className="font-cond text-sm font-extrabold uppercase tracking-wider text-sun">Quick answer</div>
        <p className="mt-2 text-lg leading-relaxed text-white/90">{c.answer}</p>
      </section>

      <h2 className="section-title mt-10">Our {picks.length} picks</h2>
      <ol className="mt-4 space-y-4">
        {picks.map((p, i) => {
          const cat = CATEGORIES[p.meta.category];
          const guide = guidesFor(p.game)[0];
          return (
            <li key={p.game} className="card grid gap-4 p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center sm:p-5">
              <GameCard game={p.meta} priority={i < 2} />
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink font-cond text-lg font-extrabold text-white shadow-pop" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                    <Link href={`/games/${p.game}`} className="hover:text-pink">
                      {p.meta.emoji} {p.meta.title}
                    </Link>
                  </h3>
                </div>
                <p className="mt-2 text-xs font-bold text-white/50">
                  {cat?.emoji} {cat?.name} · {p.meta.tagline}
                </p>
                <p className="mt-2 leading-relaxed text-white/75">{p.why}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-extrabold">
                  <Link href={`/games/${p.game}`} className="text-aqua hover:underline">
                    ▶ Play {p.meta.title} free
                  </Link>
                  {guide && (
                    <Link href={`/guides/${guide.slug}`} className="text-white/60 hover:text-white hover:underline">
                      📚 Read the guide
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <article className="prose-game card mt-10 p-6 sm:p-8">
        {c.sections.map((s, i) => (
          <section key={i}>
            <h2 className={i === 0 ? '!mt-0' : undefined}>{s.h}</h2>
            {(s.p || []).map((t, j) => (
              <p key={j} className="mt-3">
                {t}
              </p>
            ))}
            {s.ul && (
              <ul>
                {s.ul.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <h2>Frequently asked questions</h2>
        <div className="mt-3 space-y-3">
          {c.faq.map((f, i) => (
            <details key={i} className="group rounded-2xl bg-white/5 p-4" open={i === 0}>
              <summary className="cursor-pointer list-none font-bold text-white">
                {f.q}
                <span className="float-right text-white/40 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2">{f.a}</p>
            </details>
          ))}
        </div>

        {c.ref && (
          <p className="mt-6 !text-xs !text-white/40">
            {c.ref} is a trademark of its respective owner. {SITE.name} is not affiliated with it; the name is used only to describe similar games. All games
            listed here are original {SITE.name} games.
          </p>
        )}
      </article>

      <section className="mt-10">
        <h2 className="section-title">More game collections</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map((o) => (
            <Link key={o.slug} href={`/best/${o.slug}`} className="chip px-3 py-1.5 text-sm hover:bg-white/20 hover:text-white">
              {shortTitle(o)}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/best" className="btn-ghost">
            All collections
          </Link>
          <Link href="/#games" className="btn-ghost">
            All games →
          </Link>
        </div>
      </section>
    </div>
  );
}
