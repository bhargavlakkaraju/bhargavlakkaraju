// Results webhook for posting agents. Each published post is reported with its public
// URL and engagement metrics; the same id + platform updates the record.
//   POST  Authorization: Bearer $SOCIAL_REPORT_TOKEN   { id, platform, url, postedAt, metrics }
//   GET   Authorization: Bearer $STUDIO_TOKEN          latest reports (used by /studio)
import crypto from 'node:crypto';
import { pipeline, pairs } from '@/lib/store';
import { json, isAdmin } from '@/lib/server';
import { PLATFORMS } from '@/lib/social';

export const dynamic = 'force-dynamic';

const ID_RE = /^[a-z0-9_.-]{1,40}$/i;
const METRICS = ['impressions', 'views', 'likes', 'reposts', 'replies', 'clicks', 'follows', 'saves', 'shares'];

function authorized(req) {
  const token = process.env.SOCIAL_REPORT_TOKEN || '';
  if (!token) return false;
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req) {
  if (!authorized(req)) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  let b;
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'bad json' }, { status: 400 });
  }
  const list = Array.isArray(b) ? b.slice(0, 50) : [b];
  const cmds = [];
  const saved = [];
  for (const r of list) {
    if (!r || !ID_RE.test(String(r.id)) || !PLATFORMS.includes(r.platform)) continue;
    const metrics = {};
    for (const k of METRICS) if (Number.isFinite(Number(r.metrics?.[k]))) metrics[k] = Math.max(0, Math.round(Number(r.metrics[k])));
    const rec = {
      id: r.id,
      platform: r.platform,
      url: /^https:\/\//.test(String(r.url || '')) ? String(r.url).slice(0, 500) : '',
      postedAt: String(r.postedAt || new Date().toISOString()).slice(0, 40),
      metrics,
      updatedAt: new Date().toISOString(),
    };
    cmds.push(['HSET', 'social:posts', `${rec.id}|${rec.platform}`, JSON.stringify(rec)]);
    saved.push(`${rec.id}|${rec.platform}`);
  }
  if (!cmds.length) return json({ ok: false, error: 'nothing valid to save (check id and platform)' }, { status: 422 });
  await pipeline(cmds);
  return json({ ok: true, saved });
}

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, { status: 401 });
  const [all] = await pipeline([['HGETALL', 'social:posts']]);
  const posts = pairs(all)
    .map(([, v]) => {
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
  return json({ posts });
}
