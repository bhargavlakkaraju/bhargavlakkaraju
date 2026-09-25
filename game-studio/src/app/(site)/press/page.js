import Link from 'next/link';
import { TrackPageView } from '@/components/Widgets';
import { GAMES } from '@/lib/games';
import { SITE, CATEGORIES, SOCIAL, MONEY } from '@/lib/site';

export const metadata = {
  title: 'Press Kit: Facts, Logos & Screenshots',
  description: `${SITE.name} press kit: company facts, a short description, logos, banners and screenshots of all ${GAMES.length} games, free to use in coverage.`,
  alternates: { canonical: '/press' },
};

const ASSETS = [
  ['logo-mark-1024.png', 'App icon / logo mark (PNG, 1024 px)'],
  ['logo-wordmark.png', 'Logo with wordmark, transparent (PNG)'],
  ['logo-wordmark-dark.png', 'Logo with wordmark on dark (PNG)'],
  ['avatar-1080.png', 'Square avatar (PNG, 1080 px)'],
  ['banner-x-1500x500.jpg', 'Wide banner (JPG, 1500 x 500)'],
  ['banner-youtube-2560x1440.jpg', 'Large banner (JPG, 2560 x 1440)'],
];

export default function Press() {
  const facts = [
    ['Name', SITE.name],
    ['Website', SITE.url.replace(/^https?:\/\//, '')],
    ['What it is', `A free website of ${GAMES.length} original HTML5 browser games`],
    ['Categories', Object.values(CATEGORIES).map((c) => c.name).join(', ')],
    ['Platforms', 'Any modern browser on phone, tablet and computer; installable as a web app'],
    ['Price', MONEY.plusLink ? 'Free to play, supported by ads; optional ad-free Plus pass' : 'Free to play, supported by ads and sponsors'],
    ['Launched', 'September 2026'],
    ['Tagline', SITE.tagline],
    ['Contact', SITE.email],
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <TrackPageView />
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Press kit</h1>
      <p className="mt-3 max-w-3xl text-lg text-white/75">
        Everything you need to write about {SITE.name}. All logos and screenshots on this page are free to use in editorial coverage.
      </p>

      <section className="card mt-8 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">About {SITE.name}</h2>
        <p className="mt-3 text-white/80">
          {SITE.name} is a free online arcade of {GAMES.length} original browser games designed around one feeling: <em>just one more try</em>. Every game loads in
          about a second, needs no download or account, and works on phones, tablets and computers. Players chase medals, keep daily streaks, and compete on
          global leaderboards, with a Daily Challenge that gives every player in the world the same level each day. Any score can be shared as a challenge
          link that drops a friend straight into the same game with a target to beat.
        </p>
        <p className="mt-3 text-white/80">
          The catalog spans one-tap arcade games (Stack Tower, Sky Flap, Blade Spin, Zig Zag), puzzles (Block Crush, Juicy Drop, 2048, Sudoku), classics
          (Solitaire, Neon Snake) and Wordy, a daily five-letter word game. All games are built in-house on a tiny, dependency-free HTML5 engine and are also
          available to license and embed.
        </p>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold">Fact sheet</h2>
          <dl className="mt-3 divide-y divide-white/10 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2">
                <dt className="font-bold text-white/50">{k}</dt>
                <dd className="text-white/85">{v}</dd>
              </div>
            ))}
            {SOCIAL.length > 0 && (
              <div className="grid grid-cols-[120px_1fr] gap-3 py-2">
                <dt className="font-bold text-white/50">Social</dt>
                <dd className="flex flex-wrap gap-2">
                  {SOCIAL.map((s) => (
                    <a key={s.id} href={s.url} className="text-aqua underline" rel="me noopener">
                      {s.name}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold">Logos & banners</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ASSETS.map(([file, label]) => (
              <li key={file}>
                <a href={`/brand/${file}`} download className="text-aqua underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-white/55">Please do not recolor or distort the logo. Contact us for other formats.</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="section-title">Games & screenshots</h2>
        <p className="mt-1 text-white/60">Click a screenshot to download the full-size image (1200 x 630).</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {GAMES.map((g) => (
            <div key={g.slug} className="overflow-hidden rounded-2xl bg-panel ring-1 ring-line">
              <a href={`/og/${g.slug}.jpg`} download>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/covers/${g.slug}.webp`} alt={`${g.title} screenshot`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </a>
              <div className="p-2.5">
                <Link href={`/games/${g.slug}`} className="text-sm font-bold text-white hover:underline">
                  {g.emoji} {g.title}
                </Link>
                <div className="text-xs text-white/55">{g.tagline}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 text-white/65">
        Interviews, review builds or custom assets: <a className="text-aqua underline" href={`mailto:${SITE.email}?subject=Press`}>{SITE.email}</a>. For
        sponsorships see <Link className="text-aqua underline" href="/advertise">advertise with us</Link>.
      </p>
    </div>
  );
}
