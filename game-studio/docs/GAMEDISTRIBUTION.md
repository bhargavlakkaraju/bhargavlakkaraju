# GameDistribution: second income stream for all 24 games

GameDistribution (GD, https://gamedistribution.com, part of Azerion, Amsterdam) is a
non-exclusive HTML5 game distributor. We upload each game once; GD hosts it and syndicates it
to its publisher network (more than 2,000 game sites, news and media sites). The game shows
GD's video ads through the GD SDK and we get a share of that ad revenue. It runs next to our
own site and the other portals: the license is non-exclusive.

Everything needed is already built: one upload package per game, every thumbnail size, the
form copy for every game and a step by step guide, bundled in one zip.

## How GD pays

From the GD Developer Game License Agreement (last updated 19 June 2025):

- **Revenue share: 33% of the net revenue** from the ads (and any in-game purchases) shown in
  our games, wherever GD distributes them.
- Monthly revenue reports in the dashboard. GD pays **within 60 days after a month's report**,
  once the balance is **at least EUR 100** (smaller amounts carry over until they reach it).
  The old SDK FAQ still says EUR 50: the agreement is what counts.
- Payment needs the payment and VAT details filled in the account. GD sends a credit invoice;
  each side pays its own taxes (withholding tax included).
- Invalid traffic (bots, self-clicks) is held back or clawed back, so never play our own GD
  games to "test the ads" beyond the one SDK activation view.

Expect small numbers per game at first; GD's content team promotes games with good
engagement (session length, replays) and mobile support, which all of ours have.

## Terms worth knowing before you accept

- Non-exclusive, worldwide license to distribute and promote the games (section 2.1).
- The GD version must stay identical to the latest version we publish elsewhere (2.6.4): when
  a game changes, rebuild and upload the new zip (one command, below).
- At least English, user support is ours, no links to outside sites, no third-party ads, no
  in-game purchases from others and no tracking software (2.6.5 to 2.6.8). Our GD builds
  already meet these.
- The intro says the games "shall not be distributed as part of a subscription or pay-to-own
  model, nor via native apps". **Decide this one yourself**: if you plan paid apps or app store
  versions of these games, ask GD support how they read this sentence before you accept.
- Dutch law, Amsterdam courts. Liability is capped.

## What is in the repository

| What | Where | Command |
| --- | --- | --- |
| GD listing copy (titles, genres, tags, description, instructions) | `scripts/portals/gamedistribution-listing.mjs` | edit by hand |
| Form data per game, checked against GD's rules | `marketing/portals/gamedistribution.csv` and `.json` | `npm run gd:meta` |
| Upload package per game (zip, index.html at the root) | `dist/portals/gamedistribution/<slug>.zip` | `npm run gd:build` |
| Thumbnails in every GD size | `dist/portals/gamedistribution-assets/<slug>/` | `npm run gd:assets` |
| Headless QA of the builds (fake GD SDK, network guard) | `.smoke/gd/` screenshots | `npm run gd:verify -- --all` |
| Everything in one zip, with `UPLOAD-GUIDE.md` | `dist/portals/retryarcade-gamedistribution.zip` | `npm run gd:bundle` |
| Game ids (optional, see below) | `scripts/portals/gamedistribution-ids.json` | edit, then `npm run gd:bundle` |

`npm run gd:bundle` runs the metadata, build and thumbnail steps and then packs the bundle. It
needs Node 18+, the project's dev dependencies (`npm ci`) and Playwright's Chromium
(`npx playwright install chromium`, once per machine) for the thumbnails.

Bundle layout: `games/<slug>.zip`, `assets/<slug>/<slug>-<size>.jpg`, `assets/_preview.jpg`
(contact sheet), `gamedistribution.csv`, `UPLOAD-GUIDE.md`.

## Sign up (once)

1. Go to https://developer.gamedistribution.com/ and register as a **Developer** (not
   Publisher) with bhargav@hooplaindia.com or hello@retryarcade.com.
