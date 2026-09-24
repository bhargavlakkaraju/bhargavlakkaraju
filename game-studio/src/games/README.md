# Retry Arcade game contract

Every game is a **zero-dependency ES module folder** under `src/games/<slug>/`:

```
src/games/<slug>/
  index.js   default export createGame(api) + named export cover(g, w, h)
  meta.js    default export: metadata used by the website (SEO, cards, rules)
  *.js       optional extra modules (e.g. words.js), relative imports with ".js" extension
```

Rules that keep games portable (website, dev harness, and standalone builds for
CrazyGames / Poki / GameDistribution):

- Only import from `../engine/*.js` or files inside your own folder. **No npm packages,
  no network requests, no image/audio files.** Draw everything with Canvas 2D; sounds
  come from `api.sfx`.
- No top-level access to `window`/`document` (modules are imported during server rendering).
- Use `api.rng` (seeded) for **everything that affects gameplay** so the Daily Challenge
  gives every player the same run. `Math.random` is fine for purely cosmetic effects.
- Persist small things with `api.store.get/set` (namespaced localStorage), never raw localStorage.

Reference implementation: `src/games/stack-tower/`.

## `createGame(api)` returns

```js
{
  reset(),            // start a fresh run (called once before the first run and before every restart)
  update(dt),         // seconds (clamped to 0.05); only called while state === 'playing'
  idle(dt),           // optional: called when NOT playing (ready / over) for ambient animation
  render(g),          // always called every frame; draw in logical coords 0..meta.width x 0..meta.height
  input(e),           // e.type: 'down' | 'move' | 'up' (e.x, e.y logical coords, e.id pointer id,
                      //         e.pressed on move) | 'keydown' | 'keyup' (e.key, e.code, e.repeat)
                      // return true if handled (prevents page scroll for keys)
  revive(),           // optional: continue the current run after a rewarded ad (give the player a safe restart point)
  hud: false,         // optional: set false to hide the engine's big centered score (draw your own)
  forwardStartInput: true, // optional: the tap that starts the run is also passed to input()
  destroy(),          // optional cleanup
}
```

The engine clears the canvas with `meta.bg` each frame, applies screen shake, calls
`render`, then draws particles/floating text, the score HUD (top center, y≈64: keep that
area readable) and the "TAP TO PLAY" prompt while in the `ready` state.

## Lifecycle

`ready` → (tap / Space / Enter / arrows) → `playing` → `api.gameOver()` → `over` → host shows the
game-over panel → `restart()` (new run, back to `ready`) or `revive()` (same run, back to `ready`).

`meta.startMode: 'immediate'` skips `ready` (use for puzzles like 2048, Sudoku, Solitaire, word games).

## `api`

| member | purpose |
| --- | --- |
| `width`, `height` | logical size (from meta) |
| `mode`, `daily` | `'classic'` or `'daily'`; `daily` is true on the Daily Challenge |
| `rng()` | seeded 0..1; also `rng.int(a,b)` inclusive, `rng.range(a,b)`, `rng.pick(arr)`, `rng.chance(p)`, `rng.shuffle(arr)`, `rng.sign()` |
| `score`, `setScore(n)`, `addScore(n=1)` | the run's score (HUD pops on change) |
| `best` | best score for this game+mode (null if none) |
| `time` | seconds elapsed in the current run |
| `state` | `'ready' | 'playing' | 'over'` |
| `gameOver({ win?, delay?, stats? })` | end the run. `delay` ms (default 750) before the panel shows, so death effects can play. `win: true/false` for puzzles |
| `sfx.play(name)` | `tap click jump flap score coin pop place hit whoosh die error perfect win levelup merge swipe` |
| `sfx.combo(n)` | rising-pitch blip for streaks |
| `sfx.tone({freq,to,type,dur,vol,delay})`, `sfx.noise({...})` | custom synth sounds |
| `fx.burst(x,y,{count,color,colors,speed,angle,spread,size,life,gravity,shape})` | particles (`shape`: circle/square/spark) |
| `fx.confetti(x,y,count)` | celebration |
| `fx.text(x,y,str,{color,size,life,rise})` | floating text ("+1", "PERFECT!") |
| `fx.ring(x,y,{color,radius,life,width})` | shockwave ring |
| `fx.shake(mag,dur)`, `fx.flash(color,alpha)` | screen shake / flash |
| `fx.tween(obj, {prop: to}, dur, ease.outBack, onDone)` | tween numbers |
| `ease.*` | linear, inQuad, outQuad, inOutQuad, outCubic, inCubic, outBack, outElastic, outBounce |
| `draw.*` | `roundRect(g,x,y,w,h,r,fill,stroke)`, `circle(g,x,y,r,fill,stroke)`, `text(g,str,x,y,{size,color,align,weight,shadow,stroke,maxWidth,alpha})`, `font(size,weight)`, `hsl(h,s,l,a)`, `rgba(hex,a)`, `shade(hex,amt)`, `lerp`, `clamp`, `dist`, `linearGradient` |
| `haptic(ms)` | vibration on mobile |
| `isTapKey(key)` | Space / Enter / ArrowUp / W |
| `store.get(k, def)`, `store.set(k, v)` | per-game persistence |
| `emit(name, data)` | custom analytics event (e.g. `milestone`) |
| `happy()` | tell portals a celebration happened (new best, big combo) |
| `target` | challenge score to beat when opened from a friend's share link (engine shows it) |

