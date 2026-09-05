/**
 * The browse page's geometry, and the ids its two shells share.
 *
 * ZERO IMPORTS, deliberately — the same role lib/api/params.ts plays for the
 * sort vocabulary. components/browse/facet-panel.tsx reaches
 * components/error-note.tsx, which imports `ApiError` from lib/api/client.ts,
 * which has a RUNTIME import of dispatchMock -> handlers -> the fixture array.
 * A client island importing an id from the panel would drag the whole mock into
 * the browser bundle, and neither tsc nor eslint would say a word. So anything
 * both graphs need lives here instead.
 */

/**
 * The rail-and-grid split at lg and up, mirroring the one the NFT detail page
 * and dressme's wardrobe editor already use.
 *
 * ONLY apply it when the rail is actually rendered. A two-column grid with one
 * child auto-places that child into the first cell, so the grid would render
 * 20rem wide with the rest of the row empty. That is unreachable against the
 * fixtures and reachable against a real API — a collection whose members carry
 * no facetable attributes — which is exactly the class of mock/prod divergence
 * this issue exists to close.
 */
export const BROWSE_SPLIT =
  "lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8";

/**
 * The rail. Sticky under the header (64px at lg) plus the toolbar (57px: py-2.5
 * either side of one 36px pill row, plus its border), so 121px of chrome — hence
 * top-31 (124px) and a viewport-height budget that clears both.
 *
 * That arithmetic is only an invariant while the toolbar stays ONE row at lg,
 * which is why the chip row moved out of it and why the sort pills do not wrap
 * there. If the bar grows past this offset the rail paints over it, and the
 * house keeps exactly one z-index (the header's) to fix that with.
 */
export const BROWSE_RAIL =
  "hidden lg:sticky lg:top-31 lg:flex lg:max-h-[calc(100dvh-9rem)] lg:flex-col";

/** Three across beside the rail, and never four: the content column is 572px at
    a 1024px viewport and ~700px at the max-w-6xl cap, so there is no fluid range
    to respond to. components/nft-card.tsx's NFT_GRID is untouched, so the wallet
    portfolio keeps its four columns. */
export const BROWSE_GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3";

/** The shell a facet panel is rendering into. The rail sits inside the browse
    region's accent scope; the drawer is a dialog, and dialogs speak --brand. */
export type FacetShell = "rail" | "drawer";

/**
 * Both shells are in the DOM at once while the drawer is open, so every id is
 * scoped by shell. Keyed on the trait type rather than an array index: the
 * contract guarantees the facets array is ordered, not that a trait type with no
 * surviving values still appears in it, so an index is not stable.
 */
export const valueListId = (shell: FacetShell, traitType: string) =>
  `facet-${shell}-${encodeURIComponent(traitType)}`;

/** More values than this and the type gets a search box. Twelve puts it on Head
    (21 values) and Eyes (16) and keeps it off Background (7), where a text field
    above seven rows is furniture. */
export const VALUE_SEARCH_THRESHOLD = 12;

/** The viewport at which the rail replaces the drawer. Must match the `lg:`
    prefixes above — Tailwind's lg is 64rem, and this is the media query
    FilterSheet asks whether it is allowed to open. */
export const RAIL_MEDIA_QUERY = "(min-width: 64rem)";