2. Confirm the email, set up 2FA if offered.
3. Read and accept the developer terms (see above).
4. Account settings: company or personal details, payment method, VAT/tax details. Nothing is
   paid out before these are filled in.

## Upload each game

Do one game end to end first (Stack Tower Sky is the smallest), then the other 23. The CSV has
one row per game; every field below is a column.

1. Create a new game in the dashboard. **Title**: `gd_title`.
2. **Description**: `description`. **Instructions**: `instructions`. Both are 200 to 500
   characters, contain the exact title and describe touch, mouse and keyboard controls.
3. **Genres / category**: `genres` (one or two of GD's genres). **Tags**: `tags` (up to five,
   all existing GD tags).
4. **Mobile**: yes. **Orientation**: portrait. **Size**: 720 x 1280 (the games scale to any
   frame). **Language**: English.
5. **Audience**: tick "No blood" for all, "Kids friendly" where `kids_friendly` is yes (all but
   Blade Spin, Reflex Duel and Tank Tango), and choose the age groups to match.
6. **Upload**: drop `games/<slug>.zip`. GD then shows the game id and the game URL
   (`https://html5.gamedistribution.com/<gameId>/`).
7. **Assets**: upload the five images from `assets/<slug>/` into the matching size slots.
8. **Rewarded ads flag**: switch it on for the 14 games where `rewarded_ads` is yes (all
   single-player games except Solitaire). They offer "Continue (watch ad)" after a game over.
   Without the flag GD refuses rewarded ads and the button just does not appear.
9. **Activate the SDK**: open the game from the upload page in GD's test iframe, press PLAY on
   our start screen and watch the preroll ad to the end. GD marks the SDK integration as valid
   after one complete view (ad blocker off).
10. **Request activation** (submit for review). GD's review takes a few days up to a week; they
    email feedback when something needs changing.

## Game ids: two ways, both supported

GD gives every game a 32-character hex id when you create it, and serves the game from
`https://html5.gamedistribution.com/<gameId>/` (or `/<token>/<gameId>/`). The id must be in
`GD_OPTIONS.gameId` when the SDK loads.

1. **Nothing to do (default).** At runtime the GD adapter takes the first 32-character hex
   segment of the page URL as the id (`gdGameIdFromLocation` in
   `src/games/engine/platform.js`). So the zips can be uploaded before any id exists.
2. **Build the id in.** Paste the ids into `scripts/portals/gamedistribution-ids.json`:

   ```json
   {
     "stack-tower": "0123456789abcdef0123456789abcdef",
     "wordy": "fedcba9876543210fedcba9876543210"
   }
   ```

   then run `npm run gd:bundle` (or just `npm run gd:build`) and upload the new zip on the
   game's Upload tab. A configured id always wins over the URL. For a one-off build,
   `GD_GAME_IDS='{"stack-tower":"<id>"}' npm run gd:build -- stack-tower` overrides the file.
   Anything that is not 32 hex characters is ignored with a warning.

## What GD QA checks, and how our builds meet it

Sources: GD developer guidelines, SDK wiki, design guidelines (links at the end).

