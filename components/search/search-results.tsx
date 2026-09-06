import type { CSSProperties } from "react";
import Link from "next/link";
import { NftCard, NFT_GRID } from "@/components/nft-card";
import { ResultRow } from "@/components/search/result-row";
import type { CollectionNavItem } from "@/lib/collections";
import type { SearchResponse } from "@/lib/api/client";
import { presentation } from "@/lib/collections";
import { number } from "@/lib/format";
import { collectionSearchHref } from "@/lib/browse-params";
import { localCollections, topRows } from "@/lib/search-rows";

/**
 * How /search renders a SearchResponse. A Server Component — nothing here
 * fetches, so the page stays a thin fetch-and-branch and this stays a pure
 * projection of one envelope.
 *
 * It shares lib/search-rows.ts with the palette, so the two agree about order,
 * destinations and labels. It does NOT share the NFT markup: a results page owns
 * a grid of cards and a palette owns stacked rows, and one component with a
 * density flag would be two components wearing a boolean.
 */

const PANEL = "rounded-card border border-line bg-surface p-2";
const PANEL_HEAD = "px-2.5 pt-1.5 pb-1 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const SECTION = "flex flex-col gap-4";
const HEAD = "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1";
const COUNT = "font-mono text-xs text-ink-muted";
const MORE =
  "self-start rounded-full border border-line px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-[var(--accent)] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/**
 * The route and wallet hits, plus any collection the site itself matches.
 *
 * /search only reaches this when it did NOT redirect — either the response
 * carried groups alongside a route (schema-legal, though no contract example
 * produces it) or the route's id did not fit its kind, so there was nowhere
 * honest to send anyone. Either way the reader gets the hit as something to click
 * rather than a claim that nothing matched.
 *
 * It speaks --brand, not an accent: this panel spans collections, and --brand is
 * the site-wide identity the rest of the chrome uses.
 */
export function TopHits({
  result,
  collections,
}: {
  result: SearchResponse;
  collections: CollectionNavItem[];
}) {
  const routed = result.route?.kind === "collection" ? [result.route.id] : [];
  // Two labels, not one. A resolved mint or wallet IS the best match; a
  // collection whose NAME happens to contain the query is not, and calling it
  // one would be the page overclaiming about its own results. The palette makes
  // the same split, so the two surfaces read alike.
  const panels = [
    { id: "top", label: "Best match", rows: topRows(result) },
    { id: "collections", label: "Collections", rows: localCollections(result.query, collections, routed) },
  ].filter((panel) => panel.rows.length > 0);
  if (panels.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {panels.map((panel) => (
        <div key={panel.id} className={PANEL}>
          <p className={PANEL_HEAD}>{panel.label}</p>
          <ul>
            {panel.rows.map((row) => (
              <li key={row.id}>
                <ResultRow row={row} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * One section per collection group, IN THE ORDER GIVEN. The contract already
 * returns them most-hits-first and specifies no order inside a group, so nothing
 * is re-sorted here and no copy calls the first card the best match.
 */
export function SearchGroups({
  result,
  query,
}: {
  result: SearchResponse;
  query: string;
}) {
  return (
    <div className="flex flex-col gap-12">
      {result.groups.map((group, groupIndex) => {
        const accent = {
          "--accent": presentation(group.collection.slug).accent,
        } as CSSProperties;
        const shown = group.nfts.length;
        return (
          <section key={group.collection.slug} style={accent} className={SECTION}>
            <div className={HEAD}>
              <h2 className="text-base font-semibold tracking-tight">
                {group.collection.name}
              </h2>
              {/* SearchGroup.total is EXACT — the one number a keyset page can
                  never give you — so it is worth printing beside a capped
                  preview rather than leaving the reader to count cards. */}
              <p className={COUNT}>
                {shown < group.total
                  ? `${number(shown)} of ${number(group.total)} matches`
                  : `${number(group.total)} ${group.total === 1 ? "match" : "matches"}`}
              </p>
            </div>

            <ul className={NFT_GRID}>
              {group.nfts.map((nft, index) => (
                <li key={nft.address} className="flex">
                  {/* Only the first group's first row is eager: three groups of
                      four would be twelve high-priority images racing each other
                      for the same connection. */}
                  <NftCard nft={nft} eager={groupIndex === 0 && index < 4} />
                </li>
              ))}
            </ul>

            {shown < group.total && (
              // The contract's own hand-off: "a capped preview, not paginated —
              // deep results belong on the browse page with ?q=". It never
              // restates the total, because browse's `q` is a wider net than
              // search's and would show a different number.
              <Link href={collectionSearchHref(group.collection.slug, query)} className={MORE}>
                Browse all matches in {group.collection.name}
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
