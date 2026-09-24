export default {
  slug: 'block-crush',
  title: 'Block Crush',
  tagline: 'Drop. Clear. Combo. Repeat.',
  description: 'Play Block Crush, a free block puzzle game online. Drag jewel blocks onto the 8x8 grid, clear rows and columns, and chain huge combos. No download.',
  category: 'puzzle',
  tags: ['block puzzle', 'drag and drop', 'combo', 'grid', 'relaxing', 'brain game'],
  emoji: '💎',
  colors: ['#a45cff', '#ffd23f'],
  bg: '#150d38',
  width: 480,
  height: 760,
  startMode: 'immediate',
  revive: true,
  daily: true,
  lowerIsBetter: false,
  medals: [500, 2000, 6000],
  maxScore: 5000000,
  scoreLabel: 'Points',
  controls: {
    touch: 'Drag a piece from the tray and drop it on the board',
    mouse: 'Click and drag a piece onto the grid',
    keyboard: '1-3 or Q/E to pick a piece, arrows to move, Enter to place',
  },
  howTo: [
    'Drag one of the three pieces from the tray onto the 8x8 board.',
    'Fill a complete row or column to clear it and score points.',
    'Clear several lines with one piece, or clear on back-to-back moves, to build a combo multiplier.',
    'Place all three pieces to get a new set. The game ends when none of the remaining pieces fit.',
  ],
  tips: [
    'Keep the center of the board open: the 3x3 square and the five-long lines need room to land.',
    'Think about all three pieces before placing the first one. Grayed-out pieces do not fit anywhere right now.',
    'A combo survives for three placements, so set up your next clear before the meter runs dry.',
  ],
  faq: [
    {
      q: 'Is Block Crush free to play online?',
      a: 'Yes. Block Crush is a free block puzzle game that runs in any modern browser on phone, tablet or computer. There is nothing to download or install and no sign-up.',
    },
    {
      q: 'How do combos work in this block puzzle?',
      a: 'Every move that clears at least one row or column raises your combo, and each clear is multiplied by it. Clearing two or more lines with a single piece scores far more than clearing them one at a time.',
    },
    {
      q: 'Can I rotate the blocks?',
      a: 'No. As in classic grid block puzzles, every piece is placed exactly as it is dealt. Planning where the awkward shapes will go is the heart of the game.',
    },
    {
      q: 'What is the Block Crush Daily Challenge?',
      a: 'Once a day every player gets the same sequence of pieces. Play it, post your score to the daily leaderboard and compare with friends.',
    },
  ],
  about:
    'Block Crush is a free online block puzzle in the tradition of the classic 8x8 grid games that millions of people play every day. You are dealt three jewel-like pieces at a time: singles, straight lines, squares, corners, L, T and zigzag shapes. Drag them onto the board, complete full rows or columns to crush them in a burst of sparkles, and keep the grid open for whatever comes next. Clearing several lines at once or on consecutive moves builds a combo multiplier that sends your score soaring. There is no timer, so you can play at your own pace, yet every move counts because the run ends the moment no piece fits. Quick to learn, deeply strategic, and perfect for a short brain break in your browser.',
  released: '2026-09-24',
};
