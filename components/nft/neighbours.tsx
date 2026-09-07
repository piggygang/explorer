import Link from "next/link";
import { browseCollectionNfts } from "@/lib/api/client";
import type { NftDetail, NftSummary } from "@/lib/api/client";
import { nftLabel, number } from "@/lib/format";

/**
 * The pig before and the pig after, by token number.
 *
 * NOT "within the current filter context", and the labels say so rather than
 * using bare arrows that would imply it. That version is not buildable against
 * this API: pagination is keyset with no offset, so locating an arbitrary pig's
 * neighbours under a filter means walking pages sequentially — ~98 round trips
 * and several megabytes of JSON for a pig deep in a 10,000-asset collection, and
 * wrong anyway under `-activity`, where the contract says the sort key moves and
 * pages skip rows. Constructing a cursor would do it in four requests and is
 * forbidden by the contract twice, and the in-process mock encodes a different
 * payload entirely — so it would work in production and break in dev, preview
 * and prerender.
 *
 * Number is the one axis that needs no list at all: it is on the asset, it is
 * dense, and both lookups are one cheap indexed query. It depends only on the
 * route's own path, so this route stays prerenderable — see BackToBrowse for why
 * that matters.
 *
 * `q` is OR-matched, not exact (a search for "743" also returns 1743 and 9743),
 * so each side asks for a page and takes the row whose number is the one it
 * wanted. A gap in the numbering renders nothing rather than skipping to the
 * next surviving pig, which would silently lie about adjacency.
 */

const NAV = "flex flex-wrap items-center justify-between gap-2";
const LINK =
  "min-w-0 rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,var(--brand))]";

async function neighbour(slug: string, target: number): Promise<NftSummary | null> {
  if (target < 0) return null;
  const page = await browseCollectionNfts(slug, { q: String(target) }).catch(() => null);
  return page?.data.find((nft) => nft.number === target) ?? null;
}

export async function Neighbours({ nft }: { nft: NftDetail }) {
  // A pig with no number has no place in this ordering. Nothing to render, and
  // nothing to apologise for.
  if (nft.number === null) return null;

  const [previous, next] = await Promise.all([
    neighbour(nft.collection.slug, nft.number - 1),
    neighbour(nft.collection.slug, nft.number + 1),
  ]);
  if (!previous && !next) return null;

  return (
    <nav aria-label="Neighbouring piggies" className={NAV}>
      {previous ? (
        <Link href={`/nfts/${previous.address}`} className={LINK}>
          ← {nftLabel(previous.name, previous.number)} by number
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={`/nfts/${next.address}`} className={LINK}>
          {nftLabel(next.name, next.number)} by number →
        </Link>
      )}
    </nav>
  );
}

/** The rank badge, when the indexer has one. Null renders nothing at all — no
    em dash, no "unranked" — matching every other rarity surface in the app. */
export function RarityRank({ nft, of }: { nft: NftDetail; of: number | null }) {
  if (nft.rarityRank === null) return null;
  return (
    <span className="text-xs font-normal text-ink-muted">
      Rarity rank <span className="font-mono text-ink">#{number(nft.rarityRank)}</span>
      {of !== null && ` of ${number(of)}`}
    </span>
  );
}
