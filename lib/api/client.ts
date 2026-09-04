import createClient from "openapi-fetch";
import type { components, paths } from "@/lib/api/schema";
import { dispatchMock } from "@/lib/api/mock/dispatch";

type Schemas = components["schemas"];

export type CollectionWithStats = Schemas["CollectionWithStats"];
export type Collection = Schemas["Collection"];
export type NftSummary = Schemas["NftSummary"];
export type NftDetail = Schemas["NftDetail"];
export type NftAttribute = Schemas["NftAttribute"];
export type ActivityEvent = Schemas["ActivityEvent"];
export type OwnershipRecord = Schemas["OwnershipRecord"];
export type TraitFacet = Schemas["TraitFacet"];
export type PageInfo = Schemas["PageInfo"];
export type WalletCollectionGroup = Schemas["WalletCollectionGroup"];

/** The contract's sort enum. `-activity` deliberately has no ascending form. */
export type Sort = NonNullable<
  NonNullable<paths["/collections/{slug}/nfts"]["get"]["parameters"]["query"]>["sort"]
>;

/** Selected trait values, keyed by trait type. AND across types, OR within one. */
export type TraitSelection = Record<string, string[]>;

/**
 * Carries the status and the contract's error code so a caller can tell a 429
 * from a 500 without parsing a message. Regions that stream under their own
 * Suspense boundary catch this and render an ErrorNote; a blocking fetch lets
 * it reach the route error boundary.
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

function fail(status: number, body: unknown, what: string): never {
  const error = (body as { error?: { code?: string; message?: string } } | undefined)?.error;
  throw new ApiError(status, error?.code ?? "internal", error?.message ?? `${what} failed (${status})`);
}

/**
 * The trait filter is a map of trait type to selected values, serialized as
 * one `trait[<Type>]=<Value>` pair per selection (normative in the spec).
 * openapi-fetch's default deepObject serializer would emit indexed brackets
 * for the arrays, so serialization is defined once here — for both modes, so
 * mock and real requests are byte-identical.
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
    } else {
      search.set(key, String(value));
    }
  }
  return search.toString();
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
    ? createClient<paths>({ baseUrl: base, querySerializer })
    : createClient<paths>({
        baseUrl: "http://mock.internal/v1",
        fetch: dispatchMock,
        querySerializer,
      });
}

export async function listCollections(): Promise<CollectionWithStats[]> {
  const { data, response } = await api().GET("/collections");
  if (!data) throw new Error(`listCollections failed (${response.status})`);
  return data.data;
}

export async function getCollection(slug: string): Promise<CollectionWithStats | null> {
  const { data, response } = await api().GET("/collections/{slug}", {
    params: { path: { slug } },
  });
  if (response.status === 404) return null;
  if (!data) throw new Error(`getCollection(${slug}) failed (${response.status})`);
  return data.data;
}

export async function listCollectionNfts(
  slug: string,
  options: {
    trait?: TraitSelection;
    q?: string;
    sort?: Sort;
    owner?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<{ nfts: NftSummary[]; pageInfo: PageInfo }> {
  const { data, error, response } = await api().GET("/collections/{slug}/nfts", {
    params: {
      path: { slug },
      // The cursor is opaque: passed back verbatim, never parsed.
      query: { ...options, limit: options.limit ?? 24 },
    },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `listCollectionNfts(${slug})`);
  return { nfts: data.data, pageInfo: data.pageInfo };
}

/**
 * The facets path declares only slug, trait and q — no sort, cursor, limit or
 * owner. Keeping those out of the signature is the point: a wallet-scoped grid
 * cannot have wallet-scoped counts, and the UI has to say so rather than
 * silently ask for something the contract does not offer.
 */
export async function getCollectionFacets(
  slug: string,
  options: { trait?: TraitSelection; q?: string } = {},
): Promise<TraitFacet[]> {
  const { data, error, response } = await api().GET("/collections/{slug}/facets", {
    params: { path: { slug }, query: options },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `getCollectionFacets(${slug})`);
  return data.data;
}

export async function getNft(id: string): Promise<NftDetail | null> {
  const { data, error, response } = await api().GET("/nfts/{id}", {
    params: { path: { id } },
    ...CACHE,
  });
  if (response.status === 404) return null;
  if (!data) fail(response.status, error, `getNft(${id})`);
  return data.data;
}

export async function listNftActivity(
  id: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<{ events: ActivityEvent[]; pageInfo: PageInfo }> {
  const { data, error, response } = await api().GET("/nfts/{id}/activity", {
    params: { path: { id }, query: { ...options, limit: options.limit ?? 24 } },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `listNftActivity(${id})`);
  return { events: data.data, pageInfo: data.pageInfo };
}

export async function listNftOwners(
  id: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<{ records: OwnershipRecord[]; pageInfo: PageInfo }> {
  const { data, error, response } = await api().GET("/nfts/{id}/owners", {
    params: { path: { id }, query: { ...options, limit: options.limit ?? 24 } },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `listNftOwners(${id})`);
  return { records: data.data, pageInfo: data.pageInfo };
}

/**
 * No 404 branch, unlike getCollection: an address the indexer has never seen is
 * a 200 with an empty portfolio, not a missing page.
 */
export async function listWalletNfts(address: string): Promise<WalletCollectionGroup[]> {
  const { data, error, response } = await api().GET("/wallets/{address}/nfts", {
    params: { path: { address } },
    ...CACHE,
  });
  if (!data) fail(response.status, error, `listWalletNfts(${address})`);
  return data.data;
}
