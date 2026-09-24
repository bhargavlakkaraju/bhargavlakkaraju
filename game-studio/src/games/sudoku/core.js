// Sudoku core: bitmask solver (counts solutions), seeded generator that guarantees a
// unique solution, and a human-style logical solver used to grade difficulty.
// Pure functions, no DOM. Grids are flat arrays of 81 numbers (0 = empty).

export const ALL = 0x1ff;
export const BIT = (d) => 1 << (d - 1);

export const ROW = new Uint8Array(81);
export const COL = new Uint8Array(81);
export const BOX = new Uint8Array(81);
for (let i = 0; i < 81; i++) {
  ROW[i] = (i / 9) | 0;
  COL[i] = i % 9;
  BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0);
}

/** 27 units: rows 0-8, columns 9-17, boxes 18-26. */
export const UNITS = [];
for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const r0 = ((b / 3) | 0) * 3;
  const c0 = (b % 3) * 3;
  UNITS.push(Array.from({ length: 9 }, (_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)));
}

export const PEERS = [];
for (let i = 0; i < 81; i++) {
  const s = new Set();
  for (let j = 0; j < 81; j++) if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) s.add(j);
  PEERS.push([...s]);
}

export const POP = new Uint8Array(512);
for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
export const DIGIT_OF = new Uint8Array(512); // single-bit mask -> digit
for (let d = 1; d <= 9; d++) DIGIT_OF[BIT(d)] = d;

/** Number of solutions, stopping early at `limit`. 0 for contradictory grids. */
export function countSolutions(grid, limit = 2) {
  const g = Int8Array.from(grid);
  const rows = new Int16Array(9);
  const cols = new Int16Array(9);
  const boxes = new Int16Array(9);
  for (let i = 0; i < 81; i++) {
    const d = g[i];
    if (!d) continue;
    const b = BIT(d);
    if (rows[ROW[i]] & b || cols[COL[i]] & b || boxes[BOX[i]] & b) return 0;
    rows[ROW[i]] |= b;
    cols[COL[i]] |= b;
    boxes[BOX[i]] |= b;
  }
  let count = 0;
  let first = null;
  function rec() {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
      const n = POP[m];
      if (n < bestN) {
        bestN = n;
        best = i;
        bestMask = m;
        if (n <= 1) break;
      }
    }
    if (best < 0) {
      count += 1;
      if (!first) first = Array.from(g);
      return;
    }
    if (bestN === 0) return;
    let m = bestMask;
    const r = ROW[best];
    const c = COL[best];
    const bx = BOX[best];
    while (m) {
      const b = m & -m;
      m ^= b;
      g[best] = DIGIT_OF[b];
      rows[r] |= b;
      cols[c] |= b;
      boxes[bx] |= b;
      rec();
      rows[r] &= ~b;
      cols[c] &= ~b;
      boxes[bx] &= ~b;
      g[best] = 0;
      if (count >= limit) return;
    }
  }
  rec();
  countSolutions.lastSolution = first;
  return count;
}

/** First solution found, or null. */
export function solve(grid) {
  return countSolutions(grid, 1) ? countSolutions.lastSolution : null;
}

/** A random complete, valid grid built with rng-shuffled backtracking. */
export function fillGrid(rng) {
  const g = new Int8Array(81);
  const rows = new Int16Array(9);
  const cols = new Int16Array(9);
  const boxes = new Int16Array(9);
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  function rec() {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
      const n = POP[m];
      if (n < bestN) {
        bestN = n;
        best = i;
        bestMask = m;
        if (n <= 1) break;
      }
    }
    if (best < 0) return true;
    if (bestN === 0) return false;
    const order = digits.filter((d) => bestMask & BIT(d));
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      const tmp = order[k];
      order[k] = order[j];
      order[j] = tmp;
    }
    const r = ROW[best];
    const c = COL[best];
    const bx = BOX[best];
    for (const d of order) {
      const b = BIT(d);
      g[best] = d;
      rows[r] |= b;
      cols[c] |= b;
      boxes[bx] |= b;
      if (rec()) return true;
      rows[r] &= ~b;
      cols[c] &= ~b;
      boxes[bx] &= ~b;
      g[best] = 0;
    }
    return false;
  }
  rec();
  return Array.from(g);
}

