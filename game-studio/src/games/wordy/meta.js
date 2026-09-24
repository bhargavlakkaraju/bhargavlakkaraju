export default {
  slug: 'wordy',
  title: 'Wordy',
  tagline: 'Five letters. Six tries. One word.',
  description: 'Play Wordy, a free online word guessing game: find the hidden 5-letter word in 6 tries. New daily word puzzle plus unlimited words in your browser.',
  category: 'word',
  tags: ['word', 'daily', 'five-letter', 'vocabulary', 'brain', 'puzzle'],
  emoji: '🟩',
  colors: ['#35b25b', '#e2b12f'],
  bg: '#15122a',
  width: 420,
  height: 740,
  startMode: 'immediate',
  revive: true,
  daily: true,
  lowerIsBetter: true,
  formatScore: (v) => (v >= 1 && v <= 7 ? `${v}/6` : 'X'),
  medals: [5, 4, 3],
  maxScore: 7,
  scoreLabel: 'Guesses',
  controls: {
    touch: 'Tap the on-screen keyboard to type, ENTER to guess',
    mouse: 'Click the keys on the on-screen keyboard',
    keyboard: 'Type letters, Enter to guess, Backspace to delete',
  },
  howTo: [
    'Type any real 5-letter word and press Enter to make a guess.',
    'Green means the letter is in the word and in the right spot.',
    'Yellow means the letter is in the word but in a different spot. Gray means it is not in the word.',
    'Use the clues to find the hidden word within 6 guesses.',
    'Play the Daily puzzle with everyone, or Classic for unlimited words.',
  ],
  tips: [
    'Open with a word full of common letters, like SLATE, CRANE or AROSE, to find the vowels fast.',
    'Letters can repeat. If the clues run dry, try a word with a double letter such as APPLE or BOOST.',
    'When many words still fit, spend a guess on five fresh letters instead of reusing gray ones.',
  ],
  faq: [
    {
      q: 'Is Wordy free to play online?',
      a: 'Yes. Wordy is a free word guessing game that runs in any browser on phone, tablet or computer, with no download and no sign-up.',
    },
    {
      q: 'Is there a new Wordy word every day?',
      a: 'Yes. The Daily Wordy gives every player the same 5-letter word, changing at midnight UTC, so you can compare results and share your spoiler-free emoji grid with friends.',
    },
    {
      q: 'Is Wordy a good Wordle unlimited alternative?',
      a: 'Wordy plays like the classic five-letter guessing game made famous by Wordle, and adds a Classic mode with unlimited words, so you can keep playing long after the daily puzzle is solved.',
    },
    {
      q: 'How are repeated letters colored?',
      a: 'Exactly like the answer. If you guess a letter twice but it appears once, only one copy turns green or yellow and the extra copy turns gray.',
    },
  ],
  about:
    'Wordy is a fast, friendly word guessing game for anyone who loves a daily brain teaser. You get six tries to find a hidden five-letter word, and every guess colors your letters green, yellow or gray to show how close you are. Repeated letters are scored precisely, so every clue is fair. Play the Daily puzzle, where everyone solves the same word and shares spoiler-free emoji grids, or switch to Classic for unlimited words whenever you want another round. Your streaks and guess distribution are saved on your device, and the game loads instantly in your browser with nothing to install. It is the perfect coffee-break puzzle for building vocabulary, sharpening logic and keeping a winning streak alive.',
  released: '2026-09-24',
};
