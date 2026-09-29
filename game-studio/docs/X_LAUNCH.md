# X launch: "an AI built this arcade in 4 days"

Goal: first real players. Angle: the build story is true, unusual and easy to share. Every
number below comes from the repository history (first commit 2026-09-24, 21 games live
2026-09-28, about 26,000 lines of game code, a 2,300 line engine with zero dependencies).
Never inflate them.

## 1. Accounts

| Account | Who posts | Purpose |
| --- | --- | --- |
| **@retryarcade** (new brand account) | Grokbot, from `/api/social/feed` | Daily posts, clips, replies to players. Bio link: `https://retryarcade.com/?utm_source=x&utm_medium=social&utm_campaign=profile` |
| **Your personal X** | You | The founder voice. Quote-post the launch thread and the best clips. Founder posts get far more reach than a new brand account with 0 followers. |

Setup notes for @retryarcade: sign up with `hello@retryarcade.com` (see email setup in
docs/MAC_HANDOFF.md), use the avatar and banner from `public/brand/`, bio from
docs/SOCIAL_KIT.md. Because Grokbot posts automatically, turn on X's **Automated account**
label (Settings > Your account > Account information > Automation) and link it to your personal
account. That label is required by X's rules for bot-run accounts and protects the account.

## 2. Day 1: the launch thread

Posted by @retryarcade (Grokbot does it from the feed's `thread.x`), then quote-posted by you
with one personal line, for example "I gave an AI a brief and it built this. Every line of code."
Attach `public/social/launch-trailer.mp4` to the first post.

1. We gave an AI one brief: build games people would rather play than doom scroll. 4 days later, 21 games are live. Every line of code written by AI. A thread on how it went 🧵
2. Day 1: it wrote a tiny game engine from scratch (no frameworks, zero dependencies) and a first game. Then it split into parallel helper agents that built 14 more.
3. Day 2: the website. Instant play, daily challenges, leaderboards, streaks, share cards, SEO. Then the domain went live.
4. Day 3: it could not film its own games, so it taught every game to play itself and recorded the trailers. That is where these clips come from.
5. Day 4: a party pack. 6 games for 1 to 4 players on one phone, one button each, bots in empty seats, and a random twist card every round.
6. The human part: picking the goal, giving feedback on screenshots, buying the domain and saying "ship it". Everything is free, no download. Judge the AI yourself: (link)

Tip: X shows posts with outside links to fewer people. The thread puts the link only in the
last post; single posts from the feed keep it at the end.

## 3. Days 2 to 14

The feed publishes one build-story post a day at 14:30 UTC (8 pm in India, morning in the US)
for two weeks, on top of the normal daily posts. Preview any day:
`https://retryarcade.com/api/social/feed?day=YYYY-MM-DD&platform=x` (kind `launch`).
Topics: trailers made by the games themselves, the Color Rush bug the AI caught, parallel
helper agents, the zero-dependency engine, a score challenge, "what should the AI build next",
twist cards, the swipe feed, the numbers, Hole Party, AI-written daily posts, Shark Attack and a
two-week wrap-up.

## 4. Getting in front of people (without spam)

Do:
- **Reply with value in relevant conversations**: people asking what AI can build, "what are
  you playing", boredom and doom-scrolling threads, indie game and build-in-public threads.
  Answer the question first, mention Retry Arcade only when it genuinely answers it.
- **Tag only when it is about them**: the build thread can tag the AI maker (@AnthropicAI,
  @claudeai) because the story is about their tool. A clip can tag a friend you are
  challenging. Creators who share a score can be thanked and reposted.
- **Quote-post, do not just repost**: add one line ("Beat this: 1,032 in Block Crush").
- **Post at the same times daily** and reply to every comment in the first hour.
- **Communities**: X Communities for indie games, game dev, AI builders and build in public
  (post the thread there once, follow each community's rules).

Do not:
- Tag or @mention accounts in posts that have nothing to do with them, or paste the link
  under other people's posts. X treats that as spam ("unsolicited mentions" / "reply spam")
  and new accounts get limited or suspended quickly.
- Run the same reply on many posts, use follow/unfollow tricks or buy engagement.
- Claim anything the numbers do not support.

## 5. Measure

- Studio dashboard (`/studio`): referrers (x.com and t.co), UTM campaign `launch`, the Social
  posts table (views and likes Grokbot reports, joined with visits and plays each post brought).
- Success for week 1: people arriving from X who play at least one game; a thread that people
  quote. Then double down on the post kinds that bring players.
