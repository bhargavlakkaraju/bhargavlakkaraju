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

1c. **Google Analytics 4 (property and tag are DONE, 4 admin clicks left).** Property
   `Retry Arcade` (properties/556324696, Measurement ID `G-DY8ZTFERWD`) exists, the variable
   is set and the tag is live on every page. The API access we have is read-only, so these
   need the GA4 web UI (https://analytics.google.com, property Retry Arcade -> Admin):
   - **Data retention:** Data collection and modification -> Data retention -> Event data
     retention -> **14 months** -> Save (the default of 2 months deletes history too soon).
   - **Custom dimensions:** Data display -> Custom definitions -> Create custom dimension,
     scope Event: `Game` = parameter `game_name`, and `Share method` = parameter `method`.
     Then Custom metrics -> Create: `Play seconds` = parameter `play_seconds`, unit Seconds.
   - **Key events:** Data display -> Events -> mark as key event: `game_start`,
     `share_click`, `feed_play` (they appear in the list once they have fired at least once;
     or use Key events -> New key event and type the name).
   - **Search Console link:** Product links -> Search Console links -> Link ->
     choose `retryarcade.com` (the Domain property) -> web stream `retryarcade.com` -> Submit.

2. **Google AdSense.** Go to https://adsense.google.com and start with my Google account.
   Website: `retryarcade.com`. Country: India. Stop for me to accept the terms. When the
   publisher ID appears (`ca-pub-` followed by 16 digits), set
   `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...`. The site already outputs the AdSense meta tag
   and `ads.txt` from that variable, so after the redeploy choose the "meta tag" or
   "ads.txt" verification in AdSense and click Verify, then Request review.
   Do NOT set NEXT_PUBLIC_DISPLAY_NETWORK to adsense yet (that happens after approval).

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

4. **Bing Webmaster Tools.** (Google Search Console is DONE: the Domain property
   `retryarcade.com` is verified and both `sitemap.xml` and `video-sitemap.xml` are
   submitted.) At https://www.bing.com/webmasters sign in with the same Google account and use
   "Import from Google Search Console" for retryarcade.com. Bing also powers ChatGPT search
   and Copilot answers, so this matters for AI answers too.

5. **Email on Google Workspace: hello@retryarcade.com** (uses the Workspace you already have).
   a. https://admin.google.com -> Account -> Domains -> Manage domains -> **Add a domain** ->
      `retryarcade.com` -> **Secondary domain** -> Add domain & start verification. (A
      secondary domain is free. Only new users cost a license, and we do not need one.)
   b. Google shows a TXT record (`google-site-verification=...`). In Vercel -> Domains ->
      retryarcade.com -> DNS Records -> Add: type **TXT**, name `@`, value = that string.
      Back in Google Admin click **Verify** (retry for a few minutes if needed).
   c. Add the mail records in the same Vercel DNS screen:
      - MX, name `@`, value `smtp.google.com`, priority `1`
      - TXT, name `@`, value `v=spf1 include:_spf.google.com ~all`
      - TXT, name `_dmarc`, value `v=DMARC1; p=none; rua=mailto:hello@retryarcade.com`
      Then in Admin -> Google Workspace -> Gmail -> **Setup** -> activate Gmail for the domain.
   d. Admin -> Directory -> Users -> Bhargav -> **Add alternate email** -> `hello` @
      `retryarcade.com` (free, lands in the existing inbox). Optionally also `team@` and
      `press@`. For the social accounts it is cleaner to create a free **Google Group**
      `hello@retryarcade.com` with yourself as the member, so sign-up emails can be shared.
   e. DKIM (inbox deliverability): Admin -> Apps -> Google Workspace -> Gmail -> Authenticate
      email -> select retryarcade.com -> Generate new record (2048 bit) -> add the TXT it shows
      in Vercel (name `google._domainkey`) -> Start authentication.
   f. Send a test email to hello@retryarcade.com from another address.
   (No Workspace? The free fallback is https://improvmx.com forwarding with its MX and SPF records.)

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
