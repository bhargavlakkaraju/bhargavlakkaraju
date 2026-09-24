# ↻ Retry Arcade

**Just one more try.** A game studio in a repo: 15 instant, addictive browser games, the website that
monetizes them, the viral loops that spread them, and the analytics loop that keeps improving them.

- **Games**: zero-dependency HTML5 (Canvas 2D + WebAudio synth), ~7 KB gzipped engine, no assets.
- **Website**: Next.js 14 (React, JavaScript) + Node API routes, SEO-first static pages.
- **Money**: AdSense display + H5 Games interstitial/rewarded ads, portal builds (CrazyGames, Poki,
  GameDistribution), licensing page.
- **Virality**: challenge links with dynamic preview images, emoji share grids, WhatsApp-first sharing,
  free embeds with backlinks, daily seeded challenges, streaks, XP, medals, leaderboards.
- **Autopilot**: first-party analytics, A/B experiments, `/studio` dashboard, weekly insights report.

Docs: [Business plan](docs/BUSINESS_PLAN.md) · [Marketing playbook](docs/MARKETING_PLAYBOOK.md) ·
[Launch kit](docs/LAUNCH_KIT.md) · [Autopilot](docs/AUTOPILOT.md) · [Game contract](src/games/README.md)

## The games

| | Game | Category | Hook |
|---|---|---|---|
| 🧱 | Stack Tower | Arcade | Tap to drop; perfect stacks grow your block back |
| 🐤 | Sky Flap | Arcade | One-tap flyer through neon pillars, near-miss combos |
| 🗡️ | Blade Spin | Arcade | Throw blades into a spinning log; boss every 5th stage |
| 🔵 | Color Rush | Arcade | Hop through spinning obstacles, only on your color |
| 🔷 | Zig Zag | Arcade | Tap to turn on a crumbling path |
| ☁️ | Sky Hop | Arcade | Endless vertical platform jumper |
| 🐥 | Road Hopper | Arcade | Hop across roads, rivers and rails |
| 🟪 | Brick Barrage | Arcade | Aim a volley of balls at numbered bricks |
| 🍉 | Juicy Drop | Puzzle | Drop and merge fruit up to a watermelon (real physics) |
| 💎 | Block Crush | Puzzle | 8×8 block puzzle with combo clears |
| 🔢 | 2048 | Puzzle | The classic sliding merge; revive rewinds 3 moves |
| 🧩 | Sudoku | Puzzle | Unique-solution puzzles, 3 difficulties, daily |
| 🐍 | Neon Snake | Classic | Smooth neon snake with golden orbs and combos |
| 🃏 | Solitaire | Classic | Klondike, draw 1 or 3, every deal solver-verified winnable |
| 🟩 | Wordy | Word | Daily 5-letter word + unlimited mode, emoji share grid |

## Quick start

```bash
cd game-studio
npm install
npm run dev            # http://localhost:3000   (generates the game registry first)
npm run harness        # http://localhost:5173/harness/?game=stack-tower  (single game, no Next.js)
```

Useful URL flags: `?ads=dev` simulates interstitial/rewarded ads, `?mode=daily` opens the Daily Challenge,
`?exp_share_cta=share` forces an A/B variant.

## Scripts

| Command | What it does |
|---|---|
| `npm run build` / `npm start` | production build / server |
| `npm run smoke [slug...]` | headless test of every game: errors, lifecycle, daily mode, cover; screenshots in `.smoke/` |
| `node scripts/e2e.mjs` | end-to-end website test against a running server (`BASE_URL`, `STUDIO_TOKEN`) |
| `npm run thumbs` | render `public/covers/*`, `public/og/*` and icons from each game's `cover()` |
| `npm run export:portals` | standalone builds + zips for CrazyGames / Poki / GameDistribution / generic in `dist/portals/` |
| `npm run insights` | weekly analytics report with ranked recommendations (`SITE_URL`, `STUDIO_TOKEN`) |

## Architecture

```
src/
  games/                 zero-dependency ES modules (portable to any host)
    engine/              core loop, input, fx/juice, synth audio, seeded rng, ad/portal adapters, DOM shell
    <slug>/index.js      createGame(api) + cover()
    <slug>/meta.js       SEO copy, controls, medals, sizes
  app/(site)/            home, /games/[slug], /c/[slug]/[score]/[name] (challenge links), /daily,
                         /leaderboards, /category/[cat], /profile, about/privacy/terms/contact/developers
  app/(bare)/            /embed/[slug] (iframe player), /studio (analytics dashboard)
  app/api/               events, leaderboard, subscribe, stats, og (dynamic share images)
  components/GamePlayer  mounts the engine; game-over panel, continue, share, leaderboard, XP
  lib/                   registry, player progression, analytics, experiments, ads pacing, store
```

**Data**: Upstash Redis / Vercel KV over REST when `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set; otherwise an
in-memory Redis emulation (persisted to `.data/` in dev). Leaderboards are sorted sets, analytics are daily
hash counters + HyperLogLogs, so costs stay near zero at scale.

## Deploy (Vercel)

1. Import the GitHub repo in Vercel and set **Root Directory = `game-studio`** (the repo root holds another app).
2. Add the Upstash Redis integration (Vercel Marketplace), which sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
3. Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://retryarcade.com`) and a long random `STUDIO_TOKEN`.
4. Deploy, add the domain, submit `https://<domain>/sitemap.xml` to Google Search Console.

## Turn on the money

1. **AdSense**: apply with the live domain (privacy, terms, about and contact pages are already there). After
   approval set `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…` → `ads.txt` is generated automatically.
2. **H5 Games Ads** (interstitial + rewarded): request access in AdSense; use `NEXT_PUBLIC_ADS_TEST=1` until it's
   approved. The "Continue (watch ad)" button only appears when a rewarded ad is actually available.
3. **Display units**: create 4 responsive units and set the `NEXT_PUBLIC_AD_SLOT_*` ids.
4. **Consent**: enable Google's "Privacy & messaging" CMP in AdSense for EEA/UK/CH traffic.
5. **Portals**: `npm run export:portals`, then upload the zips (see the marketing playbook).

## Add a game

Create `src/games/<slug>/index.js` + `meta.js` following [the contract](src/games/README.md), then:

```bash
npm run smoke <slug> && npm run thumbs <slug> && npm run build
```

The registry, sitemap, category pages, daily rotation, leaderboards and portal exports pick it up automatically.
