import type { CSSProperties } from "react";
import Link from "next/link";
import { NftImage } from "@/components/nft-image";
import { kindMeta } from "@/components/activity-row";
import type { ActivityKind, CollectionActivityEvent } from "@/lib/api/client";
import { absoluteTime, formatSol, relativeTime, shorten } from "@/lib/format";
import { presentation } from "@/lib/collections";

/**
 * The home band: one row per recent on-chain event, with the piggy it happened
 * to. The website's divided-band idiom — the 1px grid gutter over bg-line IS
 * the divider.
 *
 * Every event embeds its own NftSummary, so the art, the name and the
 * collection accent all come from the feed itself with no second request.
 *
 * The whole cell is the link to the piggy. Wallet addresses inside are plain
 * mono text, not links, because a link inside a link is invalid markup; the
 * timeline on the NFT page is where a wallet becomes clickable.
 */

const BAND = "grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2";
const CELL = "bg-surface p-2";
const ROW =
  "group flex h-full gap-3 rounded-xl p-3 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const WELL = "art-well h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line";
const META = "flex min-w-0 flex-1 flex-col gap-1";
const HEAD = "flex items-baseline justify-between gap-2";
const NAME = "truncate text-sm font-medium transition-colors group-hover:text-[var(--accent)]";
const BADGE = "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px]";
const PARTIES = "truncate text-xs text-ink-muted";
const STAMP = "flex items-baseline justify-between gap-2 text-[11px] text-ink-muted";
const PRICE =
  "shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]";

/**
 * A borderless wash here, against activity-row's bordered glyph circle — the
 * same vocabulary in two shapes, so the tables stay separate. Partial and read
 * through a fallback for the same reason as kindMeta: v1 serves four of the
 * seven kinds and the rest may start appearing without a version bump.
 */
const TONES: Partial<Record<ActivityKind, string>> = {
  // A sale takes the collection accent because the price is the news.
  sale: "bg-[var(--accent)]/15 text-[var(--accent)]",
  transfer: "bg-ink/10 text-ink",
  mint: "bg-ink/5 text-ink-muted",
  burn: "bg-brand/20 text-brand",
};
const TONE_DEFAULT = "bg-ink/5 text-ink-muted";

export function ActivityStrip({ events }: { events: CollectionActivityEvent[] }) {
  return (
    <ul className={BAND}>
      {events.map((event) => {
        const { nft } = event;
        const { glyph, label } = kindMeta(event.kind);
        const accent = { "--accent": presentation(nft.collection.slug).accent } as CSSProperties;

        return (
          <li key={`${event.signature}-${event.seq}`} style={accent} className={CELL}>
            <Link href={`/nfts/${nft.address}`} className={ROW}>
              <span className={WELL}>
                {/* A 56px well: without this it would inherit the grid's
                    sizes and fetch a card-sized image for a thumbnail. */}
                <NftImage
                  src={nft.imageUri}
                  status={nft.imageStatus}
                  alt=""
                  sizes="56px"
                />
              </span>
              <span className={META}>
                <span className={HEAD}>
                  <span className={NAME}>{nft.name}</span>
                  <span className={`${BADGE} ${TONES[event.kind] ?? TONE_DEFAULT}`}>
                    <span aria-hidden="true">{glyph}</span> {label}
                  </span>
                </span>
                <span className={PARTIES}>
                  {event.fromOwner === null && event.toOwner !== null && (
                    <>
                      Minted to <span className="font-mono">{shorten(event.toOwner)}</span>
                    </>
                  )}
                  {event.fromOwner !== null && event.toOwner !== null && (
                    <>
                      <span className="font-mono">{shorten(event.fromOwner)}</span>
                      {" → "}
                      <span className="font-mono">{shorten(event.toOwner)}</span>
                    </>
                  )}
                  {event.toOwner === null && event.fromOwner !== null && (
                    <>
                      Burned by <span className="font-mono">{shorten(event.fromOwner)}</span>
                    </>
                  )}
                </span>
                <span className={STAMP}>
                  <time dateTime={event.blockTime} title={absoluteTime(event.blockTime)}>
                    {relativeTime(event.blockTime)}
                    {event.marketplace !== null && ` · ${event.marketplace}`}
                  </time>
                  {event.priceLamports !== null && (
                    <span className={PRICE}>{formatSol(event.priceLamports)}</span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
