import Link from "next/link";
import { ActiveFilters } from "@/components/browse/active-filters";
import { EmptyState } from "@/components/empty-state";
import { NftCard } from "@/components/nft-card";
import { BrowseGrid } from "@/components/browse/browse-grid";
import { BrowseToolbar, FILTER_TRIGGER_ID } from "@/components/browse/browse-toolbar";
import { FacetPanel } from "@/components/browse/facet-panel";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ApiError, browseCollectionNfts, getCollectionFacets } from "@/lib/api/client";
import type { FacetsResponse, NftSummary } from "@/lib/api/client";
import { number } from "@/lib/format";
import { BROWSE_RAIL, BROWSE_SPLIT } from "@/lib/browse-layout";
import {
  type BrowseParams,
  browseIdentity,
  clearHref,
  withinCaps,
  closeSheetHref,
  dropQueryHref,
  traitCount,
} from "@/lib/browse-params";

/**
 * The async child of the page's Suspense boundary. It issues both browse fetches
 * together so they never serialize, and it catches their failures locally: a
 * dead facets call must not take the grid with it, and a bookmarked URL carrying
 * a parameter the contract rejects is a recoverable state, not a full-page error.
 *
 * It renders page ONE and nothing else. Everything after it is appended by
 * BrowseGrid, which is why those cards are handed to it as children rather than
 * serialized into its props twice.
 *
 * It also owns the two-column shell, because the grid island no longer does: the
 * filter rail and the grid are siblings in one container here.
 */

const CONTAINER = "mx-auto w-full max-w-6xl px-5";
const GHOST_SM =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const RAIL_SCROLL = "min-h-0 flex-1 overflow-y-auto pr-1";
const SHEET_HEAD = "flex shrink-0 items-center justify-between gap-3 border-b border-line p-5";
const SHEET_BODY = "min-h-0 flex-1 overflow-y-auto p-5";
const SHEET_FOOT = "flex shrink-0 flex-col gap-2 border-t border-line p-5";
const CLOSE =
  "rounded-full px-2 py-1 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const DONE =
  "rounded-full bg-brand px-6 py-3.5 text-center text-base font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const SHEET_COUNT = "text-center text-[11px] text-ink-muted";

