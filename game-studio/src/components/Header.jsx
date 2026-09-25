import Link from 'next/link';
import PlayerBadge from './PlayerBadge';
import { RandomButton, NavLinks } from './Nav';
import { SearchButton } from './Search';
import { IconSearch, IconDice } from './Icons';
import { SITE } from '@/lib/site';

export function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-[10px] bg-gradient-to-br from-pink to-grape font-black text-white transition-transform duration-300 group-hover:rotate-[-20deg] ${big ? 'h-12 w-12 text-2xl' : 'h-8 w-8 text-base'}`}
        aria-hidden
      >
        ↻
      </span>
      <span className={`font-arcade leading-none tracking-tight text-white ${big ? 'text-2xl' : 'text-[16px] sm:text-[17px]'}`}>
        RETRY<span className="text-pink">ARCADE</span>
      </span>
    </span>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4">
        <Link href="/" aria-label={`${SITE.name} home`} className="group mr-2 shrink-0">
          <Logo />
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <SearchButton className="flex h-9 items-center gap-2 rounded-xl bg-card px-2.5 text-sm text-mute ring-1 ring-line transition hover:text-white lg:w-56 lg:px-3">
            <IconSearch className="h-[18px] w-[18px]" />
            <span className="hidden lg:inline">Search games</span>
            <kbd className="ml-auto hidden rounded-md bg-raised px-1.5 py-0.5 font-sans text-[11px] text-mute xl:inline">⌘K</kbd>
          </SearchButton>
          <RandomButton className="hidden h-9 items-center gap-1.5 rounded-xl bg-pink px-3.5 text-sm font-extrabold text-white shadow-[0_3px_0_#a8104a] transition hover:brightness-110 active:translate-y-[1px] md:inline-flex">
            <IconDice className="h-[18px] w-[18px]" />
          </RandomButton>
          <PlayerBadge />
        </div>
      </div>
    </header>
  );
}
