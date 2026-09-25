import StaticPage from '@/components/StaticPage';
import Link from 'next/link';
import { SITE, SOCIAL } from '@/lib/site';

export const metadata = { title: 'Contact', description: `Get in touch with ${SITE.name}.`, alternates: { canonical: '/contact' } };

export default function Contact() {
  return (
    <StaticPage title="Contact us">
      <p>We read everything: bug reports, game ideas, partnership and licensing requests, and press enquiries.</p>
      <ul>
        <li>
          Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </li>
        {SOCIAL.map((s) => (
          <li key={s.id}>
            {s.name}: <a href={s.url}>{s.url.replace(/^https?:\/\/(www\.)?/, '')}</a>
          </li>
        ))}
      </ul>
      <h2>Advertising, sponsorship and licensing</h2>
      <p>
        See <Link href="/advertise">advertise with us</Link> for Daily Arena sponsorships, branded games and licensing, or send the form there and we will reply
        within one working day.
      </p>
      <h2>Reporting a bug</h2>
      <p>Tell us the game, your device and browser, and what happened. A screenshot helps a lot.</p>
    </StaticPage>
  );
}
