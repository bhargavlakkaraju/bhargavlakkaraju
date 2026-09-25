// Shared building blocks for the Retry Arcade brand / social renderer (scripts/brand/render.mjs).
// Everything is plain HTML + CSS rendered by Playwright's Chromium, loading fonts and art via file:// URLs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TMP = path.join(os.tmpdir(), 'retry-arcade-brand');
export const fileUrl = (p) => pathToFileURL(p).href;

export const C = {
  ink: '#0b0618',
  night: '#120b24',
  panel: '#170f2e',
  card: '#1f1540',
  pink: '#ff3d7f',
  sun: '#ffd23f',
  aqua: '#22d3ee',
  lime: '#a3e635',
  grape: '#8b5cf6',
};

export const CATEGORY_LABEL = { arcade: 'Arcade', puzzle: 'Puzzle', classic: 'Classic', word: 'Word' };

// ---------- game data ----------
export async function loadGames() {
  const dir = path.join(ROOT, 'src/games');
  const out = [];
  for (const d of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, d, 'meta.js');
    if (d === 'engine' || !fs.existsSync(f)) continue;
    const m = (await import(fileUrl(f))).default;
    out.push(m);
  }
  return out;
}

// ---------- text safety: the owner asked for no em dash / en dash anywhere ----------
export const DASH_RE = /[\u2013\u2014]/;
export function assertNoDash(s, where) {
  if (DASH_RE.test(s)) throw new Error(`Forbidden dash character in ${where}: ${JSON.stringify(s.match(/.{0,30}[\u2013\u2014].{0,30}/)[0])}`);
}
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- seeded random (stars etc. stay identical between runs) ----------
export function rng(seed = 7) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- the retry arrow (white, rounded, drawn as SVG so it is crisp at any size) ----------
// Arc runs clockwise from the tail (upper right) around the bottom to the head (upper left),
// like the site's "↻" glyph. The drawing is auto-centered in a 100x100 box.
export function arrowSvg({ color = '#fff', scale = 1 } = {}) {
  const rad = (d) => (d * Math.PI) / 180;
  const r = 23, sw = 10, a1 = -25, a2 = 250, hw = 11.5, hl = 14, back = 3;
  const P = (a) => [r * Math.cos(rad(a)), r * Math.sin(rad(a))];
  const [x1, y1] = P(a1);
  const [x2, y2] = P(a2);
  const tx = -Math.sin(rad(a2)), ty = Math.cos(rad(a2));
  const nx = -ty, ny = tx;
  const bx = x2 - tx * back, by = y2 - ty * back;
  const A = [bx + nx * hw, by + ny * hw], B = [bx - nx * hw, by - ny * hw], T = [bx + tx * hl, by + ty * hl];
  // bounding box of arc (sampled, padded by half the stroke) + head
  const pts = [A, B, T];
  for (let a = a1; a <= a2; a += 2) {
    const [px, py] = P(a);
    pts.push([px - sw / 2, py - sw / 2], [px + sw / 2, py + sw / 2]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const k = (58 / span) * scale; // arrow spans 58% of the box at scale 1
  const f = (n) => n.toFixed(2);
  const X = (x) => f(50 + (x - cx) * k), Y = (y) => f(50 + (y - cy) * k);
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <path d="M${X(x1)} ${Y(y1)} A${f(r * k)} ${f(r * k)} 0 1 1 ${X(x2)} ${Y(y2)}" fill="none" stroke="${color}" stroke-width="${f(sw * k)}" stroke-linecap="round"/>
    <path d="M${X(A[0])} ${Y(A[1])} L${X(T[0])} ${Y(T[1])} L${X(B[0])} ${Y(B[1])} Z" fill="${color}" stroke="${color}" stroke-width="${f(3.5 * k)}" stroke-linejoin="round"/>
  </svg>`;
}

// Rounded-square app mark: pink -> grape gradient, white retry arrow.
export function mark(size, { glow = true, radius = 0.26, arrowScale = 1 } = {}) {
  const shadow = glow ? `box-shadow:0 0 ${Math.round(size * 0.45)}px rgba(255,61,127,.35);` : '';
  return `<div class="mark" data-paint="mark" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * radius)}px;${shadow}">
    <div class="mark-shine" style="border-radius:${Math.round(size * radius)}px"></div>${arrowSvg({ scale: arrowScale })}</div>`;
}

// Mark + "RETRY" (white) "ARCADE" (pink) in Bungee, exactly like the site header (no space, color split).
export function wordmark(markSize, fontSize, { gap = Math.round(markSize * 0.24), glow = true, textGlow = false } = {}) {
  const tg = textGlow ? 'text-shadow:0 0 18px rgba(255,61,127,.45),0 0 42px rgba(139,92,246,.3);' : '';
  return `<div class="wordmark" style="display:inline-flex;align-items:center;gap:${gap}px">${mark(markSize, { glow })}<span class="arcade" style="font-size:${fontSize}px;line-height:1;white-space:nowrap;letter-spacing:-0.01em;color:#fff;${tg}">RETRY<span style="color:${C.pink}">ARCADE</span></span></div>`;
}

// Neon synthwave backdrop, same recipe as the site's .neon-backdrop (stars, blurred sun, perspective grid floor).
export function backdrop(W, H, { floorH = Math.round(H * 0.45), sunY = null, sunX = null, sunSize = null, seed = 3, stars = null, tint = null, floorOpacity = 0.55, glowScale = 1 } = {}) {
  const r = rng(seed);
  const n = stars ?? Math.round((W * H) / 9000);
  const shadows = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * W), y = Math.round(r() * (H - floorH * 0.6));
    const s = r() < 0.15 ? 1.2 : 0.4;
    const col = r() < 0.1 ? 'rgba(255,210,63,.75)' : r() < 0.1 ? 'rgba(34,211,238,.75)' : `rgba(255,255,255,${(0.35 + r() * 0.5).toFixed(2)})`;
    shadows.push(`${x}px ${y}px 0 ${s}px ${col}`);
  }
  const sz = sunSize ?? Math.round(Math.min(W * 0.7, H * 1.1));
  const sy = sunY ?? H - floorH - sz * 0.42;
  const gs = Math.round(64 * (floorH / 405));
  const t1 = tint?.[0] || C.grape, t2 = tint?.[1] || C.pink;
  const g = glowScale;
  return `<div class="bd" style="position:absolute;inset:0;overflow:hidden;background:${C.ink}">
    <div style="position:absolute;inset:0;background:
      radial-gradient(${60 * g}% ${40 * g}% at 10% 0%, ${hexA(t1, 0.26)}, transparent 70%),
      radial-gradient(${50 * g}% ${35 * g}% at 95% 10%, ${hexA(t2, 0.2)}, transparent 70%),
      radial-gradient(60% 50% at 50% 110%, rgba(34,211,238,.10), transparent 70%)"></div>
    <div style="position:absolute;left:0;top:0;width:1px;height:1px;border-radius:50%;box-shadow:${shadows.join(',')}"></div>
    <div style="position:absolute;left:${Math.round((sunX ?? W / 2) - sz / 2)}px;top:${Math.round(sy)}px;width:${sz}px;height:${sz}px;border-radius:50%;
      background:radial-gradient(circle at 50% 40%, ${hexA(t2, 0.3)}, ${hexA(t1, 0.13)} 50%, transparent 71%);filter:blur(${Math.round(sz / 28)}px)"></div>
    <div style="position:absolute;left:-50%;right:-50%;bottom:-2px;height:${floorH}px;transform-origin:50% 0;transform:perspective(${Math.round(floorH * 1.04)}px) rotateX(62deg);
      background-image:linear-gradient(rgba(255,61,127,.38) ${Math.max(2, Math.round(gs / 32))}px, transparent ${Math.max(2, Math.round(gs / 32))}px),linear-gradient(90deg, rgba(139,92,246,.34) ${Math.max(2, Math.round(gs / 32))}px, transparent ${Math.max(2, Math.round(gs / 32))}px);
      background-size:${gs}px ${gs}px;background-position:${Math.round(W / 2) % gs}px 0;
      -webkit-mask-image:linear-gradient(to bottom, transparent, black 35%);mask-image:linear-gradient(to bottom, transparent, black 35%);opacity:${floorOpacity}"></div>
  </div>`;
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Game cover card with a glowing border in the game's own colors.
export function coverCard(art, w, h, { radius = Math.round(w * 0.06), border = Math.max(2, Math.round(w / 200)), colors = [C.pink, C.grape], glow = 1, rotate = 0, extra = '' } = {}) {
  const [c1, c2] = colors;
  return `<div class="cover" style="width:${w}px;height:${h}px;border-radius:${radius}px;padding:${border}px;background:linear-gradient(135deg, ${c1}, ${c2});
    box-shadow:0 0 ${Math.round(w * 0.12 * glow)}px ${hexA(c1, 0.45 * glow)}, 0 ${Math.round(h * 0.05)}px ${Math.round(h * 0.12)}px rgba(0,0,0,.45);transform:rotate(${rotate}deg);flex:none;${extra}">
    <img src="${art}" style="width:100%;height:100%;display:block;object-fit:cover;border-radius:${Math.max(0, radius - border)}px"></div>`;
}

// Page shell. fit(): shrinks any [data-fit] element's font-size until its text fits its box (single line).
export function page(W, H, body, { transparent = false, extraCss = '' } = {}) {
  const font = (fam, w, file) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url('${fileUrl(path.join(ROOT, 'public/fonts', file))}') format('woff2')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${font('Bungee', 400, 'Bungee-400.woff2')}
${font('Fredoka', 500, 'Fredoka-500.woff2')}${font('Fredoka', 600, 'Fredoka-600.woff2')}${font('Fredoka', 700, 'Fredoka-700.woff2')}
${font('Nunito', 500, 'Nunito-500.woff2')}${font('Nunito', 700, 'Nunito-700.woff2')}${font('Nunito', 800, 'Nunito-800.woff2')}${font('Nunito', 900, 'Nunito-900.woff2')}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${transparent ? 'transparent' : C.ink}}
body{position:relative;color:#f4f1ff;font-family:'Nunito',sans-serif;-webkit-font-smoothing:antialiased}
.arcade{font-family:'Bungee',sans-serif;font-weight:400}
.display{font-family:'Fredoka',sans-serif}
.mark{position:relative;flex:none;background:linear-gradient(135deg, ${C.pink}, ${C.grape});overflow:hidden}
.mark>svg{position:absolute;inset:0}
.mark-shine{position:absolute;inset:0;background:radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,.22), transparent 55%)}
.grad{background:linear-gradient(90deg, ${C.pink}, ${C.sun}, ${C.aqua}, ${C.lime});-webkit-background-clip:text;background-clip:text;color:transparent}
.glow-drop{filter:drop-shadow(0 0 14px rgba(255,61,127,.5))}
.neon{text-shadow:0 0 18px rgba(255,61,127,.55),0 0 42px rgba(139,92,246,.35)}
.abs{position:absolute}
[data-fit]{white-space:nowrap;overflow:visible}
${extraCss}
</style></head><body>${body}
<script>
window.fit=function(){document.querySelectorAll('[data-fit]').forEach(function(el){var fs=parseFloat(getComputedStyle(el).fontSize);var min=+el.dataset.fit||10;while(el.scrollWidth>el.clientWidth+1&&fs>min){fs-=1;el.style.fontSize=fs+'px';}});};
// Paint brand gradients per pixel (Chromium dithers CSS/canvas gradients, which bloats PNGs and adds noise).
window.paintExact=function(){
  var P=[255,61,127],G=[139,92,246],waits=[];
  document.querySelectorAll('[data-paint]').forEach(function(el){
    var kind=el.dataset.paint,r=el.getBoundingClientRect(),W=Math.round(r.width),H=Math.round(r.height);if(!W||!H)return;
    var c=document.createElement('canvas');c.width=W;c.height=H;var g=c.getContext('2d'),id=g.createImageData(W,H),d=id.data;
    var len=(W+H)*Math.SQRT1_2;
    for(var y=0;y<H;y++)for(var x=0;x<W;x++){
      var px=x+.5,py=y+.5,i=(y*W+x)*4,col,a,dd;
      if(kind==='glow'){col=[11,6,24];
        dd=Math.hypot((px-.3*W)/(.6*W),(py-.5*H)/(.7*H));a=.2*Math.max(0,1-dd/.7);col=[col[0]*(1-a)+139*a,col[1]*(1-a)+92*a,col[2]*(1-a)+246*a];
        dd=Math.hypot((px-.8*W)/(.5*W),(py-.5*H)/(.7*H));a=.14*Math.max(0,1-dd/.7);col=[col[0]*(1-a)+255*a,col[1]*(1-a)+61*a,col[2]*(1-a)+127*a];
      }else{
        var t=((px-W/2)*Math.SQRT1_2+(py-H/2)*Math.SQRT1_2)/len+.5;t=Math.max(0,Math.min(1,t));
        col=[P[0]+(G[0]-P[0])*t,P[1]+(G[1]-P[1])*t,P[2]+(G[2]-P[2])*t];
        if(kind==='mark'){dd=Math.hypot((px-.2*W)/(1.2*W),py/(.8*H));a=.22*Math.max(0,1-dd/.55);}
        else{dd=Math.hypot((px-.22*W)/(.7*W),(py-.1*H)/(.55*H));a=.24*Math.max(0,1-dd/.62);}
        col=[col[0]*(1-a)+255*a,col[1]*(1-a)+255*a,col[2]*(1-a)+255*a];
        if(kind==='avatar'){dd=Math.hypot((px-.5*W)/(.75*W),(py-.5*H)/(.75*H));a=dd<.58?0:.22*Math.min(1,(dd-.58)/.42);col=[col[0]*(1-a)+40*a,col[1]*(1-a)+6*a,col[2]*(1-a)+60*a];}
      }
      d[i]=Math.round(col[0]);d[i+1]=Math.round(col[1]);d[i+2]=Math.round(col[2]);d[i+3]=255;
    }
    g.putImageData(id,0,0);
    var url=c.toDataURL('image/png'),im=new Image();im.src=url;waits.push(im.decode());
    el.style.background='url('+url+') 0 0 / 100% 100% no-repeat';
    var sh=el.querySelector('.mark-shine');if(sh)sh.style.display='none';
  });
  return Promise.all(waits);
};
window.prepare=async function(){
  await paintExact();
  await Promise.all(['400 40px Bungee','500 40px Fredoka','600 40px Fredoka','700 40px Fredoka','500 40px Nunito','700 40px Nunito','800 40px Nunito','900 40px Nunito'].map(function(f){return document.fonts.load(f);}));
  await Promise.all([].slice.call(document.images).map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r;});}));
  await document.fonts.ready;
  fit();
  await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r);});});
  var broken=[].slice.call(document.images).filter(function(i){return !i.naturalWidth;}).map(function(i){return i.src.slice(0,120);});
  var fonts=[].slice.call(document.fonts).filter(function(f){return f.status!=='loaded';}).map(function(f){return f.family+' '+f.weight+' '+f.status;});
  return {broken:broken,fonts:fonts,text:document.body.innerText};
};
</script></body></html>`;
}
