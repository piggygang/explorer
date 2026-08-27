import {
  getCollection,
  getCollectionFacets,
  getNft,
  listCollectionNfts,
  listCollections,
  listNftActivity,
  listNftOwners,
  listWalletNfts,
  notFound,
} from "./handlers";

/**
 * The mock server as a fetch function. In mock mode the generated client
 * calls this directly (in-process — nothing to reach over the network at
 * build time, nothing for Vercel's deployment protection to 401), and
 * app/api/mock/v1/[...path]/route.ts exposes the very same dispatcher over
 * HTTP, so the two can't diverge.
 */
export async function dispatchMock(
  input: Request | string | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url);

  let pathname = url.pathname;
  for (const prefix of ["/api/mock/v1", "/v1"]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      pathname = pathname.slice(prefix.length);
      break;
    }
  }

  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const params = url.searchParams;

  if (segments[0] === "collections") {
    if (segments.length === 1) return listCollections();
    if (segments.length === 2) return getCollection(segments[1]);
    if (segments.length === 3 && segments[2] === "nfts") {
      return listCollectionNfts(segments[1], params);
    }
    if (segments.length === 3 && segments[2] === "facets") {
      return getCollectionFacets(segments[1], params);
    }
  }
  if (segments[0] === "nfts" && segments.length >= 2) {
    if (segments.length === 2) return getNft(segments[1]);
    if (segments.length === 3 && segments[2] === "activity") {
      return listNftActivity(segments[1], params);
    }
    if (segments.length === 3 && segments[2] === "owners") {
      return listNftOwners(segments[1], params);
    }
  }
  if (segments[0] === "wallets" && segments.length === 3 && segments[2] === "nfts") {
    return listWalletNfts(segments[1]);
  }

  return notFound(`no route for ${pathname || "/"}`);
}
