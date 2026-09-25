# Retry Arcade social launch kit

Everything you need to open 9 social accounts in about 90 minutes total and run the first 30 days.
All images are already made. All copy is ready to paste.

**Read this first**

- `{SITE}` in this doc means `https://retryarcade.com`. Until that domain is bought and connected, use
  `https://retryarcade.vercel.app` instead (search and replace `{SITE}` in whatever you copy).
- Bios below say `retryarcade.com`. If the domain is not live yet, swap it for `retryarcade.vercel.app`
  (every bio below still fits its limit with the longer domain; each was checked).
- Images that print the domain (posts footer, carousel slides 4 and 5, the X launch card) can be re-rendered in
  seconds: `node scripts/brand/render.mjs --domain=retryarcade.vercel.app` (see the last section).
- Use one dedicated email (for example a new Gmail used only for Retry Arcade), a password manager and
  two-factor authentication on every account. Write every login into the password manager as you go.

## Asset map: which file goes where

| File | Size | Use it for |
|---|---|---|
| `public/brand/avatar-1080.png` | 1080x1080 | Profile picture on every platform (safe inside a circle crop), LinkedIn/Facebook/Discord/YouTube icon |
| `public/brand/logo-mark-1024.png` | 1024x1024, transparent corners | App-style icon, press, Discord emoji source |
| `public/brand/logo-mark-400.png` | 400x400, transparent corners | YouTube video watermark, Instagram Highlight covers, small icon uses |
| `public/brand/logo-wordmark.png` | 1623x354, transparent | Logo on dark backgrounds (white "RETRY" is invisible on white) |
| `public/brand/logo-wordmark-dark.png` | 1600x480 | Logo anywhere, including light backgrounds (press kits, decks) |
| `public/brand/banner-x-1500x500.jpg` | 1500x500 | X header |
| `public/brand/banner-linkedin-company-1128x191.jpg` | 1128x191 | LinkedIn Company Page cover |
| `public/brand/banner-linkedin-1584x396.jpg` | 1584x396 | Founder's personal LinkedIn background, Reddit profile banner |
| `public/brand/banner-youtube-2560x1440.jpg` | 2560x1440 | YouTube banner (key content inside the 1546x423 safe area) |
| `public/brand/cover-facebook-1640x624.jpg` | 1640x624 | Facebook Page cover |
| `public/brand/banner-discord-960x540.jpg` | 960x540 | Discord server banner / invite background / #welcome image, Pinterest profile cover |
| `marketing/social/launch-carousel-1..5-1080x1350.jpg` | 1080x1350 x5 | Launch carousel for Instagram and Facebook |
| `marketing/social/launch-carousel-linkedin.pdf` | 5 pages | The same carousel as a LinkedIn document post |
| `marketing/social/x-launch-1200x675.jpg` | 1200x675 | Image for the X launch post |
| `marketing/social/posts/<game>-1080x1350.jpg` | 1080x1350 x15 | One portrait post per game (Instagram, Facebook, LinkedIn, Pinterest, X) |
| `marketing/social/stories/<game>-1080x1920.jpg` | 1080x1920 x6 | Stories, and covers for Reels / TikTok / Shorts (Stack Tower, Juicy Drop, Block Crush, Blade Spin, Color Rush, Sky Flap) |
| `marketing/social/contact-sheet.jpg` | overview | Everything on one page, for a quick review |

Platform UI was checked on every banner: text and key art stay out of the X / LinkedIn avatar zone (bottom left),
out of the LinkedIn company logo zone, inside the YouTube safe area, and inside the center crop Facebook uses on phones.
Stories keep text between the Instagram top bar and reply bar and away from TikTok's right-hand buttons.

## 1. Handle plan

Use the same handle everywhere. Try them in this order and take the first one that is free on **all** platforms
(check X first, it has the shortest limit):

| Priority | Handle | Notes |
|---|---|---|
| 1st choice | `@retryarcade` | 11 characters, fits every platform |
| Fallback 1 | `@playretryarcade` | 15 characters: exactly X's maximum, fits everywhere |
| Fallback 2 | `@retryarcadegames` | 17 characters: fits Instagram, TikTok, YouTube, Pinterest, Reddit, Facebook. On X (15 max) use `@retry_arcade` instead |

Display name everywhere: **Retry Arcade**. On Instagram and TikTok the name field is searchable, so use
**Retry Arcade | Free Games** there (25 characters).

Reddit usernames can never be changed, so double-check the spelling before you confirm `u/retryarcade`.

## 2. Profile links with UTM tags

Put these in each platform's website / link field (the site already records `utm_source`, so you will see which
platform sends players):

| Platform | Link-in-bio URL |
|---|---|
| X | `{SITE}/?utm_source=x&utm_medium=social&utm_campaign=profile` |
| Instagram | `{SITE}/?utm_source=instagram&utm_medium=social&utm_campaign=profile` |
| TikTok | `{SITE}/?utm_source=tiktok&utm_medium=social&utm_campaign=profile` |
| YouTube | `{SITE}/?utm_source=youtube&utm_medium=social&utm_campaign=profile` |
| LinkedIn | `{SITE}/?utm_source=linkedin&utm_medium=social&utm_campaign=profile` |
| Facebook | `{SITE}/?utm_source=facebook&utm_medium=social&utm_campaign=profile` |
| Reddit | `{SITE}/?utm_source=reddit&utm_medium=social&utm_campaign=profile` |
| Pinterest | `{SITE}/?utm_source=pinterest&utm_medium=social&utm_campaign=profile` |
| Discord | `{SITE}/?utm_source=discord&utm_medium=social&utm_campaign=profile` |

For individual posts, change `utm_campaign` (for example `launch`, `pin_stack-tower`, `story_sky-flap`) and point
the link at the game itself: `{SITE}/games/<game>?utm_source=...`. Game slugs: `stack-tower`, `juicy-drop`,
`block-crush`, `blade-spin`, `color-rush`, `sky-flap`, `merge-2048`, `road-hopper`, `neon-snake`, `brick-barrage`,
`sky-hop`, `zig-zag`, `sudoku`, `solitaire`, `wordy`.

**Challenge links** make great story links: `{SITE}/c/<game>/<score>/RetryArcade` opens the game with
"RetryArcade scored N. Can you beat it?". Example: `{SITE}/c/sky-flap/30/RetryArcade?utm_source=instagram&utm_medium=social&utm_campaign=story_sky-flap`.

## 3. Setup checklists (about 10 minutes each)

### X (Twitter)

