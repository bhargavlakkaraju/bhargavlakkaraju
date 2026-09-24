# Studio autopilot - how Retry Arcade keeps improving itself

The studio is instrumented so an agent (or a person) can improve it every week from real data, with no
guesswork:

1. **Measure** - every page view, run, restart, continue, share and ad is counted per game and per A/B variant
   (`/api/events` → Redis). `/studio` shows it; `/api/stats` exposes it as JSON.
2. **Diagnose** - `npm run insights` turns the numbers into a ranked list of concrete actions
   (weak first impression, low replay, ignored continues, viral outliers, finished experiments, retention).
3. **Act** - implement the top action, verify with `npm run smoke` and `node scripts/e2e.mjs`, open a PR.
4. **Experiment** - add or conclude A/B tests in `src/lib/experiments.js` (e.g. share CTA wording, interstitial
   pacing, "try next" suggestions). Variants are sticky per visitor and compared on the dashboard.
5. **Expand** - once a month, build a new game (drop a folder in `src/games/`, see `src/games/README.md`) that
   reuses the mechanic with the best runs-per-player, then `npm run thumbs` and redeploy. Daily Challenges,
   Game of the Day and the sitemap update themselves.

## Scheduled agent (Claude Code routine)

Once the site is live with `STUDIO_TOKEN` set, schedule a weekly Claude Code session (claude.ai/code →
Routines, or ask Claude to create one) in this repository with this prompt:

> You are the Retry Arcade studio autopilot. In `game-studio/`: run
> `SITE_URL=<prod url> STUDIO_TOKEN=<token> npm run insights -- --days 7 --out docs/reports`.
> Pick the single highest-impact recommendation that can be shipped safely this week (a game tuning change,
> a UX change on the game-over panel, concluding an experiment, or a new SEO section). Implement it on a new
> branch, run `npm run build`, `npm run smoke`, and the e2e script against `npm start`, then open a PR that
> explains the metric it targets and how we will know it worked next week. On the first week of each month,
> instead build one new game following `src/games/README.md`, based on the best-performing mechanic.

The routine needs the production URL and `STUDIO_TOKEN` (store them as environment secrets, never in the prompt
or repo).

## What "better" means (north-star metrics)

| Metric | Why it matters |
|---|---|
| Runs per player | the "one more try" signal; drives ad impressions |
| Share rate × challenge open rate | virality (free growth) |
| Day-1 / day-7 return | habit; compounds everything else |
| Session RPM | monetization efficiency (from AdSense ÷ sessions) |
