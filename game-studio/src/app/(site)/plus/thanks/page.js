import { PlusThanks } from '@/components/Money';

export const metadata = { title: 'Thank you', robots: { index: false, follow: false } };

export default function PlusThanksPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-12">
      <div className="card p-6 sm:p-8">
        <PlusThanks />
      </div>
    </div>
  );
}