## `meta.js`

```js
export default {
  slug: 'stack-tower',            // folder name, kebab-case
  title: 'Stack Tower',
  tagline: 'Tap. Stack. Don’t miss.',      // <= 40 chars, punchy
  description: '...',             // 120-160 chars, SEO meta description, includes "free" + "browser"/"online"
  category: 'arcade',             // 'arcade' | 'puzzle' | 'classic' | 'word'
  tags: ['one-tap', 'timing'],
  emoji: '🧱',
  colors: ['#ff3d7f', '#ffd23f'], // two accent colors for cards/gradients
  bg: '#1a1036',                  // canvas clear color
  width: 420, height: 740,        // logical resolution. Portrait 420x740 for arcade; puzzles may use e.g. 480x720
  startMode: 'tap',               // or 'immediate'
  readyY: 0.3,                    // optional: vertical position (0..1) of the TAP TO PLAY prompt
  revive: true,                   // supports revive() continue
  daily: true,                    // supports seeded Daily Challenge
  lowerIsBetter: false,           // true when score is time/moves/guesses (lower wins)
  formatScore: undefined,         // optional (v) => string, e.g. seconds -> "2:05"
  medals: [15, 35, 60],           // bronze/silver/gold thresholds (reverse order is fine if lowerIsBetter)
  maxScore: 2000,                 // sanity cap for leaderboard submissions
  scoreLabel: 'Floors',
  controls: { touch: '...', mouse: '...', keyboard: '...' },
  howTo: ['...', '...'],          // 3-5 short steps
  tips: ['...'],                  // 3 tips
  faq: [{ q: '...', a: '...' }],  // 3 Q&As, SEO friendly
  about: '...',                   // 80-140 word paragraph for the game page (SEO)
  released: '2026-09-24',
};
```

## `cover(g, w, h)`

Named export that paints an attractive, text-free key-art illustration of the game into any
size (thumbnails are rendered at 800x600 and 1200x630). Fill the whole canvas.

## Testing

```
npm run harness                           # http://localhost:5173/harness/?game=<slug>
node scripts/smoke.mjs <slug> --seconds 8 # headless: errors, lifecycle, screenshots in .smoke/
```

Harness URL options: `&mode=daily`, `&ads=dev` (simulated ads), `&cover=1&w=800&h=600`, `&target=20`.

## Quality bar ("one more try")

- Understandable in 2 seconds, controllable with one finger, first death within ~10-30s for arcade games.
- Instant feedback on every action: sound + particles + motion. Juice matters more than features.
- Difficulty ramps smoothly; near-misses and streaks are celebrated.
- Deaths feel fair and are readable (a brief shake/flash, the cause is visible).
- 60fps on a mid-range phone: avoid per-frame allocations in hot loops, cap particle counts.
