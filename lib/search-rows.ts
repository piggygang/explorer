import type { CollectionNavItem } from "@/lib/collections";
import type { NftSummary, SearchResponse } from "@/lib/api/client";
import { collectionHref, nftHref, routeHref, searchHref, walletHref } from "@/lib/search";

/**
 * The ONE flattening of a SearchResponse into ordered rows.
 *
 * Both surfaces call it — the palette and /search — which is what makes "they
 * cannot disagree" true by construction rather than by discipline. Order,
 * destinations, labels and the empty-state copy all live here; only the density
 * differs downstream.
 *
 * The types from lib/api/client arrive as `import type` and ERASE, so this stays
 * client-safe: components/nft-card.tsx already type-imports NftSummary from that
 * module and compiles into both graphs. What would poison the island is a RUNTIME
 * import of it, which reaches dispatchMock and the fixture array.
 */

export type SearchRow =
  | { kind: "recent"; id: string; query: string }
  | { kind: "nft"; id: string; href: string; nft: NftSummary }
  | { kind: "mint"; id: string; href: string; address: string }
  | { kind: "wallet"; id: string; href: string; address: string; total: number }
  | { kind: "collection"; id: string; href: string; slug: string; name: string }
  | { kind: "all"; id: string; href: string; query: string };

/**
 * A labelled run of rows. The palette renders the label as a group heading and
 * flattens the rows for arrow navigation; /search renders the same runs as
 * sections. `slug` drives the accent, `total` is the group's EXACT count.
 */
export type SearchSection = {
  id: string;
  label: string | null;
  slug: string | null;
  total: number | null;
  rows: SearchRow[];
};

/**
 * `id` is ENTITY-stable — the address, the slug, the query — and is the React
 * key. It is deliberately NOT the DOM option id, which is positional
 * (paletteOptionId) because aria-activedescendant addresses a slot in the
 * rendered list. Keying rows by index would let NftImage's per-instance
 * loaded/failed state leak between different piggies as results change under it.
 */

/**
 * The non-NFT hits, in the contract's own precedence order: "an exact mint beats
 * a wallet with holdings, which beats an exact collection slug."
 *
 * `wallet` is emitted even when `route` already points at it. That sentence ranks
 * where the ENTER key goes; it does not say the palette may only list one thing.
 * WalletHit is also the only place a holding count exists, and a schema-legal
 * response can carry a non-null wallet with a null route.
 *
 * A route whose id does not fit its kind produces NO row — routeHref returns null
 * — because there is nowhere honest to send the reader. The surfaces render that
 * case separately rather than silently dropping it.
 */
export function topRows(result: SearchResponse): SearchRow[] {
  const rows: SearchRow[] = [];
  const route = result.route;
  const href = route === null ? null : routeHref(route);

  if (route !== null && href !== null && route.kind === "nft") {
    rows.push({ kind: "mint", id: `mint:${route.id}`, href, address: route.id });
  }
  if (result.wallet !== null) {
    rows.push({
      kind: "wallet",
      id: `wallet:${result.wallet.address}`,
      href: walletHref(result.wallet.address),
      address: result.wallet.address,
      total: result.wallet.totalCount,
    });
  }
  if (route !== null && href !== null && route.kind === "collection") {
    rows.push({
      kind: "collection",
      id: `collection:${route.id}`,
      href,
      slug: route.id,
      name: route.id,
    });
  }
  return rows;
}

/**
 * Collections whose name or slug contains the query, from the site's own nav
 * list — no API call, and independent of `route`.
 *
 * This is not decoration. piggy-gang's members are named a bare `#2`..`#30`, so
 * `groups` can never contain that collection for ANY text query: "piggy" matches
 * 120 and 72 in the other two and 0 there. Without a local match the site's third
 * collection is unreachable by name from its own search box. It also means the
 * feature does not depend on `route.kind: "collection"`, which the mock emits but
 * a real indexer may never send.
 *
 * Live only. An announced collection has a page but no piggies, and a search
 * result that leads to "not indexed yet" is a dead end — the header already
 * renders those as inert pills for the same reason.
 */
