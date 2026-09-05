import createClient from "openapi-fetch";
import type { components, paths } from "@/lib/api/schema";
import { dispatchMock } from "@/lib/api/mock/dispatch";
import { BROWSE_LIMIT } from "@/lib/api/params";
import type { Sort, TraitSelection } from "@/lib/api/params";

type Schemas = components["schemas"];

export type { Sort, TraitSelection };

export type Collection = Schemas["Collection"];
export type CollectionRef = Schemas["CollectionRef"];
export type CollectionStats = Schemas["CollectionStats"];
export type NftSummary = Schemas["NftSummary"];
export type NftDetail = Schemas["NftDetail"];
export type Attribute = Schemas["Attribute"];
export type ActivityEvent = Schemas["ActivityEvent"];
export type ActivitySummary = Schemas["ActivitySummary"];
export type ActivityKind = Schemas["ActivityKind"];
/** The four kinds v1 actually serves, and the only ones `?kind=` accepts. The
    response enum is wider (stake/unstake/other are reserved), which is why these
    are two different types rather than one. */
export type ActivityKindFilter = components["parameters"]["ActivityKindFilter"];
export type CollectionActivityEvent = Schemas["CollectionActivityEvent"];
export type OwnershipInterval = Schemas["OwnershipInterval"];
export type Facet = Schemas["Facet"];
export type FacetsResponse = Schemas["FacetsResponse"];
export type ImageStatus = Schemas["ImageStatus"];
export type WalletPortfolio = Schemas["WalletPortfolio"];

/**
 * Every paginated envelope in v1 has exactly this shape. There is no `total`
 * and no `pageInfo` any more: keyset pagination has no cheap count, so the
 * filtered one comes from FacetsResponse.total and the unfiltered one from
 * CollectionStats.indexed.
 *
 * `hasMore` is carried rather than derived. Only CollectionPage documents it as
 * `nextCursor !== null`; NftPage, ActivityPage, CollectionActivityPage and
 * OwnershipPage declare a bare boolean, so the server is the authority.
 */
export type Page<T> = { data: T[]; nextCursor: string | null; hasMore: boolean };

/**
 * Carries the status and the contract's error code so a caller can tell a 429
 * from a 500 without parsing a message. Codes are the contract's own enum:
 * invalid_parameter | invalid_cursor | unsupported_sort | not_found |
 * rate_limited | internal.
 *
 * Two of them are normal rather than exceptional. `invalid_cursor` is what a
 * cursor issued for a different sort or filter set gets, and the spec calls it
 * "a normal recoverable condition (restart from page one), not an outage";
 * `unsupported_sort` is what `sort=rarity` gets until ALG-627 ships.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Shared read caching. Pages that read searchParams are dynamic, so the
    route-level `revalidate` no longer applies to them — the TTL has to live on
    the fetch. The in-process mock ignores this (its fetch is dispatchMock), so
    it only bites once API_BASE_URL is set, which is exactly when it matters. */
const CACHE = { next: { revalidate: 300 } } as const;

/** The error body is flat now: { error: "<code>", message, details? }. */
function fail(status: number, body: unknown, what: string): never {
  const error = body as Schemas["Error"] | undefined;
  throw new ApiError(
    status,
    error?.error ?? "internal",
    error?.message ?? `${what} failed (${status})`,
  );
}

/**
 * Serialization is defined once here, for both modes, so a mock request and a
 * real one are byte-identical.
 *
 * Two parameters need it. `trait` is a deepObject the spec pins in prose as one
 * `trait[<Type>]=<Value>` pair per selection — openapi-fetch's default would
 * emit indexed brackets. `kind` on the activity endpoints is `style: form,
 * explode: true`, i.e. a repeated `?kind=sale&kind=transfer`; the generic
 * `set(key, String(value))` below would have flattened that array to "sale,transfer".
 */