1. Sign up at x.com with the brand email. Username: `retryarcade`.
2. Edit profile:
   - **Photo:** `public/brand/avatar-1080.png`
   - **Header:** `public/brand/banner-x-1500x500.jpg` (the avatar covers the bottom left; the banner is designed around it)
   - **Name:** `Retry Arcade`
   - **Bio** (137 / 160 characters):
     ```
     15 free games you can play in 1 second. No download, no sign-up. Daily challenges and leaderboards. Just one more try. ↻ retryarcade.com
     ```
   - **Location:** `Your browser`
   - **Website:** `{SITE}/?utm_source=x&utm_medium=social&utm_campaign=profile`
   - **Birth date:** required by X. Use your own and set its visibility to "Only you".
3. Switch to a free Professional account (Profile > Edit profile > Switch to professional). Type: Business.
   Category: search "game" and pick **Video Game** (or the closest gaming category).
4. Turn on two-factor authentication.
5. **Pin:** the first post of the launch thread (section 4).
6. Follow 20 to 30 relevant accounts (indie game devs, browser game curators, puzzle accounts) so the feed is not empty.

### Instagram (free Creator account)

1. Sign up with the brand email. Username: `retryarcade`. Name: `Retry Arcade | Free Games`.
2. Settings > Account type and tools > **Switch to professional account > Creator**.
   Creator is free, gives Insights and contact buttons, and keeps the full Reels music library
   (Business accounts get a more limited library). Category: search "game" and pick **Video Game**
   (or "Games/Toys" or "Website" if that is not offered). Turn on "Display category".
3. Edit profile:
   - **Photo:** `public/brand/avatar-1080.png`
   - **Bio** (132 / 150 characters):
     ```
     🕹️ 15 free games, play in 1 second
     📅 New daily challenge every day
     ⚔️ Beat a score, dare a friend
     👇 Play free: retryarcade.com
     ```
   - **Links > Add external link:** URL `{SITE}/?utm_source=instagram&utm_medium=social&utm_campaign=profile`, title `Play free`
4. Link the account to the Facebook Page once it exists (Accounts Center), so you can cross-post Reels.
5. **Story Highlights:** create "Play", "Daily", "Champions" with `public/brand/logo-mark-400.png` as the cover.
6. **Pin (up to 3):** the launch carousel, your best-performing Reel, and the latest "Champion of the week".
7. The profile grid shows posts cropped to 3:4. All 1080x1350 posts keep their content inside that crop.

### TikTok

1. Sign up with the brand email. Username: `retryarcade`. Name: `Retry Arcade | Free Games`.
2. Settings and privacy > Account > **Switch to Business Account**, category: the closest gaming category ("Games").
   - Why: Business accounts can add a clickable website link without waiting for 1,000 followers (availability varies
     by country) and get analytics.
   - Trade-off: Business accounts can only use the Commercial Music Library. That is fine for us: the games have their
     own original sound effects (all synthesized in code), and the library has plenty of upbeat tracks.
     If you would rather use trending sounds, stay a Personal account and add the link once you reach 1,000 followers.
3. Edit profile:
   - **Photo:** `public/brand/avatar-1080.png`
   - **Bio** (64 / 80 characters):
     ```
     15 free games. 1 second to play, no download. retryarcade.com 👇
     ```
   - **Website:** `{SITE}/?utm_source=tiktok&utm_medium=social&utm_campaign=profile`
4. For the six games with a story file, upload `marketing/social/stories/<game>-1080x1920.jpg` as the video cover
   (Edit cover > Upload, where available) or use it as the last frame of the clip.
5. **Pin (up to 3 videos):** the "15 games in 15 seconds" trailer (clip C1), your best performer, and the latest
   "Can you beat...?" challenge clip.

### YouTube (Shorts)

1. Sign in with the brand Google account, open YouTube > Create a channel. Name: `Retry Arcade`. Handle: `@retryarcade`.
   (If you want others to help later, create it as a Brand Account so you can add managers.)
2. YouTube Studio > Customization > **Branding**:
   - **Picture:** `public/brand/avatar-1080.png`
   - **Banner:** `public/brand/banner-youtube-2560x1440.jpg` (everything important sits inside the safe area shown on phones)
   - **Video watermark:** `public/brand/logo-mark-400.png`, display "Entire video"
3. Customization > **Basic info**:
   - **Description** (694 / 1,000 characters):
     ```
     Retry Arcade makes free games you can play in 1 second, right in your browser. No download, no sign-up.

     15 original games and counting: one-tap arcade games like Stack Tower, Sky Flap, Blade Spin and Color Rush, relaxing puzzles like Juicy Drop, Block Crush, 2048 and Sudoku, plus Solitaire, Neon Snake and the daily Wordy.

     On this channel: satisfying runs, near misses, perfect streaks, strategy tips and the Champion of the week from our leaderboards.

     Every game has a Daily Challenge: the same level for every player on Earth, reset at midnight UTC. Beat our score, then send your own challenge link to a friend.

     New Shorts every week. Play free at retryarcade.com

     Just one more try. ↻
     ```
   - **Links:** first link title `Play free`, URL `{SITE}/?utm_source=youtube&utm_medium=social&utm_campaign=profile`
     (the first link shows on the channel header). Add Instagram, TikTok and X after you create them.
   - **Contact email:** the brand email.
4. Settings > Channel > Basic info: country, keywords `free games, browser games, online games, puzzle games, arcade games, no download`.
   Settings > Upload defaults: category **Gaming**.
5. Customization > **Layout:** channel trailer for non-subscribers = clip C1 (or C20 after month one).
   Featured sections: Shorts first, then a "Satisfying runs" playlist and a "Tips" playlist.
6. Links in Shorts descriptions are not clickable. Say "link on our channel page" in the video, and
   **pin a comment** on every Short: `Play free: link on our channel page. Post your score below 👇`

### LinkedIn Company Page (+ founder profile)

1. You need your personal LinkedIn profile. Then: For Business > **Create a Company Page > Company**.
   - **Name:** `Retry Arcade`
   - **LinkedIn public URL:** `linkedin.com/company/retryarcade`
   - **Website:** `{SITE}/?utm_source=linkedin&utm_medium=social&utm_campaign=profile`
   - **Industry:** `Computer Games`
   - **Organization size:** `0-1 employees` (or `2-10`)
   - **Organization type:** `Privately held`
   - **Logo:** `public/brand/avatar-1080.png`
   - **Tagline** (108 / 120 characters):
     ```
     Free browser games you can play in 1 second: 15 original HTML5 games with daily challenges and leaderboards.
     ```
