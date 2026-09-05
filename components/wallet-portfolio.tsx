import type { CSSProperties } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { NFT_GRID, NftCard } from "@/components/nft-card";
import type { Collection, WalletPortfolio as Portfolio } from "@/lib/api/client";
import { number } from "@/lib/format";
import { presentation } from "@/lib/collections";

/**
 * The tally row and the holdings grid.
 *
 * The contract returns one portfolio: a per-collection tally that is never
 * paginated ("bounded by the number of enabled collections") plus a single
 * keyset page of cards across all of them. So there are no per-collection
 * sections to anchor to any more, and the tally chips are inert — this repo's
 * signal for "nothing to click" — rather than linking somewhere that would mean
 * something different from what they count.
 *
 * Everything cross-collection speaks --brand; each chip sets its own --accent.
 * That keeps the scoping rule legible at a glance: colour means "this
 * collection", brand means "this wallet".
 */

const TALLY = "flex flex-wrap items-center gap-2";
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-muted";
const DOT = "h-1.5 w-1.5 rounded-full bg-[var(--accent)]";
const FULL =
  "inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 font-mono text-[11px] text-brand";
const NOTE = "mt-3 text-[11px] text-ink-muted text-pretty";
const GHOST =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function WalletPortfolio({
  portfolio,
  collections,
}: {
  portfolio: Portfolio;
  collections: Collection[];
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

  // badges is always empty in v1 — the contract says to derive a full-set badge
  // client-side, from the live API list rather than a hard-coded three, so the
  // day a fourth collection is indexed "every one" keeps meaning every one.
  const fullGang =
    collections.length > 0 && portfolio.collections.length === collections.length;

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
            </span>
          );
        })}
        {fullGang && (
          <span className={FULL} title="Holds every indexed collection">
            Full gang
          </span>
        )}
      </div>

      <p className={NOTE}>
        Indexed collections only — a piggy listed for sale or staked is held by the marketplace,
        not by this wallet.
      </p>

      <ul className={`${NFT_GRID} mt-8`}>
        {nfts.data.map((nft, index) => (
          <li key={nft.address} className="flex">
            <NftCard nft={nft} eager={index < 4} showCollection />
          </li>
        ))}
      </ul>

      {/* The grid is one keyset page. Paging it is ALG-637's, so this says what
          it is showing rather than pretending the page is the whole portfolio. */}
      {nfts.hasMore && (
        <p className={NOTE}>
          Showing the first {number(nfts.data.length)} of {number(totalCount)}.
        </p>
      )}
    </>
  );
}
