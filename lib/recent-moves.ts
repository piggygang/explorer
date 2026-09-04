import { listCollectionNfts, listNftActivity } from "@/lib/api/client";
import type { ActivityEvent, NftSummary } from "@/lib/api/client";
import type { LiveCollection } from "@/lib/collections";

/**
 * What makes a real activity band servable on the frozen contract.
 *
 * There is no collection-level and no global activity feed — activity is
 * per-NFT only. So: ask each live collection for its most recently active
 * pigges, then ask each of those for its single newest event. Nothing is
 * fabricated and no contract addition is needed.
 *
 * The cost is an N+1: 1 + 3 + 12 requests per revalidation. That is fine
 * against a 120/min limit at a 300s TTL, and it is the honest argument for
 * adding GET /activity?collection=<slug> — when that lands, only this file's
 * body changes.
 *
 * Taking a fixed number per collection means no single collection can crowd the
 * band out. That is balance by construction, not a true global ranking, and it
 * is a deliberate choice for a landing page.
 */

const PER_COLLECTION = 4;
const SLOTS = 6;

export type Move = {
  nft: NftSummary;
  event: ActivityEvent;
  collection: LiveCollection;
};

export async function recentMoves(
  collections: LiveCollection[],
): Promise<{ moves: Move[]; failed: boolean }> {
  try {
    const candidates = (
      await Promise.all(
        collections.map(async (collection) => {
          const { nfts } = await listCollectionNfts(collection.slug, {
            sort: "-activity",
            limit: PER_COLLECTION,
          });
          return nfts.map((nft) => ({ nft, collection }));
        }),
      )
    ).flat();

    const moves = (
      await Promise.all(
        candidates.map(async ({ nft, collection }): Promise<Move | null> => {
          // A candidate with no event is dropped rather than rendered eventless.
          const { events } = await listNftActivity(nft.id, { limit: 1 }).catch(() => ({
            events: [] as ActivityEvent[],
          }));
          return events[0] ? { nft, event: events[0], collection } : null;
        }),
      )
    ).filter((move): move is Move => move !== null);

    moves.sort((a, b) => Date.parse(b.event.timestamp) - Date.parse(a.event.timestamp));
    return { moves: moves.slice(0, SLOTS), failed: false };
  } catch {
    // Never rethrow: a decorative band must not take the home page to the error
    // boundary.
    return { moves: [], failed: true };
  }
}
