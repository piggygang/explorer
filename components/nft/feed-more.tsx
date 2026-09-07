"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ActivityBand, ActivityRow } from "@/components/activity-row";
import { OwnerBand, OwnerRow } from "@/components/owner-row";
import { loadMoreNftActivity, loadMoreNftOwners } from "@/lib/api/actions";
import type { ActivityEvent, OwnershipInterval } from "@/lib/api/client";
import { number } from "@/lib/format";

/**
 * "Load older" for the two per-NFT feeds.
 *
 * Page one is server-rendered and arrives as `children`, so both panels are
 * complete and indexable with no JavaScript at all; this only appends what comes
 * after it. That is also why the cursor is not in the URL: it is opaque, valid
 * only for the endpoint and filter set that issued it, and the contract says it
 * is "not guaranteed stable across deploys".
 *
 * NO IntersectionObserver, unlike the browse grid. That grid ends the document,
 * so auto-loading only ever grows empty space below the reader; these panels have
 * Ownership history and the neighbour links underneath them, and pages arriving
 * on scroll would shove both down mid-read. The button is the whole control.
 *
 * De-duplication is defensive here rather than required. Browse must dedupe
 * because `sort=-activity` moves the sort key underneath a cursor; these feeds
 * are append-only and newest-first — the contract calls them stable, with new
 * events appearing only by re-requesting page one — so a duplicate would be a
 * server bug, not an expected cost. The set is cheap and says so.
 */

const PAGER = "mt-3 flex flex-col items-center gap-2";
const GHOST =
  "rounded-full border border-line px-3.5 py-2 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,var(--brand))] disabled:opacity-60";
const NOTE = "text-center text-[11px] text-ink-muted";

type Loaded<T> = { ok: true; data: T[]; nextCursor: string | null; hasMore: boolean };
type Failed = { ok: false; reason: "expired" | "failed" };

function useFeed<T>({
  initialKeys,
  initialCursor,
  initialHasMore,
  keyOf,
  fetchMore,
}: {
  initialKeys: string[];
  initialCursor: string | null;
  initialHasMore: boolean;
  keyOf: (item: T) => string;
  fetchMore: (cursor: string) => Promise<Loaded<T> | Failed>;
}) {
  const [appended, setAppended] = useState<T[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);
  const [failed, setFailed] = useState(false);

  // Not state: mutated during a load and never rendered from, so a re-render
  // must not be able to reset it mid-flight.
  const seen = useRef(new Set(initialKeys));
  const status = useRef<HTMLParagraphElement>(null);
  /** Set on a press, so the focus move below never fires for anything else. */
  const pressed = useRef(false);

  const load = useCallback(async () => {
    if (pending || !hasMore || cursor === null || expired || failed) return;
    setPending(true);
    pressed.current = true;

    const page = await fetchMore(cursor);
    if (!page.ok) {
      if (page.reason === "expired") setExpired(true);
      else setFailed(true);
      setPending(false);
      return;
    }

    const fresh = page.data.filter((item) => !seen.current.has(keyOf(item)));
    for (const item of fresh) seen.current.add(keyOf(item));
    setAppended((current) => [...current, ...fresh]);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
    setPending(false);
  }, [cursor, expired, failed, fetchMore, hasMore, keyOf, pending]);

  /**
   * The last page removes the button, and a button that disappears under the
   * reader's own keypress takes the focus ring to <body> with it. Focus moves to
   * the status line instead — the thing that just changed, and the thing the
   * aria-live region has already announced.
   */
  useEffect(() => {
    if (hasMore || !pressed.current) return;
    pressed.current = false;
    status.current?.focus();
  }, [hasMore]);

  return { appended, hasMore, pending, expired, failed, load, status };
}

function Pager({
  shown,
  noun,
  hasMore,
  pending,
  expired,
  failed,
  onLoad,
  statusRef,
}: {
  shown: number;
  noun: string;
  hasMore: boolean;
  pending: boolean;
  expired: boolean;
  failed: boolean;
  onLoad: () => void;
  statusRef: React.RefObject<HTMLParagraphElement | null>;
}) {
  const router = useRouter();

  if (expired) {
    return (
      <div className={PAGER}>
        <button type="button" onClick={() => router.refresh()} className={GHOST}>
          Refresh
        </button>
        <p className={NOTE}>
          This history moved on while the page was open, so there is nowhere to carry on from.
          Everything already loaded is still here.
        </p>
      </div>
    );
  }

  return (
    <div className={PAGER}>
      {/* needs-js hides it for a reader who has none: page one is already
          complete for them, and appending is the one thing here that cannot
          work without the island. */}
      {hasMore && (
        <button type="button" onClick={onLoad} disabled={pending} className={`${GHOST} needs-js`}>
          {pending ? "Loading…" : "Load older"}
        </button>
      )}
      {/* aria-live so a screen reader hears the list grow; it is the only
          announcement of something that is otherwise purely visual.
          There is no total to count towards — keyset pagination has no cheap
          one, and the contract puts no count on either envelope. */}
      <p ref={statusRef} tabIndex={-1} aria-live="polite" className={NOTE}>
        {failed
          ? `Couldn’t load older ${noun}. It’s usually temporary — try again.`
          : `Showing ${number(shown)} ${noun}`}
      </p>
    </div>
  );
}

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
