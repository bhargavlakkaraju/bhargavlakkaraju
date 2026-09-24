// Email capture for the "new game every week" newsletter.
import { cmd, pipeline } from '@/lib/store';
import { json, rateLimit, clientIp } from '@/lib/server';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false }, { status: 400 });
  }
  const email = String(body?.email || '')
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) return json({ ok: false, error: 'Please enter a valid email.' }, { status: 422 });
  if (!(await rateLimit(`sub:${clientIp(req)}`, 5, 3600))) return json({ ok: false, error: 'Too many attempts.' }, { status: 429 });
  const src = String(body?.src || 'site').slice(0, 40);
  const added = await cmd('SADD', 'subs', email);
  if (added) await pipeline([['HSET', 'subs:meta', email, JSON.stringify({ t: Date.now(), src })]]);
  return json({ ok: true, new: !!added });
}
