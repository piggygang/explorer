import { ActivityRow } from "@/components/activity-row";
import { EmptyNote } from "@/components/empty-state";
import { ErrorNote } from "@/components/error-note";
import { ActivityMore } from "@/components/nft/feed-more";
import type { ActivitySummary, ActivityEvent } from "@/lib/api/client";
import { formatSol, number, relativeTime } from "@/lib/format";

/**
 * The event history, newest first.
 *
 * The summary strip reads NftDetail.activitySummary, which is lifetime and
 * server-computed — it no longer has to caveat itself as "the events on this
 * page". There is still no floor and no volume anywhere in the contract, so
 * nothing here implies either.
 *
 * The strip sits ABOVE the branch, not inside the success arm. It arrives on the
 * detail response, so it is present even when the activity call fails and even
 * when the feed is empty — hiding the one number that did load behind the one
 * that did not is the wrong way round.
 *
 * Page one renders here and the "load older" island appends after it, so the
 * whole first page is server-rendered and readable with no JavaScript.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const SUMMARY = "mt-3 mb-4 flex flex-wrap gap-x-6 gap-y-2";
const LABEL = "text-xs text-ink-muted";
const VALUE = "font-mono text-sm";
const HINT = "text-[11px] text-ink-muted";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className={LABEL}>{label}</dt>
      <dd className={VALUE}>{value}</dd>
      {hint !== undefined && <dd className={HINT}>{hint}</dd>}
    </div>
  );
}

/**
 * Where the last sale happened and when, which the strip fetched and never
 * showed. Both are null exactly when there has been no sale, so the caller only
 * reaches this with a price in hand.
 */
function lastSaleHint(summary: ActivitySummary): string | undefined {
  const when = summary.lastSaleAt === null ? null : relativeTime(summary.lastSaleAt);
  if (summary.lastSaleMarketplace !== null && when !== null) {
    return `${summary.lastSaleMarketplace} · ${when}`;
  }
  return summary.lastSaleMarketplace ?? when ?? undefined;
}

export function ActivityTimeline({
  address,
  summary,
  events,
  hasMore,
  nextCursor,
  walked,
  error,
}: {
  address: string;
  summary: ActivitySummary;
  events: ActivityEvent[];
  hasMore: boolean;
  nextCursor: string | null;
  /**
   * Whether the activity backfill has walked this asset at all. MintInfo is the
   * contract's own discriminator — "every field is null until the activity
   * backfill has run for this asset" — and it is the difference between a piggy
   * that has done nothing and a piggy nobody has read yet. Every Metaplex Core
   * asset is currently the second: the crawl cannot classify Borsh instructions,
   * so all 747 of them have a real on-chain history and an empty feed.
   */
  walked: boolean;
  error?: unknown;
}) {
  return (
    <section id="activity" aria-label="Activity" className={`${PANEL} scroll-mt-32`}>
      <h2 className={EYEBROW}>Activity</h2>

      <dl className={SUMMARY}>
        <Stat label="Sales" value={number(summary.salesCount)} />
        <Stat label="Transfers" value={number(summary.transferCount)} />
        <Stat
          label="Last sale"
          value={
            summary.lastSalePriceLamports === null ? "—" : formatSol(summary.lastSalePriceLamports)
          }
          hint={summary.lastSalePriceLamports === null ? undefined : lastSaleHint(summary)}
        />
        <Stat label="Owners" value={number(summary.ownerCount)} />
      </dl>

      {error ? (
        <ErrorNote what="the timeline" error={error} />
      ) : events.length === 0 ? (
        <EmptyNote>
          {walked
            ? "Nothing has happened to this piggy since it was minted."
            : "The indexer hasn’t walked this piggy’s history yet, so there is nothing to show — not because nothing happened."}
        </EmptyNote>
      ) : (
        <ActivityMore
          address={address}
          initialKeys={events.map((event) => event.id)}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
        >
          {events.map((event) => (
            // One signature can carry two events for the same asset, which is
            // exactly what seq disambiguates.
            <ActivityRow key={`${event.signature}-${event.seq}`} event={event} />
          ))}
        </ActivityMore>
      )}
    </section>
  );
}
