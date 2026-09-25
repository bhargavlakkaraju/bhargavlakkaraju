'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GAMES } from '@/lib/games';
import { getPlayer } from '@/lib/player';

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

export function RandomButton({ className = '', label = 'Surprise me' }) {
  const go = useRandomGame();
  return (
    <button type="button" onClick={go} className={className} aria-label="Play a random game">
      🎲 <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const ITEMS = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/daily', icon: '📅', label: 'Daily' },
  { random: true },
  { href: '/leaderboards', icon: '🏆', label: 'Ranks' },
  { href: '/profile', icon: '👤', label: 'Me' },
];

/** App-style tab bar for phones. Hidden on pages where the game itself needs the space. */
export function BottomNav() {
  const path = usePathname() || '/';
  const go = useRandomGame();
  if (path.startsWith('/games/') || path.startsWith('/c/')) return null;
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur-lg md:hidden" aria-label="Main">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {ITEMS.map((it, i) =>
            it.random ? (
              <button
                key={i}
                type="button"
                onClick={go}
                aria-label="Play a random game"
                className="pulse-ring mx-auto -mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink to-grape text-2xl shadow-glow"
              >
                🎲
              </button>
            ) : (
              <Link
                key={it.href}
                href={it.href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold ${
                  (it.href === '/' ? path === '/' : path.startsWith(it.href)) ? 'text-white' : 'text-white/50'
                }`}
              >
                <span className="text-xl leading-none">{it.icon}</span>
                {it.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
