// Sponsor / advertiser / licensing enquiries from /advertise. Stored in Redis (shown in
// /studio). If RESEND_API_KEY and LEADS_NOTIFY_EMAIL are set, each lead is also emailed.
import { pipeline } from '@/lib/store';
import { json, rateLimit, clientIp } from '@/lib/server';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;
const INTERESTS = new Set(['sponsor-daily', 'branded-game', 'display', 'newsletter', 'licensing', 'other']);
const clip = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export async function POST(req) {
  let b;
  try {
    b = await req.json();
  } catch {
    return json({ ok: false }, { status: 400 });
  }
  if (b?.website) return json({ ok: true }); // honeypot
  const lead = {
    name: clip(b?.name, 80),
    email: clip(b?.email, 160).toLowerCase(),
    company: clip(b?.company, 120),
    interest: INTERESTS.has(b?.interest) ? b.interest : 'other',
    budget: clip(b?.budget, 40),
    message: clip(b?.message, 2000),
    at: new Date().toISOString(),
  };
  if (!lead.name || !EMAIL_RE.test(lead.email)) return json({ ok: false, error: 'Please add your name and a valid email.' }, { status: 422 });
  if (!(await rateLimit(`lead:${clientIp(req)}`, 5, 3600))) return json({ ok: false, error: 'Too many messages. Try again later.' }, { status: 429 });

  await pipeline([
    ['LPUSH', 'leads', JSON.stringify(lead)],
    ['LTRIM', 'leads', 0, 499],
  ]);

  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (key && to) {
    const text = Object.entries(lead)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEADS_FROM_EMAIL || 'Retry Arcade <onboarding@resend.dev>',
        to: [to],
        reply_to: lead.email,
        subject: `[${SITE.name}] New ${lead.interest} enquiry from ${lead.company || lead.name}`,
        text,
      }),
    }).catch(() => {});
  }
  return json({ ok: true });
}
