import type { NftDetail } from "@/lib/api/client";
import { dressHref, marketplaceHref, tensorHref } from "@/lib/links";

/**
 * Off-site destinations. A burned piggy is not for sale anywhere, so the
 * marketplace links are dropped rather than pointing at a dead listing.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "mb-3 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const LIST = "flex flex-wrap gap-2";
const LINK =
  "rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const NOTE = "mt-3 text-[11px] text-ink-muted";

export function ActionLinks({ nft }: { nft: NftDetail }) {
  const marketplace = nft.burned ? null : marketplaceHref(nft.collection.slug);

  return (
    <section aria-label="Links" className={PANEL}>
      <h2 className={EYEBROW}>Elsewhere</h2>
      <div className={LIST}>
        {marketplace && (
          <a href={marketplace} target="_blank" rel="noreferrer" className={LINK}>
            Magic Eden ↗
          </a>
        )}
        {!nft.burned && (
          <a href={tensorHref(nft.address)} target="_blank" rel="noreferrer" className={LINK}>
            Tensor ↗
          </a>
        )}
        <a href={dressHref(nft.collection.slug)} target="_blank" rel="noreferrer" className={LINK}>
          Dress a piggy ↗
        </a>
      </div>
      {/* DressMe has no per-mint deep link, so the label does not promise one. */}
      <p className={NOTE}>Dress Me opens this collection’s wardrobe, not this piggy.</p>
    </section>
  );
}
