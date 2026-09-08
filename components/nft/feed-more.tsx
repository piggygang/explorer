"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";
import { ActivityBand, ActivityRow } from "@/components/activity-row";
import { Pager, useFeed } from "@/components/feed-pager";
import { OwnerBand, OwnerRow } from "@/components/owner-row";
import { loadMoreNftActivity, loadMoreNftOwners } from "@/lib/api/actions";
import type { ActivityEvent, OwnershipInterval } from "@/lib/api/client";

/**
 * "Load older" for the two per-NFT feeds. The machinery is shared — see
 * components/feed-pager.tsx; this file is only the two bindings.
 *
 * De-duplication is defensive here rather than required. Browse must dedupe
 * because `sort=-activity` moves the sort key underneath a cursor; these feeds
 * are append-only and newest-first — the contract calls them stable, with new
 * events appearing only by re-requesting page one — so a duplicate would be a
 * server bug, not an expected cost. The set is cheap and says so.
 */

export function ActivityMore({
  address,
  initialKeys,
  initialCursor,
  initialHasMore,
  children,
}: {
  address: string;
  initialKeys: string[];
  initialCursor: string | null;
  initialHasMore: boolean;
  children: ReactNode;
}) {
  const fetchMore = useCallback(
    (cursor: string) => loadMoreNftActivity({ address, cursor }),
    [address],
  );
  const keyOf = useCallback((event: ActivityEvent) => event.id, []);
  const feed = useFeed<ActivityEvent>({
    initialKeys,
    initialCursor,
    initialHasMore,
    keyOf,
    fetchMore,
  });

  return (
    <>
      <ActivityBand>
        {children}
        {feed.appended.map((event) => (
          // One signature can carry two events for the same asset, which is
          // exactly what seq disambiguates.
          <ActivityRow key={`${event.signature}-${event.seq}`} event={event} />
        ))}
      </ActivityBand>
      <Pager
        shown={initialKeys.length + feed.appended.length}
        noun="events"
        label="Load older"
        total={null}
        hasMore={feed.hasMore}
        pending={feed.pending}
        expired={feed.expired}
        failed={feed.failed}
        onLoad={() => void feed.load()}
        statusRef={feed.status}
      />
    </>
  );
}

export function OwnersMore({
  address,
  initialKeys,
  initialCursor,
  initialHasMore,
  children,
}: {
  address: string;
  initialKeys: string[];
  initialCursor: string | null;
  initialHasMore: boolean;
  children: ReactNode;
}) {
  const fetchMore = useCallback(
    (cursor: string) => loadMoreNftOwners({ address, cursor }),
    [address],
  );
  // Intervals never overlap, so fromSlot identifies a row uniquely for one asset.
  const keyOf = useCallback((held: OwnershipInterval) => String(held.fromSlot), []);
  const feed = useFeed<OwnershipInterval>({
    initialKeys,
    initialCursor,
    initialHasMore,
    keyOf,
    fetchMore,
  });

  return (
    <>
      <OwnerBand>
        {children}
        {feed.appended.map((held) => (
          <OwnerRow key={held.fromSlot} held={held} />
        ))}
      </OwnerBand>
      <Pager
        shown={initialKeys.length + feed.appended.length}
        noun="owners"
        label="Load older"
        total={null}
        hasMore={feed.hasMore}
        pending={feed.pending}
        expired={feed.expired}
        failed={feed.failed}
        onLoad={() => void feed.load()}
        statusRef={feed.status}
      />
    </>
  );
}
