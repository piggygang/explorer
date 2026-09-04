import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PiggyMark } from "@/components/brand/wordmark";

// A 404 must never depend on the API — the chrome renders without nav.
export default function NftNotFound() {
  return (
    <>
      <SiteHeader collections={[]} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 text-center sm:pt-20">
          <PiggyMark className="mx-auto h-16 w-16 opacity-25" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            No piggy with that mint
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted">
            Nothing is indexed under that address. Check the mint, or browse a collection.
          </p>
          <Link
            href="/#collections"
            className="mt-8 inline-flex rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Back to the collections
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