2. Edit page:
   - **Cover image:** `public/brand/banner-linkedin-company-1128x191.jpg`
   - **About / Overview** (1,253 / 2,000 characters):
     ```
     Retry Arcade is a studio of free, instant browser games built around one feeling: just one more try.

     Every game starts in about a second on any phone, tablet, Chromebook or computer. There is nothing to download and no account to create. Tap, play, and try to beat your best.

     What is live today:
     • 15 original HTML5 games: one-tap arcade (Stack Tower, Sky Flap, Blade Spin, Color Rush, Road Hopper, Zig Zag, Sky Hop, Brick Barrage), puzzles (Juicy Drop, Block Crush, 2048, Sudoku), classics and word games (Solitaire, Neon Snake, Wordy).
     • A Daily Challenge in every game: the same seeded level for every player worldwide, reset at midnight UTC.
     • Global leaderboards (today, daily and all-time), medals, XP levels and streaks.
     • Challenge links: finish a run and send a friend a link that shows exactly the score to beat.

     How we build: every game runs on our own tiny, zero-dependency HTML5 engine. Every sprite is drawn in code and every sound is synthesized, so pages stay light and load fast even on slow connections.

     What is next: new games regularly, weekly tournaments, and licensing for publishers and portals who want lightweight, mobile-first HTML5 games.

     Play free: retryarcade.com
     Partnerships and licensing: retryarcade.com/contact
     ```
   - **Specialties:** `Browser games`, `HTML5 games`, `Casual games`, `Puzzle games`, `Mobile web games`, `Game licensing`
   - **Custom button:** `Visit website` with the UTM link above.
3. Founder profile: background photo `public/brand/banner-linkedin-1584x396.jpg` (the photo covers the bottom left;
   the banner leaves that area empty). Add the position "Founder, Retry Arcade" linked to the page. Invite your
   connections to follow the page (Page admin view > Invite connections).
4. **Pin:** after posting, open the launch post > "..." > **Feature on top of Page**.

### Facebook Page

1. facebook.com/pages/create:
   - **Page name:** `Retry Arcade`
   - **Category:** `Video Game` (add `Website` as a second category if offered)
   - **Bio / Intro** (91 / 101 characters):
     ```
     15 free games you can play in 1 second. No download, no sign-up. Play at retryarcade.com ↻
     ```
2. **Profile picture:** `public/brand/avatar-1080.png`. **Cover photo:** `public/brand/cover-facebook-1640x624.jpg`
   (phones crop the sides; everything important is in the middle).
3. Page settings: **Username** `retryarcade` (facebook.com/retryarcade). Contact info: website
   `{SITE}/?utm_source=facebook&utm_medium=social&utm_campaign=profile` and the brand email.
4. **Action button:** "Play game" if it accepts a website link, otherwise "Learn more" with the same UTM link.
5. Connect Instagram in Meta Business Suite so Reels and posts can go to both at once.
6. Optional, recommended before running any ads: Meta Business Suite > Settings > Brand safety > **Domains** > Add
   `retryarcade.com` > "Meta-tag verification". Copy only the code inside `content="..."` and send it to the developer
   as `NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION`.
7. **Pin:** the launch post ("..." > Pin post, or Feature, depending on your Page version).

### Reddit

1. Create `u/retryarcade` (reddit.com/register). Display name `Retry Arcade`.
2. Settings > Profile:
   - **About** (151 / 200 characters):
     ```
     We make Retry Arcade (retryarcade.com): 15 free browser games that start in 1 second. Here to share new games, answer questions and read your feedback.
     ```
   - **Avatar / banner:** if the upload option is offered, use `public/brand/avatar-1080.png` and
     `public/brand/banner-linkedin-1584x396.jpg`.
   - **Social links:** website `{SITE}/?utm_source=reddit&utm_medium=social&utm_campaign=profile`, plus X, Instagram, TikTok, YouTube.
3. **Before the first promo post:** spend a week commenting helpfully in the communities below. Many subreddits
   auto-remove posts from brand-new, low-karma accounts. Never ask for upvotes, never post the same link to several
   subreddits on the same day, and always say you are the developer.
