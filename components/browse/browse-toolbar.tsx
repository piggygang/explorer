import Link from "next/link";
import { CollectionSearch } from "@/components/browse/collection-search";
import { SortPills } from "@/components/browse/sort-pills";
import { number } from "@/lib/format";
import { type BrowseParams, activeCount, openSheetHref } from "@/lib/browse-params";

/**
 * The sticky bar: the drawer trigger, the sort pills and the result count.
 *
 * It sticks directly under the site header with no z-index of its own: the
 * header's z-30 makes it a stacking context that wins over a later sibling's
 * auto, so the toolbar slides under it and the repo keeps exactly one z-index.
 * Solid bg-canvas rather than the header's translucent blur — the house allows
 * blur in exactly two places and this is not one of them.
 *
 * ONE ROW, and that is load-bearing rather than cosmetic. The filter rail's
 * sticky offset (lib/browse-layout.ts) is derived from this bar's height, and
 * the rail is a later sibling with an auto z-index — so if the bar grows past
 * that offset the rail paints over it, and there is no second z-index in this
 * house to fix that with. Hence the chip row moved out to sit above the grid,
 * hence the pills do not wrap at lg, and hence the search field is lg-only and
 * sized to the same box as a sort pill rather than taller.
 */

export const FILTER_TRIGGER_ID = "browse-filters";

const BAR = "sticky top-[6.9rem] border-b border-line bg-canvas lg:top-16";
const INNER = "mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-2.5";
const TRIGGER =
  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] lg:hidden";
const ON = "border-[var(--accent)] bg-[var(--accent)]/15 text-ink";
const OFF = "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink";
const INERT = "border-line bg-surface text-ink-muted opacity-60 cursor-default";
const COUNT = "ml-auto shrink-0 font-mono text-xs text-ink-muted";

export function BrowseToolbar({
  slug,
  name,
  params,
  total,
  shown,
  hasFacets,
}: {
  slug: string;
  /** Names this row's search landmark, so it is distinguishable from the site
      header's on the same page. */
  name: string;
  params: BrowseParams;
  total: number | null;
  shown: number;
  hasFacets: boolean;
}) {
  const count = activeCount(params);

  return (
    <div className={BAR}>
      <div className={INNER}>
        {/* lg:hidden on the TRIGGER, never on the dialog: the rail replaces it
            above that width, and hiding an OPEN dialog by media query is the
            top-layer hazard filter-sheet.tsx documents. */}
        {hasFacets ? (
          <Link
            id={FILTER_TRIGGER_ID}
            href={openSheetHref(slug, params)}
            aria-haspopup="dialog"
            scroll={false}
            className={`${TRIGGER} ${count > 0 ? ON : OFF}`}
          >
            Filters
            {count > 0 && <span className="ml-1.5 font-mono text-xs text-ink-muted">{count}</span>}
          </Link>
        ) : (
          // Nothing to navigate to, so a non-focusable span rather than a
          // disabled button — the same shape as a coming-soon header pill.
          <span aria-disabled="true" className={`${TRIGGER} ${INERT}`}>
            Filters
          </span>
        )}

        {/* Search narrows the grid the way Filters does, so it groups on the
            left. The field is px-3.5 py-2 text-sm plus a border — the same 38px
            box as a sort pill — so this bar stays exactly one row high and the
            rail's offset still lands. Below lg it is display:none and the copy
            in browse-results.tsx takes over. */}
        <CollectionSearch
          slug={slug}
          name={name}
          params={params}
          className="hidden w-full max-w-[13rem] shrink-0 lg:block"
        />

        <SortPills slug={slug} params={params} />

        {/* Keyset pages carry no count of their own, so the filtered total comes
            from the facets response — which already pays for the scan. When that
            call failed there is no honest number to print, so this says what it
            knows: how many are on the page behind it. */}
        <p aria-live="polite" className={COUNT}>
          {total === null ? `${number(shown)} shown` : `${number(total)} piggies`}
        </p>
      </div>
    </div>
  );
}
