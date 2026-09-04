import type { ReactNode } from "react";
import { AddressLink, solscan } from "@/components/address";
import type { ActivityEvent } from "@/lib/api/client";
import { absoluteTime, formatSol, relativeTime } from "@/lib/format";

/**
 * One on-chain event. ActivityBand is the website's divided band — the 1px grid
 * gutter over bg-line IS the divider — so rows need no border of their own and
 * the band survives any row count.
 *
 * Null sides are omitted, never placeholdered: a mint has no `from` and a burn
 * has no `to`, by contract. Price and marketplace are rendered independently,
 * because the spec makes them non-null only FOR sales, which is not the same as
 * guaranteeing they are non-null ON one.
 */

const BAND = "grid gap-px overflow-hidden rounded-card border border-line bg-line";
const CELL = "bg-surface p-2";
const ROW = "flex h-full gap-3 rounded-xl p-3";
const GLYPH = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs";
const META = "flex min-w-0 flex-1 flex-col gap-1";
const HEAD = "flex items-baseline justify-between gap-3";
const KIND = "text-sm font-medium";
const PRICE =
  "shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]";
const PARTIES = "flex flex-wrap items-center gap-1.5 text-xs text-ink-muted";
const STAMP = "flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted";
const SIG =
  "rounded font-mono transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

// No icon library exists here, so the glyphs are characters.
export const EVENT_GLYPHS: Record<ActivityEvent["type"], string> = {
  mint: "✦",
  transfer: "→",
  sale: "◎",
  burn: "✕",
};

const EVENT_LABELS: Record<ActivityEvent["type"], string> = {
  mint: "Mint",
  transfer: "Transfer",
  sale: "Sale",
  burn: "Burn",
};

const GLYPH_TONE: Record<ActivityEvent["type"], string> = {
  mint: "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]",
  transfer: "border-line bg-surface-raised text-ink-muted",
  sale: "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]",
  burn: "border-line bg-surface-raised text-brand",
};

export function ActivityBand({ children }: { children: ReactNode }) {
  return <ul className={BAND}>{children}</ul>;
}

export function ActivityRow({ event }: { event: ActivityEvent }) {
  return (
    <li className={CELL}>
      <div className={ROW}>
        <span aria-hidden="true" className={`${GLYPH} ${GLYPH_TONE[event.type]}`}>
          {EVENT_GLYPHS[event.type]}
        </span>
        <div className={META}>
          <p className={HEAD}>
            <span className={KIND}>{EVENT_LABELS[event.type]}</span>
            {event.priceLamports !== null && (
              <span className={PRICE}>{formatSol(event.priceLamports)}</span>
            )}
          </p>
          <p className={PARTIES}>
            {event.from !== null && <AddressLink address={event.from} />}
            {event.from !== null && event.to !== null && <span aria-hidden="true">→</span>}
            {event.to !== null && <AddressLink address={event.to} />}
            {event.from === null && event.to !== null && <span className="sr-only">Minted to</span>}
            {event.marketplace !== null && <span>· {event.marketplace}</span>}
          </p>
          <p className={STAMP}>
            <time dateTime={event.timestamp} title={absoluteTime(event.timestamp)}>
              {relativeTime(event.timestamp)}
            </time>
            <span aria-hidden="true">·</span>
            <a
              href={solscan.tx(event.signature)}
              target="_blank"
              rel="noreferrer"
              className={SIG}
            >
              Signature ↗
            </a>
          </p>
        </div>
      </div>
    </li>
  );
}