/**
 * Human-style solver. Techniques by level:
 *   1: naked singles, hidden singles
 *   2: locked candidates (pointing / claiming), naked pairs
 *   3: hidden pairs, naked triples, X-wing
 * Returns { solved, level } where level is the hardest technique that was needed.
 */
export function logicSolve(grid, maxLevel = 3) {
  const v = Int8Array.from(grid);
  const cand = new Int16Array(81);
  for (let i = 0; i < 81; i++) {
    if (v[i]) continue;
    let m = ALL;
    for (const p of PEERS[i]) if (v[p]) m &= ~BIT(v[p]);
    cand[i] = m;
  }
  let empty = 0;
  for (let i = 0; i < 81; i++) if (!v[i]) empty++;
  let level = empty ? 1 : 0;

  function assign(i, d) {
    v[i] = d;
    cand[i] = 0;
    empty--;
    const b = ~BIT(d);
    for (const p of PEERS[i]) cand[p] &= b;
  }
  /** Remove `mask` from cell i. Returns true if anything changed. */
  function elim(i, mask) {
    if (v[i] || !(cand[i] & mask)) return false;
    cand[i] &= ~mask;
    return true;
  }

  function singles() {
    let prog = false;
    for (let i = 0; i < 81; i++) {
      if (v[i]) continue;
      if (!cand[i]) return -1;
      if (POP[cand[i]] === 1) {
        assign(i, DIGIT_OF[cand[i]]);
        prog = true;
      }
    }
    if (prog) return 1;
    for (const u of UNITS) {
      for (let d = 1; d <= 9; d++) {
        const b = BIT(d);
        let n = 0;
        let at = -1;
        let placed = false;
        for (const i of u) {
          if (v[i] === d) {
            placed = true;
            break;
          }
          if (cand[i] & b) {
            n++;
            at = i;
          }
        }
        if (placed) continue;
        if (n === 0) return -1;
        if (n === 1) {
          assign(at, d);
          return 1;
        }
      }
    }
    return 0;
  }

  function level2() {
    let prog = false;
    // pointing: digit confined to one row/col inside a box
    for (let bx = 0; bx < 9; bx++) {
      const u = UNITS[18 + bx];
      for (let d = 1; d <= 9; d++) {
        const b = BIT(d);
        let rowSet = -1;
        let colSet = -1;
        let n = 0;
        for (const i of u) {
          if (!(cand[i] & b) || v[i]) continue;
          n++;
          rowSet = rowSet === -1 ? ROW[i] : rowSet === ROW[i] ? rowSet : -2;
          colSet = colSet === -1 ? COL[i] : colSet === COL[i] ? colSet : -2;
        }
        if (n < 2) continue;
        if (rowSet >= 0) for (const i of UNITS[rowSet]) if (BOX[i] !== bx && elim(i, b)) prog = true;
        if (colSet >= 0) for (const i of UNITS[9 + colSet]) if (BOX[i] !== bx && elim(i, b)) prog = true;
      }
    }
    if (prog) return true;
    // claiming: digit in a row/col confined to one box
    for (let k = 0; k < 18; k++) {
      const u = UNITS[k];
      for (let d = 1; d <= 9; d++) {
        const b = BIT(d);
        let boxSet = -1;
        let n = 0;
        for (const i of u) {
          if (!(cand[i] & b) || v[i]) continue;
          n++;
          boxSet = boxSet === -1 ? BOX[i] : boxSet === BOX[i] ? boxSet : -2;
        }
        if (n < 2 || boxSet < 0) continue;
        for (const i of UNITS[18 + boxSet]) {
          const inLine = k < 9 ? ROW[i] === k : COL[i] === k - 9;
          if (!inLine && elim(i, b)) prog = true;
        }
      }
    }
    if (prog) return true;
    // naked pairs
    for (const u of UNITS) {
      for (let a = 0; a < 9; a++) {
        const ia = u[a];
        if (v[ia] || POP[cand[ia]] !== 2) continue;
        for (let b2 = a + 1; b2 < 9; b2++) {
          const ib = u[b2];
          if (v[ib] || cand[ib] !== cand[ia]) continue;
          for (const i of u) if (i !== ia && i !== ib && elim(i, cand[ia])) prog = true;
        }
      }
    }
    return prog;
  }

  function level3() {
    let prog = false;
    // hidden pairs
    for (const u of UNITS) {
      const pos = new Int16Array(10);
      for (let k = 0; k < 9; k++) {
        const i = u[k];
        if (v[i]) continue;
        for (let d = 1; d <= 9; d++) if (cand[i] & BIT(d)) pos[d] |= 1 << k;
      }
      for (let d1 = 1; d1 <= 9; d1++) {
        if (POP[pos[d1]] !== 2) continue;
        for (let d2 = d1 + 1; d2 <= 9; d2++) {
          if (pos[d2] !== pos[d1]) continue;
          const keep = BIT(d1) | BIT(d2);
          for (let k = 0; k < 9; k++) if (pos[d1] & (1 << k) && elim(u[k], ALL & ~keep)) prog = true;
        }
      }
    }
    if (prog) return true;
    // naked triples
    for (const u of UNITS) {
      const cells = u.filter((i) => !v[i] && POP[cand[i]] >= 2 && POP[cand[i]] <= 3);
      for (let a = 0; a < cells.length; a++)
        for (let b = a + 1; b < cells.length; b++)
          for (let c = b + 1; c < cells.length; c++) {
            const m = cand[cells[a]] | cand[cells[b]] | cand[cells[c]];
            if (POP[m] !== 3) continue;
            for (const i of u) if (i !== cells[a] && i !== cells[b] && i !== cells[c] && elim(i, m)) prog = true;
          }
    }
    if (prog) return true;
    // X-wing (rows then columns)
    for (let pass = 0; pass < 2; pass++) {
      for (let d = 1; d <= 9; d++) {
        const b = BIT(d);
        const lines = [];
        for (let k = 0; k < 9; k++) {
          const u = UNITS[pass * 9 + k];
          let mask = 0;
          for (let j = 0; j < 9; j++) if (!v[u[j]] && cand[u[j]] & b) mask |= 1 << j;
          lines.push(mask);
        }
        for (let a = 0; a < 9; a++) {
          if (POP[lines[a]] !== 2) continue;
          for (let c = a + 1; c < 9; c++) {
            if (lines[c] !== lines[a]) continue;
            for (let j = 0; j < 9; j++) {
              if (!(lines[a] & (1 << j))) continue;
              const cross = UNITS[(1 - pass) * 9 + j];
              for (let k = 0; k < 9; k++) if (k !== a && k !== c && elim(cross[k], b)) prog = true;
            }
          }
        }
      }
    }
    return prog;
  }

  while (empty > 0) {
    const s = singles();
    if (s < 0) return { solved: false, level, contradiction: true };
    if (s > 0) continue;
    if (maxLevel >= 2 && level2()) {
      level = Math.max(level, 2);
      continue;
    }
    if (maxLevel >= 3 && level3()) {
      level = 3;
      continue;
    }
    break;
  }
  return { solved: empty === 0, level };
}

