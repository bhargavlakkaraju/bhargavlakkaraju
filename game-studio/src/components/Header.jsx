import Link from 'next/link';
import PlayerBadge from './PlayerBadge';
import { RandomButton } from './Nav';
import { SITE } from '@/lib/site';

export function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-xl bg-gradient-to-br from-pink to-grape font-black text-white shadow-glow transition-transform duration-300 group-hover:rotate-[-20deg] ${big ? 'h-12 w-12 text-2xl' : 'h-9 w-9 text-lg'}`}
        aria-hidden
      >
        ↻
      </span>
      <span className={`font-arcade leading-none tracking-tight text-white ${big ? 'text-2xl' : 'text-[17px] sm:text-lg'}`}>
        RETRY<span className="text-pink">ARCADE</span>
      </span>
    </span>
  );
}

const NAV = [
  { href: '/#games', label: 'Games' },
  { href: '/daily', label: '📅 Daily' },
  { href: '/leaderboards', label: '🏆 Leaderboards' },
  { href: '/guides', label: 'Guides' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/75 backdrop-blur-lg" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" aria-label={`${SITE.name} home`} className="group">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 text-sm font-bold text-white/70 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 transition hover:bg-white/5 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <RandomButton className="hidden h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-grape px-3.5 text-sm font-extrabold text-white shadow-glow transition hover:brightness-110 md:inline-flex" />
          <PlayerBadge />
        </div>
      </div>
    </header>
  );
}
