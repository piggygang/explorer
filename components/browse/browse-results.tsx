import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { NftCard } from "@/components/nft-card";
import { BrowseGrid } from "@/components/browse/browse-grid";
import { BrowseToolbar, FILTER_TRIGGER_ID } from "@/components/browse/browse-toolbar";
import { FacetPanel } from "@/components/browse/facet-panel";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ApiError, browseCollectionNfts, getCollectionFacets } from "@/lib/api/client";
import type { FacetsResponse, NftSummary } from "@/lib/api/client";
import { type BrowseParams, activeCount, browseIdentity, clearHref, closeSheetHref } from "@/lib/browse-params";

/**
 * The async child of the page's Suspense boundary. It issues both browse
 * fetches together so they never serialize, and it catches their failures
 * locally: a dead facets call must not take the grid with it, and a bookmarked
 * URL carrying a parameter the contract rejects is a recoverable state, not a
 * full-page error.
 *
 * It renders page ONE and nothing else. Everything after it is appended by
 * BrowseGrid, which is why these cards are handed to it as children rather than
 * serialized into its props twice.
 */

const GHOST_SM =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export async function BrowseResults({ slug, params }: { slug: string; params: BrowseParams }) {
  const [page, facets] = await Promise.all([
    browseCollectionNfts(slug, {
      trait: params.trait,
      q: params.q,
      sort: params.sort,
    }).catch((error: unknown) => {
      // A bookmarked URL can still carry a `q` over the contract's 64-character
      // limit, or a malformed `trait[...]` key. That is the reader's link being
      // wrong, not the indexer being down, so it must not reach the route error
      // boundary and become "the indexer didn't answer".
      //
      // invalid_cursor cannot land here: page one never sends one.
      if (error instanceof ApiError && error.code === "invalid_parameter") return null;
      throw error;
    }),
    getCollectionFacets(slug, { trait: params.trait, q: params.q }).catch(() => null),
  ]);

  const facetData: FacetsResponse | null = facets;
  const nfts: NftSummary[] = page?.data ?? [];
  const filtered = activeCount(params) > 0;

  return (
    <>
      <BrowseToolbar
        slug={slug}
        params={params}
        total={facetData?.total ?? null}
        shown={nfts.length}
        hasFacets={facetData !== null && facetData.facets.length > 0}
        firstTraitType={facetData?.facets[0]?.traitType}
      />

      {page === null ? (
        <div className="mx-auto w-full max-w-6xl px-5 pt-6">
          <EmptyState
            title="That link asks for something the indexer can’t read"
            body="One of the filters in this URL is malformed or too long. Starting fresh from the collection will fix it."
            action={
              <Link href={`/collections/${slug}`} className={GHOST_SM}>
                Start again
              </Link>
            }
          />
        </div>
      ) : nfts.length === 0 ? (
        <div className="mx-auto w-full max-w-6xl px-5 pt-6">
          {filtered ? (
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
          )}
        </div>
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

      <FilterSheet
        open={params.filters !== undefined}
        closeHref={closeSheetHref(slug, params)}
        triggerId={FILTER_TRIGGER_ID}
      >
        <FacetPanel
          slug={slug}
          params={params}
          facets={facetData?.facets ?? null}
          total={facetData?.total ?? null}
        />
      </FilterSheet>
    </>
  );
}
