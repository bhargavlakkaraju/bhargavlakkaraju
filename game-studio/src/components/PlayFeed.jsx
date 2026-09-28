'use client';

// The play feed: swipe up for the next game, the way people swipe through short videos,
// except every card is a game you can play in place. Previews are the looping gameplay
// clips; tapping a card mounts the real game in the same spot. Built to replace a few
// minutes of doom scrolling with a few minutes of play.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GamePlayer from './GamePlayer';
import AdSlot from './AdSlot';
import { hasClip } from '@/lib/games';
import { track } from '@/lib/analytics';
import { getPlayer } from '@/lib/player';
import { sfx } from '@/games/engine/audio.js';
import { SITE, CATEGORIES } from '@/lib/site';

const AD_EVERY = 8; // one sponsor card after every 7 games
const HINT_KEY = 'ra:feedhint';

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Games this visitor has not tried yet come first; then everything, reshuffled each lap.
function nextLap(games, avoid) {
  let played = {};
  try {
    played = getPlayer().games || {};
  } catch {
    /* no storage */
  }
  const fresh = shuffled(games.filter((g) => !played[g.slug]));
  const seen = shuffled(games.filter((g) => played[g.slug]));
  const lap = [...fresh, ...seen].filter((g) => !avoid.includes(g.slug));
  return lap.length ? lap : shuffled(games);
}

