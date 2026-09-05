import { AddressLink } from "@/components/address";
import { EmptyNote } from "@/components/empty-state";
import { ErrorNote } from "@/components/error-note";
import type { OwnershipInterval } from "@/lib/api/client";
import { absoluteTime, relativeTime } from "@/lib/format";

/**
 * Who held it, and when. Intervals never overlap, so (owner, fromSlot)
 * identifies a row uniquely, and the contract marks the open one with
 * isCurrent rather than leaving it to be inferred from a null.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const BAND = "mt-3 grid gap-px overflow-hidden rounded-card border border-line bg-line";
const ROW = "flex flex-wrap items-baseline justify-between gap-2 bg-surface p-3";
const WHEN = "font-mono text-[11px] text-ink-muted";
const BADGE = "ml-2 rounded-full bg-ink/10 px-2 py-0.5 font-mono text-[10px] text-ink";

export function OwnershipHistory({
  intervals,
  error,
}: {
  intervals: OwnershipInterval[];
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
        <ul className={BAND}>
          {intervals.map((held) => (
            <li key={`${held.owner}-${held.fromSlot}`} className={ROW}>
              <span className="text-sm">
                <AddressLink address={held.owner} />
                {held.isCurrent && <span className={BADGE}>Current</span>}
              </span>
              <span className={WHEN}>
                <time dateTime={held.fromTs} title={absoluteTime(held.fromTs)}>
                  {relativeTime(held.fromTs)}
                </time>
                {held.toTs !== null && (
                  <>
                    {" → "}
                    <time dateTime={held.toTs} title={absoluteTime(held.toTs)}>
                      {relativeTime(held.toTs)}
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
