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
  {
    slug: 'block-crush-strategy',
    game: 'block-crush',
    title: 'Block Crush Strategy: How to Build Combos and Score Big',
    description: 'How to score more in Block Crush: keep the center open, plan all three pieces, set up double clears and keep your combo alive. A practical block puzzle guide.',
    published: '2026-09-25',
    intro:
      'The way to score big in Block Crush is to keep the board open and clear lines on as many consecutive moves as you can, because every clear is multiplied by your combo. Placing pieces earns a few points; multi-line clears on a long combo earn hundreds. Here is how to set that up, move by move.',
    sections: [
      {
        h: 'How scoring works',
        p: [
          'Every block you place is worth 1 point, so a 3x3 square scores 9 just for landing. The real points come from clearing lines: one line is worth 10, two lines at once 30, three lines 60 and four lines 100, and that total is multiplied by your current combo.',
          'Your combo goes up by one on every move that clears at least one row or column. After a clear you have three placements to clear again. Each placement that does not clear uses one of them, and when they run out the combo resets. Wiping the whole board adds a 300 point All Clear bonus on top.',
        ],
      },
      {
        h: '1. Keep the center open',
        p: [
          'The biggest pieces in the game are the 3x3 square, the five-long lines and the big five-block corners, and they only fit where there is a lot of room. Fill the edges and corners first and keep an open area in the middle, so a big awkward piece always has somewhere to go.',
        ],
      },
      {
        h: '2. Plan all three pieces before you place one',
        p: [
          'You are dealt three pieces at a time, and a new set only arrives when all three are placed. Before you drag anything, decide where each of the three will go. Place the hardest piece first while there is still room for it, and save single blocks and small pieces for last, because they fit almost anywhere.',
          'Watch for grayed-out pieces in the tray. A gray piece does not fit anywhere on the board right now, which is your warning to open up space before it becomes the piece that ends the run.',
        ],
      },
      {
        h: '3. Set up double clears',
        p: [
          'Two lines at once are worth three times a single line, so it pays to fill two lines together and finish both with one piece. Rows and columns both count, so a piece that completes a row and a column at the same time is a double too, and the cell where they cross only needs filling once.',
        ],
      },
      {
        h: '4. Keep the combo alive',
        p: [
          'A long combo usually beats one huge clear. Once your multiplier is going, take a small one-line clear now over a bigger setup that leaves you three placements without a clear. The combo meter shows how many placements you have left, so glance at it before every move.',
        ],
      },
      {
        h: '5. Avoid one-cell holes',
        p: [
          'A single empty cell boxed in on all sides can only be filled by the single block, and you cannot count on being dealt one. When you place a piece, check that you are not leaving one-cell gaps that make a line impossible to finish.',
        ],
      },
      {
        h: '6. Think in columns too',
        p: [
          'It is easy to think only in rows. Columns clear exactly the same way, and vertical line pieces are dealt as often as horizontal ones. Keeping a few columns nearly full gives you a second set of targets when the rows get messy.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Dropping a piece in the first spot that fits instead of the spot that keeps lines finishable.',
          'Filling the middle early and leaving no room for the 3x3 square.',
          'Chasing a big multi-line clear and letting the combo run out on the way.',
          'Forgetting that a new set of pieces only comes after all three are placed.',
        ],
      },
      {
        h: 'When you run out of moves',
        p: [
          'The run ends when none of your remaining pieces fit. If you use the continue option, the three fullest rows are cleared and you get a fresh set of pieces that all fit, but your combo starts again from zero. The Daily Challenge deals every player the same sequence of pieces, so it is a fair way to compare scores with friends.',
        ],
      },
    ],
    outro: 'Try it now: keep the center open, plan all three pieces and see how long you can keep the combo alive.',
  },
  {
    slug: 'juicy-drop-watermelon-tips',
    game: 'juicy-drop',
    title: 'Juicy Drop Tips: How to Merge Your Way to a Watermelon',
    description: 'Fruit merge tips for Juicy Drop: the full fruit order, the corner staircase strategy, using the next-fruit preview and staying below the dashed line.',
    published: '2026-09-25',
    intro:
      'To make a watermelon in Juicy Drop, keep your biggest fruit in a bottom corner and build a staircase of smaller fruit beside it, so each merge rolls toward the next size up. Just as important is keeping small fruit from getting trapped under big ones, because one buried cherry can block a whole side of the jar. Here is the full method.',
    sections: [
      {
        h: 'Know the fruit order',
        p: [
          'Every merge turns two identical fruits into the next fruit in the chain. Only the five smallest, cherry to persimmon, are ever dropped into the jar, so everything from apple upward has to be built by merging. Here is the full chain, smallest first:',
        ],
        ol: ['Cherry', 'Strawberry', 'Grape', 'Orange', 'Persimmon', 'Apple', 'Pear', 'Peach', 'Pineapple', 'Melon', 'Watermelon'],
      },
      {
        h: 'How scoring works',
        p: [
          'Bigger merges score more. Making a strawberry is worth 1 point, a grape 3, an orange 6, a persimmon 10, and so on up to 55 for a watermelon. Merges that happen within a moment of each other count as a chain, and every link after the first adds a bonus that grows with the chain. Merging two watermelons pops them both in a 100 point jackpot.',
        ],
      },
      {
        h: '1. Build a corner staircase',
        p: [
          'Pick a bottom corner and let your biggest fruit settle there. Build outward with the next sizes down, so an apple sits beside a pear, a persimmon beside the apple, and so on. When the small end of the staircase merges, the new fruit lands next to its twin and the chain can roll all the way into the corner.',
          'Keep the staircase in size order. A small fruit wedged between two big ones is the most common reason a chain stops.',
        ],
      },
      {
        h: '2. Use the NEXT bubble',
        p: [
          'The bubble at the top shows the fruit that comes after the one you are holding. Before every drop, think about where both should go. If a cherry is next, drop the current fruit away from your cherries and keep a spot open for it; if a persimmon is next, make sure there is room for something that big.',
        ],
      },
      {
        h: '3. Drop with physics in mind',
        p: [
          'Fruit rolls and bounces when it lands, so aim for where it will settle rather than where it first touches. Dropping onto the top of a round fruit usually sends the new one rolling off to one side, while dropping into a gap between two fruits tends to keep it in place.',
          'There is a short pause between drops, so tapping quickly will not stack fruit faster than the jar can settle. Use that moment to see where the last fruit ended up.',
        ],
      },
      {
        h: '4. Respect the dashed line',
        p: [
          'The run ends if any fruit stays above the dashed line for two seconds. A fruit you have just dropped gets about a second to settle before it counts, and the line flashes as a warning while the clock is running. If the pile is getting high, stop building and look for the merge that frees the most space, usually the largest matching pair near the top.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Dropping every fruit in the middle, which builds a hill that sends new fruit rolling in all directions.',
          'Letting a cherry or strawberry roll under a big fruit where nothing can reach it.',
          'Growing big fruit in both corners, so they can never meet and merge.',
          'Ignoring the NEXT bubble and ending up with a fruit that has nowhere to go.',
        ],
      },
      {
        h: 'Second chances and the Daily',
        p: [
          'If you use the continue option after a game over, the highest fruits near the line are popped so the jar has room again, and you keep your score. The Daily Challenge gives every player the same fruit order, so everyone faces exactly the same drops.',
        ],
      },
    ],
    outro: 'Put it into practice: pick a corner, build your staircase and see if you can grow a watermelon.',
  },
  {
    slug: 'sky-flap-tips',
    game: 'sky-flap',
    title: 'Sky Flap Tips: How to Fly Further and Beat Your Best',
    description: 'Sky Flap tips for our free Flappy Bird-style game: tap rhythm, where to look, how to read moving pillars and when to flap. Pass 30 gaps and chase gold.',
    published: '2026-09-25',
    intro:
      'The secret to Sky Flap is rhythm: short, evenly spaced taps that keep the bird just above the lower lip of each gap, instead of big panicked bursts. Most crashes come from flapping too early or too often, not too late. These tips will help you string together longer runs.',
    sections: [
      {
        h: 'How Sky Flap works',
        p: [
          'Each tap gives the bird a quick burst of lift and gravity pulls it back down. You score one point for every gap you fly through, and touching a pillar or the ground ends the run. The top of the screen is not deadly: it just stops the bird from climbing higher.',
          'A flap does not add to your current speed, it replaces it. Whether the bird is rising or falling, a tap always gives exactly the same upward kick. So two quick taps do not double your lift, they just restart the same short climb.',
        ],
      },
      {
        h: '1. Watch the bottom lip',
        p: [
          'Focus on the lower pillar cap of the next gap and keep the bird hovering just above it with small taps. Falling is steady and predictable, so it is much easier to ride the bottom of a gap than to chase the top and drop through it.',
        ],
      },
      {
        h: '2. Flap after the lip, not before',
        p: [
          'A flap gives a sharp burst of lift. If you tap while you are still under the upper pillar, you can shoot straight up into it. Wait until the bird has cleared the lip in front of you, then tap to line up for the next gap.',
        ],
      },
      {
        h: '3. Trust the forgiving hitbox',
        p: [
          'The collision area is a little smaller than the bird looks, so passes that seem impossibly close often make it. Skimming a pillar counts as a near miss: it sets off a sparkle, and doing it on consecutive gaps chains a CLOSE combo. Near misses do not add points, so treat them as a style bonus, not a goal.',
        ],
      },
      {
        h: '4. Read the moving pillars',
        p: [
          'From around the thirteenth pillar some gaps start sliding up and down, and they become more common and swing further as you go. Each one moves in a smooth, steady wave. Watch it for a beat as it approaches, work out whether it will be rising or falling when you arrive, and aim for where the gap will be, not where it is.',
        ],
      },
      {
        h: '5. Know how the difficulty ramps',
        p: [
          'The scroll speed climbs with your score until about 34 gaps, and the gaps keep narrowing for a few pillars after that. The height of each gap also jumps around more from one pillar to the next, so do not settle into one altitude. Moving pillars keep getting bolder until roughly 55 gaps; after that the course stops getting harder and the real test is concentration.',
        ],
      },
      {
        h: '6. Aim for the medals',
        p: [
          'Bronze is 10 gaps, silver 30 and gold 60. Ten is about learning the rhythm, thirty means you can handle the first moving pillars and the faster scroll, and sixty means you are flying at full speed through the tightest gaps.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Tapping in bursts when you panic, which throws the bird into the top pillar.',
          'Staring at the bird instead of the next gap.',
          'Treating a moving gap like a fixed one and flying into where it used to be.',
          'Chasing near misses on purpose when they are worth no points.',
        ],
      },
      {
        h: 'Practice smart',
        p: [
          'Runs are short and restarts are instant, so treat the first few as warm-ups. The Daily Challenge gives everyone the same pillar layout, which makes it a good course to learn and improve on through the day.',
        ],
      },
    ],
    outro: 'Ready? Watch the bottom lip, keep your taps steady and see how many gaps you can thread.',
  },
  {
    slug: 'neon-snake-tips',
    game: 'neon-snake',
    title: 'Neon Snake Tips: How to Grow Longer and Score Higher',
    description: 'Tips for Neon Snake, the free classic snake game: queue your turns, hug the walls, pick your golden orbs and build combos worth up to 4 points per orb.',
    published: '2026-09-25',
    intro:
      'To score high in Neon Snake, keep the middle of the grid open as your escape route, hug the edges once you are long, and take quick, direct routes to each orb to build combo bonuses. Survival comes first, because every orb makes you longer and the free space smaller. Here is how to balance the two.',
    sections: [
      {
        h: 'How scoring works',
        p: [
          'Each regular orb is worth 1 point and makes the snake one segment longer. Reach orbs quickly one after another and your combo grows: from the third orb in a streak you get +1 bonus, from the fifth +2 and from the seventh +3, so a single orb can be worth up to 4 points. Golden orbs are worth a flat 5 points but add three segments at once, and they disappear when their countdown ring runs out.',
        ],
      },
      {
        h: '1. Beat the combo timer',
        p: [
          'When a new orb appears, a timer starts based on how far away it is. A direct route with a turn or two usually makes it in time; a long detour usually does not. Once your streak reaches two, a combo meter appears under the grid so you can see how much time is left.',
        ],
      },
      {
        h: '2. Queue your turns',
        p: [
          'The game remembers up to two turns in advance. For a tight U-turn, swipe twice quickly, for example right and then down, and the snake takes both turns on consecutive cells. This also helps at high speed: swipe a moment early and the turn happens on the very next cell. A single drag that changes direction partway through also queues both turns.',
        ],
      },
      {
        h: '3. Hug the edges when you are long',
        p: [
          'Once the snake is long, run it along the walls and keep the middle of the grid open. The open middle is your escape route when an orb appears somewhere awkward. Coiling up in the center splits the free space into small pockets and leaves you trapped by your own body.',
        ],
      },
      {
        h: '4. Remember that your tail moves',
        p: [
          'Your tail moves out of the way as your head moves forward, so you can follow your own tail closely, even into the cell it is just leaving. The exception is right after eating, while the snake is growing: the tail pauses for one step after a regular orb and for three after a golden one.',
        ],
      },
      {
        h: '5. Be picky about golden orbs',
        p: [
          'Golden orbs show up every several orbs and last about six and a half seconds. Five points is great, but three extra segments at once make the snake harder to handle. Take a golden orb when the path is clear, and skip it when reaching it means threading past your own body.',
        ],
      },
      {
        h: '6. Expect new walls on level-up',
        p: [
          'Every 8 orbs you reach a new level. The colors change, a few neon blocks appear and the snake gets faster; it also speeds up a little with every orb you eat. New blocks blink for a moment before turning solid, and they never land right next to your head or in the lane straight ahead of it, so you always have a moment to steer around them. More blocks arrive at higher levels, so the grid slowly gets tighter.',
        ],
      },
      {
        h: 'Controls that help',
        ul: [
          'Phone: swipe anywhere on the screen; you do not need to touch the snake.',
          "Mouse: drag to turn, or click beside the snake's head to turn toward that side.",
          'Keyboard: arrow keys or WASD. Press two keys in quick succession to queue a double turn.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Trying to reverse in one move: the snake cannot turn straight back on itself, so plan a U-turn as two turns.',
          'Chasing every golden orb, even through tight spaces.',
          'Cutting across the middle when long, which splits the open space into two small halves.',
          'Forgetting that the walls are solid: the snake does not wrap around the screen.',
        ],
      },
      {
        h: 'Second chances',
        p: [
          'If you use the continue option after a crash, the snake comes back at its starting length of five segments in the most open lane on the grid, and you keep your score. It is a good moment to rebuild calmly before chasing combos again.',
        ],
      },
    ],
    outro: 'Try it now: keep the middle open, queue your turns and see how long you can grow.',
  },
  {
    slug: 'color-rush-tips',
    game: 'color-rush',
    title: 'Color Rush Tips: How to Time Every Color Gate',
    description: 'Color Rush tips: how to hover in place, time rings, bars, squares, windmills and twin gears, and handle color switches so you collect more stars.',
    published: '2026-09-25',
    intro:
      'The key to Color Rush is patience: tap lightly to hover below a gate, wait until your color lines up with your path, then hop through in one smooth move. Most runs end from hopping too early, not too late. Here is how to read every obstacle in the game.',
    sections: [
      {
        h: 'The rules in brief',
        p: [
          'Tap to hop upward; stop tapping and the ball falls. Every obstacle is built from four colors, and you can only pass through the part that matches your ball. Touching any other color shatters it, and so does falling off the bottom of the screen. Each obstacle holds a star worth one point, and rainbow orbs switch your ball to a new color.',
        ],
      },
      {
        h: '1. Learn to hover',
        p: [
          'Every hop gives the same upward kick no matter how fast you are moving, so a steady rhythm of light taps keeps the ball roughly in place. Practice holding the ball just below a gate while its colors move past. Being able to wait is the most useful skill in the game.',
          'At the start the ball rests on a launch pad, so there is no rush before your first hop.',
        ],
      },
      {
        h: '2. Rings: in through the bottom, out through the top',
        p: [
          'A ring is split into four colored quarters, and you cross it twice: once through the bottom and once through the top, which are always different quarters. Enter when your color is at the bottom, hover inside the ring while it turns, and hop out once your color has come round to the top.',
          'Squares work the same way, but their color changes suddenly at each corner. Enter just after a corner passes to give yourself the most time.',
        ],
      },
      {
        h: '3. Bars: wait for the middle',
        p: [
          'Sliding bars come in pairs, and the upper bar mirrors the lower one, so the color in the middle of both is always the same. When your color slides into the middle, hop through both bars in one go.',
        ],
      },
      {
        h: '4. Double rings, windmills and twin gears',
        p: [
          'A double ring is two rings turning in opposite directions, built so that both always show the same color straight above and straight below the center. Treat each side as one thick gate: pass through the bottom of both bands together when your color is there, then wait inside the inner ring until your color reaches the top.',
          "Windmills are offset to one side, so their four arms sweep across your path like a turnstile. You can slip through the gap between two arms, or through an arm of your own color. Twin gears are two rings touching at the ball's column and turning against each other, and only the color where they meet matters. Their star sits just above the gears.",
        ],
      },
      {
        h: '5. Plan around color switches',
        p: [
          'Rainbow orbs sit on your path between obstacles, so you always collect them, and they always change your ball to a different color. After grabbing one, look at the next gate with your new color in mind before you hop into it. Not every gap has an orb, so sometimes you keep the same color through two or more obstacles.',
        ],
      },
      {
        h: 'How the climb gets harder',
        p: [
          'The first two obstacles are always single rings. Bars and squares join after that, windmills and double rings a few gates later, and twin gears from about the tenth obstacle. Everything spins and slides faster as you climb until around the thirtieth obstacle, after which the speed holds steady. Bronze is 10 stars, silver 25 and gold 50.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Hopping into a gate the moment it looks close instead of waiting for your color.',
          'Forgetting that your color just changed after a rainbow orb.',
          'Letting the ball sink too far while waiting and dropping off the bottom of the screen.',
          'Tapping in fast bursts, which launches the ball into the next band before your color lines up.',
        ],
      },
    ],
    outro: 'Try it now: hover, wait for your color and slip through.',
  },
  {
    slug: 'brick-barrage-tips',
    game: 'brick-barrage',
    title: 'Brick Barrage Tips: Bank Shots, Aiming and Survival',
    description: 'Brick Barrage strategy: how bank shots work, why +1 rings matter, where your next shot launches from and how to keep the bricks away from the red line.',
    published: '2026-09-25',
    intro:
      'To survive longer in Brick Barrage, grow your volley early by collecting +1 rings and use bank shots off the side walls to get balls behind the wall of bricks, where they do the most damage. Your score is the turn you reach, so every decision is really about keeping bricks away from the red line. These tips cover aiming, growing your volley and emergency play.',
    sections: [
      {
        h: 'How a turn works',
        p: [
          'Drag to aim: the dotted line shows your path and the first rebound. Release to fire your whole volley, one ball after another along the same line, bouncing off walls and bricks. Each hit knocks 1 point off a brick, and it shatters when it reaches zero.',
          'When every ball is back, the wall steps down one row and a new row appears at the top, with numbers equal to the new turn, so bricks get tougher as you go. If a brick reaches the red line after the wall steps down, the run is over.',
        ],
      },
      {
        h: '1. Grow your volley early',
        p: [
          'Every new row contains one glowing +1 ring. Hit it with any ball and your volley grows by one from the next turn. A ring you miss is still added to your volley when it reaches the bottom row, but grabbing it early means the extra ball works for you over many more turns.',
          'In the first ten turns, a shot that collects a ring is often worth more than a shot that breaks a brick.',
        ],
      },
      {
        h: '2. Bank shots behind the wall',
        p: [
          'The lane above the top row of bricks is always empty. Angle a shot off a side wall and up through an empty or nearly empty column, and your balls get trapped between the bricks and the ceiling, rattling around and hitting the tops of bricks again and again. One good bank shot can do more damage than several straight ones.',
        ],
      },
      {
        h: '3. Your first ball picks the next launch spot',
        p: [
          'The launcher moves to wherever the first ball of your volley lands. That means your aim also decides where you shoot from next turn. If the bricks you need to reach are on the far side, a shot that brings the first ball down on that side sets up a better angle.',
        ],
      },
      {
        h: '4. Read the bricks',
        p: [
          'Fresh bricks at full strength glow rose and cool toward mint as they take damage, so color tells you at a glance which ones are nearly broken. From turn 8 some bricks appear with double the usual number and glow orange or gold. Triangle bricks bounce balls off at an angle, which can help or hurt, so check the dotted line when one is near your path.',
        ],
      },
      {
        h: '5. When bricks get close, go low',
        p: [
          'When bricks reach the row directly above the red line, a warning sound plays and the danger zone starts to pulse. At that point forget combos and fire at the lowest bricks, even with a flat, direct shot. Clearing that row buys you a whole turn; a spectacular bank shot at the top does not.',
        ],
      },
      {
        h: '6. Speed up long volleys',
        p: [
          'Once your volley is big, turns can take a while. Tap during a volley to speed it up to 2x and then 3x. It also speeds up on its own after a few seconds, and very long volleys eventually pull the remaining balls back down, so a turn never stalls.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Aiming straight up the middle every turn, which only chips at the bottom bricks.',
          'Ignoring +1 rings in the early turns.',
          'Chasing a bank shot while bricks sit right above the red line.',
          'Forgetting that the launcher moves to wherever your first ball lands.',
        ],
      },
      {
        h: 'Medals, the Daily and second chances',
        p: [
          'Bronze is turn 25, silver turn 50 and gold turn 90. The Daily Challenge gives every player the same rows and rings, so you can compare how many turns you survived on identical bricks. If you use the continue option after a loss, the bottom three rows are cleared and any rings in them are added to your volley.',
        ],
      },
    ],
    outro: 'Try it now: grab the rings, find a bank shot and see how many turns you can survive.',
  },
  {
    slug: 'road-hopper-tips',
    game: 'road-hopper',
    title: 'Road Hopper Tips: Cross More Roads, Rivers and Rails',
    description: 'Road Hopper tips for our free Crossy Road-style game: reading traffic lanes, riding logs, beating trains, avoiding the hawk and unlocking hats with coins.',
    published: '2026-09-25',
    intro:
      'To go further in Road Hopper, watch each lane for a second before you hop, move forward in short bursts when a gap opens, and never wait long enough for the camera to catch you. A steady forward rhythm beats both rushing and hesitating. Here is how to handle every kind of row.',
    sections: [
      {
        h: 'The basics',
        p: [
          'Tap to hop one row forward, swipe left or right to side-step, and swipe down to hop back. On a keyboard, use the up arrow, W or Space to hop forward, left and right or A and D to side-step, and down or S to hop back. Your score is the furthest row you reach, so stepping back to dodge something costs you nothing.',
        ],
      },
      {
        h: '1. Roads: read the lane, then commit',
        p: [
          'Every lane has its own speed and direction, and road lanes side by side always run in opposite directions. Cars are short; trucks are longer but a little slower. Watch the lane for a moment, wait until a vehicle has passed the space in front of you, and hop.',
          'A hop is quick, but for the first half of it you still count as being in the row you left. Do not wait until the last instant to hop away from a car that is about to reach you.',
        ],
      },
      {
        h: '2. Rivers: ride the logs',
        p: [
          'Water is deadly, so you cross rivers on floating logs and lily pads. You land on the nearest part of a log, and logs carry you sideways as they drift. Being carried off the edge of the screen counts as a splash, so hop forward early rather than riding a log to the end.',
          'Rows of lily pads do not move at all, and there is always at least one pad to land on. They only appear partway through a river, never as its first row, and give you a moment to breathe.',
        ],
      },
      {
        h: '3. Railways: trust the light',
        p: [
          'Trains are far faster than any car and cross the screen almost instantly. A warning light flashes and a bell rings about a second and a half before a train arrives. If the light is flashing, wait on the row before the tracks. Once the train has passed you have a few seconds before the next one, so go straight away.',
        ],
      },
      {
        h: '4. Grass: plan around trees',
        p: [
          'Trees and rocks block your way on grass, and bumping into one wastes a moment. There is always at least one open route through the trees, but it can wander left or right, so look a couple of rows ahead and side-step early instead of getting boxed in while the camera closes in.',
        ],
      },
      {
        h: '5. Keep moving: the hawk is watching',
        p: [
          'After your first hop forward, the camera starts creeping ahead on its own, and it creeps faster the further you get. If you fall behind the bottom of the screen, a hawk swoops in and ends the run, and a red glow at the bottom edge is your warning. Waiting for the right gap is good; waiting for three of them is how you meet the hawk.',
        ],
      },
      {
        h: '6. Collect coins for hats',
        p: [
          'Coins appear on some grass rows. They are saved across all your runs, and at 20, 60 and 150 coins your chick unlocks a cap, a party hat and then a crown. Only grab a coin if it is on your way: a sideways detour while the camera creeps forward is rarely worth it.',
        ],
      },
      {
        h: 'How the difficulty ramps up',
        p: [
          'The first rows are gentle and early traffic moves a little slower. Rivers appear after the first dozen rows and railways after about twenty. From there, road sections get more lanes, traffic gets faster, the gaps between cars get tighter and logs get shorter. The difficulty keeps rising for roughly the first two hundred rows, then holds steady.',
          'Bronze is 25 rows, silver 60 and gold 120. The Daily Challenge gives every player the same world to cross, so it is the fairest way to compare distances with friends.',
        ],
      },
      {
        h: 'Common mistakes',
        ul: [
          'Hopping the moment a car passes without checking the next lane.',
          'Riding a log to the edge of the screen.',
          'Crossing the tracks while the warning light is flashing.',
          'Waiting on the grass so long that the hawk catches up.',
        ],
      },
    ],
    outro: 'Try it now: read the lanes, keep a steady rhythm and see how many rows you can cross.',
  },
];

export const getGuide = (slug) => GUIDES.find((g) => g.slug === slug) || null;
export const guidesFor = (game) => GUIDES.filter((g) => g.game === game);
