// 2048 - pure merge logic (no DOM), shared by the game and by tests.
export const SIZE = 4;
export const DIRS = ['up', 'right', 'down', 'left'];

/**
 * Slide one line toward index 0 with classic 2048 rules: tiles compact, equal neighbours
 * merge, and a tile produced by a merge cannot merge again in the same move.
 * Returns { result, gained, groups } where groups[k] lists the source positions that
 * ended up in result[k] (two entries = a merge).
 */
export function collapse(line) {
  const n = line.length;
  const result = new Array(n).fill(0);
  const groups = [];
  let gained = 0;
  let k = -1;
  let canMerge = false;
  for (let i = 0; i < n; i++) {
    const v = line[i];
    if (!v) continue;
    if (canMerge && result[k] === v) {
      result[k] = v * 2;
      gained += v * 2;
      groups[k].push(i);
      canMerge = false;
    } else {
      k += 1;
      result[k] = v;
      groups[k] = [i];
      canMerge = true;
    }
  }
  return { result, gained, groups };
}

/** Convenience for tests: [2,2,2,2] -> [4,4,0,0]. */
export function slideLine(line) {
  return collapse(line).result;
}

/** Cell indices of line k (0..3) ordered from the side the tiles move toward. */
export function lineIndices(dir, k) {
  const out = [];
  for (let j = 0; j < SIZE; j++) {
    if (dir === 'left') out.push(k * SIZE + j);
    else if (dir === 'right') out.push(k * SIZE + (SIZE - 1 - j));
    else if (dir === 'up') out.push(j * SIZE + k);
    else out.push((SIZE - 1 - j) * SIZE + k);
  }
  return out;
}

/**
 * Apply a move to a flat grid of 16 values.
 * Returns { vals, gained, moved, moves: [{from, to}], merges: [{to, v}] }.
 */
export function move(vals, dir) {
  const out = vals.slice();
  const moves = [];
  const merges = [];
  let gained = 0;
  let moved = false;
  for (let k = 0; k < SIZE; k++) {
    const idx = lineIndices(dir, k);
    const line = idx.map((i) => vals[i]);
    const c = collapse(line);
    gained += c.gained;
    for (let j = 0; j < SIZE; j++) {
      out[idx[j]] = c.result[j];
      if (c.result[j] !== line[j]) moved = true;
    }
    c.groups.forEach((grp, j) => {
      for (const src of grp) moves.push({ from: idx[src], to: idx[j] });
      if (grp.length > 1) merges.push({ to: idx[j], v: c.result[j] });
    });
  }
  return { vals: out, gained, moved, moves, merges };
}

export function canMove(vals) {
  for (let i = 0; i < vals.length; i++) {
    if (!vals[i]) return true;
    const r = (i / SIZE) | 0;
    const c = i % SIZE;
    if (c < SIZE - 1 && vals[i] === vals[i + 1]) return true;
    if (r < SIZE - 1 && vals[i] === vals[i + SIZE]) return true;
  }
  return false;
}

export function emptyCells(vals) {
  const out = [];
  for (let i = 0; i < vals.length; i++) if (!vals[i]) out.push(i);
  return out;
}

/** Spawn a 2 (90%) or 4 (10%) in a random empty cell. Always consumes exactly 2 rng values. */
export function spawnTile(vals, rng) {
  const empty = emptyCells(vals);
  const a = rng();
  const b = rng();
  if (!empty.length) return null;
  const i = empty[Math.floor(a * empty.length)];
  const v = b < 0.9 ? 2 : 4;
  vals[i] = v;
  return { i, v };
}

export function maxTile(vals) {
  let m = 0;
  for (const v of vals) if (v > m) m = v;
  return m;
}
