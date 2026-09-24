import Link from 'next/link';
import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';
import { GAMES } from '@/lib/games';

export const metadata = {
  title: 'Embed & License Our Games',
  description: `Add free ${SITE.name} games to your website with one line of code, or license them for your platform.`,
  alternates: { canonical: '/developers' },
};

export default function Developers() {
  return (
    <StaticPage title="Embed & license our games">
      <h2 className="!mt-0">Free embeds for websites and blogs</h2>
      <p>Every game can be embedded with a single iframe. It is free, responsive, works on mobile, and needs no API key.</p>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink/80 p-4 text-xs text-white/80">
        {`<iframe src="${SITE.url}/embed/stack-tower" width="420" height="740"
  style="border:0;border-radius:16px;max-width:100%"
  allow="autoplay; fullscreen" loading="lazy"></iframe>`}
      </pre>
      <p className="mt-3">Replace the game name with any of:</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {GAMES.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="chip hover:bg-white/20">
            {g.slug}
          </Link>
        ))}
      </div>
      <h2>Licensing for platforms and brands</h2>
      <p>
        Our games are built on a tiny, dependency-free HTML5 engine and ship as standalone builds for game portals (CrazyGames, Poki, GameDistribution and
        others). We offer non-exclusive and exclusive licenses, white-label reskins with your brand, and sponsored versions for campaigns.
      </p>
      <p>
        <a href={`mailto:${SITE.email}?subject=Game%20licensing`}>Email us</a> with your platform, audience size and the games you are interested in.
      </p>
    </StaticPage>
  );
}
