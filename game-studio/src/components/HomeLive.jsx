'use client';

// Interactive pieces of the home page: the playable hero cabinet, the returning-player
// strip, and the champions ticker/board (real leaderboard data only).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import GamePlayer from './GamePlayer';
import GameTile from './GameTile';
import { getPlayer, levelInfo } from '@/lib/player';
import { GAMES } from '@/lib/games';

export function HeroCabinet({ picks }) {
  const [slug, setSlug] = useState(picks[0].slug);
  const current = picks.find((p) => p.slug === slug) || picks[0];
  return (
    <div>
      <div className="cabinet">
        <div className="cabinet-inner">
          <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime" aria-hidden />
            <span className="truncate font-cond text-[15px] font-extrabold uppercase tracking-wide text-white">
              <span className="text-pink">{slug === picks[0].slug ? 'Game of the day' : 'Now playing'}</span> · {current.title}
            </span>
            <Link href={`/games/${slug}`} className="ml-auto shrink-0 text-xs font-extrabold text-mute hover:text-white">
              Full screen ↗
            </Link>
          </div>
          <GamePlayer key={slug} slug={slug} frameClass="hero-frame" compact />
        </div>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Switch game">
        {picks.map((p) => (
          <button
            key={p.slug}
            type="button"
            role="tab"
            aria-selected={p.slug === slug}
            onClick={() => setSlug(p.slug)}
            className={`flex shrink-0 items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3 text-sm font-extrabold ring-1 transition ${
              p.slug === slug ? 'bg-white text-ink ring-white' : 'bg-card text-white/75 ring-line hover:text-white'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/covers/${p.slug}.webp`} alt="" className="h-8 w-10 rounded-lg object-cover" />
            {p.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WelcomeBack() {
  const [p, setP] = useState(null);
  useEffect(() => {
    const pl = getPlayer();
    if (pl.recent.length) setP(pl);
  }, []);
  if (!p) return null;
  const lvl = levelInfo(p.xp);
  const last = GAMES.find((g) => g.slug === p.recent[0]);
  const today = new Date().toISOString().slice(0, 10);
  const playedToday = p.streak.last === today;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-panel p-3 ring-1 ring-line">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sun to-pink font-cond text-2xl font-extrabold text-ink">{lvl.level}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-white">Welcome back{p.name ? `, ${p.name}` : ''}!</div>
        <div className="text-xs text-white/60">
          {playedToday ? `🔥 ${p.streak.count}-day streak is safe today` : p.streak.count ? `🔥 Play today to keep your ${p.streak.count}-day streak` : 'Start a daily streak today'}
        </div>
      </div>
      {last && (
        <Link href={`/games/${last.slug}`} className="btn-pink px-4 py-2 text-sm">
          ▶ {last.title}
        </Link>
      )}
    </div>
  );
}

function useChampions() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/highlights')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData(j ? j.champions : []))
      .catch(() => setData([]));
  }, []);
  return data;
}

export function ChampionsTicker() {
  const champs = useChampions();
  if (champs == null) return <div className="h-11" />;
  const items = champs.length
    ? champs.map((c) => (
        <Link key={c.slug} href={`/games/${c.slug}`} className="flex shrink-0 items-center gap-2 text-sm font-bold text-white/85 hover:text-white">
          <span className="text-base">👑</span>
          <span className="text-sun">{c.name}</span> leads {c.emoji} {c.title} with <span className="font-cond text-base font-extrabold text-pink">{c.score}</span>
        </Link>
      ))
    : GAMES.slice(0, 8).map((g) => (
        <Link key={g.slug} href={`/games/${g.slug}`} className="flex shrink-0 items-center gap-2 text-sm font-bold text-white/80 hover:text-white">
          👑 {g.emoji} {g.title}: <span className="text-sun">crown is up for grabs today</span>
        </Link>
      ));
  return (
    <div className="relative overflow-hidden border-y border-line bg-night py-2.5" aria-label="Today's champions">
      <div className="ticker">
        {items}
        {items.map((el, i) => (
          <span key={`dup-${i}`} aria-hidden className="contents">
            {el}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChampionsBoard() {
  const champs = useChampions();
  if (!champs || champs.length === 0)
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl">👑</div>
        <div className="mt-2 font-cond text-2xl font-extrabold uppercase">Every crown is up for grabs today</div>
        <p className="mt-1 text-white/60">Post the first score on any game and your name goes on this board.</p>
      </div>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {champs.map((c) => (
        <Link key={c.slug} href={`/games/${c.slug}`} className="card flex items-center gap-3 p-3 transition hover:ring-2 hover:ring-sun">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/covers/${c.slug}.webp`} alt="" className="h-14 w-16 rounded-xl object-cover" loading="lazy" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-white/60">
              {c.emoji} {c.title} · {c.players} {c.players === 1 ? 'player' : 'players'}
            </div>
            <div className="truncate font-display text-lg font-bold">
              👑 {c.name}
            </div>
          </div>
          <div className="font-cond text-2xl font-extrabold text-sun">{c.score}</div>
        </Link>
      ))}
    </div>
  );
}

/** "All games" grid with category filter chips (instant, no page load). */
export function GameBrowser({ games, cats }) {
  const [cat, setCat] = useState('all');
  const list = cat === 'all' ? games : games.filter((g) => g.category === cat);
  const tabs = [['all', 'All', games.length], ...cats.map((c) => [c.id, `${c.emoji} ${c.name}`, games.filter((g) => g.category === c.id).length])];
  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter games">
        {tabs.map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={cat === id}
            onClick={() => setCat(id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition ${
              cat === id ? 'bg-white text-ink ring-white' : 'bg-card text-white/70 ring-line hover:text-white'
            }`}
          >
            {label} <span className={cat === id ? 'text-ink/45' : 'text-mute'}>{n}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((g, i) => (
          <GameTile key={g.slug} game={g} priority={i < 4} variant="tall" />
        ))}
      </div>
    </>
  );
}
