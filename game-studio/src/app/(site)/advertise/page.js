import Link from 'next/link';
import { LeadForm } from '@/components/Money';
import { TrackPageView } from '@/components/Widgets';
import { GAMES } from '@/lib/games';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Advertise, Sponsor & Branded Games',
  description: `Reach casual gamers every day on ${SITE.name}: sponsor the Daily Arena, get a branded HTML5 game for your campaign, or license our games.`,
  alternates: { canonical: '/advertise' },
};

const PACKAGES = [
  {
    emoji: '📅',
    title: 'Daily Arena sponsorship',
    body: 'Your logo on the Daily Arena for a week or a month: "presented by" on the home page and the daily page, your promo in every ad slot on the site, and a thank-you post on our social channels.',
    best: 'Launches, app installs, always-on brand awareness',
  },
  {
    emoji: '🎮',
    title: 'Branded game',
    body: `We reskin one of our ${GAMES.length} games in your colors, logo and products (or build a new one), host it here, and give you an embed for your own site, QR codes, events and social campaigns. Players spend minutes with your brand, not seconds.`,
    best: 'Product launches, trade shows, retail and FMCG campaigns',
  },
  {
    emoji: '🖼️',
    title: 'Display & newsletter',
    body: 'Direct-sold placements next to the games, plus the sponsor slot in our weekly new-game email to subscribed players.',
    best: 'Performance campaigns and gaming-adjacent brands',
  },
  {
    emoji: '📦',
    title: 'Game licensing',
    body: 'Non-exclusive or exclusive licenses for portals, apps, set-top boxes, in-flight and in-store entertainment. Tiny builds, no dependencies, mobile-first.',
    best: 'Platforms that need quality casual content fast',
  },
];

const FAQ = [
  ['Is the site brand-safe?', 'Yes. There is no user-generated content apart from leaderboard nicknames, which pass a profanity filter. Every game is our own, family-friendly and non-violent.'],
  ['What numbers can you share?', 'We share live traffic, countries, device mix, sessions per player and time per session when we send a proposal, straight from our own analytics.'],
  ['How fast can a campaign start?', 'A Daily Arena sponsorship can go live within 48 hours of receiving your logo and link. A branded game usually takes one to two weeks.'],
  ['How do you report results?', 'You get impressions, clicks and (for branded games) plays, average play time and shares, at the end of the campaign or weekly for longer ones.'],
];

export default function Advertise() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <TrackPageView />
      <div className="max-w-3xl">
        <div className="chip">📣 For brands, agencies and platforms</div>
        <h1 className="mt-3 font-cond text-5xl font-extrabold uppercase leading-[0.92] text-white sm:text-7xl">PUT YOUR BRAND WHERE PLAYERS COME BACK EVERY DAY</h1>
        <p className="mt-4 text-lg text-white/75">
          {SITE.name} is a free arcade of {GAMES.length} instant-play games built around one feeling: <em>just one more try</em>. Daily levels, streaks and
          challenge links bring players back and bring their friends with them.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PACKAGES.map((p) => (
          <div key={p.title} className="card p-6">
            <div className="text-3xl">{p.emoji}</div>
            <h2 className="mt-2 font-display text-2xl font-bold">{p.title}</h2>
            <p className="mt-2 text-white/70">{p.body}</p>
            <p className="mt-3 text-sm font-bold text-aqua">Best for: {p.best}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div id="enquire" className="card scroll-mt-20 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">Get a proposal</h2>
          <p className="mb-5 mt-1 text-white/65">Tell us what you have in mind. We reply within one working day with audience numbers and pricing.</p>
          <LeadForm />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold">Why it works</h2>
            <ul className="mt-3 space-y-2 text-white/70">
              <li>⚡ Games load in about a second on any phone or computer</li>
              <li>📅 Daily levels and streaks build a habit</li>
              <li>⚔️ Every score can be shared as a challenge link</li>
              <li>👨‍👩‍👧 Family-friendly, non-violent, brand-safe</li>
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold">Prefer email?</h2>
            <p className="mt-2 text-white/70">
              Write to{' '}
              <a className="text-aqua underline" href={`mailto:${SITE.email}?subject=Advertising`}>
                {SITE.email}
              </a>
              . Press and brand assets are on our <Link className="text-aqua underline" href="/press">press page</Link>.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-12 max-w-3xl">
        <h2 className="section-title">Questions advertisers ask</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-white/5 p-4">
              <summary className="cursor-pointer list-none font-bold text-white">
                {q}
                <span className="float-right text-white/40 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-white/70">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
