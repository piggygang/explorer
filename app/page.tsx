import { CollectionCard } from "@/components/collection-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PiggyMark } from "@/components/brand/wordmark";
import { TokenCard } from "@/components/token-card";
import { listCollections } from "@/lib/api/client";
import { toDisplay, withComingSoon } from "@/lib/collections";
import { TOKENS } from "@/lib/tokens";

// The ids are deep-linkable (no in-app anchors point at them yet); scroll-mt
// clears the sticky header at its tallest, with the collection scroll row.
const SECTION = "mx-auto w-full max-w-6xl scroll-mt-32 px-5 pb-16";
const EYEBROW = "mb-4 text-sm font-medium tracking-[0.14em] text-ink-muted uppercase";
const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

// Public explorer data: fine a few minutes stale, never per-request fresh.
// Works in mock mode too — the mock is in-process, so prerender and
// revalidation both have something to fetch from.
export const revalidate = 300;

export default async function Home() {
  const collections = withComingSoon((await listCollections()).map(toDisplay));

  return (
    <>
      <SiteHeader collections={collections} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-12 text-center sm:pt-20">
          <PiggyMark className="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Explore the Piggy Gang collections
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted text-pretty sm:text-lg">
            Traits, rarity, owners and the full on-chain history of every piggy,
            across every collection.
          </p>
        </section>

        <section id="collections" className={SECTION}>
          <h2 className={EYEBROW}>Collections</h2>
          <ul className={GRID}>
            {collections.map((collection) => (
              <li key={collection.slug} className="flex">
                <CollectionCard collection={collection} />
              </li>
            ))}
          </ul>
        </section>

        <section id="tokens" className={SECTION}>
          <h2 className={EYEBROW}>Tokens</h2>
          <ul className={GRID}>
            {TOKENS.map((token) => (
              <li key={token.symbol} className="flex">
                <TokenCard token={token} />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
