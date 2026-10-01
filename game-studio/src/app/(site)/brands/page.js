import Link from 'next/link';
import BrandDemo from '@/components/BrandDemo';
import { LeadForm } from '@/components/Money';
import { TrackPageView } from '@/components/Widgets';
import { ClipStage } from '@/components/GameTile';
import { GAMES } from '@/lib/games';
import { SITE } from '@/lib/site';
import { ld, breadcrumbLd, faqLd } from '@/lib/seo';

// "Games for brands": the sales page for branded games, playable ads and contest games.
// Prices are "from" prices in USD; change them here.
const PRICES = { reskin: 1500, campaign: 3500, custom: 6000, playable: 2000 };
const usd = (n) => `$${n.toLocaleString('en-US')}`;

export const metadata = {
  title: 'Branded Games & Playable Ads for Marketing',
  description: `Branded mini games, playable ads and contest games that people choose to play. Reskin one of our ${GAMES.length} games in your colors and logo from ${usd(
    PRICES.reskin,
  )}, live in about a week. Try your brand in a game now.`,
  alternates: { canonical: '/brands' },
  openGraph: {
    title: `Games for brands | ${SITE.name}`,
    description: 'Get played, not scrolled past. Branded HTML5 games, playable ads and contest games.',
    url: '/brands',
    images: [{ url: '/og/brands.jpg', width: 1200, height: 630 }],
  },
};

const STATS = [
  ['~1 sec', 'to load on a phone, no app install'],
  [`${GAMES.length}`, 'proven games ready to brand'],
  ['5-7 days', 'from brief to a live branded game'],
  ['0', 'apps to install: it plays in any browser'],
];

const FORMATS = [
  {
    emoji: '🎨',
    title: 'Branded reskin',
    body: 'One of our games in your colors, logo, products and sounds. Hosted for you, with a link, an embed and a QR code.',
    best: 'Launches, social campaigns, websites',
    time: '5-7 days',
  },
  {
    emoji: '🏆',
    title: 'Contest game',
    body: 'A branded game with a leaderboard, prizes and opt-in sign-ups. Players come back to beat their score and bring friends.',
    best: 'Lead generation, CRM growth, retail promos',
    time: '1-2 weeks',
  },
  {
    emoji: '📱',
    title: 'Playable ads',
    body: 'Short interactive ads that let people try before they install or buy. Built to each ad network’s size and format rules.',
    best: 'App installs, performance campaigns',
    time: '1-2 weeks',
  },
  {
    emoji: '🎪',
    title: 'Event and booth games',
    body: 'Big-screen games for stalls, malls and trade shows: one tap to play, a live high score wall and a QR code to play again at home.',
    best: 'Trade shows, activations, college fests',
    time: '1-2 weeks',
  },
  {
    emoji: '🧠',
    title: 'Custom game',
    body: 'A new game designed around your product or story, from first sketch to launch. You can own it outright.',
    best: 'Flagship campaigns, always-on brand worlds',
    time: '2-4 weeks',
  },
  {
    emoji: '📅',
    title: 'Sponsor the Daily Arena',
    body: `Put your logo on the daily challenge that ${SITE.name} players come back for, plus every ad slot on the site.`,
    best: 'Reach casual gamers fast',
    time: 'Live in 48 hours',
    href: '/advertise',
  },
];

const BASES = [
  ['stack-tower', 'Your logo on every block'],
  ['juicy-drop', 'Merge your products into the big one'],
  ['brick-barrage', 'Break through to the offer'],
  ['road-hopper', 'Your mascot crosses the road'],
  ['wordy', 'A daily word puzzle about your world'],
  ['rope-rumble', 'Team tug of war at your stall'],
  ['reflex-duel', 'Fastest finger wins the prize'],
  ['sky-flap', 'Fly your mascot through the gaps'],
];

const STEPS = [
  ['Brief', 'A 20 minute call: goal, audience, dates, and where the game will live.'],
  ['Playable in 48 hours', 'You get a working branded version to play on your own phone, not a slide.'],
  ['Polish and launch', 'Two rounds of changes, then we host it, hand over the embed and QR codes, and go live.'],
  ['Report', 'Plays, play time, shares, sign-ups and prize claims, weekly or at the end.'],
];