| GD rule | Our GD build |
| --- | --- |
| SDK loaded once, early, with `GD_OPTIONS` (`gameId`, `onEvent`) | Loaded at boot from `html5.api.gamedistribution.com/main.min.js`, script id `gamedistribution-jssdk` |
| Preroll before the game, best on the Play button | Start screen (title, how to play, controls for the device, PLAY); the preroll runs on that tap, the game starts after it |
| Midrolls between sessions, on non-gameplay buttons, after user input | Requested on every "Play again" tap; the SDK enforces its own minimum gap and refuses early calls, which we treat as "no ad" |
| Pause AND mute on `SDK_GAME_PAUSE`, resume on `SDK_GAME_START` | Game loop frozen and the audio context suspended for the whole ad |
| After an ad, a pause screen that resumes only on player input | A run interrupted by an ad shows "PAUSED, tap to resume" |
| Rewarded: reward only when the ad completed | Offered only when `preloadAd('rewarded')` succeeds, shown only on an explicit tap, reward only after `SDK_REWARDED_WATCH_COMPLETE` |
| Check that `gdsdk` and `showAd` exist; a blocked SDK must not break the game | Every SDK call is guarded and time-limited (5 s ready, 6 s ad start, 90 s ad cap); blocked SDK: the game plays normally without ads |
| No outgoing links, social or store links, contact details | None in any game or in the shell |
| No third-party ads, cookies, trackers or analytics | The GD build only loads the GD SDK; its `platform.js` contains only the GD adapter. Best scores and the sound setting are kept in localStorage on the device (no personal data, nothing sent anywhere) |
| Desktop: Chrome, Firefox, Safari; keyboard and/or mouse | All games: mouse and keyboard, plus touch |
| Iframe and fullscreen without cuts, responsive | The canvas letterboxes the game into any frame size |
| Mobile: touch friendly; lock orientation or ask to rotate | Touch controls; on phones held sideways a "Turn your device upright" screen pauses the game |
| Default language English | English |
| Sound toggle recommended | Sound button in every game |
| Thumbnails 512x512, 512x384, 200x120 required; 1280x720, 1280x550 optional; sharp, not stretched, no white or rounded borders, title only on the 1280s, no logo or small details on 200x120 | Rendered natively at each size from the game's own cover art (no upscaling); 200x120 cropped in on the subject; 1280s carry the title in the og-card style |
| Titles distinct from games already on GD; no famous names | 7 titles got a suffix because GD already lists the plain name: Block Crush Combo, Color Rush Climb, 2048 Slide and Merge, Neon Snake Combo, Shark Attack Party, Stack Tower Sky, Sudoku Daily Grid (checked against GD's catalog feed, 21,702 games, 1 Oct 2026) |
| Description and instructions 200 to 500 characters, exact title in the description, no hype words | Checked by `npm run gd:meta` |
| 1 to 2 genres, 1 to 5 tags | Checked by `npm run gd:meta` |

### Open points for you to decide

- **Background music.** The guidelines say games "must include sound elements such as
  background music (BGM), sound effects (SFX) and UI sounds". Ours have generated sound effects
  and UI clicks but no music. GD may ask for music in review. Adding a light generated loop
  per game is possible but is a separate piece of work.
- **Titles.** Keep the seven suffixed titles, or pick others: edit `title` in
  `scripts/portals/gamedistribution-listing.mjs` and run `npm run gd:bundle` (the start screen
  and the 1280 banners use it).
- **Native apps sentence** in the terms (see above).
- **Age groups** in the form: the CSV only says kids friendly or not; GD's own age options are
  picked in the dashboard.

## Updating a game later

Change the game as usual, then `npm run gd:bundle`, then upload the new `games/<slug>.zip` (and
new images if the art changed) on that game's page. The terms require the GD version to match
the latest version elsewhere.

## Sources

- Developer guidelines: https://static.gamedistribution.com/developer/developers-guidelines.html
- Design (thumbnail) guidelines: https://static.gamedistribution.com/developer/design-guidelines.html
- Developer Game License Agreement: https://static.gamedistribution.com/terms/developer.html
- SDK implementation and rewarded ads: https://github.com/GameDistribution/GD-HTML5/wiki
  (SDK-Implementation, Rewarded-Ads, F.A.Q.)
- SDK source as served (version 1.43.58, June 2026): https://html5.api.gamedistribution.com/main.min.js
  (game URL patterns `html5.gamedistribution.com/<32 hex>/` and `/<8 chars>/<32 hex>/`,
  "requested too soon" ad pacing, rewarded flag check)
- Catalog feed (genres, tags, existing titles, asset naming `<gameId>-512x384.jpg`):
  https://catalog.api.gamedistribution.com/api/v2.0/rss/All/?format=json
