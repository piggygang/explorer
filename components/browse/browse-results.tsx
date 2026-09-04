import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { NFT_GRID, NftCard } from "@/components/nft-card";
import { BrowseToolbar, FILTER_TRIGGER_ID } from "@/components/browse/browse-toolbar";
import { FacetPanel } from "@/components/browse/facet-panel";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ApiError, getCollectionFacets, listCollectionNfts } from "@/lib/api/client";
import type { NftSummary, PageInfo, TraitFacet } from "@/lib/api/client";
import { number } from "@/lib/format";
import {
  type BrowseParams,
  activeCount,
  clearHref,
  closeSheetHref,
  firstPageHref,
  pageHref,
} from "@/lib/browse-params";

/**
 * The async child of the page's Suspense boundary. It issues both browse
 * fetches together so they never serialize, and it catches their failures
 * locally: a dead facets call must not take the grid with it, and an expired
 * cursor is a normal thing to arrive with, not a crash.
 */

const GHOST =
  "rounded-full border border-line px-6 py-3 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const GHOST_SM =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const PAGER = "mx-auto w-full max-w-6xl px-5 pt-6 pb-16 text-center";
const NOTE = "mt-2 text-[11px] text-ink-muted";

export async function BrowseResults({ slug, params }: { slug: string; params: BrowseParams }) {
  const [page, facets] = await Promise.all([
    listCollectionNfts(slug, {
      trait: params.trait,
      q: params.q,
      sort: params.sort,
      owner: params.owner,
      cursor: params.cursor,
    }).catch((error: unknown) => {
      // The mock returns bad_request for any cursor that fails to round-trip,
      // so a stale bookmarked link lands here — recoverable, not a 500.
      if (error instanceof ApiError && error.status === 400) return null;
      throw error;
    }),
    getCollectionFacets(slug, { trait: params.trait, q: params.q }).catch(() => null),
  ]);

  const facetList: TraitFacet[] | null = facets;
  const nfts: NftSummary[] = page?.nfts ?? [];
  const pageInfo: PageInfo | null = page?.pageInfo ?? null;
  const filtered = activeCount(params) > 0;

  return (
    <>
      <BrowseToolbar
        slug={slug}
        params={params}
        total={pageInfo?.total ?? null}
        shown={nfts.length}
        hasFacets={facetList !== null && facetList.length > 0}
        firstTraitType={facetList?.[0]?.traitType}
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-6">
        {page === null ? (
          <EmptyState
            title="That page link has expired"
            body="Cursors are short-lived and forward-only — the list may have changed underneath it."
            action={
              <Link href={firstPageHref(slug, params)} className={GHOST_SM}>
                Back to the start
              </Link>
            }
          />
        ) : nfts.length === 0 ? (
          filtered ? (
            <EmptyState
              title="No piggies match"
              body="Trait types combine with AND, so a piggy has to carry one of your picks in every type. Loosen a filter and the grid fills back in."
              action={
                <Link href={clearHref(slug, params)} className={GHOST_SM}>
                  Clear all filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No piggies indexed yet"
              body="The indexer hasn’t written any assets for this collection. Check back shortly."
            />
          )
        ) : (
          <ul className={NFT_GRID}>
            {nfts.map((nft, index) => (
              <li key={nft.id} className="flex">
                <NftCard nft={nft} eager={index < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {nfts.length > 0 && (
        <div className={PAGER}>
          {/* No numbered pages and no Previous: cursors are forward-only and
              there is no prevCursor in the contract. */}
          {pageInfo?.nextCursor && (
            <Link href={pageHref(slug, params, pageInfo.nextCursor)} className={GHOST}>
              Show more
            </Link>
          )}
          {params.cursor && (
            <Link href={firstPageHref(slug, params)} className={`${GHOST} ml-2`}>
              Back to the start
            </Link>
          )}
          <p className={NOTE}>
            {pageInfo?.total === null || pageInfo === null
              ? `Showing ${number(nfts.length)} — the API skips the total when counting would be slow.`
              : `Showing ${number(nfts.length)} · ${number(pageInfo.total)} total`}
          </p>
        </div>
      )}

      <FilterSheet
        open={params.filters !== undefined}
        closeHref={closeSheetHref(slug, params)}
        triggerId={FILTER_TRIGGER_ID}
      >
        <FacetPanel
          slug={slug}
          params={params}
          facets={facetList}
          total={pageInfo?.total ?? null}
        />
      </FilterSheet>
    </>
  );
}
