// Retry Arcade Plus activation. Accepts a Stripe Checkout session id (straight after
// payment, or typed in later as a "purchase code" to restore on another device),
// confirms it with Stripe once, then remembers it in Redis.
//   STRIPE_SECRET_KEY            required (a restricted key with Checkout Sessions: read is enough)
//   STRIPE_PLUS_PAYMENT_LINK_ID  optional plink_... to accept only the Plus payment link
//   PLUS_DAYS                    pass length in days (default 365, 0 = lifetime)
import { cmd, pipeline } from '@/lib/store';
import { json, rateLimit, clientIp } from '@/lib/server';

export const dynamic = 'force-dynamic';

const CODE_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const MAX_DEVICES = 5;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const code = String(body?.code || '').trim();
  if (!CODE_RE.test(code)) return json({ ok: false, error: 'That purchase code does not look right.' }, { status: 400 });
  if (!(await rateLimit(`plus:${clientIp(req)}`, 20, 600))) return json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, { status: 429 });

  const key = `plus:${code}`;
  let pass = null;
  const saved = await cmd('GET', key);
  if (saved) {
    try {
      pass = JSON.parse(saved);
    } catch {
      pass = null;
    }
  }

  if (!pass) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return json({ ok: false, error: 'Payments are not set up yet.' }, { status: 503 });
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    });
    if (r.status === 404) return json({ ok: false, error: 'We could not find that purchase.' }, { status: 404 });
    if (!r.ok) return json({ ok: false, error: 'Could not reach the payment provider. Try again in a minute.' }, { status: 502 });
    const s = await r.json();
    const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required';
    if (s.status !== 'complete' || !paid) return json({ ok: false, error: 'This payment is not complete yet.' }, { status: 402 });
    const link = process.env.STRIPE_PLUS_PAYMENT_LINK_ID;
    if (link && s.payment_link !== link) return json({ ok: false, error: 'That purchase is not a Plus pass.' }, { status: 400 });

    const days = Number(process.env.PLUS_DAYS ?? 365);
    const start = (Number(s.created) || Date.now() / 1000) * 1000;
    pass = { until: days > 0 ? Math.round(start + days * 86400000) : 0, amount: Number(s.amount_total) || 0, currency: s.currency || '' };
    const [first] = await pipeline([['SET', key, JSON.stringify(pass), 'NX']]);
    if (first === 'OK') {
      await pipeline([
        ['HINCRBY', 'plus:stats', 'sales', 1],
        ['HINCRBY', 'plus:stats', `cents_${pass.currency || 'x'}`, pass.amount],
      ]);
    }
  }

  if (pass.until && pass.until < Date.now()) return json({ ok: false, error: 'This pass has expired.' }, { status: 410 });
  const uses = await cmd('HINCRBY', 'plus:uses', code, 1);
  if (Number(uses) > MAX_DEVICES * 3) return json({ ok: false, error: 'This code has been used on too many devices. Contact us.' }, { status: 403 });
  return json({ ok: true, until: pass.until });
}
