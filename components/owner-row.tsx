import type { ReactNode } from "react";
import { AddressLink } from "@/components/address";
import type { OwnershipInterval } from "@/lib/api/client";
import { absoluteTime, relativeTime } from "@/lib/format";

/**
 * One ownership interval, extracted from OwnershipHistory so the paging island
 * can render appended rows with the same markup the server rendered page one
 * with. Same split, and the same reason, as ActivityBand/ActivityRow.
 *
 * NO "use client" here: this module is rendered from both graphs, so it must
 * carry no directive and every import must stay client-safe — components/address
 * (already in the client bundle via CopyButton), lib/format (no imports, and
 * UTC-pinned so a server render and a client hydration agree) and a type-only
 * OwnershipInterval, which erases.
 *
 * `isCurrent` rather than `toSlot === null`: the contract marks the open
 * interval explicitly, and says "at most one" — a burned pig has none at all.
 */

const BAND = "mt-3 grid gap-px overflow-hidden rounded-card border border-line bg-line";
const ROW = "flex flex-wrap items-baseline justify-between gap-2 bg-surface p-3";
const WHEN = "font-mono text-[11px] text-ink-muted";
const BADGE = "ml-2 rounded-full bg-ink/10 px-2 py-0.5 font-mono text-[10px] text-ink";

export function OwnerBand({ children }: { children: ReactNode }) {
  return <ul className={BAND}>{children}</ul>;
}

export function OwnerRow({ held }: { held: OwnershipInterval }) {
  return (
    <li className={ROW}>
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
  );
}
