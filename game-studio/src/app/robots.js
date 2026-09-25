import { SITE } from '@/lib/site';

// Search engines and AI answer engines (ChatGPT, Claude, Perplexity, Gemini, Copilot...)
// are all welcome: being cited in AI answers is a traffic source, and our llms.txt gives
// them a clean summary. Only the API and the private studio dashboard are off limits.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'DuckAssistBot',
  'MistralAI-User',
  'CCBot',
];

export default function robots() {
  // /c/ (challenge) and /embed/ pages carry noindex meta but must stay crawlable so social
  // preview bots (which honour robots.txt) can read their cards; /api/og is the card image.
  const allow = ['/', '/api/og', '/llms.txt', '/llms-full.txt'];
  const disallow = ['/api/', '/studio', '/plus/thanks'];
  return {
    rules: [{ userAgent: '*', allow, disallow }, ...AI_BOTS.map((userAgent) => ({ userAgent, allow, disallow }))],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
