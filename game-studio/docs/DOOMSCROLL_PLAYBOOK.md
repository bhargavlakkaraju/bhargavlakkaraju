# Scroll less. Play more. (Growth playbook)

Retry Arcade is the fun alternative to doom scrolling. Same gesture (swipe), same instant hit
(a round lasts under a minute), but you are playing instead of watching, and with the party
pack you can play with the people next to you. Every card in the feed is a game, not a video.

This playbook says who we are for, where they are, what we post and how we measure it.

## 1. The promise

- **Headline:** Scroll less. Play more.
- **One line:** Swipe through free games like a video feed and play any of them in one tap. No
  download, no sign up, solo or with up to 4 friends on one phone.
- **Proof points we can say (all true today):** starts in one tap, loads in about a second,
  works on any phone or laptop, Daily Arena with the same levels for everyone, party games
  for 1 to 4 players on one screen with a new twist every round.
- **Tone:** a friend handing you something better to do, never a lecture about screen time.
  We do not shame scrolling; we out-fun it.

## 2. Who we are for

| Audience | Moment | What they want | Our hook |
| --- | --- | --- | --- |
| Bored scrollers, 16 to 34 | queue, commute, bed, "5 minute break" | something quick that feels better than scrolling | the Play feed at /play |
| Screen-time cutters | "I keep opening TikTok" | a lighter habit, a clear stopping point | Daily Arena: play today's set, you are done |
| Friends, families, classrooms | party, sofa, class break, sleepover | a game everyone can join in 5 seconds | party pack: one phone, one button each |
| Desk workers | coffee break, Wordle crowd | a daily ritual to share | Wordy, daily puzzles, streaks |

## 3. Where they are and how we reach them (priority order)

### 3.1 Short video: meet them inside the scroll
TikTok, Instagram Reels and YouTube Shorts are the doom scroll itself, so that is where the
message lands hardest. We already have a looping 9:16 gameplay clip for every game
(`/clips/<slug>.mp4`) and Grokbot posts from `/api/social/feed` every day.

Formats that work for this positioning:
1. **"Stop scrolling. Beat this."** A 6 second clip ending on a score. Caption: "Your turn. Link in bio."
2. **"Put the feed down, play a round"**: split screen, phone scrolling vs the game.
3. **Twist card reveal** (party games): "Round 3 twist: LIGHTS OUT" then chaos. Made for
   duets and stitches.
4. **"Me vs 3 bots"** and **"4 of us on one phone"** clips from the party pack.
5. **Daily ritual**: "Today's Arena in 60 seconds", same levels for everyone, compare in comments.
6. **Satisfying loops**: Juicy Drop merges, Block Crush clears, Stack Tower perfects.

Rules: hook in the first second, text on screen, one call to action, link in bio pointing to
`/play?utm_source=<platform>&utm_campaign=profile`. Reply to every comment with a score.

### 3.2 Search: catch people typing their boredom
High-intent queries we should rank for, with the page that answers each:

| Query cluster | Page |
| --- | --- |
| things to do instead of scrolling, stop doom scrolling games | /play (+ a guide page, see section 6) |
| games to play when bored, fun games to play online free | /, /play, /best lists |
| 2 player games on one phone, 4 player games one device, party games to play with friends | /category/party + each party game page |
| games like wordle, daily puzzle games | /games/wordy, /daily |
| free games no download, browser games | / and every game page |

Search Console and Bing (docs/MAC_HANDOFF.md task 4) must be verified first so we can see
which of these start to work.

### 3.3 Communities and launches (one-off spikes that seed the loops)
- **Show HN:** "A TikTok-style feed of tiny browser games (no framework, one file per game)".
- **Product Hunt:** launch the Play feed as the product ("Scroll less. Play more.").
- **Reddit:** r/WebGames and r/incremental_games for single games, r/boardgames and
  r/partygames for the party pack, r/teachers for class-break games. Follow each sub's
  self-promotion rules; post the game, not the brand.
- **itch.io and Newgrounds:** one page per game linking back to retryarcade.com.
- **Portals:** CrazyGames, Poki and GameDistribution builds (scripts/export-portal.mjs) earn
  revenue share and put our name in front of millions of players.

### 3.4 Creators
Seed 20 micro creators (10k to 100k followers) in cozy gaming, study-with-me, productivity
and family content. Give them a challenge link with a score to beat and a party-game
invite for their friends. No payment needed at first; measure with `utm_source=creator-<name>`.

### 3.5 Small paid tests (only after the free loops work)
$5 to $10 a day behind the best organic clip (TikTok Spark Ads or Reels boost), 18 to 34,
interests: mobile games, puzzles. Keep a campaign only if cost per player who finishes a run
stays below the ad revenue that player brings in.

## 4. Turning one visit into a habit

- **Play feed** (`/play`): endless, unplayed games first, one tap to play, one swipe to move on.
- **Add to home screen** prompt after 3 runs: put us where the thumb goes, next to the
  social apps.
- **Daily Arena + streaks:** a finite daily set gives a natural "done for today", which is
  the honest version of a habit and brings people back tomorrow.
- **Challenge links** and **party rematches:** every run and every match can bring a friend.
- **Email:** the daily subscribers list (studio export) for a short "today's Arena" note.

## 5. What we measure (studio dashboard at /studio)

- **North star:** runs per visitor per day.
- **Feed funnel:** feed cards seen, tapped to play (target 25% or more), runs after a tap.
- **Return rate:** "Returning activity by account age" (day 1, day 2 to 3, day 4 to 7).
- **Sources:** referrers (now including "(direct)"), UTM campaigns, the Social posts table
  (Grokbot views and likes joined with the visits and plays each post brought), visitors by
  country and device.
- Crawlers and automated browsers are excluded from these numbers.

**The math behind the revenue goal (rough, check against real ad data once ads run):**
a web games site typically earns about $5 to $15 per 1,000 sessions from display and
between-round ads. $15,000 to $20,000 a month therefore needs roughly 1 to 3 million sessions a
month, about 35,000 to 100,000 a day. Every tactic above is judged by how much it moves that number.

## 6. Next builds that serve this plan

1. A guide page "Things to do instead of doom scrolling" that leads into /play (search).
2. "Party pack" landing page and a "2 player games on one phone" list (search + teachers).
3. A daily "done for today" card in the feed once the Daily Arena is finished.
4. Share a party result as a 9:16 image for Stories.
5. Weekly: review the dashboard and the social table, then adjust the Grokbot feed (more of
   the post kinds and games that bring players, less of the rest).

## 7. What we will not do

No fake notifications, no dark patterns, no ads disguised as games, no invented numbers in
posts. The positioning only works if it stays honest: we are still screen time, just the kind
you would pick on purpose.
