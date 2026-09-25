// Retry Arcade Plus (ad-free pass), client side. The pass is verified once against
// Stripe by /api/plus/verify, then remembered in this browser. The purchase code
// (the Stripe checkout session id) restores it on another device.
const KEY = 'ra:plus';

export function getPlus() {
  if (typeof window === 'undefined') return null;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p || !p.code) return null;
    if (p.until && p.until < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export const isPlusActive = () => !!getPlus();

export function savePlus({ code, until }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, until: until || 0 }));
  } catch {
    /* storage blocked */
  }
}

/** Verify a checkout session (after payment) or a saved purchase code (restore). */
export async function activatePlus(code) {
  const r = await fetch('/api/plus/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || 'Could not verify that purchase.');
  savePlus({ code, until: j.until });
  return j;
}