const TIERS = [
  {
    name: 'Reskin',
    price: PRICES.reskin,
    time: '5-7 days',
    items: ['One of our games in your brand', 'Logo, colors, products and sounds', 'Hosted link, embed code and QR code', 'Share cards for social', 'Play and share analytics'],
  },
  {
    name: 'Campaign',
    price: PRICES.campaign,
    time: '1-2 weeks',
    popular: true,
    items: ['Everything in Reskin', 'Leaderboard with prizes', 'Coupon revealed at a target score', 'Opt-in sign-ups sent to your CRM', 'Your own domain', 'Weekly reports'],
  },
  {
    name: 'Custom game',
    price: PRICES.custom,
    time: '2-4 weeks',
    items: ['A new game built around your product', 'Original art, mascot and sound', 'Contest and lead features included', 'Full ownership available', 'Launch support'],
  },
];

const ADDONS = [
  `Playable ad set (3 variants for the big ad networks) from ${usd(PRICES.playable)}`,
  'Extra languages, including Hindi and other Indian languages',
  'Big-screen event mode with a live high score wall',
  'Agencies: white-label delivery and partner pricing',
];

const FAQ = [
  [
    'What is a branded game?',
    'A branded game (also called an advergame) is a short game made in a brand’s look, with its logo, products or mascot built into play. People choose to play it, often for minutes and again and again, which no banner or skippable video can match.',
  ],
  [
    'How much does a branded game cost?',
    `A reskin of one of our games starts at ${usd(PRICES.reskin)}. A campaign version with a leaderboard, prizes and sign-ups starts at ${usd(PRICES.campaign)}, and a fully custom game at ${usd(
      PRICES.custom,
    )}. You get a fixed quote after a short call.`,
  ],
  ['How fast can it be live?', 'A reskin is usually live in 5 to 7 days. You get a playable version within 48 hours of the brief, so you see real progress straight away.'],
  [
    'Where does the game run?',
    'In any web browser on phones, tablets and computers, with nothing to install. We host it on our servers or your domain, and you get an embed code for your website and a QR code for print, packaging and events.',
  ],
  [
    'What are playable ads?',
    'Playable ads are small interactive ads, usually 15 to 30 seconds of real gameplay, that run on ad networks and end with a button to install or buy. We build them to each network’s file size and format rules.',
  ],
  [
    'Can we collect leads and run a contest?',
    'Yes. The Campaign and Custom tiers include a leaderboard, prizes, coupon codes and opt-in sign-up forms. You choose what to ask for, and data goes straight to you.',
  ],
  ['Is it brand-safe?', 'Yes. Every game is our own original work, family-friendly and non-violent, with no user-generated content and no third-party ads inside your branded game.'],
  ['Who owns the game?', 'You own your brand assets and all player data. A reskin is licensed to you for your campaign; a custom game can be bought outright.'],
];

const serviceLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Branded game development',
  name: 'Games for brands',
  url: `${SITE.url}/brands`,
  provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  areaServed: 'Worldwide',
  description: 'Branded HTML5 mini games, contest games, event games and playable ads for marketing campaigns.',
  offers: TIERS.map((t) => ({
    '@type': 'Offer',
    name: t.name,
    priceSpecification: { '@type': 'PriceSpecification', minPrice: t.price, priceCurrency: 'USD' },
  })),
};

