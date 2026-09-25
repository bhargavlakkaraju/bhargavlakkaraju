// HTML templates for every brand / social asset. Each returns { W, H, html, ... } for render.mjs.
import path from 'node:path';
import { C, CATEGORY_LABEL, ROOT, arrowSvg, backdrop, coverCard, esc, fileUrl, hexA, mark, page, wordmark } from './lib.mjs';

// The 6 covers used on banners (bright, varied, instantly readable at small sizes).
export const SHOWCASE = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush', 'sky-flap'];
// The 6 most visually striking games get Story / Reel / TikTok covers. Target = the silver medal score.
export const STORIES = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush', 'sky-flap'].map((slug) => ({ slug }));

const fmt = (n) => Number(n).toLocaleString('en-US');
const TAGLINE_HTML = (extra = '') => `<span class="neon"${extra}>JUST ONE </span><span class="grad glow-drop">MORE TRY.</span>`;
const SUBLINE = '15 free games · no download';

// ---------------------------------------------------------------- logos
export function logoMark(S) {
  return { W: S, H: S, transparent: true, html: page(S, S, mark(S, { glow: false, radius: 0.24 }), { transparent: true }) };
}

export function logoWordmark({ dark }) {
  if (!dark) {
    // Transparent, tightly padded, ~1600px wide. White "RETRY" is meant for dark backgrounds.
    const body = `<div id="root" style="display:inline-block;padding:24px">${wordmark(300, 160, { glow: false, gap: 64 })}</div>`;
    return { W: 1800, H: 500, transparent: true, element: '#root', html: page(1800, 500, body, { transparent: true }) };
  }
  const W = 1600, H = 480;
  const body = `<div class="abs" data-paint="glow" style="inset:0"></div>
    <div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center">${wordmark(240, 128, { glow: true, gap: 52, textGlow: true })}</div>`;
  return { W, H, html: page(W, H, body) };
}

export function avatar(S) {
  const body = `<div class="abs" data-paint="avatar" style="inset:0;background:linear-gradient(135deg, ${C.pink}, ${C.grape})"></div>
    <div class="abs" style="inset:0;filter:drop-shadow(0 ${Math.round(S * 0.012)}px ${Math.round(S * 0.03)}px rgba(60,0,70,.35))">${arrowSvg({ scale: 1.02 })}</div>`;
  return { W: S, H: S, html: page(S, S, body) };
}

// ---------------------------------------------------------------- banner pieces
async function coversRow(ctx, slugs, w, h, gap, { rotate = 0, radius, border, glow = 0.8, stagger = 0 } = {}) {
  const cards = [];
  for (let i = 0; i < slugs.length; i++) {
    const g = ctx.bySlug[slugs[i]];
    const src = await ctx.art(g.slug, w * 2, h * 2); // 2x art, downscaled by the browser for crispness
    const rot = typeof rotate === 'function' ? rotate(i) : rotate;
    const dy = stagger ? (i % 2 ? stagger : -stagger) : 0;
    cards.push(coverCard(src, w, h, { colors: g.colors, radius, border, glow, rotate: rot, extra: `margin-top:${dy}px` }));
  }
  return `<div style="display:flex;gap:${gap}px;align-items:center">${cards.join('')}</div>`;
}

function headline(fs, { twoLines = false, align = 'left' } = {}) {
  const inner = twoLines
    ? `<div class="neon">JUST ONE</div><div><span class="grad glow-drop">MORE TRY.</span></div>`
    : TAGLINE_HTML();
  return `<div class="arcade" style="font-size:${fs}px;line-height:${twoLines ? 1.02 : 1};text-align:${align};white-space:nowrap">${inner}</div>`;
}
function subline(fs, { align = 'left', text = SUBLINE } = {}) {
  return `<div class="display" style="font-weight:600;font-size:${fs}px;line-height:1.1;color:rgba(255,255,255,.8);text-align:${align};white-space:nowrap">${esc(text)}</div>`;
}

