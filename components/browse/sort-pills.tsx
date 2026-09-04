import Link from "next/link";
import type { Sort } from "@/lib/api/client";
import { type BrowseParams, sortHref } from "@/lib/browse-params";

/**
 * Three Link pills, not a <select>: an onChange-navigates select is a known a11y
 * anti-pattern and has no precedent in either repo. Sorting works with zero
 * client JS and each option is one tab stop.
 *
 * Number and Name carry a direction glyph when selected and point at the
 * opposite direction, so re-clicking flips. "Recently active" never carries one,
 * because the contract's enum has no ascending form for -activity — the
 * asymmetry is visible rather than papered over with a dead arrow.
 */

const PILL =
  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
// text-ink on a wash, never accent-coloured text: the accent never has to clear
// the 4.5:1 floor for small text this way.
const ON = "border-[var(--accent)] bg-[var(--accent)]/15 text-ink";
const OFF = "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink";
const GLYPH = "ml-1.5 font-mono text-xs text-ink-muted";

const OPTIONS: { label: string; asc: Sort; desc?: Sort }[] = [
  { label: "Number", asc: "number", desc: "-number" },
  { label: "Name", asc: "name", desc: "-name" },
  { label: "Recently active", asc: "-activity" },
];

export function SortPills({ slug, params }: { slug: string; params: BrowseParams }) {
  const current: Sort = params.sort ?? "number";

  return (
    <div
      role="group"
      aria-label="Sort"
      className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {OPTIONS.map(({ label, asc, desc }) => {
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
