import { NftImage } from "@/components/nft-image";
import type { NftDetail } from "@/lib/api/client";

/**
 * The large art well. Unlike a grid cell, a missing image here IS the subject of
 * the panel, so it carries a caption rather than sitting silently — a visitor
 * who came to look at a piggy deserves to be told why there is nothing to see.
 */

const WELL = "art-well aspect-square rounded-card border border-line";
const CAPTION = "mt-2 text-[11px] text-ink-muted";

export function NftArt({ nft }: { nft: NftDetail }) {
  return (
    <div>
      <div className={`${WELL} ${nft.burned ? "opacity-25" : ""}`}>
        <NftImage
          src={nft.imageUri}
          status={nft.imageStatus}
          alt={nft.name}
          eager
          sizes="(min-width: 1024px) 380px, 100vw"
        />
      </div>
      {/* Two different absences, and the visitor is owed the difference: one is
          waiting on the indexer, the other is a 2021 host that is never coming
          back. Neither is a broken image icon. */}
      {nft.imageUri === null ? (
        <p className={CAPTION}>Piggy art appears once the indexer records an image URL.</p>
      ) : nft.imageStatus === "dead" ? (
        <p className={CAPTION}>
          The host this piggy&rsquo;s art was published to no longer answers.
        </p>
      ) : null}
    </div>
  );
}
