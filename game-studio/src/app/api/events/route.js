// Analytics ingestion. Cheap daily counters in Redis hashes, one pipeline per batch:
//   d:<day>        event counts, "<event>|<slug>" per game, "dur|<slug>" seconds played
//   u:<day>        HyperLogLog of daily active visitors
//   pu:<day>:<slug> HyperLogLog of players per game
//   x:<day>        experiment counters "<exp>:<variant>:<event>"
//   r:<day> / s:<day>  referrer hosts / utm sources
import { pipeline } from '@/lib/store';
import { json, utcDay, VID_RE, rateLimit, clientIp } from '@/lib/server';
import { getGame } from '@/lib/games';

export const dynamic = 'force-dynamic';

const TTL = 86400 * 120;
const ALLOWED = new Set([
  'page_view',
  'game_load',
  'game_start',
  'game_over',
  'restart',
  'revive_offer',
  'revive_accept',
  'share_click',
  'challenge_open',
  'challenge_won',
  'ad_interstitial',
  'ad_rewarded',
  'subscribe',
  'embed_copy',
  'milestone',
  'medal',
  'level_up',
  'fullscreen',
  'nick_set',
  'lb_submit',
  'install_prompt',
  'lead',
  'plus_click',
  'plus_activated',
  'support_click',
]);
const SAFE = /^[a-z0-9_.-]{1,40}$/i;
const RET_BUCKETS = [
  [0, 'd0'],
  [1, 'd1'],
  [3, 'd2_3'],
  [7, 'd4_7'],
  [14, 'd8_14'],
  [30, 'd15_30'],
  [Infinity, 'd31p'],
];

function refHost(ref) {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    return SAFE.test(h) ? h : null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  let body;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return json({ ok: false }, { status: 400 });
  }
  const { vid, events, exp, ref, utm, act, pc } = body || {};
  const post = typeof pc === 'string' && SAFE.test(pc) ? pc : null;
  if (!VID_RE.test(String(vid)) || !Array.isArray(events)) return json({ ok: false }, { status: 400 });
  if (!(await rateLimit(`ev:${clientIp(req)}`, 240, 60))) return json({ ok: false }, { status: 429 });

  const day = utcDay();
  const dk = `d:${day}`;
  const cmds = [
    ['PFADD', `u:${day}`, vid],
    ['EXPIRE', `u:${day}`, TTL],
    ['EXPIRE', dk, TTL],
  ];
  const expPairs = exp && typeof exp === 'object' ? Object.entries(exp).filter(([k, v]) => SAFE.test(k) && SAFE.test(String(v))).slice(0, 6) : [];

  for (const e of events.slice(0, 60)) {
    if (!e || !ALLOWED.has(e.n)) continue;
    const slug = e.g && getGame(e.g) ? e.g : null;
    cmds.push(['HINCRBY', dk, e.n, 1]);
    if (slug) cmds.push(['HINCRBY', dk, `${e.n}|${slug}`, 1]);
    if (slug && e.n === 'game_over') {
      const d = Math.max(0, Math.min(3600, Number(e.d) || 0));
      cmds.push(['HINCRBY', dk, `dur|${slug}`, Math.round(d)]);
    }
    if (slug && e.n === 'game_start') {
      cmds.push(['PFADD', `pu:${day}:${slug}`, vid], ['EXPIRE', `pu:${day}:${slug}`, TTL]);
    }
    if (e.n === 'share_click' && e.c && SAFE.test(e.c)) cmds.push(['HINCRBY', dk, `share_ch|${e.c}`, 1]);
    if (post && (e.n === 'game_start' || e.n === 'game_over')) cmds.push(['HINCRBY', `sc:${day}`, `${post}|${e.n === 'game_start' ? 'plays' : 'runs'}`, 1]);
    for (const [k, v] of expPairs) cmds.push(['HINCRBY', `x:${day}`, `${k}:${v}:${e.n}`, 1]);
  }
  if (expPairs.length) cmds.push(['EXPIRE', `x:${day}`, TTL]);

  const host = ref ? refHost(ref) : null;
  if (host) cmds.push(['HINCRBY', `r:${day}`, host, 1], ['EXPIRE', `r:${day}`, TTL]);
  // Per-post results for the social feed: visits (first batch of a session) and plays.
  if (post) {
    if (utm) cmds.push(['HINCRBY', `sc:${day}`, `${post}|visits`, 1]);
    cmds.push(['EXPIRE', `sc:${day}`, TTL]);
  }
  if (utm && utm.source && SAFE.test(utm.source)) {
    const camp = utm.campaign && SAFE.test(utm.campaign) ? utm.campaign : '-';
    cmds.push(['HINCRBY', `s:${day}`, `${utm.source}|${camp}`, 1], ['EXPIRE', `s:${day}`, TTL]);
  }
  // Retention proxy: first activity of a visitor on a given day, bucketed by account age.
  if (act && Number.isFinite(Number(act.age))) {
    const age = Math.max(0, Number(act.age));
    const bucket = RET_BUCKETS.find(([max]) => age <= max)[1];
    cmds.push(['HINCRBY', dk, `active|${bucket}`, 1]);
  }

  await pipeline(cmds);
  return json({ ok: true });
}
