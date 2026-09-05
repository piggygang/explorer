import { DEFAULT_SORT, browseKey, isBrowseSort } from "@/lib/api/params";
import type { Sort, TraitSelection } from "@/lib/api/params";

/**
 * Every chip, value row, sort pill and sheet open/close on the browse page is a
 * URL these functions produce. That is what keeps the page to two small client
 * islands, and it is why ALG-632's "shareable filtered URL" requirement is
 * satisfied by construction rather than bolted on.
 *
 * Serialization matches lib/api/client.ts's querySerializer exactly — one
 * `trait[<Type>]=<Value>` pair per selection — so a URL this page renders and a
 * request the client sends can never disagree.
 *
 * NO CURSOR. A keyset cursor is opaque, is valid only for the sort and filter
 * set that issued it, and the contract warns it is "not guaranteed stable
 * across deploys". Putting one in a shareable URL produces links that expire —
 * so paging lives in the grid island's state, and what the URL carries is what
 * is worth sharing: the filters and the sort.
 *
 * NO OWNER either: the browse endpoint no longer takes one. A wallet's
 * holdings are /wallet/[address], which pages them itself.
 */

export type BrowseParams = {
  trait: TraitSelection;
  q?: string;
  sort?: Sort;
  /** Which trait type the filter sheet is showing; absent means closed. */
  filters?: string;
};

export function parseBrowseParams(
  searchParams: Record<string, string | string[] | undefined>,
): BrowseParams {
  const one = (key: string): string | undefined => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.trim() || undefined;
  };

  const trait: TraitSelection = {};
  for (const [key, raw] of Object.entries(searchParams)) {
    const match = /^trait\[(.+)\]$/.exec(key);
    if (!match || raw === undefined) continue;
    trait[match[1]] = Array.isArray(raw) ? raw : [raw];
  }

  // isBrowseSort accepts only the sorts this app offers, which is narrower than
  // the contract's enum: `rarity` is a member of it but answers 422 until
  // ALG-627 ships. So a hand-typed ?sort=rarity lands on the default here and
  // never reaches the wire — this is the single place that downgrade happens.
  const sort = one("sort");
  return {
    trait,
    q: one("q"),
    sort: sort !== undefined && isBrowseSort(sort) ? sort : undefined,
    filters: one("filters"),
  };
}

function build(slug: string, params: BrowseParams): string {
  const search = new URLSearchParams();
  for (const [type, values] of Object.entries(params.trait)) {
    for (const value of values) search.append(`trait[${type}]`, value);
  }
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  if (params.filters) search.set("filters", params.filters);
  const query = search.toString();
  return query ? `/collections/${slug}?${query}` : `/collections/${slug}`;
}

export function toggleTraitHref(
  slug: string,
  params: BrowseParams,
  traitType: string,
  value: string,
): string {
  const current = params.trait[traitType] ?? [];
  const next = current.includes(value)
    ? current.filter((candidate) => candidate !== value)
    : [...current, value];
  const trait = { ...params.trait };
  if (next.length > 0) trait[traitType] = next;
  else delete trait[traitType];
  return build(slug, { ...params, trait });
}

export function sortHref(slug: string, params: BrowseParams, sort: Sort): string {
  return build(slug, { ...params, sort });
}

export function openSheetHref(slug: string, params: BrowseParams, traitType: string): string {
  return build(slug, { ...params, filters: traitType });
}

export function closeSheetHref(slug: string, params: BrowseParams): string {
  return build(slug, { ...params, filters: undefined });
}

export function clearHref(slug: string, params: BrowseParams): string {
  // Keeps sort and the open sheet; drops everything that narrows the results.
  return build(slug, { trait: {}, sort: params.sort, filters: params.filters });
}

export function dropQueryHref(slug: string, params: BrowseParams): string {
  return build(slug, { ...params, q: undefined });
}

export function activeCount(params: BrowseParams): number {
  const traits = Object.values(params.trait).reduce((sum, values) => sum + values.length, 0);
  return traits + (params.q ? 1 : 0);
}

/**
 * The identity of the query the grid is showing — everything the server pages
 * on, and nothing it does not. The grid island is keyed on it, so a sort or
 * filter navigation remounts the island instead of appending the new query's
 * pages onto the old query's cards.
 *
 * `filters` is excluded deliberately: opening the sheet changes the URL but not
 * the result set, and remounting the grid there would throw away every appended
 * page for a panel that slides over the top of it.
 */
export function browseIdentity(slug: string, params: BrowseParams): string {
  return browseKey(slug, params.sort ?? DEFAULT_SORT, params.trait, params.q);
}
