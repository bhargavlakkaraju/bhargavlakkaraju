'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlayer, levelInfo } from '@/lib/player';

export default function PlayerBadge() {
  const [p, setP] = useState(null);
  useEffect(() => {
    setP(getPlayer());
    const on = (e) => setP({ ...e.detail });
    window.addEventListener('ra:player', on);
    return () => window.removeEventListener('ra:player', on);
  }, []);
  if (!p) return <div className="h-9 w-32" />;
  const lvl = levelInfo(p.xp);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const alive = p.streak.last === today || p.streak.last === yesterday;
  return (
    <Link href="/profile" className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 ring-1 ring-line hover:ring-pink" title="Your profile">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sun to-pink text-xs font-black text-ink">{lvl.level}</span>
      <span className="hidden w-16 sm:block">
        <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-gradient-to-r from-pink to-sun" style={{ width: `${lvl.pct}%` }} />
        </span>
      </span>
      <span className={`text-sm font-extrabold ${alive && p.streak.count ? 'text-sun' : 'text-white/40'}`} title="Daily streak">
        🔥{alive ? p.streak.count : 0}
      </span>
    </Link>
  );
}