export default function PlayFeed({ games, start }) {
  const first = games.find((g) => g.slug === start) || games[0];
  const [items, setItems] = useState([{ key: `0-${first.slug}`, game: first }]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(-1);
  const [hint, setHint] = useState(false);
  const scroller = useRef(null);
  const sections = useRef([]);
  const count = useRef(1);

  const append = useCallback(
    (list) => {
      const recent = list.slice(-4).map((it) => it.game?.slug).filter(Boolean);
      const lap = nextLap(games, recent);
      const out = list.slice();
      for (const g of lap) {
        if ((out.length + 1) % AD_EVERY === 0) out.push({ key: `ad-${count.current++}`, ad: true });
        out.push({ key: `${count.current++}-${g.slug}`, game: g });
      }
      return out;
    },
    [games],
  );

  // Build the rest of the feed on the client (it depends on what this visitor has played).
  useEffect(() => {
    setItems((list) => append(list));
    try {
      setHint(!localStorage.getItem(HINT_KEY));
    } catch {
      /* ignore */
    }
  }, [append]);

  // Endless: add another lap when the visitor gets close to the end.
  useEffect(() => {
    if (active >= items.length - 4) setItems((list) => append(list));
  }, [active, items.length, append]);

  // Which card is on screen.
  useEffect(() => {
    const root = scroller.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.i));
      },
      { root, threshold: 0.6 },
    );
    sections.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  // A new card: stop the game on the old one, count the view, keep the URL shareable.
  useEffect(() => {
    setPlaying(-1);
    const it = items[active];
    if (!it) return;
    if (active > 0 && hint) {
      setHint(false);
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    if (it.game) {
      track('feed_view', { g: it.game.slug });
      const u = new URL(window.location.href);
      u.searchParams.set('g', it.game.slug);
      window.history.replaceState(null, '', u);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const go = useCallback((i) => {
    const el = sections.current[i];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const next = useCallback(() => {
    track('feed_next', { g: items[active]?.game?.slug });
    go(active + 1);
  }, [active, items, go]);

  const play = useCallback(
    (i) => {
      const it = items[i];
      if (!it || !it.game) return;
      sfx.unlock();
      setPlaying(i);
      track('feed_play', { g: it.game.slug });
    },
    [items],
  );

  // Keyboard: arrows / J K move through the feed while nothing is being played;
  // Enter or Space plays; Escape puts the game back into preview.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (playing >= 0) {
        if (e.key === 'Escape') setPlaying(-1);
        return;
      }
      if (['ArrowDown', 'PageDown', 'j'].includes(e.key)) {
        e.preventDefault();
        go(active + 1);
      } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
        e.preventDefault();
        go(Math.max(0, active - 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        play(active);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, playing, go, play]);

  const share = async (g) => {
    const url = `${SITE.url}/play?g=${g.slug}&utm_source=share&utm_medium=feed`;
    const text = `${g.emoji} ${g.title}: ${g.tagline} Free, no download. Swipe for more games:`;
    track('share_click', { g: g.slug, c: 'feed' });
    try {
      if (navigator.share) await navigator.share({ title: `${g.title} - ${SITE.name}`, text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white">
      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-center bg-gradient-to-b from-black/70 to-transparent">
        <div className="pointer-events-auto flex h-full w-full max-w-[calc(100dvh*0.5625)] items-center gap-2 px-3">
          <Link href="/" className="font-display text-[15px] font-bold tracking-wide" aria-label={`${SITE.name} home`}>
            RETRY<span className="text-pink">ARCADE</span>
          </Link>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white/70">PLAY FEED</span>
          <button onClick={next} className="ml-auto rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold ring-1 ring-white/15 hover:bg-white/20">
            Next ↓
          </button>
        </div>
      </div>

      <div ref={scroller} className="feed-scroll h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {items.map((it, i) => {
          const near = Math.abs(i - active) <= 2;
          return (
            <section
              key={it.key}
              data-i={i}
              ref={(el) => (sections.current[i] = el)}
              className="relative flex h-[100dvh] w-full snap-start snap-always items-center justify-center"
            >
              <div className="relative h-full w-full max-w-[calc(100dvh*0.5625)] overflow-hidden bg-ink">
                {near && it.ad && <SponsorCard />}
                {near && it.game && (
                  playing === i ? (
                    <div className="absolute inset-x-0 bottom-0 top-12">
                      <GamePlayer slug={it.game.slug} feed onNext={next} />
                    </div>
                  ) : (
                    <Preview game={it.game} live={i === active} onPlay={() => play(i)} onShare={() => share(it.game)} />
                  )
                )}
                {i === 0 && hint && playing < 0 && (
                  <div className="pointer-events-none absolute inset-x-0 top-[34%] z-20 flex justify-center">
                    <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/55 px-4 py-3 text-sm font-extrabold text-white backdrop-blur">
                      <span className="animate-bounce text-2xl leading-none">⌃</span>
                      Swipe up for the next game
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Preview({ game, live, onPlay, onShare }) {
  const video = useRef(null);
  const clip = hasClip(game.slug);
  const poster = clip ? `/clips/${game.slug}.webp` : `/covers/${game.slug}.webp`;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (live) v.play().catch(() => {});
    else v.pause();
  }, [live]);

  const cat = CATEGORIES[game.category];
  return (
    <div className="absolute inset-0">
      {clip ? (
        <video
          ref={video}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          preload={live ? 'auto' : 'metadata'}
          poster={poster}
          aria-hidden
        >
          <source src={`/clips/${game.slug}.webm`} type='video/webm; codecs="vp9"' />
          <source src={`/clips/${game.slug}.mp4`} type='video/mp4; codecs="avc1.64001f"' />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <button onClick={onPlay} className="absolute inset-0 z-10 cursor-pointer" aria-label={`Play ${game.title}`} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* right rail */}
      <div className="absolute bottom-40 right-3 z-20 flex flex-col items-center gap-4">
        <button onClick={onShare} className="grid h-12 w-12 place-items-center rounded-full bg-black/40 text-xl ring-1 ring-white/20 backdrop-blur" aria-label={`Share ${game.title}`}>
          ↗
        </button>
        <Link href={`/games/${game.slug}`} className="grid h-12 w-12 place-items-center rounded-full bg-black/40 text-lg font-extrabold ring-1 ring-white/20 backdrop-blur" aria-label={`${game.title} page`}>
          i
        </Link>
      </div>

      {/* info + play */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 pb-8">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold">
          {cat && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
              {cat.emoji} {cat.name}
            </span>
          )}
          {game.party && <span className="rounded-full bg-sun px-2 py-0.5 text-ink">👥 1-4 players, one phone</span>}
        </div>
        <h2 className="font-display text-4xl font-bold uppercase leading-none">{game.title}</h2>
        <p className="mt-1 max-w-[85%] text-sm font-semibold text-white/80">{game.tagline}</p>
        <button onClick={onPlay} className="btn-pink pointer-events-auto mt-4 w-full text-lg">
          ▶ Tap to play
        </button>
      </div>
    </div>
  );
}

function SponsorCard() {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <div className="mb-3 text-[11px] font-extrabold tracking-widest text-white/40">SPONSORED</div>
        <AdSlot slot="gameSide" className="mx-auto min-h-[250px] w-[300px]" />
        <div className="mt-6 text-sm font-bold text-white/60">Swipe up to keep playing ↑</div>
      </div>
    </div>
  );
}