// ---------------------------------------------------------------- banners
// X / Twitter header. The avatar covers roughly x 40-380, y 330-500 (desktop and mobile), and some
// phones trim ~60px top and bottom, so text sits top-left and covers sit to the right of the avatar.
export async function bannerX(ctx) {
  const W = 1500, H = 500;
  const row = await coversRow(ctx, SHOWCASE.slice(0, 5), 186, 140, 20, { rotate: (i) => [-4, 3, -2, 4, -3][i], radius: 18, border: 3, stagger: 8 });
  const body = `${backdrop(W, H, { floorH: 230, sunSize: 760, sunX: 1000, sunY: -40, seed: 11 })}
    <div class="abs" style="left:80px;top:66px">${wordmark(58, 34)}</div>
    <div class="abs" style="left:80px;top:150px">${headline(66)}</div>
    <div class="abs" style="left:82px;top:234px">${subline(30)}</div>
    <div class="abs" style="right:44px;top:280px">${row}</div>`;
  return { W, H, html: page(W, H, body) };
}

// LinkedIn personal cover. The profile photo covers the lower-left: about x 40-360, y 200+ on desktop and
// x 60-490, y 185+ on phones. Text stays in the top band, covers stay right of x 520.
export async function bannerLinkedIn(ctx) {
  const W = 1584, H = 396;
  const row = await coversRow(ctx, SHOWCASE.slice(0, 5), 172, 129, 20, { rotate: (i) => [-3, 3, -2, 3, -3][i], radius: 18, border: 3, stagger: 7 });
  const body = `${backdrop(W, H, { floorH: 180, sunSize: 700, sunX: 1100, sunY: -60, seed: 5 })}
    <div class="abs" style="left:80px;top:34px">${wordmark(54, 32)}</div>
    <div class="abs" style="left:80px;top:108px;display:flex;align-items:center;gap:34px">${headline(56)}${subline(28)}</div>
    <div class="abs" style="right:52px;top:214px">${row}</div>`;
  return { W, H, html: page(W, H, body) };
}

// LinkedIn company page cover. The square logo overlaps the lower-left (about x 20-260, y 85+ on phones).
export async function bannerLinkedInCompany(ctx) {
  const W = 1128, H = 191;
  const row = await coversRow(ctx, SHOWCASE.slice(0, 5), 84, 63, 11, { rotate: (i) => [-4, 3, -2, 4, -3][i], radius: 10, border: 2, glow: 0.7, stagger: 5 });
  const body = `${backdrop(W, H, { floorH: 90, sunSize: 520, sunX: 850, sunY: -120, seed: 9, stars: 90 })}
    <div class="abs" style="left:282px;top:26px">${wordmark(34, 21)}</div>
    <div class="abs" style="left:282px;top:76px">${headline(31)}</div>
    <div class="abs" style="left:283px;top:122px">${subline(19)}</div>
    <div class="abs" style="right:30px;top:62px">${row}</div>`;
  return { W, H, html: page(W, H, body) };
}

// YouTube channel art. Everything that matters sits in the central 1546x423 safe area
// (x 507-2053, y 508-931); desktop shows the full-width band, TVs show everything.
export async function bannerYouTube(ctx) {
  const W = 2560, H = 1440;
  const sx = 507, sy = 508, sw = 1546, sh = 423;
  const cw = 220, ch = 165, gap = 45; // 6 * 220 + 5 * 45 = 1545
  const row = await coversRow(ctx, SHOWCASE, cw, ch, gap, { radius: 22, border: 4, glow: 0.9 });
  // Extra covers outside the safe area continue the row on desktop / TV (decoration only).
  const extraL = await coversRow(ctx, ['merge-2048', 'road-hopper'], cw, ch, gap, { radius: 22, border: 4, glow: 0.6 });
  const extraR = await coversRow(ctx, ['neon-snake', 'brick-barrage'], cw, ch, gap, { radius: 22, border: 4, glow: 0.6 });
  const rowTop = sy + sh - ch - 8;
  const body = `${backdrop(W, H, { floorH: 560, sunSize: 1300, sunY: 120, seed: 21 })}
    <div class="abs" style="left:${sx}px;top:${sy + 10}px;width:${sw}px;display:flex;align-items:center;justify-content:space-between">
      ${wordmark(84, 50)}
      ${subline(38, { align: 'right' })}
    </div>
    <div class="abs" style="left:${sx}px;top:${sy + 124}px;width:${sw}px">${headline(92, { align: 'left' })}</div>
    <div class="abs" style="left:${sx}px;top:${rowTop}px">${row}</div>
    <div class="abs" style="left:${sx - gap - (cw * 2 + gap)}px;top:${rowTop}px;opacity:.45">${extraL}</div>
    <div class="abs" style="left:${sx + sw + gap}px;top:${rowTop}px;opacity:.45">${extraR}</div>`;
  return { W, H, html: page(W, H, body) };
}

