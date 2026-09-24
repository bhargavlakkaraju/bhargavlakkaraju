'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlayer } from '@/lib/player';
import { track } from '@/lib/analytics';
import { GAMES, MEDALS } from '@/lib/games';

export function TrackPageView({ game = null }) {
  useEffect(() => {
    track('page_view', game ? { g: game } : {});
  }, [game]);
  return null;
}

export function Countdown({ className = '' }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const s = Math.max(0, Math.floor((next - now.getTime()) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      setLeft(`${h}:${m}:${sec}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className={`font-mono tabular-nums ${className}`}>{left || '--:--:--'}</span>;
}

export function NewsletterForm({ src = 'home' }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    setState('busy');
    try {
      const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, src }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Something went wrong');
      setState('done');
      track('subscribe');
    } catch (err) {
      setState('idle');
      setMsg(err.message);
    }
  }
  if (state === 'done') return <p className="font-bold text-lime">🎉 You’re in! Watch your inbox for new games.</p>;
  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="min-w-0 flex-1 rounded-2xl bg-ink/70 px-4 py-3 text-white outline-none ring-1 ring-white/15 focus:ring-pink"
        aria-label="Email address"
      />
      <button className="btn-pink" disabled={state === 'busy'}>
        {state === 'busy' ? '…' : 'Notify me'}
      </button>
      {msg && <p className="text-sm text-pink sm:hidden">{msg}</p>}
    </form>
  );
}

export function RecentlyPlayed() {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    const p = getPlayer();
    setRecent(
      p.recent
        .map((s) => GAMES.find((g) => g.slug === s))
        .filter(Boolean)
        .map((g) => ({ ...g, progress: p.games[g.slug] })),
    );
  }, []);
  if (!recent.length) return null;
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4">
      <h2 className="section-title">Jump back in</h2>
      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">
        {recent.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="flex w-60 shrink-0 items-center gap-3 rounded-2xl bg-panel p-2 ring-1 ring-line hover:ring-pink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/covers/${g.slug}.png`} alt="" className="h-14 w-16 rounded-xl object-cover" />
            <div className="min-w-0">
              <div className="truncate font-display font-bold text-white">{g.title}</div>
              <div className="text-xs text-white/60">
                Best {g.progress?.best ?? '-'} {MEDALS[g.progress?.medal || 0]}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function EmbedCode({ slug, url }) {
  const [copied, setCopied] = useState(false);
  const code = `<iframe src="${url}/embed/${slug}" width="420" height="740" style="border:0;border-radius:16px;max-width:100%" allow="autoplay; fullscreen" loading="lazy" title="Play free on Retry Arcade"></iframe>`;
  return (
    <div>
      <textarea readOnly value={code} className="h-24 w-full resize-none rounded-2xl bg-ink/70 p-3 font-mono text-xs text-white/80 ring-1 ring-white/10" onFocus={(e) => e.target.select()} />
      <button
        className="btn-ghost mt-2 text-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
          } catch {
            /* select + copy manually */
          }
          setCopied(true);
          track('embed_copy', { g: slug });
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? '✓ Copied' : '📋 Copy embed code'}
      </button>
    </div>
  );
}

// Captures the browser's "install app" prompt so the game-over panel can offer it at a
// good moment (after a few runs) instead of the browser's generic mini-infobar.
export function InstallCapture() {
  useEffect(() => {
    const on = (e) => {
      e.preventDefault();
      window.__raInstall = e;
    };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  return null;
}
