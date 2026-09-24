import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="text-7xl">💥</div>
        <h1 className="mt-4 font-display text-4xl font-bold">Game over… for this page</h1>
        <p className="mt-2 text-white/60">This page doesn’t exist, but plenty of games do.</p>
        <Link href="/" className="btn-pink mt-6">
          ↻ Retry from the arcade
        </Link>
      </div>
    </div>
  );
}
