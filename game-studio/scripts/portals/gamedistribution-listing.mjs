// GameDistribution listing copy for every game: the single source for the GD title, genres,
// tags and the Description / Instructions fields of the GD upload form.
//   - scripts/gd-metadata.mjs validates it and writes marketing/portals/gamedistribution.csv/.json
//   - scripts/export-portal.mjs uses `title` for the GD build (page title and start screen)
//   - scripts/portal-assets.mjs uses `title` on the 1280 px banners
//
// GD rules this follows (developer guidelines, section 5):
//   - title must be distinct from games already on GD (a title that only repeats an existing
//     GD title is a problem); never use other companies' game names
//   - description and instructions: 200 to 500 characters each, plain English, the exact
//     title at least once in the description, no hype words, specific controls
//   - 1 or 2 genres from GD's list, 1 to 5 tags (tags below all exist in GD's catalog)
//
// GD genres (2026 catalog): Casual, Puzzle, Adventure, Dress-up, Racing & Driving, Shooter,
// Agility, Simulation, Battle, Art, Match-3, .IO, Strategy, Mahjong & Connect, Care, Sports,
// Cards, Football, Cooking, Merge, Bubble Shooter, Educational, Jigsaw, Boardgames,
// Basketball, Quiz.
//
// `siteTitle` notes where the GD title differs from our own title (GD already lists a game
// with the plain name). Change `title` here and rebuild if you prefer another name.

export const GD_GENRES = [
  'Casual', 'Puzzle', 'Adventure', 'Dress-up', 'Racing & Driving', 'Shooter', 'Agility', 'Simulation', 'Battle', 'Art',
  'Match-3', '.IO', 'Strategy', 'Mahjong & Connect', 'Care', 'Sports', 'Cards', 'Football', 'Cooking', 'Merge',
  'Bubble Shooter', 'Educational', 'Jigsaw', 'Boardgames', 'Basketball', 'Quiz',
];

// Shared defaults: every game is portrait, touch ready and English only.
export const GD_DEFAULTS = {
  orientation: 'Portrait',
  width: 720,
  height: 1280,
  mobile: true,
  language: 'English',
  noBlood: true,
};

const PARTY_PLAYERS = '1-4 on one screen (bots fill empty seats)';

