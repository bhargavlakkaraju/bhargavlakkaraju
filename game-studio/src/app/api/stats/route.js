// Studio analytics for the /studio dashboard and scripts/insights.mjs (the weekly
// autonomous-improvement report). Protected by STUDIO_TOKEN (Bearer or ?token=).
import { pipeline, pairs, storeKind } from '@/lib/store';
import { json, isAdmin, dayKeys } from '@/lib/server';
import { GAMES } from '@/lib/games';

export const dynamic = 'force-dynamic';

const toObj = (reply) => {
  const o = {};
  for (const [k, v] of pairs(reply)) o[k] = Number(v);
  return o;
};
const addInto = (acc, o) => {
  for (const k in o) acc[k] = (acc[k] || 0) + o[k];
  return acc;
};

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const days = Math.min(90, Math.max(1, Number(q.get('days')) || 14));
  const keys = dayKeys(days);

  if (q.get('export') === 'leads') {
    const [rows] = await pipeline([['LRANGE', 'leads', 0, 499]]);
    return new Response((rows || []).join('\n'), { headers: { 'content-type': 'application/x-ndjson' } });
  }
  if (q.get('export') === 'subs') {
    const [emails] = await pipeline([['SMEMBERS', 'subs']]);
    return new Response((emails || []).join('\n'), { headers: { 'content-type': 'text/plain' } });
  }

  const cmds = [];
  for (const d of keys) cmds.push(['HGETALL', `d:${d}`], ['PFCOUNT', `u:${d}`], ['HGETALL', `x:${d}`], ['HGETALL', `r:${d}`], ['HGETALL', `s:${d}`]);
  for (const g of GAMES) cmds.push(['PFCOUNT', ...keys.map((d) => `pu:${d}:${g.slug}`)]);
  cmds.push(['PFCOUNT', ...keys.map((d) => `u:${d}`)], ['SCARD', 'subs']);
  const res = await pipeline(cmds);
  const [leadRows, plusStats, socialPosts, ...socialDays] = await pipeline([
    ['LRANGE', 'leads', 0, 19],
    ['HGETALL', 'plus:stats'],
    ['HGETALL', 'social:posts'],
    ...keys.map((d) => ['HGETALL', `sc:${d}`]),
  ]);
  // Social posts: what the posting agent reported, joined with the visits and plays each
  // post's tracked link produced on the site.
  const social = {};
  for (const reply of socialDays)
    for (const [k, v] of pairs(reply)) {
      const [id, what] = k.split('|');
      social[id] ??= { id, visits: 0, plays: 0, runs: 0, posts: [] };
      social[id][what] = (social[id][what] || 0) + Number(v);
    }
  for (const [, v] of pairs(socialPosts)) {
    try {
      const r = JSON.parse(v);
      social[r.id] ??= { id: r.id, visits: 0, plays: 0, runs: 0, posts: [] };
      social[r.id].posts.push({ platform: r.platform, url: r.url, postedAt: r.postedAt, metrics: r.metrics });
    } catch {
      /* skip bad record */
    }
  }
  const leads = (leadRows || []).map((r) => {
    try {
      return JSON.parse(r);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const series = [];
  const totals = {};
  const exp = {};
  const refs = {};
  const sources = {};
  keys.forEach((d, i) => {
    const counters = toObj(res[i * 5]);
    addInto(totals, counters);
    addInto(exp, toObj(res[i * 5 + 2]));
    addInto(refs, toObj(res[i * 5 + 3]));
    addInto(sources, toObj(res[i * 5 + 4]));
    series.push({
      day: d,
      dau: Number(res[i * 5 + 1]) || 0,
      pageViews: counters.page_view || 0,
      plays: counters.game_start || 0,
      runs: counters.game_over || 0,
      shares: counters.share_click || 0,
      interstitials: counters.ad_interstitial || 0,
      rewarded: counters.ad_rewarded || 0,
      subscribes: counters.subscribe || 0,
    });
  });
  const base = keys.length * 5;
  const games = GAMES.map((g, i) => {
    const c = (e) => totals[`${e}|${g.slug}`] || 0;
    const runs = c('game_over');
    const starts = c('game_start');
    return {
      slug: g.slug,
      title: g.title,
      players: Number(res[base + i]) || 0,
      loads: c('game_load'),
      starts,
      runs,
      restarts: c('restart'),
      shares: c('share_click'),
      challengeOpens: c('challenge_open'),
      reviveOffers: c('revive_offer'),
      revives: c('revive_accept'),
      interstitials: c('ad_interstitial'),
      rewarded: c('ad_rewarded'),
      avgRunSec: runs ? Math.round((c('dur') / runs) * 10) / 10 : 0,
      runsPerPlayer: Number(res[base + i]) ? Math.round((runs / Number(res[base + i])) * 10) / 10 : 0,
      startRate: c('game_load') ? Math.round((starts / c('game_load')) * 1000) / 10 : 0,
      shareRate: runs ? Math.round((c('share_click') / runs) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.runs - a.runs);

  const experiments = {};
  for (const [k, v] of Object.entries(exp)) {
    const [name, variant, event] = k.split(':');
    experiments[name] ??= {};
    experiments[name][variant] ??= {};
    experiments[name][variant][event] = v;
  }
  const top = (o, n = 20) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  const retention = {};
  for (const [k, v] of Object.entries(totals)) if (k.startsWith('active|')) retention[k.slice(7)] = v;

  return json({
    store: storeKind,
    range: { from: keys[0], to: keys[keys.length - 1], days },
    uniqueVisitors: Number(res[base + GAMES.length]) || 0,
    subscribers: Number(res[base + GAMES.length + 1]) || 0,
    leads,
    plus: toObj(plusStats),
    social: Object.values(social)
      .sort((a, b) => b.visits - a.visits || String(b.id).localeCompare(String(a.id)))
      .slice(0, 40),
    series,
    totals: {
      pageViews: totals.page_view || 0,
      plays: totals.game_start || 0,
      runs: totals.game_over || 0,
      restarts: totals.restart || 0,
      shares: totals.share_click || 0,
      challengeOpens: totals.challenge_open || 0,
      interstitials: totals.ad_interstitial || 0,
      rewarded: totals.ad_rewarded || 0,
      levelUps: totals.level_up || 0,
      embedsCopied: totals.embed_copy || 0,
    },
    shareChannels: Object.fromEntries(Object.entries(totals).filter(([k]) => k.startsWith('share_ch|')).map(([k, v]) => [k.slice(9), v])),
    retention,
    games,
    experiments,
    referrers: top(refs),
    sources: top(sources),
  });
}
