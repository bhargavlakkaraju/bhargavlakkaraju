#!/usr/bin/env node
// One zip with everything needed to upload all games to GameDistribution:
//   games/<slug>.zip          upload package per game (index.html at the root of each zip)
//   assets/<slug>/...         thumbnails: 512x512, 512x384, 200x120 (required), 1280x720, 1280x550
//   assets/_preview.jpg       contact sheet of every thumbnail
//   gamedistribution.csv      every form field per game (title, description, instructions, ...)
//   UPLOAD-GUIDE.md           step by step upload instructions
// It rebuilds the metadata, the game zips and the thumbnails first (skip with --skip-build).
// Usage: node scripts/gd-bundle.mjs [--out path/to/retryarcade-gamedistribution.zip] [--skip-build]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = path.resolve(oi >= 0 ? args[oi + 1] : path.join(root, 'dist/portals/retryarcade-gamedistribution.zip'));
const skipBuild = args.includes('--skip-build');
const run = (script, ...a) => execFileSync(process.execPath, [path.join(root, 'scripts', script), ...a], { stdio: 'inherit', cwd: root });

if (!skipBuild) {
  run('gd-metadata.mjs');
  run('export-portal.mjs', '--portal', 'gamedistribution');
  run('portal-assets.mjs');
}

const buildDir = path.join(root, 'dist/portals/gamedistribution');
const assetsDir = path.join(root, 'dist/portals/gamedistribution-assets');
const rows = JSON.parse(fs.readFileSync(path.join(root, 'marketing/portals/gamedistribution.json'), 'utf8'));
let ids = {};
try {
  ids = JSON.parse(fs.readFileSync(path.join(root, 'scripts/portals/gamedistribution-ids.json'), 'utf8'));
} catch {
  ids = {};
}

const stage = path.join(root, 'dist/portals/.gd-bundle');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'games'), { recursive: true });
fs.mkdirSync(path.join(stage, 'assets'), { recursive: true });

