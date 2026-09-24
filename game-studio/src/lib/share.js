// Viral loop: every result becomes a challenge link whose preview image shows the
// score to beat. Opening it loads the game with that target on screen.
import { MEDALS, formatScore } from './games';

export function challengePath(slug, score, name) {
  const who = (name || 'a friend').trim().slice(0, 16) || 'a friend';
  return `/c/${slug}/${encodeURIComponent(String(score))}/${encodeURIComponent(who)}`;
}

export function challengeUrl(slug, score, name) {
  return `${window.location.origin}${challengePath(slug, score, name)}`;
}

export function shareText({ meta, score, medal = 0, stats = {}, cta = 'challenge' }) {
  const lines = [`${meta.emoji} ${meta.title}: ${formatScore(meta, score)}${medal ? ' ' + MEDALS[medal] : ''}`];
  if (stats.shareText) lines.push(stats.shareText);
  lines.push(cta === 'challenge' ? 'Bet you can’t beat me 😏' : 'Free to play, no download:');
  return lines.join('\n');
}

export const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { id: 'x', label: 'X', color: '#111111' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'telegram', label: 'Telegram', color: '#229ED9' },
  { id: 'reddit', label: 'Reddit', color: '#FF4500' },
  { id: 'copy', label: 'Copy link', color: '#8b5cf6' },
];

/** Returns true if the share UI was opened / text copied. */
export async function shareTo(channel, { text, url, title }) {
  const enc = encodeURIComponent;
  const open = (u) => window.open(u, '_blank', 'noopener,noreferrer,width=640,height=560');
  switch (channel) {
    case 'native':
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return true;
        } catch {
          return false;
        }
      }
      return shareTo('copy', { text, url });
    case 'whatsapp':
      open(`https://wa.me/?text=${enc(`${text}\n${url}`)}`);
      return true;
    case 'x':
      open(`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`);
      return true;
    case 'facebook':
      open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`);
      return true;
    case 'telegram':
      open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`);
      return true;
    case 'reddit':
      open(`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text.split('\n')[0])}`);
      return true;
    case 'copy':
    default:
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        return true;
      } catch {
        window.prompt('Copy this link:', url);
        return true;
      }
  }
}
