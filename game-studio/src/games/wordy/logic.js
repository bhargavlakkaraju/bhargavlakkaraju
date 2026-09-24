// Pure Wordy rules: scoring, daily puzzle selection and share text.
// No DOM access, so it can be unit-tested directly in Node.

export const ABSENT = 0;
export const PRESENT = 1;
export const CORRECT = 2;

/** 2026-09-24 00:00 UTC: puzzle #1. */
export const EPOCH = Date.UTC(2026, 8, 24);
const DAY_MS = 86400000;

/**
 * Score a guess against the answer with correct duplicate-letter handling:
 * exact matches are claimed first, then remaining answer letters are handed out
 * left-to-right as "present", so a letter is never marked more times than it occurs.
 * @returns {number[]} 5 entries of ABSENT | PRESENT | CORRECT
 */
export function scoreGuess(guess, answer) {
  const n = answer.length;
  const res = new Array(n).fill(ABSENT);
  const left = Object.create(null);
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) res[i] = CORRECT;
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (res[i] === CORRECT) continue;
    const c = guess[i];
    if (left[c] > 0) {
      res[i] = PRESENT;
      left[c] -= 1;
    }
  }
  return res;
}

/** Whole UTC days since the epoch (0 on 2026-09-24). */
export function dayIndex(date = new Date()) {
  return Math.floor((date.getTime() - EPOCH) / DAY_MS);
}

/** Public puzzle number shown to players ("Wordy #N"): #1 on 2026-09-24. */
export function puzzleNumber(date = new Date()) {
  return dayIndex(date) + 1;
}

export function msUntilNextUtcDay(date = new Date()) {
  const t = date.getTime();
  return DAY_MS - (((t % DAY_MS) + DAY_MS) % DAY_MS);
}

// Fixed, seeded permutation of the answer list, so daily answers never repeat
// until the whole list has been used (~5.5 years) and are identical for everyone.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let orderCache = null;
function dailyOrder(n) {
  if (orderCache && orderCache.length === n) return orderCache;
  const rnd = mulberry32(0x5eed2026);
  const order = new Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  orderCache = order;
  return order;
}

/** The single answer everyone gets for the UTC day of `date`. */
export function dailyAnswer(answers, date = new Date()) {
  const n = answers.length;
  const i = dayIndex(date);
  return answers[dailyOrder(n)[((i % n) + n) % n]];
}

const EMOJI = ['⬛', '🟨', '🟩'];

/** "Wordy #12 4/6" + emoji rows. `label` is e.g. "#12" or "Classic"; solved=false prints X. */
export function shareText(label, evals, solved, maxRows) {
  const head = `Wordy ${label} ${solved ? evals.length : 'X'}/${maxRows}`;
  const rows = evals.map((ev) => ev.map((v) => EMOJI[v]).join(''));
  return [head, '', ...rows].join('\n');
}
