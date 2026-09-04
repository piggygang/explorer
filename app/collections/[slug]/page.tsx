import { Suspense } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrowseResults } from "@/components/browse/browse-results";
import { CollectionArt } from "@/components/collection-art";
import { PiggyMark } from "@/components/brand/wordmark";
import { EmptyState } from "@/components/empty-state";
import { LoadingStatus, NftGridSkeleton } from "@/components/skeleton";
import { NFT_GRID } from "@/components/nft-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCollection, listCollections } from "@/lib/api/client";
import { number } from "@/lib/format";
import { announced, toDisplay, withComingSoon } from "@/lib/collections";
import { parseBrowseParams } from "@/lib/browse-params";

// Reading searchParams makes this route dynamic, so a page-level revalidate
// would silently stop applying. The 300s TTL lives on the fetches instead
// (lib/api/client.ts) — the only place it still bites once a real API is wired.

// Deliberately NO loading.tsx for this segment. A loading.tsx wraps the route in
// a Suspense boundary above the page, so Next streams the shell with a 200 and
// the page's own notFound() can no longer set the status — every miss becomes a
// soft 404, which would quietly poison ALG-639's sitemap and share cards.
// Verified: with a loading.tsx, /nfts/nope returned 200; without it, 404.
// The slow regions still stream from their own in-page <Suspense>, which runs
// after the blocking fetch has already decided 200 vs 404.
const SECTION = "mx-auto w-full max-w-6xl px-5 pt-14";
const BAND =
  "mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4";
const CELL = "flex flex-col gap-1 bg-surface px-4 py-3";
const LABEL = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const VALUE = "font-mono text-xl";
const BADGE =
  "shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted";
const BACK =
  "shrink-0 rounded-full border border-line px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = await getCollection(slug);
  return { title: collection?.name ?? announced(slug)?.name ?? "Unknown collection" };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={CELL}>
      <dt className={LABEL}>{label}</dt>
      <dd className={VALUE}>{number(value)}</dd>
    </div>
  );
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const { slug } = await props.params;
  const params = parseBrowseParams(await props.searchParams);

  // Blocking, and deliberately not inside a Suspense boundary: once a fallback
  // streams, headers are sent and notFound() can no longer set a status.
  const [all, collection] = await Promise.all([listCollections(), getCollection(slug)]);
  const collections = withComingSoon(all.map(toDisplay));

  // A slug the site's own header advertises must not 404 just because the
  // indexer has not reached it yet.
  const soon = collection ? null : announced(slug);
  if (!collection && !soon) notFound();

  const display = collection ? toDisplay(collection) : soon!;
  const accent = { "--accent": display.accent } as CSSProperties;

  return (
    <>
      <SiteHeader collections={collections} activeSlug={slug} />

      <main className="flex-1">
        <section style={accent} className={SECTION}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line sm:block sm:h-20 sm:w-20">
                {display.art ? (
                  <CollectionArt art={display.art} alt="" eager />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[var(--accent)]/10">
                    <PiggyMark className="h-8 w-8 opacity-25" />
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {display.name}
                  </h1>
                  {collection ? (
                    <span className={BADGE}>
                      {collection.standard === "core" ? "Core" : "Token Metadata"}
                    </span>
                  ) : (
                    <span className={BADGE}>Coming soon</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{display.tagline}</p>
              </div>
            </div>
            <Link href="/#collections" className={BACK}>
              All collections
            </Link>
          </div>

          {collection && (
            <dl className={BAND}>
              <Stat label="Supply" value={collection.stats.supply} />
              <Stat label="Holders" value={collection.stats.holders} />
              <Stat label="24h activity" value={collection.stats.activity24h} />
              <Stat label="7d activity" value={collection.stats.activity7d} />
            </dl>
          )}
        </section>

        {collection ? (
          <div style={accent}>
            <Suspense
              fallback={
                <div className="mx-auto w-full max-w-6xl px-5 pt-6">
                  <LoadingStatus>Loading piggies…</LoadingStatus>
                  <NftGridSkeleton className={NFT_GRID} />
                </div>
              }
            >
              <BrowseResults slug={slug} params={params} />
            </Suspense>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-6xl px-5 pt-6 pb-16">
            <EmptyState
              title="Not indexed yet"
              body={`${display.name} hasn’t minted. When it does, every piggy shows up here — traits, owners and all.`}
              action={
                <Link href="/#collections" className={BACK + " mt-4 inline-flex"}>
                  Browse the live collections
                </Link>
              }
            />
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
