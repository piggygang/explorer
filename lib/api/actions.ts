"use server";

import {
  ApiError,
  browseCollectionNfts,
  getNftActivity,
  getNftOwners,
  getWalletPortfolio,
} from "@/lib/api/client";
import type { ActivityEvent, NftSummary, OwnershipInterval } from "@/lib/api/client";
import {
  BROWSE_LIMIT,
  MAX_QUERY_LENGTH,
  TIMELINE_LIMIT,
  WALLET_LIMIT,
  isBrowseSort,
  traitsWithinCaps,
} from "@/lib/api/params";
import type { TraitSelection } from "@/lib/api/params";

/**
 * How the browse grid gets page two onwards.
 *
 * A Server Function rather than a Route Handler, for three reasons. Its body is
 * literally the same browseCollectionNfts call the server component makes for
 * page one, so the two can never drift apart or disagree about an envelope. It
 * keeps API_BASE_URL server-side and needs no CORS from an API that has none.
 * And it adds no public JSON surface mirroring the indexer's own contract,
 * which would be a second thing to keep in step with the spec.
 *
 * It is still a public POST endpoint — "the route is reachable to anyone who
 * can send the same POST", per the Next docs — so every argument is validated
 * here rather than trusted because a component happened to send it.
 */

export type MorePage =
  | { ok: true; data: NftSummary[]; nextCursor: string | null; hasMore: boolean }
  /**
   * `expired` is not a failure to apologise for: the contract calls
   * 400 invalid_cursor "a normal recoverable condition (restart from page one),
   * not an outage", and it is what a cursor gets after the list underneath it
   * changed. The grid stops and offers a refresh rather than erroring.
   */
  | { ok: false; reason: "expired" | "failed" };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function loadMoreCollectionNfts(input: {
  slug: string;
  sort?: string;
  q?: string;
  trait?: TraitSelection;
  cursor: string;
}): Promise<MorePage> {
  if (!SLUG.test(input.slug) || input.slug.length > 64) return { ok: false, reason: "failed" };

  const sort = input.sort !== undefined && isBrowseSort(input.sort) ? input.sort : undefined;
  // The contract's own caps, from the one place that states them. Sending more
  // would be a 4xx from the real API, so it is not worth a round trip.
  const trait = input.trait ?? {};
  if (!traitsWithinCaps(trait)) return { ok: false, reason: "failed" };
  if (input.q !== undefined && input.q.length > MAX_QUERY_LENGTH) {
    return { ok: false, reason: "failed" };
  }

  try {
    const page = await browseCollectionNfts(input.slug, {
      trait,
      q: input.q,
      sort,
      // Opaque: echoed verbatim, never parsed, never constructed here.
      cursor: input.cursor,
      limit: BROWSE_LIMIT,
    });
    return { ok: true, ...page };
  } catch (error) {
    if (error instanceof ApiError && error.code === "invalid_cursor") {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "failed" };
  }
}

/**
 * The same shape for the two per-NFT feeds, which page identically: newest
 * first, keyset on an append-only history. The contract calls these feeds
 * stable — "fetched pages stay stable; new events appear by re-requesting page
 * one" — so unlike browse there is no sort whose key can move underneath a
 * cursor, and `expired` here really only means a deploy rotated the cursor.
 *
 * `kind` is deliberately not a parameter. The endpoint accepts it and it IS
 * part of cursor scope, so offering a filter would mean resetting to page one
 * on every toggle; that is a feature, not a page-size argument, and it is not
 * ALG-636's.
 */
export type MoreActivity =
  | { ok: true; data: ActivityEvent[]; nextCursor: string | null; hasMore: boolean }
  | { ok: false; reason: "expired" | "failed" };

export type MoreOwners =
  | { ok: true; data: OwnershipInterval[]; nextCursor: string | null; hasMore: boolean }
  | { ok: false; reason: "expired" | "failed" };

/** The contract's Address pattern. Base58 excludes 0, O, I and l. */
const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function loadMoreNftActivity(input: {
  address: string;
  cursor: string;
}): Promise<MoreActivity> {
  if (!ADDRESS.test(input.address)) return { ok: false, reason: "failed" };

  try {
    const page = await getNftActivity(input.address, {
      // Opaque: echoed verbatim, never parsed, never constructed here.
      cursor: input.cursor,
      limit: TIMELINE_LIMIT,
    });
    return { ok: true, ...page };
  } catch (error) {
    if (error instanceof ApiError && error.code === "invalid_cursor") {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "failed" };
  }
}

export async function loadMoreNftOwners(input: {
  address: string;
  cursor: string;
}): Promise<MoreOwners> {
  if (!ADDRESS.test(input.address)) return { ok: false, reason: "failed" };

  try {
    const page = await getNftOwners(input.address, {
      cursor: input.cursor,
      limit: TIMELINE_LIMIT,
    });
    return { ok: true, ...page };
  } catch (error) {
    if (error instanceof ApiError && error.code === "invalid_cursor") {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "failed" };
  }
}

/**
 * The wallet grid's page two onwards.
 *
 * `collection` is deliberately not a parameter even though the endpoint takes
 * one: it sits inside the cursor's filter hash, so offering it would mean
 * resetting to page one on every toggle. The tally chips stay a tally.
 */
export type MoreWalletPage =
  | { ok: true; data: NftSummary[]; nextCursor: string | null; hasMore: boolean }
  | { ok: false; reason: "expired" | "failed" };

export async function loadMoreWalletNfts(input: {
  address: string;
  cursor: string;
}): Promise<MoreWalletPage> {
  if (!ADDRESS.test(input.address)) return { ok: false, reason: "failed" };

  try {
    const portfolio = await getWalletPortfolio(input.address, {
      // Opaque: echoed verbatim, never parsed, never constructed here.
      cursor: input.cursor,
      limit: WALLET_LIMIT,
    });
    // Only the grid pages. `collections` and `totalCount` describe the whole
    // portfolio and are identical on every page, so the island never needs them.
    return { ok: true, ...portfolio.nfts };
  } catch (error) {
    if (error instanceof ApiError && error.code === "invalid_cursor") {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "failed" };
  }
}
