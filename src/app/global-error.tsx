"use client";

import "./globals.css";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <main className="flex min-h-screen items-center justify-center bg-paper p-4">
          <section className="w-full max-w-lg rounded-md border border-line bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold text-ink">System error</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              The app hit an unexpected problem. Try again, or go back and check the last action.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-white transition hover:bg-[#185f55]"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
