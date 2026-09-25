// First-party analytics: batches events to /api/events (sendBeacon on page hide).
// Optionally mirrors events to GA4 / Plausible when configured.
import { getPlayer, touchActivity } from './player';
import { getAssignments } from './experiments';
import { ANALYTICS } from './site';

let queue = [];
let timer = null;
let bound = false;

function sessionOnce(key) {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

function attribution() {
  const out = {};
  if (!sessionOnce('ra:attr')) return out;
  const ref = document.referrer;
  if (ref) {
    try {
      if (new URL(ref).host !== location.host) out.ref = ref;
    } catch {
      /* ignore */
    }
  }
  const q = new URLSearchParams(location.search);
  if (q.get('utm_source')) out.utm = { source: q.get('utm_source'), campaign: q.get('utm_campaign') || undefined };
  else if (q.get('ref')) out.utm = { source: q.get('ref') };
  return out;
}

// The social post (utm_content) that brought this visitor, kept for the whole session so
// the plays that follow are credited to that post.
function postRef() {
  try {
    const c = new URLSearchParams(location.search).get('utm_content');
    if (c) sessionStorage.setItem('ra:post', c);
    return sessionStorage.getItem('ra:post') || undefined;
  } catch {
    return undefined;
  }
}

function flush(beacon = false) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const p = getPlayer();
  const payload = { vid: p.vid, events: queue.splice(0, 60), exp: getAssignments(), pc: postRef(), ...attribution() };
  const age = touchActivity();
  if (age != null) payload.act = { age };
  const body = JSON.stringify(payload);
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'text/plain' }));
      return;
    }
    fetch('/api/events', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch {
    /* analytics must never break the game */
  }
}

/**
 * Track an event. props: g (game slug), d (duration sec), c (share channel), plus anything
 * for GA4. Names must be in the server allow-list (src/app/api/events/route.js).
 */
export function track(name, props = {}) {
  if (typeof window === 'undefined') return;
  if (!bound) {
    bound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true);
    });
    window.addEventListener('pagehide', () => flush(true));
  }
  const e = { n: name };
  if (props.g) e.g = props.g;
  if (props.d != null) e.d = props.d;
  if (props.c) e.c = props.c;
  queue.push(e);
  try {
    if (ANALYTICS.ga4 && window.gtag) window.gtag('event', name, props);
    if (ANALYTICS.plausibleDomain && window.plausible) window.plausible(name, { props });
  } catch {
    /* ignore */
  }
  if (!timer) timer = setTimeout(() => flush(false), 2500);
}
