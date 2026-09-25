import Link from 'next/link';
import GameCard from '@/components/GameCard';
import AdSlot from '@/components/AdSlot';
import { Countdown, NewsletterForm, RecentlyPlayed, TrackPageView } from '@/components/Widgets';
import { HeroCabinet, WelcomeBack, ChampionsTicker, ChampionsBoard, GameBrowser } from '@/components/HomeLive';
import { SponsorStrip } from '@/components/Money';
import { SearchBar } from '@/components/Search';
import { IconArrow, IconPlay } from '@/components/Icons';
import { GAMES, gameOfTheDay, dailyGames, getGame, publicMeta } from '@/lib/games';
import { SITE, CATEGORIES } from '@/lib/site';
import { HOME_FAQ, itemListLd, faqLd, ld } from '@/lib/seo';

// Re-render hourly so the Game of the Day and Daily picks rotate (ISR).
export const revalidate = 3600;

function SectionHead({ title, sub, href, cta }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="h-section">{title}</h2>
        {sub && <p className="h-sub">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="pill-link hidden sm:inline-flex">
          {cta} <IconArrow className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// Big feature card: image on top, bold caption underneath.
function Feature({ href, img, kicker, title, text }) {
  return (
    <Link href={href} className="group block">
      <div className="tile aspect-[16/9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="h-full w-full object-cover" loading="eager" width={800} height={450} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="badge absolute left-3 top-3 bg-pink text-white">{kicker}</span>
      </div>
      <div className="mt-2.5 font-cond text-xl font-extrabold uppercase leading-tight text-white group-hover:text-pink sm:text-[22px]">{title}</div>
      <div className="truncate text-sm text-mute">{text}</div>
    </Link>
  );
}

// Quick-access card: game art on top (stretches to fill), name and one line below.
function Quick({ game, label }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card p-2 ring-1 ring-line transition hover:bg-raised hover:ring-white/20"
    >
      <div className="relative min-h-[90px] flex-1 overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/covers/${game.slug}.webp`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{CATEGORIES[game.category]?.name}</span>
      </div>
      <div className="px-1.5 pb-1 pt-2.5">
        <div className="flex items-center gap-2 font-cond text-xl font-extrabold uppercase leading-none text-white">
          {game.title}
          {label && <span className="badge bg-pink text-white">{label}</span>}
        </div>
        <div className="mt-1 truncate text-xs text-mute">{game.tagline}</div>
      </div>
    </Link>
  );
}

// Mobile "what will you play?" tiles, one per category.
const CAT_ART = { arcade: 'stack-tower', puzzle: 'juicy-drop', classic: 'solitaire', word: 'wordy' };
function CategoryTile({ id }) {
  const c = CATEGORIES[id];
  return (
    <Link href={`/category/${id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-pink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/covers/${CAT_ART[id]}.webp`}
          alt=""
          className="absolute left-[14%] top-[10%] h-[100%] w-[110%] rotate-[-7deg] rounded-xl object-cover shadow-xl transition duration-300 group-hover:rotate-[-3deg]"
          loading="lazy"
        />
      </div>
      <div className="mt-2 text-center text-sm font-extrabold text-white">{c.name}</div>
    </Link>
  );
}

export default function Home() {
  const gotd = gameOfTheDay();
  const daily = dailyGames(new Date(), 4);
  const picks = [gotd, ...['stack-tower', 'juicy-drop', 'block-crush', 'color-rush'].map(getGame).filter((g) => g && g.slug !== gotd.slug)]
    .slice(0, 4)
    .map((g) => ({ slug: g.slug, title: g.title }));
  const quick = [gotd, ...['stack-tower', 'juicy-drop', 'block-crush', 'wordy', 'solitaire', 'sky-flap'].map(getGame)]
    .filter((g, i, a) => g && a.findIndex((x) => x && x.slug === g.slug) === i)
    .slice(0, 6);
  // A different game from the Game of the Day, so the three cards never repeat art.
  const challenge = getGame(gotd.slug === 'stack-tower' ? 'juicy-drop' : 'stack-tower');
  const dailyArt = daily.find((g) => g.slug !== gotd.slug && g.slug !== challenge.slug) || getGame('sudoku');

  return (
    <>
      <TrackPageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(itemListLd(`${SITE.name} games`, GAMES, '/'))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd(HOME_FAQ))} />

      <div className="mx-auto max-w-[1440px] px-4">
        {/* Intro: what this is, in one line, with the two main actions */}
        <section className="flex flex-wrap items-end justify-between gap-4 pt-5 sm:pt-8">
          <div className="min-w-0">
            <h1 className="font-cond text-[2.35rem] font-extrabold uppercase leading-[0.92] text-white sm:text-6xl">
              Free games. <span className="text-pink">Just one more try.</span>
            </h1>
            <p className="mt-2 max-w-xl text-[15px] text-mute sm:text-base">
              {GAMES.length} games that start in one tap. No downloads, no sign-ups: beat your best, grab today’s crown, dare your friends.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Link href="/daily" className="btn-ghost">
              📅 Daily arena
            </Link>
            <Link href={`/games/${gotd.slug}`} className="btn-pink">
              <IconPlay className="h-4 w-4" /> Play game of the day
            </Link>
          </div>
        </section>

        <SearchBar className="mt-4 md:hidden" />

        <div className="mt-4 empty:hidden">
          <WelcomeBack />
        </div>

        {/* Feature cards */}
        <section className="mt-5 sm:mt-7">
          <div className="rail rail-grid" style={{ '--cols': 3 }}>
            <Feature href={`/games/${gotd.slug}`} img={`/covers/${gotd.slug}.webp`} kicker="Game of the day" title={gotd.title} text={gotd.tagline} />
            <Feature
              href="/daily"
              img={`/covers/${dailyArt.slug}.webp`}
              kicker="Daily arena"
              title="Same levels for everyone"
              text="New levels every day at midnight UTC. Keep your streak alive."
            />
            <Feature
              href={`/games/${challenge.slug}`}
              img={`/covers/${challenge.slug}.webp`}
              kicker="Dare a friend"
              title={`Beat my score in ${challenge.title}`}
              text="Every run can be sent as a challenge link."
            />
          </div>
        </section>

        {/* Phones: pick a kind of game */}
        <section className="mt-9 lg:hidden">
          <h2 className="h-section">What will you play?</h2>
          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {Object.keys(CAT_ART).map((id) => (
              <CategoryTile key={id} id={id} />
            ))}
          </div>
        </section>

        {/* Desktop: play right here + quick access */}
        <section id="play" className="mt-10 hidden scroll-mt-20 gap-5 lg:grid lg:grid-cols-[1.15fr_1fr]">
          <HeroCabinet picks={picks} />
          <div className="grid grid-cols-2 grid-rows-3 gap-3 xl:grid-cols-3 xl:grid-rows-2">
            {quick.map((g, i) => (
              <Quick key={g.slug} game={g} label={i === 0 ? 'Today' : null} />
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <ChampionsTicker />
      </div>

      <div className="mx-auto max-w-[1440px] px-4">
        <RecentlyPlayed />

        {/* Everything, filterable */}
        <section id="games" className="mt-12 scroll-mt-20">
          <SectionHead title="All games" sub="Tap a category to filter. Every game is free and works on any screen." href="/best" cta="Best of lists" />
          <GameBrowser games={GAMES.map(publicMeta)} cats={Object.entries(CATEGORIES).map(([id, c]) => ({ id, name: c.name, emoji: c.emoji }))} />
        </section>

        {/* Daily arena */}
        <section className="mt-14">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="h-section">Daily arena</h2>
              <p className="h-sub">Same level for every player on Earth. Post your best before the reset.</p>
              <SponsorStrip className="mt-2" />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-2 ring-1 ring-line">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-mute">New levels in</span>
              <Countdown className="font-cond text-2xl font-extrabold text-sun" />
            </div>
          </div>
          <div className="rail rail-grid" style={{ '--cols': 4 }}>
            {daily.map((g) => (
              <GameCard key={g.slug} game={g} href={`/games/${g.slug}?mode=daily`} badge="+15 XP" />
            ))}
          </div>
        </section>

        <div className="mt-12">
          <AdSlot slot="homeInline" style={{ minHeight: 120 }} />
        </div>

        {/* Champions */}
        <section className="mt-12">
          <SectionHead title="Today’s champions" sub="The top score in every game right now. Boards reset at midnight UTC." href="/leaderboards" cta="All boards" />
          <ChampionsBoard />
        </section>

        {/* Why */}
        <section className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            ['⚡', 'Instant play', 'Every game is tiny and loads in about a second. Tap and you’re in.'],
            ['⚔️', 'Dare your friends', 'Share any score as a challenge link. They see exactly what they need to beat.'],
            ['🔥', 'Streaks & medals', 'Earn XP, level up, collect medals and keep your daily streak burning.'],
          ].map(([e, t, d]) => (
            <div key={t} className="card flex gap-4 p-5">
              <div className="text-2xl">{e}</div>
              <div>
                <div className="font-cond text-xl font-extrabold uppercase">{t}</div>
                <p className="mt-0.5 text-sm text-mute">{d}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Newsletter */}
        <section className="mt-6">
          <div className="card flex flex-col items-start gap-4 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-cond text-2xl font-extrabold uppercase sm:text-3xl">New game every week 🎁</h2>
              <p className="text-sm text-mute sm:text-base">Be first to play new releases and weekly tournaments.</p>
            </div>
            <NewsletterForm src="home" />
          </div>
        </section>

        {/* FAQ: short direct answers for searchers and AI assistants */}
        <section className="mx-auto mt-14 max-w-4xl">
          <h2 className="h-section">Questions players ask</h2>
          <div className="mt-4 space-y-2">
            {HOME_FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl bg-panel p-4 ring-1 ring-line">
                <summary className="cursor-pointer list-none font-bold text-white">
                  {q}
                  <span className="float-right text-mute transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-white/70">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* SEO copy */}
        <section className="mx-auto mt-14 max-w-4xl text-sm text-mute sm:text-base">
          <h2 className="font-cond text-2xl font-extrabold uppercase text-white">Free online games, no download needed</h2>
          <p className="mt-3 leading-relaxed">
            {SITE.name} is a collection of free browser games built to be picked up in seconds and hard to put down. Play one-tap arcade games like Stack Tower,
            Sky Flap and Blade Spin, relax with puzzle games like Block Crush, Juicy Drop and 2048, or keep your mind sharp with Sudoku, Solitaire and the daily
            Wordy challenge. Every game works on phones, tablets, Chromebooks and computers, with nothing to install.
          </p>
          <p className="mt-3 leading-relaxed">
            Each game has a Daily Challenge where every player gets the exact same level, plus global leaderboards, medals and streaks. Finished a great run?
            Send it to a friend as a challenge link and see who really has the fastest fingers.
          </p>
        </section>
      </div>
    </>
  );
}