const problems = [];
const table = [];
for (const r of rows) {
  const zip = path.join(buildDir, `${r.slug}.zip`);
  if (!fs.existsSync(zip)) {
    problems.push(`${r.slug}: missing ${path.relative(root, zip)}`);
    continue;
  }
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n');
  if (!entries.includes('index.html')) problems.push(`${r.slug}: index.html is not at the root of the zip`);
  fs.copyFileSync(zip, path.join(stage, 'games', `${r.slug}.zip`));
  const src = path.join(assetsDir, r.slug);
  if (!fs.existsSync(src)) problems.push(`${r.slug}: missing thumbnails in ${path.relative(root, src)}`);
  else {
    fs.mkdirSync(path.join(stage, 'assets', r.slug), { recursive: true });
    for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(stage, 'assets', r.slug, f));
  }
  table.push({ ...r, kb: Math.round(fs.statSync(zip).size / 1024), gameId: ids[r.slug] || '' });
}
if (fs.existsSync(path.join(assetsDir, '_preview.jpg'))) fs.copyFileSync(path.join(assetsDir, '_preview.jpg'), path.join(stage, 'assets/_preview.jpg'));
fs.copyFileSync(path.join(root, 'marketing/portals/gamedistribution.csv'), path.join(stage, 'gamedistribution.csv'));
if (problems.length) {
  console.error(`Bundle problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const lines = table.map(
  (r, i) =>
    `| ${i + 1} | ${r.gd_title} | games/${r.slug}.zip | ${r.kb} KB | ${r.genres} | ${r.rewarded_ads.startsWith('yes') ? 'on' : 'off'} | ${r.players} |`,
);
const renamed = table.filter((r) => r.gd_title !== r.site_title);
const renamedNote = renamed.length
  ? `${renamed.length} GD titles differ from the website title because GD already lists a game with the plain name: ${renamed.map((r) => `${r.site_title} is "${r.gd_title}"`).join(', ')}. Use the GD title in the form: the build shows it on the start screen.`
  : '';
const guide = `# Retry Arcade on GameDistribution: upload guide

${table.length} games, ready to upload. Built ${new Date().toISOString().slice(0, 10)}.

## What is in this zip

- \`games/<slug>.zip\`: the upload package for each game. index.html is at the root of every zip.
  Each build loads only the GameDistribution SDK: no other scripts, no analytics, no links.
- \`assets/<slug>/\`: thumbnails named \`<slug>-<size>.jpg\`. 512x512, 512x384 and 200x120 are
  required; 1280x720 and 1280x550 are the optional promo banners (they carry the title).
  \`assets/_preview.jpg\` shows all of them at once.
- \`gamedistribution.csv\`: one row per game with every form field (open it in a spreadsheet).

## Before the first game

1. Sign up as a developer at https://developer.gamedistribution.com/ (choose Developer, not
   Publisher). Accept the developer terms only after reading them: 33 percent of net ad revenue,
   paid within 60 days of the monthly report once the balance reaches EUR 100.
2. Fill in payment and tax details in the account (needed before any payout).

## For each game (same steps 24 times)

(Button and tab names in the GD dashboard change from time to time; the fields stay the same.)

1. In the developer dashboard, create a new game. Title: the \`gd_title\` column.
2. Fill the form from the CSV row:
   - Description: \`description\` (200 to 500 characters, already checked)
   - Instructions: \`instructions\`
   - Genres / category: \`genres\`, Tags: \`tags\`
   - Mobile: yes, orientation \`Portrait\`, size \`720 x 1280\`
   - Language: English
   - Age groups: pick them as the CSV suggests (all ages when \`kids_friendly\` is yes), and tick
     "Kids friendly" and "No blood" where the CSV says yes
3. Upload tab: drop \`games/<slug>.zip\`. GD shows the game id (32 hex characters) and the
   game URL. The build reads the id from that URL by itself, so no rebuild is needed.
4. Assets: upload the five images from \`assets/<slug>/\` into the matching size slots.
5. Rewarded ads: switch the rewarded ads flag ON for every game marked "on" below (they offer
   "Continue (watch ad)" after a game over). Without the flag GD refuses rewarded ads and the
   game simply does not show the button.
6. Activate the SDK: open the game from the upload page in its test iframe, press PLAY on the
   start screen and watch the preroll ad to the end. That marks the SDK integration as valid.
7. Request activation (submit for review). GD reviews in a few days up to about a week and
   emails feedback if something needs changing.

## The games

| # | GD title | Package | Zip size | Genres | Rewarded flag | Players |
| --- | --- | --- | --- | --- | --- | --- |
${lines.join('\n')}

${renamedNote}

## How the builds behave (what GD QA checks)

- Start screen with how to play and a PLAY button; the preroll ad runs on that tap.
- Midroll: an ad is requested on every "Play again" tap; the GD SDK decides whether enough time
  has passed and skips it otherwise.
- During every ad the game is paused and all sound is off. A run that an ad interrupts waits on
  a PAUSED screen until the player taps.
- Rewarded ads only on an explicit "Continue (watch ad)" tap, only when GD has an ad ready, and
  the continue is only given after the ad was watched to the end.
- A blocked or missing SDK never stops the game. Sound toggle in every game. Phones held
  sideways get a "turn your device upright" screen (all games are portrait).

## Optional: put the game ids into the build

Not required (the id comes from the GD URL), but you can paste the ids from the dashboard into
\`scripts/portals/gamedistribution-ids.json\` in the repository, for example
\`{ "stack-tower": "0123456789abcdef0123456789abcdef" }\`, and rebuild everything with
\`npm run gd:bundle\`. Then upload the new zip on the game's Upload tab.
`;
fs.writeFileSync(path.join(stage, 'UPLOAD-GUIDE.md'), guide);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });
execFileSync('zip', ['-qr', out, '.'], { cwd: stage });
const total = fs.statSync(out).size;
console.log(table.map((r) => `${r.slug.padEnd(15)} ${String(r.kb).padStart(4)} KB  ${r.gd_title}`).join('\n'));
console.log(`\nBundle: ${out} (${(total / 1024 / 1024).toFixed(2)} MB, ${table.length} games)`);
