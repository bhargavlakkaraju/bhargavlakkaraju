import Link from 'next/link';
import GameCard from '@/components/GameCard';
import AdSlot from '@/components/AdSlot';
import { Countdown, NewsletterForm, RecentlyPlayed, TrackPageView } from '@/components/Widgets';
import { GAMES, gameOfTheDay, dailyGames, gamesByCategory } from '@/lib/games';
import { SITE, CATEGORIES } from '@/lib/site';

// Re-render hourly so the Game of the Day and Daily picks rotate (ISR).
export const revalidate = 3600;

function Section({ id, title, blurb, games, action }) {
  if (!games.length) return null;
  return (
    <section id={id} className="mx-auto mt-14 max-w-7xl scroll-mt-20 px-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {blurb && <p className="mt-1 text-white/60">{blurb}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {games.map((g, i) => (
          <GameCard key={g.slug} game={g} priority={i < 4} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const gotd = gameOfTheDay();
  const daily = dailyGames(new Date(), 4);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
  };
  return (
    <>
      <TrackPageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-6 px-4 pt-5 sm:gap-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="chip mb-3 bg-pink/15 text-pink sm:mb-4">🔥 {GAMES.length} free games · new daily challenges</div>
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Just one
            <br />
            <span className="bg-gradient-to-r from-pink via-sun to-aqua bg-clip-text text-transparent">more try.</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/70 sm:mt-5 sm:text-lg">
            Instant, addictive games that load in a second on any phone or computer. No downloads, no sign-ups. Beat your best, climb the leaderboards and
            challenge your friends.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <Link href={`/games/${gotd.slug}`} className="btn-pink px-5 py-3 sm:px-7 sm:py-4 sm:text-lg">
              ▶ Play {gotd.title}
            </Link>
            <Link href="/daily" className="btn-ghost px-4 py-3 sm:px-6 sm:py-4 sm:text-lg">
              📅 Today’s challenges
            </Link>
          </div>
          <div className="mt-6 hidden flex-wrap gap-4 text-sm font-bold text-white/50 sm:flex">
            <span>⚡ Loads instantly</span>
            <span>📱 Phone & desktop</span>
            <span>🏆 Global leaderboards</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-pink/25 via-grape/20 to-aqua/20 blur-2xl" />
          <GameCard game={gotd} size="lg" badge="⭐ GAME OF THE DAY" priority />
        </div>
      </section>

      {/* DAILY */}
      <section className="mx-auto mt-12 max-w-7xl px-4">
        <div className="card overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">📅 Daily Challenges</h2>
              <p className="text-sm text-white/60">Same levels for everyone today. Post your best before the reset.</p>
            </div>
            <div className="rounded-2xl bg-ink/70 px-4 py-2 text-right">
              <div className="text-[10px] font-extrabold tracking-widest text-white/40">NEW CHALLENGES IN</div>
              <Countdown className="text-xl font-bold text-sun" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {daily.map((g) => (
              <GameCard key={g.slug} game={g} href={`/games/${g.slug}?mode=daily`} badge="DAILY" />
            ))}
          </div>
        </div>
      </section>

      <RecentlyPlayed />

      <Section id="games" title="🕹️ Arcade: one-tap addictive" blurb={CATEGORIES.arcade.blurb} games={gamesByCategory('arcade')} />

      <div className="mx-auto mt-10 max-w-7xl px-4">
        <AdSlot slot="homeInline" style={{ minHeight: 120 }} />
      </div>

      <Section title="🧩 Puzzles" blurb={CATEGORIES.puzzle.blurb} games={gamesByCategory('puzzle')} />
      <Section
        title="🃏 Classics & word games"
        blurb="Timeless favorites plus a daily word puzzle to share with friends."
        games={[...gamesByCategory('classic'), ...gamesByCategory('word')]}
      />

      {/* WHY */}
      <section className="mx-auto mt-16 grid max-w-7xl gap-4 px-4 md:grid-cols-3">
        {[
          ['⚡', 'Instant play', 'Every game is tiny and loads in about a second. Tap and you’re playing.'],
          ['⚔️', 'Challenge friends', 'Share any score as a challenge link. They see exactly what they need to beat.'],
          ['🔥', 'Streaks & medals', 'Earn XP, level up, collect medals and keep your daily streak alive.'],
        ].map(([e, t, d]) => (
          <div key={t} className="card p-6">
            <div className="text-3xl">{e}</div>
            <div className="mt-2 font-display text-xl font-bold">{t}</div>
            <p className="mt-1 text-white/60">{d}</p>
          </div>
        ))}
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="card flex flex-col items-start gap-4 bg-gradient-to-r from-grape/30 to-pink/20 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">New game every week 🎁</h2>
            <p className="text-white/70">Be the first to play new releases and weekly tournaments.</p>
          </div>
          <NewsletterForm src="home" />
        </div>
      </section>

      {/* SEO copy */}
      <section className="mx-auto mt-14 max-w-4xl px-4 text-white/60">
        <h2 className="font-display text-xl font-bold text-white">Free online games, no download needed</h2>
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
