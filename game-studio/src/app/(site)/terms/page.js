import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Terms of Use', description: `Terms for using ${SITE.name}.`, alternates: { canonical: '/terms' } };

export default function Terms() {
  return (
    <StaticPage title="Terms of Use" updated="September 25, 2026">
      <p>By playing games on {SITE.name} you agree to these terms.</p>
      <h2>Using our games</h2>
      <p>
        Our games are free for personal, non-commercial play. You may embed games on your own website using the official embed code, provided you do not remove
        our branding, add advertising around or on top of the game frame, or present the game as your own.
      </p>
      <h2>Fair play</h2>
      <p>
        Leaderboards are for real scores. We may remove scores or nicknames that appear to be automated, manipulated or offensive, and may block abusive
        access.
      </p>
      <h2>Content</h2>
      <p>
        All games, code, artwork and text are owned by {SITE.name} unless noted. Game names used for descriptive purposes (for example the classic card game
        Solitaire) belong to the public domain or their respective owners.
      </p>
      <h2>Plus and sponsorships</h2>
      <p>
        Retry Arcade Plus is an optional pass that removes ads and makes continues free for the period shown at checkout. It is for personal use on your own
        devices; please do not share your purchase code publicly. If Plus does not work for you, email us within 14 days of purchase for a full refund.
        Sponsored placements are always labelled as sponsored.
      </p>
      <h2>No warranty</h2>
      <p>
        The service is provided “as is”. We do our best to keep everything running and your progress safe, but we are not liable for lost progress, downtime or
        indirect damages to the extent permitted by law.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </StaticPage>
  );
}
