// Leaderboards backed by Redis sorted sets.
//   board=today  classic runs, resets daily      lb:<slug>:t:<day>
//   board=all    classic runs, all time          lb:<slug>:all
//   board=daily  Daily Challenge (seeded) today   lb:<slug>:d:<day>
// Players are anonymous visitor ids; display names live in the hash "lbn".
import { pipeline, pairs } from '@/lib/store';
import { json, utcDay, VID_RE, rateLimit, clientIp, cleanName } from '@/lib/server';
import { getGame } from '@/lib/games';

export const dynamic = 'force-dynamic';

const BOARDS = new Set(['today', 'all', 'daily']);

function key(slug, board, day = utcDay()) {
  if (board === 'all') return `lb:${slug}:all`;
  if (board === 'daily') return `lb:${slug}:d:${day}`;
  return `lb:${slug}:t:${day}`;
}

async function read(meta, board, limit, vid) {
  const k = key(meta.slug, board);
  const low = !!meta.lowerIsBetter;
  const cmds = [low ? ['ZRANGE', k, 0, limit - 1, 'WITHSCORES'] : ['ZRANGE', k, 0, limit - 1, 'REV', 'WITHSCORES'], ['ZCARD', k]];
  if (vid) cmds.push([low ? 'ZRANK' : 'ZREVRANK', k, vid], ['ZSCORE', k, vid]);
  const [top, total, myRank, myScore] = await pipeline(cmds);
  const rows = pairs(top);
  const ids = rows.map(([m]) => m);
  const names = ids.length ? await pipeline([['HMGET', 'lbn', ...ids]]).then((r) => r[0] || []) : [];
  return {
    board,
    total: Number(total) || 0,
    entries: rows.map(([m, s], i) => ({ rank: i + 1, name: names[i] || 'Player', score: Number(s), you: m === vid })),
    you: vid && myRank != null ? { rank: Number(myRank) + 1, score: Number(myScore) } : null,
  };
}

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const meta = getGame(q.get('slug'));
  const board = q.get('board') || 'today';
  if (!meta || !BOARDS.has(board)) return json({ error: 'bad request' }, { status: 400 });
  const limit = Math.min(50, Math.max(1, Number(q.get('limit')) || 10));
  const vid = VID_RE.test(q.get('vid') || '') ? q.get('vid') : null;
  return json(await read(meta, board, limit, vid));
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, { status: 400 });
  }
  const { slug, score, name, vid, mode } = body || {};
  const meta = getGame(slug);
  if (!meta || !VID_RE.test(String(vid))) return json({ error: 'bad request' }, { status: 400 });
  const s = Number(score);
  const max = meta.maxScore ?? 1e7;
  const min = meta.minScore ?? (meta.lowerIsBetter ? 1 : 0);
  if (!Number.isFinite(s) || s < min || s > max) return json({ error: 'score rejected' }, { status: 422 });
  const clean = cleanName(name);
  if (!clean) return json({ error: 'name rejected' }, { status: 422 });
  const ip = clientIp(req);
  if (!(await rateLimit(`lb:${vid}`, 12, 60)) || !(await rateLimit(`lbip:${ip}`, 40, 60))) return json({ error: 'slow down' }, { status: 429 });

  const flag = meta.lowerIsBetter ? 'LT' : 'GT';
  const day = utcDay();
  const boards = mode === 'daily' ? ['daily'] : ['today', 'all'];
  const cmds = [['HSET', 'lbn', vid, clean]];
  for (const b of boards) {
    const k = key(meta.slug, b, day);
    cmds.push(['ZADD', k, flag, Math.round(s * 100) / 100, vid]);
    if (b !== 'all') cmds.push(['EXPIRE', k, 86400 * 3]);
  }
  await pipeline(cmds);
  const out = await read(meta, boards[0], 10, vid);
  return json(out);
}
