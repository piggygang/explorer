import type { CSSProperties } from "react";
import Link from "next/link";
import { NftImage } from "@/components/nft-image";
import type { NftSummary } from "@/lib/api/client";
import { number } from "@/lib/format";
import { presentation } from "@/lib/collections";

/**
 * The single NFT grid cell — browse, wallet portfolios and (later) search
 * results all use this one, so a piggy looks the same everywhere it appears.
 *
 * It derives --accent itself from the embedded collection ref, so no caller has
 * to pass a colour, and it exports NFT_GRID so the skeleton and the grid can
 * never drift.
 *
 * NO "use client" here, deliberately. This module is rendered directly by
 * Server Components (browse's first page, the wallet grid) AND from inside the
 * browse island, which is a Client Component; a module with no directive works
 * in both graphs, and adding one would turn NFT_GRID into a client-module proxy
 * that a Server Component cannot read. That balance holds only while every
 * import here stays client-safe: next/link, the already-client NftImage,
 * lib/collections.ts (pure data, type-only imports) and a type-only NftSummary.
 * A server-only import added to any of them breaks the island's build.
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
const WELL = "art-well block aspect-square";
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
  const accent = { "--accent": presentation(nft.collection.slug).accent } as CSSProperties;

  // Core assets are named a bare "#1"; token_metadata ones carry the collection
  // name too. Leading with the number keeps a grid of 24 from repeating that
  // name, and falls back to it when the name carried no number to parse.
  const label = nft.number === null ? nft.name : `#${number(nft.number)}`;

  return (
    <Link
      href={`/nfts/${nft.address}`}
      style={accent}
      className={`${CARD} ${nft.burned ? BURNED : LIVE}`}
    >
      <span className={`${WELL} ${nft.burned ? "opacity-25" : ""}`}>
        <NftImage src={nft.imageUri} status={nft.imageStatus} alt={nft.name} eager={eager} />
      </span>
      <span className={BODY}>
        <span className={ROW}>
          <span
            title={nft.name}
            className={`${TITLE} ${nft.burned ? "text-ink-muted" : ""}`}
          >
            {label}
          </span>
          {/* One slot, and burned wins it: a burned piggy's rank is trivia, its
              burn is not. rarityRank is null until ALG-627 ships, and a null
              rank renders nothing at all — no em dash, no "unranked". */}
          {nft.burned ? (
            <span className={BADGE}>Burned</span>
          ) : (
            nft.rarityRank !== null && (
              <span className={BADGE} title={`Rarity rank ${number(nft.rarityRank)}`}>
                #{number(nft.rarityRank)}
              </span>
            )
          )}
        </span>
        {showCollection && (
          <span className="truncate text-xs text-ink-muted">
            {presentation(nft.collection.slug).short || nft.collection.name}
          </span>
        )}
      </span>
    </Link>
  );
}