function querySerializer(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (key === "trait" && typeof value === "object") {
      for (const [type, values] of Object.entries(value as Record<string, unknown>)) {
        for (const item of Array.isArray(values) ? values : [values]) {
          search.append(`trait[${type}]`, String(item));
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

/**
 * The version lives in the path keys now (`/v1/collections`), not in the server
 * URL, so API_BASE_URL is the bare origin. It used to be documented the other
 * way round, and a stale value is invisible in mock mode — mock mode never
 * reads the variable — so a leftover `/v1` would only surface on the first real
 * deploy, as `/v1/v1/collections` 404ing every page. Strip it loudly instead.
 */
function baseUrl(configured: string): string {
  const trimmed = configured.replace(/\/+$/, "");
  if (!/\/v1$/.test(trimmed)) return trimmed;
  console.warn(
    "API_BASE_URL ends in /v1. The v1 prefix is part of the request path now — using the origin instead.",
  );
  return trimmed.slice(0, -"/v1".length);
}

/**
 * Typed client over the indexer's v1 contract. `API_BASE_URL` (server-only,
 * read per call so tests and previews can differ) selects the real API;
 * unset, the same generated client runs against the in-process mock — it
 * still builds the full Request against a sentinel base URL, so switching to
 * the real thing changes nothing but the base.
 */
export function api() {
  const base = process.env.API_BASE_URL;
  return base
    ? createClient<paths>({ baseUrl: baseUrl(base), querySerializer })
    : createClient<paths>({
        baseUrl: "http://mock.internal",
        fetch: dispatchMock,
        querySerializer,
      });
}

/**
 * The registry is paginated for envelope consistency, not need — the contract
 * itself says "four rows today". One page at the maximum covers it; a server
 * that ever needs a second one should be loud rather than silently truncated.
 */
export async function listCollections(): Promise<Collection[]> {
  const { data, error, response } = await api().GET("/v1/collections", {
    params: { query: { limit: 100 } },
  });
  if (!data) fail(response.status, error, "listCollections");
  if (data.nextCursor !== null) {
    console.warn("listCollections: more than 100 collections; the registry outgrew one page.");
  }
  return data.data;
}

export async function getCollection(slug: string): Promise<Collection | null> {
  const { data, error, response } = await api().GET("/v1/collections/{slug}", {
    params: { path: { slug } },
  });
  if (response.status === 404) return null;
  // Single-resource GETs return the object itself; only listings are enveloped.
  if (!data) fail(response.status, error, `getCollection(${slug})`);
  return data;
}

export async function browseCollectionNfts(
  slug: string,
  options: {
    trait?: TraitSelection;
    q?: string;
    sort?: Sort;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<Page<NftSummary>> {
  const { data, error, response } = await api().GET("/v1/collections/{slug}/nfts", {
    params: {
      path: { slug },
      // The cursor is opaque: passed back verbatim, never parsed.
      query: { ...options, limit: options.limit ?? BROWSE_LIMIT },
    },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `browseCollectionNfts(${slug})`);
  return data;
}

/**
 * The facets path declares only slug, trait and q — no sort, cursor or limit.
 * Keeping those out of the signature is the point: the UI has to ask for what
 * the contract offers rather than silently for something it does not.
 *
 * `total` is the size of the result set under the active filters, which is the
 * number the browse toolbar shows now that pages carry no count of their own.
 */
export async function getCollectionFacets(
  slug: string,
  options: { trait?: TraitSelection; q?: string } = {},
): Promise<FacetsResponse> {
  const { data, error, response } = await api().GET("/v1/collections/{slug}/facets", {
    params: { path: { slug }, query: options },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `getCollectionFacets(${slug})`);
  return data;
}

/**
 * The collection-level feed the old contract did not have. Each event embeds
 * the full NftSummary it happened to, so a strip renders art without a second
 * request per row.
 */
export async function getCollectionActivity(
  slug: string,
  options: { kind?: ActivityKindFilter; cursor?: string; limit?: number } = {},
): Promise<Page<CollectionActivityEvent>> {
  const { data, error, response } = await api().GET("/v1/collections/{slug}/activity", {
    params: {
      path: { slug },
      query: { ...options, limit: options.limit ?? BROWSE_LIMIT },
    },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `getCollectionActivity(${slug})`);
  return data;
}

export async function getNft(id: string): Promise<NftDetail | null> {
  const { data, error, response } = await api().GET("/v1/nfts/{id}", {
    params: { path: { id } },
    ...CACHE,
  });
  if (response.status === 404) return null;
  if (!data) fail(response.status, error, `getNft(${id})`);
  return data;
}

export async function getNftActivity(
  id: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<Page<ActivityEvent>> {
  const { data, error, response } = await api().GET("/v1/nfts/{id}/activity", {
    params: { path: { id }, query: { ...options, limit: options.limit ?? BROWSE_LIMIT } },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `getNftActivity(${id})`);
  return data;
}

export async function getNftOwners(
  id: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<Page<OwnershipInterval>> {
  const { data, error, response } = await api().GET("/v1/nfts/{id}/owners", {
    params: { path: { id }, query: { ...options, limit: options.limit ?? BROWSE_LIMIT } },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `getNftOwners(${id})`);
  return data;
}

/**
 * No 404 branch, unlike getCollection: an address the indexer has never seen is
 * a 200 with totalCount 0 and empty arrays, not a missing page. The contract
 * says so explicitly, because the Explorer needs the empty state.
 */
export async function getWalletPortfolio(
  address: string,
  options: { collection?: string; cursor?: string; limit?: number } = {},
): Promise<WalletPortfolio> {
  const { data, error, response } = await api().GET("/v1/wallets/{address}/nfts", {
    params: { path: { address }, query: { ...options, limit: options.limit ?? BROWSE_LIMIT } },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `getWalletPortfolio(${address})`);
  return data;
}
