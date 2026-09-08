"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";
import { Pager, useFeed } from "@/components/feed-pager";
import { NFT_GRID, NftCard } from "@/components/nft-card";
import { loadMoreWalletNfts } from "@/lib/api/actions";
import type { NftSummary } from "@/lib/api/client";

/**
 * The holdings grid, paged.
 *
 * Page one is server-rendered and arrives as `children`, so a wallet with no
 * JavaScript still gets a complete first page — the same split browse and the
 * NFT feeds use.
 *
 * Unlike those, this feed HAS a total: WalletPortfolio.totalCount is the whole
 * portfolio, so the status line can count towards something real. It stays
 * correct across appends because the grid is never filtered — the tally chips
 * are inert, so `collection` never enters the cursor's filter hash.
 *
 * De-duplication is defensive, not required: the wallet feed is ordered by
 * collection then id with no moving sort key, so a repeat would be a server bug
 * rather than the expected cost browse pays under sort=-activity.
 */

export function WalletGrid({
  address,
  initialAddresses,
  initialCursor,
  initialHasMore,
  total,
  children,
}: {
  address: string;
  /** Page one's addresses, so an appended page cannot repeat one of them. */
  initialAddresses: string[];
  initialCursor: string | null;
  initialHasMore: boolean;
  total: number;
  children: ReactNode;
}) {
  const fetchMore = useCallback(
    (cursor: string) => loadMoreWalletNfts({ address, cursor }),
    [address],
  );
  const keyOf = useCallback((nft: NftSummary) => nft.address, []);
  const feed = useFeed<NftSummary>({
    initialKeys: initialAddresses,
    initialCursor,
    initialHasMore,
    keyOf,
    fetchMore,
  });

  return (
    <>
      <ul className={`${NFT_GRID} mt-8`}>
        {children}
        {feed.appended.map((nft) => (
          <li key={nft.address} className="flex">
            {/* No context: there is no browse query to return to from here. */}
            <NftCard nft={nft} showCollection />
          </li>
        ))}
      </ul>
      <Pager
        shown={initialAddresses.length + feed.appended.length}
        noun="piggies"
        label="Load more"
        total={total}
        hasMore={feed.hasMore}
        pending={feed.pending}
        expired={feed.expired}
        failed={feed.failed}
        onLoad={() => void feed.load()}
        statusRef={feed.status}
      />
    </>
  );
}
