// "Games like X" collections. Each one targets a real, high-intent search query and sends
// the visitor straight into our own games. Rendered at /best/<slug>.
// Shape: { slug, title (H1), metaTitle, description, answer (quotable 40-60 word answer),
//          picks: [{ game, why }], sections: [{ h, p: [...] }], faq: [{ q, a }], published,
//          ref (optional: the other game's name, used only for the "not affiliated" note) }
// Every fact about a game here must match its src/games/<slug>/meta.js and index.js.
export const COLLECTIONS = [
  {
    slug: 'games-like-wordle',
    ref: 'Wordle',
    title: 'Games Like Wordle: Free Daily Word and Logic Puzzles',
    metaTitle: 'Games Like Wordle: Free Daily Puzzles',
    description:
      'Looking for games like Wordle? Play Wordy, a free 5-letter word puzzle with a daily word and unlimited mode, plus daily Sudoku, 2048 and Solitaire. No download.',
    answer:
      'The closest free game like Wordle on Retry Arcade is Wordy: guess a hidden five-letter word in six tries, with green, yellow and gray clues, one shared daily word and an unlimited Classic mode. If you enjoy the daily ritual, Sudoku, 2048 and Solitaire also have a daily puzzle that is identical for every player.',
    picks: [
      {
        game: 'wordy',
        why: 'Wordy uses the rules Wordle fans already know: five letters, six guesses, and green, yellow or gray tiles after every guess. Solve the Daily word with everyone and share a spoiler-free emoji grid, then switch to Classic for unlimited words when one puzzle a day is not enough.',
      },
      {
        game: 'sudoku',
        why: 'The Daily Sudoku is one Medium puzzle per day, the same for everyone, with your time on a daily leaderboard. Like a fair word puzzle, every grid has exactly one solution that you can reach by logic alone, never by guessing.',
      },
      {
        game: 'merge-2048',
        why: "2048 scratches the same careful, one-move-at-a-time itch with numbers instead of letters. Its Daily Challenge gives everyone the same starting tiles, so you can compare scores with friends the way you compare guess counts.",
      },
      {
        game: 'solitaire',
        why: 'If part of the appeal is a calm solo puzzle with your morning coffee, Klondike Solitaire fits. The Daily deal is the same Draw 1 game for every player, and every deal is checked by a solver so it can be won.',
      },
      {
        game: 'block-crush',
        why: 'Block Crush is a spatial puzzle rather than a word game, but its Daily Challenge deals every player the same sequence of pieces. It rewards the same habit Wordle does: thinking a step ahead before you commit.',
      },
    ],
    sections: [
      {
        h: 'What makes Wordle-style games so satisfying',
        p: [
          'Wordle works because every guess gives you information. Green, yellow and gray turn a vague hunch into a shrinking list of possible words, and solving in three or four tries feels like proof that you reasoned well rather than got lucky.',
          'The other half of the appeal is the shared daily puzzle. Everyone gets the same word, nobody can binge ahead, and a grid of colored squares is a spoiler-free way to compare results with friends.',
        ],
      },
      {
        h: 'How Wordy compares',
        p: [
          'Wordy keeps the familiar rules and color clues, and it scores repeated letters carefully: if you guess a letter twice but the answer contains it once, only one copy lights up and the extra one turns gray. It adds a Classic mode with unlimited words, so a solved daily puzzle does not have to be the end of your session. Streaks and your guess distribution are saved on your device, and there is nothing to install.',
        ],
      },
      {
        h: 'A quick tip for your first guess',
        p: [
          'Open with a word full of common letters, such as SLATE, CRANE or AROSE. If it comes back mostly gray, spend your second guess on five fresh letters instead of reusing gray ones. Two complementary guesses usually reveal enough to solve in four.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a free game like Wordle with unlimited words?',
        a: 'Yes. Wordy on Retry Arcade has a Daily puzzle that is the same for everyone plus a Classic mode with unlimited five-letter words. It is free, runs in any browser and needs no account.',
      },
      {
        q: 'When does the daily Wordy word change?',
        a: 'The Daily Wordy changes at midnight UTC. Everyone who plays on the same day gets the same five-letter word, so results are directly comparable.',
      },
      {
        q: 'Can I share my results without spoiling the word?',
        a: 'Yes. When you finish, you can share an emoji grid that shows the colors of your guesses without revealing any letters.',
      },
      {
        q: 'Are there daily puzzles besides word games?',
        a: 'Yes. Every game on Retry Arcade has a Daily Challenge with the same level for every player, including Sudoku, 2048, Solitaire and Block Crush, and each has its own daily leaderboard.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-like-2048',
    title: 'Games Like 2048: Free Merge and Number Puzzles Online',
    metaTitle: 'Games Like 2048: Free Merge Puzzles',
    description:
      'Love 2048? Play it free, then try Juicy Drop, a fruit-merge physics puzzle, plus Block Crush and Sudoku. Four brain games that run in your browser, no download.',
    answer:
      'If you like 2048, start with our free 2048, then try Juicy Drop, which uses the same merge-two-into-one idea with physics fruit that grow from a cherry to a watermelon. For the planning and space management without merging, Block Crush and Sudoku are the next best fits. All four are free and run in any browser.',
    picks: [
      {
        game: 'merge-2048',
        why: 'Our 2048 is the classic 4x4 sliding puzzle with honest scoring: there is no undo, so every swipe counts. Reaching the 2048 tile does not end the run, so you can keep going for 4096 and beyond.',
      },
      {
        game: 'juicy-drop',
        why: 'Juicy Drop takes the 2048 merge rule and adds gravity: two identical fruits that touch become the next fruit in the chain. The same instinct of keeping your biggest piece in a corner works here too.',
      },
      {
        game: 'block-crush',
        why: 'Block Crush has no merging, but it tests the skill that decides most 2048 runs: keeping open space on a crowded board. You place pieces on an 8x8 grid and clear full rows and columns, with a combo multiplier for clears on back-to-back moves.',
      },
      {
        game: 'sudoku',
        why: 'If you enjoy the number side of 2048, Sudoku is pure logic with digits. Every grid is generated fresh with one unique solution, in Easy, Medium or Hard.',
      },
    ],
    sections: [
      {
        h: 'Why 2048 is hard to put down',
        p: [
          '2048 is simple arithmetic wrapped in a space problem. Every merge doubles a tile, but every move also spawns a new 2 or 4, so the board is always trying to fill up. The best moments come when one swipe sets off a chain of merges that rolls neatly into your corner.',
        ],
      },
      {
        h: 'What carries over between merge puzzles',
        p: [
          'The corner strategy is the big one. In 2048 you keep the largest tile in one corner and build a descending row beside it. In Juicy Drop the same idea works: park the biggest fruit in a bottom corner and grow smaller ones outward like a staircase, so each merge rolls toward the next size up.',
          'The other shared habit is looking one move ahead. In 2048 you think about where a new tile could spawn in the gap you leave. Juicy Drop shows the next fruit in a bubble at the top of the jar, and checking it before every drop prevents most game overs.',
        ],
      },
      {
        h: 'How our 2048 plays',
        p: [
          'Swipe on a phone, drag with a mouse, or use the arrow keys or WASD. There is no undo button, which keeps leaderboard scores fair, but after a game over you can continue once by rewinding your last three moves. The Daily Challenge gives everyone the same starting tiles, so you can compare runs on equal terms.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I play 2048 online for free without downloading?',
        a: 'Yes. 2048 on Retry Arcade runs in your browser on phones, tablets and computers. There is nothing to install and your best score is saved on your device.',
      },
      {
        q: 'What is a game like 2048 but with fruit?',
        a: 'Juicy Drop is a fruit-merge puzzle: drop fruit into a jar, and when two identical fruits touch they merge into the next bigger one, all the way up to a watermelon. It is free and needs no download.',
      },
      {
        q: 'What happens after you reach the 2048 tile?',
        a: 'In our version the run keeps going. You can merge on toward 4096 and 8192, and the game only ends when the board is full and no tiles can merge.',
      },
      {
        q: 'What is the best strategy for 2048-style games?',
        a: 'Keep your biggest tile or fruit in one corner, build a descending chain of smaller values beside it, and avoid moves that pull the big piece out of its corner.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-like-tetris',
    ref: 'Tetris',
    title: 'Games Like Tetris: Free Block Puzzle Games Online',
    metaTitle: 'Games Like Tetris: Free Block Puzzles',
    description:
      'Free Tetris-style block puzzles you can play in your browser: clear lines in Block Crush, stack fruit in Juicy Drop and drop blocks in Stack Tower. No download.',
    answer:
      'The best free game like Tetris on Retry Arcade is Block Crush, where you fit block shapes onto an 8x8 grid and clear full rows and columns for combos. For the tension of a rising pile, try Juicy Drop, and for pure drop timing, Stack Tower. Brick Barrage adds a wall that creeps down every turn.',
    picks: [
      {
        game: 'block-crush',
        why: 'Block Crush keeps the most satisfying part of Tetris, clearing complete lines, and applies it to both rows and columns on an 8x8 board. Pieces do not fall or rotate, so it is about planning where every shape fits rather than reacting at speed.',
      },
      {
        game: 'juicy-drop',
        why: 'Juicy Drop gives you the Tetris feeling of a pile creeping toward the top. You drop fruit into a jar and merge matching pairs to make room, and the run ends if fruit stays above the dashed line for two seconds.',
      },
      {
        game: 'stack-tower',
        why: 'Stack Tower is block dropping stripped down to timing. A block slides across the top, you tap to drop it, and any overhang is sliced off, so precision decides how tall your tower grows.',
      },
      {
        game: 'brick-barrage',
        why: 'Brick Barrage turns the Tetris threat upside down: a wall of numbered bricks steps down one row after every turn. You aim volleys of bouncing balls to break it before a brick reaches the red line.',
      },
    ],
    sections: [
      {
        h: 'What people love about Tetris-style games',
        p: [
          'Block puzzles combine two feelings: the calm of fitting shapes into place and the pressure of a board that keeps filling. Clearing several lines at once is the reward that makes a risky setup worth it, and a near-empty board after a big clear is one of the best feelings in puzzle games.',
        ],
      },
      {
        h: 'Block Crush vs Tetris: the key differences',
        p: [
          'In Block Crush you choose from three pieces at a time instead of taking whatever falls next, and you can place them anywhere on the board in any order. There is no timer and no rotation, so the challenge moves from reflexes to planning. Rows and columns both clear, which makes cross-shaped double clears possible.',
          'Combos reward consistency. Each move that clears a line raises your multiplier, and it stays alive as long as you clear again within your next three placements. Clearing the entire board adds a 300 point bonus.',
        ],
      },
      {
        h: 'Tips that carry over',
        p: [
          'Keep the board open. In Tetris that means avoiding holes; in Block Crush it means keeping the center clear, because the 3x3 square and the five-long lines need room to land. In Juicy Drop it means not letting small fruit get trapped under big ones.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a free Tetris-style game with no download?',
        a: 'Yes. Block Crush on Retry Arcade is a free block puzzle that runs in any modern browser on phone, tablet or computer. You drag pieces onto an 8x8 grid and clear full rows and columns.',
      },
      {
        q: 'Can you rotate pieces in Block Crush?',
        a: 'No. Every piece is placed exactly as it is dealt, as in classic grid block puzzles. Pieces that cannot fit anywhere on the board right now are grayed out in the tray.',
      },
      {
        q: 'Is Block Crush timed?',
        a: 'No. There is no timer, so you can think as long as you like. The run ends only when none of your remaining pieces fit on the board.',
      },
      {
        q: 'Which block game is best for a quick break?',
        a: 'Stack Tower is the quickest: one tap per block, short runs and instant restarts. Block Crush and Juicy Drop suit longer, calmer sessions.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-like-flappy-bird',
    ref: 'Flappy Bird',
    title: 'Games Like Flappy Bird: Free One-Tap Flying Games',
    metaTitle: 'Games Like Flappy Bird: Free Tap Games',
    description:
      'Play free games like Flappy Bird in your browser. Sky Flap is a one-tap flyer through neon pillars, plus Color Rush, Zig Zag and more tap-timing games.',
    answer:
      'The closest free game like Flappy Bird on Retry Arcade is Sky Flap: tap to flap a round bird through gaps in neon pillars, and touching a pillar or the ground ends the run. If you like that tap-against-gravity feel, Color Rush is next, followed by the one-tap timing games Zig Zag, Stack Tower and Blade Spin.',
    picks: [
      {
        game: 'sky-flap',
        why: 'Sky Flap has the rules you expect: each tap is a quick flap upward, gravity pulls you back, and every gap you fly through scores a point. Later on the gaps tighten, the scroll speeds up and some pillars slide up and down.',
      },
      {
        game: 'color-rush',
        why: "Color Rush uses the same tap-to-rise, stop-to-fall physics, but you hop straight up through spinning gates. You can only pass through the part that matches your ball's color, so patience matters as much as rhythm.",
      },
      {
        game: 'zig-zag',
        why: 'Zig Zag keeps the single-tap control and the instant restarts. Each tap switches your rolling ball between two diagonals, and the path crumbles behind you as the ball speeds up.',
      },
      {
        game: 'stack-tower',
        why: 'Stack Tower is another one-tap test of timing: tap to drop a sliding block onto your tower. Misses slice your block narrower, while three perfect drops in a row grow it back.',
      },
      {
        game: 'blade-spin',
        why: 'Blade Spin swaps flying for throwing. Tap to throw a blade into a spinning log without hitting the blades already stuck there, with a tougher boss log every fifth stage.',
      },
    ],
    sections: [
      {
        h: 'Why Flappy Bird-style games are so addictive',
        p: [
          'The formula is one input, instant failure and an instant restart. A run lasts seconds, the mistake is always yours, and the next attempt is one tap away. That loop is exactly why these are called one more try games.',
        ],
      },
      {
        h: 'What Sky Flap does differently',
        p: [
          'Sky Flap starts forgiving: the first gaps are wide, and the collision area is a little smaller than the bird looks, so a feather-close pass still counts. Skimming a pillar sets off a near-miss sparkle, and doing it on consecutive gaps chains a combo, although your score is always the number of gaps.',
          'Difficulty ramps smoothly rather than all at once. Gaps narrow a little with every pillar, the scroll speed rises with your score, and from around the thirteenth pillar some gaps start drifting up and down. The Daily Challenge gives everyone the identical course.',
        ],
      },
      {
        h: 'One tip before you start',
        p: [
          'Use short, steady taps and keep your eyes on the bottom lip of the next gap. Every flap sets the same upward speed rather than adding to it, so tapping twice in a row does not double your lift: it just restarts the same short climb.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a free Flappy Bird-style game I can play in a browser?',
        a: 'Yes. Sky Flap on Retry Arcade is a free one-tap flying game that runs in any modern browser on phones, tablets and computers, with nothing to install.',
      },
      {
        q: 'Does hitting the top of the screen end the run in Sky Flap?',
        a: 'No. The top of the screen simply stops the bird from climbing higher. Only touching a pillar or the ground ends the run.',
      },
      {
        q: 'How is Sky Flap scored?',
        a: 'You get one point for every gap you fly through. Near misses trigger a combo effect but do not change the score, so the number on screen is always gaps passed.',
      },
      {
        q: 'What scores earn medals in Sky Flap?',
        a: 'Bronze at 10 gaps, silver at 30 and gold at 60.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-like-crossy-road',
    ref: 'Crossy Road',
    title: 'Games Like Crossy Road: Free Endless Hopper Games',
    metaTitle: 'Games Like Crossy Road: Free Hopper Games',
    description:
      'Free games like Crossy Road in your browser: hop a chick across roads, rivers and railways in Road Hopper, then climb with Sky Hop and roll with Zig Zag.',
    answer:
      'The closest free game like Crossy Road on Retry Arcade is Road Hopper: tap to hop a chick forward across busy roads, rivers with drifting logs and railway tracks, and collect coins to unlock hats. For more endless one-finger runs, try Sky Hop, a vertical bouncing climber, and Zig Zag, a one-tap rolling path game.',
    picks: [
      {
        game: 'road-hopper',
        why: 'Road Hopper has the lane-by-lane structure fans of the genre expect: cars and trucks at different speeds, logs and lily pads across rivers, and trains that arrive right after a warning light flashes. The camera keeps creeping forward, so waiting too long brings a hawk swooping down.',
      },
      {
        game: 'sky-hop',
        why: 'Sky Hop is an endless hopper turned vertical. Your hopper bounces on its own, you steer left or right to pick the next platform, and crumbling ledges, sliding platforms and springs keep every climb different.',
      },
      {
        game: 'zig-zag',
        why: 'Zig Zag shares the endless, just-one-more-run structure with a single control: tap to switch direction. The path crumbles behind you and the ball gets faster the further you go.',
      },
      {
        game: 'neon-snake',
        why: 'Neon Snake is grid movement at its purest. As in a road-crossing game, you move one cell at a time, and reading the space ahead matters more than raw speed.',
      },
    ],
    sections: [
      {
        h: 'What makes endless hoppers fun',
        p: [
          'Games in this style turn crossing the road into a rhythm puzzle. Each lane has its own speed and direction, so you watch, wait for a gap and commit. Progress is counted in rows, which makes every new best feel concrete.',
        ],
      },
      {
        h: 'How Road Hopper plays',
        p: [
          'Tap to hop forward, swipe left or right to side-step and swipe down to hop back. Your score is the furthest row you reach, so a step backward to dodge a car costs nothing. Rivers appear after the first dozen rows and railways a little later, and traffic gets faster the further you travel.',
          'Coins are saved across runs. At 20, 60 and 150 coins your chick unlocks a cap, a party hat and a crown. The Daily Challenge gives every player the same world to cross.',
        ],
      },
      {
        h: 'Tips for going further',
        p: [
          'Watch a lane for a second before you hop in, hop off logs early rather than riding them toward the edge, and plan a path around trees before the camera catches up. On grass there is always at least one open route forward, but it can wander left or right, so look a couple of rows ahead.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a free Crossy Road-style game with no download?',
        a: 'Yes. Road Hopper on Retry Arcade is a free endless hopper that runs in your browser on phones, tablets and computers. There is no download and no account.',
      },
      {
        q: 'Why does a hawk grab my chick in Road Hopper?',
        a: 'The camera scrolls forward on its own. If you wait too long or hop backward until you fall off the bottom of the screen, a hawk swoops in and ends the run. A red glow warns you first.',
      },
      {
        q: 'How do I unlock hats in Road Hopper?',
        a: 'Collect coins. They are saved across all your runs, and at 20, 60 and 150 coins your chick unlocks a cap, a party hat and a crown.',
      },
      {
        q: 'How do I play Road Hopper on a computer?',
        a: 'Press the up arrow, W or Space to hop forward, the left and right arrows or A and D to side-step, and the down arrow or S to hop back.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-like-snake',
    title: 'Games Like Snake: Free Retro Arcade Games Online',
    metaTitle: 'Games Like Snake: Free Retro Arcade Games',
    description:
      'Play Neon Snake, a free take on classic Snake with smooth movement, combos and golden orbs, plus more retro-style arcade games in your browser. No download.',
    answer:
      'For a free game like the classic Snake, play Neon Snake on Retry Arcade: steer a glowing snake around a grid, eat orbs to grow, and avoid walls, neon blocks and your own tail. If you want more of that retro arcade feel, Zig Zag, Road Hopper and Brick Barrage are the closest picks.',
    picks: [
      {
        game: 'neon-snake',
        why: 'Neon Snake keeps the original rules, where you grow by eating and crash if you hit a wall or yourself. It adds modern touches: smooth movement, buffered turns for tight U-turns, combo bonuses for quick bites and golden orbs worth 5 points.',
      },
      {
        game: 'zig-zag',
        why: 'Zig Zag has the same steer-or-crash tension with an even simpler control. One tap switches your ball between two diagonals, and a mistimed turn sends it off the edge.',
      },
      {
        game: 'road-hopper',
        why: 'Road Hopper comes from the same arcade family as the classic road-crossing games: one-cell moves, traffic in every lane and a simple score, the furthest row you reach.',
      },
      {
        game: 'brick-barrage',
        why: 'Brick Barrage is a turn-based cousin of the brick-breaking arcade classics. Aim once, release a volley of balls and watch them ricochet through a wall of numbered bricks.',
      },
    ],
    sections: [
      {
        h: 'Why Snake still works',
        p: [
          'Snake is a perfect arcade loop: the better you do, the harder it gets, because every orb makes you longer and the free space smaller. A good run is a quiet puzzle of keeping escape routes open while you chase the next bite.',
        ],
      },
      {
        h: 'What Neon Snake adds to the classic',
        p: [
          'Every 8 orbs you reach a new level: the snake speeds up, the colors change and a few neon blocks appear. New blocks blink for a moment before turning solid, and they never spawn right next to your head or in the lane straight ahead of it, so there is always time to react.',
          'Combos reward direct routes. Each orb starts a short timer based on its distance, and reaching it in time grows your combo, for up to 3 bonus points per orb. Golden orbs are worth 5 points and add three segments at once, but they vanish when their ring runs out.',
        ],
      },
      {
        h: 'Controls on phone and computer',
        p: [
          "On a phone, swipe anywhere to turn; you can swipe ahead of time and the game remembers up to two turns. With a mouse, drag to turn or click beside the snake's head. On a keyboard, use the arrow keys or WASD.",
        ],
      },
    ],
    faq: [
      {
        q: 'Can I play Snake online for free?',
        a: 'Yes. Neon Snake is a free snake game that runs in any modern browser on mobile or desktop, with no download, account or install.',
      },
      {
        q: 'Does the snake wrap around the edges of the screen?',
        a: 'No. The grid has solid walls, and hitting a wall, a neon block or your own tail ends the run.',
      },
      {
        q: 'How do combos work in Neon Snake?',
        a: 'Each orb starts a short timer based on how far away it is. Reach it before the timer runs out and your combo grows, adding up to 3 bonus points per orb.',
      },
      {
        q: 'What happens when I reach a new level?',
        a: 'Every 8 orbs the snake speeds up, the colors change and a few neon blocks appear. They blink before turning solid, so you have time to steer clear.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-like-suika-game',
    ref: 'Suika Game',
    title: 'Games Like Suika Game: Free Fruit Merge Puzzles',
    metaTitle: 'Games Like Suika Game: Free Fruit Merge',
    description:
      'Looking for a watermelon game like Suika? Play Juicy Drop free: drop fruit, merge matching pairs and grow a watermelon. Plus 2048 and more merge puzzles.',
    answer:
      'The closest free game like Suika Game on Retry Arcade is Juicy Drop: drop fruit into a jar, merge two identical fruits into the next bigger one and work up the chain to a watermelon without letting the pile stay above the dashed line. For more merging try 2048, and for space puzzles, Block Crush.',
    picks: [
      {
        game: 'juicy-drop',
        why: 'Juicy Drop is a fruit-merge physics puzzle: fruit rolls and settles with real physics, identical fruits pop into the next size, and a bubble shows the next fruit before you drop. Two watermelons merging burst in a 100 point jackpot.',
      },
      {
        game: 'merge-2048',
        why: '2048 is the classic merge-two-into-one puzzle on a grid. If what you love is a chain of merges rolling into a corner, it is the most direct next step.',
      },
      {
        game: 'block-crush',
        why: 'Block Crush shares the core tension of fruit-merge games: keeping space open in a container that wants to fill up. You place three pieces at a time on an 8x8 grid and clear full rows and columns.',
      },
      {
        game: 'stack-tower',
        why: 'Stack Tower is the quick-break option: a one-tap stacking game where you drop sliding blocks as precisely as you can. It is good for a short session between longer merge runs.',
      },
    ],
    sections: [
      {
        h: 'What makes fruit-merge games so satisfying',
        p: [
          'Fruit-merge games mix planning with a little chaos. You choose where each fruit drops, but physics decides how it rolls, so a well placed cherry can set off a chain of merges that clears half the jar. Growing a watermelon gives every run a clear goal.',
        ],
      },
      {
        h: 'How Juicy Drop plays',
        p: [
          'The chain runs cherry, strawberry, grape, orange, persimmon, apple, pear, peach, pineapple, melon and watermelon. Only the five smallest fruits, cherry to persimmon, are ever dropped, so everything bigger has to be built by merging.',
          'Each merge scores more the higher it goes up the chain, and merges that follow each other quickly count as a chain for bonus points. The run ends if any settled fruit stays above the dashed line for two seconds, and a fruit you have just dropped gets a moment to settle before it counts.',
        ],
      },
      {
        h: 'Tips from the jar',
        p: [
          'Keep your biggest fruit in a bottom corner and build smaller ones outward from it like a staircase. Check the NEXT bubble before every drop, and avoid dropping small fruit where they can roll under big ones and get trapped.',
        ],
      },
    ],
    faq: [
      {
        q: 'What is a free game like Suika Game?',
        a: 'Juicy Drop on Retry Arcade is a free fruit-merge puzzle that plays in your browser. Drop fruit into a jar, merge matching pairs into bigger fruit and try to grow a watermelon.',
      },
      {
        q: 'What is the fruit order in Juicy Drop?',
        a: 'Cherry, strawberry, grape, orange, persimmon, apple, pear, peach, pineapple, melon and finally watermelon.',
      },
      {
        q: 'What happens when two watermelons merge?',
        a: 'They burst in a jackpot splash worth 100 points and free up a lot of room in the jar.',
      },
      {
        q: 'Can I play Juicy Drop on a computer?',
        a: 'Yes. Move the mouse to position the fruit and click to drop it, or use the left and right arrow keys and press Space, Enter or the down arrow to drop.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'free-brain-games',
    title: 'Free Brain Games Online: Sudoku, Word and Logic Puzzles',
    metaTitle: 'Free Brain Games Online: Sudoku and More',
    description:
      'Free brain games you can play in your browser: Sudoku with notes and hints, a daily 5-letter word puzzle, 2048, Block Crush and Solitaire. No sign-up needed.',
    answer:
      'Good free brain games on Retry Arcade are Sudoku for pure logic, Wordy for vocabulary and deduction, 2048 for planning ahead, Block Crush for spatial reasoning and Solitaire for patient sequencing. All five run in any browser with no download or sign-up, and each has a daily puzzle that is the same for everyone.',
    picks: [
      {
        game: 'sudoku',
        why: 'Sudoku is the classic logic workout. Every puzzle has one unique solution you can reach without guessing, in Easy, Medium or Hard, with notes mode and three hints for when you are stuck.',
      },
      {
        game: 'wordy',
        why: 'Wordy is a five-letter word puzzle with six tries, where every guess narrows the options with green, yellow and gray clues. It exercises vocabulary and deduction in a few minutes.',
      },
      {
        game: 'merge-2048',
        why: '2048 is a planning puzzle disguised as arithmetic. The skill is thinking two or three swipes ahead so your big tiles stay together in one corner.',
      },
      {
        game: 'block-crush',
        why: 'Block Crush is spatial reasoning on an 8x8 grid: look at three pieces, decide the order and positions, and keep room for shapes you have not seen yet. There is no timer, so you can think as long as you need.',
      },
      {
        game: 'solitaire',
        why: 'Klondike Solitaire rewards patient sequencing: which card to free first, when to go through the stock and when to hold a card back. Every deal is checked by a solver so it can be won.',
      },
    ],
    sections: [
      {
        h: 'Different puzzles, different kinds of thinking',
        p: [
          'It helps to mix puzzle types. Sudoku is strict deduction, where every digit follows from the ones already placed. Word puzzles lean on vocabulary and elimination. 2048 and Block Crush are about planning and managing space, and Solitaire is about ordering your moves so you never block yourself.',
        ],
      },
      {
        h: 'Start easy and build up',
        p: [
          'Sudoku on Easy gives around 37 starting numbers and only needs simple techniques, while Hard starts with about 26 and needs methods like naked pairs or pointing pairs. In Solitaire, Draw 1 is the relaxed version and Draw 3 is the classic harder rule set. Move up a level when the easier one starts to feel automatic.',
        ],
      },
      {
        h: 'Make it a daily habit',
        p: [
          'Every game has a Daily Challenge with the same puzzle for every player, which makes an easy routine: one Wordy, one Daily Sudoku, and a game of Solitaire if you have time. The daily puzzles reset at midnight UTC.',
        ],
      },
    ],
    faq: [
      {
        q: 'What are good free brain games to play online?',
        a: 'Sudoku, word puzzles like Wordy, 2048, Block Crush and Solitaire are all free on Retry Arcade. They run in your browser on phone, tablet or computer, with nothing to download.',
      },
      {
        q: 'Is Sudoku good for beginners?',
        a: 'Yes, if you start on Easy. Easy puzzles give around 37 starting numbers and can be solved with simple scanning. Our Sudoku also has notes mode and three hints per puzzle.',
      },
      {
        q: 'Do I need an account to play?',
        a: 'No. Every game works without signing up, and your best scores are saved on your device.',
      },
      {
        q: 'Which brain game fits a short break?',
        a: 'Wordy takes a few minutes and has one daily word, so it suits a coffee break. An Easy Sudoku or a game of Draw 1 Solitaire works well when you have a little longer.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'games-to-play-when-bored',
    title: 'Games to Play When Bored: Free One-Tap Browser Games',
    metaTitle: 'Games to Play When Bored: Free and Instant',
    description:
      'Bored? Play free one-tap games instantly in your browser: Stack Tower, Sky Flap, Blade Spin, Color Rush, Zig Zag and Road Hopper. No download or sign-up.',
    answer:
      'When you are bored and want something instant, one-tap games are the fastest fix: they load in seconds, teach themselves in one try and restart immediately. On Retry Arcade, start with Stack Tower, Sky Flap or Blade Spin, then try Color Rush, Zig Zag and Road Hopper. All are free, with no download.',
    picks: [
      {
        game: 'stack-tower',
        why: 'Tap to drop a sliding block onto your tower; any overhang gets sliced off. It is the purest one-more-try game here, and a streak of perfect drops grows your block back.',
      },
      {
        game: 'sky-flap',
        why: 'Tap to flap a little bird through neon pillars. Runs last seconds, restarts are instant and the gaps get tighter the further you fly.',
      },
      {
        game: 'blade-spin',
        why: 'Tap to throw blades into a spinning log without hitting the ones already stuck. Clearing a stage feels great, and every fifth stage is a boss log that changes speed and direction.',
      },
      {
        game: 'color-rush',
        why: 'Tap to hop a ball upward, passing only through the part of each spinning gate that matches your color. It rewards patience as much as fast fingers.',
      },
      {
        game: 'zig-zag',
        why: 'One tap switches your rolling ball between two diagonals on a narrow path. It starts calm, then the ball speeds up and it becomes surprisingly intense.',
      },
      {
        game: 'road-hopper',
        why: 'Hop a chick across roads, rivers and railways for as many rows as you can. Coins you collect unlock hats that stay with you across runs.',
      },
    ],
    sections: [
      {
        h: 'Why one-tap games beat boredom',
        p: [
          'When you are bored, the last thing you want is a tutorial. One-tap games skip all of that: the whole control scheme is a single tap, runs are short, and you always know exactly why you lost. That makes them easy to pick up for two minutes or for twenty.',
        ],
      },
      {
        h: 'Pick a game by mood',
        p: [
          'If you want pure rhythm, go for Stack Tower or Zig Zag. If you like a bit of danger, Sky Flap and Road Hopper keep you on edge. For something that feels like a tiny real-time puzzle, Color Rush and Blade Spin make you wait for the right moment before you tap.',
        ],
      },
      {
        h: 'Turn it into a challenge',
        p: [
          'Every game has bronze, silver and gold medals to aim for, plus a Daily Challenge where everyone plays the same level. When you set a score you can share a challenge link, so a friend can try to beat it on the same game.',
        ],
      },
    ],
    faq: [
      {
        q: 'What are good games to play when bored?',
        a: 'Quick one-tap games like Stack Tower, Sky Flap, Blade Spin, Color Rush, Zig Zag and Road Hopper. They are free on Retry Arcade, load instantly in a browser and restart the moment you fail.',
      },
      {
        q: 'Can I play these games on my phone?',
        a: 'Yes. Every game works on phones, tablets and computers. On a phone you tap the screen; on a computer you can click or press Space.',
      },
      {
        q: 'Do I need to download anything?',
        a: 'No. The games run directly in your web browser with no download, no install and no sign-up.',
      },
      {
        q: 'Which of these is the most relaxing?',
        a: 'Zig Zag starts slow and steady, and Stack Tower has a calm rhythm in its early floors. If you want no time pressure at all, try a puzzle like Block Crush or Solitaire.',
      },
    ],
    published: '2026-09-25',
  },
  {
    slug: 'relaxing-puzzle-games',
    title: 'Relaxing Puzzle Games: Free to Play Online, No Download',
    metaTitle: 'Relaxing Puzzle Games: Free Online',
    description:
      'Unwind with free relaxing puzzle games in your browser: merge fruit in Juicy Drop, clear blocks in Block Crush, or play Solitaire, 2048 and Sudoku at your pace.',
    answer:
      'For relaxing puzzle games on Retry Arcade, try Juicy Drop, a cozy fruit-merge physics puzzle, and Block Crush, a block puzzle with no timer. Solitaire, 2048 and Sudoku are calm classics you can play at your own pace. All five are free, run in your browser and let you take as long as you like over each move.',
    picks: [
      {
        game: 'juicy-drop',
        why: 'Juicy Drop is the coziest game here: smiling fruit, soft bouncy physics and a juicy pop every time two matching fruits merge. There is no timer, just the gentle goal of growing a watermelon.',
      },
      {
        game: 'block-crush',
        why: 'Block Crush is untimed, so you can study the board as long as you like before placing a piece. Clearing rows and columns in a burst of sparkles is a small, steady reward.',
      },
      {
        game: 'solitaire',
        why: 'Klondike Solitaire is the classic way to unwind. Draw 1 is the relaxed mode, undo is unlimited, and every deal is checked by a solver so it can be won.',
      },
      {
        game: 'merge-2048',
        why: '2048 has no clock at all, only the next swipe. Once you learn the corner strategy it becomes a calm routine of building chains of merges.',
      },
      {
        game: 'sudoku',
        why: 'Sudoku on Easy is a quiet, satisfying solve, with highlights for the row, column, box and matching digits. The clock only matters if you want to chase a best time.',
      },
    ],
    sections: [
      {
        h: 'What makes a puzzle game relaxing',
        p: [
          'Relaxing puzzles share a few traits: no countdown pushing you, clear goals, pleasant feedback and the freedom to pause between moves. You stay in control of the pace, and the challenge comes from thinking rather than reacting.',
        ],
      },
      {
        h: 'Which one to pick',
        p: [
          'If you want something gentle and visual, start with Juicy Drop. If you like tidying up, Block Crush scratches that itch. Solitaire and Sudoku are the familiar classics, and 2048 suits anyone who enjoys a little arithmetic. All five work in short sessions on a phone or a computer.',
        ],
      },
      {
        h: 'Tips to keep it calm',
        p: [
          'Play the endless modes when you want to unwind and save the Daily Challenges for when you feel competitive. In Solitaire, use Undo freely to explore different lines. In Sudoku, turn on Notes and let the candidates guide you rather than racing the clock.',
        ],
      },
    ],
    faq: [
      {
        q: 'What are the most relaxing puzzle games to play online?',
        a: 'On Retry Arcade, Juicy Drop and Block Crush are the most relaxing, with no timer and satisfying feedback. Solitaire, 2048 and Sudoku are calm classics you can play at your own pace. All are free in your browser.',
      },
      {
        q: 'Are there puzzle games without a timer?',
        a: 'Yes. Block Crush, Juicy Drop and 2048 have no timer at all. Sudoku and Solitaire show a clock because your score is your time, but there is no time limit.',
      },
      {
        q: 'Is Solitaire relaxing?',
        a: 'For many people it is the classic way to unwind. Choose Draw 1 for the relaxed version and use unlimited undo and hints whenever you want. Every deal is guaranteed to be winnable.',
      },
      {
        q: 'Can I play without making an account?',
        a: 'Yes. All games run in your browser without sign-up, and your best scores are saved on your device.',
      },
    ],
    published: '2026-09-25',
  },
];

export const getCollection = (slug) => COLLECTIONS.find((c) => c.slug === slug) || null;

/** Collections that recommend a given game (for internal links from its game page). */
export function collectionsFor(slug) {
  return COLLECTIONS.filter((c) => c.picks.some((p) => p.game === slug));
}
