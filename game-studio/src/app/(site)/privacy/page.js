import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Privacy Policy', description: `How ${SITE.name} handles your data.`, alternates: { canonical: '/privacy' } };

export default function Privacy() {
  return (
    <StaticPage title="Privacy Policy" updated="September 24, 2026">
      <p>
        This policy explains what information {SITE.name} (“we”, “us”) collects when you use {SITE.url.replace(/^https?:\/\//, '')} and our embedded games, and
        how it is used.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>
          <b>Game progress on your device.</b> Best scores, XP, streaks, medals and your optional leaderboard nickname are stored in your browser’s local
          storage. We do not require an account.
        </li>
        <li>
          <b>Anonymous usage analytics.</b> A random identifier generated in your browser is sent with gameplay events (for example “game started”, “game
          over”, run duration, share button used) so we can count players and improve our games. We do not collect your name, contact details or precise
          location through analytics.
        </li>
        <li>
          <b>Leaderboards.</b> If you post a score, we store your nickname, score and the random identifier.
        </li>
        <li>
          <b>Newsletter.</b> If you subscribe, we store your email address to send game updates. Every email includes an unsubscribe link, or you can email
          us to be removed.
        </li>
      </ul>
      <h2>Advertising and cookies</h2>
      <p>
        We use Google AdSense to show ads. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other
        websites. Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to our site and/or other sites on the
        Internet. You may opt out of personalized advertising by visiting{' '}
        <a href="https://www.google.com/settings/ads" rel="nofollow noopener">
          Google Ads Settings
        </a>{' '}
        or{' '}
        <a href="https://www.aboutads.info" rel="nofollow noopener">
          www.aboutads.info
        </a>
        . See also{' '}
        <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow noopener">
          how Google uses data from sites that use its services
        </a>
        . Visitors in the EEA, UK and Switzerland are asked for consent through a certified consent management platform before personalized ads are shown.
      </p>
      <h2>Children</h2>
      <p>
        Our games are suitable for a general audience but are not directed at children under 13. We do not knowingly collect personal information from
        children. If you believe a child has provided us personal information, contact us and we will delete it.
      </p>
      <h2>Data retention and your rights</h2>
      <p>
        Aggregated analytics are kept for up to 120 days. Leaderboard entries for daily boards expire after three days; all-time entries remain until you ask
        us to remove them. You can clear local progress at any time by clearing your browser data. To access or delete any data we hold, email{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
      <h2>Changes</h2>
      <p>We may update this policy. Material changes will be announced on this page.</p>
    </StaticPage>
  );
}
