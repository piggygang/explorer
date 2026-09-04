import Link from "next/link";
import { ActiveFilters } from "@/components/browse/active-filters";
import { SortPills } from "@/components/browse/sort-pills";
import { number } from "@/lib/format";
import { type BrowseParams, activeCount, openSheetHref } from "@/lib/browse-params";

/**
 * The sticky bar, and the page's whole persistent control surface.
 *
 * It sticks directly under the site header with no z-index of its own: the
 * header's z-30 makes it a stacking context that wins over a later sibling's
 * auto, so the toolbar slides under it and the repo keeps exactly one z-index.
 * Solid bg-canvas rather than the header's translucent blur — the house allows
 * blur in exactly two places and this is not one of them.
 */

export const FILTER_TRIGGER_ID = "browse-filters";

const BAR = "sticky top-[6.9rem] border-b border-line bg-canvas lg:top-16";
const INNER = "mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-2.5";
const ROW = "flex items-center gap-3";
const TRIGGER =
  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const ON = "border-[var(--accent)] bg-[var(--accent)]/15 text-ink";
const OFF = "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink";
const INERT = "border-line bg-surface text-ink-muted opacity-60 cursor-default";
const COUNT = "ml-auto shrink-0 font-mono text-xs text-ink-muted";

export function BrowseToolbar({
  slug,
  params,
  total,
  shown,
  hasFacets,
  firstTraitType,
}: {
  slug: string;
  params: BrowseParams;
  total: number | null;
  shown: number;
  hasFacets: boolean;
  firstTraitType?: string;
}) {
  const count = activeCount(params);

  return (
    <div className={BAR}>
      <div className={INNER}>
        <div className={ROW}>
          {hasFacets && firstTraitType ? (
            <Link
              id={FILTER_TRIGGER_ID}
              href={openSheetHref(slug, params, params.filters ?? firstTraitType)}
              aria-haspopup="dialog"
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

          <SortPills slug={slug} params={params} />

          {/* total is nullable by contract, so this never reads "of N" unless
              the server actually counted. */}
          <p aria-live="polite" className={COUNT}>
            {total === null ? `${number(shown)} shown` : `${number(total)} piggies`}
          </p>
        </div>

        <ActiveFilters slug={slug} params={params} />
      </div>
    </div>
  );
}
