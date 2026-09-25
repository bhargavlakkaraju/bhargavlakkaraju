'use client';

// Direct revenue UI: the Daily Arena sponsor strip, the advertiser enquiry form, and
// the Retry Arcade Plus purchase / restore / thank-you flows.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MONEY } from '@/lib/site';
import { getPlayer } from '@/lib/player';
import { track } from '@/lib/analytics';
import { activatePlus, getPlus } from '@/lib/plus';

export function SponsorStrip({ className = '' }) {
  const s = MONEY.sponsor;
  if (!s) {
    return (
      <Link href="/advertise" className={`inline-flex items-center gap-1.5 text-xs font-bold text-white/45 hover:text-white/80 ${className}`}>
        📣 Sponsor the Daily Arena →
      </Link>
    );
  }
  return (
    <a
      href={s.url}
      target="_blank"
      rel="sponsored noopener"
      className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 ring-1 ring-white/15 hover:bg-white/15 ${className}`}
    >
      <span className="text-white/50">Presented by</span>
      {s.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo} alt="" className="h-5 w-5 rounded bg-white object-contain p-0.5" />
      )}
      <span>{s.name}</span>
    </a>
  );
}

const INTERESTS = [
  ['sponsor-daily', 'Sponsor the Daily Arena'],
  ['branded-game', 'A branded game for my campaign'],
  ['display', 'Display ads on game pages'],
  ['newsletter', 'Newsletter sponsorship'],
  ['licensing', 'License games for my platform'],
  ['other', 'Something else'],
];
const BUDGETS = ['Not sure yet', 'Under $500', '$500 - $2,000', '$2,000 - $10,000', '$10,000+'];

export function LeadForm({ defaultInterest = 'sponsor-daily' }) {
  const [f, setF] = useState({ name: '', email: '', company: '', interest: defaultInterest, budget: BUDGETS[0], message: '', website: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    setState('busy');
    setErr('');
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || 'Something went wrong. Please email us instead.');
      setState('done');
      track('lead', {});
    } catch (e2) {
      setState('idle');
      setErr(e2.message);
    }
  }
  if (state === 'done')
    return (
      <div className="rounded-2xl bg-lime/15 p-5 ring-1 ring-lime/40">
        <div className="font-display text-xl font-bold text-lime">Thanks, we got it!</div>
        <p className="mt-1 text-white/75">We reply within one working day with current audience numbers and a proposal.</p>
      </div>
    );
  const input = 'w-full rounded-xl bg-ink/70 px-3 py-2.5 text-white outline-none ring-1 ring-white/15 focus:ring-pink';
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-bold text-white/70">
        Your name
        <input required value={f.name} onChange={set('name')} className={`mt-1 ${input}`} autoComplete="name" />
      </label>
      <label className="text-sm font-bold text-white/70">
        Work email
        <input required type="email" value={f.email} onChange={set('email')} className={`mt-1 ${input}`} autoComplete="email" />
      </label>
      <label className="text-sm font-bold text-white/70">
        Company or brand
        <input value={f.company} onChange={set('company')} className={`mt-1 ${input}`} autoComplete="organization" />
      </label>
      <label className="text-sm font-bold text-white/70">
        Budget
        <select value={f.budget} onChange={set('budget')} className={`mt-1 ${input}`}>
          {BUDGETS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold text-white/70 sm:col-span-2">
        What are you interested in?
        <select value={f.interest} onChange={set('interest')} className={`mt-1 ${input}`}>
          {INTERESTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold text-white/70 sm:col-span-2">
        Tell us about your campaign
        <textarea rows={4} value={f.message} onChange={set('message')} className={`mt-1 ${input}`} placeholder="Dates, audience, goals, links..." />
      </label>
      <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} className="hidden" aria-hidden />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-pink" disabled={state === 'busy'}>
          {state === 'busy' ? 'Sending…' : 'Send enquiry'}
        </button>
        {err && <span className="text-sm text-pink">{err}</span>}
      </div>
    </form>
  );
}

export function PlusBuy() {
  const [plus, setPlus] = useState(null);
  const [href, setHref] = useState(MONEY.plusLink);
  useEffect(() => {
    setPlus(getPlus());
    if (MONEY.plusLink) {
      const u = new URL(MONEY.plusLink);
      u.searchParams.set('client_reference_id', getPlayer().vid);
      setHref(u.toString());
    }
  }, []);
  if (plus)
    return (
      <div className="rounded-2xl bg-lime/15 p-4 font-bold text-lime ring-1 ring-lime/40">
        ⭐ Plus is active on this device{plus.until ? ` until ${new Date(plus.until).toLocaleDateString()}` : ''}. Thank you!
      </div>
    );
  if (!MONEY.plusLink) return null;
  return (
    <a href={href} className="btn-pink px-6 py-3.5 text-lg" onClick={() => track('plus_click', {})}>
      ⭐ Get Plus · {MONEY.plusPrice}
    </a>
  );
}

export function PlusRestore() {
  const [code, setCode] = useState('');
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    setState('busy');
    try {
      await activatePlus(code.trim());
      setState('done');
    } catch (err) {
      setState('idle');
      setMsg(err.message);
    }
  }
  if (state === 'done') return <p className="font-bold text-lime">⭐ Plus restored on this device. Enjoy ad-free play!</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Purchase code (starts with cs_)"
        className="min-w-0 flex-1 rounded-xl bg-ink/70 px-3 py-2.5 text-white outline-none ring-1 ring-white/15 focus:ring-pink"
        aria-label="Purchase code"
      />
      <button className="btn-ghost" disabled={state === 'busy' || !code.trim()}>
        {state === 'busy' ? 'Checking…' : 'Restore'}
      </button>
      {msg && <p className="text-sm text-pink">{msg}</p>}
    </form>
  );
}

export function PlusThanks() {
  const [state, setState] = useState({ status: 'checking' });
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('session_id') || '';
    if (!code) {
      setState({ status: 'error', msg: 'No purchase found in this link.' });
      return;
    }
    activatePlus(code)
      .then((j) => {
        setState({ status: 'ok', code, until: j.until });
        track('plus_activated', {});
      })
      .catch((e) => setState({ status: 'error', msg: e.message }));
  }, []);
  if (state.status === 'checking') return <p className="text-white/70">Confirming your purchase…</p>;
  if (state.status === 'error')
    return (
      <div>
        <p className="font-bold text-pink">{state.msg}</p>
        <p className="mt-2 text-white/70">
          If you were charged, email us with your receipt and we will sort it out right away.
        </p>
      </div>
    );
  return (
    <div>
      <div className="font-display text-2xl font-bold text-lime">⭐ Plus is active. Thank you!</div>
      <p className="mt-2 text-white/75">
        Ads are gone and continues are free{state.until ? ` until ${new Date(state.until).toLocaleDateString()}` : ''}. To use Plus on another phone or computer,
        save this purchase code and enter it on the Plus page there:
      </p>
      <code className="mt-3 block break-all rounded-xl bg-ink/80 p-3 text-sm text-sun">{state.code}</code>
      <button className="btn-ghost mt-3" onClick={() => navigator.clipboard?.writeText(state.code)}>
        Copy code
      </button>
      <div className="mt-6">
        <Link href="/" className="btn-pink">
          ▶ Back to the games
        </Link>
      </div>
    </div>
  );
}
