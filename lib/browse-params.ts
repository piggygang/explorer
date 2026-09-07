import {
  DEFAULT_SORT,
  MAX_QUERY_LENGTH,
  browseKey,
  canAddTraitValue,
  isBrowseSort,
  traitsWithinCaps,
} from "@/lib/api/params";
import type { Sort, TraitSelection } from "@/lib/api/params";

/**
 * Every value row, chip, sort pill and drawer control on the browse page is a
 * URL these functions produce. That is what keeps the page to two small client
 * islands, and it is why ALG-633's "shareable filtered URL restores exact state"
 * is satisfied by construction rather than bolted on.
 *
 * Serialization matches lib/api/client.ts's querySerializer exactly — one
 * `trait[<Type>]=<Value>` pair per selection — so a URL this page renders and a
 * request the client sends can never disagree. That format is the contract's,
 * stated in prose as normative, and is never canonicalised or de-duplicated
 * here: what came in goes back out.
 *
 * NO CURSOR. A keyset cursor is opaque, is valid only for the sort and filter
 * set that issued it, and the contract warns it is "not guaranteed stable across
 * deploys". Paging lives in the grid island's state; the URL carries what is
 * worth sharing.
 *
 * NO OWNER: the browse endpoint no longer takes one. A wallet's holdings are
 * /wallet/[address], which pages itself.
 */

export type BrowseParams = {
  trait: TraitSelection;
  q?: string;
  sort?: Sort;
  /**
   * Whether the mobile drawer is open. A presence flag, not a trait type: with
   * an accordion there is no "active" type to name, and at lg the rail is always
   * there so there is nothing to open at all.
   */
  filters?: true;
};

/** The value `build` writes. Any non-empty value parses as open, so a
    bookmarked `?filters=Head` from before the accordion still means "open". */
const FILTERS_OPEN = "open";

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
  const q = one("q");
  return {
    trait,
    // Over-length q is dropped rather than sent: the contract caps it at 64 and
    // the real API would answer 400. The reader sees the unfiltered grid and the
    // chip row stops claiming a search that is not being applied.
    q: q !== undefined && q.length <= MAX_QUERY_LENGTH ? q : undefined,
    sort: sort !== undefined && isBrowseSort(sort) ? sort : undefined,
    filters: one("filters") !== undefined ? true : undefined,
  };
}

function build(slug: string, params: BrowseParams): string {
  const search = new URLSearchParams();
  for (const [type, values] of Object.entries(params.trait)) {
    for (const value of values) search.append(`trait[${type}]`, value);
  }
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  // A valueless key does not round-trip: URLSearchParams renders `set(k, "")` as
  // `filters=`, which parseBrowseParams' own trim-to-undefined reads back as
  // absent. So the flag carries a word.
  if (params.filters) search.set("filters", FILTERS_OPEN);
  const query = search.toString();
  return query ? `/collections/${slug}?${query}` : `/collections/${slug}`;
}

/**
 * The filter context an NFT link carries, so /nfts/[id] can send the reader back
 * to the grid they came from rather than to the unfiltered collection.
 *
 * Byte-identical to what build() writes, minus `filters`: the drawer is a
 * viewport state, not part of the result set, and it must not follow someone
 * onto a page that has no drawer.
 *
 * The NFT page must never read this server-side — searchParams is a Request-time
 * API and would opt that route out of static rendering, which ALG-639 needs for
 * a sitemap of every pig. It is read on the client, by BackToBrowse.
 */
export function browseContext(params: {
  trait: TraitSelection;
  q?: string;
  sort?: string;
}): string {
  const search = new URLSearchParams();
  for (const [type, values] of Object.entries(params.trait)) {
    for (const value of values) search.append(`trait[${type}]`, value);
  }
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  return search.toString();
}

/**
 * The inverse: rebuild the browse URL from the context a link carried. It routes
 * through parseBrowseParams on purpose, so a hand-edited over-length `q` or an
 * unavailable sort is dropped here exactly as it would be on the browse page —
 * the two can never disagree about which grid a link names.
 */
