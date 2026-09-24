export default {
  slug: 'merge-2048',
  title: '2048',
  tagline: 'Slide. Merge. Reach 2048.',
  description: 'Play 2048 online for free. Swipe or use arrow keys to slide and merge number tiles, reach the 2048 tile, then keep going for a record. No download.',
  category: 'puzzle',
  tags: ['2048', 'number puzzle', 'merge', 'sliding tiles', 'math', 'brain game'],
  emoji: '🔢',
  colors: ['#ffb700', '#ff4155'],
  bg: '#160f38',
  width: 460,
  height: 720,
  startMode: 'immediate',
  revive: true,
  daily: true,
  lowerIsBetter: false,
  medals: [2500, 8000, 20000],
  maxScore: 4000000,
  scoreLabel: 'Score',
  controls: {
    touch: 'Swipe up, down, left or right to slide every tile',
    mouse: 'Click and drag in a direction to slide the tiles',
    keyboard: 'Arrow keys or WASD',
  },
  howTo: [
    'Swipe in any direction and every tile slides as far as it can.',
    'Two tiles with the same number merge into one worth their sum.',
    'A new 2 or 4 appears after every move, so keep space open.',
    'Build up to the 2048 tile, then keep merging for 4096 and beyond. The game ends when no move is possible.',
  ],
  tips: [
    'Pick a corner for your biggest tile and keep it there. Most strong players never swipe away from that corner.',
    'Keep your top row (or column) full and in order so big merges can chain together.',
    'There is no undo here, so pause before every swipe and check which tile will spawn into the gap you leave.',
  ],
  faq: [
    {
      q: 'Can I play 2048 online for free?',
      a: 'Yes. This 2048 game is completely free and runs in your browser on phone, tablet and desktop. There is nothing to install and your best score is saved on your device.',
    },
    {
      q: 'What happens after I reach the 2048 tile?',
      a: 'You get a celebration and your run keeps going. Try for 4096, 8192 and a higher score. The game only ends when the board is full and no tiles can merge.',
    },
    {
      q: 'Is there an undo button?',
      a: 'No, every move is final, which keeps scores fair on the leaderboard. After a game over you can rewind your last three moves once with the continue option.',
    },
    {
      q: 'What is the best strategy for 2048?',
      a: 'Keep your highest tile in one corner, build a descending chain of values along one edge, and avoid the one direction that would pull the big tile out of its corner.',
    },
  ],
  about:
    '2048 is the famous sliding number puzzle that turned simple addition into one of the most addictive brain games on the web. Every swipe moves all the tiles on a 4x4 grid; when two tiles with the same number touch, they merge into one tile worth double. A new 2 or 4 appears after each move, so the board slowly fills while you chase bigger and bigger numbers. Reaching the 2048 tile is the classic goal, but here your run keeps going so you can hunt for 4096 and a personal record. This free online version features smooth animations, satisfying merge effects, a daily challenge with the same starting tiles for everyone, and honest scoring with no undo.',
  released: '2026-09-24',
};
