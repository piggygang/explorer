"use client";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Scoped to the wallet route, so a portfolio that fails to load does not take
 * the whole shell with it — the same split /collections/[slug] already makes.
 *
 * collections={[]} on purpose: the boundary must not re-touch the API to render
 * itself, or a registry outage would make the error page fail too.
 */

const SECTION = "mx-auto w-full max-w-6xl px-5 pt-14 pb-16";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const GHOST =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export default function WalletError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <SiteHeader collections={[]} />
      <main className="flex-1">
        <section className={SECTION}>
          <h1 className={EYEBROW}>Wallet</h1>
          <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Couldn’t read this wallet
          </p>
          <p className="mt-3 max-w-prose text-sm text-ink-muted">
            The indexer didn’t answer. The wallet is fine — this page isn’t. Try again in a moment.
          </p>
          <button type="button" onClick={reset} className={GHOST}>
            Try again
          </button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
