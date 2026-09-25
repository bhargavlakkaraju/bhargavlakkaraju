import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { InstallCapture } from '@/components/Widgets';
import { BottomNav } from '@/components/Nav';
import { SearchOverlay } from '@/components/Search';
import { GAMES, getGame } from '@/lib/games';
import { GUIDES } from '@/lib/guides';
import { COLLECTIONS } from '@/lib/collections';
import { CATEGORIES } from '@/lib/site';

// A compact search index (titles and slugs only) handed to the client overlay.
const SEARCH_INDEX = {
  games: GAMES.map((g) => ({
    slug: g.slug,
    title: g.title,
    tagline: g.tagline,
    category: g.category,
    categoryName: CATEGORIES[g.category]?.name || '',
    tags: (g.tags || []).join(' '),
  })),
  lists: COLLECTIONS.map((c) => ({ slug: c.slug, title: c.title.split(':')[0] })),
  guides: GUIDES.filter((g) => getGame(g.game)).map((g) => ({ slug: g.slug, title: g.title })),
  categories: Object.entries(CATEGORIES).map(([id, c]) => ({ id, name: c.name, emoji: c.emoji })),
};

export default function SiteLayout({ children }) {
  return (
    <>
      <InstallCapture />
      <Header />
      <main>{children}</main>
      <Footer />
      <BottomNav />
      <SearchOverlay index={SEARCH_INDEX} />
    </>
  );
}
