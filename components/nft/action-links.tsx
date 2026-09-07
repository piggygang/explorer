import { GHOST_XS } from "@/components/address";
import type { NftDetail } from "@/lib/api/client";
import { dressHref, magicEdenHref, tensorHref } from "@/lib/links";

/**
 * Off-site destinations. A burned piggy is not for sale anywhere, so the
 * marketplace links are dropped rather than pointing at a dead listing.
 *
 * Solscan is deliberately absent: the mint already links to it from AssetPanel
 * and the owner from OwnerPanel, both one panel away, and a third copy in this
 * rail would be the same destination three times.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "mb-3 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const LIST = "flex flex-wrap gap-2";
const NOTE = "mt-3 text-[11px] text-ink-muted";

export function ActionLinks({ nft }: { nft: NftDetail }) {
  const dress = dressHref(nft.collection.slug);

  return (
    <section aria-label="Links" className={PANEL}>
      <h2 className={EYEBROW}>Elsewhere</h2>
      <div className={LIST}>
        {!nft.burned && (
          <>
            <a
              href={magicEdenHref(nft.address)}
              target="_blank"
              rel="noreferrer"
              className={GHOST_XS}
            >
              Magic Eden ↗
            </a>
            <a href={tensorHref(nft.address)} target="_blank" rel="noreferrer" className={GHOST_XS}>
              Tensor ↗
            </a>
          </>
        )}
        {dress && (
          <a href={dress} target="_blank" rel="noreferrer" className={GHOST_XS}>
            Dress a piggy ↗
          </a>
        )}
      </div>
      {/* DressMe has no per-mint deep link, so the label does not promise one. */}
      {dress && <p className={NOTE}>Dress Me opens this collection’s wardrobe, not this piggy.</p>}
    </section>
  );
}
