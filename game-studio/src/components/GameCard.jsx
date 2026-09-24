import Link from 'next/link';
import { CATEGORIES } from '@/lib/site';

export default function GameCard({ game, size = 'md', badge = null, href = null, priority = false }) {
  const [c1, c2] = game.colors || ['#ff3d7f', '#8b5cf6'];
  const big = size === 'lg';
  return (
    <Link
      href={href || `/games/${game.slug}`}
      className="group relative block overflow-hidden rounded-3xl bg-card ring-1 ring-line transition duration-200 hover:-translate-y-1 hover:ring-2 hover:ring-pink hover:shadow-glow"
      style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}22)` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/covers/${game.slug}.png`}
          alt={`${game.title} game`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading={priority ? 'eager' : 'lazy'}
          width={800}
          height={600}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
        {badge && <div className="absolute left-3 top-3 rounded-full bg-sun px-2.5 py-0.5 text-xs font-black text-ink shadow">{badge}</div>}
        <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="rounded-full bg-pink px-5 py-2 font-display text-lg font-bold text-white shadow-lg">▶ Play</span>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 ${big ? 'p-5' : 'p-3'}`}>
        <div className={`font-display font-bold leading-tight text-white drop-shadow ${big ? 'text-3xl' : 'text-lg'}`}>
          {game.emoji} {game.title}
        </div>
        <div className={`truncate text-white/75 ${big ? 'text-base' : 'text-xs'}`}>
          {big ? game.tagline : `${CATEGORIES[game.category]?.name || ''} · ${game.tagline}`}
        </div>
      </div>
    </Link>
  );
}