// Facebook Page cover. Desktop shows the full 1640x624; phones crop the sides to about the central
// 1100px, and the profile picture sits at the lower-left, so everything is centered.
export async function coverFacebook(ctx) {
  const W = 1640, H = 624;
  const row = await coversRow(ctx, SHOWCASE, 158, 118, 22, { rotate: (i) => [-3, 2, -2, 3, -2, 3][i], radius: 16, border: 3, stagger: 6 });
  const body = `${backdrop(W, H, { floorH: 250, sunSize: 900, sunY: -90, seed: 13 })}
    <div class="abs" style="left:0;right:0;top:64px;display:flex;justify-content:center">${wordmark(62, 36)}</div>
    <div class="abs" style="left:0;right:0;top:160px;display:flex;justify-content:center">${headline(76, { align: 'center' })}</div>
    <div class="abs" style="left:0;right:0;top:258px;display:flex;justify-content:center">${subline(32, { align: 'center' })}</div>
    <div class="abs" style="left:0;right:0;top:346px;display:flex;justify-content:center">${row}</div>`;
  return { W, H, html: page(W, H, body) };
}

// Discord server banner (16:9).
export async function bannerDiscord(ctx) {
  const W = 960, H = 540;
  const row = await coversRow(ctx, SHOWCASE.slice(0, 5), 150, 112, 18, { rotate: (i) => [-4, 3, -2, 4, -3][i], radius: 14, border: 3, stagger: 7 });
  const body = `${backdrop(W, H, { floorH: 230, sunSize: 700, sunY: -60, seed: 17 })}
    <div class="abs" style="left:0;right:0;top:58px;display:flex;justify-content:center">${wordmark(58, 34)}</div>
    <div class="abs" style="left:0;right:0;top:150px;display:flex;justify-content:center">${headline(60, { align: 'center' })}</div>
    <div class="abs" style="left:0;right:0;top:230px;display:flex;justify-content:center">${subline(28, { align: 'center' })}</div>
    <div class="abs" style="left:0;right:0;top:320px;display:flex;justify-content:center">${row}</div>`;
  return { W, H, html: page(W, H, body) };
}

// ---------------------------------------------------------------- per-game post (1080x1350)
function chip(text, { bg = 'rgba(255,255,255,.1)', color = '#fff', fs = 24, ring = 'rgba(255,255,255,.18)' } = {}) {
  return `<span style="display:inline-flex;align-items:center;gap:10px;border-radius:999px;padding:${Math.round(fs * 0.45)}px ${Math.round(fs * 0.9)}px;background:${bg};color:${color};box-shadow:inset 0 0 0 2px ${ring};font-family:Nunito;font-weight:900;font-size:${fs}px;letter-spacing:.08em;line-height:1;white-space:nowrap">${text}</span>`;
}
function playIcon(size, color = '#fff') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex:none"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="${color}"/></svg>`;
}

function footerStrip(ctx, W, top, H) {
  return `<div class="abs" style="left:0;top:${top}px;width:${W}px;height:${H - top}px;background:linear-gradient(90deg, ${C.pink}, ${C.grape});display:flex;align-items:center;justify-content:center;gap:22px;box-shadow:0 -10px 40px rgba(255,61,127,.35)">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center">${playIcon(34)}</div>
      <div class="arcade" style="font-size:44px;line-height:1;color:#fff;white-space:nowrap">PLAY FREE: <span style="color:${C.sun}">${esc(ctx.DOMAIN.toUpperCase())}</span></div>
    </div>`;
}

