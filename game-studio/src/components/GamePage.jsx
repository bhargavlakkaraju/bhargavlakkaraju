import Link from 'next/link';
import GamePlayer from './GamePlayer';
import GameCard from './GameCard';
import Leaderboard from './Leaderboard';
import AdSlot from './AdSlot';
import { EmbedCode, TrackPageView } from './Widgets';
import { related, formatScore, MEDALS } from '@/lib/games';
import { SITE, CATEGORIES } from '@/lib/site';
import { guidesFor } from '@/lib/guides';
import { collectionsFor } from '@/lib/collections';

function JsonLd({ meta }) {
  const url = `${SITE.url}/games/${meta.slug}`;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: meta.title,
      url,
      description: meta.description,
      image: `${SITE.url}/covers/${meta.slug}.jpg`,
      genre: CATEGORIES[meta.category]?.name,
      gamePlatform: ['Web browser', 'Mobile', 'Desktop'],
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      playMode: 'SinglePlayer',
      isAccessibleForFree: true,
      inLanguage: 'en',
      datePublished: meta.released,
      publisher: { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: SITE.url },
      author: { '@id': `${SITE.url}/#org` },
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (meta.faq || []).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Games', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: CATEGORIES[meta.category]?.name, item: `${SITE.url}/category/${meta.category}` },
        { '@type': 'ListItem', position: 3, name: meta.title, item: url },
      ],
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function GamePage({ meta, challenge = null }) {
  const cat = CATEGORIES[meta.category];
  const more = related(meta.slug, 8);
  return (
    <>
      <JsonLd meta={meta} />
      <TrackPageView game={meta.slug} />
      {/* Cinematic backdrop from the game's own art */}
      <div className="pointer-events-none absolute inset-x-0 top-14 -z-10 h-[560px] overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/covers/${meta.slug}.webp`} alt="" className="h-full w-full scale-125 object-cover opacity-35 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/70 to-ink" />
      </div>
      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4">
        {challenge && (
          <div className="mb-3 rounded-2xl bg-gradient-to-r from-pink/30 to-grape/30 px-3 py-2 text-center font-display text-sm font-bold ring-1 ring-pink/40 sm:px-4 sm:py-3 sm:text-lg">
            ⚔️ {challenge.name} scored <span className="text-sun">{formatScore(meta, challenge.score)}</span> in {meta.title}. Can you beat it?
          </div>
        )}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[160px_minmax(0,1fr)_340px]">
          <aside className="hidden xl:block">
            <div className="sticky top-20">
              <AdSlot slot="rail" format="vertical" style={{ minHeight: 600 }} />
            </div>
          </aside>

          <div className="min-w-0">
            <GamePlayer slug={meta.slug} challenge={challenge} />
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-arcade text-sm text-white/80">UP NEXT</div>
                <Link href="/#games" className="text-xs font-extrabold text-aqua hover:underline">
                  All games →
                </Link>
              </div>
              <div className="rail" style={{ gridAutoColumns: 'minmax(42%, 1fr)' }}>
                {more.slice(0, 6).map((g) => (
                  <GameCard key={g.slug} game={g} />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <div className="text-4xl">{meta.emoji}</div>
                <div>
                  <h1 className="font-display text-2xl font-bold leading-tight text-white">{meta.title}</h1>
                  <div className="text-sm text-white/70">{meta.tagline}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Link href={`/category/${meta.category}`} className="chip hover:bg-white/20">
                      {cat?.emoji} {cat?.name}
                    </Link>
                    {meta.daily !== false && <span className="chip">📅 Daily</span>}
                    <span className="chip">📱 Mobile</span>
                  </div>
                </div>
              </div>
              {meta.medals && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {meta.medals.map((t, i) => (
                    <div key={i} className="rounded-xl bg-white/5 py-2">
                      <div className="text-xl">{MEDALS[i + 1]}</div>
                      <div className="text-xs font-bold text-white/70">
                        {meta.lowerIsBetter ? '≤ ' : ''}
                        {formatScore(meta, t)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-5">
              <div className="mb-3 font-display text-lg font-bold">🏆 Leaderboard</div>
              <Leaderboard slug={meta.slug} />
            </div>
            <AdSlot slot="gameSide" style={{ minHeight: 250 }} />
          </aside>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="prose-game card p-6 sm:p-8">
            <p className="!mt-0 text-base text-white/85">
              <strong className="text-white">{meta.title}</strong> is a free {meta.category} browser game for phone, tablet and
              computer. {meta.description}
            </p>
            <h2>How to play {meta.title}</h2>
            <ol>
              {meta.howTo.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <h2>Controls</h2>
            <ul>
              {meta.controls.touch && (
                <li>
                  <b className="text-white">Phone/tablet:</b> {meta.controls.touch}
                </li>
              )}
              {meta.controls.mouse && (
                <li>
                  <b className="text-white">Mouse:</b> {meta.controls.mouse}
                </li>
              )}
              {meta.controls.keyboard && (
                <li>
                  <b className="text-white">Keyboard:</b> {meta.controls.keyboard}
                </li>
              )}
            </ul>
            <h2>Tips to get a higher score</h2>
            <ul>
              {meta.tips.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <h2>About {meta.title}</h2>
            <p className="mt-3">{meta.about}</p>
            {guidesFor(meta.slug).map((gd) => (
              <p key={gd.slug} className="mt-4">
                📚 Strategy guide:{' '}
                <Link href={`/guides/${gd.slug}`} className="font-bold text-aqua underline">
                  {gd.title}
                </Link>
              </p>
            ))}
            {collectionsFor(meta.slug).length > 0 && (
              <p className="mt-4">
                ⭐ Featured in:{' '}
                {collectionsFor(meta.slug).map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 && ', '}
                    <Link href={`/best/${c.slug}`} className="font-bold text-aqua underline">
                      {c.title.split(':')[0]}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <h2>FAQ</h2>
            <div className="mt-3 space-y-3">
              {meta.faq.map((f, i) => (
                <details key={i} className="group rounded-2xl bg-white/5 p-4" open={i === 0}>
                  <summary className="cursor-pointer list-none font-bold text-white">
                    {f.q}
                    <span className="float-right text-white/40 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </article>
          <aside className="space-y-4">
            <AdSlot slot="gameBelow" style={{ minHeight: 250 }} />
            <div className="card p-5">
              <div className="font-display text-lg font-bold">🧩 Put {meta.title} on your site</div>
              <p className="mb-3 mt-1 text-sm text-white/60">Free to embed. Paste this into any web page or blog.</p>
              <EmbedCode slug={meta.slug} url={SITE.url} />
            </div>
          </aside>
        </div>

        <section className="mt-12">
          <h2 className="section-title">More games you’ll love</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {more.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
