// Klondike solvability checker used to deal only winnable games.
// Card code: suit * 13 + (rank - 1); suits 0 spades, 1 hearts, 2 clubs, 3 diamonds (odd = red).
// Search: depth-first with a transposition table, safe auto-play and a node budget.
// Every move the solver makes is a legal Klondike move, so "solved" is always truthful;
// deals it cannot prove within the budget are simply skipped by the dealer.
// Stock model: the talon T lists stock+waste cards in draw order and wp is how many are in
// the waste. With unlimited redeals every card is reachable in draw-1; in draw-3 only the
// cards that land on top of a 3-card draw are reachable (modelled exactly).

const rankOf = (c) => (c % 13) + 1;
const suitOf = (c) => (c / 13) | 0;
const redOf = (c) => suitOf(c) & 1;

/**
 * @param {number[][]} tab 7 columns, bottom -> top
 * @param {number[]} down face-down count per column
 * @param {number[]} talon stock cards in draw order (first drawn first)
 * @param {number} draw 1 or 3
 * @param {number} limit node budget
 * @returns {{ solved: boolean, nodes: number, exhausted: boolean }}
 */
export function solve(tab, down, talon, draw = 1, limit = 25000, trace = false) {
  const seen = new Set();
  let nodes = 0;
  let aborted = false;
  const draw1 = draw === 1;

  function canFound(found, c) {
    return found[suitOf(c)] === rankOf(c) - 1;
  }

  function fits(s, c, col) {
    const t = s.tab[col];
    if (t.length === 0) return rankOf(c) === 13;
    const top = t[t.length - 1];
    return redOf(top) !== redOf(c) && rankOf(top) === rankOf(c) + 1;
  }

  function clone(s) {
    return { tab: s.tab.map((t) => t.slice()), down: s.down.slice(), found: s.found.slice(), T: s.T.slice(), wp: s.wp };
  }

  function flip(s, i) {
    if (s.down[i] > 0 && s.tab[i].length === s.down[i]) s.down[i] -= 1;
  }

  function safe(found, c) {
    const r = rankOf(c);
    if (r <= 2) return true;
    const red = redOf(c);
    // both opposite-colour foundations already hold rank r-1, so nothing can ever need c in the tableau
    for (let su = 0; su < 4; su++) if ((su & 1) !== red && found[su] < r - 1) return false;
    return true;
  }

  function autoPlay(s) {
    const done = trace ? [] : null;
    let moved = true;
    while (moved) {
      moved = false;
      for (let i = 0; i < 7; i++) {
        const t = s.tab[i];
        if (!t.length) continue;
        const c = t[t.length - 1];
        if (canFound(s.found, c) && safe(s.found, c)) {
          t.pop();
          s.found[suitOf(c)] += 1;
          flip(s, i);
          moved = true;
          if (done) done.push(['tf', i]);
        }
      }
      if (s.wp > 0) {
        const c = s.T[s.wp - 1];
        if (canFound(s.found, c) && safe(s.found, c)) {
          s.T.splice(s.wp - 1, 1);
          s.wp -= 1;
          s.found[suitOf(c)] += 1;
          moved = true;
          if (done) done.push(['wf', c]);
        }
      }
    }
    return done;
  }

  // Describe a move in game terms (for replaying a solution).
  function describe(s, m) {
    switch (m[0]) {
      case 0:
        return ['tf', m[1]];
      case 1:
        return ['wf', s.T[m[1]]];
      case 2:
        return ['tt', m[1], m[2], m[3]];
      case 3:
        return ['wt', s.T[m[1]], m[2]];
      default:
        return ['ft', m[1], m[2]];
    }
  }

  function reachable(s) {
    const n = s.T.length;
    const out = [];
    if (draw1) {
      for (let j = 0; j < n; j++) out.push(j);
      return out;
    }
    const add = (j) => {
      if (j >= 0 && !out.includes(j)) out.push(j);
    };
    if (s.wp > 0) add(s.wp - 1);
    let p = s.wp;
    while (p < n) {
      p = Math.min(p + draw, n);
      add(p - 1);
    }
    p = 0; // after a redeal the 3-card windows restart from the first card
    while (p < n) {
      p = Math.min(p + draw, n);
      add(p - 1);
    }
    return out;
  }

  function key(s) {
    const cols = [];
    for (let i = 0; i < 7; i++) {
      let k = String.fromCharCode(65 + s.down[i]);
      const t = s.tab[i];
      for (let j = 0; j < t.length; j++) k += String.fromCharCode(48 + t[j]);
      cols.push(k);
    }
    cols.sort();
    let tk = '';
    for (let j = 0; j < s.T.length; j++) tk += String.fromCharCode(48 + s.T[j]);
    return cols.join('|') + '#' + s.found.join('') + '#' + tk + (draw1 ? '' : '@' + s.wp);
  }

  function won(s) {
    if (s.found[0] + s.found[1] + s.found[2] + s.found[3] === 52) return true;
    // all tableau cards face up: the rest always plays out (draw-1 reaches every talon card)
    for (let i = 0; i < 7; i++) if (s.down[i] > 0) return false;
    return draw1 || s.T.length <= 1;
  }

  function moves(s) {
    const out = [];
    const reach = reachable(s);
    // 1. tableau -> foundation
    for (let i = 0; i < 7; i++) {
      const t = s.tab[i];
      if (t.length && canFound(s.found, t[t.length - 1])) out.push([0, i]);
    }
    // 2. talon -> foundation
    for (const j of reach) if (canFound(s.found, s.T[j])) out.push([1, j]);
    // 3. whole face-up run -> other column, revealing a face-down card
    for (let i = 0; i < 7; i++) {
      if (s.down[i] === 0 || s.tab[i].length <= s.down[i]) continue;
      const base = s.tab[i][s.down[i]];
      let usedEmpty = false;
      for (let j = 0; j < 7; j++) {
        if (j === i || !fits(s, base, j)) continue;
        if (s.tab[j].length === 0) {
          if (usedEmpty) continue;
          usedEmpty = true;
        }
        out.push([2, i, s.down[i], j]);
      }
    }
    // 4. talon -> tableau
    for (const jj of reach) {
      const c = s.T[jj];
      let usedEmpty = false;
      for (let j = 0; j < 7; j++) {
        if (!fits(s, c, j)) continue;
        if (s.tab[j].length === 0) {
          if (usedEmpty) continue;
          usedEmpty = true;
        }
        out.push([3, jj, j]);
      }
    }
    // 5. run that empties a column (non-king base) onto another column
    for (let i = 0; i < 7; i++) {
      if (s.down[i] !== 0 || !s.tab[i].length) continue;
      const base = s.tab[i][0];
      if (rankOf(base) === 13) continue;
      for (let j = 0; j < 7; j++) if (j !== i && s.tab[j].length && fits(s, base, j)) out.push([2, i, 0, j]);
    }
    // 6. partial run move that exposes a card playable to the foundation
    for (let i = 0; i < 7; i++) {
      const t = s.tab[i];
      for (let idx = s.down[i] + 1; idx < t.length; idx++) {
        if (!canFound(s.found, t[idx - 1])) continue;
        for (let j = 0; j < 7; j++) if (j !== i && s.tab[j].length && fits(s, t[idx], j)) out.push([2, i, idx, j]);
      }
    }
    // 7. foundation -> tableau (rarely needed; lets a card hold a lower card of the other colour)
    for (let su = 0; su < 4; su++) {
      const r = s.found[su];
      if (r < 3) continue;
      const c = su * 13 + (r - 1);
      for (let j = 0; j < 7; j++) if (s.tab[j].length && fits(s, c, j)) out.push([4, su, j]);
    }
    return out;
  }

  function apply(s, m) {
    const n = clone(s);
    switch (m[0]) {
      case 0: {
        const c = n.tab[m[1]].pop();
        n.found[suitOf(c)] += 1;
        flip(n, m[1]);
        break;
      }
      case 1: {
        const c = n.T[m[1]];
        n.T.splice(m[1], 1);
        n.wp = m[1];
        n.found[suitOf(c)] += 1;
        break;
      }
      case 2: {
        const run = n.tab[m[1]].splice(m[2]);
        for (const c of run) n.tab[m[3]].push(c);
        flip(n, m[1]);
        break;
      }
      case 3: {
        const c = n.T[m[1]];
        n.T.splice(m[1], 1);
        n.wp = m[1];
        n.tab[m[2]].push(c);
        break;
      }
      case 4: {
        const su = m[1];
        n.found[su] -= 1;
        n.tab[m[2]].push(su * 13 + n.found[su]);
        break;
      }
    }
    return n;
  }

  function dfs(s) {
    if (aborted) return false;
    if (++nodes > limit) {
      aborted = true;
      return false;
    }
    const auto = autoPlay(s);
    if (won(s)) return trace ? auto : true;
    const k = key(s);
    if (seen.has(k)) return false;
    seen.add(k);
    const ms = moves(s);
    for (let i = 0; i < ms.length; i++) {
      const sub = dfs(apply(s, ms[i]));
      if (sub) return trace ? [...auto, describe(s, ms[i]), ...sub] : true;
      if (aborted) return false;
    }
    return false;
  }

  const start = { tab: tab.map((t) => t.slice()), down: down.slice(), found: [0, 0, 0, 0], T: talon.slice(), wp: 0 };
  const res = dfs(start);
  const solved = !!res;
  return { solved, nodes, exhausted: !solved && !aborted, path: trace && solved ? res : null };
}

/** Standard Klondike deal from a 52-card order: tableau row by row, the rest is the stock. */
export function dealFromOrder(order) {
  const tab = [[], [], [], [], [], [], []];
  let k = 0;
  for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) tab[col].push(order[k++]);
  const stock = order.slice(k); // last element = top of stock (drawn first)
  return { tab, down: [0, 1, 2, 3, 4, 5, 6], stock };
}

/** Is this 52-card order winnable (proved within the node budget)? */
export function isWinnable(order, draw = 1, limit = 25000, trace = false) {
  const d = dealFromOrder(order);
  const talon = d.stock.slice().reverse();
  return solve(d.tab, d.down, talon, draw, limit, trace);
}
