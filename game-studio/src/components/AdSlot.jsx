'use client';

import { useEffect, useRef } from 'react';
import { ADS } from '@/lib/site';

// AdSense display unit. Renders nothing until an AdSense client + slot are configured,
// so the site stays clean pre-approval. In development a labelled placeholder shows the
// placement. Placements are kept outside the game frame (AdSense policy).
export default function AdSlot({ slot, format = 'auto', className = '', style = {}, label = 'Advertisement' }) {
  const ref = useRef(null);
  const slotId = ADS.slots[slot] || '';
  const live = !!(ADS.client && slotId);

  useEffect(() => {
    if (!live || !ref.current || ref.current.dataset.pushed) return;
    ref.current.dataset.pushed = '1';
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blocked */
    }
  }, [live]);

  if (!live) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div className={`grid place-items-center rounded-2xl border border-dashed border-white/15 text-xs font-bold text-white/30 ${className}`} style={{ minHeight: 90, ...style }}>
        AD SLOT · {slot}
      </div>
    );
  }
  return (
    <div className={className} style={style}>
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-white/30">{label}</div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={ADS.client}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
