import type { components } from "@/lib/api/schema";
import { COLLECTIONS } from "@/lib/api/fixtures/collections";
import { NFTS } from "@/lib/api/fixtures/nfts";
import { ACTIVITY, OWNERSHIP } from "@/lib/api/fixtures/activity";

type Schemas = components["schemas"];
type Nft = (typeof NFTS)[number];

/** Constant on every response — the contract's surface, not a real limiter. */
const RATE_HEADERS = {
  "RateLimit-Limit": "120",
  "RateLimit-Remaining": "119",
  "RateLimit-Reset": "60",
};

function ok(body: unknown): Response {
  return Response.json(body, { headers: RATE_HEADERS });
}

function error(status: number, code: string, message: string): Response {
  const body = { error: { code, message } } satisfies Schemas["ErrorResponse"];
  return Response.json(body, { status, headers: RATE_HEADERS });
}

export const notFound = (message: string) => error(404, "not_found", message);
const badRequest = (message: string) => error(400, "bad_request", message);

// ------------------------------------------------------------- query parsing

/**
 * `trait[Background]=Pink&trait[Background]=Blue` → { Background: [Pink, Blue] }.
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

const encodeCursor = (offset: number) =>
  Buffer.from(String(offset)).toString("base64url");

function decodeCursor(cursor: string | null): number | null {
  if (cursor === null) return 0;
  // Strict: Buffer.from silently drops characters outside the base64url
  // alphabet, so require the decoded text to be a plain integer AND to
  // round-trip to the exact cursor — anything else is unparseable (400).
  const text = Buffer.from(cursor, "base64url").toString();
  if (!/^\d+$/.test(text) || Buffer.from(text).toString("base64url") !== cursor) {
    return null;
  }
  return Number(text);
}

function pageParams(params: URLSearchParams): { limit: number; offset: number } | null {
  const limit = params.has("limit") ? Number(params.get("limit")) : 24;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  const offset = decodeCursor(params.get("cursor"));
  if (offset === null) return null;
  return { limit, offset };
}

function paginate<T>(items: T[], limit: number, offset: number) {
  return {
    data: items.slice(offset, offset + limit),
    pageInfo: {
      limit,
      nextCursor: offset + limit < items.length ? encodeCursor(offset + limit) : null,
      total: items.length,
    } satisfies Schemas["PageInfo"],
  };
}

// ---------------------------------------------------------------- filtering

/** AND across trait types, OR within one type's values. */
function matchesTraits(nft: Nft, filters: Record<string, string[]>): boolean {
  return Object.entries(filters).every(([traitType, values]) =>
    nft.attributes.some(
      (attribute) => attribute.traitType === traitType && values.includes(attribute.value),
    ),
  );
}

/** Text search over name, #number and mint/asset id. */
function matchesQuery(nft: Nft, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    nft.name.toLowerCase().includes(needle) ||
    String(nft.number) === needle.replace(/^#/, "") ||
    nft.id.toLowerCase().includes(needle)
  );
}

function filteredNfts(
  slug: string,
  params: URLSearchParams,
  filters: Record<string, string[]>,
): Nft[] {
  let items = NFTS.filter((nft) => nft.collectionSlug === slug);
  if (Object.keys(filters).length > 0) {
    items = items.filter((nft) => matchesTraits(nft, filters));
  }
  const q = params.get("q");
  if (q) items = items.filter((nft) => matchesQuery(nft, q));
  const owner = params.get("owner");
  if (owner) items = items.filter((nft) => nft.owner === owner);
  return items;
}

const SORTS: Record<string, (a: Nft, b: Nft) => number> = {
  number: (a, b) => (a.number ?? Infinity) - (b.number ?? Infinity),
  "-number": (a, b) => (b.number ?? -Infinity) - (a.number ?? -Infinity),
  name: (a, b) => a.name.localeCompare(b.name),
  "-name": (a, b) => b.name.localeCompare(a.name),
  // Fixture order stands in for recent activity.
  "-activity": () => 0,
};

function toSummary(nft: Nft): Schemas["NftSummary"] {
  const { id, collectionSlug, name, number, imageUrl, burned } = nft;
  return { id, collectionSlug, name, number, imageUrl, burned };
}

function collectionOf(slug: string): Schemas["CollectionWithStats"] | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

