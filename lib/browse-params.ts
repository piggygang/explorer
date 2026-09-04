import type { Sort, TraitSelection } from "@/lib/api/client";

/**
 * Every chip, value row, sort pill, sheet open/close and pager link on the
 * browse page is a URL these functions produce. That is what keeps the page to
 * a single small client island, and it is why ALG-632's "shareable filtered
 * URL" requirement is satisfied by construction rather than bolted on.
 *
 * Serialization matches lib/api/client.ts's querySerializer exactly — one
 * `trait[<Type>]=<Value>` pair per selection — so a URL this page renders and a
 * request the client sends can never disagree.
 *
 * The cursor is opaque. It is copied and dropped, never parsed.
 */

export type BrowseParams = {
  trait: TraitSelection;
  q?: string;
  sort?: Sort;
  owner?: string;
  cursor?: string;
  /** Which trait type the filter sheet is showing; absent means closed. */
  filters?: string;
};

const SORTS = new Set<Sort>(["number", "-number", "name", "-name", "-activity"]);

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

  const sort = one("sort");
  return {
    trait,
    q: one("q"),
    sort: sort && SORTS.has(sort as Sort) ? (sort as Sort) : undefined,
    owner: one("owner"),
    cursor: one("cursor"),
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
  if (params.owner) search.set("owner", params.owner);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.filters) search.set("filters", params.filters);
  const query = search.toString();
  return query ? `/collections/${slug}?${query}` : `/collections/${slug}`;
}

/** Every mutation except paging drops the cursor: a forward-only cursor is
    meaningless against a filter set that just changed. */
const reset = (params: BrowseParams): BrowseParams => ({ ...params, cursor: undefined });

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
  return build(slug, reset({ ...params, trait }));
}

export function sortHref(slug: string, params: BrowseParams, sort: Sort): string {
  return build(slug, reset({ ...params, sort }));
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
  return build(slug, reset({ ...params, q: undefined }));
}

export function dropOwnerHref(slug: string, params: BrowseParams): string {
  return build(slug, reset({ ...params, owner: undefined }));
}

/** The only href that carries a cursor forward. */
export function pageHref(slug: string, params: BrowseParams, cursor: string): string {
  return build(slug, { ...params, cursor });
}

export function firstPageHref(slug: string, params: BrowseParams): string {
  return build(slug, reset(params));
}

export function activeCount(params: BrowseParams): number {
  const traits = Object.values(params.trait).reduce((sum, values) => sum + values.length, 0);
  return traits + (params.q ? 1 : 0) + (params.owner ? 1 : 0);
}
