import { SITE } from '@/lib/site';
import { GAMES, hasClip } from '@/lib/games';

// Video sitemap: every game page shows a 6 second gameplay loop (recorded by the game
// playing itself), so search engines can index it and show a video thumbnail.
export const dynamic = 'force-static';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
  const urls = GAMES.filter((g) => hasClip(g.slug))
    .map(
      (g) => `  <url>
    <loc>${SITE.url}/games/${g.slug}</loc>
    <video:video>
      <video:thumbnail_loc>${SITE.url}/clips/${g.slug}.webp</video:thumbnail_loc>
      <video:title>${esc(`${g.title} gameplay`)}</video:title>
      <video:description>${esc(`A 6 second gameplay loop of ${g.title}, recorded by the game playing itself. ${g.tagline} Free to play in the browser, no download.`)}</video:description>
      <video:content_loc>${SITE.url}/clips/${g.slug}.mp4</video:content_loc>
      <video:duration>6</video:duration>
      <video:publication_date>${g.released || '2026-09-24'}T00:00:00+00:00</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
    </video:video>
  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