/** Collection without the stats object, as embedded in NftDetail. */
function bareCollection(collection: Schemas["CollectionWithStats"]): Schemas["Collection"] {
  const { slug, name, standard, address, imageUrl } = collection;
  return { slug, name, standard, address, imageUrl };
}

// ----------------------------------------------------------------- handlers

export function listCollections(): Response {
  return ok({ data: COLLECTIONS } satisfies Schemas["CollectionListResponse"]);
}

export function getCollection(slug: string): Response {
  const collection = collectionOf(slug);
  if (!collection) return notFound(`no collection "${slug}"`);
  return ok({ data: collection } satisfies Schemas["CollectionResponse"]);
}

export function listCollectionNfts(slug: string, params: URLSearchParams): Response {
  if (!collectionOf(slug)) return notFound(`no collection "${slug}"`);
  const sort = params.get("sort") ?? "number";
  const compare = SORTS[sort];
  if (!compare) return badRequest(`unknown sort "${sort}"`);
  const page = pageParams(params);
  if (!page) return badRequest("invalid cursor or limit");
  const filters = traitFilters(params);
  if (!filters) return badRequest("malformed trait filter");

  const items = filteredNfts(slug, params, filters).slice().sort(compare);
  const { data, pageInfo } = paginate(items, page.limit, page.offset);
  return ok({
    data: data.map(toSummary),
    pageInfo,
  } satisfies Schemas["NftListResponse"]);
}

export function getCollectionFacets(slug: string, params: URLSearchParams): Response {
  const collection = collectionOf(slug);
  if (!collection) return notFound(`no collection "${slug}"`);
  const filters = traitFilters(params);
  if (!filters) return badRequest("malformed trait filter");

  // Disjunctive counts: for each trait type, apply every filter EXCEPT its
  // own, so the values a user could still add stay visible with real counts.
  const traitTypes = new Set<string>();
  for (const nft of NFTS) {
    if (nft.collectionSlug !== slug) continue;
    for (const attribute of nft.attributes) traitTypes.add(attribute.traitType);
  }

  // q (and anything else non-trait) applies to every count; trait filters
  // re-apply per facet below.
  const base = filteredNfts(slug, params, {});

  const facets = [...traitTypes].map((traitType) => {
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
      values: [...counts]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count })),
    };
  });

  return ok({ data: facets } satisfies Schemas["FacetsResponse"]);
}

export function getNft(id: string): Response {
  const nft = NFTS.find((candidate) => candidate.id === id);
  const collection = nft && collectionOf(nft.collectionSlug);
  if (!nft || !collection) return notFound(`no NFT "${id}"`);
  return ok({
    data: { ...nft, collection: bareCollection(collection) },
  } satisfies Schemas["NftResponse"]);
}

export function listNftActivity(id: string, params: URLSearchParams): Response {
  const events = ACTIVITY[id as keyof typeof ACTIVITY];
  if (!events) return notFound(`no NFT "${id}"`);
  const page = pageParams(params);
  if (!page) return badRequest("invalid cursor or limit");
  const { data, pageInfo } = paginate(events, page.limit, page.offset);
  return ok({ data, pageInfo } satisfies Schemas["ActivityListResponse"]);
}

export function listNftOwners(id: string, params: URLSearchParams): Response {
  const records = OWNERSHIP[id as keyof typeof OWNERSHIP];
  if (!records) return notFound(`no NFT "${id}"`);
  const page = pageParams(params);
  if (!page) return badRequest("invalid cursor or limit");
  const { data, pageInfo } = paginate(records, page.limit, page.offset);
  return ok({ data, pageInfo } satisfies Schemas["OwnersListResponse"]);
}

export function listWalletNfts(address: string): Response {
  const groups = COLLECTIONS.flatMap((collection) => {
    const held = NFTS.filter(
      (nft) => nft.collectionSlug === collection.slug && nft.owner === address,
    );
    if (held.length === 0) return [];
    return [
      {
        collection: bareCollection(collection),
        totalCount: held.length,
        nfts: held.map(toSummary),
      },
    ];
  });
  // An address holding nothing is an empty portfolio, not a 404.
  return ok({ data: groups } satisfies Schemas["WalletNftsResponse"]);
}