export default function Brands() {
  const bySlug = Object.fromEntries(GAMES.map((g) => [g.slug, g]));
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <TrackPageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(serviceLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd(FAQ))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ld(
          breadcrumbLd([
            ['Home', '/'],
            ['Games for brands', '/brands'],
          ]),
        )}
      />

      <div className="max-w-3xl">
        <div className="chip">🎯 Games for brands</div>
        <h1 className="mt-3 font-cond text-5xl font-extrabold uppercase leading-[0.92] text-white sm:text-7xl">
          Get played, <span className="text-pink">not scrolled past.</span>
        </h1>
        <p className="mt-4 text-lg text-white/75">
          We make branded mini games, contest games and playable ads that people choose to spend minutes with. Your colors build the level, your logo is on every block,
          and every high score gets shared with your name on it.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="#demo" className="btn-pink">
            ▶ Brand a game now
          </a>
          <a href="#enquire" className="btn-ghost">
            Get a proposal
          </a>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map(([n, t]) => (
          <div key={t} className="rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="font-cond text-4xl font-extrabold text-white">{n}</div>
            <div className="mt-1 text-sm text-mute">{t}</div>
          </div>
        ))}
      </div>

      <section id="demo" className="mt-12 scroll-mt-20">
        <BrandDemo />
      </section>

      <section className="mt-16">
        <h2 className="h-section">What we make</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((f) => (
            <div key={f.title} className="card flex flex-col p-6">
              <div className="text-3xl">{f.emoji}</div>
              <h3 className="mt-2 font-display text-2xl font-bold">{f.title}</h3>
              <p className="mt-2 flex-1 text-white/70">{f.body}</p>
              <p className="mt-3 text-sm font-bold text-aqua">Best for: {f.best}</p>
              <p className="mt-1 text-sm font-bold text-white/50">
                {f.time}
                {f.href && (
                  <Link href={f.href} className="ml-2 text-pink underline">
                    Details
                  </Link>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="h-section">Start from a game people already love</h2>
        <p className="mt-2 max-w-2xl text-white/65">Every one of our {GAMES.length} games can carry your brand. A few favourites, and what they become:</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {BASES.filter(([slug]) => bySlug[slug]).map(([slug, line]) => (
            <Link key={slug} href={`/games/${slug}`} className="group block">
              <div className="tile relative block aspect-[4/5]">
                <ClipStage slug={slug} align="center" phone="86%" />
              </div>
              <div className="mt-2 font-display text-lg font-bold text-white group-hover:text-pink">{bySlug[slug].title}</div>
              <div className="text-sm text-white/60">{line}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="h-section">How it works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-2xl bg-card p-5 ring-1 ring-line">
              <div className="font-cond text-3xl font-extrabold text-pink">{i + 1}</div>
              <div className="mt-1 font-display text-xl font-bold">{title}</div>
              <p className="mt-1 text-sm text-white/70">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="h-section">Pricing</h2>
        <p className="mt-2 max-w-2xl text-white/65">Starting prices in US dollars. You get a fixed quote after a short call.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`card relative flex flex-col p-6 ${t.popular ? 'ring-2 ring-pink' : ''}`}>
              {t.popular && <div className="absolute -top-3 left-6 rounded-full bg-pink px-3 py-0.5 text-xs font-extrabold text-white">MOST POPULAR</div>}
              <div className="font-display text-2xl font-bold">{t.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-sm font-bold text-white/50">from</span>
                <span className="font-cond text-5xl font-extrabold text-white">{usd(t.price)}</span>
              </div>
              <div className="text-sm font-bold text-aqua">{t.time}</div>
              <ul className="mt-4 flex-1 space-y-2 text-white/75">
                {t.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="text-lime">✓</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <a href="#enquire" className={`${t.popular ? 'btn-pink' : 'btn-ghost'} mt-5 justify-center`}>
                Get a quote
              </a>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-white/5 p-5 ring-1 ring-line">
          <div className="font-bold text-white">Add-ons</div>
          <ul className="mt-2 grid gap-1.5 text-sm text-white/70 sm:grid-cols-2">
            {ADDONS.map((a) => (
              <li key={a}>+ {a}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <div className="card p-6">
          <div className="text-3xl">⚡</div>
          <h3 className="mt-2 font-display text-xl font-bold">Fast because we build with AI</h3>
          <p className="mt-2 text-white/70">
            {SITE.name} itself was <Link className="text-aqua underline" href="/built-by-ai">built by an AI coding agent</Link> with one human directing. That speed is why you see a playable game in days, at a fraction of agency prices.
          </p>
        </div>
        <div className="card p-6">
          <div className="text-3xl">🎮</div>
          <h3 className="mt-2 font-display text-xl font-bold">Games that are actually fun</h3>
          <p className="mt-2 text-white/70">You are not buying a quiz in a game costume. Every base game is one people already play for fun on this site, every day.</p>
        </div>
        <div className="card p-6">
          <div className="text-3xl">📱</div>
          <h3 className="mt-2 font-display text-xl font-bold">Made for phones</h3>
          <p className="mt-2 text-white/70">Tiny builds with no engine to download, so the game starts in about a second on a phone, even on a weak connection.</p>
        </div>
      </section>

      <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div id="enquire" className="card scroll-mt-20 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">Get a proposal</h2>
          <p className="mb-5 mt-1 text-white/65">Tell us about your brand and campaign. We reply within one working day with ideas, a timeline and a fixed price.</p>
          <LeadForm defaultInterest="branded-game" />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold">Prefer email?</h2>
            <p className="mt-2 text-white/70">
              Write to{' '}
              <a className="text-aqua underline" href={`mailto:${SITE.email}?subject=Branded%20game`}>
                {SITE.email}
              </a>{' '}
              with your brand, goal and dates.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold">Other ways to work with us</h2>
            <ul className="mt-2 space-y-1.5 text-white/70">
              <li>
                <Link className="text-aqua underline" href="/advertise">
                  Sponsorships and ads
                </Link>{' '}
                on {SITE.name}
              </li>
              <li>
                <Link className="text-aqua underline" href="/developers">
                  License or embed
                </Link>{' '}
                our games on your platform
              </li>
              <li>
                <Link className="text-aqua underline" href="/press">
                  Press kit
                </Link>{' '}
                and brand assets
              </li>
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="h-section">Questions brands ask</h2>
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
