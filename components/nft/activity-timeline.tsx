import Link from "next/link";
import { ActivityBand, ActivityRow } from "@/components/activity-row";
import { EmptyNote } from "@/components/empty-state";
import { ErrorNote } from "@/components/error-note";
import type { ActivityEvent, PageInfo } from "@/lib/api/client";
import { formatSol, number } from "@/lib/format";

/**
 * The event history, newest first.
 *
 * The summary strip is derived from the events on this page and says so: there
 * is no last-sale field, no floor and no volume anywhere in the contract, so
 * "total sales" counts sale events and "last sale" is the newest one seen.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const SUMMARY = "mt-3 mb-4 flex flex-wrap gap-x-6 gap-y-2";
const LABEL = "text-xs text-ink-muted";
const VALUE = "font-mono text-sm";
const MORE =
  "mt-3 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const END = "mt-3 text-center text-[11px] text-ink-muted";
const NOTE = "mt-3 text-[11px] text-ink-muted";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={LABEL}>{label}</dt>
      <dd className={VALUE}>{value}</dd>
    </div>
  );
}

export function ActivityTimeline({
  id,
  events,
  pageInfo,
  owners,
  error,
}: {
  id: string;
  events: ActivityEvent[];
  pageInfo: PageInfo | null;
  owners: number | null;
  error?: unknown;
}) {
  const sales = events.filter((event) => event.type === "sale");
  const lastSale = sales.find((event) => event.priceLamports !== null);

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
            <Stat label="Sales" value={number(sales.length)} />
            <Stat
              label="Last sale"
              value={lastSale ? formatSol(lastSale.priceLamports!) : "—"}
            />
            <Stat label="Owners" value={owners === null ? "—" : number(owners)} />
          </dl>

          <ActivityBand>
            {events.map((event) => (
              <ActivityRow key={event.signature} event={event} />
            ))}
          </ActivityBand>

          {pageInfo?.nextCursor ? (
            <Link href={`/nfts/${id}?ac=${encodeURIComponent(pageInfo.nextCursor)}`} className={MORE}>
              Load older events
            </Link>
          ) : (
            <p className={END}>That’s the whole history.</p>
          )}

          <p className={NOTE}>
            Counts cover the events loaded here — the contract carries no lifetime sale total.
          </p>
        </>
      )}
    </section>
  );
}