export async function post(ctx, g) {
  const W = 1080, H = 1350;
  const [c1, c2] = g.colors;
  const src = await ctx.art(g.slug, 952, 714);
  const body = `${backdrop(W, H, { floorH: 470, tint: [c2, c1], sunSize: 1000, sunY: 240, seed: g.slug.length * 7, glowScale: 1.3 })}
    <div class="abs" style="left:60px;top:52px">${wordmark(58, 33)}</div>
    <div class="abs" style="right:60px;top:60px">${chip(`${esc(CATEGORY_LABEL[g.category] || 'Arcade').toUpperCase()} · FREE`, { fs: 22, bg: hexA(c1, 0.16), ring: hexA(c1, 0.55) })}</div>
    <div class="abs" style="left:60px;top:150px">${coverCard(src, 960, 722, { colors: g.colors, radius: 40, border: 5, glow: 0.9 })}</div>
    <div class="abs arcade" data-fit="56" style="left:60px;top:920px;width:960px;text-align:center;font-size:118px;line-height:1.1;color:#fff;text-shadow:0 0 22px ${hexA(c1, 0.75)},0 0 60px ${hexA(c2, 0.45)}">${esc(g.title.toUpperCase())}</div>
    <div class="abs display" data-fit="30" style="left:60px;top:1062px;width:960px;text-align:center;font-weight:600;font-size:46px;line-height:1.2;color:rgba(255,255,255,.9)">${esc(g.tagline)}</div>
    ${footerStrip(ctx, W, 1196, H)}`;
  return { W, H, html: page(W, H, body) };
}

// ---------------------------------------------------------------- story / reel / tiktok cover (1080x1920)
// Instagram covers the top ~220px and bottom ~270px with UI; TikTok covers the bottom ~400px and the
// right ~130px from mid-height. Key content stays between y 190 and 1640 and away from the right edge.
function arrowUp(size, color = '#fff') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex:none"><path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export async function story(ctx, g) {
  const W = 1080, H = 1920;
  const [c1, c2] = g.colors;
  const target = g.medals[1]; // silver medal: hard enough to brag about, reachable in a few tries
  const unit = String(g.scoreLabel || 'points').toLowerCase();
  const src = await ctx.art(g.slug, 860, 645);
  const body = `${backdrop(W, H, { floorH: 760, tint: [c2, c1], sunSize: 1200, sunY: 380, seed: g.slug.length * 5, glowScale: 1.3 })}
    <div class="abs" style="left:0;right:0;top:196px;display:flex;justify-content:center">${wordmark(60, 35)}</div>
    <div class="abs arcade" data-fit="60" style="left:90px;top:300px;width:900px;text-align:center;font-size:112px;line-height:1.1;color:#fff;text-shadow:0 0 22px ${hexA(c1, 0.75)},0 0 60px ${hexA(c2, 0.45)}">${esc(g.title.toUpperCase())}</div>
    <div class="abs" style="left:110px;top:450px">${coverCard(src, 860, 645, { colors: g.colors, radius: 44, border: 6, glow: 1, rotate: -2 })}</div>
    <div class="abs arcade" style="left:90px;width:900px;top:1150px;text-align:center;line-height:1.02">
      <div class="neon" style="font-size:104px">CAN YOU</div>
      <div data-fit="70" style="width:900px;font-size:150px"><span class="grad glow-drop">BEAT ${fmt(target)}?</span></div>
    </div>
    <div class="abs display" style="left:90px;width:900px;top:1438px;text-align:center;font-weight:600;font-size:40px;color:rgba(255,255,255,.88)">${fmt(target)} ${esc(unit)} earns silver. Free, no download.</div>
    <div class="abs" style="left:0;right:0;top:1520px;display:flex;justify-content:center">
      <div style="display:flex;align-items:center;gap:18px;border-radius:999px;padding:26px 50px;background:linear-gradient(90deg, ${C.pink}, ${C.grape});box-shadow:0 0 50px rgba(255,61,127,.5)">
        ${arrowUp(46)}<span class="arcade" style="font-size:46px;line-height:1;color:#fff">LINK IN BIO</span>
      </div>
    </div>`;
  return { W, H, html: page(W, H, body) };
}

// ---------------------------------------------------------------- launch carousel (1080x1350 x5)
function slideFrame(ctx, n, inner, { swipe = true, tint } = {}) {
  const W = 1080, H = 1350;
  return `${backdrop(W, H, { floorH: 470, sunSize: 1000, sunY: 330, seed: 40 + n, tint, glowScale: 1.2 })}
    <div class="abs" style="left:64px;top:56px">${wordmark(56, 32)}</div>
    <div class="abs arcade" style="right:64px;top:66px;font-size:28px;color:rgba(255,255,255,.6)">${n}/5</div>
    ${inner}
    ${swipe ? `<div class="abs" style="right:52px;bottom:48px;display:flex;align-items:center;gap:14px;padding:14px 22px 14px 28px;border-radius:999px;background:rgba(11,6,24,.82);box-shadow:inset 0 0 0 2px rgba(255,255,255,.14)"><span class="arcade" style="font-size:30px;color:#fff">SWIPE</span>
      <svg width="46" height="46" viewBox="0 0 24 24"><path d="M4 12h15M13 5.5 19.5 12 13 18.5" fill="none" stroke="${C.sun}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : ''}`;
}

