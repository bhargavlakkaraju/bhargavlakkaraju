'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ADS, MONEY } from '@/lib/site';
import { isPlusActive } from '@/lib/plus';

// One display placement, filled by whichever network is configured (ADS.display):
// AdSense, Adsterra, Ezoic, or our own house promos until a network is approved.
// Nothing renders for Plus members. Placements stay outside the game frame (ad policy).
const SIZES = {
  gameSide: ['300x250'],
  gameBelow: ['300x250', '320x50'],
  homeInline: ['728x90', '468x60', '320x50', '300x250'],
  rail: ['160x600', '160x300'],
};

export default function AdSlot({ slot, format = 'auto', className = '', style = {}, label = 'Advertisement' }) {
  const [mode, setMode] = useState(null);
  useEffect(() => setMode(isPlusActive() ? 'plus' : ADS.display), []);
  if (!mode || mode === 'plus' || mode === 'none') return null;

  if (mode === 'adsense' && ADS.client && ADS.slots[slot]) return <AdSenseUnit slot={slot} format={format} className={className} style={style} label={label} />;
  if (mode === 'adsterra' && Object.keys(ADS.adsterra.keys).length) return <AdsterraUnit slot={slot} className={className} label={label} />;
  if (mode === 'ezoic' && ADS.ezoic[slot]) return <EzoicUnit id={ADS.ezoic[slot]} className={className} />;
  if (slot === 'rail') return null; // house promos are not worth a 600px tower
  return <HouseAd slot={slot} className={className} />;
}

function AdSenseUnit({ slot, format, className, style, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || ref.current.dataset.pushed) return;
    ref.current.dataset.pushed = '1';
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blocked */
    }
  }, []);
  return (
    <div className={className} style={style}>
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-white/30">{label}</div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={ADS.client}
        data-ad-slot={ADS.slots[slot]}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Adsterra banners write themselves with document.write and share one global (atOptions),
// so each one runs inside its own srcdoc iframe sized to the banner.
function AdsterraUnit({ slot, className, label }) {
  const box = useRef(null);
  const [size, setSize] = useState(null);
  useEffect(() => {
    const w = box.current ? box.current.clientWidth : 320;
    const keys = ADS.adsterra.keys;
    const pick = (SIZES[slot] || ['300x250']).find((s) => keys[s] && Number(s.split('x')[0]) <= w);
    setSize(pick || null);
  }, [slot]);
  const [w, h] = size ? size.split('x').map(Number) : [0, 0];
  const key = size ? ADS.adsterra.keys[size] : '';
  const doc = size
    ? `<!doctype html><html><body style="margin:0;background:transparent"><script>atOptions={'key':'${key}','format':'iframe','height':${h},'width':${w},'params':{}};</script><script src="https://${ADS.adsterra.host}/${key}/invoke.js"></script></body></html>`
    : '';
  return (
    <div ref={box} className={className}>
      {size && (
        <>
          <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-white/30">{label}</div>
          <iframe title={label} srcDoc={doc} width={w} height={h} scrolling="no" className="mx-auto block border-0" style={{ maxWidth: '100%' }} />
        </>
      )}
    </div>
  );
}

function EzoicUnit({ id, className }) {
  useEffect(() => {
    const ez = (window.ezstandalone = window.ezstandalone || {});
    ez.cmd = ez.cmd || [];
    const n = Number(id);
    ez.cmd.push(() => ez.showAds(n));
    return () => ez.cmd.push(() => ez.destroyPlaceholders && ez.destroyPlaceholders(n));
  }, [id]);
  return <div id={`ezoic-pub-ad-placeholder-${id}`} className={className} />;
}

// House promos fill the slots before an ad network is live: the sponsor (if any),
// "advertise with us", Plus, the tip jar and the Daily Arena.
function HouseAd({ slot, className }) {
  const [promo, setPromo] = useState(null);
  useEffect(() => {
    const list = [];
    if (MONEY.sponsor) list.push({ sponsored: true, href: MONEY.sponsor.url, title: MONEY.sponsor.name, body: MONEY.sponsor.tagline || 'Sponsor of the Daily Arena', cta: 'Visit' });
    list.push({ href: '/advertise', title: 'Your brand here', body: 'Sponsor the Daily Arena or get your own branded game. Reach players every day.', cta: 'Advertise with us', emoji: '📣' });
    if (MONEY.plusLink) list.push({ href: '/plus', title: 'Go ad-free with Plus', body: `No ads, free continues, and you fund the next game. ${MONEY.plusPrice}.`, cta: 'Get Plus', emoji: '⭐' });
    if (MONEY.supportUrl) list.push({ href: MONEY.supportUrl, external: true, title: 'Enjoying the games?', body: 'Buy the studio a coffee. Every tip goes into building new games.', cta: 'Support us', emoji: '☕' });
    list.push({ href: '/daily', title: 'Today’s Daily Arena', body: 'Same levels for every player on Earth. Post your best before the reset.', cta: 'Play the daily', emoji: '📅' });
    setPromo(MONEY.sponsor ? list[0] : list[Math.floor(Math.random() * list.length)]);
  }, [slot]);
  if (!promo) return null;
  const inner = (
    <>
      <div className="flex items-center gap-3">
        {promo.sponsored && MONEY.sponsor.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MONEY.sponsor.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1" />
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl">{promo.emoji}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold text-white">{promo.title}</div>
          <div className="text-xs text-white/60">{promo.body}</div>
        </div>
      </div>
      <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-aqua">{promo.cta} →</div>
    </>
  );
  const cls = `block rounded-2xl border border-line bg-panel/70 p-4 transition hover:border-white/20 ${className}`;
  return (
    <div>
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-white/30">{promo.sponsored ? 'Sponsored' : 'From Retry Arcade'}</div>
      {promo.sponsored || promo.external ? (
        <a href={promo.href} target="_blank" rel={promo.sponsored ? 'sponsored noopener' : 'noopener'} className={cls}>
          {inner}
        </a>
      ) : (
        <Link href={promo.href} className={cls}>
          {inner}
        </Link>
      )}
    </div>
  );
}
