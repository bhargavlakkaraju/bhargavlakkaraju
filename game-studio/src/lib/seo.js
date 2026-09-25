// Structured data helpers and the category copy used for search and AI answer engines.
import { SITE, CATEGORIES } from './site';

export const ld = (data) => ({ __html: JSON.stringify(data) });

export function itemListLd(name, games, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: `${SITE.url}${path}`,
    numberOfItems: games.length,
    itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/games/${g.slug}`, name: g.title })),
  };
}

export function faqLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE.url}${path}` })),
  };
}

// Questions people actually ask about sites like ours, answered in one or two sentences
// so search snippets and AI assistants can quote them directly.
export const HOME_FAQ = [
  [`Is ${SITE.name} free?`, `Yes. Every game on ${SITE.name} is free to play in your browser, with no download, no sign-up and no in-game purchases needed to play.`],
  [
    'Do the games work on phones?',
    'Yes. All games are built mobile-first and work on iPhone, Android, iPad, Chromebook, Mac and Windows in any modern browser. You can also add the site to your home screen like an app.',
  ],
  [
    'What is the Daily Challenge?',
    'Every game gets a new seeded level each day that is identical for every player worldwide. Post your score before midnight UTC to climb the Daily leaderboard and keep your streak alive.',
  ],
  [
    'Can I challenge a friend?',
    'Yes. After any run, share your score as a challenge link. Your friend opens the same game with your score shown as the target to beat, no account needed.',
  ],
  [
    'Do I need an account to save progress?',
    'No. Your best scores, medals, XP level and streak are saved in your browser automatically. Pick a nickname only if you want to appear on the leaderboards.',
  ],
  [
    `What kinds of games are on ${SITE.name}?`,
    'One-tap arcade games like Stack Tower, Sky Flap and Blade Spin, puzzle games like Block Crush, Juicy Drop, 2048 and Sudoku, classics like Solitaire and Snake, and Wordy, a daily five-letter word game.',
  ],
];

export const CATEGORY_COPY = {
  arcade: {
    intro:
      'Free arcade games you control with one tap: stack blocks, flap through gaps, throw knives, hop across roads and dodge your way to a high score. Runs last under a minute and restart instantly, so every game is built for "just one more try".',
    more: [
      'Each arcade game has three medals to chase, a Daily Challenge with a level that is the same for every player that day, and global leaderboards for today and all time. Beat a score, then send it to a friend as a challenge link.',
      'They run in your browser on phones, tablets and computers. Tap on touch screens, click with a mouse, or use the space bar and arrow keys on a keyboard.',
    ],
    faq: [
      ['What are the easiest arcade games to start with?', 'Stack Tower and Zig Zag use a single tap with simple timing, so they are the quickest to learn. Sky Flap and Blade Spin are harder and reward practice.'],
      ['Are these arcade games free?', 'Yes. Every arcade game is free to play in the browser with no download or sign-up.'],
    ],
  },
  puzzle: {
    intro:
      'Free puzzle games to relax or sharpen your brain: clear lines in Block Crush, merge fruit into giants in Juicy Drop, slide tiles to 2048 and solve Sudoku grids from easy to hard. Block Crush, Juicy Drop and 2048 have no clock, so you can play for five minutes or an hour.',
    more: [
      'Your progress and best scores are saved in your browser automatically. Each puzzle has a Daily Challenge with the same starting position for everyone, so you can compare results with friends.',
      'Every puzzle works with touch, mouse and keyboard, and is sized to fit a phone screen without zooming.',
    ],
    faq: [
      ['Which puzzle game is the most relaxing?', 'Juicy Drop and Block Crush have no timer, so you can take each move at your own pace. Sudoku lets you choose Easy, Medium or Hard.'],
      ['Is Sudoku timed?', 'Yes. Your Sudoku score is your solve time, and three mistakes end the puzzle. Pencil-mark notes and hints help on Medium and Hard.'],
    ],
  },
  classic: {
    intro:
      'Classic games rebuilt to feel great on any screen: Klondike Solitaire with smooth drag and tap controls, and Neon Snake, the arcade classic with a glowing new look. Free and instant, with nothing to install.',
    more: [
      'Every Solitaire deal is checked by a solver so it can be won, and both games have a Daily Challenge where everyone gets the same deal or board. Your stats are saved in your browser.',
    ],
    faq: [
      ['Is the Solitaire here Klondike?', 'Yes. It is classic Klondike Solitaire with Draw 1 or Draw 3, tap-to-move, drag and drop, unlimited undo and hints, and every deal can be won.'],
      ['How do I control Snake on a phone?', 'Swipe in the direction you want to turn, even slightly ahead of time. On a computer, use the arrow keys or WASD.'],
    ],
  },
  word: {
    intro:
      'Wordy is a free daily word puzzle: guess the five-letter word in six tries, with colored hints after every guess. Play the Daily word everyone gets, or keep going with unlimited classic words.',
    more: ['Share your result grid without spoilers, keep a streak going, and compare your guesses with friends on the Daily leaderboard.'],
    faq: [
      ['Is Wordy like Wordle?', 'Wordy uses the same familiar rules: six tries to find a five-letter word, with green for the right letter in the right spot and yellow for a right letter in the wrong spot. It also has an unlimited mode.'],
      ['When does the daily word change?', 'The Daily word changes at midnight UTC, the same moment for every player.'],
    ],
  },
};

export const categoryName = (cat) => CATEGORIES[cat]?.name || cat;
