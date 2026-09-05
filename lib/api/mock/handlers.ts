import type { components } from "@/lib/api/schema";
import { COLLECTIONS } from "@/lib/api/fixtures/collections";
import { NFTS } from "@/lib/api/fixtures/nfts";
import { ACTIVITY, OWNERSHIP } from "@/lib/api/fixtures/activity";
import { decodeCursor, encodeCursor, scopeOf } from "@/lib/api/mock/cursor";

type Schemas = components["schemas"];
type Row = (typeof NFTS)[number];

/**
 * Every envelope below is built with `satisfies` against the generated schema
 * types, so a contract change that this file has not caught up with is a
 * compile error rather than a runtime surprise in the browser.
 */

/** Constant on every response — the contract's surface, not a real limiter. */
const HEADERS = {
  "Cache-Control": "public, max-age=30",
  Vary: "Accept-Encoding",
  "X-RateLimit-Limit": "120",
  "X-RateLimit-Remaining": "119",
  "X-RateLimit-Reset": "60",
};

function ok(body: unknown): Response {
  return Response.json(body, { headers: HEADERS });
}

function error(
  status: number,
  code: Schemas["Error"]["error"],
  message: string,
  details: Record<string, unknown> | null = null,
): Response {
  const body = { error: code, message, details } satisfies Schemas["Error"];
  return Response.json(body, { status, headers: HEADERS });
}

export const notFound = (message: string) => error(404, "not_found", message);
const invalidParameter = (message: string) => error(400, "invalid_parameter", message);
const invalidCursor = (message: string) => error(400, "invalid_cursor", message);

// ------------------------------------------------------------- query parsing

/**
 * `trait[Background]=Pink&trait[Background]=Blue` -> { Background: [Pink, Blue] }.
 * null = malformed (`trait` without a bracketed type, or an empty type) — the
 * contract's 400, not something to silently ignore.
 */
function traitFilters(params: URLSearchParams): Record<string, string[]> | null {
  const filters: Record<string, string[]> = {};
  for (const [key, value] of params) {
    if (key !== "trait" && !key.startsWith("trait[")) continue;
    const match = /^trait\[(.+)\]$/.exec(key);
    if (!match) return null;
    (filters[match[1]] ??= []).push(value);
  }
  return filters;
}

/**
 * The contract bounds `limit` at 1..100 with a default of 24 and says exceeding
 * the maximum is an error, "never a silent clamp". Which error depends on the
 * path: only the browse endpoint declares a 422, so everywhere else an
 * out-of-range limit is 400 invalid_parameter. (Worth one line back to the
 * indexer team — the Limit parameter's prose says 422 everywhere.)
 */
function limitOf(params: URLSearchParams): number | null {
  if (!params.has("limit")) return 24;
  const limit = Number(params.get("limit"));
  return Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : null;
}

function page<T>(items: T[], limit: number, offset: number, scope: string) {
  const next = offset + limit;
  const hasMore = next < items.length;
  return {
    data: items.slice(offset, next),
    nextCursor: hasMore ? encodeCursor(next, scope) : null,
    hasMore,
  };
}

// ------------------------------------------------------------------ filtering

/** AND across trait types, OR within one type's values. */
function matchesTraits(nft: Row, filters: Record<string, string[]>): boolean {
  return Object.entries(filters).every(([traitType, values]) =>
    nft.attributes.some(
      (attribute) => attribute.traitType === traitType && values.includes(attribute.value),
    ),
  );
}

/**
 * The contract's `q` is exactly three OR'd predicates and nothing more: a
 * base58 address prefix (case-sensitive), an exact token number when the input
 * looks like `#N` or `N`, and a case-insensitive substring of the name.
 */
