import { SITE } from '@/lib/site';

export default function robots() {
  return {
    // /c/ (challenge) and /embed/ pages carry noindex meta but must stay crawlable so social
    // preview bots (which honour robots.txt) can read their cards; /api/og is the card image.
    rules: [{ userAgent: '*', allow: ['/', '/api/og'], disallow: ['/api/', '/studio'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