export async function carousel(ctx, n) {
  const W = 1080, H = 1350;
  const G = ctx.games;
  let inner = '';
  if (n === 1) {
    // Hook: tilted wall of covers under a big claim.
    const slugs = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush', 'sky-flap', 'merge-2048', 'road-hopper', 'neon-snake', 'wordy', 'solitaire', 'zig-zag'];
    const cards = [];
    for (let i = 0; i < slugs.length; i++) {
      const g = ctx.bySlug[slugs[i]];
      cards.push(coverCard(await ctx.art(g.slug, 600, 450), 300, 225, { colors: g.colors, radius: 24, border: 4, glow: 0.7 }));
    }
    inner = `<div class="abs arcade" style="left:64px;top:170px;width:952px;line-height:1.04">
        <div style="font-size:74px" class="neon">WE BUILT</div>
        <div style="font-size:116px"><span class="grad glow-drop">15 FREE GAMES</span></div>
        <div style="font-size:74px" class="neon">YOU CAN PLAY</div>
        <div style="font-size:74px" class="neon">IN 1 SECOND.</div>
      </div>
      <div class="abs" style="left:-80px;top:720px;width:1300px;transform:rotate(-8deg);display:grid;grid-template-columns:repeat(4,300px);gap:26px;
        -webkit-mask-image:linear-gradient(to bottom, black 55%, transparent 96%);mask-image:linear-gradient(to bottom, black 55%, transparent 96%)">${cards.join('')}</div>
      <div class="abs" style="left:64px;top:600px">${chip('NO DOWNLOAD · NO SIGN-UP', { fs: 26, bg: 'rgba(255,61,127,.18)', ring: 'rgba(255,61,127,.6)' })}</div>`;
  } else if (n === 2) {
    const cats = [
      ['arcade', 'ARCADE', 'One-tap reflex games', C.pink],
      ['puzzle', 'PUZZLE', 'Relaxing brain teasers', C.aqua],
      ['classic', 'CLASSICS', 'Snake and Solitaire, rebuilt', C.lime],
      ['word', 'WORD', 'A daily word puzzle', C.sun],
    ];
    const rows = [];
    for (const [cat, label, blurb, col] of cats) {
      const list = G.filter((g) => g.category === cat);
      const thumbs = [];
      for (const g of list.slice(0, 3)) thumbs.push(coverCard(await ctx.art(g.slug, 300, 225), 150, 112, { colors: g.colors, radius: 16, border: 3, glow: 0.5 }));
      rows.push(`<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:34px 30px;border-radius:30px;background:rgba(23,15,46,.82);box-shadow:inset 0 0 0 2px ${hexA(col, 0.45)}, 0 0 40px ${hexA(col, 0.18)}">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:baseline;gap:16px;white-space:nowrap"><span class="arcade" style="font-size:48px;color:${col};line-height:1">${label}</span>
            <span class="arcade" style="font-size:26px;color:rgba(255,255,255,.7)">${list.length} ${list.length === 1 ? 'GAME' : 'GAMES'}</span></div>
            <div class="display" style="margin-top:10px;font-weight:600;font-size:30px;color:rgba(255,255,255,.82);white-space:nowrap">${esc(blurb)}</div>
          </div>
          <div style="display:flex;gap:10px;flex:none">${thumbs.join('')}</div>
        </div>`);
    }
    inner = `<div class="abs arcade" style="left:64px;top:168px;width:952px;line-height:1.05">
        <div style="font-size:68px" class="neon">PICK YOUR</div>
        <div style="font-size:92px"><span class="grad glow-drop">FLAVOR.</span></div>
      </div>
      <div class="abs" style="left:64px;top:372px;width:952px;display:flex;flex-direction:column;gap:26px">${rows.join('')}</div>`;
  } else if (n === 3) {
    const lb = [
      ['1', 'YOU?', 'the crown is up for grabs', C.sun],
      ['2', 'YOUR BEST FRIEND', 'probably', '#d9d6ea'],
      ['3', 'YOUR GROUP CHAT', 'all of them', '#e39a5b'],
    ];
    const rowsHtml = lb
      .map(
        ([r, name, note, col]) => `<div style="display:flex;align-items:center;gap:22px;padding:20px 24px;border-radius:22px;background:${r === '1' ? 'rgba(255,210,63,.12)' : 'rgba(255,255,255,.05)'};box-shadow:inset 0 0 0 2px ${r === '1' ? 'rgba(255,210,63,.55)' : 'rgba(255,255,255,.08)'}">
          <div class="arcade" style="width:66px;height:66px;border-radius:50%;display:grid;place-items:center;background:${col};color:${C.ink};font-size:34px;flex:none">${r}</div>
          <div style="min-width:0"><div class="arcade" style="font-size:36px;color:#fff;line-height:1.1;white-space:nowrap">${name}</div>
          <div class="display" style="font-weight:600;font-size:26px;color:rgba(255,255,255,.6)">${note}</div></div>
        </div>`,
      )
      .join('');
    inner = `<div class="abs arcade" style="left:64px;top:168px;width:952px;line-height:1.05">
        <div style="font-size:68px" class="neon">NEW LEVELS</div>
        <div style="font-size:92px"><span class="grad glow-drop">EVERY DAY.</span></div>
      </div>
      <div class="abs display" style="left:64px;top:380px;width:952px;font-weight:600;font-size:36px;line-height:1.3;color:rgba(255,255,255,.88)">Every game has a Daily Challenge: the same level for everyone on Earth. Beat it before midnight UTC.</div>
      <div class="abs" style="left:64px;top:548px;width:952px;border-radius:36px;padding:3px;background:linear-gradient(135deg, ${C.sun}, ${C.pink}, ${C.grape})">
        <div style="border-radius:33px;background:rgba(11,6,24,.95);padding:32px 34px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="arcade" style="font-size:40px;color:#fff">DAILY LEADERBOARD</div>
            <div style="text-align:right"><div style="font-family:Nunito;font-weight:900;font-size:18px;letter-spacing:.14em;color:rgba(255,255,255,.5)">RESETS IN</div>
            <div class="arcade" style="font-size:40px;color:${C.sun}">06:42:18</div></div>
          </div>
          <div style="margin-top:26px;display:flex;flex-direction:column;gap:14px">${rowsHtml}</div>
        </div>
      </div>
      <div class="abs" style="left:64px;top:1150px;display:flex;gap:14px">
        ${chip('STREAKS', { fs: 24, bg: 'rgba(255,61,127,.16)', ring: 'rgba(255,61,127,.6)' })}
        ${chip('MEDALS', { fs: 24, bg: 'rgba(255,210,63,.14)', ring: 'rgba(255,210,63,.6)' })}
        ${chip('XP LEVELS', { fs: 24, bg: 'rgba(34,211,238,.14)', ring: 'rgba(34,211,238,.6)' })}
      </div>`;
  } else if (n === 4) {
    const g = ctx.bySlug['stack-tower'];
    const src = await ctx.art(g.slug, 780, 390);
    inner = `<div class="abs arcade" style="left:64px;top:168px;width:952px;line-height:1.05">
        <div style="font-size:68px" class="neon">BEAT IT?</div>
        <div style="font-size:92px"><span class="grad glow-drop">PROVE IT.</span></div>
      </div>
      <div class="abs display" style="left:64px;top:380px;width:952px;font-weight:600;font-size:36px;line-height:1.3;color:rgba(255,255,255,.88)">Finish a run, tap <b style="color:#fff">Challenge a friend</b> and send the link. They see exactly the score they need to beat.</div>
      <div class="abs" style="left:150px;top:540px;width:780px">
        <div style="margin-left:auto;width:520px;border-radius:30px 30px 8px 30px;background:linear-gradient(135deg, ${C.pink}, ${C.grape});padding:22px 28px;font-family:Fredoka;font-weight:600;font-size:34px;line-height:1.25;color:#fff">42 floors. Your move.</div>
        <div style="margin-top:18px;border-radius:30px;overflow:hidden;background:${C.panel};box-shadow:inset 0 0 0 2px rgba(255,255,255,.1), 0 20px 60px rgba(0,0,0,.45)">
          <img src="${src}" style="display:block;width:780px;height:390px">
          <div style="padding:22px 28px 24px">
            <div class="display" data-fit="22" style="width:724px;font-weight:700;font-size:34px;color:#fff;line-height:1.2">Sam scored 42 in Stack Tower. Can you beat it?</div>
            <div style="margin-top:8px;font-family:Nunito;font-weight:800;font-size:24px;color:rgba(255,255,255,.55)">${esc(ctx.DOMAIN)}/c/stack-tower/42/Sam</div>
          </div>
        </div>
        <div style="margin-top:14px;font-family:Nunito;font-weight:800;font-size:22px;color:rgba(255,255,255,.45)">Example of a challenge link preview</div>
      </div>`;
  } else if (n === 5) {
    const slugs = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush'];
    const row = await coversRow(ctx, slugs, 172, 129, 16, { rotate: (i) => [-5, 3, -2, 4, -4][i], radius: 18, border: 3, stagger: 8 });
    inner = `<div class="abs" style="left:0;right:0;top:190px;display:flex;justify-content:center">${mark(210)}</div>
      <div class="abs arcade" style="left:0;right:0;top:450px;text-align:center;line-height:1.04">
        <div style="font-size:84px" class="neon">PLAY FREE</div>
        <div style="font-size:84px"><span class="grad glow-drop">RIGHT NOW</span></div>
      </div>
      <div class="abs" style="left:0;right:0;top:672px;display:flex;justify-content:center">
        <div style="border-radius:999px;padding:28px 54px;background:linear-gradient(90deg, ${C.pink}, ${C.grape});box-shadow:0 0 60px rgba(255,61,127,.5)">
          <span class="arcade" style="font-size:54px;color:#fff;line-height:1">${esc(ctx.DOMAIN.toUpperCase())}</span></div>
      </div>
      <div class="abs display" style="left:0;right:0;top:810px;text-align:center;font-weight:600;font-size:36px;color:rgba(255,255,255,.88)">No download. No sign-up. Any phone or laptop.</div>
      <div class="abs display" style="left:0;right:0;top:870px;text-align:center;font-weight:600;font-size:36px;color:rgba(255,255,255,.88)">Follow <b style="color:${C.sun}">@retryarcade</b> for daily challenges.</div>
      <div class="abs" style="left:0;right:0;top:1010px;display:flex;justify-content:center">${row}</div>`;
    return { W, H, html: page(W, H, slideFrame(ctx, n, inner, { swipe: false })) };
  }
  return { W, H, html: page(W, H, slideFrame(ctx, n, inner)) };
}

