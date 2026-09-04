import { Suspense } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLinks } from "@/components/nft/action-links";
import { ActivityTimeline } from "@/components/nft/activity-timeline";
import { AssetPanel } from "@/components/nft/asset-panel";
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
  listCollections,
  listNftActivity,
  listNftOwners,
} from "@/lib/api/client";
import type { NftDetail } from "@/lib/api/client";
import { presentation, toDisplay, withComingSoon } from "@/lib/collections";

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
const BACK =
  "shrink-0 rounded-full border border-line px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export async function generateMetadata(props: PageProps<"/nfts/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const nft = await getNft(id);
  if (!nft) return { title: "Unknown piggy" };
  return {
    title: nft.name,
    description: `${nft.name} — traits, owner and the full on-chain history.`,
  };
}

/** Traits stream: pricing ~7 chips costs a full unfiltered facets call. */
async function Traits({ nft }: { nft: NftDetail }) {
  const facets = await getCollectionFacets(nft.collection.slug).catch((error: unknown) => ({
    error,
  }));

  if ("error" in facets) return <ErrorNote what="trait rarity" error={facets.error} />;
  return <TraitChips attributes={nft.attributes} facets={facets} />;
}

/** The event list streams; ownership is already resolved by the page. */
async function Timeline({ id, owners }: { id: string; owners: number | null }) {
  const activity = await listNftActivity(id, { limit: 24 }).catch((error: unknown) => ({ error }));
  const failed = "error" in activity;

  return (
    <ActivityTimeline
      id={id}
      events={failed ? [] : activity.events}
      pageInfo={failed ? null : activity.pageInfo}
      owners={owners}
      error={failed ? activity.error : undefined}
    />
  );
}

export default async function NftPage(props: PageProps<"/nfts/[id]">) {
  const { id } = await props.params;

  // Blocking on purpose: once a Suspense fallback streams, headers are sent and
  // notFound() can no longer set a 404.
  // Owners rides along in the blocking wave: it is one cheap call, and both the
  // owner card's "held since" and the section-nav count need it before paint.
  const [nft, all, owners] = await Promise.all([
    getNft(id),
    listCollections(),
    listNftOwners(id, { limit: 24 }).catch((error: unknown) => ({ error })),
  ]);
  if (!nft) notFound();

  const ownersFailed = "error" in owners;
  const records = ownersFailed ? [] : owners.records;
  const ownerCount = ownersFailed ? null : (owners.pageInfo.total ?? owners.records.length);

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
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{nft.name}</h1>
                {nft.burned && <span className={BADGE}>Burned</span>}
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                <Link
                  href={`/collections/${nft.collection.slug}`}
                  className="transition-colors hover:text-ink"
                >
                  {nft.collection.name}
                </Link>
              </p>
            </div>
            <Link href={`/collections/${nft.collection.slug}`} className={BACK}>
              Back to browse
            </Link>
          </div>

          <div className={SPLIT}>
            <div className={RAIL}>
              <NftArt nft={nft} />
              <OwnerPanel nft={nft} records={records} />
              <AssetPanel nft={nft} />
              <ActionLinks nft={nft} />
            </div>

            <div className={CONTENT}>
              <SectionNav traits={nft.attributes.length} events={null} owners={ownerCount} />

              <section id="traits" aria-label="Traits" className={`${PANEL} scroll-mt-32`}>
                <h2 className={`${EYEBROW} mb-3`}>Traits</h2>
                <Suspense
                  fallback={<p className="text-sm text-ink-muted">Reading trait rarity…</p>}
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
                <Timeline id={id} owners={ownerCount} />
              </Suspense>

              <OwnershipHistory
                records={records}
                error={ownersFailed ? owners.error : undefined}
              />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
