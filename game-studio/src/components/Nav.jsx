'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GAMES } from '@/lib/games';
import { getPlayer } from '@/lib/player';
import { IconHome, IconCalendar, IconTrophy, IconUser, IconDice } from './Icons';

/** Pick a random game, preferring ones this player hasn't tried yet (exploration = retention). */
export function useRandomGame() {
  const router = useRouter();
  return () => {
    const played = getPlayer().games;
    const fresh = GAMES.filter((g) => !played[g.slug]);
    const pool = fresh.length ? fresh : GAMES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/games/${pick.slug}`);
  };
}

export function RandomButton({ className = '', label = 'Surprise me', children = '🎲' }) {
  const go = useRandomGame();
  return (
    <button type="button" onClick={go} className={className} aria-label="Play a random game">
      {children} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Desktop navigation: the page you are on is highlighted in the accent color.
const LINKS = [
  { href: '/', label: 'Explore', exact: true },
  { href: '/category/arcade', label: 'Arcade', wide: true },
  { href: '/category/puzzle', label: 'Puzzle', wide: true },
  { href: '/category/classic', label: 'Classics', wide: true },
  { href: '/category/word', label: 'Word', wide: true },
  { href: '/daily', label: 'Daily' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/best', label: 'Best of' },
];

export function NavLinks() {
  const path = usePathname() || '/';
  return (
    <nav className="hidden items-center text-[14px] font-bold md:flex">
      {LINKS.map((l) => {
        const on = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-2.5 py-1.5 transition ${l.wide ? 'hidden xl:block' : ''} ${on ? 'text-pink' : 'text-white/60 hover:text-white'}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

const ITEMS = [
  { href: '/', Icon: IconHome, label: 'Home' },
  { href: '/daily', Icon: IconCalendar, label: 'Daily' },
  { random: true },
  { href: '/leaderboards', Icon: IconTrophy, label: 'Ranks' },
  { href: '/profile', Icon: IconUser, label: 'Me' },
];

/** App-style tab bar for phones. Hidden on pages where the game itself needs the space. */
export function BottomNav() {
  const path = usePathname() || '/';
  const go = useRandomGame();
  if (path.startsWith('/games/') || path.startsWith('/c/')) return null;
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/95 backdrop-blur-xl md:hidden" aria-label="Main">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {ITEMS.map((it, i) =>
            it.random ? (
              <button
                key={i}
                type="button"
                onClick={go}
                aria-label="Play a random game"
                className="mx-auto grid h-12 w-[4.5rem] place-items-center rounded-2xl bg-pink text-white shadow-[0_4px_0_#a8104a] active:translate-y-[2px] active:shadow-[0_2px_0_#a8104a]"
              >
                <IconDice className="h-6 w-6" />
              </button>
            ) : (
              <Link
                key={it.href}
                href={it.href}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                  (it.href === '/' ? path === '/' : path.startsWith(it.href)) ? 'text-white' : 'text-white/45'
                }`}
              >
                <it.Icon className="h-[22px] w-[22px]" />
                {it.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
