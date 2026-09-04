"use client";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Scoped to this route so a failed grid does not replace the whole app shell
 * the way the root boundary would. --brand doubles as the danger colour.
 */
export default function BrowseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader collections={[]} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 text-center sm:pt-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Could not load this collection
          </h1>
          <p role="alert" className="mx-auto mt-4 max-w-md text-base text-ink-muted">
            The indexer didn’t answer. It’s usually temporary.
          </p>
          <button
            onClick={reset}
            className="mt-8 rounded-full border border-brand px-6 py-3.5 text-base font-medium text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Try again
          </button>
          {error.digest && (
            <p className="mt-3 font-mono text-[11px] text-ink-muted">Reference {error.digest}</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
