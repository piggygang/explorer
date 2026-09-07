import { Suspense } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLinks } from "@/components/nft/action-links";
import { ActivityTimeline } from "@/components/nft/activity-timeline";
import { AssetPanel } from "@/components/nft/asset-panel";
import { BackToBrowse, BackToBrowseFallback } from "@/components/nft/back-to-browse";
import { Neighbours, RarityRank } from "@/components/nft/neighbours";
import { NftArt } from "@/components/nft/nft-art";
import { OwnerPanel } from "@/components/nft/owner-panel";
import { OwnershipHistory } from "@/components/nft/ownership-history";
import { SectionNav } from "@/components/nft/section-nav";
import { ErrorNote } from "@/components/error-note";
import { LoadingStatus, TimelineSkeleton } from "@/components/skeleton";
import { TraitChips } from "@/components/trait-chip";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getCollectionFacets,
  getNft,
  getNftActivity,
  getNftOwners,
  listCollections,
} from "@/lib/api/client";
import type { NftDetail } from "@/lib/api/client";
import { presentation, toDisplay, withComingSoon } from "@/lib/collections";
import { nftLabel } from "@/lib/format";

// Deliberately NO loading.tsx for this segment. A loading.tsx wraps the route in
// a Suspense boundary above the page, so Next streams the shell with a 200 and
// the page's own notFound() can no longer set the status — every miss becomes a
// soft 404, which would quietly poison ALG-639's sitemap and share cards.
// Verified: with a loading.tsx, /nfts/nope returned 200; without it, 404.
// The slow regions still stream from their own in-page <Suspense>, which runs
// after the blocking fetch has already decided 200 vs 404.
const SHELL = "mx-auto w-full max-w-6xl px-5 py-6 lg:py-10";
const SPLIT = "lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-8";
const RAIL = "flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-2";
const CONTENT = "mt-6 flex flex-col gap-4 lg:mt-0";
const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const BADGE =
  "shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted";
const CHIP =
  "inline-flex shrink-0 items-center rounded-full border border-[var(--accent)] px-2.5 py-0.5 text-xs text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const BACK =
  "shrink-0 rounded-full border border-line px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export async function generateMetadata(props: PageProps<"/nfts/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const nft = await getNft(id);
  if (!nft) return { title: "Unknown piggy" };
  // The real API names a pig `#2050`, not `Piggy SOL Gang #2050` — and the
  // contract allows `""` before the metadata backfill. A tab and a shared link
  // have no collection nav beside them to supply the missing half, so the title
  // composes it; the page heading does not need to, because the chip is there.
  const label = nftLabel(nft.name, nft.number);
  return {
    title: `${label} · ${nft.collection.name}`,
    description: `${label} from ${nft.collection.name} — traits, owner and the full on-chain history.`,
  };
}

/**
 * Traits stream: pricing ~7 chips costs a full unfiltered facets call.
 *
 * It owns its own heading so the overall rank can sit in the same row, and
 * because the denominator that makes the rank mean anything is `facets.total` —
 * the ranked population, burned pigs included, which is the same set the
 * indexer's rarity pass ranks over. A facets outage still leaves the rank: it
 * comes from the detail response, not from here.
 */
async function Traits({ nft }: { nft: NftDetail }) {
  const facets = await getCollectionFacets(nft.collection.slug).catch((error: unknown) => ({
    error,
  }));
  const failed = "error" in facets;

  return (
    <>
      <TraitsHeading nft={nft} of={failed ? null : facets.total} />
      {failed ? (
        <ErrorNote what="trait rarity" error={facets.error} />
      ) : (
        <TraitChips attributes={nft.attributes} facets={facets.facets} />
      )}
    </>
  );
}

function TraitsHeading({ nft, of }: { nft: NftDetail; of: number | null }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className={EYEBROW}>Traits</h2>
      <RarityRank nft={nft} of={of} />
    </div>
  );
}

/** The event list streams; the lifetime summary rides on the detail response. */
async function Timeline({ nft }: { nft: NftDetail }) {
  const activity = await getNftActivity(nft.address, { limit: 24 }).catch((error: unknown) => ({
    error,
  }));
  const failed = "error" in activity;

  return (
    <ActivityTimeline
      summary={nft.activitySummary}
      events={failed ? [] : activity.data}
      hasMore={failed ? false : activity.hasMore}
      error={failed ? activity.error : undefined}
    />
  );
}

export default async function NftPage(props: PageProps<"/nfts/[id]">) {
  const { id } = await props.params;

  // Blocking on purpose: once a Suspense fallback streams, headers are sent and
  // notFound() can no longer set a 404.
  // Ownership rides along in the blocking wave: it is one cheap call and the
  // history panel below it is not worth its own boundary.
  const [nft, all, owners] = await Promise.all([
    getNft(id),
    listCollections(),
    getNftOwners(id, { limit: 24 }).catch((error: unknown) => ({ error })),
  ]);
  if (!nft) notFound();

  const ownersFailed = "error" in owners;
  const intervals = ownersFailed ? [] : owners.data;

  const collections = withComingSoon(all.map(toDisplay));
  const accent = { "--accent": presentation(nft.collection.slug).accent } as CSSProperties;

  return (
    <>
      <SiteHeader collections={collections} activeSlug={nft.collection.slug} />

      <main className="flex-1">
        <div style={accent} className={SHELL}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {nftLabel(nft.name, nft.number)}
                </h1>
                {nft.burned && <span className={BADGE}>Burned</span>}
              </div>
              <p className="mt-1.5">
                <Link href={`/collections/${nft.collection.slug}`} className={CHIP}>
                  {nft.collection.name}
                </Link>
              </p>
            </div>
            <Suspense fallback={<BackToBrowseFallback slug={nft.collection.slug} className={BACK} />}>
              <BackToBrowse slug={nft.collection.slug} className={BACK} />
            </Suspense>
          </div>

          <div className={SPLIT}>
            <div className={RAIL}>
              <NftArt nft={nft} />
              <OwnerPanel nft={nft} />
              <AssetPanel nft={nft} />
              <ActionLinks nft={nft} />
            </div>

            <div className={CONTENT}>
              {/* Counts come from activitySummary, which is lifetime and
                  server-computed, rather than from the page of events actually
                  loaded. transferCount + salesCount is not a total event count —
                  mints and burns are outside both — so Activity stays uncounted
                  rather than carrying a number that is quietly short. */}
              <SectionNav
                traits={nft.attributes.length}
                events={null}
                owners={nft.activitySummary?.ownerCount ?? null}
              />

              <section id="traits" aria-label="Traits" className={`${PANEL} scroll-mt-32`}>
                <Suspense
                  fallback={
                    <>
                      <h2 className={`${EYEBROW} mb-3`}>Traits</h2>
                      <p className="text-sm text-ink-muted">Reading trait rarity…</p>
                    </>
                  }
                >
                  <Traits nft={nft} />
                </Suspense>
              </section>

              <Suspense
                fallback={
                  <div className={PANEL}>
                    <h2 className={EYEBROW}>Activity</h2>
                    <LoadingStatus>Loading the timeline…</LoadingStatus>
                    <div className="mt-3">
                      <TimelineSkeleton />
                    </div>
                  </div>
                }
              >
                <Timeline nft={nft} />
              </Suspense>

              <OwnershipHistory
                intervals={intervals}
                error={ownersFailed ? owners.error : undefined}
              />

              {/* Two cheap indexed lookups, so they stream rather than delay the
                  404 decision the blocking wave above already made. */}
              <Suspense fallback={null}>
                <Neighbours nft={nft} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
