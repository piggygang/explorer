import type { CSSProperties } from "react";
import Link from "next/link";
import { NFT_GRID, NftCard } from "@/components/nft-card";
import type { WalletCollectionGroup } from "@/lib/api/client";
import { number } from "@/lib/format";
import { presentation } from "@/lib/collections";

/**
 * One collection's holdings.
 *
 * The endpoint returns each group's FIRST PAGE and no nested cursor, so there
 * is no "load more" to build here. totalCount > nfts.length is the only signal
 * that more exist, and the documented way to see them is the browse page
 * filtered by owner — which is exactly where "See all" goes.
 */

const HEAD = "flex flex-wrap items-center justify-between gap-3";
const NAME = "text-base font-semibold tracking-tight transition-colors hover:text-[var(--accent)]";
const PILL =
  "rounded-full bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]";
const SEE_ALL =
  "group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const NOTE = "mt-3 text-[11px] text-ink-muted";

export function WalletGroup({
  group,
  address,
}: {
  group: WalletCollectionGroup;
  address: string;
}) {
  const { slug, name } = group.collection;
  const accent = { "--accent": presentation(slug).accent } as CSSProperties;
  const truncated = group.totalCount > group.nfts.length;

  return (
    <section id={slug} aria-label={name} style={accent} className="scroll-mt-32">
      <div className={HEAD}>
        <h2 className="flex items-center gap-2">
          <Link href={`/collections/${slug}`} className={NAME}>
            {name}
          </Link>
          <span className={PILL}>{number(group.totalCount)} held</span>
          {/* ALG-637 asks for a top-holder rank here. The contract has no
              holders endpoint, so the slot stays empty rather than guessed. */}
        </h2>
        {truncated && (
          <Link href={`/collections/${slug}?owner=${address}`} className={SEE_ALL}>
            See all
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        )}
      </div>

      {group.nfts.length > 0 && (
        <ul className={`${NFT_GRID} mt-4`}>
          {group.nfts.map((nft) => (
            <li key={nft.id} className="flex">
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      )}

      {truncated && (
        <p className={NOTE}>
          Showing {number(group.nfts.length)} of {number(group.totalCount)} — open the collection
          to page through the rest.
        </p>
      )}
    </section>
  );
}