export const LISTING = {
  'blade-spin': {
    title: 'Blade Spin',
    genres: ['Casual', 'Agility'],
    tags: ['knife', 'throwing', 'timing', 'skill', 'arcade'],
    kidsFriendly: false,
    short: 'Throw blades into a spinning log without touching the ones already stuck.',
    description:
      'Blade Spin is a one-tap throwing game. A wooden target spins at the top of the screen and you throw blades into it one at a time. Every blade that sticks scores a point, but touching a blade that is already stuck ends the run. Empty your rack to split the log, beat a boss log every fifth stage, and slice apples and gems on the rim for bonus points.',
    instructions:
      'Tap anywhere to throw a blade straight up into the spinning target. On a computer, click or press Space, Enter or the Up arrow. Time each throw for a gap between the blades already stuck in the wood: hitting another blade ends the run. Use every blade in the rack to clear the stage. Apples are worth 2 points and gems 3.',
  },
  'block-crush': {
    title: 'Block Crush Combo',
    siteTitle: 'Block Crush',
    genres: ['Puzzle'],
    tags: ['block', 'tiles', 'logic', 'relaxing', 'highscore'],
    kidsFriendly: true,
    short: 'Drop jewel blocks on an 8x8 grid, clear lines and chain combos.',
    description:
      'Block Crush Combo is a relaxing block puzzle on an 8x8 grid. Drag colorful jewel blocks from the tray onto the board and fill complete rows or columns to clear them. Clear several lines with one piece, or clear on back to back moves, to build a combo multiplier. Plan ahead: when none of the three pieces in the tray fit, the game is over. There is no timer, so think as long as you like.',
    instructions:
      'Drag one of the three pieces from the tray and drop it on the 8x8 board. Fill a whole row or column to clear it, and place all three pieces to get a new set. On a computer, drag with the mouse, or press 1 to 3 (or Q and E) to pick a piece, the arrow keys to move it and Enter to place it. The game ends when no remaining piece fits.',
  },
  'brick-barrage': {
    title: 'Brick Barrage',
    genres: ['Casual'],
    tags: ['brickbreaker', 'ball', 'aim', 'physics', 'arcade'],
    kidsFriendly: true,
    short: 'Aim, fire a volley of bouncing balls and smash numbered bricks.',
    description:
      'Brick Barrage is a ball shooter about the perfect angle. Aim, fire a whole volley of bouncing balls and smash numbered bricks before the wall reaches the red line. Every hit knocks one point off a brick, and every glowing ring you collect adds another ball to your volley. Use rebounds off the walls to reach bricks at the back. The wall steps down a row after every turn.',
    instructions:
      'Touch and drag anywhere to aim, then let go to fire. The dotted line shows your path and the first rebound. With a mouse, point to aim and click to fire. With a keyboard, use the Left and Right arrows to aim and Space, Enter or Up to fire. Tap or click during a volley to speed it up. Collect rings for extra balls and keep the bricks away from the red line.',
  },
  'color-rush': {
    title: 'Color Rush Climb',
    siteTitle: 'Color Rush',
    genres: ['Agility', 'Casual'],
    tags: ['color', 'colormatch', 'ball', 'reflex', 'endless'],
    kidsFriendly: true,
    short: 'Hop a glowing ball through spinning gates where only your color lets you pass.',
    description:
      'Color Rush Climb is a reflex game about matching colors. Tap to hop a glowing ball upward through spinning rings, bars, squares and windmills, each built from four colors. You can only pass through the part that matches the color of your ball, so watch the rotation and time every hop. Grab stars for points and touch rainbow orbs to switch color. The gates spin faster the higher you climb.',
    instructions:
      'Tap anywhere to make the ball hop upward. Stop tapping and it falls. On a computer, click or press Space, Enter or the Up arrow. Pass only through the part of each gate that has the same color as your ball. Touching any other color, or falling off the bottom of the screen, ends the run. Collect stars for points and rainbow orbs to change color.',
  },
  'hole-party': {
    title: 'Hole Party',
    genres: ['Casual', 'Battle'],
    tags: ['2players', 'party', 'hole', 'city', 'friends'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'Up to 4 players on one screen: swallow the city, then swallow your friends.',
    description:
      'Hole Party is a party game for 1 to 4 players on one screen. Every player is a hole in the ground of a busy little city. Glide over cones, benches, trees, cars and buses to swallow them and grow, then gulp down smaller rival holes. Rounds last 40 seconds and the biggest hole wins the crown. From round 2 a twist card changes the rules. Bots fill every empty seat, so it also plays well solo.',
    instructions:
      'Each player owns one corner of the screen as their only button. Tap your corner in the lobby to join, then press PLAY. Hold your button to glide the way your arrow points and let go to spin the arrow. Keyboard players use Z, M, P and Q, or Space when playing alone. Swallow anything smaller than your hole, including rival holes that are about 20 percent smaller.',
  },
  'juicy-drop': {
    title: 'Juicy Drop',
    genres: ['Merge', 'Puzzle'],
    tags: ['fruits', 'physics', 'watermelon', 'relaxing', 'cute'],
    kidsFriendly: true,
    short: 'Drop fruit into the jar and merge matching pairs all the way to a watermelon.',
    description:
      'Juicy Drop is a physics merge puzzle with cute fruit. Drop fruit into the jar and watch it roll and settle. When two identical fruits touch, they merge into the next bigger fruit, from cherries all the way up to a giant watermelon. Chain merges for big scores and keep the pile below the dashed line. It is calm to play and hard to master, and every drop changes the shape of the pile.',
    instructions:
      'Drag left or right to position the fruit at the top of the jar, then lift your finger to drop it. With a mouse, move to aim and click to drop. With a keyboard, use the Left and Right arrows to move and Space, Down or Enter to drop. Two identical fruits merge into a bigger one. If fruit stays above the dashed line for two seconds, the game ends.',
  },
  'merge-2048': {
    title: '2048 Slide and Merge',
    siteTitle: '2048',
    genres: ['Puzzle', 'Merge'],
    tags: ['2048', 'number', 'math', 'logic', 'tiles'],
    kidsFriendly: true,
    short: 'Slide and merge number tiles to reach 2048, then keep going.',
    description:
      '2048 Slide and Merge is the classic number puzzle on a 4x4 board. Slide every tile at once, merge two tiles with the same number into one worth their sum, and work your way up to the 2048 tile. A new 2 or 4 appears after every move, so keep space open and keep your biggest tile in a corner. Reach 2048, then keep going for 4096 and a new best score.',
    instructions:
      'Swipe up, down, left or right to slide every tile on the board. With a mouse, click and drag in a direction. With a keyboard, use the arrow keys or W, A, S and D. Two tiles with the same number merge into one when they touch. A new tile appears after every move. The game ends when the board is full and no move can merge anything.',
  },
  'neon-snake': {
    title: 'Neon Snake Combo',
    siteTitle: 'Neon Snake',
    genres: ['Casual', 'Agility'],
    tags: ['snake', 'retro', 'classic', 'arcade', 'skill'],
    kidsFriendly: true,
    short: 'Steer a glowing snake around a neon grid and chain quick bites for combos.',
    description:
      'Neon Snake Combo is a fast take on the classic snake game. Steer a glowing snake around a neon grid, eat orbs to grow longer, and eat the next orb quickly to build a combo for bonus points. Golden orbs are worth 5 points but vanish when their ring runs out. Walls, neon blocks and your own tail end the run, so plan your turns as the snake gets longer.',
    instructions:
      "Swipe in any direction to turn the snake. You can swipe ahead of time to queue your next turn. With a mouse, drag to turn or click beside the snake's head. With a keyboard, use the arrow keys or W, A, S and D. Eat orbs to grow and score, and eat the next one quickly for a combo. Avoid the walls, the neon blocks and your own tail.",
  },
  'paddle-brawl': {
    title: 'Paddle Brawl',
    genres: ['Casual', 'Sports'],
    tags: ['2players', 'party', 'ball', 'friends', 'arcade'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'Four walls, four paddles, one button each: four-way paddle ball on one screen.',
    description:
      'Paddle Brawl is four way paddle ball for 1 to 4 players on one screen. Every player defends one wall of a neon court with a single button. Your paddle slides on its own: tap to turn it around and hold to slow it down. Each goal you let in costs a heart, and losing all three closes your goal for good. Balls speed up and more join in. The last paddle standing wins and bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. Your paddle slides by itself along your wall. Tap your button to turn it around and hold it to slow down. Keyboard players use Z, M, P and Q, one key per player, and Enter to start. Stop the balls from getting into your goal: each goal costs one of your three hearts.',
  },
  'puck-panic': {
    title: 'Puck Panic',
    genres: ['Sports', 'Casual'],
    tags: ['airhockey', 'hockey', '2players', 'party', 'friends'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'Neon air hockey for up to 4 players on one screen with one button each.',
    description:
      'Puck Panic is neon air hockey for 1 to 4 players on one screen. Each player owns a goal and a mallet controlled by one button. Hold to charge at the puck and let go to glide back and guard your goal. Two players get classic end to end air hockey, while three or four players add goals on the sides. Extra pucks drop in as the match heats up. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. Hold your corner button to send your mallet after the puck and release it to glide back to your goal. Keyboard players use Z, M, P and Q, one key each, and Enter or Space to start. A puck in your goal costs one of your 3 lives, and the last mallet standing wins the round.',
  },
  'reflex-duel': {
    title: 'Reflex Duel',
    genres: ['Casual', 'Battle'],
    tags: ['duel', 'western', 'reflex', '2players', 'party'],
    kidsFriendly: false,
    players: PARTY_PLAYERS,
    short: 'A western reaction duel for up to 4 players: wait for DRAW!, fastest tap wins.',
    description:
      'Reflex Duel is a western reaction time game for 1 to 4 players on one screen. Every player is a gunslinger waiting by their corner. After a tense wait of random length, DRAW! flashes and the fastest tap wins the round. Tap too early and it is a false start. Every round shows each reaction time in milliseconds, and twist cards bring fake signals and other surprises. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. Keep a finger ready and tap your corner the instant DRAW! appears. Keyboard players use Z, M, P and Q, one key each, and Enter or Space to start. Tapping before the signal is a false start and puts you out of that round. The first player to 5 crowns wins the cup.',
  },
  'road-hopper': {
    title: 'Road Hopper',
    genres: ['Agility', 'Casual'],
    tags: ['chicken', 'road', 'endless', 'jumping', 'arcade'],
    kidsFriendly: true,
    short: 'Hop a chunky chick across roads, rivers and railway tracks.',
    description:
      'Road Hopper is an endless arcade hopper. Guide a chunky chick across busy roads, rushing rivers and railway tracks, one hop at a time. Wait for a gap in the traffic, ride logs and lily pads across the water, and watch for the flashing lights that warn of a train. Keep moving forward, because a hawk swoops in on anyone who falls behind. See how far you can go.',
    instructions:
      'Tap to hop forward one row. Swipe left or right, or tap near the edges of the screen, to step sideways, and swipe down to hop back. With a mouse, click to hop and drag to change direction. With a keyboard, use Up, W or Space to hop, Left and Right or A and D to step sideways, and Down or S to go back. Avoid cars and trains and stay out of the water.',
  },
  'rooftop-rush': {
    title: 'Rooftop Rush',
    genres: ['Agility', 'Casual'],
    tags: ['ninja', 'runner', 'parkour', '2players', 'party'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'A one-button ninja race across night-city rooftops for up to 4 players.',
    description:
      'Rooftop Rush is a ninja race across night city rooftops for 1 to 4 players on one screen. Every player gets a lane and one button: tap to jump, hold to jump higher and tap again in the air for a double jump. Clear gaps, chimneys, vents, water towers and laundry lines. The camera follows the leader, so anyone who falls off the left edge is out. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. Your ninja runs on its own. Tap your button to jump, hold it for a higher jump and tap again in the air to double jump. Keyboard players use Z, M, P and Q, one key each, and Enter to start. Do not fall off the left edge of the screen. The first ninja across the finish line wins the round.',
  },
  'rope-rumble': {
    title: 'Rope Rumble',
    genres: ['Casual', 'Sports'],
    tags: ['rope', '2players', 'party', 'timing', 'friends'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'One-button tug of war for up to 4 players: heave on the beat.',
    description:
      'Rope Rumble is a one button tug of war for 1 to 4 players on one screen. Everyone pulls a rope tied to one ring in a mud pit. Tap to heave the ring toward you, and tap again as the ring around your puller turns green for a power pull that is three times stronger. Mashing drains your stamina, so find the rhythm. Drag the ring over your line to win the round. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. Tap your corner button to heave the ring toward you. Tap again just as the ring around your puller turns green for a power pull, and hold your button to dig in while you are being dragged. Keyboard players use Z, M, P and Q, one key each, and Enter or Space to start.',
  },
  'shark-attack': {
    title: 'Shark Attack Party',
    siteTitle: 'Shark Attack',
    genres: ['Casual', 'Agility'],
    tags: ['shark', 'duck', '2players', 'party', 'friends'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'Water tag for up to 4 players: one shark, many ducks, every bite makes a new shark.',
    description:
      'Shark Attack Party is a game of tag in the water for 1 to 4 players on one screen. One player starts as the shark and everyone else is a rubber duck. Every bite turns a duck into another shark, so the pool fills with sharks fast. Ducks that stay afloat for 35 seconds share the crown, and if the sharks catch every duck, the first shark wins. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. Hold your corner button to swim the way you are facing and let go to spin in place. Ducks get a splash boost with every new press, so quick taps help them escape. Keyboard players use Z, M, P and Q, or Space when playing alone. A shark that bites a duck turns it into a shark.',
  },
  'sky-flap': {
    title: 'Sky Flap',
    genres: ['Agility', 'Casual'],
    tags: ['bird', 'flying', 'endless', 'skill', 'arcade'],
    kidsFriendly: true,
    short: 'Tap to flap a little bird through glowing neon pillars.',
    description:
      'Sky Flap is a one tap flying game with a neon city skyline. Tap to give a round little bird a quick flap and guide it through the gaps between glowing pillars. Every gap you pass scores a point. The gaps get tighter and faster as you go, and later pillars start sliding up and down. Short, steady taps work best. Beat your best score or take on the daily challenge.',
    instructions:
      'Tap anywhere on the screen to flap. Each tap lifts the bird a little and gravity pulls it back down. On a computer, click or press Space, Enter or the Up arrow. Fly through the gap between each pair of neon pillars to score a point. Touching a pillar or the ground ends the run, so keep your taps short and steady.',
  },
  'sky-hop': {
    title: 'Sky Hop',
    genres: ['Agility', 'Casual'],
    tags: ['jumping', 'platformer', 'endless', 'skill', 'arcade'],
    kidsFriendly: true,
    short: 'Bounce from island to island and climb into the sky.',
    description:
      'Sky Hop is an endless jumping game in the clouds. Your little hopper bounces on its own every time it lands, and you steer it from island to island as you climb higher. Ride springs for a huge boost, collect coins for bonus meters and watch out for crumbling ledges. Fly off one side of the screen and you come back on the other. Fall below the screen and the run is over.',
    instructions:
      'Hold the left or right half of the screen to steer the hopper in the air. It bounces by itself whenever it lands on a platform. With a mouse, hold the button on the left or right half. With a keyboard, use the Left and Right arrows or A and D. Land on platforms to keep climbing, hit springs for a big boost and collect coins for bonus meters.',
  },
  'snow-sumo': {
    title: 'Snow Sumo',
    genres: ['Battle', 'Casual'],
    tags: ['snowball', 'snow', '2players', 'party', 'physics'],
    kidsFriendly: true,
    players: PARTY_PLAYERS,
    short: 'A one-button snowball sumo brawl on a shrinking ice floe for up to 4 players.',
    description:
      'Snow Sumo is a one button sumo brawl on a shrinking ice floe for 1 to 4 players on one screen. You are a snowball with an arrow circling around you. Hold to charge, let go to dash and crash into rivals to knock them into the freezing sea. Snowballs grow as they roll, and every few seconds a ring of ice breaks away. The last snowball on the ice wins. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. While your button is up, an arrow circles your snowball. Hold your corner button to charge and let go to dash the way the arrow points. Keyboard players use Z, M, P and Q, one key each, and Enter or Space to start. Knock rivals off the ice and stay on it yourself.',
  },
  solitaire: {
    title: 'Solitaire',
    genres: ['Cards'],
    tags: ['solitaire', 'klondike', 'classic', 'relaxing', 'logic'],
    kidsFriendly: true,
    short: 'Classic Klondike solitaire with winnable deals, unlimited undo and hints.',
    description:
      'Solitaire is the classic Klondike card game with winnable deals. Build four foundation piles from Ace to King, one per suit, by moving cards between seven tableau columns in alternating colors. Choose Draw 1 for a relaxed game or Draw 3 for a real challenge. Unlimited undo, hints and auto complete help you finish every deal, and a daily deal gives everyone the same cards.',
    instructions:
      'Tap a card to send it to its best spot, or drag cards and stacks between columns. Tap the deck to draw. With a mouse, click or drag and drop. On a keyboard, Space draws, Z undoes, H shows a hint, A auto completes and N deals a new game. Stack cards downward in alternating colors and build each suit from Ace to King.',
  },
  'stack-tower': {
    title: 'Stack Tower Sky',
    siteTitle: 'Stack Tower',
    genres: ['Casual', 'Agility'],
    tags: ['stack', 'tower', 'timing', 'skill', 'arcade'],
    kidsFriendly: true,
    short: 'Drop sliding blocks to build the tallest tower you can.',
    description:
      'Stack Tower Sky is a one tap timing game. A block slides back and forth above your tower and you drop it at the right moment. Whatever hangs over the edge is sliced off, so every miss makes your blocks narrower. Land three perfect drops in a row and your block grows back. The blocks speed up as you climb into the night sky. It takes one tap to learn and a long time to master.',
    instructions:
      'Tap anywhere on the screen to drop the sliding block onto your tower. On a computer, click or press Space, Enter or the Up arrow. Any part of the block that hangs over the edge is cut off. Line up perfect drops to keep your tower wide, and land three in a row to grow your block back. The run ends when a block misses the tower.',
  },
  sudoku: {
    title: 'Sudoku Daily Grid',
    siteTitle: 'Sudoku',
    genres: ['Puzzle'],
    tags: ['sudoku', 'number', 'logic', 'thinking', 'daily'],
    kidsFriendly: true,
    short: 'Fresh Sudoku grids with one unique solution, notes, hints and a daily puzzle.',
    description:
      'Sudoku Daily Grid is a clean number puzzle with fresh grids that each have one unique solution. Fill every empty cell so each row, column and 3x3 box holds the digits 1 to 9 exactly once. Pick Easy, Medium or Hard, pencil in candidates with notes, and use a hint when you are stuck. Three mistakes end the puzzle and your time is your score. A daily puzzle gives everyone the same grid.',
    instructions:
      'Tap a cell, then tap a number on the pad to fill it. Turn on Notes to pencil in candidates and use Erase or Hint when needed. With a keyboard, press 1 to 9 to fill a cell, the arrow keys to move, N for notes, H for a hint and Backspace to erase. Each row, column and 3x3 box must contain every digit once. Three mistakes end the puzzle.',
  },
  'tank-tango': {
    title: 'Tank Tango',
    genres: ['Battle', 'Shooter'],
    tags: ['tank', '2players', 'party', 'arena', 'friends'],
    kidsFriendly: false,
    players: PARTY_PLAYERS,
    short: 'A one-button tank battle for up to 4 players: spin, drive, let go to fire.',
    description:
      'Tank Tango is a one button tank battle for 1 to 4 players on one screen. Your tank spins on the spot until you hold your button, then drives straight ahead. Let go to fire a shell the way you are facing. Shells bounce off walls twice and can hit you on the rebound, so watch the angles. One hit and you are out, and the last tank rolling wins the crown. Bots fill empty seats.',
    instructions:
      'Tap your corner of the screen to join, then press PLAY. While your button is up, your tank spins in place. Hold your corner button to drive forward and let go to fire. You can have two shells in the air at once. Keyboard players use Z, M, P and Q, one key each, and Enter or Space to start. Avoid every shell, including your own.',
  },
  wordy: {
    title: 'Wordy',
    genres: ['Puzzle', 'Educational'],
    tags: ['spelling', 'logic', 'thinking', 'daily', 'relaxing'],
    kidsFriendly: true,
    short: 'Find the hidden five-letter word in six tries. Daily puzzle plus unlimited words.',
    description:
      'Wordy is a word guessing puzzle: find the hidden five letter word in six tries. After every guess the letters change color. Green means the right letter in the right spot, yellow means the letter is in the word but somewhere else, and gray means it is not in the word at all. Play the daily puzzle that everyone shares, or switch to Classic for unlimited words.',
    instructions:
      'Type a real five letter word with the on-screen keyboard and press ENTER to guess. On a computer you can also type on your keyboard, press Enter to guess and Backspace to delete. Green letters are in the right spot, yellow letters are in the word but in another spot, and gray letters are not in the word. Find the word within six guesses.',
  },
  'zig-zag': {
    title: 'Zig Zag',
    genres: ['Agility', 'Casual'],
    tags: ['ball', 'endless', 'reflex', 'skill', 'arcade'],
    kidsFriendly: true,
    short: 'Tap to turn a rolling ball along a crumbling zig zag path.',
    description:
      'Zig Zag is a one tap reflex game on a narrow path in the sky. Your ball rolls along a zig zag path on its own, and you tap to switch between the two diagonals at every corner. The path crumbles behind you and the ball keeps getting faster. Every tile you cross scores a point and gems are worth 3 more. Miss a turn and the ball falls off the edge.',
    instructions:
      'Tap anywhere to start, then tap again to switch the ball between the up left and up right diagonals. On a computer, click or press Space, Enter or the Up arrow, or steer with the Left and Right arrows. Turn at every corner to stay on the path: rolling off the edge ends the run. Collect gems for bonus points.',
  },
};

/** GD title for a slug (falls back to the game's own title). */
export function gdTitle(slug, meta) {
  return LISTING[slug]?.title || meta?.title || slug;
}
