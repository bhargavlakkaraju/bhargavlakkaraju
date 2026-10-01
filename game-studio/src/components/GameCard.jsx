// Server-side wrapper: hands the interactive client tile only the fields a card shows
// (see cardMeta), which keeps each page's serialized payload small.
import GameTile from './GameTile';
import { cardMeta } from '@/lib/games';

export default function GameCard({ game, ...rest }) {
  return <GameTile game={cardMeta(game)} {...rest} />;
}
