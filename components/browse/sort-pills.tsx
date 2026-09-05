import Link from "next/link";
import { DEFAULT_SORT, SORT_AXES } from "@/lib/api/params";
import type { Sort } from "@/lib/api/params";
import { type BrowseParams, sortHref } from "@/lib/browse-params";

/**
 * Link pills, not a <select>: an onChange-navigates select is a known a11y
 * anti-pattern and has no precedent in either repo. Sorting works with zero
 * client JS and each option is one tab stop.
 *
 * Each axis carries a direction glyph when selected and points at the opposite
 * direction, so re-clicking flips. Every axis in the contract now has both
 * directions — `activity` gained an ascending form the old contract lacked —
 * so there is no longer an asymmetry to explain in the UI.
 *
 * Rarity is in the contract's enum but `available: false`: rarityRank and
 * rarityScore are null until ALG-627 ships and the API answers 422 for that
 * sort, so the pill is not offered rather than offered and broken. The day the
 * flag flips, this row grows an option and nothing else changes.
 */

const PILL =
  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
// text-ink on a wash, never accent-coloured text: the accent never has to clear
// the 4.5:1 floor for small text this way.
const ON = "border-[var(--accent)] bg-[var(--accent)]/15 text-ink";
const OFF = "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink";
const GLYPH = "ml-1.5 font-mono text-xs text-ink-muted";

export function SortPills({ slug, params }: { slug: string; params: BrowseParams }) {
  const current: Sort = params.sort ?? DEFAULT_SORT;

  return (
    <div
      role="group"
      aria-label="Sort"
      className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {SORT_AXES.filter((axis) => axis.available).map(({ label, asc, desc }) => {
        const active = current === asc || (desc !== undefined && current === desc);
        const descending = desc !== undefined && current === desc;
        const next: Sort = active && desc !== undefined ? (descending ? asc : desc) : asc;
        return (
          <Link
            key={label}
            href={sortHref(slug, params, next)}
            aria-current={active ? "true" : undefined}
            className={`${PILL} ${active ? ON : OFF}`}
          >
            {label}
            {active && desc !== undefined && (
              <span aria-hidden="true" className={GLYPH}>
                {descending ? "↓" : "↑"}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
