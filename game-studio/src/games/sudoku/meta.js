const formatScore = (v) => {
  const s = Math.max(0, Math.round(v));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export default {
  slug: 'sudoku',
  title: 'Sudoku',
  tagline: 'Fill the grid. One true solution.',
  description: 'Play Sudoku online free. Fresh puzzles with one unique solution in Easy, Medium and Hard, with notes, hints and a daily challenge. No download needed.',
  category: 'puzzle',
  tags: ['sudoku', 'logic', 'number puzzle', 'brain training', 'daily puzzle', 'classic'],
  emoji: '🧩',
  colors: ['#2c63ff', '#ffd23f'],
  bg: '#121a42',
  width: 480,
  height: 760,
  startMode: 'immediate',
  revive: true,
  daily: true,
  lowerIsBetter: true,
  formatScore,
  medals: [900, 600, 360],
  maxScore: 86400,
  minScore: 30,
  scoreLabel: 'Time',
  controls: {
    touch: 'Tap a cell, then tap a number. Use the Notes, Erase and Hint buttons',
    mouse: 'Click a cell, then click a number on the pad',
    keyboard: '1-9 to fill, arrows to move, N for notes, H for a hint, Backspace to erase',
  },
  howTo: [
    'Fill every empty cell with a digit from 1 to 9.',
    'Each row, each column and each 3x3 box must contain every digit exactly once.',
    'Tap a cell, then a number. Turn on Notes to pencil in candidates.',
    'Wrong digits turn red and count as mistakes. Three mistakes and the puzzle is over.',
    'Solve the grid as fast as you can: your score is your time.',
  ],
  tips: [
    'Start with the digit that already appears most often and look for the one spot in each box where it still fits.',
    'Pencil in candidates on harder puzzles. When a cell is down to a single note, that is your answer.',
    'Save your three hints for the moment you are truly stuck. The hint picks the cell with the fewest possibilities.',
  ],
  faq: [
    {
      q: 'Is this Sudoku free to play online?',
      a: 'Yes. You can play unlimited Sudoku puzzles online for free in your browser on phone, tablet or computer, with no download and no account.',
    },
    {
      q: 'Does every puzzle have exactly one solution?',
      a: 'Yes. Every grid is generated fresh and checked by a solver that counts solutions, so each puzzle has one unique answer that can be reached by logic alone, without guessing.',
    },
    {
      q: 'What is the difference between Easy, Medium and Hard?',
      a: 'Easy puzzles give around 37 starting numbers and only need simple singles. Medium removes more clues. Hard starts with about 26 clues and always needs techniques such as pointing pairs, naked pairs or X-wings.',
    },
    {
      q: 'What is the Daily Sudoku?',
      a: 'Every day there is one Medium puzzle that is the same for everyone. Solve it as fast as you can and compare your time on the daily leaderboard.',
    },
  ],
  about:
    'Sudoku is the classic number placement puzzle loved by millions: fill a 9x9 grid so that every row, column and 3x3 box contains the digits 1 to 9 exactly once. This free online Sudoku creates a brand new puzzle every time you play, and every puzzle is verified to have a single unique solution that you can reach with pure logic. Pick Easy for a relaxing warm-up, Medium for a proper workout, or Hard when you want to use advanced techniques. Helpful highlights show the row, column, box and matching digits, notes mode lets you pencil in candidates, and three hints are there when you get stuck. Beat your best time, or take on the Daily Sudoku that everyone plays together.',
  released: '2026-09-24',
};
