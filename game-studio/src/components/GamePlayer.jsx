'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { mountGame } from '@/games/engine/core.js';
import { sfx } from '@/games/engine/audio.js';
import { LOADERS, GAMES, MEDALS, medalFor, formatScore, related } from '@/lib/games';
import { getPlatform, maybeInterstitial } from '@/lib/ads';
import { track } from '@/lib/analytics';
import { getPlayer, recordRun, setName, markShared, levelInfo, BADGES } from '@/lib/player';
import { variant } from '@/lib/experiments';
import { challengeUrl, shareText, shareTo, CHANNELS } from '@/lib/share';
import { SITE, ADS, MONEY } from '@/lib/site';
import { isPlusActive } from '@/lib/plus';

function nextMedal(meta, best) {
  if (!meta.medals) return null;
  const cur = medalFor(meta, best);
  if (cur >= meta.medals.length) return null;
  const t = meta.medals[cur];
  if (best == null) return { tier: cur + 1, text: `${MEDALS[cur + 1]} at ${formatScore(meta, t)}` };
  if (meta.lowerIsBetter) return { tier: cur + 1, text: `beat ${formatScore(meta, t)} for ${MEDALS[cur + 1]}` };
  return { tier: cur + 1, text: `${t - best} more for ${MEDALS[cur + 1]}` };
}

async function submitScore({ meta, score, mode, name }) {
  const p = getPlayer();
  const res = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug: meta.slug, score, mode, name, vid: p.vid }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  window.dispatchEvent(new CustomEvent('ra:lb', { detail: { slug: meta.slug } }));
  return data;
}

