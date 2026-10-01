import Link from 'next/link';
import PlayerBadge from './PlayerBadge';
import { RandomButton, NavLinks } from './Nav';
import { SearchButton } from './Search';
import { IconSearch, IconDice, IconPlay } from './Icons';
import { SITE } from '@/lib/site';

// The Candy 3D logo: mascot icon + "RETRY" stacked over a big candy "ARCADE" (styles in
// globals.css). Built from text so it stays sharp at any size; the full illustrated lockup
// (public/brand/logo-lockup.webp) is used where there is room for it.
export function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mascot-icon-112.webp"
        alt=""
        aria-hidden
        width={big ? 48 : 36}
        height={big ? 48 : 36}
        className={`shrink-0 drop-shadow-[0_2px_8px_rgba(255,61,139,0.35)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 ${big ? 'h-12 w-12' : 'h-9 w-9'}`}
      />
      <span className="flex flex-col font-display font-bold leading-none">
        <span className={`logo-retry ${big ? 'text-[15px]' : 'text-[11px]'}`}>RETRY</span>
        <span className={`logo-arcade ${big ? 'text-[30px]' : 'text-[21px]'}`}>ARCADE</span>
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
          <RandomButton className="hidden h-9 items-center gap-1.5 rounded-xl bg-card px-3 text-sm font-extrabold text-white/80 ring-1 ring-line transition hover:text-white 2xl:inline-flex" label="Random">
            <IconDice className="h-[18px] w-[18px]" />
          </RandomButton>
          <Link
            href="/play"
            className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-pink px-3.5 text-sm font-extrabold text-white shadow-[0_3px_0_#a8104a] transition hover:brightness-110 active:translate-y-[1px] md:inline-flex"
          >
            <IconPlay className="h-[16px] w-[16px]" /> Play feed
          </Link>
          <PlayerBadge />
        </div>
      </div>
    </header>
  );
}
