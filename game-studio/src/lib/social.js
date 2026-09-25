// Daily social media feed for posting agents (e.g. Grokbot). Everything is generated from
// real site data, deterministic per UTC day (stable ids, so re-fetching never duplicates),
// with per-platform copy, public media URLs and UTM-tagged links that credit each post
// with the visits and plays it brings (see api/events: utm_content = post id).
import { GAMES, getGame, gameOfTheDay, dailyGames, hasClip } from './games';
import { GUIDES } from './guides';
import { COLLECTIONS } from './collections';
import { SITE, SOCIAL, CATEGORIES } from './site';

export const PLATFORMS = ['x', 'threads', 'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin'];

export const BRAND = {
  name: SITE.name,
  tagline: SITE.tagline,
  voice: [
    'Playful, punchy, confident. Short sentences. Sound like a friend daring you, not an ad.',
    'Every post has one clear call to action and the tracked link from this feed (or "link in bio" where links are not clickable).',
    'Only real facts: scores, names and numbers come from this feed. Never invent stats, player counts, reviews or awards.',
    'Emoji: at most two per post. Hashtags: X and Threads 0 to 2, LinkedIn 3, Instagram and TikTok 3 to 6. Use the ones provided.',
    'Never use the em dash or en dash characters.',
    'Kind and inclusive; no politics, no negativity about other games or companies.',
  ],
  hashtags: {
    x: ['#browsergames', '#indiegames'],
    threads: ['#gaming'],
    instagram: ['#browsergames', '#mobilegames', '#puzzlegames', '#arcade', '#indiegame'],
    tiktok: ['#gaming', '#mobilegames', '#puzzle', '#satisfying', '#fyp'],
    youtube: ['#shorts', '#gaming', '#browsergames'],
    facebook: [],
    linkedin: ['#gamedev', '#indiegames', '#marketing'],
  },
};

export const RULES = {
  maxPostsPerDay: { x: 4, threads: 3, instagram: 1, tiktok: 2, youtube: 1, facebook: 2, linkedin: 1 },
  minMinutesBetweenPosts: 90,
  engagement: [
    'Reply to genuine comments within a few hours, briefly and warmly; invite people to share their score.',
    'Repost or quote players who share a Retry Arcade score or challenge link.',
    'Do not follow/unfollow for growth, do not mass-like, do not DM people who did not message first, never buy followers or engagement.',
    'Respect each platform\'s automation rules; label the account as automated where the platform asks for it.',
  ],
  escalateToOwner: [
    'Complaints, bug reports with personal data, refund requests',
    'Press, partnership, sponsorship or advertising enquiries (point brands to /advertise too)',
    'Anything legal, safety related, or involving minors',
    'Any post that gets unusual negative attention',
  ],
};

const DAY_MS = 86400000;
const utcDayString = (d) => d.toISOString().slice(0, 10);
const dayIndex = (d) => Math.floor(d.getTime() / DAY_MS);
const at = (day, hh, mm = 0) => `${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`;
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
const firstSentence = (s) => (String(s).match(/^[^.!?]+[.!?]/) || [String(s)])[0].trim();

function links(url, campaign, id) {
  const out = {};
  for (const p of PLATFORMS) {
    const u = new URL(url);
    u.searchParams.set('utm_source', p);
    u.searchParams.set('utm_medium', 'social');
    u.searchParams.set('utm_campaign', campaign);
    u.searchParams.set('utm_content', id);
    out[p] = u.toString();
  }
  return out;
}

function gameMedia(slug) {
  const g = getGame(slug);
  const m = [];
  if (hasClip(slug))
    m.push({
      type: 'video',
      url: `${SITE.url}/clips/${slug}.mp4`,
      poster: `${SITE.url}/clips/${slug}.webp`,
      width: 432,
      height: 768,
      seconds: 6,
      loop: true,
      use: 'Reels, TikTok, Shorts, stories and native video on X/Threads/Facebook/LinkedIn',
      alt: `Gameplay loop of ${g.title}: ${g.tagline}`,
    });
  m.push({ type: 'image', url: `${SITE.url}/social/posts/${slug}-1080x1350.jpg`, width: 1080, height: 1350, use: 'Feed posts', alt: `${g.title} key art: ${g.tagline}` });
  m.push({ type: 'image', url: `${SITE.url}/og/${slug}.jpg`, width: 1200, height: 630, use: 'Link cards and wide images', alt: `${g.title} key art` });
  return m;
}