export async function BrowseResults({ slug, params }: { slug: string; params: BrowseParams }) {
  const [page, facets] = await Promise.all([
    browseCollectionNfts(slug, {
      trait: params.trait,
      q: params.q,
      sort: params.sort,
    }).catch((error: unknown) => {
      // A bookmarked URL can still carry a malformed `trait[...]` key. That is
      // the reader's link being wrong, not the indexer being down, so it must
      // not reach the route error boundary and become "the indexer didn't
      // answer". invalid_cursor cannot land here: page one never sends one.
      if (error instanceof ApiError && error.code === "invalid_parameter") return null;
      throw error;
    }),
    getCollectionFacets(slug, { trait: params.trait, q: params.q }).catch(() => null),
  ]);

  const facetData: FacetsResponse | null = facets;
  const nfts: NftSummary[] = page?.data ?? [];
  const traits = traitCount(params);
  const searching = params.q !== undefined;

  /**
   * Hide the filter UI only when the API positively said there is nothing to
   * filter on AND the reader is not already filtering. A failed call keeps the
   * rail so the desktop reader gets the explanation — the trigger is lg:hidden,
   * so a missing rail would be their only signal — and an empty response with
   * filters active is a bookmarked URL naming a trait type that no longer
   * exists, which is a thing to say rather than a thing to hide.
   */
  const showFilters = facetData === null || facetData.facets.length > 0 || traits > 0;

  const panel = (shell: "rail" | "drawer") => (
    <FacetPanel slug={slug} params={params} facets={facetData?.facets ?? null} shell={shell} />
  );

  return (
    <>
      <BrowseToolbar
        slug={slug}
        params={params}
        total={facetData?.total ?? null}
        shown={nfts.length}
        hasFacets={showFilters}
      />

      <div className={`${CONTAINER} pt-4`}>
        <ActiveFilters slug={slug} params={params} />
      </div>

      {/* The split only applies when the rail is actually rendered: a two-column
          grid with one child auto-places it into the first cell, which would
          render the grid 20rem wide. */}
      <div className={`${CONTAINER} pt-4 pb-16 ${showFilters ? BROWSE_SPLIT : ""}`}>
        {showFilters && (
          <aside aria-label="Filters" className={BROWSE_RAIL}>
            <div className={RAIL_SCROLL}>{panel("rail")}</div>
          </aside>
        )}

        <div className="min-w-0">
          {page === null ? (
            // Two different bad links, and they want different sentences: one
            // is over the contract's caps, which Clear all fixes without losing
            // the collection, and the other is a key the parser could not read
            // at all, where starting fresh is the only move.
            !withinCaps(params) ? (
              <EmptyState
                title="That link asks for too many filters"
                body="The indexer takes at most 16 trait types and 64 values at a time. Clearing the filters puts this collection back."
                action={
                  <Link href={clearHref(slug, params)} className={GHOST_SM}>
                    Clear all filters
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="That link asks for something the indexer can’t read"
                body="One of the filters in this URL is malformed. Starting fresh from the collection will fix it."
                action={
                  <Link href={`/collections/${slug}`} className={GHOST_SM}>
                    Start again
                  </Link>
                }
              />
            )
          ) : nfts.length === 0 ? (
            // Three branches, not two. The cause has to be named: routing a
            // search-only zero-result into "no piggies indexed yet" would be
            // flatly false for a collection with a hundred of them, and the
            // trait-AND explanation does not describe a search either.
            traits > 0 && searching ? (
              <EmptyState
                title="No piggies match"
                body="The search and the trait filters have to agree, and right now nothing satisfies both. Drop one and the grid fills back in."
                action={
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Link href={dropQueryHref(slug, params)} className={GHOST_SM}>
                      Drop the search
                    </Link>
                    <Link href={clearHref(slug, params)} className={GHOST_SM}>
                      Clear all filters
                    </Link>
                  </div>
                }
              />
            ) : traits > 0 ? (
              <EmptyState
                title="No piggies match"
                body="Trait types combine with AND, so a piggy has to carry one of your picks in every type. Loosen a filter and the grid fills back in."
                action={
                  <Link href={clearHref(slug, params)} className={GHOST_SM}>
                    Clear all filters
                  </Link>
                }
              />
            ) : searching ? (
              <EmptyState
                title="Nothing matches that search"
                body="Search covers a piggy’s name, its number and the start of its mint address — it is not fuzzy, so a near miss finds nothing."
                action={
                  <Link href={dropQueryHref(slug, params)} className={GHOST_SM}>
                    Drop the search
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
            // Keyed on the query, so changing sort or filters remounts the island
            // rather than appending the new query's pages onto the old one's cards.
            <BrowseGrid
              key={browseIdentity(slug, params)}
              slug={slug}
              sort={params.sort}
              q={params.q}
              trait={params.trait}
              initialAddresses={nfts.map((nft) => nft.address)}
              initialCursor={page.nextCursor}
              initialHasMore={page.hasMore}
              total={facetData?.total ?? null}
            >
              {nfts.map((nft, index) => (
                <li key={nft.address} className="flex">
                  <NftCard nft={nft} eager={index < 4} />
                </li>
              ))}
            </BrowseGrid>
          )}
        </div>
      </div>

      {/* The drawer's copy of the panel is rendered only while it is open. Both
          shells are otherwise in the DOM at once, which would double ~90 rows of
          markup on every desktop response for a dialog nobody opened. Opening is
          a navigation, so the panel arrives server-rendered with it. */}
      <FilterSheet
        open={params.filters === true}
        closeHref={closeSheetHref(slug, params)}
        triggerId={FILTER_TRIGGER_ID}
      >
        <div className={SHEET_HEAD}>
          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
          {/* replace, not push, to match Escape and the backdrop — otherwise
              closing one way leaves a history entry that closing another does not. */}
          <Link href={closeSheetHref(slug, params)} replace scroll={false} aria-label="Close filters" className={CLOSE}>
            <span aria-hidden="true">✕</span>
          </Link>
        </div>
        <div className={SHEET_BODY}>{params.filters === true && panel("drawer")}</div>
        <div className={SHEET_FOOT}>
          <Link href={closeSheetHref(slug, params)} replace scroll={false} className={DONE}>
            Done
          </Link>
          {/* The count is its own line rather than the button's label: every row
              above already navigated, so "Show N piggies" would name an action
              that does not happen. It is also the only feedback a screen-reader
              user gets in here, since showModal() makes the rest of the document
              — including the toolbar's live count — inert. */}
          <p aria-live="polite" className={SHEET_COUNT}>
            {facetData === null
              ? "Counts unavailable"
              : `${number(facetData.total)} piggies match`}
          </p>
        </div>
      </FilterSheet>
    </>
  );
}
