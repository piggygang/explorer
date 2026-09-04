import type { CSSProperties } from "react";
import Link from "next/link";
import { NftImage } from "@/components/nft-image";
import { EVENT_GLYPHS } from "@/components/activity-row";
import { absoluteTime, formatSol, relativeTime, shorten } from "@/lib/format";
import type { Move } from "@/lib/recent-moves";

/**
 * The home band: one row per recently-active piggy, showing that piggy's newest
 * on-chain event. The website's divided-band idiom — the 1px grid gutter over
 * bg-line IS the divider.
 *
 * The whole cell is the link to the piggy. Wallet addresses inside are plain
 * mono text, not links, because a link inside a link is invalid markup; the
 * timeline on the NFT page is where a wallet becomes clickable.
 */

const BAND = "grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2";
const CELL = "bg-surface p-2";
const ROW =
  "group flex h-full gap-3 rounded-xl p-3 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const WELL = "h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-raised";
const META = "flex min-w-0 flex-1 flex-col gap-1";
const HEAD = "flex items-baseline justify-between gap-2";
const NAME = "truncate text-sm font-medium transition-colors group-hover:text-[var(--accent)]";
const BADGE = "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px]";
const PARTIES = "truncate text-xs text-ink-muted";
const STAMP = "flex items-baseline justify-between gap-2 text-[11px] text-ink-muted";
const PRICE =
  "shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]";

const LABELS = { mint: "Mint", transfer: "Transfer", sale: "Sale", burn: "Burn" } as const;
const TONES = {
  // A sale takes the collection accent because the price is the news.
  sale: "bg-[var(--accent)]/15 text-[var(--accent)]",
  transfer: "bg-ink/10 text-ink",
  mint: "bg-ink/5 text-ink-muted",
  // brand is this palette's only danger colour.
  burn: "bg-brand/20 text-brand",
} as const;

export function ActivityStrip({ moves }: { moves: Move[] }) {
  return (
    <ul className={BAND}>
      {moves.map(({ nft, event, collection }) => (
        <li
          key={`${nft.id}-${event.signature}`}
          style={{ "--accent": collection.accent } as CSSProperties}
          className={CELL}
        >
          <Link href={`/nfts/${nft.id}`} className={ROW}>
            <span className={WELL}>
              <NftImage src={nft.imageUrl} alt="" />
            </span>
            <span className={META}>
              <span className={HEAD}>
                <span className={NAME}>{nft.name}</span>
                <span className={`${BADGE} ${TONES[event.type]}`}>
                  <span aria-hidden="true">{EVENT_GLYPHS[event.type]}</span> {LABELS[event.type]}
                </span>
              </span>
              <span className={PARTIES}>
                {event.from === null && event.to !== null && (
                  <>Minted to <span className="font-mono">{shorten(event.to)}</span></>
                )}
                {event.from !== null && event.to !== null && (
                  <>
                    <span className="font-mono">{shorten(event.from)}</span>
                    {" → "}
                    <span className="font-mono">{shorten(event.to)}</span>
                  </>
                )}
                {event.to === null && event.from !== null && (
                  <>Burned by <span className="font-mono">{shorten(event.from)}</span></>
                )}
              </span>
              <span className={STAMP}>
                <time dateTime={event.timestamp} title={absoluteTime(event.timestamp)}>
                  {relativeTime(event.timestamp)}
                  {event.marketplace !== null && ` · ${event.marketplace}`}
                </time>
                {event.priceLamports !== null && (
                  <span className={PRICE}>{formatSol(event.priceLamports)}</span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