function matchesQuery(nft: Row, raw: string): boolean {
  const q = raw.trim();
  if (!q) return true;
  if (nft.address.startsWith(q)) return true;
  const asNumber = Number(q.replace(/^#/, ""));
  if (Number.isInteger(asNumber) && nft.number === asNumber) return true;
  return nft.name.toLowerCase().includes(q.toLowerCase());
}

/**
 * The browse population: member assets of the collection, burned included. The
 * contract is explicit that there is no `burned` filter — the UI greys those
 * cards out instead.
 */
function population(slug: string): Row[] {
  return NFTS.filter(
    (nft) => nft.collectionSlug === slug && nft.membershipStatus === "member",
  );
}

function filtered(slug: string, params: URLSearchParams, filters: Record<string, string[]>): Row[] {
  let items = population(slug);
  if (Object.keys(filters).length > 0) items = items.filter((nft) => matchesTraits(nft, filters));
  const q = params.get("q");
  if (q) items = items.filter((nft) => matchesQuery(nft, q));
  return items;
}

// --------------------------------------------------------------------- sorts

/**
 * Null placement follows the contract where it is pinned — unnumbered assets
 * sort last under `number`, never-active ones first under `activity` — and
 * keeps nulls last in both descending forms, which the contract leaves open and
 * which is the reading that puts real data at the top of the page either way.
 */
const nullsLast = (value: number | null) => (value === null ? Infinity : value);
const nullsFirst = (value: number | null) => (value === null ? -Infinity : value);
const activityAt = (nft: Row) => (nft.lastActivityAt === null ? null : Date.parse(nft.lastActivityAt));

const SORTS: Record<string, (a: Row, b: Row) => number> = {
  number: (a, b) => nullsLast(a.number) - nullsLast(b.number),
  "-number": (a, b) => nullsFirst(b.number) - nullsFirst(a.number),
  // Byte order, not locale: the contract pins `#1` < `#10` < `#2`.
  name: (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  "-name": (a, b) => (b.name < a.name ? -1 : b.name > a.name ? 1 : 0),
  activity: (a, b) => nullsFirst(activityAt(a)) - nullsFirst(activityAt(b)),
  "-activity": (a, b) => nullsLast(activityAt(b)) - nullsLast(activityAt(a)),
};

// ------------------------------------------------------------- projections

function collectionOf(slug: string): Schemas["Collection"] | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

function refOf(slug: string): Schemas["CollectionRef"] {
  const collection = collectionOf(slug);
  return {
    slug,
    name: collection?.name ?? slug,
    imageUrl: collection?.imageUrl ?? null,
  };
}

/** The grid card. Detail-only fields never leak into a listing. */
function toSummary(nft: Row): Schemas["NftSummary"] {
  return {
    address: nft.address,
    name: nft.name,
    number: nft.number,
    imageUri: nft.imageUri,
    imageStatus: nft.imageStatus,
    burned: nft.burned,
    owner: nft.owner,
    lastActivityAt: nft.lastActivityAt,
    rarityRank: nft.rarityRank,
    rarityScore: nft.rarityScore,
    collection: refOf(nft.collectionSlug),
  };
}

const eventsOf = (address: string): Schemas["ActivityEvent"][] =>
  ACTIVITY[address as keyof typeof ACTIVITY] ?? [];
const intervalsOf = (address: string): Schemas["OwnershipInterval"][] =>
  OWNERSHIP[address as keyof typeof OWNERSHIP] ?? [];

/**
 * ownership, mint and activitySummary are derived here rather than stored on
 * the fixture row, so an NFT's detail panel can never disagree with its own
 * timeline — the one bug a hand-written fixture of both would invite.
 */
function ownerCard(nft: Row): Schemas["OwnerCard"] {
  const open = intervalsOf(nft.address).find((interval) => interval.isCurrent);
  // The contract: heldSince is null when the open interval disagrees with the
  // observed owner, rather than attributing a date to the wrong wallet.
  const agrees = open !== undefined && open.owner === nft.owner;
  return {
    owner: nft.owner,
    ownerSlot: agrees ? open.fromSlot : null,
    heldSince: agrees ? open.fromTs : null,
    heldSinceSlot: agrees ? open.fromSlot : null,
    acquiredBySignature: agrees ? open.openedBySignature : null,
  };
}

function mintInfo(nft: Row): Schemas["MintInfo"] {
  const mint = eventsOf(nft.address).find((event) => event.kind === "mint");
  return {
    mintedAt: mint?.blockTime ?? null,
    mintSlot: mint?.slot ?? null,
    signature: mint?.signature ?? null,
  };
}

function activitySummary(nft: Row): Schemas["ActivitySummary"] {
  const events = eventsOf(nft.address);
  const sales = events.filter((event) => event.kind === "sale");
  // Events are newest first, so the first sale in the list is the last one.
  const last = sales[0];
  return {
    salesCount: sales.length,
    transferCount: events.filter((event) => event.kind === "transfer").length,
    ownerCount: new Set(intervalsOf(nft.address).map((interval) => interval.owner)).size,
    lastSalePriceLamports: last?.priceLamports ?? null,
    lastSaleAt: last?.blockTime ?? null,
    lastSaleMarketplace: last?.marketplace ?? null,
  };
}

/**
 * Listed field by field rather than spread, so the row's internal
 * collectionSlug — which the contract replaces with the nested collection ref —
 * cannot leak into a response, and so a new field in NftDetail is a compile
 * error here rather than a silently missing key.
 */
function toDetail(nft: Row): Schemas["NftDetail"] {
  return {
    ...toSummary(nft),
    standard: nft.standard,
    symbol: nft.symbol,
    membershipStatus: nft.membershipStatus,
    removedAt: nft.removedAt,
    metadataUri: nft.metadataUri,
    metadataSourceUri: nft.metadataSourceUri,
    imageCheckedAt: nft.imageCheckedAt,
    updatedAt: nft.updatedAt,
    attributes: nft.attributes,
    ownership: ownerCard(nft),
    mint: mintInfo(nft),
    activitySummary: activitySummary(nft),
  };
}

// ------------------------------------------------------------------ handlers

export function listCollections(params: URLSearchParams): Response {
  const limit = limitOf(params);
  if (limit === null) return invalidParameter("limit must be an integer between 1 and 100");
  const scope = scopeOf("collections", params, []);
  const offset = decodeCursor(params.get("cursor"), scope);
  if (offset === null) return invalidCursor("this cursor was not issued for this listing");
  return ok(page(COLLECTIONS, limit, offset, scope) satisfies Schemas["CollectionPage"]);
}

export function getCollection(slug: string): Response {
  const collection = collectionOf(slug);
  if (!collection) return notFound(`no collection "${slug}"`);
  // Single-resource GETs are unenveloped in v1; only listings carry {data}.
  return ok(collection satisfies Schemas["Collection"]);
}

export function browseCollectionNfts(slug: string, params: URLSearchParams): Response {
  if (!collectionOf(slug)) return notFound(`no collection "${slug}"`);

  const sort = params.get("sort") ?? "number";
  if (sort === "rarity" || sort === "-rarity") {
    // Reserved in the contract so the client's union stays stable, but rarity
    // scoring is ALG-627. Answering 422 here is what keeps the Explorer honest:
    // the fixtures carry synthetic ranks, and this is what stops anything
    // ordering by them.
    return error(422, "unsupported_sort", `sort "${sort}" is not available yet`, {
      supported: Object.keys(SORTS),
    });
  }
  const compare = SORTS[sort];
  if (!compare) return invalidParameter(`unknown sort "${sort}"`);

  const limit = limitOf(params);
  if (limit === null) {
    // The one path that declares a 422 for this.
    return error(422, "invalid_parameter", "limit must be an integer between 1 and 100");
  }
  const filters = traitFilters(params);
  if (!filters) return invalidParameter("malformed trait filter");

  // A cursor is bound to the sort and filter set that issued it, so paging on
  // after a filter change is a recoverable 400 rather than a silently wrong page.
  const scope = scopeOf(`browse:${slug}`, params, ["sort", "q"]);
  const offset = decodeCursor(params.get("cursor"), scope);
  if (offset === null) {
    return invalidCursor("this cursor was issued for a different sort or filter set");
  }

  const items = filtered(slug, params, filters).slice().sort(compare);
  const { data, nextCursor, hasMore } = page(items, limit, offset, scope);
  return ok({ data: data.map(toSummary), nextCursor, hasMore } satisfies Schemas["NftPage"]);
}

export function getCollectionFacets(slug: string, params: URLSearchParams): Response {
  if (!collectionOf(slug)) return notFound(`no collection "${slug}"`);
  const filters = traitFilters(params);
  if (!filters) return invalidParameter("malformed trait filter");

  // Only facetable trait types appear: a collection's facet_exclude removes the
  // per-asset-unique ones, which the fixtures carry as attribute.isFacet.
  const traitTypes = new Set<string>();
  for (const nft of population(slug)) {
    for (const attribute of nft.attributes) {
      if (attribute.isFacet) traitTypes.add(attribute.traitType);
    }
  }

  // Disjunctive counts: for each trait type, apply every filter EXCEPT its own,
  // so the values a user could still add stay visible with real counts.
  const base = filtered(slug, params, {});
  const facets = [...traitTypes]
    .sort()
    .map((traitType) => {
      const others = Object.fromEntries(
        Object.entries(filters).filter(([type]) => type !== traitType),
      );
      const subset = base.filter((nft) => matchesTraits(nft, others));
      const counts = new Map<string, number>();
      for (const nft of subset) {
        for (const attribute of nft.attributes) {
          if (attribute.traitType !== traitType) continue;
          counts.set(attribute.value, (counts.get(attribute.value) ?? 0) + 1);
        }
      }
      return {
        traitType,
        // Count descending, then value — the contract's stated order.
        values: [...counts]
          .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
          .map(([value, count]) => ({ value, count })),
      };
    });

  // `total` is the size of the filtered result set — the number the browse grid
  // shows, and the reason this endpoint carries it: it already pays for a scan.
  return ok({
    total: filtered(slug, params, filters).length,
    facets,
  } satisfies Schemas["FacetsResponse"]);
}

/** The four kinds v1 serves. A `?kind=` outside them is a bad parameter. */
const PUBLIC_KINDS = new Set(["mint", "transfer", "sale", "burn"]);

export function getCollectionActivity(slug: string, params: URLSearchParams): Response {
  if (!collectionOf(slug)) return notFound(`no collection "${slug}"`);
  const limit = limitOf(params);
  if (limit === null) return invalidParameter("limit must be an integer between 1 and 100");

  const kinds = params.getAll("kind");
  if (kinds.some((kind) => !PUBLIC_KINDS.has(kind))) {
    return invalidParameter(`kind must be one of ${[...PUBLIC_KINDS].join(", ")}`);
  }
  const scope = scopeOf(`collection-activity:${slug}`, params, ["kind"]);
  const offset = decodeCursor(params.get("cursor"), scope);
  if (offset === null) return invalidCursor("this cursor was issued for a different filter set");

  const events = population(slug)
    .flatMap((nft) =>
      eventsOf(nft.address)
        .filter((event) => kinds.length === 0 || kinds.includes(event.kind))
        .map((event) => ({ ...event, nft: toSummary(nft) })),
    )
    // Newest first, ordered by (slot, id) descending — the same key the real
    // feed pages on, which is why the strip must never re-sort by blockTime.
    .sort((a, b) => b.slot - a.slot || (a.id < b.id ? 1 : -1));

  return ok(page(events, limit, offset, scope) satisfies Schemas["CollectionActivityPage"]);
}

export function getNft(id: string): Response {
  const nft = NFTS.find((candidate) => candidate.address === id);
  if (!nft) return notFound(`no NFT "${id}"`);
  return ok(toDetail(nft) satisfies Schemas["NftDetail"]);
}

export function getNftActivity(id: string, params: URLSearchParams): Response {
  const nft = NFTS.find((candidate) => candidate.address === id);
  if (!nft) return notFound(`no NFT "${id}"`);
  const limit = limitOf(params);
  if (limit === null) return invalidParameter("limit must be an integer between 1 and 100");

  const kinds = params.getAll("kind");
  if (kinds.some((kind) => !PUBLIC_KINDS.has(kind))) {
    return invalidParameter(`kind must be one of ${[...PUBLIC_KINDS].join(", ")}`);
  }
  const scope = scopeOf(`nft-activity:${id}`, params, ["kind"]);
  const offset = decodeCursor(params.get("cursor"), scope);
  if (offset === null) return invalidCursor("this cursor was issued for a different filter set");

  const events = eventsOf(id).filter((event) => kinds.length === 0 || kinds.includes(event.kind));
  return ok(page(events, limit, offset, scope) satisfies Schemas["ActivityPage"]);
}

export function getNftOwners(id: string, params: URLSearchParams): Response {
  const nft = NFTS.find((candidate) => candidate.address === id);
  if (!nft) return notFound(`no NFT "${id}"`);
  const limit = limitOf(params);
  if (limit === null) return invalidParameter("limit must be an integer between 1 and 100");
  const scope = scopeOf(`nft-owners:${id}`, params, []);
  const offset = decodeCursor(params.get("cursor"), scope);
  if (offset === null) return invalidCursor("this cursor was not issued for this listing");
  return ok(page(intervalsOf(id), limit, offset, scope) satisfies Schemas["OwnershipPage"]);
}

export function getWalletPortfolio(address: string, params: URLSearchParams): Response {
  const limit = limitOf(params);
  if (limit === null) return invalidParameter("limit must be an integer between 1 and 100");
  const slug = params.get("collection");
  const scope = scopeOf(`wallet:${address}`, params, ["collection"]);
  const offset = decodeCursor(params.get("cursor"), scope);
  if (offset === null) return invalidCursor("this cursor was issued for a different collection");

  // Burned assets have no owner, so they never appear in a portfolio.
  const held = NFTS.filter(
    (nft) => nft.owner === address && nft.membershipStatus === "member" && !nft.burned,
  );

  const collections = COLLECTIONS.flatMap((collection) => {
    const count = held.filter((nft) => nft.collectionSlug === collection.slug).length;
    if (count === 0) return [];
    // Nullable by contract, and a rank belongs to ALG-638's holders view.
    return [{ collection: refOf(collection.slug), count, holderRank: null }];
  }).sort((a, b) => b.count - a.count);

  const grid = slug ? held.filter((nft) => nft.collectionSlug === slug) : held;

  // An unknown wallet is a 200 with totalCount 0 and empty arrays, never a 404 —
  // "no pigs indexed" is a legitimate answer and the Explorer needs the state.
  return ok({
    address,
    totalCount: held.length,
    collections,
    // Always empty in v1: badge membership is a registry concept, derived
    // client-side from the collections list.
    badges: [],
    nfts: (() => {
      const { data, nextCursor, hasMore } = page(grid, limit, offset, scope);
      return { data: data.map(toSummary), nextCursor, hasMore };
    })(),
  } satisfies Schemas["WalletPortfolio"]);
}
