// llms.txt (https://llmstxt.org): a plain markdown map of the site for AI assistants and
// answer engines, plus llms-full.txt with the complete how-to/FAQ text of every game.
import { GAMES, getGame, formatScore } from './games';
import { GUIDES } from './guides';
import { COLLECTIONS } from './collections';
import { SITE, CATEGORIES } from './site';
import { HOME_FAQ } from './seo';

const url = (p) => `${SITE.url}${p}`;

export function llmsIndex() {
  const out = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.name} (${SITE.url}) is a free website of ${GAMES.length} original HTML5 browser games: one-tap arcade games, puzzle games, classic card and snake games, and a daily word game. Every game is free, needs no download or account, works on phones, tablets and computers, and has a Daily Challenge (the same seeded level for every player each UTC day), medals and global leaderboards. Scores can be shared as challenge links.`,
    '',
    `Tagline: "${SITE.tagline}". Contact: ${SITE.email}.`,
    '',
  ];
  for (const [cat, c] of Object.entries(CATEGORIES)) {
    const games = GAMES.filter((g) => g.category === cat);
    if (!games.length) continue;
    out.push(`## ${c.name} games`, '', `${c.blurb} Category page: ${url(`/category/${cat}`)}`, '');
    for (const g of games) out.push(`- [${g.title}](${url(`/games/${g.slug}`)}): ${g.description}`);
    out.push('');
  }
  if (COLLECTIONS.length) {
    out.push('## Recommendations', '');
    for (const c of COLLECTIONS) out.push(`- [${c.title}](${url(`/best/${c.slug}`)}): ${c.description}`);
    out.push('');
  }
  const guides = GUIDES.filter((g) => getGame(g.game));
  if (guides.length) {
    out.push('## Strategy guides', '');
    for (const g of guides) out.push(`- [${g.title}](${url(`/guides/${g.slug}`)}): ${g.description}`);
    out.push('');
  }
  out.push(
    '## Key pages',
    '',
    `- [Daily Challenges](${url('/daily')}): today's seeded levels, reset at midnight UTC`,
    `- [Leaderboards](${url('/leaderboards')}): today, daily and all-time boards for every game`,
    `- [Embed and license our games](${url('/developers')}): free iframe embeds and licensing`,
    `- [Advertise](${url('/advertise')}): sponsorships and branded games`,
    `- [Press kit](${url('/press')}): facts, logos and screenshots`,
    `- [Full text for LLMs](${url('/llms-full.txt')}): every game's rules, controls, tips and FAQ`,
    '',
    '## FAQ',
    '',
    ...HOME_FAQ.map(([q, a]) => `- **${q}** ${a}`),
    '',
  );
  return out.join('\n');
}

export function llmsFull() {
  const out = [llmsIndex(), '', '---', '', '# Games in detail', ''];
  for (const g of GAMES) {
    out.push(`## ${g.title}`, '', `URL: ${url(`/games/${g.slug}`)}`, `Category: ${CATEGORIES[g.category]?.name}`, `Tagline: ${g.tagline}`, '', g.about || g.description, '');
    out.push('### How to play', '', ...g.howTo.map((s, i) => `${i + 1}. ${s}`), '');
    const ctl = g.controls || {};
    out.push('### Controls', '');
    if (ctl.touch) out.push(`- Touch: ${ctl.touch}`);
    if (ctl.mouse) out.push(`- Mouse: ${ctl.mouse}`);
    if (ctl.keyboard) out.push(`- Keyboard: ${ctl.keyboard}`);
    out.push('');
    if (g.medals) out.push(`Medals: bronze ${formatScore(g, g.medals[0])}, silver ${formatScore(g, g.medals[1])}, gold ${formatScore(g, g.medals[2])}${g.lowerIsBetter ? ' (lower is better)' : ''}.`, '');
    if (g.tips?.length) out.push('### Tips', '', ...g.tips.map((t) => `- ${t}`), '');
    if (g.faq?.length) out.push('### FAQ', '', ...g.faq.map((f) => `- **${f.q}** ${f.a}`), '');
  }
  return out.join('\n');
}