export default function GamePlayer({ slug, challenge = null, embed = false, initialMode = null, frameClass = 'game-frame', compact = false }) {
  const frameRef = useRef(null);
  const outerRef = useRef(null);
  const stageRef = useRef(null);
  const ctrlRef = useRef(null);
  const metaRef = useRef(null);
  const overAtRef = useRef(0);
  const runRef = useRef(0);
  const [status, setStatus] = useState('loading');
  const [meta, setMeta] = useState(null);
  const [mode, setMode] = useState(initialMode || 'classic');
  const [over, setOver] = useState(null);
  const [offer, setOffer] = useState(null);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [rank, setRank] = useState(null);
  const [best, setBest] = useState(null);
  const target = challenge ? challenge.score : null;

  const toast = useCallback((text, tone = 'pink') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // Read ?mode=daily on first load (kept out of render to allow static pages).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!initialMode && q.get('mode') === 'daily') setMode('daily');
    setMuted(sfx.isMuted());
    window.__RA_TOTAL_GAMES = GAMES.length;
    if (challenge) track('challenge_open', { g: slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGameOver = useCallback(
    async (d) => {
      const m = metaRef.current;
      const run = ++runRef.current;
      overAtRef.current = performance.now();
      track('game_over', { g: slug, d: d.duration });
      const prog = recordRun({ meta: m, score: d.score, isNewBest: d.isNewBest, mode: d.mode, win: d.win });
      setBest(d.best);
      if (prog.levelUp) {
        track('level_up', { g: slug });
        toast(`⭐ Level ${prog.levelUp}!`, 'sun');
      }
      if (prog.medal) track('medal', { g: slug });
      prog.newBadges.forEach((b) => toast(`${BADGES[b].emoji} Badge: ${BADGES[b].name}`, 'aqua'));
      const beat = challenge ? (m.lowerIsBetter ? d.win !== false && d.score < challenge.score : d.score > challenge.score) : false;
      if (beat) track('challenge_won', { g: slug });
      setShareOpen(false);
      setRank(null);
      setOver({ ...d, prog, beat });
      setOffer(null);
      // Leaderboard: auto-post personal bests once the player has a name.
      const p = getPlayer();
      const counts = !(m.lowerIsBetter && d.win === false) && d.score > 0 && d.stats?.rankable !== false;
      if (p.name && counts && !embed) {
        submitScore({ meta: m, score: d.score, mode: d.mode, name: p.name })
          .then((r) => r && r.you && setRank(r.you))
          .catch(() => {});
      }
      if (d.canRevive) {
        const pf = getPlatform({ embed });
        const o = await pf.prepareRewarded('revive').catch(() => null);
        // Ignore a late offer if the player already moved on to another run.
        if (o && run === runRef.current && ctrlRef.current && ctrlRef.current.state === 'over') {
          setOffer(o);
          track('revive_offer', { g: slug });
        }
      }
    },
    [slug, challenge, embed, toast],
  );
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // Mount / remount the engine when the game or mode changes.
  useEffect(() => {
    let ctrl = null;
    let cancelled = false;
    setStatus('loading');
    setOver(null);
    setOffer(null);
    const loader = LOADERS[slug];
    if (!loader) {
      setStatus('error');
      return undefined;
    }
    loader()
      .then(([gameMod, metaMod]) => {
        if (cancelled || !stageRef.current) return;
        const m = metaMod.default;
        metaRef.current = m;
        setMeta(m);
        const platform = getPlatform({ embed });
        ctrl = mountGame(stageRef.current, gameMod.default, m, {
          mode,
          target,
          platform,
          onEvent(name, data) {
            if (name === 'ready') {
              setBest(data.best);
            } else if (name === 'start') {
              if (!data.revived) track('game_start', { g: slug });
              setOver(null);
            } else if (name === 'gameover') {
              onGameOverRef.current(data);
            } else if (name === 'milestone') {
              track('milestone', { g: slug });
            }
          },
        });
        ctrlRef.current = ctrl;
        setStatus('ready');
        track('game_load', { g: slug });
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      if (ctrl) ctrl.destroy();
      ctrlRef.current = null;
    };
  }, [slug, mode, target, embed]);

  const playAgain = useCallback(async () => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    setOver(null);
    setOffer(null);
    const shown = await maybeInterstitial(getPlatform({ embed }));
    if (shown) track('ad_interstitial', { g: slug });
    ctrl.restart();
    track('restart', { g: slug });
  }, [slug, embed]);

  const doRevive = useCallback(async () => {
    const ctrl = ctrlRef.current;
    if (!ctrl || !offer) return;
    track('revive_accept', { g: slug });
    const o = offer;
    setOffer(null);
    const ok = await o.show();
    if (ok) {
      if (o.isAd) track('ad_rewarded', { g: slug });
      setOver(null);
      ctrl.revive();
    }
  }, [offer, slug]);

  const share = useCallback(
    async (channel) => {
      if (!over || !meta) return;
      const p = getPlayer();
      const url = challengeUrl(slug, over.score, p.name || 'A friend');
      const text = shareText({ meta, score: over.score, medal: medalFor(meta, over.score), stats: over.stats, cta: variant('share_cta') });
      const ok = await shareTo(channel, { text, url, title: `${meta.title} - ${SITE.name}` });
      track('share_click', { g: slug, c: channel });
      if (ok && channel === 'copy') toast('🔗 Link copied!', 'aqua');
      markShared().forEach((b) => toast(`${BADGES[b].emoji} Badge: ${BADGES[b].name}`, 'aqua'));
    },
    [over, meta, slug, toast],
  );

  const saveName = useCallback(async () => {
    const n = nameDraft.trim();
    if (n.length < 2 || !over || !meta) return;
    setName(n);
    track('nick_set', { g: slug });
    const r = await submitScore({ meta, score: over.score, mode: over.mode, name: n }).catch(() => null);
    if (r && r.you) setRank(r.you);
    else if (!r) toast('That name is not allowed', 'pink');
  }, [nameDraft, over, meta, slug, toast]);

  // Space / Enter on the game-over panel = play again.
  useEffect(() => {
    if (!over) return undefined;
    const onKey = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if ((e.key === ' ' || e.key === 'Enter') && performance.now() - overAtRef.current > 450) {
        e.preventDefault();
        playAgain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [over, playAgain]);

  // Fullscreen (native where supported, CSS fallback for iOS).
  const toggleFull = useCallback(async () => {
    const el = outerRef.current;
    if (!full) {
      setFull(true);
      track('fullscreen', { g: slug });
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
      } catch {
        /* CSS fallback is already applied */
      }
    } else {
      setFull(false);
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  }, [full, slug]);
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    const u = new URL(window.location.href);
    if (m === 'daily') u.searchParams.set('mode', 'daily');
    else u.searchParams.delete('mode');
    window.history.replaceState(null, '', u);
  };

  const player = typeof window !== 'undefined' ? getPlayer() : null;
  const lvl = player ? levelInfo(player.xp) : null;
  const nm = meta ? nextMedal(meta, best) : null;
  const suggestions = over && variant('next_games') === 'show' ? related(slug, 2) : [];
  const bg = meta?.bg || '#120b24';

  return (
    <div ref={outerRef} className={full ? 'fixed inset-0 z-50 flex flex-col bg-ink' : embed ? 'h-full' : ''}>
      {full && (
        <div className="flex h-12 shrink-0 items-center gap-2 px-3">
          <div className="truncate font-display text-lg font-bold">
            {meta?.emoji} {meta?.title}
          </div>
          {mode === 'daily' && <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-extrabold text-ink">📅 DAILY</span>}
          <div className="ml-auto flex gap-2">
            <button className="icon-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(sfx.toggleMuted())}>
              {muted ? '🔇' : '🔊'}
            </button>
            <button className="icon-btn" aria-label="Exit fullscreen" onClick={toggleFull}>
              ✕
            </button>
          </div>
        </div>
      )}
      <div
        ref={frameRef}
        className={`relative w-full overflow-hidden ${full ? 'min-h-0 flex-1' : embed ? 'h-full' : compact ? frameClass : `${frameClass} rounded-3xl border border-line shadow-2xl`}`}
        style={{ background: `radial-gradient(120% 80% at 50% 0%, ${bg} 0%, #0b0618 100%)` }}
      >
        <div ref={stageRef} className="absolute inset-0" />

        {status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-5xl animate-floaty">{meta?.emoji || '🎮'}</div>
              <div className="mt-3 font-display text-lg text-white/80">Loading…</div>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <div className="text-4xl">😵</div>
              <p className="mt-2 text-white/80">This game failed to load.</p>
              <button className="btn-pink mt-4" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        )}

        {/* toasts */}
        <div className="pointer-events-none absolute left-0 right-0 top-3 z-30 flex flex-col items-center gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.tone} animate-pop`}>
              {t.text}
            </div>
          ))}
        </div>

        {/* In-frame mute sits top-right: every game keeps that corner clear (same spot as the portal shell). */}
        {!full && (
          <button className="icon-btn absolute right-2 top-2 z-20" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(sfx.toggleMuted())}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}

        {/* game over panel */}
        {over && meta && (
          <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink/60 p-3 backdrop-blur-[3px] animate-pop">
            <div className="w-full max-w-[340px] rounded-3xl border border-white/10 bg-gradient-to-b from-[#2a1c55] to-[#170f2e] p-5 text-center shadow-2xl">
              <div className="text-xs font-extrabold tracking-[0.2em] text-white/60">
                {over.win === true ? 'YOU WIN!' : over.win === false ? 'SO CLOSE!' : over.isNewBest ? 'NEW BEST!' : 'GAME OVER'}
              </div>
              <div className="font-display text-6xl font-bold leading-tight text-white">
                {formatScore(meta, over.score)}
                {medalFor(meta, over.score) > 0 && <span className="ml-1 align-middle text-4xl">{MEDALS[medalFor(meta, over.score)]}</span>}
              </div>
              <div className="text-sm font-semibold text-white/70">
                Best {formatScore(meta, over.best)}
                {nm ? ` · ${nm.text}` : ' · all medals earned!'}
              </div>
              {over.isNewBest && <div className="mx-auto mt-2 w-fit animate-pulse rounded-full bg-sun px-3 py-0.5 text-xs font-black text-ink">🎉 PERSONAL BEST</div>}
              {challenge && (
                <div className={`mt-2 rounded-xl px-3 py-1.5 text-sm font-bold ${over.beat ? 'bg-lime/20 text-lime' : 'bg-white/5 text-sun'}`}>
                  {over.beat ? `You beat ${challenge.name}! Rub it in 😈` : `${challenge.name} still leads with ${formatScore(meta, challenge.score)}`}
                </div>
              )}

              {lvl && (
                <div className="mt-3 text-left">
                  <div className="flex justify-between text-[11px] font-bold text-white/70">
                    <span>
                      Lv {lvl.level} · +{over.prog.xp} XP
                    </span>
                    <span>🔥 {over.prog.streak} day streak</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink to-sun transition-all duration-700" style={{ width: `${lvl.pct}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {offer && (
                  <button className="btn-green" onClick={doRevive}>
                    {offer.isAd ? '▶ Continue (watch ad)' : '▶ Continue'}
                  </button>
                )}
                <button className="btn-pink text-lg" onClick={playAgain} autoFocus>
                  ↻ Play again
                </button>
                {!embed && (
                  <button className="btn-ghost" onClick={() => (typeof navigator !== 'undefined' && navigator.share ? share('native') : setShareOpen((v) => !v))}>
                    {variant('share_cta') === 'challenge' ? '⚔️ Challenge a friend' : '📣 Share score'}
                  </button>
                )}
                {!embed && typeof navigator !== 'undefined' && navigator.share && (
                  <button className="text-xs font-bold text-white/50 underline" onClick={() => setShareOpen((v) => !v)}>
                    more share options
                  </button>
                )}
                {shareOpen && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {CHANNELS.map((c) => (
                      <button key={c.id} className="rounded-lg px-2 py-2 text-xs font-bold text-white" style={{ background: c.color }} onClick={() => share(c.id)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!embed && !(meta.lowerIsBetter && over.win === false) && over.score > 0 && over.stats?.rankable !== false && (
                <div className="mt-3 rounded-2xl bg-white/5 p-2.5 text-sm">
                  {rank ? (
                    <div className="font-bold text-aqua">
                      🏆 You are #{rank.rank} on the {over.mode === 'daily' ? 'Daily' : "today's"} leaderboard
                    </div>
                  ) : player && player.name ? (
                    <div className="text-white/60">Posting score as {player.name}…</div>
                  ) : (
                    <form
                      className="flex gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveName();
                      }}
                    >
                      <input
                        className="min-w-0 flex-1 rounded-xl bg-ink/70 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-pink"
                        placeholder="Your name for the leaderboard"
                        maxLength={16}
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                      />
                      <button className="rounded-xl bg-aqua px-3 text-sm font-extrabold text-ink" type="submit">
                        Post
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!embed && MONEY.plusLink && ADS.provider !== 'none' && !isPlusActive() && (
                <Link href="/plus" className="mt-3 block text-center text-xs font-bold text-white/50 hover:text-white" onClick={() => track('plus_click', { g: slug })}>
                  ⭐ Go ad-free with Plus ({MONEY.plusPrice})
                </Link>
              )}

              {suggestions.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] font-extrabold tracking-widest text-white/50">TRY NEXT</div>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.map((g) => (
                      <Link
                        key={g.slug}
                        href={embed ? `${SITE.url}/games/${g.slug}?utm_source=embed` : `/games/${g.slug}`}
                        target={embed ? '_blank' : undefined}
                        className="group overflow-hidden rounded-xl bg-white/5 text-left ring-1 ring-white/10 hover:ring-pink"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/covers/${g.slug}.webp`} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                        <div className="truncate px-2 py-1 text-xs font-bold text-white">
                          {g.emoji} {g.title}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {!embed && typeof window !== 'undefined' && window.__raInstall && player && Object.values(player.games).reduce((a, g) => a + g.runs, 0) >= 3 && (
                <button
                  className="mt-3 w-full rounded-xl bg-white/5 py-2 text-xs font-bold text-aqua ring-1 ring-aqua/30"
                  onClick={async () => {
                    const ev = window.__raInstall;
                    window.__raInstall = null;
                    track('install_prompt', { g: slug });
                    try {
                      await ev.prompt();
                    } catch {
                      /* dismissed */
                    }
                  }}
                >
                  📲 Add Retry Arcade to your home screen
                </button>
              )}
              {embed && (
                <a href={`${SITE.url}/?utm_source=embed`} target="_blank" rel="noopener" className="mt-3 block text-xs font-bold text-aqua underline">
                  Play 15+ free games at {SITE.name} ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {!embed && !full && !compact && meta && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {meta.daily !== false && (
            <div className="flex rounded-full bg-panel p-1 ring-1 ring-line">
              {['classic', 'daily'].map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-full px-4 py-1.5 text-sm font-extrabold transition ${mode === m ? 'bg-pink text-white' : 'text-white/60 hover:text-white'}`}
                >
                  {m === 'classic' ? 'Classic' : '📅 Daily'}
                </button>
              ))}
            </div>
          )}
          <button className="rounded-full bg-panel px-3.5 py-1.5 text-sm font-extrabold text-white/70 ring-1 ring-line hover:text-white" onClick={toggleFull}>
            ⛶ Fullscreen
          </button>
          <div className="ml-auto text-sm font-bold text-white/70">
            {best != null ? `Best ${formatScore(meta, best)} ${MEDALS[medalFor(meta, best)] || ''}` : 'No best yet'}
            {nm && best != null ? <span className="text-white/40"> · {nm.text}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
