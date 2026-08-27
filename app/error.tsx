"use client";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// An error page must never depend on the API — the chrome renders without nav,
// same as not-found.tsx.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <SiteHeader collections={[]} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 text-center sm:pt-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Something went wrong
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted">
            The explorer couldn’t load this page. It’s usually temporary.
          </p>
          <button
            onClick={reset}
            className="mt-8 rounded-full border border-brand px-6 py-3.5 text-base font-medium text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Try again
          </button>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
