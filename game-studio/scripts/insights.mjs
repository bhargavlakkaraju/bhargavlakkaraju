#!/usr/bin/env node
// Weekly "studio autopilot" report. Pulls /api/stats from the live site and turns the
// numbers into a ranked list of concrete improvements. The scheduled improvement agent
// (see docs/AUTOPILOT.md) runs this, picks the top item, ships it, and measures again.
//
// Usage: SITE_URL=https://retryarcade.com STUDIO_TOKEN=... node scripts/insights.mjs [--days 7] [--out docs/reports]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const SITE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.STUDIO_TOKEN || '';
const days = Number(opt('days', 7));
const outDir = opt('out', null);

const res = await fetch(`${SITE}/api/stats?days=${days}`, { headers: { authorization: `Bearer ${TOKEN}` } });
if (!res.ok) {
  console.error(`stats request failed: ${res.status}`);
  process.exit(1);
}
const s = await res.json();
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const f1 = (n) => (Math.round(n * 10) / 10).toLocaleString();

const recs = [];
const add = (impact, title, why, action) => recs.push({ impact, title, why, action });
const active = s.games.filter((g) => g.loads >= 30);
const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};
const medRpp = median(active.map((g) => g.runsPerPlayer));
const medShare = median(active.map((g) => g.shareRate));

for (const g of active) {
  if (g.startRate < 60)
    add(3, `${g.title}: weak first impression (${g.startRate}% of loads start a run)`, 'Players leave before tapping once.', 'Make the ready screen clearer (animated hint of the first action), speed up load, consider startMode immediate.');
  if (g.runsPerPlayer < medRpp * 0.6)
    add(3, `${g.title}: low replay (${g.runsPerPlayer} runs/player vs median ${f1(medRpp)})`, 'Deaths feel unfair or progress feels slow.', 'Soften the first 20 seconds, add a near-miss/combo reward, shorten time-to-retry, check difficulty curve.');
  if (g.avgRunSec > 240 && g.runsPerPlayer < medRpp)
    add(2, `${g.title}: long runs (${g.avgRunSec}s avg), few retries`, 'Long sessions mean fewer game-over moments (fewer ad + share opportunities).', 'Add mid-run milestones with a share prompt, or tighten difficulty ramp.');
  if (g.shareRate > medShare * 1.8 && g.runs > 100)
    add(2, `${g.title}: viral outlier (${g.shareRate}% share rate)`, 'This game spreads itself.', 'Feature it as Game of the Day more often, make a TikTok clip from it, build a sequel/variant.');
  if (g.reviveOffers > 50 && pct(g.revives, g.reviveOffers) < 8)
    add(1, `${g.title}: continue offer ignored (${f1(pct(g.revives, g.reviveOffers))}% take rate)`, 'Rewarded ads are the highest-paying format.', 'Revive players closer to their best score, make the continue button more prominent, show "you were 3 from your best".');
}
if (s.totals.runs > 200 && pct(s.totals.shares, s.totals.runs) < 1.5)
  add(3, `Site-wide share rate is low (${f1(pct(s.totals.shares, s.totals.runs))}% of runs)`, 'Virality depends on shares per run.', 'Test a bolder share CTA, auto-prompt sharing after new bests, make the OG card more competitive.');
if (s.totals.shares > 50 && pct(s.totals.challengeOpens, s.totals.shares) < 20)
  add(2, `Challenge links convert poorly (${f1(pct(s.totals.challengeOpens, s.totals.shares))}% opened)`, 'Shares are sent but not clicked.', 'Improve the OG image copy, prefer WhatsApp button, shorten URL.');
const d1 = s.retention.d1 || 0;
const d0 = s.retention.d0 || 0;
if (d0 > 100 && pct(d1, d0) < 10)
  add(3, `Day-1 return is weak (${f1(pct(d1, d0))}% of new visitors come back next day)`, 'Retention compounds every other metric.', 'Push Daily Challenge + streaks harder on game over, add PWA install prompt, email capture after 3rd run.');
for (const [name, variants] of Object.entries(s.experiments)) {
  const rows = Object.entries(variants).map(([v, e]) => ({ v, runs: e.game_over || 0, share: pct(e.share_click || 0, e.game_over || 0), restart: pct(e.restart || 0, e.game_over || 0) }));
  if (rows.every((r) => r.runs >= 300)) {
    const best = [...rows].sort((a, b) => b.share + b.restart - (a.share + a.restart))[0];
    add(1, `Experiment "${name}" has enough data`, rows.map((r) => `${r.v}: restart ${f1(r.restart)}%, share ${f1(r.share)}%`).join(' · '), `Ship "${best.v}" as the default and start the next test.`);
  }
}
recs.sort((a, b) => b.impact - a.impact);

const lines = [];
lines.push(`# Retry Arcade weekly insights (${s.range.from} → ${s.range.to})`, '');
lines.push(`- Unique visitors: **${s.uniqueVisitors.toLocaleString()}** · Page views: ${s.totals.pageViews.toLocaleString()}`);
lines.push(`- Runs: **${s.totals.runs.toLocaleString()}** (${f1(s.uniqueVisitors ? s.totals.runs / s.uniqueVisitors : 0)} per visitor) · Shares: ${s.totals.shares} · Challenge opens: ${s.totals.challengeOpens}`);
lines.push(`- Ads: ${s.totals.interstitials} interstitial, ${s.totals.rewarded} rewarded · Subscribers: ${s.subscribers}`, '');
lines.push('## Games', '', '| Game | Players | Runs/player | Avg run | Start rate | Share rate |', '|---|---:|---:|---:|---:|---:|');
for (const g of s.games) lines.push(`| ${g.title} | ${g.players} | ${g.runsPerPlayer} | ${g.avgRunSec}s | ${g.startRate}% | ${g.shareRate}% |`);
lines.push('', '## Recommended actions (highest impact first)', '');
if (!recs.length) lines.push('_Not enough data yet (need ~30 loads per game). Focus on distribution: see docs/MARKETING_PLAYBOOK.md._');
recs.forEach((r, i) => lines.push(`${i + 1}. **${r.title}** (impact ${'●'.repeat(r.impact)})  \n   Why: ${r.why}  \n   Do: ${r.action}`));
lines.push('', '## Top referrers', '');
s.referrers.slice(0, 10).forEach(([h, c]) => lines.push(`- ${h}: ${c}`));
const md = lines.join('\n') + '\n';
console.log(md);
if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${s.range.to}.md`);
  fs.writeFileSync(file, md);
  console.error(`saved ${file}`);
}