// Build one post: shared fields plus per-platform text. `x` must fit 280 chars with the
// link counted as 23 (X shortens every URL to 23 characters).
function post({ day, kind, slug = null, when, platforms, campaign, url, media, copy }) {
  const id = `${day.slice(5).replace('-', '')}-${kind}${slug ? `-${slug}` : ''}`.slice(0, 40);
  const lk = links(url, campaign, id);
  const text = {};
  for (const p of platforms) {
    const tags = BRAND.hashtags[p] || [];
    const c = copy[p] || copy.default;
    if (p === 'x' || p === 'threads' || p === 'facebook') {
      const tagStr = tags.length ? ` ${tags.slice(0, p === 'facebook' ? 0 : 2).join(' ')}` : '';
      const budget = 280 - 24 - tagStr.length;
      text[p] = `${clip(c, budget)} ${lk[p]}${tagStr}`.trim();
    } else if (p === 'linkedin') {
      text[p] = `${copy.linkedin || c}\n\n${lk[p]}\n\n${tags.join(' ')}`;
    } else if (p === 'youtube') {
      text[p] = { title: clip(copy.youtubeTitle || c, 95), description: `${c}\n\nPlay free, no download: ${lk[p]}\n\n${tags.join(' ')}` };
    } else {
      // Instagram / TikTok: links are not clickable in captions.
      text[p] = `${copy.caption || c}\n\nPlay free: link in bio (retryarcade.com)\n\n${tags.join(' ')}`;
    }
  }
  return { id, kind, game: slug, postAfter: when, expiresAt: at(utcDayString(new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS)), 0), platforms, text, media, links: lk };
}

/**
 * Posts for one UTC day. champions: output of getChampions() for that day (real data).
 */
