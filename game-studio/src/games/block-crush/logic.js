// Block Crush - pure board logic (no DOM), shared by the game and by tests.
export const N = 8;

// Every common polyomino family: singles, lines 2-5, squares, rectangles, small/big
// corners, L/J, T and S/Z in all orientations. '#' = block, '.' = gap, '|' = new row.
// The weight controls how often a shape is dealt (big awkward shapes are rarer).
const DEFS = [
  ['#', 2.2],
  ['##', 2.6], ['#|#', 2.6],
  ['###', 2.6], ['#|#|#', 2.6],
  ['####', 1.9], ['#|#|#|#', 1.9],
  ['#####', 1.1], ['#|#|#|#|#', 1.1],
  ['##|##', 3.6],
  ['###|###|###', 1.0],
  ['##|##|##', 1.0], ['###|###', 1.0],
  // small corners (3 blocks)
  ['##|#.', 1.4], ['##|.#', 1.4], ['#.|##', 1.4], ['.#|##', 1.4],
  // L and J (4 blocks)
  ['#.|#.|##', 0.75], ['.#|.#|##', 0.75], ['##|#.|#.', 0.75], ['##|.#|.#', 0.75],
  ['###|#..', 0.75], ['###|..#', 0.75], ['#..|###', 0.75], ['..#|###', 0.75],
  // T
  ['###|.#.', 0.8], ['.#.|###', 0.8], ['#.|##|#.', 0.8], ['.#|##|.#', 0.8],
  // S / Z
  ['.##|##.', 0.7], ['##.|.##', 0.7], ['#.|##|.#', 0.7], ['.#|##|#.', 0.7],
  // big corners (5 blocks)
  ['###|#..|#..', 0.55], ['###|..#|..#', 0.55], ['#..|#..|###', 0.55], ['..#|..#|###', 0.55],
];

export const SHAPES = DEFS.map(([pat, weight], id) => {
  const rows = pat.split('|');
  const cells = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === '#') cells.push([r, c]);
  });
  return { id, pat, weight, cells, h: rows.length, w: Math.max(...rows.map((x) => x.length)) };
});

const TOTAL_WEIGHT = SHAPES.reduce((a, s) => a + s.weight, 0);

/** Weighted shape pick from a uniform number u in [0, 1). */
export function pickShape(u) {
  let x = u * TOTAL_WEIGHT;
  for (const s of SHAPES) {
    x -= s.weight;
    if (x < 0) return s;
  }
  return SHAPES[SHAPES.length - 1];
}

export function shapeByPattern(pat) {
  return SHAPES.find((s) => s.pat === pat) || null;
}

export function canPlace(board, shape, r0, c0) {
  if (r0 < 0 || c0 < 0 || r0 + shape.h > N || c0 + shape.w > N) return false;
  const cells = shape.cells;
  for (let i = 0; i < cells.length; i++) {
    if (board[(r0 + cells[i][0]) * N + c0 + cells[i][1]]) return false;
  }
  return true;
}

/** First placement (row-major) or null. */
export function findPlacement(board, shape) {
  for (let r = 0; r <= N - shape.h; r++) {
    for (let c = 0; c <= N - shape.w; c++) if (canPlace(board, shape, r, c)) return { r, c };
  }
  return null;
}

export function fitsAnywhere(board, shape) {
  return findPlacement(board, shape) !== null;
}

/** Writes the shape into the board (value = color + 1). Returns placed cell indices. */
export function placeShape(board, shape, r0, c0, value) {
  const out = [];
  for (const [dr, dc] of shape.cells) {
    const i = (r0 + dr) * N + c0 + dc;
    board[i] = value;
    out.push(i);
  }
  return out;
}

export function fullLines(board) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < N; r++) {
    let full = true;
    for (let c = 0; c < N && full; c++) if (!board[r * N + c]) full = false;
    if (full) rows.push(r);
  }
  for (let c = 0; c < N; c++) {
    let full = true;
    for (let r = 0; r < N && full; r++) if (!board[r * N + c]) full = false;
    if (full) cols.push(c);
  }
  return { rows, cols };
}

/** Empties the given rows and columns. Returns [{i, v}] for every cleared cell (unique). */
export function clearLines(board, rows, cols) {
  const seen = new Set();
  const out = [];
  const take = (i) => {
    if (seen.has(i)) return;
    seen.add(i);
    out.push({ i, v: board[i] });
  };
  for (const r of rows) for (let c = 0; c < N; c++) take(r * N + c);
  for (const c of cols) for (let r = 0; r < N; r++) take(r * N + c);
  for (const o of out) board[o.i] = 0;
  return out;
}

export function isEmpty(board) {
  for (let i = 0; i < board.length; i++) if (board[i]) return false;
  return true;
}

export const LINE_WORDS = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUADRUPLE!', 'INCREDIBLE!', 'UNREAL!'];

/** Points for clearing `lines` lines at once while on a streak of `combo` clearing moves. */
export function clearPoints(lines, combo) {
  if (lines <= 0) return 0;
  return ((10 * lines * (lines + 1)) / 2) * Math.max(1, combo);
}

export const ALL_CLEAR_BONUS = 300;

/**
 * Deal a tray of three pieces. Always consumes exactly 7 rng values so the Daily Challenge
 * hands every player the same sequence of trays. If none of the three pieces fit the board,
 * the first "rescue" piece that does fit is swapped into the middle slot (fairness).
 */
export function dealTray(rng, board, nColors) {
  const main = [pickShape(rng()), pickShape(rng()), pickShape(rng())];
  const rescue = [pickShape(rng()), pickShape(rng()), pickShape(rng())];
  const c0 = Math.floor(rng() * nColors);
  const colors = [c0, (c0 + 3) % nColors, (c0 + 5) % nColors];
  if (board && !main.some((s) => fitsAnywhere(board, s))) {
    const r = rescue.find((s) => fitsAnywhere(board, s));
    if (r) main[1] = r;
  }
  return main.map((shape, i) => ({ shape, color: colors[i] }));
}
