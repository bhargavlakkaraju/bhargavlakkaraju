// Evergreen strategy guides. Each one targets a high-volume search query and links
// straight into the matching game (search traffic → players).
// Section shape: { h: heading, p: [paragraphs], ol: [...], ul: [...] }
export const GUIDES = [
  {
    slug: 'how-to-win-2048',
    game: 'merge-2048',
    title: 'How to Win at 2048: The Corner Strategy That Actually Works',
    description: 'A simple, reliable 2048 strategy: pick a corner, keep your biggest tile there, and build a snake of descending tiles. With examples and common mistakes.',
    published: '2026-09-24',
    intro:
      '2048 looks like a game of luck, but strong players reach the 2048 tile almost every time using one idea: keep the largest tile locked in a corner and build everything around it. Here is the method, step by step.',
    sections: [
      {
        h: '1. Choose a corner and never leave it',
        p: [
          'Pick one corner, for example bottom-left. Your biggest tile should live there for the whole game. Most of your moves will be Down and Left, which push tiles toward that corner.',
          'Use Right only when Down and Left are impossible, and avoid Up unless you have no other choice. Moving Up pulls your biggest tile out of the corner, and a small 2 or 4 can spawn underneath it.',
        ],
      },
      {
        h: '2. Keep the bottom row full',
        p: [
          'If your corner is on the bottom row, keep that row completely filled. A full row cannot shift sideways, so a Left or Right move will not accidentally drag your big tile out of position.',
        ],
      },
      {
        h: '3. Build a descending snake',
        p: ['Arrange tiles in decreasing order along the bottom row, then continue up and back along the next row, like a snake:'],
        ol: ['Bottom row: 1024, 512, 256, 128', 'Second row (right to left): 64, 32, 16, 8', 'New tiles merge along the snake and roll into the corner in a chain reaction.'],
      },
      {
        h: '4. Merge small tiles early',
        p: [
          'Loose 2s and 4s scattered across the board are what end games. Clean them up as soon as possible, ideally near the top of the board where they cannot block your snake.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Swiping fast in random directions: it works until about 256, then the board locks up.',
          'Chasing a merge that pulls the big tile out of the corner.',
          'Letting two large tiles of different sizes end up far apart, so they can never meet.',
        ],
      },
    ],
    outro: 'Try it now: play 2048 below, keep your biggest tile in one corner, and see how far the snake takes you.',
  },
  {
    slug: 'sudoku-techniques-for-beginners',
    game: 'sudoku',
    title: 'Sudoku for Beginners: 6 Techniques That Solve Most Puzzles',
    description: 'Learn the six Sudoku solving techniques that crack almost every easy and medium puzzle: scanning, singles, pencil marks, pairs and pointing.',
    published: '2026-09-24',
    intro:
      'Every valid Sudoku has exactly one solution, and you never need to guess. Easy and medium puzzles can be solved with a handful of logical techniques. Learn these six in order and you will finish far more grids.',
    sections: [
      {
        h: 'The rule',
        p: ['Fill the 9×9 grid so every row, every column and every 3×3 box contains the digits 1 to 9 exactly once.'],
      },
      {
        h: '1. Cross-hatching (scanning)',
        p: [
          'Pick a digit, say 5. Look at a 3×3 box that does not have a 5 yet. Every row and column that already contains a 5 elsewhere rules out cells in this box. Often only one cell is left: that is your 5.',
        ],
      },
      {
        h: '2. Naked singles',
        p: ['Look at a single empty cell and list which digits are still possible given its row, column and box. If only one digit remains, place it.'],
      },
      {
        h: '3. Hidden singles',
        p: ['Within one row, column or box, if a digit can only go in one cell, it goes there, even if that cell has other candidates too.'],
      },
      {
        h: '4. Pencil marks (notes)',
        p: ['On medium and hard puzzles, write the small candidate digits in each cell. Notes mode in our Sudoku does exactly this, and removes nothing automatically, so you stay in control.'],
      },
      {
        h: '5. Naked pairs',
        p: [
          'If two cells in the same row, column or box both contain only the same two candidates, for example {3, 7}, then 3 and 7 must go in those two cells. Remove 3 and 7 from every other cell in that unit.',
        ],
      },
      {
        h: '6. Pointing pairs',
        p: [
          'If inside a box a candidate only appears in one row (or one column), then that digit must be in that row within the box. You can remove it from the rest of that row outside the box.',
        ],
      },
    ],
    outro: 'Practice on Easy until scanning feels automatic, then move to Medium. The Daily Sudoku is the same puzzle for everyone, so you can compare times with friends.',
  },
  {
    slug: 'klondike-solitaire-rules-and-tips',
    game: 'solitaire',
    title: 'How to Play Klondike Solitaire: Rules and 8 Tips to Win More',
    description: 'Klondike Solitaire rules explained simply, plus eight practical tips to win more games: which cards to move first, when to use the stock, and more.',
    published: '2026-09-24',
    intro:
      'Klondike is the classic Solitaire that shipped with every Windows PC. The rules take a minute to learn, but a few habits separate a 10% win rate from a much higher one.',
    sections: [
      {
        h: 'Setup and goal',
        p: [
          'Seven tableau columns are dealt with 1 to 7 cards, only the top card face up. The rest of the deck is the stock. The goal is to build all four foundations from Ace to King, one per suit.',
        ],
      },
      {
        h: 'Rules',
        ul: [
          'In the tableau, build down in alternating colors (a red 6 on a black 7).',
          'You can move a correctly ordered stack as a group.',
          'Only a King (or a stack starting with a King) can fill an empty column.',
          'Draw from the stock one card at a time (Draw 1) or three at a time (Draw 3, harder).',
        ],
      },
      {
        h: '8 tips to win more',
        ol: [
          'Always play Aces and Twos to the foundations immediately.',
          'Prefer moves that turn over a face-down card.',
          'Work on the longest face-down columns first: they hide the most cards.',
          'Do not empty a column unless you have a King ready to move into it.',
          'Choose which King to place based on the Queens and Jacks you can follow up with.',
          'Hold back moving cards to the foundation if they are needed as landing spots in the tableau.',
          'Go through the stock early to know what is in it.',
          'Use Undo to explore: it is not cheating to learn which line works.',
        ],
      },
    ],
    outro: 'Deal a new game below. The Daily deal is identical for every player, so you can race your friends on the same cards.',
  },
  {
    slug: 'best-starting-words-word-games',
    game: 'wordy',
    title: 'Best Starting Words for 5-Letter Word Guessing Games',
    description: 'The best opening words for 5-letter word puzzles, why they work, and a simple second-guess strategy to solve in 3 or 4 tries.',
    published: '2026-09-24',
    intro:
      'Your first guess should gather as much information as possible. That means common letters, in common positions, with no repeats.',
    sections: [
      {
        h: 'Why letter frequency matters',
        p: [
          'In five-letter English words the most common letters are roughly E, A, R, O, T, L, I, S and N. A starter that covers five of these rules in or out a large share of possible answers at once.',
        ],
      },
      {
        h: 'Strong opening words',
        ul: ['CRANE and SLATE: high-frequency consonants plus two vowels.', 'TRACE and CRATE: strong letters in common positions.', 'ADIEU and AUDIO: find the vowels fast, weaker on consonants.', 'STARE and ROAST: good all-rounders.'],
      },
      {
        h: 'A simple second guess',
        p: [
          'If your first guess found little, play a second word with five completely new common letters (for example CRANE then SPLIT or TOILS). Two complementary guesses cover ten letters and usually reveal three or more letters of the answer.',
        ],
      },
      {
        h: 'Watch for double letters',
        p: ['Answers like ABBEY or SPOON repeat letters. If you are stuck with few letters found, consider that one letter appears twice.'],
      },
    ],
    outro: "Try today's Wordy below. Everyone gets the same word, so share your emoji grid when you're done.",
  },
  {
    slug: 'stack-tower-tips',
    game: 'stack-tower',
    title: 'Stack Tower Tips: How to Land Perfect Drops and Beat 50 Floors',
    description: 'Practical tips to get more perfect drops in Stack Tower, keep your block wide, and push past 50 floors.',
    published: '2026-09-24',
    intro: 'Stack Tower is about rhythm. Every perfect drop keeps your block wide, and three in a row grows it back. These tips help you land more of them.',
    sections: [
      {
        h: 'Watch the edge, not the block',
        p: ['Focus on the left or right edge of the tower below and tap when the moving block edge lines up with it. Edges are easier to judge than centers.'],
      },
      {
        h: 'Tap on the rhythm',
        p: ['Blocks move at a steady speed within each floor. Count the beat of one full sweep, then tap on the same beat. Speed rises slowly, so adjust a little each floor.'],
      },
      {
        h: 'Bank perfects early',
        p: ['The first 15 floors are slow. Go for perfect drops here to build a wide, safe tower before the speed picks up.'],
      },
      {
        h: 'When you slip, stay calm',
        p: ['A narrow block is still playable. Slow down your focus, aim for the center, and rebuild with a streak of perfects.'],
      },
    ],
    outro: 'Put it into practice now and try to beat 50 floors.',
  },
];

export const getGuide = (slug) => GUIDES.find((g) => g.slug === slug) || null;
export const guidesFor = (game) => GUIDES.filter((g) => g.game === game);
