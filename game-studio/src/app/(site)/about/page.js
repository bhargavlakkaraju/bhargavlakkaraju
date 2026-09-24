import Link from 'next/link';
import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';
import { GAMES } from '@/lib/games';

export const metadata = { title: 'About Us', description: `${SITE.name} is an independent studio making instant, free browser games.`, alternates: { canonical: '/about' } };

export default function About() {
  return (
    <StaticPage title={`About ${SITE.name}`}>
      <p>
        {SITE.name} is an independent game studio with one obsession: that little voice saying <i>“okay, just one more try.”</i> We build small, polished games
        that load instantly in any browser, are understood in two seconds, and are hard to put down.
      </p>
      <h2>What we make</h2>
      <p>
        We currently have {GAMES.length} games, from one-tap arcade challenges to relaxing puzzles and timeless classics. Every game runs on phones, tablets and
        computers with no download, no account and no paywall. Each one has a Daily Challenge with the same level for every player, leaderboards, medals and
        streaks.
      </p>
      <h2>How we keep it free</h2>
      <p>
        Our games are supported by advertising. We keep ads outside of gameplay, cap how often they appear, and offer optional “watch an ad to continue” rewards so
        you choose when to see one.
      </p>
      <h2>Work with us</h2>
      <p>
        Want our games on your website or platform? See <Link href="/developers">embed & licensing</Link> or <Link href="/contact">contact us</Link>.
      </p>
    </StaticPage>
  );
}