// ---------------------------------------------------------------- X launch card (1200x675)
export async function xLaunch(ctx) {
  const W = 1200, H = 675;
  const slugs = ['stack-tower', 'juicy-drop', 'block-crush', 'blade-spin', 'color-rush', 'sky-flap', 'merge-2048', 'road-hopper'];
  const cards = [];
  for (const s of slugs) {
    const g = ctx.bySlug[s];
    cards.push(coverCard(await ctx.art(s, 560, 420), 280, 210, { colors: g.colors, radius: 22, border: 4, glow: 0.7 }));
  }
  const body = `${backdrop(W, H, { floorH: 300, sunSize: 800, sunX: 900, sunY: 0, seed: 31 })}
    <div class="abs" style="left:640px;top:-150px;display:grid;grid-template-columns:repeat(2,280px);gap:22px;transform:rotate(-10deg);transform-origin:0 0">${cards.join('')}</div>
    <div class="abs" style="left:0;top:0;width:760px;height:${H}px;background:linear-gradient(90deg, ${C.ink} 62%, rgba(11,6,24,0))"></div>
    <div class="abs" style="left:64px;top:64px">${wordmark(62, 36)}</div>
    <div class="abs arcade" style="left:64px;top:190px;line-height:1.04">
      <div class="neon" style="font-size:74px">15 FREE GAMES.</div>
      <div style="font-size:74px"><span class="grad glow-drop">PLAY IN 1 SEC.</span></div>
    </div>
    <div class="abs display" style="left:66px;top:376px;font-weight:600;font-size:34px;color:rgba(255,255,255,.85)">No download. No sign-up. Just one more try.</div>
    <div class="abs" style="left:64px;top:470px;display:flex;align-items:center;gap:16px;border-radius:999px;padding:20px 34px;background:linear-gradient(90deg, ${C.pink}, ${C.grape});box-shadow:0 0 40px rgba(255,61,127,.45)">
      ${playIcon(30)}<span class="arcade" style="font-size:34px;line-height:1;color:#fff">${esc(ctx.DOMAIN.toUpperCase())}</span></div>`;
  return { W, H, html: page(W, H, body) };
}