export function buildFeed({ date = new Date(), champions = [] } = {}) {
  const day = utcDayString(date);
  const idx = dayIndex(date);
  const weekday = date.getUTCDay(); // 0 Sunday
  const posts = [];

  // 1. Game of the Day with its gameplay loop (the strongest short-video content).
  const gotd = gameOfTheDay(date);
  posts.push(
    post({
      day,
      kind: 'gotd',
      slug: gotd.slug,
      when: at(day, 13, 0),
      platforms: ['x', 'instagram', 'tiktok', 'youtube', 'facebook'],
      campaign: 'gotd',
      url: `${SITE.url}/games/${gotd.slug}`,
      media: gameMedia(gotd.slug),
      copy: {
        default: `Game of the day: ${gotd.title}. ${gotd.tagline} Free in your browser, no download.`,
        caption: `Game of the day: ${gotd.title} ${gotd.emoji}\n${gotd.tagline}\nFree to play, no download. Drop your best score below.`,
        youtubeTitle: `${gotd.title}: ${gotd.tagline} #shorts`,
      },
    }),
  );

  // 2. Daily Arena reset (right after midnight UTC).
  const daily = dailyGames(date, 4);
  posts.push(
    post({
      day,
      kind: 'daily',
      slug: daily[0]?.slug,
      when: at(day, 0, 20),
      platforms: ['x', 'threads', 'facebook'],
      campaign: 'daily',
      url: `${SITE.url}/daily`,
      media: daily[0] ? gameMedia(daily[0].slug) : [],
      copy: {
        default: `New Daily Arena levels just dropped: ${daily.map((g) => g.title).join(', ')}. Same level for every player on Earth. Post your best before midnight UTC.`,
      },
    }),
  );

  // 3. Real champions only (skipped when nobody has played yet today).
  const top = [...champions].sort((a, b) => b.players - a.players).slice(0, 2);
  for (const c of top) {
    posts.push(
      post({
        day,
        kind: 'champ',
        slug: c.slug,
        when: at(day, top.indexOf(c) ? 20 : 17, 0),
        platforms: ['x', 'threads'],
        campaign: 'champion',
        url: `${SITE.url}/games/${c.slug}`,
        media: gameMedia(c.slug),
        copy: {
          default: `${c.name} holds today's ${c.title} crown with ${c.score}. ${c.players > 1 ? `${c.players} players tried so far.` : 'Nobody has beaten it yet.'} Think you can take it?`,
        },
      }),
    );
  }

  // 4. A "go for gold" challenge on a rotating game with a clip.
  const withMedals = GAMES.filter((g) => g.medals && !g.lowerIsBetter);
  const ch = withMedals[idx % withMedals.length];
  if (ch) {
    const fmt = (v) => (ch.formatScore ? ch.formatScore(v) : v);
    const label = String(ch.scoreLabel || 'points').toLowerCase();
    posts.push(
      post({
        day,
        kind: 'gold',
        slug: ch.slug,
        when: at(day, 15, 30),
        platforms: ['tiktok', 'x'],
        campaign: 'challenge',
        url: `${SITE.url}/games/${ch.slug}`,
        media: gameMedia(ch.slug),
        copy: {
          default: `Gold in ${ch.title} takes ${fmt(ch.medals[2])} ${label}. Silver is ${fmt(ch.medals[1])}. Which one are you getting?`,
          caption: `Gold takes ${fmt(ch.medals[2])} ${label} in ${ch.title} ${ch.emoji}\nSilver is ${fmt(ch.medals[1])}. Be honest: which one are you getting?`,
        },
      }),
    );
  }

  // 5. A strategy tip from the guides (evergreen, drives search-style interest).
  const guides = GUIDES.filter((g) => getGame(g.game));
  const gd = guides[idx % guides.length];
  if (gd) {
    posts.push(
      post({
        day,
        kind: 'tip',
        slug: gd.game,
        when: at(day, 10, 0),
        platforms: ['x', 'facebook'],
        campaign: 'guide',
        url: `${SITE.url}/guides/${gd.slug}`,
        media: gameMedia(gd.game).filter((m) => m.type === 'image'),
        copy: { default: `${gd.title}. ${firstSentence(gd.intro)}` },
      }),
    );
  }

  // 6. A "games like..." list every other day.
  if (idx % 2 === 0 && COLLECTIONS.length) {
    const col = COLLECTIONS[Math.floor(idx / 2) % COLLECTIONS.length];
    const first = col.picks?.[0]?.game;
    posts.push(
      post({
        day,
        kind: 'list',
        slug: first,
        when: at(day, 21, 0),
        platforms: ['x', 'threads'],
        campaign: 'list',
        url: `${SITE.url}/best/${col.slug}`,
        media: first ? gameMedia(first).filter((m) => m.type === 'image') : [],
        copy: { default: `${col.title.split(':')[0]}? ${firstSentence(col.answer)}` },
      }),
    );
  }

  // 7. LinkedIn: studio / B2B posts on Monday and Thursday.
  if (weekday === 1) {
    posts.push(
      post({
        day,
        kind: 'brands',
        when: at(day, 8, 30),
        platforms: ['linkedin'],
        campaign: 'advertise',
        url: `${SITE.url}/advertise`,
        media: [{ type: 'image', url: `${SITE.url}/brand/banner-linkedin-1584x396.jpg`, width: 1584, height: 396, alt: `${SITE.name} banner` }],
        copy: {
          default: `Brands: sponsor the Daily Arena.`,
          linkedin: `${SITE.name} is a free arcade of ${GAMES.length} instant-play browser games. Players come back every day for a Daily Challenge that is identical for everyone on Earth.\n\nWe are opening a few sponsorship slots: your brand presents the Daily Arena, or we build a branded game for your campaign. Family-friendly, brand-safe, mobile-first.`,
        },
      }),
    );
  }
  if (weekday === 4) {
    const g = GAMES[Math.floor(idx / 7) % GAMES.length];
    posts.push(
      post({
        day,
        kind: 'build',
        slug: g.slug,
        when: at(day, 8, 30),
        platforms: ['linkedin'],
        campaign: 'studio',
        url: `${SITE.url}/games/${g.slug}`,
        media: gameMedia(g.slug),
        copy: {
          default: `Behind the game: ${g.title}.`,
          linkedin: `Behind the game: ${g.title} (${CATEGORIES[g.category]?.name}).\n\n${g.tagline} ${firstSentence(g.description)} Every Retry Arcade game is built on a tiny dependency-free HTML5 engine, loads in about a second and runs on any phone or laptop. Tell us what we should build next.`,
        },
      }),
    );
  }

  posts.sort((a, b) => a.postAfter.localeCompare(b.postAfter));
  return {
    version: 1,
    day,
    generatedAt: new Date().toISOString(),
    site: SITE.url,
    brand: { ...BRAND, handles: Object.fromEntries(SOCIAL.map((s) => [s.id, s.url])) },
    rules: RULES,
    report: {
      url: `${SITE.url}/api/social/report`,
      method: 'POST',
      auth: 'Authorization: Bearer <SOCIAL_REPORT_TOKEN>',
      body: {
        id: 'post id from this feed',
        platform: 'one of ' + PLATFORMS.join(', '),
        url: 'public URL of the published post',
        postedAt: 'ISO time',
        metrics: { impressions: 0, likes: 0, reposts: 0, replies: 0, clicks: 0, follows: 0 },
      },
      note: 'Send once when you publish, then again with updated metrics (for example after 24 h and 72 h). Same id + platform updates the record.',
    },
    posts,
  };
}
