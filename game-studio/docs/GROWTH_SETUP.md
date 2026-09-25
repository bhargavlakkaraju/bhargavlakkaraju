# Growth setup: money, search and social

Everything in the code is already built and switched off until you add the account IDs.
Each step below says what to sign up for and which Vercel environment variable to paste
the result into (Vercel -> retryarcade -> Settings -> Environment Variables, then Redeploy).
Or send the values to Claude and it will add them.

## 0. Own the domain first (10 minutes, about $11/year)

AdSense and most premium ad networks do not approve `*.vercel.app` addresses, because you
must own the site's root domain and serve `ads.txt` from it. Buy `retryarcade.com` (Vercel
-> Domains, or any registrar), add it to the `retryarcade` project, and set it as the
primary domain. The site picks up the new address automatically for canonical links,
the sitemap, share links and structured data. Keep `retryarcade.vercel.app` redirecting to it.

## 1. Ad money

| Order | Network | Why | Env vars |
| --- | --- | --- | --- |
| 1 | **Adsterra** (adsterra.com, Publisher) | Approves almost any site within a day, including new ones. Earns while AdSense reviews. | `NEXT_PUBLIC_DISPLAY_NETWORK=adsterra`, `NEXT_PUBLIC_ADSTERRA_KEYS=300x250:KEY,728x90:KEY,320x50:KEY,160x600:KEY` |
| 2 | **Google AdSense** (adsense.google.com) | Best fill for display, plus H5 Games Ads (interstitials between runs and rewarded "continue" videos), which pay much more than banners. | `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...` then the 4 `NEXT_PUBLIC_AD_SLOT_*` ids; set `NEXT_PUBLIC_DISPLAY_NETWORK=adsense` when approved |
| 3 | **Ezoic** (ezoic.com) | No traffic minimum; often out-earns plain AdSense once traffic grows. Use it *instead of* direct AdSense display. | `NEXT_PUBLIC_DISPLAY_NETWORK=ezoic`, `NEXT_PUBLIC_EZOIC_IDS=gameSide:101,...`, `ADS_TXT_REDIRECT=https://srv.adstxtmanager.com/<id>/retryarcade.com` |
| Later | Playwire, Venatus, Freestar, AdinPlay | Premium gaming ad partners; apply at roughly 500k+ monthly page views. | Ask Claude to add the adapter |

AdSense application checklist (all already on the site): privacy policy, terms, contact
page, about page, original content on every game page, no ads inside the game canvas,
`ads.txt` generated automatically, and the `google-adsense-account` meta tag. After you get
the publisher ID, apply for **H5 Games Ads** from the AdSense account (Ad Placement API);
until it is approved, set `NEXT_PUBLIC_ADS_TEST=1` to see test ads.

The ad slots never stay empty: before any network is live they show our own promos
(advertise with us, Plus, the tip jar, today's Daily Arena).

## 2. Game portals (revenue share, no approval needed for the website)

Run `npm run export:portals` to build standalone zips of every game, then submit them:

- **CrazyGames** (developer.crazygames.com): large audience; revenue share from their ads.
- **Poki** (developers.poki.com): selective, but the biggest web-games audience.
- **GameDistribution** (gamedistribution.com): distributes your game to thousands of sites; you earn on every play.
- **GameMonetize** (gamemonetize.com): similar distribution network, easy approval.

Every portal build links back to the site where allowed, which also builds backlinks for SEO.

## 3. Direct revenue (no ad network needed)

- **Sponsors and branded games.** `/advertise` is live with packages and an enquiry form.
  Enquiries appear in `/studio`. To get each one by email, add `RESEND_API_KEY` and
  `LEADS_NOTIFY_EMAIL`. When a sponsor signs, set `NEXT_PUBLIC_SPONSOR` (JSON, see
  `.env.example`) and their logo appears on the Daily Arena and in every ad slot until the end date.
- **Retry Arcade Plus (ad-free pass).** Create a Stripe account, then a Payment Link for
  "Retry Arcade Plus" (for example $4.99, one-time). In the link settings, set *After payment*
  to "Don't show confirmation page, redirect to"
  `https://retryarcade.com/plus/thanks?session_id={CHECKOUT_SESSION_ID}`.
  Then set `NEXT_PUBLIC_PLUS_LINK` (the buy.stripe.com URL), `NEXT_PUBLIC_PLUS_PRICE`,
  `STRIPE_SECRET_KEY` (a restricted key with Checkout Sessions read access is enough),
  `STRIPE_PLUS_PAYMENT_LINK_ID` (plink_...) and `PLUS_DAYS` (365, or 0 for lifetime).
  Plus removes all ads and makes continues free. Sales show in `/studio`.
- **Tip jar.** Create a Ko-fi or Buy Me a Coffee page and set `NEXT_PUBLIC_SUPPORT_URL`.
- **Licensing.** `/developers` explains embeds and licensing; enquiries go through `/advertise`.

## 4. Search engines (SEO) and AI answer engines (AEO / GEO)

Already built: sitemap with honest dates, robots rules that welcome search and AI crawlers,
`/llms.txt` and `/llms-full.txt` for AI assistants, Organization and WebSite schema,
VideoGame, FAQ, ItemList and Breadcrumb schema, answer-first intros, FAQs on the home and
category pages, 10 "games like..." pages at `/best`, 12 strategy guides, a press kit, and
IndexNow (Bing, and through it ChatGPT search and Copilot) pinged daily for new pages.

Your steps (after the domain is live):

1. **Google Search Console** (search.google.com/search-console): add the domain property
   (DNS record, easiest in Vercel -> Domains) or a URL-prefix property with the HTML tag
   method and paste the code into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Submit
   `https://retryarcade.com/sitemap.xml`.
2. **Bing Webmaster Tools** (bing.com/webmasters): "Import from Google Search Console" (one
   click), or use `NEXT_PUBLIC_BING_SITE_VERIFICATION`. Bing also powers ChatGPT search and Copilot.
3. Set `CRON_SECRET` to any long random string so the daily IndexNow job is authorized.
4. Get listed where players and AI tools look: submit the site to game directories and
   "free games" lists, and post the games on the portals above; every mention with a link
   helps both Google rankings and how often AI assistants recommend us.

## 5. Social profiles

See `docs/SOCIAL_KIT.md` for handles, bios, images and a 30-day posting plan. When the
profiles exist, send the URLs to Claude (or set the `NEXT_PUBLIC_SOCIAL_*` variables):
they appear in the footer and in the Organization schema, which helps Google and AI
assistants connect the profiles to the site.
