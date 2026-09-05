import {
  browseCollectionNfts,
  getCollection,
  getCollectionActivity,
  getCollectionFacets,
  getNft,
  getNftActivity,
  getNftOwners,
  getWalletPortfolio,
  listCollections,
  notFound,
} from "./handlers";

/**
 * The mock server as a fetch function. In mock mode the generated client calls
 * this directly (in-process — nothing to reach over the network at build time,
 * nothing for Vercel's deployment protection to 401), and
 * app/api/mock/v1/[...path]/route.ts exposes the very same dispatcher over
 * HTTP, so the two can't diverge.
 *
 * The version prefix lives in the contract's path keys now (`/v1/collections`),
 * not in the server URL, so `v1` is matched here rather than stripped: a
 * request that omits it is as wrong against the mock as it would be against the
 * real API. Only the `/api/mock` mount point — this app's own HTTP shim — comes
 * off first, and `/api/mock` is not a usable API_BASE_URL.
 */
export async function dispatchMock(
  input: Request | string | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url);

  const mount = "/api/mock";
  const pathname =
    url.pathname === mount || url.pathname.startsWith(`${mount}/`)
      ? url.pathname.slice(mount.length)
      : url.pathname;

  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const params = url.searchParams;

  if (segments[0] !== "v1") return notFound(`no route for ${pathname || "/"}`);
  const [, resource, first, second] = segments;
  const rest = segments.length;

  if (resource === "collections") {
    if (rest === 2) return listCollections(params);
    if (rest === 3) return getCollection(first);
    if (rest === 4) {
      if (second === "nfts") return browseCollectionNfts(first, params);
      if (second === "facets") return getCollectionFacets(first, params);
      if (second === "activity") return getCollectionActivity(first, params);
    }
  }
  if (resource === "nfts") {
    if (rest === 3) return getNft(first);
    if (rest === 4) {
      if (second === "activity") return getNftActivity(first, params);
      if (second === "owners") return getNftOwners(first, params);
    }
  }
  if (resource === "wallets" && rest === 4 && second === "nfts") {
    return getWalletPortfolio(first, params);
  }

  // /v1/search is ALG-634's and /v1/collections/{slug}/holders is ALG-638's.
  // Nothing in this app calls either, and a mock that answered them would be
  // inventing the very rankings those issues exist to design. `pnpm mock:prism`
  // does serve both from the contract's examples — the one place the two mocks
  // deliberately differ.
  return notFound(`no route for ${pathname || "/"}`);
}