// ---------------------------------------------------------------- contact sheet
export function contactSheet(ctx) {
  const W = 2400;
  const f = (rel) => fileUrl(path.join(ROOT, rel));
  const item = (rel, w, h, label, { checker = false, circle = false } = {}) => `<figure style="margin:0;display:flex;flex-direction:column;gap:10px;width:${w}px">
      <div style="position:relative;width:${w}px;height:${h}px;border-radius:10px;overflow:hidden;${checker ? 'background:repeating-conic-gradient(#3a3450 0% 25%, #2a2440 0% 50%) 0 0/24px 24px;' : 'background:#000;'}box-shadow:0 0 0 1px rgba(255,255,255,.12)">
        <img src="${f(rel)}" style="display:block;width:100%;height:100%;object-fit:contain">
        ${circle ? `<div style="position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 ${w}px rgba(11,6,24,.72);outline:3px dashed rgba(255,255,255,.55);outline-offset:-2px"></div>` : ''}
      </div>
      <figcaption style="font-family:Nunito;font-weight:800;font-size:20px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label)}</figcaption></figure>`;
  const section = (title, items) => `<section style="margin-top:56px"><h2 class="arcade" style="font-size:40px;color:#fff;margin-bottom:22px">${title}</h2>
      <div style="display:flex;flex-wrap:wrap;gap:28px;align-items:flex-end">${items.join('')}</div></section>`;
  const slugs = ctx.games.map((g) => g.slug);
  const body = `<div id="root" style="width:${W}px;padding:60px 70px 80px;background:${C.ink}">
    <div style="display:flex;align-items:center;justify-content:space-between">${wordmark(84, 50)}
      <div class="display" style="font-weight:600;font-size:32px;color:rgba(255,255,255,.7)">Social launch kit · contact sheet</div></div>
    ${section('LOGOS AND AVATAR', [
      item('public/brand/logo-mark-1024.png', 260, 260, 'logo-mark-1024.png', { checker: true }),
      item('public/brand/logo-mark-400.png', 160, 160, 'logo-mark-400.png', { checker: true }),
      item('public/brand/avatar-1080.png', 260, 260, 'avatar-1080.png (circle crop)', { circle: true }),
      item('public/brand/avatar-1080.png', 64, 64, '64px', { circle: true }),
      item('public/brand/logo-wordmark.png', 820, 150, 'logo-wordmark.png (transparent)', { checker: true }),
      item('public/brand/logo-wordmark-dark.png', 500, 150, 'logo-wordmark-dark.png'),
    ])}
    ${section('PROFILE BANNERS', [
      item('public/brand/banner-x-1500x500.jpg', 900, 300, 'banner-x-1500x500.jpg'),
      item('public/brand/banner-linkedin-1584x396.jpg', 1200, 300, 'banner-linkedin-1584x396.jpg'),
      item('public/brand/banner-youtube-2560x1440.jpg', 640, 360, 'banner-youtube-2560x1440.jpg'),
      item('public/brand/cover-facebook-1640x624.jpg', 946, 360, 'cover-facebook-1640x624.jpg'),
      item('public/brand/banner-discord-960x540.jpg', 640, 360, 'banner-discord-960x540.jpg'),
      item('public/brand/banner-linkedin-company-1128x191.jpg', 1500, 254, 'banner-linkedin-company-1128x191.jpg'),
    ])}
    ${section('LAUNCH CAROUSEL + X CARD', [
      ...[1, 2, 3, 4, 5].map((i) => item(`public/social/launch-carousel-${i}-1080x1350.jpg`, 360, 450, `launch-carousel-${i}`)),
      item('public/social/x-launch-1200x675.jpg', 800, 450, 'x-launch-1200x675.jpg'),
    ])}
    ${section('STORY / REEL / TIKTOK COVERS', STORIES.map((s) => item(`public/social/stories/${s.slug}-1080x1920.jpg`, 340, 604, `stories/${s.slug}`)))}
    ${section('GAME POSTS (1080x1350)', slugs.map((s) => item(`public/social/posts/${s}-1080x1350.jpg`, 400, 500, `posts/${s}`)))}
  </div>`;
  return { W, H: 9000, element: '#root', html: page(W, 9000, body) };
}
