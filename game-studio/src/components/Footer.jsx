import Link from 'next/link';
import { Logo } from './Header';
import { GAMES } from '@/lib/games';
import { SITE, CATEGORIES, SOCIAL, MONEY } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-night/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-white/60">{SITE.tagline} Free games that load instantly on any phone, tablet or computer.</p>
          {SOCIAL.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIAL.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="me noopener" className="chip hover:bg-white/20">
                  {s.name}
                </a>
              ))}
            </div>
          )}
          {MONEY.supportUrl && (
            <a href={MONEY.supportUrl} target="_blank" rel="noopener" className="mt-4 inline-flex rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-ink hover:brightness-110">
              ☕ Support the studio
            </a>
          )}
        </div>
        <div>
          <div className="mb-3 text-xs font-extrabold tracking-widest text-white/40">GAMES</div>
          <ul className="grid grid-cols-2 gap-1.5 text-sm text-white/70">
            {GAMES.map((g) => (
              <li key={g.slug}>
                <Link href={`/games/${g.slug}`} className="hover:text-white">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-extrabold tracking-widest text-white/40">EXPLORE</div>
          <ul className="space-y-1.5 text-sm text-white/70">
            {Object.entries(CATEGORIES).map(([id, c]) => (
              <li key={id}>
                <Link href={`/category/${id}`} className="hover:text-white">
                  {c.emoji} {c.name} games
                </Link>
              </li>
            ))}
            <li>
              <Link href="/daily" className="hover:text-white">
                📅 Daily challenges
              </Link>
            </li>
            <li>
              <Link href="/leaderboards" className="hover:text-white">
                🏆 Leaderboards
              </Link>
            </li>
            <li>
              <Link href="/guides" className="hover:text-white">
                📚 Guides & tips
              </Link>
            </li>
            <li>
              <Link href="/best" className="hover:text-white">
                ⭐ Best free games lists
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-extrabold tracking-widest text-white/40">STUDIO</div>
          <ul className="space-y-1.5 text-sm text-white/70">
            <li>
              <Link href="/about" className="hover:text-white">
                About us
              </Link>
            </li>
            <li>
              <Link href="/advertise" className="hover:text-white">
                Advertise & sponsor
              </Link>
            </li>
            <li>
              <Link href="/developers" className="hover:text-white">
                Embed & license our games
              </Link>
            </li>
            {MONEY.plusLink && (
              <li>
                <Link href="/plus" className="hover:text-white">
                  ⭐ Plus: go ad-free
                </Link>
              </li>
            )}
            <li>
              <Link href="/press" className="hover:text-white">
                Press kit
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">
                Terms of use
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {SITE.name}. Made for “just one more try”.
      </div>
    </footer>
  );
}
