import Link from 'next/link';
import { SITE } from '@/lib/site';
import { GAMES } from '@/lib/games';
import { ld, breadcrumbLd, faqLd } from '@/lib/seo';
import { ClipStage } from '@/components/GameTile';

// The build story: the landing page for launch posts ("an AI built this arcade").
// Every number here comes from the repository history; keep it that way.
const STATS = [
  ['4 days', 'from the first line of code to 21 live games'],
  [`${GAMES.length}`, `original games, ${GAMES.filter((g) => g.category === 'party').length} of them for 1 to 4 players on one phone`],
  ['26,000', 'lines of game code, all written by AI'],
  ['0', 'game engine dependencies: one tiny engine, built from scratch'],
];

const TIMELINE = [
  ['Day 1', 'The brief: a studio of viral browser games that people play instead of scrolling. The AI wrote a dependency-free game engine and the first game, then split into parallel helper agents that built 14 more.'],
  ['Day 2', 'The website: instant-play pages, daily challenges, leaderboards, streaks, sharing, SEO and a studio dashboard. Then the domain went live.'],
  ['Day 3', 'A redesign, and animated covers: every game got an autopilot that plays it by itself, so the AI could record its own gameplay trailers.'],
  ['Day 4', 'The party pack: six new games for up to 4 players on one screen, one button each, with bots and a random twist every round. Plus the swipe-to-play feed.'],
  ['Day 8', 'Search data, then games: the AI read Google Keyword Planner volumes, saw that "2 player games" gets about 368,000 searches a month, and built three more party games aimed at real searches: tug of war, a reaction time duel and air hockey.'],
];

const FAQ = [
  [
    'Was Retry Arcade really built by AI?',
    `Yes. The game engine, all ${GAMES.length} games, the website, the artwork, the gameplay clips and the marketing kit were written by an AI coding agent (Claude, made by Anthropic), with one human setting the direction, buying the domain and approving each release.`,
  ],
  ['What did the human do?', 'Picked the goal (fun games people play instead of doom scrolling), gave feedback on design, set up accounts and said "ship it". Every line of code was written by the AI.'],
  ['Are the games free?', 'Yes. Every game runs in your browser on a phone, tablet or computer, with no download and no sign up.'],
];

export const metadata = {
  title: 'Built by AI: how an AI made a 21-game arcade in 4 days',
  description: `Retry Arcade was built by an AI coding agent: a game engine, ${GAMES.length} original games, a website and its own gameplay trailers, in 4 days, with one human directing. Play them free.`,
  alternates: { canonical: '/built-by-ai' },
  openGraph: {
    title: `Built by AI: ${GAMES.length} games in 4 days | ${SITE.name}`,
    url: '/built-by-ai',
    images: [{ url: '/og/site.jpg', width: 1200, height: 630 }],
  },
};

export default function BuiltByAi() {
  const showcase = ['tank-tango', 'stack-tower', 'juicy-drop'];
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd(FAQ))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ld(
          breadcrumbLd([
            ['Home', '/'],
            ['Built by AI', '/built-by-ai'],
          ]),
        )}
      />
      <div className="text-xs font-extrabold tracking-[0.25em] text-pink">THE BUILD STORY</div>
      <h1 className="mt-2 font-cond text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">
        An AI built this arcade. <span className="text-pink">In 4 days.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-mute">
        One human with a brief. One AI coding agent writing every line: the engine, {GAMES.length} games, this website and even the gameplay trailers, recorded by
        the games playing themselves.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/play" className="btn-pink">
          ▶ Play what it made
        </Link>
        <Link href="/category/party" className="btn-ghost">
          👥 Party pack
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map(([n, t]) => (
          <div key={t} className="rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="font-cond text-4xl font-extrabold text-white">{n}</div>
            <div className="mt-1 text-sm text-mute">{t}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {showcase.map((slug) => (
          <Link key={slug} href={`/games/${slug}`} className="tile block aspect-[4/3]">
            <ClipStage slug={slug} align="center" phone="92%" />
          </Link>
        ))}
      </div>

      <h2 className="h-section mt-12">How it happened</h2>
      <ol className="mt-4 space-y-3">
        {TIMELINE.map(([day, text]) => (
          <li key={day} className="flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="w-16 shrink-0 font-cond text-2xl font-extrabold text-pink">{day}</div>
            <p className="text-white/85">{text}</p>
          </li>
        ))}
      </ol>

      <h2 className="h-section mt-12">Who did what</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <div className="font-cond text-2xl font-extrabold">🤖 The AI</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/85">
            <li>Wrote the engine and every game, then tested them in a headless browser</li>
            <li>Ran helper agents in parallel, each building and play-testing its own games</li>
            <li>Taught each game to play itself, then recorded its trailer</li>
            <li>Built the site, search pages, analytics and the daily social feed</li>
            <li>Found and fixed its own bugs (one gate in Color Rush could never be passed)</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <div className="font-cond text-2xl font-extrabold">🧑 The human</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/85">
            <li>Set the goal: games people pick over doom scrolling</li>
            <li>Gave design feedback from screenshots</li>
            <li>Bought the domain and set up the accounts</li>
            <li>Approved every release</li>
          </ul>
        </div>
      </div>

      <h2 className="h-section mt-12">Questions</h2>
      <div className="mt-4 space-y-3">
        {FAQ.map(([q, a]) => (
          <div key={q} className="rounded-2xl bg-card p-4 ring-1 ring-line">
            <h3 className="font-bold text-white">{q}</h3>
            <p className="mt-1 text-white/75">{a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-gradient-to-r from-pink/20 to-sun/10 p-6 text-center ring-1 ring-line">
        <div className="font-cond text-3xl font-extrabold uppercase">Judge the AI yourself</div>
        <p className="mt-1 text-mute">Swipe through all {GAMES.length} games and play any of them in one tap.</p>
        <Link href="/play" className="btn-pink mt-4 inline-flex">
          ▶ Start the play feed
        </Link>
      </div>
    </div>
  );
}
