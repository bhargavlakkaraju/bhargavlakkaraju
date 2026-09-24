// Server-side data store. Uses Upstash Redis / Vercel KV over REST when configured
// (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + _TOKEN), otherwise
// an in-process Redis emulation persisted to .data/store.json (local dev only; on
// serverless hosts it resets on cold starts, so configure Redis in production).
import fs from 'node:fs';
import path from 'node:path';

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const storeKind = REST_URL && REST_TOKEN ? 'redis' : 'memory';

/** Run a batch of Redis commands, e.g. [['HINCRBY','k','f',1], ['PFADD','u','vid']]. Returns results in order. */
export async function pipeline(cmds) {
  if (!cmds.length) return [];
  if (storeKind === 'redis') {
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds.map((c) => c.map(String))),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const json = await res.json();
    return json.map((r) => (r.error ? null : r.result));
  }
  return cmds.map((c) => mem.exec(c));
}

export async function cmd(...args) {
  const [r] = await pipeline([args]);
  return r;
}

/** Convert Redis flat [k, v, k, v] replies (HGETALL / WITHSCORES) to pairs. */
export function pairs(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) return Object.entries(arr);
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

// ---------------------------------------------------------------------------
// In-memory Redis emulation (subset of commands the app uses)
// ---------------------------------------------------------------------------
const DATA_FILE = path.join(process.cwd(), '.data', 'store.json');

