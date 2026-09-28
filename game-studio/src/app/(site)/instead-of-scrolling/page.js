import Link from 'next/link';
import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';
import { GAMES, gamesByCategory } from '@/lib/games';
import { ld, faqLd, breadcrumbLd } from '@/lib/seo';

// Search landing page for people looking for a way out of the endless scroll. It answers the
// question honestly first (not every good answer is a game), then offers the Play feed as
// the active, social option when you do want your phone in your hand.
const FAQ = [
  [
    'What can I do instead of doom scrolling?',
    'Pick something with a clear end: a short walk, a message to a friend, a few pages of a book, or a quick game with a finish line such as the Daily Arena on Retry Arcade, where everyone gets the same set of levels and you are done once you have played them.',
  ],
  [
    'Are games better than scrolling social media?',
    'Short games are active rather than passive: you make decisions, get better with practice and can play with the people around you. Pick games with natural stopping points, like one daily set or one match, so they stay a break instead of a new habit loop.',
  ],
  [
    'What is the Retry Arcade play feed?',
    `It is a feed you swipe like short videos, except every card is a free game you can play in place. Tap to play, swipe up for the next one. There are ${GAMES.length} games, with no download and no account.`,
  ],
  [
    'Can I play with friends instead of scrolling alone?',
    'Yes. The party games put 1 to 4 players on one phone, tablet or laptop, one corner button each, and bots fill the empty seats. Every round draws a twist card that changes the rules.',
  ],
];

export const metadata = {
  title: 'Things to do instead of doom scrolling (that are actually fun)',
  description:
    'Stuck in the scroll? Seven quick, honest ideas to break it, plus a feed of free games you can swipe and play in one tap, alone or with friends on one phone.',
  alternates: { canonical: '/instead-of-scrolling' },
  openGraph: { title: `Scroll less. Play more. | ${SITE.name}`, url: '/instead-of-scrolling', images: [{ url: '/og/site.jpg', width: 1200, height: 630 }] },
};

export default function InsteadOfScrolling() {
  const party = gamesByCategory('party');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd(FAQ))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ld(
          breadcrumbLd([
            ['Home', '/'],
            ['Instead of scrolling', '/instead-of-scrolling'],
          ]),
        )}
      />
      <StaticPage title="Things to do instead of doom scrolling">
        <p>
          You open the app for a second and look up twenty minutes later. The feed is built to never end, so the trick is to swap it for something that does. Here are
          seven ideas that take five minutes or less, from phone-free to phone-in-hand.
        </p>

        <h2>Put the phone down</h2>
        <ol>
          <li>
            <b>Walk to the end of the street and back.</b> Five minutes of daylight beats five minutes of anything on a screen.
          </li>
          <li>
            <b>Message one person you like.</b> A real conversation is the opposite of a feed.
          </li>
          <li>
            <b>Read five pages.</b> Keep a book or an e-reader where your phone usually lives.
          </li>
        </ol>

        <h2>Keep the phone, change what it does</h2>
        <ol start={4}>
          <li>
            <b>Swipe a feed of games instead of videos.</b> The <Link href="/play">Retry Arcade play feed</Link> looks and swipes like short videos, but every card is a
            game you play in one tap. You are making moves instead of watching, and every round ends in under a minute.
          </li>
          <li>
            <b>Play today&apos;s set, then stop.</b> The <Link href="/daily">Daily Arena</Link> gives everyone the same levels for the day. Play them, compare with friends,
            and you are done until tomorrow: a finish line the scroll never gives you.
          </li>
          <li>
            <b>Play with the people next to you.</b>{' '}
            {party.length ? (
              <>
                The <Link href="/category/party">party games</Link> put up to four players on one phone (try{' '}
                {party.slice(0, 3).map((g, i) => (
                  <span key={g.slug}>
                    {i ? ', ' : ''}
                    <Link href={`/games/${g.slug}`}>{g.title}</Link>
                  </span>
                ))}
                ), one corner button each, with bots in the empty seats.
              </>
            ) : (
              <>Hand a friend the phone and take turns beating each other&apos;s score in a one-tap game.</>
            )}
          </li>
          <li>
            <b>Warm up your brain.</b> A quick <Link href="/games/wordy">Wordy</Link> or <Link href="/games/sudoku">Sudoku</Link> leaves you sharper than when you started.
          </li>
        </ol>

        <h2>Make the swap stick</h2>
        <p>
          Move the app you scroll most into a folder on your second home screen and put something better where your thumb goes. Retry Arcade can be added to your home
          screen like an app: open the <Link href="/play">play feed</Link> and choose &quot;Add to Home Screen&quot; from your browser&apos;s share menu.
        </p>
        <p>
          <Link href="/play" className="btn-pink mt-2 inline-flex no-underline">
            ▶ Start the play feed
          </Link>
        </p>

        <h2>Questions</h2>
        {FAQ.map(([q, a]) => (
          <div key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </div>
        ))}
      </StaticPage>
    </>
  );
}
