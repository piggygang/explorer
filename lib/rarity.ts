/**
 * Trait rarity is DERIVED. The contract reserves Attribute.rarityPct,
 * NftSummary.rarityRank and rarityScore but returns null for all three until
 * rarity scoring ships (ALG-627), so the only rarity this app can state today
 * is a trait's share of the facet counts the API does return.
 *
 * The denominator is the sum of the counts WITHIN one trait type, and that is
 * now a choice rather than a constraint: FacetsResponse.total would give the
 * size of the filtered result set, which the old contract had no way to
 * express. It stays the within-type sum because that is what a trait chip
 * claims — a value's share of its own trait type, summing to 100% across the
 * type. Dividing by the result-set total instead would answer a different
 * question, and would paint every value in a large collection gold-tier Mythic.
 *
 * Facet counts include burned assets and stats.supply excludes them, which is
 * the other reason supply is never the denominator.
 */

import type { components } from "@/lib/api/schema";

type Facet = components["schemas"]["Facet"];

export const RARITY_DISCLAIMER =
  "Trait share is derived from facet counts, burned piggies included — not an official rarity ranking.";

export const FACET_EXCLUDED_DISCLAIMER =
  "Traits that are unique to a single piggy are never counted, so they carry no share.";

/** Share of a trait type held by one value, as a percentage. */
export function traitShare(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

/** The sum of every value's count within one trait type — the denominator. */
export function facetTotal(facet: Facet): number {
  return facet.values.reduce((sum, value) => sum + value.count, 0);
}

/**
 * null means the trait type is not faceted at all (collections.facet_exclude —
 * Piggy Girl Gang's per-asset-unique "Name"), which Attribute.isFacet now says
 * outright. Such a chip carries no badge: not an em dash, not "n/a", not 0%.
 */
export function lookupShare(
  facets: Facet[],
  traitType: string,
  value: string,
): number | null {
  const facet = facets.find((candidate) => candidate.traitType === traitType);
  if (!facet) return null;
  const match = facet.values.find((candidate) => candidate.value === value);
  if (!match) return null;
  const total = facetTotal(facet);
  return total > 0 ? traitShare(match.count, total) : null;
}
