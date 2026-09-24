# Retry Arcade - business plan

**Studio:** Retry Arcade · **Domain:** retryarcade.com (available at time of writing) · **Tagline:** *Just one more try.*
**Goal:** $15,000-$20,000 profit per month from a catalog of 15+ instant, addictive browser games.

## 1. The bet

Casual web games are a large, evergreen market: players search for "solitaire", "2048", "block puzzle",
"sudoku", "snake game" millions of times a month, and portals like CrazyGames and Poki serve tens of millions
of players monthly. Winning requires three things we built into the product from day one:

1. **Games people replay** - one-finger controls, instant restart, juice on every action, medals, streaks and a
   seeded Daily Challenge that gives a reason to return every day.
2. **Games that spread themselves** - every result becomes a challenge link with a custom preview image
   ("Bhargav scored 42 in Stack Tower. Can you beat it?"), emoji share grids, free embeds with a backlink.
3. **Many revenue outlets for the same code** - our own site (ads), game portals (revenue share),
   licensing/white-label, all from one zero-dependency engine.

## 2. Catalog strategy (15 games)

| Role | Games | Why |
|---|---|---|
| Viral one-tap arcade | Stack Tower, Sky Flap, Blade Spin, Color Rush, Zig Zag, Sky Hop, Road Hopper, Brick Barrage | Short runs (30-90s) = many game-over moments = many ad + share opportunities. Great TikTok/Shorts material. |
| Sticky puzzles | Juicy Drop, Block Crush, 2048 | Long sessions, top of mobile charts, strong search demand. |
| Evergreen search magnets | Solitaire, Sudoku, Neon Snake, Wordy | Huge monthly search volume, older audiences with high ad value, daily habit. |

New games are added monthly based on analytics (see `AUTOPILOT.md`): double down on the mechanics with the
best runs-per-player and share rate.

## 3. Revenue streams

| Stream | How it works in the product | Setup needed |
|---|---|---|
| **Display ads** (AdSense) | Side rail, below-game and home placements (`AdSlot`), outside the game frame | AdSense approval, slot ids in env |
| **Interstitials** (AdSense H5 Games Ads) | Between runs, paced (every 3-4 restarts, min 60s gap, A/B tested) | H5 Games Ads access in AdSense |
| **Rewarded ads** | "Continue (watch ad)" on game over, once per run. Highest eCPM format | Same as above |
| **Portal revenue share** | `npm run export:portals` builds each game with the CrazyGames / Poki / GameDistribution SDK already wired | Developer accounts + submissions |
| **Licensing & reskins** | Non-exclusive licenses to other sites/apps, branded versions for campaigns (`/developers` page) | Outreach |
| Later: premium | Ad-free supporter pass, cosmetic skins | Stripe |

## 4. Unit economics (planning assumptions, not guarantees)

Web game ad revenue is usually measured as revenue per 1,000 sessions. With 2-3 interstitials, rewarded
continues and display ads, a reasonable blended planning range is **$4-12 per 1,000 sessions** for a global
traffic mix (US/UK/CA/AU traffic pays several times more than India/SEA traffic).

**What $15-20k/month requires:**

| Scenario (month 9-12) | Sessions / month | Session RPM | Own-site revenue | Portals | Licensing | Total |
|---|---:|---:|---:|---:|---:|---:|
| Conservative | 900k | $6 | $5,400 | $3,000 | $1,500 | ~$9,900 |
| Target | 1.5M | $8 | $12,000 | $4,500 | $2,500 | ~$19,000 |
| Upside (one hit game) | 3M | $9 | $27,000 | $10,000+ | $3,000 | $40,000+ |

**Costs** stay tiny: Vercel Pro ($20/mo), Upstash Redis (free to ~$30/mo), domain (~$12/yr). No asset
licensing, no servers to babysit. **Profit ≈ revenue minus a few hundred dollars** until we choose to buy
traffic. At target, 1.5M sessions/month is about **50,000 sessions/day**.

Honest timeline: month 1 revenue will be close to zero (AdSense review, portal QA, SEO indexing). Portals and
social content are the fastest levers; SEO compounds from month 3-6. The dashboard (`/studio`) and weekly
insights report tell us early whether we are on track.

## 5. Milestones

| When | Milestone | KPI |
|---|---|---|
| Week 1 | Deploy to retryarcade.com, apply to AdSense, submit 5 games to CrazyGames + GameDistribution | Site live, 0 errors |
| Week 2-4 | Launch posts (Reddit, HN, Product Hunt), daily TikTok/Shorts clips, WhatsApp seeding | 1k DAU, 3+ runs/visitor |
| Month 2 | AdSense + H5 ads live, Poki pitch for the top 2 games, first licensing emails | $10+ session RPM in Tier-1 |
| Month 3 | 20 games, SEO articles for evergreen games, weekly tournaments via newsletter | 5k DAU |
| Month 6 | One portal "featured" game, 25 games | 20k DAU, ~$6k/mo |
| Month 9-12 | Scale winners, reskins/licensing deals | 50k DAU, $15-20k/mo |

## 6. Risks and mitigations

- **AdSense rejection or limits** → Privacy/terms/about/contact pages are in place; ads never overlap games;
  no incentivized clicks. Fallbacks: portals' own ad systems, Ezoic/AdinPlay/Venatus once traffic grows.
- **Invalid traffic** → never buy junk traffic to pump ad impressions; paid UA only where measured RPM > CPC.
- **Clones and competition** → speed of shipping + daily challenges + community (leaderboards, streaks).
- **Trademarks** → original names and art only (no "Flappy", "Wordle", "Suika", "Block Blast" in titles).
- **Player wellbeing** → "addictive" means great feel and fair challenge. No loot boxes, gambling mechanics,
  fake timers or deceptive ads; this also protects ad-network standing.
