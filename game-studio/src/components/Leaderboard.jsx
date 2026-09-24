'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPlayer } from '@/lib/player';
import { getGame, formatScore } from '@/lib/games';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'daily', label: '📅 Daily' },
  { id: 'all', label: 'All-time' },
];

export default function Leaderboard({ slug, compact = false }) {
  const meta = getGame(slug);
  const daily = meta?.daily !== false;
  const [board, setBoard] = useState('today');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const vid = getPlayer().vid;
      const r = await fetch(`/api/leaderboard?slug=${slug}&board=${board}&limit=${compact ? 5 : 10}&vid=${vid}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
      setErr(false);
    } catch {
      setErr(true);
    }
  }, [slug, board, compact]);

  useEffect(() => {
    load();
    const on = (e) => e.detail?.slug === slug && load();
    window.addEventListener('ra:lb', on);
    return () => window.removeEventListener('ra:lb', on);
  }, [load, slug]);

  const fmt = (v) => (meta ? formatScore(meta, v) : v);
  const tabs = daily ? TABS : TABS.filter((t) => t.id !== 'daily');

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-full bg-ink/60 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setBoard(t.id)}
            className={`flex-1 rounded-full px-2 py-1 text-xs font-extrabold transition ${board === t.id ? 'bg-white text-ink' : 'text-white/60 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-white/50">Leaderboard unavailable right now.</p>}
      {!err && !data && <p className="text-sm text-white/40">Loading…</p>}
      {data && data.entries.length === 0 && <p className="text-sm text-white/60">No scores yet. Be the first on the board! 👑</p>}
      {data && data.entries.length > 0 && (
        <ol className="space-y-1">
          {data.entries.map((e) => (
            <li key={e.rank} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm ${e.you ? 'bg-pink/20 ring-1 ring-pink/50' : 'bg-white/[0.03]'}`}>
              <span className="w-6 text-center font-black text-white/60">{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</span>
              <span className="flex-1 truncate font-bold text-white">{e.name}</span>
              <span className="font-display font-bold text-sun">{fmt(e.score)}</span>
            </li>
          ))}
        </ol>
      )}
      {data && data.you && !data.entries.some((e) => e.you) && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-pink/20 px-2.5 py-1.5 text-sm ring-1 ring-pink/50">
          <span className="w-6 text-center font-black text-white/70">{data.you.rank}</span>
          <span className="flex-1 font-bold">You</span>
          <span className="font-display font-bold text-sun">{fmt(data.you.score)}</span>
        </div>
      )}
      {data && data.total > 0 && <div className="mt-2 text-right text-[11px] text-white/40">{data.total} players</div>}
    </div>
  );
}
