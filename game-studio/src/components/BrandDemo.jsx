'use client';

// The /brands live demo: a visitor types a brand name, picks colors and (optionally) a logo,
// and plays a branded Stack Tower on the spot. The logo never leaves the browser.
import { useEffect, useRef, useState } from 'react';
import { mountGame } from '@/games/engine/core.js';
import { track } from '@/lib/analytics';

// Made-up demo brands: never use a real company's name or colors here.
const PRESETS = [
  { name: 'Sunny Soda', colors: ['#ff5a36', '#ffd23f', '#ff9f1c'], offer: 'SUNNY10 for 10% off' },
  { name: 'Bean There', colors: ['#8b5a3c', '#f2d7b6', '#c98b5e'], offer: 'A free coffee on us' },
  { name: 'Zippy', colors: ['#16c47f', '#0b3d2e', '#9ef01a'], offer: 'Free delivery: ZIPPY' },
  { name: 'Nova Bank', colors: ['#3a6df0', '#22d3ee', '#a5b4fc'], offer: 'Open an account, get a gift' },
];
const UNLOCK = 10;

export default function BrandDemo() {
  const stageRef = useRef(null);
  const ctrlRef = useRef(null);
  const [brand, setBrand] = useState({ ...PRESETS[0], logoUrl: null });
  const [logo, setLogo] = useState(null);
  const [over, setOver] = useState(null);
  const [plays, setPlays] = useState(0);
  const [logoErr, setLogoErr] = useState('');

  // (Re)mount the game whenever the brand changes; color pickers are debounced.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const [{ default: createGame }, { default: meta }] = await Promise.all([import('@/games/stack-tower/index.js'), import('@/games/stack-tower/meta.js')]);
      if (!alive || !stageRef.current) return;
      ctrlRef.current?.destroy();
      stageRef.current.innerHTML = '';
      setOver(null);
      ctrlRef.current = mountGame(stageRef.current, createGame, meta, {
        brand: { name: brand.name.trim().slice(0, 18), colors: brand.colors, logo },
        autoFocus: false,
        onEvent(name, d) {
          if (name === 'gameover') setOver({ score: d.score, best: d.best });
          if (name === 'start') setPlays((n) => n + 1);
        },
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [brand.name, brand.colors, logo]);

  useEffect(() => () => ctrlRef.current?.destroy(), []);

  useEffect(() => {
    if (plays === 1) track('brand_demo_play', {});
  }, [plays]);

  const setColor = (i) => (e) => setBrand((b) => ({ ...b, colors: b.colors.map((c, j) => (j === i ? e.target.value : c)) }));

  function pickPreset(p) {
    setBrand({ ...p, logoUrl: null });
    setLogo(null);
  }

  function onLogo(e) {
    const file = e.target.files?.[0];
    setLogoErr('');
    if (!file) return;
    if (!/^image\//.test(file.type) || file.size > 3 * 1024 * 1024) {
      setLogoErr('Use a PNG, JPG or SVG under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setLogo(img);
        setBrand((b) => ({ ...b, logoUrl: reader.result }));
      };
      img.onerror = () => setLogoErr('That image could not be read.');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function again() {
    setOver(null);
    ctrlRef.current?.restart();
  }

  const input = 'w-full rounded-xl bg-ink/70 px-3 py-2.5 text-white outline-none ring-1 ring-white/15 focus:ring-pink';
  const unlocked = over && over.score >= UNLOCK;
  const label = brand.name.trim() || 'Your brand';

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
      <div className="card p-5 sm:p-6">
        <div className="text-xs font-extrabold tracking-[0.2em] text-pink">TRY IT WITH YOUR BRAND</div>
        <h3 className="mt-1 font-display text-2xl font-bold">Type your brand. Play your game.</h3>
        <p className="mt-1 text-white/65">Your colors build the tower and your logo lands on every block. Tap the game to play.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => pickPreset(p)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ring-1 transition ${
                brand.name === p.name && !brand.logoUrl ? 'bg-white/15 ring-white/40' : 'bg-white/5 ring-white/10 hover:bg-white/10'
              }`}
            >
              <span className="flex">
                {p.colors.slice(0, 2).map((c) => (
                  <span key={c} className="-mr-1 inline-block h-3.5 w-3.5 rounded-full ring-2 ring-ink" style={{ background: c }} />
                ))}
              </span>
              <span className="ml-1">{p.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40">Demo brands are made up.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-white/70">
            Brand name
            <input value={brand.name} maxLength={18} onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))} className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-bold text-white/70">
            Prize or offer
            <input value={brand.offer} maxLength={40} onChange={(e) => setBrand((b) => ({ ...b, offer: e.target.value }))} className={`mt-1 ${input}`} />
          </label>
          <div className="text-sm font-bold text-white/70">
            Brand colors
            <div className="mt-1 flex gap-2">
              {brand.colors.map((c, i) => (
                <label key={i} className="relative h-11 w-11 cursor-pointer overflow-hidden rounded-xl ring-1 ring-white/20" style={{ background: c }} title={`Color ${i + 1}`}>
                  <input type="color" value={c} onChange={setColor(i)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`Brand color ${i + 1}`} />
                </label>
              ))}
            </div>
          </div>
          <label className="text-sm font-bold text-white/70">
            Logo (optional)
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onLogo} className={`mt-1 ${input} file:mr-3 file:rounded-lg file:border-0 file:bg-pink file:px-3 file:py-1 file:font-bold file:text-white`} />
            <span className="mt-1 block text-xs font-semibold text-white/40">{logoErr || 'Stays in your browser. Nothing is uploaded.'}</span>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-sm font-bold text-white">What the real version adds</div>
          <ul className="mt-2 grid gap-1.5 text-sm text-white/70 sm:grid-cols-2">
            <li>🏆 A leaderboard with prizes</li>
            <li>🎟️ A coupon revealed at a target score</li>
            <li>📧 Opt-in sign-ups for your CRM</li>
            <li>📊 Plays, play time and shares, live</li>
            <li>🔗 Your domain, an embed or a QR code</li>
            <li>🎨 Your mascot, products and sounds</li>
          </ul>
        </div>
      </div>

      <div className="order-first mx-auto w-full max-w-[340px] sm:max-w-[400px] lg:order-none">
        <div className="relative overflow-hidden rounded-[28px] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.55)] ring-2 ring-white/15" style={{ aspectRatio: '420 / 740' }}>
          <div ref={stageRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 z-[2] flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white/90 backdrop-blur">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" className="h-4 w-auto max-w-[60px] object-contain" />
            ) : (
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: brand.colors[0] }} />
            )}
            <span>{label} Stack</span>
          </div>
          {over && (
            <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/55 p-5 backdrop-blur-[3px]">
              <div className="w-full max-w-[300px] rounded-3xl p-5 text-center text-white shadow-2xl ring-1 ring-white/15" style={{ background: `linear-gradient(160deg, ${brand.colors[0]}, ${brand.colors[1] || brand.colors[0]})` }}>
                <div className="rounded-2xl bg-black/35 p-4">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt="" className="mx-auto h-10 w-auto max-w-[160px] object-contain" />
                  ) : (
                    <div className="font-display text-2xl font-bold">{label}</div>
                  )}
                  <div className="mt-2 text-xs font-extrabold tracking-[0.2em] text-white/70">YOUR TOWER</div>
                  <div className="font-display text-5xl font-bold leading-none">{over.score}</div>
                  <div className="mt-1 text-xs font-bold text-white/70">floors · best {over.best ?? over.score}</div>
                  <div className="mt-3 rounded-xl border-2 border-dashed border-white/50 px-3 py-2 text-sm font-bold">
                    {unlocked ? `🎉 Unlocked: ${brand.offer}` : `Reach ${UNLOCK} floors to unlock: ${brand.offer}`}
                  </div>
                </div>
                <button type="button" onClick={again} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-display text-lg font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-0.5">
                  ↻ Play again
                </button>
                <a href="#enquire" className="mt-2 block text-sm font-bold text-white/90 underline underline-offset-2">
                  Make this for {label}
                </a>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-white/45">A live demo built on Stack Tower. Any of our games can be branded.</p>
      </div>
    </div>
  );
}