function createMem() {
  let db = new Map();
  let dirty = false;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      db = new Map(
        Object.entries(raw).map(([k, v]) => [k, v.t === 'set' ? { t: 'set', v: new Set(v.v) } : v.t === 'hll' ? { t: 'hll', v: new Set(v.v) } : v]),
      );
    }
  } catch {
    db = new Map();
  }
  const persist = () => {
    if (dirty) return;
    dirty = true;
    setTimeout(() => {
      dirty = false;
      try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        const obj = {};
        for (const [k, v] of db) obj[k] = v.v instanceof Set ? { t: v.t, v: [...v.v] } : v;
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj));
      } catch {
        /* read-only fs (serverless): memory only */
      }
    }, 300);
  };
  const get = (k, t, init) => {
    let e = db.get(k);
    if (e && e.exp && e.exp < Date.now()) {
      db.delete(k);
      e = null;
    }
    if (!e && init !== undefined) {
      e = { t, v: init() };
      db.set(k, e);
    }
    return e;
  };
  const zsorted = (e) => Object.entries(e.v).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));

  const handlers = {
    GET: (k) => get(k)?.v ?? null,
    SET: (k, v, ...opts) => {
      const up = opts.map((o) => String(o).toUpperCase());
      if (up.includes('NX') && get(k)) return null;
      const e = { t: 'str', v: String(v) };
      const ex = up.indexOf('EX');
      if (ex >= 0) e.exp = Date.now() + Number(opts[ex + 1]) * 1000;
      db.set(k, e);
      return 'OK';
    },
    INCR: (k) => {
      const e = get(k, 'str', () => '0');
      e.v = String(Number(e.v) + 1);
      return Number(e.v);
    },
    EXPIRE: (k, s) => {
      const e = get(k);
      if (!e) return 0;
      e.exp = Date.now() + Number(s) * 1000;
      return 1;
    },
    DEL: (k) => (db.delete(k) ? 1 : 0),
    HINCRBY: (k, f, n) => {
      const e = get(k, 'hash', () => ({}));
      e.v[f] = (Number(e.v[f]) || 0) + Number(n);
      return e.v[f];
    },
    HSET: (k, ...fv) => {
      const e = get(k, 'hash', () => ({}));
      for (let i = 0; i < fv.length; i += 2) e.v[fv[i]] = String(fv[i + 1]);
      return fv.length / 2;
    },
    HGET: (k, f) => get(k)?.v?.[f] ?? null,
    HMGET: (k, ...fs) => fs.map((f) => get(k)?.v?.[f] ?? null),
    HGETALL: (k) => {
      const e = get(k);
      return e ? Object.entries(e.v).flat().map(String) : [];
    },
    HLEN: (k) => Object.keys(get(k)?.v || {}).length,
    SADD: (k, ...m) => {
      const e = get(k, 'set', () => new Set());
      let n = 0;
      m.forEach((x) => {
        if (!e.v.has(String(x))) {
          e.v.add(String(x));
          n++;
        }
      });
      return n;
    },
    SCARD: (k) => get(k)?.v?.size || 0,
    SMEMBERS: (k) => [...(get(k)?.v || [])],
    SISMEMBER: (k, m) => (get(k)?.v?.has(String(m)) ? 1 : 0),
    PFADD: (k, ...m) => {
      const e = get(k, 'hll', () => new Set());
      const before = e.v.size;
      m.forEach((x) => e.v.add(String(x)));
      return e.v.size > before ? 1 : 0;
    },
    PFCOUNT: (...ks) => {
      const u = new Set();
      ks.forEach((k) => (get(k)?.v || []).forEach((x) => u.add(x)));
      return u.size;
    },
    ZADD: (k, ...args) => {
      const e = get(k, 'zset', () => ({}));
      let gt = false;
      let lt = false;
      while (typeof args[0] === 'string' && /^(GT|LT|NX|XX|CH)$/i.test(args[0])) {
        const o = args.shift().toUpperCase();
        if (o === 'GT') gt = true;
        if (o === 'LT') lt = true;
      }
      let added = 0;
      for (let i = 0; i < args.length; i += 2) {
        const s = Number(args[i]);
        const m = String(args[i + 1]);
        const cur = e.v[m];
        if (cur === undefined) {
          e.v[m] = s;
          added++;
        } else if ((!gt && !lt) || (gt && s > cur) || (lt && s < cur)) e.v[m] = s;
      }
      return added;
    },
    ZSCORE: (k, m) => {
      const v = get(k)?.v?.[m];
      return v === undefined ? null : String(v);
    },
    ZCARD: (k) => Object.keys(get(k)?.v || {}).length,
    ZRANK: (k, m) => {
      const e = get(k);
      if (!e || e.v[m] === undefined) return null;
      return zsorted(e).findIndex(([x]) => x === m);
    },
    ZREVRANK: (k, m) => {
      const e = get(k);
      if (!e || e.v[m] === undefined) return null;
      return zsorted(e)
        .reverse()
        .findIndex(([x]) => x === m);
    },
    ZRANGE: (k, start, stop, ...opts) => {
      const e = get(k);
      if (!e) return [];
      const up = opts.map((o) => String(o).toUpperCase());
      let arr = zsorted(e);
      if (up.includes('REV')) arr = arr.reverse();
      const n = arr.length;
      let s = Number(start);
      let t = Number(stop);
      if (s < 0) s = n + s;
      if (t < 0) t = n + t;
      arr = arr.slice(Math.max(0, s), t + 1);
      return up.includes('WITHSCORES') ? arr.flatMap(([m, sc]) => [m, String(sc)]) : arr.map(([m]) => m);
    },
    LPUSH: (k, ...v) => {
      const e = get(k, 'list', () => []);
      e.v.unshift(...v.map(String).reverse());
      return e.v.length;
    },
    LTRIM: (k, s, t) => {
      const e = get(k);
      if (e) e.v = e.v.slice(Number(s), Number(t) + 1);
      return 'OK';
    },
    LRANGE: (k, s, t) => {
      const e = get(k);
      if (!e) return [];
      const end = Number(t) < 0 ? e.v.length + Number(t) : Number(t);
      return e.v.slice(Number(s), end + 1);
    },
  };
  const WRITES = new Set(['SET', 'INCR', 'EXPIRE', 'DEL', 'HINCRBY', 'HSET', 'SADD', 'PFADD', 'ZADD', 'LPUSH', 'LTRIM']);
  return {
    exec([name, ...args]) {
      const op = String(name).toUpperCase();
      const h = handlers[op];
      if (!h) throw new Error(`memory store: unsupported command ${op}`);
      const r = h(...args);
      if (WRITES.has(op)) persist();
      return r;
    },
  };
}

const g = globalThis;
const mem = g.__raMem || (g.__raMem = createMem());