4. **Where self-promotion is welcome (always read each sub's rules and sidebar first; rules change):**

   | Subreddit | Fit | How to post |
   |---|---|---|
   | r/WebGames | Browser games that run with no download: exactly us | Link straight to **one game page**, not the homepage. Descriptive title, say you made it, one game per post, at most about one post per week |
   | r/playmygame | Built for developers sharing games and asking for feedback | Use the required flair/format, explain the game, ask a specific feedback question, reply to every comment |
   | r/IndieGaming | Indie devs may share their own games | Post a short gameplay clip with context, not a bare link. Follow the sub's self-promotion ratio, at most about once a week |
   | r/html5 | Small technical community | Only with a technical angle (the zero-dependency engine, drawing everything in code, synthesized audio) |
   | r/SideProject | People sharing things they built | The launch story: what you built, why, what you learned, the link |
   | r/incremental_games | **Only** incremental / idle games | None of the current 15 games is an incremental game, so do not post there. If you ever ship an idle game, start in their weekly feedback thread |
   | r/sudoku, r/solitaire, r/2048 | Niche fans | Usually strict about promotion. Participate first; post only if the rules allow it, or message the mods and ask |
   | r/gamedev | Developers | No game promotion. Share knowledge posts only (for example how the daily seeded challenges work) |

5. **Pin:** on your profile, pin the launch post you are proudest of (post "..." > Pin to profile).

### Pinterest

1. Create a free **Business account** (pinterest.com/business/create). Name `Retry Arcade`, username `retryarcade`.
2. Edit profile:
   - **Photo:** `public/brand/avatar-1080.png`. **Cover:** `public/brand/banner-discord-960x540.jpg` (16:9).
   - **About** (320 / 500 characters):
     ```
     Free online games you can play in 1 second, right in your browser. No download, no sign-up. Puzzle games, brain games, card games, word games and one-tap arcade games that work on any phone, tablet or computer. Daily challenges, strategy guides and tips for 2048, Sudoku, Solitaire and more. Play free at retryarcade.com
     ```
   - **Website:** `{SITE}/?utm_source=pinterest&utm_medium=social&utm_campaign=profile`
3. Settings > Claimed accounts > **Claim your website**: choose "Add HTML tag", copy only the code inside
   `content="..."` and send it to the developer as `NEXT_PUBLIC_PINTEREST_VERIFICATION` (section 10). Once it is
   deployed, click Verify. Claiming shows your logo and stats on every Pin from the site.
4. **Boards** (create 5): "Free Online Games (No Download)", "Puzzle Games and Brain Teasers", "Arcade Games You Can
   Play in 1 Second", "Game Tips and Strategy Guides", "Word Games and Daily Puzzles".
5. **Pins:** one per game from `marketing/social/posts/<game>-1080x1350.jpg`, destination
   `{SITE}/games/<game>?utm_source=pinterest&utm_medium=social&utm_campaign=pin_<game>`. Title = "`<Game>`: free online
   game, no download". Description = the game's tagline + one sentence on how to play. Pinterest has no pinning to the
   profile; instead choose the 5 boards above as your **featured boards**.

### Discord server

1. Discord > Add a server > Create my own > For a club or community. Name: `Retry Arcade`.
   **Icon:** `public/brand/avatar-1080.png`.
2. Server Settings > **Enable Community** (gives Welcome Screen, Rules Screening, Announcement channels, a server description).
   - **Description** (98 / 120 characters):
     ```
     Daily challenges, score battles and first looks at new games from Retry Arcade. Just one more try.
     ```
3. Channels: `#welcome` (read-only), `#rules`, `#announcements` (announcement channel), `#daily-challenge`,
   `#post-your-scores`, `#champion-of-the-week`, `#feedback-and-bugs`, `#game-ideas`, `#off-topic`, voice `Arcade Lounge`.
4. Roles: `Champion` (weekly winner, bright pink), `Streaker` (players who show a 7-day streak), `Mod`.
5. **Banner:** the server banner needs Boost Level 2 and the invite background needs Level 1. Until then, post
   `public/brand/banner-discord-960x540.jpg` as the first message in `#welcome`. Upload it as the banner once boosted.
6. Safety: Verification level Medium, AutoMod on (spam, mention spam, flagged words), explicit media filter on for everyone.
7. **Invite link:** Invite People > Edit invite link > Expire after: **Never**, Max uses: **No limit**. This link is what the developer needs.
8. **Pin** in `#welcome`: the rules, the site link `{SITE}/?utm_source=discord&utm_medium=social&utm_campaign=profile`,
   and "how to post a score" (a screenshot or a challenge link).

## 4. Launch-day posts (ready to paste)

Post everything on the same day (Tuesday to Thursday works best), then spend the day replying.
Reddit is spread over the following days (see the calendar).

### X: launch thread (pin post 1)

**Post 1** with image `marketing/social/x-launch-1200x675.jpg`
```
We built 15 free games you can play in 1 second. ↻

No download. No sign-up. Just one more try.

{SITE}/?utm_source=x&utm_medium=social&utm_campaign=launch
```
Alt text: `Retry Arcade launch card: the Retry Arcade logo, the text "15 free games. Play in 1 sec. No download. No sign-up. Just one more try." and a pink button reading retryarcade.com, next to a tilted wall of colorful game covers including a block tower, fruit in a jar, a block puzzle and a knife-throwing target.`

**Post 2** with image `marketing/social/launch-carousel-3-1080x1350.jpg`
```
Every game has a Daily Challenge: the same level for every player on Earth. It resets at midnight UTC.

Post your score before the reset. 📅
```
Alt text: `Graphic titled "New levels every day." A daily leaderboard card with a reset countdown shows rank 1 "You?", rank 2 "Your best friend" and rank 3 "Your group chat", above chips for streaks, medals and XP levels.`

**Post 3** with image `marketing/social/launch-carousel-4-1080x1350.jpg`
```
Beat a score? Tap "Challenge a friend".

They get a link that shows exactly the score they need to beat. Friendships have ended over less. ⚔️
```
Alt text: `Graphic titled "Beat it? Prove it." A chat bubble says "42 floors. Your move." above a link preview of a stacked block tower captioned "Sam scored 42 in Stack Tower. Can you beat it?" Labeled as an example challenge link preview.`

**Post 4** with image `marketing/social/launch-carousel-2-1080x1350.jpg`
```
The lineup:
🕹️ Arcade: Stack Tower, Sky Flap, Blade Spin, Color Rush, Road Hopper, Zig Zag, Sky Hop, Brick Barrage
🧩 Puzzle: Juicy Drop, Block Crush, 2048, Sudoku
🃏 Classics: Solitaire, Neon Snake
🟩 Word: Wordy
```
Alt text: `Graphic titled "Pick your flavor." Four panels list the categories with small game covers: Arcade 8 games, Puzzle 4 games, Classics 2 games, Word 1 game.`

**Post 5**
```
Start with Stack Tower. Reply with your best floor count and we will repost the top scores 👇

{SITE}/games/stack-tower?utm_source=x&utm_medium=social&utm_campaign=launch
```

### Instagram: launch carousel (pin it)

Images: `launch-carousel-1` to `launch-carousel-5` (1080x1350). Caption:
```
We built 15 free games you can play in 1 second. ↻

No download. No sign-up. Arcade, puzzles, classics and a daily word game, all in your browser.

Every game has a Daily Challenge (same level for everyone on Earth) and you can send any score to a friend as a challenge link.

Which one are you trying first? Tell us in the comments 👇
Play free: link in bio

#browsergames #freegames #mobilegames #puzzlegames #indiegame
```
Alt text per slide:
1. `Slide 1: "We built 15 free games you can play in 1 second." with a chip "No download · No sign-up" above a tilted wall of 12 colorful game covers.`
2. `Slide 2: "Pick your flavor." Four panels: Arcade 8 games, one-tap reflex games; Puzzle 4 games, relaxing brain teasers; Classics 2 games, Snake and Solitaire rebuilt; Word 1 game, a daily word puzzle. Each shows small game covers.`
3. `Slide 3: "New levels every day." Every game has a Daily Challenge, the same level for everyone on Earth, beat it before midnight UTC. A playful leaderboard lists 1 You?, 2 Your best friend, 3 Your group chat.`
4. `Slide 4: "Beat it? Prove it." Finish a run, tap Challenge a friend and send the link. An example chat shows "42 floors. Your move." and a link preview "Sam scored 42 in Stack Tower. Can you beat it?"`
5. `Slide 5: The Retry Arcade logo with "Play free right now", a pink button reading retryarcade.com, "No download. No sign-up. Any phone or laptop. Follow @retryarcade for daily challenges." and a row of five game covers.`

**Stories on launch day:** post `stories/sky-flap-1080x1920.jpg`, `stories/juicy-drop-1080x1920.jpg` and
`stories/stack-tower-1080x1920.jpg`, each with a **link sticker** to its challenge link, for example
`{SITE}/c/sky-flap/30/RetryArcade?utm_source=instagram&utm_medium=social&utm_campaign=story_sky-flap`.
Place the sticker over the "LINK IN BIO" pill. Alt text: `Sky Flap story: a yellow bird flying between neon pillars over a synthwave city, with the text "Can you beat 30?" and "30 gaps earns silver. Free, no download."`

**Reel:** clip C1 (section 5) with the same caption, cover `stories/stack-tower-1080x1920.jpg`.

### TikTok

Clip C1. Caption:
```
15 free games, 0 downloads. Which one gets you? 👇 #browsergames #mobilegames #gaming #satisfying
```
Pinned comment: `Link in bio. Post your best score and we'll try to beat it.`

### YouTube Shorts

Clip C1. Title: `15 free games you can play in 1 second #shorts`
Description:
```
15 original browser games, no download, no sign-up. Link on our channel page.
Which one should we speedrun next? Tell us below.
#shorts #browsergames #mobilegames
```
Pinned comment: `Play free: link on our channel page. Post your score below 👇`

### LinkedIn Company Page (document post)

Upload `marketing/social/launch-carousel-linkedin.pdf` as a document. Document title: `15 free games you can play in 1 second`. Text:
```
Today we are launching Retry Arcade: 15 free games that start in about a second, right in the browser.

No download, no sign-up, and it works on any phone, tablet, Chromebook or laptop.

A few things we cared about:
• Speed: every game runs on our own zero-dependency HTML5 engine. Every sprite is drawn in code and every sound is synthesized, so there is almost nothing to download.
• A reason to come back: a Daily Challenge in every game, with the same seeded level for every player worldwide.
• Built-in word of mouth: any score becomes a challenge link that shows your friend exactly what to beat.

Take a 60-second break and try one: {SITE}/?utm_source=linkedin&utm_medium=social&utm_campaign=launch

#gamedev #indiedev #webdevelopment
```
Then **Feature on top of Page**.

**Founder repost** (from your personal profile, resharing the page post):
```
After months of evenings and weekends, Retry Arcade is live: 15 small browser games designed around one feeling, "just one more try".

Proudest detail: the whole thing loads in about a second because there are no game assets at all. Everything is drawn and synthesized in code.

I would love your honest feedback, and your high score in Stack Tower. 👇
```

### Facebook Page

Multi-photo post with `launch-carousel-1` to `launch-carousel-5` (same alt text as Instagram). Caption:
```
We built 15 free games you can play in 1 second. ↻

No download, no sign-up. Arcade games, puzzles, Solitaire, Sudoku and a daily word game, on your phone or computer.

Every game has a Daily Challenge and you can send any score to a friend as a challenge link. Who in your family is the champion? 👇

Play free: {SITE}/?utm_source=facebook&utm_medium=social&utm_campaign=launch
```
Pin it to the top of the Page.

### Reddit (spread out, never the same day)

**r/SideProject** (day 2), text post:
```
Title: I built 15 browser games that load in about a second, with zero image or audio files

Body:
Hi! I'm the developer. Retry Arcade is a set of 15 small games (Stack Tower, Juicy Drop, Block Crush, Sudoku, Solitaire and more) that run in any browser with no download and no sign-up.

Things I think are interesting:
- No assets: every sprite is drawn with Canvas 2D and every sound is synthesized with Web Audio.
- Daily Challenges use a seeded random generator keyed on the UTC date, so everyone on Earth gets the same level.
- Any score becomes a challenge link with its own preview image, so friends see exactly what to beat.

I'd really like feedback on what feels good and what feels frustrating: {SITE}/?utm_source=reddit&utm_medium=social&utm_campaign=sideproject
```

**r/WebGames** (day 3), link post straight to the game:
```
Title: Stack Tower: tap to drop blocks, 3 perfect drops in a row grow your block back [browser, no download]
Link: {SITE}/games/stack-tower?utm_source=reddit&utm_medium=social&utm_campaign=webgames
First comment: I made this. Overhang gets sliced off, so every miss makes the tower narrower. There's also a Daily Challenge where everyone gets the same block speeds. Post your best!
```

**r/playmygame** (day 8), with the flair the sub requires:
```
Title: [Browser] Block Crush: an 8x8 block puzzle with combo clears. Looking for feedback on difficulty
Body: I'm the dev. Drag pieces onto the board, clear rows and columns, chain clears for a combo multiplier. Runs in any browser, no download: {SITE}/games/block-crush?utm_source=reddit&utm_medium=social&utm_campaign=playmygame
Question: does the combo meter feel generous or stingy? At what score did you get stuck?
```

**r/IndieGaming** (day 16): upload clip C13 or C1 as a video post, title
`I made a set of tiny browser games where every sprite is drawn in code. Here's Brick Barrage`, and add the link in a comment.

**r/WebGames** again (day 24) with a different game: `Juicy Drop: drop fruit, merge matching ones, grow a watermelon [browser, no download]`.

### Pinterest (day 4)

Pin these 5 posts, each to its board, with the game link and `utm_campaign=pin_<game>`:
`posts/stack-tower`, `posts/juicy-drop`, `posts/block-crush`, `posts/merge-2048`, `posts/sudoku`.
Title example: `Juicy Drop: free fruit merge game, no download`. Description example:
`Drop, match, merge. Grow a giant. Drop fruit into the jar and merge matching fruits into bigger ones until you grow a watermelon. Free online puzzle game that works on any phone or computer.`

### Discord

`#welcome` (post the banner image first, then):
```
Welcome to the Retry Arcade server! ↻

🎮 Play free: {SITE}/?utm_source=discord&utm_medium=social&utm_campaign=profile
📅 #daily-challenge: today's levels, same for everyone on Earth, reset at midnight UTC
🏆 #post-your-scores: screenshots or challenge links. Beat someone? Reply with yours
👑 #champion-of-the-week: every Sunday the best score wins the Champion role
🐞 #feedback-and-bugs: tell us what feels great and what feels broken
💡 #game-ideas: what should game 16 be?

Be kind, no spam, no NSFW, no sharing personal info. Just one more try.
```
`#announcements`:
```
@everyone We're live! 15 free games, no download: {SITE}/?utm_source=discord&utm_medium=social&utm_campaign=launch
First Champion of the week is crowned on Sunday. Featured game: Stack Tower. Go!
```

### Alt text for the 15 game posts

Pattern: `Promotional image for <Game>, a free browser game on Retry Arcade: <scene>. Text: "<GAME>", "<tagline>", "Play free: retryarcade.com".`

| Game | Tagline | Scene for alt text |
|---|---|---|
| Blade Spin | Throw true. Never touch steel. | a spinning wooden target with throwing knives stuck around its rim, an apple and a gem, and one knife flying up |
| Block Crush | Drop. Clear. Combo. Repeat. | an 8x8 board of glossy colored blocks with a glowing row being cleared, and two pieces waiting beside it |
| Brick Barrage | Aim. Unleash the volley. Break it all. | rows of colorful bricks and a glowing stream of white balls fired from the bottom |
| Color Rush | Only your color lets you through. | a ball under a spinning ring of pink, yellow, aqua and purple, with a color-switch orb above it |
| Juicy Drop | Drop, match, merge. Grow a giant. | smiling cartoon fruits (watermelon, pineapple, apples, oranges) piled in a glass jar, with a cherry and a plum about to drop |
| 2048 | Slide. Merge. Reach 2048. | a tilted 2048 board with tiles from 2 to 1024 and a glowing golden 2048 tile |
| Neon Snake | Swipe. Glow. Grow. Don’t bite yourself. | a glowing green neon snake winding across a dark grid toward a pink orb |
| Road Hopper | Hop across. Don’t get squashed. | a blocky crowned chick hopping across roads with cars and a river with logs and coins |
| Sky Flap | Tap to flap. Thread the neon. | a round yellow bird flying between neon pink and blue pillars over a synthwave city at sunset |
| Sky Hop | Bounce higher. Never look down. | a red bird bouncing between floating platforms and clouds, collecting gold coins |
| Solitaire | The classic card game, dealt to win. | fanned playing cards on green felt next to a cascading column of cards |
| Stack Tower | Tap. Stack. Don’t miss. | a tower of blocks in a sunset gradient from pink to yellow with a green block sliding in |
| Sudoku | Fill the grid. One true solution. | a tilted Sudoku grid with a highlighted row and floating number tiles |
| Wordy | Five letters. Six tries. One word. | a word grid of green and yellow letter tiles spelling STORY, CROWD, DOWRY and WORDY |
| Zig Zag | Tap to turn. Don’t fall off. | a white zigzag path in a pastel sky with a ball rolling along it and pink gems |

Story alt text pattern: `<Game> story: <scene>, with the text "Can you beat <N>?", "<N> <unit> earns silver. Free, no download." and "Link in bio".`
Targets: Stack Tower 35 floors, Juicy Drop 2,000 points, Block Crush 2,000 points, Blade Spin 50 blades, Color Rush 25 stars, Sky Flap 30 gaps (each is the game's silver medal).

## 5. Clip shot list (what to screen-record)

Short vertical clips are the main discovery engine, so most calendar days are clips. Record once, post the same clip
to TikTok, Instagram Reels, YouTube Shorts and X (and Facebook Reels via cross-posting).

**How to record**
1. On your phone, open `{SITE}/games/<game>` in the browser, tap the fullscreen button, turn on Do Not Disturb and
   set brightness to max.
2. Start the built-in screen recorder (iPhone: Control Center > Screen Recording, long-press to turn the microphone
   off. Android: Quick Settings > Screen record, with device audio on). Game sound is original and safe to use.
3. Play several full runs. You only need the best 10 to 20 seconds.
4. Edit in CapCut, TikTok or Instagram: trim so the action starts in the first frame, crop away any browser bar,
   export 1080x1920.
5. **Hook text in the first second**: big, 2 lines max, in the upper third (not in the bottom 25%, where captions
   and buttons sit). Keep the score visible the whole time.
6. End on the score (or on the matching story file as a 1-second end card) and say "link in bio" in the caption.
7. Covers: for Stack Tower, Juicy Drop, Block Crush, Blade Spin, Color Rush and Sky Flap use
   `marketing/social/stories/<game>-1080x1920.jpg`.

| ID | Game | What to record (the exact moment) | Length | Hook overlay (first second) |
|---|---|---|---|---|
| C1 | All 15 | Launch trailer: 1 second of the most intense moment of each game, hard cuts on the beat, end on the logo (`avatar-1080.png`) | 15-18 s | `15 games. 0 downloads.` |
| C2 | Juicy Drop | A run where a chain reaction merges up to a watermelon. Start 8 s before the chain | 12-15 s | `Wait for the watermelon 🍉` |
| C3 | Stack Tower | 3 perfect drops in a row, the block growing back, then 4 to 6 more fast drops | 12-15 s | `3 perfect drops = your block grows back` |
| C4 | Blade Spin | A boss stage (every 5th stage): the log speeds up, stops, reverses, and the last blade lands | 12-18 s | `Stage 5 is a boss. It fights back.` |
| C5 | Color Rush | A double-ring pass with a near miss, then a color orb switch | 10-15 s | `Don't blink.` |
| C6 | Block Crush | One piece clearing 2 or 3 lines at once. Show the 3 to 4 placements that set it up | 12-15 s | `Wait for it...` |
| C7 | Road Hopper | The railway light flashing and a train missing you by one hop | 10-15 s | `The train. It's always the train. 🚂` |
| C8 | Wordy | A **Classic** puzzle (never the Daily, no spoilers) solved in 3 guesses, tiles flipping green | 10-15 s | `Got it in 3. Your turn.` |
| C9 | Sky Flap | The run from 25 to 30 gaps with the sliding pillars. End on the score | 15-20 s | `Can you beat 30?` |
| C10 | 2048 | Corner strategy: 8 to 10 swipes that keep the big tile in the corner and chain 3 merges | 15-20 s | `The 2048 trick: pick a corner` |
| C11 | Neon Snake | A long snake making a tight U-turn (quick double swipe) and grabbing a golden orb | 10-15 s | `My snake is too long for this 🐍` |
| C12 | Zig Zag | A Perfect streak of turns as the ball speeds up, then the fall | 10-15 s | `Tap. Tap. Tap. Don't fall.` |
| C13 | Brick Barrage | A bank shot that sneaks balls behind the wall so they rattle along the top | 10-15 s | `One shot. Whole wall.` |
| C14 | Stack Tower | Split screen or back-to-back: your first ever run (low score) then your best run | 15-20 s | `Day 1 vs Day 7 of Stack Tower` |
| C15 | Sky Hop | Hitting a spring, then screen-wrapping through the side to reach a platform | 10-15 s | `Wait, you can go through the wall? ☁️` |
| C16 | Solitaire | The last 10 seconds of a win: tapping cards up to the foundations | 10-15 s | `The most satisfying 10 seconds in cards` |
| C17 | Juicy Drop | A fail: the pile stays above the dashed line and the run ends | 8-12 s | `So close. SO close.` |
| C18 | Stack Tower, Blade Spin, Sky Flap, Color Rush | 4 seconds of each with an on-screen difficulty score (for example 6/10, 8/10, 9/10, 7/10) | 16-20 s | `Rating our hardest games` |
| C19 | Any | The challenge loop: finish a run, tap "Challenge a friend", the share sheet, then the friend's phone showing "... scored N. Can you beat it?" (only use names of people who agreed) | 15-20 s | `How to end a friendship with 1 link ⚔️` |
| C20 | All | Best 1 to 2 seconds of the month's top clips | 15-20 s | `30 days. 15 games. Best moments.` |

## 6. 30-day content calendar

Day 1 is launch day. "Clip" rows go to TikTok, Reels, Shorts and X unless noted. Hashtags: use the platform
sets in section 8 (IG/TT = Instagram and TikTok, 3 to 6 tags; X = 1 to 2 tags; LI = 3 tags).

| Day | Platform(s) | Format | Asset | Caption | Hashtags |
|---|---|---|---|---|---|
| 1 | All | Launch: carousel (IG, FB), PDF carousel (LI), thread (X), clip (TT, Reels, Shorts), stories, Discord | `launch-carousel-1..5`, `launch-carousel-linkedin.pdf`, `x-launch-1200x675.jpg`, clip C1 | See section 4 | IG/TT: #browsergames #freegames #mobilegames #indiegame · X: #indiedev |
| 2 | Clip + IG Story; Reddit r/SideProject | Clip C2, story with link sticker | C2, `stories/juicy-drop-1080x1920.jpg` | Wait for the watermelon 🍉 Free, no download. Link in bio. | IG/TT: #satisfying #puzzlegame #browsergames #mobilegames |
| 3 | Clip; Reddit r/WebGames; X image | Clip C3; image post | C3 (cover `stories/stack-tower`), `posts/stack-tower-1080x1350.jpg` | 3 perfect drops and your block grows back. What's your best? 🧱 | IG/TT: #satisfying #browsergames #mobilegames #arcadegames · X: #indiedev |
| 4 | Clip; Pinterest | Clip C4; 5 Pins | C4 (cover `stories/blade-spin`), `posts/stack-tower`, `juicy-drop`, `block-crush`, `merge-2048`, `sudoku` | Every 5th stage is a boss. It spins back. 🗡️ | IG/TT: #gaming #browsergames #mobilegames #hypercasual |
| 5 | IG, FB, LI, X | Image (tip) | `posts/merge-2048-1080x1350.jpg` | The 2048 trick: pick a corner and never swipe away from it. Full guide: link in bio (LI/X: `{SITE}/guides/how-to-win-2048`) | IG: #2048 #puzzlegames #braingames · LI: #puzzles #braingames #productivity |
| 6 | Clip | Clip C5 | C5 (cover `stories/color-rush`) | Only your color gets through. Don't blink. 🔵 | IG/TT: #browsergames #mobilegames #reflexes #gaming |
| 7 | IG, FB, X, Discord | Champion of the week #1 (image + story) | Screenshot of the featured game's board on `{SITE}/leaderboards` + `posts/stack-tower-1080x1350.jpg` | 👑 Champion of the week: <nickname> with <score> floors in Stack Tower. Next week's game: Block Crush. Take the crown. | IG: #browsergames #leaderboard #freegames · X: #browsergames |
| 8 | Clip; Reddit r/playmygame | Clip C6 | C6 (cover `stories/block-crush`) | Wait for it... 3 lines, 1 piece. 💎 | IG/TT: #satisfying #blockpuzzle #puzzlegames #browsergames |
| 9 | X, LI, IG Story | Poll | Poll on X and LI; IG Story poll on `stories/stack-tower` | Which game should get a new mode next? Stack Tower / Juicy Drop / Block Crush / Blade Spin | X: #gamedev · LI: #gamedev #indiedev #productdesign |
| 10 | Clip | Clip C7 | C7 | The train. It's always the train. 🚂 | IG/TT: #gaming #arcadegames #browsergames #mobilegames |
| 11 | Clip; X text | Clip C8; X post | C8, `posts/wordy-1080x1350.jpg` | Got it in 3. Today's Daily Wordy is live, no spoilers in the comments please 🟩 | IG/TT: #wordgame #dailypuzzle #puzzlegames #browsergames · X: #wordgame |
| 12 | IG, FB | Multi-image "Which one are you?" | `posts/stack-tower`, `posts/juicy-drop`, `posts/sudoku`, `posts/color-rush` | Which one are you? 1 Stack Tower (perfectionist) 2 Juicy Drop (chaos) 3 Sudoku (calm genius) 4 Color Rush (reflex god). Comment your number 👇 | IG: #browsergames #freegames #puzzlegames #mobilegames |
| 13 | Clip + IG Story | Clip C9, story with challenge link | C9, `stories/sky-flap-1080x1920.jpg` | Can you beat 30? Silver medal is 30 gaps. Link in bio 🐤 | IG/TT: #browsergames #mobilegames #challenge #gaming |
| 14 | IG, FB, X, Discord | Champion of the week #2 + recap | Leaderboard screenshot + `posts/block-crush-1080x1350.jpg` | 👑 Champion of the week: <nickname>, <score> points in Block Crush. Next up: Sky Flap. | IG: #browsergames #leaderboard #freegames · X: #browsergames |
| 15 | Clip; Pinterest | Clip C10; guide Pin | C10, `posts/merge-2048` pinned to `{SITE}/guides/how-to-win-2048` | The 2048 trick nobody tells you: pick a corner. Save this 🧠 | IG/TT: #2048 #braingames #puzzlegames #strategy |
| 16 | X, LI; Reddit r/IndieGaming | Thread (X), text post (LI) | `x-launch-1200x675.jpg` | How we built 15 browser games with zero image or audio files: every sprite drawn in code, every sound synthesized 🧵 (1 post each: drawing, audio, daily seed, challenge links) | X: #gamedev #indiedev · LI: #gamedev #javascript #webdevelopment |
| 17 | Clip | Clip C11 | C11 | My snake is officially too long for this 🐍 | IG/TT: #snakegame #browsergames #mobilegames #satisfying |
| 18 | Clip | Clip C12 | C12 | Tap. Tap. Tap. Don't fall. 🔷 | IG/TT: #satisfying #hypercasual #browsergames #mobilegames |
| 19 | IG, FB, LI, Pinterest | Image (tip) | `posts/sudoku-1080x1350.jpg` | Sudoku tip: start with the digit you see most and find the one spot per box where it fits. Full guide: link in bio (LI: `{SITE}/guides/sudoku-techniques-for-beginners`) | IG: #sudoku #braingames #puzzlegames · LI: #puzzles #braingames #learning |
| 20 | Clip | Clip C13 | C13 | One shot. Whole wall. 🟪 | IG/TT: #satisfying #brickbreaker #browsergames #mobilegames |
| 21 | IG, FB, X, Discord | Champion of the week #3 | Leaderboard screenshot + `posts/sky-flap-1080x1350.jpg` | 👑 Champion of the week: <nickname>, <score> gaps in Sky Flap. Next up: Juicy Drop. | IG: #browsergames #leaderboard #freegames · X: #browsergames |
| 22 | Clip | Clip C14 | C14 (cover `stories/stack-tower`) | Day 1 vs Day 7 of Stack Tower. Be honest: what's your best? | IG/TT: #gaming #browsergames #mobilegames #progress |
| 23 | X, LI, IG Story | Poll | Polls; IG Story poll on `stories/blade-spin` | Hardest game on Retry Arcade? Blade Spin / Sky Flap / Color Rush / Zig Zag | X: #gaming · LI: #gamedev #ux #productdesign |
| 24 | Clip; Reddit r/WebGames | Clip C15 | C15 | Wait, you can go through the wall? ☁️ | IG/TT: #browsergames #mobilegames #gaming #platformer |
| 25 | Clip; Pinterest | Clip C16; Pin `posts/solitaire` to `{SITE}/guides/klondike-solitaire-rules-and-tips` | C16 | The most satisfying 10 seconds in cards 🃏 | IG/TT: #solitaire #cardgames #satisfying #browsergames |
| 26 | Clip | Clip C17 | C17 (cover `stories/juicy-drop`) | So close. SO close. 🍉 One more try? | IG/TT: #satisfying #puzzlegame #fail #browsergames |
| 27 | Clip | Clip C18 | C18 | Rating our games by how many times you'll say "one more try" | IG/TT: #gaming #browsergames #mobilegames #ranking |
| 28 | IG, FB, X, LI, Discord | Champion of the week #4 + month recap carousel | Leaderboard screenshot + your 4 best-performing posts | 👑 Champion of the week: <nickname>, <score> in Juicy Drop. Month 1: thank you for every run 💜 | IG: #browsergames #freegames #indiegame · LI: #gamedev #indiedev #startups |
| 29 | Clip | Clip C19 | C19 | How to end a friendship with 1 link ⚔️ Challenge a friend, link in bio | IG/TT: #gaming #friends #browsergames #challenge |
| 30 | Clip; X, IG Story poll; Discord | Clip C20 + poll | C20 | 30 days, 15 games. What should game 16 be? Tell us 👇 | IG/TT: #browsergames #indiegame #gaming #mobilegames |

Every day also: 1 or 2 Stories on Instagram (reposted player scores, polls, "today's daily" reminders) and a
`#daily-challenge` message in Discord.

## 7. 20 hook lines for clips

Use them as the first-second text overlay or the first line of a caption. None of them promises a fake statistic.

1. POV: it's 2am and you said "one more try"
2. POV: you said one more try 47 tries ago
3. This game has no right being this satisfying
4. Wait for it...
5. I was SO close
6. Can you beat this? (link in bio)
7. Tell me you've never rage-quit without telling me
8. The last 3 seconds hurt
9. Your 5-minute break just became an hour
10. Don't blink
11. Rate this run 1 to 10
12. Day 1 vs Day 7
13. Nobody warned me about the boss level
14. Things that should be illegal: this near miss
15. Loads in 1 second. Takes your whole evening.
16. Send this to the friend who thinks they're fast
17. Free, no download, zero excuses
18. Which one is the hardest? Wrong answers only
19. The perfect streak does not exist... wait
20. Me pretending to work vs me playing "one more round"

## 8. Hashtag sets

Few, specific tags beat long lists. Rotate within each set; never paste the same 30 tags on every post.

| Platform | How many | Core set | Rotate in by topic |
|---|---|---|---|
| Instagram | 3 to 6 | #browsergames #freegames #mobilegames | #puzzlegames #satisfying #indiegame #braingames #arcadegames, game-specific: #2048 #sudoku #solitaire #wordgame |
| TikTok | 3 to 6 | #browsergames #mobilegames #gaming | #satisfying #puzzlegame #challenge #hypercasual #indiegame |
| X | 1 to 2 | #indiedev or #browsergames | #gamedev (dev posts), #screenshotsaturday (Saturdays only, dev progress) |
| LinkedIn | 3 | #gamedev #indiedev #webdevelopment | #javascript #html5 #productdesign #startups |
| YouTube Shorts | 3 (the first 3 show above the title) | #shorts #browsergames #mobilegames | #satisfying #puzzlegame |
| Facebook | 0 to 2 | #freegames | #puzzlegames |
| Pinterest | 0 to 2, plus keywords | Write keyword-rich titles and descriptions ("free online puzzle game, no download") | #braingames #puzzlegames |

## 9. Community rules

1. **Reply fast.** Launch day and the day after: within the hour. After that: every comment and DM the same day.
   Answer questions, thank people, and ask what score they got.
2. **Repost player challenge scores.** When someone posts a score or a challenge link, reply with congratulations and
   reshare it (Story, quote post, Discord). Credit them by their handle. Ask before reposting someone's own video.
3. **Champion of the week, every Sunday.** Each week has one featured game (Stack Tower, Block Crush, Sky Flap,
   Juicy Drop, then rotate). Every evening before midnight UTC, open `{SITE}/leaderboards`, check the featured game's
   Today / Daily board and note the top nickname and score (2 minutes). On Sunday, the best single score of the week is
   the Champion: post a screenshot of the board with the game's post image, tag them if they are on the platform,
   give them the Discord `Champion` role, and announce next week's game. Use only the public leaderboard nickname.
4. **Never buy followers, likes or views**, and do not join follow-for-follow or engagement pods. Fake accounts kill
   reach and make the numbers useless for decisions.
5. **Be transparent.** Say you are the developer when you post in communities. Label any paid partnership (#ad).
6. **Keep it family friendly.** Many players are young: no edgy humor about real people, never ask for personal
   information, never DM minors beyond support replies, and keep Discord moderated.
7. **Handle criticism calmly.** Thank people for bug reports, move details to `#feedback-and-bugs` or DMs, and post
   when a fix ships ("You asked, we fixed it").
8. **No spoilers.** Never post the Daily Wordy answer; ask people to share only their emoji grid.
9. **Consistency beats volume.** One good clip a day is plenty. Check which clips got the most watch time each
   Sunday and make more like them.

## 10. After setup: send your profile links to the developer

When all accounts exist, send the developer this block (fill in the real URLs; no UTM tags here). They will add the
links to the website footer and to the site's structured data (`sameAs`):

```
NEXT_PUBLIC_SOCIAL_X=https://x.com/retryarcade
NEXT_PUBLIC_SOCIAL_INSTAGRAM=https://www.instagram.com/retryarcade/
NEXT_PUBLIC_SOCIAL_TIKTOK=https://www.tiktok.com/@retryarcade
NEXT_PUBLIC_SOCIAL_YOUTUBE=https://www.youtube.com/@retryarcade
NEXT_PUBLIC_SOCIAL_LINKEDIN=https://www.linkedin.com/company/retryarcade
NEXT_PUBLIC_SOCIAL_FACEBOOK=https://www.facebook.com/retryarcade
NEXT_PUBLIC_SOCIAL_DISCORD=https://discord.gg/<your-never-expiring-invite-code>
NEXT_PUBLIC_SOCIAL_REDDIT=https://www.reddit.com/user/retryarcade/
NEXT_PUBLIC_SOCIAL_PINTEREST=https://www.pinterest.com/retryarcade/
```

Also send, when you have them:

```
NEXT_PUBLIC_TWITTER=@retryarcade                     # only if the X handle is different (used by the Twitter card tag)
NEXT_PUBLIC_PINTEREST_VERIFICATION=<code from Pinterest "claim website">
NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION=<code from Meta domain verification>
```

And tell the developer whether `retryarcade.com` is live, so the images can be re-rendered with the right domain if needed.

## Re-rendering the images

All images are generated from HTML templates with Playwright, using the site's own fonts, colors and game art
(each game's cover is re-drawn at the exact pixel size needed):

```
node scripts/brand/render.mjs                        # everything (about 30 seconds)
node scripts/brand/render.mjs posts stories          # only some groups: logos banners posts stories carousel pdf x contact
node scripts/brand/render.mjs --domain=retryarcade.vercel.app   # change the URL printed on posts, carousel and X card
```

Templates live in `scripts/brand/templates.mjs`, shared pieces (logo, wordmark, neon backdrop) in `scripts/brand/lib.mjs`.
The renderer refuses to write an image that contains an em dash or en dash.
