// Dynamic social preview for challenge links: "<name> scored <score> in <game>. Can you beat it?"
// This image is what people see in WhatsApp / X / iMessage previews, so it carries the viral hook.
import { ImageResponse } from 'next/og';
import { getGame, formatScore } from '@/lib/games';

export const runtime = 'edge';

// Rendered at 60% of 1200x630 (720x378, above the 600x315 large-card minimum) so the PNG stays small enough for WhatsApp link previews.
const K = 0.6;
const px = (n) => Math.round(n * K);

async function loadFont(text) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Fredoka:wght@700&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(req) {
  const u = new URL(req.url);
  const meta = getGame(u.searchParams.get('slug'));
  if (!meta) return new Response('not found', { status: 404 });
  const score = Number(u.searchParams.get('score')) || 0;
  const name = (u.searchParams.get('name') || 'A friend').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 16) || 'A friend';
  const s = formatScore(meta, score);
  const [c1, c2] = meta.colors || ['#ff3d7f', '#8b5cf6'];
  const lines = ['RETRY ARCADE', `${name} scored`, s, `in ${meta.title}`, 'Can you beat it?', 'Play free, no download'];
  const font = await loadFont(lines.join(''));

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: `linear-gradient(135deg, #140a2e 0%, #2a1159 60%, ${c1} 140%)`, color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${px(56)}px ${px(40)}px ${px(56)}px ${px(64)}px`, width: px(660) }}>
          <div style={{ display: 'flex', fontSize: px(30), color: c1, letterSpacing: px(4) }}>RETRY ARCADE</div>
          <div style={{ display: 'flex', fontSize: px(50), marginTop: px(26), color: 'rgba(255,255,255,0.85)' }}>{name} scored</div>
          <div style={{ display: 'flex', fontSize: px(150), color: '#ffd23f', lineHeight: 1.05 }}>{s}</div>
          <div style={{ display: 'flex', fontSize: px(50) }}>in {meta.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: px(34), alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', fontSize: px(40), background: '#ff3d7f', padding: `${px(14)}px ${px(34)}px`, borderRadius: px(22), whiteSpace: 'nowrap' }}>Can you beat it?</div>
            <div style={{ display: 'flex', fontSize: px(24), marginTop: px(14), color: 'rgba(255,255,255,0.6)' }}>Play free, no download</div>
          </div>
        </div>
        <div style={{ display: 'flex', width: px(540), height: px(630), position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`${u.origin}/covers/${meta.slug}.jpg`} width={px(540)} height={px(630)} style={{ objectFit: 'cover', borderLeft: `${px(8)}px solid ${c2}` }} />
        </div>
      </div>
    ),
    {
      width: px(1200),
      height: px(630),
      fonts: font ? [{ name: 'Fredoka', data: font, weight: 700, style: 'normal' }] : undefined,
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
    },
  );
}
