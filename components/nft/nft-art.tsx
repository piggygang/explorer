import { NftImage } from "@/components/nft-image";
import type { NftDetail } from "@/lib/api/client";

/**
 * The large art well. Unlike a grid cell, a missing image here IS the subject of
 * the panel, so it carries a caption rather than sitting silently — a visitor
 * who came to look at a piggy deserves to be told why there is nothing to see.
 */

const WELL = "relative aspect-square overflow-hidden rounded-card border border-line bg-surface-raised";
const CAPTION = "mt-2 text-[11px] text-ink-muted";

export function NftArt({ nft }: { nft: NftDetail }) {
  return (
    <div>
      <div className={`${WELL} ${nft.burned ? "opacity-25" : ""}`}>
        <NftImage src={nft.imageUrl} alt={nft.name} eager />
      </div>
      {nft.imageUrl === null && (
        <p className={CAPTION}>Piggy art appears once the indexer records image URLs.</p>
      )}
    </div>
  );
}
