# Hand-off: account setup in Chrome on your Mac

This cloud session cannot reach your Mac or your browser, so these steps run in a Claude
session on your Mac instead (the Claude Desktop app with Chrome access, or
`claude remote-control` in a terminal). Open that session and paste the prompt below.

That session will do everything it can in your logged-in Chrome and will stop and ask you
whenever a step needs you personally: accepting terms, entering payment, bank or tax
details, phone or 2FA codes, CAPTCHAs. Never type passwords or card numbers into the chat.

---

## Prompt to paste

You are helping me set up accounts for my games website **https://retryarcade.com**
(Vercel project `retryarcade`, team `bhargavlakkarajus-projects`). Use my Chrome, where
I am already logged in to Google (bhargav@hooplaindia.com) and Vercel. Work through the
tasks in order. Stop and ask me before: accepting any terms of service, entering payment,
bank, tax or identity details, entering any phone or 2FA code, or solving a CAPTCHA.
After each task, add the value you got as a Vercel environment variable
(Vercel -> retryarcade -> Settings -> Environment Variables, environments Production and
Preview) and keep a list of what you set. At the end, redeploy production once
(Deployments -> latest production deployment -> ... -> Redeploy) and report back.

1. **Vercel production branch.** Vercel -> retryarcade -> Settings -> Environments ->
   Production -> Branch Tracking: set the branch to `claude/vibrant-fermi-8m1anm` and save.

1b. **Vercel Web Analytics: DONE.** Enabled and collecting since 2026-09-29 (readable through
   the Vercel connector's count_pageviews, called without teamId).

1c. **Google Analytics 4: DONE.** Property `Retry Arcade` (properties/556324696, Measurement
   ID `G-DY8ZTFERWD`) is live on every page. Verified through Ryze on 2026-09-30: event data
   retention 14 months; key events `game_start`, `share_click`, `feed_play` (no default value);
   custom dimensions `Game` (`game_name`) and `Share method` (`method`); custom metric
   `Play seconds` (`play_seconds`, seconds). Search Console link: the Domain property
   `retryarcade.com` is linked to the Retry Arcade web stream (15861432973), 2026-09-30.

2. **Google AdSense: site connected 2026-10-01, waiting for review.** Publisher ID
   `ca-pub-8054463057159999` is set in Vercel (production) as `NEXT_PUBLIC_ADSENSE_CLIENT`,
   so every page loads the AdSense code snippet and the `google-adsense-account` meta tag, and
   https://retryarcade.com/ads.txt carries `google.com, pub-8054463057159999, DIRECT,
   f08c47fec0942fa0`. Until approval, `NEXT_PUBLIC_DISPLAY_NETWORK=house` keeps our own promos
   in the ad slots and `NEXT_PUBLIC_ADS_PROVIDER=none` keeps in-game ad breaks off.
   Still to do in AdSense: Sites -> retryarcade.com -> verify with "AdSense code snippet"
   (or ads.txt), tick "I've placed the code", Verify, then Request review (takes days to
   weeks). The Google consent message (Privacy & messaging -> European regulations) is
   published (2026-10-01): it is the banner EU/EEA, UK and Swiss visitors use to grant
   consent, on top of the Consent Mode v2 defaults the site sends (they start as "denied").
   The code snippet is a plain <script async> in <head> (a next/script loader made the first
   verification attempt fail).
   After approval, tell the cloud session: it turns on Auto ads or real ad units (switching
   `NEXT_PUBLIC_DISPLAY_NETWORK` to `adsense`) and redeploys.

3. **Adsterra (earns while AdSense reviews).** Go to https://adsterra.com, choose
   "Sign up" as a **Publisher** with bhargav@hooplaindia.com (ask me for the
   email confirmation code). Add website `https://retryarcade.com`, category Games.
   Create four **Banner** units: 300x250, 728x90, 320x50, 160x600. For each one, open
   "Get code" and copy the key (the long id inside `atOptions = { 'key' : '...' }`) and
   the host in the script URL (usually `www.highperformanceformat.com`). Set:
   - `NEXT_PUBLIC_DISPLAY_NETWORK=adsterra`
   - `NEXT_PUBLIC_ADSTERRA_KEYS=300x250:KEY1,728x90:KEY2,320x50:KEY3,160x600:KEY4`
   - `NEXT_PUBLIC_ADSTERRA_HOST=<host>` only if it is not www.highperformanceformat.com
   Do not create Popunder, Social Bar or Direct Link units (they hurt the site).
   Payout details: stop and let me enter them.

4. **Search Console + Bing Webmaster Tools: DONE.** The Google Search Console Domain property
   `retryarcade.com` is verified with `sitemap.xml` and `video-sitemap.xml` submitted, and the
   site was imported into Bing Webmaster Tools from Search Console on 2026-09-30 (Bing also
   feeds ChatGPT search and Copilot answers). IndexNow pings Bing on every sitemap change.

5. **Email on Google Workspace: hello@retryarcade.com: DONE (DNS verified 2026-09-30).**
   Live public records: MX `smtp.google.com` (priority 1), SPF `v=spf1 include:_spf.google.com
   ~all`, DMARC `v=DMARC1; p=none; rua=mailto:hello@retryarcade.com`, the Google site
   verification TXT and a DKIM key at `google._domainkey` (DKIM can only be generated once the
   domain is added to Workspace). A test mail from the Workspace account to hello@ did not
   bounce. Gmail files mail you send to your own alias under Sent only, so the final proof is
   one mail from an outside address (for example a personal Gmail) landing in the inbox.
   Optional: Gmail -> Settings -> Accounts -> Send mail as -> add hello@retryarcade.com to
   reply from it. After a few weeks of clean DMARC reports, tighten DMARC to `p=quarantine`.

6. **Social profiles.** Use https://github.com/bhargavlakkaraju/bhargavlakkaraju/blob/claude/vibrant-fermi-8m1anm/game-studio/docs/SOCIAL_KIT.md
   for handles, bios and which image goes where (images are at
   https://retryarcade.com/brand/avatar-1080.png, /brand/banner-x-1500x500.jpg,
   /brand/banner-linkedin-1584x396.jpg, /brand/banner-linkedin-company-1128x191.jpg,
   /brand/banner-youtube-2560x1440.jpg, /brand/cover-facebook-1640x624.jpg). Create, in
   this order: X, Instagram (switch to a free Creator or Business account), TikTok,
   YouTube channel, LinkedIn Company Page, Facebook Page. Stop for me on every phone
   verification or CAPTCHA. For each profile you finish, set the matching variable:
   `NEXT_PUBLIC_SOCIAL_X`, `NEXT_PUBLIC_SOCIAL_INSTAGRAM`, `NEXT_PUBLIC_SOCIAL_TIKTOK`,
   `NEXT_PUBLIC_SOCIAL_YOUTUBE`, `NEXT_PUBLIC_SOCIAL_LINKEDIN`,
   `NEXT_PUBLIC_SOCIAL_FACEBOOK` (full profile URLs), and `NEXT_PUBLIC_TWITTER=@handle`.

7. Redeploy production once (see above) and give me a summary: which tasks are done, every
   environment variable you set (names only for anything secret), and anything still
   waiting on me or on a review.

---

## After it finishes

Tell the cloud session "accounts are set up". It will check the live site for the
AdSense tag, `ads.txt`, the Adsterra banners, the verification record and the social
links, and switch the display network to AdSense once AdSense approves the site.
