import type { ReactNode } from "react";
import { AddressLink, solscan } from "@/components/address";
import type { ActivityEvent, ActivityKind } from "@/lib/api/client";
import { absoluteTime, formatSol, relativeTime } from "@/lib/format";

/**
 * One on-chain event. ActivityBand is the website's divided band — the 1px grid
 * gutter over bg-line IS the divider — so rows need no border of their own and
 * the band survives any row count.
 *
 * Null sides are omitted, never placeholdered: a mint has no `fromOwner` and a
 * burn has no `toOwner`, by contract. Price and marketplace are rendered
 * independently, because the spec makes them non-null only FOR sales, which is
 * not the same as guaranteeing they are non-null ON one.
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

/**
 * ActivityKind has seven members and v1 serves four. The contract is explicit
 * that the rest "may begin appearing without a version bump" and that clients
 * "must tolerate every member — treat an unrecognised kind as a generic
 * timeline entry rather than crashing".
 *
 * So this is a PARTIAL record read through a fallback, not an exhaustive one
 * read through an assertion: an unknown kind gets a neutral glyph and its own
 * name rather than `undefined` in the markup. The glyphs are characters because
 * there is no icon library here.
 */
const KIND_META: Partial<Record<ActivityKind, { glyph: string; label: string }>> = {
  mint: { glyph: "✦", label: "Mint" },
  transfer: { glyph: "→", label: "Transfer" },
  sale: { glyph: "◎", label: "Sale" },
  burn: { glyph: "✕", label: "Burn" },
  stake: { glyph: "⇧", label: "Stake" },
  unstake: { glyph: "⇩", label: "Unstake" },
};

/** Title-cases the raw kind, so even `other` reads as a word rather than a gap. */
export function kindMeta(kind: ActivityKind): { glyph: string; label: string } {
  return KIND_META[kind] ?? { glyph: "•", label: kind.charAt(0).toUpperCase() + kind.slice(1) };
}

const GLYPH_TONE: Partial<Record<ActivityKind, string>> = {
  mint: "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]",
  transfer: "border-line bg-surface-raised text-ink-muted",
  sale: "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]",
  // brand is this palette's only danger colour.
  burn: "border-line bg-surface-raised text-brand",
};
const GLYPH_TONE_DEFAULT = "border-line bg-surface-raised text-ink-muted";

export function ActivityBand({ children }: { children: ReactNode }) {
  return <ul className={BAND}>{children}</ul>;
}

export function ActivityRow({ event }: { event: ActivityEvent }) {
  const { glyph, label } = kindMeta(event.kind);

  return (
    <li className={CELL}>
      <div className={ROW}>
        <span
          aria-hidden="true"
          className={`${GLYPH} ${GLYPH_TONE[event.kind] ?? GLYPH_TONE_DEFAULT}`}
        >
          {glyph}
        </span>
        <div className={META}>
          <p className={HEAD}>
            <span className={KIND}>{label}</span>
            {event.priceLamports !== null && (
              <span className={PRICE}>{formatSol(event.priceLamports)}</span>
            )}
          </p>
          <p className={PARTIES}>
            {event.fromOwner !== null && <AddressLink address={event.fromOwner} />}
            {event.fromOwner !== null && event.toOwner !== null && (
              <span aria-hidden="true">→</span>
            )}
            {event.toOwner !== null && <AddressLink address={event.toOwner} />}
            {event.fromOwner === null && event.toOwner !== null && (
              <span className="sr-only">Minted to</span>
            )}
            {event.marketplace !== null && <span>· {event.marketplace}</span>}
          </p>
          <p className={STAMP}>
            <time dateTime={event.blockTime} title={absoluteTime(event.blockTime)}>
              {relativeTime(event.blockTime)}
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
