# Retry Arcade - marketing & growth playbook

The product does part of the marketing on its own (challenge links, emoji share grids, embeds, daily
streaks). This playbook drives the first traffic into that loop and keeps it growing.

## The growth loop

```
play → game over → "Challenge a friend" (WhatsApp / X / copy) → friend opens /c/<game>/<score>/<name>
     → sees "Bhargav scored 42. Can you beat it?" → plays → shares back → ...
```

Measure it on `/studio`: **share rate** (shares ÷ runs) × **challenge open rate** (opens ÷ shares) ×
**new player conversion**. Anything above 1.0 new player per share is viral; below that, distribution
channels below keep feeding the loop.

## Channels, in order of speed

### 1. Game portals (week 1, fastest volume)
`npm run export:portals` builds every game with the right SDK.
- **CrazyGames** (developer.crazygames.com): upload zip, basic launch → full launch if metrics are good.
- **GameDistribution** (gamedistribution.com/developers): one upload syndicates to thousands of sites. Create
  each game there first to get its id, then `GD_GAME_IDS='{"slug":"id"}' npm run export:portals -- --portal gamedistribution`.
- **Poki** (developers.poki.com): pitch the 2 strongest games by analytics (they curate; web exclusivity may apply).
- **itch.io, Newgrounds, Game Jolt**: `--portal generic` builds; good for community and backlinks.
Every portal page links back to retryarcade.com where allowed.

### 2. Short-form video (daily, biggest upside)
Satisfying gameplay clips perform on TikTok, YouTube Shorts and Instagram Reels.
- Record with the harness (`npm run harness`, `?game=<slug>`) in a phone-sized window.
- Formats that work: "Can you beat 30?", near-miss compilations, perfect-streak ASMR (Stack Tower, Juicy Drop),
  "Day 1 vs Day 30 of playing", "Only 1% get past level 10", split-screen friend battles.
- 1-3 clips per day, 7-15 seconds, hook in the first second, score on screen, link in bio → daily page.
- Scripts are in `LAUNCH_KIT.md`.

### 3. Communities (week 2 launch)
- Reddit: r/WebGames, r/playmygame, r/IndieGaming, r/incremental_games (only if relevant), r/sudoku,
  r/solitaire, r/2048 (follow each sub's rules, one game per post, answer every comment).
- Hacker News "Show HN" (the zero-dependency engine + daily seeded challenges is the technical angle).
- Product Hunt launch (Tuesday-Thursday, prepared gallery from `public/og/`).
- WhatsApp: seed challenge links in friend/family/college groups (India has massive WhatsApp sharing; the
  share button already prioritizes WhatsApp).
- Discord servers for casual gaming, teacher/classroom communities for Sudoku, Wordy and 2048 (brain games
  are popular with schools; "unblocked games" demand is large, so keep pages lightweight and school-friendly).

### 4. SEO (compounds from month 2-3)
- Each game page already ships unique copy, how-to, tips, FAQ schema, VideoGame schema, OG images, sitemap.
- Target keywords: `solitaire online free`, `klondike solitaire`, `2048 game`, `sudoku online`,
  `block puzzle game`, `snake game`, `fruit merge game`, `word guess game unlimited`, `stack game online`,
  `knife throwing game`, `color switch game online`, `unblocked games`.
- Content plan (1-2 posts/week): "2048 strategy: how to always win", "Sudoku techniques for beginners",
  "Solitaire win rate: is every game winnable?", "Best free browser games 2026". Link each to its game.
- Backlinks: free embeds (`/developers`), portal pages, "play free" listings (e.g. game directories),
  guest posts on teacher/puzzle blogs.
- Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools on launch day.

### 5. Retention (turns traffic into habit)
- Daily Challenges + streaks + XP levels are live. Newsletter capture on the home page: send a weekly
  "new game + tournament" email (Resend / any ESP; export subscribers from `/studio`).
- PWA manifest is live so players can add the arcade to their home screen.

### 6. Paid acquisition (only after unit economics are proven)
Only buy traffic where measured revenue per session exceeds cost per session, and never low-quality traffic
(AdSense bans for invalid traffic are permanent). Start with $10/day tests on the best-performing game, UTM
tagged (`?utm_source=meta&utm_campaign=stack1`), judged on `/studio` sources.

## Weekly rhythm

| Day | Task |
|---|---|
| Mon | Read the insights report (`npm run insights`), pick the top 1-2 improvements |
| Tue-Thu | Ship improvements / new game; 1-3 short videos per day |
| Fri | Community posts, portal submissions, licensing outreach (5 emails) |
| Sun | Newsletter: this week's top scores + new game |

## KPIs

| Metric | Healthy | Where |
|---|---|---|
| Runs per visitor | > 4 | /studio tiles |
| Start rate (loads → first run) | > 75% | games table |
| Share rate | > 3% of runs | games table |
| Challenge open rate | > 30% of shares | tiles |
| Day-1 return | > 15% | retention panel |
| Session RPM | > $6 blended | AdSense ÷ sessions |
