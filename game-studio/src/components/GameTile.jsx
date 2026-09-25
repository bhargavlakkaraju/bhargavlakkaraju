'use client';

// Game card: cover art, glow in the game's own colors, a shine sweep, pointer tilt on
// desktop (skipped on touch and reduced motion), and the player's own medal / NEW badge.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getPlayer } from '@/lib/player';
import { getGame, formatScore, MEDALS } from '@/lib/games';
import { CATEGORIES } from '@/lib/site';

export default function GameTile({ game, size = 'md', badge = null, href = null, priority = false }) {
  const ref = useRef(null);
  const [mine, setMine] = useState(null);
  const [c1, c2] = game.colors || ['#ff3d7f', '#8b5cf6'];
  const big = size === 'lg';

  useEffect(() => {
    const g = getPlayer().games[game.slug];
    setMine(g ? { best: g.best, medal: g.medal || 0 } : { fresh: true });
  }, [game.slug]);

  function onMove(e) {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--ry', `${x * 10}deg`);
    ref.current.style.setProperty('--rx', `${-y * 10}deg`);
  }
  function onLeave() {
    ref.current.style.setProperty('--ry', '0deg');
    ref.current.style.setProperty('--rx', '0deg');
  }

  const full = getGame(game.slug);
  let chip = null;
  if (mine?.fresh) chip = <span className="rounded-full bg-aqua px-2 py-0.5 text-[10px] font-black tracking-wider text-ink">NEW</span>;
  else if (mine && mine.best != null)
    chip = (
      <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-extrabold text-white backdrop-blur">
        {mine.medal ? MEDALS[mine.medal] + ' ' : ''}
        {full ? formatScore(full, mine.best) : mine.best}
      </span>
    );

  return (
    <Link
      ref={ref}
      href={href || `/games/${game.slug}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="tile group overflow-hidden bg-card"
      style={{ '--c1': c1, '--c2': c2, background: `linear-gradient(135deg, ${c1}40, ${c2}30)` }}
      aria-label={`Play ${game.title}`}
    >
      <div className={`relative overflow-hidden ${big ? 'aspect-[16/11]' : 'aspect-[4/3]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/covers/${game.slug}.webp`}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          loading={priority ? 'eager' : 'lazy'}
          width={800}
          height={600}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
          {badge ? <span className="rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-black text-ink shadow">{badge}</span> : <span />}
          {chip}
        </div>
        <div className="absolute inset-0 hidden place-items-center opacity-0 transition duration-200 group-hover:opacity-100 sm:grid">
          <span className="rounded-full bg-pink px-5 py-2 font-arcade text-sm text-white shadow-lg">▶ PLAY</span>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 ${big ? 'p-4 sm:p-5' : 'p-3'}`}>
        <div className={`font-display font-bold leading-tight text-white drop-shadow ${big ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'}`}>
          {game.emoji} {game.title}
        </div>
        <div className={`truncate text-white/75 ${big ? 'text-sm sm:text-base' : 'text-[11px] sm:text-xs'}`}>
          {big ? game.tagline : `${CATEGORIES[game.category]?.name || ''} · ${game.tagline}`}
        </div>
      </div>
      <span className="shine" aria-hidden />
    </Link>
  );
}
