/**
 * Trait rarity is DERIVED. The v1 contract carries no rarity field of any kind
 * — no rank, no score, no per-attribute count (rarity scoring is ALG-627) — so
 * the only rarity this app can state is a trait's share of the facet counts the
 * API does return.
 *
 * The denominator is the sum of the counts within one trait type, never
 * stats.supply: facet counts include burned assets and supply excludes them, and
 * under active filters the disjunctive counts describe the matching subset, so
 * dividing by a 10,000 supply would paint every value gold-tier Mythic. Within a
 * trait type the shares then sum to 100%, which is the only self-consistent
 * reading available.
 */

import type { components } from "@/lib/api/schema";

type TraitFacet = components["schemas"]["TraitFacet"];

export const RARITY_DISCLAIMER =
  "Trait share is derived from facet counts, burned piggies included — not an official rarity ranking.";

export const FACET_EXCLUDED_DISCLAIMER =
  "Traits that are unique to a single piggy are never counted, so they carry no share.";

/** Share of a trait type held by one value, as a percentage. */
export function traitShare(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

/** The sum of every value's count within one trait type — the denominator. */
export function facetTotal(facet: TraitFacet): number {
  return facet.values.reduce((sum, value) => sum + value.count, 0);
}

/**
 * count === null means the trait type is not faceted at all
 * (collections.facet_exclude — Piggy Girl Gang's per-asset-unique "Name").
 * Such a chip carries no badge: not an em dash, not "n/a", not 0%.
 */
export function lookupShare(
  facets: TraitFacet[],
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
