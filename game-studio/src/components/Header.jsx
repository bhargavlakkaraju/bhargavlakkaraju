import Link from 'next/link';
import PlayerBadge from './PlayerBadge';
import { SITE } from '@/lib/site';

export function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-xl bg-gradient-to-br from-pink to-grape font-black text-white shadow-glow ${big ? 'h-12 w-12 text-2xl' : 'h-9 w-9 text-lg'}`}
        aria-hidden
      >
        ↻
      </span>
      <span className={`font-display font-bold tracking-tight text-white ${big ? 'text-3xl' : 'text-xl'}`}>
        Retry<span className="text-pink">Arcade</span>
      </span>
    </span>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" aria-label={`${SITE.name} home`}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-bold text-white/70 md:flex">
          <Link href="/#games" className="rounded-lg px-3 py-1.5 hover:bg-white/5 hover:text-white">
            All games
          </Link>
          <Link href="/daily" className="rounded-lg px-3 py-1.5 hover:bg-white/5 hover:text-white">
            📅 Daily
          </Link>
          <Link href="/leaderboards" className="rounded-lg px-3 py-1.5 hover:bg-white/5 hover:text-white">
            🏆 Leaderboards
          </Link>
        </nav>
        <div className="ml-auto">
          <PlayerBadge />
        </div>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 text-sm font-bold text-white/70 md:hidden">
        <Link href="/#games" className="shrink-0 rounded-lg px-3 py-1 hover:bg-white/5">
          🎮 Games
        </Link>
        <Link href="/daily" className="shrink-0 rounded-lg px-3 py-1 hover:bg-white/5">
          📅 Daily
        </Link>
        <Link href="/leaderboards" className="shrink-0 rounded-lg px-3 py-1 hover:bg-white/5">
          🏆 Leaders
        </Link>
        <Link href="/profile" className="shrink-0 rounded-lg px-3 py-1 hover:bg-white/5">
          👤 Profile
        </Link>
      </nav>
    </header>
  );
}
