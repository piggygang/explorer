import { ActivityBand, ActivityRow } from "@/components/activity-row";
import { EmptyNote } from "@/components/empty-state";
import { ErrorNote } from "@/components/error-note";
import type { ActivitySummary, ActivityEvent } from "@/lib/api/client";
import { formatSol, number } from "@/lib/format";

/**
 * The event history, newest first.
 *
 * The summary strip reads NftDetail.activitySummary, which is lifetime and
 * server-computed — it no longer has to caveat itself as "the events on this
 * page". There is still no floor and no volume anywhere in the contract, so
 * nothing here implies either.
 *
 * Paging the timeline is ALG-636's. The button that used to sit here linked to
 * `?ac=<cursor>`, which this page has never read, so it is gone rather than
 * carried forward as a control that does nothing.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const SUMMARY = "mt-3 mb-4 flex flex-wrap gap-x-6 gap-y-2";
const LABEL = "text-xs text-ink-muted";
const VALUE = "font-mono text-sm";
const NOTE = "mt-3 text-center text-[11px] text-ink-muted";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={LABEL}>{label}</dt>
      <dd className={VALUE}>{value}</dd>
    </div>
  );
}

export function ActivityTimeline({
  summary,
  events,
  hasMore,
  error,
}: {
  summary: ActivitySummary;
  events: ActivityEvent[];
  hasMore: boolean;
  error?: unknown;
}) {

  return (
    <section id="activity" aria-label="Activity" className={`${PANEL} scroll-mt-32`}>
      <h2 className={EYEBROW}>Activity</h2>

      {error ? (
        <div className="mt-3">
          <ErrorNote what="the timeline" error={error} />
        </div>
      ) : events.length === 0 ? (
        <div className="mt-3">
          <EmptyNote>Nothing has happened to this piggy since the indexer picked it up.</EmptyNote>
        </div>
      ) : (
        <>
          <dl className={SUMMARY}>
            <Stat label="Sales" value={number(summary.salesCount)} />
            <Stat label="Transfers" value={number(summary.transferCount)} />
            <Stat
              label="Last sale"
              value={
                summary.lastSalePriceLamports === null
                  ? "—"
                  : formatSol(summary.lastSalePriceLamports)
              }
            />
            <Stat label="Owners" value={number(summary.ownerCount)} />
          </dl>

          <ActivityBand>
            {events.map((event) => (
              // One signature can carry two events for the same asset, which is
              // exactly what seq disambiguates.
              <ActivityRow key={`${event.signature}-${event.seq}`} event={event} />
            ))}
          </ActivityBand>

          <p className={NOTE}>
            {hasMore
              ? "Showing the most recent events."
              : "That\u2019s the whole history."}
          </p>
        </>
      )}
    </section>
  );
}
