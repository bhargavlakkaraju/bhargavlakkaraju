'use client';

// Game card: the cover art fills the card and the title sits on a dark fade at the
// bottom (content first). Badges: an optional label from the page (DAILY, +15 XP)
// and, once played, the player's medal and best score.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getPlayer } from '@/lib/player';
import { getGame, formatScore, MEDALS, hasClip } from '@/lib/games';
import { CATEGORIES } from '@/lib/site';
import { IconPlay } from './Icons';

// Looping gameplay clip: plays only while on screen, never for players who asked for
// reduced motion or data saving. Until a tile comes near the viewport it is just its
// poster image (lazy-loaded), so a page with dozens of tiles creates only a handful of
// <video> elements and downloads only the posters people can see.
export function ClipVideo({ slug, className = 'absolute inset-0 h-full w-full object-cover' }) {
  const posterRef = useRef(null);
  const videoRef = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = posterRef.current;
    if (near || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = navigator.connection && navigator.connection.saveData;
    if (reduce || save) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, slug]);
  useEffect(() => {
    const v = videoRef.current;
    if (!near || !v || typeof IntersectionObserver === 'undefined') return undefined;
    v.muted = true;
    v.defaultMuted = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (v.preload !== 'auto') v.preload = 'auto';
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [near, slug]);
  if (!near) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={posterRef} src={`/clips/${slug}.webp`} alt="" aria-hidden className={className} loading="lazy" decoding="async" />;
  }
  return (
    <video
      key={slug}
      ref={videoRef}
      className={className}
      poster={`/clips/${slug}.webp`}
      muted
      playsInline
      loop
      preload="none"
      disablePictureInPicture
      aria-hidden
      tabIndex={-1}
    >
      <source src={`/clips/${slug}.webm`} type='video/webm; codecs="vp9"' />
      <source src={`/clips/${slug}.mp4`} type='video/mp4; codecs="avc1.64001f"' />
    </video>
  );
}

/**
 * Wide showcase for a tall gameplay clip: the game's art drifts slowly in the background
 * and the 9:16 clip plays in a phone-shaped frame on top (a wide card never crops the clip
 * into a blurry strip). Falls back to the plain cover when a game has no clip.
 */
export function ClipStage({ slug, align = 'right', phone = '88%', children = null }) {
  const clip = hasClip(slug);
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/covers/${slug}.webp`} alt="" className={`absolute inset-0 h-full w-full object-cover ${clip ? 'stage-drift brightness-[0.55]' : ''}`} />
      {clip && (
        <div
          className={`stage-phone absolute top-1/2 aspect-[9/16] -translate-y-1/2 overflow-hidden rounded-[14px] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.6)] ring-2 ring-white/15 ${
            align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-[7%]'
          }`}
          style={{ height: phone }}
        >
          <ClipVideo slug={slug} />
        </div>
      )}
      {children}
    </div>
  );
}

export default function GameTile({ game, size = 'md', badge = null, href = null, priority = false, variant = 'wide' }) {
  const [mine, setMine] = useState(null);
  const big = size === 'lg';
  const tall = variant === 'tall';
  const clip = tall && hasClip(game.slug);

  useEffect(() => {
    const g = getPlayer().games[game.slug];
    setMine(g ? { best: g.best, medal: g.medal || 0 } : { fresh: true });
  }, [game.slug]);

  const full = getGame(game.slug);
  let chip = null;
  if (mine && mine.best != null)
    chip = (
      <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-extrabold text-white backdrop-blur">
        {mine.medal ? MEDALS[mine.medal] + ' ' : ''}
        {full ? formatScore(full, mine.best) : mine.best}
      </span>
    );

  return (
    <Link href={href || `/games/${game.slug}`} className="tile group" aria-label={`Play ${game.title}`}>
      <div className={`relative ${tall ? 'aspect-[9/16]' : big ? 'aspect-[16/11]' : 'aspect-[4/3]'}`}>
        {clip ? (
          <ClipVideo slug={game.slug} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/covers/${game.slug}.webp`}
            alt=""
            className="h-full w-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            width={800}
            height={600}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
          {badge ? <span className="badge bg-sun text-ink">{badge}</span> : <span />}
          {chip}
        </div>
        <span className="absolute bottom-3 right-3 hidden h-9 w-9 translate-y-1 place-items-center rounded-full bg-pink text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 sm:grid">
          <IconPlay className="ml-0.5 h-4 w-4" />
        </span>
      </div>
      <div className={`absolute bottom-0 left-0 right-12 ${big ? 'p-4 sm:p-5' : 'p-3'}`}>
        <div className={`tile-title text-white ${big ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-[22px]'}`}>{game.title}</div>
        <div className={`mt-1 truncate text-white/70 ${big ? 'text-sm sm:text-base' : 'text-[11px] sm:text-xs'}`}>
          {big ? (
            game.tagline
          ) : (
            <>
              {CATEGORIES[game.category]?.name}
              <span className="hidden sm:inline"> · {game.tagline}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
