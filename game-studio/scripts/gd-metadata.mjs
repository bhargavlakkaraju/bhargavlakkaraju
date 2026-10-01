#!/usr/bin/env node
// Writes the GameDistribution upload metadata, one row per game, from
// scripts/portals/gamedistribution-listing.mjs plus each game's meta.js:
//   marketing/portals/gamedistribution.csv   (open in a spreadsheet, copy field by field)
//   marketing/portals/gamedistribution.json  (same data, for scripts)
// and checks GD's rules first: 200 to 500 characters for description and instructions, the
// exact title in the description, 1-2 genres from GD's list, 1-5 tags, no dashes other than
// a plain hyphen, no hype words and no other companies' game names.
// Usage: node scripts/gd-metadata.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = path.join(root, 'src/games');
const { LISTING, GD_GENRES, GD_DEFAULTS } = await import(pathToFileURL(path.join(root, 'scripts/portals/gamedistribution-listing.mjs')).href);
const slugs = fs.readdirSync(gamesDir).filter((d) => d !== 'engine' && fs.existsSync(path.join(gamesDir, d, 'index.js')));
const SIZES = ['512x512', '512x384', '200x120', '1280x720', '1280x550'];

const HYPE = /\b(awesome|amazing|epic|insane|incredible|best game ever)\b/i;
const OTHER_GAMES = /wordle|tetris|flappy|pong|crossy|frogger|suika|doodle jump|knife hit|color switch|hole\.io|candy crush|angry birds|agar|slither|mario|minecraft|subway surfers|temple run/i;
const DASHES = /[\u2012-\u2015\u2212]/;

const problems = [];
const rows = [];
for (const slug of slugs) {
  const { default: meta } = await import(pathToFileURL(path.join(gamesDir, slug, 'meta.js')).href);
  const L = LISTING[slug];
  if (!L) {
    problems.push(`${slug}: missing from gamedistribution-listing.mjs`);
    continue;
  }
  const p = (msg) => problems.push(`${slug}: ${msg}`);
  for (const f of ['description', 'instructions']) {
    const n = L[f].length;
    if (n < 200 || n > 500) p(`${f} is ${n} characters (GD wants 200 to 500)`);
  }
  if (!L.description.includes(L.title)) p('description must contain the exact title');
  if (!L.genres.length || L.genres.length > 2) p('needs 1 or 2 genres');
  for (const g of L.genres) if (!GD_GENRES.includes(g)) p(`unknown GD genre "${g}"`);
  if (!L.tags.length || L.tags.length > 5) p('needs 1 to 5 tags');
  const text = [L.title, L.short, L.description, L.instructions, ...L.tags].join(' ');
  if (DASHES.test(text)) p('contains an en or em dash');
  if (HYPE.test(L.description)) p('description uses a hype word');
  if (OTHER_GAMES.test(text)) p("mentions another company's game");
  const c = meta.controls || {};
  rows.push({
    slug,
    gd_title: L.title,
    site_title: meta.title,
    short_description: L.short,
    description: L.description,
    instructions: L.instructions,
    controls_mobile: c.touch || '',
    controls_desktop: [c.mouse && `Mouse: ${c.mouse}`, c.keyboard && `Keyboard: ${c.keyboard}`].filter(Boolean).join(' | '),
    genres: L.genres.join(', '),
    tags: L.tags.join(', '),
    kids_friendly: L.kidsFriendly ? 'yes' : 'no',
    no_blood: GD_DEFAULTS.noBlood ? 'yes' : 'no',
    orientation: GD_DEFAULTS.orientation,
    width: GD_DEFAULTS.width,
    height: GD_DEFAULTS.height,
    mobile_ready: GD_DEFAULTS.mobile ? 'yes (touch)' : 'no',
    desktop_ready: 'yes (mouse and keyboard)',
    players: L.players || '1',
    language: GD_DEFAULTS.language,
    rewarded_ads: meta.revive === false ? 'no' : 'yes (Continue after game over)',
    zip_file: `games/${slug}.zip`,
    thumbnails: SIZES.map((s) => `assets/${slug}/${slug}-${s}.jpg`).join(' '),
  });
}

if (problems.length) {
  console.error(`GD listing problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const cols = Object.keys(rows[0]);
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [cols.join(','), ...rows.map((r) => cols.map((k) => cell(r[k])).join(','))].join('\r\n') + '\r\n';
const outDir = path.join(root, 'marketing/portals');
fs.mkdirSync(outDir, { recursive: true });
// UTF-8 BOM so spreadsheet apps read the curly quotes and arrows correctly.
fs.writeFileSync(path.join(outDir, 'gamedistribution.csv'), '﻿' + csv);
fs.writeFileSync(path.join(outDir, 'gamedistribution.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(`Wrote ${rows.length} rows to marketing/portals/gamedistribution.csv and .json`);
const renamed = rows.filter((r) => r.gd_title !== r.site_title);
if (renamed.length) console.log(`GD titles that differ from the site title: ${renamed.map((r) => `${r.site_title} -> ${r.gd_title}`).join('; ')}`);
