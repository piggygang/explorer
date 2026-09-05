import type { components } from "@/lib/api/schema";

/**
 * The browse query vocabulary, and deliberately nothing else.
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
