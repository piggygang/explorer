import type { components } from "@/lib/api/schema";

/**
 * The API query vocabulary — the browse parameters and search's two limits,
 * and deliberately nothing else.
 *
 * This module has no runtime imports at all — only `import type`, which erases —
 * so the client island (components/browse/browse-grid.tsx) can reach it without
 * dragging openapi-fetch, the mock dispatcher and every fixture into the browser
 * bundle. lib/api/client.ts re-exports from here rather than the reverse.
 *
 * It also holds the single definition of "which sorts this app offers". That
 * used to live in three places that could disagree — lib/browse-params.ts's
 * allow-list, components/browse/sort-pills.tsx's option list, and the mock's
 * comparator map — and the contract has since grown from five sort values to
 * eight, so one of them is now load-bearing.
 */

export type Sort = components["parameters"]["Sort"];

/** Selected trait values, keyed by trait type. AND across types, OR within one. */
export type TraitSelection = Record<string, string[]>;

/** The contract's own default, restated so a caller never has to omit `sort` to get it. */
export const DEFAULT_SORT = "number" satisfies Sort;

/**
 * The contract's default page size. 24 divides by 2, 3, 4 and 6, so no grid
 * column count leaves a ragged last row — which is also why it is the append
 * batch size.
 */
export const BROWSE_LIMIT = 24;

/**
 * The per-NFT timeline and ownership feeds page at the contract's default too,
 * but for a different reason and so under a different name: a band of rows has
 * no columns to leave ragged, and BROWSE_LIMIT's arithmetic is about grids.
 * Naming it separately means a future change to one cannot silently move the
 * other. It is also the append batch size, and the server forces it — a public
 * Server Function must not let a caller choose its own page size.
 */
export const TIMELINE_LIMIT = 24;

/**
 * The contract's own limits on a trait filter, quoted from TraitFilter's prose
 * and its schema: "At most 16 distinct trait types and 64 values per request",
 * `maxItems: 64` per type, and a value of 1 to 128 characters.
 *
 * They live here so the href builders and the mock enforce one set of numbers.
 * Until now they existed only in lib/api/actions.ts — the load-more path — so
 * the UI could build a URL the real API would reject.
 */
export const MAX_TRAIT_TYPES = 16;
export const MAX_TRAIT_VALUES = 64;
export const MAX_TRAIT_VALUE_LENGTH = 128;

/** The contract's `q`: minLength 1, maxLength 64. Shared by browse, facets and
    search — search inlines its own `q` schema rather than $ref-ing this one,
    but the bounds are identical. */
export const MAX_QUERY_LENGTH = 64;

/**
 * /v1/search INLINES its own limit rather than $ref-ing components/parameters/Limit,
 * and the two differ: 1..25 default 10 here, against 1..100 default 24 there. It also
 * counts per COLLECTION GROUP, not per page. Sending BROWSE_LIMIT to search is legal
 * by luck today and a 400 the day the contract narrows, so the mock parses search's
 * limit with its own bounded helper rather than reusing limitOf().
 */
export const SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 25;

/** How many values a selection holds in total, across every trait type. */
export function traitValueCount(trait: TraitSelection): number {
  return Object.values(trait).reduce((total, values) => total + values.length, 0);
}

/**
 * Whether a selection is inside the contract's caps. Checked before a URL is
 * built rather than after the API rejects it, because a filter the reader can
 * click but not use is worse than one that is not offered.
 */
export function traitsWithinCaps(trait: TraitSelection): boolean {
  return (
    Object.keys(trait).length <= MAX_TRAIT_TYPES &&
    traitValueCount(trait) <= MAX_TRAIT_VALUES &&
    Object.values(trait).every(
      (values) =>
        values.length <= MAX_TRAIT_VALUES &&
        values.every((value) => value.length >= 1 && value.length <= MAX_TRAIT_VALUE_LENGTH),
    )
  );
}

/**
 * Whether one more value can be added to a selection. Adding a value to a type
 * already present does not spend a type, so the two caps are checked against
 * what the result would actually be.
 */
export function canAddTraitValue(trait: TraitSelection, traitType: string): boolean {
  const newType = trait[traitType] === undefined ? 1 : 0;
  return (
    Object.keys(trait).length + newType <= MAX_TRAIT_TYPES &&
    traitValueCount(trait) + 1 <= MAX_TRAIT_VALUES
  );
}

type SortAxis = {
  readonly label: string;
  readonly asc: Sort;
  /** Absent when the contract has no descending form for this axis. */
  readonly desc?: Sort;
  /**
   * False while the API answers 422 unsupported_sort. `rarity` is reserved in
   * the contract so this union stays stable, but rarityRank/rarityScore are
   * null until ALG-627 ships — offering the pill would hand the reader a
   * guaranteed error.
   */
  readonly available: boolean;
};

export const SORT_AXES = [
  { label: "Number", asc: "number", desc: "-number", available: true },
  { label: "Name", asc: "name", desc: "-name", available: true },
  { label: "Recently active", asc: "activity", desc: "-activity", available: true },
  { label: "Rarity", asc: "rarity", desc: "-rarity", available: false },
] as const satisfies readonly SortAxis[];

type AxisSort = (typeof SORT_AXES)[number]["asc"] | (typeof SORT_AXES)[number]["desc"];

/**
 * Compile-time proof that every member of the contract's sort enum has an axis
 * above. The day the indexer adds one, this line fails to typecheck instead of
 * the pill row silently missing an option.
 */
export const SORTS_COVERED: Exclude<Sort, AxisSort> extends never ? true : never = true;

const OFFERED = new Set<string>(
  SORT_AXES.filter((axis) => axis.available).flatMap((axis) => [axis.asc, axis.desc]),
);

/**
 * True only for a sort this app is prepared to send. A hand-typed
 * `?sort=rarity` is a member of the contract enum but not of this set, so it
 * falls back to DEFAULT_SORT in parseBrowseParams and never reaches the wire —
 * which is the one place that downgrade happens.
 */
export function isBrowseSort(value: string): value is Sort {
  return OFFERED.has(value);
}

/** Stable identity of a browse query, for React keys and de-duplication scope. */
export function browseKey(slug: string, sort: Sort, trait: TraitSelection, q?: string): string {
  const traits = Object.keys(trait)
    .sort()
    .map((type) => `${type}=${[...trait[type]].sort().join("|")}`)
    .join("&");
  return `${slug}::${sort}::${traits}::${q ?? ""}`;
}
