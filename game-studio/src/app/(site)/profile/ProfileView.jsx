'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlayer, levelInfo, setName, BADGES } from '@/lib/player';
import { GAMES, MEDALS, formatScore } from '@/lib/games';
import { cleanNameClient } from './clean';

export default function ProfileView() {
  const [p, setP] = useState(null);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const pl = getPlayer();
    setP(pl);
    setDraft(pl.name || '');
  }, []);
  if (!p) return <div className="mx-auto max-w-5xl px-4 pt-10 text-white/50">Loading…</div>;
  const lvl = levelInfo(p.xp);
  const played = GAMES.filter((g) => p.games[g.slug]);
  const golds = Object.values(p.games).filter((g) => g.medal >= 3).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-sun to-pink font-display text-4xl font-bold text-ink shadow-glow">
          {lvl.level}
        </div>
        <div className="flex-1">
          <h1 className="font-cond text-4xl font-extrabold uppercase leading-none">{p.name || 'Anonymous player'}</h1>
          <div className="mt-1 text-sm text-white/60">
            Level {lvl.level} · {p.xp} XP · {lvl.need - lvl.into} XP to level {lvl.level + 1}
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-pink to-sun" style={{ width: `${lvl.pct}%` }} />
          </div>
          <form
            className="mt-4 flex max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = cleanNameClient(draft);
              if (!n) return;
              setName(n);
              setP({ ...getPlayer() });
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
          >
            <input
              value={draft}
              maxLength={16}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Leaderboard name"
              className="min-w-0 flex-1 rounded-xl bg-ink/70 px-3 py-2 text-white outline-none ring-1 ring-white/15 focus:ring-pink"
            />
            <button className="rounded-xl bg-aqua px-4 font-extrabold text-ink">{saved ? '✓' : 'Save'}</button>
          </form>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-1">
          <div>
            <div className="font-display text-3xl font-bold text-sun">🔥 {p.streak.count}</div>
            <div className="text-xs font-bold text-white/50">day streak (best {p.streak.best || 0})</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold">{played.length}</div>
            <div className="text-xs font-bold text-white/50">games played</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold">{golds} 🥇</div>
            <div className="text-xs font-bold text-white/50">gold medals</div>
          </div>
        </div>
      </div>

      <h2 className="section-title mt-10">Badges</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Object.entries(BADGES).map(([id, b]) => {
          const has = p.badges.includes(id);
          return (
            <div key={id} className={`card p-4 ${has ? '' : 'opacity-40 grayscale'}`}>
              <div className="text-3xl">{b.emoji}</div>
              <div className="mt-1 font-bold">{b.name}</div>
              <div className="text-xs text-white/60">{b.desc}</div>
            </div>
          );
        })}
      </div>

      <h2 className="section-title mt-10">Your games</h2>
      <div className="mt-4 overflow-hidden rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Runs</th>
              <th className="px-4 py-3">Best</th>
              <th className="px-4 py-3">Medal</th>
            </tr>
          </thead>
          <tbody>
            {GAMES.map((g) => {
              const s = p.games[g.slug];
              return (
                <tr key={g.slug} className="border-t border-line">
                  <td className="px-4 py-2.5">
                    <Link href={`/games/${g.slug}`} className="font-bold hover:text-pink">
                      {g.emoji} {g.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-white/70">{s?.runs || 0}</td>
                  <td className="px-4 py-2.5 font-display font-bold text-sun">{s ? formatScore(g, s.best) : '-'}</td>
                  <td className="px-4 py-2.5 text-lg">{s?.medal ? MEDALS[s.medal] : s ? '' : <span className="text-xs text-pink">NEW</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-white/40">Progress is saved on this device. Clearing your browser data resets it.</p>
    </div>
  );
}
