'use client';

// Instant search across games, "best of" lists and guides. Opens from the header, the
// mobile search bar, "/" or Cmd/Ctrl+K. The index is built on the server and passed in,
// so the client bundle only carries titles and slugs.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconSearch, IconClose, IconArrow } from './Icons';

const EVENT = 'ra:search';
export const openSearch = () => window.dispatchEvent(new Event(EVENT));

export function SearchButton({ className = '', children }) {
  return (
    <button type="button" onClick={openSearch} className={className} aria-label="Search games">
      {children}
    </button>
  );
}

/** Full-width search field for the top of the mobile home page (opens the overlay). */
export function SearchBar({ className = '' }) {
  return (
    <button
      type="button"
      onClick={openSearch}
      className={`flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left text-mute ring-1 ring-line ${className}`}
    >
      <IconSearch className="h-5 w-5" />
      <span className="text-[15px]">Search 15 free games…</span>
    </button>
  );
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ');

function score(q, fields) {
  let best = 0;
  for (const [text, weight] of fields) {
    const t = norm(text);
    if (!t) continue;
    if (t.startsWith(q)) best = Math.max(best, 3 * weight);
    else if (t.includes(` ${q}`)) best = Math.max(best, 2 * weight);
    else if (t.includes(q)) best = Math.max(best, 1 * weight);
  }
  return best;
}

export function SearchOverlay({ index }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setActive(0);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => input.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const s = norm(q).trim();
    if (!s) return null;
    const games = index.games
      .map((g) => ({ g, s: score(s, [[g.title, 5], [g.category, 3], [g.tags, 2], [g.tagline, 1]]) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ g }) => ({ type: 'game', href: `/games/${g.slug}`, ...g }));
    const lists = index.lists
      .map((l) => ({ l, s: score(s, [[l.title, 2]]) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ l }) => ({ type: 'list', href: `/best/${l.slug}`, title: l.title }));
    const guides = index.guides
      .map((l) => ({ l, s: score(s, [[l.title, 2]]) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ l }) => ({ type: 'guide', href: `/guides/${l.slug}`, title: l.title }));
    return { games, lists, guides, flat: [...games, ...lists, ...guides] };
  }, [q, index]);

  const flat = results ? results.flat : index.games.slice(0, 6).map((g) => ({ type: 'game', href: `/games/${g.slug}`, ...g }));

  function go(item) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    }
  }

  if (!open) return null;

  const Row = ({ item }) => {
    const idx = flat.findIndex((f) => f.href === item.href);
    const on = idx === active;
    return (
      <Link
        href={item.href}
        onClick={close}
        onMouseEnter={() => setActive(idx)}
        className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${on ? 'bg-raised' : ''}`}
      >
        {item.type === 'game' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/covers/${item.slug}.webp`} alt="" className="h-10 w-[53px] shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-10 w-[53px] shrink-0 place-items-center rounded-lg bg-card text-lg">{item.type === 'list' ? '⭐' : '📚'}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-white">{item.title}</span>
          <span className="block truncate text-xs text-mute">
            {item.type === 'game' ? `${item.categoryName} · ${item.tagline}` : item.type === 'list' ? 'Best games list' : 'Strategy guide'}
          </span>
        </span>
        {on && <IconArrow className="h-4 w-4 shrink-0 text-pink" />}
      </Link>
    );
  };
  const Group = ({ title, items }) =>
    items.length ? (
      <div className="mb-2">
        <div className="px-2.5 pb-1 pt-2 font-cond text-[13px] font-extrabold uppercase tracking-wider text-mute">{title}</div>
        {items.map((it) => (
          <Row key={it.href} item={it} />
        ))}
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && close()} role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto flex h-full w-full flex-col bg-panel sm:mt-[10vh] sm:h-auto sm:max-h-[75vh] sm:max-w-xl sm:rounded-2xl sm:ring-1 sm:ring-line">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
          <IconSearch className="h-5 w-5 text-mute" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search games, lists and guides"
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-mute"
            aria-label="Search"
            enterKeyHint="go"
          />
          <button type="button" onClick={close} className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-raised hover:text-white" aria-label="Close search">
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {!results && (
            <>
              <div className="px-2.5 pb-2 pt-1 font-cond text-[13px] font-extrabold uppercase tracking-wider text-mute">Browse</div>
              <div className="flex flex-wrap gap-2 px-2.5 pb-3">
                {index.categories.map((c) => (
                  <Link key={c.id} href={`/category/${c.id}`} onClick={close} className="pill-link">
                    {c.emoji} {c.name}
                  </Link>
                ))}
                <Link href="/daily" onClick={close} className="pill-link">
                  📅 Daily
                </Link>
              </div>
              <Group title="Popular" items={flat} />
            </>
          )}
          {results && (
            <>
              <Group title="Games" items={results.games} />
              <Group title="Best games lists" items={results.lists} />
              <Group title="Guides" items={results.guides} />
              {!results.flat.length && (
                <div className="px-3 py-10 text-center text-mute">
                  No match for “{q}”. Try “puzzle”, “cards” or “word”.
                </div>
              )}
            </>
          )}
        </div>
        <div className="hidden shrink-0 items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-mute sm:flex">
          <span>↑↓ to move</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
