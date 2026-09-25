import Link from 'next/link';
import { PlusBuy, PlusRestore } from '@/components/Money';
import { NewsletterForm, TrackPageView } from '@/components/Widgets';
import { MONEY, SITE } from '@/lib/site';

export const metadata = {
  title: `${SITE.name} Plus: Ad-Free Play`,
  description: `Remove ads, get free continues and support new games with ${SITE.name} Plus.`,
  alternates: { canonical: '/plus' },
  // Kept out of search results until the Plus payment link is configured.
  ...(MONEY.plusLink ? {} : { robots: { index: false, follow: true } }),
};

const PERKS = [
  ['🚫', 'No ads', 'No banners, no breaks between runs. Just the games.'],
  ['❤️', 'Free continues', 'Keep your run going without watching a video.'],
  ['🛠️', 'Fund new games', 'Plus members directly pay for the next game we build.'],
  ['📱', 'Every device', 'Save your purchase code and restore Plus on your phone, tablet and computer.'],
];

export default function Plus() {
  const live = !!MONEY.plusLink;
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10">
      <TrackPageView />
      <div className="text-center">
        <div className="text-5xl">⭐</div>
        <h1 className="mt-2 font-cond text-6xl font-extrabold uppercase leading-[0.9] text-white sm:text-7xl">
          RETRY ARCADE <span className="gradient-run">PLUS</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/75">Every game stays free for everyone. Plus is for players who want it ad-free and want to back the studio.</p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {PERKS.map(([e, t, d]) => (
          <div key={t} className="card flex gap-4 p-5">
            <div className="text-3xl">{e}</div>
            <div>
              <div className="font-display text-lg font-bold">{t}</div>
              <p className="text-sm text-white/65">{d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card mt-8 p-6 text-center sm:p-8">
        {live ? (
          <>
            <PlusBuy />
            <p className="mt-3 text-sm text-white/50">Secure checkout by Stripe. No account needed.</p>
          </>
        ) : (
          <>
            <div className="font-display text-2xl font-bold">Plus is almost here</div>
            <p className="mb-4 mt-1 text-white/65">Leave your email and we will tell you the day it launches.</p>
            <div className="flex justify-center">
              <NewsletterForm src="plus" />
            </div>
          </>
        )}
      </div>
      {live && (
        <div className="card mt-4 p-6">
          <div className="font-display text-lg font-bold">Already bought Plus?</div>
          <p className="mb-3 mt-1 text-sm text-white/60">Enter the purchase code from your thank-you page to turn it on for this device.</p>
          <PlusRestore />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-white/45">
        Questions? <Link href="/contact" className="underline">Contact us</Link>.
      </p>
    </div>
  );
}
