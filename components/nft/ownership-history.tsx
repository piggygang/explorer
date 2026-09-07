import { EmptyNote } from "@/components/empty-state";
import { ErrorNote } from "@/components/error-note";
import { OwnersMore } from "@/components/nft/feed-more";
import { OwnerRow } from "@/components/owner-row";
import type { OwnershipInterval } from "@/lib/api/client";

/**
 * Who held it, and when — the derived view of the same history the timeline
 * shows as events. Intervals never overlap, so fromSlot identifies a row
 * uniquely, and the contract marks the open one with isCurrent rather than
 * leaving it to be inferred from a null.
 *
 * A section, not a tab. This route's whole premise is one indexable, shareable,
 * Ctrl+F-able page per pig — the reasoning is written out in section-nav.tsx —
 * and splitting the record across tabbed panels would trade that away for
 * vertical space the "load older" control already manages.
 *
 * "At most one interval is open; a burned or not-yet-backfilled asset has none."
 * So nothing here counts on finding a current row: a burned pig can show fifty
 * intervals and no Current badge, which is correct rather than missing.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";

export function OwnershipHistory({
  address,
  intervals,
  hasMore,
  nextCursor,
  error,
}: {
  address: string;
  intervals: OwnershipInterval[];
  hasMore: boolean;
  nextCursor: string | null;
  error?: unknown;
}) {
  return (
    <section id="owners" aria-label="Ownership history" className={`${PANEL} scroll-mt-32`}>
      <h2 className={EYEBROW}>Ownership history</h2>

      {error ? (
        <div className="mt-3">
          <ErrorNote what="the ownership history" error={error} />
        </div>
      ) : intervals.length === 0 ? (
        <div className="mt-3">
          <EmptyNote>No ownership records yet — the indexer has not walked this piggy back.</EmptyNote>
        </div>
      ) : (
        <OwnersMore
          address={address}
          initialKeys={intervals.map((held) => String(held.fromSlot))}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
        >
          {intervals.map((held) => (
            <OwnerRow key={held.fromSlot} held={held} />
          ))}
        </OwnersMore>
      )}
    </section>
  );
}