export function localCollections(
  query: string,
  collections: readonly CollectionNavItem[],
  exclude: readonly string[] = [],
): SearchRow[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return collections
    .filter(
      (collection) =>
        collection.status === "live" &&
        !exclude.includes(collection.slug) &&
        (collection.name.toLowerCase().includes(needle) ||
          collection.slug.includes(needle)),
    )
    .map((collection) => ({
      kind: "collection" as const,
      id: `collection:${collection.slug}`,
      href: collectionHref(collection.slug),
      slug: collection.slug,
      name: collection.name,
    }));
}

/**
 * Everything the palette lists, in order: the route hits, then collections the
 * site knows, then one section per collection group, then the escape hatch to
 * /search.
 *
 * Groups keep the order the server gave them — "most hits first" — and are never
 * re-sorted here. Nothing may assume the first row of a group is the best match:
 * the contract specifies no order inside a group and carries no relevance field.
 */
export function paletteSections(
  result: SearchResponse,
  collections: readonly CollectionNavItem[],
): SearchSection[] {
  const sections: SearchSection[] = [];
  const top = topRows(result);
  if (top.length > 0) {
    sections.push({ id: "top", label: "Best match", slug: null, total: null, rows: top });
  }

  const routed = result.route?.kind === "collection" ? [result.route.id] : [];
  const local = localCollections(result.query, collections, routed);
  if (local.length > 0) {
    sections.push({ id: "collections", label: "Collections", slug: null, total: null, rows: local });
  }

  for (const group of result.groups) {
    sections.push({
      id: `group:${group.collection.slug}`,
      label: group.collection.name,
      slug: group.collection.slug,
      total: group.total,
      rows: group.nfts.map((nft) => ({
        kind: "nft" as const,
        id: `nft:${nft.address}`,
        href: nftHref(nft.address),
        nft,
      })),
    });
  }

  if (result.groups.length > 0) {
    const query = result.query.trim();
    sections.push({
      id: "all",
      label: null,
      slug: null,
      total: null,
      rows: [{ kind: "all", id: `all:${query}`, href: searchHref(query), query }],
    });
  }

  return sections;
}

/** Every row the sections hold, in render order — the array arrow keys walk. */
export const flatten = (sections: readonly SearchSection[]): SearchRow[] =>
  sections.flatMap((section) => section.rows);

/**
 * What search actually covers, in one sentence both surfaces render.
 *
 * NOT components/browse/browse-results.tsx's version, which promises "the start
 * of its mint address" — that is browse's `q`, three OR'd predicates. Search's is
 * exclusive branches: a whole address, or a number, or a name substring. A
 * sentence that promised prefix matching here would be false.
 */
export const SEARCH_SCOPE_NOTE =
  "Search matches a piggy’s name, its exact number, or a full mint or wallet address. It is not fuzzy, so a near miss finds nothing.";

/** Copy for every state where there is nothing to list. Each names the CAUSE. */
export const SEARCH_COPY = {
  idle: {
    title: "Search every piggy",
    body: SEARCH_SCOPE_NOTE,
  },
  noMatch: {
    title: "Nothing matches that search",
    body: SEARCH_SCOPE_NOTE,
  },
  unknownAddress: {
    title: "Nothing indexed for that address",
    body: "That is a valid Solana address, but the indexer holds no piggy minted at it and no piggy held by it. It may belong to another collection, or hold nothing at all.",
  },
  tooLong: {
    title: "That search is too long",
    body: "The indexer takes at most 64 characters. A mint or wallet address is 44, so anything longer than this is not one.",
  },
  failed: {
    title: "The indexer didn’t answer",
    body: "Search is unavailable for a moment. Browsing a collection from the header still works, and this will fill in on the next load.",
  },
  rateLimited: {
    title: "Rate-limited",
    body: "Too many searches too quickly. Wait a minute and try again — browsing a collection from the header still works meanwhile.",
  },
} as const;
