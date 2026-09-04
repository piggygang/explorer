import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PiggyMark } from "@/components/brand/wordmark";

// Announced-but-unindexed slugs never reach here — the page resolves those to a
// real "coming soon" view first.
export default function CollectionNotFound() {
  return (
    <>
      <SiteHeader collections={[]} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 text-center sm:pt-20">
          <PiggyMark className="mx-auto h-16 w-16 opacity-25" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            No collection here
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted">
            The explorer doesn’t index a collection by that name. These are the ones it does.
          </p>
          <Link
            href="/#collections"
            className="mt-8 inline-flex rounded-full border border-line px-6 py-3.5 text-base text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            See every collection
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
