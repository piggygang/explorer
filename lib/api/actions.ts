"use server";

import { ApiError, browseCollectionNfts } from "@/lib/api/client";
import type { NftSummary } from "@/lib/api/client";
import { BROWSE_LIMIT, isBrowseSort } from "@/lib/api/params";
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
const MAX_TRAIT_TYPES = 16;
const MAX_TRAIT_VALUES = 64;

export async function loadMoreCollectionNfts(input: {
  slug: string;
  sort?: string;
  q?: string;
  trait?: TraitSelection;
  cursor: string;
}): Promise<MorePage> {
  if (!SLUG.test(input.slug) || input.slug.length > 64) return { ok: false, reason: "failed" };

  const sort = input.sort !== undefined && isBrowseSort(input.sort) ? input.sort : undefined;
  // The contract's own caps. Sending more would be a 4xx from the real API, so
  // it is not worth a round trip.
  const trait = input.trait ?? {};
  const types = Object.keys(trait);
  const values = Object.values(trait).reduce((total, list) => total + list.length, 0);
  if (types.length > MAX_TRAIT_TYPES || values > MAX_TRAIT_VALUES) {
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