export function browseHrefFromContext(slug: string, search: URLSearchParams): string {
  const record: Record<string, string[]> = {};
  for (const key of new Set(search.keys())) record[key] = search.getAll(key);
  return build(slug, parseBrowseParams(record));
}

/** Whether one more value can be selected without exceeding the contract's caps.
    Removal is never blocked — a reader who arrives at the cap by URL must always
    be able to get back under it. */
export function canAddTrait(params: BrowseParams, traitType: string): boolean {
  return canAddTraitValue(params.trait, traitType);
}

/** Whether the selection the URL carries is one the API would accept at all. */
export function withinCaps(params: BrowseParams): boolean {
  return traitsWithinCaps(params.trait);
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

/** Opens the mobile drawer. Takes no trait type: the accordion shows every one. */
export function openSheetHref(slug: string, params: BrowseParams): string {
  return build(slug, { ...params, filters: true });
}

export function closeSheetHref(slug: string, params: BrowseParams): string {
  return build(slug, { ...params, filters: undefined });
}

export function clearHref(slug: string, params: BrowseParams): string {
  // Keeps sort and the open drawer; drops everything that narrows the results.
  return build(slug, { trait: {}, sort: params.sort, filters: params.filters });
}

export function dropQueryHref(slug: string, params: BrowseParams): string {
  return build(slug, { ...params, q: undefined });
}

/**
 * The "deep results belong on the browse page with `?q=`" link a search group
 * renders — the contract's own words for what a capped preview hands off to.
 *
 * Drops sort and traits deliberately: a reader arriving from global search has
 * no collection-local state to preserve, and carrying an empty selection would
 * only make the URL longer.
 *
 * Be careful about what this link promises. Browse's `q` is three OR'd
 * predicates (address prefix, exact number, name substring) while search's is
 * exclusive branches, so the two answer the same string differently — `#1` is
 * one hit per collection in search and 32 rows here. Callers label it "browse
 * all matches" and never restate the group's total.
 */
export function collectionSearchHref(slug: string, q: string): string {
  return build(slug, { trait: {}, q });
}

/**
 * The current selection as hidden form fields.
 *
 * A native GET form serializes only its OWN fields and throws the rest of the
 * query string away, so an in-collection search box has to re-emit everything
 * the URL already carries or submitting it would silently clear the filters.
 *
 * Byte-identical to what build() writes — keep the two adjacent. `q` is excluded
 * because the visible input carries it, and `filters` is excluded because
 * submitting a search should close the drawer, which is what closeSheetHref
 * already means.
 */
export function browseHiddenFields(params: BrowseParams): { name: string; value: string }[] {
  const fields: { name: string; value: string }[] = [];
  for (const [type, values] of Object.entries(params.trait)) {
    for (const value of values) fields.push({ name: `trait[${type}]`, value });
  }
  if (params.sort) fields.push({ name: "sort", value: params.sort });
  return fields;
}

/** Selected trait values plus the search, which is what the Filters badge counts. */
export function activeCount(params: BrowseParams): number {
  return traitCount(params) + (params.q ? 1 : 0);
}

/** Selected trait values only. The empty state needs the two apart: a zero-result
    under `q` alone is not explained by how trait types combine. */
export function traitCount(params: BrowseParams): number {
  return Object.values(params.trait).reduce((sum, values) => sum + values.length, 0);
}

/**
 * The identity of the query the grid is showing — everything the server pages
 * on, and nothing it does not. The grid island is keyed on it, so a sort or
 * filter navigation remounts it instead of appending the new query's pages onto
 * the old query's cards.
 *
 * `filters` is excluded deliberately: opening the drawer changes the URL but not
 * the result set, and remounting there would throw away every appended page for
 * a panel that slides over the top of it.
 */
export function browseIdentity(slug: string, params: BrowseParams): string {
  return browseKey(slug, params.sort ?? DEFAULT_SORT, params.trait, params.q);
}
