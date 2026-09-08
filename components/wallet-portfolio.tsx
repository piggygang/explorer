import type { CSSProperties } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { NftCard } from "@/components/nft-card";
import { WalletGrid } from "@/components/wallet-grid";
import type { WalletPortfolio as Portfolio } from "@/lib/api/client";
import { number } from "@/lib/format";
import { holdsFullGang, presentation } from "@/lib/collections";

/**
 * The tally row and the holdings grid.
 *
 * The contract returns one portfolio: a per-collection tally that is never
 * paginated ("bounded by the number of enabled collections") plus a keyset page
 * of cards across all of them, which WalletGrid appends to. So there are no
 * per-collection sections to anchor to, and the tally chips stay inert — this
 * repo's signal for "nothing to click". The endpoint does take a `collection`
 * filter, but it sits inside the cursor's filter hash, so making the chips
 * filter would mean resetting paging on every toggle for a grid that already
 * arrives grouped by collection.
 *
 * Everything cross-collection speaks --brand; each chip sets its own --accent.
 * That keeps the scoping rule legible at a glance: colour means "this
 * collection", brand means "this wallet".
 */

const TALLY = "flex flex-wrap items-center gap-2";
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-muted";
const RANK = "text-ink-muted/70";
const DOT = "h-1.5 w-1.5 rounded-full bg-[var(--accent)]";
const FULL =
  "inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 font-mono text-[11px] text-brand";
const NOTE = "mt-3 text-[11px] text-ink-muted text-pretty";
const GHOST =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function WalletPortfolio({
  address,
  portfolio,
}: {
  address: string;
  portfolio: Portfolio;
}) {
  const { totalCount, nfts } = portfolio;

  if (totalCount === 0) {
    return (
      <EmptyState
        title="No piggies in this wallet"
        body="This address holds nothing from the indexed collections. A piggy listed for sale or staked is held by the marketplace, not by the wallet — those don’t show up here."
        action={
          <Link href="/#collections" className={GHOST}>
            Browse the collections
          </Link>
        }
      />
    );
  }

  // badges is always empty in v1 and the contract says to derive this one
  // client-side. It is NOT "every enabled collection" — see GANG in
  // lib/collections.ts for why the Gang is a named three.
  const fullGang = holdsFullGang(portfolio.collections.map((held) => held.collection.slug));

  return (
    <>
      <p className="text-sm text-ink-muted">
        Holds <span className="font-mono text-ink">{number(totalCount)}</span>{" "}
        {totalCount === 1 ? "piggy" : "piggies"} across{" "}
        <span className="font-mono text-ink">{number(portfolio.collections.length)}</span>{" "}
        {portfolio.collections.length === 1 ? "collection" : "collections"}.
      </p>

      <div className={`${TALLY} mt-3`}>
        {portfolio.collections.map((holding) => {
          const { slug, name } = holding.collection;
          const { short, accent } = presentation(slug);
          return (
            <span
              key={slug}
              style={{ "--accent": accent } as CSSProperties}
              className={CHIP}
            >
              <span aria-hidden="true" className={DOT} />
              {number(holding.count)} {short || name}
              {/* Rank ties share the lower value and skip the next, and the
                  contract lets the server omit it under load — so it is a bare
                  "#12", never "12 of N". */}
              {holding.holderRank !== null && (
                <span className={RANK} title={`Ranked ${number(holding.holderRank)} among ${name} holders`}>
                  #{number(holding.holderRank)}
                </span>
              )}
            </span>
          );
        })}
        {fullGang && (
          <span className={FULL} title="Holds all three Piggy collections">
            Full gang
          </span>
        )}
      </div>

      <p className={NOTE}>
        Indexed collections only — a piggy listed for sale or staked is held by the marketplace,
        not by this wallet.
      </p>

      <WalletGrid
        address={address}
        initialAddresses={nfts.data.map((nft) => nft.address)}
        initialCursor={nfts.nextCursor}
        initialHasMore={nfts.hasMore}
        total={totalCount}
      >
        {nfts.data.map((nft, index) => (
          <li key={nft.address} className="flex">
            <NftCard nft={nft} eager={index < 4} showCollection />
          </li>
        ))}
      </WalletGrid>
    </>
  );
}
