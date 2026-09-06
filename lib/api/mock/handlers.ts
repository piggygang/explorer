import type { components } from "@/lib/api/schema";
import { COLLECTIONS } from "@/lib/api/fixtures/collections";
import { NFTS } from "@/lib/api/fixtures/nfts";
import { ACTIVITY, OWNERSHIP } from "@/lib/api/fixtures/activity";
import { decodeCursor, encodeCursor, scopeOf } from "@/lib/api/mock/cursor";
import {
  MAX_QUERY_LENGTH,
  MAX_SEARCH_LIMIT,
  MAX_TRAIT_TYPES,
  MAX_TRAIT_VALUE_LENGTH,
  MAX_TRAIT_VALUES,
  SEARCH_LIMIT,
} from "@/lib/api/params";

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
 * The contract's caps on a trait filter: "At most 16 distinct trait types and 64
 * values per request", `maxItems: 64` per type, and a value of 1 to 128
 * characters. Over them is `400 invalid_parameter` on BOTH paths — /facets
 * declares no 422 at all, and TraitFilter carries no escalation instruction the
 * way Limit does. (A second line for the indexer team beside the one below: is
 * an over-cap trait filter 400 or 422 on /nfts, which does declare a 422?)
 */
function capsExceeded(filters: Record<string, string[]>, params: URLSearchParams): string | null {
  if (Object.keys(filters).length > MAX_TRAIT_TYPES) {
    return `at most ${MAX_TRAIT_TYPES} trait types per request`;
  }
  const values = Object.values(filters).reduce((total, list) => total + list.length, 0);
  if (values > MAX_TRAIT_VALUES) return `at most ${MAX_TRAIT_VALUES} trait values per request`;
  for (const list of Object.values(filters)) {
    for (const value of list) {
      if (value.length < 1 || value.length > MAX_TRAIT_VALUE_LENGTH) {
        return `a trait value is 1 to ${MAX_TRAIT_VALUE_LENGTH} characters`;
      }
    }
  }
  const q = params.get("q");
  if (q !== null && q.length > MAX_QUERY_LENGTH) return `q is at most ${MAX_QUERY_LENGTH} characters`;
  return null;
}

/**
 * Every trait type this collection's metadata carries, facetable or not — the
 * dictionary a filter key is matched against. A key outside it is what the
 * contract calls an unknown trait TYPE, whose answer is an empty result set and
 * `facets: []` rather than any kind of 4xx.
 */
function traitDictionary(slug: string): Set<string> {
  const types = new Set<string>();
  for (const nft of population(slug)) {
    for (const attribute of nft.attributes) types.add(attribute.traitType);
  }
  return types;
}

const hasUnknownTraitType = (slug: string, filters: Record<string, string[]>) => {
  const dictionary = traitDictionary(slug);
  return Object.keys(filters).some((traitType) => !dictionary.has(traitType));
};

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

/**
 * /v1/search's limit, which is NOT limitOf's. The endpoint inlines its own
 * schema — 1..25, default 10, counted per collection group — where every other
 * path $refs components/parameters/Limit at 1..100 default 24. Reusing limitOf
 * here would accept `?limit=60` (a contract 400) and default to 24 (a contract
 * 10), and `satisfies` cannot catch either: both are perfectly valid integers.
 */
function searchLimitOf(params: URLSearchParams): number | null {
  if (!params.has("limit")) return SEARCH_LIMIT;
  const limit = Number(params.get("limit"));
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_SEARCH_LIMIT ? limit : null;
}

/**
 * components/schemas/Address's own pattern, used here as a SHAPE test rather
 * than a lookup test: the contract's `nothing` example answers an address-shaped
 * input with `interpretedAs: address` and everything null, so search's address
 * branch is TERMINAL — an unresolved address never falls through to a text
 * search.
 *
 * KNOWN FIXTURE DEFECT, deferred on purpose. Three piggy-gang sentinel ids embed
 * the digit 0, which base58 excludes: CoreAsset10x…, CoreAsset20x… and
 * CoreAsset30x… (the burned demo row). They fail this test, so pasting one
 * answers "nothing indexed" for an asset /v1/nfts/{id} does serve. They are
 * already invalid against components/parameters/NftId, so the fix belongs in
 * scripts/gen-fixtures.mjs — whose rerun re-stamps every timestamp in all three
 * fixture files and would swamp a search diff. Use CoreAsset29x… (the `removed`
 * row, valid base58) to exercise the burned/removed mint path instead.
 */
