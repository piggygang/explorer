import { getCollectionActivity } from "@/lib/api/client";
import type { CollectionActivityEvent } from "@/lib/api/client";

/**
 * The home band: the newest on-chain events across every live collection.
 *
 * There is still no global feed — activity is scoped to a collection — so this
 * is one request per collection and a merge, which is three requests rather
 * than the 1 + 3 + 12 the per-NFT contract used to force. Each event carries
 * the NftSummary it happened to, so the strip renders art without a second
 * request per row.
 *
 * Taking a fixed number per collection means no single collection can crowd the
 * band out. That is balance by construction rather than a true global ranking,
 * and it is a deliberate choice for a landing page.
 */

const PER_COLLECTION = 8;
const SLOTS = 6;

export async function recentActivity(
  slugs: string[],
): Promise<{ events: CollectionActivityEvent[]; failed: boolean }> {
  const feeds = await Promise.all(
    slugs.map((slug) =>
      getCollectionActivity(slug, { limit: PER_COLLECTION }).then(
        (page) => page.data,
        // One collection failing must not blank the band; all of them failing
        // is what the caller reports.
        () => null,
      ),
    ),
  );

  if (slugs.length > 0 && feeds.every((feed) => feed === null)) {
    return { events: [], failed: true };
  }

  const events = feeds.flatMap((feed) => feed ?? []);
  // By slot, not blockTime: (slot, id) descending is the server's own ordering
  // key, and two events in the same block share a timestamp but not a slot
  // position. Sort stability keeps the per-collection order for real ties.
  events.sort((a, b) => b.slot - a.slot);
  return { events: events.slice(0, SLOTS), failed: false };
}
