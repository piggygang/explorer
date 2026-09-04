import { AddressLink } from "@/components/address";
import { EmptyNote } from "@/components/empty-state";
import { ErrorNote } from "@/components/error-note";
import type { OwnershipRecord } from "@/lib/api/client";
import { absoluteTime, relativeTime } from "@/lib/format";

/**
 * Who held it, and when. Derived entirely from the ownership records: the open
 * record (both to-fields null) is the current holder.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const BAND = "mt-3 grid gap-px overflow-hidden rounded-card border border-line bg-line";
const ROW = "flex flex-wrap items-baseline justify-between gap-2 bg-surface p-3";
const WHEN = "font-mono text-[11px] text-ink-muted";
const BADGE = "ml-2 rounded-full bg-ink/10 px-2 py-0.5 font-mono text-[10px] text-ink";

export function OwnershipHistory({
  records,
  error,
}: {
  records: OwnershipRecord[];
  error?: unknown;
}) {
  return (
    <section id="owners" aria-label="Ownership history" className={`${PANEL} scroll-mt-32`}>
      <h2 className={EYEBROW}>Ownership history</h2>

      {error ? (
        <div className="mt-3">
          <ErrorNote what="the ownership history" error={error} />
        </div>
      ) : records.length === 0 ? (
        <div className="mt-3">
          <EmptyNote>No ownership records yet — the indexer has not walked this piggy back.</EmptyNote>
        </div>
      ) : (
        <ul className={BAND}>
          {records.map((record) => (
            <li key={`${record.owner}-${record.fromSlot}`} className={ROW}>
              <span className="text-sm">
                <AddressLink address={record.owner} />
                {record.toTimestamp === null && <span className={BADGE}>Current</span>}
              </span>
              <span className={WHEN}>
                <time dateTime={record.fromTimestamp} title={absoluteTime(record.fromTimestamp)}>
                  {relativeTime(record.fromTimestamp)}
                </time>
                {record.toTimestamp !== null && (
                  <>
                    {" → "}
                    <time dateTime={record.toTimestamp} title={absoluteTime(record.toTimestamp)}>
                      {relativeTime(record.toTimestamp)}
                    </time>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
