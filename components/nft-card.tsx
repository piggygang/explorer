import type { CSSProperties } from "react";
import Link from "next/link";
import { NftImage } from "@/components/nft-image";
import type { NftSummary } from "@/lib/api/client";
import { presentation } from "@/lib/collections";

/**
 * The single NFT grid cell — browse, wallet groups and (later) search results
 * all use this one, so a piggy looks the same everywhere it appears.
 *
 * It derives --accent itself from the collection slug, so no caller has to pass
 * a colour, and it exports NFT_GRID so the skeleton and the grid can never drift.
 *
 * rounded-xl, not rounded-card: the system gives rounded-card to cards and
 * panels and rounded-xl to grid cells (dressme's TraitGrid CELL is rounded-xl),
 * and a 20px radius on a 160px tile reads as a bubble.
 */

export const NFT_GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

const CARD =
  "group flex w-full flex-col overflow-hidden rounded-xl border transition-colors hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const LIVE = "border-line bg-surface";
// Dashed is this system's inert signal, but a burned piggy stays a link: the
// burn is the interesting part of its history, and that history still exists.
const BURNED = "border-dashed border-line bg-surface/50";
const WELL = "relative aspect-square overflow-hidden bg-surface-raised";
const BODY = "flex flex-1 flex-col gap-1.5 border-t border-line p-3";
const ROW = "flex items-baseline justify-between gap-2";
const TITLE = "truncate font-mono text-sm font-medium";
const BADGE =
  "shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted";

export function NftCard({
  nft,
  eager = false,
  showCollection = false,
}: {
  nft: NftSummary;
  eager?: boolean;
  showCollection?: boolean;
}) {
  const accent = { "--accent": presentation(nft.collectionSlug).accent } as CSSProperties;

  // Core assets are named a bare "#1"; token_metadata ones carry the collection
  // name too. Leading with the number keeps a grid of 24 from repeating that
  // name, and falls back to it when the number could not be parsed.
  const label = nft.number === null ? nft.name : `#${nft.number}`;

  return (
    <Link
      href={`/nfts/${nft.id}`}
      style={accent}
      className={`${CARD} ${nft.burned ? BURNED : LIVE}`}
    >
      <span className={`${WELL} ${nft.burned ? "opacity-25" : ""}`}>
        <NftImage src={nft.imageUrl} alt={nft.name} eager={eager} />
      </span>
      <span className={BODY}>
        <span className={ROW}>
          <span
            title={nft.name}
            className={`${TITLE} ${nft.burned ? "text-ink-muted" : ""}`}
          >
            {label}
          </span>
          {/* The right slot is where ALG-627's rarity rank lands. Until it
              exists nothing is invented here — only a burned marker. */}
          {nft.burned && <span className={BADGE}>Burned</span>}
        </span>
        {showCollection && (
          <span className="truncate text-xs text-ink-muted">
            {presentation(nft.collectionSlug).short || nft.collectionSlug}
          </span>
        )}
      </span>
    </Link>
  );
}
