// Daily Vercel cron (see vercel.json): tells IndexNow engines about pages that are new
// since the last run, plus the pages whose content changes every day.
// Auth: Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set;
// STUDIO_TOKEN also works for a manual run (?token=... or Bearer).
import sitemap from '@/app/sitemap';
import { pipeline } from '@/lib/store';
import { json, isAdmin } from '@/lib/server';
import { SITE } from '@/lib/site';
import { INDEXNOW_KEY } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

const DAILY = ['/', '/daily', '/leaderboards'];

export async function GET(req) {
  const cron = process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (!cron && !isAdmin(req)) return json({ error: 'unauthorized' }, { status: 401 });
  const host = new URL(SITE.url).host;
  if (/localhost|127\.0\.0\.1/.test(host)) return json({ ok: false, error: 'no public site url' }, { status: 400 });

  const all = sitemap().map((e) => e.url);
  const force = new URL(req.url).searchParams.get('all') === '1';
  const seen = await pipeline(all.map((u) => ['SISMEMBER', 'indexnow:sent', u]));
  const fresh = all.filter((u, i) => force || !Number(seen[i]));
  const urls = [...new Set([...DAILY.map((p) => `${SITE.url}${p}`), ...fresh])].slice(0, 10000);

  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE.url}/${INDEXNOW_KEY}.txt`, urlList: urls }),
  });
  if (r.ok && fresh.length) await pipeline([['SADD', 'indexnow:sent', ...fresh]]);
  return json({ ok: r.ok, status: r.status, submitted: urls.length, fresh: fresh.length });
}
