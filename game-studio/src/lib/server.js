// Shared helpers for API route handlers.
import crypto from 'node:crypto';
import { cmd } from './store.js';

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(init.headers || {}) },
  });

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

export function dayKeys(days) {
  const out = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) out.push(utcDay(new Date(now - i * 86400000)));
  return out;
}

export const VID_RE = /^[a-z0-9]{8,32}$/i;

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

/** Fixed-window limiter: allow `limit` hits per `windowSec` per key. */
export async function rateLimit(key, limit, windowSec) {
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = await cmd('INCR', bucket);
  if (n === 1) await cmd('EXPIRE', bucket, windowSec + 1);
  return n <= limit;
}

export function isAdmin(req) {
  const token = process.env.STUDIO_TOKEN || '';
  if (!token) return process.env.NODE_ENV !== 'production';
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('token') || '';
  const a = Buffer.from(got);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'porn', 'dick', 'cock', 'pussy', 'asshole', 'retard', 'chutiya', 'madarchod', 'bhenchod', 'gandu', 'randi'];

/** Leaderboard display names: 2-16 chars, letters/digits/space/_-. and no slurs. */
export function cleanName(raw) {
  const name = String(raw || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  if (name.length < 2) return null;
  const flat = name.toLowerCase().replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/[^a-z]/g, '');
  if (BLOCKED.some((w) => flat.includes(w))) return null;
  return name;
}
