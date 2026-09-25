import Link from 'next/link';
import GameCard from '@/components/GameCard';
import AdSlot from '@/components/AdSlot';
import { Countdown, NewsletterForm, RecentlyPlayed, TrackPageView } from '@/components/Widgets';
import { HeroCabinet, WelcomeBack, ChampionsTicker, ChampionsBoard } from '@/components/HomeLive';
import { RandomButton } from '@/components/Nav';
import { SponsorStrip } from '@/components/Money';
import { GAMES, gameOfTheDay, dailyGames, gamesByCategory, getGame } from '@/lib/games';
import { SITE, CATEGORIES } from '@/lib/site';
import { HOME_FAQ, itemListLd, faqLd, ld } from '@/lib/seo';

// Re-render hourly so the Game of the Day and Daily picks rotate (ISR).
export const revalidate = 3600;

function Rail({ id, title, blurb, games, cat, cols = 4 }) {
  if (!games.length) return null;
  return (
    <section id={id} className="mx-auto mt-12 max-w-7xl scroll-mt-20 px-4 sm:mt-16">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-arcade text-xl text-white sm:text-3xl">{title}</h2>
          {blurb && <p className="mt-1 text-sm text-white/60 sm:text-base">{blurb}</p>}
        </div>
        {cat && (
          <Link href={`/category/${cat}`} className="shrink-0 text-sm font-extrabold text-aqua hover:underline">
            See all →
          </Link>
        )}
      </div>
      <div className="rail rail-grid" style={{ '--cols': cols }}>
        {games.map((g, i) => (
          <GameCard key={g.slug} game={g} priority={i < 2} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const gotd = gameOfTheDay();
  const daily = dailyGames(new Date(), 4);
  const picks = [gotd, ...['stack-tower', 'juicy-drop', 'block-crush', 'color-rush'].map(getGame).filter((g) => g && g.slug !== gotd.slug)]
    .slice(0, 4)
    .map((g) => ({ slug: g.slug, title: g.title }));

  return (
    <>
      <TrackPageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(itemListLd(`${SITE.name} games`, GAMES, '/'))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd(HOME_FAQ))} />

      {/* HERO: headline + a real, playable game */}
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:pt-10">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-pink/15 px-3 py-1 text-[11px] font-black tracking-wider text-pink ring-1 ring-pink/30 sm:text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pink" /> {GAMES.length} FREE GAMES · NEW LEVELS EVERY DAY
            </div>
            <h1 className="mt-4 font-arcade text-[2.5rem] leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              <span className="neon-text">JUST ONE</span>
              <br />
              <span className="gradient-run glow-drop">MORE TRY.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/75 sm:text-lg">
              Games that start in one tap and end in “okay, one more.” No downloads, no sign-ups. Beat your best, grab today’s crown, and dare your friends to
              top it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
              <a href="#play" className="btn-pink px-5 py-3 lg:hidden">
                ▶ Play now
              </a>
              <Link href="/daily" className="btn-ghost px-4 py-3">
                📅 Daily arena
              </Link>
              <RandomButton
                label="Surprise me"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-3 font-display font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15"
              />
            </div>
            <WelcomeBack />
            <dl className="mt-6 hidden grid-cols-3 gap-3 sm:grid">
              {[
                [String(GAMES.length), 'games, all free'],
                ['1 sec', 'to start playing'],
                ['24h', 'fresh daily levels'],
              ].map(([n, l]) => (
                <div key={l} className="rounded-2xl bg-panel/70 p-3 ring-1 ring-line backdrop-blur">
                  <dt className="font-arcade text-2xl text-sun">{n}</dt>
                  <dd className="text-xs font-bold text-white/60">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div id="play" className="scroll-mt-20">
            <HeroCabinet picks={picks} />
          </div>
        </div>
      </section>

      <div className="mt-8 sm:mt-12">
        <ChampionsTicker />
      </div>

      <RecentlyPlayed />

      <Rail id="games" title="🕹️ ONE-TAP ARCADE" blurb={CATEGORIES.arcade.blurb} games={gamesByCategory('arcade')} cat="arcade" />

      {/* DAILY ARENA */}
      <section className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16">
        <div className="rounded-[28px] bg-gradient-to-br from-sun via-pink to-grape p-[2px]">
          <div className="rounded-[26px] bg-ink/95 p-4 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-arcade text-2xl text-white sm:text-4xl">📅 DAILY ARENA</h2>
                <p className="mt-1 max-w-md text-sm text-white/65 sm:text-base">Same level for every player on Earth. Post your best before the reset and keep your 🔥 streak alive.</p>
                <SponsorStrip className="mt-2" />
              </div>
              <div className="rounded-2xl bg-black/40 px-4 py-2 text-right ring-1 ring-line">
                <div className="text-[10px] font-black tracking-widest text-white/50">NEW LEVELS IN</div>
                <Countdown className="font-arcade text-2xl text-sun sm:text-3xl" />
              </div>
            </div>
            <div className="rail rail-grid mt-5" style={{ '--cols': 4 }}>
              {daily.map((g) => (
                <GameCard key={g.slug} game={g} href={`/games/${g.slug}?mode=daily`} badge="+15 XP" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Rail title="🧩 PUZZLES" blurb={CATEGORIES.puzzle.blurb} games={gamesByCategory('puzzle')} cat="puzzle" />

      <div className="mx-auto mt-10 max-w-7xl px-4">
        <AdSlot slot="homeInline" style={{ minHeight: 120 }} />
      </div>

      <Rail title="🃏 CLASSICS & WORDS" blurb="Timeless favorites plus a daily word puzzle to share." games={[...gamesByCategory('classic'), ...gamesByCategory('word')]} cat="classic" cols={3} />

      {/* CHAMPIONS */}
      <section className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-arcade text-xl text-white sm:text-3xl">👑 TODAY’S CHAMPIONS</h2>
            <p className="mt-1 text-sm text-white/60 sm:text-base">The top score in every game right now. Boards reset at midnight UTC.</p>
          </div>
          <Link href="/leaderboards" className="shrink-0 text-sm font-extrabold text-aqua hover:underline">
            All boards →
          </Link>
        </div>
        <ChampionsBoard />
      </section>

      {/* WHY */}
      <section className="mx-auto mt-12 grid max-w-7xl gap-3 px-4 sm:mt-16 sm:grid-cols-3 sm:gap-4">
        {[
          ['⚡', 'Instant play', 'Every game is tiny and loads in about a second. Tap and you’re in.'],
          ['⚔️', 'Dare your friends', 'Share any score as a challenge link. They see exactly what they need to beat.'],
          ['🔥', 'Streaks & medals', 'Earn XP, level up, collect medals and keep your daily streak burning.'],
        ].map(([e, t, d]) => (
          <div key={t} className="card flex gap-4 p-5 sm:block sm:p-6">
            <div className="text-3xl">{e}</div>
            <div>
              <div className="font-display text-lg font-bold sm:mt-2 sm:text-xl">{t}</div>
              <p className="mt-1 text-sm text-white/60 sm:text-base">{d}</p>
            </div>
          </div>
        ))}
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="card flex flex-col items-start gap-4 bg-gradient-to-r from-grape/30 to-pink/20 p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-arcade text-xl sm:text-2xl">NEW GAME EVERY WEEK 🎁</h2>
            <p className="text-sm text-white/70 sm:text-base">Be first to play new releases and weekly tournaments.</p>
          </div>
          <NewsletterForm src="home" />
        </div>
      </section>

      {/* FAQ: short direct answers for searchers and AI assistants */}
      <section className="mx-auto mt-14 max-w-4xl px-4">
        <h2 className="font-arcade text-xl text-white sm:text-2xl">QUESTIONS PLAYERS ASK</h2>
        <div className="mt-4 space-y-2">
          {HOME_FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-panel/70 p-4 ring-1 ring-line">
              <summary className="cursor-pointer list-none font-bold text-white">
                {q}
                <span className="float-right text-white/40 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-white/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* SEO copy */}
      <section className="mx-auto mt-14 max-w-4xl px-4 text-sm text-white/55 sm:text-base">
        <h2 className="font-display text-lg font-bold text-white sm:text-xl">Free online games, no download needed</h2>
        <p className="mt-3 leading-relaxed">
          {SITE.name} is a collection of free browser games built to be picked up in seconds and hard to put down. Play one-tap arcade games like Stack Tower, Sky
          Flap and Blade Spin, relax with puzzle games like Block Crush, Juicy Drop and 2048, or keep your mind sharp with Sudoku, Solitaire and the daily Wordy
          challenge. Every game works on phones, tablets, Chromebooks and computers, with nothing to install.
        </p>
        <p className="mt-3 leading-relaxed">
          Each game has a Daily Challenge where every player gets the exact same level, plus global leaderboards, medals and streaks. Finished a great run? Send
          it to a friend as a challenge link and see who really has the fastest fingers.
        </p>
      </section>
    </>
  );
}
