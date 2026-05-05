'use client';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-main">
      <div className="max-w-xl w-full rounded-2xl border border-red-300/30 bg-black/30 p-8 text-center space-y-4">
        <p className="text-5xl">500-ish</p>
        <h1 className="text-2xl font-semibold">Oops. The hamster fell off the server wheel.</h1>
        <p className="text-sm text-muted">
          We hit an unexpected error. Try again. If it still breaks, blame Mercury retrograde.
        </p>
        <p className="text-xs text-red-200/80 break-all">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex rounded-xl border border-white/25 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
