export default {
  slug: 'solitaire',
  title: 'Solitaire',
  tagline: 'The classic card game, dealt to win.',
  description: 'Play Klondike Solitaire online free in your browser. Classic draw 1 or draw 3 card game with winnable deals, unlimited undo, hints and a daily deal.',
  category: 'classic',
  tags: ['cards', 'klondike', 'patience', 'relaxing', 'classic'],
  emoji: '🃏',
  colors: ['#1f8a4c', '#ffd23f'],
  bg: '#0f5a33',
  width: 480,
  height: 760,
  startMode: 'immediate',
  revive: false,
  daily: true,
  lowerIsBetter: true,
  formatScore: (v) => {
    const s = Math.max(0, Math.round(v));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  },
  medals: [600, 300, 180],
  maxScore: 86400,
  scoreLabel: 'Time',
  controls: {
    touch: 'Tap a card to auto-move it, drag cards and stacks, tap the deck to draw',
    mouse: 'Click a card to auto-move it or drag and drop it; click the deck to draw',
    keyboard: 'Space draws, Z undoes, H shows a hint, A auto-completes, N deals a new game',
  },
  howTo: [
    'Build four foundation piles, one per suit, from Ace up to King.',
    'In the seven tableau columns, stack cards downward in alternating colors: red on black, black on red.',
    'Only a King, or a stack that starts with a King, can fill an empty column.',
    'Tap the deck to draw one card (three in Draw 3). When it runs out, tap it again to reuse the waste pile.',
    'Tap any card to send it to its best spot, or drag it yourself. Undo is unlimited.',
  ],
  tips: [
    'Uncover face-down cards first: a move that flips a hidden card is almost always the right one.',
    'Do not rush every card to the foundations. A low red card may be the only place to park the black card you need next.',
    'Save empty columns for a King that frees a long stack, and tap Hint whenever you feel stuck.',
  ],
  faq: [
    {
      q: 'Is this Solitaire free to play online?',
      a: 'Yes. This Klondike Solitaire is completely free and runs in your browser on phone, tablet or computer. There is nothing to download and no account to create.',
    },
    {
      q: 'Can every Solitaire game be won?',
      a: 'Every deal is checked by a solver before it reaches you, so each game has at least one winning line. If you get stuck, use Undo or Hint to find a different path.',
    },
    {
      q: 'What is the difference between Draw 1 and Draw 3?',
      a: 'Draw 1 turns over one card from the deck at a time and is the relaxed version. Draw 3 turns over three cards and only the top one can be played, the classic harder rule set. Switch any time with the Draw button.',
    },
    {
      q: 'What is the Daily Solitaire deal?',
      a: 'Every day everyone gets the same Draw 1 deal. Solve it as fast as you can and compare your time with friends and the leaderboard.',
    },
  ],
  about:
    'Solitaire, also known as Klondike or Patience, is the most played card game in the world and a timeless way to relax. Your goal is to move all 52 cards onto four foundation piles, sorted by suit from Ace to King, by building alternating-color columns in the tableau and working through the deck. This version is made for quick sessions on any screen: big readable cards, smooth drag and drop, one-tap auto-moves, unlimited undo, hints and an auto-complete finish, plus the famous bouncing card celebration when you win. Choose relaxed Draw 1 or classic Draw 3, and take on the Daily deal to race the clock against everyone else. Every deal is guaranteed to be winnable.',
  released: '2026-09-24',
};
