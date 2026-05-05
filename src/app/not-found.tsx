import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-main">
      <div className="max-w-xl w-full rounded-2xl border border-white/20 bg-black/30 p-8 text-center space-y-4">
        <p className="text-6xl">404</p>
        <h1 className="text-2xl font-semibold">This page rage-quit.</h1>
        <p className="text-sm text-muted">
          You tried to open a route that does not exist in this timeline.
        </p>
        <p className="text-xs text-muted">
          Meme diagnosis: keyboard pressed too hard, URL got emotional.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-xl border border-white/25 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Return to civilization
        </Link>
      </div>
    </main>
  );
}
