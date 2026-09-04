import { Suspense } from "react";
import { ActivityStrip } from "@/components/activity-strip";
import { CollectionCard } from "@/components/collection-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PiggyMark } from "@/components/brand/wordmark";
import { TokenCard } from "@/components/token-card";
import { listCollections } from "@/lib/api/client";
import { number } from "@/lib/format";
import { recentMoves } from "@/lib/recent-moves";
import { type LiveCollection, toDisplay, withComingSoon } from "@/lib/collections";
import { TOKENS } from "@/lib/tokens";

// The ids are deep-linkable; scroll-mt clears the sticky header at its tallest,
// with the collection scroll row.
const SECTION = "mx-auto w-full max-w-6xl scroll-mt-32 px-5 pb-16";
// The margin is applied at the use site: the Activity heading carries a scope
// note directly under it and needs mb-1, not mb-4.
const EYEBROW = "text-sm font-medium tracking-[0.14em] text-ink-muted uppercase";
const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const NOTE = "rounded-card border border-dashed border-line bg-surface/50 p-6 text-sm text-ink-muted";

export const revalidate = 300;

async function Activity({ collections }: { collections: LiveCollection[] }) {
  const { moves, failed } = await recentMoves(collections);

  if (failed) {
    return (
      <p role="alert" className={NOTE}>
        Couldn’t load the latest moves. It’s usually temporary.
      </p>
    );
  }
  if (moves.length === 0) {
    return <p className={NOTE}>No moves yet — nothing has been indexed for these collections.</p>;
  }
  return <ActivityStrip moves={moves} />;
}

export default async function Home() {
  const live = (await listCollections()).map(toDisplay);
  const collections = withComingSoon(live);
  // Supply sums legitimately. Holders NEVER do — stats.holders is distinct
  // owners PER collection, so adding them would count a wallet that holds all
  // three three times, and there is no cross-collection aggregate to ask for.
  const supply = live.reduce((total, collection) => total + collection.supply, 0);

  return (
    <>
      <SiteHeader collections={collections} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-12 text-center sm:pt-20">
          <PiggyMark className="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Explore the Piggy Gang collections
          </h1>
          {/* No "rarity" here: NftAttribute is {traitType, value} and rarity
              scoring is unstarted. The word comes back as "trait rarity" the day
              it is derivable — never as a rank. */}
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted text-pretty sm:text-lg">
            Traits, owners and the full on-chain history of every piggy, across every
            collection.
          </p>
          {live.length > 0 && (
            <p className="mt-6 font-mono text-xs text-ink-muted">
              {number(supply)} piggies indexed across {live.length}{" "}
              {live.length === 1 ? "collection" : "collections"}
            </p>
          )}
        </section>

        <section id="collections" className={SECTION}>
          <h2 className={`${EYEBROW} mb-4`}>Collections</h2>
          {live.length === 0 && (
            <p className={`${NOTE} mb-4`}>The indexer isn’t reporting any collections yet.</p>
          )}
          <ul className={GRID}>
            {collections.map((collection) => (
              <li key={collection.slug} className="flex">
                <CollectionCard collection={collection} />
              </li>
            ))}
          </ul>
        </section>

        <section id="activity" className={SECTION}>
          <h2 className={`${EYEBROW} mb-1`}>Activity</h2>
          {/* Says exactly what the data is. There is no collection-level feed in
              the contract, so this never claims to be one. */}
          <p className="mb-4 text-[11px] text-ink-muted">
            One row per piggy — the latest on-chain event the indexer has for it.
          </p>
          <Suspense fallback={<p className={NOTE}>Reading the latest moves…</p>}>
            <Activity collections={live} />
          </Suspense>
        </section>

        <section id="tokens" className={SECTION}>
          <h2 className={`${EYEBROW} mb-4`}>Tokens</h2>
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
