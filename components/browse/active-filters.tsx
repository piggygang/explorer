import Link from "next/link";
import { shorten } from "@/lib/format";
import {
  type BrowseParams,
  clearHref,
  dropOwnerHref,
  dropQueryHref,
  openSheetHref,
  toggleTraitHref,
} from "@/lib/browse-params";

/**
 * The chip row. One chip per selected trait value, plus one for q and one for
 * owner so a wallet deep link is visible and reversible rather than an invisible
 * filter narrowing the grid.
 *
 * It reads params, never facets, so a chip for a facet-excluded trait type that
 * arrives via URL is still removable even though no tab for it exists.
 */

const ROW = "no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0";
// The asymmetric padding is dressme's: it lets the remove control nest inside
// the same pill without the label drifting off-centre.
const CHIP = "flex shrink-0 items-center rounded-full border border-line bg-surface-raised text-xs";
const LABEL =
  "flex items-center gap-1.5 rounded-full py-1.5 pr-2 pl-3 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const REMOVE =
  "rounded-full px-2 py-1.5 text-ink-muted transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const CLEAR =
  "shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function ActiveFilters({ slug, params }: { slug: string; params: BrowseParams }) {
  const chips = Object.entries(params.trait).flatMap(([traitType, values]) =>
    values.map((value) => ({
      key: `${traitType}:${value}`,
      label: `${traitType} · ${value}`,
      open: openSheetHref(slug, params, traitType),
      remove: toggleTraitHref(slug, params, traitType, value),
      removeLabel: `Remove ${traitType} ${value}`,
    })),
  );

  if (chips.length === 0 && !params.q && !params.owner) return null;

  return (
    <div className={ROW}>
      {chips.map((chip) => (
        <span key={chip.key} className={CHIP}>
          <Link href={chip.open} className={LABEL}>
            {chip.label}
          </Link>
          <Link href={chip.remove} aria-label={chip.removeLabel} className={REMOVE}>
            <span aria-hidden="true">✕</span>
          </Link>
        </span>
      ))}

      {params.q && (
        <span className={CHIP}>
          <span className={`${LABEL} text-ink-muted`}>Search · {params.q}</span>
          <Link href={dropQueryHref(slug, params)} aria-label="Remove search" className={REMOVE}>
            <span aria-hidden="true">✕</span>
          </Link>
        </span>
      )}

      {/* The owner chip has no sheet tab to open — the facets endpoint accepts
          no owner parameter — so its body is a span, not a link. */}
      {params.owner && (
        <span className={CHIP}>
          <span className={`${LABEL} text-ink-muted`}>
            Owner · <span className="font-mono">{shorten(params.owner)}</span>
          </span>
          <Link
            href={dropOwnerHref(slug, params)}
            aria-label="Remove owner filter"
            className={REMOVE}
          >
            <span aria-hidden="true">✕</span>
          </Link>
        </span>
      )}

      <Link href={clearHref(slug, params)} className={CLEAR}>
        Clear all
      </Link>
    </div>
  );
}