const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** components/parameters/CollectionSlug's pattern, for search's own `collection`. */
const SEARCH_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * "exact token number, when the input looks like `#N` or `N`" — components/parameters/Q's
 * own definition, which the search endpoint's `#N` shorthand narrows but does not
 * contradict. null = this input is not a number.
 *
 * Number.isSafeInteger and an explicit digit test, deliberately NOT the bare
 * Number() that matchesQuery uses: Number() reads `1e3`, `0x10` and `+5` as
 * numbers, and none of those looks like `#N` or `N`. matchesQuery is left
 * BYTE-IDENTICAL rather than sharing this — tightening it would change the
 * behaviour of a browse page that shipped in ALG-633, which is not a change to
 * make inside a search issue. The divergence is real and deliberate: `?q=1e3`
 * matches #1000 on /nfts and is a name substring here.
 */
function tokenNumber(raw: string): number | null {
  const digits = /^#?(\d+)$/.exec(raw);
  if (!digits) return null;
  const value = Number(digits[1]);
  return Number.isSafeInteger(value) ? value : null;
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

/**
 * What a wallet holds. Extracted from getWalletPortfolio so search's wallet
 * branch counts the SAME population the page it routes to renders — a
 * WalletHit.totalCount of 20 above a portfolio showing 18 is exactly the class
 * of divergence the mock exists to make impossible.
 *
 * Narrower than population(): burned assets have no owner, so they never appear
 * in a portfolio, while browse includes them and greys the cards out.
 */
function heldBy(address: string): Row[] {
  return NFTS.filter(
    (nft) => nft.owner === address && nft.membershipStatus === "member" && !nft.burned,
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
  const overCap = capsExceeded(filters, params);
  if (overCap) return invalidParameter(overCap);

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
  const overCap = capsExceeded(filters, params);
  if (overCap) return invalidParameter(overCap);

  // An unknown trait type is 200 with nothing, never a 4xx — the contract says
  // so three times, so a bookmarked filter URL survives a metadata refresh. It
  // has to be an early return: deriving the type list from the population would
  // otherwise answer with every trait type carrying an empty values array, which
  // is a shape the real API never produces and a UI could quietly rely on.
  if (hasUnknownTraitType(slug, filters)) {
    return ok({ total: 0, facets: [] } satisfies Schemas["FacetsResponse"]);
  }

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

  const held = heldBy(address);

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

/**
 * GET /v1/search — one box that understands what is pasted into it.
 *
 * THE BRANCHES ARE EXCLUSIVE, and in the contract's own order. Its description
 * reads "A base58 address resolves by lookup … Anything else is text: `#N`
 * matches the token number, OTHERWISE a case-insensitive substring of the name".
 * The `byNumber` example settles it: `"#1"` against a collection of thousands
 * comes back with `total: 1`, which only holds if the number branch does not
 * also substring-match `#1` into `#10`, `#100` and the rest.
 *
 * This is a different `q` from the one browse takes, and deliberately so — the
 * endpoint inlines its own `q` schema rather than $ref-ing components/parameters/Q,
 * whose three OR'd predicates (address PREFIX, exact number, name substring) is
 * a wider net. Against these fixtures `#1` is one hit per collection here and 32
 * rows on /nfts. lib/browse-params.ts's collectionSearchHref carries the note.
 *
 * NOT FUZZY, and the mock must never become fuzzy: the contract says outright
 * "`Pnk` does not find `Pink`". A mock that scored similarity would let the UI
 * build on a ranking the real API cannot produce, and SearchGroup is
 * `additionalProperties: false`, so a server could not even carry a score
 * without a contract change.
 *
 * ERRORS. /v1/search declares exactly 200, 304, 400, 429 and 500 — so 422 is
 * unavailable (only /v1/collections/{slug}/nfts declares one) and 404 is
 * unavailable and ruled out in prose. Every schema violation is therefore 400
 * invalid_parameter, justified from the DECLARED responses rather than by
 * symmetry with the other handlers.
 */
export function search(params: URLSearchParams): Response {
  const raw = params.get("q");
  if (raw === null) return invalidParameter("q is required");
  if (raw.length < 1) return invalidParameter("q must be at least 1 character");
  if (raw.length > MAX_QUERY_LENGTH) {
    return invalidParameter(`q is at most ${MAX_QUERY_LENGTH} characters`);
  }

  const limit = searchLimitOf(params);
  if (limit === null) {
    return invalidParameter(`limit must be an integer between 1 and ${MAX_SEARCH_LIMIT}`);
  }

  const scope = params.get("collection");
  if (scope !== null && (scope.length > 64 || !SEARCH_SLUG.test(scope))) {
    return invalidParameter("collection must be a lowercase hyphenated slug");
  }

  const q = raw.trim();

  /** The envelope, with the four fields a caller most often leaves at their
      empty value. All five are required by the schema and always present. */
  const answer = (
    interpretedAs: Schemas["SearchResponse"]["interpretedAs"],
    rest: Partial<Omit<Schemas["SearchResponse"], "query" | "interpretedAs">> = {},
  ): Response =>
    ok({
      query: raw,
      interpretedAs,
      route: null,
      wallet: null,
      groups: [],
      ...rest,
    } satisfies Schemas["SearchResponse"]);

  // `?q=%20%20` satisfies minLength 1, so it is the reader's input rather than a
  // parse failure and must not 400 — but `name.includes("")` is true for every
  // row, so without this guard a couple of spaces return the entire index.
  // Q's own "an empty result is treated as absent" is about a FILTER that
  // narrows an existing list; here there is no list to leave alone.
  if (q === "") return answer("text");

  // ------------------------------------------------------------------ address
  //
  // Terminal by contract: "anything else resolves to nothing — 200 with an empty
  // result, never 404". An address-shaped string that resolves to neither a mint
  // nor a holder does NOT fall through to a name search.
  if (ADDRESS.test(q)) {
    // Unfiltered, exactly like getNft above: a burned or removed asset still has
    // a detail page, and a mint that reaches that page must reach it from here.
    const mint = NFTS.find((nft) => nft.address === q);
    if (mint) return answer("address", { route: { kind: "nft", id: mint.address } });

    // heldBy, not a bare owner scan, so this count and the portfolio page can
    // never disagree. WalletHit.totalCount has `minimum: 1`, so a wallet holding
    // nothing is `wallet: null` rather than a hit reading zero.
    const held = heldBy(q);
    if (held.length > 0) {
      return answer("address", {
        route: { kind: "wallet", id: q },
        wallet: { address: q, totalCount: held.length },
      });
    }

    return answer("address");
  }

  // ------------------------------------------------------- number, then text
  const asNumber = tokenNumber(q);
  const needle = q.toLowerCase();

  /**
   * The one place a collection slug becomes a route.
   *
   * `route.kind: "collection"` is in the schema enum and in the precedence
   * sentence — "an exact mint beats a wallet with holdings, which beats an exact
   * collection slug" — so an exact slug producing one is the reading the contract
   * states. But no example produces it and the description's text branch never
   * mentions collections, so a real indexer may well never emit it. MOCK-ONLY
   * UNTIL THE INDEXER CONFIRMS: the UI must not depend on it, and it does not —
   * both surfaces derive collection matches from the site's own nav list
   * (lib/search-rows.ts), so `piggy-gang` is reachable either way. That matters
   * here more than it looks: its members are named a bare `#N`, so no text query
   * ever finds that collection through `groups`.
   *
   * Byte-equal after case folding, and no slugification of spaces: "piggy gang"
   * is a text search, not a slug.
   */
  const slugRoute = COLLECTIONS.some((collection) => collection.slug === needle)
    ? ({ kind: "collection", id: needle } satisfies Schemas["SearchRoute"])
    : null;

  const matches = (nft: Row): boolean =>
    asNumber === null ? nft.name.toLowerCase().includes(needle) : nft.number === asNumber;

  /**
   * Within one group. The contract specifies NO order here, no relevance score
   * and no way to carry one, so this pins the browse default — token number
   * ascending, unnumbered last — with a byte-order name tiebreak. A real indexer
   * will very likely return relevance instead, which is why nothing in the UI may
   * assume the first row is the best match. What this DOES promise is stability:
   * identical requests come back in identical order, which is the one property
   * worth asking the indexer to guarantee.
   */
  const preview = (rows: Row[]) =>
    [...rows]
      .sort((a, b) => SORTS.number(a, b) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .slice(0, limit)
      .map(toSummary);

  const groups = COLLECTIONS
    // `collection` restricts TEXT results only, per its description — it says
    // nothing about `route`, and an address never reaches this far anyway.
    .filter((collection) => scope === null || collection.slug === scope)
    .map((collection) => ({ collection, rows: population(collection.slug).filter(matches) }))
    // A group with no matches is omitted rather than emitted empty: SearchGroup.total
    // has `minimum: 1`.
    .filter((group) => group.rows.length > 0)
    .map((group) => ({
      collection: refOf(group.collection.slug),
      total: group.rows.length,
      nfts: preview(group.rows),
    }))
    // "grouped by collection, most hits first". The contract leaves the tie open;
    // registry order is the tiebreak, so `#2` — one hit in each of three
    // collections — comes back in the same order the header pills are in, and in
    // the same order on every request.
    .sort((a, b) => b.total - a.total);

  return answer(asNumber === null ? "text" : "number", { route: slugRoute, groups });
}
