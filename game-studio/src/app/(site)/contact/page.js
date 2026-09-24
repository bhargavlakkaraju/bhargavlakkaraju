import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Contact', description: `Get in touch with ${SITE.name}.`, alternates: { canonical: '/contact' } };

export default function Contact() {
  return (
    <StaticPage title="Contact us">
      <p>We read everything: bug reports, game ideas, partnership and licensing requests, and press enquiries.</p>
      <ul>
        <li>
          Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </li>
        <li>
          X / Twitter: <a href={`https://twitter.com/${SITE.twitter.replace('@', '')}`}>{SITE.twitter}</a>
        </li>
      </ul>
      <h2>Reporting a bug</h2>
      <p>Tell us the game, your device and browser, and what happened. A screenshot helps a lot.</p>
    </StaticPage>
  );
}