export const DIFFICULTY = {
  easy: { target: 38, maxLevel: 1, minLevel: 1, label: 'Easy' },
  medium: { target: 30, maxLevel: 2, minLevel: 1, label: 'Medium' },
  hard: { target: 24, maxLevel: 3, minLevel: 2, label: 'Hard' },
};

/**
 * Generate a puzzle with exactly one solution that is solvable with the techniques allowed
 * for the difficulty. Clues are removed in symmetric pairs while the solution stays unique.
 * Returns { puzzle, solution, clues, level, attempts }.
 */
export function generate(rng, difficulty = 'medium') {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.medium;
  let best = null;
  const maxAttempts = cfg.minLevel > 1 ? 40 : 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const solution = fillGrid(rng);
    const puzzle = solution.slice();
    const order = [];
    for (let i = 0; i <= 40; i++) order.push(i);
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      const tmp = order[k];
      order[k] = order[j];
      order[j] = tmp;
    }
    let clues = 81;
    for (const i of order) {
      if (clues <= cfg.target) break;
      const j = 80 - i;
      const a = puzzle[i];
      const b = puzzle[j];
      puzzle[i] = 0;
      puzzle[j] = 0;
      if (countSolutions(puzzle, 2) === 1 && logicSolve(puzzle, cfg.maxLevel).solved) clues -= i === j ? 1 : 2;
      else {
        puzzle[i] = a;
        puzzle[j] = b;
      }
    }
    const { level } = logicSolve(puzzle, 3);
    const cand = { puzzle, solution, clues, level, attempts: attempt };
    if (level >= cfg.minLevel) return cand;
    if (!best || clues < best.clues) best = cand;
  }
  return best;
}
