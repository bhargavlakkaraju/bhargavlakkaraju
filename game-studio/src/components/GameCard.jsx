// Server-side wrapper: strips functions from the game meta so the interactive client
// tile can receive it as props.
import GameTile from './GameTile';
import { publicMeta } from '@/lib/games';

export default function GameCard({ game, ...rest }) {
  return <GameTile game={publicMeta(game)} {...rest} />;
}
