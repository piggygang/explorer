import { AddressActions } from "@/components/address";
import type { NftDetail } from "@/lib/api/client";

/** Mint address, standard and metadata URI — the on-chain identity of the asset. */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "mb-3 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const LINK =
  "mt-3 block truncate text-[11px] text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function AssetPanel({ nft }: { nft: NftDetail }) {
  return (
    <section aria-label="Asset" className={PANEL}>
      <h2 className={EYEBROW}>{nft.standard === "core" ? "Core asset" : "Mint"}</h2>
      <AddressActions address={nft.id} kind="mint" />
      {nft.metadataUri !== null && (
        <a href={nft.metadataUri} target="_blank" rel="noreferrer" className={LINK}>
          Metadata ↗
        </a>
      )}
    </section>
  );
}
